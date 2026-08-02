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
// 再実行しても毎回同じ6ステージが再現される）
const stageConfigs = [
  { size: 5, difficulty: 'easy', seed: 'stage-1', parSeconds: 180 },
  { size: 5, difficulty: 'easy', seed: 'stage-2', parSeconds: 170 },
  { size: 5, difficulty: 'normal', seed: 'stage-3', parSeconds: 150 },
  { size: 5, difficulty: 'normal', seed: 'stage-4', parSeconds: 140 },
  { size: 5, difficulty: 'hard', seed: 'stage-5', parSeconds: 120 },
  { size: 5, difficulty: 'hard', seed: 'stage-6', parSeconds: 110 }
];

const puzzles = stageConfigs.map((cfg, i) => {
  const generated = Generator.generatePuzzle(cfg.size, cfg.difficulty, cfg.seed);
  return {
    // data/stages.json の "puzzle" フィールドは "001" 形式のIDを参照するため統一する
    id: String(i + 1).padStart(3, '0'),
    size: generated.size,
    rowHints: generated.hints.row,
    columnHints: generated.hints.column,
    answer: generated.answer,
    parSeconds: cfg.parSeconds,
    // 参考情報: generator.jsが実測した客観的な難易度・探索統計（ゲーム本体は未使用）
    generatedDifficulty: generated.difficulty,
    generatorStats: generated.stats
  };
});

const outPath = path.join(__dirname, '..', 'data', 'puzzles.json');
fs.writeFileSync(outPath, JSON.stringify({ puzzles }, null, 2) + '\n');
console.log('Wrote', puzzles.length, 'puzzles to', outPath);
puzzles.forEach(p => {
  console.log(' -', p.id, 'requested=' + stageConfigs[Number(p.id) - 1].difficulty, 'computed=' + p.generatedDifficulty);
});
