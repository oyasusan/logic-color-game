/**
 * puzzleManager.js
 * 固定問題（data/puzzles.json）・自動生成問題（generator.js）・
 * Daily Puzzle（日付をseedにした自動生成問題）を、Game/UIがそのまま
 * 扱える"実行時パズル形式"（size/rowHints/columnHints/answer/parSeconds/id）
 * に統一して提供するファサード。
 *
 * 注意: 既存のステージ機能（TITLE→STAGE SELECT→GAME のフロー）は
 * stage.js が data/stages.json + data/puzzles.json を直接読み込んで管理しており、
 * このファイルはそれを置き換えるものではない。puzzleManager.js は
 * 「固定問題も生成問題も同じインターフェースで扱いたい」という新しい
 * 用途（現時点ではDaily Puzzle）のための独立した窓口として追加した。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { Generator, Seed } = G;

  const DAILY_SIZE = 5;
  const DAILY_DIFFICULTY = 'normal';

  // 難易度・盤面サイズから、星評価の基準となる目安のクリア時間(秒)を概算する
  const DIFFICULTY_TIME_MULTIPLIER = { easy: 1, normal: 1.3, hard: 1.6, expert: 2 };

  class PuzzleManager {
    constructor() {
      this.fixedPuzzles = new Map(); // id -> puzzle（data/puzzles.jsonから）
    }

    /** data/puzzles.json を読み込み、固定問題をidで引けるようにする */
    async loadFixedPuzzles() {
      const res = await fetch('data/puzzles.json');
      const data = await res.json();
      this.fixedPuzzles = new Map(data.puzzles.map(p => [p.id, p]));
      return this.fixedPuzzles;
    }

    /** @returns {Object|null} data/puzzles.json内の固定問題（そのままの実行時形式） */
    getFixedPuzzle(id) {
      return this.fixedPuzzles.get(id) || null;
    }

    /**
     * 自動生成問題を取得する。
     * @param {number} size
     * @param {'easy'|'normal'|'hard'|'expert'} difficulty
     * @param {number|string} [seed] 省略時は毎回異なるランダムな問題になる
     */
    getGeneratedPuzzle(size, difficulty, seed) {
      const generated = Generator.generatePuzzle(size, difficulty, seed);
      const usedSeed = seed != null ? seed : Date.now();
      return this._toRuntimePuzzle(generated, `gen-${usedSeed}`);
    }

    /**
     * 疎密度(emptyRatio)を直接指定して自動生成問題を取得する。
     * ENDLESS RESEARCH（src/endless/）のようにブラウザのメインスレッドで
     * 同期的に生成し、応答性を最優先したい場面向け。
     * @param {number} size
     * @param {number} emptyRatio
     * @param {number|string} [seed]
     * @param {string} [label] 参考ラベル（stats.requestedDifficultyに記録）
     */
    getGeneratedPuzzleWithRatio(size, emptyRatio, seed, label) {
      const generated = Generator.generatePuzzleWithRatio(size, emptyRatio, seed, label);
      const usedSeed = seed != null ? seed : Date.now();
      return this._toRuntimePuzzle(generated, `gen-${usedSeed}`);
    }

    /**
     * 日付をseedとしたDaily Puzzleを取得する。同じ日付（ローカル日付）なら
     * 誰が何度読み込んでも常に同じ問題になる。
     * @param {Date} [date] 省略時は本日の日付
     */
    getDailyPuzzle(date) {
      const dateKey = Seed.dateSeed(date);
      const generated = Generator.generatePuzzle(DAILY_SIZE, DAILY_DIFFICULTY, dateKey);
      const puzzle = this._toRuntimePuzzle(generated, `daily-${dateKey}`);
      puzzle.isDaily = true;
      puzzle.dateSeed = dateKey;
      return puzzle;
    }

    _toRuntimePuzzle(generated, id) {
      return {
        id,
        size: generated.size,
        rowHints: generated.hints.row,
        columnHints: generated.hints.column,
        answer: generated.answer,
        difficulty: generated.difficulty,
        seed: generated.seed,
        parSeconds: PuzzleManager.estimateParSeconds(generated),
        stats: generated.stats
      };
    }

    /** 難易度と盤面サイズから、星評価用の目安クリア時間(秒)を概算する */
    static estimateParSeconds(generated) {
      const base = generated.size * generated.size * 4;
      const multiplier = DIFFICULTY_TIME_MULTIPLIER[generated.difficulty] || DIFFICULTY_TIME_MULTIPLIER.normal;
      return Math.round(base * multiplier);
    }
  }

  G.PuzzleManager = PuzzleManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
