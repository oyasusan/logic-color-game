/**
 * protocolSynergy.js
 * 2つの特定Protocolが同時にActive（protocolManager.activeProtocols内に両方存在）な時にだけ
 * 追加で発動するSynergyボーナスの定義データ。Protocol Slotは最大2個のため、同時に
 * 発動しうるSynergyは常に0個か1個のいずれか（3つ以上のProtocolを同時所持できない
 * ため、異なる2組のペアが同時に揃うことは無い）。
 *
 * データ形式: { id, name, protocolIds:[idA,idB], description, effects }
 *   - protocolIds: 発動に必要な2つのProtocol id（順不同判定）
 *   - effects: protocols.js/protocolSignals.jsと同じ形式。所持Protocol自体の効果に
 *     「追加で」上乗せされる（protocolManager.jsの効果集計に、Active中のProtocol群と
 *     同列でまとめて合算される）
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    {
      id: 'navigator',
      name: 'Navigator',
      protocolIds: ['explorer', 'oracle'],
      description: 'Explorer × Oracle: ライフ+1、獲得スコア×1.1が追加される',
      effects: { lifeBonus: 1, scoreMultiplier: 1.1 }
    },
    {
      id: 'perfect_engine',
      name: 'Perfect Engine',
      protocolIds: ['analyst', 'precision'],
      description: 'Analyst × Precision: PERFECTボーナスがさらに×1.2される',
      effects: { perfectBonusMultiplier: 1.2 }
    },
    {
      id: 'critical_system',
      name: 'Critical System',
      protocolIds: ['overclock', 'chaos'],
      description: 'Overclock × Chaos: 獲得スコアがさらに×1.2、目標Difficulty Tierがさらに+1される',
      effects: { scoreMultiplier: 1.2, difficultyTierOffset: 1 }
    },
    {
      id: 'mad_scientist',
      name: 'Mad Scientist',
      protocolIds: ['minimal', 'chaos'],
      description: 'Minimal × Chaos: コンボボーナスがさらに×1.3される',
      effects: { comboBonusMultiplier: 1.3 }
    }
  ];

  /** @param {string[]} activeIds 現在Active中のProtocol id一覧（0〜2個）
   *  @returns {Array} 条件を満たしている（=両方のprotocolIdsがactiveIdsに含まれる）Synergy定義の一覧 */
  function findActive(activeIds) {
    const idSet = new Set(activeIds);
    return ALL.filter(def => def.protocolIds.every(id => idSet.has(id)));
  }

  G.ProtocolSynergy = { ALL, findActive };
})(typeof globalThis !== 'undefined' ? globalThis : this);
