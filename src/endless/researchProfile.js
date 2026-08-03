/**
 * researchProfile.js
 * STEP29「Research Identity System」セクション8。現在のIdentity・Level・
 * 生涯進行状況・Achievement達成状況を一覧する読み取り専用画面。
 * DOM描画のみを担当し（neuralLab.js/protocolArchive.jsと同じ役割分担）、
 * 値の計算・判定はidentityManager.js/achievements.js/endlessSave.jsの責務。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { ResearchIdentity, Achievements } = G;

  // Preferred Risk判定の閾値（要求仕様に数値指定が無かったため設計。
  // 生涯で到達した最大Risk Chain倍率(1.0〜2.6)を3段階に区切る）
  const RISK_LOW_MAX = 1.5;
  const RISK_MEDIUM_MAX = 2.2;

  class ResearchProfile {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.save EndlessSaveStoreインスタンス
     * @param {Object} deps.identityManager IdentityManagerインスタンス
     */
    constructor({ ui, save, identityManager }) {
      this.ui = ui;
      this.save = save;
      this.identityManager = identityManager;

      this.el = {
        backBtn: document.getElementById('researchProfileBackBtn'),
        identityValue: document.getElementById('rpIdentityValue'),
        levelValue: document.getElementById('rpLevelValue'),
        expValue: document.getElementById('rpExpValue'),
        deepestLayerValue: document.getElementById('rpDeepestLayerValue'),
        protocolsFoundValue: document.getElementById('rpProtocolsFoundValue'),
        unknownAnalysisValue: document.getElementById('rpUnknownAnalysisValue'),
        preferredRiskValue: document.getElementById('rpPreferredRiskValue'),
        perkList: document.getElementById('rpPerkList'),
        achievementList: document.getElementById('rpAchievementList')
      };

      if (this.el.backBtn) {
        this.el.backBtn.addEventListener('click', () => { if (this.onBack) this.onBack(); });
      }
      this.onBack = null; // () => {}
    }

    show() {
      this._render();
      this.ui.showScreen('researchProfile');
    }

    _render() {
      const def = this.identityManager.getSelectedDef();
      if (this.el.identityValue) {
        this.el.identityValue.textContent = def
          ? (this.identityManager.getHybridLabel() || `${def.name} — ${this.identityManager.getLevelTitle()}`)
          : 'UNASSIGNED';
      }
      if (this.el.levelValue) this.el.levelValue.textContent = def ? `Lv.${this.identityManager.getLevel()}` : '-';
      if (this.el.expValue) {
        this.el.expValue.textContent = def
          ? `${this.identityManager.getExp()} / ${this.identityManager.getExpRequiredForNextLevel() || 'MAX'}`
          : '-';
      }
      if (this.el.deepestLayerValue) this.el.deepestLayerValue.textContent = String(this.save.getBestDepth());
      if (this.el.protocolsFoundValue) this.el.protocolsFoundValue.textContent = String(this.save.getUnlockedProtocols().length);
      if (this.el.unknownAnalysisValue) this.el.unknownAnalysisValue.textContent = String(this.save.getTotalUnknownAnalysisCount());
      if (this.el.preferredRiskValue) this.el.preferredRiskValue.textContent = this._preferredRiskLabel();

      this._renderPerks(def);
      this._renderAchievements();
    }

    _preferredRiskLabel() {
      const max = this.save.getMaxRiskChainMultiplierEver();
      if (max >= RISK_MEDIUM_MAX) return 'HIGH';
      if (max >= RISK_LOW_MAX) return 'MEDIUM';
      return 'LOW';
    }

    _renderPerks(def) {
      const container = this.el.perkList;
      if (!container) return;
      container.innerHTML = '';
      if (!def) {
        container.innerHTML = '<div class="neurallab-empty">Identity未選択</div>';
        return;
      }

      const unlockedIds = new Set(this.save.getUnlockedIdentityPerks());
      def.perkTree.forEach(perk => {
        const unlocked = unlockedIds.has(perk.id);
        const item = document.createElement('div');
        item.className = 'rp-perk-item' + (unlocked ? ' unlocked' : ' locked');
        item.innerHTML = `
          <span class="rp-perk-level">Lv.${perk.unlockLevel}</span>
          <span class="rp-perk-name">${unlocked ? perk.name : '???'}</span>
          <span class="rp-perk-desc">${unlocked ? perk.description : '未解放'}</span>
        `;
        container.appendChild(item);
      });
    }

    _renderAchievements() {
      const container = this.el.achievementList;
      if (!container) return;
      container.innerHTML = '';

      const completed = new Set(this.save.getCompletedAchievements());
      Achievements.ALL.forEach(def => {
        const done = completed.has(def.id);
        const item = document.createElement('div');
        item.className = 'rp-achievement-item' + (done ? ' unlocked' : ' locked');
        item.innerHTML = `
          <span class="rp-achievement-icon">${done ? '🏆' : '🔒'}</span>
          <span class="rp-achievement-name">${def.name}</span>
          <span class="rp-achievement-desc">${def.description}</span>
        `;
        container.appendChild(item);
      });
    }
  }

  G.ResearchProfile = ResearchProfile;
})(typeof globalThis !== 'undefined' ? globalThis : this);
