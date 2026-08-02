/**
 * endlessSave.js
 * ENDLESS RESEARCHのベスト記録をLocalStorageへ保存する。
 * 既存の progress.js（`logicColor.save.v2`、ステージ進行/星/EXP用）とは
 * 完全に別のキーを使い、既存のセーブ形式・移行処理には一切触れない。
 *
 * 【"highestDepth"について】 Phase3の要件で追加要求された`highestDepth`は、
 * 「これまでに到達した最も深いDepth」という意味では既存の`endlessBestDepth`
 * （Phase1から実装済み）と完全に同じ概念のため、同じ事実を保持する重複
 * フィールドを新設せず、`endlessBestDepth`をそのまま`highestDepth`要件の
 * 実装として扱っている（2つの値が食い違う不整合を避けるための判断）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const STORAGE_KEY = 'logicColor.endless.v1';

  function defaultData() {
    return {
      endlessBestDepth: 0,
      endlessBestScore: 0,
      totalRuns: 0,
      totalBossClear: 0,  // Phase3: 生涯Boss撃破回数の累計
      memoryFragments: 0  // Phase3: Memory Fragmentイベントで獲得した生涯累計数
    };
  }

  class EndlessSaveStore {
    constructor() {
      this.data = defaultData();
    }

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.data = Object.assign(defaultData(), JSON.parse(raw));
        }
      } catch (e) {
        console.warn('ENDLESS RESEARCHのセーブデータの読み込みに失敗しました。初期値を使用します。', e);
        this.data = defaultData();
      }
      return this.data;
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.warn('ENDLESS RESEARCHのセーブに失敗しました。', e);
      }
    }

    /**
     * 1回のRUN終了時に記録する。
     * @param {{depth:number, score:number, bossClearCount?:number, memoryFragmentsGained?:number}} result
     * @returns {{isNewBestDepth:boolean, isNewBestScore:boolean}}
     */
    recordRun(result) {
      this.data.totalRuns++;

      const isNewBestDepth = result.depth > this.data.endlessBestDepth;
      const isNewBestScore = result.score > this.data.endlessBestScore;
      if (isNewBestDepth) this.data.endlessBestDepth = result.depth;
      if (isNewBestScore) this.data.endlessBestScore = result.score;

      this.data.totalBossClear += result.bossClearCount || 0;
      this.data.memoryFragments += result.memoryFragmentsGained || 0;

      this.save();
      return { isNewBestDepth, isNewBestScore };
    }

    getBestDepth() {
      return this.data.endlessBestDepth;
    }

    getBestScore() {
      return this.data.endlessBestScore;
    }

    getTotalRuns() {
      return this.data.totalRuns;
    }

    getTotalBossClear() {
      return this.data.totalBossClear;
    }

    getMemoryFragments() {
      return this.data.memoryFragments;
    }
  }

  G.EndlessSaveStore = EndlessSaveStore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
