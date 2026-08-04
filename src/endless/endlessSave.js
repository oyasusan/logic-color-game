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
      secretsDiscovered: [],      // Archive Expansion「Secrets」カウント用の発見済みsecret id一覧
      totalProtocolEvolutions: 0, // STEP29: Protocol Evolution実行の生涯累計回数（Achievement「Protocol Creator」判定用）

      // ---- STEP29: Research Identity System ----
      selectedIdentityId: null,     // 一度選んだら以降ずっとこの値（Protocolと違いRUNごとにはリセットしない）
      secondaryIdentityId: null,    // Hybrid Identity System（今回UI選択は無し、データ構造のみ対応）
      identityExp: 0,               // 現在のIdentity LevelでのEXP累積（レベルアップ時に消費して繰り越す）
      identityLevel: 1,             // 1〜ResearchIdentity.MAX_LEVEL
      unlockedIdentityPerks: [],    // 解放済みPerk id一覧（選択中Identityのperkのみが積まれる想定）
      completedAchievements: [],    // 達成済みAchievement id一覧（achievements.js参照）

      // ---- STEP30-1: Environment Framework（Research LayerのVisual Theme。
      // 既存の「Research Environment」（environments.js、RUN限定のゲームプレイ効果）とは
      // 別概念のため、フィールド名は衝突を避けて"WorldEnvironment"で統一している ----
      currentWorldEnvironmentId: 'env_grid',           // 直近確定したEnvironment（RUNをまたいで復元表示するため保存）
      unlockedWorldEnvironments: ['env_grid', 'env_network', 'env_forest', 'env_ocean', 'env_fractal'], // unlockCondition:'always'の5種は初期解放済み
      discoveredWorldEnvironments: [],                  // 実際にLayerで遭遇したことがあるEnvironment id一覧

      // ---- STEP30-2: Environment Modifier System ----
      discoveredEnvironmentModifiers: [], // 実際にLayerで遭遇したことがあるModifier id一覧（Random Modifierで借用された側のidも含む）

      // ---- STEP30-3: Environment Visual / HUD Evolution ----
      environmentDiscoveryLog: [],   // { id, layer } 各EnvironmentへFirst Discoveryした時のLayer番号（Environment Archive表示用、1件につき最初の1回のみ記録）
      environmentVisitHistory: [],   // { id, layer, timestamp } 直近ENVIRONMENT_VISIT_HISTORY_LIMIT件の訪問履歴（古い順に追加）
      performanceMode: 'normal',      // 'high'|'normal'|'low'。Environment Theme Animationの描画負荷設定

      // ---- STEP30-4: World Stability System ----
      worldStability: 100,     // 直近RUNで確定していたstabilityのスナップショット（RUN開始時は必ず100へリセットされる。worldEnvironmentのcurrentWorldEnvironmentIdと同じ「スナップショット保存」方式）
      worldMutationLevel: 0,   // STEP30-5以降のWorld Mutation System向け生涯データ（今回は書き込むだけで消費ロジックは無い）
      worldInstabilityCount: 0, // stability低下イベントの生涯累計回数
      worldLastMutation: null,  // 直近Mutation発生時の情報（Mutation自体が未実装のため今回は常にnull）
      worldHistory: [],         // { layer, event, before, after, timestamp } 直近WORLD_HISTORY_LIMIT件のstability変化履歴（古い順に追加）

      // ---- STEP30-5: World Mutation Trigger System ----
      activeMutation: null,     // 現在Active中のMutation id（無ければnull）
      mutationLevel: 0,         // 0(Normal)〜3(Collapse)。activeMutationが無ければ常に0
      mutationHistory: [],      // { run, layer, mutation, level, result, timestamp } 直近MUTATION_HISTORY_LIMIT件（Archive Integration用、古い順に追加）

      // ---- STEP30-6: Environment Event System ----
      activeEnvironmentEvent: null,   // 現在Active中のEnvironment Event id（無ければnull）
      environmentEventHistory: [],    // { run, layer, eventId, name, environment, result, timestamp } 直近ENVIRONMENT_EVENT_HISTORY_LIMIT件（古い順に追加）
      discoveredEnvironmentEvents: [], // 一度でも発生したことがあるEvent id一覧（Archive表示用）
      environmentEventArchive: {},    // { [eventId]: { environment, count, bestReward } } Archive Integration（要求仕様セクション15）

      // ---- STEP30-7: Hidden Environment System ----
      hiddenUnlockFlags: [],       // 一度でも解放条件を満たしたHidden Environment id一覧（永続、二度と失われない）
      hiddenVisitHistory: [],      // { id, run, layer, timestamp } 直近HIDDEN_VISIT_HISTORY_LIMIT件の入場履歴（古い順に追加）
      hiddenArchive: {},           // { [id]: { firstDiscoveryRun, firstDiscoveryLayer, visitCount, rewardUnlocked, rewardId } } Archive Integration（要求仕様セクション9）
      // discoveryRate（要求仕様セクション11）は、hiddenUnlockFlags.length/HiddenEnvironmentData.ALL.lengthから
      // 都度計算できるため、重複データを持たず永続化しない（既存の"highestDepth"=endlessBestDepth重複回避と同じ設計判断）
      totalResearchLabVisits: 0,   // GENESIS LABの解放条件判定用、生涯Research Lab到達回数
      lastRunVisitedNodes: [],     // ECHO NETWORKの「Ghost Route表示」用、直前RUNのvisitedNodesスナップショット

      // ---- STEP31: AI Director System ----
      directorPersonalityId: 'analyst',  // 要求仕様の"personality"。今回は選択UI未実装のため常にanalyst固定
      playerProfile: null,        // PlayerProfile.defaultProfile()の内容（nullの間はload()時に補完する）
      directorProfile: {          // Run Report Archive + Directorの直近状態サマリー
        totalRunsAnalyzed: 0,
        lastDifficulty: 'normal',
        lastRecommendationId: null,
        reportHistory: []         // { averageSolveTime, accuracy, risk, favoriteEnvironment, recommendationId, timestamp } 直近DIRECTOR_REPORT_LIMIT件
      },
      directorLogs: [],           // { trigger, personality, line, timestamp } 直近DIRECTOR_LOG_LIMIT件

      // ---- STEP32: Narrative & Story System ----
      researchDatabase: { unlockedIds: [] },     // 解放済みStoryEntry id一覧（ENDING typeも含む、endingManager.js経由で追加）
      storyProgress: { lastNotifiedStage: null }, // AI Dialogue Integration用、直近通知済みのStory Stage
      timelineData: [],           // { id, timestamp } 解放順（古い順）のResearch Timelineデータ
      endingFlags: [],            // 達成済みEnding id一覧（一度達成したら二度と失われない）
      simulationZeroCleared: false, // END D「Simulation Zero」の解放条件用、生涯フラグ

      // ---- STEP32: Story Scenario Framework ----
      // 前回実装したSTEP32(Narrative & Story System)の`storyProgress`（Endless RUNを
      // またいだStory Stage通知）とは概念が異なる（こちらはScenario挑戦中の一時的な
      // 進行位置）ため、フィールド名衝突を避けて"scenarioProgress"と命名した
      scenarioProgress: { activeScenarioId: null, nodeIndex: 0 }, // 挑戦中Scenarioの状態。未挑戦時はactiveScenarioId=null
      scenarioClearData: {},   // { [scenarioId]: { cleared:true, endingId, clearedAt } } Scenarioごとのクリア記録
      endingHistory: [],       // { scenarioId, endingId, timestamp } 直近ENDING_HISTORY_LIMIT件（古い順）
      choiceHistory: [],       // { scenarioId, eventId, choiceId, timestamp } 直近CHOICE_HISTORY_LIMIT件（古い順）

      // ---- STEP32-1: Story Framework Base System (Layer Narrative System) ----
      // 要求仕様どおりの名前は"storyProgress"だが、既にSTEP32(Narrative & Story System)の
      // storyProgress({lastNotifiedStage})とSTEP32(Story Scenario Framework)実装時に検討した
      // 命名（scenarioProgressへ変更済み）の両方と概念が異なるため、3つ目の衝突を避けて
      // "layerStoryProgress"と命名した（ENDLESS RESEARCHのLayer進行に直結するChapter管理、
      // という性質を名前に反映させた）
      layerStoryProgress: { currentChapter: 'chapter01', currentLayer: 1, completedLayers: [], completedChapters: [] },

      // ---- STEP32-2: Dialogue System ----
      dialogueHistory: { completedDialogueIds: [] }, // 同じ会話を再表示しないための既読記録

      // ---- STEP32-3: Memory Fragment System ----
      // 「Memory Fragment」という語はこのプロジェクトで既に2つの異なる意味で使われている
      // （既存のPhase3 `memoryFragments`=単なる生涯累計カウンタ、STEP32 Narrative &
      // Story Systemの`storyData.js`内`memory_001`〜`006`=totalRuns条件のStoryEntry）。
      // 本フィールド名`memoryProgress`自体はどちらとも衝突しないため要求仕様どおりの名前
      // を採用したが、格納するid（memfrag_xxx接頭辞）は`memory_xxx`と紛らわしくならない
      // よう意図的に区別した（memoryData.js参照）
      memoryProgress: { collectedMemoryIds: [] },

      // ---- STEP32-4: Character Relationship System ----
      // 要求仕様セクション9の保存形式`{characterId, relationship, state}`をキャラクターid
      // ごとのdictとして保持する（3キャラクター分あるため）。`level`はrelationshipData.jsの
      // ARIA_LEVELSテーブルからstateを逆引きすれば常に導出できるため、あえて別フィールドとして
      // 永続化していない（要求仕様セクション9が`level`を保存対象に含めていないことと整合する）
      relationshipData: {
        player: { characterId: 'player', relationship: 0, state: 'RESEARCHER' },
        aria: { characterId: 'aria', relationship: 0, state: 'LOGICAL_AI' },
        lost_researcher: { characterId: 'lost_researcher', relationship: 0, state: 'UNKNOWN' }
      },

      // ---- STEP33: Research Archive System ----
      // 直近開いていたRESEARCH ARCHIVEのタブ（'story'|'memory'|'character'|'protocol'|
      // 'facility'）を覚えておくだけの小さな状態。他のArchive系（Memory/Character/
      // Protocol/Facility）は既存のsaveフィールドをそのまま参照するため、新規に
      // 永続化が必要なのはこの1項目のみだった
      archiveData: { lastViewedTab: null }
    };
  }

  const PUZZLE_HISTORY_LIMIT = 100;    // 無制限に増え続けないよう、直近100件のみ保持する
  const RESEARCH_HISTORY_LIMIT = 50;   // STEP27: RUNサマリーの保持件数上限
  const ENVIRONMENT_VISIT_HISTORY_LIMIT = 100; // STEP30-3: Environment訪問履歴の保持件数上限
  const WORLD_HISTORY_LIMIT = 100; // STEP30-4: World Stability変化履歴の保持件数上限
  const MUTATION_HISTORY_LIMIT = 100; // STEP30-5: World Mutation履歴の保持件数上限
  const ENVIRONMENT_EVENT_HISTORY_LIMIT = 100; // STEP30-6: Environment Event履歴の保持件数上限
  const HIDDEN_VISIT_HISTORY_LIMIT = 100; // STEP30-7: Hidden Environment入場履歴の保持件数上限
  const DIRECTOR_LOG_LIMIT = 100;    // STEP31: AI Directorログの保持件数上限
  const DIRECTOR_REPORT_LIMIT = 50;  // STEP31: Run Report Archiveの保持件数上限
  const TIMELINE_LIMIT = 200;        // STEP32: Research Timelineの保持件数上限
  const ENDING_HISTORY_LIMIT = 100;  // STEP32(Scenario): Ending History保持件数上限
  const CHOICE_HISTORY_LIMIT = 200;  // STEP32(Scenario): Choice History保持件数上限

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

      // ---- STEP30-7: Hidden Environment System ----
      this.data.totalResearchLabVisits += result.researchLabVisitsGained || 0;
      if (result.lastRunVisitedNodes) this.data.lastRunVisitedNodes = result.lastRunVisitedNodes;

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

    /** STEP28→STEP29: Protocol Evolution実行の生涯累計回数（Achievement「Protocol Creator」判定用） */
    incrementProtocolEvolutions() {
      this.data.totalProtocolEvolutions++;
      this.save();
    }

    getTotalProtocolEvolutions() {
      return this.data.totalProtocolEvolutions;
    }

    /** ---------------- STEP29: Research Identity System ---------------- */

    getSelectedIdentityId() {
      return this.data.selectedIdentityId;
    }

    /** 新規プレイ開始時に一度だけ呼ばれる想定（Protocolと違い、以降は変更しない） */
    setSelectedIdentityId(id) {
      this.data.selectedIdentityId = id;
      this.save();
    }

    getSecondaryIdentityId() {
      return this.data.secondaryIdentityId;
    }

    /** Hybrid Identity System: 現時点ではUI選択の呼び出し口が無いデータ構造のみの対応 */
    setSecondaryIdentityId(id) {
      this.data.secondaryIdentityId = id;
      this.save();
    }

    getIdentityExp() {
      return this.data.identityExp;
    }

    getIdentityLevel() {
      return this.data.identityLevel;
    }

    /** @param {number} exp 繰り越し後のEXP残量 @param {number} level 新しいLevel */
    setIdentityProgress(exp, level) {
      this.data.identityExp = exp;
      this.data.identityLevel = level;
      this.save();
    }

    getUnlockedIdentityPerks() {
      return this.data.unlockedIdentityPerks.slice();
    }

    /** @returns {boolean} 新規解放ならtrue（既に解放済みならfalse） */
    unlockIdentityPerk(id) {
      if (this.data.unlockedIdentityPerks.indexOf(id) !== -1) return false;
      this.data.unlockedIdentityPerks.push(id);
      this.save();
      return true;
    }

    getCompletedAchievements() {
      return this.data.completedAchievements.slice();
    }

    /** @returns {boolean} 新規達成ならtrue（既に達成済みならfalse） */
    completeAchievement(id) {
      if (this.data.completedAchievements.indexOf(id) !== -1) return false;
      this.data.completedAchievements.push(id);
      this.save();
      return true;
    }

    /** ---------------- STEP30-1: Environment Framework ---------------- */

    getCurrentWorldEnvironmentId() {
      return this.data.currentWorldEnvironmentId;
    }

    setCurrentWorldEnvironmentId(id) {
      this.data.currentWorldEnvironmentId = id;
      this.save();
    }

    getUnlockedWorldEnvironments() {
      return this.data.unlockedWorldEnvironments.slice();
    }

    isWorldEnvironmentUnlocked(id) {
      return this.data.unlockedWorldEnvironments.indexOf(id) !== -1;
    }

    /** @returns {boolean} 新規解放ならtrue（既に解放済みならfalse） */
    unlockWorldEnvironment(id) {
      if (this.isWorldEnvironmentUnlocked(id)) return false;
      this.data.unlockedWorldEnvironments.push(id);
      this.save();
      return true;
    }

    getDiscoveredWorldEnvironments() {
      return this.data.discoveredWorldEnvironments.slice();
    }

    /** @returns {boolean} 新規発見ならtrue（既に発見済みならfalse） */
    recordWorldEnvironmentDiscovery(id) {
      if (this.data.discoveredWorldEnvironments.indexOf(id) !== -1) return false;
      this.data.discoveredWorldEnvironments.push(id);
      this.save();
      return true;
    }

    /** ---------------- STEP30-2: Environment Modifier System ---------------- */

    getDiscoveredEnvironmentModifiers() {
      return this.data.discoveredEnvironmentModifiers.slice();
    }

    /** @returns {boolean} 新規発見ならtrue（既に発見済みならfalse） */
    recordEnvironmentModifierDiscovery(id) {
      if (this.data.discoveredEnvironmentModifiers.indexOf(id) !== -1) return false;
      this.data.discoveredEnvironmentModifiers.push(id);
      this.save();
      return true;
    }

    /** ---------------- STEP30-3: Environment Visual / HUD Evolution ---------------- */

    /** @returns {boolean} 新規のFirst Discoveryならtrue（既に記録済みならfalse） */
    recordEnvironmentDiscoveryLog(id, layer) {
      if (this.data.environmentDiscoveryLog.some(e => e.id === id)) return false;
      this.data.environmentDiscoveryLog.push({ id, layer });
      this.save();
      return true;
    }

    getEnvironmentDiscoveryLog() {
      return this.data.environmentDiscoveryLog.slice();
    }

    /** @returns {number|null} 指定EnvironmentのFirst Discovery Layer（未発見ならnull） */
    getFirstDiscoveryLayer(id) {
      const entry = this.data.environmentDiscoveryLog.find(e => e.id === id);
      return entry ? entry.layer : null;
    }

    recordEnvironmentVisit(id, layer) {
      this.data.environmentVisitHistory.push({ id, layer, timestamp: Date.now() });
      if (this.data.environmentVisitHistory.length > ENVIRONMENT_VISIT_HISTORY_LIMIT) {
        this.data.environmentVisitHistory.splice(0, this.data.environmentVisitHistory.length - ENVIRONMENT_VISIT_HISTORY_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近の訪問履歴から新しい順 */
    getEnvironmentVisitHistory() {
      return this.data.environmentVisitHistory.slice().reverse();
    }

    getPerformanceMode() {
      return this.data.performanceMode;
    }

    setPerformanceMode(mode) {
      this.data.performanceMode = mode;
      this.save();
    }

    /** ---------------- STEP30-4: World Stability System ---------------- */

    getWorldStability() {
      return this.data.worldStability;
    }

    setWorldStability(value) {
      this.data.worldStability = value;
      this.save();
    }

    getWorldMutationLevel() {
      return this.data.worldMutationLevel;
    }

    setWorldMutationLevel(value) {
      this.data.worldMutationLevel = value;
      this.save();
    }

    getWorldInstabilityCount() {
      return this.data.worldInstabilityCount;
    }

    incrementWorldInstabilityCount() {
      this.data.worldInstabilityCount++;
      this.save();
    }

    getWorldLastMutation() {
      return this.data.worldLastMutation;
    }

    setWorldLastMutation(value) {
      this.data.worldLastMutation = value;
      this.save();
    }

    recordWorldHistory(entry) {
      this.data.worldHistory.push(Object.assign({ timestamp: Date.now() }, entry));
      if (this.data.worldHistory.length > WORLD_HISTORY_LIMIT) {
        this.data.worldHistory.splice(0, this.data.worldHistory.length - WORLD_HISTORY_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近の履歴から新しい順 */
    getWorldHistory() {
      return this.data.worldHistory.slice().reverse();
    }

    /** ---------------- STEP30-5: World Mutation Trigger System ---------------- */

    getActiveMutationId() {
      return this.data.activeMutation;
    }

    setActiveMutationId(id) {
      this.data.activeMutation = id;
      this.save();
    }

    getMutationLevel() {
      return this.data.mutationLevel;
    }

    setMutationLevel(level) {
      this.data.mutationLevel = level;
      this.save();
    }

    /** @param {{run:number, layer:number, mutation:string, level:number, result:string}} entry */
    recordMutationHistory(entry) {
      this.data.mutationHistory.push(Object.assign({ timestamp: Date.now() }, entry));
      if (this.data.mutationHistory.length > MUTATION_HISTORY_LIMIT) {
        this.data.mutationHistory.splice(0, this.data.mutationHistory.length - MUTATION_HISTORY_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近の履歴から新しい順 */
    getMutationHistory() {
      return this.data.mutationHistory.slice().reverse();
    }

    /** ---------------- STEP30-6: Environment Event System ---------------- */

    getActiveEnvironmentEventId() {
      return this.data.activeEnvironmentEvent;
    }

    setActiveEnvironmentEventId(id) {
      this.data.activeEnvironmentEvent = id;
      this.save();
    }

    /** @param {{run:number, layer:number, eventId:string, name:string, environment:string, result:string}} entry */
    recordEnvironmentEventHistory(entry) {
      this.data.environmentEventHistory.push(Object.assign({ timestamp: Date.now() }, entry));
      if (this.data.environmentEventHistory.length > ENVIRONMENT_EVENT_HISTORY_LIMIT) {
        this.data.environmentEventHistory.splice(0, this.data.environmentEventHistory.length - ENVIRONMENT_EVENT_HISTORY_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近の履歴から新しい順 */
    getEnvironmentEventHistory() {
      return this.data.environmentEventHistory.slice().reverse();
    }

    getDiscoveredEnvironmentEvents() {
      return this.data.discoveredEnvironmentEvents.slice();
    }

    /** @returns {boolean} 新規発見ならtrue（既に発見済みならfalse） */
    recordDiscoveredEnvironmentEvent(id) {
      if (this.data.discoveredEnvironmentEvents.indexOf(id) !== -1) return false;
      this.data.discoveredEnvironmentEvents.push(id);
      this.save();
      return true;
    }

    /** Archive Integration（要求仕様セクション15）。count加算・bestReward更新をまとめて行う */
    recordEnvironmentEventArchive(eventId, environment, rewardValue) {
      const existing = this.data.environmentEventArchive[eventId];
      const count = (existing ? existing.count : 0) + 1;
      const bestReward = Math.max(existing ? existing.bestReward : 0, rewardValue || 0);
      this.data.environmentEventArchive[eventId] = { environment, count, bestReward };
      this.save();
    }

    /** @returns {{environment:string, count:number, bestReward:number}|null} */
    getEnvironmentEventArchiveRecord(eventId) {
      return this.data.environmentEventArchive[eventId] || null;
    }

    /** ---------------- STEP30-7: Hidden Environment System ---------------- */

    getHiddenUnlockFlags() {
      return this.data.hiddenUnlockFlags.slice();
    }

    isHiddenEnvironmentUnlocked(id) {
      return this.data.hiddenUnlockFlags.indexOf(id) !== -1;
    }

    /** @returns {boolean} 新規解放ならtrue（既に解放済みならfalse） */
    unlockHiddenEnvironment(id) {
      if (this.isHiddenEnvironmentUnlocked(id)) return false;
      this.data.hiddenUnlockFlags.push(id);
      this.save();
      return true;
    }

    /** 入場のたびに呼ぶ。履歴記録・Archive(First Discovery/Visit Count)更新をまとめて行う */
    recordHiddenVisit(id, run, layer) {
      this.data.hiddenVisitHistory.push({ id, run, layer, timestamp: Date.now() });
      if (this.data.hiddenVisitHistory.length > HIDDEN_VISIT_HISTORY_LIMIT) {
        this.data.hiddenVisitHistory.splice(0, this.data.hiddenVisitHistory.length - HIDDEN_VISIT_HISTORY_LIMIT);
      }
      const existing = this.data.hiddenArchive[id];
      this.data.hiddenArchive[id] = existing
        ? Object.assign({}, existing, { visitCount: existing.visitCount + 1 })
        : { firstDiscoveryRun: run, firstDiscoveryLayer: layer, visitCount: 1, rewardUnlocked: false, rewardId: null };
      this.save();
    }

    /** @returns {Array<Object>} 直近の入場履歴から新しい順 */
    getHiddenVisitHistory() {
      return this.data.hiddenVisitHistory.slice().reverse();
    }

    /** @returns {{firstDiscoveryRun:number, firstDiscoveryLayer:number, visitCount:number, rewardUnlocked:boolean, rewardId:string|null}|null} */
    getHiddenArchiveRecord(id) {
      return this.data.hiddenArchive[id] || null;
    }

    /** 限定Reward付与時に呼ぶ。Archive上のCompletionフラグを立てる */
    recordHiddenReward(id, rewardId) {
      const existing = this.data.hiddenArchive[id];
      if (!existing) return;
      this.data.hiddenArchive[id] = Object.assign({}, existing, { rewardUnlocked: true, rewardId });
      this.save();
    }

    getTotalResearchLabVisits() {
      return this.data.totalResearchLabVisits;
    }

    getLastRunVisitedNodes() {
      return this.data.lastRunVisitedNodes.slice();
    }

    /** ---------------- STEP31: AI Director System ---------------- */

    getDirectorPersonalityId() {
      return this.data.directorPersonalityId;
    }

    setDirectorPersonalityId(id) {
      this.data.directorPersonalityId = id;
      this.save();
    }

    /** @returns {Object} PlayerProfile.defaultProfile()と同じ形。未初期化ならその場でdefaultを補完し保存する */
    getPlayerProfile() {
      if (!this.data.playerProfile) {
        this.data.playerProfile = G.PlayerProfile ? G.PlayerProfile.defaultProfile() : {};
        this.save();
      }
      return this.data.playerProfile;
    }

    setPlayerProfile(profile) {
      this.data.playerProfile = profile;
      this.save();
    }

    getDirectorProfile() {
      return this.data.directorProfile;
    }

    /** @param {{trigger:string, personality:string, line:string}} entry */
    recordDirectorLog(entry) {
      this.data.directorLogs.push(Object.assign({ timestamp: Date.now() }, entry));
      if (this.data.directorLogs.length > DIRECTOR_LOG_LIMIT) {
        this.data.directorLogs.splice(0, this.data.directorLogs.length - DIRECTOR_LOG_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近のログから新しい順 */
    getDirectorLogs() {
      return this.data.directorLogs.slice().reverse();
    }

    /** @param {{averageSolveTime:number, accuracy:number, risk:number, favoriteEnvironment:string|null, recommendation:Object|null}} report */
    recordDirectorReport(report) {
      this.data.directorProfile.totalRunsAnalyzed++;
      if (report.difficulty) this.data.directorProfile.lastDifficulty = report.difficulty;
      this.data.directorProfile.lastRecommendationId = report.recommendation ? report.recommendation.id : null;
      this.data.directorProfile.reportHistory.push(Object.assign(
        { recommendationId: report.recommendation ? report.recommendation.id : null, timestamp: Date.now() },
        { averageSolveTime: report.averageSolveTime, accuracy: report.accuracy, risk: report.risk, favoriteEnvironment: report.favoriteEnvironment }
      ));
      if (this.data.directorProfile.reportHistory.length > DIRECTOR_REPORT_LIMIT) {
        this.data.directorProfile.reportHistory.splice(0, this.data.directorProfile.reportHistory.length - DIRECTOR_REPORT_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近のRun Reportから新しい順 */
    getDirectorReportHistory() {
      return this.data.directorProfile.reportHistory.slice().reverse();
    }

    /** ---------------- STEP32: Narrative & Story System ---------------- */

    getResearchDatabaseUnlockedIds() {
      return this.data.researchDatabase.unlockedIds.slice();
    }

    isResearchDatabaseEntryUnlocked(id) {
      return this.data.researchDatabase.unlockedIds.indexOf(id) !== -1;
    }

    /** @returns {boolean} 新規解放ならtrue（既に解放済みならfalse） */
    unlockResearchDatabaseEntry(id) {
      if (this.isResearchDatabaseEntryUnlocked(id)) return false;
      this.data.researchDatabase.unlockedIds.push(id);
      this.save();
      return true;
    }

    /** @param {{id:string, timestamp:number}} entry */
    recordTimelineEntry(entry) {
      this.data.timelineData.push(entry);
      if (this.data.timelineData.length > TIMELINE_LIMIT) {
        this.data.timelineData.splice(0, this.data.timelineData.length - TIMELINE_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 解放順（古い順）のTimelineデータ */
    getTimelineData() {
      return this.data.timelineData.slice();
    }

    getStoryProgress() {
      return this.data.storyProgress;
    }

    setStoryProgressStage(stage) {
      this.data.storyProgress.lastNotifiedStage = stage;
      this.save();
    }

    getEndingFlags() {
      return this.data.endingFlags.slice();
    }

    /** @returns {boolean} 新規達成ならtrue（既に達成済みならfalse） */
    recordEndingAchieved(id) {
      if (this.data.endingFlags.indexOf(id) !== -1) return false;
      this.data.endingFlags.push(id);
      this.save();
      return true;
    }

    hasSimulationZeroCleared() {
      return this.data.simulationZeroCleared;
    }

    setSimulationZeroCleared() {
      if (this.data.simulationZeroCleared) return;
      this.data.simulationZeroCleared = true;
      this.save();
    }

    /** ---------------- STEP32: Story Scenario Framework ---------------- */

    getScenarioProgress() {
      return this.data.scenarioProgress;
    }

    /** @param {string|null} scenarioId nullでScenario未挑戦状態に戻す */
    setScenarioProgress(scenarioId, nodeIndex) {
      this.data.scenarioProgress = { activeScenarioId: scenarioId, nodeIndex: nodeIndex || 0 };
      this.save();
    }

    getScenarioClearData(id) {
      return this.data.scenarioClearData[id] || null;
    }

    isScenarioCleared(id) {
      return !!this.data.scenarioClearData[id];
    }

    getAllScenarioClearData() {
      return Object.assign({}, this.data.scenarioClearData);
    }

    recordScenarioClear(id, endingId) {
      this.data.scenarioClearData[id] = { cleared: true, endingId, clearedAt: Date.now() };
      this.save();
    }

    getEndingHistory() {
      return this.data.endingHistory.slice();
    }

    recordScenarioEnding(scenarioId, endingId) {
      this.data.endingHistory.push({ scenarioId, endingId, timestamp: Date.now() });
      if (this.data.endingHistory.length > ENDING_HISTORY_LIMIT) {
        this.data.endingHistory.splice(0, this.data.endingHistory.length - ENDING_HISTORY_LIMIT);
      }
      this.save();
    }

    getChoiceHistory() {
      return this.data.choiceHistory.slice();
    }

    /** @returns {Array<Object>} 指定Scenario分のみ（古い順） */
    getChoiceHistoryForScenario(scenarioId) {
      return this.data.choiceHistory.filter(c => c.scenarioId === scenarioId);
    }

    recordChoice(scenarioId, eventId, choiceId) {
      this.data.choiceHistory.push({ scenarioId, eventId, choiceId, timestamp: Date.now() });
      if (this.data.choiceHistory.length > CHOICE_HISTORY_LIMIT) {
        this.data.choiceHistory.splice(0, this.data.choiceHistory.length - CHOICE_HISTORY_LIMIT);
      }
      this.save();
    }

    /** Scenario報酬のResearch Data付与。recordRun()のresearchDataGained加算と同じ2フィールドへ積み増す */
    grantScenarioResearchData(amount) {
      if (!amount) return;
      this.data.researchDataTotal += amount;
      this.data.permanentResearchData += amount;
      this.save();
    }

    /** ---------------- STEP32-1: Story Framework Base System ---------------- */

    getLayerStoryProgress() {
      return this.data.layerStoryProgress;
    }

    setLayerStoryCurrentChapter(chapterId) {
      this.data.layerStoryProgress.currentChapter = chapterId;
      this.save();
    }

    setLayerStoryCurrentLayer(layer) {
      this.data.layerStoryProgress.currentLayer = layer;
      this.save();
    }

    /** @returns {boolean} 新規記録ならtrue（既に記録済みならfalse） */
    recordLayerStoryLayerCleared(layer) {
      if (this.data.layerStoryProgress.completedLayers.indexOf(layer) !== -1) return false;
      this.data.layerStoryProgress.completedLayers.push(layer);
      this.save();
      return true;
    }

    /** @returns {boolean} 新規記録ならtrue（既に記録済みならfalse） */
    recordLayerStoryChapterCompleted(chapterId) {
      if (this.data.layerStoryProgress.completedChapters.indexOf(chapterId) !== -1) return false;
      this.data.layerStoryProgress.completedChapters.push(chapterId);
      this.save();
      return true;
    }

    /** StoryManager.resetStoryProgress()用のテスト用リセット */
    resetLayerStoryProgress() {
      this.data.layerStoryProgress = { currentChapter: 'chapter01', currentLayer: 1, completedLayers: [], completedChapters: [] };
      this.save();
    }

    /** ---------------- STEP32-2: Dialogue System ---------------- */

    getDialogueHistory() {
      return this.data.dialogueHistory;
    }

    isDialogueCompleted(id) {
      return this.data.dialogueHistory.completedDialogueIds.indexOf(id) !== -1;
    }

    /** @returns {boolean} 新規記録ならtrue（既に記録済みならfalse） */
    recordDialogueCompleted(id) {
      if (this.isDialogueCompleted(id)) return false;
      this.data.dialogueHistory.completedDialogueIds.push(id);
      this.save();
      return true;
    }

    /** ---------------- STEP32-3: Memory Fragment System ---------------- */

    getMemoryProgress() {
      return this.data.memoryProgress;
    }

    isMemoryCollected(id) {
      return this.data.memoryProgress.collectedMemoryIds.indexOf(id) !== -1;
    }

    /** @returns {boolean} 新規取得ならtrue（既に取得済みならfalse） */
    recordMemoryCollected(id) {
      if (this.isMemoryCollected(id)) return false;
      this.data.memoryProgress.collectedMemoryIds.push(id);
      this.save();
      return true;
    }

    /** ---------------- STEP32-4: Character Relationship System ---------------- */

    /** @returns {{characterId:string, relationship:number, state:string}} */
    getRelationshipData(characterId) {
      return this.data.relationshipData[characterId] || null;
    }

    /** @returns {number} 変更後の関係値（対象キャラクターが存在しなければ0のまま何もしない） */
    addRelationshipValue(characterId, value) {
      const record = this.data.relationshipData[characterId];
      if (!record) return 0;
      record.relationship += value;
      this.save();
      return record.relationship;
    }

    setRelationshipState(characterId, state) {
      const record = this.data.relationshipData[characterId];
      if (!record) return;
      record.state = state;
      this.save();
    }

    /** ---------------- STEP33: Research Archive System ---------------- */

    getArchiveData() {
      return this.data.archiveData;
    }

    setArchiveLastViewedTab(tab) {
      this.data.archiveData.lastViewedTab = tab;
      this.save();
    }
  }

  G.EndlessSaveStore = EndlessSaveStore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
