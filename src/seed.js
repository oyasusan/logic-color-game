/**
 * seed.js
 * 同じseedを渡せば常に同じ乱数列を返す、決定的な擬似乱数機能を提供する。
 * generator.js の問題生成や、Daily Puzzle（日付をseedにする）で使用する。
 * ゲームのルールやDOMのことは一切知らない、純粋なユーティリティ。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  /** 文字列/数値どちらのseedも32bit符号なし整数へ正規化する（FNV-1a風ハッシュ） */
  function hashToUint32(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value >>> 0;
    }
    const str = String(value);
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /** mulberry32: シンプルながら周期・分布ともに実用十分な32bit擬似乱数生成器 */
  function mulberry32(seed32) {
    let a = seed32 >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * @param {number|string} seedValue 省略時はMath.random()由来の非決定的な値を渡すこと
   * @returns {function(): number} 呼び出すたびに [0, 1) の乱数を返す関数
   */
  function createRng(seedValue) {
    const seed32 = hashToUint32(seedValue);
    return mulberry32(seed32);
  }

  /** 配列をFisher-Yatesで破壊的にシャッフルする（rngは createRng() の戻り値を渡す） */
  function shuffle(array, rng) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  /** "YYYY-MM-DD" 形式の日付文字列を返す（Daily Puzzleのseedに使う） */
  function dateSeed(date) {
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  G.Seed = { createRng, hashToUint32, shuffle, dateSeed };
})(typeof globalThis !== 'undefined' ? globalThis : this);
