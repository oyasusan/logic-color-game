/**
 * researchMap.js
 * ENDLESS RESEARCHの進行状況を俯瞰する「リサーチマップ」画面。
 * MAP（分岐候補から1歩選ぶ、mapUI.js）とは別物で、あくまで現在のRUNの
 * 進行状況（Depth・レイヤー・実際に通ってきたNodeの種類・所持アップグレード/
 * プロトコル）を確認するための読み取り専用ビュー。ここからPuzzleが始まったり
 * Node選択が行われたりすることはない。
 *
 * レイヤー境界(0-10/11-25/26-50/51+)はpuzzleTier.jsのTier1〜4境界、および
 * boss.jsのBOSS_DEPTHS(10/25/50)と完全に一致させている（レイヤーを跨ぐには
 * そのDepthのBoss Nodeを突破する既存の仕様と自然に噛み合うため）。
 *
 * 表示するNodeの実データはendless.js側が`_enterNode()`で記録する
 * `visitedNodes`（今RUN限定、RUN開始時にリセット）のみを使う。まだ生成されて
 * いない未来のNodeを予測表示することはせず、現在Depthより先は一律「未到達」
 * として隠す（Map Generation Systemが1歩ずつ分岐を生成する既存設計に合わせた
 * 誠実な表示）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { NodeTypes } = G;

  const LAYERS = [
    { id: 1, name: 'SURFACE RESEARCH', jp: '地上研究層', min: 0, max: 10, cls: 'l1' },
    { id: 2, name: 'DATA ARCHIVE', jp: 'データ層', min: 11, max: 25, cls: 'l2' },
    { id: 3, name: 'DEEP ANALYSIS', jp: '深層解析層', min: 26, max: 50, cls: 'l3' },
    { id: 4, name: 'UNKNOWN CORE', jp: '未知領域', min: 51, max: Infinity, cls: 'l4' }
  ];

  const BOSS_DEPTHS = [10, 25, 50];
  const DEPTH_SCALE_MAX = 60; // 右側Depthスケールの表示上限（これ以上は"MAX"側に張り付く）

  function formatNumber(n) {
    return Number(n || 0).toLocaleString('en-US');
  }

  function findLayer(depth) {
    return LAYERS.find(l => depth >= l.min && depth <= l.max) || LAYERS[LAYERS.length - 1];
  }

  class ResearchMapScreen {
    /** @param {Object} deps @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する） */
    constructor({ ui }) {
      this.ui = ui;
      this.onResume = null; // () => {} MAP（Node選択画面）へ戻る
      this.onExit = null;   // () => {} RUNを中断してMODE SELECTへ戻る
      this.state = null;

      this.el = {
        backBtn: document.getElementById('researchMapBackBtn'),
        archiveBtn: document.getElementById('researchMapArchiveBtn'),
        lifeValue: document.getElementById('rmLifeValue'),
        scoreValue: document.getElementById('rmScoreValue'),
        fragmentsValue: document.getElementById('rmFragmentsValue'),
        objective: document.getElementById('rmObjective'),
        currentLayerName: document.getElementById('rmCurrentLayerName'),
        currentDepth: document.getElementById('rmCurrentDepth'),
        progressFill: document.getElementById('rmProgressFill'),
        layers: document.getElementById('rmLayers'),
        depthScaleDot: document.getElementById('rmDepthScaleDot'),
        legend: document.getElementById('rmLegend'),

        navStart: document.getElementById('rmNavStart'),
        navUpgrade: document.getElementById('rmNavUpgrade'),
        navProtocol: document.getElementById('rmNavProtocol'),
        navMenu: document.getElementById('rmNavMenu'),

        nodeDetail: document.getElementById('rmNodeDetail'),
        nodeDetailIcon: document.getElementById('rmNodeDetailIcon'),
        nodeDetailName: document.getElementById('rmNodeDetailName'),
        nodeDetailMeta: document.getElementById('rmNodeDetailMeta'),
        nodeDetailDesc: document.getElementById('rmNodeDetailDesc'),
        nodeDetailClose: document.getElementById('rmNodeDetailClose'),

        upgradePanel: document.getElementById('rmUpgradePanel'),
        upgradeList: document.getElementById('rmUpgradeList'),
        upgradePanelClose: document.getElementById('rmUpgradePanelClose'),

        protocolPanel: document.getElementById('rmProtocolPanel'),
        protocolList: document.getElementById('rmProtocolList'),
        synergyList: document.getElementById('rmSynergyList'),
        protocolPanelClose: document.getElementById('rmProtocolPanelClose'),

        historyPanel: document.getElementById('rmHistoryPanel'),
        historyList: document.getElementById('rmHistoryList'),
        historyPanelClose: document.getElementById('rmHistoryPanelClose')
      };

      this._renderLegend();
      this._bindEvents();
    }

    _bindEvents() {
      if (this.el.backBtn) this.el.backBtn.addEventListener('click', () => this._resume());
      if (this.el.navStart) this.el.navStart.addEventListener('click', () => this._resume());
      if (this.el.archiveBtn) this.el.archiveBtn.addEventListener('click', () => this._togglePanel('history'));
      if (this.el.navUpgrade) this.el.navUpgrade.addEventListener('click', () => this._togglePanel('upgrade'));
      if (this.el.navProtocol) this.el.navProtocol.addEventListener('click', () => this._togglePanel('protocol'));
      if (this.el.navMenu) {
        this.el.navMenu.addEventListener('click', () => {
          if (this.onExit) this.onExit();
        });
      }
      if (this.el.nodeDetailClose) this.el.nodeDetailClose.addEventListener('click', () => this._hideOverlay(this.el.nodeDetail));
      if (this.el.upgradePanelClose) this.el.upgradePanelClose.addEventListener('click', () => this._hideOverlay(this.el.upgradePanel));
      if (this.el.protocolPanelClose) this.el.protocolPanelClose.addEventListener('click', () => this._hideOverlay(this.el.protocolPanel));
      if (this.el.historyPanelClose) this.el.historyPanelClose.addEventListener('click', () => this._hideOverlay(this.el.historyPanel));
    }

    _resume() {
      if (this.onResume) this.onResume();
    }

    /**
     * @param {Object} state
     * @param {number} state.depth @param {number} state.life @param {number} state.maxLife
     * @param {number} state.score @param {number} state.fragments
     * @param {Array<{depth:number,type:string,name:string,icon:string}>} state.visitedNodes
     * @param {Array} state.ownedUpgrades @param {Array} state.activeProtocols
     * @param {Array} state.activeSynergies @param {Array} state.puzzleHistory
     */
    show(state) {
      this.state = state;
      this._render();
      this.ui.showScreen('researchMap');
    }

    _render() {
      this._renderStats();
      this._renderCurrentBanner();
      this._renderLayers();
      this._renderDepthScale();
    }

    _renderStats() {
      const s = this.state;
      if (this.el.lifeValue) {
        this.el.lifeValue.innerHTML = '';
        for (let i = 0; i < s.maxLife; i++) {
          const heart = document.createElement('span');
          heart.className = 'endless-heart' + (i < s.life ? ' filled' : ' lost');
          heart.textContent = '♥';
          this.el.lifeValue.appendChild(heart);
        }
      }
      if (this.el.scoreValue) this.el.scoreValue.textContent = formatNumber(s.score);
      if (this.el.fragmentsValue) this.el.fragmentsValue.textContent = formatNumber(s.fragments);
      if (this.el.objective) this.el.objective.textContent = this._objectiveText(s.depth);
    }

    _objectiveText(depth) {
      const next = BOSS_DEPTHS.find(d => d > depth);
      return next
        ? `次の目標: DEPTH ${next} のBOSSを撃破する`
        : '次の目標: 深部を目指して進み続ける';
    }

    _renderCurrentBanner() {
      const s = this.state;
      const layer = findLayer(s.depth);
      const maxLabel = isFinite(layer.max) ? layer.max : '∞';
      if (this.el.currentLayerName) {
        this.el.currentLayerName.textContent = `LAYER ${layer.id} · ${layer.jp}`;
        this.el.currentLayerName.className = 'rm-current-layer-name ' + layer.cls;
      }
      if (this.el.currentDepth) this.el.currentDepth.textContent = `DEPTH ${s.depth} / ${maxLabel}`;
      if (this.el.progressFill) {
        const span = isFinite(layer.max) ? (layer.max - layer.min) || 1 : DEPTH_SCALE_MAX - layer.min;
        const done = Math.max(0, Math.min(span, s.depth - layer.min));
        this.el.progressFill.style.width = `${Math.round((done / span) * 100)}%`;
      }
    }

    _nodeAt(depth) {
      return this.state.visitedNodes.find(n => n.depth === depth) || null;
    }

    _renderLayers() {
      const container = this.el.layers;
      if (!container) return;
      container.innerHTML = '';
      const depth = this.state.depth;

      LAYERS.forEach(layer => {
        const completed = depth > layer.max;
        const locked = depth < layer.min;
        const section = document.createElement('div');
        section.className = 'rm-layer ' + layer.cls + (completed ? ' completed' : locked ? ' locked' : ' current');

        const maxLabel = isFinite(layer.max) ? layer.max : '∞';
        const header = document.createElement('div');
        header.className = 'rm-layer-header';
        header.innerHTML = `
          <span class="rm-layer-title">LAYER ${layer.id} ${locked ? '???' : layer.jp}</span>
          <span class="rm-layer-range">DEPTH ${layer.min} - ${maxLabel}</span>
          <span class="rm-layer-status">${completed ? '✓ CLEARED' : locked ? '🔒 未到達' : '▶ 探索中'}</span>
        `;
        section.appendChild(header);

        const nodes = document.createElement('div');
        nodes.className = 'rm-layer-nodes';

        if (locked) {
          const lockNode = document.createElement('div');
          lockNode.className = 'rm-node rm-node-lock';
          lockNode.textContent = '🔒';
          lockNode.addEventListener('click', () => this._showNodeDetail({ locked: true, depth: layer.min }));
          nodes.appendChild(lockNode);
        } else if (completed) {
          const doneNode = document.createElement('div');
          doneNode.className = 'rm-node rm-node-boss cleared';
          doneNode.textContent = '💀';
          doneNode.title = 'BOSS DEFEATED';
          doneNode.addEventListener('click', () => this._showNodeDetail(this._nodeAt(layer.max) || { depth: layer.max, type: 'boss', name: 'BOSS', icon: '💀' }));
          nodes.appendChild(doneNode);
        } else {
          const startDepth = Math.max(layer.min, 1);
          for (let d = startDepth; d <= Math.min(depth, layer.max); d++) {
            const visited = this._nodeAt(d);
            const btn = document.createElement('button');
            btn.type = 'button';
            const isHere = d === depth;
            btn.className = 'rm-node' + (visited ? ' rm-node-' + visited.type : '') + (isHere ? ' current' : ' visited');
            btn.textContent = visited ? (visited.icon || (NodeTypes.getType(visited.type) || {}).icon || '❓') : '📍';
            btn.title = isHere ? 'YOU ARE HERE' : (visited ? visited.name : '');
            btn.addEventListener('click', () => this._showNodeDetail(visited || { depth: d, type: 'start', name: 'START', icon: '🚩' }));
            nodes.appendChild(btn);
            if (isHere) {
              const label = document.createElement('div');
              label.className = 'rm-here-label';
              label.textContent = 'YOU ARE HERE';
              nodes.appendChild(label);
            }
          }
          const pendingEnd = isFinite(layer.max) ? layer.max : Math.min(depth + 6, depth + 6);
          for (let d = depth + 1; d <= pendingEnd; d++) {
            const isBoss = BOSS_DEPTHS.indexOf(d) !== -1;
            const pip = document.createElement('div');
            pip.className = 'rm-node rm-node-pending' + (isBoss ? ' rm-node-boss-pending' : '');
            pip.textContent = isBoss ? '💀' : '·';
            pip.addEventListener('click', () => this._showNodeDetail({ locked: true, depth: d }));
            nodes.appendChild(pip);
          }
          if (!isFinite(layer.max)) {
            const more = document.createElement('div');
            more.className = 'rm-node-more';
            more.textContent = '…';
            nodes.appendChild(more);
          }
        }

        section.appendChild(nodes);
        container.appendChild(section);
      });
    }

    _renderDepthScale() {
      if (!this.el.depthScaleDot) return;
      const pct = Math.max(0, Math.min(1, this.state.depth / DEPTH_SCALE_MAX));
      this.el.depthScaleDot.style.top = `${Math.round(pct * 100)}%`;
      const layer = findLayer(this.state.depth);
      this.el.depthScaleDot.className = 'rm-depthscale-dot ' + layer.cls;
    }

    _renderLegend() {
      const container = this.el.legend;
      if (!container || !NodeTypes) return;
      container.innerHTML = '';
      const entries = Object.values(NodeTypes.TYPES).concat([{ id: 'lock', name: 'ロック', icon: '🔒' }]);
      entries.forEach(def => {
        const chip = document.createElement('div');
        chip.className = 'rm-legend-chip';
        chip.innerHTML = `<span class="rm-legend-icon">${def.icon}</span><span class="rm-legend-name">${def.name}</span>`;
        container.appendChild(chip);
      });
    }

    /** ---------------- ノード詳細ポップアップ ---------------- */

    _showNodeDetail(entry) {
      if (!this.el.nodeDetail) return;
      if (entry.locked) {
        this.el.nodeDetailIcon.textContent = '🔒';
        this.el.nodeDetailName.textContent = '未到達エリア';
        this.el.nodeDetailMeta.textContent = `DEPTH ${entry.depth}`;
        this.el.nodeDetailDesc.textContent = 'ここまで到達すると、このエリアの詳細が判明する。';
      } else {
        const def = NodeTypes.getType(entry.type) || {};
        this.el.nodeDetailIcon.textContent = entry.icon || def.icon || '❓';
        this.el.nodeDetailName.textContent = entry.name || def.name || '???';
        this.el.nodeDetailMeta.textContent = `DEPTH ${entry.depth}${def.risk ? ` ・ RISK: ${def.risk}` : ''}`;
        this.el.nodeDetailDesc.textContent = def.description || '';
      }
      this._showOverlay(this.el.nodeDetail);
    }

    /** ---------------- アップグレード / プロトコル / 履歴パネル ---------------- */

    _togglePanel(name) {
      if (name === 'upgrade') this._renderUpgradePanel();
      if (name === 'protocol') this._renderProtocolPanel();
      if (name === 'history') this._renderHistoryPanel();
      const map = { upgrade: this.el.upgradePanel, protocol: this.el.protocolPanel, history: this.el.historyPanel };
      this._showOverlay(map[name]);
    }

    _renderUpgradePanel() {
      const container = this.el.upgradeList;
      if (!container) return;
      container.innerHTML = '';
      const owned = this.state.ownedUpgrades || [];
      if (owned.length === 0) {
        container.innerHTML = '<div class="rm-panel-empty">まだアップグレードを獲得していない</div>';
        return;
      }
      owned.forEach(u => {
        const item = document.createElement('div');
        item.className = 'rm-panel-item cat-' + u.category + (u.rare ? ' rare' : '');
        item.innerHTML = `
          <span class="rm-panel-item-name">${u.rare ? '★ ' : ''}${u.name} Lv.${u.level}</span>
          <span class="rm-panel-item-desc">${u.description}</span>
        `;
        container.appendChild(item);
      });
    }

    _renderProtocolPanel() {
      const list = this.el.protocolList;
      const synergyList = this.el.synergyList;
      if (list) {
        list.innerHTML = '';
        const active = this.state.activeProtocols || [];
        if (active.length === 0) {
          list.innerHTML = '<div class="rm-panel-empty">アクティブなプロトコルが無い</div>';
        } else {
          active.forEach(def => {
            const item = document.createElement('div');
            item.className = 'rm-panel-item';
            item.innerHTML = `
              <span class="rm-panel-item-name">${def.name}</span>
              <span class="rm-panel-item-desc">${def.description}</span>
            `;
            list.appendChild(item);
          });
        }
      }
      if (synergyList) {
        synergyList.innerHTML = '';
        const synergies = this.state.activeSynergies || [];
        synergies.forEach(s => {
          const item = document.createElement('div');
          item.className = 'rm-panel-item rm-synergy-item';
          item.innerHTML = `
            <span class="rm-panel-item-name">⚡ SYNERGY: ${s.name}</span>
            <span class="rm-panel-item-desc">${s.description}</span>
          `;
          synergyList.appendChild(item);
        });
      }
    }

    _renderHistoryPanel() {
      const container = this.el.historyList;
      if (!container) return;
      container.innerHTML = '';
      const history = (this.state.puzzleHistory || []).slice(0, 20);
      if (history.length === 0) {
        container.innerHTML = '<div class="rm-panel-empty">まだ記録が無い</div>';
        return;
      }
      history.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'rm-panel-item' + (entry.cleared ? '' : ' failed');
        const label = entry.isBoss ? 'BOSS' : entry.isElite ? 'ELITE' : 'PUZZLE';
        item.innerHTML = `
          <span class="rm-panel-item-name">DEPTH ${entry.depth} ・ ${label} ・ ${entry.size}×${entry.size}</span>
          <span class="rm-panel-item-desc">${entry.cleared ? 'CLEAR' : 'FAILED'}</span>
        `;
        container.appendChild(item);
      });
    }

    _showOverlay(el) {
      if (el) el.classList.remove('hidden');
    }

    _hideOverlay(el) {
      if (el) el.classList.add('hidden');
    }
  }

  G.ResearchMapScreen = ResearchMapScreen;
})(typeof globalThis !== 'undefined' ? globalThis : this);
