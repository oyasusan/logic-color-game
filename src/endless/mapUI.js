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
 *
 * STEP27「AI Analysis Risk/Reward System」: 通常のrisk/reward表示に代えて、
 * mapGenerator.jsがNodeへ付与したthreatLevel/rewardPrediction/confidenceLevel
 * （aiAnalysis.js参照）を「AI Analysis Panel」として表示する。Unknown Nodeのみ
 * 通常のカードではなく、ANALYZE/IGNOREの2ボタンを持つ専用パネルにする
 * （ANALYZEでonSelect(node)相当の選択が確定し、実際の解決はendless.js
 * `_resolveUnknownNode()`が担う。IGNOREは選択せずこのNodeを見送るだけの
 * 演出的なボタンで、他の候補カードは引き続き選べる）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { NodeTypes, AIAnalysis } = G;

  class MapUI {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.protocolManager Oracle所持判定に使う
     * @param {Object} [deps.metaProgression] STEP28: Advanced Analysis（Unknown Node解析確率）に使う（省略可）
     * @param {Object} [deps.identityManager] STEP29: Analyst/ExplorerのUnknown Node解析確率ボーナスに使う（省略可）
     * @param {Object} [deps.environmentModifierManager] STEP30-2: 現在のWorldEnvironmentの
     *   Unknown Node解析確率ボーナス・ENVIRONMENT ANALYSISパネル表示に使う（省略可）
     * @param {Object} [deps.environmentEventManager] STEP30-6: GRID OPTIMIZATION Eventの
     *   Unknown Node解析確率ボーナスに使う（省略可）
     */
    constructor({ ui, protocolManager, metaProgression, identityManager, environmentModifierManager, environmentEventManager }) {
      this.ui = ui;
      this.protocolManager = protocolManager;
      this.metaProgression = metaProgression || null;
      this.identityManager = identityManager || null;
      this.environmentModifierManager = environmentModifierManager || null;
      this.environmentEventManager = environmentEventManager || null;
      this.onSelect = null; // (node) => {}
      this.choices = [];
      this._forceReveal = false; // STEP30-6: SYSTEM SCAN Eventによる、次のshow()1回限りの強制Oracle風表示

      this.el = {
        depthLabel: document.getElementById('mapDepthLabel'),
        cards: document.getElementById('mapNodeCards'),
        // STEP30-2: ENVIRONMENT ANALYSISパネル（AI Analysis UI Integration）
        envAnalysisPanel: document.getElementById('mapEnvironmentAnalysis'),
        envAnalysisName: document.getElementById('mapEnvAnalysisName'),
        envAnalysisEffects: document.getElementById('mapEnvAnalysisEffects')
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
      this._renderEnvironmentAnalysis();
      this.ui.showScreen('map');
    }

    /**
     * STEP30-2: AI Analysis UI Integration（要求仕様セクション7）。
     * 現在のWorldEnvironment名と、Active中のModifier一覧（cosmetic用の
     * rewardPredictionAccuracy/aiConfidencePenaltyも含め全て表示専用として並べる）を示す。
     */
    _renderEnvironmentAnalysis() {
      if (!this.environmentModifierManager || !this.el.envAnalysisPanel) return;
      const env = this.environmentModifierManager.worldEnvironmentManager.getCurrentEnvironment();
      const modifiers = this.environmentModifierManager.getActiveModifiers();
      if (this.el.envAnalysisName) this.el.envAnalysisName.textContent = env.name;
      if (this.el.envAnalysisEffects) {
        this.el.envAnalysisEffects.innerHTML = modifiers.map(m => `<div class="env-analysis-effect">${m.name}</div>`).join('');
      }
      this.el.envAnalysisPanel.classList.remove('hidden');
    }

    /** STEP30-6: SYSTEM SCAN Eventの「次Node情報表示」。次のshow()1回だけOracle相当の表示を強制する */
    forceRevealNext() {
      this._forceReveal = true;
    }

    _render() {
      const container = this.el.cards;
      if (!container) return;
      container.innerHTML = '';

      const oracleActive = !!(this.protocolManager && this.protocolManager.isActive('oracle')) || this._forceReveal;
      this._forceReveal = false;

      this.choices.forEach(node => {
        const display = this._displayInfo(node, oracleActive);
        const card = node.type === 'unknown'
          ? this._renderUnknownCard(node, oracleActive)
          : this._renderNodeCard(node, display);
        container.appendChild(card);
      });
    }

    /**
     * STEP30-3: Research Map Integration（要求仕様セクション7）。現在のWorldEnvironmentの
     * アイコン+名前をNodeカードへ表示する小さなタグ。全Nodeで内容は同じ（Environmentは
     * Map全体で共通のため、Node個別の属性ではない）
     */
    _environmentTagHtml() {
      if (!this.environmentModifierManager) return '';
      const env = this.environmentModifierManager.worldEnvironmentManager.getCurrentEnvironment();
      return `<span class="map-node-env-tag">${env.icon || ''} ${env.name}</span>`;
    }

    /** 通常Node（Unknown以外）: AI Analysis Panel付きの選択可能なカードを1枚組み立てる */
    _renderNodeCard(node, display) {
      const analysis = AIAnalysis ? AIAnalysis.analyze(node) : null;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'lab-card map-node-card map-node-' + node.type + ' ai-panel';
      card.innerHTML = `
        <span class="ai-signal-label">SIGNAL DETECTED</span>
        ${this._environmentTagHtml()}
        <span class="map-node-icon">${display.icon}</span>
        <span class="lab-card-name">${display.name}</span>
        ${analysis ? this._analysisBlockHtml(analysis) : ''}
        ${analysis ? `<div class="ai-recommendation">"${analysis.recommendation}"</div>` : ''}
        <span class="lab-card-desc">${display.description}</span>
      `;
      card.addEventListener('click', () => {
        if (this.onSelect) this.onSelect(node);
      });
      return card;
    }

    /**
     * Unknown Node: "DEEP UNKNOWN SIGNAL"パネル+ANALYZE/IGNOREの2ボタンを持つ
     * カードを組み立てる（button-in-buttonを避けるため外枠はdivにする）。
     * Oracle Protocol所持時は、実際に裏で決まっているresolvedNodeの解析結果
     * （mapGenerator.jsが既に付与済み）をそのまま覗き見せる。
     * STEP28: Advanced Analysis（researchTree.js）所持時は、Oracle未所持でも
     * その所持レベルに応じた確率で同じ解析結果が事前に見える。
     */
    _renderUnknownCard(node, oracleActive) {
      const card = document.createElement('div');
      card.className = 'lab-card map-node-card map-node-unknown ai-panel ai-panel-unknown';

      const revealChance = (this.metaProgression ? this.metaProgression.getUnknownRevealChance() : 0)
        + (this.identityManager ? this.identityManager.getUnknownRevealChanceBonus() : 0) // STEP29
        + (this.environmentModifierManager ? this.environmentModifierManager.getModifierValue('unknownRevealChance') : 0) // STEP30-2
        + (this.environmentEventManager ? this.environmentEventManager.getEventUnknownRevealChanceBonus() : 0); // STEP30-6
      const reveal = node.resolvedNode && (oracleActive || Math.random() < revealChance);
      card.innerHTML = `
        <span class="ai-signal-label">DEEP UNKNOWN SIGNAL</span>
        ${this._environmentTagHtml()}
        <span class="map-node-icon">❓</span>
        ${reveal
          ? `<div class="ai-analysis-block">
              <div class="ai-analysis-row"><span class="ai-analysis-key">ORACLE検知</span><span class="ai-analysis-value">${node.resolvedNode.name}</span></div>
              <div class="ai-analysis-row"><span class="ai-analysis-key">Threat</span><span class="ai-analysis-value threat-${node.resolvedNode.threatLevel}">${node.resolvedNode.threatStars}</span></div>
              <div class="ai-analysis-row"><span class="ai-analysis-key">Reward Prediction</span><span class="ai-analysis-value">${node.resolvedNode.rewardPrediction}%</span></div>
            </div>`
          : `<div class="ai-analysis-block">
              <div class="ai-analysis-row"><span class="ai-analysis-key">Threat</span><span class="ai-analysis-value">???</span></div>
              <div class="ai-analysis-row"><span class="ai-analysis-key">Reward Prediction</span><span class="ai-analysis-value">???</span></div>
              <div class="ai-analysis-row"><span class="ai-analysis-key">AI Confidence</span><span class="ai-analysis-value confidence-low">LOW</span></div>
            </div>`
        }
      `;

      const actions = document.createElement('div');
      actions.className = 'ai-unknown-actions';

      const analyzeBtn = document.createElement('button');
      analyzeBtn.type = 'button';
      analyzeBtn.className = 'ai-analyze-btn';
      analyzeBtn.textContent = 'ANALYZE';
      analyzeBtn.addEventListener('click', () => {
        if (this.onSelect) this.onSelect(node);
      });

      const ignoreBtn = document.createElement('button');
      ignoreBtn.type = 'button';
      ignoreBtn.className = 'ai-ignore-btn';
      ignoreBtn.textContent = 'IGNORE';
      ignoreBtn.addEventListener('click', () => {
        if (this.ui) this.ui.showToast('SIGNAL IGNORED — 他の候補を選択してください');
      });

      actions.appendChild(analyzeBtn);
      actions.appendChild(ignoreBtn);
      card.appendChild(actions);
      return card;
    }

    _analysisBlockHtml(analysis) {
      return `
        <div class="ai-analysis-block">
          <div class="ai-analysis-row"><span class="ai-analysis-key">Threat</span><span class="ai-analysis-value threat-${analysis.threatLevel}">${analysis.threatStars}</span></div>
          <div class="ai-analysis-row"><span class="ai-analysis-key">Reward Prediction</span><span class="ai-analysis-value">${analysis.rewardPrediction}%</span></div>
          <div class="ai-analysis-row"><span class="ai-analysis-key">AI Confidence</span><span class="ai-analysis-value confidence-${String(analysis.confidenceLevel).toLowerCase()}">${analysis.confidenceLevel}</span></div>
        </div>
      `;
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
