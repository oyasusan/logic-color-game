/**
 * protocolFragment.js
 * 「Protocol Fragment」（Protocol解放とは別の、収集要素としての生涯累計リソース）の
 * 獲得量を定義する。boss.js/events.js等と同じ「設定データ＋小さい計算ヘルパーのみ」の
 * モジュールで、実際にRUN中の累計を数える／永続化するのはendless.js/endlessSave.js側の
 * 責務。Phase C時点ではFragmentの消費先（交換・強化等）は未実装で、収集して
 * 生涯累計を伸ばすことだけが目的（README「今後の拡張余地」参照）。
 *
 * 獲得元は3種類（要求仕様の「Boss / Rare Event / High Depth」に対応）:
 *   - forBossClear()      Boss Puzzle撃破時
 *   - forEvent()           Event Node発生時（5種いずれでも、発生した時点で獲得）
 *   - forDepthMilestone()  DEPTH_MILESTONE_INTERVALごとのDepth到達時
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const FRAGMENT_FOR_BOSS_CLEAR = 3;
  const FRAGMENT_FOR_EVENT = 1;
  const FRAGMENT_FOR_DEPTH_MILESTONE = 1;
  const DEPTH_MILESTONE_INTERVAL = 10; // Depth10, 20, 30... ごとに達成扱い

  function forBossClear() {
    return FRAGMENT_FOR_BOSS_CLEAR;
  }

  function forEvent() {
    return FRAGMENT_FOR_EVENT;
  }

  function isDepthMilestone(depth) {
    return depth > 0 && depth % DEPTH_MILESTONE_INTERVAL === 0;
  }

  /** @param {number} depth 到達したDepth @returns {number} マイルストーンでなければ0 */
  function forDepthMilestone(depth) {
    return isDepthMilestone(depth) ? FRAGMENT_FOR_DEPTH_MILESTONE : 0;
  }

  G.ProtocolFragment = {
    forBossClear, forEvent, isDepthMilestone, forDepthMilestone, DEPTH_MILESTONE_INTERVAL
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
