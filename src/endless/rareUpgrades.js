/**
 * rareUpgrades.js
 * ENDLESS RESEARCHのRare Upgrade（通常のUpgrade10種とは別に管理される、
 * より強力な特別アップグレード）の定義データ。
 *
 * upgrades.jsと同じ { id, name, category, description, effect } 形式に
 * `rare: true` を加えたもの。upgradeManager.jsは通常のUpgradeもRare Upgradeも
 * 同じ仕組み（所持数管理・getEffectTotal）で扱うため、idの重複さえ避ければ
 * 両者は統一的に扱える。ただしRare Upgradeは「進化(Evolution)」の対象外とし、
 * 1回のみ取得可能（researchLab.js側で既に所持している場合は候補から除外する）。
 *
 * 出現率設定: RESEARCH LABの候補3枠それぞれについて、この確率でRare Upgradeを
 * 通常のUpgradeの代わりに提示する（researchLab.jsの_pickChoicesが参照する）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const RARE_APPEARANCE_RATE = 0.15;

  const ALL = [
    {
      id: 'quantum_core',
      name: 'Quantum Core',
      category: 'score',
      description: '獲得スコアが+50%される',
      effect: { type: 'scoreMultiplier', value: 0.5 },
      rare: true
    },
    {
      id: 'time_dilation',
      name: 'Time Dilation',
      category: 'logic',
      description: '制限時間が+50%される',
      effect: { type: 'timeLimitMultiplierBonus', value: 0.5 },
      rare: true
    },
    {
      id: 'phoenix_protocol',
      name: 'Phoenix Protocol',
      category: 'survival',
      description: 'ライフが0になっても1度だけライフ1で復活する',
      effect: { type: 'revive', value: 1 },
      rare: true
    },
    {
      id: 'omniscience',
      name: 'Omniscience',
      category: 'logic',
      description: 'HINT使用時、常に3マス同時に開示する',
      effect: { type: 'hintRevealBonus', value: 2 },
      rare: true
    }
  ];

  const BY_ID = new Map(ALL.map(u => [u.id, u]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  G.RareUpgrades = { ALL, getById, RARE_APPEARANCE_RATE };
})(typeof globalThis !== 'undefined' ? globalThis : this);
