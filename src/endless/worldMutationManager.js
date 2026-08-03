/**
 * worldMutationManager.js
 * STEP30-5「World Mutation Trigger System」。World Stabilityの低下（worldStabilityManager.js、
 * STEP30-4）によってResearch World自体が変質する「Mutation」を管理する。
 *
 * Environment → Modifier → Stability → Mutation → 変化したWorld、という一連の
 * パイプラインの最後の段。既存のenvironmentModifierManager.js（STEP30-2）と同じ
 * 「Modifier Calculation Layer」設計を踏襲し、各システムはMutationのeffectsを
 * 直接読まず必ずこのクラス経由で値を取得する。
 *
 * `activeMutation`自体はworldStabilityManager.jsのstabilityと同じ設計判断で
 * 「RUNごとにreset()される今RUNの現在値」（値はendlessSave.jsへスナップショット
 * 保存する）。`mutationHistory`はRUNをまたいで蓄積する生涯データ（Archive
 * Integration、要求仕様セクション14）として完全にendlessSave.jsへ委譲する。
 *
 * checkMutationTrigger()とtriggerMutation()を意図的に分離している:
 *   - checkMutationTrigger(): 現在の状況が発生条件を満たすかどうかの「確認」のみ
 *     行い、副作用を一切持たない（0〜3の水準を返すだけ）
 *   - triggerMutation(idOrLevel): 実際にMutationを「発生」させる副作用を持つ
 * これにより、endless.js側でLevel1/2は「Mutation Choice Event」（要求仕様セクション11、
 * Stabilize/Exploitの選択）を挟んでからtriggerMutation()を呼ぶ、Level3は
 * 問答無用でtriggerMutation()を呼ぶ、という分岐を自然に実装できる。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { MutationData, WorldEnvironment } = G;

  // 追加Trigger（要求仕様セクション4）の閾値。要求仕様に具体的な数値指定が無かったため設計した
  const CONSECUTIVE_UNKNOWN_ANALYSES_THRESHOLD = 3;
  const HIGH_RISK_CHAIN_THRESHOLD = 4;

  // Mutation Choice Eventの「Exploit」選択時のボーナス倍率（要求仕様に数値指定が無かったため設計）
  const EXPLOIT_REWARD_BONUS_MULTIPLIER = 1.5;
  const EXPLOIT_RISK_BONUS_MULTIPLIER = 1.2;

  class WorldMutationManager {
    /**
     * @param {Object} deps
     * @param {Object} deps.save EndlessSaveStoreインスタンス
     * @param {Object} deps.worldStabilityManager WorldStabilityManagerインスタンス
     * @param {Object} deps.worldEnvironmentManager WorldEnvironmentManagerインスタンス
     */
    constructor({ save, worldStabilityManager, worldEnvironmentManager }) {
      this.save = save;
      this.worldStabilityManager = worldStabilityManager;
      this.worldEnvironmentManager = worldEnvironmentManager;

      const savedId = this.save.getActiveMutationId();
      this._activeMutation = savedId ? MutationData.getById(savedId) : null;
      this._remainingDuration = this._activeMutation ? this._activeMutation.duration : 0;
      this._exploitBonusActive = false;
      this._randomModifierCache = null; // NEURAL INFECTIONで一度だけ抽選し、持続中は固定して保持する
    }

    /** RUN開始時に呼ぶ。Active中のMutationを解除する（生涯データのmutationHistoryはリセットしない） */
    reset() {
      this._activeMutation = null;
      this._remainingDuration = 0;
      this._exploitBonusActive = false;
      this._randomModifierCache = null;
      this.save.setActiveMutationId(null);
      this.save.setMutationLevel(0);
    }

    /** ---------------- Trigger判定・発生・解除 ---------------- */

    /**
     * @param {{consecutiveUnknownAnalyses?:number, riskChainLevel?:number,
     *   inUnknownDimension?:boolean, specialEventTriggered?:boolean}} [context]
     * @returns {number} 0〜3。新たにMutationを発生させるべき水準
     *   （既にMutationがActive中なら多重発生させないよう常に0を返す）
     */
    checkMutationTrigger(context) {
      if (this._activeMutation) return 0;
      context = context || {};

      const stability = this.worldStabilityManager.getStability();
      let level = 0;
      if (stability <= MutationData.STABILITY_THRESHOLDS.LEVEL3) level = 3;
      else if (stability <= MutationData.STABILITY_THRESHOLDS.LEVEL2) level = 2;
      else if (stability <= MutationData.STABILITY_THRESHOLDS.LEVEL1) level = 1;

      // 追加Trigger（要求仕様セクション4）: Stability単体ではまだLevel1に届いていない
      // 状況でも、危険な兆候が重なればLevel1相当の機会を与える
      if (level === 0) {
        if ((context.consecutiveUnknownAnalyses || 0) >= CONSECUTIVE_UNKNOWN_ANALYSES_THRESHOLD) level = 1;
        else if (context.inUnknownDimension) level = 1;
        else if ((context.riskChainLevel || 0) >= HIGH_RISK_CHAIN_THRESHOLD) level = 1;
        else if (context.specialEventTriggered) level = 1;
      }
      return level;
    }

    /**
     * @param {string|number} idOrLevel Mutation idを直接指定するか、水準(1〜3)を渡して
     *   その水準からランダムに1つ選ぶ
     * @param {{run?:number, layer?:number}} [historyContext] Archive記録用
     * @returns {Object|null} 発生したMutation定義（不正な指定ならnull）
     */
    triggerMutation(idOrLevel, historyContext) {
      const def = typeof idOrLevel === 'string' ? MutationData.getById(idOrLevel) : MutationData.pickRandomForLevel(idOrLevel);
      if (!def) return null;
      historyContext = historyContext || {};

      this._activeMutation = def;
      this._remainingDuration = def.duration;
      this._exploitBonusActive = false;
      this._randomModifierCache = def.id === 'neural_infection' ? this._rollRandomEnvironmentModifier() : null;

      this.save.setActiveMutationId(def.id);
      this.save.setMutationLevel(def.level);
      this.save.recordMutationHistory({
        run: historyContext.run || 0,
        layer: historyContext.layer || 0,
        mutation: def.name,
        level: def.level,
        result: 'Triggered'
      });
      return def;
    }

    /** @param {{run?:number, layer?:number, result?:string}} [historyContext] 解除理由（Archive記録用、省略時'Cleared'） */
    clearMutation(historyContext) {
      if (!this._activeMutation) return;
      historyContext = historyContext || {};
      this.save.recordMutationHistory({
        run: historyContext.run || 0,
        layer: historyContext.layer || 0,
        mutation: this._activeMutation.name,
        level: this._activeMutation.level,
        result: historyContext.result || 'Cleared'
      });
      this._activeMutation = null;
      this._remainingDuration = 0;
      this._exploitBonusActive = false;
      this._randomModifierCache = null;
      this.save.setActiveMutationId(null);
      this.save.setMutationLevel(0);
    }

    /** Layer移動のたびに呼ぶ。持続ターンを1消費し、尽きたら自動的に解除する */
    tickDuration(historyContext) {
      if (!this._activeMutation) return;
      this._remainingDuration--;
      if (this._remainingDuration <= 0) {
        this.clearMutation(Object.assign({ result: 'Expired' }, historyContext));
      }
    }

    /** Mutation Choice Event（要求仕様セクション11）の「Exploit」選択時に呼ぶ */
    markExploitBonus() {
      this._exploitBonusActive = true;
    }

    getActiveMutation() {
      return this._activeMutation;
    }

    getMutationLevel() {
      return this._activeMutation ? this._activeMutation.level : 0;
    }

    getMutationHistory() {
      return this.save.getMutationHistory();
    }

    /** ---------------- Environment Integration（要求仕様セクション9） ---------------- */

    /** @returns {{baseEnvironment:string, mutation:string|null}} */
    getEnvironmentState() {
      return {
        baseEnvironment: this.worldEnvironmentManager.getCurrentEnvironment().id,
        mutation: this._activeMutation ? this._activeMutation.id : null
      };
    }

    /** @returns {string} HUD等に表示する、Mutation反映済みのEnvironment表示名（例: "CORRUPTED DATA OCEAN"） */
    getDisplayEnvironmentName() {
      const baseName = this.worldEnvironmentManager.getCurrentEnvironment().name;
      const prefix = this._activeMutation && this._activeMutation.environmentEffect
        ? this._activeMutation.environmentEffect.namePrefix : null;
      return prefix ? `${prefix} ${baseName}` : baseName;
    }

    /** ---------------- 効果集計（environmentModifierManager.jsと同じ規約） ---------------- */

    _effectTotal(type) {
      if (!this._activeMutation) return 0;
      return this._activeMutation.effects.reduce((sum, e) => sum + (e.type === type ? e.value : 0), 0);
    }

    /** @param {string} nodeType 'puzzle'|'event'|'elite'|'recovery'|'unknown' */
    getNodeWeightMultiplier(nodeType) {
      const key = `nodeWeightMultiplier_${nodeType}`;
      return 1 + this._effectTotal(key) + this.getExtraModifierValue(key);
    }

    /** QUANTUM COLLAPSEの「Map Node Shuffle」: 分岐候補数の追加 */
    getExtraMapChoices() {
      return Math.round(this._effectTotal('extraMapChoices'));
    }

    /** FRACTAL OVERFLOWの「Puzzle Difficulty +30%」: 既存のPuzzle Difficulty同様、制限時間短縮として適用する */
    getPuzzleTimeLimitMultiplier() {
      return Math.max(0.5, 1 - this._effectTotal('puzzleDifficulty'));
    }

    /**
     * @returns {number} 要求仕様セクション12「Reward Integration Hook」。
     *   Mutation未発生時は必ず1.0（要求仕様どおり）
     */
    getMutationRewardModifier() {
      let modifier = 1 + this._effectTotal('rewardMultiplier') + this.getExtraModifierValue('rewardMultiplier');
      if (this._exploitBonusActive) modifier *= EXPLOIT_REWARD_BONUS_MULTIPLIER;
      return modifier;
    }

    getResearchDataMultiplier() {
      return 1 + this._effectTotal('researchDataMultiplier');
    }

    /** NEURAL INFECTIONの「Protocol Drop +40%」 */
    getProtocolFragmentMultiplier() {
      return 1 + this._effectTotal('protocolFragmentMultiplier') + this.getExtraModifierValue('protocolFragmentMultiplier');
    }

    /** SIGNAL NOISEの「Rare Reward +15%」: unknownEvents.pickEvent()のrareBoostへ合算する */
    getRareEventWeightBoost() {
      return Math.max(0, this._effectTotal('rareEventWeightBoost'));
    }

    /** REALITY BREAKの「Risk上昇」+ Exploit選択の「Risk Increase」 */
    getRiskChainBonusMultiplier() {
      let multiplier = 1 + this._effectTotal('riskChainBonus');
      if (this._exploitBonusActive) multiplier *= EXPLOIT_RISK_BONUS_MULTIPLIER;
      return multiplier;
    }

    /**
     * NEURAL INFECTIONの「Environment Modifier Random」。他Environmentのmodifiersから
     * 1つを無作為に借用する（environmentModifierManagerの"Random Modifier"と同じ設計
     * 思想）。呼ぶたびに再抽選すると値が不安定になるため、Mutation発生時に一度だけ
     * 抽選し、持続中は同じ結果を返し続ける
     */
    _rollRandomEnvironmentModifier() {
      const currentId = this.worldEnvironmentManager.getCurrentEnvironment().id;
      const candidates = WorldEnvironment.ALL
        .filter(e => e.id !== currentId)
        .flatMap(e => (e.modifiers || []).filter(m => m.type !== 'randomModifier'));
      if (candidates.length === 0) return null;
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    /** @returns {Object|null} NEURAL INFECTION発生中のみ、借用中のModifier定義を返す */
    getRandomEnvironmentModifier() {
      return this._randomModifierCache;
    }

    /** @param {string} type @returns {number} NEURAL INFECTIONで借用中のModifierが指定typeを持つ場合のみその値 */
    getExtraModifierValue(type) {
      const m = this._randomModifierCache;
      return (m && m.type === type && typeof m.value === 'number') ? m.value : 0;
    }
  }

  G.WorldMutationManager = WorldMutationManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
