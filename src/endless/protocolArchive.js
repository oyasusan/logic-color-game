/**
 * protocolArchive.js
 * MODE SELECTから開けるProtocol Archive画面（発見済み/未発見のProtocol一覧、
 * レア度表示、Protocol Fragment所持数）を担当する。DOM描画のみを持ち、
 * 「何が解放済みか」の判定・永続化はendlessSave.js、解放条件の定義は
 * protocolUnlock.js（protocols.js/protocolSignals.jsの`unlock`フィールド）を
 * そのまま参照するだけで、Archive自体は状態を持たない（都度show()時に
 * 最新のsaveデータを読んで再描画する）。
 *
 * 【STEP33追記】他のArchive系クラス（memoryArchiveUI.js等）と同じ`onBack`プロパティを
 * 追加した。ARCHIVE HUB（従来の入口）とRESEARCH ARCHIVE（STEP33で新設した5カテゴリ
 * まとめ画面）の両方からこの画面を開けるようにするため、「戻る」の行き先を呼び出し側が
 * 動的に指定できるようにする必要があった。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { ProtocolUnlock } = G;

  const RARITY_LABEL = { common: 'COMMON', rare: 'RARE', legendary: 'LEGENDARY' };

  class ProtocolArchive {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.save EndlessSaveStoreインスタンス（解放状況・Fragment所持数を読む）
     */
    constructor({ ui, save }) {
      this.ui = ui;
      this.save = save;
      this.onBack = null; // () => {}

      this.el = {
        fragments: document.getElementById('archiveFragments'),
        discovered: document.getElementById('archiveDiscovered'),
        cards: document.getElementById('archiveCards')
      };
    }

    show() {
      this._render();
      this.ui.showScreen('protocolArchive');
    }

    _render() {
      const unlockedIds = this.save.getUnlockedProtocols();
      const allDefs = ProtocolUnlock.getAllDefs();

      if (this.el.fragments) this.el.fragments.textContent = String(this.save.getProtocolFragments());
      if (this.el.discovered) this.el.discovered.textContent = `${unlockedIds.length} / ${allDefs.length}`;

      const container = this.el.cards;
      if (!container) return;
      container.innerHTML = '';

      allDefs.forEach(def => {
        const unlocked = unlockedIds.indexOf(def.id) !== -1;
        const card = document.createElement('div');
        card.className = 'archive-card rarity-' + (def.rarity || 'common') + (unlocked ? ' unlocked' : ' locked');

        const rarityLabel = RARITY_LABEL[def.rarity] || def.rarity;
        if (unlocked) {
          card.innerHTML = `
            <span class="archive-card-rarity">${rarityLabel}</span>
            <span class="archive-card-name">${def.name}</span>
            <span class="archive-card-desc">${def.description}</span>
          `;
        } else {
          card.innerHTML = `
            <span class="archive-card-rarity">${rarityLabel}</span>
            <span class="archive-card-name">???</span>
            <span class="archive-card-desc">解放条件: ${ProtocolUnlock.getConditionLabel(def)}</span>
          `;
        }
        container.appendChild(card);
      });
    }
  }

  G.ProtocolArchive = ProtocolArchive;
})(typeof globalThis !== 'undefined' ? globalThis : this);
