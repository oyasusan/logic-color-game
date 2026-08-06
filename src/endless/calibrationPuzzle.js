/**
 * calibrationPuzzle.js
 * 「Cognitive Re-Synchronization System」セクション: Mini Puzzle。
 * 通常LayerのPuzzle生成（puzzleManager.js/generator.js）には一切手を加えず、
 * 既存の`puzzleManager.getGeneratedPuzzle(size, difficulty, seed)`をそのまま
 * 呼び出す薄いラッパー。操作確認・論理確認だけが目的のため、常にdifficulty='easy'。
 * 難易度（盤面サイズ）だけをCognitive Driftの重さに応じて変える。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const CalibrationPuzzle = {
    /**
     * @param {Object} deps
     * @param {Object} deps.puzzleManager 既存PuzzleManagerインスタンス
     * @param {string} driftLevel signalIntegrity.jsのTier.driftLevel（'ADVANCED'|'SEVERE'等）
     * @returns {Object} puzzleManager形式のランタイムパズル（size/rowHints/columnHints/answer/...）
     */
    generate({ puzzleManager, driftLevel }) {
      // SEVERE（1Layer分の同期崩壊が疑われる状態）のみ一回り大きい4x4、
      // それ以外（Mini Puzzleが呼ばれるのは主にADVANCED以上を想定）は3x3に留める
      const size = driftLevel === 'SEVERE' ? 4 : 3;
      const seed = `calibration-${Date.now()}`;
      return puzzleManager.getGeneratedPuzzle(size, 'easy', seed);
    }
  };

  G.CalibrationPuzzle = CalibrationPuzzle;
})(typeof globalThis !== 'undefined' ? globalThis : this);
