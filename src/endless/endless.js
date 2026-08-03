/**
 * endless.js
 * ENDLESS RESEARCHモード全体を統括するコントローラ。
 * TITLE→MODE SELECT→PROTOCOL SELECT→ENVIRONMENT DETECTION→RUN Initialize→
 * ENDLESS RESEARCH(GAME)→(3Depthごと)RESEARCH LAB / (5Depthごと)PROTOCOL SIGNAL→
 * RESULT の画面遷移、RUN状態（depth/score/life/maxLife/combo/perfectCount）の管理、
 * スコア計算、アップグレード/Protocol/Environment適用を行い、endlessGame.js
 * （1問ごとの進行）・endlessResult.js（RESULT画面）・researchLab.js（3択画面）・
 * upgradeManager.js（所持アップグレード管理）・protocolManager.js（Active中の
 * Protocol群の管理、Phase Bで単一→最大2個の複数管理に変更）・
 * protocolSignal.js（Depth5ごとのProtocol追加/入替画面）・
 * protocolUnlock.js（Protocol解放条件の判定、Phase C）・
 * protocolFragment.js（Protocol Fragment獲得量の定義、Phase C）・
 * protocolArchive.js（発見済み/未発見Protocol一覧画面、Phase C）・
 * environmentManager.js（RUN開始時に選ぶResearch Environmentの状態管理＋
 * Detection画面の描画、Research Environmentシステム）・
 * environmentArchive.js（発見済み/未発見Environment一覧画面、Research Environment
 * システム）・endlessSave.js（ベスト記録の永続化）・map.js（depth→難易度）を束ねる。
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
    EnvironmentManager, EnvironmentArchive
  } = G;

  const STARTING_LIFE = 3;
  const CLEAR_REWARD = 100;
  const PERFECT_REWARD = 100;
  const COMBO_REWARD_PER_STACK = 20;    // コンボ数×この値を加点（2連続なら+40、3連続なら+60…）
  const SPEED_BONUS_PER_SECOND = 5;     // parSecondsより1秒速くクリアするごとに加点
  const ADVANCE_DELAY_MS = 900;         // クリア/ミス演出とトーストを見る間を置いてから次の問題へ進む
  const RECOVERY_BASE_INTERVAL = 3;     // Recovery Protocol未所持時は回復しない。所持時の基準クリア間隔

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
      this.environmentManager = new EnvironmentManager({ ui });
      this.round = new EndlessRoundController({
        ui, puzzleManager,
        upgradeManager: this.upgradeManager,
        protocolManager: this.protocolManager,
        environmentManager: this.environmentManager
      });
      this.result = new EndlessResultScreen({
        onRetry: () => this.startRun(),
        onTitle: () => this._exitToTitle()
      });
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
      this.eventManager = new EventManager();

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
      this.round.onTimeout = () => this._handleRoundTimeout();
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
        endlessBestDepth: document.getElementById('endlessBestDepth'),
        endlessBestScore: document.getElementById('endlessBestScore'),
        endlessTotalRuns: document.getElementById('endlessTotalRuns'),
        endlessTotalBossClear: document.getElementById('endlessTotalBossClear'),
        endlessMemoryFragments: document.getElementById('endlessMemoryFragments'),

        endlessHud: document.getElementById('endlessHud'),
        endlessProtocolValue: document.getElementById('endlessProtocolValue'),
        endlessSynergyBadge: document.getElementById('endlessSynergyBadge'),
        endlessEnvironmentValue: document.getElementById('endlessEnvironmentValue'),
        endlessDepthValue: document.getElementById('endlessDepthValue'),
        endlessLifeValue: document.getElementById('endlessLifeValue'),
        endlessScoreValue: document.getElementById('endlessScoreValue'),
        endlessComboValue: document.getElementById('endlessComboValue'),
        endlessTimeValue: document.getElementById('endlessTimeValue'),
        endlessUpgradeList: document.getElementById('endlessUpgradeList')
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
      this._renderUpgrades();
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
      this._renderUpgrades();
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

      this._advance();
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
        life1AtDepth20: this._life1AtDepth20ThisRun ? 1 : 0
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
      this._advance();
    }

    _advance() {
      this.depth++;

      // Phase C: 到達Depthに応じたProtocol Fragment獲得（DEPTH_MILESTONE_INTERVALごと。
      // Deep Research Environment所持時は_gainProtocolFragments内で倍率がかかる）
      this._gainProtocolFragments(ProtocolFragment.forDepthMilestone(this.depth));
      // Minimalの解放条件（ライフ1でDepth20以上に到達）を、このDepthへ進む瞬間の残りライフで判定する
      if (this.depth >= 20 && this.life === 1) this._life1AtDepth20ThisRun = true;
      this._checkProtocolUnlocks();

      this._renderHud();
      this.round.start(this.depth);
      this._renderBossIndicator();
    }

    /** Deep Research Environment所持時、Protocol Fragmentの獲得量に倍率をかけて加算する */
    _gainProtocolFragments(amount) {
      this.protocolFragmentsThisRun += Math.round(amount * this.environmentManager.getFragmentMultiplier());
    }

    /** Boss Puzzle出現時、GAME画面のラベル・ENDLESS HUDの見た目を切り替える */
    _renderBossIndicator() {
      if (this.round.isBoss) {
        this.ui.renderGameHeader({ label: this.round.bossConfig.name, starsText: '' });
        if (this.el.endlessHud) this.el.endlessHud.classList.add('boss-active');
      } else {
        this.ui.renderGameHeader({ label: 'ENDLESS RESEARCH', starsText: '' });
        if (this.el.endlessHud) this.el.endlessHud.classList.remove('boss-active');
      }
    }

    /**
     * クリア/ミスの演出待ち(ADVANCE_DELAY_MS)後に呼ばれる。RESEARCH LAB（Depth3
     * ごと）→PROTOCOL SIGNAL（Depth5ごと）→Event Node（どちらも対象でないDepthで
     * 確率発生）の順に出現判定を行う。いずれかが発生したらそこで打ち切り、次の
     * 判定へは進まない（Depth15/30等、複数条件を同時に満たすDepthではこの優先順位に
     * 従い、その回はLabのみ・Signal/Eventは出現しない。既存のLab>Eventの優先順位に
     * 倣った設計）。どれも該当しなければ通常通り次のDepthへ進む（Boss Puzzleの判定は
     * round.start()内部で行われるため、ここでは意識する必要がない）。
     */
    _afterRoundEnd() {
      if (this.researchLab.shouldTrigger(this.depth)) {
        this.researchLab.show(this.depth);
        return;
      }
      if (this.protocolSignal.shouldTrigger(this.depth)) {
        this.protocolSignal.show(this.depth);
        return;
      }
      // Signal Noise Environment所持時、Event Node発生率が補正される
      if (this.eventManager.shouldTrigger(this.environmentManager.getEventRateMultiplier())) {
        this._triggerEvent();
        return;
      }
      this._advance();
    }

    /** ---------------- Event Node ---------------- */

    _triggerEvent() {
      const event = this.eventManager.pickEvent();
      const resultMessage = this._applyEvent(event);
      this.ui.showToast(`EVENT: ${event.name} — ${resultMessage}`);

      // Phase C: Event Node発生そのものでProtocol Fragmentを獲得し、
      // Chaosの解放条件(Event発生10回)の進捗としてもカウントする
      this.eventCountThisRun++;
      this._gainProtocolFragments(ProtocolFragment.forEvent());
      this._checkProtocolUnlocks();

      this._renderHud();

      clearTimeout(this._advanceTimer);
      this._advanceTimer = setTimeout(() => this._advance(), ADVANCE_DELAY_MS);
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
     * 保持する公開プロパティをそのまま読む（_renderBossIndicator()のthis.round.isBoss参照と
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
      }

      this.score += reward;

      const recovered = this._tickLifeRegen();
      this._checkProtocolUnlocks();

      let message = stats.isBoss
        ? `${stats.bossName} DEFEATED! +${reward}`
        : `DEPTH ${this.depth} CLEAR! +${reward}`;
      if (perfect) message += ' PERFECT';
      if (speedBonus > 0) message += ` SPEED+${speedBonus}`;
      if (recovered) message += ' ❤+1';
      this.ui.showToast(message);

      this._renderHud();
      // クリア演出・トーストを読む間を置いてから次の問題（またはRESEARCH LAB）へ進む
      clearTimeout(this._advanceTimer);
      this._advanceTimer = setTimeout(() => this._afterRoundEnd(), ADVANCE_DELAY_MS);
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
    _handleRoundTimeout() {
      // Critical Logic Environment所持時、ミスで失うライフが倍加する
      const lifeLoss = Math.max(1, Math.round(1 * this.environmentManager.getMissPenaltyMultiplier()));
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
      this._advance();
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

      const saveResult = this.save.recordRun({
        depth: this.depth,
        score: this.score,
        bossClearCount: this.bossClearCount,
        memoryFragmentsGained: this.memoryFragmentsThisRun,
        eventCountGained: this.eventCountThisRun,
        perfectCountGained: this.perfectCount,
        protocolFragmentsGained: this.protocolFragmentsThisRun
      });
      this.result.render(
        { depth: this.depth, score: this.score, perfectCount: this.perfectCount },
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
