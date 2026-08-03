/**
 * mapUI.js
 * ENDLESS RESEARCHのMap画面（1歩ごとに分岐する2〜3枚のNode候補を提示し、
 * プレイヤーに選ばせる）を担当する。DOM描画・カード選択のイベント配線のみを
 * 持ち、候補の生成（何が・どんな比率で出るか）はmapGenerator.js、選ばれた後の
 * 実処理（Puzzle開始/Event適用/Lab表示等）はendless.js側の責務
 * （researchLab.js/protocolSelect.jsと同じ役割分担）。
 *
 * Oracle Protocol所持時、Unknown Nodeの実際の中身とElite Nodeの変種名を
 * 選ぶ前から表示する（「Node情報表示」の実現。選択・進行自体の挙動は変えない）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { NodeTypes } = G;

  class MapUI {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.protocolManager Oracle所持判定に使う
     */
    constructor({ ui, protocolManager }) {
      this.ui = ui;
      this.protocolManager = protocolManager;
      this.onSelect = null; // (node) => {}
      this.choices = [];

      this.el = {
        depthLabel: document.getElementById('mapDepthLabel'),
        cards: document.getElementById('mapNodeCards')
      };
    }

    /**
     * @param {number} depth これから挑む予定のDepth（表示用）
     * @param {Array<Object>} choices mapGenerator.generateChoices()の結果
     */
    show(depth, choices) {
      this.choices = choices;
      if (this.el.depthLabel) this.el.depthLabel.textContent = `DEPTH ${depth}`;
      this._render();
      this.ui.showScreen('map');
    }

    _render() {
      const container = this.el.cards;
      if (!container) return;
      container.innerHTML = '';

      const oracleActive = !!(this.protocolManager && this.protocolManager.isActive('oracle'));

      this.choices.forEach(node => {
        const display = this._displayInfo(node, oracleActive);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'lab-card map-node-card map-node-' + node.type;
        card.innerHTML = `
          <span class="map-node-icon">${display.icon}</span>
          <span class="lab-card-name">${display.name}</span>
          <span class="map-node-risk risk-${String(display.risk || '').toLowerCase()}">RISK: ${display.risk}</span>
          <span class="map-node-reward">REWARD: ${display.reward}</span>
          <span class="lab-card-desc">${display.description}</span>
        `;
        card.addEventListener('click', () => {
          if (this.onSelect) this.onSelect(node);
        });
        container.appendChild(card);
      });
    }

    /** Oracle所持時、Unknown/Modifier付きNodeの隠された情報を表示用に補って返す（node自体は書き換えない） */
    _displayInfo(node, oracleActive) {
      if (node.type === 'unknown' && oracleActive && node.resolvedNode) {
        const resolved = node.resolvedNode;
        return {
          icon: node.icon,
          name: `${node.name} → ${resolved.name}`,
          risk: resolved.risk,
          reward: resolved.reward,
          description: `ORACLE検知: ${resolved.description}`
        };
      }
      // Elite（複数Modifier）・Tier3以降のPuzzle（1個だけModifier）いずれも
      // node.modifiersが1件以上あればrevealedDescriptionを持つ
      if (oracleActive && node.modifiers && node.modifiers.length > 0 && node.revealedDescription) {
        return Object.assign({}, node, {
          name: `${node.name}: ${node.modifiers.map(m => m.name).join(' + ')}`,
          description: node.revealedDescription
        });
      }
      return node;
    }
  }

  G.MapUI = MapUI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
