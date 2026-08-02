/**
 * endless.js
 * ENDLESS RESEARCHモード全体を統括するコントローラ。
 * TITLE→MODE SELECT→ENDLESS RESEARCH(GAME)→(3Depthごと)RESEARCH LAB→RESULT
 * の画面遷移、RUN状態（depth/score/life/maxLife/combo/perfectCount）の管理、
 * スコア計算、アップグレード適用を行い、endlessGame.js（1問ごとの進行）・
 * endlessResult.js（RESULT画面）・researchLab.js（3択画面）・
 * upgradeManager.js（所持アップグレード管理）・endlessSave.js（ベスト記録の
 * 永続化）・map.js（depth→難易度）を束ねる。
 *
 * アップグレードはRUN中のみ有効なメモリ上の状態（upgradeManager.reset()で
 * RUN開始時に必ずクリアされる）で、LocalStorageには一切保存しない。
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
    UpgradeManager, ResearchLab, EventManager, Score
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
      this.round = new EndlessRoundController({ ui, puzzleManager, upgradeManager: this.upgradeManager });
      this.result = new EndlessResultScreen({
        onRetry: () => this.startRun(),
        onTitle: () => this._exitToTitle()
      });
      this.researchLab = new ResearchLab({ ui, upgradeManager: this.upgradeManager });
      this.researchLab.onSelect = def => this._handleUpgradeSelected(def);
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

      this.round.onClear = stats => this._handleRoundClear(stats);
      this.round.onTimeout = () => this._handleRoundTimeout();
      this.round.onTick = (remaining, limit) => this._renderTimer(remaining, limit);

      this.el = {
        titleEndlessBtn: document.getElementById('titleEndlessBtn'),
        modeSelectBackBtn: document.getElementById('modeSelectBackBtn'),
        endlessStartBtn: document.getElementById('endlessStartBtn'),
        endlessBestDepth: document.getElementById('endlessBestDepth'),
        endlessBestScore: document.getElementById('endlessBestScore'),
        endlessTotalRuns: document.getElementById('endlessTotalRuns'),
        endlessTotalBossClear: document.getElementById('endlessTotalBossClear'),
        endlessMemoryFragments: document.getElementById('endlessMemoryFragments'),

        endlessHud: document.getElementById('endlessHud'),
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
      this._renderUpgrades();
      this.app.mode = null;
      if (this.el.endlessHud) this.el.endlessHud.classList.add('hidden');
      this.showModeSelect();
    }

    /** ---------------- RUN開始・進行 ---------------- */

    startRun() {
      clearTimeout(this._advanceTimer);
      this.upgradeManager.reset();
      this.depth = 0;
      this.score = 0;
      this.maxLife = STARTING_LIFE;
      this.life = STARTING_LIFE;
      this.combo = 0;
      this.perfectCount = 0;
      this.clearsSinceLifeRegen = 0;
      this.bossClearCount = 0;
      this.memoryFragmentsThisRun = 0;
      this.nextUpgradeMultiplier = 1;

      this.app.mode = 'endless';
      if (this.el.endlessHud) this.el.endlessHud.classList.remove('hidden');
      this.ui.renderGameHeader({ label: 'ENDLESS RESEARCH', starsText: '' });
      this.ui.hideTutorialBanner();
      this.ui.showScreen('game');

      this._advance();
    }

    _advance() {
      this.depth++;
      this._renderHud();
      this.round.start(this.depth);
      this._renderBossIndicator();
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
     * ごと）とEvent Node（Lab対象でないDepthで確率発生）の出現判定を行う。
     * どちらも該当しなければ通常通り次のDepthへ進む（Boss Puzzleの判定は
     * round.start()内部で行われるため、ここでは意識する必要がない）。
     */
    _afterRoundEnd() {
      if (this.researchLab.shouldTrigger(this.depth)) {
        this.researchLab.show(this.depth);
        return;
      }
      if (this.eventManager.shouldTrigger()) {
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

    /** 1問クリア時（endlessGame.jsのonClear経由） */
    _handleRoundClear(stats) {
      this.combo++;

      const perfect = !stats.hintUsed;
      const speedBonus = stats.elapsedSeconds < stats.parSeconds
        ? Math.round((stats.parSeconds - stats.elapsedSeconds) * SPEED_BONUS_PER_SECOND)
        : 0;
      // Combo Coreアップグレードでコンボ単価が上乗せされる
      const comboBonusPerStack = COMBO_REWARD_PER_STACK + this.upgradeManager.getEffectTotal('comboBonusAdd');
      const comboBonus = this.combo * comboBonusPerStack;

      let reward = CLEAR_REWARD + comboBonus;
      if (perfect) {
        // Perfect Analysisアップグレードでボーナスが上乗せされる
        reward += PERFECT_REWARD + this.upgradeManager.getEffectTotal('perfectBonusAdd');
        this.perfectCount++;
      }
      reward += speedBonus;
      // Overclockアップグレードで総獲得スコアが倍率アップする
      reward = Math.round(reward * (1 + this.upgradeManager.getEffectTotal('scoreMultiplier')));

      // Boss Puzzleはさらにboss.js側で設定した倍率がかかり、撃破数としてもカウントされる
      if (stats.isBoss) {
        reward = Math.round(reward * stats.bossScoreMultiplier);
        this.bossClearCount++;
      }

      this.score += reward;

      const recovered = this._tickLifeRegen();

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
      this.life--;
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
        this.ui.showToast(`TIME UP! -1 LIFE (残り${this.life})`);
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

      // アップグレードはRUN限定の効果のため、結果確定後にリセットする
      // （ベスト記録(endlessSave.js)には一切関与しない）。HUD自体はhidden化するが、
      // 表示内容も残さないようここで明示的に再描画しておく
      this.upgradeManager.reset();
      this._renderUpgrades();

      const saveResult = this.save.recordRun({
        depth: this.depth,
        score: this.score,
        bossClearCount: this.bossClearCount,
        memoryFragmentsGained: this.memoryFragmentsThisRun
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
