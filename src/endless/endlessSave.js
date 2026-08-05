/**
 * endlessSave.js
 * ENDLESS RESEARCHの全永続データをLocalStorageへ保存する。
 * 既存の progress.js（`logicColor.save.v2`、ステージ進行/星/EXP用）とは
 * 完全に別のキーを使い、既存のセーブ形式・移行処理には一切触れない。
 *
 * 【"highestDepth"について】 Phase3の要件で追加要求された`highestDepth`は、
 * 「これまでに到達した最も深いDepth」という意味では既存の`endlessBestDepth`
 * （Phase1から実装済み）と完全に同じ概念のため、同じ事実を保持する重複
 * フィールドを新設せず、`endlessBestDepth`をそのまま`highestDepth`要件の
 * 実装として扱っている（2つの値が食い違う不整合を避けるための判断）。
 *
 * 【STEP40-2: 3層データ構造】要求仕様に従い、内部データを以下の3層へ物理的に
 * 分離した（`this.data = { saveVersion, metaData, storyData, runData }`）。
 *   - metaData: 生涯にわたって保持される永続データ（Research Rank算出元・Protocol
 *     Unlock・Achievement・Ending Collection・各種Collection・Statistics等）。
 *     NEW RESEARCHでもクリアされない。
 *   - storyData: 現在の周回（ストーリー進行）に紐づくデータ（Chapter/Layer進行・
 *     Relationship・ARIA状態・現在の周回で読んだDialogue/取得したMemoryの記録）。
 *     NEW RESEARCH時にのみ初期値へリセットされる。
 *   - runData: 現在のRUN（またはResearch Hub滞在）を再開するためのスナップショット
 *     （STEP40-1 Continue Systemの後継。Research Hubに滞在中かどうかを示す`inHub`
 *     フラグを追加した）。
 * 全てのgetter/setterメソッドは既存の名前・シグネチャを完全に維持しており、
 * 呼び出し側（30以上のmanagerファイル）は一切変更していない（内部でどの層の
 * どのフィールドを読み書きするかを変えただけ）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const STORAGE_KEY = 'logicColor.endless.v1';

  // STEP40-2: 3層データ構造への物理的な移行に伴いバージョンを更新。
  // 今後のアップデートでフィールド構造がさらに破壊的に変わる場合に備えた
  // バージョン番号（現時点では移行処理はload()側のマイグレーション関数のみ）
  const SAVE_VERSION = '1.2.0';

  /** ---------------- STEP40-2: metaData（生涯永続、NEW RESEARCHでもクリアされない） ---------------- */
  function defaultMetaData() {
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
      unlockedEnvironments: [],   // 一度でも選んでRUNを開始したことがあるEnvironment id一覧
      discoveredEnvironmentCount: 0,

      // ---- Puzzle Evolution System: Puzzle Archive（履歴保存） ----
      puzzleHistory: [],

      // ---- STEP27: AI Analysis Risk/Reward System ----
      discoveredUnknownEvents: [],
      researchDataTotal: 0,
      maxRiskChainMultiplierEver: 1,
      totalUnknownAnalysisCount: 0,
      researchHistory: [],

      // ---- STEP28: Meta Progression / Permanent Research System ----
      permanentResearchData: 0,
      researchTreeLevels: {},
      unlockedTechnologies: [],
      protocolEvolution: {},
      secretsDiscovered: [],
      totalProtocolEvolutions: 0,

      // ---- STEP29: Research Identity System ----
      selectedIdentityId: null,
      secondaryIdentityId: null,
      identityExp: 0,
      identityLevel: 1,
      unlockedIdentityPerks: [],
      completedAchievements: [],

      // ---- STEP30-1: Environment Framework（発見記録。現在値=currentWorldEnvironmentIdはrunData側） ----
      unlockedWorldEnvironments: ['env_grid', 'env_network', 'env_forest', 'env_ocean', 'env_fractal'],
      discoveredWorldEnvironments: [],

      // ---- STEP30-2: Environment Modifier System ----
      discoveredEnvironmentModifiers: [],

      // ---- STEP30-3: Environment Visual / HUD Evolution ----
      environmentDiscoveryLog: [],
      environmentVisitHistory: [],
      performanceMode: 'normal',

      // ---- STEP30-4: World Stability System（生涯統計。現在値=worldStabilityはrunData側） ----
      worldMutationLevel: 0,
      worldInstabilityCount: 0,
      worldLastMutation: null,
      worldHistory: [],

      // ---- STEP30-5: World Mutation Trigger System（生涯履歴。現在値はrunData側） ----
      mutationHistory: [],

      // ---- STEP30-6: Environment Event System（生涯履歴。現在値はrunData側） ----
      environmentEventHistory: [],
      discoveredEnvironmentEvents: [],
      environmentEventArchive: {},

      // ---- STEP30-7: Hidden Environment System ----
      hiddenUnlockFlags: [],
      hiddenVisitHistory: [],
      hiddenArchive: {},
      totalResearchLabVisits: 0,
      lastRunVisitedNodes: [],

      // ---- STEP31: AI Director System ----
      directorPersonalityId: 'analyst',
      playerProfile: null,
      directorProfile: {
        totalRunsAnalyzed: 0,
        lastDifficulty: 'normal',
        lastRecommendationId: null,
        reportHistory: []
      },
      directorLogs: [],

      // ---- STEP32: Narrative & Story System（生涯達成型のResearch Database） ----
      researchDatabase: { unlockedIds: [] },
      storyProgress: { lastNotifiedStage: null },
      timelineData: [],
      endingFlags: [],
      simulationZeroCleared: false,

      // ---- STEP32: Story Scenario Framework（Endless Researchとは独立したStory Modeの
      // 進行データ。NEW RESEARCHはEndless Research側の周回のみを対象とするため、
      // ここはmetaData側に置きNEW RESEARCHの影響を受けないようにする） ----
      scenarioProgress: { activeScenarioId: null, nodeIndex: 0 },
      scenarioClearData: {},
      endingHistory: [],
      choiceHistory: [],

      // ---- STEP33: Research Archive System ----
      archiveData: { lastViewedTab: null },

      // ---- STEP40-1: Continue System（生涯統計） ----
      lastPlayed: null,
      playTimeMs: 0,

      // ---- STEP40-2: Collection（生涯収集記録。Archive「Collection」タブ用） ----
      collectionMemory: {},     // { [memoryId]: {firstUnlockedAt, firstUnlockedLayer} }
      collectionCharacter: {},  // { [characterId]: {firstDiscoveredAt, firstDiscoveredLayer} }
      collectionDialogue: {},   // { [dialogueId]: {firstUnlockedAt, firstUnlockedLayer} }

      // ---- STEP40-2: 将来のアップデート用データ構造のみ（今回消費側は未実装） ----
      unlockedUI: [],
      unlockedThemes: [],

      // ---- STEP42: Dynamic Research Event System（生涯履歴。演出専用、ゲーム状態は持たない） ----
      researchEventHistory: [],

      // ---- STEP43: Research Progression System（Facility Restoration。表示専用でなく実際に
      // 保存される進行度。増加のみ・減少しない。将来のStory演出フックとして再利用できるよう
      // 単純な0〜100の数値として持つ） ----
      facilityRestorationPercent: 0
    };
  }

  /** ---------------- STEP40-2: storyData（現在の周回、NEW RESEARCH時のみ初期化される） ---------------- */
  function defaultStoryData() {
    return {
      // STEP32-1: Layer Narrative SystemのChapter/Layer進行
      layerStoryProgress: { currentChapter: 'chapter01', currentLayer: 1, completedLayers: [], completedChapters: [] },
      // STEP32-2: 今回の周回で既読のDialogue id一覧（同じ会話を再表示しないための判定用）
      dialogueHistory: { completedDialogueIds: [] },
      // STEP32-3: 今回の周回で取得済みのMemory id一覧
      memoryProgress: { collectedMemoryIds: [] },
      // STEP32-4: キャラクター関係値・状態（ARIA状態を含む）
      relationshipData: {
        player: { characterId: 'player', relationship: 0, state: 'RESEARCHER' },
        aria: { characterId: 'aria', relationship: 0, state: 'LOGICAL_AI' },
        lost_researcher: { characterId: 'lost_researcher', relationship: 0, state: 'UNKNOWN' },
        dr_leon: { characterId: 'dr_leon', relationship: 0, state: 'UNKNOWN' }
      },
      // STEP40-2: 汎用Story Event Flags。今回消費側は未実装だが、将来Layer Narrative側で
      // 個別のフラグ管理が必要になった際にすぐ使えるようデータ構造のみ用意した
      storyFlags: []
    };
  }

  /** ---------------- STEP40-2: runData（現在のRUN/Research Hub滞在の再開用スナップショット） ---------------- */
  function defaultRunData() {
    return {
      // STEP30-1: 直近確定したWorldEnvironment（表示継続用のスナップショット）
      currentWorldEnvironmentId: 'env_grid',
      // STEP30-4: 直近RUNで確定していたWorld Stability（RUN開始時は必ず100へリセットされる）
      worldStability: 100,
      // STEP30-5: 現在Active中のWorld Mutation
      activeMutation: null,
      mutationLevel: 0,
      // STEP30-6: 現在Active中のEnvironment Event
      activeEnvironmentEvent: null,
      // STEP40-1→40-2: Continue System本体。中断した場所を再開するためのスナップショット。
      // { nextLayer, environmentSelectedId, environmentResolvedId, protocolIds,
      //   mapVisitedNodes, inHub, timestamp }。inHub=trueの場合はMap関連フィールドは
      // 意味を持たない（Research Hub＝Neural Research Labへ直接復帰するだけでよい）
      continueSnapshot: null
    };
  }

  function defaultData() {
    return {
      saveVersion: SAVE_VERSION,
      metaData: defaultMetaData(),
      storyData: defaultStoryData(),
      runData: defaultRunData()
    };
  }

  /**
   * STEP40-2: 旧Save（STEP40-1以前のフラット構造、および`saveVersion`+フラット構造だった
   * STEP40-1形式の両方を含む）を新しい3層構造へ変換する。既知のフィールド名をそれぞれの
   * 層のdefaultへ1つずつ上書きしていくだけの単純な移行（値の変換は発生しない）。
   * @param {Object} flat 旧形式でparse済みの生データ
   * @returns {Object} 新形式のdata
   */
  function migrateFlatToTiered(flat) {
    flat = flat || {};
    const meta = defaultMetaData();
    const story = defaultStoryData();
    const run = defaultRunData();

    Object.keys(meta).forEach(key => { if (flat[key] !== undefined) meta[key] = flat[key]; });
    Object.keys(story).forEach(key => { if (flat[key] !== undefined) story[key] = flat[key]; });
    Object.keys(run).forEach(key => {
      if (key === 'continueSnapshot') return; // 下で個別処理する
      if (flat[key] !== undefined) run[key] = flat[key];
    });
    // STEP40-1形式のcontinueSnapshotにはinHubフィールドが無いため、falseを補って引き継ぐ
    if (flat.continueSnapshot) {
      run.continueSnapshot = Object.assign({ inHub: false }, flat.continueSnapshot);
    }

    return { saveVersion: SAVE_VERSION, metaData: meta, storyData: story, runData: run };
  }

  const PUZZLE_HISTORY_LIMIT = 100;    // 無制限に増え続けないよう、直近100件のみ保持する
  const RESEARCH_HISTORY_LIMIT = 50;   // STEP27: RUNサマリーの保持件数上限
  const ENVIRONMENT_VISIT_HISTORY_LIMIT = 100; // STEP30-3: Environment訪問履歴の保持件数上限
  const WORLD_HISTORY_LIMIT = 100; // STEP30-4: World Stability変化履歴の保持件数上限
  const MUTATION_HISTORY_LIMIT = 100; // STEP30-5: World Mutation履歴の保持件数上限
  const ENVIRONMENT_EVENT_HISTORY_LIMIT = 100; // STEP30-6: Environment Event履歴の保持件数上限
  const RESEARCH_EVENT_HISTORY_LIMIT = 50; // STEP42: Dynamic Research Event履歴の保持件数上限
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
          const parsed = JSON.parse(raw);
          if (parsed && parsed.metaData && parsed.storyData && parsed.runData) {
            // 既にSTEP40-2形式（3層構造）。層ごとにdefaultとマージして欠損フィールドを補完する
            this.data = {
              saveVersion: parsed.saveVersion || SAVE_VERSION,
              metaData: Object.assign(defaultMetaData(), parsed.metaData),
              storyData: Object.assign(defaultStoryData(), parsed.storyData),
              runData: Object.assign(defaultRunData(), parsed.runData)
            };
          } else {
            // STEP40-1以前のフラット構造（saveVersion未設定の完全な旧Saveを含む）。
            // これは実データ構造そのものの変換のため、_migrateSaveVersion()の
            // バージョン一致チェックに関わらず即座にlocalStorageへ書き戻す
            this.data = migrateFlatToTiered(parsed);
            this.save();
          }
          this._migrateSaveVersion();
        }
      } catch (e) {
        console.warn('ENDLESS RESEARCHのセーブデータの読み込みに失敗しました。初期値を使用します。', e);
        this.data = defaultData();
      }
      return this.data;
    }

    /**
     * Save Version移行フック。旧Save由来のデータは既にload()側のマージ/移行関数で
     * 補完済みのため、現時点ではバージョン番号を更新するだけで足りる。将来的に
     * フィールド構造そのものを変える破壊的更新が入った場合は、ここにバージョンごとの
     * 変換処理を追加していく。
     */
    _migrateSaveVersion() {
      if (this.data.saveVersion !== SAVE_VERSION) {
        this.data.saveVersion = SAVE_VERSION;
        this.save();
      }
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
      const meta = this.data.metaData;
      meta.totalRuns++;

      const isNewBestDepth = result.depth > meta.endlessBestDepth;
      const isNewBestScore = result.score > meta.endlessBestScore;
      if (isNewBestDepth) meta.endlessBestDepth = result.depth;
      if (isNewBestScore) meta.endlessBestScore = result.score;

      meta.totalBossClear += result.bossClearCount || 0;
      meta.memoryFragments += result.memoryFragmentsGained || 0;

      meta.totalEventCount += result.eventCountGained || 0;
      meta.totalPerfectCount += result.perfectCountGained || 0;
      meta.protocolFragments += result.protocolFragmentsGained || 0;

      const researchDataGained = result.researchDataGained || 0;
      const riskChainMultiplierThisRun = result.riskChainMultiplierThisRun || 1;
      const unknownAnalysisCountThisRun = result.unknownAnalysisCountThisRun || 0;

      meta.researchDataTotal += researchDataGained;
      meta.permanentResearchData += researchDataGained;
      if (riskChainMultiplierThisRun > meta.maxRiskChainMultiplierEver) {
        meta.maxRiskChainMultiplierEver = riskChainMultiplierThisRun;
      }
      meta.totalUnknownAnalysisCount += unknownAnalysisCountThisRun;

      meta.totalResearchLabVisits += result.researchLabVisitsGained || 0;
      if (result.lastRunVisitedNodes) meta.lastRunVisitedNodes = result.lastRunVisitedNodes;

      meta.researchHistory.push({
        depth: result.depth,
        score: result.score,
        researchData: researchDataGained,
        riskChainMax: riskChainMultiplierThisRun,
        unknownAnalysisCount: unknownAnalysisCountThisRun,
        timestamp: Date.now()
      });
      if (meta.researchHistory.length > RESEARCH_HISTORY_LIMIT) {
        meta.researchHistory.splice(0, meta.researchHistory.length - RESEARCH_HISTORY_LIMIT);
      }

      this.save();
      return { isNewBestDepth, isNewBestScore };
    }

    getBestDepth() {
      return this.data.metaData.endlessBestDepth;
    }

    getBestScore() {
      return this.data.metaData.endlessBestScore;
    }

    getTotalRuns() {
      return this.data.metaData.totalRuns;
    }

    getTotalBossClear() {
      return this.data.metaData.totalBossClear;
    }

    getMemoryFragments() {
      return this.data.metaData.memoryFragments;
    }

    /** ---------------- Phase C: Protocol Archive / Unlock / Fragment ---------------- */

    getUnlockedProtocols() {
      return this.data.metaData.unlockedProtocols.slice();
    }

    isProtocolUnlocked(id) {
      return this.data.metaData.unlockedProtocols.indexOf(id) !== -1;
    }

    /**
     * Protocolを解放済みとして即座に記録する（RUN中でも呼ばれる。発見演出のタイミングと
     * 一致させるため、recordRun()のRUN終了時バッチ処理とは別に都度即時保存する）。
     * @returns {boolean} 新規に解放された場合true、既に解放済みだった場合false
     */
    unlockProtocol(id) {
      if (this.isProtocolUnlocked(id)) return false;
      this.data.metaData.unlockedProtocols.push(id);
      this.data.metaData.discoveredProtocolCount = this.data.metaData.unlockedProtocols.length;
      this.save();
      return true;
    }

    getProtocolFragments() {
      return this.data.metaData.protocolFragments;
    }

    /** STEP28: Protocol Evolutionのコストとして消費する（残高不足の判定はmetaProgression.js側の責務） */
    spendProtocolFragments(amount) {
      this.data.metaData.protocolFragments = Math.max(0, this.data.metaData.protocolFragments - amount);
      this.save();
    }

    getDiscoveredProtocolCount() {
      return this.data.metaData.discoveredProtocolCount;
    }

    getTotalEventCount() {
      return this.data.metaData.totalEventCount;
    }

    getTotalPerfectCount() {
      return this.data.metaData.totalPerfectCount;
    }

    /** ---------------- Research Environment: Archive / 発見記録 ---------------- */

    getUnlockedEnvironments() {
      return this.data.metaData.unlockedEnvironments.slice();
    }

    isEnvironmentUnlocked(id) {
      return this.data.metaData.unlockedEnvironments.indexOf(id) !== -1;
    }

    /**
     * Environmentを発見済みとして即座に記録する（unlockProtocolと同じく、RUN中でも
     * その場で即時保存する）。
     * @returns {boolean} 新規に発見された場合true、既に発見済みだった場合false
     */
    unlockEnvironment(id) {
      if (this.isEnvironmentUnlocked(id)) return false;
      this.data.metaData.unlockedEnvironments.push(id);
      this.data.metaData.discoveredEnvironmentCount = this.data.metaData.unlockedEnvironments.length;
      this.save();
      return true;
    }

    getDiscoveredEnvironmentCount() {
      return this.data.metaData.discoveredEnvironmentCount;
    }

    /** ---------------- Puzzle Evolution System: Puzzle Archive（履歴保存） ---------------- */

    /**
     * Puzzle/Elite/Bossへの挑戦を1件記録する（RUN中でも都度即時保存する）。
     * @param {{depth:number, size:number, tier:number|null, cleared:boolean,
     *   isBoss:boolean, isElite:boolean, modifierIds:string[]}} entry
     */
    recordPuzzleHistory(entry) {
      this.data.metaData.puzzleHistory.push(Object.assign({ timestamp: Date.now() }, entry));
      if (this.data.metaData.puzzleHistory.length > PUZZLE_HISTORY_LIMIT) {
        this.data.metaData.puzzleHistory.splice(0, this.data.metaData.puzzleHistory.length - PUZZLE_HISTORY_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近の記録から新しい順（配列末尾が最新のため反転して返す） */
    getPuzzleHistory() {
      return this.data.metaData.puzzleHistory.slice().reverse();
    }

    /** ---------------- STEP27: AI Analysis Risk/Reward System ---------------- */

    recordUnknownEvent(id) {
      if (this.data.metaData.discoveredUnknownEvents.indexOf(id) === -1) {
        this.data.metaData.discoveredUnknownEvents.push(id);
      }
      this.save();
    }

    getDiscoveredUnknownEvents() {
      return this.data.metaData.discoveredUnknownEvents.slice();
    }

    getResearchDataTotal() {
      return this.data.metaData.researchDataTotal;
    }

    getMaxRiskChainMultiplierEver() {
      return this.data.metaData.maxRiskChainMultiplierEver;
    }

    getTotalUnknownAnalysisCount() {
      return this.data.metaData.totalUnknownAnalysisCount;
    }

    /** @returns {Array<Object>} 直近のRUNサマリーから新しい順 */
    getResearchHistory() {
      return this.data.metaData.researchHistory.slice().reverse();
    }

    /** ---------------- STEP28: Meta Progression / Permanent Research System ---------------- */

    getPermanentResearchData() {
      return this.data.metaData.permanentResearchData;
    }

    spendPermanentResearchData(amount) {
      this.data.metaData.permanentResearchData = Math.max(0, this.data.metaData.permanentResearchData - amount);
      this.save();
    }

    getResearchTreeLevel(id) {
      return this.data.metaData.researchTreeLevels[id] || 0;
    }

    incrementResearchTreeLevel(id) {
      this.data.metaData.researchTreeLevels[id] = this.getResearchTreeLevel(id) + 1;
      this.save();
    }

    getResearchTreeLevels() {
      return Object.assign({}, this.data.metaData.researchTreeLevels);
    }

    isTechnologyUnlocked(id) {
      return this.data.metaData.unlockedTechnologies.indexOf(id) !== -1;
    }

    unlockTechnology(id) {
      if (this.isTechnologyUnlocked(id)) return false;
      this.data.metaData.unlockedTechnologies.push(id);
      this.save();
      return true;
    }

    getUnlockedTechnologies() {
      return this.data.metaData.unlockedTechnologies.slice();
    }

    getProtocolEvolutionStage(protocolId) {
      return this.data.metaData.protocolEvolution[protocolId] || 0;
    }

    setProtocolEvolutionStage(protocolId, stage) {
      this.data.metaData.protocolEvolution[protocolId] = stage;
      this.save();
    }

    /** @returns {boolean} 新規発見の場合true（Archive Expansion「Secrets」カウント用） */
    recordSecretDiscovery(id) {
      if (this.data.metaData.secretsDiscovered.indexOf(id) !== -1) return false;
      this.data.metaData.secretsDiscovered.push(id);
      this.save();
      return true;
    }

    getSecretsDiscoveredCount() {
      return this.data.metaData.secretsDiscovered.length;
    }

    /** STEP28→STEP29: Protocol Evolution実行の生涯累計回数（Achievement「Protocol Creator」判定用） */
    incrementProtocolEvolutions() {
      this.data.metaData.totalProtocolEvolutions++;
      this.save();
    }

    getTotalProtocolEvolutions() {
      return this.data.metaData.totalProtocolEvolutions;
    }

    /** ---------------- STEP29: Research Identity System ---------------- */

    getSelectedIdentityId() {
      return this.data.metaData.selectedIdentityId;
    }

    /** 新規プレイ開始時に一度だけ呼ばれる想定（Protocolと違い、以降は変更しない） */
    setSelectedIdentityId(id) {
      this.data.metaData.selectedIdentityId = id;
      this.save();
    }

    getSecondaryIdentityId() {
      return this.data.metaData.secondaryIdentityId;
    }

    /** Hybrid Identity System: 現時点ではUI選択の呼び出し口が無いデータ構造のみの対応 */
    setSecondaryIdentityId(id) {
      this.data.metaData.secondaryIdentityId = id;
      this.save();
    }

    getIdentityExp() {
      return this.data.metaData.identityExp;
    }

    getIdentityLevel() {
      return this.data.metaData.identityLevel;
    }

    /** @param {number} exp 繰り越し後のEXP残量 @param {number} level 新しいLevel */
    setIdentityProgress(exp, level) {
      this.data.metaData.identityExp = exp;
      this.data.metaData.identityLevel = level;
      this.save();
    }

    getUnlockedIdentityPerks() {
      return this.data.metaData.unlockedIdentityPerks.slice();
    }

    /** @returns {boolean} 新規解放ならtrue（既に解放済みならfalse） */
    unlockIdentityPerk(id) {
      if (this.data.metaData.unlockedIdentityPerks.indexOf(id) !== -1) return false;
      this.data.metaData.unlockedIdentityPerks.push(id);
      this.save();
      return true;
    }

    getCompletedAchievements() {
      return this.data.metaData.completedAchievements.slice();
    }

    /** @returns {boolean} 新規達成ならtrue（既に達成済みならfalse） */
    completeAchievement(id) {
      if (this.data.metaData.completedAchievements.indexOf(id) !== -1) return false;
      this.data.metaData.completedAchievements.push(id);
      this.save();
      return true;
    }

    /** ---------------- STEP30-1: Environment Framework ---------------- */

    getCurrentWorldEnvironmentId() {
      return this.data.runData.currentWorldEnvironmentId;
    }

    setCurrentWorldEnvironmentId(id) {
      this.data.runData.currentWorldEnvironmentId = id;
      this.save();
    }

    getUnlockedWorldEnvironments() {
      return this.data.metaData.unlockedWorldEnvironments.slice();
    }

    isWorldEnvironmentUnlocked(id) {
      return this.data.metaData.unlockedWorldEnvironments.indexOf(id) !== -1;
    }

    /** @returns {boolean} 新規解放ならtrue（既に解放済みならfalse） */
    unlockWorldEnvironment(id) {
      if (this.isWorldEnvironmentUnlocked(id)) return false;
      this.data.metaData.unlockedWorldEnvironments.push(id);
      this.save();
      return true;
    }

    getDiscoveredWorldEnvironments() {
      return this.data.metaData.discoveredWorldEnvironments.slice();
    }

    /** @returns {boolean} 新規発見ならtrue（既に発見済みならfalse） */
    recordWorldEnvironmentDiscovery(id) {
      if (this.data.metaData.discoveredWorldEnvironments.indexOf(id) !== -1) return false;
      this.data.metaData.discoveredWorldEnvironments.push(id);
      this.save();
      return true;
    }

    /** ---------------- STEP30-2: Environment Modifier System ---------------- */

    getDiscoveredEnvironmentModifiers() {
      return this.data.metaData.discoveredEnvironmentModifiers.slice();
    }

    /** @returns {boolean} 新規発見ならtrue（既に発見済みならfalse） */
    recordEnvironmentModifierDiscovery(id) {
      if (this.data.metaData.discoveredEnvironmentModifiers.indexOf(id) !== -1) return false;
      this.data.metaData.discoveredEnvironmentModifiers.push(id);
      this.save();
      return true;
    }

    /** ---------------- STEP30-3: Environment Visual / HUD Evolution ---------------- */

    /** @returns {boolean} 新規のFirst Discoveryならtrue（既に記録済みならfalse） */
    recordEnvironmentDiscoveryLog(id, layer) {
      if (this.data.metaData.environmentDiscoveryLog.some(e => e.id === id)) return false;
      this.data.metaData.environmentDiscoveryLog.push({ id, layer });
      this.save();
      return true;
    }

    getEnvironmentDiscoveryLog() {
      return this.data.metaData.environmentDiscoveryLog.slice();
    }

    /** @returns {number|null} 指定EnvironmentのFirst Discovery Layer（未発見ならnull） */
    getFirstDiscoveryLayer(id) {
      const entry = this.data.metaData.environmentDiscoveryLog.find(e => e.id === id);
      return entry ? entry.layer : null;
    }

    recordEnvironmentVisit(id, layer) {
      this.data.metaData.environmentVisitHistory.push({ id, layer, timestamp: Date.now() });
      if (this.data.metaData.environmentVisitHistory.length > ENVIRONMENT_VISIT_HISTORY_LIMIT) {
        this.data.metaData.environmentVisitHistory.splice(0, this.data.metaData.environmentVisitHistory.length - ENVIRONMENT_VISIT_HISTORY_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近の訪問履歴から新しい順 */
    getEnvironmentVisitHistory() {
      return this.data.metaData.environmentVisitHistory.slice().reverse();
    }

    getPerformanceMode() {
      return this.data.metaData.performanceMode;
    }

    setPerformanceMode(mode) {
      this.data.metaData.performanceMode = mode;
      this.save();
    }

    /** ---------------- STEP30-4: World Stability System ---------------- */

    getWorldStability() {
      return this.data.runData.worldStability;
    }

    setWorldStability(value) {
      this.data.runData.worldStability = value;
      this.save();
    }

    getWorldMutationLevel() {
      return this.data.metaData.worldMutationLevel;
    }

    setWorldMutationLevel(value) {
      this.data.metaData.worldMutationLevel = value;
      this.save();
    }

    getWorldInstabilityCount() {
      return this.data.metaData.worldInstabilityCount;
    }

    incrementWorldInstabilityCount() {
      this.data.metaData.worldInstabilityCount++;
      this.save();
    }

    getWorldLastMutation() {
      return this.data.metaData.worldLastMutation;
    }

    setWorldLastMutation(value) {
      this.data.metaData.worldLastMutation = value;
      this.save();
    }

    recordWorldHistory(entry) {
      this.data.metaData.worldHistory.push(Object.assign({ timestamp: Date.now() }, entry));
      if (this.data.metaData.worldHistory.length > WORLD_HISTORY_LIMIT) {
        this.data.metaData.worldHistory.splice(0, this.data.metaData.worldHistory.length - WORLD_HISTORY_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近の履歴から新しい順 */
    getWorldHistory() {
      return this.data.metaData.worldHistory.slice().reverse();
    }

    /** ---------------- STEP30-5: World Mutation Trigger System ---------------- */

    getActiveMutationId() {
      return this.data.runData.activeMutation;
    }

    setActiveMutationId(id) {
      this.data.runData.activeMutation = id;
      this.save();
    }

    getMutationLevel() {
      return this.data.runData.mutationLevel;
    }

    setMutationLevel(level) {
      this.data.runData.mutationLevel = level;
      this.save();
    }

    /** @param {{run:number, layer:number, mutation:string, level:number, result:string}} entry */
    recordMutationHistory(entry) {
      this.data.metaData.mutationHistory.push(Object.assign({ timestamp: Date.now() }, entry));
      if (this.data.metaData.mutationHistory.length > MUTATION_HISTORY_LIMIT) {
        this.data.metaData.mutationHistory.splice(0, this.data.metaData.mutationHistory.length - MUTATION_HISTORY_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近の履歴から新しい順 */
    getMutationHistory() {
      return this.data.metaData.mutationHistory.slice().reverse();
    }

    /** ---------------- STEP30-6: Environment Event System ---------------- */

    getActiveEnvironmentEventId() {
      return this.data.runData.activeEnvironmentEvent;
    }

    setActiveEnvironmentEventId(id) {
      this.data.runData.activeEnvironmentEvent = id;
      this.save();
    }

    /** @param {{run:number, layer:number, eventId:string, name:string, environment:string, result:string}} entry */
    recordEnvironmentEventHistory(entry) {
      this.data.metaData.environmentEventHistory.push(Object.assign({ timestamp: Date.now() }, entry));
      if (this.data.metaData.environmentEventHistory.length > ENVIRONMENT_EVENT_HISTORY_LIMIT) {
        this.data.metaData.environmentEventHistory.splice(0, this.data.metaData.environmentEventHistory.length - ENVIRONMENT_EVENT_HISTORY_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近の履歴から新しい順 */
    getEnvironmentEventHistory() {
      return this.data.metaData.environmentEventHistory.slice().reverse();
    }

    getDiscoveredEnvironmentEvents() {
      return this.data.metaData.discoveredEnvironmentEvents.slice();
    }

    /** @returns {boolean} 新規発見ならtrue（既に発見済みならfalse） */
    recordDiscoveredEnvironmentEvent(id) {
      if (this.data.metaData.discoveredEnvironmentEvents.indexOf(id) !== -1) return false;
      this.data.metaData.discoveredEnvironmentEvents.push(id);
      this.save();
      return true;
    }

    /** Archive Integration（要求仕様セクション15）。count加算・bestReward更新をまとめて行う */
    recordEnvironmentEventArchive(eventId, environment, rewardValue) {
      const existing = this.data.metaData.environmentEventArchive[eventId];
      const count = (existing ? existing.count : 0) + 1;
      const bestReward = Math.max(existing ? existing.bestReward : 0, rewardValue || 0);
      this.data.metaData.environmentEventArchive[eventId] = { environment, count, bestReward };
      this.save();
    }

    /** @returns {{environment:string, count:number, bestReward:number}|null} */
    getEnvironmentEventArchiveRecord(eventId) {
      return this.data.metaData.environmentEventArchive[eventId] || null;
    }

    /** ---------------- STEP30-7: Hidden Environment System ---------------- */

    getHiddenUnlockFlags() {
      return this.data.metaData.hiddenUnlockFlags.slice();
    }

    isHiddenEnvironmentUnlocked(id) {
      return this.data.metaData.hiddenUnlockFlags.indexOf(id) !== -1;
    }

    /** @returns {boolean} 新規解放ならtrue（既に解放済みならfalse） */
    unlockHiddenEnvironment(id) {
      if (this.isHiddenEnvironmentUnlocked(id)) return false;
      this.data.metaData.hiddenUnlockFlags.push(id);
      this.save();
      return true;
    }

    /** 入場のたびに呼ぶ。履歴記録・Archive(First Discovery/Visit Count)更新をまとめて行う */
    recordHiddenVisit(id, run, layer) {
      this.data.metaData.hiddenVisitHistory.push({ id, run, layer, timestamp: Date.now() });
      if (this.data.metaData.hiddenVisitHistory.length > HIDDEN_VISIT_HISTORY_LIMIT) {
        this.data.metaData.hiddenVisitHistory.splice(0, this.data.metaData.hiddenVisitHistory.length - HIDDEN_VISIT_HISTORY_LIMIT);
      }
      const existing = this.data.metaData.hiddenArchive[id];
      this.data.metaData.hiddenArchive[id] = existing
        ? Object.assign({}, existing, { visitCount: existing.visitCount + 1 })
        : { firstDiscoveryRun: run, firstDiscoveryLayer: layer, visitCount: 1, rewardUnlocked: false, rewardId: null };
      this.save();
    }

    /** @returns {Array<Object>} 直近の入場履歴から新しい順 */
    getHiddenVisitHistory() {
      return this.data.metaData.hiddenVisitHistory.slice().reverse();
    }

    /** @returns {{firstDiscoveryRun:number, firstDiscoveryLayer:number, visitCount:number, rewardUnlocked:boolean, rewardId:string|null}|null} */
    getHiddenArchiveRecord(id) {
      return this.data.metaData.hiddenArchive[id] || null;
    }

    /** 限定Reward付与時に呼ぶ。Archive上のCompletionフラグを立てる */
    recordHiddenReward(id, rewardId) {
      const existing = this.data.metaData.hiddenArchive[id];
      if (!existing) return;
      this.data.metaData.hiddenArchive[id] = Object.assign({}, existing, { rewardUnlocked: true, rewardId });
      this.save();
    }

    getTotalResearchLabVisits() {
      return this.data.metaData.totalResearchLabVisits;
    }

    getLastRunVisitedNodes() {
      return this.data.metaData.lastRunVisitedNodes.slice();
    }

    /** ---------------- STEP31: AI Director System ---------------- */

    getDirectorPersonalityId() {
      return this.data.metaData.directorPersonalityId;
    }

    setDirectorPersonalityId(id) {
      this.data.metaData.directorPersonalityId = id;
      this.save();
    }

    /** @returns {Object} PlayerProfile.defaultProfile()と同じ形。未初期化ならその場でdefaultを補完し保存する */
    getPlayerProfile() {
      if (!this.data.metaData.playerProfile) {
        this.data.metaData.playerProfile = G.PlayerProfile ? G.PlayerProfile.defaultProfile() : {};
        this.save();
      }
      return this.data.metaData.playerProfile;
    }

    setPlayerProfile(profile) {
      this.data.metaData.playerProfile = profile;
      this.save();
    }

    getDirectorProfile() {
      return this.data.metaData.directorProfile;
    }

    /** @param {{trigger:string, personality:string, line:string}} entry */
    recordDirectorLog(entry) {
      this.data.metaData.directorLogs.push(Object.assign({ timestamp: Date.now() }, entry));
      if (this.data.metaData.directorLogs.length > DIRECTOR_LOG_LIMIT) {
        this.data.metaData.directorLogs.splice(0, this.data.metaData.directorLogs.length - DIRECTOR_LOG_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近のログから新しい順 */
    getDirectorLogs() {
      return this.data.metaData.directorLogs.slice().reverse();
    }

    /** @param {{averageSolveTime:number, accuracy:number, risk:number, favoriteEnvironment:string|null, recommendation:Object|null}} report */
    recordDirectorReport(report) {
      const profile = this.data.metaData.directorProfile;
      profile.totalRunsAnalyzed++;
      if (report.difficulty) profile.lastDifficulty = report.difficulty;
      profile.lastRecommendationId = report.recommendation ? report.recommendation.id : null;
      profile.reportHistory.push(Object.assign(
        { recommendationId: report.recommendation ? report.recommendation.id : null, timestamp: Date.now() },
        { averageSolveTime: report.averageSolveTime, accuracy: report.accuracy, risk: report.risk, favoriteEnvironment: report.favoriteEnvironment }
      ));
      if (profile.reportHistory.length > DIRECTOR_REPORT_LIMIT) {
        profile.reportHistory.splice(0, profile.reportHistory.length - DIRECTOR_REPORT_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近のRun Reportから新しい順 */
    getDirectorReportHistory() {
      return this.data.metaData.directorProfile.reportHistory.slice().reverse();
    }

    /** ---------------- STEP32: Narrative & Story System ---------------- */

    getResearchDatabaseUnlockedIds() {
      return this.data.metaData.researchDatabase.unlockedIds.slice();
    }

    isResearchDatabaseEntryUnlocked(id) {
      return this.data.metaData.researchDatabase.unlockedIds.indexOf(id) !== -1;
    }

    /** @returns {boolean} 新規解放ならtrue（既に解放済みならfalse） */
    unlockResearchDatabaseEntry(id) {
      if (this.isResearchDatabaseEntryUnlocked(id)) return false;
      this.data.metaData.researchDatabase.unlockedIds.push(id);
      this.save();
      return true;
    }

    /** @param {{id:string, timestamp:number}} entry */
    recordTimelineEntry(entry) {
      this.data.metaData.timelineData.push(entry);
      if (this.data.metaData.timelineData.length > TIMELINE_LIMIT) {
        this.data.metaData.timelineData.splice(0, this.data.metaData.timelineData.length - TIMELINE_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 解放順（古い順）のTimelineデータ */
    getTimelineData() {
      return this.data.metaData.timelineData.slice();
    }

    getStoryProgress() {
      return this.data.metaData.storyProgress;
    }

    setStoryProgressStage(stage) {
      this.data.metaData.storyProgress.lastNotifiedStage = stage;
      this.save();
    }

    getEndingFlags() {
      return this.data.metaData.endingFlags.slice();
    }

    /** @returns {boolean} 新規達成ならtrue（既に達成済みならfalse） */
    recordEndingAchieved(id) {
      if (this.data.metaData.endingFlags.indexOf(id) !== -1) return false;
      this.data.metaData.endingFlags.push(id);
      this.save();
      return true;
    }

    hasSimulationZeroCleared() {
      return this.data.metaData.simulationZeroCleared;
    }

    setSimulationZeroCleared() {
      if (this.data.metaData.simulationZeroCleared) return;
      this.data.metaData.simulationZeroCleared = true;
      this.save();
    }

    /** ---------------- STEP32: Story Scenario Framework ---------------- */

    getScenarioProgress() {
      return this.data.metaData.scenarioProgress;
    }

    /** @param {string|null} scenarioId nullでScenario未挑戦状態に戻す */
    setScenarioProgress(scenarioId, nodeIndex) {
      this.data.metaData.scenarioProgress = { activeScenarioId: scenarioId, nodeIndex: nodeIndex || 0 };
      this.save();
    }

    getScenarioClearData(id) {
      return this.data.metaData.scenarioClearData[id] || null;
    }

    isScenarioCleared(id) {
      return !!this.data.metaData.scenarioClearData[id];
    }

    getAllScenarioClearData() {
      return Object.assign({}, this.data.metaData.scenarioClearData);
    }

    recordScenarioClear(id, endingId) {
      this.data.metaData.scenarioClearData[id] = { cleared: true, endingId, clearedAt: Date.now() };
      this.save();
    }

    getEndingHistory() {
      return this.data.metaData.endingHistory.slice();
    }

    recordScenarioEnding(scenarioId, endingId) {
      this.data.metaData.endingHistory.push({ scenarioId, endingId, timestamp: Date.now() });
      if (this.data.metaData.endingHistory.length > ENDING_HISTORY_LIMIT) {
        this.data.metaData.endingHistory.splice(0, this.data.metaData.endingHistory.length - ENDING_HISTORY_LIMIT);
      }
      this.save();
    }

    getChoiceHistory() {
      return this.data.metaData.choiceHistory.slice();
    }

    /** @returns {Array<Object>} 指定Scenario分のみ（古い順） */
    getChoiceHistoryForScenario(scenarioId) {
      return this.data.metaData.choiceHistory.filter(c => c.scenarioId === scenarioId);
    }

    recordChoice(scenarioId, eventId, choiceId) {
      this.data.metaData.choiceHistory.push({ scenarioId, eventId, choiceId, timestamp: Date.now() });
      if (this.data.metaData.choiceHistory.length > CHOICE_HISTORY_LIMIT) {
        this.data.metaData.choiceHistory.splice(0, this.data.metaData.choiceHistory.length - CHOICE_HISTORY_LIMIT);
      }
      this.save();
    }

    /** Scenario報酬のResearch Data付与。recordRun()のresearchDataGained加算と同じ2フィールドへ積み増す */
    grantScenarioResearchData(amount) {
      if (!amount) return;
      this.data.metaData.researchDataTotal += amount;
      this.data.metaData.permanentResearchData += amount;
      this.save();
    }

    /** ---------------- STEP32-1: Story Framework Base System ---------------- */

    getLayerStoryProgress() {
      return this.data.storyData.layerStoryProgress;
    }

    setLayerStoryCurrentChapter(chapterId) {
      this.data.storyData.layerStoryProgress.currentChapter = chapterId;
      this.save();
    }

    setLayerStoryCurrentLayer(layer) {
      this.data.storyData.layerStoryProgress.currentLayer = layer;
      this.save();
    }

    /** @returns {boolean} 新規記録ならtrue（既に記録済みならfalse） */
    recordLayerStoryLayerCleared(layer) {
      if (this.data.storyData.layerStoryProgress.completedLayers.indexOf(layer) !== -1) return false;
      this.data.storyData.layerStoryProgress.completedLayers.push(layer);
      this.save();
      return true;
    }

    /** @returns {boolean} 新規記録ならtrue（既に記録済みならfalse） */
    recordLayerStoryChapterCompleted(chapterId) {
      if (this.data.storyData.layerStoryProgress.completedChapters.indexOf(chapterId) !== -1) return false;
      this.data.storyData.layerStoryProgress.completedChapters.push(chapterId);
      this.save();
      return true;
    }

    /** StoryManager.resetStoryProgress()用のテスト用リセット */
    resetLayerStoryProgress() {
      this.data.storyData.layerStoryProgress = { currentChapter: 'chapter01', currentLayer: 1, completedLayers: [], completedChapters: [] };
      this.save();
    }

    /** ---------------- STEP32-2: Dialogue System ---------------- */

    getDialogueHistory() {
      return this.data.storyData.dialogueHistory;
    }

    isDialogueCompleted(id) {
      return this.data.storyData.dialogueHistory.completedDialogueIds.indexOf(id) !== -1;
    }

    /**
     * @returns {boolean} 今回の周回で新規に読んだならtrue（既読ならfalse）。
     * STEP40-2: 生涯Collection（Archiveの「Collection」タブ用）へも同時に記録する。
     * こちらは「一度でも読んだことがあるか」を保持し、NEW RESEARCHでもクリアされない。
     */
    recordDialogueCompleted(id) {
      const isNewThisPlaythrough = !this.isDialogueCompleted(id);
      if (isNewThisPlaythrough) this.data.storyData.dialogueHistory.completedDialogueIds.push(id);
      if (!this.data.metaData.collectionDialogue[id]) {
        this.data.metaData.collectionDialogue[id] = {
          firstUnlockedAt: Date.now(),
          firstUnlockedLayer: this.data.storyData.layerStoryProgress.currentLayer
        };
      }
      this.save();
      return isNewThisPlaythrough;
    }

    /** ---------------- STEP32-3: Memory Fragment System ---------------- */

    getMemoryProgress() {
      return this.data.storyData.memoryProgress;
    }

    isMemoryCollected(id) {
      return this.data.storyData.memoryProgress.collectedMemoryIds.indexOf(id) !== -1;
    }

    /**
     * @returns {boolean} 今回の周回で新規取得ならtrue（既に取得済みならfalse）。
     * STEP40-2: 生涯Collectionへも同時に記録する（既取得Memoryでも「今回のプレイで
     * 取得済み」という周回単位の記録はstoryData側で別途保持される。要求仕様の
     * 「既取得MemoryでもCurrent Runでは今回取得済みとして記録する」に対応）。
     */
    recordMemoryCollected(id) {
      const isNewThisPlaythrough = !this.isMemoryCollected(id);
      if (isNewThisPlaythrough) this.data.storyData.memoryProgress.collectedMemoryIds.push(id);
      if (!this.data.metaData.collectionMemory[id]) {
        this.data.metaData.collectionMemory[id] = {
          firstUnlockedAt: Date.now(),
          firstUnlockedLayer: this.data.storyData.layerStoryProgress.currentLayer
        };
      }
      this.save();
      return isNewThisPlaythrough;
    }

    /** ---------------- STEP32-4: Character Relationship System ---------------- */

    /** @returns {{characterId:string, relationship:number, state:string}} */
    getRelationshipData(characterId) {
      return this.data.storyData.relationshipData[characterId] || null;
    }

    /** @returns {number} 変更後の関係値（対象キャラクターが存在しなければ0のまま何もしない） */
    addRelationshipValue(characterId, value) {
      const record = this.data.storyData.relationshipData[characterId];
      if (!record) return 0;
      record.relationship += value;
      this.save();
      return record.relationship;
    }

    /**
     * STEP40-2: UNKNOWN→それ以外の状態へ初めて遷移した瞬間を「キャラクター発見」として
     * 生涯Collectionへ記録する（player/ariaは初期状態からUNKNOWNではないため対象外。
     * lost_researcher/dr_leon等、探索で見つけるキャラクターのみが対象になる）。
     */
    setRelationshipState(characterId, state) {
      const record = this.data.storyData.relationshipData[characterId];
      if (!record) return;
      const wasUndiscovered = record.state === 'UNKNOWN';
      record.state = state;
      if (wasUndiscovered && state !== 'UNKNOWN' && !this.data.metaData.collectionCharacter[characterId]) {
        this.data.metaData.collectionCharacter[characterId] = {
          firstDiscoveredAt: Date.now(),
          firstDiscoveredLayer: this.data.storyData.layerStoryProgress.currentLayer
        };
      }
      this.save();
    }

    /** ---------------- STEP33: Research Archive System ---------------- */

    getArchiveData() {
      return this.data.metaData.archiveData;
    }

    setArchiveLastViewedTab(tab) {
      this.data.metaData.archiveData.lastViewedTab = tab;
      this.save();
    }

    /** ---------------- STEP40-1/40-2: Continue System ---------------- */

    getSaveVersion() {
      return this.data.saveVersion;
    }

    getLastPlayed() {
      return this.data.metaData.lastPlayed;
    }

    getPlayTimeMs() {
      return this.data.metaData.playTimeMs;
    }

    /** @param {number} ms 直前のチェックポイントからの経過時間（endless.js側で上限クランプ済み） */
    addPlayTime(ms) {
      if (!ms || ms <= 0) return;
      this.data.metaData.playTimeMs += ms;
      this.data.metaData.lastPlayed = Date.now();
      this.save();
    }

    hasContinueSnapshot() {
      return !!this.data.runData.continueSnapshot;
    }

    /** @returns {{nextLayer:number, environmentSelectedId:string|null, environmentResolvedId:string|null,
     *   protocolIds:string[], mapVisitedNodes:Array<Object>, inHub:boolean, timestamp:number}|null} */
    getContinueSnapshot() {
      return this.data.runData.continueSnapshot;
    }

    /**
     * Layerクリアのたび（Map選択画面へ戻るたび）、またはResearch Hub表示のたびに
     * 呼ばれ、直近のスナップショットを丸ごと置き換える。
     * @param {{nextLayer:number, environmentSelectedId?:string, environmentResolvedId?:string,
     *   protocolIds?:string[], mapVisitedNodes?:Array<Object>, inHub?:boolean}} snapshot
     */
    saveContinueSnapshot(snapshot) {
      this.data.runData.continueSnapshot = Object.assign({ inHub: false }, snapshot, { timestamp: Date.now() });
      this.data.metaData.lastPlayed = Date.now();
      this.save();
    }

    /** STEP40-2: NEW RESEARCH開始時のみ呼ぶ（startNewResearch()から使用）。個別に呼ぶ用途は無くなった */
    clearContinueSnapshot() {
      if (!this.data.runData.continueSnapshot) return;
      this.data.runData.continueSnapshot = null;
      this.save();
    }

    /** ---------------- STEP40-2: Meta Data / Story Progress / Collection ---------------- */

    /**
     * @returns {boolean} 現在の周回で何らかのStory Progress（Chapter進行/Dialogue既読/
     *   Memory取得/中断中のRUN等）が存在するか。NEW RESEARCH確認ダイアログの
     *   表示要否判定に使う（何も進んでいない状態でNEW RESEARCHを選んでも確認不要）。
     */
    hasStoryProgress() {
      const story = this.data.storyData;
      return story.layerStoryProgress.currentLayer > 1
        || story.layerStoryProgress.completedLayers.length > 0
        || story.layerStoryProgress.completedChapters.length > 0
        || story.memoryProgress.collectedMemoryIds.length > 0
        || story.dialogueHistory.completedDialogueIds.length > 0
        || !!this.data.runData.continueSnapshot;
    }

    /**
     * NEW RESEARCH開始時に呼ぶ。storyData/runDataを初期値へ戻し、metaData
     * （Research Rank算出元・Protocol Unlock・Achievement・Ending・Collection等）は
     * 一切変更しない。
     */
    startNewResearch() {
      this.data.storyData = defaultStoryData();
      this.data.runData = defaultRunData();
      this.save();
    }

    /** @returns {Object} { [memoryId]: {firstUnlockedAt, firstUnlockedLayer} } の複製 */
    getMemoryCollection() {
      return Object.assign({}, this.data.metaData.collectionMemory);
    }

    /** @returns {{collected:number, total:number, rate:number}} 生涯収集率（Archive Collectionタブ用） */
    getMemoryCollectionProgress() {
      const total = G.MemoryData ? G.MemoryData.ALL.length : 0;
      const collected = Object.keys(this.data.metaData.collectionMemory).length;
      return { collected, total, rate: total > 0 ? collected / total : 0 };
    }

    /** @returns {Object} { [characterId]: {firstDiscoveredAt, firstDiscoveredLayer} } の複製 */
    getCharacterCollection() {
      return Object.assign({}, this.data.metaData.collectionCharacter);
    }

    getCharacterCollectionProgress() {
      const total = G.CharacterData ? G.CharacterData.ALL.length : 0;
      const collected = Object.keys(this.data.metaData.collectionCharacter).length;
      return { collected, total, rate: total > 0 ? collected / total : 0 };
    }

    /** @returns {Object} { [dialogueId]: {firstUnlockedAt, firstUnlockedLayer} } の複製 */
    getDialogueCollection() {
      return Object.assign({}, this.data.metaData.collectionDialogue);
    }

    getDialogueCollectionProgress() {
      const total = G.DialogueData ? G.DialogueData.ALL.length : 0;
      const collected = Object.keys(this.data.metaData.collectionDialogue).length;
      return { collected, total, rate: total > 0 ? collected / total : 0 };
    }

    /** ---------------- STEP40-2: 将来のアップデート用（データ構造のみ、消費側は未実装） ---------------- */

    getStoryFlags() {
      return this.data.storyData.storyFlags.slice();
    }

    hasStoryFlag(flag) {
      return this.data.storyData.storyFlags.indexOf(flag) !== -1;
    }

    setStoryFlag(flag) {
      if (this.hasStoryFlag(flag)) return false;
      this.data.storyData.storyFlags.push(flag);
      this.save();
      return true;
    }

    getUnlockedUI() {
      return this.data.metaData.unlockedUI.slice();
    }

    unlockUI(id) {
      if (this.data.metaData.unlockedUI.indexOf(id) !== -1) return false;
      this.data.metaData.unlockedUI.push(id);
      this.save();
      return true;
    }

    getUnlockedThemes() {
      return this.data.metaData.unlockedThemes.slice();
    }

    unlockTheme(id) {
      if (this.data.metaData.unlockedThemes.indexOf(id) !== -1) return false;
      this.data.metaData.unlockedThemes.push(id);
      this.save();
      return true;
    }

    /** ---------------- STEP42: Dynamic Research Event System（演出専用、生涯履歴のみ） ---------------- */

    /** @param {{run:number, layer:number, id:string, category:string, text:string}} entry */
    recordResearchEventHistory(entry) {
      this.data.metaData.researchEventHistory.push(Object.assign({ timestamp: Date.now() }, entry));
      if (this.data.metaData.researchEventHistory.length > RESEARCH_EVENT_HISTORY_LIMIT) {
        this.data.metaData.researchEventHistory.splice(0, this.data.metaData.researchEventHistory.length - RESEARCH_EVENT_HISTORY_LIMIT);
      }
      this.save();
    }

    /** @returns {Array<Object>} 直近の履歴から新しい順 */
    getResearchEventHistory() {
      return this.data.metaData.researchEventHistory.slice().reverse();
    }

    /** ---------------- STEP43: Research Progression System（Facility Restoration） ---------------- */

    getFacilityRestorationPercent() {
      return this.data.metaData.facilityRestorationPercent;
    }

    /**
     * @param {number} percent facilityRestoration.jsが算出した最新値（0〜100）。
     *   既存の保存値を下回る場合は何もしない（減少しない、という要求仕様セクション2の
     *   「進行度を保存する」性質を守るためのガード）
     * @returns {boolean} 実際に更新されればtrue
     */
    recordFacilityRestorationPercent(percent) {
      const clamped = Math.max(0, Math.min(100, Math.round(percent)));
      if (clamped <= this.data.metaData.facilityRestorationPercent) return false;
      this.data.metaData.facilityRestorationPercent = clamped;
      this.save();
      return true;
    }
  }

  G.EndlessSaveStore = EndlessSaveStore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
