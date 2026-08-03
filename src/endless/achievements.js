/**
 * achievements.js
 * STEP29「Research Identity System」セクション10のAchievement基盤。
 * protocolUnlock.jsと同じ構成（状態を持たない純粋な判定モジュール。実際の
 * 「達成済み一覧」の保持・永続化はendlessSave.jsの責務、いつ判定を呼ぶかは
 * endless.jsの責務）。
 *
 * `condition.type`はsnapshotオブジェクトの同名キーと`value`を`>=`で比較する
 * だけの汎用ルール（protocolUnlock.jsと同じ設計）。snapshotの各キーの意味
 * （endless.jsが組み立てる）:
 *   - perfectClearTotal: 生涯PERFECTクリア回数（今RUNの分も含む）
 *   - bestDepthEver: これまでで最も深く到達したDepth（今RUNの進行中の値も含む）
 *   - protocolEvolutionTotal: 生涯Protocol Evolution実行回数
 *   - longRunDepth: 今RUNで到達した最大Depth（「Long Run」＝1RUNで一定Depthへ
 *     到達したことの判定に使う。要求仕様に閾値指定が無かったため、Boss Depth
 *     50到達をLong Runの基準として設計した）
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    {
      id: 'analyst_logic_architect',
      identityId: 'analyst',
      name: 'Logic Architect',
      description: 'PERFECTクリアを生涯100回達成する',
      condition: { type: 'perfectClearTotal', value: 100 }
    },
    {
      id: 'explorer_deep_signal_hunter',
      identityId: 'explorer',
      name: 'Deep Signal Hunter',
      description: 'DEPTH 500へ到達する',
      condition: { type: 'bestDepthEver', value: 500 }
    },
    {
      id: 'engineer_protocol_creator',
      identityId: 'protocol_engineer',
      name: 'Protocol Creator',
      description: 'Protocol Evolutionを生涯50回実行する',
      condition: { type: 'protocolEvolutionTotal', value: 50 }
    },
    {
      id: 'survivalist_endless_researcher',
      identityId: 'survivalist',
      name: 'Endless Researcher',
      description: '1RUNでDEPTH 50へ到達する（Long Run達成）',
      condition: { type: 'longRunDepth', value: 50 }
    }
  ];

  const BY_ID = new Map(ALL.map(a => [a.id, a]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  function isConditionMet(def, snapshot) {
    const condition = def && def.condition;
    if (!condition) return false;
    const current = (snapshot && snapshot[condition.type]) || 0;
    return current >= condition.value;
  }

  /**
   * @param {Object} snapshot 現在の生涯進行状況（endless.jsが組み立てる）
   * @param {string[]} completedIds 既に達成済みのAchievement id一覧
   * @returns {string[]} 新たに条件を満たしたAchievement idの一覧
   */
  function findNewlyCompleted(snapshot, completedIds) {
    const completedSet = new Set(completedIds || []);
    return ALL
      .filter(def => !completedSet.has(def.id))
      .filter(def => isConditionMet(def, snapshot))
      .map(def => def.id);
  }

  G.Achievements = { ALL, getById, isConditionMet, findNewlyCompleted };
})(typeof globalThis !== 'undefined' ? globalThis : this);
