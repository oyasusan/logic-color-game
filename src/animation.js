/**
 * animation.js
 * ゲーム画面上の演出（CSSクラスの付け外し）だけを担当するモジュール。
 * 盤面やクリア判定などのゲームロジックには一切関与せず、ui.js から
 * 「どのDOM要素にどの演出をかけるか」を渡されて実行するだけの薄いヘルパー。
 * DOM操作以外の副作用（セーブ・スコア計算など）は持たない。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  /** 同じCSSアニメーションを連続再生できるよう、reflowを挟んでクラスを再トリガーする */
  function retrigger(el, className) {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth; // reflow
    el.classList.add(className);
  }

  const Animation = {
    /** マスタップ直後（配置結果が決まる前）の即時発光フィードバック */
    selectPulse(el) {
      retrigger(el, 'select-pulse');
    },

    /** ライトが配置された際のポップ演出（flashと併用可能） */
    placeLight(el) {
      retrigger(el, 'place-pop');
    },

    /** 行/列の条件が達成された瞬間、対象マス群にライン発光を流す */
    pulseLine(cellEls) {
      (cellEls || []).forEach(el => retrigger(el, 'line-clear'));
    },

    /** 条件達成時にヒントチップ自体を強調する */
    chipBurst(chipEl) {
      retrigger(chipEl, 'chip-burst');
    },

    /** CLEAR時: 盤面上の全ライトを同期発光させる */
    syncFlashBoard(cellEls2D) {
      (cellEls2D || []).forEach(row => {
        row.forEach(el => {
          if (el && el.classList.contains('lit')) retrigger(el, 'sync-flash');
        });
      });
    },

    /**
     * LEVEL UP表示を一時的に出す。durationミリ秒後に自動で隠す。
     * @param {HTMLElement} overlayEl
     * @param {HTMLElement} valueEl
     * @param {number} level
     * @param {number} [duration=1400]
     */
    showLevelUp(overlayEl, valueEl, level, duration) {
      if (!overlayEl || !valueEl) return;
      valueEl.textContent = `Lv.${level}`;
      overlayEl.classList.remove('hidden');
      retrigger(overlayEl.firstElementChild, 'level-up-card'); // keyframeを再生し直す
      clearTimeout(this._levelUpTimer);
      this._levelUpTimer = setTimeout(() => {
        overlayEl.classList.add('hidden');
      }, duration || 1400);
    }
  };

  G.Animation = Animation;
})(typeof globalThis !== 'undefined' ? globalThis : this);
