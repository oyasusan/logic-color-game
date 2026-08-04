/**
 * aiDirector.js
 * STEP31「AI Director System」。研究施設を統括するAIを実装する。要求仕様の
 * アーキテクチャルール（セクション14）どおり、ゲームシステム全体を直接制御せず、
 * 各Manager（endlessGame.js/environmentEventManager.js/worldMutationManager.js/
 * endless.js reward計算）へ「推奨値」を提供するだけのCoordinatorとして設計した。
 *
 * 【禁止事項の守り方（要求仕様セクション14）】
 *   - Puzzle直接変更: しない。Adaptive Difficultyは既存の全Difficulty系システム
 *     （Fractal Core Modifier/Fractal Overflow Mutation/Fractal Shift Event/
 *     Simulation Zero Hidden）と全く同じ「制限時間短縮/延長」レバー
 *     （`getDirectorPuzzleTimeLimitMultiplier()`）のみで表現し、Puzzle Generator/
 *     DifficultyManagerのTier・density計算には一切触れない
 *   - Reward直接変更: しない。`getDirectorRewardModifier()`等は既存のReward計算
 *     チェーン（endless.js `_handleRoundClear`）へ、Environment/Mutation/Event/
 *     Hiddenと全く同じ「独立した乗数を1つ追加する」形でのみ関与する
 *   - Environment直接変更: しない。`recommendEnvironment()`はPlayerProfileから
 *     導いた「推薦」を返すだけの読み取り専用APIで、WorldEnvironment/Research
 *     Environmentの実際の選択・重み計算ロジックには一切書き込まない
 *     （推薦内容はAIログ・Run Reportを通じてプレイヤーへ提示されるのみ）
 *
 * RUN-scoped状態（Personality/PlayerProfileはRUNをまたいで永続、それ以外は
 * reset()でRUNごとに初期化）とセーブへの委譲（endlessSave.jsのplayerProfile/
 * directorProfile/directorLogs/directorPersonalityId）を分離している。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { PlayerProfile, DirectorPersonality, DirectorDialogue } = G;

  // Adaptive Difficulty（要求仕様セクション5）のスコア境界値。要求仕様に数値指定が
  // 無かったため、score(概ね-5〜+4の範囲を取りうる)を4段階へ振り分ける設計にした
  const DIFFICULTY_THRESHOLDS = { EXTREME: 3, HARD: 1, EASY: -2 };
  const DIFFICULTY_TIME_MULTIPLIER = { easy: 1.15, normal: 1.0, hard: 0.9, extreme: 0.8 };

  // 「長時間Eventなし」判定に使うLayer数。要求仕様に数値指定が無かったため設計した
  const EVENT_STARVED_LAYER_THRESHOLD = 5;
  const EVENT_STARVED_RATE_BONUS = 0.05;

  // 「5連敗」等、苦戦時のReward Recommendation発動閾値（要求仕様セクション9の例どおり）
  const STRUGGLE_MISS_STREAK = 5;
  const STRUGGLE_RESEARCH_DATA_BONUS = 0.20;
  const STRUGGLE_RARE_REWARD_BONUS = 0.15;
  const STRUGGLE_REWARD_BONUS = 0.10;

  class AIDirector {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス */
    constructor({ save }) {
      this.save = save;
      this.personality = DirectorPersonality.getById(save.getDirectorPersonalityId());
      this._resetRunState();
    }

    _resetRunState() {
      this.state = { difficulty: 'normal', personality: this.personality.id, currentGoal: 'OBSERVING', recommendation: null };
      this._consecutiveMisses = 0;
      this._layersSinceLastEvent = 0;
      this._runEnvironmentCounts = {};
      this._runProtocolCounts = {};
    }

    /** RUN開始時に呼ぶ。RUNスコープの内部状態のみ初期化する（PlayerProfile/Personalityは維持） */
    reset() {
      this._resetRunState();
    }

    getState() {
      return this.state;
    }

    getPersonality() {
      return this.personality;
    }

    getPlayerProfile() {
      return this.save.getPlayerProfile();
    }

    /** ---------------- 要求仕様セクション1「プレイヤー解析」 ---------------- */

    /** @param {{cleared:boolean, elapsedSeconds?:number, hintUsed?:boolean}} result endlessGame.jsのstats相当 */
    recordPuzzleResult(result) {
      this.save.setPlayerProfile(PlayerProfile.applyPuzzleResult(this.save.getPlayerProfile(), result));
      this._consecutiveMisses = result.cleared ? 0 : this._consecutiveMisses + 1;
    }

    /**
     * 選択されたNodeの脅威度・所属Environmentを解析する。
     * @param {{threatLevel?:number}} node aiAnalysis.jsで解析済みのNode
     * @param {string} [environmentId] このNode選択時の現在WorldEnvironment id
     */
    recordNodeSelection(node, environmentId) {
      if (typeof node.threatLevel === 'number') {
        this.save.setPlayerProfile(PlayerProfile.applyRiskSample(this.save.getPlayerProfile(), node.threatLevel));
      }
      if (environmentId) {
        this._runEnvironmentCounts[environmentId] = (this._runEnvironmentCounts[environmentId] || 0) + 1;
      }
    }

    /** @param {Array<string>} protocolIds 現在Active中のProtocol id一覧（Layer移動のたびに呼ぶ） */
    recordActiveProtocols(protocolIds) {
      (protocolIds || []).forEach(id => {
        this._runProtocolCounts[id] = (this._runProtocolCounts[id] || 0) + 1;
      });
    }

    /** RESULT画面「RETRY」クリック時に呼ぶ */
    recordRetry() {
      this.save.setPlayerProfile(PlayerProfile.applyRetry(this.save.getPlayerProfile()));
    }

    /** Environment Eventが実際に発生した瞬間に呼ぶ（Event Recommendationの基準リセット） */
    notifyEventTriggered() {
      this._layersSinceLastEvent = 0;
    }

    /**
     * Layer移動のたびに呼ぶ（要求仕様セクション5「AIは毎Layer更新」）。
     * Adaptive Difficulty・DirectorStateを再計算する。
     */
    updateLayer() {
      this._layersSinceLastEvent++;
      const profile = this.save.getPlayerProfile();
      this.state.difficulty = this._computeDifficulty(profile);
      this.state.recommendation = this.recommendEnvironment();
      this.state.currentGoal = this.state.difficulty !== 'normal'
        ? 'ADAPTING DIFFICULTY'
        : this.state.recommendation ? 'RECOMMENDING' : 'OBSERVING';
    }

    /** @returns {'easy'|'normal'|'hard'|'extreme'} 要求仕様セクション5の入力(Solve Time/Accuracy/Retry/Risk/Extract)を統合したスコアから判定する */
    _computeDifficulty(profile) {
      let score = 0;
      // averageSolveTime===0（このプロフィールでまだ1問もクリアしていない）の間は
      // solveAccuracy/mistakeRateの初期値（それぞれ1/0という楽観的なデフォルト）を
      // スコアへ反映しない。反映すると、実績が全く無い新規プレイヤーがLayer1から
      // いきなりhard/extreme判定になってしまうため（実際にテストで検出した）
      const hasClearData = profile.averageSolveTime > 0;
      if (hasClearData) {
        if (profile.averageSolveTime < PlayerProfile.BASELINE_SOLVE_TIME * 0.6) score += 1;
        else if (profile.averageSolveTime > PlayerProfile.BASELINE_SOLVE_TIME * 1.4) score -= 1;
        if (profile.solveAccuracy >= 0.8) score += 1;
        else if (profile.solveAccuracy <= 0.4) score -= 1;
        if (profile.mistakeRate >= 0.4) score -= 2;
        else if (profile.mistakeRate <= 0.1) score += 1;
      }
      if (profile.riskPreference >= 0.6) score += 1;
      else if (profile.riskPreference <= 0.2) score -= 1;
      if (profile.extractRate >= 0.5) score -= 1;
      // Retry: 生涯の再挑戦傾向が強いプレイヤーほど、難易度を上げすぎない方向へ補正する
      if ((profile.retryCount || 0) >= 10) score -= 1;

      score *= this.personality.tuning.difficultyAggressiveness;

      if (score >= DIFFICULTY_THRESHOLDS.EXTREME) return 'extreme';
      if (score >= DIFFICULTY_THRESHOLDS.HARD) return 'hard';
      if (score <= DIFFICULTY_THRESHOLDS.EASY) return 'easy';
      return 'normal';
    }

    /** ---------------- 要求仕様セクション5「Adaptive Difficulty」: PuzzleGeneratorへの希望伝達 ---------------- */

    /**
     * 「直接Puzzleを書き換えない」という要求仕様の制約を守るため、既存の全Difficulty系
     * システムと同じ「制限時間短縮/延長」レバーとして希望Difficultyを伝える
     * （endlessGame.js側でFractal Core Modifier等と全く同じ扱いで乗算されるだけ）
     */
    getDirectorPuzzleTimeLimitMultiplier() {
      return DIFFICULTY_TIME_MULTIPLIER[this.state.difficulty] || 1.0;
    }

    /** ---------------- 要求仕様セクション6「Environment Recommendation」 ---------------- */

    /**
     * PlayerProfileから推奨Environmentを1つ導く（読み取り専用。実際のEnvironment選択
     * ロジックには一切書き込まない）。要求仕様セクション6の3例をそのまま判定に採用した。
     * @returns {{id:string, name:string, reason:string}|null}
     */
    recommendEnvironment() {
      const profile = this.save.getPlayerProfile();
      if (profile.extractRate >= 0.4) {
        return { id: 'env_ocean', name: 'DATA OCEAN', reason: '慎重な研究傾向を検知。' };
      }
      if (profile.riskPreference >= 0.6) {
        return { id: 'env_fractal', name: 'FRACTAL CORE', reason: '高いリスク許容度を検知。' };
      }
      if (Object.keys(profile.protocolTally || {}).length >= 3) {
        return { id: 'env_forest', name: 'NEURAL FOREST', reason: 'Protocol重視の研究傾向を検知。' };
      }
      return null;
    }

    /** ---------------- 要求仕様セクション7「Event Recommendation」 ---------------- */

    /** @returns {number} EnvironmentEventManager.checkEventTrigger()のcontext.directorRateBonusへ渡す加算値 */
    getEventTriggerRateBonus() {
      if (this._layersSinceLastEvent < EVENT_STARVED_LAYER_THRESHOLD) return 0;
      return EVENT_STARVED_RATE_BONUS * this.personality.tuning.eventBias;
    }

    /** ---------------- 要求仕様セクション8「Mutation Recommendation」 ---------------- */

    /**
     * @returns {{boost:boolean, suppress:boolean}} worldMutationManager.checkMutationTrigger()の
     *   context.directorBoost/context.directorSuppressへ渡す
     */
    getMutationTriggerBias() {
      const profile = this.save.getPlayerProfile();
      const bias = this.personality.tuning.mutationBias;
      if (bias <= 0.3) return { boost: false, suppress: false }; // OBSERVER: 不介入
      return {
        // プレイヤーが簡単すぎる（高精度・低ミス）→Mutation発生率+
        boost: profile.solveAccuracy >= 0.8 && profile.mistakeRate <= 0.1 && bias >= 0.7,
        // 苦戦中（高ミス率）→Mutation抑制
        suppress: profile.mistakeRate >= 0.4
      };
    }

    /** ---------------- 要求仕様セクション9「Reward Recommendation」 ---------------- */

    /** @returns {number} 5連敗等の苦戦時のみ1より大きい値（要求仕様セクション9の例どおり） */
    getDirectorRewardModifier() {
      if (this._consecutiveMisses >= STRUGGLE_MISS_STREAK) {
        return 1 + STRUGGLE_REWARD_BONUS * this.personality.tuning.rewardBias;
      }
      return 1.0;
    }

    getDirectorResearchDataMultiplier() {
      if (this._consecutiveMisses >= STRUGGLE_MISS_STREAK) {
        return 1 + STRUGGLE_RESEARCH_DATA_BONUS * this.personality.tuning.rewardBias;
      }
      return 1.0;
    }

    getDirectorRareEventWeightBoost() {
      if (this._consecutiveMisses >= STRUGGLE_MISS_STREAK) {
        return Math.max(0, STRUGGLE_RARE_REWARD_BONUS * this.personality.tuning.rewardBias);
      }
      return 0;
    }

    /** ---------------- 要求仕様セクション10「Dialogue System」/ AIログ生成 ---------------- */

    /**
     * @param {'layerStart'|'mutation'|'extract'|'hiddenFound'|'bossBefore'|'bossAfter'|'runEnd'} trigger
     * @returns {string} 現在Personalityの一言（同時にAIログへ記録する）
     */
    getDialogue(trigger) {
      const line = DirectorDialogue.getLine(this.personality.id, trigger);
      if (line) {
        this.save.recordDirectorLog({ trigger, personality: this.personality.id, line });
      }
      return line;
    }

    getRecentLogs() {
      return this.save.getDirectorLogs();
    }

    /** ---------------- 要求仕様セクション12「Run Report」 ---------------- */

    /**
     * RUN終了時に呼ぶ。このRUNの訪問Environment/所持Protocolのタリーを生涯データへ
     * 合算し、PlayerProfileを確定させた上でRun Reportを生成・保存する。
     * @param {{extracted:boolean}} runSummary
     * @returns {{averageSolveTime:number, accuracy:number, risk:number,
     *   favoriteEnvironment:string|null, recommendation:Object|null}}
     */
    finalizeRun(runSummary) {
      const updatedProfile = PlayerProfile.applyRunEnd(this.save.getPlayerProfile(), {
        extracted: !!(runSummary && runSummary.extracted),
        environmentCounts: this._runEnvironmentCounts,
        protocolCounts: this._runProtocolCounts
      });
      this.save.setPlayerProfile(updatedProfile);

      const report = {
        averageSolveTime: Math.round(updatedProfile.averageSolveTime),
        accuracy: updatedProfile.solveAccuracy,
        risk: updatedProfile.riskPreference,
        favoriteEnvironment: updatedProfile.favoriteEnvironment,
        recommendation: this.recommendEnvironment(),
        difficulty: this.state.difficulty
      };
      this.save.recordDirectorReport(report);
      return report;
    }
  }

  G.AIDirector = AIDirector;
})(typeof globalThis !== 'undefined' ? globalThis : this);
