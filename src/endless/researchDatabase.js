/**
 * researchDatabase.js
 * STEP32「Narrative & Story System」セクション1: ResearchDatabase。Story Log/
 * Memory/File管理・Story進行管理・Codex連携を統括するCoordinator本体。
 * 実際の永続化はendlessSave.jsへ完全に委譲し（metaProgression.js/identityManager.js
 * と同じ設計）、本クラス自身は状態を持たない。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { StoryData } = G;

  // 要求仕様セクション8のStory Stage境界値。要求仕様に数値指定が無かったため設計した
  const STAGE_THRESHOLDS = { FINAL: 0.9, LATE: 0.6, MIDDLE: 0.25 };

  class ResearchDatabase {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス */
    constructor({ save }) {
      this.save = save;
    }

    /** ---------------- 要求仕様セクション1の必須API ---------------- */

    /** @param {string} id @returns {boolean} 新規解放ならtrue（既に解放済み/不正なidならfalse） */
    addEntry(id) {
      if (this.isUnlocked(id)) return false;
      const entry = StoryData.getById(id);
      if (!entry) return false;
      this.save.unlockResearchDatabaseEntry(id);
      this.save.recordTimelineEntry({ id, timestamp: Date.now() });
      return true;
    }

    /** @param {string} id @returns {Object|null} StoryEntry定義+unlocked状態（未定義idならnull） */
    getEntry(id) {
      const entry = StoryData.getById(id);
      if (!entry) return null;
      return Object.assign({}, entry, { unlocked: this.isUnlocked(id) });
    }

    isUnlocked(id) {
      return this.save.isResearchDatabaseEntryUnlocked(id);
    }

    /** @returns {Array<Object>} 全StoryEntry+unlocked状態（未解放でもid/type/category等の存在は分かる。表示制御はUI側の責務） */
    getAllEntries() {
      return StoryData.ALL.map(e => this.getEntry(e.id));
    }

    /** @returns {{total:number, unlocked:number, rate:number}} 全体の完成率 */
    getCompletionRate() {
      const total = StoryData.ALL.length;
      const unlocked = this.getUnlockedIds().length;
      return { total, unlocked, rate: total > 0 ? unlocked / total : 0 };
    }

    /** ---------------- 補助API ---------------- */

    getUnlockedIds() {
      return this.save.getResearchDatabaseUnlockedIds();
    }

    getEntriesByType(type) {
      return this.getAllEntries().filter(e => e.type === type);
    }

    getEntriesByCategory(category) {
      return this.getAllEntries().filter(e => e.category === category);
    }

    /** @param {string} type @returns {{total:number, unlocked:number}} 要求仕様セクション11「LOG 45/80」等の内訳表示用 */
    getCompletionByType(type) {
      const entries = StoryData.getByType(type);
      const unlocked = entries.filter(e => this.isUnlocked(e.id)).length;
      return { total: entries.length, unlocked };
    }

    /** @returns {Array<{id:string, timestamp:number}>} 解放順（古い順）のTimelineデータ */
    getTimeline() {
      return this.save.getTimelineData();
    }

    /** ---------------- 要求仕様セクション8: AI Director Dialogue Integration ---------------- */

    /** @returns {'early'|'middle'|'late'|'final'} 現在のStory進行段階 */
    getStoryStage() {
      const rate = this.getCompletionRate().rate;
      if (rate >= STAGE_THRESHOLDS.FINAL) return 'final';
      if (rate >= STAGE_THRESHOLDS.LATE) return 'late';
      if (rate >= STAGE_THRESHOLDS.MIDDLE) return 'middle';
      return 'early';
    }

    /**
     * Stageが直前の通知時点から変化した瞬間だけ新しいstageを返す（AI Dialogueの
     * 重複通知防止）。変化していなければnullを返す。
     * @returns {string|null}
     */
    checkStageTransition() {
      const stage = this.getStoryStage();
      const progress = this.save.getStoryProgress();
      if (stage === progress.lastNotifiedStage) return null;
      this.save.setStoryProgressStage(stage);
      return stage;
    }
  }

  G.ResearchDatabase = ResearchDatabase;
})(typeof globalThis !== 'undefined' ? globalThis : this);
