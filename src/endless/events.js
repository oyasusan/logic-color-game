/**
 * events.js
 * ENDLESS RESEARCHのEvent Node（Depth進行の合間にランダムで発生する
 * 5種類のイベント）の定義データ。upgrades.jsと同様、純粋なデータのみを持ち、
 * 効果適用ロジックは持たない（eventManager.js / endless.jsの責務）。
 *
 * データ形式: { id, name, description, effect: { type, value } }
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    {
      id: 'ai_anomaly',
      name: 'AI Anomaly',
      description: '次に取得するアップグレードの効果が2倍になる',
      effect: { type: 'doubleNextUpgrade', value: 1 }
    },
    {
      id: 'data_recovery',
      name: 'Data Recovery',
      description: 'ライフを1回復する',
      effect: { type: 'lifeRecover', value: 1 }
    },
    {
      id: 'system_error',
      name: 'System Error',
      description: '現在のコンボがリセットされる',
      effect: { type: 'comboReset', value: 1 }
    },
    {
      id: 'memory_fragment',
      name: 'Memory Fragment',
      description: 'Memory Fragmentを獲得する（生涯累計として記録される）',
      effect: { type: 'memoryFragmentGain', value: 2 } // 実際の付与量はeventManager.jsが1〜3の範囲で決定する
    },
    {
      id: 'unknown_upgrade',
      name: 'Unknown Upgrade',
      description: 'ランダムなアップグレードを無条件で1つ獲得する',
      effect: { type: 'grantRandomUpgrade', value: 1 }
    }
  ];

  const BY_ID = new Map(ALL.map(e => [e.id, e]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  G.Events = { ALL, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
