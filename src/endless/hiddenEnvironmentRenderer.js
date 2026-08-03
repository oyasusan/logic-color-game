/**
 * hiddenEnvironmentRenderer.js
 * STEP30-7「Hidden Environment System」セクション5: Discovery Sequence、
 * セクション6: Hidden HUD。DOM描画・タイマー制御のみを持つ（mutationRenderer.js/
 * environmentScan.jsと同じ役割分担、実際の入場処理・効果適用はendless.js側の責務）。
 *
 * Discovery Sequenceは3段階: 「UNKNOWN SIGNAL」（decorative、自動で次へ）→
 * 「Decrypting...」（decorative、自動で次へ）→「SECRET ENVIRONMENT FOUND / 名前」
 * （情報あり、自動では閉じない）。「続ける」ボタンはどの段階でもクリック可能で、
 * 押された瞬間の段階に関わらずシーケンス全体を終了する（environmentScan.jsと
 * 同じ設計。decorative段階のみのスキップになる分には情報を読み逃す心配が無い）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const SIGNAL_DURATION_MS = 700;
  const DECRYPT_DURATION_MS = 1000;

  class HiddenEnvironmentRenderer {
    constructor() {
      this.el = {
        overlay: document.getElementById('hiddenDiscoveryOverlay'),
        phaseSignal: document.getElementById('hiddenPhaseSignal'),
        phaseDecrypting: document.getElementById('hiddenPhaseDecrypting'),
        phaseFound: document.getElementById('hiddenPhaseFound'),
        decryptProgressFill: document.getElementById('hiddenDecryptProgressFill'),
        foundName: document.getElementById('hiddenFoundName'),
        foundTheme: document.getElementById('hiddenFoundTheme'),
        skipBtn: document.getElementById('hiddenDiscoverySkipBtn'),

        hudPanel: document.getElementById('hiddenHudPanel'),
        hudName: document.getElementById('hiddenHudName')
      };

      this._onComplete = null;
      this._completed = true;

      if (this.el.skipBtn) this.el.skipBtn.addEventListener('click', () => this._complete());
    }

    /**
     * Discovery Sequenceを表示する（要求仕様セクション5）。
     * @param {Object} def hiddenEnvironmentData.jsの定義
     * @param {Function} [onComplete] 「続ける」クリック後に呼ばれる
     */
    showDiscovery(def, onComplete) {
      if (!this.el.overlay) { if (onComplete) onComplete(); return; }
      this._onComplete = onComplete;
      this._completed = false;
      this._clearTimers();

      if (this.el.phaseSignal) this.el.phaseSignal.classList.remove('hidden');
      if (this.el.phaseDecrypting) this.el.phaseDecrypting.classList.add('hidden');
      if (this.el.phaseFound) this.el.phaseFound.classList.add('hidden');
      if (this.el.decryptProgressFill) this.el.decryptProgressFill.style.width = '0%';
      this.el.overlay.classList.remove('hidden');

      this._timer1 = setTimeout(() => {
        if (this._completed) return;
        if (this.el.phaseSignal) this.el.phaseSignal.classList.add('hidden');
        if (this.el.phaseDecrypting) this.el.phaseDecrypting.classList.remove('hidden');
        const startTime = Date.now();
        this._progressInterval = setInterval(() => {
          const pct = Math.min(100, Math.round(((Date.now() - startTime) / DECRYPT_DURATION_MS) * 100));
          if (this.el.decryptProgressFill) this.el.decryptProgressFill.style.width = `${pct}%`;
          if (pct >= 100) clearInterval(this._progressInterval);
        }, 100);

        this._timer2 = setTimeout(() => {
          if (this._completed) return;
          if (this.el.phaseDecrypting) this.el.phaseDecrypting.classList.add('hidden');
          if (this.el.phaseFound) this.el.phaseFound.classList.remove('hidden');
          if (this.el.foundName) this.el.foundName.textContent = def.name;
          if (this.el.foundTheme) this.el.foundTheme.textContent = def.theme || def.description;
          // Phase3は情報を読む必要があるため自動では進めない。「続ける」ボタンのクリックを待つ
        }, DECRYPT_DURATION_MS);
      }, SIGNAL_DURATION_MS);
    }

    _clearTimers() {
      clearTimeout(this._timer1);
      clearTimeout(this._timer2);
      clearInterval(this._progressInterval);
    }

    _complete() {
      if (this._completed) return;
      this._completed = true;
      this._clearTimers();
      if (this.el.overlay) this.el.overlay.classList.add('hidden');
      const cb = this._onComplete;
      this._onComplete = null;
      if (cb) cb();
    }

    /** ---------------- Hidden HUD（要求仕様セクション6） ---------------- */

    /** @param {Object} def hiddenEnvironmentData.jsの定義。入場中のみ呼ぶ */
    showHud(def) {
      if (!this.el.hudPanel) return;
      if (this.el.hudName) this.el.hudName.textContent = def.name;
      this.el.hudPanel.classList.remove('hidden');
    }

    hideHud() {
      if (this.el.hudPanel) this.el.hudPanel.classList.add('hidden');
    }
  }

  G.HiddenEnvironmentRenderer = HiddenEnvironmentRenderer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
