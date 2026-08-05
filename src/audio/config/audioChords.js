/**
 * audioChords.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。コード進行のデータ定義。
 * 各コードはスケール度数(degree、audioScales.jsのgetFrequency()へそのまま渡せるインデックス)
 * の配列として表現し、実際の周波数計算はaudioScales.js側に委ねる（音階を変えてもコード
 * 定義自体は変更不要にするため）。`bars`はそのコードを何小節キープするか。
 *
 * Unknownのみ固定データを持たず、`generateUnknownProgression(rng, scaleId)`でRUNごとの
 * Music Seedから半ランダムに生成する（同じSeedなら毎回同じ進行になる決定的な生成）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const PROGRESSIONS = {
    // Basic Research Lab: 静かな研究初期、2コードのみをゆったり往復する
    research: [
      { degrees: [0, 2, 4], bars: 4 },
      { degrees: [4, 6, 1], bars: 4 }
    ],
    // Neural Network: やや複雑な4コード進行（i-iv-v-i）
    neural: [
      { degrees: [0, 2, 4], bars: 2 },
      { degrees: [3, 5, 0], bars: 2 },
      { degrees: [4, 6, 1], bars: 2 },
      { degrees: [0, 2, 4], bars: 2 }
    ],
    // Memory Distortion: Phrygianの半音関係を使い、短い小節で不安定に切り替える
    distortion: [
      { degrees: [0, 1, 3], bars: 1 },
      { degrees: [3, 4, 6], bars: 1 },
      { degrees: [0, 1, 3], bars: 2 }
    ],
    // Genesis Core: Lydianの明るさを活かした荘厳な4コード進行
    genesis: [
      { degrees: [0, 2, 4], bars: 4 },
      { degrees: [5, 0, 2], bars: 2 },
      { degrees: [3, 5, 0], bars: 2 },
      { degrees: [4, 6, 1], bars: 4 }
    ]
  };

  /**
   * Unknown Layer専用。Music Seedから決定的に生成する半ランダムコード進行
   * （要求仕様「Unknownのみ Seed値から半ランダム生成」）。
   * @param {function(): number} rng Seed.createRng()の戻り値
   * @param {number} [chordCount=4]
   * @returns {Array<{degrees:number[], bars:number}>}
   */
  function generateUnknownProgression(rng, chordCount) {
    const count = chordCount || 4;
    const progression = [];
    for (let i = 0; i < count; i++) {
      const root = Math.floor(rng() * 5); // Minor Pentatonicは5音のため0〜4
      // 完全な無作為だと調性感が崩れすぎるため、root/root+2/root+4付近の度数で
      // 「半ランダム」（Pentatonic内での揺らぎ）に留める
      const degrees = [root, (root + 2) % 5, (root + 4) % 5];
      const bars = 1 + Math.floor(rng() * 3); // 1〜3小節
      progression.push({ degrees, bars });
    }
    return progression;
  }

  G.AudioChords = { PROGRESSIONS, generateUnknownProgression };
})(typeof globalThis !== 'undefined' ? globalThis : this);
