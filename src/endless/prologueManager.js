/**
 * prologueManager.js
 * STEP40-3「PROLOGUE『Awakening』」セクション2: Prologue Manager。
 * Chapter0（Layer1開始前の導入シーケンス）のDOM描画・進行制御を担当する
 * Coordinator本体（researchLab.js/protocolSignal.js等と同じ「都度データを読んで
 * 再描画する、状態はシーケンス進行中の最小限のみ持つ」設計）。
 *
 * Scene構成（prologueData.js参照）:
 *   Scene001 System Boot（専用パネル、会話ではないため独自DOM）
 *   → Scene002 Researcher-01 Awakening（Dialogue、既存DialogueManagerを再利用）
 *   → Scene003 ARIA First Contact（Dialogue）
 *   → Scene004 First Mission（Dialogue→Mission Briefingパネル）
 *   → onComplete（呼び出し側=endless.jsがstartRun()へ進める）
 *
 * 情報量が多く読む必要がある演出のため、既存の方針（フィードバック
 * 「情報系オーバーレイは自動消滅させない」）どおり、各Sceneは「続ける」ボタンを
 * 押すまで自動では進まない。Dialogue部分は既存のDialogueManager/ui.showDialogue()
 * （タップで全文表示→次のタップで次のセリフ）をそのまま流用する。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { PrologueData } = G;

  class PrologueManager {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.dialogueManager 既存DialogueManagerインスタンス（Scene002〜004の会話部分に使う）
     */
    constructor({ ui, dialogueManager }) {
      this.ui = ui;
      this.dialogueManager = dialogueManager;
      this.onComplete = null; // () => {} シーケンス完了時、呼び出し側（endless.js）が差し込む

      this.el = {
        bootPanel: document.getElementById('prologueBootPanel'),
        bootLines: document.getElementById('prologueBootLines'),
        bootContinueBtn: document.getElementById('prologueBootContinueBtn'),
        missionPanel: document.getElementById('prologueMissionPanel'),
        missionTitle: document.getElementById('prologueMissionTitle'),
        missionContinueBtn: document.getElementById('prologueMissionContinueBtn')
      };

      if (this.el.bootContinueBtn) {
        this.el.bootContinueBtn.addEventListener('click', () => this._afterBootScene());
      }
      if (this.el.missionContinueBtn) {
        this.el.missionContinueBtn.addEventListener('click', () => this._finish());
      }
    }

    /** MODE SELECTの「NEW RESEARCH」からのみ呼ばれる。@param {Function} onComplete Prologue完了後に呼ぶ */
    show(onComplete) {
      this.onComplete = onComplete;
      this._renderBootScene();
      this.ui.showScreen('prologue');
      if (this.el.missionPanel) this.el.missionPanel.classList.add('hidden');
      if (this.el.bootPanel) this.el.bootPanel.classList.remove('hidden');
    }

    /** Scene001 System Boot: ステータス行を描画する（ok:falseの項目はエラー色で強調） */
    _renderBootScene() {
      const container = this.el.bootLines;
      if (!container) return;
      container.innerHTML = PrologueData.BOOT_LINES.map(line => `
        <div class="prologue-boot-line">
          <span class="prologue-boot-label">${line.label}</span>
          <span class="prologue-boot-status ${line.ok ? 'ok' : 'error'}">${line.status}</span>
        </div>
      `).join('');
    }

    _afterBootScene() {
      if (this.el.bootPanel) this.el.bootPanel.classList.add('hidden');
      this._playDialogueScene('prologue_awakening', () => this._playAriaContactScene());
    }

    _playAriaContactScene() {
      this._playDialogueScene('prologue_aria_contact', () => this._playFirstMissionScene());
    }

    _playFirstMissionScene() {
      this._playDialogueScene('prologue_first_mission', () => this._showMissionBriefing());
    }

    /** @param {string} dialogueId @param {Function} onDone 未定義/既読の場合も含め必ず1回呼ばれる */
    _playDialogueScene(dialogueId, onDone) {
      this.dialogueManager.onComplete = () => onDone();
      if (!this.dialogueManager.startDialogue(dialogueId)) onDone();
    }

    /** Scene004後半: Mission Briefingパネル（ARIA Dialogueの後に表示する） */
    _showMissionBriefing() {
      if (this.el.missionTitle) this.el.missionTitle.textContent = PrologueData.MISSION_TITLE;
      if (this.el.missionPanel) this.el.missionPanel.classList.remove('hidden');
    }

    _finish() {
      if (this.el.missionPanel) this.el.missionPanel.classList.add('hidden');
      const callback = this.onComplete;
      this.onComplete = null;
      if (callback) callback();
    }
  }

  G.PrologueManager = PrologueManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
