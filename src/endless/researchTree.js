/**
 * researchTree.js
 * STEP28「Meta Progression / Permanent Research System」。NEURAL RESEARCH LAB
 * （RUNをまたいで恒久的に強化する画面、neuralLab.js）で購入するResearch Tree
 * アップグレードの定義データ。RUN限定のupgrades.js/rareUpgrades.jsとは完全に別の
 * プールで、効果はRUNをまたいで永続する（購入状況はendlessSave.jsへ保存）。
 *
 * データ形式: { id, name, category, description, baseCost, maxLevel, effect }
 *   - category: 'analysis' | 'protocol' | 'exploration' | 'survival'
 *   - effect: { type, perLevel } … 実際の適用はmetaProgression.js/endless.jsが行う
 *
 * コスト計算式（要求仕様に数値指定が無かったため設計）: 次のレベル購入コストは
 * `baseCost * (1 + currentLevel * 0.8)`（レベルが上がるほど徐々に高くなる）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const CATEGORIES = [
    { id: 'analysis', name: 'Analysis System', description: 'Puzzle解析強化' },
    { id: 'protocol', name: 'Protocol Development', description: 'Protocol強化' },
    { id: 'exploration', name: 'Exploration System', description: '探索能力' },
    { id: 'survival', name: 'Survival System', description: '継続能力' }
  ];

  const ALL = [
    {
      id: 'advanced_analysis',
      name: 'Advanced Analysis',
      category: 'analysis',
      description: 'Unknown Nodeの初期解析能力が上がる（未解析のままでもAIが正体を検知する確率が上昇する）',
      baseCost: 500,
      maxLevel: 3,
      effect: { type: 'unknownRevealChance', perLevel: 0.3 }
    },
    {
      id: 'protocol_synthesis',
      name: 'Protocol Synthesis',
      category: 'protocol',
      description: 'RUN中のProtocol Fragment獲得量が増加する',
      baseCost: 800,
      maxLevel: 3,
      effect: { type: 'fragmentGainMultiplier', perLevel: 0.15 }
    },
    {
      id: 'deep_scan',
      name: 'Deep Scan',
      category: 'exploration',
      description: 'Research Mapの分岐候補数が増える',
      baseCost: 1000,
      maxLevel: 5,
      effect: { type: 'extraMapChoices', perLevel: 1 }
    },
    {
      id: 'emergency_recovery',
      name: 'Emergency Recovery',
      category: 'survival',
      description: 'RUN中の初回ミス（タイムアップ）で失うライフが軽減される',
      baseCost: 1200,
      maxLevel: 3,
      effect: { type: 'firstMissLifeReduction', perLevel: 1 }
    }
  ];

  const BY_ID = new Map(ALL.map(u => [u.id, u]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  function getByCategory(categoryId) {
    return ALL.filter(u => u.category === categoryId);
  }

  /** @param {Object} def @param {number} currentLevel 現在のレベル(0=未購入) @returns {number} 次のレベルを買うのに必要なコスト */
  function getCostForNextLevel(def, currentLevel) {
    return Math.round(def.baseCost * (1 + currentLevel * 0.8));
  }

  G.ResearchTree = { CATEGORIES, ALL, getById, getByCategory, getCostForNextLevel };
})(typeof globalThis !== 'undefined' ? globalThis : this);
