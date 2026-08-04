/**
 * relationshipManager.js
 * STEP32-4「Character Relationship System」セクション1: RelationshipManager。
 * キャラクター関係値・状態の管理、ARIA状態変化（要求仕様セクション4）、
 * Dialogue解放条件判定（要求仕様セクション5）を統括するCoordinator本体。
 * 実際の永続化は完全にendlessSave.jsへ委譲し、本クラス自身は状態を持たない。
 *
 * 【STEP34追記】要求仕様セクション4「Dialogue Systemを条件対応型にしてください。
 * 条件: ariaState, relationship, storyProgress を利用可能にする」に対応するため、
 * `checkCondition()`をtype付きの3条件タイプへ拡張した（詳細は同メソッドのコメント参照）。
 *
 * 【STEP38追記】ARIA LEVEL3「Self Aware」の到達条件を、要求仕様セクション3どおり
 * 「Memory010取得・Memory011取得・Chapter5 Complete」の複合条件へ変更した。
 * `_buildAriaSnapshot()`に新しいsnapshotキー`selfAwareReady`を追加し、3条件すべてを
 * 満たした時のみ1を返す（`relationshipData.js`側のARIA_LEVELSがこのキーを参照する
 * よう変更済み）。既存の`finalChapterReached`キーはARIA_LEVELSからは参照されなく
 * なったが、将来の別用途のためsnapshot自体には残してある。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { RelationshipData } = G;

  // ARIA LEVEL2「重要Memory取得」の判定対象（relationshipData.jsのコメント参照）
  const IMPORTANT_MEMORY_ID = 'memfrag_002';
  // Final Chapter到達を示すsnapshotキー（現在ARIA_LEVELSからは未参照だが、将来の
  // 別用途のためsnapshotへは残してある。詳細はrelationshipData.js STEP38追記参照）
  const FINAL_CHAPTER_ID = 'chapter06';
  // ARIA LEVEL3「Self Aware」の判定対象（STEP38、relationshipData.jsのコメント参照）
  const SELF_AWARE_MEMORY_ID_1 = 'memfrag_010';
  const SELF_AWARE_MEMORY_ID_2 = 'memfrag_011';
  const SELF_AWARE_CHAPTER_ID = 'chapter05';

  class RelationshipManager {
    /**
     * @param {Object} deps
     * @param {Object} deps.save EndlessSaveStoreインスタンス
     * @param {Object} deps.memoryManager MemoryManagerインスタンス（ARIA状態変化の判定に使う）
     * @param {Object} deps.storyManager StoryManagerインスタンス（Final Chapter判定に使う）
     */
    constructor({ save, memoryManager, storyManager }) {
      this.save = save;
      this.memoryManager = memoryManager;
      this.storyManager = storyManager;
    }

    /** 要求仕様セクション1のAPI */
    getRelationship(characterId) {
      const record = this.save.getRelationshipData(characterId);
      return record ? record.relationship : 0;
    }

    /** 要求仕様セクション1のAPI。@returns {number} 変更後の関係値 */
    addRelationship(characterId, value) {
      return this.save.addRelationshipValue(characterId, value);
    }

    /** 要求仕様セクション1のAPI */
    getCharacterState(characterId) {
      const record = this.save.getRelationshipData(characterId);
      return record ? record.state : null;
    }

    /**
     * 要求仕様セクション1のAPI。Dialogue解放条件確認（STEP32-4要求仕様セクション5、
     * STEP34要求仕様セクション4で拡張）。
     * @param {Object|null|undefined} condition conditionが無ければ常にtrue（無条件で表示可）。
     *   後方互換のため`type`無し（レガシー形式、STEP32-4当時の`{character,state}`）は
     *   `ariaState`として扱う。`type`ありの場合は以下3種:
     *   - `{type:'ariaState', character?, state}` characterのstateが一致するか（character省略時は'aria'）
     *   - `{type:'relationship', character, value}` characterの関係値がvalue以上か
     *   - `{type:'storyProgress', minLayer}` 現在のStory Layer進行がminLayer以上か
     * @returns {boolean}
     */
    checkCondition(condition) {
      if (!condition) return true;
      if (!condition.type) {
        // レガシー形式（STEP32-4当時の{character,state}）。ariaStateと同じ判定
        return this.getCharacterState(condition.character) === condition.state;
      }
      switch (condition.type) {
        case 'ariaState':
          return this.getCharacterState(condition.character || 'aria') === condition.state;
        case 'relationship':
          return this.getRelationship(condition.character) >= condition.value;
        case 'storyProgress':
          return this.storyManager.getCurrentStoryLayer() >= (condition.minLayer || 0);
        default:
          return true;
      }
    }

    /**
     * 要求仕様セクション4/6: ARIA状態変化の判定・更新。Memory取得時・Layer Clear時に
     * 呼ぶ（endless.js側の責務）。現在到達しているLevelより高いLevelの条件を
     * 満たしていれば、そのLevelまで一気に進める（複数Level分を1度に満たした場合も
     * 正しく最終到達点まで進む）。
     * @returns {Object|null} 新しく到達したLevel定義（変化が無ければnull）
     */
    checkAriaEvolution() {
      const snapshot = this._buildAriaSnapshot();
      const currentState = this.getCharacterState('aria');
      const currentLevel = RelationshipData.getAriaLevelByState(currentState).level;

      let achievedLevel = 0;
      RelationshipData.ARIA_LEVELS.forEach(def => {
        if (this._checkLevelCondition(def.condition, snapshot)) achievedLevel = def.level;
      });

      if (achievedLevel <= currentLevel) return null;
      const achievedDef = RelationshipData.ARIA_LEVELS.find(d => d.level === achievedLevel);
      this.save.setRelationshipState('aria', achievedDef.state);
      return achievedDef;
    }

    _buildAriaSnapshot() {
      const memoryProgress = this.memoryManager.getMemoryProgress();
      const chapter = this.storyManager.getCurrentChapter();
      const completedChapters = this.save.getLayerStoryProgress().completedChapters;
      const selfAwareReady = this.memoryManager.hasMemory(SELF_AWARE_MEMORY_ID_1)
        && this.memoryManager.hasMemory(SELF_AWARE_MEMORY_ID_2)
        && completedChapters.indexOf(SELF_AWARE_CHAPTER_ID) !== -1;
      return {
        memoryCount: memoryProgress.collected,
        importantMemoryCollected: this.memoryManager.hasMemory(IMPORTANT_MEMORY_ID) ? 1 : 0,
        finalChapterReached: (chapter && chapter.id === FINAL_CHAPTER_ID) ? 1 : 0,
        selfAwareReady: selfAwareReady ? 1 : 0
      };
    }

    /** protocolUnlock.js等と同じ`{type,value}>=`比較 */
    _checkLevelCondition(condition, snapshot) {
      if (!condition) return true; // LEVEL0は常に達成済み
      const current = snapshot[condition.type] || 0;
      return current >= condition.value;
    }
  }

  G.RelationshipManager = RelationshipManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
