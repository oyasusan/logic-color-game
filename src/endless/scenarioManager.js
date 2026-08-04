/**
 * scenarioManager.js
 * STEP32「Story Scenario Framework」セクション2: ScenarioManager。
 * Scenario一覧・Unlock判定・挑戦中の進行位置(nodeIndex)の管理のみを持つ
 * Coordinator本体（状態の実際の永続化は完全にendlessSave.jsへ委譲する、
 * researchDatabase.js等と同じ設計）。
 *
 * 要求仕様セクション2のAPIをそのまま実装した:
 *   getAvailableScenarios() / loadScenario(id) / startScenario(id) /
 *   updateProgress() / completeScenario() / getScenarioResult()
 * 加えて、挑戦を中断してScenario Selectへ戻るexitScenario()を追加した
 * （要求仕様には無いが、GAME画面の「‹ BACK」を押した場合に必要な操作のため）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { ScenarioData, StoryNode } = G;

  class ScenarioManager {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス */
    constructor({ save }) {
      this.save = save;
      this._lastResult = null; // getScenarioResult()用。completeScenario()直後のみ有効
    }

    /**
     * @param {Object|null} condition scenarioData.jsの`unlockCondition`
     * @param {string[]} clearedIds クリア済みScenario id一覧
     * @returns {boolean}
     */
    _checkUnlockCondition(condition, clearedIds) {
      if (!condition) return true; // null = 常に挑戦可能（CASE001）
      if (condition.type === 'scenarioCleared') return clearedIds.indexOf(condition.value) !== -1;
      return false;
    }

    /** 要求仕様セクション2のAPI。全ScenarioのUnlock/Clear状態付き一覧 */
    getAvailableScenarios() {
      const clearedData = this.save.getAllScenarioClearData();
      const clearedIds = Object.keys(clearedData);
      return ScenarioData.ALL.map(s => {
        const cleared = !!clearedData[s.id];
        return {
          id: s.id, title: s.title, description: s.description,
          difficulty: s.difficulty, layerCount: s.layerCount,
          unlocked: this._checkUnlockCondition(s.unlockCondition, clearedIds),
          cleared,
          endingId: cleared ? clearedData[s.id].endingId : null
        };
      });
    }

    /** 要求仕様セクション2のAPI。ScenarioSelect等が挑戦前に内容を確認するための読み取り専用API */
    loadScenario(id) {
      const scenario = ScenarioData.getById(id);
      if (!scenario) return null;
      const progress = this.save.getScenarioProgress();
      const nodeIndex = progress.activeScenarioId === id ? progress.nodeIndex : 0;
      return { scenario, nodeIndex, nodes: StoryNode.buildScenarioNodes(scenario) };
    }

    /**
     * 要求仕様セクション2のAPI。挑戦を開始し、進行位置をnodeIndex=0へリセットする。
     * @returns {{scenario:Object, nodeIndex:number, nodes:Array<Object>}|null} Unlockされていない/存在しないidの場合null
     */
    startScenario(id) {
      const scenario = ScenarioData.getById(id);
      if (!scenario) return null;
      const clearedIds = Object.keys(this.save.getAllScenarioClearData());
      if (!this._checkUnlockCondition(scenario.unlockCondition, clearedIds)) return null;
      this.save.setScenarioProgress(id, 0);
      return { scenario, nodeIndex: 0, nodes: StoryNode.buildScenarioNodes(scenario) };
    }

    /** 要求仕様セクション2のAPI。挑戦中Scenarioのnode進行を1つ進める @returns {number} 進行後のnodeIndex */
    updateProgress() {
      const progress = this.save.getScenarioProgress();
      if (!progress.activeScenarioId) return 0;
      const nextIndex = progress.nodeIndex + 1;
      this.save.setScenarioProgress(progress.activeScenarioId, nextIndex);
      return nextIndex;
    }

    /**
     * 要求仕様セクション2のAPI。挑戦中Scenarioの完了を記録し、進行状態をリセットする。
     * @param {string} endingId StoryEndingManager.determineEnding()が返したEnding id
     * @returns {Object|null} getScenarioResult()と同じ形の結果（挑戦中Scenarioが無ければnull）
     */
    completeScenario(endingId) {
      const progress = this.save.getScenarioProgress();
      const scenarioId = progress.activeScenarioId;
      if (!scenarioId) return null;
      const scenario = ScenarioData.getById(scenarioId);
      this.save.recordScenarioClear(scenarioId, endingId);
      this.save.recordScenarioEnding(scenarioId, endingId);
      this.save.setScenarioProgress(null, 0);

      const endingDef = (scenario.ending || []).find(e => e.id === endingId) || null;
      this._lastResult = {
        scenarioId, title: scenario.title,
        endingId,
        endingTitle: endingDef ? endingDef.title : null,
        endingDescription: endingDef ? endingDef.description : null,
        reward: scenario.reward
      };
      return this._lastResult;
    }

    /** 要求仕様セクション2のAPI。直前のcompleteScenario()結果（RESULT表示用） */
    getScenarioResult() {
      return this._lastResult;
    }

    /** GAME画面の「‹ BACK」でScenario途中離脱した場合。完了記録はせず進行位置のみ破棄する */
    exitScenario() {
      this.save.setScenarioProgress(null, 0);
    }
  }

  G.ScenarioManager = ScenarioManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
