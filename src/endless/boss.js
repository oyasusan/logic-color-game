/**
 * boss.js
 * ENDLESS RESEARCHのBoss Puzzle（Depth 10/25/50に出現する高難度パズル）の
 * 生成設定を管理する。純粋なデータ+参照ヘルパーのみで、実際の生成呼び出しは
 * endlessGame.jsが行う。
 *
 * 【疎密度をあえて通常進行より上げていない理由】 Boss用に通常より低い疎密度
 * （＝色が密で難しい）を8×8で試したところ、Node.js上の実測でsize8・
 * ratio0.78は5回リトライ込みで平均6.4秒・最大17.5秒かかることが判明し、
 * レア（1RUNに最大3回）とはいえプレイ中の待ち時間として許容できないと判断した。
 * そのため疎密度は通常のENDLESS生成と同じ「実用的に安全な」値（0.82、
 * 5回リトライ込みで実測平均321ms・最大1.1秒）に統一し、代わりに
 * 制限時間の倍率を段階的に厳しくする（＝相対的に難しくする）ことで
 * Boss間の難易度エスカレーションを表現している。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const BOSS_SIZE = 8;
  const BOSS_EMPTY_RATIO = 0.82;

  const BOSS_DEPTHS = {
    10: { timeLimitMultiplier: 2.0, scoreMultiplier: 3, name: 'BOSS: SYSTEM CORE' },
    25: { timeLimitMultiplier: 1.7, scoreMultiplier: 4, name: 'BOSS: DEEP ARCHIVE' },
    50: { timeLimitMultiplier: 1.4, scoreMultiplier: 5, name: 'BOSS: SINGULARITY' }
  };

  function isBossDepth(depth) {
    return Object.prototype.hasOwnProperty.call(BOSS_DEPTHS, depth);
  }

  /** @returns {{size:number, emptyRatio:number, timeLimitMultiplier:number, scoreMultiplier:number, name:string}|null} */
  function getBossConfig(depth) {
    const base = BOSS_DEPTHS[depth];
    if (!base) return null;
    return Object.assign({ size: BOSS_SIZE, emptyRatio: BOSS_EMPTY_RATIO }, base);
  }

  G.Boss = { isBossDepth, getBossConfig, BOSS_DEPTHS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
