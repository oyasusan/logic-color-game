/**
 * worldEnvironmentArchive.js
 * STEP30-3「Environment Visual / HUD Evolution」セクション8: Environment Archive
 * Extension。MODE SELECTから開く、WorldEnvironment（Layerに紐づく見た目テーマ、
 * STEP30-1/30-2）専用のArchive画面。
 *
 * 【命名についての注意】このプロジェクトには既に`environmentArchive.js`
 * （`EnvironmentArchive`、RUN限定のResearch Environment用）が存在するため、
 * worldEnvironment.js/worldEnvironmentManager.jsと同じ命名規則で
 * `WorldEnvironmentArchive`とし、画面idも`screen-worldenvarchive`と別にしている。
 *
 * DOM描画のみを持ち、状態は持たない（environmentArchive.js/protocolArchive.jsと
 * 同じ「都度saveを読んで再描画する」設計）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { WorldEnvironment } = G;

  class WorldEnvironmentArchive {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.save EndlessSaveStoreインスタンス
     */
    constructor({ ui, save }) {
      this.ui = ui;
      this.save = save;

      this.el = {
        backBtn: document.getElementById('worldEnvArchiveBackBtn'),
        discovered: document.getElementById('worldEnvArchiveDiscovered'),
        cards: document.getElementById('worldEnvArchiveCards')
      };
      this.onBack = null; // () => {}
      if (this.el.backBtn) this.el.backBtn.addEventListener('click', () => { if (this.onBack) this.onBack(); });
    }

    show() {
      this._render();
      this.ui.showScreen('worldEnvArchive');
    }

    _render() {
      const discoveredIds = this.save.getDiscoveredWorldEnvironments();
      const allDefs = WorldEnvironment.ALL;

      if (this.el.discovered) this.el.discovered.textContent = `${discoveredIds.length} / ${allDefs.length}`;

      const container = this.el.cards;
      if (!container) return;
      container.innerHTML = '';

      allDefs.forEach(def => {
        const discovered = discoveredIds.indexOf(def.id) !== -1;
        const card = document.createElement('div');
        card.className = 'archive-card environment-archive-card' + (discovered ? ' unlocked' : ' locked');

        if (discovered) {
          const firstLayer = this.save.getFirstDiscoveryLayer(def.id);
          const effectsHtml = (def.modifiers || [])
            .filter(m => m.type !== 'randomModifier')
            .map(m => `<div class="archive-effect-row">${m.name}</div>`)
            .join('');
          card.innerHTML = `
            <span class="archive-card-icon">${def.icon || ''}</span>
            <span class="archive-card-name">${def.name}</span>
            <span class="archive-card-desc">${def.description}</span>
            <div class="archive-first-discovery">First Discovery: Layer ${firstLayer != null ? firstLayer : '?'}</div>
            <div class="archive-effects-label">Effects</div>
            ${effectsHtml}
          `;
        } else {
          card.innerHTML = `
            <span class="archive-card-icon">❓</span>
            <span class="archive-card-name">???</span>
            <span class="archive-card-desc">未発見（対応するLayerへ到達すると発見できる）</span>
          `;
        }
        container.appendChild(card);
      });
    }
  }

  G.WorldEnvironmentArchive = WorldEnvironmentArchive;
})(typeof globalThis !== 'undefined' ? globalThis : this);
