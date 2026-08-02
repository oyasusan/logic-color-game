/**
 * difficulty.js
 * 生成された問題の難易度を客観的に判定する。
 * 「どれだけ情報（ヒント）が与えられているか」と「solverがどれだけ探索・
 * 仮置きを要したか」から easy / normal / hard / expert のいずれかを返す。
 * generator.js から呼ばれる想定で、DOMやLocalStorageのことは一切知らない。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const LEVELS = ['easy', 'normal', 'hard', 'expert'];

  // complexityスコアとレベルの境界値。
  // generator.js（掘り出し上限あり）で5×5盤面を各難易度20回ずつ生成し実測した
  // guessCount/steps/hintCountの平均を基に較正した値:
  //   easy   : guessCount平均  25 / steps平均  143 / hintCount平均  7 -> complexity ≈ 1.0
  //   normal : guessCount平均  53 / steps平均  191 / hintCount平均 12 -> complexity ≈ 2.1
  //   hard   : guessCount平均 255 / steps平均  765 / hintCount平均 16 -> complexity ≈ 11.1
  //   expert : guessCount平均 605 / steps平均 1686 / hintCount平均 19 -> complexity ≈ 26.8
  // guessCount（solverが複数候補から仮置きを迫られた回数）がこのゲームの
  // ヒント形式（行/列ごとの色別カウントのみで、並び順の手掛かりが無い）では
  // 難易度の支配的な指標になることが分かったため、複雑度スコアはguessCountを
  // 主軸に、steps/hintDensityを補助項として組み合わせている。
  // なお生成時は乱数の当たり外れで実際の複雑度に大きなばらつきが出るため、
  // 要求したdifficultyとここで計算される実測difficultyは一致しないことがある
  // （generator.jsのstats.requestedDifficultyで要求値を確認できる）。
  const THRESHOLDS = {
    normal: 1.5,
    hard: 6.5,
    expert: 19
  };

  /**
   * @param {Object} stats
   * @param {number} stats.size 盤面の一辺
   * @param {number} stats.hintCount 画面に表示される(0件を除いた)ヒントチップの総数
   * @param {number} stats.steps solverの探索ステップ数
   * @param {number} stats.guessCount solverが複数候補から仮置きを要した回数
   * @returns {'easy'|'normal'|'hard'|'expert'}
   */
  function classify(stats) {
    const size = stats.size || 1;
    const cellCount = size * size;

    const guessDensity = stats.guessCount / cellCount;
    const stepsDensity = stats.steps / cellCount;
    const hintDensity = stats.hintCount / cellCount;

    // ヒント密度が高いほど簡単（情報が多い）、guessCount/stepsが多いほど難しい
    const complexity = guessDensity + stepsDensity / 20 - hintDensity;

    if (complexity < THRESHOLDS.normal) return 'easy';
    if (complexity < THRESHOLDS.hard) return 'normal';
    if (complexity < THRESHOLDS.expert) return 'hard';
    return 'expert';
  }

  G.Difficulty = { classify, LEVELS, THRESHOLDS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
