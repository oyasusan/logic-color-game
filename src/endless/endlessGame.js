/**
 * endlessGame.js
 * ENDLESS RESEARCH内で「今挑戦中の1問」を担当するコントローラ。
 * 既存の game.js（Gameクラス）・puzzleManager.js（問題生成）・ui.js（盤面描画）を
 * そのまま呼び出すだけで、それら既存モジュールには一切手を加えない。
 *
 * ライフ・スコア・コンボ・RUN全体の進行は持たない（endless.js側の責務）。
 * このモジュールは「1問ごとの生成→制限時間管理→タップ操作の中継→
 * クリア/タイムアップの通知」だけに専念する。
 *
 * ミス（タイムアップ）の仕様: 各問題には制限時間を設け、時間内にクリアできなければ
 * ミス（タイムアップ）として扱う。制限時間は目安クリア時間(parSeconds)の1.5倍とし、
 * parSeconds以内にクリアできればSpeed Bonus対象（endless.js側で加点）とする。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { Game, EndlessMap, Boss } = G;

  // 制限時間 = parSeconds × この倍率。parSeconds以内のクリアはSpeed Bonus対象。
  const TIME_LIMIT_MULTIPLIER = 1.5;

  class EndlessRoundController {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（buildBoard/updateCell等の盤面描画を再利用する）
     * @param {Object} deps.puzzleManager 既存PuzzleManagerインスタンス（問題生成を再利用する）
     * @param {Object} deps.upgradeManager RESEARCH LABで取得したアップグレードの効果を参照する
     */
    constructor({ ui, puzzleManager, upgradeManager }) {
      this.ui = ui;
      this.puzzleManager = puzzleManager;
      this.upgradeManager = upgradeManager;

      this.game = null;
      this.puzzle = null;
      this.timerHandle = null;
      this.timeLimit = 0;
      this.remaining = 0;
      this.timeRefundSeconds = 0; // Undo Coreアップグレードで蓄積される経過時間の割引(秒)
      this.autoHintUsed = false;  // AI Predictionアップグレードの自動HINTが発動済みか（1問につき1回まで）
      this.isBoss = false;        // 現在の問題がBoss Puzzleか
      this.bossConfig = null;     // Boss Puzzleの場合の設定（boss.js参照）
      // タイムアップ後、次の問題へ切り替わるまでの短い待ち時間中にタップ操作が
      // 処理され続けてしまう（クリア済みではないため）のを防ぐロック
      this.locked = false;

      // 呼び出し側(endless.js)が差し込むコールバック
      this.onClear = null;   // (stats) => {}
      this.onTimeout = null; // (stats) => {}
      this.onTick = null;    // (remainingSeconds, timeLimitSeconds) => {}
    }

    /** 指定depthの問題を生成し、盤面を構築して制限時間タイマーを開始する */
    start(depth) {
      this.stop();
      this.locked = false;
      this.timeRefundSeconds = 0;
      this.autoHintUsed = false;

      // Boss Puzzle（Depth10/25/50）は通常のDepth別難易度テーブルではなく
      // boss.js専用の設定を使う（詳細はboss.jsのコメント参照）
      this.bossConfig = Boss ? Boss.getBossConfig(depth) : null;
      this.isBoss = !!this.bossConfig;

      const { size, emptyRatio, label } = this.isBoss
        ? this.bossConfig
        : EndlessMap.getDifficultyForDepth(depth);
      this.puzzle = this._generateWithRetry(size, emptyRatio, this.isBoss ? 'boss' : label);
      this.game = new Game(this.puzzle);

      // Boss Puzzleは専用の制限時間倍率を使う。Deep Scan等のアップグレードは通常/Boss問わず上乗せされる
      const baseMultiplier = this.isBoss ? this.bossConfig.timeLimitMultiplier : TIME_LIMIT_MULTIPLIER;
      const timeLimitMultiplier = baseMultiplier + this._effectTotal('timeLimitMultiplierBonus');
      this.timeLimit = Math.max(10, Math.round(this.puzzle.parSeconds * timeLimitMultiplier));
      this.remaining = this.timeLimit;

      this.ui.renderColorLegend(this.puzzle.allowedColors);
      this.ui.buildBoard(this.game);
      this.ui.hideClear();

      this._tick(); // 開始直後の残り時間表示を即座に反映する
      this.timerHandle = setInterval(() => this._onTimerTick(), 1000);
    }

    /** upgradeManagerが無い場合（未使用時・テスト時）でも安全に0を返す */
    _effectTotal(type) {
      return this.upgradeManager ? this.upgradeManager.getEffectTotal(type) : 0;
    }

    /**
     * 生成→品質検証（Generator.validatePuzzle）はごく稀に「色付きマスは
     * 足りているがヒント数が僅かに閾値未満」等の理由で失敗し例外を投げることが
     * Node.js上の実測で確認されている（数十回に1回未満の頻度）。ステージ生成
     * （tools/build_puzzles.js）ではこれを検知して即座に失敗させたいが、
     * プレイ中のENDLESS RESEARCHでは例外がそのままRUNのクラッシュに直結して
     * しまうため、seedを変えて数回リトライする。
     */
    _generateWithRetry(size, emptyRatio, label) {
      const maxAttempts = 5;
      let lastError = null;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const seed = `endless-${size}-${Date.now()}-${Math.floor(Math.random() * 1e9)}-${attempt}`;
        try {
          return this.puzzleManager.getGeneratedPuzzleWithRatio(size, emptyRatio, seed, label);
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError;
    }

    stop() {
      if (this.timerHandle) clearInterval(this.timerHandle);
      this.timerHandle = null;
    }

    _onTimerTick() {
      this.remaining--;
      if (this.remaining <= 0) {
        this.stop();
        this.locked = true;
        this.remaining = 0;
        this._tick();
        if (this.onTimeout) this.onTimeout(this._buildStats(false));
        return;
      }

      // AI Predictionアップグレード: 残り時間が閾値比率を切ったら自動でHINTを1回発動する
      const autoHintRatio = this._effectTotal('autoHintThresholdRatio');
      if (autoHintRatio > 0 && !this.autoHintUsed && this.remaining / this.timeLimit <= autoHintRatio) {
        this.autoHintUsed = true;
        this.handleHint();
        if (this.game && this.game.cleared) return; // handleHintでクリアした場合はそのまま終了
      }

      this._tick();
    }

    _tick() {
      if (this.onTick) this.onTick(this.remaining, this.timeLimit);
    }

    _buildStats(cleared) {
      // Undo Coreアップグレードで蓄積した割引分を、Speed Bonus判定用の経過時間から差し引く
      const elapsedSeconds = Math.max(0, this.game.elapsedSeconds() - this.timeRefundSeconds);
      return {
        cleared,
        elapsedSeconds,
        parSeconds: this.puzzle.parSeconds,
        hintUsed: this.game.hintCount > 0,
        size: this.puzzle.size,
        difficulty: this.puzzle.difficulty,
        isBoss: this.isBoss,
        bossScoreMultiplier: this.isBoss ? this.bossConfig.scoreMultiplier : 1,
        bossName: this.isBoss ? this.bossConfig.name : null
      };
    }

    /** ---------------- 盤面操作の中継（main.jsのhandleCellTap等と同じ処理） ---------------- */

    handleCellTap(r, c) {
      if (this.locked || !this.game || this.game.cleared) return;
      const color = this.game.tapCell(r, c);
      this.ui.updateCell(r, c, color, true);
      this.ui.renderHintStatus(this.game);
      this.ui.renderStatus(this.game);
      if (this.game.cleared) this._handleClear();
    }

    handleUndo() {
      if (this.locked || !this.game) return;
      const undone = this.game.undo();
      if (undone) {
        this.ui.renderAll(this.game);
        this.ui.hideClear();
        // Undo Coreアップグレード: UNDO1回ごとに経過時間から割引を蓄積する
        this.timeRefundSeconds += this._effectTotal('undoTimeRefundSeconds');
      } else {
        this.ui.showToast('これ以上戻せません');
      }
    }

    handleReset() {
      if (this.locked || !this.game) return;
      this.game.reset();
      this.ui.renderAll(this.game);
      this.ui.hideClear();
    }

    handleHint() {
      if (this.locked || !this.game || this.game.cleared) return;

      // Analyzerアップグレード: 1回のHINTで追加のマスも同時に開示する
      const revealCount = 1 + this._effectTotal('hintRevealBonus');
      let revealed = 0;
      for (let i = 0; i < revealCount; i++) {
        const result = this.game.hint();
        if (!result) break;
        this.ui.updateCell(result.r, result.c, result.color, false);
        this.ui.flashHintCell(result.r, result.c);
        revealed++;
        if (this.game.cleared) break;
      }

      if (revealed === 0) {
        this.ui.showToast('ヒントはありません');
        return;
      }

      this.ui.renderHintStatus(this.game);
      this.ui.renderStatus(this.game);
      if (this.game.cleared) this._handleClear();
    }

    _handleClear() {
      this.stop();
      if (this.onClear) this.onClear(this._buildStats(true));
    }
  }

  G.EndlessRoundController = EndlessRoundController;
})(typeof globalThis !== 'undefined' ? globalThis : this);
