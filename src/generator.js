/**
 * generator.js
 * 論理パズルを自動生成する。
 *
 * 【重要な設計判断】このゲームのヒントは「行/列ごとの色別ライト数」という
 * “集計カウント”のみで、色の並び順を示す手掛かりが無い。そのため、
 * 全マスを色で埋めた「完全に密な盤面」は、色の配置を入れ替えても同じ
 * カウントになる組み合わせが大量に存在し、ほぼ確実に唯一解にならない
 * （Node.js上で実測: EMPTYなし5×5盤面が唯一解だった割合は0/30）。
 * つまり古典的な数独の「完成盤面から掘り出す」方式はこのゲームには
 * そのまま適用できない。EMPTYマスの位置そのものが重要な手掛かりになる。
 *
 * そこで以下の2段階方式を採用する:
 *   1. 完成盤面生成: 難易度ごとの目標疎密度(emptyRatio)でマスをEMPTY/色に
 *      ランダム割り当てし、solverで唯一解になるまでリトライする
 *      （既存のMVP版generator.jsと同じ retry 方式。実測で高確率・高速に
 *      唯一解へ到達することを確認済み）。
 *   2. ヒント削除（掘り出し）: 唯一解が見つかった盤面から、さらにマスを
 *      1つずつランダムな順でEMPTYへ削り、唯一解を保てる場合だけ確定する
 *      （唯一性が既に保証された状態からの掘り出しなので安全に適用できる）。
 *      これにより同じ難易度目標の中でもよりヒントの少ない、開放的な
 *      盤面に仕上げる。
 *
 * 最終的な探索量（steps/guessCount）をdifficulty.jsに渡し、客観的な
 * 難易度ラベル（要求したdifficultyと一致するとは限らない）を付けて返す。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { CellState, COLORS, Board } = G;
  const { Solver } = G;
  const { Difficulty } = G;
  const { Seed } = G;

  // 難易度ごとの目標疎密度（EMPTYになる確率）。
  // 実測（5×5盤面、Node.js上で較正）: 疎密度が低い（色で密）ほどsolverの
  // guessCount/stepsが増える＝難しくなる。そのため easy は疎密度を高く
  // （EMPTYが多く＝手掛かりが強く働く）、expertは低く（色が密で曖昧さが
  // 増す）設定している。
  const DIFFICULTY_EMPTY_RATIO = {
    easy: 0.6,
    normal: 0.45,
    hard: 0.32,
    expert: 0.18
  };

  const DEFAULT_MAX_ATTEMPTS = 6000;

  function buildHintsFromBoard(board) {
    const size = board.size;
    const rowHints = [];
    const columnHints = [];

    for (let r = 0; r < size; r++) {
      const hint = {};
      COLORS.forEach(color => { hint[color] = board.countInRow(r, color); });
      rowHints.push(hint);
    }
    for (let c = 0; c < size; c++) {
      const hint = {};
      COLORS.forEach(color => { hint[color] = board.countInCol(c, color); });
      columnHints.push(hint);
    }
    return { rowHints, columnHints };
  }

  /** 画面に実際に表示される(0件を除いた)ヒントチップの総数 */
  function countVisibleHints(rowHints, columnHints) {
    let n = 0;
    rowHints.concat(columnHints).forEach(hint => {
      COLORS.forEach(color => { if (hint[color] > 0) n++; });
    });
    return n;
  }

  /** 目標疎密度でランダムに完成盤面（EMPTYと3色が混在する候補解）を1つ作る */
  function generateCompleteBoard(size, emptyRatio, rng) {
    const board = new Board(size);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (rng() < emptyRatio) {
          board.set(r, c, CellState.EMPTY);
        } else {
          const index = Math.floor(rng() * COLORS.length);
          board.set(r, c, COLORS[index]);
        }
      }
    }
    return board;
  }

  /**
   * 目標疎密度の完成盤面をsolverで唯一解になるまで繰り返し生成する。
   * @returns {{board:Object, rowHints:Object[], columnHints:Object[]}|null}
   */
  function findUniqueBoard(size, emptyRatio, rng, maxAttempts) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const board = generateCompleteBoard(size, emptyRatio, rng);
      const { rowHints, columnHints } = buildHintsFromBoard(board);
      const result = Solver.solve(size, rowHints, columnHints, { limit: 2 });
      if (result.solutions === 1) {
        return { board, rowHints, columnHints };
      }
    }
    return null;
  }

  /**
   * 既に唯一解であることが分かっている盤面から、さらにマスをEMPTYへ削れるか
   * 1つずつ試す（唯一解を保てる場合だけ確定する「掘り出し」）。
   *
   * 全マスに対して上限なく掘り続けると、どの難易度目標から始めても
   * 「これ以上削れない最小構成」に収束してしまい、難易度の作り分けが
   * 消えてしまうことを実測で確認した。そのため掘れる数に上限
   * （盤面の約10%、最低1マス）を設け、あくまで同じ難易度帯の中での
   * 軽い仕上げ調整として働くようにしている。
   * @returns {{rowHints:Object[], columnHints:Object[]}} 掘り出し後のヒント
   */
  function digHoles(board, rowHints, columnHints, rng, maxExtra) {
    const size = board.size;
    const limit = maxExtra != null ? maxExtra : Math.max(1, Math.ceil(size * size * 0.1));
    const order = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) order.push([r, c]);
    }
    Seed.shuffle(order, rng);

    let curRowHints = rowHints;
    let curColumnHints = columnHints;
    let dugCount = 0;

    for (const [r, c] of order) {
      if (dugCount >= limit) break;

      const original = board.get(r, c);
      if (original === CellState.EMPTY) continue;

      board.set(r, c, CellState.EMPTY);
      const next = buildHintsFromBoard(board);
      const result = Solver.solve(size, next.rowHints, next.columnHints, { limit: 2 });

      if (result.solutions === 1) {
        curRowHints = next.rowHints;
        curColumnHints = next.columnHints;
        dugCount++;
      } else {
        board.set(r, c, original); // 唯一解が崩れるので元に戻す
      }
    }

    return { rowHints: curRowHints, columnHints: curColumnHints };
  }

  /**
   * @param {number} size 盤面の一辺
   * @param {'easy'|'normal'|'hard'|'expert'} [difficulty='normal'] 目標難易度
   * @param {number|string} [seed] 同じseedなら常に同じ問題を生成する。省略時は非決定的
   * @returns {{size:number, hints:{row:Object[], column:Object[]}, answer:string[][],
   *            difficulty:string, stats:{solutions:number, steps:number, guessCount:number,
   *            hintCount:number, requestedDifficulty:string}}}
   */
  function generatePuzzle(size, difficulty, seed) {
    const targetDifficulty = DIFFICULTY_EMPTY_RATIO[difficulty] ? difficulty : 'normal';
    const emptyRatio = DIFFICULTY_EMPTY_RATIO[targetDifficulty];
    const rng = Seed.createRng(seed != null ? seed : Math.random());

    const found = findUniqueBoard(size, emptyRatio, rng, DEFAULT_MAX_ATTEMPTS);
    if (!found) {
      throw new Error(
        `唯一解の問題を生成できませんでした（size=${size}, difficulty=${targetDifficulty}）。seedを変えるか試行回数を増やしてください。`
      );
    }

    const dug = digHoles(found.board, found.rowHints, found.columnHints, rng);

    const finalResult = Solver.solve(size, dug.rowHints, dug.columnHints, { limit: 2 });
    const hintCount = countVisibleHints(dug.rowHints, dug.columnHints);
    const computedDifficulty = Difficulty.classify({
      size,
      hintCount,
      steps: finalResult.steps,
      guessCount: finalResult.guessCount
    });

    return {
      size,
      hints: { row: dug.rowHints, column: dug.columnHints },
      answer: found.board.toArray(),
      difficulty: computedDifficulty,
      stats: {
        solutions: finalResult.solutions,
        steps: finalResult.steps,
        guessCount: finalResult.guessCount,
        hintCount,
        requestedDifficulty: targetDifficulty
      }
    };
  }

  G.Generator = {
    generatePuzzle,
    generateCompleteBoard,
    findUniqueBoard,
    digHoles,
    buildHintsFromBoard,
    countVisibleHints,
    DIFFICULTY_EMPTY_RATIO
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
