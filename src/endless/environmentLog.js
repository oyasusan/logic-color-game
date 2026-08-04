/**
 * environmentLog.js
 * STEP30-3「Environment Visual / HUD Evolution」セクション6: AI Research Log。
 * Environmentごとの解析ログ（フレーバーテキスト）の静的定義データ。
 * 状態を持たない純粋なデータ＋ヘルパーのみ（researchIdentity.js等と同じ構成）。
 * 表示自体はenvironmentScan.js（Layer開始時=Environment変更時）・endless.js
 * （Event Node発生時のトースト追記）が担当する。
 *
 * 【STEP30-4追記】セクション7「AI Research Log Integration」。World Status
 * （worldStabilityManager.js参照）に応じたログメッセージを追加した。表示は
 * environmentScan.jsのIdentified phaseで、Environment側のログの下に並べて出す。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const MESSAGES = {
    env_grid: '安定したデータ構造を検知。',
    env_network: '確率分布の歪みを検知。',
    env_forest: 'ニューラルパターンの成長を検知。',
    env_ocean: '大規模な情報流を検知。',
    env_fractal: '再帰的論理構造を検知。',
    env_unknown: '解析失敗。観測を継続する。'
  };

  function getLogMessage(environmentId) {
    return MESSAGES[environmentId] || '';
  }

  // STEP30-4: World Status別のAI Research Log
  const STATUS_MESSAGES = {
    STABLE: '世界構造は安定している。\n深部研究を推奨する。',
    UNSTABLE: '構造的不安定を検知。\n希少な機会が発生している。',
    CRITICAL: '高い不安定性を検知。\n慎重に行動すること。',
    COLLAPSE: '現実層が崩壊中。\n極限研究状態。'
  };

  function getStatusLogMessage(status) {
    return STATUS_MESSAGES[status] || '';
  }

  G.EnvironmentLog = { MESSAGES, getLogMessage, STATUS_MESSAGES, getStatusLogMessage };
})(typeof globalThis !== 'undefined' ? globalThis : this);
