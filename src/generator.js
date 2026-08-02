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

  // 難易度ごとの目標疎密度（EMPTYになる確率）。盤面サイズごとに分けている理由:
  // 「ランダムな完成盤面を作ってsolverで唯一解になるまでリトライする」方式は、
  // 疎密度が下がる（色が密になる）ほど唯一解に到達する確率が急落し、6×6以上では
  // 5×5と同じ疎密度を使うと実用的な時間で終わらない（Node.js上の実測: 6×6で
  // 疎密度0.5は3000回試行しても見つからず、0.53でも約4〜5秒かかる一方、
  // 0.6以上なら数十〜数百ms）。そのため盤面が大きいほど疎密度を高めに設定し、
  // 生成を実用的な時間に収めている。人間のプレイヤーにとっての難易度は
  // 疎密度だけでなく「盤面が大きいほど行/列の同時管理が難しくなる」という
  // 要素が大きいため、大きい盤面では疎密度を上げても十分に手応えのある
  // 問題になる（実測: 5×5基準のcomplexity式では大盤面は疎密度が高くても
  // 相対的に低いスコアが出るが、これは想定通り＝サイズそのものが難易度を
  // 押し上げる分を疎密度側では稼がなくてよいという設計判断）。
  // 5×5のみ実測20回較正済み（difficulty.jsのコメント参照）、6×6以上は
  // 「実用時間で唯一解に到達できる疎密度」を優先して選定した目安値。
  const DIFFICULTY_EMPTY_RATIO_BY_SIZE = {
    5: { easy: 0.6, normal: 0.45, hard: 0.32, expert: 0.18 },
    6: { easy: 0.65, normal: 0.60, hard: 0.53 },
    7: { easy: 0.75, normal: 0.68 },
    8: { easy: 0.82, normal: 0.76 }
  };

  const DEFAULT_MAX_ATTEMPTS = 6000;
  const VALID_DIFFICULTIES = ['easy', 'normal', 'hard', 'expert'];

  /** サイズに応じた疎密度テーブルを返す。未対応サイズは5×5のテーブルを流用する */
  function getEmptyRatioTable(size) {
    return DIFFICULTY_EMPTY_RATIO_BY_SIZE[size] || DIFFICULTY_EMPTY_RATIO_BY_SIZE[5];
  }

  /**
   * 「自明すぎる問題」と判定しない最低限の色付きマス数。
   * サイズと同数（1行に平均1マス相当）を要求すると、大盤面×高疎密度の
   * 組み合わせでは唯一解と両立する候補が少なすぎて実用的な時間で
   * 見つからないことが実測でわかったため、やや緩めの基準にしている。
   */
  function minColoredCellsFor(size) {
    return Math.max(3, Math.ceil(size * 0.6));
  }

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
   *
   * 疎密度を高く（EMPTYを多く）設定した場合、色付きマスが少ないほど
   * 唯一解に到達しやすい（並び替えの余地が少ないため）性質上、乱数の
   * 巡り合わせで色付きマスが数個しか無い自明な盤面を「唯一解」として
   * 早期に拾ってしまうことがある（7×7・疎密度0.75の実測で確認）。
   * そのため色付きマスが`minColoredCells`未満の盤面は候補から除外し、
   * 引き続きリトライする。
   * @param {number} [minColoredCells] 唯一解と認める最低限の色付きマス数
   * @returns {{board:Object, rowHints:Object[], columnHints:Object[]}|null}
   */
  function findUniqueBoard(size, emptyRatio, rng, maxAttempts, minColoredCells) {
    const minColored = minColoredCells != null ? minColoredCells : 0;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const board = generateCompleteBoard(size, emptyRatio, rng);
      const { rowHints, columnHints } = buildHintsFromBoard(board);

      if (minColored > 0) {
        let coloredCount = 0;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (board.get(r, c) !== CellState.EMPTY) coloredCount++;
          }
        }
        if (coloredCount < minColored) continue;
      }

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
   *
   * 【重要な発見】掘り出しのたびにヒントを盤面から再計算し直す設計のため
   * （数値目標を固定したまま掘るのではなく、掘った後の実際の色数に
   * ヒント自体を更新し直す）、色付きマスがもともと少ない疎な盤面
   * （6×6以上の大盤面で疎密度を高く設定した場合など）では、色付きマスを
   * 掘り出す1手ごとに「残りの色だけを目標とする、より単純な問題」として
   * 常に唯一解が成立してしまい、最悪すべての色付きマスを掘り尽くして
   * 全ヒントが0の自明な問題（何もしなくてもクリア扱いになる）が
   * 生成されてしまうことがNode.js上の実測で判明した（7×7・疎密度0.75で
   * 実際に発生を確認）。そのため色付きマスの残数が`minColoredCells`を
   * 下回る場合は、それ以上掘らずに打ち切るガードを設けている。
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

    let coloredCount = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board.get(r, c) !== CellState.EMPTY) coloredCount++;
      }
    }
    // これ以上掘るとヒントがほぼ消えた自明な問題になってしまうため、色付きマスの下限を設ける
    const minColoredCells = minColoredCellsFor(size);

    for (const [r, c] of order) {
      if (dugCount >= limit) break;
      if (coloredCount - 1 < minColoredCells) break;

      const original = board.get(r, c);
      if (original === CellState.EMPTY) continue;

      board.set(r, c, CellState.EMPTY);
      const next = buildHintsFromBoard(board);
      const result = Solver.solve(size, next.rowHints, next.columnHints, { limit: 2 });

      if (result.solutions === 1) {
        curRowHints = next.rowHints;
        curColumnHints = next.columnHints;
        dugCount++;
        coloredCount--;
      } else {
        board.set(r, c, original); // 唯一解が崩れるので元に戻す
      }
    }

    return { rowHints: curRowHints, columnHints: curColumnHints };
  }

  function boardsEqual(a, b) {
    for (let r = 0; r < a.length; r++) {
      for (let c = 0; c < a[r].length; c++) {
        if (a[r][c] !== b[r][c]) return false;
      }
    }
    return true;
  }

  /**
   * 公開品質チェック: 生成済みのpuzzleオブジェクト（generatePuzzleの戻り値と同じ形）を
   * solverで再検証し、「解なし」「複数解」「answerとsolverの解の不一致」
   * 「難易度ラベルが不正」「自明すぎる問題（ヒントがほぼ無い）」の5点をチェックする。
   * generatePuzzle内部の自己検証、および tools/build_puzzles.js での公開前ゲートとして使う。
   * @returns {{ok:boolean, checks:Object, solverResult:Object}}
   */
  function validatePuzzle(puzzle) {
    const { size, hints, answer } = puzzle;
    const solverResult = Solver.solve(size, hints.row, hints.column, { limit: 2 });
    const hintCount = countVisibleHints(hints.row, hints.column);

    const checks = {
      hasSolution: solverResult.solutions >= 1,
      uniqueSolution: solverResult.solutions === 1,
      answerMatchesSolver: !!solverResult.solution && boardsEqual(solverResult.solution, answer),
      validDifficulty: VALID_DIFFICULTIES.indexOf(puzzle.difficulty) !== -1,
      // ヒントが盤面の一辺の数未満しか無い場合、行/列の大半が「0個」の自明な
      // 制約になり実質的にゲームとして成立しないため不合格にする
      // （digHolesの下限ガードで通常は発生しないはずの防御的チェック）
      notTrivial: hintCount >= size
    };
    const ok = checks.hasSolution && checks.uniqueSolution && checks.answerMatchesSolver
      && checks.validDifficulty && checks.notTrivial;

    return { ok, checks, solverResult };
  }

  /**
   * @param {number} size 盤面の一辺
   * @param {'easy'|'normal'|'hard'|'expert'} [difficulty='normal'] 目標難易度
   * @param {number|string} [seed] 同じseedなら常に同じ問題を生成する。省略時は非決定的
   * @returns {{size:number, hints:{row:Object[], column:Object[]}, answer:string[][],
   *            difficulty:string, seed:(number|string), stats:{solutions:number, steps:number,
   *            guessCount:number, hintCount:number, requestedDifficulty:string}}}
   */
  function generatePuzzle(size, difficulty, seed) {
    const ratioTable = getEmptyRatioTable(size);
    const targetDifficulty = ratioTable[difficulty] ? difficulty : 'normal';
    const emptyRatio = ratioTable[targetDifficulty];
    return generatePuzzleWithRatio(size, emptyRatio, seed, targetDifficulty);
  }

  /**
   * 疎密度(emptyRatio)を直接指定して問題を生成する下位関数。generatePuzzle()は
   * 難易度名からこの疎密度テーブル(DIFFICULTY_EMPTY_RATIO_BY_SIZE、オフラインの
   * tools/build_puzzles.js向けに「唯一解到達」を最優先し数秒〜数十秒かかることも
   * 許容して較正した値)を引いて呼び出すが、ENDLESS RESEARCH（src/endless/）の
   * ようにブラウザのメインスレッドで同期的に生成するユースケースでは、
   * 生成時間そのものを最優先で短く抑えたい疎密度を使いたいことがあるため、
   * 外部から直接指定できるようにこの関数を公開している。
   * @param {number} size 盤面の一辺
   * @param {number} emptyRatio 目標疎密度（EMPTYになる確率）
   * @param {number|string} [seed] 同じseedなら常に同じ問題を生成する。省略時は非決定的
   * @param {string} [requestedLabel] stats.requestedDifficultyに記録する参考ラベル（表示・デバッグ用）
   * @returns {{size:number, hints:{row:Object[], column:Object[]}, answer:string[][],
   *            difficulty:string, seed:(number|string), stats:{solutions:number, steps:number,
   *            guessCount:number, hintCount:number, requestedDifficulty:string}}}
   */
  function generatePuzzleWithRatio(size, emptyRatio, seed, requestedLabel) {
    const usedSeed = seed != null ? seed : Math.random();
    const rng = Seed.createRng(usedSeed);

    // digHoles側の下限（Math.max(1, size)）と揃え、自明すぎる問題を候補段階で除外する
    const minColoredCells = minColoredCellsFor(size);
    const found = findUniqueBoard(size, emptyRatio, rng, DEFAULT_MAX_ATTEMPTS, minColoredCells);
    if (!found) {
      throw new Error(
        `唯一解の問題を生成できませんでした（size=${size}, emptyRatio=${emptyRatio}）。seedを変えるか試行回数を増やしてください。`
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

    const puzzle = {
      size,
      hints: { row: dug.rowHints, column: dug.columnHints },
      answer: found.board.toArray(),
      difficulty: computedDifficulty,
      seed: usedSeed,
      stats: {
        solutions: finalResult.solutions,
        steps: finalResult.steps,
        guessCount: finalResult.guessCount,
        hintCount,
        requestedDifficulty: requestedLabel != null ? requestedLabel : null
      }
    };

    // 公開品質ゲート: 解なし/複数解/難易度不正を出荷前に検出する（本来は起こらない想定の自己検証）
    const validation = validatePuzzle(puzzle);
    if (!validation.ok) {
      throw new Error(
        `生成した問題が品質チェックに失敗しました（size=${size}, emptyRatio=${emptyRatio}, seed=${usedSeed}）: ` +
        JSON.stringify(validation.checks)
      );
    }

    return puzzle;
  }

  G.Generator = {
    generatePuzzle,
    generatePuzzleWithRatio,
    validatePuzzle,
    generateCompleteBoard,
    findUniqueBoard,
    digHoles,
    buildHintsFromBoard,
    countVisibleHints,
    getEmptyRatioTable,
    DIFFICULTY_EMPTY_RATIO_BY_SIZE
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
