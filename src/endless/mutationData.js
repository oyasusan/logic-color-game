/**
 * mutationData.js
 * STEP30-5「World Mutation Trigger System」。World Stabilityの低下によって
 * 発生するMutation（Research World自体の一時的な変質）の静的定義データ。
 * 状態を持たない純粋なデータ＋ヘルパーのみ（worldEnvironment.js/researchIdentity.js
 * と同じ設計）。実際の判定・適用はworldMutationManager.jsの責務。
 *
 * データ形式: { id, name, description, level, effects, duration, environmentEffect }
 *   - level: 1(Minor)/2(Major)/3(Collapse)。0(Normal=Mutation無し)はデータとしては
 *     持たず、worldMutationManager.getActiveMutation()がnullを返すことで表現する
 *   - effects: environmentModifierManager.js（STEP30-2）と同じ規約の配列
 *     [{type, value}]。worldMutationManager.getEffectValue(type)が同じtypeを
 *     合算して返す（同一Mutationなので通常は1件のみヒットする）
 *   - duration: このMutationが持続するLayer移動回数（要求仕様に具体的な数値指定が
 *     無かったため、Minor=3・Major=5・Collapse=99〈事実上、Stability回復か
 *     Extractまで持続〉として設計した）
 *   - environmentEffect: { namePrefix } のみを持つ簡易実装。Environment Integration
 *     （要求仕様セクション9）の「DATA OCEAN→CORRUPTED DATA OCEAN」の例に合わせ、
 *     実際に別のEnvironmentのModifierへ切り替えるような大掛かりな変更はせず、
 *     表示名にプレフィックスを付けるだけの表示専用効果としている
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const LEVEL_LABELS = ['Normal', 'Minor Mutation', 'Major Mutation', 'Collapse Mutation'];

  // Trigger閾値（要求仕様どおり）
  const STABILITY_THRESHOLDS = { LEVEL1: 60, LEVEL2: 30, LEVEL3: 10 };

  const ALL = [
    {
      id: 'data_storm',
      name: 'DATA STORM',
      description: '大量のデータが荒れ狂う。Research Dataが増える一方、Unknown Nodeが出現しやすくなる。',
      level: 1,
      effects: [
        { type: 'researchDataMultiplier', value: 0.20 },
        { type: 'nodeWeightMultiplier_unknown', value: 0.10 }
      ],
      duration: 3,
      environmentEffect: { namePrefix: 'CORRUPTED' }
    },
    {
      id: 'signal_noise',
      name: 'SIGNAL NOISE',
      description: 'AI解析信号にノイズが乗る。予測精度が落ちる一方、Rare Rewardが出やすくなる。',
      level: 1,
      effects: [
        { type: 'aiPredictionPenalty', value: -0.15 },
        { type: 'rareEventWeightBoost', value: 0.15 }
      ],
      duration: 3,
      environmentEffect: { namePrefix: 'DISTORTED' }
    },
    {
      id: 'fractal_overflow',
      name: 'FRACTAL OVERFLOW',
      description: '論理構造が再帰的に増殖し、Puzzleの難易度が跳ね上がる。その代わり報酬も大きい。',
      level: 2,
      effects: [
        { type: 'puzzleDifficulty', value: 0.30 },
        { type: 'rewardMultiplier', value: 0.60 }
      ],
      duration: 5,
      environmentEffect: { namePrefix: 'OVERFLOWING' }
    },
    {
      id: 'neural_infection',
      name: 'NEURAL INFECTION',
      description: 'Environment ModifierがAI侵食により無作為に変化する。Protocol Fragmentの獲得量が増える。',
      level: 2,
      effects: [
        { type: 'environmentModifierRandom', value: 1 },
        { type: 'protocolFragmentMultiplier', value: 0.40 }
      ],
      duration: 5,
      environmentEffect: { namePrefix: 'INFECTED' }
    },
    {
      id: 'quantum_collapse',
      name: 'QUANTUM COLLAPSE',
      description: 'Map構造が量子的に揺らぎ、分岐候補が増える。Elite Nodeも出現しやすくなる。',
      level: 2,
      effects: [
        { type: 'extraMapChoices', value: 1 },
        { type: 'nodeWeightMultiplier_elite', value: 0.20 }
      ],
      duration: 5,
      environmentEffect: { namePrefix: 'COLLAPSING' }
    },
    {
      id: 'reality_break',
      name: 'REALITY BREAK',
      description: '現実の層そのものが破綻する。Unknown Dimensionが出現しやすくなり、報酬は倍増するがリスクも跳ね上がる。',
      level: 3,
      effects: [
        { type: 'nodeWeightMultiplier_unknown', value: 0.50 },
        { type: 'rewardMultiplier', value: 1.0 },
        { type: 'riskChainBonus', value: 0.30 }
      ],
      duration: 99,
      environmentEffect: { namePrefix: 'BROKEN' }
    }
  ];

  const BY_ID = new Map(ALL.map(m => [m.id, m]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  function getByLevel(level) {
    return ALL.filter(m => m.level === level);
  }

  /** @param {number} level 1〜3 @returns {Object|null} その水準に属するMutationから無作為に1つ */
  function pickRandomForLevel(level) {
    const pool = getByLevel(level);
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function getLevelLabel(level) {
    return LEVEL_LABELS[level] || LEVEL_LABELS[0];
  }

  G.MutationData = { ALL, LEVEL_LABELS, STABILITY_THRESHOLDS, getById, getByLevel, pickRandomForLevel, getLevelLabel };
})(typeof globalThis !== 'undefined' ? globalThis : this);
