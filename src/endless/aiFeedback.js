/**
 * aiFeedback.js
 * STEP29「Research Identity System」セクション9。RUN終了時、AIがプレイヤーの
 * 今RUNの行動パターンを分析し、観測コメント(observation)と推奨行動
 * (recommendation)を1組返す、状態を持たない純粋な判定モジュール
 * （eventManager.js/aiAnalysis.jsと同じ「データ＋ヘルパー」構成）。
 *
 * ルールは上から順に評価し、最初に条件を満たしたものを採用する（優先順位付き
 * ルールテーブル。unknownEvents.js等の確率抽選とは異なり、同じ入力なら常に
 * 同じ結果になる決定的な判定にしている）。閾値は要求仕様に数値指定が無かった
 * ため設計した。
 *
 * @typedef {Object} RunSummary
 * @property {number} riskChainMax このRUNで到達した最大Risk Chain倍率
 * @property {boolean} extracted Extract Systemで自主的にRUNを終えたか
 * @property {Object} nodeTypeCounts { [nodeType]: 選択回数 }（visitedNodes集計）
 * @property {number} perfectRatio クリアしたPuzzleのうちPERFECTだった割合(0〜1)
 * @property {string[]} activeProtocolIds RUN終了時点でActiveだったProtocol id
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const RULES = [
    {
      match: s => s.riskChainMax >= 2.0,
      observation: 'あなたの研究傾向は高いリスク許容度を示している。',
      recommendation: 'Unknown解析を継続する'
    },
    {
      match: s => (s.nodeTypeCounts.recovery || 0) > (s.nodeTypeCounts.elite || 0) && s.extracted,
      observation: 'あなたの研究傾向は慎重かつ堅実な進行を好む。',
      recommendation: 'Elite Signalへより積極的に挑むと成長が早まる'
    },
    {
      match: s => s.perfectRatio >= 0.7,
      observation: 'あなたのPuzzle解答精度は極めて高い。',
      recommendation: 'より高い報酬を狙うならOverclock Protocolを検討'
    },
    {
      match: s => (s.nodeTypeCounts.unknown || 0) >= 3,
      observation: '未確認信号への強い探究心が見られる。',
      recommendation: 'Explorer Identityがあなたの研究スタイルに合うかもしれない'
    }
  ];

  const DEFAULT_RESULT = {
    observation: 'あなたの研究アプローチは全システムにわたってバランスが取れている。',
    recommendation: '異なるProtocolの組み合わせを試してみる'
  };

  /** @param {RunSummary} summary @returns {{observation:string, recommendation:string}} */
  function analyze(summary) {
    const s = Object.assign({ riskChainMax: 1, extracted: false, nodeTypeCounts: {}, perfectRatio: 0, activeProtocolIds: [] }, summary);
    const rule = RULES.find(r => r.match(s));
    return rule ? { observation: rule.observation, recommendation: rule.recommendation } : Object.assign({}, DEFAULT_RESULT);
  }

  G.AIFeedback = { analyze };
})(typeof globalThis !== 'undefined' ? globalThis : this);
