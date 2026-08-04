/**
 * characterArchiveUI.js
 * STEP32-4「Character Relationship System」セクション8: Character Status UI。
 * 新画面「CHARACTER ARCHIVE」のDOM描画のみを持つ（memoryArchiveUI.js等と同じ
 * 「都度データを読んで再描画する」設計、状態は持たない）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { CharacterData, MemoryData, RelationshipData } = G;

  class CharacterArchiveUI {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.relationshipManager RelationshipManagerインスタンス
     * @param {Object} deps.memoryManager MemoryManagerインスタンス（Memory X/Y表示用）
     */
    constructor({ ui, relationshipManager, memoryManager }) {
      this.ui = ui;
      this.relationshipManager = relationshipManager;
      this.memoryManager = memoryManager;
      this.onBack = null; // () => {}

      this.el = {
        backBtn: document.getElementById('characterArchiveBackBtn'),
        list: document.getElementById('characterArchiveList')
      };

      if (this.el.backBtn) this.el.backBtn.addEventListener('click', () => { if (this.onBack) this.onBack(); });
    }

    show() {
      this._render();
      this.ui.showScreen('characterArchive');
    }

    _render() {
      const container = this.el.list;
      if (!container) return;

      // system（SYSTEM話者）はキャラクターとしての関係性を持たないため一覧から除外する
      const characters = CharacterData.ALL.filter(c => c.id !== 'system');

      container.innerHTML = characters.map(c => {
        const state = this.relationshipManager.getCharacterState(c.id);
        const stateName = RelationshipData.getStateName(c.id, state);
        const relationship = this.relationshipManager.getRelationship(c.id);
        const memoriesForCharacter = MemoryData.ALL.filter(m => m.character === c.id);
        const collectedForCharacter = memoriesForCharacter.filter(m => this.memoryManager.hasMemory(m.id)).length;

        return `
          <div class="character-card">
            <div class="character-card-name">${c.name}</div>
            <div class="character-card-row"><span class="character-card-label">State</span><span class="character-card-value">${stateName}</span></div>
            <div class="character-card-row"><span class="character-card-label">Memory</span><span class="character-card-value">${collectedForCharacter} / ${memoriesForCharacter.length}</span></div>
            <div class="character-card-row"><span class="character-card-label">Relationship</span><span class="character-card-value">${relationship}</span></div>
          </div>
        `;
      }).join('');
    }
  }

  G.CharacterArchiveUI = CharacterArchiveUI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
