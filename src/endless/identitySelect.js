/**
 * identitySelect.js
 * STEP29「Research Identity System」。新規プレイ開始時（まだIdentity未選択の
 * 時のみ）に表示するIdentity選択画面。DOM描画・カード選択のイベント配線のみを
 * 持ち、選択結果の適用（identityManager.select）とその後のProtocol Selectへの
 * 遷移はendless.js側の責務（protocolSelect.jsと同じ役割分担）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { ResearchIdentity } = G;

  class IdentitySelect {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     */
    constructor({ ui }) {
      this.ui = ui;
      this.onSelect = null; // (identityDef) => {}

      this.el = {
        cards: document.getElementById('identitySelectCards')
      };
    }

    show() {
      this._renderChoices();
      this.ui.showScreen('identitySelect');
    }

    _renderChoices() {
      const container = this.el.cards;
      if (!container) return;
      container.innerHTML = '';

      ResearchIdentity.ALL.forEach(def => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'lab-card identity-card';
        card.innerHTML = `
          <span class="lab-card-name">${def.name}</span>
          <span class="identity-card-theme">${def.theme}</span>
          <span class="lab-card-desc">${def.description}</span>
          <div class="identity-card-bonuses">
            <span class="identity-card-bonus">${def.primaryBonus.label}</span>
            <span class="identity-card-bonus">${def.secondaryBonus.label}</span>
          </div>
        `;
        card.addEventListener('click', () => {
          if (this.onSelect) this.onSelect(def);
        });
        container.appendChild(card);
      });
    }
  }

  G.IdentitySelect = IdentitySelect;
})(typeof globalThis !== 'undefined' ? globalThis : this);
