/**
 * puzzleModifier.js
 * Puzzle Evolution Systemが問題に付与する「Modifier」5種の定義データ。
 * このファイルは純粋なデータ（+参照用の小さなヘルパー）のみを持ち、実際の
 * 効果適用（盤面・タイマー・UNDO等への反映）はendlessGame.js/ui.js側の責務。
 *
 * データ形式: { id, name, description, effect }
 *   - effect: endlessGame.jsが解釈する汎用的な効果記述。
 *     - reverseColorCycle: true      … マスタップの色巡回順を逆にする
 *       （game.jsのtapCell()は`puzzle.allowedColors`の並び順をそのまま使う
 *       既存仕様のため、この配列を逆順にするだけでboard.js/game.js自体には
 *       一切手を加えず実現できる）
 *     - hideColorHints: true         … ランダムな1色のヒント数値を伏せて「?」表示にする
 *     - invertHintColorOrder: true   … ヒントチップの色の並び順を反転して表示する
 *     - timeLimitMultiplierScale: n  … 制限時間倍率に掛ける係数（複数付与時は掛け算で合成）
 *     - tickIntervalSeconds: n       … 残り時間表示の更新間隔（秒）。複数付与時は最大値を採用
 *     - undoDisabled: true           … UNDOボタンを無効化する
 *
 * Elite Nodeは`ELITE_MODIFIER_COUNT`個（重複無し）をまとめて付与される
 * （「複数Modifier付与」の実現）。Tier3以降（Depth26+）の通常Puzzle Nodeにも
 * 一定確率で1個だけ付与されることがある（mapGenerator.js参照）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    {
      id: 'mirror_logic',
      name: 'Mirror Logic',
      description: 'マスタップで巡回する色の順序が逆になる',
      effect: { reverseColorCycle: true }
    },
    {
      id: 'hidden_color',
      name: 'Hidden Color',
      description: 'ランダムな1色のヒント数値が伏せられ「?」表示になる',
      effect: { hideColorHints: true }
    },
    {
      id: 'inverted_signal',
      name: 'Inverted Signal',
      description: 'ヒントチップの色の並び順が反転して表示される',
      effect: { invertHintColorOrder: true }
    },
    {
      id: 'time_distortion',
      name: 'Time Distortion',
      description: '制限時間が短縮され、残り時間の表示更新も3秒おきに粗くなる',
      effect: { timeLimitMultiplierScale: 0.75, tickIntervalSeconds: 3 }
    },
    {
      id: 'noise_data',
      name: 'Noise Data',
      description: 'UNDOが使用できない',
      effect: { undoDisabled: true }
    }
  ];

  const ELITE_MODIFIER_COUNT = 2;
  // Tier3以降（Depth26+）の通常Puzzle Nodeが1個だけModifierを持つ確率
  const PUZZLE_MODIFIER_CHANCE = 0.3;
  const PUZZLE_MODIFIER_MIN_TIER = 3;

  const BY_ID = new Map(ALL.map(m => [m.id, m]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  /** @param {number} count 重複無しでランダムに選ぶ個数（ALL.lengthを超える場合は全件） */
  function pickRandom(count) {
    const pool = ALL.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(count, pool.length));
  }

  G.PuzzleModifier = {
    ALL, ELITE_MODIFIER_COUNT, PUZZLE_MODIFIER_CHANCE, PUZZLE_MODIFIER_MIN_TIER,
    getById, pickRandom
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
