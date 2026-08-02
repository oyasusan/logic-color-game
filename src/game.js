/**
 * game.js
 * 1ステージ分のゲーム進行を管理する。
 * - ライトの配置/削除（Undo対応）
 * - 行・列ヒントの達成状況判定
 * - クリア判定
 * - ヒント機能（answerを1マスだけ開示）
 * UIの描画やDOM操作には一切関与しない。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { CellState, COLORS, Board } = G;

  class Game {
    /**
     * @param {Object} puzzle data/puzzles.json の1エントリ
     */
    constructor(puzzle) {
      this.puzzle = puzzle;
      this.size = puzzle.size;
      this.board = new Board(this.size);
      this.history = []; // Undo用のスナップショットスタック
      this.moveCount = 0;
      this.hintCount = 0; // 星評価用: Hintを使った回数
      this.undoCount = 0; // 星評価用: Undoした回数
      this.cleared = false;
      this.startedAt = Date.now();
      this.clearedAt = null;
    }

    /**
     * マスをタップした際の色トグル。色ボタンでの選択を介さず、タップするたびに
     * EMPTY -> allowedColors[0] -> allowedColors[1] -> ... -> EMPTY と順送りする。
     * allowedColorsが指定されていないパズルはCOLORS(BLUE/RED/GREEN)全色を使う。
     */
    tapCell(r, c) {
      if (this.cleared) return null;
      const colorList = (this.puzzle.allowedColors && this.puzzle.allowedColors.length)
        ? this.puzzle.allowedColors
        : COLORS;
      this.history.push(this.board.clone());
      const resultColor = this.board.cycle(r, c, colorList);
      this.moveCount++;
      this._checkClear();
      return resultColor;
    }

    undo() {
      if (this.history.length === 0) return false;
      this.board = this.history.pop();
      this.undoCount++;
      this._checkClear();
      return true;
    }

    reset() {
      this.history.push(this.board.clone());
      this.board.clearAll();
      this._checkClear();
    }

    /** 間違っている（または未配置の）マスを1つ正解の色に開示する */
    hint() {
      if (!this.puzzle.answer) return null;
      const candidates = [];
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (this.board.get(r, c) !== this.puzzle.answer[r][c]) {
            candidates.push({ r, c });
          }
        }
      }
      if (candidates.length === 0) return null;

      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      this.history.push(this.board.clone());
      const color = this.puzzle.answer[pick.r][pick.c];
      this.board.set(pick.r, pick.c, color);
      this.hintCount++;
      this._checkClear();
      return { r: pick.r, c: pick.c, color };
    }

    /**
     * 行の達成状況: [{color, target, count, satisfied}]
     */
    getRowStatus(r) {
      const hint = this.puzzle.rowHints[r];
      return COLORS.map(color => {
        const target = hint[color] || 0;
        const count = this.board.countInRow(r, color);
        return { color, target, count, satisfied: count === target };
      });
    }

    getColumnStatus(c) {
      const hint = this.puzzle.columnHints[c];
      return COLORS.map(color => {
        const target = hint[color] || 0;
        const count = this.board.countInCol(c, color);
        return { color, target, count, satisfied: count === target };
      });
    }

    isRowSatisfied(r) {
      return this.getRowStatus(r).every(s => s.satisfied);
    }

    isColumnSatisfied(c) {
      return this.getColumnStatus(c).every(s => s.satisfied);
    }

    isCleared() {
      for (let r = 0; r < this.size; r++) {
        if (!this.isRowSatisfied(r)) return false;
      }
      for (let c = 0; c < this.size; c++) {
        if (!this.isColumnSatisfied(c)) return false;
      }
      return true;
    }

    _checkClear() {
      const wasCleared = this.cleared;
      this.cleared = this.isCleared();
      if (this.cleared && !wasCleared) {
        this.clearedAt = Date.now();
      }
    }

    elapsedSeconds() {
      const end = this.clearedAt || Date.now();
      return Math.max(0, Math.round((end - this.startedAt) / 1000));
    }
  }

  G.Game = Game;
})(typeof globalThis !== 'undefined' ? globalThis : this);
