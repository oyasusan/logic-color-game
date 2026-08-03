/**
 * eventManager.js
 * Event Nodeの出現判定とランダム選択のみを担当する。実際の効果適用
 * （ライフ回復・コンボリセット・Memory Fragment付与・アップグレード付与等）は
 * endless.js側が行う（EventManagerはendless.jsの内部状態を持たないため）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { Events } = G;

  // Lab対象(Depth3ごと)でもBoss対象(Depth10/25/50)でもないDepthのうち、
  // これだけの確率でEvent Nodeが発生する
  const EVENT_TRIGGER_RATE = 0.25;

  // Memory Fragment獲得イベントで実際に付与する量の範囲
  const MEMORY_FRAGMENT_MIN = 1;
  const MEMORY_FRAGMENT_MAX = 3;

  class EventManager {
    /** @param {number} [rateMultiplier=1] Signal Noise Environment等で発生率を補正する倍率 */
    shouldTrigger(rateMultiplier) {
      return Math.random() < EVENT_TRIGGER_RATE * (rateMultiplier || 1);
    }

    pickEvent() {
      const index = Math.floor(Math.random() * Events.ALL.length);
      return Events.ALL[index];
    }

    /** Memory Fragmentイベント用の実際の付与量（1〜3）をここで決定する */
    rollMemoryFragmentAmount() {
      return MEMORY_FRAGMENT_MIN + Math.floor(Math.random() * (MEMORY_FRAGMENT_MAX - MEMORY_FRAGMENT_MIN + 1));
    }
  }

  G.EventManager = EventManager;
  G.EVENT_TRIGGER_RATE = EVENT_TRIGGER_RATE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
