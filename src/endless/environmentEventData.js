/**
 * environmentEventData.js
 * STEP30-6「Environment Event System」。Environment内で発生する一時的な
 * Research Event（異常/チャンス）の静的定義データ。状態を持たない純粋な
 * データ＋ヘルパーのみ（mutationData.js/worldEnvironment.jsと同じ設計）。
 * 実際の判定・適用はenvironmentEventManager.jsの責務。
 *
 * 役割分担（要求仕様どおり）:
 *   Environment: 常時ルール（worldEnvironment.jsのmodifiers、常時Active）
 *   Environment Modifier: 常時補正（environmentModifierManager.js）
 *   Environment Event: 一時的な異常・チャンス（本ファイル、このSTEP30-6）
 *   World Mutation: 世界状態変化（mutationData.js/worldMutationManager.js）
 *
 * データ形式: { id, name, description, environment, rarity, duration, effects, choices, logMessage }
 *   - environment: 対応するWorldEnvironment id（worldEnvironment.js参照）。
 *     'env_unknown'のUnknown Signalのみ`choices`を持つ（Choice Event）
 *   - rarity: 'common'|'uncommon'|'rare'|'legendary'。同一Environment内の抽選重みに使う
 *     （RARITY_WEIGHTS参照。要求仕様に重み数値の指定が無かったため、既存の
 *     protocols.js/rareUpgrades.js等の「レア度が上がるほど出にくい」設計を踏襲した）
 *   - duration: このEventが持続するLayer移動回数。要求仕様に具体的な数値指定が
 *     無かったため、全Event共通でduration=1（発生したLayerの間だけ効果が続き、
 *     次のLayer移動のtickDuration()で自動終了する）とした。「一時的」という
 *     要求仕様の性質（World Mutationの複数Layer持続とは対照的に短い）に合わせた設計判断
 *   - effects: [{type, value}]の配列。type一覧はworldMutationManager.js/
 *     environmentModifierManager.jsと同じ規約のtype（rewardMultiplier等）を極力再利用し、
 *     このSTEP独自のInstant系効果（即時1回だけ適用され、Active中も持続しない）は
 *     `INSTANT_EFFECT_TYPES`にリストして区別する。両者の適用はenvironmentEventManager.js/
 *     endless.jsの責務
 *   - choices: Choice Event（Unknown Signalのみ）が持つ [{id, label, effects}]の配列。
 *     通常Eventはchoicesを持たない（undefined）
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // Instant系効果（Active中の持続効果ではなく、triggerEvent()の瞬間に1回だけ適用される）
  const INSTANT_EFFECT_TYPES = [
    'revealNextNode', 'revealRouteHistory', 'forceLabSpawn', 'lifeRecoveryInstant',
    'protocolFragmentInstant', 'researchDataInstant', 'rareProtocolInstant', 'stabilityDelta'
  ];

  const RARITY_WEIGHTS = { common: 3, uncommon: 2, rare: 1, legendary: 1 };

  const ALL = [
    // ---- DIGITAL GRID ----
    {
      id: 'grid_optimization',
      name: 'GRID OPTIMIZATION',
      description: 'AI解析システムが一時的に最適化される。Unknown Node事前解析確率とHINT開示数が上昇する。',
      logMessage: 'AI analysis enhanced.',
      environment: 'env_grid',
      rarity: 'common',
      duration: 1,
      effects: [
        { type: 'unknownRevealChance', value: 0.20 },
        { type: 'hintRevealBonus', value: 1 }
      ]
    },
    {
      id: 'grid_system_scan',
      name: 'SYSTEM SCAN',
      description: 'システムが次の分岐を先行スキャンする。次のMap選択で候補の中身が事前に見える。',
      logMessage: 'Next node data pre-analyzed.',
      environment: 'env_grid',
      rarity: 'common',
      duration: 1,
      effects: [{ type: 'revealNextNode', value: 1 }]
    },

    // ---- QUANTUM NETWORK ----
    {
      id: 'network_signal_interference',
      name: 'SIGNAL INTERFERENCE',
      description: '量子信号にノイズが混入する。AI予測精度は落ちるが、Rare Rewardの出現率が大きく上昇する。',
      logMessage: 'Prediction accuracy degraded. Rare signal surge detected.',
      environment: 'env_network',
      rarity: 'uncommon',
      duration: 1,
      effects: [
        { type: 'rewardPredictionAccuracy', value: -0.30 },
        { type: 'rareEventWeightBoost', value: 0.50 }
      ]
    },
    {
      id: 'network_quantum_echo',
      name: 'QUANTUM ECHO',
      description: '量子残響により、これまで通ってきた経路の情報が一時的に再構成される。',
      logMessage: 'Previous route information displayed.',
      environment: 'env_network',
      rarity: 'common',
      duration: 1,
      effects: [{ type: 'revealRouteHistory', value: 1 }]
    },

    // ---- NEURAL FOREST ----
    {
      id: 'forest_root_connection',
      name: 'ROOT CONNECTION',
      description: 'ニューラル構造の根が隠されたResearch Labへの経路を発見する。',
      logMessage: 'Hidden Research Lab detected nearby.',
      environment: 'env_forest',
      rarity: 'uncommon',
      duration: 1,
      effects: [{ type: 'forceLabSpawn', value: 1 }]
    },
    {
      id: 'forest_neural_growth',
      name: 'NEURAL GROWTH',
      description: 'ニューラル組織が自己修復を行い、ライフが回復する。',
      logMessage: 'Organic recovery process detected.',
      environment: 'env_forest',
      rarity: 'common',
      duration: 1,
      effects: [{ type: 'lifeRecoveryInstant', value: 1 }]
    },

    // ---- DATA OCEAN ----
    {
      id: 'ocean_data_storm',
      name: 'DATA STORM',
      description: '大量データが押し寄せる。Research Dataが倍増し、Protocol Fragmentの獲得量も増加する。',
      logMessage: 'Massive data influx detected.',
      environment: 'env_ocean',
      rarity: 'uncommon',
      duration: 1,
      effects: [
        { type: 'researchDataMultiplier', value: 1.0 },
        { type: 'protocolFragmentMultiplier', value: 0.20 }
      ]
    },
    {
      id: 'ocean_lost_archive',
      name: 'LOST ARCHIVE',
      description: '海底に沈んでいた過去のProtocol断片を発見する。',
      logMessage: 'Fragments of a past Protocol recovered.',
      environment: 'env_ocean',
      rarity: 'rare',
      duration: 1,
      effects: [{ type: 'protocolFragmentInstant', value: 6 }]
    },

    // ---- FRACTAL CORE ----
    {
      id: 'fractal_shift',
      name: 'FRACTAL SHIFT',
      description: '論理構造が自己変形する。Puzzleの難易度は上がるが、報酬も大きく増加する。',
      logMessage: 'Logic structure destabilized.',
      environment: 'env_fractal',
      rarity: 'uncommon',
      duration: 1,
      effects: [
        { type: 'puzzleDifficulty', value: 0.15 },
        { type: 'rewardMultiplier', value: 0.50 }
      ]
    },
    {
      id: 'fractal_recursive_loop',
      name: 'RECURSIVE LOOP',
      description: '再帰ループが検出される。過去の解析データからボーナスが回収される。',
      logMessage: 'Recursive logic loop detected.',
      environment: 'env_fractal',
      rarity: 'rare',
      duration: 1,
      effects: [{ type: 'researchDataInstant', value: 150 }]
    },

    // ---- UNKNOWN DIMENSION（Choice Event） ----
    {
      id: 'unknown_signal',
      name: 'UNKNOWN SIGNAL',
      description: '未知の信号を検出した。解析するか、安全のため無視するかを選択できる。',
      logMessage: 'Unidentified signal detected.',
      environment: 'env_unknown',
      rarity: 'legendary',
      duration: 1,
      choices: [
        {
          id: 'yes',
          label: 'YES — Analyze Signal',
          effects: [
            { type: 'rareProtocolInstant', value: 1 },
            { type: 'researchDataInstant', value: 300 },
            { type: 'stabilityDelta', value: -10 }
          ]
        },
        {
          id: 'no',
          label: 'NO — Ignore',
          effects: []
        }
      ]
    }
  ];

  const BY_ID = new Map(ALL.map(e => [e.id, e]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  /** @param {string} environmentId @returns {Array<Object>} そのEnvironmentに属するEvent定義一覧 */
  function getByEnvironment(environmentId) {
    return ALL.filter(e => e.environment === environmentId);
  }

  /** @param {string} environmentId @returns {Object|null} レア度重み付き抽選で1つ選ぶ（該当Eventが無ければnull） */
  function pickForEnvironment(environmentId) {
    const pool = getByEnvironment(environmentId);
    if (pool.length === 0) return null;
    const weights = pool.map(e => RARITY_WEIGHTS[e.rarity] || 1);
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      if (roll < weights[i]) return pool[i];
      roll -= weights[i];
    }
    return pool[pool.length - 1];
  }

  G.EnvironmentEventData = { ALL, RARITY_WEIGHTS, INSTANT_EFFECT_TYPES, getById, getByEnvironment, pickForEnvironment };
})(typeof globalThis !== 'undefined' ? globalThis : this);
