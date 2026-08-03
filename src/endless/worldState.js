/**
 * worldState.js
 * STEP30-4「World Stability System」。Research World全体の「安定度」状態を表す
 * WorldStateデータの初期値・Status判定（状態を持たない純粋なヘルパー）のみを持つ。
 * 実際の増減処理・永続化はworldStabilityManager.js/endlessSave.jsの責務
 * （worldEnvironment.js/researchIdentity.jsと同じ「データ＋ヘルパーのみ」の設計）。
 *
 * WorldState: { stability, mutationLevel, instabilityCount, lastMutation, history }
 *   - stability: 0〜100。RUN開始時に必ず100へリセットされる「今RUNの現在値」
 *     （worldEnvironment.jsのcurrentWorldEnvironmentIdと同じ設計判断: 値自体は
 *     RUNごとにリセットされるが、直近スナップショットとして常にsaveへも書き込む）
 *   - mutationLevel/instabilityCount/lastMutation/history: RUNをまたいで蓄積する
 *     生涯データ（endlessSave.js側で永続化）。STEP30-5以降のWorld Mutation Systemが
 *     参照する前提の器で、今回は書き込むだけで消費するロジックはまだ無い
 *
 * World Status判定（要求仕様どおり）:
 *   100〜80: STABLE / 80〜50: UNSTABLE / 50〜20: CRITICAL / 20〜0: COLLAPSE
 *   （境界値は重複表記だったため、下限側に含める形で判定を統一した:
 *   ちょうど80はSTABLE、ちょうど50はUNSTABLE、ちょうど20はCRITICAL）
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const INITIAL_STABILITY = 100;
  const MIN_STABILITY = 0;
  const MAX_STABILITY = 100;

  const STATUS_THRESHOLDS = [
    { min: 80, status: 'STABLE' },
    { min: 50, status: 'UNSTABLE' },
    { min: 20, status: 'CRITICAL' },
    { min: 0, status: 'COLLAPSE' }
  ];

  function defaultWorldState() {
    return {
      stability: INITIAL_STABILITY,
      mutationLevel: 0,
      instabilityCount: 0,
      lastMutation: null,
      history: []
    };
  }

  /** @param {number} stability @returns {'STABLE'|'UNSTABLE'|'CRITICAL'|'COLLAPSE'} */
  function getStatusForStability(stability) {
    const found = STATUS_THRESHOLDS.find(t => stability >= t.min);
    return found ? found.status : 'COLLAPSE';
  }

  function clampStability(value) {
    return Math.max(MIN_STABILITY, Math.min(MAX_STABILITY, value));
  }

  G.WorldState = {
    INITIAL_STABILITY, MIN_STABILITY, MAX_STABILITY, STATUS_THRESHOLDS,
    defaultWorldState, getStatusForStability, clampStability
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
