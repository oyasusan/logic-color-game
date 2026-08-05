/**
 * audioPatterns.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。Arpeggio/Pulseレイヤーが
 * 使う「次に鳴らす音」の決定ロジックをデータ化したもの。各パターンは
 * `(chordDegrees, stepIndex, rng) => {index:number, octave:number} | null`という
 * 同一シグネチャの純粋関数で、null=休符を意味する。chordDegreesは現在のコード
 * （audioChords.jsの1コード分、degrees配列）。
 *
 * 将来パターンを追加する場合はPATTERNSへ1エントリ追加するだけでよい
 * （AdaptiveMusicEngine.js側の呼び出し方は変更不要）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const PATTERNS = {
    ascending: (chordDegrees, stepIndex) => {
      const i = stepIndex % chordDegrees.length;
      const octave = Math.floor(stepIndex / chordDegrees.length) % 2;
      return { index: i, octave };
    },
    descending: (chordDegrees, stepIndex) => {
      const len = chordDegrees.length;
      const i = len - 1 - (stepIndex % len);
      const octave = Math.floor(stepIndex / len) % 2;
      return { index: i, octave };
    },
    // ルート音を軸に時々コードトーンを挟む、駆動感のあるパターン
    pulse: (chordDegrees, stepIndex) => {
      const cycle = stepIndex % 4;
      if (cycle === 2 && chordDegrees.length > 1) return { index: 1, octave: 0 };
      return { index: 0, octave: 0 };
    },
    random: (chordDegrees, stepIndex, rng) => {
      if (rng() < 0.15) return null; // 時々休符を挟み機械的にならないようにする
      const i = Math.floor(rng() * chordDegrees.length);
      const octave = rng() < 0.2 ? 1 : 0;
      return { index: i, octave };
    },
    // 疎な・最小限のパターン。4stepに1回だけ鳴らす
    minimal: (chordDegrees, stepIndex) => {
      if (stepIndex % 4 !== 0) return null;
      return { index: 0, octave: 0 };
    },
    // ゆったり・広い音域の環境的なパターン。2stepに1回、稀に1オクターブ上へ
    ambient: (chordDegrees, stepIndex, rng) => {
      if (stepIndex % 2 !== 0) return null;
      const i = stepIndex % chordDegrees.length;
      const octave = rng() < 0.3 ? 1 : 0;
      return { index: i, octave };
    }
  };

  /**
   * @param {string} patternId @param {number[]} chordDegrees @param {number} stepIndex
   * @param {function(): number} rng
   * @returns {{index:number, octave:number}|null}
   */
  function resolveStep(patternId, chordDegrees, stepIndex, rng) {
    const fn = PATTERNS[patternId] || PATTERNS.ascending;
    return fn(chordDegrees, stepIndex, rng || Math.random);
  }

  G.AudioPatterns = { PATTERNS, resolveStep };
})(typeof globalThis !== 'undefined' ? globalThis : this);
