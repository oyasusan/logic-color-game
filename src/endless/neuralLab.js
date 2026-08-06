/**
 * neuralLab.js
 * STEP28「Meta Progression / Permanent Research System」。RUN終了後に帰還する
 * 「NEURAL RESEARCH LAB」画面（Surface）を担当する。Research Tree購入・
 * Protocol Evolution・Permanent Unlock状況・Research Archive要約の描画と、
 * 次のRUN開始（Protocol Selectへ）/タイトルへ戻る、の画面遷移を持つ。
 * 実際の値の計算・購入判定はmetaProgression.js、永続化はendlessSave.jsの責務で、
 * 本ファイルはDOM描画とイベント配線のみ（researchLab.js/mapUI.jsと同じ役割分担）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { ResearchTree } = G;

  const SURFACE_ARRIVAL_DURATION_MS = 1400;
  const TECH_INSTALLED_DURATION_MS = 1800;

  class NeuralLab {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.save EndlessSaveStoreインスタンス（Archive集計・Protocol発見一覧に使う）
     * @param {Object} deps.metaProgression MetaProgressionインスタンス
     * @param {Object} [deps.identityManager] STEP29: Protocol Evolution実行時のEXP加算に使う（省略可）
     * @param {Object} [deps.researchDatabase] STEP43: Database Completion（RESEARCH ARCHIVE要約）に使う
     * @param {Object} [deps.memoryManager] STEP43: 同上
     * @param {Object} [deps.relationshipManager] STEP43: 同上
     * @param {Object} [deps.endingManager] STEP43: 同上
     */
    constructor({ ui, save, metaProgression, identityManager, researchDatabase, memoryManager, relationshipManager, endingManager }) {
      this.ui = ui;
      this.save = save;
      this.metaProgression = metaProgression;
      this.identityManager = identityManager || null;
      // STEP43: Research Progression System「Database Completion」。いずれも省略可能
      // （未指定の場合は要約セクションのその項目のみ非表示のまま、既存の4行表示にフォールバックする）
      this.researchDatabase = researchDatabase || null;
      this.memoryManager = memoryManager || null;
      this.relationshipManager = relationshipManager || null;
      this.endingManager = endingManager || null;
      this.onStartRun = null;  // () => {} START NEW RESEARCH
      this.onExit = null;      // () => {} BACK TO TITLE
      this.onContinueRun = null; // () => {} CONTINUE RESEARCH（Continue機能バグ修正で追加）

      this.el = {
        backBtn: document.getElementById('neuralLabBackBtn'),
        exitBtn: document.getElementById('neuralLabExitBtn'),
        startRunBtn: document.getElementById('neuralLabStartRunBtn'),
        continueBtn: document.getElementById('neuralLabContinueBtn'),
        suspendPanel: document.getElementById('neuralLabSuspendPanel'),
        suspendLayer: document.getElementById('neuralLabSuspendLayer'),
        suspendTime: document.getElementById('neuralLabSuspendTime'),
        suspendIntegrity: document.getElementById('neuralLabSuspendIntegrity'),

        dataValue: document.getElementById('neuralLabDataValue'),
        rankValue: document.getElementById('neuralLabRankValue'),
        availableValue: document.getElementById('neuralLabAvailableValue'),

        categories: document.getElementById('neuralLabCategories'),
        evolutionList: document.getElementById('neuralLabEvolutionList'),
        unlockList: document.getElementById('neuralLabUnlockList'),
        archiveSummary: document.getElementById('neuralLabArchiveSummary'),

        surfaceArrivalOverlay: document.getElementById('surfaceArrivalOverlay'),
        surfaceArrivalProgressFill: document.getElementById('surfaceArrivalProgressFill'),
        surfaceArrivalNewTech: document.getElementById('surfaceArrivalNewTech'),

        technologyInstalledOverlay: document.getElementById('technologyInstalledOverlay'),
        techInstalledName: document.getElementById('techInstalledName')
      };

      this._bindEvents();
    }

    _bindEvents() {
      if (this.el.backBtn) this.el.backBtn.addEventListener('click', () => this._exit());
      if (this.el.exitBtn) this.el.exitBtn.addEventListener('click', () => this._exit());
      if (this.el.startRunBtn) {
        this.el.startRunBtn.addEventListener('click', () => { if (this.onStartRun) this.onStartRun(); });
      }
      if (this.el.continueBtn) {
        this.el.continueBtn.addEventListener('click', () => { if (this.onContinueRun) this.onContinueRun(); });
      }
    }

    /**
     * Continue機能バグ修正「Research Lab UI」。Research Suspend（Signal Anchor）が
     * 存在する場合のみ「▶ CONTINUE RESEARCH」ボタンとResearch Status（Current Layer/
     * Suspend Time/Signal Integrity）パネルを表示する。値の計算自体はendless.js側の責務
     * （このクラスはDOM描画のみという既存の役割分担を踏襲する）。
     * @param {{hasSuspend:boolean, layerLabel?:string, suspendTimeLabel?:string, integrityLabel?:string}} data
     */
    renderSuspendStatus(data) {
      if (this.el.continueBtn) this.el.continueBtn.classList.toggle('hidden', !data.hasSuspend);
      if (this.el.suspendPanel) this.el.suspendPanel.classList.toggle('hidden', !data.hasSuspend);
      if (!data.hasSuspend) return;
      if (this.el.suspendLayer) this.el.suspendLayer.textContent = data.layerLabel || '-';
      if (this.el.suspendTime) this.el.suspendTime.textContent = data.suspendTimeLabel || '-';
      if (this.el.suspendIntegrity) this.el.suspendIntegrity.textContent = data.integrityLabel || '-';
    }

    _exit() {
      if (this.onExit) this.onExit();
    }

    /** @param {boolean} [showArrival] RUN終了直後の帰還時のみtrue（Surface Arrival演出を出す） */
    show(showArrival) {
      const newlyUnlocked = this.metaProgression.checkNewlyUnlockedTechnologies();
      this._render();
      this.ui.showScreen('neuralLab');
      if (showArrival) this._playSurfaceArrival(newlyUnlocked.length > 0);
    }

    _playSurfaceArrival(hasNewTech) {
      if (!this.el.surfaceArrivalOverlay) return;
      if (this.el.surfaceArrivalProgressFill) this.el.surfaceArrivalProgressFill.style.width = '0%';
      if (this.el.surfaceArrivalNewTech) this.el.surfaceArrivalNewTech.classList.toggle('hidden', !hasNewTech);
      this.el.surfaceArrivalOverlay.classList.remove('hidden');
      // 次フレームで幅を100%にすることでCSS transitionのプログレスバー演出を発火させる
      global.setTimeout(() => {
        if (this.el.surfaceArrivalProgressFill) this.el.surfaceArrivalProgressFill.style.width = '100%';
      }, 30);
      clearTimeout(this._arrivalTimer);
      this._arrivalTimer = global.setTimeout(() => {
        this.el.surfaceArrivalOverlay.classList.add('hidden');
      }, SURFACE_ARRIVAL_DURATION_MS);
    }

    _render() {
      this._renderStats();
      this._renderCategories();
      this._renderEvolution();
      this._renderUnlocks();
      this._renderArchiveSummary();
    }

    _renderStats() {
      if (this.el.dataValue) this.el.dataValue.textContent = String(this.metaProgression.getPermanentResearchData());
      if (this.el.rankValue) this.el.rankValue.textContent = this.metaProgression.getRankLabel();
      if (this.el.availableValue) {
        const count = ResearchTree.ALL.filter(def => this.metaProgression.canAfford(def.id)).length;
        this.el.availableValue.textContent = String(count);
      }
    }

    _renderCategories() {
      const container = this.el.categories;
      if (!container) return;
      container.innerHTML = '';

      ResearchTree.CATEGORIES.forEach(cat => {
        const section = document.createElement('div');
        section.className = 'neurallab-category';
        section.innerHTML = `
          <div class="neurallab-category-title">${cat.name}</div>
          <div class="neurallab-category-desc">${cat.description}</div>
        `;

        const list = document.createElement('div');
        list.className = 'neurallab-upgrade-list';

        ResearchTree.getByCategory(cat.id).forEach(def => {
          const level = this.metaProgression.getLevel(def.id);
          const maxed = this.metaProgression.isMaxed(def.id);
          const affordable = this.metaProgression.canAfford(def.id);
          const cost = this.metaProgression.getCostForNext(def.id);

          const item = document.createElement('div');
          item.className = 'neurallab-upgrade-item' + (maxed ? ' maxed' : '');
          item.innerHTML = `
            <div class="neurallab-upgrade-name">${def.name} <span class="neurallab-upgrade-level">Lv.${level}/${def.maxLevel}</span></div>
            <div class="neurallab-upgrade-desc">${def.description}</div>
            ${maxed
              ? '<span class="neurallab-upgrade-maxed">MAX</span>'
              : `<button type="button" class="neurallab-buy-btn"${affordable ? '' : ' disabled'}>BUY (${cost} DATA)</button>`}
          `;
          if (!maxed) {
            item.querySelector('.neurallab-buy-btn').addEventListener('click', () => this._purchase(def));
          }
          list.appendChild(item);
        });

        section.appendChild(list);
        container.appendChild(section);
      });
    }

    _purchase(def) {
      if (!this.metaProgression.purchase(def.id)) return;
      this._render();
      this._showTechInstalled(def.name);
    }

    _showTechInstalled(name) {
      if (!this.el.technologyInstalledOverlay) return;
      if (this.el.techInstalledName) this.el.techInstalledName.textContent = `"${name}"`;
      this.el.technologyInstalledOverlay.classList.remove('hidden');
      clearTimeout(this._techTimer);
      this._techTimer = global.setTimeout(() => {
        this.el.technologyInstalledOverlay.classList.add('hidden');
      }, TECH_INSTALLED_DURATION_MS);
    }

    _renderEvolution() {
      const container = this.el.evolutionList;
      if (!container) return;
      container.innerHTML = '';

      const discovered = this.save.getUnlockedProtocols();
      if (discovered.length === 0) {
        container.innerHTML = '<div class="neurallab-empty">まだ発見済みのProtocolが無い</div>';
        return;
      }

      discovered.forEach(id => {
        const def = G.ProtocolUnlock ? G.ProtocolUnlock.getById(id) : null;
        if (!def) return;
        const label = this.metaProgression.getProtocolEvolutionLabel(id);
        const maxed = this.metaProgression.isProtocolEvolutionMaxed(id);
        const canEvolve = this.metaProgression.canEvolveProtocol(id);
        const cost = this.metaProgression.getEvolutionCost(id);

        const item = document.createElement('div');
        item.className = 'neurallab-evolution-item';
        item.innerHTML = `
          <div class="neurallab-evolution-name">${def.name} <span class="neurallab-evolution-stage">${label}</span></div>
          ${maxed
            ? '<span class="neurallab-upgrade-maxed">MAX</span>'
            : `<button type="button" class="neurallab-evolve-btn"${canEvolve ? '' : ' disabled'}>EVOLVE (${cost.dataCost} DATA + ${cost.fragmentCost} FRAG)</button>`}
        `;
        if (!maxed) {
          item.querySelector('.neurallab-evolve-btn').addEventListener('click', () => this._evolve(id, def.name));
        }
        container.appendChild(item);
      });
    }

    _evolve(id, name) {
      if (!this.metaProgression.evolveProtocol(id)) return;
      this._render();
      this._showTechInstalled(`${name} Evolution`);
      // STEP29: Protocol EngineerのEXP源「protocolEvolve」。未選択Identityなら何もしない
      if (this.identityManager) this._grantIdentityExp('protocolEvolve');
    }

    /** STEP29: EXP加算後、レベルアップ/Perk解放が起きていればIdentityイベントを表示する */
    _grantIdentityExp(source) {
      const result = this.identityManager.addExp(source);
      if (result.newlyUnlockedPerks.length > 0) {
        const perk = result.newlyUnlockedPerks[0];
        this.ui.showIdentityEvent({ label: 'PERK UNLOCKED', name: perk.name, sub: perk.description });
      } else if (result.leveledUp) {
        this.ui.showIdentityEvent({ label: 'IDENTITY LEVEL UP', name: this.identityManager.getLevelTitle(), sub: `Lv.${result.newLevel}` });
      }
    }

    _renderUnlocks() {
      const container = this.el.unlockList;
      if (!container) return;
      container.innerHTML = '';

      this.metaProgression.getAllRankGates().forEach(gate => {
        const unlocked = this.metaProgression.isTechnologyUnlocked(gate.id);
        const item = document.createElement('div');
        item.className = 'neurallab-unlock-item' + (unlocked ? ' unlocked' : ' locked');
        item.innerHTML = `
          <span class="neurallab-unlock-rank">RANK ${gate.rank}</span>
          <span class="neurallab-unlock-label">${unlocked ? gate.label : '???'}</span>
        `;
        container.appendChild(item);
      });
    }

    _renderArchiveSummary() {
      const container = this.el.archiveSummary;
      if (!container) return;
      const protocolTotal = G.ProtocolUnlock ? G.ProtocolUnlock.getAllDefs().length : 0;
      const eventTotal = G.UnknownEvents ? G.UnknownEvents.ALL.length : 0;
      let html = `
        <div class="neurallab-archive-row"><span>Protocols</span><span>${this.save.getUnlockedProtocols().length} / ${protocolTotal}</span></div>
        <div class="neurallab-archive-row"><span>Events</span><span>${this.save.getDiscoveredUnknownEvents().length} / ${eventTotal}</span></div>
        <div class="neurallab-archive-row"><span>Layers</span><span>${this.metaProgression.getDeepestLayerReached()} / ?</span></div>
        <div class="neurallab-archive-row"><span>Secrets</span><span>${this.save.getSecretsDiscoveredCount()} / ?</span></div>
      `;
      // STEP43: Research Progression System「Database Completion」。上記4行（既存、STEP28）
      // とは別カテゴリの収集率一覧を追記する（依存が全て揃っている場合のみ、後方互換のため）
      if (G.DatabaseCompletion && this.researchDatabase && this.memoryManager && this.relationshipManager && this.endingManager) {
        const summary = G.DatabaseCompletion.getCompletionSummary({
          save: this.save, researchDatabase: this.researchDatabase, memoryManager: this.memoryManager,
          relationshipManager: this.relationshipManager, endingManager: this.endingManager
        });
        const rows = [
          ['Characters', summary.characters], ['Memory', summary.memory], ['Research Logs', summary.logs],
          ['Environment', summary.environment], ['Endings', summary.endings]
        ];
        html += `<div class="neurallab-archive-divider">DATABASE COMPLETION</div>`;
        html += rows.map(([label, c]) => `<div class="neurallab-archive-row"><span>${label}</span><span>${c.unlocked} / ${c.total}</span></div>`).join('');
      }
      container.innerHTML = html;
    }
  }

  G.NeuralLab = NeuralLab;
})(typeof globalThis !== 'undefined' ? globalThis : this);
