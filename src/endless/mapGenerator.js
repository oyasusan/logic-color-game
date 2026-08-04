/**
 * mapGenerator.js
 * ENDLESS RESEARCHの「次の1歩」で選べるMap Nodeの分岐候補を生成する。
 * 状態を持たない純粋な生成ロジック（boss.js/eventManager.jsと同じ「データ＋
 * ヘルパー」構成）で、実際にどのNodeへ入り何が起こるか（Puzzle開始/Event適用/
 * Lab表示等）の処理はendless.js側の責務、画面描画はmapUI.jsの責務。
 *
 * 生成ルール:
 *   - Boss出現Depth（boss.jsのBOSS_DEPTHS）では分岐せず、Boss Nodeのみを返す
 *     （避けて通れない固定ゲート）
 *   - Research Lab（3Depthごと）・Protocol Signal（5Depthごと）は、既存の
 *     researchLab.js/protocolSignal.jsの出現周期（APPEAR_EVERY_DEPTH=3/
 *     SIGNAL_EVERY_DEPTH=5）とそろえて「必ず候補の1枠として提示される」
 *     （強制ではなく選択肢の1つになる点が既存のPhase Bまでとの違い）
 *   - 残り枠はPuzzle/Event/Elite/Recovery/Unknownから、Depth Tier別の重みで
 *     抽選する（CHOICE_COUNT=3、Lab/Signalが両方出る場合は残り1枠のみ抽選）
 *   - Protocol連動: Explorer所持中はRecovery、Overclock所持中はElite、Chaos
 *     所持中はUnknownの抽選重みをそれぞれ引き上げる（「安全Node増加」
 *     「Elite増加」「Unknown増加」の実現）
 *   - Environment連動: Signal Noise Environment所持時はEventの抽選重みが
 *     引き上げられる（従来eventManager.shouldTrigger()側にあったrateMultiplier
 *     効果を、Event Nodeの出現しやすさとして引き継いだもの）
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { NodeTypes, Boss, PuzzleTier, PuzzleModifier, AIAnalysis } = G;

  const CHOICE_COUNT = 3;
  const LAB_EVERY_DEPTH = 3;    // researchLab.jsのAPPEAR_EVERY_DEPTHと合わせる
  const SIGNAL_EVERY_DEPTH = 5; // protocolSignal.jsのSIGNAL_EVERY_DEPTHと合わせる

  // Depth Tier別のNode抽選重み（Lab/Signal/Bossを除く5種）。合計値に意味は無く、比率のみが重要
  // story: STEP32(Story Scenario Framework)セクション7で追加。他5種より意図的に低い
  // 固定重みとし（Tierによる変化を付けない）、既存のNode出現バランスへの影響を最小限にした
  const WEIGHT_TIERS = [
    { maxDepth: 5, weights: { puzzle: 55, event: 20, elite: 5, recovery: 15, unknown: 5, story: 6 } },
    { maxDepth: 15, weights: { puzzle: 45, event: 20, elite: 12, recovery: 13, unknown: 10, story: 6 } },
    { maxDepth: Infinity, weights: { puzzle: 35, event: 18, elite: 20, recovery: 12, unknown: 15, story: 6 } }
  ];

  // Protocol所持時に特定Node種類の重みへ掛ける倍率
  const PROTOCOL_WEIGHT_BOOST = {
    explorer: { key: 'recovery', multiplier: 2.5 },  // 安全Node増加
    overclock: { key: 'elite', multiplier: 2.5 },    // Elite増加
    chaos: { key: 'unknown', multiplier: 2.5 }       // Unknown増加
  };

  const MAX_CHOICE_COUNT = 6; // STEP28: Deep Scanで候補が増えても画面が破綻しないための上限

  /**
   * @param {number} depth これから挑む予定のDepth
   * @param {Object} [protocolManager] 所持Protocolに応じた重み補正に使う（省略可）
   * @param {Object} [environmentManager] Signal Noise Environmentによる重み補正に使う（省略可）
   * @param {number} [extraChoices] STEP28: Deep Scan（researchTree.js）による追加候補数（省略可、0扱い）
   * @param {Object} [environmentModifierManager] STEP30-2: 現在のWorldEnvironmentの
   *   Modifier（Unknown Spawn/Elite Node/Rare Event等のMap向け重み補正、Research Lab
   *   Spawnの追加出現）に使う（省略可）
   * @param {Object} [worldMutationManager] STEP30-5: Active中のMutation（QUANTUM COLLAPSEの
   *   追加候補・Elite重み、REALITY BREAKのUnknown重み等）に使う（省略可）
   * @returns {Array<Object>} 選択可能なMap Nodeの配列（Boss出現Depthでは要素1つ）
   */
  function generateChoices(depth, protocolManager, environmentManager, extraChoices, environmentModifierManager, worldMutationManager) {
    if (Boss && Boss.isBossDepth(depth)) {
      return [buildNode('boss', depth)];
    }

    const mutationExtraChoices = worldMutationManager ? worldMutationManager.getExtraMapChoices() : 0;
    const targetCount = Math.min(MAX_CHOICE_COUNT, CHOICE_COUNT + Math.max(0, extraChoices || 0) + Math.max(0, mutationExtraChoices));

    const choices = [];
    const isLabDepth = depth > 0 && depth % LAB_EVERY_DEPTH === 0;
    if (isLabDepth) choices.push(buildNode('research_lab', depth));
    if (depth > 0 && depth % SIGNAL_EVERY_DEPTH === 0) choices.push(buildNode('protocol_signal', depth));

    // STEP30-2: NEURAL FORESTの「Research Lab Spawn +15%」。通常周期の対象Depthでない時のみ、
    // 追加のResearch Lab候補が出現する確率を上乗せする（既存の周期出現ルールは変更しない）
    if (environmentModifierManager && !isLabDepth) {
      const extraLabChance = environmentModifierManager.getExtraLabChance();
      if (extraLabChance > 0 && Math.random() < extraLabChance) choices.push(buildNode('research_lab', depth));
    }

    const weights = getWeights(depth, protocolManager, environmentManager, environmentModifierManager, worldMutationManager);
    while (choices.length < targetCount) {
      choices.push(buildNode(weightedPick(weights), depth));
    }

    return shuffle(choices);
  }

  /** @returns {Object} depthのTierに対応する重みテーブルのコピー（Protocol/Environment/WorldEnvironment Modifier/Mutation補正込み） */
  function getWeights(depth, protocolManager, environmentManager, environmentModifierManager, worldMutationManager) {
    const tier = WEIGHT_TIERS.find(t => depth <= t.maxDepth) || WEIGHT_TIERS[WEIGHT_TIERS.length - 1];
    const weights = Object.assign({}, tier.weights);

    if (environmentManager && typeof environmentManager.getEventRateMultiplier === 'function') {
      weights.event *= environmentManager.getEventRateMultiplier();
    }

    if (protocolManager) {
      Object.keys(PROTOCOL_WEIGHT_BOOST).forEach(protocolId => {
        if (!protocolManager.isActive(protocolId)) return;
        const boost = PROTOCOL_WEIGHT_BOOST[protocolId];
        weights[boost.key] *= boost.multiplier;
      });
    }

    // STEP30-2: 現在のWorldEnvironmentが持つnodeWeightMultiplier_*（Unknown Spawn/Elite Node/
    // Rare Event=Event Node）を、Protocol補正とは独立にさらに乗算する
    if (environmentModifierManager) {
      Object.keys(weights).forEach(type => {
        weights[type] *= environmentModifierManager.getNodeWeightMultiplier(type);
      });
    }
    // STEP30-5: Active中のMutation（QUANTUM COLLAPSEのElite増加、REALITY BREAKのUnknown増加）を、
    // Environment Modifierとは独立にさらに乗算する
    if (worldMutationManager) {
      Object.keys(weights).forEach(type => {
        weights[type] *= worldMutationManager.getNodeWeightMultiplier(type);
      });
    }
    return weights;
  }

  function weightedPick(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [type, w] of entries) {
      if (roll < w) return type;
      roll -= w;
    }
    return entries[entries.length - 1][0];
  }

  /**
   * Node定義（nodeTypes.js）を元に、Mapに実際に置く1つのNodeインスタンスを組み立てる。
   * Elite Nodeはpuzzle Evolution System（puzzleModifier.js）のModifierを
   * ELITE_MODIFIER_COUNT個（重複無し）まとめて付与する（「複数Modifier付与」の
   * 実現。旧nodeTypes.jsのELITE_VARIANTS単体付与から置き換えた）。
   * Tier3以降（Depth26+）の通常Puzzle Nodeにも、PUZZLE_MODIFIER_CHANCEの確率で
   * 1個だけModifierが付与されることがある（「Depthに応じて問題内容が進化する」の実現）。
   * Unknownは「実際には何が起こるか」をこの時点で事前に1つ確定させ`resolvedNode`
   * として保持する（Oracle Protocolによる事前表示・選択時の即座な解決の両方に使う）。
   */
  function buildNode(typeId, depth) {
    const base = NodeTypes.getType(typeId);
    const node = {
      id: `${typeId}-${depth}-${Math.random().toString(36).slice(2, 8)}`,
      type: typeId,
      name: base.name,
      icon: base.icon,
      risk: base.risk,
      reward: base.reward,
      description: base.description,
      modifiers: []
    };

    if (typeId === 'boss') {
      const bossConfig = Boss ? Boss.getBossConfig(depth) : null;
      if (bossConfig) node.name = bossConfig.name;
    }

    if (typeId === 'elite' && PuzzleModifier) {
      node.modifiers = PuzzleModifier.pickRandom(PuzzleModifier.ELITE_MODIFIER_COUNT);
      // descriptionは変種名を伏せた汎用文言のまま保つ。Oracle Protocol所持時のみ
      // mapUI.js側がrevealedDescription（Modifier名入り）を代わりに表示する
      node.revealedDescription = `${base.description}（${node.modifiers.map(m => m.name).join(' + ')}）`;
    }

    if (typeId === 'puzzle' && PuzzleModifier && PuzzleTier) {
      const tier = PuzzleTier.getTierNumber(depth);
      if (tier >= PuzzleModifier.PUZZLE_MODIFIER_MIN_TIER && Math.random() < PuzzleModifier.PUZZLE_MODIFIER_CHANCE) {
        node.modifiers = PuzzleModifier.pickRandom(1);
        node.revealedDescription = `${base.description}（${node.modifiers[0].name}: ${node.modifiers[0].description}）`;
      }
    }

    if (typeId === 'unknown') {
      const resolvable = NodeTypes.UNKNOWN_RESOLVABLE_TYPES;
      const resolvedTypeId = resolvable[Math.floor(Math.random() * resolvable.length)];
      node.resolvedNode = buildNode(resolvedTypeId, depth); // resolvableにunknown自身は含まれないため無限再帰しない
    }

    // STEP27: AI Analysis Risk/Reward System。threatLevel/rewardPrediction/
    // confidenceLevel等をNodeデータへ付与する。unknown自身はnull/LOW（???表示）に
    // なるが、上でbuildNode()した`resolvedNode`は実際の種類として解析済みのため、
    // Oracle Protocol所持時はそちらの解析結果をmapUI.js側が事前表示に使える
    if (AIAnalysis) Object.assign(node, AIAnalysis.analyze(node));

    return node;
  }

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  G.MapGenerator = { generateChoices, buildNode, CHOICE_COUNT, LAB_EVERY_DEPTH, SIGNAL_EVERY_DEPTH };
})(typeof globalThis !== 'undefined' ? globalThis : this);
