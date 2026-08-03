/**
 * aiAnalysis.js
 * STEP27「AI Analysis Risk / Reward System」。Research MapのNode選択画面で、
 * 単純なrisk/reward表示の代わりに「AI研究施設が未知の論理領域を解析した」体で
 * 脅威度(threatLevel)・報酬期待値(rewardPrediction)・解析信頼度(confidenceLevel)・
 * 推奨コメント(recommendation)を提示するための、状態を持たない計算のみのモジュール
 * （mapGenerator.js/boss.jsと同じ「データ＋ヘルパー」構成）。
 *
 * 数値は完全なランダムではなく、Node種類ごとの基準値にModifier補正・
 * node.idから決定的に導く小さな変動幅を足したもの。同じnode.idであれば
 * 常に同じ結果になり、再描画のたびに数値がちらつくことを防ぐ。
 *
 * threatLevel（0〜5、Unknownはnull=???）:
 *   0=安全 / 1=低危険 / 2=通常 / 3=高危険 / 4=Elite / 5=Extreme
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const BASE_THREAT = {
    recovery: 0, research_lab: 1, protocol_signal: 1,
    puzzle: 2, event: 2, elite: 4, boss: 5, unknown: null
  };
  const BASE_REWARD = {
    recovery: 20, research_lab: 70, protocol_signal: 60,
    puzzle: 60, event: 50, elite: 85, boss: 95, unknown: null
  };
  const BASE_CONFIDENCE = {
    recovery: 'HIGH', research_lab: 'MEDIUM', protocol_signal: 'MEDIUM',
    puzzle: 'HIGH', event: 'MEDIUM', elite: 'HIGH', boss: 'HIGH', unknown: 'LOW'
  };

  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function starsText(level) {
    if (level === null || level === undefined) return '???';
    if (G.Score && typeof G.Score.starsToText === 'function') return G.Score.starsToText(level, 5);
    return '★'.repeat(level) + '☆'.repeat(Math.max(0, 5 - level));
  }

  function recommendationFor(threatLevel, rewardPrediction) {
    if (threatLevel === null) return 'Analysis Required';
    if (threatLevel >= 4 && rewardPrediction >= 80) return 'Advanced Protocol Recommended';
    if (threatLevel >= 3) return 'Proceed With Caution';
    if (threatLevel <= 1) return 'Safe To Proceed';
    return 'Standard Protocol Sufficient';
  }

  /**
   * @param {{type:string, id?:string, modifiers?:Array}} node
   * @returns {{threatLevel:(number|null), rewardPrediction:(number|null),
   *   confidenceLevel:string, threatStars:string, recommendation:string}}
   */
  function analyze(node) {
    const type = node.type;
    if (type === 'unknown') {
      return { threatLevel: null, rewardPrediction: null, confidenceLevel: 'LOW', threatStars: '???', recommendation: 'Analysis Required' };
    }

    const hash = hashString(node.id || type);
    const modifierCount = (node.modifiers && node.modifiers.length) || 0;

    let threatLevel = (BASE_THREAT[type] !== undefined ? BASE_THREAT[type] : 2) + (modifierCount > 0 ? 1 : 0);
    threatLevel = Math.max(0, Math.min(5, threatLevel));

    let rewardPrediction = (BASE_REWARD[type] !== undefined ? BASE_REWARD[type] : 50) + modifierCount * 5 + ((hash % 11) - 5);
    rewardPrediction = Math.max(0, Math.min(100, Math.round(rewardPrediction)));

    const confidenceLevel = BASE_CONFIDENCE[type] || 'MEDIUM';

    return {
      threatLevel,
      rewardPrediction,
      confidenceLevel,
      threatStars: starsText(threatLevel),
      recommendation: recommendationFor(threatLevel, rewardPrediction)
    };
  }

  G.AIAnalysis = { analyze, starsText, recommendationFor };
})(typeof globalThis !== 'undefined' ? globalThis : this);
