/**
 * scenarioSelectUI.js
 * STEP32「Story Scenario Framework」セクション12: Scenario Select UI。
 * 新画面「STORY RESEARCH」のDOM描画・カード選択のイベント配線のみを持つ
 * （protocolSelect.js/mapUI.jsと同じ「都度データを読んで再描画する」設計、
 * 選択結果の適用（Scenario開始）はstoryMode.js側の責務）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class ScenarioSelectUI {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.scenarioManager ScenarioManagerインスタンス
     */
    constructor({ ui, scenarioManager }) {
      this.ui = ui;
      this.scenarioManager = scenarioManager;
      this.onSelect = null; // (scenarioId) => {}
      this.onBack = null;   // () => {}

      this.el = {
        backBtn: document.getElementById('storyResearchBackBtn'),
        cards: document.getElementById('storyResearchCards')
      };

      if (this.el.backBtn) this.el.backBtn.addEventListener('click', () => { if (this.onBack) this.onBack(); });
    }

    show() {
      this._render();
      this.ui.showScreen('storyResearch');
    }

    _render() {
      const container = this.el.cards;
      if (!container) return;
      const scenarios = this.scenarioManager.getAvailableScenarios();

      container.innerHTML = scenarios.map(s => {
        const stars = '★'.repeat(s.difficulty) + '☆'.repeat(5 - s.difficulty);
        const statusText = s.cleared ? 'CLEAR' : s.unlocked ? 'AVAILABLE' : 'LOCKED';
        const statusClass = s.cleared ? 'scenario-status-clear' : s.unlocked ? 'scenario-status-available' : 'scenario-status-locked';
        const lockedClass = s.unlocked ? '' : ' scenario-card-locked';
        return `
          <button type="button" class="lab-card scenario-card${lockedClass}" data-id="${s.id}" ${s.unlocked ? '' : 'disabled'}>
            <div class="scenario-card-header">
              <span class="scenario-card-title">${s.unlocked ? s.title : '???'}</span>
              <span class="scenario-card-status ${statusClass}">${statusText}</span>
            </div>
            <div class="scenario-card-difficulty">${stars}</div>
            <div class="scenario-card-desc">${s.unlocked ? s.description : '前のCASEをクリアすると解放される'}</div>
          </button>
        `;
      }).join('');

      Array.from(container.querySelectorAll('.scenario-card')).forEach(card => {
        card.addEventListener('click', () => {
          if (card.disabled) return;
          if (this.onSelect) this.onSelect(card.dataset.id);
        });
      });
    }
  }

  G.ScenarioSelectUI = ScenarioSelectUI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
