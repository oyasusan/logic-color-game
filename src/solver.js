/**
 * solver.js
 * ヒント条件（行/列ごとの色別ライト数）から解の数を数える探索エンジン。
 * generator.js が「唯一解であるか」を確認したり、difficulty.js が難易度を
 * 判定するための探索量（steps/guessCount）を得るために利用する。
 *
 * ヒント形式:
 *   rowHints[r]    = { BLUE: n, RED: n, GREEN: n }
 *   columnHints[c] = { BLUE: n, RED: n, GREEN: n }
 * 各値は「その行/列に存在すべきライト数」。0も明示的な制約。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { CellState, COLORS } = G;

  /**
   * @param {number} size
   * @param {Array<Object>} rowHints
   * @param {Array<Object>} columnHints
   * @param {Object} [options]
   * @param {number} [options.limit=2] この件数見つかった時点で探索を打ち切る
   * @returns {{solutions:number, solution:string[][]|null, steps:number, guessCount:number}}
   *   solutions   : 見つかった解の数（limitで打ち切られるため、唯一解判定にはlimit:2で十分）
   *   solution    : 最初に見つかった解（唯一解問題ならそれが正解）
   *   steps       : 探索中に実際に試みたマス割り当ての回数（探索量の目安）
   *   guessCount  : あるマスで「制約上まだ複数の色候補が有効だった」回数
   *                 （0か1候補しかない＝ヒントから一意に確定できるマスはguessに数えない）
   */
  function solve(size, rowHints, columnHints, options) {
    const limit = (options && options.limit) || 2;
    const grid = createEmptyGrid(size);

    const rowCount = rowHints.map(() => ({ BLUE: 0, RED: 0, GREEN: 0 }));
    const colCount = columnHints.map(() => ({ BLUE: 0, RED: 0, GREEN: 0 }));

    let solutions = 0;
    let firstSolution = null;
    let steps = 0;
    let guessCount = 0;

    function rowSatisfied(r) {
      const target = rowHints[r];
      const actual = rowCount[r];
      return COLORS.every(color => target[color] === actual[color]);
    }

    function colSatisfied(c) {
      const target = columnHints[c];
      const actual = colCount[c];
      return COLORS.every(color => target[color] === actual[color]);
    }

    function dfs(index) {
      if (solutions >= limit) return;

      if (index === size * size) {
        // 全マス確定 -> 最終検証（行は逐次チェック済みなので列のみ確認）
        for (let c = 0; c < size; c++) {
          if (!colSatisfied(c)) return;
        }
        solutions++;
        if (!firstSolution) {
          firstSolution = grid.map(row => row.slice());
        }
        return;
      }

      const r = Math.floor(index / size);
      const c = index % size;

      // このマスに置ける候補（制約を破らないもの）を先に絞り込む
      const viable = [CellState.EMPTY, ...COLORS].filter(color => {
        if (color === CellState.EMPTY) return true;
        return rowCount[r][color] + 1 <= rowHints[r][color]
          && colCount[c][color] + 1 <= columnHints[c][color];
      });

      // 候補が2つ以上残っている＝ヒントだけでは決められず「仮置き」が必要なマス
      if (viable.length > 1) guessCount++;

      for (const color of viable) {
        steps++;

        if (color !== CellState.EMPTY) {
          rowCount[r][color]++;
          colCount[c][color]++;
        }
        grid[r][c] = color;

        // 行の最後のマスまで埋めたら、その時点で行の条件を確定チェック（枝刈り）
        const isRowEnd = c === size - 1;
        if (!isRowEnd || rowSatisfied(r)) {
          dfs(index + 1);
        }

        if (color !== CellState.EMPTY) {
          rowCount[r][color]--;
          colCount[c][color]--;
        }
        grid[r][c] = CellState.EMPTY;

        if (solutions >= limit) return;
      }
    }

    dfs(0);

    return { solutions, solution: firstSolution, steps, guessCount };
  }

  /** board.js に依存せずに使えるよう、簡易グリッド生成をローカルに持つ */
  function createEmptyGrid(size) {
    return Array.from({ length: size }, () =>
      Array.from({ length: size }, () => CellState.EMPTY)
    );
  }

  /** 唯一解かどうかだけを手早く確認するユーティリティ */
  function hasUniqueSolution(size, rowHints, columnHints) {
    return solve(size, rowHints, columnHints, { limit: 2 }).solutions === 1;
  }

  G.Solver = { solve, hasUniqueSolution };
})(typeof globalThis !== 'undefined' ? globalThis : this);
