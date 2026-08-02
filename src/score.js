/**
 * score.js
 * クリア実績の評価（星計算）と時間表示のフォーマットを担当する。
 * LocalStorageや画面のことは一切知らない、純粋な計算ロジックのみ。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // ★3判定時、Undoは何回まで許容するか
  const STAR3_MAX_UNDO = 3;

  /**
   * 星評価を計算する。
   *
   * ルール:
   *   ★1: Hintを1回でも使ってクリアした場合
   *   ★3: Hint未使用 かつ 規定時間(parSeconds)以内 かつ Undoが規定回数以下
   *   ★2: 上記どちらにも該当しない通常クリア
   *
   * @param {Object} stats
   * @param {number} stats.seconds クリアまでの経過秒数
   * @param {number} stats.parSeconds ステージごとの規定時間（秒）
   * @param {number} stats.hintCount Hint使用回数
   * @param {number} stats.undoCount Undo使用回数
   * @returns {1|2|3}
   */
  function calcStars(stats) {
    const { seconds, parSeconds, hintCount, undoCount } = stats;

    if (hintCount > 0) return 1;
    if (typeof parSeconds === 'number' && seconds <= parSeconds && undoCount <= STAR3_MAX_UNDO) {
      return 3;
    }
    return 2;
  }

  /** 星の数(1-3)を "★★★☆☆" のような表示文字列に変換する */
  function starsToText(stars, max) {
    const total = max || 3;
    const filled = '★'.repeat(Math.max(0, Math.min(stars, total)));
    const empty = '☆'.repeat(Math.max(0, total - stars));
    return filled + empty;
  }

  /** 秒数を "01:20" 形式に整形する */
  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }

  G.Score = { calcStars, starsToText, formatTime, STAR3_MAX_UNDO };
})(typeof globalThis !== 'undefined' ? globalThis : this);
