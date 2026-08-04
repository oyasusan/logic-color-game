/**
 * memoryArchiveUI.js
 * STEP32-3「Memory Fragment System」セクション4: Memory Viewer UI。
 * 新画面「MEMORY ARCHIVE」のDOM描画のみを持つ（storyArchiveUI.js等と同じ
 * 「都度データを読んで再描画する」設計、状態は持たない）。
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
     */
    constructor({ ui, memoryManager }) {
      this.ui = ui;
      this.memoryManager = memoryManager;
      this.onBack = null; // () => {}

      this.el = {
        backBtn: document.getElementById('memoryArchiveBackBtn'),
        collected: document.getElementById('memoryArchiveCollected'),
        list: document.getElementById('memoryArchiveList')
      };

      if (this.el.backBtn) this.el.backBtn.addEventListener('click', () => { if (this.onBack) this.onBack(); });
    }

    show() {
      this._render();
      this.ui.showScreen('memoryArchive');
    }

    /** 要求仕様セクション4「Collected: X / Y」 */
    _renderProgress() {
      if (!this.el.collected) return;
      const progress = this.memoryManager.getMemoryProgress();
      this.el.collected.textContent = `${progress.collected} / ${progress.total}`;
    }

    _renderList() {
      const container = this.el.list;
      if (!container) return;

      container.innerHTML = MemoryData.ALL.map(m => {
        const collected = this.memoryManager.hasMemory(m.id);
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
        return `
          <div class="memory-card">
            <div class="memory-card-header">
              <span class="memory-card-title">${m.title}</span>
              <span class="memory-card-status">YES</span>
            </div>
            ${character ? `<div class="memory-card-character">Character: ${character.name}</div>` : ''}
            <div class="memory-card-content">${m.content}</div>
          </div>
        `;
      }).join('');
    }

    _render() {
      this._renderProgress();
      this._renderList();
    }
  }

  G.MemoryArchiveUI = MemoryArchiveUI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
