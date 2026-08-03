/**
 * difficultyManager.js
 * 「Difficulty計算: Depth + Protocol + Environment + Node」を1箇所に集約する。
 * これまでendlessGame.js内に直接書かれていた
 * `protocolManager.getDifficultyTierOffset() + environmentManager.getDifficultyTierOffset()`
 * という合算処理を置き換え、そこに「Node」（Elite Nodeは目標Tierを+1する）の
 * 項を新たに加えた形の、状態を持たない純粋な計算モジュール
 * （mapGenerator.js/protocolFragment.jsと同じ「データ＋ヘルパー」構成）。
 *
 * 実際の盤面サイズ・疎密度の決定はpuzzleTier.jsに委譲し、このファイルは
 * 「最終的なtierOffsetがいくつになるか」の計算と、Puzzle Archive（履歴保存）用の
 * 記録エントリの組み立てだけを担当する。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { PuzzleTier } = G;

  const ELITE_TIER_BONUS = 1; // Elite Nodeは目標Tierを常に+1する（「Elite難易度上昇」の実現）

  /**
   * @param {Object} ctx
   * @param {Object} [ctx.protocolManager]
   * @param {Object} [ctx.environmentManager]
   * @param {Object} [ctx.node] 現在挑戦中のMap Node（endless.js/mapGenerator.js参照）
   * @returns {number} 最終的なtierOffset（Depth基準Tierへの加算量）
   */
  function computeTierOffset(ctx) {
    ctx = ctx || {};
    let offset = 0;
    if (ctx.protocolManager) offset += ctx.protocolManager.getDifficultyTierOffset();
    if (ctx.environmentManager) offset += ctx.environmentManager.getDifficultyTierOffset();
    if (ctx.node && ctx.node.type === 'elite') offset += ELITE_TIER_BONUS;
    return offset;
  }

  /**
   * @param {number} depth
   * @param {Object} [ctx] computeTierOffset()と同じ
   * @returns {{size:number, emptyRatio:number, label:string, tier:number}}
   */
  function getPuzzleConfig(depth, ctx) {
    return PuzzleTier.getConfigForDepth(depth, computeTierOffset(ctx));
  }

  /**
   * Puzzle Archive（履歴保存）用の1件分のレコードを組み立てる。
   * 実際の永続化はendlessSave.js（recordPuzzleHistory）の責務。
   * @param {{depth:number, size:number, tier:number, cleared:boolean, isBoss:boolean,
   *   isElite:boolean, modifierIds:string[]}} params
   */
  function buildHistoryEntry(params) {
    return {
      depth: params.depth,
      size: params.size,
      tier: params.tier,
      cleared: !!params.cleared,
      isBoss: !!params.isBoss,
      isElite: !!params.isElite,
      modifierIds: params.modifierIds || []
    };
  }

  G.DifficultyManager = { computeTierOffset, getPuzzleConfig, buildHistoryEntry, ELITE_TIER_BONUS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
