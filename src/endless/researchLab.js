/**
 * researchLab.js
 * ENDLESS RESEARCHのRESEARCH LAB画面（3つのアップグレード候補から1つを選ぶ）を
 * 担当する。DOM描画・カード選択のイベント配線のみを持ち、いつ出現させるか
 * （Depth 3ごと）の判定とRUN進行への組み込みはendless.js側の責務。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { Upgrades } = G;

  const APPEAR_EVERY_DEPTH = 3;

  class ResearchLab {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.upgradeManager 所持アップグレードの重複表示判定に使う
     */
    constructor({ ui, upgradeManager }) {
      this.ui = ui;
      this.upgradeManager = upgradeManager;
      this.onSelect = null; // (upgradeDef) => {}

      this.el = {
        title: document.getElementById('researchLabDepth'),
        cards: document.getElementById('researchLabCards')
      };
    }

    /** @param {number} depth 直前に完了した（クリアまたはミスした）Depth */
    shouldTrigger(depth) {
      return depth > 0 && depth % APPEAR_EVERY_DEPTH === 0;
    }

    /** @param {number} depth 表示用（「DEPTH N到達」等の文脈表示に使う） */
    show(depth) {
      if (this.el.title) this.el.title.textContent = `DEPTH ${depth} RESEARCH COMPLETE`;
      this._renderChoices();
      this.ui.showScreen('researchLab');
    }

    _renderChoices() {
      const container = this.el.cards;
      if (!container) return;
      container.innerHTML = '';

      this._pickChoices(3).forEach(def => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'lab-card lab-card-' + def.category + (def.rare ? ' lab-card-rare' : '');

        const level = this.upgradeManager.getLevel(def.id);
        const levelBadge = level > 0 ? `<span class="lab-card-owned">所持中 Lv.${level}</span>` : '';
        const rareBadge = def.rare ? '<span class="lab-card-rare-badge">★ RARE</span>' : '';

        card.innerHTML = `
          ${rareBadge}
          <span class="lab-card-category">${def.category.toUpperCase()}</span>
          <span class="lab-card-name">${def.name}</span>
          <span class="lab-card-desc">${def.description}</span>
          ${levelBadge}
        `;
        card.addEventListener('click', () => {
          if (this.onSelect) this.onSelect(def);
        });
        container.appendChild(card);
      });
    }

    /**
     * アップグレード候補をランダムに重複無くN個選ぶ。
     * Rare Upgrade（rareUpgrades.js）は`RARE_APPEARANCE_RATE`の確率で通常
     * Upgradeの代わりに1枠を占める。進化上限に達した通常Upgrade・既に所持
     * 済みのRare Upgradeは候補から除外する（researchLab.js自身は所持状態を
     * 持たず、upgradeManagerに問い合わせる）。
     */
    _pickChoices(n) {
      const rareUpgradesModule = G.RareUpgrades;
      const rareRate = rareUpgradesModule ? rareUpgradesModule.RARE_APPEARANCE_RATE : 0;

      const normalPool = this._shuffle(Upgrades.ALL.filter(def => !this.upgradeManager.isMaxed(def.id)));
      const rarePool = this._shuffle(
        rareUpgradesModule ? rareUpgradesModule.ALL.filter(def => !this.upgradeManager.has(def.id)) : []
      );

      const picked = [];
      const pickedIds = new Set();
      let normalIndex = 0;
      let rareIndex = 0;

      for (let i = 0; i < n; i++) {
        const wantsRare = Math.random() < rareRate;
        let def = null;

        if (wantsRare && rareIndex < rarePool.length) {
          def = rarePool[rareIndex++];
        } else if (normalIndex < normalPool.length) {
          def = normalPool[normalIndex++];
        } else if (rareIndex < rarePool.length) {
          def = rarePool[rareIndex++]; // 通常候補が尽きたらRareで埋める
        }

        if (def && !pickedIds.has(def.id)) {
          picked.push(def);
          pickedIds.add(def.id);
        }
      }

      return picked;
    }

    _shuffle(arr) {
      const copy = arr.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }
  }

  G.ResearchLab = ResearchLab;
})(typeof globalThis !== 'undefined' ? globalThis : this);
