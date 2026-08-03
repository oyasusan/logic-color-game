/**
 * worldEnvironment.js
 * STEP30-1「Dynamic Research World」第一段階: Environment Framework。
 * Research Layer（RUN内のDepthそのものを指す。既存のpuzzleTier.jsの4段階Tierとは
 * 別の、5Layerごとに切り替わる「見た目のテーマ」用のより細かい粒度）に紐づく
 * Research Environment（研究環境）の静的定義データ。
 *
 * 【命名についての重要な注意】: このプロジェクトには既に「Research Environment」
 * という名前のRUN限定システム（environments.js/environmentManager.js、RUN開始時に
 * 選ぶBlue Spectrum等6種、スコア倍率等のゲームプレイ効果を持つ）が存在する。
 * STEP30-1が要求する「Environment」はそれとは全くの別概念（Layerに紐づく恒久的な
 * 見た目テーマ、ゲームプレイ効果は今回一切持たない）のため、クラス名・グローバル名の
 * 衝突を避けて`WorldEnvironment`/`WorldEnvironmentManager`という名前にしている。
 *
 * このファイルは純粋なデータ（+参照用の小さなヘルパー）のみを持ち、状態管理・
 * 効果集計はworldEnvironmentManager.jsの責務（researchIdentity.js等と同じ役割分担）。
 *
 * 【STEP30-2追記】各定義に`modifiers[]`（{id,name,description,type,value,target}の配列）を
 * 追加した。実際の効果適用・集計はenvironmentModifierManager.jsの責務で、このファイルは
 * 引き続きデータのみを持つ。
 *
 * 【STEP30-3追記】各定義に`icon`（絵文字1文字、Research Map Node表示・Environment Archive
 * 表示用）を追加した。
 *
 * データ形式: { id, name, theme, description, background, uiColor, bgmId, unlockCondition, modifiers, icon }
 *   - background: 簡易Visual Theme Framework用の背景種別ラベル（今回は既存Canvas/CSS
 *     構造に軽く乗せる程度の簡易実装で、専用の描画エンジンは追加しない）
 *   - uiColor: HUD等に軽く反映する基調色（CSS変数`--world-env-color`へ反映する）
 *   - bgmId: BGM Integration Hookとして取得可能にするだけで、再生自体は今回未実装
 *   - unlockCondition: { type: 'always' } | { type: 'layer', value }
 *     UNKNOWN DIMENSIONのみLayer26到達で解放（要求仕様の「Layer26以降はランダム」の
 *     プールに含まれるタイミングと自然に一致させるための設計）
 *
 * Layer→Environmentの固定対応（要求仕様どおり）:
 *   Layer  1- 5: DIGITAL GRID
 *   Layer  6-10: QUANTUM NETWORK
 *   Layer 11-15: NEURAL FOREST
 *   Layer 16-20: DATA OCEAN
 *   Layer 21-25: FRACTAL CORE
 *   Layer 26以降: ランダム（worldEnvironmentManager.js参照。5Layerごとのバンド単位で
 *     選出することで、Layer1-25までと同じ「5Layer保持される」体感速度を維持している）
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const DEFAULT_ID = 'env_grid';
  const RANDOM_START_LAYER = 26; // このLayer以降は固定対応表を離れ、ランダム選出になる

  const ALL = [
    {
      id: 'env_grid',
      name: 'DIGITAL GRID',
      theme: 'AI研究施設',
      description: '初期解析領域。安定したデジタル研究空間。',
      background: 'grid',
      uiColor: '#29e0ff',
      bgmId: 'bgm_grid',
      icon: '🔷',
      unlockCondition: { type: 'always' },
      // STEP30-2: Environment Modifier System（要求仕様「Stable Analysis Area」）
      modifiers: [
        { id: 'grid_ai_prediction', name: 'AI Prediction Accuracy +10%', description: 'Unknown Nodeの事前解析確率が上昇する', type: 'unknownRevealChance', value: 0.10, target: 'unknown' },
        { id: 'grid_hint_effect', name: 'Puzzle Hint Effect +1', description: 'HINTで一度に開示されるマス数が+1される', type: 'hintRevealBonus', value: 1, target: 'puzzle' },
        { id: 'grid_unknown_spawn', name: 'Unknown Spawn -20%', description: 'Map上でUnknown Nodeが出現しにくくなる', type: 'nodeWeightMultiplier_unknown', value: -0.20, target: 'map' }
      ]
    },
    {
      id: 'env_network',
      name: 'QUANTUM NETWORK',
      theme: '量子通信領域',
      description: '量子化された情報ネットワーク。',
      background: 'network',
      uiColor: '#b968ff',
      bgmId: 'bgm_network',
      icon: '🟣',
      unlockCondition: { type: 'always' },
      // 要求仕様「Quantum Information Area」
      modifiers: [
        { id: 'network_rare_reward', name: 'Rare Reward +20%', description: 'Unknown Node解析でRare Upgradeが出やすくなる', type: 'rareEventWeightBoost', value: 0.20, target: 'reward' },
        { id: 'network_reward_prediction', name: 'Reward Prediction Accuracy -15%', description: 'AI ReportのReward Prediction表示精度が低下する（表示のみに影響）', type: 'rewardPredictionAccuracy', value: -0.15, target: 'unknown' },
        { id: 'network_protocol_fragment', name: 'Protocol Fragment +10%', description: 'Protocol Fragmentの獲得量が増加する', type: 'protocolFragmentMultiplier', value: 0.10, target: 'protocol' }
      ]
    },
    {
      id: 'env_forest',
      name: 'NEURAL FOREST',
      theme: '神経データ領域',
      description: 'AIニューラル構造が広がる領域。',
      background: 'neural',
      uiColor: '#3dff8a',
      bgmId: 'bgm_forest',
      icon: '🟢',
      unlockCondition: { type: 'always' },
      // 要求仕様「Neural Data Area」
      modifiers: [
        { id: 'forest_lab_spawn', name: 'Research Lab Spawn +15%', description: 'Research Lab Nodeが追加で出現しやすくなる', type: 'extraLabChance', value: 0.15, target: 'map' },
        { id: 'forest_life_recovery', name: 'Life Recovery +1', description: 'Recovery Nodeでのライフ回復量が+1される', type: 'lifeRecoveryBonus', value: 1, target: 'puzzle' },
        { id: 'forest_unknown_success', name: 'Unknown Analysis Success +10%', description: 'Unknown Node解析でSystem Corruption(ライフ減少)が起きにくくなる', type: 'unknownSuccessBoost', value: 0.10, target: 'unknown' }
      ]
    },
    {
      id: 'env_ocean',
      name: 'DATA OCEAN',
      theme: '情報海洋',
      description: '大量データが流れる深層領域。',
      background: 'data',
      uiColor: '#22ffcc',
      bgmId: 'bgm_ocean',
      icon: '🌊',
      unlockCondition: { type: 'always' },
      // 要求仕様「Information Ocean」
      modifiers: [
        { id: 'ocean_protocol_fragment', name: 'Protocol Fragment +30%', description: 'Protocol Fragmentの獲得量が大きく増加する', type: 'protocolFragmentMultiplier', value: 0.30, target: 'protocol' },
        { id: 'ocean_research_data', name: 'Research Data +20%', description: 'Research Dataの獲得量が増加する', type: 'researchDataMultiplier', value: 0.20, target: 'reward' },
        { id: 'ocean_elite_node', name: 'Elite Node +10%', description: 'Map上でElite Nodeが出現しやすくなる', type: 'nodeWeightMultiplier_elite', value: 0.10, target: 'map' }
      ]
    },
    {
      id: 'env_fractal',
      name: 'FRACTAL CORE',
      theme: '数学的異空間',
      description: '自己生成する論理構造。',
      background: 'fractal',
      uiColor: '#ff9d3f',
      bgmId: 'bgm_fractal',
      icon: '🔶',
      unlockCondition: { type: 'always' },
      // 要求仕様「High Density Logic Space」
      modifiers: [
        { id: 'fractal_puzzle_difficulty', name: 'Puzzle Difficulty +25%', description: 'Puzzleの制限時間が短縮される（実質的な難易度上昇）', type: 'puzzleDifficulty', value: 0.25, target: 'puzzle' },
        { id: 'fractal_reward', name: 'Reward +40%', description: '獲得スコアが大きく増加する', type: 'rewardMultiplier', value: 0.40, target: 'reward' },
        { id: 'fractal_risk_chain', name: 'Risk Chain Bonus +20%', description: 'Risk Chainによるスコア倍率がさらに上昇する', type: 'riskChainBonus', value: 0.20, target: 'risk' }
      ]
    },
    {
      id: 'env_unknown',
      name: 'UNKNOWN DIMENSION',
      theme: '未解析領域',
      description: 'AI解析不能領域。',
      background: 'glitch',
      uiColor: '#ff3f6b',
      bgmId: 'bgm_unknown',
      icon: '❓',
      unlockCondition: { type: 'layer', value: RANDOM_START_LAYER },
      // 要求仕様「Unstable Unknown Area」。"Random Modifier"は既存のResearch Environment
      // 「Unstable System」（environments.js）と同じ設計思想（他Environmentから1つ借用する）
      // を踏襲し、type:'randomModifier'としてEnvironmentModifierManager側で都度解決する
      modifiers: [
        { id: 'unknown_random_modifier', name: 'Random Modifier', description: '他のEnvironmentのModifierを1つランダムに借用する', type: 'randomModifier', value: null, target: 'unknown' },
        { id: 'unknown_rare_event', name: 'Rare Event Chance +50%', description: 'Map上でEvent Nodeが出現しやすくなる', type: 'nodeWeightMultiplier_event', value: 0.50, target: 'map' },
        { id: 'unknown_ai_confidence', name: 'AI Confidence -50%', description: 'AI ReportのConfidence表示が低下する（表示のみに影響）', type: 'aiConfidencePenalty', value: -0.50, target: 'unknown' }
      ]
    }
  ];

  const BY_ID = new Map(ALL.map(e => [e.id, e]));

  // Layer1〜25の固定対応表（maxLayerで区切る。Layer26以降はnullを返しManager側のランダム選出に委ねる）
  const FIXED_BOUNDARIES = [
    { maxLayer: 5, id: 'env_grid' },
    { maxLayer: 10, id: 'env_network' },
    { maxLayer: 15, id: 'env_forest' },
    { maxLayer: 20, id: 'env_ocean' },
    { maxLayer: 25, id: 'env_fractal' }
  ];

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  /** @param {number} layer @returns {string|null} 固定対応するEnvironment id。Layer26以降はnull */
  function getFixedIdForLayer(layer) {
    const hit = FIXED_BOUNDARIES.find(b => layer <= b.maxLayer);
    return hit ? hit.id : null;
  }

  G.WorldEnvironment = { ALL, DEFAULT_ID, RANDOM_START_LAYER, getById, getFixedIdForLayer };
})(typeof globalThis !== 'undefined' ? globalThis : this);
