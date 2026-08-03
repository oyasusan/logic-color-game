/**
 * environmentEventManager.js
 * STEP30-6「Environment Event System」。現在のWorldEnvironment（worldEnvironmentManager.js、
 * STEP30-1）に紐づく一時的なResearch Event（environmentEventData.js参照）の抽選・開始・
 * 効果集計・終了・履歴管理を行う。worldMutationManager.js（STEP30-5）と同じ
 * 「Modifier Calculation Layer」設計を踏襲し、各システムはEventのeffectsを直接読まず
 * 必ずこのクラス経由で値を取得する。
 *
 * `activeEvent`はworldMutationManager.jsのactiveMutationと同じ「RUNごとにreset()される
 * 今RUNの現在値」（LocalStorageには保存しない、揮発性の状態）。`eventHistory`/
 * `discoveredEvents`はRUNをまたいで蓄積する生涯データとしてendlessSave.jsへ完全に委譲する。
 *
 * checkEventTrigger()（副作用無しの確認のみ）とtriggerEvent()（実際に発生させる副作用）を
 * 意図的に分離している（worldMutationManager.jsのcheckMutationTrigger/triggerMutationと
 * 同じ設計判断）。
 *
 * Duration/Archive設計（要求仕様に数値・詳細指定が無かった箇所）:
 *   - 全Eventはduration=1（environmentEventData.js参照）で、次のLayer移動の
 *     tickDuration()で自動終了する。Instant系効果（forceLabSpawn等、
 *     environmentEventData.INSTANT_EFFECT_TYPES）はendless.js側が効果適用と
 *     同時にresolveEvent()を呼ぶため、tickDuration()を待たず即座に終了する
 *   - Passive Modifier系効果（rewardMultiplier等）を持つEventは、そのLayerの
 *     Puzzle/Node解決を跨いでActiveのままにし、`addRewardContribution()`で
 *     endless.js側から実際の増分スコアを積算してもらい、tickDuration()による
 *     自動終了時にその積算値をbestRewardとしてArchiveへ記録する
 *   - Choice Event（Unknown Signal）はプレイヤーの選択確定（resolveEvent(choiceId, rewardValue)）
 *     で即座に終了する
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { EnvironmentEventData } = G;

  // 発生率（要求仕様セクション3どおり。「Normal: 5〜10%」は具体的な単一値の指定が
  // 無かったため中央値0.08を採用した）
  const BASE_TRIGGER_RATE = 0.08;
  const MUTATION_ACTIVE_TRIGGER_RATE = 0.20;
  const STABILITY_CRITICAL_TRIGGER_RATE = 0.15;

  class EnvironmentEventManager {
    /**
     * @param {Object} deps
     * @param {Object} deps.save EndlessSaveStoreインスタンス
     * @param {Object} deps.worldEnvironmentManager WorldEnvironmentManagerインスタンス
     */
    constructor({ save, worldEnvironmentManager }) {
      this.save = save;
      this.worldEnvironmentManager = worldEnvironmentManager;
      // worldMutationManager.jsと同じく、直近の保存済みスナップショットを初期値として引き継ぐ
      // （新規RUN開始時は必ずreset()でnullへ戻すため、実プレイ上の見え方は変わらない）
      const savedId = this.save.getActiveEnvironmentEventId();
      this._activeEvent = savedId ? EnvironmentEventData.getById(savedId) : null;
      this._remainingDuration = this._activeEvent ? this._activeEvent.duration : 0;
      this._accumulatedReward = 0; // Passive Modifier系Eventの、Active中に実際に生んだ増分スコアの積算
    }

    /** RUN開始時に呼ぶ。Active中のEventを解除する（生涯データのeventHistory等はリセットしない） */
    reset() {
      this._activeEvent = null;
      this._remainingDuration = 0;
      this._accumulatedReward = 0;
      this.save.setActiveEnvironmentEventId(null);
    }

    /** ---------------- 要求仕様セクション1の必須API ---------------- */

    /**
     * Event発生判定（副作用無し）。
     * @param {{mutationActive?:boolean, stabilityStatus?:string}} [context]
     * @returns {Object|null} 発生させるべきEvent定義（無ければnull）。既にActive中のEventが
     *   あれば常にnullを返す（多重発生防止、worldMutationManagerと同じ設計）
     */
    checkEventTrigger(context) {
      if (this._activeEvent) return null;
      context = context || {};

      let rate = BASE_TRIGGER_RATE;
      if (context.mutationActive) rate = Math.max(rate, MUTATION_ACTIVE_TRIGGER_RATE);
      if (context.stabilityStatus === 'CRITICAL') rate = Math.max(rate, STABILITY_CRITICAL_TRIGGER_RATE);

      if (Math.random() >= rate) return null;

      const env = this.worldEnvironmentManager.getCurrentEnvironment();
      return EnvironmentEventData.pickForEnvironment(env.id);
    }

    /**
     * Event開始（副作用あり）。
     * @param {string} id environmentEventData.jsのEvent id
     * @param {{run?:number, layer?:number}} [historyContext] Archive/履歴記録用
     * @returns {Object|null} 発生したEvent定義（不正なidならnull）
     */
    triggerEvent(id, historyContext) {
      const def = EnvironmentEventData.getById(id);
      if (!def) return null;
      historyContext = historyContext || {};

      this._activeEvent = def;
      this._remainingDuration = def.duration;
      this._accumulatedReward = 0;
      this.save.setActiveEnvironmentEventId(def.id);

      this.save.recordDiscoveredEnvironmentEvent(def.id);
      this.save.recordEnvironmentEventHistory({
        run: historyContext.run || 0,
        layer: historyContext.layer || 0,
        eventId: def.id,
        name: def.name,
        environment: def.environment,
        result: def.choices ? 'Pending' : 'Triggered'
      });
      return def;
    }

    getActiveEvent() {
      return this._activeEvent;
    }

    /**
     * Event終了（副作用あり）。resolveEvent()単独呼び出し（引数無し）にも対応するが、
     * Choice Eventの選択結果・Archive用bestRewardを併せて記録できるよう拡張した。
     * @param {string} [choiceId] Choice Eventの場合の選択id（'yes'/'no'等）。通常Eventはundefined
     * @param {number} [rewardValue] Archiveのbest reward更新に使う、この発生1回で実際に得た価値
     *   （Instant効果は付与量そのもの、Passive Modifier効果はaddRewardContribution()の積算値）
     */
    resolveEvent(choiceId, rewardValue) {
      if (!this._activeEvent) return;
      const def = this._activeEvent;
      const value = typeof rewardValue === 'number' ? rewardValue : this._accumulatedReward;

      this.save.recordEnvironmentEventHistory({
        eventId: def.id,
        name: def.name,
        environment: def.environment,
        result: choiceId ? `Resolved:${choiceId}` : 'Resolved'
      });
      this.save.recordEnvironmentEventArchive(def.id, def.environment, value);

      this._activeEvent = null;
      this._remainingDuration = 0;
      this._accumulatedReward = 0;
      this.save.setActiveEnvironmentEventId(null);
    }

    /** Layer移動のたびに呼ぶ。持続ターンを1消費し、尽きたら自動的にresolveEvent()する */
    tickDuration() {
      if (!this._activeEvent) return;
      this._remainingDuration--;
      if (this._remainingDuration <= 0) this.resolveEvent();
    }

    getEventHistory() {
      return this.save.getEnvironmentEventHistory();
    }

    /** ---------------- Passive Modifier系Eventの積算（Archive用bestReward計算） ---------------- */

    /** @param {number} delta この1回のPuzzle/Node解決でEvent Modifierが実際に生んだ増分（researchData等も含めてよい） */
    addRewardContribution(delta) {
      if (!this._activeEvent) return;
      this._accumulatedReward += Math.max(0, delta || 0);
    }

    /** ---------------- 効果集計（worldMutationManager.jsと同じ規約） ---------------- */

    _effectTotal(type) {
      if (!this._activeEvent || !this._activeEvent.effects) return 0;
      return this._activeEvent.effects.reduce((sum, e) => sum + (e.type === type ? e.value : 0), 0);
    }

    /** Reward System Integration（要求仕様セクション12）。Event未発生時は必ず1.0 */
    getEventRewardModifier() {
      return 1 + this._effectTotal('rewardMultiplier');
    }

    getEventResearchDataMultiplier() {
      return 1 + this._effectTotal('researchDataMultiplier');
    }

    getEventProtocolFragmentMultiplier() {
      return 1 + this._effectTotal('protocolFragmentMultiplier');
    }

    getEventHintRevealBonus() {
      return Math.round(this._effectTotal('hintRevealBonus'));
    }

    /** FRACTAL SHIFTの「Puzzle Difficulty」: 既存のPuzzle Difficulty同様、制限時間短縮として適用する */
    getEventPuzzleTimeLimitMultiplier() {
      return Math.max(0.5, 1 - this._effectTotal('puzzleDifficulty'));
    }

    /** SIGNAL INTERFERENCEの「Rare Reward +50%」: unknownEvents.pickEvent()のrareBoostへ合算する */
    getEventRareEventWeightBoost() {
      return Math.max(0, this._effectTotal('rareEventWeightBoost'));
    }

    /** GRID OPTIMIZATIONの「AI Prediction +20%」: mapUI.jsのUnknown Node事前解析確率へ合算する */
    getEventUnknownRevealChanceBonus() {
      return Math.max(0, this._effectTotal('unknownRevealChance'));
    }

    /** ---------------- Instant系効果の判定ヘルパー（endless.js側の分岐に使う） ---------------- */

    /** @returns {boolean} 現在ActiveなEventがChoice Event（choices持ち）か */
    isChoiceEvent() {
      return !!(this._activeEvent && this._activeEvent.choices);
    }

    /** @param {string} type INSTANT_EFFECT_TYPESのいずれか @returns {Object|null} 現在ActiveなEventがそのInstant効果を持つ場合のみその効果定義 */
    getInstantEffect(type) {
      if (!this._activeEvent || !this._activeEvent.effects) return null;
      return this._activeEvent.effects.find(e => e.type === type) || null;
    }
  }

  G.EnvironmentEventManager = EnvironmentEventManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
