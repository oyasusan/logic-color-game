/**
 * environmentEventArchive.js
 * STEP30-6「Environment Event System」セクション15: Environment Event Archive。
 * MODE SELECTから開く、発見済み/未発見のEnvironment Event一覧画面。
 * worldEnvironmentArchive.js/protocolArchive.jsと同じ「都度saveを読んで再描画する」
 * 設計（DOM描画のみ、状態は持たない）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { EnvironmentEventData } = G;

  class EnvironmentEventArchive {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.save EndlessSaveStoreインスタンス
     */
    constructor({ ui, save }) {
      this.ui = ui;
      this.save = save;

      this.el = {
        backBtn: document.getElementById('envEventArchiveBackBtn'),
        discovered: document.getElementById('envEventArchiveDiscovered'),
        cards: document.getElementById('envEventArchiveCards')
      };
      this.onBack = null; // () => {}
      if (this.el.backBtn) this.el.backBtn.addEventListener('click', () => { if (this.onBack) this.onBack(); });
    }

    show() {
      this._render();
      this.ui.showScreen('envEventArchive');
    }

    _render() {
      const discoveredIds = this.save.getDiscoveredEnvironmentEvents();
      const allDefs = EnvironmentEventData.ALL;

      if (this.el.discovered) this.el.discovered.textContent = `${discoveredIds.length} / ${allDefs.length}`;

      const container = this.el.cards;
      if (!container) return;
      container.innerHTML = '';

      allDefs.forEach(def => {
        const discovered = discoveredIds.indexOf(def.id) !== -1;
        const record = this.save.getEnvironmentEventArchiveRecord(def.id);
        const card = document.createElement('div');
        card.className = 'archive-card environment-event-archive-card' + (discovered ? ' unlocked' : ' locked');

        if (discovered) {
          card.innerHTML = `
            <span class="archive-card-icon">✨</span>
            <span class="archive-card-name">${def.name}</span>
            <span class="archive-card-desc">${def.description}</span>
            <div class="archive-effects-label">${def.environment}</div>
            <div class="archive-effect-row">Count: ${record ? record.count : 0}</div>
            <div class="archive-effect-row">Best Reward: ${record ? record.bestReward : 0}</div>
          `;
        } else {
          card.innerHTML = `
            <span class="archive-card-icon">❓</span>
            <span class="archive-card-name">???</span>
            <span class="archive-card-desc">未発見（対応するEnvironmentで遭遇すると発見できる）</span>
          `;
        }
        container.appendChild(card);
      });
    }
  }

  G.EnvironmentEventArchive = EnvironmentEventArchive;
})(typeof globalThis !== 'undefined' ? globalThis : this);
