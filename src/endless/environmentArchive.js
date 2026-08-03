/**
 * environmentArchive.js
 * MODE SELECTから開けるEnvironment Archive画面（発見済み/未発見のEnvironment一覧）を
 * 担当する。DOM描画のみを持ち、「何を発見済みか」の判定・永続化はendlessSave.js側の
 * 責務（protocolArchive.jsと同じ「状態を持たず都度saveを読んで再描画する」設計）。
 *
 * Protocol Archiveと異なりEnvironmentには解放条件が無く（全6種、RUN開始時から
 * 常に選択可能）、「発見済み」は単純に「一度でもそのEnvironmentでRUNを開始した
 * ことがあるか」を意味する（environmentManager.js経由でRUN開始時に記録される）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { Environments } = G;

  class EnvironmentArchive {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.save EndlessSaveStoreインスタンス（発見状況を読む）
     */
    constructor({ ui, save }) {
      this.ui = ui;
      this.save = save;

      this.el = {
        discovered: document.getElementById('envArchiveDiscovered'),
        cards: document.getElementById('envArchiveCards')
      };
    }

    show() {
      this._render();
      this.ui.showScreen('environmentArchive');
    }

    _render() {
      const discoveredIds = this.save.getUnlockedEnvironments();
      const allDefs = Environments.ALL;

      if (this.el.discovered) this.el.discovered.textContent = `${discoveredIds.length} / ${allDefs.length}`;

      const container = this.el.cards;
      if (!container) return;
      container.innerHTML = '';

      allDefs.forEach(def => {
        const discovered = discoveredIds.indexOf(def.id) !== -1;
        const card = document.createElement('div');
        card.className = 'archive-card environment-archive-card' + (discovered ? ' unlocked' : ' locked');

        if (discovered) {
          card.innerHTML = `
            <span class="archive-card-name">${def.name}</span>
            <span class="archive-card-desc">${def.description}</span>
          `;
        } else {
          card.innerHTML = `
            <span class="archive-card-name">???</span>
            <span class="archive-card-desc">未発見（RUN開始時のEnvironment Detectionで選ぶと発見できる）</span>
          `;
        }
        container.appendChild(card);
      });
    }
  }

  G.EnvironmentArchive = EnvironmentArchive;
})(typeof globalThis !== 'undefined' ? globalThis : this);
