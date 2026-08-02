/**
 * board.js
 * 盤面（グリッド）の状態管理のみを担当するモジュール。
 * 判定ロジックやUIのことは一切知らない「純粋なデータ構造」。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // マスが取り得る状態
  const CellState = Object.freeze({
    EMPTY: 'EMPTY',
    BLUE: 'BLUE',
    RED: 'RED',
    GREEN: 'GREEN'
  });

  // 実際に配置できるライトの色（EMPTYを除く）
  const COLORS = Object.freeze([CellState.BLUE, CellState.RED, CellState.GREEN]);

  class Board {
    /**
     * @param {number} size 盤面の一辺の長さ
     * @param {string[][]} [cells] 初期状態（省略時は全てEMPTY）
     */
    constructor(size, cells) {
      this.size = size;
      if (cells) {
        this.cells = cells.map(row => row.slice());
      } else {
        this.cells = Board.createEmptyGrid(size);
      }
    }

    static createEmptyGrid(size) {
      return Array.from({ length: size }, () =>
        Array.from({ length: size }, () => CellState.EMPTY)
      );
    }

    get(r, c) {
      return this.cells[r][c];
    }

    set(r, c, color) {
      this.cells[r][c] = color;
    }

    /** 同じ色を再タップした場合の「削除」を含むトグル配置 */
    toggle(r, c, color) {
      this.cells[r][c] = this.cells[r][c] === color ? CellState.EMPTY : color;
      return this.cells[r][c];
    }

    /**
     * マスをタップするたびに EMPTY -> colorList[0] -> colorList[1] -> ... -> EMPTY
     * と順番に切り替える（色ボタンでの選択を介さない直接タップ操作用）。
     */
    cycle(r, c, colorList) {
      const current = this.cells[r][c];
      const index = colorList.indexOf(current); // EMPTYや対象外の色ならindexOfは-1
      const nextIndex = index + 1;
      const next = nextIndex >= colorList.length ? CellState.EMPTY : colorList[nextIndex];
      this.cells[r][c] = next;
      return next;
    }

    clearAll() {
      this.cells = Board.createEmptyGrid(this.size);
    }

    /** 指定した行/列にある、指定色のライト数を数える */
    countInRow(r, color) {
      return this.cells[r].reduce((n, v) => n + (v === color ? 1 : 0), 0);
    }

    countInCol(c, color) {
      let n = 0;
      for (let r = 0; r < this.size; r++) {
        if (this.cells[r][c] === color) n++;
      }
      return n;
    }

    clone() {
      return new Board(this.size, this.cells);
    }

    toArray() {
      return this.cells.map(row => row.slice());
    }

    equals(other) {
      if (!other || other.size !== this.size) return false;
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (this.cells[r][c] !== other.cells[r][c]) return false;
        }
      }
      return true;
    }
  }

  G.CellState = CellState;
  G.COLORS = COLORS;
  G.Board = Board;
})(typeof globalThis !== 'undefined' ? globalThis : this);
