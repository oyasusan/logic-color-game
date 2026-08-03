/**
 * environmentEventPanel.js
 * STEP30-6「Environment Event System」セクション10/11: Event Choice UI / Event UI
 * Component。DOM描画・「続ける」ボタンのクリック待ちのみを持つ（mutationRenderer.js/
 * environmentScan.jsと同じ役割分担、実際の効果適用・分岐判定はendless.js側の責務）。
 *
 * ユーザーフィードバック「トーストが消えるのが速すぎて読めない」（STEP30-3以降、
 * README/[[project-logic-color-game]]参照）を踏襲し、Result表示・Choice表示いずれも
 * 自動では閉じない。プレイヤーがボタンを押すまで表示し続ける。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class EnvironmentEventPanel {
    constructor() {
      this.el = {
        overlay: document.getElementById('environmentEventOverlay'),
        icon: document.getElementById('envEventIcon'),
        name: document.getElementById('envEventName'),
        desc: document.getElementById('envEventDesc'),
        log: document.getElementById('envEventLog'),
        continueBtn: document.getElementById('envEventContinueBtn'),

        choiceOverlay: document.getElementById('environmentEventChoiceOverlay'),
        choiceName: document.getElementById('envEventChoiceName'),
        choiceDesc: document.getElementById('envEventChoiceDesc'),
        choiceYesBtn: document.getElementById('envEventChoiceYesBtn'),
        choiceNoBtn: document.getElementById('envEventChoiceNoBtn')
      };

      this._onContinue = null;
      this._onYes = null;
      this._onNo = null;

      if (this.el.continueBtn) this.el.continueBtn.addEventListener('click', () => this._finish());
      if (this.el.choiceYesBtn) {
        this.el.choiceYesBtn.addEventListener('click', () => {
          if (this.el.choiceOverlay) this.el.choiceOverlay.classList.add('hidden');
          if (this._onYes) this._onYes();
        });
      }
      if (this.el.choiceNoBtn) {
        this.el.choiceNoBtn.addEventListener('click', () => {
          if (this.el.choiceOverlay) this.el.choiceOverlay.classList.add('hidden');
          if (this._onNo) this._onNo();
        });
      }
    }

    /**
     * 通常Event（Choiceを持たない）の結果表示。
     * @param {Object} eventDef environmentEventData.jsの定義
     * @param {string} message 効果適用結果の説明文（endless.js側で組み立てたもの）
     * @param {Function} [onContinue] 「続ける」クリック後に呼ばれる
     */
    show(eventDef, message, onContinue) {
      if (!this.el.overlay) { if (onContinue) onContinue(); return; }
      this._onContinue = onContinue;
      if (this.el.icon) this.el.icon.textContent = '✨';
      if (this.el.name) this.el.name.textContent = `EVENT: ${eventDef.name}`;
      if (this.el.desc) this.el.desc.textContent = message || eventDef.description;
      if (this.el.log) this.el.log.textContent = eventDef.logMessage ? `"${eventDef.logMessage}"` : '';
      this.el.overlay.classList.remove('hidden');
    }

    _finish() {
      if (this.el.overlay) this.el.overlay.classList.add('hidden');
      const cb = this._onContinue;
      this._onContinue = null;
      if (cb) cb();
    }

    /**
     * Choice Event（Unknown Signal）の選択UI。
     * @param {Object} eventDef environmentEventData.jsの定義（choicesを持つ）
     * @param {{onYes:Function, onNo:Function}} callbacks
     */
    showChoice(eventDef, { onYes, onNo }) {
      if (!this.el.choiceOverlay) { if (onNo) onNo(); return; }
      this._onYes = onYes || null;
      this._onNo = onNo || null;
      if (this.el.choiceName) this.el.choiceName.textContent = eventDef.name;
      if (this.el.choiceDesc) this.el.choiceDesc.textContent = eventDef.description;
      this.el.choiceOverlay.classList.remove('hidden');
    }
  }

  G.EnvironmentEventPanel = EnvironmentEventPanel;
})(typeof globalThis !== 'undefined' ? globalThis : this);
