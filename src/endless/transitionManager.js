/**
 * transitionManager.js
 * STEP30-3「Environment Visual / HUD Evolution」セクション5: Environment
 * Transition演出。Environmentが変化した瞬間、environmentScan.js（Scan→Identified）
 * より前に「ENVIRONMENT SHIFT / Previous → New / Synchronizing...」を表示する。
 * DOM描画・タイマー制御のみを持つ（researchLab.js等と同じ役割分担）。
 *
 * RUNの最初のLayer（直前のEnvironmentが存在しない）では、比較対象が無いため
 * Transitionは表示せず即座にonCompleteを呼ぶ（endless.js側で`previousDef`に
 * nullを渡すことで判定する）。
 *
 * プログレスバーの進行アニメーション自体は自動で100%まで走るが（"Synchronizing..."の
 * 純粋な演出）、オーバーレイ自体は自動では閉じない。読む情報（Previous/New環境名）が
 * ある画面のため、「続ける」ボタンをプレイヤーが押すまで表示し続ける（ユーザー
 * フィードバック「トーストが消えるのが速すぎて読めない」を受けた変更）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const TRANSITION_DURATION_MS = 1200;
  const PROGRESS_TICK_MS = 100;

  class TransitionManager {
    /** @param {Object} deps @param {Object} deps.ui 既存UIインスタンス（今回はDOM取得のみ） */
    constructor({ ui }) {
      this.ui = ui;
      this.el = {
        overlay: document.getElementById('environmentTransitionOverlay'),
        previousName: document.getElementById('environmentTransitionPrevious'),
        newName: document.getElementById('environmentTransitionNew'),
        progressFill: document.getElementById('environmentTransitionProgressFill'),
        progressPercent: document.getElementById('environmentTransitionProgressPercent'),
        skipBtn: document.getElementById('environmentTransitionSkipBtn')
      };
      this._onComplete = null;
      this._completed = true;

      if (this.el.skipBtn) this.el.skipBtn.addEventListener('click', () => this._complete());
    }

    /**
     * @param {Object|null} previousDef 直前のEnvironment定義（RUN最初のLayerではnull）
     * @param {Object} newDef 新しく確定したEnvironment定義
     * @param {Function} [onComplete]
     */
    show(previousDef, newDef, onComplete) {
      if (!this.el.overlay || !previousDef) { if (onComplete) onComplete(); return; }
      this._onComplete = onComplete;
      this._completed = false;

      if (this.el.previousName) this.el.previousName.textContent = previousDef.name;
      if (this.el.newName) this.el.newName.textContent = newDef.name;
      this._setProgress(0);
      this.el.overlay.classList.remove('hidden');

      this._clearTimers();
      const startTime = Date.now();
      this._progressInterval = setInterval(() => {
        const pct = Math.min(100, Math.round(((Date.now() - startTime) / TRANSITION_DURATION_MS) * 100));
        this._setProgress(pct);
        if (pct >= 100) clearInterval(this._progressInterval);
      }, PROGRESS_TICK_MS);
      // オーバーレイ自体を自動で閉じるタイマーは設けない。「続ける」ボタンのクリックを待つ
    }

    _setProgress(pct) {
      if (this.el.progressFill) this.el.progressFill.style.width = `${pct}%`;
      if (this.el.progressPercent) this.el.progressPercent.textContent = `${pct}%`;
    }

    _clearTimers() {
      clearInterval(this._progressInterval);
    }

    /** 「続ける」ボタンのクリックで呼ばれる。何度呼ばれても1回しか完了しない */
    _complete() {
      if (this._completed) return;
      this._completed = true;
      this._clearTimers();
      if (this.el.overlay) this.el.overlay.classList.add('hidden');
      const cb = this._onComplete;
      this._onComplete = null;
      if (cb) cb();
    }
  }

  G.TransitionManager = TransitionManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
