/**
 * hiddenEnvironmentManager.js
 * STEP30-7「Hidden Environment System」。hiddenEnvironmentData.jsで定義した6種の
 * 隠しEnvironmentの解放判定・入場・退場・履歴管理・効果集計を統括する。
 * worldMutationManager.js/environmentEventManager.jsと同じ「Modifier Calculation
 * Layer」設計を踏襲し、各システムはmodifiers[]を直接読まず必ずこのクラス経由で
 * 値を取得する。
 *
 * 解放（`hiddenUnlockFlags`）はRUNをまたいで蓄積する生涯データ（一度解放したら
 * 二度と失われない、worldEnvironmentManager.unlockWorldEnvironmentと同じ設計）。
 * `currentHidden`（現在入場中かどうか）はworldMutationManager.activeMutationと
 * 同じ「RUNごとにreset()される今RUNの現在値」。
 *
 * 【設計判断: 解放後も"稀にしか出会えない"体験を保つ二段構え】
 *   要求仕様の「通常プレイでは滅多に見つからない、探索・収集・やり込み要素」という
 *   目的を実現するため、解放条件を満たした「瞬間」は必ず入場できる（Test Flow
 *   セクション13の「条件達成→Hidden抽選→演出→Environment遷移」を直接の因果関係で
 *   満たす）が、解放後の以降のRUNでは`ROLL_RATE`（要求仕様に具体的な数値指定が
 *   無かったため2%とした。World Mutation/Environment Eventより低い確率にすることで
 *   「Hidden」の希少性を保つ設計判断）の低確率抽選でしか再訪できないようにした。
 *   これによりunlockUnlock（初回発見）とrollHiddenEnvironment（以降の再訪）は
 *   明確に異なる役割を持つ2つのAPIとして意味を持つ。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { HiddenEnvironmentData } = G;

  const REVISIT_ROLL_RATE = 0.02; // 解放済みEnvironmentへの、以降のRUNでの再訪確率（Layer移動ごと）
  const VISIT_DURATION = 1; // Hidden Environmentは常に1Layer限りの滞在（Environment Event/Mutationと同じduration設計）

  class HiddenEnvironmentManager {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス */
    constructor({ save }) {
      this.save = save;
      this._currentHidden = null;
      this._remainingDuration = 0;
    }

    /** RUN開始時に呼ぶ。入場中の状態を解除する（生涯データのhiddenUnlockFlags等はリセットしない） */
    reset() {
      this._currentHidden = null;
      this._remainingDuration = 0;
    }

    /** ---------------- 要求仕様セクション1の必須API ---------------- */

    /**
     * Hidden出現条件判定（副作用あり: 新たに条件を満たしたものは即座に永続解放する）。
     * @param {{unknownStreak?:number, protocolFragmentsTotal?:number, researchLabVisitsTotal?:number,
     *   bestLayer?:number, totalRuns?:number, worldCollapseNoExtract?:boolean}} snapshot
     * @returns {Array<Object>} このcheckUnlock()呼び出しで新たに解放されたEnvironment定義の配列（無ければ空配列）
     */
    checkUnlock(snapshot) {
      snapshot = snapshot || {};
      const newlyUnlocked = [];
      HiddenEnvironmentData.ALL.forEach(def => {
        if (this.save.isHiddenEnvironmentUnlocked(def.id)) return;
        if (this._isConditionMet(def.unlockCondition, snapshot)) {
          this.save.unlockHiddenEnvironment(def.id);
          newlyUnlocked.push(def);
        }
      });
      return newlyUnlocked;
    }

    _isConditionMet(condition, snapshot) {
      if (!condition) return false;
      switch (condition.type) {
        case 'unknownStreak': return (snapshot.unknownStreak || 0) >= condition.value;
        case 'protocolFragmentsTotal': return (snapshot.protocolFragmentsTotal || 0) >= condition.value;
        case 'researchLabVisitsTotal': return (snapshot.researchLabVisitsTotal || 0) >= condition.value;
        case 'bestLayer': return (snapshot.bestLayer || 0) >= condition.value;
        case 'totalRuns': return (snapshot.totalRuns || 0) >= condition.value;
        case 'worldCollapseNoExtract': return !!snapshot.worldCollapseNoExtract;
        default: return false;
      }
    }

    /**
     * 解放済みEnvironmentの中から、低確率で1つ抽選する（副作用無し）。既に入場中なら常にnull。
     * @returns {Object|null}
     */
    rollHiddenEnvironment() {
      if (this._currentHidden) return null;
      const unlockedIds = this.save.getHiddenUnlockFlags();
      if (unlockedIds.length === 0) return null;
      if (Math.random() >= REVISIT_ROLL_RATE) return null;
      const pool = HiddenEnvironmentData.ALL.filter(def => unlockedIds.indexOf(def.id) !== -1);
      if (pool.length === 0) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    /**
     * Hidden Environmentへ入場する（副作用あり）。
     * @param {string} id
     * @param {{run?:number, layer?:number}} [context]
     * @returns {Object|null} 入場したEnvironment定義（不正なidならnull）
     */
    enterHiddenEnvironment(id, context) {
      const def = HiddenEnvironmentData.getById(id);
      if (!def) return null;
      context = context || {};

      this._currentHidden = def;
      this._remainingDuration = VISIT_DURATION;

      this.save.recordHiddenVisit(def.id, context.run || 0, context.layer || 0);
      return def;
    }

    /** Hidden Environmentから退場する（副作用あり） */
    leaveHiddenEnvironment() {
      this._currentHidden = null;
      this._remainingDuration = 0;
    }

    /** Layer移動のたびに呼ぶ。持続ターンを1消費し、尽きたら自動的に退場する */
    tickDuration() {
      if (!this._currentHidden) return;
      this._remainingDuration--;
      if (this._remainingDuration <= 0) this.leaveHiddenEnvironment();
    }

    getCurrentHiddenEnvironment() {
      return this._currentHidden;
    }

    /** @returns {{unlocked:number, total:number, rate:number}} 要求仕様セクション10「Discovery Rate」 */
    getDiscoveryRate() {
      const unlocked = this.save.getHiddenUnlockFlags().length;
      const total = HiddenEnvironmentData.ALL.length;
      return { unlocked, total, rate: total > 0 ? unlocked / total : 0 };
    }

    /** ---------------- Completionマーク（限定Reward取得済みか。Archive表示用） ---------------- */

    markRewardUnlocked(id, rewardId) {
      this.save.recordHiddenReward(id, rewardId);
    }

    /** ---------------- 効果集計（worldMutationManager.jsと同じ規約） ---------------- */

    _effectTotal(type) {
      if (!this._currentHidden || !this._currentHidden.modifiers) return 0;
      return this._currentHidden.modifiers.reduce((sum, m) => sum + (m.type === type ? m.value : 0), 0);
    }

    getHiddenRewardModifier() {
      return 1 + this._effectTotal('rewardMultiplier');
    }

    getHiddenResearchDataMultiplier() {
      return 1 + this._effectTotal('researchDataMultiplier');
    }

    getHiddenProtocolFragmentMultiplier() {
      return 1 + this._effectTotal('protocolFragmentMultiplier');
    }

    /** SIMULATION ZEROの「Puzzle Difficulty +50%」: 既存のPuzzle Difficulty同様、制限時間短縮として適用する */
    getHiddenPuzzleTimeLimitMultiplier() {
      return Math.max(0.4, 1 - this._effectTotal('puzzleDifficulty'));
    }

    /** PARADOX COREの「Risk上昇」 */
    getHiddenRiskChainBonusMultiplier() {
      return 1 + this._effectTotal('riskChainBonus');
    }

    getHiddenRareEventWeightBoost() {
      return Math.max(0, this._effectTotal('rareEventWeightBoost'));
    }

    /** @param {string} nodeType 'puzzle'|'event'|'elite'|'recovery'|'unknown'|'research_lab' */
    getHiddenNodeWeightMultiplier(nodeType) {
      return 1 + this._effectTotal(`nodeWeightMultiplier_${nodeType}`);
    }
  }

  G.HiddenEnvironmentManager = HiddenEnvironmentManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
