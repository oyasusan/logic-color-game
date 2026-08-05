/**
 * dialogueManager.js
 * STEP32-2「Dialogue System」セクション1: DialogueManager。
 * Dialogue開始・セリフ送り・終了・既読管理（dialogueHistory経由）を統括する
 * Coordinator本体。実際の文字送り演出・タップ処理はui.js（Dialogue UI）側の責務、
 * このクラス自身はDOMに一切触れない（researchDatabase.js等と同じ「Coordinator+
 * 描画はUI側」という役割分担）。
 *
 * 【要求仕様セクション6のStoryEvent連携フロー】
 *   Layer Clear → StoryEventManager(layerStoryEventManager.js) → DialogueManager.
 *   startDialogue() → Dialogue終了 → StoryManager更新
 * のうち、「StoryManager更新」はStoryManager.onLayerClear()側で既にLayerクリアの
 * 瞬間に同期的に完了済み（STEP32-1の設計）のため、Dialogue終了時に追加で呼ぶ
 * StoryManager APIは無い。実際の呼び出し順序の組み立てはendless.js側の責務。
 *
 * 【要求仕様セクション9 Endless Research互換について】Dialogue Systemの実際の
 * トリガー元は、STEP32-1で実装済みのStoryManager.onLayerClear()（endless.jsの
 * _handleRoundClear経由、ENDLESS RESEARCHのLayerクリア時に発火）のみであり、
 * 別システムのSTEP32 Story Scenario Framework（storyMode.js、CASE001〜006の
 * 独立Scenario）には一切配線していない。要求仕様の「Dialogue SystemはStory Mode
 * のみ使用。Endless Researchでは無効」は、この2つの独立した「Story」系システムを
 * 混在させない（Layer Narrative System側にのみ属する）という要件として解釈した
 * （実装上の唯一のトリガー元がENDLESS RESEARCHのLayerクリアである以上、文字どおり
 * 「Endless Research中は一切発火しない」と読むと要求仕様セクション6のフロー自体が
 * 成立しなくなるため）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { DialogueData, CharacterData } = G;

  class DialogueManager {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showDialogue/hideDialogueを再利用する）
     * @param {Object} deps.save EndlessSaveStoreインスタンス
     * @param {Object} [deps.relationshipManager] STEP32-4: Dialogue条件判定（要求仕様
     *   セクション5）に使う。省略時（未実装当時の呼び出し元との後方互換）はcondition
     *   フィールドを持つDialogueも無条件で表示される
     */
    constructor({ ui, save, relationshipManager }) {
      this.ui = ui;
      this.save = save;
      this.relationshipManager = relationshipManager || null;
      this._dialogue = null;
      this._lineIndex = 0;
      this._playing = false;
      this.onComplete = null; // (dialogueId) => {} Dialogue終了時に呼び出し側（endless.js）が差し込む
    }

    /** 要求仕様セクション1のAPI。会話中かどうか */
    isPlaying() {
      return this._playing;
    }

    /**
     * 要求仕様セクション1のAPI。指定Dialogue開始。
     * @param {string} dialogueId
     * @returns {boolean} 実際に開始できればtrue（既読/未定義idの場合はfalseで何もしない）
     */
    startDialogue(dialogueId) {
      if (this.save.isDialogueCompleted(dialogueId)) return false; // 要求仕様セクション8: 既読は再表示しない
      const dialogue = DialogueData.getById(dialogueId);
      if (!dialogue || !dialogue.lines || dialogue.lines.length === 0) return false;
      // STEP32-4セクション5: Dialogue条件対応。conditionを満たさない間は表示しない
      if (dialogue.condition && this.relationshipManager && !this.relationshipManager.checkCondition(dialogue.condition)) return false;

      this._dialogue = dialogue;
      this._lineIndex = 0;
      this._playing = true;
      this._showCurrentLine();
      return true;
    }

    _showCurrentLine() {
      const line = this._dialogue.lines[this._lineIndex];
      const character = CharacterData.getById(line.speaker);
      this.ui.showDialogue({
        speakerName: character ? character.name : line.speaker,
        text: line.text,
        speakerId: line.speaker, // STEP43.5: Dialogue Text Sound（キャラクター別tick音）
        onTap: () => this.nextLine()
      });
    }

    /** 要求仕様セクション1のAPI。次のセリフへ（最終行なら終了処理へ委ねる） */
    nextLine() {
      if (!this._playing) return;
      if (this._lineIndex < this._dialogue.lines.length - 1) {
        this._lineIndex++;
        this._showCurrentLine();
      } else {
        this.endDialogue();
      }
    }

    /** 要求仕様セクション1のAPI。終了処理。dialogueHistoryへ既読記録した上でUIを閉じる */
    endDialogue() {
      if (!this._playing) return;
      const dialogueId = this._dialogue.id;
      this.save.recordDialogueCompleted(dialogueId);
      this._playing = false;
      this._dialogue = null;
      this._lineIndex = 0;
      this.ui.hideDialogue();
      if (this.onComplete) this.onComplete(dialogueId);
    }
  }

  G.DialogueManager = DialogueManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
