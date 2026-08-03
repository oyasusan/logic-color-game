/**
 * map.js
 * ENDLESS RESEARCHの「マップ」を担当する。Phase1は分岐の無い単純な直線マップで、
 * START → Puzzle → Puzzle → ... と、ライフが尽きるまで無限にPuzzleノードが
 * 続く（固定長のマップではなく、depthごとにノードを都度生成する）。
 *
 * 将来のMap分岐・Boss・Eventノード追加に備え、ノード生成をこのモジュールに
 * 集約している（README「今後追加予定」参照）。ゲームロジック本体
 * （game.js/generator.js等）や既存のステージ制（stage.js）には一切関与しない。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // Depthごとの目標難易度。仕様通り Depth1-5:5×5easy / 6-10:7×7normal / 11+:7×7hard。
  //
  // 【疎密度(emptyRatio)について】 tools/build_puzzles.js（ステージ用、オフライン
  // ビルド）が使うgenerator.jsの難易度名テーブルは「唯一解への到達」を最優先に
  // 較正されており、7×7 normal/hard相当の疎密度では生成に数秒〜十数秒（最悪
  // 数十秒）かかることがNode.js上の実測で確認されている。ENDLESS RESEARCHは
  // プレイ中にブラウザのメインスレッドで同期的に生成するため、そのままでは
  // 生成待ちでUIが固まってしまう。そのためここでは難易度名テーブルを経由せず、
  // 「ほぼ確実に1秒未満で完了する」ことを実測確認済みの疎密度を直接指定している
  // （実測: 7×7 ratio0.78は10試行中最大375ms、ratio0.75は最大900ms。
  //  一方ratio0.68は10試行中2回が10秒超）。この結果、ENDLESS内の「normal」
  // 「hard」はステージ制の同名ラベルより疎密度がやや高め＝生成上は易しめだが、
  // ENDLESSはDepthを重ねるプレッシャー・制限時間・ライフ管理が難易度の主軸で
  // あるため、体感難易度としては十分に手応えがある設計としている。
  const DEPTH_TIERS = [
    { maxDepth: 5, size: 5, emptyRatio: 0.60, label: 'easy' },
    { maxDepth: 10, size: 7, emptyRatio: 0.78, label: 'normal' },
    { maxDepth: Infinity, size: 7, emptyRatio: 0.75, label: 'hard' }
  ];

  /**
   * @param {number} depth
   * @param {number} [tierOffset] Overclock Protocol用。目標TierをN段階引き上げる
   *   （0=通常。DEPTH_TIERSの末尾を超える分は末尾Tierにクランプする）
   * @returns {{size:number, emptyRatio:number, label:string}}
   */
  function getDifficultyForDepth(depth, tierOffset) {
    const baseIndex = DEPTH_TIERS.findIndex(t => depth <= t.maxDepth);
    const index = baseIndex === -1 ? DEPTH_TIERS.length - 1 : baseIndex;
    const offsetIndex = Math.min(DEPTH_TIERS.length - 1, Math.max(0, index + (tierOffset || 0)));
    const tier = DEPTH_TIERS[offsetIndex];
    return { size: tier.size, emptyRatio: tier.emptyRatio, label: tier.label };
  }

  /**
   * 指定depthのノードを生成する。Phase1では常にtype:"puzzle"だが、
   * 将来のBoss/Event/分岐ノード追加時にこの関数の返り値を拡張する想定。
   * @returns {{id:string, type:'puzzle', depth:number}}
   */
  function getNode(depth) {
    return { id: `node-${depth}`, type: 'puzzle', depth };
  }

  G.EndlessMap = { getNode, getDifficultyForDepth, DEPTH_TIERS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
