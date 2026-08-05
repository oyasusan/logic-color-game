/**
 * characterArchiveUI.js
 * STEP32-4「Character Relationship System」セクション8: Character Status UI。
 * 新画面「CHARACTER ARCHIVE」のDOM描画のみを持つ（memoryArchiveUI.js等と同じ
 * 「都度データを読んで再描画する」設計、状態は持たない）。
 *
 * STEP40-2: Archiveの「CURRENT RUN」/「COLLECTION」タブに対応した。
 *   - CURRENT RUN: 今の周回のState/Relationship（既存どおりrelationshipManager経由）
 *   - COLLECTION: 全周回を通じて一度でも発見したことがあるキャラクターの一覧＋
 *     初回発見日時・Layer（metaData.collectionCharacter、NEW RESEARCHでもクリアされない）。
 *     State/Relationshipは周回ごとの値のため、Collectionタブでは表示せず
 *     「発見済み/未発見」のみを示す
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
     * @param {Object} [deps.save] STEP40-2: Collectionタブ（生涯記録）の表示に使う
     */
    constructor({ ui, relationshipManager, memoryManager, save }) {
      this.ui = ui;
      this.relationshipManager = relationshipManager;
      this.memoryManager = memoryManager;
      this.save = save || null;
      this.onBack = null; // () => {}
      this.mode = 'currentRun'; // STEP40-2: 'currentRun'|'collection'

      this.el = {
        backBtn: document.getElementById('characterArchiveBackBtn'),
        list: document.getElementById('characterArchiveList'),
        tabCurrentRun: document.getElementById('characterArchiveTabCurrentRun'),
        tabCollection: document.getElementById('characterArchiveTabCollection')
      };

      if (this.el.backBtn) this.el.backBtn.addEventListener('click', () => { if (this.onBack) this.onBack(); });
      if (this.el.tabCurrentRun) this.el.tabCurrentRun.addEventListener('click', () => this._setMode('currentRun'));
      if (this.el.tabCollection) this.el.tabCollection.addEventListener('click', () => this._setMode('collection'));
    }

    show(mode) {
      this.mode = mode || this.mode;
      this._render();
      this.ui.showScreen('characterArchive');
    }

    _setMode(mode) {
      this.mode = mode;
      this._render();
    }

    _renderTabs() {
      if (this.el.tabCurrentRun) this.el.tabCurrentRun.classList.toggle('active', this.mode === 'currentRun');
      if (this.el.tabCollection) this.el.tabCollection.classList.toggle('active', this.mode === 'collection');
    }

    _render() {
      this._renderTabs();
      const container = this.el.list;
      if (!container) return;

      // system（SYSTEM話者）はキャラクターとしての関係性を持たないため一覧から除外する
      const characters = CharacterData.ALL.filter(c => c.id !== 'system');
      const collectionRecords = this.mode === 'collection' && this.save ? this.save.getCharacterCollection() : {};

      container.innerHTML = characters.map(c => {
        if (this.mode === 'collection' && this.save) {
          const record = collectionRecords[c.id];
          const state = this.relationshipManager.getCharacterState(c.id);
          // player/aria等、最初からUNKNOWNではないキャラクターは「発見」概念が無いため常に発見済み扱い
          const alwaysKnown = state !== 'UNKNOWN' && !record;
          if (!record && !alwaysKnown) {
            return `
              <div class="character-card locked">
                <span class="character-card-name">???</span>
              </div>
            `;
          }
          const detail = record
            ? `<div class="character-card-row"><span class="character-card-label">初回発見</span><span class="character-card-value">Layer ${record.firstDiscoveredLayer != null ? record.firstDiscoveredLayer : '-'} / ${new Date(record.firstDiscoveredAt).toLocaleDateString('ja-JP')}</span></div>`
            : '';
          return `
            <div class="character-card">
              <div class="character-card-name">${c.name}</div>
              ${detail}
            </div>
          `;
        }

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
