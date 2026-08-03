/**
 * rewardChoice.js
 * STEP27「Reward Choice System」。Elite Nodeクリア直後に表示する3択報酬画面
 * （Rare Upgrade / Protocol Fragment x2 / Research Data +300の固定3枠）。
 * researchLab.js/protocolSelect.jsと同じ「カード選択」パターンだが、専用の
 * .screenは増やさずoverlay(#rewardChoiceOverlay)として実装している
 * （Elite Node固有の一過性の選択であり、MAP/researchLabのような独立した
 * 画面遷移体系に載せる必要が薄いため）。実際の効果適用はendless.js側の責務。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const OPTIONS = [
    { id: 'rare_upgrade', name: 'Rare Upgrade', description: 'ランダムなRare Upgradeを1つ獲得する', effect: { type: 'rareUpgrade' } },
    { id: 'protocol_fragment_x2', name: 'Protocol Fragment x2', description: 'Protocol Fragmentを2個獲得する', effect: { type: 'protocolFragment', value: 2 } },
    { id: 'research_data_300', name: 'Research Data +300', description: 'Research Dataを300獲得する', effect: { type: 'researchData', value: 300 } }
  ];

  class RewardChoice {
    constructor() {
      this.onSelect = null; // (option) => {}

      this.el = {
        overlay: document.getElementById('rewardChoiceOverlay'),
        cards: document.getElementById('rewardChoiceCards')
      };
    }

    show() {
      const container = this.el.cards;
      if (container) {
        container.innerHTML = '';
        OPTIONS.forEach((opt, index) => {
          const card = document.createElement('button');
          card.type = 'button';
          card.className = 'lab-card reward-choice-card';
          card.innerHTML = `
            <span class="reward-choice-index">${index + 1}</span>
            <span class="lab-card-name">${opt.name}</span>
            <span class="lab-card-desc">${opt.description}</span>
          `;
          card.addEventListener('click', () => {
            this.hide();
            if (this.onSelect) this.onSelect(opt);
          });
          container.appendChild(card);
        });
      }
      if (this.el.overlay) this.el.overlay.classList.remove('hidden');
    }

    hide() {
      if (this.el.overlay) this.el.overlay.classList.add('hidden');
    }
  }

  G.RewardChoice = RewardChoice;
})(typeof globalThis !== 'undefined' ? globalThis : this);
