/**
 * endless.js
 * ENDLESS RESEARCHモード全体を統括するコントローラ。
 * TITLE→MODE SELECT→PROTOCOL SELECT→ENVIRONMENT DETECTION→RUN Initialize→
 * ENDLESS RESEARCH(GAME)。GAME内は「MAP（分岐するNode候補から1つ選ぶ）→
 * 選んだNodeの内容（Puzzle/Elite/Event/Research Lab/Recovery/Protocol Signal/
 * Boss。Unknownは選択時に上記いずれかへ解決される）→MAPへ戻る」の繰り返しで、
 * 以前のバージョンにあった「Depthごとに自動でPuzzleが始まる一本道」進行は
 * Map Generation System導入により置き換わった。RUN状態
 * （depth/score/life/maxLife/combo/perfectCount）の管理、スコア計算、
 * アップグレード/Protocol/Environment適用を行い、endlessGame.js（1問ごとの進行、
 * Elite変種の反映）・endlessResult.js（RESULT画面）・researchLab.js（3択画面）・
 * upgradeManager.js（所持アップグレード管理）・protocolManager.js（Active中の
 * Protocol群の管理、Phase Bで単一→最大2個の複数管理に変更）・
 * protocolSignal.js（Protocol追加/入替画面）・
 * protocolUnlock.js（Protocol解放条件の判定、Phase C）・
 * protocolFragment.js（Protocol Fragment獲得量の定義、Phase C）・
 * protocolArchive.js（発見済み/未発見Protocol一覧画面、Phase C）・
 * environmentManager.js（RUN開始時に選ぶResearch Environmentの状態管理＋
 * Detection画面の描画、Research Environmentシステム）・
 * environmentArchive.js（発見済み/未発見Environment一覧画面、Research Environment
 * システム）・nodeTypes.js（Map Node 8種+Elite変種3種の定義、Map Generation
 * System）・mapGenerator.js（Node分岐候補の生成、Map Generation System）・
 * mapUI.js（Map画面の描画、Map Generation System）・
 * endlessSave.js（ベスト記録の永続化）・map.js（depth→難易度）を束ねる。
 *
 * アップグレード・Protocol・Environmentはいずれも各管理クラス自身のreset()で
 * RUN開始/終了時に必ずクリアされるメモリ上の状態で、LocalStorageには一切保存しない
 * （Protocol/Environmentの「発見済み」記録自体は別途永続化されるが、これは
 * endlessSave.js側の責務。効果そのものはRUNごとにリセットされる）。
 * そのためベスト記録（endlessSave.js）やRUNをまたいだ進行には影響しない。
 *
 * main.js（Appクラス）とは以下の最小限の接点のみで連携し、既存の
 * ステージ/チュートリアル/Daily Puzzleのロジックには一切変更を加えない:
 *   - app.mode を 'endless' に切り替える（既存のタイマーループ等が
 *     endlessモード中は既存ゲームへ干渉しないようにするための目印）
 *   - app.showTitle() を呼ぶ（TITLE画面へ戻る、既存メソッドをそのまま利用）
 *   - GAME画面の盤面タップ/UNDO/RESET/HINTは、main.js側で
 *     `app.mode === 'endless'` の時だけ本モジュールへ委譲される
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const {
    EndlessSaveStore, EndlessRoundController, EndlessResultScreen,
    UpgradeManager, ResearchLab, EventManager, Score,
    ProtocolManager, ProtocolSelect, ProtocolSignal, ProtocolArchive,
    ProtocolUnlock, ProtocolFragment,
    EnvironmentManager, EnvironmentArchive,
    MapGenerator, MapUI, DifficultyManager, ResearchMapScreen,
    AIAnalysis, RiskChain, UnknownEvents, RewardChoice, ExtractManager,
    MetaProgression, NeuralLab,
    IdentityManager, IdentitySelect, ResearchProfile, AIFeedback, Achievements,
    WorldEnvironmentManager, EnvironmentModifierManager,
    EnvironmentScan, TransitionManager, EnvironmentHUD, EnvironmentRenderer, WorldEnvironmentArchive,
    WorldStabilityManager, WorldMutationManager, MutationRenderer,
    EnvironmentEventManager, EnvironmentEventPanel, EnvironmentEventArchive,
    HiddenEnvironmentManager, HiddenEnvironmentRenderer, HiddenEnvironmentArchive, HiddenEnvironmentData,
    AIDirector, DirectorHud,
    StoryData, StoryUnlockManager, ResearchDatabase, ResearchTimeline, EndingManager, StoryArchiveUI,
    StoryManager, LayerStoryData,
    DialogueManager,
    MemoryManager, MemoryArchiveUI, MemoryData, CharacterData,
    RelationshipManager, CharacterArchiveUI,
    ChapterArchiveUI, ResearchArchiveUI
  } = G;

  // ---- STEP30-4: World Stability System。Stability変化量（要求仕様セクション3どおり） ----
  const STABILITY_DELTA_UNKNOWN_NODE_ANALYZE = 5;   // Unknown Node解析 -5
  const STABILITY_DELTA_UNKNOWN_DIMENSION_ENTER = 15; // Unknown Dimension進入 -15
  const STABILITY_DELTA_RISK_CHAIN_CONTINUE = 2;    // Risk Chain継続 -2
  const STABILITY_DELTA_RESEARCH_LAB = 10;          // Research Lab +10
  const STABILITY_DELTA_SAFE_NODE = 3;              // Safe Node（Recovery Node） +3
  const STABILITY_DELTA_EXTRACT_SUCCESS = 5;        // Extract成功 +5
  // Mutation Event用予約 -10（要求仕様どおり値だけ定義。World Mutation自体はSTEP30-5以降の
  // 実装対象のため、今回はまだこの定数を使う呼び出し箇所が存在しない）
  const STABILITY_DELTA_MUTATION_EVENT_RESERVED = 10;

  const STARTING_LIFE = 3;
  const CLEAR_REWARD = 100;
  const PERFECT_REWARD = 100;
  const COMBO_REWARD_PER_STACK = 20;    // コンボ数×この値を加点（2連続なら+40、3連続なら+60…）
  const SPEED_BONUS_PER_SECOND = 5;     // parSecondsより1秒速くクリアするごとに加点
  const ADVANCE_DELAY_MS = 900;         // クリア/ミス演出とトーストを見る間を置いてから次の問題へ進む
  // STEP39-3: Final Chapter完了時に確定したStory Ending（endingManager.js）ごとの
  // Epilogue Dialogue id・表示アイコン。endingManager.js側のending idと1:1対応する
  const ENDING_EPILOGUE_DIALOGUE_ID = {
    ending_a: 'epilogue_normal',
    ending_true: 'epilogue_true',
    ending_d: 'epilogue_hidden',
    ending_b: 'epilogue_bad'
  };
  const ENDING_ICON = { ending_a: '🎬', ending_true: '🌟', ending_d: '🕵️', ending_b: '💥' };
  const RECOVERY_BASE_INTERVAL = 3;     // Recovery Protocol未所持時は回復しない。所持時の基準クリア間隔
  const ELITE_SCORE_MULTIPLIER = 1.5;   // Elite Node撃破時の総獲得スコア倍率
  const ELITE_FRAGMENT_BONUS = 2;       // Elite Node撃破時に追加で獲得するProtocol Fragment数
  const RECOVERY_NODE_LIFE_AMOUNT = 1;  // Recovery Nodeで回復するライフ量
  const RESEARCH_DATA_RATIO = 0.1;      // STEP27: 1クリアごとのReward獲得額のうちResearch Dataへ回る割合
  const AI_WARNING_CHAIN_THRESHOLD = 2; // STEP27: Risk Chainがこのレベル以上になった瞬間にAI Warningトーストを出す

  class EndlessMode {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（画面切り替え・盤面描画を再利用する）
     * @param {Object} deps.puzzleManager 既存PuzzleManagerインスタンス（問題生成を再利用する）
     * @param {Object} deps.app main.jsのAppインスタンス（mode切り替え・TITLE遷移の連携用）
     */
    constructor({ ui, puzzleManager, app }) {
      this.ui = ui;
      this.app = app;
      this.save = new EndlessSaveStore();
      this.upgradeManager = new UpgradeManager();
      this.protocolManager = new ProtocolManager();

      // ---- STEP29: Research Identity System ----
      // metaProgressionより先に作る（Protocol EngineerのEvolution Cost Down Perkを
      // metaProgression.getEvolutionCost()から参照させるため）
      this.identityManager = new IdentityManager({ save: this.save });

      // ---- STEP30-1: Environment Framework（Research LayerのVisual Theme。
      // 既存の「Research Environment」（environmentManager）とは別概念） ----
      this.worldEnvironmentManager = new WorldEnvironmentManager({ save: this.save });
      // STEP30-2: Environment Modifier System。worldEnvironmentManagerの現在Environmentを
      // 参照し、Puzzle/Reward/Protocol/Map/Unknown/Riskへの影響を一元管理する
      this.environmentModifierManager = new EnvironmentModifierManager({ worldEnvironmentManager: this.worldEnvironmentManager });

      // ---- STEP30-4: World Stability System ----
      this.worldStabilityManager = new WorldStabilityManager({ save: this.save });

      // ---- STEP30-5: World Mutation Trigger System ----
      this.worldMutationManager = new WorldMutationManager({
        save: this.save, worldStabilityManager: this.worldStabilityManager, worldEnvironmentManager: this.worldEnvironmentManager
      });
      this.mutationRenderer = new MutationRenderer({ ui });
      this.consecutiveUnknownAnalysesThisRun = 0; // 追加Trigger「Unknown Node連続解析」判定用

      // ---- STEP30-6: Environment Event System ----
      this.environmentEventManager = new EnvironmentEventManager({ save: this.save, worldEnvironmentManager: this.worldEnvironmentManager });
      this.environmentEventPanel = new EnvironmentEventPanel();
      this.environmentEventArchive = new EnvironmentEventArchive({ ui, save: this.save });
      this.environmentEventArchive.onBack = () => this._showArchiveHub();

      // ---- STEP30-7: Hidden Environment System ----
      this.hiddenEnvironmentManager = new HiddenEnvironmentManager({ save: this.save });
      this.hiddenEnvironmentRenderer = new HiddenEnvironmentRenderer();
      this.hiddenEnvironmentArchive = new HiddenEnvironmentArchive({ ui, save: this.save, hiddenEnvironmentManager: this.hiddenEnvironmentManager });
      this.hiddenEnvironmentArchive.onBack = () => this._showArchiveHub();
      this.unknownSuccessStreakThisRun = 0; // VOID MEMORYの解放条件（Unknown Node成功5連続）判定用
      this.researchLabVisitsThisRun = 0;    // GENESIS LABの解放条件（生涯Research Lab到達10回）判定用

      // ---- STEP31: AI Director System ----
      this.aiDirector = new AIDirector({ save: this.save });
      this.directorHud = new DirectorHud();

      // ---- STEP32: Narrative & Story System ----
      this.researchDatabase = new ResearchDatabase({ save: this.save });
      this.researchTimeline = new ResearchTimeline({ researchDatabase: this.researchDatabase });
      this.endingManager = new EndingManager({ save: this.save });
      this.storyArchiveUI = new StoryArchiveUI({
        ui, researchDatabase: this.researchDatabase, researchTimeline: this.researchTimeline,
        // 要求仕様セクション10「Research Codex統合」。既存Systemへは読み取り専用の
        // 集計関数経由でのみアクセスし、storyArchiveUI自身は他Managerを直接参照しない
        getCodexSummary: () => this._buildResearchCodexSummary()
      });
      this.storyArchiveUI.onBack = () => this._showArchiveHub();

      // ---- STEP32-1: Story Framework Base System (Layer Narrative System) ----
      this.storyManager = new StoryManager({ save: this.save });

      // ---- STEP32-3: Memory Fragment System ----
      // STEP32-4のrelationshipManagerがmemoryManagerに依存するため、
      // dialogueManager（STEP32-2）より先にここで生成する
      this.memoryManager = new MemoryManager({ save: this.save });
      this.memoryArchiveUI = new MemoryArchiveUI({ ui, memoryManager: this.memoryManager });
      this.memoryArchiveUI.onBack = () => this._showArchiveHub();

      // ---- STEP32-4: Character Relationship System ----
      this.relationshipManager = new RelationshipManager({
        save: this.save, memoryManager: this.memoryManager, storyManager: this.storyManager
      });
      this.characterArchiveUI = new CharacterArchiveUI({
        ui, relationshipManager: this.relationshipManager, memoryManager: this.memoryManager
      });
      this.characterArchiveUI.onBack = () => this._showArchiveHub();

      // ---- STEP32-2: Dialogue System ----
      this.dialogueManager = new DialogueManager({ ui, save: this.save, relationshipManager: this.relationshipManager });

      // ---- STEP30-3: Environment Visual / HUD Evolution ----
      this.environmentScan = new EnvironmentScan({ ui });
      this.transitionManager = new TransitionManager({ ui });
      this.environmentHud = new EnvironmentHUD();
      this.environmentRenderer = new EnvironmentRenderer({ save: this.save });
      this.worldEnvironmentArchive = new WorldEnvironmentArchive({ ui, save: this.save });
      this.worldEnvironmentArchive.onBack = () => this._showArchiveHub();
      this._previousWorldEnvDef = null; // RUN内で直前に確定していたEnvironment（Transition表示用、RUN開始時にnullへリセット）

      // ---- STEP28: Meta Progression / Permanent Research System ----
      // environmentManager/mapUIより先に作る（Rank解放Environmentのフィルタ・
      // Advanced Analysisの解析確率に参照させるため）
      this.metaProgression = new MetaProgression({ save: this.save, identityManager: this.identityManager });

      this.environmentManager = new EnvironmentManager({ ui, metaProgression: this.metaProgression });
      this.round = new EndlessRoundController({
        ui, puzzleManager,
        upgradeManager: this.upgradeManager,
        protocolManager: this.protocolManager,
        environmentManager: this.environmentManager,
        environmentModifierManager: this.environmentModifierManager,
        worldMutationManager: this.worldMutationManager,
        environmentEventManager: this.environmentEventManager,
        hiddenEnvironmentManager: this.hiddenEnvironmentManager,
        aiDirector: this.aiDirector
      });
      this.result = new EndlessResultScreen({
        onRetry: () => { this.aiDirector.recordRetry(); this._showNeuralLab(true); },
        onTitle: () => this._exitToTitle()
      });
      this.neuralLab = new NeuralLab({ ui, save: this.save, metaProgression: this.metaProgression, identityManager: this.identityManager });
      this.neuralLab.onStartRun = () => this.startRun();
      this.neuralLab.onExit = () => this.showModeSelect();

      // ---- STEP29: Research Identity System ----
      this.identitySelect = new IdentitySelect({ ui });
      this.identitySelect.onSelect = def => {
        this.identityManager.select(def.id);
        this.protocolSelect.show();
      };
      this.researchProfile = new ResearchProfile({ ui, save: this.save, identityManager: this.identityManager });
      this.researchProfile.onBack = () => this.showModeSelect();

      this.researchLab = new ResearchLab({ ui, upgradeManager: this.upgradeManager });
      this.researchLab.onSelect = def => this._handleUpgradeSelected(def);
      this.protocolSelect = new ProtocolSelect({ ui });
      this.protocolSelect.onSelect = def => this._handleProtocolSelected(def);
      this.protocolSignal = new ProtocolSignal({ ui, protocolManager: this.protocolManager, save: this.save });
      this.protocolSignal.onDecision = (action, def, targetId) => this._handleProtocolSignal(action, def, targetId);
      this.protocolArchive = new ProtocolArchive({ ui, save: this.save });

      // ---- STEP33: Research Archive System ----
      this.chapterArchiveUI = new ChapterArchiveUI({ ui, save: this.save });
      this.researchArchiveUI = new ResearchArchiveUI({
        ui, save: this.save,
        chapterArchiveUI: this.chapterArchiveUI,
        memoryArchiveUI: this.memoryArchiveUI,
        characterArchiveUI: this.characterArchiveUI,
        protocolArchive: this.protocolArchive,
        worldEnvironmentArchive: this.worldEnvironmentArchive
      });
      this.researchArchiveUI.onBack = () => this._showArchiveHub();

      this.environmentManager.onSelect = def => this._handleEnvironmentSelected(def);
      this.environmentManager.onBack = () => {
        // Protocol Selectへ戻る際、選択し直しでActive Protocolが重複しないよう空にしておく
        this.protocolManager.reset();
        this.protocolSelect.show();
      };
      this.environmentArchive = new EnvironmentArchive({ ui, save: this.save });
      this.mapUI = new MapUI({
        ui, protocolManager: this.protocolManager, metaProgression: this.metaProgression,
        identityManager: this.identityManager, environmentModifierManager: this.environmentModifierManager,
        environmentEventManager: this.environmentEventManager
      });
      this.mapUI.onSelect = node => this._handleMapNodeSelected(node);
      this.researchMap = new ResearchMapScreen({ ui });
      this.researchMap.onResume = () => this.ui.showScreen('map');
      this.researchMap.onExit = () => {
        if (global.confirm('RUNを中断してMODE SELECTへ戻りますか？（このRUNの記録は残りません）')) {
          this.exitRun();
        }
      };
      this.eventManager = new EventManager();

      // ---- STEP27: AI Analysis Risk/Reward System ----
      this.riskChain = new RiskChain();
      this.rewardChoice = new RewardChoice();
      this.rewardChoice.onSelect = opt => this._handleRewardChoiceSelected(opt);
      this.extractManager = new ExtractManager();
      this.extractManager.onReturn = bonus => this._handleExtractReturn(bonus);
      this.extractManager.onContinue = () => { /* オーバーレイを閉じるだけ。MAP画面はそのまま */ };
      this._pendingEliteReward = false; // Elite Nodeクリア直後、次のMAPへ戻る前にReward Choiceを挟むフラグ
      this._firstMissConsumedThisRun = false; // STEP28: Emergency Recovery（初回ミス軽減）を使用済みか

      this.visitedNodes = []; // 今RUNで実際に通ってきたNode（リサーチマップ画面の表示用、RUNごとにリセット）
      this.researchData = 0;          // STEP27: Extract Systemで使う蓄積リソース（RUNごとにリセット）
      this.unknownAnalysisCount = 0;  // STEP27: このRUNでUnknown NodeをANALYZEした回数
      this.maxRiskMultiplierThisRun = 1; // STEP27: このRUNで到達した最大Risk Chain倍率（Result画面表示用）
      this.depth = 0;
      this.score = 0;
      this.maxLife = STARTING_LIFE;
      this.life = STARTING_LIFE;
      this.combo = 0;
      this.perfectCount = 0;
      this.clearsSinceLifeRegen = 0;
      this.bossClearCount = 0;        // このRUNで撃破したBoss数（RUN終了時にtotalBossClearへ加算）
      this.memoryFragmentsThisRun = 0; // このRUNで獲得したMemory Fragment数（RUN終了時に生涯累計へ加算）
      this.nextUpgradeMultiplier = 1; // AI Anomalyイベントで次の1回のUpgrade取得を強化する倍率

      // ---- Phase C: Protocol Unlock/Fragment用のRUN内カウンタ ----
      this.eventCountThisRun = 0;       // Chaosの解放条件(Event発生10回)判定・RUN終了時のtotalEventCount加算に使う
      this.protocolFragmentsThisRun = 0; // このRUNで獲得したProtocol Fragment数（RUN終了時に生涯累計へ加算）
      this._life1AtDepth20ThisRun = false; // Minimalの解放条件(ライフ1でDepth20到達)を満たしたか

      // ---- STEP29: Research Identity System（AI Feedback集計用のRUN内カウンタ） ----
      this.clearsThisRun = 0;      // このRUNでクリアしたPuzzle/Elite/Boss総数（perfectRatio算出用）
      this._extractedThisRun = false; // Extract Systemで自主的にRUNを終えたか

      this.round.onClear = stats => this._handleRoundClear(stats);
      this.round.onTimeout = stats => this._handleRoundTimeout(stats);
      this.round.onTick = (remaining, limit) => this._renderTimer(remaining, limit);
      this.round.onHintUsed = () => this._handleHintUsed();

      this.el = {
        titleEndlessBtn: document.getElementById('titleEndlessBtn'),
        modeSelectBackBtn: document.getElementById('modeSelectBackBtn'),
        endlessStartBtn: document.getElementById('endlessStartBtn'),
        protocolSelectBackBtn: document.getElementById('protocolSelectBackBtn'),
        protocolArchiveBtn: document.getElementById('protocolArchiveBtn'),
        protocolArchiveBackBtn: document.getElementById('protocolArchiveBackBtn'),
        environmentArchiveBtn: document.getElementById('environmentArchiveBtn'),
        environmentArchiveBackBtn: document.getElementById('environmentArchiveBackBtn'),
        neuralLabBtn: document.getElementById('neuralLabModeSelectBtn'),
        researchProfileBtn: document.getElementById('researchProfileModeSelectBtn'),
        identitySelectBackBtn: document.getElementById('identitySelectBackBtn'),
        worldEnvArchiveBtn: document.getElementById('worldEnvArchiveModeSelectBtn'),
        envEventArchiveBtn: document.getElementById('envEventArchiveModeSelectBtn'),
        hiddenArchiveBtn: document.getElementById('hiddenArchiveModeSelectBtn'),
        storyArchiveBtn: document.getElementById('storyArchiveModeSelectBtn'),
        memoryArchiveBtn: document.getElementById('memoryArchiveModeSelectBtn'),
        characterArchiveBtn: document.getElementById('characterArchiveModeSelectBtn'),
        researchArchiveHubBtn: document.getElementById('researchArchiveHubBtn'),
        performanceModeBtn: document.getElementById('performanceModeBtn'),
        archiveHubBtn: document.getElementById('archiveHubBtn'),
        archiveHubBackBtn: document.getElementById('archiveHubBackBtn'),
        endlessBestDepth: document.getElementById('endlessBestDepth'),
        endlessBestScore: document.getElementById('endlessBestScore'),
        endlessTotalRuns: document.getElementById('endlessTotalRuns'),
        endlessTotalBossClear: document.getElementById('endlessTotalBossClear'),
        endlessMemoryFragments: document.getElementById('endlessMemoryFragments'),

        mapOverviewBtn: document.getElementById('mapOverviewBtn'),
        mapExtractBtn: document.getElementById('mapExtractBtn'),

        endlessHud: document.getElementById('endlessHud'),
        endlessHudDetailToggle: document.getElementById('endlessHudDetailToggle'),
        endlessHudDetailBody: document.getElementById('endlessHudDetailBody'),
        endlessProtocolValue: document.getElementById('endlessProtocolValue'),
        endlessSynergyBadge: document.getElementById('endlessSynergyBadge'),
        endlessEnvironmentValue: document.getElementById('endlessEnvironmentValue'),
        endlessDepthValue: document.getElementById('endlessDepthValue'),
        endlessLifeValue: document.getElementById('endlessLifeValue'),
        endlessScoreValue: document.getElementById('endlessScoreValue'),
        endlessComboValue: document.getElementById('endlessComboValue'),
        endlessTimeValue: document.getElementById('endlessTimeValue'),
        endlessUpgradeList: document.getElementById('endlessUpgradeList'),
        endlessResearchDataValue: document.getElementById('endlessResearchDataValue'),
        endlessRiskChainBadge: document.getElementById('endlessRiskChainBadge'),

        // STEP30-1: Environment Framework
        endlessWorldEnvValue: document.getElementById('endlessWorldEnvValue'),
        mapWorldEnvLabel: document.getElementById('mapWorldEnvLabel'),

        // STEP32-1: Story Framework Base System
        mapStoryStatus: document.getElementById('mapStoryStatus'),
        mapStoryChapterLabel: document.getElementById('mapStoryChapterLabel'),
        mapStoryLayerProgress: document.getElementById('mapStoryLayerProgress')
      };

      this._bindEvents();
    }

    _bindEvents() {
      if (this.el.titleEndlessBtn) {
        this.el.titleEndlessBtn.addEventListener('click', () => this.showModeSelect());
      }
      if (this.el.modeSelectBackBtn) {
        this.el.modeSelectBackBtn.addEventListener('click', () => this._exitToTitle());
      }
      if (this.el.endlessStartBtn) {
        this.el.endlessStartBtn.addEventListener('click', () => this.startRun());
      }
      if (this.el.protocolSelectBackBtn) {
        this.el.protocolSelectBackBtn.addEventListener('click', () => this.showModeSelect());
      }
      if (this.el.protocolArchiveBtn) {
        this.el.protocolArchiveBtn.addEventListener('click', () => this.protocolArchive.show());
      }
      if (this.el.protocolArchiveBackBtn) {
        // STEP33: protocolArchive.onBackが設定されていればそちらを優先する（RESEARCH ARCHIVE
        // 経由で開いた場合はそちらへ戻る）。未設定時は従来どおりARCHIVE HUBへ戻る
        this.el.protocolArchiveBackBtn.addEventListener('click', () => {
          if (this.protocolArchive.onBack) { this.protocolArchive.onBack(); return; }
          this._showArchiveHub();
        });
      }
      if (this.el.environmentArchiveBtn) {
        this.el.environmentArchiveBtn.addEventListener('click', () => this.environmentArchive.show());
      }
      if (this.el.environmentArchiveBackBtn) {
        this.el.environmentArchiveBackBtn.addEventListener('click', () => this._showArchiveHub());
      }
      if (this.el.neuralLabBtn) {
        this.el.neuralLabBtn.addEventListener('click', () => this._showNeuralLab(false));
      }
      if (this.el.researchProfileBtn) {
        this.el.researchProfileBtn.addEventListener('click', () => this.researchProfile.show());
      }
      if (this.el.identitySelectBackBtn) {
        this.el.identitySelectBackBtn.addEventListener('click', () => this.showModeSelect());
      }
      if (this.el.worldEnvArchiveBtn) {
        this.el.worldEnvArchiveBtn.addEventListener('click', () => this.worldEnvironmentArchive.show());
      }
      if (this.el.envEventArchiveBtn) {
        this.el.envEventArchiveBtn.addEventListener('click', () => this.environmentEventArchive.show());
      }
      if (this.el.hiddenArchiveBtn) {
        this.el.hiddenArchiveBtn.addEventListener('click', () => this.hiddenEnvironmentArchive.show());
      }
      if (this.el.storyArchiveBtn) {
        this.el.storyArchiveBtn.addEventListener('click', () => this.storyArchiveUI.show());
      }
      if (this.el.memoryArchiveBtn) {
        this.el.memoryArchiveBtn.addEventListener('click', () => this.memoryArchiveUI.show());
      }
      if (this.el.characterArchiveBtn) {
        this.el.characterArchiveBtn.addEventListener('click', () => this.characterArchiveUI.show());
      }
      if (this.el.researchArchiveHubBtn) {
        this.el.researchArchiveHubBtn.addEventListener('click', () => this.researchArchiveUI.show());
      }
      if (this.el.archiveHubBtn) {
        this.el.archiveHubBtn.addEventListener('click', () => this._showArchiveHub());
      }
      if (this.el.archiveHubBackBtn) {
        this.el.archiveHubBackBtn.addEventListener('click', () => this.showModeSelect());
      }
      if (this.el.performanceModeBtn) {
        this.el.performanceModeBtn.addEventListener('click', () => this._cyclePerformanceMode());
        this._renderPerformanceModeBtn();
      }
      if (this.el.mapOverviewBtn) {
        this.el.mapOverviewBtn.addEventListener('click', () => this._showResearchMap());
      }
      // UI改修: ENDLESS HUDの「詳細」ボタン。既定では閉じておき、盤面の視認性を優先する
      if (this.el.endlessHudDetailToggle && this.el.endlessHudDetailBody) {
        this.el.endlessHudDetailToggle.addEventListener('click', () => {
          const collapsed = this.el.endlessHudDetailBody.classList.toggle('hidden');
          this.el.endlessHudDetailToggle.textContent = collapsed ? '詳細 ▾' : '閉じる ▴';
          this.el.endlessHudDetailToggle.setAttribute('aria-expanded', String(!collapsed));
        });
      }
      if (this.el.mapExtractBtn) {
        this.el.mapExtractBtn.addEventListener('click', () => this._showExtract());
      }
    }

    /** STEP27: MAP画面の🚀EXTRACTボタンから呼ばれる。現在の蓄積状況をExtract確認画面に渡す */
    _showExtract() {
      this.extractManager.show({
        researchData: this.researchData,
        life: this.life,
        maxLife: this.maxLife,
        riskChainLevel: this.riskChain.getChainLevel()
      });
    }

    /** Extract確認画面で「RETURN TO SURFACE」を選んだ時。ボーナスを加算してRUNを正常終了させる */
    _handleExtractReturn(bonus) {
      this.researchData += bonus;
      this._extractedThisRun = true; // STEP29: AI Feedback Systemの分析材料
      // STEP30-4: 「Extract成功」+5
      this.worldStabilityManager.increaseStability(STABILITY_DELTA_EXTRACT_SUCCESS, { layer: this.depth, event: 'Extract成功' });
      // STEP31: Dialogue System。直後の_endRun()が'runEnd'トーストで即座に上書きするため、
      // ここではAIログへの記録のみ行いトースト表示は省略する
      this._showDirectorDialogue('extract', false);
      this._endRun();
    }

    /**
     * STEP28: NEURAL RESEARCH LAB画面を表示する。
     * @param {boolean} showArrival RUN終了直後の帰還時のみtrue（Surface Arrival演出を出す）。
     *   MODE SELECTから直接開く場合はfalse
     */
    _showNeuralLab(showArrival) {
      this.neuralLab.show(showArrival);
    }

    /** MAP画面の🗺️ボタンから呼ばれる。現在のRUN状況をリサーチマップ画面に渡して表示する */
    _showResearchMap() {
      this.researchMap.show({
        depth: this.depth,
        life: this.life,
        maxLife: this.maxLife,
        score: this.score,
        fragments: this.save.getProtocolFragments() + this.protocolFragmentsThisRun,
        visitedNodes: this.visitedNodes,
        ownedUpgrades: this.upgradeManager.getOwnedList(),
        activeProtocols: this.protocolManager.getActiveDefs(),
        activeSynergies: this.protocolManager.getActiveSynergies(),
        puzzleHistory: this.save.getPuzzleHistory(),
        mutationHistory: this.worldMutationManager.getMutationHistory() // STEP30-5: Archive Integration
      });
    }

    /** ---------------- 画面遷移 ---------------- */

    showModeSelect() {
      this.save.load();
      if (this.el.endlessBestDepth) this.el.endlessBestDepth.textContent = String(this.save.getBestDepth());
      if (this.el.endlessBestScore) this.el.endlessBestScore.textContent = String(this.save.getBestScore());
      if (this.el.endlessTotalRuns) this.el.endlessTotalRuns.textContent = String(this.save.getTotalRuns());
      if (this.el.endlessTotalBossClear) this.el.endlessTotalBossClear.textContent = String(this.save.getTotalBossClear());
      if (this.el.endlessMemoryFragments) this.el.endlessMemoryFragments.textContent = String(this.save.getMemoryFragments());
      this._renderPerformanceModeBtn();
      this.ui.showScreen('modeSelect');
    }

    /** UI改修: 5種のArchive画面への入口をまとめたハブ画面を表示する */
    _showArchiveHub() {
      this.ui.showScreen('archiveHub');
    }

    /**
     * STEP32セクション10「Research Codex統合」。既存の各System/Save APIを読むだけの
     * 集計関数。storyArchiveUIへ関数として注入し、UI側から他Systemへ直接アクセス
     * させない（要求仕様セクション13のアーキテクチャルール対応）。
     * @returns {Object<string, {unlocked:number, total:number}>}
     */
    _buildResearchCodexSummary() {
      const uniqueMutations = new Set(
        this.worldMutationManager.getMutationHistory().map(h => h.id)
      );
      return {
        // 修正: 基本3種(Protocols.ALL)だけでなくSignal限定6種(ProtocolSignals.ALL、
        // STEP32のColor Analyzer/Genesis Protocol含む)も母数に含める必要があった
        PROTOCOL: { unlocked: this.save.getUnlockedProtocols().length, total: G.ProtocolUnlock.getAllDefs().length },
        ENVIRONMENT: { unlocked: this.save.getUnlockedWorldEnvironments().length, total: G.WorldEnvironment.ALL.length },
        MUTATION: { unlocked: uniqueMutations.size, total: G.MutationData.ALL.length },
        EVENT: { unlocked: this.save.getDiscoveredEnvironmentEvents().length, total: G.EnvironmentEventData.ALL.length },
        HIDDEN: { unlocked: this.save.getHiddenUnlockFlags().length, total: G.HiddenEnvironmentData.ALL.length },
        ACHIEVEMENT: { unlocked: this.save.getCompletedAchievements().length, total: G.Achievements.ALL.length },
        STORY: (() => {
          const rate = this.researchDatabase.getCompletionRate();
          return { unlocked: rate.unlocked, total: rate.total };
        })(),
        // STEP32-3: Memory Fragment Systemセクション10「Story完了後、Memory収集率を
        // Research Archiveへ反映可能に」。既存のRESEARCH DATABASE画面のCodex一覧へ
        // そのまま合流させる形で実現した
        MEMORY: (() => {
          const progress = this.memoryManager.getMemoryProgress();
          return { unlocked: progress.collected, total: progress.total };
        })()
      };
    }

    /** STEP30-3: Performance Control。high→normal→low→highの順に巡回させる */
    _cyclePerformanceMode() {
      const order = ['high', 'normal', 'low'];
      const current = this.environmentRenderer.getPerformanceMode();
      const next = order[(order.indexOf(current) + 1) % order.length];
      this.environmentRenderer.setPerformanceMode(next);
      this._renderPerformanceModeBtn();
      // 表示中のTheme Animationへ即座に反映する
      this.environmentRenderer.render(this.worldEnvironmentManager.getCurrentEnvironment());
    }

    /** UI改修: 下部の縦積みボタンからヘッダーの⚙️アイコンボタンへ変更したため、
     *  現在値はtitle（ツールチップ）とaria-labelで示す */
    _renderPerformanceModeBtn() {
      if (!this.el.performanceModeBtn) return;
      const mode = this.environmentRenderer.getPerformanceMode().toUpperCase();
      this.el.performanceModeBtn.title = `描画負荷設定: ${mode}（タップで切替）`;
      this.el.performanceModeBtn.setAttribute('aria-label', `描画負荷設定: ${mode}`);
    }

    _exitToTitle() {
      clearTimeout(this._advanceTimer);
      this.round.stop();
      this.upgradeManager.reset();
      this.protocolManager.reset();
      this.environmentManager.reset();
      this.riskChain.reset();
      this._renderUpgrades();
      this._renderRiskChainBadge();
      this.app.mode = null;
      if (this.el.endlessHud) this.el.endlessHud.classList.add('hidden');
      this.app.showTitle();
    }

    /** GAME画面の「‹ BACK」から呼ばれる（main.js側でmode==='endless'の時だけ委譲される）。
     *  RUNを記録せずに中断し、MODE SELECTへ戻る。 */
    exitRun() {
      clearTimeout(this._advanceTimer);
      this.round.stop();
      this.upgradeManager.reset();
      this.protocolManager.reset();
      this.environmentManager.reset();
      this.riskChain.reset();
      this._renderUpgrades();
      this._renderRiskChainBadge();
      this.app.mode = null;
      if (this.el.endlessHud) this.el.endlessHud.classList.add('hidden');
      this.showModeSelect();
    }

    /** ---------------- RUN開始・進行 ---------------- */

    /**
     * MODE SELECTの「START RUN」から呼ばれる。RUN本体の初期化はProtocol Select→
     * Environment Detection完了後（_initializeRun）に行う。
     * STEP29: まだResearch Identityを選択したことが無い場合のみ、Protocol Selectより
     * 先にIdentity Select（新規プレイ開始時の一度きりの選択）を挟む。
     */
    startRun() {
      clearTimeout(this._advanceTimer);
      this.protocolManager.reset();
      this.environmentManager.reset();
      if (!this.identityManager.isSelected()) {
        this.identitySelect.show();
        return;
      }
      this.protocolSelect.show();
    }

    /** Protocol Select画面でのカード選択（protocolSelect.onSelect経由）。続けてEnvironment Detectionを表示する */
    _handleProtocolSelected(def) {
      this.protocolManager.select(def.id);
      this.environmentManager.show();
    }

    /** Environment Detection画面での選択（environmentManager.onSelect経由、resolvedDefを受け取る） */
    _handleEnvironmentSelected(resolvedDef) {
      if (this.environmentManager.isUnstableRoll()) {
        this.ui.showToast(`UNSTABLE SYSTEM → ${resolvedDef.name}`);
      }
      this._initializeRun();
    }

    /** Protocol・Environment確定後のRUN初期化。以前のstartRun()本体（画面遷移含む） */
    _initializeRun() {
      clearTimeout(this._advanceTimer);
      this.upgradeManager.reset();
      this.visitedNodes = [];
      this.riskChain.reset();
      this._pendingEliteReward = false;
      this._firstMissConsumedThisRun = false;
      this.researchData = 0;
      this.unknownAnalysisCount = 0;
      this.maxRiskMultiplierThisRun = 1;
      this._renderRiskChainBadge();
      this.depth = 0;
      this.score = 0;
      // Explorer Protocol所持時、開始時の最大ライフに反映する（Environment側にライフ効果は無い）。
      // STEP29: SurvivalistのStarting Life/Life IncreaseもここでSTARTING_LIFEへ加算する
      this.maxLife = STARTING_LIFE + this.protocolManager.getLifeBonus() + this.identityManager.getLifeBonus();
      this.life = this.maxLife;
      this.combo = 0;
      this.perfectCount = 0;
      this.clearsSinceLifeRegen = 0;
      this.bossClearCount = 0;
      this.memoryFragmentsThisRun = 0;
      this.nextUpgradeMultiplier = 1;
      this.eventCountThisRun = 0;
      // STEP29: Protocol EngineerのStarting Fragment（secondaryBonus）をRUN開始時に加算する
      this.protocolFragmentsThisRun = this.identityManager.getStartingFragmentBonus();
      this._life1AtDepth20ThisRun = false;
      this.clearsThisRun = 0;
      this._extractedThisRun = false;
      // STEP30-1: 実際のEnvironment確定は最初のLayer移動（_handleMapNodeSelected）任せにし、
      // ここでは前RUNの表示が一瞬残らないよう見た目だけリセットする
      if (this.el.endlessWorldEnvValue) this.el.endlessWorldEnvValue.textContent = '-';
      if (this.el.mapWorldEnvLabel) this.el.mapWorldEnvLabel.textContent = '';
      // STEP30-3: 前RUNのEnvironmentを引き継がない（最初のLayerではTransition演出を出さない）
      this._previousWorldEnvDef = null;
      this.environmentHud.hide();
      // STEP30-4: World Stabilityを100へリセットする（生涯データのmutationLevel等はリセットしない）
      this.worldStabilityManager.reset();
      // STEP30-5: World Mutationも同様にRUN開始時は必ず解除する
      this.worldMutationManager.reset();
      this.consecutiveUnknownAnalysesThisRun = 0;
      // STEP30-6: Environment Eventも同様にRUN開始時は必ず解除する
      this.environmentEventManager.reset();
      // STEP30-7: Hidden Environmentも同様にRUN開始時は必ず解除する
      this.hiddenEnvironmentManager.reset();
      this.hiddenEnvironmentRenderer.hideHud();
      this.unknownSuccessStreakThisRun = 0;
      this.researchLabVisitsThisRun = 0;
      // STEP31: AI DirectorのRUNスコープ状態も同様にRUN開始時は必ず解除する（PlayerProfile/Personalityは維持）
      this.aiDirector.reset();
      // UI改修: 前RUN終了時の表示が新RUN開始直後に一瞬残らないよう、明示的にhideする
      this.directorHud.hide();

      // Research Environment: 選んだ（Unstable Systemなら実際に解決された分も）Environmentを発見済みとして記録する
      if (this.environmentManager.getSelectedId()) {
        this.save.unlockEnvironment(this.environmentManager.getSelectedId());
      }
      if (this.environmentManager.isUnstableRoll()) {
        this.save.unlockEnvironment(this.environmentManager.getResolvedId());
      }

      this.app.mode = 'endless';
      if (this.el.endlessHud) this.el.endlessHud.classList.remove('hidden');
      this._renderProtocolBadge();
      this._renderEnvironmentBadge();
      this.ui.renderGameHeader({ label: 'ENDLESS RESEARCH', starsText: '' });
      this.ui.hideTutorialBanner();
      this.ui.showScreen('game');

      this._showMapChoices();
    }

    /** ゲーム中HUDに現在のResearch Environmentを表示する（Unstable Systemなら解決先も併記） */
    _renderEnvironmentBadge() {
      if (!this.el.endlessEnvironmentValue) return;
      const selected = this.environmentManager.getSelected();
      if (!selected) {
        this.el.endlessEnvironmentValue.textContent = '-';
        return;
      }
      const resolved = this.environmentManager.getResolved();
      this.el.endlessEnvironmentValue.textContent = this.environmentManager.isUnstableRoll()
        ? `${selected.name}→${resolved.name}`
        : selected.name;
    }

    /** ゲーム中HUDに現在Active中のProtocol名（複数可）と発動中のSynergyを表示する */
    _renderProtocolBadge() {
      if (this.el.endlessProtocolValue) {
        const defs = this.protocolManager.getActiveDefs();
        this.el.endlessProtocolValue.textContent = defs.length ? defs.map(d => d.name).join(' + ') : '-';
      }
      if (this.el.endlessSynergyBadge) {
        const synergies = this.protocolManager.getActiveSynergies();
        if (synergies.length > 0) {
          this.el.endlessSynergyBadge.textContent = `⚡ SYNERGY: ${synergies.map(s => s.name).join(', ')}`;
          this.el.endlessSynergyBadge.title = synergies.map(s => s.description).join(' / ');
          this.el.endlessSynergyBadge.classList.remove('hidden');
        } else {
          this.el.endlessSynergyBadge.textContent = '';
          this.el.endlessSynergyBadge.title = '';
          this.el.endlessSynergyBadge.classList.add('hidden');
        }
      }
    }

    /**
     * Protocol Slotの構成（Explorer/Chaos等のlifeBonus）が変化した直後に呼ぶ。
     * 最大ライフを再計算し、現在ライフをクランプする。
     * 増加分は即座に現在ライフへも反映する（Repair Systemアップグレードと同じ扱い）が、
     * 減少時はダメージとしては扱わず、新しい上限を超えている分だけ切り詰める
     * （ChaosをMergeしただけで即ライフを失うような理不尽さを避けるため）。
     */
    _recalculateMaxLife() {
      const newMaxLife = Math.max(1, STARTING_LIFE + this.protocolManager.getLifeBonus() + this.identityManager.getLifeBonus());
      const delta = newMaxLife - this.maxLife;
      this.maxLife = newMaxLife;
      this.life = delta > 0 ? Math.min(this.maxLife, this.life + delta) : Math.min(this.life, this.maxLife);
    }

    /** ---------------- PROTOCOL ARCHIVE / UNLOCK / FRAGMENT (Phase C) ---------------- */

    /**
     * Depth進行・Event発生・クリア（PERFECT/Boss）のたびに呼び、未解放Protocolの
     * 解放条件（protocolUnlock.js）を満たしたかどうかを判定する。「生涯」条件
     * （Boss撃破/Event発生/PERFECTクリアの累計回数、最高到達Depth）は
     * 「保存済みの過去分(save.getTotalX()) + 今RUNでの分(RUN内カウンタ)」を
     * 都度合算したその場の値で判定する（永続化自体はrecordRun()でRUN終了時に
     * まとめて行うが、判定とDiscovery演出はRUN中でも即座に反応させるため）。
     * 新たに条件を満たしたProtocolは即座にendlessSave.jsへ解放登録し、発見演出を出す。
     */
    _checkProtocolUnlocks() {
      const snapshot = {
        bestDepthEver: Math.max(this.depth, this.save.getBestDepth()),
        bossClearTotal: this.save.getTotalBossClear() + this.bossClearCount,
        eventTotal: this.save.getTotalEventCount() + this.eventCountThisRun,
        perfectTotal: this.save.getTotalPerfectCount() + this.perfectCount,
        life1AtDepth20: this._life1AtDepth20ThisRun ? 1 : 0,
        metaRank: this.metaProgression.getRankNumber() // STEP28: Meta Progression経由の解放（Neural Link等）
      };

      const newlyUnlockable = ProtocolUnlock.findNewlyUnlockable(snapshot, this.save.getUnlockedProtocols());
      newlyUnlockable.forEach(id => {
        if (!this.save.unlockProtocol(id)) return; // 既に解放済み（念のための二重判定ガード）
        const def = ProtocolUnlock.getById(id);
        if (def) this.ui.showProtocolDiscovery(def);
      });
    }

    /** ---------------- PROTOCOL SIGNAL ---------------- */

    /** Protocol Signal画面での決定（protocolSignal.onDecision経由） */
    _handleProtocolSignal(action, def, targetId) {
      let message;
      if (action === 'merge' && def) {
        this.protocolManager.merge(def.id);
        this._recalculateMaxLife();
        message = `Protocolを追加: ${def.name}`;
      } else if (action === 'replace' && def && targetId) {
        this.protocolManager.replace(targetId, def.id);
        this._recalculateMaxLife();
        message = `Protocolを入替: ${def.name}`;
      } else {
        message = '信号を無視した';
      }

      const synergies = this.protocolManager.getActiveSynergies();
      if (synergies.length > 0) {
        message += ` / SYNERGY発動: ${synergies.map(s => s.name).join(', ')}`;
        this._grantIdentityExp('synergyActive'); // STEP29: Protocol EngineerのEXP源
      }

      this._renderProtocolBadge();
      this._renderHud();
      this.ui.showNodeResult({
        icon: '📡',
        title: 'PROTOCOL SIGNAL',
        message,
        onContinue: () => { this.ui.showScreen('game'); this._showMapChoices(); }
      });
    }

    /** ---------------- MAP GENERATION SYSTEM ---------------- */

    /** 次のDepth（this.depth+1）の分岐候補を生成し、Map画面で提示する */
    _showMapChoices() {
      const nextDepth = this.depth + 1;
      // STEP28: Deep Scan（researchTree.js）の所持レベルに応じて分岐候補数が増える
      // STEP29: ExplorerのMap Scan（primaryBonus/perk）もここに合算される
      const extraChoices = this.metaProgression.getExtraMapChoices() + this.identityManager.getExtraMapChoices();
      let choices = MapGenerator.generateChoices(
        nextDepth, this.protocolManager, this.environmentManager, extraChoices, this.environmentModifierManager, this.worldMutationManager
      );
      // STEP30-6: ROOT CONNECTION Eventの「Research Lab生成」。次のMap候補に必ず1つ
      // Research Labを含める（既にBoss単独Nodeや周期出現で含まれている場合は追加しない）
      if (this._forceLabOnNextMap) {
        this._forceLabOnNextMap = false;
        if (!choices.some(n => n.type === 'research_lab') && choices.length > 0 && choices[0].type !== 'boss') {
          choices = choices.slice();
          choices[0] = MapGenerator.buildNode('research_lab', nextDepth);
        }
      }
      // STEP30-7: Hidden Environment入場中は対応するNode種類の候補を優先的に押し込む
      // （例: GENESIS LABの「Research Lab大量生成」、VOID MEMORYのUnknown増加）。
      // 既存のmapGenerator生成アルゴリズム自体は変更せず、戻り値を事後的に差し替えるだけに留めている
      const currentHidden = this.hiddenEnvironmentManager.getCurrentHiddenEnvironment();
      if (currentHidden && choices[0] && choices[0].type !== 'boss') {
        const boostedType = ['research_lab', 'unknown', 'elite'].find(
          t => this.hiddenEnvironmentManager.getHiddenNodeWeightMultiplier(t) > 1
        );
        if (boostedType) {
          choices = choices.slice();
          const slots = boostedType === 'research_lab' ? 2 : 1;
          for (let i = 0; i < Math.min(slots, choices.length); i++) {
            if (choices[i].type !== boostedType) choices[i] = MapGenerator.buildNode(boostedType, nextDepth);
          }
        }
      }
      this.mapUI.show(nextDepth, choices);
    }

    /**
     * Map画面でのNode選択（mapUI.onSelect経由）。Depthの確定・Fragment/Unlock判定は
     * ここで行い（旧_advance()相当）、その後選ばれたNodeの種類ごとの実処理へ渡す。
     */
    _handleMapNodeSelected(node) {
      this.depth++;

      // STEP31: AI Director System。「AIは毎Layer更新」（要求仕様セクション5）に従い、
      // Adaptive Difficulty/DirectorStateをこのLayer移動のたびに再計算する。所持Protocolの
      // タリーもここで記録し（favoriteProtocol算出用）、Layer開始のDialogueを1つ表示する
      this.aiDirector.updateLayer();
      this.aiDirector.recordActiveProtocols(this.protocolManager.getActiveIds());
      this._showDirectorDialogue('layerStart');
      this.directorHud.render(this.aiDirector.getState());
      this._checkStoryUnlocks(); // STEP32: Narrative & Story System

      // Phase C: 到達Depthに応じたProtocol Fragment獲得（DEPTH_MILESTONE_INTERVALごと。
      // Deep Research Environment所持時は_gainProtocolFragments内で倍率がかかる）
      this._gainProtocolFragments(ProtocolFragment.forDepthMilestone(this.depth));
      // Minimalの解放条件（ライフ1でDepth20以上に到達）を、このDepthへ進む瞬間の残りライフで判定する
      if (this.depth >= 20 && this.life === 1) this._life1AtDepth20ThisRun = true;
      this._checkProtocolUnlocks();
      this._grantIdentityExp('depthAdvance'); // STEP29: ExplorerのEXP源

      // STEP30-1: Layer移動のたびにEnvironmentを確定させる（Layerは今RUNのDepthそのもの）
      const worldEnvResult = this.worldEnvironmentManager.setCurrentEnvironment(this.depth);
      this._renderWorldEnvironmentBadge(worldEnvResult.def);
      // STEP30-2: 現在Environmentが持つModifierを発見済みとして記録する（Random Modifierは
      // 都度別の実体に解決されるため、その時点で借用された側のidがそのまま記録される）
      this.environmentModifierManager.getActiveModifiers().forEach(m => this.save.recordEnvironmentModifierDiscovery(m.id));
      // STEP30-3: 訪問履歴・First Discovery（Environment Archive用）を記録する
      this.save.recordEnvironmentVisit(worldEnvResult.def.id, this.depth);
      this.save.recordEnvironmentDiscoveryLog(worldEnvResult.def.id, this.depth);

      this._renderHud();

      // STEP30-3: Environmentが実際に変化した時のみ、Transition→Scanの順で演出を挟んでから
      // Puzzle/Node開始へ進む（変化していない時は既存どおり即座に進む＝既存ゲーム処理を維持）
      // worldEnvResult.changedはRUNをまたいだ「保存済みの前回値」との比較のため、新規RUNの
      // Layer1が偶然その値と一致するとfalseになりうる。ここではRUN内で直前に表示していた
      // Environmentとの比較（_previousWorldEnvDefがnull＝このRUNで最初のLayer、を含む）で
      // 判定し直し、新規RUNでも必ずLayer1でScanが表示されるようにする
      const previousDef = this._previousWorldEnvDef;
      const changedThisRun = !previousDef || previousDef.id !== worldEnvResult.def.id;
      this._previousWorldEnvDef = worldEnvResult.def;

      // STEP30-4: 「Unknown Dimension進入」-15。UNKNOWN DIMENSIONへ実際に切り替わった瞬間のみ
      if (changedThisRun && worldEnvResult.def.id === 'env_unknown') {
        this.worldStabilityManager.decreaseStability(STABILITY_DELTA_UNKNOWN_DIMENSION_ENTER, { layer: this.depth, event: 'Unknown Dimension進入' });
        this._renderWorldEnvironmentBadge(worldEnvResult.def); // Stability変化をHUDへ即座に反映する
      }

      if (changedThisRun) {
        this.transitionManager.show(previousDef, worldEnvResult.def, () => {
          this.environmentScan.show(worldEnvResult.def, this.worldStabilityManager.getStatus(), () => this._afterLayerEnvironmentReady(node));
        });
      } else {
        this._afterLayerEnvironmentReady(node);
      }
    }

    /**
     * STEP30-5: Environment Transition/Scan演出（変化した場合のみ）が完了した直後に呼ばれる。
     * Mutation持続ターンを消費し、新たなMutation Trigger判定を行った上でNodeへ進む
     * （Mutation Choice Event/Visual Sequenceが表示される場合は、それらが完了してから
     * Nodeを開始する＝Puzzle開始より必ず前に表示される、という要求仕様セクション1の
     * フローを守るための分岐）。
     */
    _afterLayerEnvironmentReady(node) {
      this.worldMutationManager.tickDuration({ run: this.save.getTotalRuns() + 1, layer: this.depth });
      this._checkMutationTrigger({}, () => {
        // STEP30-6: Environment Event System。Mutation判定が完了した後（要求仕様セクション3の
        // 「Layer開始時→Environment取得→Event抽選→条件確認→発生」フロー）に、前Layerで
        // Active化していたEventの持続ターンを消費してからEvent抽選を行う
        this.environmentEventManager.tickDuration();
        this._checkEnvironmentEventTrigger(() => {
          // STEP30-7: Hidden Environment System。Environment Event判定が完了した後に、
          // 前Layerで入場していたHidden Environmentの持続ターンを消費してから
          // 出現条件判定→（低確率の）再訪抽選を行う
          const wasInHidden = !!this.hiddenEnvironmentManager.getCurrentHiddenEnvironment();
          this.hiddenEnvironmentManager.tickDuration();
          if (wasInHidden && !this.hiddenEnvironmentManager.getCurrentHiddenEnvironment()) {
            this.hiddenEnvironmentRenderer.hideHud();
            this.ui.showToast('秘匿領域から離脱した');
          }
          this._checkHiddenEnvironmentTrigger(() => this._enterNode(node));
        });
      });
    }

    /**
     * STEP30-6: Environment Event Trigger判定（要求仕様セクション3）。発生率はNormal/
     * World Mutation中/World Stability Criticalで変化する（environmentEventManager.js参照）。
     * 何もトリガーされなければ即座に`onDone`を呼ぶ（既存フローを止めない）。
     * Choice Event（Unknown Signal）はプレイヤーの選択を待ってから`onDone`を呼ぶ。
     * @param {Function} [onDone]
     */
    _checkEnvironmentEventTrigger(onDone) {
      const def = this.environmentEventManager.checkEventTrigger({
        mutationActive: !!this.worldMutationManager.getActiveMutation(),
        stabilityStatus: this.worldStabilityManager.getStatus(),
        directorRateBonus: this.aiDirector.getEventTriggerRateBonus() // STEP31: Event Recommendation
      });
      if (!def) { if (onDone) onDone(); return; }

      this.aiDirector.notifyEventTriggered(); // STEP31: 「長時間Eventなし」判定用カウンタをリセット
      this.environmentEventManager.triggerEvent(def.id, { run: this.save.getTotalRuns() + 1, layer: this.depth });

      if (def.choices) {
        this.environmentEventPanel.showChoice(def, {
          onYes: () => this._resolveEnvironmentEventChoice(def, 'yes', onDone),
          onNo: () => this._resolveEnvironmentEventChoice(def, 'no', onDone)
        });
        return;
      }

      const message = this._applyEnvironmentEventEffect(def);
      this._renderHud();
      this.environmentEventPanel.show(def, message, () => {
        // Instant系効果を持つEventはここで即座に終了する（Passive Modifier系は
        // Activeのままにし、_handleRoundClear経由のtickDuration()で自然に終了させる）
        if (G.EnvironmentEventData.INSTANT_EFFECT_TYPES.some(t => this.environmentEventManager.getInstantEffect(t))) {
          this.environmentEventManager.resolveEvent();
        }
        if (onDone) onDone();
      });
    }

    /** @returns {string} Result表示用の効果適用結果メッセージ（Instant系効果のみ即座に適用する） */
    _applyEnvironmentEventEffect(def) {
      const reveal = this.environmentEventManager.getInstantEffect('revealNextNode');
      if (reveal) {
        this.mapUI.forceRevealNext();
        return '次のスキャンでNode情報が事前に開示される。';
      }

      const route = this.environmentEventManager.getInstantEffect('revealRouteHistory');
      if (route) {
        const recent = this.visitedNodes.slice(-5).map(n => n.name).join(' → ');
        return recent ? `経路: ${recent}` : 'まだ経路履歴が無い。';
      }

      const lab = this.environmentEventManager.getInstantEffect('forceLabSpawn');
      if (lab) {
        this._forceLabOnNextMap = true;
        return '次のMapにResearch Labが出現する。';
      }

      const life = this.environmentEventManager.getInstantEffect('lifeRecoveryInstant');
      if (life) {
        const before = this.life;
        this.life = Math.min(this.maxLife, this.life + life.value);
        const recovered = this.life - before;
        return recovered > 0 ? `ライフ +${recovered}` : 'ライフはすでに満タン。';
      }

      const fragment = this.environmentEventManager.getInstantEffect('protocolFragmentInstant');
      if (fragment) {
        this._gainProtocolFragments(fragment.value);
        return `Protocol Fragment +${fragment.value}`;
      }

      const data = this.environmentEventManager.getInstantEffect('researchDataInstant');
      if (data) {
        this.researchData += data.value;
        return `Research Data +${data.value}`;
      }

      // Passive Modifier系（rewardMultiplier/researchDataMultiplier/protocolFragmentMultiplier/
      // hintRevealBonus/puzzleDifficulty/rewardPredictionAccuracy/rareEventWeightBoost/
      // unknownRevealChance）は即時適用するものが無く、以後のPuzzle/Node解決時に
      // 各種getterを通じて自動的に反映される
      return def.description;
    }

    /**
     * STEP30-6: Choice Event（Unknown Signal）の選択確定。
     * YES: Rare Protocol取得を試行 + Research Data大量獲得 + Stability -10（要求仕様セクション9/13）
     * NO: 何も起きず安全に終了する
     */
    _resolveEnvironmentEventChoice(def, choiceId, onDone) {
      const choice = def.choices.find(c => c.id === choiceId);
      let message = '信号を無視した';
      let rewardValue = 0;

      if (choice && choiceId === 'yes') {
        const dataEffect = choice.effects.find(e => e.type === 'researchDataInstant');
        if (dataEffect) {
          this.researchData += dataEffect.value;
          rewardValue += dataEffect.value;
        }

        const rareProtocolMessage = this._grantRareProtocol();

        const stabilityEffect = choice.effects.find(e => e.type === 'stabilityDelta');
        if (stabilityEffect) {
          this.worldStabilityManager.decreaseStability(Math.abs(stabilityEffect.value), { layer: this.depth, event: 'Unknown Signal Analyze' });
          this._renderWorldEnvironmentBadge(this.worldEnvironmentManager.getCurrentEnvironment());
          // STEP30-5: 追加Trigger「Special Event」（Unknown Signal解析時）。
          // 発生してもEventの完了自体は待たせず、次のMutation Trigger判定機会（次のLayer移動）で反映される
          this._checkMutationTrigger({ specialEventTriggered: true });
        }

        message = `${rareProtocolMessage} / Research Data +${dataEffect ? dataEffect.value : 0}`;
      }

      this.environmentEventManager.resolveEvent(choiceId, rewardValue);
      this._renderHud();
      this._renderProtocolBadge();

      this.environmentEventPanel.show(def, message, onDone);
    }

    /** @returns {string} 未所持のProtocolをmergeで1つ付与する（Slot枠が無ければFragmentで代替する。要求仕様「Rare Protocol」の実装） */
    _grantRareProtocol() {
      const unlockedIds = this.save.getUnlockedProtocols();
      const activeIds = this.protocolManager.getActiveDefs().map(d => d.id);
      const candidateIds = unlockedIds.filter(id => activeIds.indexOf(id) === -1);
      if (candidateIds.length === 0 || this.protocolManager.getActiveDefs().length >= 2) {
        // 空きSlotが無い、または追加できるProtocolが無い場合はProtocol Fragmentで代替する
        // （_applyBossShortcutの「代替報酬」と同じ設計判断）
        this._gainProtocolFragments(8);
        return '空きProtocol Slotが無い — 代わりにProtocol Fragment +8';
      }
      const pickedId = candidateIds[Math.floor(Math.random() * candidateIds.length)];
      this.protocolManager.merge(pickedId);
      this._recalculateMaxLife();
      const def = ProtocolUnlock ? ProtocolUnlock.getById(pickedId) : null;
      return `Rare Protocol獲得: ${def ? def.name : pickedId}`;
    }

    /** ---------------- STEP30-7: Hidden Environment System ---------------- */

    /**
     * Hidden Environment出現判定（要求仕様セクション1/3）。まず`checkUnlock()`で
     * このLayer移動までの生涯/RUN内スナップショットを基に新規解放を確認し、新規解放が
     * あれば要求仕様セクション13の「条件達成→Hidden抽選」の直接の因果関係を満たすため
     * その場でそのEnvironmentへの入場を確定させる。新規解放が無ければ、既に解放済みの
     * Environmentの中から低確率の再訪抽選（`rollHiddenEnvironment()`）を行う。
     * 何も起きなければ即座に`onDone`を呼ぶ（既存フローを止めない）。
     * @param {Function} [onDone]
     */
    _checkHiddenEnvironmentTrigger(onDone) {
      const snapshot = {
        unknownStreak: this.unknownSuccessStreakThisRun,
        protocolFragmentsTotal: this.save.getProtocolFragments() + this.protocolFragmentsThisRun,
        researchLabVisitsTotal: this.save.getTotalResearchLabVisits() + this.researchLabVisitsThisRun,
        bestLayer: Math.max(this.depth, this.save.getBestDepth()),
        totalRuns: this.save.getTotalRuns(),
        worldCollapseNoExtract: this.worldStabilityManager.getStatus() === 'COLLAPSE' && !this._extractedThisRun
      };
      const newlyUnlocked = this.hiddenEnvironmentManager.checkUnlock(snapshot);
      const def = newlyUnlocked.length > 0 ? newlyUnlocked[0] : this.hiddenEnvironmentManager.rollHiddenEnvironment();
      if (!def) { if (onDone) onDone(); return; }

      this.hiddenEnvironmentRenderer.showDiscovery(def, () => {
        this.hiddenEnvironmentManager.enterHiddenEnvironment(def.id, { run: this.save.getTotalRuns() + 1, layer: this.depth });
        this.hiddenEnvironmentRenderer.showHud(def);
        this.ui.showToast(`秘匿領域: ${def.name}`);
        // STEP31: Dialogue System。直上の「SECRET AREA」トーストを上書きしてしまうため、
        // ここではAIログへの記録のみ行いトースト表示は省略する
        this._showDirectorDialogue('hiddenFound', false);

        const exclusiveEvent = HiddenEnvironmentData.getExclusiveEventForEnvironment(def);
        const exclusiveReward = HiddenEnvironmentData.getExclusiveRewardForEnvironment(def);
        const messages = [];
        if (exclusiveEvent) messages.push(this._applyHiddenExclusiveEffect(exclusiveEvent.effect, exclusiveEvent.message));
        if (exclusiveReward) {
          messages.push(this._applyHiddenExclusiveEffect(exclusiveReward.effect, `REWARD: ${exclusiveReward.name}`));
          this.hiddenEnvironmentManager.markRewardUnlocked(def.id, exclusiveReward.id);
        }
        this._renderHud();

        if (messages.length === 0) { if (onDone) onDone(); return; }
        this.ui.showNodeResult({
          icon: '🌑',
          title: `${def.name} — 秘匿領域`,
          message: messages.join(' / '),
          onContinue: onDone
        });
      });
    }

    /**
     * Hidden Exclusive Event/Rewardの即時効果を適用する（environmentEventData.js
     * INSTANT_EFFECT_TYPESと同じ語彙+freeUpgradeInstant/revealLastRunRoute/stabilityDeltaを追加）。
     * @returns {string} 結果メッセージ
     */
    _applyHiddenExclusiveEffect(effect, label) {
      switch (effect.type) {
        case 'protocolFragmentInstant':
          this._gainProtocolFragments(effect.value);
          return `${label}: Protocol Fragment +${effect.value}`;
        case 'researchDataInstant':
          this.researchData += effect.value;
          return `${label}: Research Data +${effect.value}`;
        case 'lifeRecoveryInstant': {
          const before = this.life;
          this.life = Math.min(this.maxLife, this.life + effect.value);
          return `${label}: ライフ +${this.life - before}`;
        }
        case 'freeUpgradeInstant': {
          const candidates = G.Upgrades ? G.Upgrades.ALL.filter(u => !this.upgradeManager.isMaxed(u.id)) : [];
          if (candidates.length === 0) return `${label}: 獲得できるUpgradeが無かった`;
          const picked = candidates[Math.floor(Math.random() * candidates.length)];
          this.upgradeManager.acquire(picked.id);
          return `${label}: ${picked.name}を無償で獲得`;
        }
        case 'revealLastRunRoute': {
          const route = this.save.getLastRunVisitedNodes().slice(-5).map(n => n.name).join(' → ');
          return `${label}: ${route || '前回RUNの経路記録が無い'}`;
        }
        case 'stabilityDelta':
          this.worldStabilityManager.decreaseStability(Math.abs(effect.value), { layer: this.depth, event: label });
          return `${label}: Stability ${effect.value}`;
        default:
          return label;
      }
    }

    /** ---------------- STEP31: AI Director System ---------------- */

    /**
     * 要求仕様セクション10のDialogue Systemトリガーポイント（layerStart/mutation/
     * extract/hiddenFound/bossBefore/bossAfter/runEnd）で呼ぶ。短い一言をトースト表示する
     * （既存の`ui.showToast`と同じ「短い一行の状況通知」扱い。フィードバック
     * 「情報系オーバーレイは自動消滅させない」の対象外＝トーストのまま自動消滅でよい）。
     * @param {string} trigger
     */
    /**
     * @param {string} trigger
     * @param {boolean} [showToast=true] falseの場合、AIログへの記録のみ行いトースト表示は
     *   省略する（直後に別のトースト表示が続き、同一tickの`ui.showToast`の
     *   「後勝ち（textContent上書き）」仕様でこちらが即座に消されてしまう箇所
     *   ＝extract/hiddenFoundで使用。実装中にトースト上書きを実テストで検出した）
     */
    _showDirectorDialogue(trigger, showToast) {
      const line = this.aiDirector.getDialogue(trigger);
      if (line && showToast !== false) this.ui.showToast(`🤖 ${this.aiDirector.getPersonality().name}: "${line}"`);
      return line;
    }

    /** ---------------- STEP32: Narrative & Story System ---------------- */

    /**
     * StoryUnlockManager経由でのStory解放判定（要求仕様セクション5）。Layer進行時
     * （_handleMapNodeSelected）に呼ぶ。新規解放はトースト通知のみに留める
     * （Mutation/Event/Hidden Environment発見の一連の演出チェーンへ、さらに
     * 「続ける」ボタン付きオーバーレイを積み増さないための設計判断）。
     * Story Stageが進んだ瞬間はAI Directorの世界観Dialogueを別途トースト表示する。
     */
    _checkStoryUnlocks() {
      const snapshot = {
        layerReached: Math.max(this.depth, this.save.getBestDepth()),
        protocolCount: this.save.getUnlockedProtocols().length,
        mutationExperienced: this.worldMutationManager.getMutationHistory().length,
        eventEncountered: this.save.getTotalEventCount() + this.eventCountThisRun,
        bossDefeated: this.save.getTotalBossClear() + this.bossClearCount,
        researchDataAccumulated: this.save.getResearchDataTotal() + this.researchData,
        totalRuns: this.save.getTotalRuns(),
        hiddenUnlockedIds: this.save.getHiddenUnlockFlags()
      };

      // UI改修: `ui.showToast`は単一スロットの「後勝ち」実装のため、新規解放通知と
      // Stage遷移通知が同一tickで連続発火すると片方が消される（STEP31のDialogue System実装時に
      // 発見したのと同種のバグ。実テストで再現・検出した）。ここでは1つのトーストへ統合する
      const messages = [];
      const newlyUnlocked = StoryUnlockManager.findNewlyUnlockable(snapshot, this.researchDatabase);
      newlyUnlocked.forEach(entry => messages.push(`📖 ${entry.title}を解放した`));

      const newStage = this.researchDatabase.checkStageTransition();
      if (newStage) messages.push(`🤖 ${StoryData.STAGE_DIALOGUE[newStage]}`);

      if (messages.length > 0) this.ui.showToast(messages.join(' / '));
    }

    /**
     * World Mutation Trigger判定（要求仕様セクション4）をまとめて行うヘルパー。
     * Level3（Collapse）は問答無用でMutation Visual Sequenceを表示し、
     * Level1/2はMutation Choice Event（① Stabilize/② Exploit）を先に提示する。
     * 何もトリガーされなければ即座に`onDone`を呼ぶ（既存フローを止めない）。
     * @param {{consecutiveUnknownAnalyses?:number, riskChainLevel?:number,
     *   inUnknownDimension?:boolean, specialEventTriggered?:boolean}} [extraContext]
     * @param {Function} [onDone] Mutation関連の演出が全て完了した後（または何も
     *   トリガーされなかった場合は即座に）呼ばれる
     */
    _checkMutationTrigger(extraContext, onDone) {
      // STEP31: AI Director System「Mutation Recommendation」（要求仕様セクション8）。
      // プレイヤーが簡単すぎればlevel===0からの引き上げを、苦戦中ならlevel>0からの
      // 抑制を、既存のStability/追加Trigger判定とは独立に推奨する
      const directorBias = this.aiDirector.getMutationTriggerBias();
      const context = Object.assign({
        consecutiveUnknownAnalyses: this.consecutiveUnknownAnalysesThisRun,
        riskChainLevel: this.riskChain.getChainLevel(),
        inUnknownDimension: this.worldEnvironmentManager.getCurrentEnvironment().id === 'env_unknown',
        directorBoost: directorBias.boost,
        directorSuppress: directorBias.suppress
      }, extraContext);

      const level = this.worldMutationManager.checkMutationTrigger(context);
      if (level === 0) { if (onDone) onDone(); return; }

      const historyContext = { run: this.save.getTotalRuns() + 1, layer: this.depth };
      const afterMutationUiUpdate = () => {
        this._renderWorldEnvironmentBadge(this.worldEnvironmentManager.getCurrentEnvironment());
        if (onDone) onDone();
      };

      if (level === 3) {
        // Collapse Mutationは問答無用で発生する（要求仕様セクション7）
        const def = this.worldMutationManager.triggerMutation(3, historyContext);
        if (def) {
          this._showDirectorDialogue('mutation'); // STEP31: Dialogue System
          this.mutationRenderer.show(def, afterMutationUiUpdate);
        } else if (onDone) onDone();
        return;
      }

      // Level1/2: Mutation Choice Event（要求仕様セクション11）
      this.mutationRenderer.showChoice({
        onStabilize: () => {
          this.worldStabilityManager.increaseStability(20, { layer: this.depth, event: 'Stabilize Choice' });
          afterMutationUiUpdate();
        },
        onExploit: () => {
          const def = this.worldMutationManager.triggerMutation(level, historyContext);
          this.worldMutationManager.markExploitBonus();
          if (def) {
            this._showDirectorDialogue('mutation'); // STEP31: Dialogue System
            this.mutationRenderer.show(def, afterMutationUiUpdate);
          } else afterMutationUiUpdate();
        }
      });
    }

    /**
     * STEP30-1: 常時表示の小型Environmentバッジ（HUD/MAP画面双方）と、
     * 軽量なVisual Theme反映（CSS変数`--world-env-color`）を更新する。
     */
    _renderWorldEnvironmentBadge(def) {
      const label = `L${this.depth} ${def.name}`;
      if (this.el.endlessWorldEnvValue) this.el.endlessWorldEnvValue.textContent = label;
      if (this.el.mapWorldEnvLabel) this.el.mapWorldEnvLabel.textContent = label;
      document.documentElement.style.setProperty('--world-env-color', def.uiColor);

      // STEP30-3: リッチHUDパネル・Theme Animation背景も同じタイミングで更新する
      // STEP30-4: World Stability（バー/%/Status）もここで合わせて反映する
      // STEP30-5: Active中のMutation名もここで合わせて反映する
      const activeMutation = this.worldMutationManager.getActiveMutation();
      this.environmentHud.render({
        layer: this.depth, envDef: def, modifiers: this.environmentModifierManager.getActiveModifiers(),
        stability: this.worldStabilityManager.getStability(), status: this.worldStabilityManager.getStatus(),
        mutationName: activeMutation ? activeMutation.name : null
      });
      this.environmentRenderer.render(def);
      this._renderStoryStatus(); // STEP32-1: Story Framework Base System
    }

    /** STEP32-1: Story Framework Base System セクション7。現在Chapter/Layer進行の表示のみ */
    _renderStoryStatus() {
      if (!this.el.mapStoryStatus) return;
      const chapter = this.storyManager.getCurrentChapter();
      if (!chapter) { this.el.mapStoryStatus.classList.add('hidden'); return; }
      const chapterNumber = LayerStoryData.ALL.indexOf(chapter) + 1;
      const layerInChapter = Math.min(Math.max(this.storyManager.getCurrentStoryLayer() - chapter.startLayer + 1, 0), chapter.endLayer - chapter.startLayer + 1);
      if (this.el.mapStoryChapterLabel) this.el.mapStoryChapterLabel.textContent = `Chapter ${chapterNumber}: ${chapter.title}`;
      if (this.el.mapStoryLayerProgress) this.el.mapStoryLayerProgress.textContent = `Layer ${layerInChapter} / ${chapter.endLayer - chapter.startLayer + 1}`;
      this.el.mapStoryStatus.classList.remove('hidden');
    }

    /**
     * STEP32-5-1: Chapter01「First Signal」コンテンツ統合セクション「Layer4 Clear Event」の
     * 「Complete表示（CHAPTER 01 COMPLETE / FIRST SIGNAL）」。既存の`ui.showNodeResult()`を
     * そのまま再利用し、新しいオーバーレイ・新しいUIクラスは追加しない
     * （要求仕様「コード構造は変更せず、Data追加方式で実装」を守るための設計判断）。
     * @param {Object} chapterDef 完了したChapter定義（layerStoryData.js参照）
     * @param {Function} onContinue
     */
    _showChapterCompleteOverlay(chapterDef, onContinue) {
      const chapterNumber = LayerStoryData.ALL.indexOf(chapterDef) + 1;
      this.ui.showNodeResult({
        icon: '🎉',
        title: `CHAPTER ${String(chapterNumber).padStart(2, '0')} COMPLETE`,
        message: chapterDef.title.toUpperCase(),
        onContinue
      });
    }

    /**
     * 選ばれたNodeの種類ごとに実処理へ振り分ける。Unknown Nodeのみ
     * `_resolveUnknownNode()`（STEP27 Unknown Node Event System）へ委譲する。
     */
    _enterNode(node) {
      if (node.type === 'unknown') {
        this._resolveUnknownNode(node);
        return;
      }
      // STEP30-5: Unknown以外のNodeに入ったら「連続Unknown解析」カウントをリセットする
      this.consecutiveUnknownAnalysesThisRun = 0;

      // リサーチマップ画面表示用に、実際に確定したNode種類をこのDepthの記録として残す
      this.visitedNodes.push({ depth: this.depth, type: node.type, name: node.name, icon: node.icon });

      // STEP27: このNodeの脅威度をRisk Chainへ反映する（Elite/Boss選択が連続するとスコア倍率が上がる）
      const nodeAnalysis = AIAnalysis.analyze(node);
      this._registerRiskChain(nodeAnalysis.threatLevel);
      // STEP31: AI Director System「プレイヤー解析」。このNodeの脅威度・所属Environmentを記録する
      this.aiDirector.recordNodeSelection(nodeAnalysis, this.worldEnvironmentManager.getCurrentEnvironment().id);

      switch (node.type) {
        case 'boss':
          this._showDirectorDialogue('bossBefore'); // STEP31: Dialogue System
          this.ui.showScreen('game');
          this.round.start(this.depth, node);
          this._renderNodeIndicator();
          break;
        case 'elite':
        case 'puzzle':
          this.ui.showScreen('game'); // Map画面から遷移するため、Puzzle開始前に明示的に切り替える
          this.round.start(this.depth, node);
          this._renderNodeIndicator();
          break;
        case 'event':
          // Puzzleを介さずその場で結果が確定するNodeのため、'game'画面へは遷移しない
          // （遷移すると直前のPuzzle盤面が一瞬見えてしまう）。結果はオーバーレイで示す
          this._triggerEvent();
          break;
        case 'research_lab':
          // STEP30-4: 「Research Lab」+10
          this.worldStabilityManager.increaseStability(STABILITY_DELTA_RESEARCH_LAB, { layer: this.depth, event: 'Research Lab' });
          this._checkMutationTrigger();
          this.researchLabVisitsThisRun++; // STEP30-7: GENESIS LABの解放条件（生涯Research Lab到達10回）判定用
          this.researchLab.show(this.depth); // 内部でui.showScreen('researchLab')する
          break;
        case 'protocol_signal':
          this.protocolSignal.show(this.depth); // 内部でui.showScreen('protocolSignal')する
          break;
        case 'recovery':
          this._handleRecoveryNode();
          break;
        case 'story':
          // STEP32: Story Scenario Framework セクション7
          this._handleStoryNode();
          break;
        default:
          // 未知のNode種類が万一渡ってきた場合の安全弁。通常のPuzzleとして扱う
          this.ui.showScreen('game');
          this.round.start(this.depth, node);
          this._renderNodeIndicator();
      }
    }

    /** ---------------- STEP27: AI Analysis Risk/Reward System ---------------- */

    /**
     * Unknown Node Event System。旧来の「事前に決めたresolvedNodeへ即座に
     * 差し替えるだけ」の単純解決を置き換え、ANALYZEしたAIが7種類のイベント
     * （unknownEvents.js）のいずれかを検出する体験にする。mapGenerator.jsが
     * 生成する`node.resolvedNode`自体は引き続き存在するが、Oracle Protocolの
     * 事前表示（mapUI.js）専用の値として残すのみで、実際の解決処理はここが担う。
     */
    _resolveUnknownNode(node) {
      // STEP28: Meta ProgressionのResearch Rankに応じて、Rank解放イベント(Temporal Echo等)も抽選対象になる
      // STEP30-2: QUANTUM NETWORKの「Rare Reward +20%」/NEURAL FORESTの「Unknown Analysis Success +10%」
      // STEP30-5: SIGNAL NOISE Mutationの「Rare Reward +15%」もさらに合算する
      // STEP30-6: SIGNAL INTERFERENCE Eventの「Rare Reward +50%」もさらに合算する
      // STEP31: 「5連敗」等の苦戦時、AI DirectorのReward Recommendationもさらに合算する
      const event = UnknownEvents.pickEvent(this.metaProgression.getRankNumber(), {
        rareBoost: this.environmentModifierManager.getRareEventWeightBoost() + this.worldMutationManager.getRareEventWeightBoost()
          + this.environmentEventManager.getEventRareEventWeightBoost() + this.hiddenEnvironmentManager.getHiddenRareEventWeightBoost()
          + this.aiDirector.getDirectorRareEventWeightBoost(),
        successBoost: this.environmentModifierManager.getUnknownSuccessBoost()
      });
      this.unknownAnalysisCount++;
      this.save.recordUnknownEvent(event.id);
      // STEP30-4: 「Unknown Node解析」-5
      this.worldStabilityManager.decreaseStability(STABILITY_DELTA_UNKNOWN_NODE_ANALYZE, { layer: this.depth, event: 'Unknown Node解析' });
      this._grantIdentityExp('unknownAnalyze'); // STEP29: Analyst/ExplorerのEXP源
      // STEP30-5: 追加Trigger「Unknown Node連続解析」判定用カウンタ+Mutation Trigger確認
      this.consecutiveUnknownAnalysesThisRun++;
      this._checkMutationTrigger();
      // STEP30-7: VOID MEMORYの解放条件（Unknown Node成功5連続）判定用カウンタ。
      // System Corruption(lifeLoss)のみ「失敗」として連続記録をリセットする
      this.unknownSuccessStreakThisRun = event.effect.type === 'lifeLoss' ? 0 : this.unknownSuccessStreakThisRun + 1;

      if (event.effect.type === 'eliteShift') {
        // Elite Signal Shift: 既存のElite Node処理へそのまま合流させる（visitedNodes記録・
        // Risk Chain反映・round.start等はelite側の通常処理が担うため、ここではNode自体を
        // 作り直して再帰するだけでよい）
        this.ui.showToast(`UNKNOWN SIGNAL → ${event.name}`);
        this._enterNode(MapGenerator.buildNode('elite', this.depth));
        return;
      }

      this.visitedNodes.push({ depth: this.depth, type: 'unknown', name: 'DEEP UNKNOWN SIGNAL', icon: '❓' });
      // Eliteへ変質しなかった場合のUnknown解析そのものは安全側として扱い、Risk Chainをリセットする
      this._registerRiskChain(null);

      const message = event.effect.type === 'bossShortcut'
        ? this._applyBossShortcut()
        : this._applyUnknownEvent(event);

      this._renderHud();
      this.ui.showNodeResult({
        icon: '❓',
        title: '未確認信号 解析完了',
        message: `結果: ${event.name} — ${message}`,
        onContinue: () => this._afterUnknownResolved()
      });
    }

    /** Unknown解決後、System Corruption(lifeLoss)でライフが尽きていればRUN終了、それ以外はMAPへ戻る */
    _afterUnknownResolved() {
      if (this.life <= 0) {
        this._endRun();
      } else {
        this._showMapChoices();
      }
    }

    /** @returns {string} トースト/オーバーレイ表示用の効果結果メッセージ */
    _applyUnknownEvent(event) {
      switch (event.effect.type) {
        case 'rareUpgrade': {
          const candidates = (G.RareUpgrades ? G.RareUpgrades.ALL : []).filter(u => !this.upgradeManager.isMaxed(u.id));
          if (candidates.length === 0) return '獲得できるRare Upgradeが無かった';
          const picked = candidates[Math.floor(Math.random() * candidates.length)];
          this.upgradeManager.acquire(picked.id);
          return `Rare Upgrade獲得: ${picked.name}`;
        }
        case 'protocolFragment': {
          // STEP29: ExplorerのUnknown Reward倍率をUnknown Node由来の報酬にのみ適用する
          const fragmentValue = Math.round(event.effect.value * this.identityManager.getUnknownRewardMultiplier());
          this._gainProtocolFragments(fragmentValue);
          return `Protocol Fragment +${fragmentValue}`;
        }
        case 'researchData': {
          const dataValue = Math.round(event.effect.value * this.identityManager.getUnknownRewardMultiplier());
          this.researchData += dataValue;
          return `Research Data +${dataValue}`;
        }
        case 'lifeLoss':
          this.life = Math.max(0, this.life - event.effect.value);
          // STEP30-5: 追加Trigger「Special Event」（System Corruption発生時）
          this._checkMutationTrigger({ specialEventTriggered: true });
          return `ライフ -${event.effect.value}`;
        case 'secretRoom': {
          const unknownMultiplier = this.identityManager.getUnknownRewardMultiplier();
          const fragmentBonus = Math.round(3 * unknownMultiplier);
          const dataBonus = Math.round(100 * unknownMultiplier);
          this._gainProtocolFragments(fragmentBonus);
          this.researchData += dataBonus;
          // STEP28: Archive Expansion「Secrets」カウント対象として記録する
          this.save.recordSecretDiscovery('secret_room');
          // STEP30-5: 追加Trigger「Special Event」（Secret Room発見時）
          this._checkMutationTrigger({ specialEventTriggered: true });
          return `Protocol Fragment +${fragmentBonus}, Research Data +${dataBonus}`;
        }
        case 'temporalEcho': {
          // STEP28: Meta ProgressionのResearch Rank4到達で解放される追加イベント
          const unknownMultiplier = this.identityManager.getUnknownRewardMultiplier();
          const fragmentValue = Math.round(event.effect.fragmentValue * unknownMultiplier);
          const dataValue = Math.round(event.effect.dataValue * unknownMultiplier);
          this._gainProtocolFragments(fragmentValue);
          this.researchData += dataValue;
          return `Protocol Fragment +${fragmentValue}, Research Data +${dataValue}`;
        }
        default:
          return '';
      }
    }

    /** @returns {string} 次のBoss Depthへ短絡接続する。既に全Bossを超えている場合は代替報酬を渡す */
    _applyBossShortcut() {
      const bossDepths = Object.keys(G.Boss.BOSS_DEPTHS).map(Number).filter(d => d > this.depth).sort((a, b) => a - b);
      if (bossDepths.length === 0) {
        this.researchData += 200;
        return 'この先にBOSSは存在しない — 代わりにResearch Data +200';
      }
      this.depth = bossDepths[0] - 1; // 次にMAP選択を表示するdepth+1が丁度Boss Depthになるよう合わせる
      return `DEPTH ${bossDepths[0]} のBOSSへ経路短絡`;
    }

    /**
     * Risk Chain System: 選ばれた（あるいは確定した）Nodeの脅威度をRiskChainへ反映し、
     * HUDバッジを更新する。連続して閾値以上に達した瞬間だけAI Warningトーストを出す
     * （毎回出すとうるさいため、レベルが上昇した瞬間のみに限定する）。
     */
    _registerRiskChain(threatLevel) {
      const before = this.riskChain.getChainLevel();
      this.riskChain.registerSelection(threatLevel);
      const after = this.riskChain.getChainLevel();
      this.maxRiskMultiplierThisRun = Math.max(this.maxRiskMultiplierThisRun, this.riskChain.getMultiplier());
      this._renderRiskChainBadge();

      // STEP30-4: 「Risk Chain継続」-2。Chainレベルが上昇した（＝高危険Nodeを連続選択した）瞬間のみ
      if (after > before) {
        this.worldStabilityManager.decreaseStability(STABILITY_DELTA_RISK_CHAIN_CONTINUE, { layer: this.depth, event: 'Risk Chain継続' });
        // STEP30-5: 追加Trigger「高Risk Chain」
        this._checkMutationTrigger({ riskChainLevel: after });
      }

      if (after > before && after >= AI_WARNING_CHAIN_THRESHOLD) {
        this.ui.showToast(`⚠ 研究不安定化 Lv.${after} — 報酬倍率 x${this.riskChain.getMultiplier().toFixed(1)}（システム安定性低下中）`);
      }
    }

    _renderRiskChainBadge() {
      if (!this.el.endlessRiskChainBadge) return;
      const level = this.riskChain.getChainLevel();
      if (level > 0) {
        this.el.endlessRiskChainBadge.textContent = `⚠ INSTABILITY Lv.${level} ×${this.riskChain.getMultiplier().toFixed(1)}`;
        this.el.endlessRiskChainBadge.classList.remove('hidden');
      } else {
        this.el.endlessRiskChainBadge.textContent = '';
        this.el.endlessRiskChainBadge.classList.add('hidden');
      }
    }

    /** Reward Choice画面での選択（rewardChoice.onSelect経由）。Elite Nodeクリア直後にのみ表示される */
    _handleRewardChoiceSelected(opt) {
      const message = this._applyRewardChoiceEffect(opt);
      this._renderHud();
      this.ui.showNodeResult({
        icon: '🎁',
        title: `報酬獲得: ${opt.name}`,
        message,
        onContinue: () => this._showMapChoices()
      });
    }

    _applyRewardChoiceEffect(opt) {
      switch (opt.effect.type) {
        case 'rareUpgrade': {
          const candidates = (G.RareUpgrades ? G.RareUpgrades.ALL : []).filter(u => !this.upgradeManager.isMaxed(u.id));
          if (candidates.length === 0) return '獲得できるRare Upgradeが無かった';
          const picked = candidates[Math.floor(Math.random() * candidates.length)];
          this.upgradeManager.acquire(picked.id);
          return `${picked.name}を獲得`;
        }
        case 'protocolFragment':
          this._gainProtocolFragments(opt.effect.value);
          return `Protocol Fragment +${opt.effect.value}`;
        case 'researchData':
          this.researchData += opt.effect.value;
          return `Research Data +${opt.effect.value}`;
        default:
          return '';
      }
    }

    /** Recovery Node: パズルを介さず即座にライフを回復し、結果をオーバーレイで示してから次のMap選択へ進む */
    _handleRecoveryNode() {
      const before = this.life;
      // STEP30-2: NEURAL FORESTの「Life Recovery +1」を回復量へ加算する
      const healAmount = RECOVERY_NODE_LIFE_AMOUNT + this.environmentModifierManager.getLifeRecoveryBonus();
      this.life = Math.min(this.maxLife, this.life + healAmount);
      const recovered = this.life - before;
      this._grantIdentityExp('recoveryUse'); // STEP29: SurvivalistのEXP源
      // STEP30-4: 「Safe Node」+3（Recovery NodeはNode種類中もっとも低リスクのためSafe Nodeとして扱う）
      this.worldStabilityManager.increaseStability(STABILITY_DELTA_SAFE_NODE, { layer: this.depth, event: 'Safe Node' });
      this._checkMutationTrigger();
      this._renderHud();

      clearTimeout(this._advanceTimer);
      this.ui.showNodeResult({
        icon: '❤️',
        title: 'RECOVERY',
        message: recovered > 0 ? `ライフが${recovered}回復した` : 'ライフはすでに満タンだった',
        onContinue: () => this._showMapChoices()
      });
    }

    /**
     * STEP32: Story Scenario Framework セクション7。Puzzleを介さず、STORY RESEARCHの
     * 各CASEの正史とは独立した断片（storyNode.js AMBIENT_STORY_EVENTS）を1つ表示する
     * 安全地帯。Recovery Nodeと同じ「即座に結果確定→MAPへ戻る」パターン
     */
    _handleStoryNode() {
      const event = G.StoryNode ? G.StoryNode.pickAmbientStoryEvent() : null;
      this.worldStabilityManager.increaseStability(STABILITY_DELTA_SAFE_NODE, { layer: this.depth, event: 'Safe Node' });
      this._checkMutationTrigger();

      clearTimeout(this._advanceTimer);
      this.ui.showNodeResult({
        icon: event ? event.icon : '📖',
        title: event ? event.title : 'STORY LOG',
        message: event ? event.message : '記録は既に失われていた。',
        onContinue: () => this._showMapChoices()
      });
    }

    /**
     * Deep Research Environment所持時、Protocol Fragmentの獲得量に倍率をかけて加算する。
     * STEP28: Protocol Synthesis（researchTree.js）の永続倍率もEnvironment側とは独立に乗算する。
     * STEP29: Protocol EngineerのFragment Chance（primaryBonus/perk）もさらに独立して乗算する。
     * STEP30-2: 現在のWorldEnvironment（QUANTUM NETWORK/DATA OCEAN）のProtocol Fragment
     * Modifierも、EnvironmentModifierManager経由でさらに独立して乗算する
     */
    _gainProtocolFragments(amount) {
      if (amount <= 0) return;
      const withWorldEnvBonus = this.environmentModifierManager.applyProtocolModifier({ fragmentAmount: amount }).fragmentAmount;
      this.protocolFragmentsThisRun += Math.round(
        withWorldEnvBonus * this.environmentManager.getFragmentMultiplier()
          * this.metaProgression.getFragmentGainMultiplier()
          * this.identityManager.getFragmentGainMultiplier()
          * this.worldMutationManager.getProtocolFragmentMultiplier() // STEP30-5: NEURAL INFECTIONの「Protocol Drop +40%」
          * this.environmentEventManager.getEventProtocolFragmentMultiplier() // STEP30-6: DATA STORM Eventの「Protocol Fragment +20%」
          * this.hiddenEnvironmentManager.getHiddenProtocolFragmentMultiplier() // STEP30-7: VOID MEMORYの「Protocol Fragment +80%」
      );
      this._grantIdentityExp('fragmentGain'); // STEP29: Protocol EngineerのEXP源
    }

    /** Boss/Elite Puzzle出現時、GAME画面のラベル・ENDLESS HUDの見た目を切り替える */
    _renderNodeIndicator() {
      if (this.round.isBoss) {
        this.ui.renderGameHeader({ label: this.round.bossConfig.name, starsText: '' });
        if (this.el.endlessHud) {
          this.el.endlessHud.classList.add('boss-active');
          this.el.endlessHud.classList.remove('elite-active');
        }
      } else if (this.round.modifiers && this.round.modifiers.length > 0) {
        const names = this.round.modifiers.map(m => m.name).join(' + ');
        const label = this.round.currentNode && this.round.currentNode.type === 'elite'
          ? `ELITE: ${names}`
          : `MODIFIER: ${names}`;
        this.ui.renderGameHeader({ label, starsText: '' });
        if (this.el.endlessHud) {
          this.el.endlessHud.classList.add('elite-active');
          this.el.endlessHud.classList.remove('boss-active');
        }
      } else {
        this.ui.renderGameHeader({ label: 'ENDLESS RESEARCH', starsText: '' });
        if (this.el.endlessHud) this.el.endlessHud.classList.remove('boss-active', 'elite-active');
      }
    }

    /**
     * クリア/ミスの演出待ち(ADVANCE_DELAY_MS)後に呼ばれる。Map Generation System
     * 導入により、Research Lab/Protocol Signal/Event Nodeの自動判定はここでは
     * 行わない（それぞれ独立したMap Nodeとしてプレイヤーが選ぶ対象になったため）。
     * 単純に次のDepthのMap選択画面を表示するだけになった。
     * STEP27: Elite Nodeクリア直後は`_pendingEliteReward`が立っており、
     * 通常のMap選択より先にReward Choice画面（3択報酬）を挟む。
     */
    _afterRoundEnd() {
      if (this._pendingEliteReward) {
        this._pendingEliteReward = false;
        this.rewardChoice.show();
        return;
      }
      this._showMapChoices();
    }

    /** ---------------- Event Node ---------------- */

    _triggerEvent() {
      const event = this.eventManager.pickEvent();
      const resultMessage = this._applyEvent(event);

      // Phase C: Event Node発生そのものでProtocol Fragmentを獲得し、
      // Chaosの解放条件(Event発生10回)の進捗としてもカウントする
      this.eventCountThisRun++;
      this._gainProtocolFragments(ProtocolFragment.forEvent());
      this._checkProtocolUnlocks();

      this._renderHud();

      clearTimeout(this._advanceTimer);
      // STEP30-3: AI Research Log。Event発生時にも現在Environmentの解析フレーバーを添える
      const currentEnvId = this.worldEnvironmentManager.getCurrentEnvironment().id;
      const logLine = G.EnvironmentLog ? G.EnvironmentLog.getLogMessage(currentEnvId) : '';
      this.ui.showNodeResult({
        icon: (G.NodeTypes.getType('event') || {}).icon || '✨',
        title: `EVENT: ${event.name}`,
        message: logLine ? `${resultMessage}\n"${logLine}"` : resultMessage,
        onContinue: () => this._showMapChoices()
      });
    }

    /** @returns {string} トースト表示用の効果結果メッセージ */
    _applyEvent(def) {
      switch (def.effect.type) {
        case 'lifeRecover': {
          if (this.life >= this.maxLife) return 'ライフは満タン';
          this.life = Math.min(this.maxLife, this.life + def.effect.value);
          return `ライフ+${def.effect.value}`;
        }
        case 'comboReset': {
          const had = this.combo > 0;
          this.combo = 0;
          return had ? 'コンボがリセットされた' : '影響なし';
        }
        case 'memoryFragmentGain': {
          const amount = this.eventManager.rollMemoryFragmentAmount();
          this.memoryFragmentsThisRun += amount;
          return `Memory Fragment +${amount}`;
        }
        case 'doubleNextUpgrade': {
          this.nextUpgradeMultiplier = 2;
          return '次のUpgrade取得効果が2倍に';
        }
        case 'grantRandomUpgrade': {
          const candidates = G.Upgrades.ALL.filter(u => !this.upgradeManager.isMaxed(u.id));
          if (candidates.length === 0) return '獲得できるUpgradeが無かった';
          const picked = candidates[Math.floor(Math.random() * candidates.length)];
          this.upgradeManager.acquire(picked.id);
          return `${picked.name}を獲得`;
        }
        default:
          return '';
      }
    }

    _renderHud() {
      if (!this.el.endlessDepthValue) return;
      this.el.endlessDepthValue.textContent = String(this.depth);
      this.el.endlessScoreValue.textContent = String(this.score);
      this.el.endlessComboValue.textContent = this.combo > 0 ? `x${this.combo}` : '-';
      if (this.el.endlessResearchDataValue) this.el.endlessResearchDataValue.textContent = String(this.researchData);
      this._renderLife();
      this._renderUpgrades();
    }

    _renderLife() {
      const container = this.el.endlessLifeValue;
      if (!container) return;
      container.innerHTML = '';
      for (let i = 0; i < this.maxLife; i++) {
        const heart = document.createElement('span');
        heart.className = 'endless-heart' + (i < this.life ? ' filled' : ' lost');
        heart.textContent = '♥';
        container.appendChild(heart);
      }
    }

    /** 現在取得済みのアップグレードをHUDへバッジ表示する */
    _renderUpgrades() {
      const container = this.el.endlessUpgradeList;
      if (!container) return;
      container.innerHTML = '';
      this.upgradeManager.getOwnedList().forEach(u => {
        const badge = document.createElement('span');
        badge.className = 'endless-upgrade-badge cat-' + u.category + (u.rare ? ' rare' : '');
        badge.title = u.description;
        badge.textContent = u.rare ? `★ ${u.name}` : `${u.name} Lv.${u.level}`;
        container.appendChild(badge);
      });
    }

    _renderTimer(remaining) {
      if (!this.el.endlessTimeValue) return;
      this.el.endlessTimeValue.textContent = Score.formatTime(remaining);
    }

    /** ---------------- クリア/ミス処理 ---------------- */

    /**
     * Blue Spectrum Environment所持時、直前にクリアした問題のBLUEマス比率に応じた
     * ボーナスを計算する（比率0なら0、比率1（全マスBLUE）ならgetBlueRewardMultiplier()の
     * 上限まるごとが乗る）。this.round.puzzle.answerは既存のendlessGame.js側が
     * 保持する公開プロパティをそのまま読む（_renderNodeIndicator()のthis.round.isBoss参照と
     * 同じ既存の慣習）。
     */
    _computeBlueBonus(reward) {
      const multiplier = this.environmentManager.getBlueRewardMultiplier();
      if (multiplier <= 1) return 0;
      const answer = this.round.puzzle && this.round.puzzle.answer;
      if (!answer) return 0;

      let blue = 0;
      let colored = 0;
      answer.forEach(row => row.forEach(cell => {
        if (cell === G.CellState.EMPTY) return;
        colored++;
        if (cell === G.CellState.BLUE) blue++;
      }));
      if (colored === 0) return 0;

      const blueRatio = blue / colored;
      return Math.round(reward * blueRatio * (multiplier - 1));
    }

    /** 1問クリア時（endlessGame.jsのonClear経由） */
    _handleRoundClear(stats) {
      this.combo++;

      // Oracle Protocol所持時、HINTを使用してもPERFECT扱いのままになる
      const perfect = !stats.hintUsed || this.protocolManager.hasPerfectImmuneToHint();
      const speedBonus = stats.elapsedSeconds < stats.parSeconds
        ? Math.round((stats.parSeconds - stats.elapsedSeconds) * SPEED_BONUS_PER_SECOND)
        : 0;
      // Combo Coreアップグレードでコンボ単価が上乗せされ、Analyst Protocol・STEP29 ANALYST Identityでさらに倍率がかかる
      const comboBonusPerStack = COMBO_REWARD_PER_STACK + this.upgradeManager.getEffectTotal('comboBonusAdd');
      const comboBonus = Math.round(
        this.combo * comboBonusPerStack * this.protocolManager.getComboBonusMultiplier() * this.identityManager.getComboBonusMultiplier()
      );

      let reward = CLEAR_REWARD + comboBonus;
      if (perfect) {
        // Perfect Analysisアップグレードでボーナスが上乗せされ、Analyst Protocol・Critical Logic
        // Environment・STEP29 ANALYST Identityでさらに倍率がかかる（いずれも独立に掛け合わされる）
        const perfectBonus = PERFECT_REWARD + this.upgradeManager.getEffectTotal('perfectBonusAdd');
        reward += Math.round(
          perfectBonus * this.protocolManager.getPerfectBonusMultiplier() * this.environmentManager.getPerfectBonusMultiplier()
            * this.identityManager.getPerfectBonusMultiplier()
        );
        this.perfectCount++;
      }
      reward += speedBonus;
      // Overclockアップグレードで総獲得スコアが倍率アップし、Protocol（Explorer/Overclock）・
      // STEP29 Research Identityの倍率もかかる
      reward = Math.round(
        reward * (1 + this.upgradeManager.getEffectTotal('scoreMultiplier'))
          * this.protocolManager.getScoreMultiplier() * this.identityManager.getScoreMultiplier()
      );
      // Blue Spectrum Environment: この問題のBLUEマス比率に応じたボーナスを加算する
      reward += this._computeBlueBonus(reward);

      // Boss Puzzleはさらにboss.js側で設定した倍率がかかり、撃破数としてもカウントされる
      if (stats.isBoss) {
        reward = Math.round(reward * stats.bossScoreMultiplier);
        this.bossClearCount++;
        // Phase C: Boss撃破でProtocol Fragmentを獲得する
        this._gainProtocolFragments(ProtocolFragment.forBossClear());
      } else if (stats.isElite) {
        // Map Generation System: Elite Node撃破は高リスクの見返りとして
        // スコア倍率とProtocol Fragmentのボーナスを得る
        reward = Math.round(reward * ELITE_SCORE_MULTIPLIER);
        this._gainProtocolFragments(ELITE_FRAGMENT_BONUS);
        // STEP27: Elite Nodeクリア後は通常のMap選択より先にReward Choice（3択報酬）を挟む
        this._pendingEliteReward = true;
      }

      // STEP27: Risk Chain倍率（高危険Node連続選択のボーナス）を、Boss/Elite固有の倍率とは
      // 独立してさらに乗算する。STEP30-2: FRACTAL COREの「Risk Chain Bonus +20%」もここで合成する。
      // STEP30-5: REALITY BREAK Mutationの「Risk上昇」+Exploit選択の「Risk Increase」もさらに合成する
      // STEP30-7: PARADOX COREの「RiskとReward逆転」（簡略化しrewardMultiplier/riskChainBonusの
      // 積み増しとして実装、詳細はhiddenEnvironmentData.jsのコメント参照）もさらに合成する
      reward = Math.round(
        reward * this.riskChain.getMultiplier()
          * this.environmentModifierManager.getRiskChainBonusMultiplier()
          * this.worldMutationManager.getRiskChainBonusMultiplier()
          * this.hiddenEnvironmentManager.getHiddenRiskChainBonusMultiplier()
      );
      // STEP28: Protocol Evolution（NEURAL RESEARCH LABで進化させたProtocol）による
      // 追加ボーナス。所持中Protocolの進化段階の合計に応じて上乗せされる（未進化なら0）
      const activeProtocolIds = this.protocolManager.getActiveDefs().map(d => d.id);
      reward = Math.round(reward * (1 + this.metaProgression.getProtocolEvolutionScoreBonus(activeProtocolIds)));
      // STEP29: Protocol Engineerの「Synergy Boost」Perk。Synergyが発動中の時のみ追加で乗算する
      if (this.protocolManager.getActiveSynergies().length > 0) {
        reward = Math.round(reward * this.identityManager.getSynergyScoreMultiplier());
      }

      // STEP30-2: Reward System Integration。FRACTAL COREの「Reward +40%」とDATA OCEANの
      // 「Research Data +20%」を、それぞれ最終スコア・Research Dataへ独立に適用する
      // （要求仕様セクション5の「Base Reward × Environment × Risk Chain × Identity」のうち、
      // Risk ChainはEnvironment適用より前段（上記reward計算内）で既に折り込み済み）
      const baseResearchDataGain = Math.max(1, Math.round(reward * RESEARCH_DATA_RATIO));
      const envAdjustedReward = this.environmentModifierManager.applyRewardModifier({ reward, researchData: baseResearchDataGain });
      // STEP30-5: Reward Integration Hook（要求仕様セクション12）。FRACTAL OVERFLOW/
      // REALITY BREAKの「Reward +60%/x2」・Exploit選択のボーナスをさらに独立に適用する
      const rewardBeforeEvent = Math.round(envAdjustedReward.reward * this.worldMutationManager.getMutationRewardModifier());
      // STEP30-6: Reward System Integration（要求仕様セクション12）。計算順は
      // Base Reward × Environment Modifier × Mutation Modifier × Event Modifier ×
      // Risk Chain(既にreward計算の前段で折り込み済み) × Identity Bonus(同前段)。
      // DATA STORM/FRACTAL SHIFT Eventの「Reward+X%」をここで独立に適用する
      const rewardBeforeHidden = Math.round(rewardBeforeEvent * this.environmentEventManager.getEventRewardModifier());
      this.environmentEventManager.addRewardContribution(rewardBeforeHidden - rewardBeforeEvent);
      // STEP30-7: SIMULATION ZERO/PARADOX CORE等のReward Integrationをさらに独立に適用する
      const rewardBeforeDirector = Math.round(rewardBeforeHidden * this.hiddenEnvironmentManager.getHiddenRewardModifier());
      // STEP31: AI Director System「Reward Recommendation」（要求仕様セクション9）。
      // 5連敗等の苦戦時のみ1より大きくなる（通常時は1.0で無変化）
      reward = Math.round(rewardBeforeDirector * this.aiDirector.getDirectorRewardModifier());
      const mutationAdjustedResearchData = Math.round(envAdjustedReward.researchData * this.worldMutationManager.getResearchDataMultiplier());
      const eventAdjustedResearchData = Math.round(mutationAdjustedResearchData * this.environmentEventManager.getEventResearchDataMultiplier());
      this.environmentEventManager.addRewardContribution(eventAdjustedResearchData - mutationAdjustedResearchData);
      const hiddenAdjustedResearchData = Math.round(eventAdjustedResearchData * this.hiddenEnvironmentManager.getHiddenResearchDataMultiplier());
      const directorAdjustedResearchData = Math.round(hiddenAdjustedResearchData * this.aiDirector.getDirectorResearchDataMultiplier());

      this.score += reward;
      // STEP27: Research Data（Extract Systemで使う蓄積リソース）は総獲得スコアの一部として
      // クリアのたびに少量加算される
      this.researchData += directorAdjustedResearchData;

      const recovered = this._tickLifeRegen();
      this._checkProtocolUnlocks();
      this.clearsThisRun++;
      // STEP32: END D「Simulation Zero」の解放条件。SIMULATION ZERO内でのクリアを生涯フラグとして記録する
      const currentHidden = this.hiddenEnvironmentManager.getCurrentHiddenEnvironment();
      if (currentHidden && currentHidden.id === 'simulation_zero') this.save.setSimulationZeroCleared();
      // STEP32-1: Story Framework Base System。既存報酬処理には一切影響しない、
      // Layerクリア通知のみの追加（要求仕様セクション3「既存報酬処理は変更しない」）
      // STEP32-5-1: Chapter Complete表示のため、onLayerClear()で内部的にChapterが
      // 進んでしまう前に「クリア前のChapter」を控えておく（StoryManager自体は変更しない）
      // STEP34: layerEventはlayerContentData.jsの正本レコード（eventId/trigger/
      // dialogueId/memoryId/relationshipChange）を1件返す（storyManager.js参照）。
      // 以降のMemory Unlock/Relationship Updateは、このレコードを正本として直接
      // 駆動する（memoryManager.checkLayerMemories()による全件走査はもう使わない。
      // API自体はテスト・将来利用のため残している）
      const chapterBeforeClear = this.storyManager.getCurrentChapter();
      const layerEvent = this.storyManager.onLayerClear(this.depth);
      // STEP39-2修正: 従来`this.depth >= chapterBeforeClear.endLayer`（以上）で判定していたが、
      // 最終Chapter（chapter06）には次のChapterが存在せずcurrentChapterが恒久的にchapter06の
      // ままになるため、Layer30到達後のENDLESS RESEARCH（Layer31以降）でこの条件が
      // 毎Layerクリアごとに真になり続け、「CHAPTER 06 COMPLETE」が無限に再表示される
      // 不具合を本Chapter実装の過程で発見した。depthは`_enterNode()`経由で常に1ずつしか
      // 増加しない（他に加算箇所は無い）ため、「以上」ではなく「ちょうどそのLayerで
      // クリアした瞬間」を表す厳密一致に変更しても、Chapter1〜5の既存動作（要求仕様
      // セクション7「Chapter1〜5維持」）には一切影響しない
      const chapterJustCompleted = !!(chapterBeforeClear && this.depth === chapterBeforeClear.endLayer);
      this._renderStoryStatus(); // Chapter進行がLayerクリアの瞬間に起きるため、次のLayer移動を待たず即座に反映する

      // STEP34セクション1「Memory Unlock」。layerEvent.memoryIdが取得条件の正本
      let newlyCollectedMemory = null;
      if (layerEvent && layerEvent.memoryId && this.memoryManager.collectMemory(layerEvent.memoryId)) {
        newlyCollectedMemory = MemoryData.getById(layerEvent.memoryId);
      }
      // STEP34セクション1「Relationship Update」。layerEvent.relationshipChangeが正本
      // （ARIAの状態遷移＝checkAriaEvolution自体は、下のStory演出が完了した直後まで遅らせる。
      // Dialogue条件が「取得した瞬間の状態」に対して評価されるべきで、Memory取得と同一tickで
      // 状態が先に進んでしまうと、その場のDialogueがcondition不成立になってしまうバグを
      // 実テストで検出したため＝STEP32-4実装時からの既知の設計判断）
      if (layerEvent && layerEvent.relationshipChange) {
        this.relationshipManager.addRelationship(layerEvent.relationshipChange.character, layerEvent.relationshipChange.value);
      }
      // STEP36セクション2: Story Event管理システムへ`protocolId`を追加。layerEvent.protocolIdが
      // 取得条件の正本。`save.unlockProtocol()`は既に解放済みなら何もせずfalseを返す
      // （`_checkProtocolUnlocks()`の既存ガードと同じ二重解放防止パターン）ため、
      // このLayerを何度クリアしても安全に呼べる
      let newlyUnlockedProtocol = null;
      if (layerEvent && layerEvent.protocolId && this.save.unlockProtocol(layerEvent.protocolId)) {
        newlyUnlockedProtocol = ProtocolUnlock.getById(layerEvent.protocolId);
      }
      // STEP37セクション3: Story Event管理システムへ`characterDiscovery`を追加。
      // layerEvent.characterDiscoveryが対象キャラクターidの正本。既にDISCOVERED済みなら
      // 何もしない（protocolId/memoryIdと同じ二重発生防止パターン。このLayerを何度
      // クリアしても安全）
      let newlyDiscoveredCharacter = null;
      if (layerEvent && layerEvent.characterDiscovery) {
        const charId = layerEvent.characterDiscovery;
        if (this.relationshipManager.getCharacterState(charId) !== 'DISCOVERED') {
          this.save.setRelationshipState(charId, 'DISCOVERED');
          newlyDiscoveredCharacter = CharacterData.getById(charId);
        }
      }

      this._grantIdentityExp('puzzleClear'); // STEP29: 全Identity共通の基礎EXP
      if (perfect) this._grantIdentityExp('perfectClear'); // STEP29: AnalystのEXP源
      // STEP31: Dialogue System。直後の`ui.showToast(message)`が即座に上書きしてしまうため、
      // トースト表示はせずAIログへの記録のみ行い、返り値の一言を下のmessageへ統合して1つの
      // トーストにまとめる（実装中にトースト上書きを実テストで検出した）
      let directorLine = null;
      if (stats.isBoss) {
        this._grantIdentityExp('bossClear'); // STEP29: SurvivalistのEXP源
        directorLine = this._showDirectorDialogue('bossAfter', false);
      }
      // STEP31: AI Director System「プレイヤー解析」。Adaptive Difficultyの入力(Solve Time/Accuracy)を更新する
      this.aiDirector.recordPuzzleResult({ cleared: true, elapsedSeconds: stats.elapsedSeconds, hintUsed: stats.hintUsed });

      const title = stats.isBoss ? `${stats.bossName} DEFEATED!` : stats.isElite ? 'ELITE CLEAR' : `DEPTH ${this.depth} CLEAR`;
      const details = [`スコア +${reward}`];
      if (perfect) details.push('PERFECT');
      if (speedBonus > 0) details.push(`スピードボーナス +${speedBonus}`);
      if (recovered) details.push('ライフ +1');
      let message = details.join(' / ');
      if (directorLine) message += ` / 🤖 "${directorLine}"`;

      this._renderHud();
      this._recordPuzzleHistory(stats, true);
      // UI改修: クリア演出（盤面のライン消灯・効果音）を見る間を置いてから、
      // 一連の演出（Story→Reward）を開始する（以前は同じ待ち時間の後トースト表示のみで
      // 自動的に次へ進んでいたが、結果を読み逃しやすいとの指摘を受けて変更した）
      clearTimeout(this._advanceTimer);
      // HINT使用によるライフ消費（_handleHintUsed）が、ちょうどこのクリアと同じHINTで
      // ライフを0にしていた場合はここでRUNを終える（クリア報酬は既に加算済みのまま終了する）
      const nextStep = this.life <= 0 ? () => this._endRun() : () => this._afterRoundEnd();

      const showRewardOverlay = () => {
        this.ui.showNodeResult({
          icon: stats.isBoss ? '👑' : stats.isElite ? '⚔️' : '✅',
          title,
          message,
          onContinue: nextStep
        });
      };

      // STEP34セクション1: 「Layer Clear→Story Event Check→Dialogue→Memory Unlock→
      // Relationship Update→Reward」の順で演出する（要求仕様の明示的なフロー図どおり）。
      // Story内容が無いLayer（layerEventがlocked/未定義の大多数のLayer）ではstorySteps が
      // 空のまま即座にRewardオーバーレイが表示されるため、Story未実装のLayerでのENDLESS
      // RESEARCHの体感は変化しない（要求仕様セクション7「Endless Research動作維持」）。
      // Chapter DialogueとMemory Fragment取得演出（STEP34セクション5「MEMORY FOUND」＋
      // ARIA Analysis Dialogue）が同一Layerクリアで両方発生しうるため、単一オーバーレイ
      // （showDialogue/showNodeResultはどちらも「後勝ち」実装）の競合を避けるためキュー化
      // する（STEP31/32で繰り返し検出したのと同種の設計）。未定義のDialogue idは
      // startDialogue()がfalseを返すため自動的にスキップされ、そのまま次のStepへ進む
      // STEP39-2: Story Event管理システムへ`dialogueVariants`を追加。layerEvent.dialogueVariants
      // があれば（Layer25のみ）、`dialogueId`ではなくこちらからARIA Relationship閾値に応じた
      // 1件だけを選んでstorySteps化する（`_resolveDialogueVariant()`参照。ストーリー進行・
      // 報酬には一切影響しない台詞の出し分けのみ）
      const resolvedDialogueId = layerEvent && layerEvent.dialogueVariants
        ? this._resolveDialogueVariant(layerEvent.dialogueVariants)
        : (layerEvent && layerEvent.dialogueId);
      const storySteps = [];
      if (resolvedDialogueId) storySteps.push({ type: 'dialogue', id: resolvedDialogueId });
      if (newlyCollectedMemory) {
        // STEP34セクション5: Memory取得時演出「MEMORY FOUND / Memory Title / ARIA Analysis」。
        // 「MEMORY FOUND」オーバーレイ（Title+内容）→「ARIA Analysis」＝既存のMemory Fragment
        // 回収Dialogue（`${memoryId}_recovered`、STEP32-3から流用）の2段構成で表現する
        storySteps.push({ type: 'memoryFound', memory: newlyCollectedMemory });
        storySteps.push({ type: 'dialogue', id: `${newlyCollectedMemory.id}_recovered` });
      }
      if (newlyUnlockedProtocol) {
        // STEP36セクション2: Protocol取得演出。「情報系オーバーレイは自動消滅させない」
        // （既存フィードバック方針）に合わせ、自動で消える`ui.showProtocolDiscovery()`
        // ではなく、MEMORY FOUNDと同じ「続ける」ボタン付きの`showNodeResult`で表示する
        storySteps.push({ type: 'protocolUnlocked', protocol: newlyUnlockedProtocol });
      }
      if (newlyDiscoveredCharacter) {
        // STEP37セクション3: Character Discovery演出。「Lost Researcher登場」は
        // Memory取得（このLayerで発見される記録そのもの）を通じて明らかになる、という
        // 要求仕様の描写に合わせ、MEMORY FOUND→ARIA Analysisの後に配置する
        // （storySteps.pushの順序＝再生順序のため、既にpush済みのmemoryFound/dialogueより
        // 後にpushすることで自動的に後段になる）
        storySteps.push({ type: 'characterDiscovered', character: newlyDiscoveredCharacter });
      }

      const playNextStoryStep = () => {
        if (storySteps.length === 0) {
          // STEP32-4: ARIA状態遷移はStory演出が完全に終わった後に判定する
          // （このLayerクリアで表示されるDialogueのcondition評価に影響させないため）
          this.relationshipManager.checkAriaEvolution();
          // STEP32-5-1: Chapter Complete表示。Story演出が完全に終わった後にのみ表示する
          if (chapterJustCompleted) {
            // STEP39-2セクション6: 「Layer30終了後、EndingManagerへ遷移する処理を追加」。
            // Final Chapter（chapter06）完了時のみ、CHAPTER 06 COMPLETE表示の直後に
            // EndingManagerを確認する（Chapter1〜5のChapter Complete表示は変更しない）
            const afterChapterComplete = chapterBeforeClear.id === 'chapter06'
              ? () => this._checkFinalChapterEnding(showRewardOverlay)
              : showRewardOverlay;
            this._showChapterCompleteOverlay(chapterBeforeClear, afterChapterComplete);
            return;
          }
          showRewardOverlay();
          return;
        }
        const step = storySteps.shift();
        if (step.type === 'memoryFound') {
          this.ui.showNodeResult({
            icon: '🧠',
            title: 'MEMORY FOUND',
            message: `${step.memory.title}\n\n${step.memory.content}`,
            onContinue: () => playNextStoryStep()
          });
          return;
        }
        if (step.type === 'protocolUnlocked') {
          this.ui.showNodeResult({
            icon: '🔓',
            title: 'PROTOCOL UNLOCKED',
            message: `${step.protocol.name}\n\n${step.protocol.description}`,
            onContinue: () => playNextStoryStep()
          });
          return;
        }
        if (step.type === 'characterDiscovered') {
          this.ui.showNodeResult({
            icon: '👤',
            title: 'CHARACTER DISCOVERED',
            message: `${step.character.name}${step.character.role ? `\n\n${step.character.role}` : ''}`,
            onContinue: () => playNextStoryStep()
          });
          return;
        }
        this.dialogueManager.onComplete = () => playNextStoryStep();
        if (!this.dialogueManager.startDialogue(step.id)) playNextStoryStep();
      };

      this._advanceTimer = setTimeout(() => {
        playNextStoryStep();
      }, ADVANCE_DELAY_MS);
    }

    /**
     * STEP39-2: layerContentData.jsの`dialogueVariants`（ARIA Relationship閾値の降順配列）
     * から、現在のARIA Relationship値以上の最初の1件のdialogueIdを返す（該当が無ければnull）。
     * 現状この配列を持つのはLayer25のみ。
     */
    _resolveDialogueVariant(variants) {
      const relationship = this.relationshipManager.getRelationship('aria');
      const sorted = variants.slice().sort((a, b) => b.minRelationship - a.minRelationship);
      const match = sorted.find(v => relationship >= v.minRelationship);
      return match ? match.dialogueId : null;
    }

    /**
     * STEP32: Ending System判定用スナップショットの組み立て。元は`_endRun()`専用だったが、
     * STEP39-2セクション6「Layer30終了後、EndingManagerへ遷移する処理を追加」に対応する
     * ため切り出した（`_endRun()`・`_checkFinalChapterEnding()`の双方から呼ぶ）。
     */
    _buildEndingSnapshot() {
      const logRate = this.researchDatabase.getCompletionByType('LOG');
      const memoryRate = this.researchDatabase.getCompletionByType('MEMORY');
      return {
        logCompletionRate: logRate.total > 0 ? logRate.unlocked / logRate.total : 0,
        memoryCompletionRate: memoryRate.total > 0 ? memoryRate.unlocked / memoryRate.total : 0,
        worldStatus: this.worldStabilityManager.getStatus(),
        simulationZeroCleared: this.save.hasSimulationZeroCleared(),
        hiddenCompletionRate: this.hiddenEnvironmentManager.getDiscoveryRate().rate,
        storyCompletionRate: this.researchDatabase.getCompletionRate().rate,
        bestLayer: Math.max(this.depth, this.save.getBestDepth())
      };
    }

    /**
     * STEP39-3セクション1/2: Final Chapter（chapter06）完了直後、EndingManagerで本編の
     * 結末を1つ確定させ（`determineStoryEnding()`）、専用のEnding表示→Epilogue Dialogue
     * （ResearcherとARIAの最後の会話）→（True Endingのみ）ARIA Partner AI昇格、の順で
     * 演出する。Epilogue終了後は`onContinue`（=Reward表示→`_afterRoundEnd()`）へそのまま
     * つながるため、Unknown Layer（Layer31）はここで新たにロックを解除するような仕組みは
     * 存在せず（Layer Narrative Systemの対象外Layerは元々`layerContentData.getByLayer()`が
     * nullを返すのみで、Depth進行自体を止める仕組みが無い）、通常のMap遷移がそのまま
     * 「Research Mapへ遷移し、Endless Researchを開始する」（要求仕様セクション5/6）を
     * 満たす。STEP39-2時点の`checkEndings()`（生涯達成Ending、複数同時成立・優先順位無し）
     * 呼び出しは置き換えた（determineStoryEndingが同じ`save.recordEndingAchieved()`を
     * 使うため、生涯達成側の記録との整合は保たれる）。
     */
    _checkFinalChapterEnding(onContinue) {
      const { ending, isNewlyAchieved } = this.endingManager.determineStoryEnding(this._buildEndingSnapshot());
      if (isNewlyAchieved) this.researchDatabase.addEntry(ending.id);

      const playEpilogue = () => {
        // STEP39-3セクション7: True EndingのみARIAをPartner AIへ昇格させる
        // （Normal/Hidden/BadはSelf Aware維持、要求仕様どおり）。checkAriaEvolution()の
        // ARIA_LEVELS/snapshot判定は経由しない、Ending確定にひもづく一回限りの明示的な
        // 状態遷移（LEVEL4のconditionは引き続き`reserved`＝到達不能なまま据え置いている）
        if (ending.id === 'ending_true') this.save.setRelationshipState('aria', 'PARTNER_AI');

        const epilogueId = ENDING_EPILOGUE_DIALOGUE_ID[ending.id];
        this.dialogueManager.onComplete = () => onContinue();
        if (!this.dialogueManager.startDialogue(epilogueId)) onContinue();
      };

      this.ui.showNodeResult({
        icon: ENDING_ICON[ending.id] || '🎬',
        title: `ENDING: ${ending.name}`,
        message: ending.description,
        onContinue: playEpilogue
      });
    }

    /**
     * Puzzle Evolution System: 直前のPuzzle/Elite/Boss挑戦をPuzzle Archive
     * （履歴保存）へ記録する。Event/Research Lab/Protocol Signal/Recoveryは
     * 対象外（endlessGame.jsの管轄する「1問」ではないため）。
     */
    _recordPuzzleHistory(stats, cleared) {
      const entry = DifficultyManager.buildHistoryEntry({
        depth: this.depth,
        size: stats.size,
        tier: stats.tier,
        cleared,
        isBoss: stats.isBoss,
        isElite: stats.isElite,
        modifierIds: stats.modifierIds
      });
      this.save.recordPuzzleHistory(entry);
    }

    /**
     * Recovery Protocolアップグレード: 所持時のみ、一定クリアごとにライフを1回復する。
     * STEP29: SurvivalistのRecovery System Perkは、このアップグレード無しでも
     * 単独でライフ自動回復を起動できる（Identity自身が持つ「その手段の簡易版」という判断）
     */
    _tickLifeRegen() {
      const identityRegenBonus = this.identityManager.getLifeRegenIntervalBonus();
      if (!this.upgradeManager.hasEffectType('lifeRegenInterval') && identityRegenBonus <= 0) return false;
      this.clearsSinceLifeRegen++;
      const interval = Math.max(1, RECOVERY_BASE_INTERVAL - this.upgradeManager.getEffectTotal('lifeRegenInterval') - identityRegenBonus);
      if (this.clearsSinceLifeRegen < interval) return false;
      this.clearsSinceLifeRegen = 0;
      if (this.life >= this.maxLife) return false;
      this.life++;
      return true;
    }

    /** 制限時間切れ（ミス）時（endlessGame.jsのonTimeout経由） */
    _handleRoundTimeout(stats) {
      // STEP31: AI Director System「プレイヤー解析」。Adaptive Difficultyの入力(mistakeRate)を更新する
      this.aiDirector.recordPuzzleResult({ cleared: false, elapsedSeconds: stats.elapsedSeconds, hintUsed: stats.hintUsed });

      // Critical Logic Environment所持時、ミスで失うライフが倍加する。
      // STEP29: SurvivalistのRisk Control（Perk含む）はここで軽減方向に働く
      let lifeLoss = Math.max(1, Math.round(
        1 * this.environmentManager.getMissPenaltyMultiplier() * this.identityManager.getMissPenaltyMultiplier()
      ));
      // STEP28: Emergency Recovery（researchTree.js）所持時、RUN中最初のミスに限り軽減する
      if (!this._firstMissConsumedThisRun) {
        this._firstMissConsumedThisRun = true;
        lifeLoss = Math.max(0, lifeLoss - this.metaProgression.getFirstMissLifeReduction());
      }
      this.life -= lifeLoss;
      // Backup Memoryアップグレード: ミスしてもコンボを維持する
      if (!this.upgradeManager.hasEffectType('keepComboOnMiss')) {
        this.combo = 0;
      }

      // Phoenix Protocol(Rare): ライフが尽きる瞬間、未使用なら1度だけライフ1で復活する
      let revived = false;
      if (this.life <= 0 && this.upgradeManager.hasUnusedRevive()) {
        this.upgradeManager.consumeRevive();
        this.life = 1;
        revived = true;
      }

      this._renderHud();
      this._recordPuzzleHistory(stats, false);

      clearTimeout(this._advanceTimer);
      if (this.life <= 0) {
        this._advanceTimer = setTimeout(() => {
          this.ui.showNodeResult({ icon: '⏱️', title: 'TIME UP', message: '制限時間切れによりRUNが終了した', onContinue: () => this._endRun() });
        }, ADVANCE_DELAY_MS);
      } else if (revived) {
        this._advanceTimer = setTimeout(() => {
          this.ui.showNodeResult({ icon: '🔥', title: 'PHOENIX PROTOCOL発動', message: 'ライフ1で復活した', onContinue: () => this._afterRoundEnd() });
        }, ADVANCE_DELAY_MS);
      } else {
        this._advanceTimer = setTimeout(() => {
          this.ui.showNodeResult({ icon: '⏱️', title: 'TIME UP', message: `ライフ -${lifeLoss}（残り${this.life}）`, onContinue: () => this._afterRoundEnd() });
        }, ADVANCE_DELAY_MS);
      }
    }

    /**
     * HINT使用時のライフ消費（ユーザー要望により追加）。ENDLESS RESEARCHのみが対象
     * （通常ステージ/チュートリアル/Daily Puzzleにはライフの概念が無いため対象外）。
     * 常にHINT1回の使用につき1ライフを消費する（Analyzerアップグレード等で複数マスが
     * 同時開示されても、AI Prediction Protocolによる自動発動でも消費量は変わらない）。
     *
     * ここでライフが尽きた場合の扱いは既存の`_handleRoundTimeout`と同じ考え方に揃えている:
     * - まだPuzzleがクリアされていない場合は、その場でTIME UPと同じ扱いにしてRUNを終了する
     *   （Phoenix Protocol所持時は他のライフ切れ処理と同じくここで復活を消費する）
     * - 直後の同じHINTでちょうどPuzzleがクリアされた場合は、ここでは何もせず
     *   `_handleRoundClear()`側の末尾チェックに終了判定を委ねる（クリア報酬を正しく
     *   加算してからRUNを終える。二重にRUN終了処理が走らないようにするための分岐）
     */
    _handleHintUsed() {
      this.life = Math.max(0, this.life - 1);

      if (this.life <= 0 && !this.round.game.cleared) {
        if (this.upgradeManager.hasUnusedRevive()) {
          this.upgradeManager.consumeRevive();
          this.life = 1;
          this.ui.showToast('PHOENIX PROTOCOL発動! ライフ1で復活した');
        } else {
          this.round.stop();
          this.round.locked = true;
          clearTimeout(this._advanceTimer);
          this._advanceTimer = setTimeout(() => {
            this.ui.showNodeResult({ icon: '💀', title: 'LIFE DEPLETED', message: 'ライフが尽きたためRUNが終了した', onContinue: () => this._endRun() });
          }, ADVANCE_DELAY_MS);
        }
      }

      this._renderHud();
    }

    /** ---------------- RESEARCH LAB ---------------- */

    _handleUpgradeSelected(def) {
      // AI Anomalyイベントで「次の1回」が強化されている場合、その分だけ多重取得する
      // （Rare Upgradeは進化上限1のため、2回acquireしても効果は変わらない仕様）
      const times = this.nextUpgradeMultiplier;
      for (let i = 0; i < times; i++) this.upgradeManager.acquire(def.id);
      this.nextUpgradeMultiplier = 1;

      // Repair System: 取得直後に最大ライフ・現在ライフを即座に反映する
      if (def.effect.type === 'maxLifeBonus') {
        const gain = def.effect.value * times;
        this.maxLife += gain;
        this.life = Math.min(this.maxLife, this.life + gain);
      }

      this._renderHud();
      this.ui.showNodeResult({
        icon: '🧪',
        title: 'UPGRADE ACQUIRED',
        message: times > 1 ? `${def.name} ×${times}（ANOMALY BOOST）` : def.name,
        onContinue: () => { this.ui.showScreen('game'); this._showMapChoices(); }
      });
    }

    /** ---------------- RUN終了 ---------------- */

    _endRun() {
      this.round.stop();
      this.app.mode = null;
      if (this.el.endlessHud) this.el.endlessHud.classList.add('hidden');

      // STEP29: AI Feedback System。protocolManager.reset()で消える前に、このRUNの
      // Active Protocol構成をここで確保しておく
      const activeProtocolIdsAtEnd = this.protocolManager.getActiveIds();

      // アップグレード・Protocol・Environmentはいずれもこの1RUN限定の効果のため、
      // 結果確定後にリセットする（ベスト記録(endlessSave.js)には一切関与しない）。
      // HUD自体はhidden化するが、表示内容も残さないようここで明示的に再描画しておく
      this.upgradeManager.reset();
      this._renderUpgrades();
      this.protocolManager.reset();
      this._renderProtocolBadge();
      this.environmentManager.reset();
      this._renderEnvironmentBadge();
      // STEP27: Risk ChainもRUN限定の状態のため、結果確定後にリセットする
      const finalRiskChainMultiplier = this.maxRiskMultiplierThisRun;
      this.riskChain.reset();
      this._renderRiskChainBadge();

      const saveResult = this.save.recordRun({
        depth: this.depth,
        score: this.score,
        bossClearCount: this.bossClearCount,
        memoryFragmentsGained: this.memoryFragmentsThisRun,
        eventCountGained: this.eventCountThisRun,
        perfectCountGained: this.perfectCount,
        protocolFragmentsGained: this.protocolFragmentsThisRun,
        researchDataGained: this.researchData,
        riskChainMultiplierThisRun: finalRiskChainMultiplier,
        unknownAnalysisCountThisRun: this.unknownAnalysisCount,
        researchLabVisitsGained: this.researchLabVisitsThisRun, // STEP30-7: GENESIS LABの解放条件判定用
        lastRunVisitedNodes: this.visitedNodes.slice() // STEP30-7: ECHO NETWORKの「Ghost Route表示」用
      });

      // STEP29: Achievement基盤。「生涯」条件はProtocolUnlockと同じく
      // 「保存済みの過去分（recordRunで積んだ直後の値）+ 今RUN分」を都度合算した
      // その場の値で判定する（今回はrecordRunが既に確定させた後のため過去分のみでよい）
      const achievementSnapshot = {
        perfectClearTotal: this.save.getTotalPerfectCount(),
        bestDepthEver: this.save.getBestDepth(),
        protocolEvolutionTotal: this.save.getTotalProtocolEvolutions(),
        longRunDepth: this.depth
      };
      // UI改修: RESULT画面へ切り替わる直前のトーストは読み逃しやすいため、複数達成分を
      // まとめて1つの「続ける」ボタン付きオーバーレイで示してからRESULT画面へ進む
      const newlyCompletedAchievementNames = [];
      Achievements.findNewlyCompleted(achievementSnapshot, this.save.getCompletedAchievements()).forEach(id => {
        if (!this.save.completeAchievement(id)) return;
        const def = Achievements.getById(id);
        if (def) newlyCompletedAchievementNames.push(def.name);
      });

      // STEP29: AI Feedback System。今RUNの行動パターンを分析し、RESULT画面へ渡す
      const nodeTypeCounts = {};
      this.visitedNodes.forEach(n => { nodeTypeCounts[n.type] = (nodeTypeCounts[n.type] || 0) + 1; });
      const aiFeedback = AIFeedback.analyze({
        riskChainMax: finalRiskChainMultiplier,
        extracted: this._extractedThisRun,
        nodeTypeCounts,
        perfectRatio: this.clearsThisRun > 0 ? this.perfectCount / this.clearsThisRun : 0,
        activeProtocolIds: activeProtocolIdsAtEnd
      });

      // STEP31: AI Director System「Run Report」（要求仕様セクション12）。PlayerProfileへ
      // このRUNのExtract有無・訪問Environment/所持Protocolのタリーを反映し、Reportを生成する
      this._showDirectorDialogue('runEnd'); // Dialogue System
      const directorReport = this.aiDirector.finalizeRun({ extracted: this._extractedThisRun });

      const showResultScreen = () => {
        this.result.render(
          {
            depth: this.depth,
            score: this.score,
            perfectCount: this.perfectCount,
            researchData: this.researchData,
            deepestLayer: G.PuzzleTier ? G.PuzzleTier.getTierNumber(this.depth) : 1,
            protocolsFound: this.save.getUnlockedProtocols().length,
            riskChainMultiplier: finalRiskChainMultiplier,
            unknownAnalysisCount: this.unknownAnalysisCount
          },
          {
            bestDepth: this.save.getBestDepth(),
            isNewBestDepth: saveResult.isNewBestDepth,
            isNewBestScore: saveResult.isNewBestScore
          },
          aiFeedback,
          directorReport
        );
        this.ui.showScreen('endlessResult');
      };

      // STEP32: Ending System。RUN終了時点のスナップショットで判定する。endingManager自身は
      // researchDatabaseを直接操作しない設計（要求仕様セクション13）のため、新規達成分の
      // Story Archive/Timelineへの反映はここでresearchDatabase.addEntry()を呼んで橋渡しする
      // （STEP39-2: スナップショット組み立ては`_buildEndingSnapshot()`へ切り出し、Final
      // Chapter完了時の`_checkFinalChapterEnding()`と共有する）
      const newlyAchievedEndings = this.endingManager.checkEndings(this._buildEndingSnapshot());
      newlyAchievedEndings.forEach(def => this.researchDatabase.addEntry(def.id));

      const showEndingThenResult = () => {
        if (newlyAchievedEndings.length > 0) {
          this.ui.showNodeResult({
            icon: '🎬',
            title: 'ENDING UNLOCKED',
            message: newlyAchievedEndings.map(def => def.name).join(' / '),
            onContinue: showResultScreen
          });
        } else {
          showResultScreen();
        }
      };

      if (newlyCompletedAchievementNames.length > 0) {
        this.ui.showNodeResult({
          icon: '🏆',
          title: 'ACHIEVEMENT UNLOCKED',
          message: newlyCompletedAchievementNames.join(' / '),
          onContinue: showEndingThenResult
        });
      } else {
        showEndingThenResult();
      }
    }

    /** ---------------- STEP29: Research Identity System ヘルパー ---------------- */

    /** EXP加算後、レベルアップ/Perk解放が起きていればIdentityイベントを表示する */
    _grantIdentityExp(source) {
      const result = this.identityManager.addExp(source);
      if (result.newlyUnlockedPerks.length > 0) {
        const perk = result.newlyUnlockedPerks[0];
        this.ui.showIdentityEvent({ label: 'PERK UNLOCKED', name: perk.name, sub: perk.description });
      } else if (result.leveledUp) {
        this.ui.showIdentityEvent({ label: 'IDENTITY LEVEL UP', name: this.identityManager.getLevelTitle(), sub: `Lv.${result.newLevel}` });
      }
    }

    /** ---------------- main.jsからの盤面操作delegate ---------------- */

    handleCellTap(r, c) { this.round.handleCellTap(r, c); }
    handleUndo() { this.round.handleUndo(); }
    handleReset() { this.round.handleReset(); }
    handleHint() { this.round.handleHint(); }
  }

  G.EndlessMode = EndlessMode;
})(typeof globalThis !== 'undefined' ? globalThis : this);
