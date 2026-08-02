/**
 * endlessResult.js
 * ENDLESS RESEARCHのRESULT画面（DEPTH/SCORE/PERFECT COUNT/BEST DEPTH表示、
 * RETRY・TITLEボタン）のDOM取得・描画・イベント配線のみを担当する。
 * スコア計算やRUN進行の管理は持たない（endless.js側の責務）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class EndlessResultScreen {
    /**
     * @param {Object} callbacks
     *   onRetry() RETRYボタン押下時
     *   onTitle() TITLEボタン押下時
     */
    constructor(callbacks) {
      this.cb = callbacks || {};

      this.el = {
        depth: document.getElementById('endlessResultDepth'),
        score: document.getElementById('endlessResultScore'),
        perfect: document.getElementById('endlessResultPerfect'),
        best: document.getElementById('endlessResultBest'),
        newBest: document.getElementById('endlessResultNewBest'),
        retryBtn: document.getElementById('endlessRetryBtn'),
        titleBtn: document.getElementById('endlessResultTitleBtn')
      };

      if (this.el.retryBtn) {
        this.el.retryBtn.addEventListener('click', () => this.cb.onRetry && this.cb.onRetry());
      }
      if (this.el.titleBtn) {
        this.el.titleBtn.addEventListener('click', () => this.cb.onTitle && this.cb.onTitle());
      }
    }

    /**
     * @param {{depth:number, score:number, perfectCount:number}} runStats
     * @param {{bestDepth:number, isNewBestDepth:boolean, isNewBestScore:boolean}} saveInfo
     */
    render(runStats, saveInfo) {
      if (!this.el.depth) return;
      this.el.depth.textContent = String(runStats.depth);
      this.el.score.textContent = String(runStats.score);
      this.el.perfect.textContent = String(runStats.perfectCount);
      this.el.best.textContent = String(saveInfo.bestDepth);
      if (this.el.newBest) {
        this.el.newBest.classList.toggle('hidden', !(saveInfo.isNewBestDepth || saveInfo.isNewBestScore));
      }
    }
  }

  G.EndlessResultScreen = EndlessResultScreen;
})(typeof globalThis !== 'undefined' ? globalThis : this);
