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
    MetaProgression, NeuralLab
  } = G;

  const STARTING_LIFE = 3;
  const CLEAR_REWARD = 100;
  const PERFECT_REWARD = 100;
  const COMBO_REWARD_PER_STACK = 20;    // コンボ数×この値を加点（2連続なら+40、3連続なら+60…）
  const SPEED_BONUS_PER_SECOND = 5;     // parSecondsより1秒速くクリアするごとに加点
  const ADVANCE_DELAY_MS = 900;         // クリア/ミス演出とトーストを見る間を置いてから次の問題へ進む
  const NODE_RESULT_AUTO_ADVANCE_MS = 2200; // Recovery/Event結果オーバーレイの自動送り時間（「つづける」タップでも即座に進める）
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

      // ---- STEP28: Meta Progression / Permanent Research System ----
      // environmentManager/mapUIより先に作る（Rank解放Environmentのフィルタ・
      // Advanced Analysisの解析確率に参照させるため）
      this.metaProgression = new MetaProgression({ save: this.save });

      this.environmentManager = new EnvironmentManager({ ui, metaProgression: this.metaProgression });
      this.round = new EndlessRoundController({
        ui, puzzleManager,
        upgradeManager: this.upgradeManager,
        protocolManager: this.protocolManager,
        environmentManager: this.environmentManager
      });
      this.result = new EndlessResultScreen({
        onRetry: () => this._showNeuralLab(true),
        onTitle: () => this._exitToTitle()
      });
      this.neuralLab = new NeuralLab({ ui, save: this.save, metaProgression: this.metaProgression });
      this.neuralLab.onStartRun = () => this.startRun();
      this.neuralLab.onExit = () => this.showModeSelect();
      this.researchLab = new ResearchLab({ ui, upgradeManager: this.upgradeManager });
      this.researchLab.onSelect = def => this._handleUpgradeSelected(def);
      this.protocolSelect = new ProtocolSelect({ ui });
      this.protocolSelect.onSelect = def => this._handleProtocolSelected(def);
      this.protocolSignal = new ProtocolSignal({ ui, protocolManager: this.protocolManager, save: this.save });
      this.protocolSignal.onDecision = (action, def, targetId) => this._handleProtocolSignal(action, def, targetId);
      this.protocolArchive = new ProtocolArchive({ ui, save: this.save });
      this.environmentManager.onSelect = def => this._handleEnvironmentSelected(def);
      this.environmentManager.onBack = () => {
        // Protocol Selectへ戻る際、選択し直しでActive Protocolが重複しないよう空にしておく
        this.protocolManager.reset();
        this.protocolSelect.show();
      };
      this.environmentArchive = new EnvironmentArchive({ ui, save: this.save });
      this.mapUI = new MapUI({ ui, protocolManager: this.protocolManager, metaProgression: this.metaProgression });
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

      this.round.onClear = stats => this._handleRoundClear(stats);
      this.round.onTimeout = stats => this._handleRoundTimeout(stats);
      this.round.onTick = (remaining, limit) => this._renderTimer(remaining, limit);

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
        endlessBestDepth: document.getElementById('endlessBestDepth'),
        endlessBestScore: document.getElementById('endlessBestScore'),
        endlessTotalRuns: document.getElementById('endlessTotalRuns'),
        endlessTotalBossClear: document.getElementById('endlessTotalBossClear'),
        endlessMemoryFragments: document.getElementById('endlessMemoryFragments'),

        mapOverviewBtn: document.getElementById('mapOverviewBtn'),
        mapExtractBtn: document.getElementById('mapExtractBtn'),

        endlessHud: document.getElementById('endlessHud'),
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
        endlessRiskChainBadge: document.getElementById('endlessRiskChainBadge')
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
        this.el.protocolArchiveBackBtn.addEventListener('click', () => this.showModeSelect());
      }
      if (this.el.environmentArchiveBtn) {
        this.el.environmentArchiveBtn.addEventListener('click', () => this.environmentArchive.show());
      }
      if (this.el.environmentArchiveBackBtn) {
        this.el.environmentArchiveBackBtn.addEventListener('click', () => this.showModeSelect());
      }
      if (this.el.neuralLabBtn) {
        this.el.neuralLabBtn.addEventListener('click', () => this._showNeuralLab(false));
      }
      if (this.el.mapOverviewBtn) {
        this.el.mapOverviewBtn.addEventListener('click', () => this._showResearchMap());
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
        puzzleHistory: this.save.getPuzzleHistory()
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
      this.ui.showScreen('modeSelect');
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

    /** MODE SELECTの「START RUN」から呼ばれる。RUN本体の初期化はProtocol Select→Environment Detection完了後（_initializeRun）に行う */
    startRun() {
      clearTimeout(this._advanceTimer);
      this.protocolManager.reset();
      this.environmentManager.reset();
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
      // Explorer Protocol所持時、開始時の最大ライフに反映する（Environment側にライフ効果は無い）
      this.maxLife = STARTING_LIFE + this.protocolManager.getLifeBonus();
      this.life = this.maxLife;
      this.combo = 0;
      this.perfectCount = 0;
      this.clearsSinceLifeRegen = 0;
      this.bossClearCount = 0;
      this.memoryFragmentsThisRun = 0;
      this.nextUpgradeMultiplier = 1;
      this.eventCountThisRun = 0;
      this.protocolFragmentsThisRun = 0;
      this._life1AtDepth20ThisRun = false;

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
      const newMaxLife = Math.max(1, STARTING_LIFE + this.protocolManager.getLifeBonus());
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
        message = `PROTOCOL MERGED: ${def.name}`;
      } else if (action === 'replace' && def && targetId) {
        this.protocolManager.replace(targetId, def.id);
        this._recalculateMaxLife();
        message = `PROTOCOL REPLACED: ${def.name}`;
      } else {
        message = 'SIGNAL IGNORED';
      }

      const synergies = this.protocolManager.getActiveSynergies();
      if (synergies.length > 0) {
        message += ` / SYNERGY: ${synergies.map(s => s.name).join(', ')}`;
      }
      this.ui.showToast(message);

      this.ui.showScreen('game');
      this._renderProtocolBadge();
      this._renderHud();
      this._showMapChoices();
    }

    /** ---------------- MAP GENERATION SYSTEM ---------------- */

    /** 次のDepth（this.depth+1）の分岐候補を生成し、Map画面で提示する */
    _showMapChoices() {
      const nextDepth = this.depth + 1;
      // STEP28: Deep Scan（researchTree.js）の所持レベルに応じて分岐候補数が増える
      const choices = MapGenerator.generateChoices(
        nextDepth, this.protocolManager, this.environmentManager, this.metaProgression.getExtraMapChoices()
      );
      this.mapUI.show(nextDepth, choices);
    }

    /**
     * Map画面でのNode選択（mapUI.onSelect経由）。Depthの確定・Fragment/Unlock判定は
     * ここで行い（旧_advance()相当）、その後選ばれたNodeの種類ごとの実処理へ渡す。
     */
    _handleMapNodeSelected(node) {
      this.depth++;

      // Phase C: 到達Depthに応じたProtocol Fragment獲得（DEPTH_MILESTONE_INTERVALごと。
      // Deep Research Environment所持時は_gainProtocolFragments内で倍率がかかる）
      this._gainProtocolFragments(ProtocolFragment.forDepthMilestone(this.depth));
      // Minimalの解放条件（ライフ1でDepth20以上に到達）を、このDepthへ進む瞬間の残りライフで判定する
      if (this.depth >= 20 && this.life === 1) this._life1AtDepth20ThisRun = true;
      this._checkProtocolUnlocks();

      this._renderHud();
      this._enterNode(node);
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

      // リサーチマップ画面表示用に、実際に確定したNode種類をこのDepthの記録として残す
      this.visitedNodes.push({ depth: this.depth, type: node.type, name: node.name, icon: node.icon });

      // STEP27: このNodeの脅威度をRisk Chainへ反映する（Elite/Boss選択が連続するとスコア倍率が上がる）
      this._registerRiskChain((AIAnalysis.analyze(node)).threatLevel);

      switch (node.type) {
        case 'elite':
        case 'boss':
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
          this.researchLab.show(this.depth); // 内部でui.showScreen('researchLab')する
          break;
        case 'protocol_signal':
          this.protocolSignal.show(this.depth); // 内部でui.showScreen('protocolSignal')する
          break;
        case 'recovery':
          this._handleRecoveryNode();
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
      const event = UnknownEvents.pickEvent(this.metaProgression.getRankNumber());
      this.unknownAnalysisCount++;
      this.save.recordUnknownEvent(event.id);

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
        title: 'UNKNOWN SIGNAL ANALYSIS COMPLETE',
        message: `Result: ${event.name} — ${message}`,
        onContinue: () => this._afterUnknownResolved(),
        autoAdvanceMs: NODE_RESULT_AUTO_ADVANCE_MS
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
          if (candidates.length === 0) return 'No Rare Upgrade available';
          const picked = candidates[Math.floor(Math.random() * candidates.length)];
          this.upgradeManager.acquire(picked.id);
          return `Rare Upgrade acquired: ${picked.name}`;
        }
        case 'protocolFragment':
          this._gainProtocolFragments(event.effect.value);
          return `Protocol Fragment +${event.effect.value}`;
        case 'researchData':
          this.researchData += event.effect.value;
          return `Research Data +${event.effect.value}`;
        case 'lifeLoss':
          this.life = Math.max(0, this.life - event.effect.value);
          return `Life -${event.effect.value}`;
        case 'secretRoom': {
          const fragmentBonus = 3;
          const dataBonus = 100;
          this._gainProtocolFragments(fragmentBonus);
          this.researchData += dataBonus;
          // STEP28: Archive Expansion「Secrets」カウント対象として記録する
          this.save.recordSecretDiscovery('secret_room');
          return `Protocol Fragment +${fragmentBonus}, Research Data +${dataBonus}`;
        }
        case 'temporalEcho': {
          // STEP28: Meta ProgressionのResearch Rank4到達で解放される追加イベント
          this._gainProtocolFragments(event.effect.fragmentValue);
          this.researchData += event.effect.dataValue;
          return `Protocol Fragment +${event.effect.fragmentValue}, Research Data +${event.effect.dataValue}`;
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
        return 'No BOSS ahead to shortcut — Research Data +200 instead';
      }
      this.depth = bossDepths[0] - 1; // 次にMAP選択を表示するdepth+1が丁度Boss Depthになるよう合わせる
      return `Route shortcut to DEPTH ${bossDepths[0]} BOSS`;
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

      if (after > before && after >= AI_WARNING_CHAIN_THRESHOLD) {
        this.ui.showToast(`⚠ RESEARCH INSTABILITY Lv.${after} — Reward x${this.riskChain.getMultiplier().toFixed(1)} (System stability decreasing)`);
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
      this.ui.showToast(`REWARD SELECTED: ${opt.name} — ${message}`);
      this._renderHud();
      this._showMapChoices();
    }

    _applyRewardChoiceEffect(opt) {
      switch (opt.effect.type) {
        case 'rareUpgrade': {
          const candidates = (G.RareUpgrades ? G.RareUpgrades.ALL : []).filter(u => !this.upgradeManager.isMaxed(u.id));
          if (candidates.length === 0) return 'No Rare Upgrade available';
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
      this.life = Math.min(this.maxLife, this.life + RECOVERY_NODE_LIFE_AMOUNT);
      const recovered = this.life - before;
      this._renderHud();

      clearTimeout(this._advanceTimer);
      this.ui.showNodeResult({
        icon: '❤️',
        title: 'RECOVERY',
        message: recovered > 0 ? `ライフが${recovered}回復した` : 'ライフはすでに満タンだった',
        onContinue: () => this._showMapChoices(),
        autoAdvanceMs: NODE_RESULT_AUTO_ADVANCE_MS
      });
    }

    /**
     * Deep Research Environment所持時、Protocol Fragmentの獲得量に倍率をかけて加算する。
     * STEP28: Protocol Synthesis（researchTree.js）の永続倍率もEnvironment側とは独立に乗算する
     */
    _gainProtocolFragments(amount) {
      this.protocolFragmentsThisRun += Math.round(
        amount * this.environmentManager.getFragmentMultiplier() * this.metaProgression.getFragmentGainMultiplier()
      );
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
      this.ui.showNodeResult({
        icon: (G.NodeTypes.getType('event') || {}).icon || '✨',
        title: `EVENT: ${event.name}`,
        message: resultMessage,
        onContinue: () => this._showMapChoices(),
        autoAdvanceMs: NODE_RESULT_AUTO_ADVANCE_MS
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
      // Combo Coreアップグレードでコンボ単価が上乗せされ、Analyst Protocolでさらに倍率がかかる
      const comboBonusPerStack = COMBO_REWARD_PER_STACK + this.upgradeManager.getEffectTotal('comboBonusAdd');
      const comboBonus = Math.round(this.combo * comboBonusPerStack * this.protocolManager.getComboBonusMultiplier());

      let reward = CLEAR_REWARD + comboBonus;
      if (perfect) {
        // Perfect Analysisアップグレードでボーナスが上乗せされ、Analyst Protocol・Critical Logic
        // Environmentでさらに倍率がかかる（両者は独立に掛け合わされる）
        const perfectBonus = PERFECT_REWARD + this.upgradeManager.getEffectTotal('perfectBonusAdd');
        reward += Math.round(
          perfectBonus * this.protocolManager.getPerfectBonusMultiplier() * this.environmentManager.getPerfectBonusMultiplier()
        );
        this.perfectCount++;
      }
      reward += speedBonus;
      // Overclockアップグレードで総獲得スコアが倍率アップし、Protocol（Explorer/Overclock）の倍率もかかる
      reward = Math.round(reward * (1 + this.upgradeManager.getEffectTotal('scoreMultiplier')) * this.protocolManager.getScoreMultiplier());
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
      // 独立してさらに乗算する
      reward = Math.round(reward * this.riskChain.getMultiplier());
      // STEP28: Protocol Evolution（NEURAL RESEARCH LABで進化させたProtocol）による
      // 追加ボーナス。所持中Protocolの進化段階の合計に応じて上乗せされる（未進化なら0）
      const activeProtocolIds = this.protocolManager.getActiveDefs().map(d => d.id);
      reward = Math.round(reward * (1 + this.metaProgression.getProtocolEvolutionScoreBonus(activeProtocolIds)));

      this.score += reward;
      // STEP27: Research Data（Extract Systemで使う蓄積リソース）は総獲得スコアの一部として
      // クリアのたびに少量加算される
      this.researchData += Math.max(1, Math.round(reward * RESEARCH_DATA_RATIO));

      const recovered = this._tickLifeRegen();
      this._checkProtocolUnlocks();

      let message = stats.isBoss
        ? `${stats.bossName} DEFEATED! +${reward}`
        : stats.isElite
          ? `ELITE CLEAR! +${reward}`
          : `DEPTH ${this.depth} CLEAR! +${reward}`;
      if (perfect) message += ' PERFECT';
      if (speedBonus > 0) message += ` SPEED+${speedBonus}`;
      if (recovered) message += ' ❤+1';
      this.ui.showToast(message);

      this._renderHud();
      this._recordPuzzleHistory(stats, true);
      // クリア演出・トーストを読む間を置いてから次の問題（またはRESEARCH LAB）へ進む
      clearTimeout(this._advanceTimer);
      this._advanceTimer = setTimeout(() => this._afterRoundEnd(), ADVANCE_DELAY_MS);
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

    /** Recovery Protocolアップグレード: 所持時のみ、一定クリアごとにライフを1回復する */
    _tickLifeRegen() {
      if (!this.upgradeManager.hasEffectType('lifeRegenInterval')) return false;
      this.clearsSinceLifeRegen++;
      const interval = Math.max(1, RECOVERY_BASE_INTERVAL - this.upgradeManager.getEffectTotal('lifeRegenInterval'));
      if (this.clearsSinceLifeRegen < interval) return false;
      this.clearsSinceLifeRegen = 0;
      if (this.life >= this.maxLife) return false;
      this.life++;
      return true;
    }

    /** 制限時間切れ（ミス）時（endlessGame.jsのonTimeout経由） */
    _handleRoundTimeout(stats) {
      // Critical Logic Environment所持時、ミスで失うライフが倍加する
      let lifeLoss = Math.max(1, Math.round(1 * this.environmentManager.getMissPenaltyMultiplier()));
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
        this.ui.showToast('TIME UP! RUN終了');
        this._advanceTimer = setTimeout(() => this._endRun(), ADVANCE_DELAY_MS);
      } else if (revived) {
        this.ui.showToast('PHOENIX PROTOCOL発動! ライフ1で復活した');
        this._advanceTimer = setTimeout(() => this._afterRoundEnd(), ADVANCE_DELAY_MS);
      } else {
        this.ui.showToast(`TIME UP! -${lifeLoss} LIFE (残り${this.life})`);
        this._advanceTimer = setTimeout(() => this._afterRoundEnd(), ADVANCE_DELAY_MS);
      }
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

      this.ui.showToast(times > 1 ? `ACQUIRED: ${def.name} ×${times} (ANOMALY BOOST)` : `ACQUIRED: ${def.name}`);
      this.ui.showScreen('game');
      this._renderHud();
      this._showMapChoices();
    }

    /** ---------------- RUN終了 ---------------- */

    _endRun() {
      this.round.stop();
      this.app.mode = null;
      if (this.el.endlessHud) this.el.endlessHud.classList.add('hidden');

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
        unknownAnalysisCountThisRun: this.unknownAnalysisCount
      });
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
        }
      );

      this.ui.showScreen('endlessResult');
    }

    /** ---------------- main.jsからの盤面操作delegate ---------------- */

    handleCellTap(r, c) { this.round.handleCellTap(r, c); }
    handleUndo() { this.round.handleUndo(); }
    handleReset() { this.round.handleReset(); }
    handleHint() { this.round.handleHint(); }
  }

  G.EndlessMode = EndlessMode;
})(typeof globalThis !== 'undefined' ? globalThis : this);
