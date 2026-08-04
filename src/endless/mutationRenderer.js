/**
 * mutationRenderer.js
 * STEP30-5「World Mutation Trigger System」セクション8: Mutation Visual Sequence、
 * およびセクション11: Mutation Choice Event。DOM描画・タイマー制御のみを持つ
 * （environmentScan.js/transitionManager.jsと同じ役割分担）。
 *
 * Visual Sequenceは3段階: 「SYSTEM WARNING」（読む情報あり）→「Mutation処理」
 * （読む情報が無い純粋な演出、自動で次へ進む）→「WORLD MUTATION Complete」
 * （読む情報あり）。読む情報がある2段階は、ユーザーフィードバック
 * 「トーストが消えるのが速すぎて読めない」を受けて自動では進めず、
 * 「続ける」ボタンのクリックを待つ（environmentScan.js/transitionManager.js/
 * ui.showNodeResultと同じ設計方針）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const PROCESSING_DURATION_MS = 800; // 読む情報が無い演出のみ自動で進める

  class MutationRenderer {
    /** @param {Object} deps @param {Object} deps.ui 既存UIインスタンス（今回はDOM取得のみ） */
    constructor({ ui }) {
      this.ui = ui;
      this.el = {
        overlay: document.getElementById('mutationSequenceOverlay'),
        warningPhase: document.getElementById('mutationPhaseWarning'),
        processingPhase: document.getElementById('mutationPhaseProcessing'),
        completePhase: document.getElementById('mutationPhaseComplete'),
        completeName: document.getElementById('mutationCompleteName'),
        completeDesc: document.getElementById('mutationCompleteDesc'),
        warningContinueBtn: document.getElementById('mutationWarningContinueBtn'),
        completeContinueBtn: document.getElementById('mutationCompleteContinueBtn'),

        choiceOverlay: document.getElementById('mutationChoiceOverlay'),
        choiceStabilizeBtn: document.getElementById('mutationChoiceStabilizeBtn'),
        choiceExploitBtn: document.getElementById('mutationChoiceExploitBtn')
      };

      this._onComplete = null;
      this._pendingDef = null;
      this._choiceStabilizeHandler = null;
      this._choiceExploitHandler = null;

      if (this.el.warningContinueBtn) this.el.warningContinueBtn.addEventListener('click', () => this._advanceToProcessing());
      if (this.el.completeContinueBtn) this.el.completeContinueBtn.addEventListener('click', () => this._finish());
      if (this.el.choiceStabilizeBtn) {
        this.el.choiceStabilizeBtn.addEventListener('click', () => {
          if (this.el.choiceOverlay) this.el.choiceOverlay.classList.add('hidden');
          if (this._choiceStabilizeHandler) this._choiceStabilizeHandler();
        });
      }
      if (this.el.choiceExploitBtn) {
        this.el.choiceExploitBtn.addEventListener('click', () => {
          if (this.el.choiceOverlay) this.el.choiceOverlay.classList.add('hidden');
          if (this._choiceExploitHandler) this._choiceExploitHandler();
        });
      }
    }

    /**
     * Mutation Visual Sequenceを表示する（要求仕様セクション8）。
     * @param {Object} mutationDef mutationData.jsの定義（既にtriggerMutation()済みのもの）
     * @param {Function} [onComplete] 「続ける」（Complete段階）クリック後に呼ばれる
     */
    show(mutationDef, onComplete) {
      if (!this.el.overlay) { if (onComplete) onComplete(); return; }
      this._onComplete = onComplete;
      this._pendingDef = mutationDef;
      clearTimeout(this._processingTimer);

      if (this.el.warningPhase) this.el.warningPhase.classList.remove('hidden');
      if (this.el.processingPhase) this.el.processingPhase.classList.add('hidden');
      if (this.el.completePhase) this.el.completePhase.classList.add('hidden');
      this.el.overlay.classList.remove('hidden');
    }

    _advanceToProcessing() {
      if (this.el.warningPhase) this.el.warningPhase.classList.add('hidden');
      if (this.el.processingPhase) this.el.processingPhase.classList.remove('hidden');
      clearTimeout(this._processingTimer);
      this._processingTimer = setTimeout(() => this._showComplete(), PROCESSING_DURATION_MS);
    }

    _showComplete() {
      if (this.el.processingPhase) this.el.processingPhase.classList.add('hidden');
      if (this.el.completePhase) this.el.completePhase.classList.remove('hidden');
      const def = this._pendingDef;
      if (this.el.completeName) this.el.completeName.textContent = def ? `${def.name} を検知` : '';
      if (this.el.completeDesc) this.el.completeDesc.textContent = def ? def.description : '';
    }

    _finish() {
      clearTimeout(this._processingTimer);
      if (this.el.overlay) this.el.overlay.classList.add('hidden');
      const cb = this._onComplete;
      this._onComplete = null;
      this._pendingDef = null;
      if (cb) cb();
    }

    /**
     * Mutation Choice Event（要求仕様セクション11）。「① Stabilize」（Stability+20、
     * Mutationは発生させない）か「② Exploit」（Mutationを発生させ、報酬/リスクに
     * ボーナスを付与する）かをプレイヤーに選ばせる。Level1/2の発生条件を満たした
     * 瞬間のみendless.js側から呼ばれる（Level3=Collapseは問答無用で発生するため対象外）。
     * @param {{onStabilize:Function, onExploit:Function}} callbacks
     */
    showChoice({ onStabilize, onExploit }) {
      if (!this.el.choiceOverlay) { if (onExploit) onExploit(); return; }
      this._choiceStabilizeHandler = onStabilize || null;
      this._choiceExploitHandler = onExploit || null;
      this.el.choiceOverlay.classList.remove('hidden');
    }
  }

  G.MutationRenderer = MutationRenderer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
