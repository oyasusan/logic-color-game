/**
 * memoryManager.js
 * STEP32-3「Memory Fragment System」セクション1: MemoryManager。
 * Memory Fragmentの取得・取得済み判定・収集率算出・Layer Clear連携を統括する
 * Coordinator本体。実際の永続化は完全にendlessSave.jsへ委譲し（他STEP32系と
 * 同じ設計）、本クラス自身は状態を持たない。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { MemoryData } = G;

  class MemoryManager {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス */
    constructor({ save }) {
      this.save = save;
    }

    /** 要求仕様セクション1のAPI。@returns {boolean} 新規取得ならtrue（既に取得済み/未定義idならfalse） */
    collectMemory(memoryId) {
      if (!MemoryData.getById(memoryId)) return false;
      return this.save.recordMemoryCollected(memoryId);
    }

    /** 要求仕様セクション1のAPI */
    hasMemory(memoryId) {
      return this.save.isMemoryCollected(memoryId);
    }

    /** 要求仕様セクション1のAPI。@returns {Array<Object>} 取得済みMemory定義の一覧 */
    getCollectedMemories() {
      return MemoryData.ALL.filter(m => this.hasMemory(m.id));
    }

    /** 要求仕様セクション1のAPI。@returns {{collected:number, total:number, rate:number}} */
    getMemoryProgress() {
      const total = MemoryData.ALL.length;
      const collected = this.save.getMemoryProgress().collectedMemoryIds.length;
      return { collected, total, rate: total > 0 ? collected / total : 0 };
    }

    /**
     * 要求仕様セクション5: Layer Clear→Story Event→Memory取得チェック。
     * @param {{layerReached:number}} snapshot endless.jsが組み立てる現在の進行状況
     * @returns {Array<Object>} この呼び出しで新たに取得したMemory定義の配列
     */
    checkLayerMemories(snapshot) {
      snapshot = snapshot || {};
      const newlyCollected = [];
      MemoryData.ALL.forEach(def => {
        if (this.hasMemory(def.id)) return;
        if (!this._checkUnlockCondition(def.unlockCondition, snapshot)) return;
        if (this.collectMemory(def.id)) newlyCollected.push(def);
      });
      return newlyCollected;
    }

    /** protocolUnlock.js/storyUnlockManager.jsと同じ`{type,value}>=`比較 */
    _checkUnlockCondition(condition, snapshot) {
      if (!condition) return false;
      const current = snapshot[condition.type] || 0;
      return current >= condition.value;
    }
  }

  G.MemoryManager = MemoryManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
