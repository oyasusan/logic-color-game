/**
 * evolutionTransition.js
 * STEP41-3「Neural Evolution System」セクション4: Theme Transition演出。
 * Neural Evolution Theme（themeManager.js）が変化した瞬間、「NEW ANALYSIS AREA /
 * （新Theme名）/ ARIA:「解析対象が変化しています。」」を表示する。DOM描画・
 * タイマー制御のみを持つ（既存のtransitionManager.js＝WorldEnvironment用の
 * Transition演出と同じ役割分担・同じ「続ける/スキップボタン必須、自動消滅しない」
 * 方針を踏襲しているが、対象が別概念（Layer Phase）のためDOM・クラスは独立させている）。
 *
 * RUNの最初のLayer（直前のThemeが存在しない）でも、要求仕様どおりTransitionを
 * 表示する（endless.js側で「このRUNで初めて確定したPhase」を変化として扱う）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class EvolutionTransition {
    /** @param {Object} deps @param {Object} deps.ui 既存UIインスタンス（今回はDOM取得のみ） */
    constructor({ ui }) {
      this.ui = ui;
      this.el = {
        overlay: document.getElementById('evolutionTransitionOverlay'),
        themeName: document.getElementById('evolutionTransitionThemeName'),
        backgroundLabel: document.getElementById('evolutionTransitionBackgroundLabel'),
        ariaLine: document.getElementById('evolutionTransitionAriaLine'),
        skipBtn: document.getElementById('evolutionTransitionSkipBtn')
      };
      this._onComplete = null;
      this._completed = true;

      if (this.el.skipBtn) this.el.skipBtn.addEventListener('click', () => this._complete());
    }

    /**
     * @param {Object} themeDef themeManager.jsのTHEME_DEFSエントリ（name/backgroundLabel/ariaLine）
     * @param {Function} [onComplete]
     */
    show(themeDef, onComplete) {
      if (!this.el.overlay || !themeDef) { if (onComplete) onComplete(); return; }
      this._onComplete = onComplete;
      this._completed = false;

      if (this.el.themeName) this.el.themeName.textContent = themeDef.name.toUpperCase();
      if (this.el.backgroundLabel) this.el.backgroundLabel.textContent = themeDef.backgroundLabel;
      if (this.el.ariaLine) this.el.ariaLine.textContent = themeDef.ariaLine;
      this.el.overlay.classList.remove('hidden');
      // 自動で閉じるタイマーは設けない。「続ける/スキップ」ボタンのタップを待つ
      // （情報系オーバーレイは自動消滅させない、という既存フィードバック方針を踏襲）
    }

    /** 「続ける/スキップ」ボタンのクリックで呼ばれる。何度呼ばれても1回しか完了しない */
    _complete() {
      if (this._completed) return;
      this._completed = true;
      if (this.el.overlay) this.el.overlay.classList.add('hidden');
      const cb = this._onComplete;
      this._onComplete = null;
      if (cb) cb();
    }
  }

  G.EvolutionTransition = EvolutionTransition;
})(typeof globalThis !== 'undefined' ? globalThis : this);
