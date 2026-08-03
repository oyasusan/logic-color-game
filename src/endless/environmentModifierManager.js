/**
 * environmentModifierManager.js
 * STEP30-2「Environment Modifier System」。STEP30-1で追加したWorldEnvironment
 * （見た目テーマのみ）を、実際にPuzzle/Reward/Protocol/Map/Unknown/Riskへ影響する
 * システムへ拡張する管理クラス。
 *
 * 要求仕様セクション8「Modifier Calculation Layer」の方針どおり、各システム
 * （mapGenerator.js/endlessGame.js/mapUI.js/unknownEvents.js/endless.js）は
 * WorldEnvironmentの`modifiers[]`を直接読まず、必ずこのクラス経由で値を取得する。
 * 状態は持たず、現在Environmentの参照はworldEnvironmentManagerへ委譲する
 * （metaProgression.js/identityManager.jsと同じ設計）。
 *
 * 各Modifierの`target`（puzzle/reward/protocol/map/unknown/risk）ごとの適用箇所は
 * README「STEP30-2」参照。'unknown'targetのうち`rewardPredictionAccuracy`/
 * `aiConfidencePenalty`の2つは、AI Analysis Panelの表示精度を意図した純粋に
 * 認知的（cosmetic）な効果のため、既存のaiAnalysis.js計算式そのものには手を
 * 加えず、ENVIRONMENT ANALYSISパネルでの表示のみに用いる（README参照）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { WorldEnvironment } = G;

  class EnvironmentModifierManager {
    /** @param {Object} deps @param {Object} deps.worldEnvironmentManager WorldEnvironmentManagerインスタンス */
    constructor({ worldEnvironmentManager }) {
      this.worldEnvironmentManager = worldEnvironmentManager;
    }

    /**
     * @returns {Array<Object>} 現在EnvironmentのModifier一覧。
     *   'randomModifier'タイプ（UNKNOWN DIMENSIONの"Random Modifier"）は、
     *   呼ぶたびに他Environmentから1つ実体を無作為抽選して差し替えて返す
     *   （既存の「Unstable System」Research Environmentと同じ設計思想）。
     */
    getActiveModifiers() {
      const env = this.worldEnvironmentManager.getCurrentEnvironment();
      return (env.modifiers || []).map(m => (m.type === 'randomModifier' ? this._resolveRandomModifier(env) : m)).filter(Boolean);
    }

    /** @returns {Object|null} 他Environmentのmodifiersから無作為に1つ借用する */
    _resolveRandomModifier(currentEnv) {
      const candidates = WorldEnvironment.ALL
        .filter(e => e.id !== currentEnv.id)
        .flatMap(e => (e.modifiers || []).filter(m => m.type !== 'randomModifier'));
      if (candidates.length === 0) return null;
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    /** @param {string} type @returns {number} 現在Active中のModifierのうち、指定typeのvalue合計 */
    getModifierValue(type) {
      return this.getActiveModifiers().reduce((sum, m) => sum + (m.type === type && typeof m.value === 'number' ? m.value : 0), 0);
    }

    /** ---------------- 要求仕様セクション2の必須API ---------------- */

    /**
     * Puzzle System Integration（要求仕様セクション4）。
     * @param {{timeLimitMultiplier?:number, hintRevealBonus?:number}} data
     * @returns {{timeLimitMultiplier:number, hintRevealBonus:number}}
     */
    applyPuzzleModifier(data) {
      data = data || {};
      // Puzzle Difficulty +X%は、既存のTier/emptyRatio安全域（実測ベースで厳密に
      // チューニング済み、puzzleTier.js参照）を直接動かすと生成タイムアウトの
      // リスクがあるため、代わりに制限時間を短縮する既存の仕組み（Elite Nodeの
      // Time Pressure Modifierが使うtimeLimitMultiplierScaleと同じレバー）に
      // 乗せて「実質的な難易度上昇」を実現している
      const difficultyValue = this.getModifierValue('puzzleDifficulty');
      const hintBonus = this.getModifierValue('hintRevealBonus');
      return {
        timeLimitMultiplier: (data.timeLimitMultiplier != null ? data.timeLimitMultiplier : 1) * Math.max(0.5, 1 - difficultyValue),
        hintRevealBonus: (data.hintRevealBonus || 0) + hintBonus
      };
    }

    /**
     * Reward System Integration（要求仕様セクション5）。
     * @param {{reward?:number, researchData?:number}} data
     * @returns {{reward:number, researchData:number}}
     */
    applyRewardModifier(data) {
      data = data || {};
      const rewardMultiplier = 1 + this.getModifierValue('rewardMultiplier');
      const researchDataMultiplier = 1 + this.getModifierValue('researchDataMultiplier');
      return {
        reward: Math.round((data.reward || 0) * rewardMultiplier),
        researchData: Math.round((data.researchData || 0) * researchDataMultiplier)
      };
    }

    /**
     * Protocol System Integration（要求仕様セクション6）。
     * @param {{fragmentAmount?:number}} data
     * @returns {{fragmentAmount:number}}
     */
    applyProtocolModifier(data) {
      data = data || {};
      const fragmentMultiplier = 1 + this.getModifierValue('protocolFragmentMultiplier');
      return { fragmentAmount: Math.round((data.fragmentAmount || 0) * fragmentMultiplier) };
    }

    /** ---------------- Map/Risk向けの追加ヘルパー（target:'map'/'risk'の適用先） ---------------- */

    /** @param {string} nodeType 'puzzle'|'event'|'elite'|'recovery'|'unknown' @returns {number} mapGenerator.jsの重みに掛ける倍率 */
    getNodeWeightMultiplier(nodeType) {
      return 1 + this.getModifierValue(`nodeWeightMultiplier_${nodeType}`);
    }

    /** NEURAL FORESTの「Research Lab Spawn +15%」: 通常周期(3Depthごと)とは別に、追加でLabが出現する確率 */
    getExtraLabChance() {
      return Math.max(0, this.getModifierValue('extraLabChance'));
    }

    /** NEURAL FORESTの「Life Recovery +1」: Recovery Nodeでの回復量への加算 */
    getLifeRecoveryBonus() {
      return Math.round(this.getModifierValue('lifeRecoveryBonus'));
    }

    /** FRACTAL COREの「Risk Chain Bonus +20%」: riskChain.getMultiplier()にさらに掛ける倍率 */
    getRiskChainBonusMultiplier() {
      return 1 + this.getModifierValue('riskChainBonus');
    }

    /** QUANTUM NETWORKの「Rare Reward +20%」: unknownEvents.pickEvent()のRare Upgrade重み補正に使う */
    getRareEventWeightBoost() {
      return Math.max(0, this.getModifierValue('rareEventWeightBoost'));
    }

    /** NEURAL FORESTの「Unknown Analysis Success +10%」: unknownEvents.pickEvent()のSystem Corruption抑制に使う */
    getUnknownSuccessBoost() {
      return Math.max(0, this.getModifierValue('unknownSuccessBoost'));
    }
  }

  G.EnvironmentModifierManager = EnvironmentModifierManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
