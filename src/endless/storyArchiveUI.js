/**
 * storyArchiveUI.js
 * STEP32「Narrative & Story System」セクション11: Research Archive UI。
 * 新画面「RESEARCH DATABASE」のDOM描画・タブ切替のみを持つ（worldEnvironmentArchive.js
 * 等と同じ「都度データを読んで再描画する」設計、状態は持たない）。
 *
 * セクション10「Research Codex統合」は、このクラス自身が他Systemへ直接アクセスせず、
 * `getCodexSummary`という読み取り専用の関数をendless.js側から注入する形にした
 * （要求仕様セクション13のアーキテクチャルール「Narrative Systemは既存ゲームロジックへ
 * 直接埋め込まない」を守るための設計判断。endless.js側は既に各Systemを束ねる
 * Coordinatorのため、Codex集計の置き場所として最も自然）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const TYPE_TABS = ['LOG', 'MEMORY', 'FILE', 'EVENT', 'AUDIO', 'ENDING'];

  class StoryArchiveUI {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.researchDatabase ResearchDatabaseインスタンス
     * @param {Object} deps.researchTimeline ResearchTimelineインスタンス
     * @param {Function} [deps.getCodexSummary] () => {[category]: {unlocked, total}} セクション10用
     */
    constructor({ ui, researchDatabase, researchTimeline, getCodexSummary }) {
      this.ui = ui;
      this.researchDatabase = researchDatabase;
      this.researchTimeline = researchTimeline;
      this.getCodexSummary = getCodexSummary || (() => ({}));
      this.onBack = null; // () => {}
      this._activeType = 'LOG';

      this.el = {
        backBtn: document.getElementById('storyArchiveBackBtn'),
        logCount: document.getElementById('storyArchiveLogCount'),
        memoryCount: document.getElementById('storyArchiveMemoryCount'),
        fileCount: document.getElementById('storyArchiveFileCount'),
        endingCount: document.getElementById('storyArchiveEndingCount'),
        codexList: document.getElementById('storyArchiveCodexList'),
        typeTabs: document.getElementById('storyArchiveTypeTabs'),
        entries: document.getElementById('storyArchiveEntries')
      };

      if (this.el.backBtn) this.el.backBtn.addEventListener('click', () => { if (this.onBack) this.onBack(); });
      if (this.el.typeTabs) {
        Array.from(this.el.typeTabs.querySelectorAll('button')).forEach(btn => {
          btn.addEventListener('click', () => {
            this._activeType = btn.dataset.type;
            this._renderTabs();
            this._renderEntries();
          });
        });
      }
    }

    show() {
      this._renderStats();
      this._renderCodex();
      this._renderTabs();
      this._renderEntries();
      if (this.researchTimeline) this.researchTimeline.render();
      this.ui.showScreen('storyArchive');
    }

    /** 要求仕様セクション11: LOG/MEMORY/FILES/ENDINGの内訳カウント */
    _renderStats() {
      const log = this.researchDatabase.getCompletionByType('LOG');
      const memory = this.researchDatabase.getCompletionByType('MEMORY');
      const file = this.researchDatabase.getCompletionByType('FILE');
      const ending = this.researchDatabase.getCompletionByType('ENDING');
      if (this.el.logCount) this.el.logCount.textContent = `${log.unlocked} / ${log.total}`;
      if (this.el.memoryCount) this.el.memoryCount.textContent = `${memory.unlocked} / ${memory.total}`;
      if (this.el.fileCount) this.el.fileCount.textContent = `${file.unlocked} / ${file.total}`;
      if (this.el.endingCount) this.el.endingCount.textContent = `${ending.unlocked} / ${ending.total}`;
    }

    /** 要求仕様セクション10: RESEARCH COMPLETION（他Systemとの横断的な完成率一覧） */
    _renderCodex() {
      const container = this.el.codexList;
      if (!container) return;
      const summary = this.getCodexSummary() || {};
      const keys = Object.keys(summary);
      container.innerHTML = keys.map(key => {
        const s = summary[key];
        return `<div class="codex-row"><span class="codex-label">${key}</span><span class="codex-value">${s.unlocked} / ${s.total}</span></div>`;
      }).join('');
    }

    _renderTabs() {
      if (!this.el.typeTabs) return;
      Array.from(this.el.typeTabs.querySelectorAll('button')).forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === this._activeType);
      });
    }

    _renderEntries() {
      const container = this.el.entries;
      if (!container) return;
      const entries = this.researchDatabase.getEntriesByType(this._activeType);
      if (entries.length === 0) {
        container.innerHTML = '<div class="rt-empty">該当する記録が無い</div>';
        return;
      }
      container.innerHTML = entries.map(e => {
        if (e.unlocked) {
          const content = (e.content || '').replace(/\n/g, '<br>');
          return `
            <div class="story-entry-card unlocked">
              <span class="story-entry-title">${e.title}</span>
              <span class="story-entry-category">${e.category}</span>
              <div class="story-entry-content">${content}</div>
            </div>
          `;
        }
        return `
          <div class="story-entry-card locked">
            <span class="story-entry-title">???</span>
            <span class="story-entry-desc">未解放</span>
          </div>
        `;
      }).join('');
    }
  }

  G.StoryArchiveUI = StoryArchiveUI;
  G.StoryArchiveTypeTabs = TYPE_TABS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
