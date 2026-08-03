/**
 * hiddenEnvironmentArchive.js
 * STEP30-7「Hidden Environment System」セクション9: Hidden Environment Archive、
 * セクション10: Discovery Rate。MODE SELECTから開く、6種のHidden Environment専用
 * Archive画面。worldEnvironmentArchive.js/protocolArchive.jsと同じ「都度saveを
 * 読んで再描画する」設計（DOM描画のみ、状態は持たない）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { HiddenEnvironmentData } = G;

  class HiddenEnvironmentArchive {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.save EndlessSaveStoreインスタンス
     * @param {Object} deps.hiddenEnvironmentManager getDiscoveryRate()に使う
     */
    constructor({ ui, save, hiddenEnvironmentManager }) {
      this.ui = ui;
      this.save = save;
      this.hiddenEnvironmentManager = hiddenEnvironmentManager;

      this.el = {
        backBtn: document.getElementById('hiddenArchiveBackBtn'),
        discoveryRate: document.getElementById('hiddenArchiveDiscoveryRate'),
        cards: document.getElementById('hiddenArchiveCards')
      };
      this.onBack = null; // () => {}
      if (this.el.backBtn) this.el.backBtn.addEventListener('click', () => { if (this.onBack) this.onBack(); });
    }

    show() {
      this._render();
      this.ui.showScreen('hiddenArchive');
    }

    _render() {
      const unlockedIds = this.save.getHiddenUnlockFlags();
      const rate = this.hiddenEnvironmentManager.getDiscoveryRate();

      if (this.el.discoveryRate) {
        this.el.discoveryRate.textContent = `${rate.unlocked} / ${rate.total} (${Math.round(rate.rate * 100)}%)`;
      }

      const container = this.el.cards;
      if (!container) return;
      container.innerHTML = '';

      HiddenEnvironmentData.ALL.forEach(def => {
        const unlocked = unlockedIds.indexOf(def.id) !== -1;
        const record = this.save.getHiddenArchiveRecord(def.id);
        const reward = HiddenEnvironmentData.getExclusiveRewardForEnvironment(def);
        const card = document.createElement('div');
        card.className = 'archive-card hidden-environment-archive-card' + (unlocked ? ' unlocked' : ' locked');

        if (unlocked) {
          const completion = record && record.rewardUnlocked ? '✅ COMPLETE' : '未達成';
          card.innerHTML = `
            <span class="archive-card-icon">🌑</span>
            <span class="archive-card-name">${def.name}</span>
            <span class="archive-card-desc">${def.description}</span>
            <div class="archive-first-discovery">First Discovery: RUN ${record ? record.firstDiscoveryRun : '?'} / Layer ${record ? record.firstDiscoveryLayer : '?'}</div>
            <div class="archive-effect-row">Visit Count: ${record ? record.visitCount : 0}</div>
            <div class="archive-effect-row">Completion: ${completion}</div>
            <div class="archive-effect-row">Unlocked Reward: ${reward ? reward.name : '-'}</div>
          `;
        } else {
          card.innerHTML = `
            <span class="archive-card-icon">❓</span>
            <span class="archive-card-name">???</span>
            <span class="archive-card-desc">未発見（対応する条件を達成すると発見できる）</span>
          `;
        }
        container.appendChild(card);
      });
    }
  }

  G.HiddenEnvironmentArchive = HiddenEnvironmentArchive;
})(typeof globalThis !== 'undefined' ? globalThis : this);
