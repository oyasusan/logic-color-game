/**
 * researchEventBanner.js
 * STEP42「Dynamic Research Event System」セクション3: イベント演出。DOM描画・
 * フェード演出・タイマー制御のみを持つ（directorHud.js等と同じ役割分担）。
 *
 * 要求仕様どおり「表示時間3〜6秒・スキップ可能・フェード演出」を満たす、
 * 非モーダルな小バナー。既存のui.showToast（単一スロット・後勝ち）とは独立した
 * 別要素のため、他のトースト表示と競合しない。盤面操作をブロックしない
 * （pointer-eventsはバナー自身にのみ有効、背後の盤面タップには一切影響しない）ため、
 * 「ゲームテンポを阻害しない」要件を満たす。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const MIN_DURATION_MS = 3000;
  const MAX_DURATION_MS = 6000;
  const FADE_OUT_MS = 400;

  class ResearchEventBanner {
    constructor() {
      this.el = {
        banner: document.getElementById('researchEventBanner'),
        icon: document.getElementById('researchEventIcon'),
        text: document.getElementById('researchEventText')
      };
      this._timer = null;
      this._fadeTimer = null;
      if (this.el.banner) this.el.banner.addEventListener('click', () => this._dismiss());
    }

    /** @param {{icon?:string, text:string}} eventDef */
    show(eventDef) {
      if (!this.el.banner || !eventDef) return;
      clearTimeout(this._timer);
      clearTimeout(this._fadeTimer);
      if (this.el.icon) this.el.icon.textContent = eventDef.icon || '';
      if (this.el.text) this.el.text.textContent = eventDef.text;
      this.el.banner.classList.remove('hidden');
      // hidden解除直後にshowを付けるとtransitionが発火しないブラウザがあるため、
      // 1フレーム後に付与してフェードインを確実に発生させる（既存演出と同じ手法）
      requestAnimationFrame(() => {
        if (this.el.banner) this.el.banner.classList.add('show');
      });
      const duration = MIN_DURATION_MS + Math.random() * (MAX_DURATION_MS - MIN_DURATION_MS);
      this._timer = setTimeout(() => this._dismiss(), duration);
    }

    /** スキップタップ、または表示時間経過で呼ばれる。フェードアウト後に完全に隠す */
    _dismiss() {
      clearTimeout(this._timer);
      if (!this.el.banner) return;
      this.el.banner.classList.remove('show');
      this._fadeTimer = setTimeout(() => {
        if (this.el.banner) this.el.banner.classList.add('hidden');
      }, FADE_OUT_MS);
    }

    /** RUN終了時等、演出途中でも即座に隠す */
    hide() {
      clearTimeout(this._timer);
      clearTimeout(this._fadeTimer);
      if (this.el.banner) {
        this.el.banner.classList.remove('show');
        this.el.banner.classList.add('hidden');
      }
    }
  }

  G.ResearchEventBanner = ResearchEventBanner;
})(typeof globalThis !== 'undefined' ? globalThis : this);
