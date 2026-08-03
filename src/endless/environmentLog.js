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
    env_grid: 'Stable data structure detected.',
    env_network: 'Probability distortion detected.',
    env_forest: 'Neural pattern growth detected.',
    env_ocean: 'Large information flow detected.',
    env_fractal: 'Recursive logic detected.',
    env_unknown: 'Analysis failed. Continue observation.'
  };

  function getLogMessage(environmentId) {
    return MESSAGES[environmentId] || '';
  }

  // STEP30-4: World Status別のAI Research Log（要求仕様どおりの文言）
  const STATUS_MESSAGES = {
    STABLE: 'World structure is stable.\nDeep research recommended.',
    UNSTABLE: 'Structural instability detected.\nRare opportunity available.',
    CRITICAL: 'High instability detected.\nProceed with caution.',
    COLLAPSE: 'Reality layer collapsing.\nExtreme research condition.'
  };

  function getStatusLogMessage(status) {
    return STATUS_MESSAGES[status] || '';
  }

  G.EnvironmentLog = { MESSAGES, getLogMessage, STATUS_MESSAGES, getStatusLogMessage };
})(typeof globalThis !== 'undefined' ? globalThis : this);
