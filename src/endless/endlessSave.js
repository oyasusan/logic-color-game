/**
 * endlessSave.js
 * ENDLESS RESEARCHのベスト記録をLocalStorageへ保存する。
 * 既存の progress.js（`logicColor.save.v2`、ステージ進行/星/EXP用）とは
 * 完全に別のキーを使い、既存のセーブ形式・移行処理には一切触れない。
 *
 * 【"highestDepth"について】 Phase3の要件で追加要求された`highestDepth`は、
 * 「これまでに到達した最も深いDepth」という意味では既存の`endlessBestDepth`
 * （Phase1から実装済み）と完全に同じ概念のため、同じ事実を保持する重複
 * フィールドを新設せず、`endlessBestDepth`をそのまま`highestDepth`要件の
 * 実装として扱っている（2つの値が食い違う不整合を避けるための判断）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const STORAGE_KEY = 'logicColor.endless.v1';

  function defaultData() {
    return {
      endlessBestDepth: 0,
      endlessBestScore: 0,
      totalRuns: 0,
      totalBossClear: 0,  // Phase3: 生涯Boss撃破回数の累計
      memoryFragments: 0, // Phase3: Memory Fragmentイベントで獲得した生涯累計数

      // ---- Phase C: Protocol Archive / Unlock / Fragment ----
      unlockedProtocols: ['explorer', 'analyst', 'overclock'], // 初期解放済み3種（protocols.js基本3種）
      protocolFragments: 0,       // Protocol Fragment生涯累計（Phase C時点では消費先未実装）
      discoveredProtocolCount: 3, // unlockedProtocols.lengthのミラー（Archive表示用）
      totalEventCount: 0,         // Chaosの解放条件(Event発生10回)判定用、生涯Event発生回数
      totalPerfectCount: 0,       // Precisionの解放条件(PERFECT100回)判定用、生涯PERFECTクリア回数

      // ---- Research Environment: Environment Archive / 発見記録 ----
      // 要求仕様の「unlockedEnvironment」は複数idを保持する配列のため、
      // unlockedProtocolsと表記を揃えて複数形(unlockedEnvironments)にしている
      unlockedEnvironments: [],   // 一度でも選んでRUNを開始したことがあるEnvironment id一覧（解放条件は無く、選べば発見扱い）
      discoveredEnvironmentCount: 0, // unlockedEnvironments.lengthのミラー（Archive表示用）

      // ---- Puzzle Evolution System: Puzzle Archive（履歴保存） ----
      puzzleHistory: [], // 直近PUZZLE_HISTORY_LIMIT件のPuzzle挑戦記録（新しい順ではなく古い順に追加、上限超過分は先頭から破棄）

      // ---- STEP27: AI Analysis Risk/Reward System ----
      discoveredUnknownEvents: [],   // ANALYZEで一度でも遭遇したUnknown Event id一覧（unknownEvents.js参照）
      researchDataTotal: 0,          // Research Dataの生涯累計EARNED（減らない。統計/Rank計算用）
      maxRiskChainMultiplierEver: 1, // 生涯で到達した最大Risk Chain倍率
      totalUnknownAnalysisCount: 0,  // 生涯のUnknown Node ANALYZE回数
      researchHistory: [],           // 直近RESEARCH_HISTORY_LIMIT件のRUNサマリー（古い順に追加）

      // ---- STEP28: Meta Progression / Permanent Research System ----
      permanentResearchData: 0,   // 現在の使用可能残高（researchDataTotalとは別で、購入すると減る）
      researchTreeLevels: {},     // { [researchTree.jsのid]: 購入済みレベル(0〜maxLevel) }
      unlockedTechnologies: [],   // Permanent Unlock Systemで解放済みの技術id一覧（metaProgression.js RANK_GATES参照）
      protocolEvolution: {},      // { [protocol id]: 進化段階(0=Basic/1=Advanced/2=Quantum) }
      secretsDiscovered: []       // Archive Expansion「Secrets」カウント用の発見済みsecret id一覧
    };
  }

  const PUZZLE_HISTORY_LIMIT = 100;    // 無制限に増え続けないよう、直近100件のみ保持する
  const RESEARCH_HISTORY_LIMIT = 50;   // STEP27: RUNサマリーの保持件数上限

  class EndlessSaveStore {
    constructor() {
      this.data = defaultData();
    }

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.data = Object.assign(defaultData(), JSON.parse(raw));
        }
      } catch (e) {
        console.warn('ENDLESS RESEARCHのセーブデータの読み込みに失敗しました。初期値を使用します。', e);
        this.data = defaultData();
      }
      return this.data;
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.warn('ENDLESS RESEARCHのセーブに失敗しました。', e);
      }
    }

    /**
     * 1回のRUN終了時に記録する。
     * @param {{depth:number, score:number, bossClearCount?:number, memoryFragmentsGained?:number,
     *   eventCountGained?:number, perfectCountGained?:number, protocolFragmentsGained?:number,
     *   researchDataGained?:number, riskChainMultiplierThisRun?:number, unknownAnalysisCountThisRun?:number}} result
     * @returns {{isNewBestDepth:boolean, isNewBestScore:boolean}}
     */
    recordRun(result) {
      this.data.totalRuns++;

      const isNewBestDepth = result.depth > this.data.endlessBestDepth;
      const isNewBestScore = result.score > this.data.endlessBestScore;
      if (isNewBestDepth) this.data.endlessBestDepth = result.depth;
      if (isNewBestScore) this.data.endlessBestScore = result.score;

      this.data.totalBossClear += result.bossClearCount || 0;
      this.data.memoryFragments += result.memoryFragmentsGained || 0;

      // Phase C: Protocol解放条件の集計用カウンタ・Protocol Fragment。
      // 解放判定自体はRUN中にendless.js側がライブに（このメソッドとは別経路で）行うため、
      // ここでは単純にRUN内で発生した分を生涯累計へ積み増すだけでよい
      this.data.totalEventCount += result.eventCountGained || 0;
      this.data.totalPerfectCount += result.perfectCountGained || 0;
      this.data.protocolFragments += result.protocolFragmentsGained || 0;

      // ---- STEP27: AI Analysis Risk/Reward System ----
      const researchDataGained = result.researchDataGained || 0;
      const riskChainMultiplierThisRun = result.riskChainMultiplierThisRun || 1;
      const unknownAnalysisCountThisRun = result.unknownAnalysisCountThisRun || 0;

      this.data.researchDataTotal += researchDataGained;
      // STEP28: 使用可能残高（Research Tree購入・Protocol Evolutionに使う）へも積み増す
      this.data.permanentResearchData += researchDataGained;
      if (riskChainMultiplierThisRun > this.data.maxRiskChainMultiplierEver) {
        this.data.maxRiskChainMultiplierEver = riskChainMultiplierThisRun;
      }
      this.data.totalUnknownAnalysisCount += unknownAnalysisCountThisRun;

      this.data.researchHistory.push({
        depth: result.depth,
        score: result.score,
        researchData: researchDataGained,
        riskChainMax: riskChainMultiplierThisRun,
        unknownAnalysisCount: unknownAnalysisCountThisRun,
        timestamp: Date.now()
      });
      if (this.data.researchHistory.length > RESEARCH_HISTORY_LIMIT) {
        this.data.researchHistory.splice(0, this.data.researchHistory.length - RESEARCH_HISTORY_LIMIT);
      }

      this.save();
      return { isNewBestDepth, isNewBestScore };
    }

    getBestDepth() {
      return this.data.endlessBestDepth;
    }

    getBestScore() {
      return this.data.endlessBestScore;
    }

    getTotalRuns() {
      return this.data.totalRuns;
    }

    getTotalBossClear() {
      return this.data.totalBossClear;
    }

    getMemoryFragments() {
      return this.data.memoryFragments;
    }

    /** ---------------- Phase C: Protocol Archive / Unlock / Fragment ---------------- */

    getUnlockedProtocols() {
      return this.data.unlockedProtocols.slice();
    }

    isProtocolUnlocked(id) {
      return this.data.unlockedProtocols.indexOf(id) !== -1;
    }

    /**
     * Protocolを解放済みとして即座に記録する（RUN中でも呼ばれる。発見演出のタイミングと
     * 一致させるため、recordRun()のRUN終了時バッチ処理とは別に都度即時保存する）。
     * @returns {boolean} 新規に解放された場合true、既に解放済みだった場合false
     */
    unlockProtocol(id) {
      if (this.isProtocolUnlocked(id)) return false;
      this.data.unlockedProtocols.push(id);
      this.data.discoveredProtocolCount = this.data.unlockedProtocols.length;
      this.save();
      return true;
    }

    getProtocolFragments() {
      return this.data.protocolFragments;
    }

    /** STEP28: Protocol Evolutionのコストとして消費する（残高不足の判定はmetaProgression.js側の責務） */
    spendProtocolFragments(amount) {
      this.data.protocolFragments = Math.max(0, this.data.protocolFragments - amount);
      this.save();
    }

    getDiscoveredProtocolCount() {
      return this.data.discoveredProtocolCount;
    }

    getTotalEventCount() {
      return this.data.totalEventCount;
    }

    getTotalPerfectCount() {
      return this.data.totalPerfectCount;
    }

    /** ---------------- Research Environment: Archive / 発見記録 ---------------- */

    getUnlockedEnvironments() {
      return this.data.unlockedEnvironments.slice();
    }

    isEnvironmentUnlocked(id) {
      return this.data.unlockedEnvironments.indexOf(id) !== -1;
    }

    /**
     * Environmentを発見済みとして即座に記録する（unlockProtocolと同じく、RUN中でも
     * その場で即時保存する）。
     * @returns {boolean} 新規に発見された場合true、既に発見済みだった場合false
     */
    unlockEnvironment(id) {
      if (this.isEnvironmentUnlocked(id)) return false;
      this.data.unlockedEnvironments.push(id);
      this.data.discoveredEnvironmentCount = this.data.unlockedEnvironments.length;
      this.save();
      return true;
    }

    getDiscoveredEnvironmentCount() {
      return this.data.discoveredEnvironmentCount;
    }

    /** ---------------- Puzzle Evolution System: Puzzle Archive（履歴保存） ---------------- */

    /**
     * Puzzle/Elite/Bossへの挑戦を1件記録する（RUN中でも都度即時保存する。
     * unlockProtocol/unlockEnvironmentと同じ「即時保存」の設計に揃えている）。
     * @param {{depth:number, size:number, tier:number|null, cleared:boolean,
     *   isBoss:boolean, isElite:boolean, modifierIds:string[]}} entry
     */
    recordPuzzleHistory(entry) {
      this.data.puzzleHistory.push(Object.assign({ timestamp: Date.now() }, entry));
      if (this.data.puzzleHistory.length > PUZZLE_HISTORY_LIMIT) {
        this.data.puzzleHistory.splice(0, this.data.puzzleHistory.length - PUZZLE_HISTORY_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近の記録から新しい順（配列末尾が最新のため反転して返す） */
    getPuzzleHistory() {
      return this.data.puzzleHistory.slice().reverse();
    }

    /** ---------------- STEP27: AI Analysis Risk/Reward System ---------------- */

    /**
     * Unknown NodeでANALYZEした結果のイベントidを発見済みとして記録する
     * （unlockProtocol/unlockEnvironmentと同じく、RUN中でも都度即時保存する）。
     */
    recordUnknownEvent(id) {
      if (this.data.discoveredUnknownEvents.indexOf(id) === -1) {
        this.data.discoveredUnknownEvents.push(id);
      }
      this.save();
    }

    getDiscoveredUnknownEvents() {
      return this.data.discoveredUnknownEvents.slice();
    }

    getResearchDataTotal() {
      return this.data.researchDataTotal;
    }

    getMaxRiskChainMultiplierEver() {
      return this.data.maxRiskChainMultiplierEver;
    }

    getTotalUnknownAnalysisCount() {
      return this.data.totalUnknownAnalysisCount;
    }

    /** @returns {Array<Object>} 直近のRUNサマリーから新しい順 */
    getResearchHistory() {
      return this.data.researchHistory.slice().reverse();
    }

    /** ---------------- STEP28: Meta Progression / Permanent Research System ---------------- */

    getPermanentResearchData() {
      return this.data.permanentResearchData;
    }

    spendPermanentResearchData(amount) {
      this.data.permanentResearchData = Math.max(0, this.data.permanentResearchData - amount);
      this.save();
    }

    getResearchTreeLevel(id) {
      return this.data.researchTreeLevels[id] || 0;
    }

    incrementResearchTreeLevel(id) {
      this.data.researchTreeLevels[id] = this.getResearchTreeLevel(id) + 1;
      this.save();
    }

    getResearchTreeLevels() {
      return Object.assign({}, this.data.researchTreeLevels);
    }

    isTechnologyUnlocked(id) {
      return this.data.unlockedTechnologies.indexOf(id) !== -1;
    }

    unlockTechnology(id) {
      if (this.isTechnologyUnlocked(id)) return false;
      this.data.unlockedTechnologies.push(id);
      this.save();
      return true;
    }

    getUnlockedTechnologies() {
      return this.data.unlockedTechnologies.slice();
    }

    getProtocolEvolutionStage(protocolId) {
      return this.data.protocolEvolution[protocolId] || 0;
    }

    setProtocolEvolutionStage(protocolId, stage) {
      this.data.protocolEvolution[protocolId] = stage;
      this.save();
    }

    /** @returns {boolean} 新規発見の場合true（Archive Expansion「Secrets」カウント用） */
    recordSecretDiscovery(id) {
      if (this.data.secretsDiscovered.indexOf(id) !== -1) return false;
      this.data.secretsDiscovered.push(id);
      this.save();
      return true;
    }

    getSecretsDiscoveredCount() {
      return this.data.secretsDiscovered.length;
    }
  }

  G.EndlessSaveStore = EndlessSaveStore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
