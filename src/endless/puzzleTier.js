/**
 * puzzleTier.js
 * ENDLESS RESEARCHのDepthに応じた問題生成パラメータ（盤面サイズ・疎密度）を
 * 4段階のTierとして定義する。map.jsの`EndlessMap.getDifficultyForDepth`
 * （3段階、Depth11以降はずっと7×7のまま）を置き換える形でendlessGame.jsから
 * 呼ばれるようになる（map.js自体は他から参照されなくなるが、後方互換のため
 * ファイルは削除せず残す）。
 *
 * 【Tier4を9×9のまま据え置いた理由（重要な技術的判断）】
 * 要求仕様では当初Tier4（Depth50+）に11×11を想定していたが、実装前にNode.js上で
 * generatePuzzleWithRatio(11, ratio, ...)の生成時間を実測したところ、11×11では
 * 「疎密度を上げる(疎にする)と品質チェック(notTrivial)に落ちて再生成が必要になる」
 * 「疎密度を下げる(密にする)と唯一解の探索が長時間化し、20秒のタイムアウトに
 * 達する試行が頻発する」という板挟みが発生し、安全な疎密度が見つからなかった
 * （0.90〜0.92は5試行中4〜5敗、0.87〜0.90は20秒タイムアウト）。8×8で疎密度0.78が
 * 「平均6.4秒・最大17.5秒」で不採用になった過去の判断（boss.jsのコメント参照）と
 * 同様の「サイズが上がるほど安全域が狭くなる」現象がさらに悪化した形。
 * ユーザーに実測結果を提示のうえ、Tier4もTier3と同じ9×9のまま、疎密度を
 * Tier3よりわずかに下げる（＝密にする＝難しくする）ことで難易度差を表現する
 * 方針の承認を得た。11×11以上への対応は、generator.jsの生成アルゴリズム自体の
 * 改良（掘り出し法以外のアプローチ等）が必要になるため、今後の拡張課題とする。
 *
 * 【各疎密度の実測値（Node.js、endless-*シードで計測）】
 *   - 9×9 ratio0.87（Tier3）: 15試行で平均166ms・最大594ms・失敗1/15
 *   - 9×9 ratio0.865（Tier4）: 10試行で平均399ms・最大1362ms・失敗1/10
 * どちらも既存のendlessGame.js側リトライ機構（最大5回、seedを変えて再試行）の
 * 範囲内で十分安全に収まる。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // Tier1・Tier2はmap.jsの既存DEPTH_TIERSと完全に同じ値（サイズ・疎密度）を維持する。
  // 既にステージ/Phase1〜3で長期間実プレイ・実測されてきた値のため変更しない。
  const DEPTH_TIERS = [
    { maxDepth: 5, size: 5, emptyRatio: 0.60, label: 'easy', tier: 1 },
    { maxDepth: 10, size: 7, emptyRatio: 0.78, label: 'normal', tier: 1 },
    { maxDepth: 25, size: 7, emptyRatio: 0.75, label: 'advanced', tier: 2 },
    { maxDepth: 50, size: 9, emptyRatio: 0.87, label: 'tier3', tier: 3 },
    { maxDepth: Infinity, size: 9, emptyRatio: 0.865, label: 'tier4', tier: 4 }
  ];

  /**
   * @param {number} depth
   * @param {number} [tierOffset] Protocol/Environment/Node由来の目標Tier引き上げ量
   *   （0=通常。DEPTH_TIERSの末尾を超える分は末尾にクランプする。map.jsの
   *   getDifficultyForDepth()と同じクランプ方式）
   * @returns {{size:number, emptyRatio:number, label:string, tier:number}}
   */
  function getConfigForDepth(depth, tierOffset) {
    const baseIndex = DEPTH_TIERS.findIndex(t => depth <= t.maxDepth);
    const index = baseIndex === -1 ? DEPTH_TIERS.length - 1 : baseIndex;
    const offsetIndex = Math.min(DEPTH_TIERS.length - 1, Math.max(0, index + (tierOffset || 0)));
    const tier = DEPTH_TIERS[offsetIndex];
    return { size: tier.size, emptyRatio: tier.emptyRatio, label: tier.label, tier: tier.tier };
  }

  /** @returns {number} tierOffset無しの場合の素のTier番号（1〜4）。Archive表示・履歴記録用 */
  function getTierNumber(depth) {
    return getConfigForDepth(depth, 0).tier;
  }

  G.PuzzleTier = { DEPTH_TIERS, getConfigForDepth, getTierNumber };
})(typeof globalThis !== 'undefined' ? globalThis : this);
