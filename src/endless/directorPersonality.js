/**
 * directorPersonality.js
 * STEP31「AI Director System」セクション4: Personality。AI Directorの人格を
 * 純粋なデータとして定義する（要求仕様どおり「personalityはData化する」）。
 * 状態を持たない静的データ＋ヘルパーのみ（researchIdentity.js等と同じ設計）。
 *
 * 初期人格はANALYSTのみ（要求仕様どおり「将来追加可能」と明記されているため、
 * 今回のSTEPでは他4種のUI選択導線は実装せず、`directorPersonalityId`は常に
 * 'analyst'固定で保存される。ただしデータ・Dialogue・効果チューニングは
 * 5種全てを今回から用意し、将来のPersonality選択機能追加時にそのまま使える
 * ようにしてある）。
 *
 * tuning: 各Personalityが各種Recommendation APIの介入度合いをどれだけ強めるか
 * 弱めるかの倍率。要求仕様に数値指定が無かったため、Personalityの性格描写
 * （ANALYST=標準/MENTOR=穏やか/CHAOS=過激/OBSERVER=不介入/RESEARCHER=データ重視）
 * に沿ってこちらで設計した。
 *   - difficultyAggressiveness: Adaptive Difficultyのスコア計算に掛ける倍率
 *   - mutationBias: Mutation Trigger Biasの強さ
 *   - eventBias: Event Trigger Rate Bonusの強さ
 *   - rewardBias: Reward/Research Data Recommendationの強さ
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const DEFAULT_ID = 'analyst';

  const ALL = [
    {
      id: 'analyst',
      name: 'ANALYST',
      description: '効率と精度を重視し、データに基づき淡々と分析する。',
      tuning: { difficultyAggressiveness: 1.0, mutationBias: 1.0, eventBias: 1.0, rewardBias: 1.0 }
    },
    {
      id: 'mentor',
      name: 'MENTOR',
      description: 'プレイヤーの成長を優先し、苦戦時は穏やかに支援する。',
      tuning: { difficultyAggressiveness: 0.6, mutationBias: 0.7, eventBias: 0.8, rewardBias: 1.4 }
    },
    {
      id: 'chaos',
      name: 'CHAOS',
      description: '予測不能な変化を好み、Mutation/Eventを積極的に誘発する。',
      tuning: { difficultyAggressiveness: 1.3, mutationBias: 1.6, eventBias: 1.5, rewardBias: 0.8 }
    },
    {
      id: 'observer',
      name: 'OBSERVER',
      description: '介入を最小限に留め、静かに記録するだけの存在。',
      tuning: { difficultyAggressiveness: 0.2, mutationBias: 0.2, eventBias: 0.2, rewardBias: 0.5 }
    },
    {
      id: 'researcher',
      name: 'RESEARCHER',
      description: 'Research Dataの蓄積を最優先する研究至上主義。',
      tuning: { difficultyAggressiveness: 0.8, mutationBias: 0.9, eventBias: 1.0, rewardBias: 1.2 }
    }
  ];

  const BY_ID = new Map(ALL.map(p => [p.id, p]));

  function getById(id) {
    return BY_ID.get(id) || BY_ID.get(DEFAULT_ID);
  }

  G.DirectorPersonality = { ALL, DEFAULT_ID, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
