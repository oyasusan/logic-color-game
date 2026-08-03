/**
 * worldStabilityManager.js
 * STEP30-4「World Stability System」。Research World全体の「安定度」を管理する。
 *
 * stability自体はRUNごとにreset()で100へ戻る「今RUNの現在値」（メモリ上に保持し、
 * 変化のたびにendlessSave.jsへスナップショットとして書き込む。worldEnvironmentManager.js
 * のcurrentWorldEnvironmentIdと同じ設計判断）。mutationLevel/instabilityCount/history
 * はRUNをまたいで蓄積する生涯データとして完全にendlessSave.jsへ委譲する。
 *
 * 将来のWorld Mutation System（STEP30-5以降）への接続点として`checkMutation()`
 * （今回は常にfalseを返すプレースホルダー）と、Reward System Hook用の
 * `getWorldRewardModifier()`（今回は常に1.0固定）を用意している。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { WorldState } = G;

  class WorldStabilityManager {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス */
    constructor({ save }) {
      this.save = save;
      // worldEnvironmentManager.getCurrentEnvironment()と同じく、直近の保存済み
      // スナップショットを初期値として引き継ぐ（新規RUN開始時は必ずreset()で
      // 100に戻すため、実プレイ上の見え方は変わらない）
      this.stability = this.save.getWorldStability();
    }

    /** RUN開始時に呼ぶ。stabilityを100へ戻す（生涯データのmutationLevel等はリセットしない） */
    reset() {
      this.stability = WorldState.INITIAL_STABILITY;
      this.save.setWorldStability(this.stability);
    }

    getStability() {
      return this.stability;
    }

    /**
     * @param {number} value 増加量（正の値）
     * @param {{layer?:number, event?:string}} [context] World History記録用
     */
    increaseStability(value, context) {
      this._changeStability(Math.abs(value), context);
    }

    /**
     * @param {number} value 減少量（正の値で指定する。内部で減算する）
     * @param {{layer?:number, event?:string}} [context] World History記録用
     */
    decreaseStability(value, context) {
      this._changeStability(-Math.abs(value), context);
      this.save.incrementWorldInstabilityCount();
    }

    _changeStability(delta, context) {
      const before = this.stability;
      this.stability = WorldState.clampStability(before + delta);
      this.save.setWorldStability(this.stability);
      this.save.recordWorldHistory({
        layer: (context && context.layer) || 0,
        event: (context && context.event) || '',
        before,
        after: this.stability
      });
    }

    /** @returns {'STABLE'|'UNSTABLE'|'CRITICAL'|'COLLAPSE'} */
    getStatus() {
      return WorldState.getStatusForStability(this.stability);
    }

    /** @returns {Object} WorldState全体（stability=今RUNの現在値、他は生涯データ） */
    getWorldState() {
      return {
        stability: this.stability,
        mutationLevel: this.save.getWorldMutationLevel(),
        instabilityCount: this.save.getWorldInstabilityCount(),
        lastMutation: this.save.getWorldLastMutation(),
        history: this.save.getWorldHistory()
      };
    }

    /**
     * セクション5: Environment連携準備。現在EnvironmentとWorld Statusを組み合わせた
     * キーを返す（例: "env_ocean:CRITICAL"）。STEP30-5以降でこのキーを使った
     * Modifier拡張ができるようにするための構造のみで、今回は何にも使われない。
     * @param {string} environmentId
     */
    getEnvironmentStatusKey(environmentId) {
      return `${environmentId}:${this.getStatus()}`;
    }

    /** 将来のWorld Mutation System向けの判定API。今回は常にfalseを返すプレースホルダー */
    checkMutation() {
      return false;
    }

    /** Reward System Hook（セクション8）。STEP30-5以降で拡張する前提で、今回は常に1.0固定 */
    getWorldRewardModifier() {
      return 1.0;
    }
  }

  G.WorldStabilityManager = WorldStabilityManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
