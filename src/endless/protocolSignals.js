/**
 * protocolSignals.js
 * Protocol Signal（Depth5ごとに出現、詳細はprotocolSignal.js参照）でのみ提示される
 * 追加Protocol 5種の定義データ。protocols.js（RUN開始時のProtocol Selectで提示される
 * 基本3種）とは別ファイル・別プールとして扱う（upgrades.js/rareUpgrades.jsの関係と
 * 同じ設計）。RUN開始時点では選べず、Signal経由でのみ組み込める。
 *
 * データ形式はprotocols.jsと同じ { id, name, description, effects, rarity, unlock }。
 * effectsの各キーの合算ルールはprotocolManager.jsを参照:
 *   - lifeBonus / difficultyTierOffset: 所持中Protocol+発動中Synergy全体の合計（加算）
 *   - scoreMultiplier / perfectBonusMultiplier / comboBonusMultiplier: 全体の積（乗算）
 *   - perfectImmuneToHint: 1つでも所持していれば有効（真偽値のOR）
 *
 * Phase C: oracle/precision/chaos/minimalの4種とquantum（新規）に`unlock`条件を
 * 追加した。未解放（protocolUnlock.js参照）の間はSignalの候補にも出現しない
 * （protocolSignal.js側でActive判定と合わせてフィルタする）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    {
      id: 'oracle',
      name: 'Oracle',
      description: 'HINTを使用してもPERFECT扱いのままになる。その代わり獲得スコアが×0.95になる',
      effects: { perfectImmuneToHint: true, scoreMultiplier: 0.95 },
      rarity: 'rare',
      unlock: { type: 'bossClearTotal', value: 5 }
    },
    {
      id: 'precision',
      name: 'Precision',
      description: 'PERFECTボーナスが+30%になる。その代わり獲得スコアが×0.95になる',
      effects: { perfectBonusMultiplier: 1.3, scoreMultiplier: 0.95 },
      rarity: 'rare',
      unlock: { type: 'perfectTotal', value: 100 }
    },
    {
      id: 'chaos',
      name: 'Chaos',
      description: '獲得スコアが×1.3になる。その代わりライフ上限が-1される（ハイリスク・ハイリターン）',
      effects: { scoreMultiplier: 1.3, lifeBonus: -1 },
      rarity: 'rare',
      unlock: { type: 'eventTotal', value: 10 }
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: '目標Difficulty Tierが-1段階される（安定運用向け）。その代わりコンボボーナスが+10%になる',
      effects: { difficultyTierOffset: -1, comboBonusMultiplier: 1.1 },
      rarity: 'rare',
      unlock: { type: 'life1AtDepth20', value: 1 }
    },
    {
      id: 'quantum',
      name: 'Quantum',
      description: '獲得スコアが×1.2、PERFECTボーナスが+20%になる（デメリット無し）',
      effects: { scoreMultiplier: 1.2, perfectBonusMultiplier: 1.2 },
      rarity: 'legendary',
      unlock: { type: 'bestDepthEver', value: 30 }
    },
    {
      id: 'neural_link',
      name: 'Neural Link',
      description: 'コンボボーナスが+20%になる。その代わりライフ上限が-1される（STEP28: Meta ProgressionのResearch Rank2到達で解放）',
      effects: { comboBonusMultiplier: 1.2, lifeBonus: -1 },
      rarity: 'rare',
      unlock: { type: 'metaRank', value: 2 }
    }
  ];

  const BY_ID = new Map(ALL.map(p => [p.id, p]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  G.ProtocolSignals = { ALL, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
