/**
 * tools/build_puzzles.js
 * data/puzzles.json を生成するための開発用スクリプト（Node.jsで実行）。
 * ブラウザの実行には一切関与しない。
 *
 * 実行方法: node tools/build_puzzles.js
 */
const fs = require('fs');
const path = require('path');

require('../src/board.js');
require('../src/solver.js');
require('../src/difficulty.js');
require('../src/seed.js');
require('../src/generator.js');

const { Generator } = globalThis.LogicColor;

// ステージが進むほど難易度を上げる（seedを固定しているので、このスクリプトを
// 再実行しても毎回同じステージが再現される）。
// Stage 7以降は盤面サイズ自体を6×6→7×7→8×8と拡大してやり込み要素を追加した。
// 大きい盤面は「ランダム完成盤面→solverで唯一解を確認」という生成方式の性質上、
// 5×5と同じ疎密度(emptyRatio)では実用的な時間で唯一解に到達できないため、
// generator.jsのDIFFICULTY_EMPTY_RATIO_BY_SIZEでサイズごとに疎密度を高めに
// 調整している（詳細はgenerator.jsのコメント参照）。そのためStage7以降は
// 実測されるgeneratedDifficulty（difficulty.jsのcomplexity計算はサイズが
// 大きいほど密度換算で「easy」寄りに出る）よりも、盤面サイズそのものが
// プレイヤー体験上の難易度を押し上げる設計とし、stages.jsonの表示用
// difficultyフィールドには実測値ではなく盤面サイズ（"6×6"等）を入れている。
const stageConfigs = [
  { size: 5, difficulty: 'easy', seed: 'stage-1', parSeconds: 180 },
  { size: 5, difficulty: 'easy', seed: 'stage-2', parSeconds: 170 },
  { size: 5, difficulty: 'normal', seed: 'stage-3', parSeconds: 150 },
  { size: 5, difficulty: 'normal', seed: 'stage-4', parSeconds: 140 },
  { size: 5, difficulty: 'hard', seed: 'stage-5', parSeconds: 120 },
  { size: 5, difficulty: 'hard', seed: 'stage-6', parSeconds: 110 },
  { size: 6, difficulty: 'normal', seed: 'stage-7', parSeconds: 200 },
  { size: 6, difficulty: 'hard', seed: 'stage-8', parSeconds: 180 },
  { size: 7, difficulty: 'easy', seed: 'stage-9', parSeconds: 240 },
  { size: 7, difficulty: 'normal', seed: 'stage-10', parSeconds: 220 },
  { size: 8, difficulty: 'easy', seed: 'stage-11', parSeconds: 280 },
  { size: 8, difficulty: 'normal', seed: 'stage-12', parSeconds: 260 }
];

let allValid = true;

const puzzles = stageConfigs.map((cfg, i) => {
  const generated = Generator.generatePuzzle(cfg.size, cfg.difficulty, cfg.seed);

  // 公開品質ゲート: 解なし/複数解/難易度不正がないか出荷前に再検証する
  const validation = Generator.validatePuzzle(generated);
  if (!validation.ok) {
    allValid = false;
    console.error('  [FAIL]', cfg.seed, JSON.stringify(validation.checks));
  }

  return {
    // data/stages.json の "puzzle" フィールドは "001" 形式のIDを参照するため統一する
    id: String(i + 1).padStart(3, '0'),
    size: generated.size,
    rowHints: generated.hints.row,
    columnHints: generated.hints.column,
    answer: generated.answer,
    parSeconds: cfg.parSeconds,
    // 参考情報: generator.jsが実測した客観的な難易度・探索統計・使用seed（ゲーム本体は未使用、デバッグ表示用）
    generatedDifficulty: generated.difficulty,
    generatorStats: generated.stats,
    seed: generated.seed
  };
});

if (!allValid) {
  console.error('品質チェックに失敗した問題があるため data/puzzles.json を書き込みませんでした。');
  process.exit(1);
}

const outPath = path.join(__dirname, '..', 'data', 'puzzles.json');
fs.writeFileSync(outPath, JSON.stringify({ puzzles }, null, 2) + '\n');
console.log('Wrote', puzzles.length, 'puzzles to', outPath, '(品質チェック: 全' + puzzles.length + '問PASS)');
puzzles.forEach(p => {
  console.log(' -', p.id, 'requested=' + stageConfigs[Number(p.id) - 1].difficulty, 'computed=' + p.generatedDifficulty, 'seed=' + p.seed);
});
