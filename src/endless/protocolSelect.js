/**
 * protocolSelect.js
 * ENDLESS RESEARCHのRUN開始直後に表示するProtocol Select画面
 * （3つのProtocolから1つを選ぶ）を担当する。DOM描画・カード選択の
 * イベント配線のみを持ち、選択結果の適用（protocolManager.select）や
 * その後のRUN初期化はendless.js側の責務。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { Protocols } = G;

  class ProtocolSelect {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     */
    constructor({ ui }) {
      this.ui = ui;
      this.onSelect = null; // (protocolDef) => {}

      this.el = {
        cards: document.getElementById('protocolSelectCards')
      };
    }

    show() {
      this._renderChoices();
      this.ui.showScreen('protocolSelect');
    }

    _renderChoices() {
      const container = this.el.cards;
      if (!container) return;
      container.innerHTML = '';

      Protocols.ALL.forEach(def => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'lab-card protocol-card';
        card.innerHTML = `
          <span class="lab-card-name">${def.name}</span>
          <span class="lab-card-desc">${def.description}</span>
        `;
        card.addEventListener('click', () => {
          if (this.onSelect) this.onSelect(def);
        });
        container.appendChild(card);
      });
    }
  }

  G.ProtocolSelect = ProtocolSelect;
})(typeof globalThis !== 'undefined' ? globalThis : this);
