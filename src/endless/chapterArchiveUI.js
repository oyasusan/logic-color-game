/**
 * chapterArchiveUI.js
 * STEP33「Research Archive System」セクション2: Story Archive。
 * `layerStoryData.js`（Chapter Data）と`layerStoryProgress`（Save Data）を参照し、
 * 各Chapterのtitle/unlock状態/completion状態/Layer進行を一覧表示する。
 *
 * 【命名について】既存の`storyArchiveUI.js`（STEP32 Narrative & Story System、
 * 画面タイトル「RESEARCH DATABASE」、LOG/MEMORY/FILE等のStoryEntryを扱う）とは
 * 別物のため、衝突を避けて`ChapterArchiveUI`／画面id`screen-chapterarchive`と
 * 命名した（Layer Narrative SystemのChapter進行専用の一覧画面）。
 *
 * DOM描画のみを持ち、状態は持たない（他のArchive系クラスと同じ「都度saveを読んで
 * 再描画する」設計）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { LayerStoryData } = G;

  class ChapterArchiveUI {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.save EndlessSaveStoreインスタンス（layerStoryProgressを読む）
     */
    constructor({ ui, save }) {
      this.ui = ui;
      this.save = save;
      this.onBack = null; // () => {}

      this.el = {
        backBtn: document.getElementById('chapterArchiveBackBtn'),
        list: document.getElementById('chapterArchiveList')
      };

      if (this.el.backBtn) this.el.backBtn.addEventListener('click', () => { if (this.onBack) this.onBack(); });
    }

    show() {
      this._render();
      this.ui.showScreen('chapterArchive');
    }

    _render() {
      const container = this.el.list;
      if (!container) return;
      const progress = this.save.getLayerStoryProgress();

      container.innerHTML = LayerStoryData.ALL.map(chapter => {
        const completed = progress.completedChapters.indexOf(chapter.id) !== -1;
        const isCurrent = chapter.id === progress.currentChapter;
        const unlocked = completed || isCurrent;
        const totalLayers = chapter.endLayer - chapter.startLayer + 1;

        if (!unlocked) {
          return `
            <div class="chapter-archive-card locked">
              <span class="chapter-archive-title">???</span>
              <span class="chapter-archive-status">LOCKED</span>
            </div>
          `;
        }

        let layerProgressText;
        if (completed) {
          layerProgressText = `${totalLayers} / ${totalLayers}`;
        } else {
          const layerInChapter = Math.min(Math.max(progress.currentLayer - chapter.startLayer + 1, 0), totalLayers);
          layerProgressText = `${layerInChapter} / ${totalLayers}`;
        }

        return `
          <div class="chapter-archive-card">
            <div class="chapter-archive-header">
              <span class="chapter-archive-title">${chapter.title}</span>
              <span class="chapter-archive-status">${completed ? 'COMPLETE' : 'IN PROGRESS'}</span>
            </div>
            <div class="chapter-archive-layer">Layer ${layerProgressText}</div>
          </div>
        `;
      }).join('');
    }
  }

  G.ChapterArchiveUI = ChapterArchiveUI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
