/**
 * memoryArchiveUI.js
 * STEP32-3「Memory Fragment System」セクション4: Memory Viewer UI。
 * 新画面「MEMORY ARCHIVE」のDOM描画のみを持つ（storyArchiveUI.js等と同じ
 * 「都度データを読んで再描画する」設計、状態は持たない）。
 *
 * STEP40-2: Archiveの「CURRENT RUN」/「COLLECTION」タブに対応した。
 *   - CURRENT RUN: 今の周回（storyData）で取得済みのMemoryのみ（既存のmemoryManager
 *     経由の判定をそのまま使う。周回が変わればNEW RESEARCHでクリアされる）
 *   - COLLECTION: 全周回を通じて一度でも取得したことがあるMemory（metaData、
 *     初回取得日時・Layerも表示する）。NEW RESEARCHでもクリアされない
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { MemoryData, CharacterData } = G;

  class MemoryArchiveUI {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.memoryManager MemoryManagerインスタンス
     * @param {Object} [deps.save] STEP40-2: Collectionタブ（生涯記録）の表示に使う
     */
    constructor({ ui, memoryManager, save }) {
      this.ui = ui;
      this.memoryManager = memoryManager;
      this.save = save || null;
      this.onBack = null; // () => {}
      this.mode = 'currentRun'; // STEP40-2: 'currentRun'|'collection'

      this.el = {
        backBtn: document.getElementById('memoryArchiveBackBtn'),
        collected: document.getElementById('memoryArchiveCollected'),
        list: document.getElementById('memoryArchiveList'),
        tabCurrentRun: document.getElementById('memoryArchiveTabCurrentRun'),
        tabCollection: document.getElementById('memoryArchiveTabCollection')
      };

      if (this.el.backBtn) this.el.backBtn.addEventListener('click', () => { if (this.onBack) this.onBack(); });
      if (this.el.tabCurrentRun) this.el.tabCurrentRun.addEventListener('click', () => this._setMode('currentRun'));
      if (this.el.tabCollection) this.el.tabCollection.addEventListener('click', () => this._setMode('collection'));
    }

    show(mode) {
      this.mode = mode || this.mode;
      this._render();
      this.ui.showScreen('memoryArchive');
    }

    _setMode(mode) {
      this.mode = mode;
      this._render();
    }

    _renderTabs() {
      if (this.el.tabCurrentRun) this.el.tabCurrentRun.classList.toggle('active', this.mode === 'currentRun');
      if (this.el.tabCollection) this.el.tabCollection.classList.toggle('active', this.mode === 'collection');
    }

    /** 要求仕様セクション4「Collected: X / Y」（モードに応じてCurrent Run/生涯Collectionを切替） */
    _renderProgress() {
      if (!this.el.collected) return;
      const progress = this.mode === 'collection' && this.save
        ? this.save.getMemoryCollectionProgress()
        : this.memoryManager.getMemoryProgress();
      this.el.collected.textContent = `${progress.collected} / ${progress.total}`;
    }

    _isCollected(id) {
      if (this.mode === 'collection' && this.save) return !!this.save.getMemoryCollection()[id];
      return this.memoryManager.hasMemory(id);
    }

    _renderList() {
      const container = this.el.list;
      if (!container) return;
      const collectionRecords = this.mode === 'collection' && this.save ? this.save.getMemoryCollection() : {};

      container.innerHTML = MemoryData.ALL.map(m => {
        const collected = this._isCollected(m.id);
        if (!collected) {
          return `
            <div class="memory-card locked">
              <span class="memory-card-title">???</span>
              <span class="memory-card-status">NO</span>
            </div>
          `;
        }
        // 要求仕様セクション7: Character Memory Association。関連キャラクターがあれば表示する
        const character = m.character ? CharacterData.getById(m.character) : null;
        const record = collectionRecords[m.id];
        const detail = (this.mode === 'collection' && record)
          ? `<div class="memory-card-detail">初回取得: Layer ${record.firstUnlockedLayer != null ? record.firstUnlockedLayer : '-'} / ${new Date(record.firstUnlockedAt).toLocaleDateString('ja-JP')}</div>`
          : '';
        return `
          <div class="memory-card">
            <div class="memory-card-header">
              <span class="memory-card-title">${m.title}</span>
              <span class="memory-card-status">YES</span>
            </div>
            ${character ? `<div class="memory-card-character">Character: ${character.name}</div>` : ''}
            <div class="memory-card-content">${m.content}</div>
            ${detail}
          </div>
        `;
      }).join('');
    }

    _render() {
      this._renderTabs();
      this._renderProgress();
      this._renderList();
    }
  }

  G.MemoryArchiveUI = MemoryArchiveUI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
