/**
 * playerProfile.js
 * STEP31「AI Director System」セクション2: PlayerProfile。プレイヤーの行動傾向を
 * 表す生涯データの初期値・更新計算のみを持つ、状態を持たない純粋なヘルパー
 * （researchIdentity.js/mutationData.jsと同じ「データ＋ヘルパー」構成）。
 * 実際の保存・読み出しはendlessSave.js、呼び出しはaiDirector.jsの責務。
 *
 * 保存項目（要求仕様どおり）: averageSolveTime/solveAccuracy/mistakeRate/
 * riskPreference/extractRate/favoriteEnvironment/favoriteProtocol/retryCount。
 * "runs"は既存の`save.getTotalRuns()`と完全に同じ概念のため、重複データを
 * 持たず永続化しない（既存の"highestDepth"=endlessBestDepth重複回避と同じ設計判断）。
 * favoriteEnvironment/favoriteProtocolは、生涯の訪問/所持回数タリー
 * （environmentTally/protocolTally、profile内部に保持）から都度argmaxで
 * 導出する値をRUN終了時に確定させる設計にした。
 *
 * 数値の更新は全てEMA（指数移動平均）で行う。`EMA_ALPHA`は要求仕様に数値指定が
 * 無かったため0.25（直近の傾向をある程度重視しつつ、単発の外れ値には過敏に
 * 反応しない程度の値）を採用した。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const EMA_ALPHA = 0.25;
  // Adaptive Difficulty（aiDirector.js）が参照する、averageSolveTimeの大まかな目安値（秒）。
  // Puzzleサイズ/Tierによって適正解答時間は変動するため厳密な基準にはならないが、
  // 要求仕様に具体的な基準値の指定が無かったため、この game の典型的なparSeconds帯
  // （5×5〜7×7で概ね20〜90秒、README参照）から中央付近の値を採用した
  const BASELINE_SOLVE_TIME = 30;

  function ema(previous, sample) {
    return previous + (sample - previous) * EMA_ALPHA;
  }

  function defaultProfile() {
    return {
      averageSolveTime: 0,   // 秒。まだクリア記録が無ければ0
      solveAccuracy: 1,      // 0〜1。ノーヒントクリア率のEMA（データ無しは楽観的に1初期化）
      mistakeRate: 0,        // 0〜1。タイムアップ率のEMA
      riskPreference: 0.5,   // 0〜1。選択したNodeのthreatLevel(0〜5)/5のEMA（データ無しは中立0.5）
      extractRate: 0,        // 0〜1。Extract選択率のEMA
      favoriteEnvironment: null, // WorldEnvironment id。生涯タリーのargmax
      favoriteProtocol: null,    // Protocol id。生涯タリーのargmax
      retryCount: 0,          // RESULT画面「RETRY」クリックの生涯累計
      environmentTally: {},   // { [envId]: 生涯訪問Layer数 }（favoriteEnvironment算出用の内部データ）
      protocolTally: {}       // { [protocolId]: 生涯Active Layer数 }（favoriteProtocol算出用の内部データ）
    };
  }

  /**
   * 1問のクリア/タイムアップ結果をプロフィールへ反映する。
   * @param {Object} profile
   * @param {{cleared:boolean, elapsedSeconds?:number, hintUsed?:boolean}} result
   * @returns {Object} 更新後のprofile（新しいオブジェクト、イミュータブル）
   */
  function applyPuzzleResult(profile, result) {
    const next = Object.assign({}, profile);
    if (result.cleared) {
      next.averageSolveTime = profile.averageSolveTime > 0
        ? ema(profile.averageSolveTime, result.elapsedSeconds || 0)
        : (result.elapsedSeconds || 0);
      next.solveAccuracy = ema(profile.solveAccuracy, result.hintUsed ? 0 : 1);
    }
    next.mistakeRate = ema(profile.mistakeRate, result.cleared ? 0 : 1);
    return next;
  }

  /**
   * 選択したNodeの脅威度(threatLevel 0〜5)をriskPreferenceへ反映する。
   * @param {Object} profile @param {number} threatLevel
   */
  function applyRiskSample(profile, threatLevel) {
    if (typeof threatLevel !== 'number') return profile;
    const next = Object.assign({}, profile);
    next.riskPreference = ema(profile.riskPreference, Math.max(0, Math.min(1, threatLevel / 5)));
    return next;
  }

  /**
   * RUN終了時、このRUNのExtract有無・訪問Environment/所持Protocolのタリーを反映し、
   * favoriteEnvironment/favoriteProtocolを再計算する。
   * @param {Object} profile
   * @param {{extracted:boolean, environmentCounts:Object, protocolCounts:Object}} runSummary
   */
  function applyRunEnd(profile, runSummary) {
    const next = Object.assign({}, profile, {
      environmentTally: Object.assign({}, profile.environmentTally),
      protocolTally: Object.assign({}, profile.protocolTally)
    });
    next.extractRate = ema(profile.extractRate, runSummary.extracted ? 1 : 0);

    Object.keys(runSummary.environmentCounts || {}).forEach(id => {
      next.environmentTally[id] = (next.environmentTally[id] || 0) + runSummary.environmentCounts[id];
    });
    Object.keys(runSummary.protocolCounts || {}).forEach(id => {
      next.protocolTally[id] = (next.protocolTally[id] || 0) + runSummary.protocolCounts[id];
    });

    next.favoriteEnvironment = argMax(next.environmentTally) || next.favoriteEnvironment;
    next.favoriteProtocol = argMax(next.protocolTally) || next.favoriteProtocol;
    return next;
  }

  function applyRetry(profile) {
    return Object.assign({}, profile, { retryCount: (profile.retryCount || 0) + 1 });
  }

  /** @param {Object} tally { [key]: count } @returns {string|null} 最大countのkey（空ならnull） */
  function argMax(tally) {
    let bestKey = null;
    let bestValue = -Infinity;
    Object.keys(tally || {}).forEach(key => {
      if (tally[key] > bestValue) { bestValue = tally[key]; bestKey = key; }
    });
    return bestKey;
  }

  G.PlayerProfile = { defaultProfile, applyPuzzleResult, applyRiskSample, applyRunEnd, applyRetry, argMax, EMA_ALPHA, BASELINE_SOLVE_TIME };
})(typeof globalThis !== 'undefined' ? globalThis : this);
