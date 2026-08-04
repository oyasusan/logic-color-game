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
  const { Game, Boss, DifficultyManager } = G;

  // 制限時間 = parSeconds × この倍率。parSeconds以内のクリアはSpeed Bonus対象。
  const TIME_LIMIT_MULTIPLIER = 1.5;

  class EndlessRoundController {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（buildBoard/updateCell等の盤面描画を再利用する）
     * @param {Object} deps.puzzleManager 既存PuzzleManagerインスタンス（問題生成を再利用する）
     * @param {Object} deps.upgradeManager RESEARCH LABで取得したアップグレードの効果を参照する
     * @param {Object} [deps.protocolManager] RUN開始時に選択したProtocolの効果を参照する（Difficulty Tierへの反映用）
     * @param {Object} [deps.environmentManager] RUN開始時に選択したResearch Environmentの効果を参照する
     *   （Difficulty Tier加算・Blue Spectrumの生成バイアスへの反映用）
     * @param {Object} [deps.environmentModifierManager] STEP30-2: 現在のWorldEnvironment
     *   （Research Layerに紐づく見た目テーマ）が持つPuzzle向けModifier
     *   （Puzzle Difficulty=制限時間短縮、Puzzle Hint Effect=HINT開示マス数）に使う
     * @param {Object} [deps.worldMutationManager] STEP30-5: Active中のMutation
     *   （FRACTAL OVERFLOWのPuzzle Difficulty=制限時間短縮）に使う
     * @param {Object} [deps.environmentEventManager] STEP30-6: Active中のEnvironment Event
     *   （FRACTAL SHIFTのPuzzle Difficulty=制限時間短縮、GRID OPTIMIZATIONのHINT開示数増加）に使う
     * @param {Object} [deps.hiddenEnvironmentManager] STEP30-7: 入場中のHidden Environment
     *   （SIMULATION ZEROのPuzzle Difficulty=制限時間短縮）に使う
     * @param {Object} [deps.aiDirector] STEP31: AI DirectorのAdaptive Difficulty
     *   （既存のPuzzle Difficultyと同じ「制限時間短縮/延長」レバー）に使う
     */
    constructor({ ui, puzzleManager, upgradeManager, protocolManager, environmentManager, environmentModifierManager, worldMutationManager, environmentEventManager, hiddenEnvironmentManager, aiDirector }) {
      this.ui = ui;
      this.puzzleManager = puzzleManager;
      this.upgradeManager = upgradeManager;
      this.protocolManager = protocolManager || null;
      this.environmentManager = environmentManager || null;
      this.environmentModifierManager = environmentModifierManager || null;
      this.worldMutationManager = worldMutationManager || null;
      this.environmentEventManager = environmentEventManager || null;
      this.hiddenEnvironmentManager = hiddenEnvironmentManager || null;
      this.aiDirector = aiDirector || null;

      this.game = null;
      this.puzzle = null;
      this.timerHandle = null;
      this.timeLimit = 0;
      this.remaining = 0;
      this.timeRefundSeconds = 0; // Undo Coreアップグレードで蓄積される経過時間の割引(秒)
      this.autoHintUsed = false;  // AI Predictionアップグレードの自動HINTが発動済みか（1問につき1回まで）
      this.isBoss = false;        // 現在の問題がBoss Puzzleか
      this.bossConfig = null;     // Boss Puzzleの場合の設定（boss.js参照）
      this.currentNode = null;    // 現在挑戦中のMap Node（endless.js/mapGenerator.js参照）
      this.currentTier = null;    // 現在の問題のPuzzle Tier番号（puzzleTier.js参照。Puzzle Archive用）
      this.modifiers = [];        // 現在の問題に付与されたPuzzle Modifier（puzzleModifier.js参照。Elite等）
      this.hiddenColor = null;    // Hidden Color Modifier: 数値を伏せる色（未付与ならnull）
      this.invertHintColorOrder = false; // Inverted Signal Modifier: ヒントチップの色順を反転表示するか
      this.undoDisabled = false;  // Noise Data Modifier: UNDOを禁止するか
      this.tickIntervalSeconds = 1; // Time Distortion Modifier: 残り時間表示の更新間隔（秒）
      this._ticksSinceDisplay = 0;
      // タイムアップ後、次の問題へ切り替わるまでの短い待ち時間中にタップ操作が
      // 処理され続けてしまう（クリア済みではないため）のを防ぐロック
      this.locked = false;

      // 呼び出し側(endless.js)が差し込むコールバック
      this.onClear = null;   // (stats) => {}
      this.onTimeout = null; // (stats) => {}
      this.onTick = null;    // (remainingSeconds, timeLimitSeconds) => {}
      this.onHintUsed = null; // () => {} HINTが実際に1マス以上開示した瞬間に呼ばれる（手動・AI Prediction自動発動どちらも対象）
    }

    /**
     * 指定depthの問題を生成し、盤面を構築して制限時間タイマーを開始する。
     * @param {number} depth
     * @param {Object} [node] 選ばれたMap Node（endless.js/mapGenerator.js参照）。
     *   Elite Node・Modifier付きPuzzle Nodeの場合、`node.modifiers`（puzzleModifier.js
     *   ELITE_MODIFIER_COUNT個まで）が効果適用に使われ、DifficultyManager経由で
     *   目標Difficulty Tierにも反映される（Elite Nodeは常に+1）
     */
    start(depth, node) {
      this.stop();
      this.locked = false;
      this.timeRefundSeconds = 0;
      this.autoHintUsed = false;
      this._ticksSinceDisplay = 0;
      this.currentNode = node || null;
      this.modifiers = (node && node.modifiers) ? node.modifiers : [];

      // Boss Puzzle（Depth10/25/50）は通常のDepth別難易度テーブルではなく
      // boss.js専用の設定を使う（詳細はboss.jsのコメント参照）
      this.bossConfig = Boss ? Boss.getBossConfig(depth) : null;
      this.isBoss = !!this.bossConfig;

      // Difficulty計算（Puzzle Evolution System）: Depth基準Tier + Protocol + Environment + Node
      // （Elite Nodeは目標Tierを+1する）をDifficultyManagerに一元化。Bossは対象外で専用設定のまま
      const puzzleConfig = this.isBoss
        ? this.bossConfig
        : DifficultyManager.getPuzzleConfig(depth, {
          protocolManager: this.protocolManager,
          environmentManager: this.environmentManager,
          node: this.currentNode
        });
      const { size, emptyRatio, label } = puzzleConfig;
      this.currentTier = this.isBoss ? null : puzzleConfig.tier; // Puzzle Archive（履歴保存）用
      this.puzzle = this._generateWithRetry(size, emptyRatio, this.isBoss ? 'boss' : label);
      this.game = new Game(this.puzzle);

      // Mirror Logic Modifier: マスタップの色巡回順を逆にする（game.jsは
      // puzzle.allowedColorsの並び順をそのまま使う既存仕様のため、この配列を
      // 反転するだけでboard.js/game.js自体には一切手を加えず実現できる）
      if (this._hasModifierEffect('reverseColorCycle')) {
        const colors = (this.puzzle.allowedColors && this.puzzle.allowedColors.length)
          ? this.puzzle.allowedColors : G.COLORS;
        this.puzzle.allowedColors = colors.slice().reverse();
      }

      // Hidden Color Modifier: ランダムな1色のヒント数値を伏せる
      this.hiddenColor = null;
      if (this._hasModifierEffect('hideColorHints')) {
        const colors = (this.puzzle.allowedColors && this.puzzle.allowedColors.length)
          ? this.puzzle.allowedColors : G.COLORS;
        this.hiddenColor = colors[Math.floor(Math.random() * colors.length)];
      }

      // Inverted Signal Modifier: ヒントチップの色の並び順を反転表示する
      this.invertHintColorOrder = this._hasModifierEffect('invertHintColorOrder');

      // Noise Data Modifier: UNDOを禁止する
      this.undoDisabled = this._hasModifierEffect('undoDisabled');

      // Boss Puzzleは専用の制限時間倍率を使う。Deep Scan等のアップグレードは通常/Boss問わず上乗せされる。
      // Time Distortion Modifier（複数付与時は積で合成）があればさらに短縮される
      const baseMultiplier = this.isBoss ? this.bossConfig.timeLimitMultiplier : TIME_LIMIT_MULTIPLIER;
      let timeLimitMultiplier = baseMultiplier + this._effectTotal('timeLimitMultiplierBonus');
      this.modifiers.forEach(m => {
        if (m.effect.timeLimitMultiplierScale) timeLimitMultiplier *= m.effect.timeLimitMultiplierScale;
      });
      // STEP30-2: FRACTAL COREの「Puzzle Difficulty +25%」を制限時間短縮として適用する
      if (this.environmentModifierManager) {
        timeLimitMultiplier = this.environmentModifierManager.applyPuzzleModifier({ timeLimitMultiplier }).timeLimitMultiplier;
      }
      // STEP30-5: FRACTAL OVERFLOW Mutationの「Puzzle Difficulty +30%」も同じレバーで適用する
      if (this.worldMutationManager) {
        timeLimitMultiplier *= this.worldMutationManager.getPuzzleTimeLimitMultiplier();
      }
      // STEP30-6: FRACTAL SHIFT Eventの「Puzzle Difficulty」も同じレバーで適用する
      if (this.environmentEventManager) {
        timeLimitMultiplier *= this.environmentEventManager.getEventPuzzleTimeLimitMultiplier();
      }
      // STEP30-7: SIMULATION ZEROの「Puzzle Difficulty +50%」も同じレバーで適用する
      if (this.hiddenEnvironmentManager) {
        timeLimitMultiplier *= this.hiddenEnvironmentManager.getHiddenPuzzleTimeLimitMultiplier();
      }
      // STEP31: AI DirectorのAdaptive Difficultyも同じレバーで適用する
      if (this.aiDirector) {
        timeLimitMultiplier *= this.aiDirector.getDirectorPuzzleTimeLimitMultiplier();
      }
      this.timeLimit = Math.max(10, Math.round(this.puzzle.parSeconds * timeLimitMultiplier));
      this.remaining = this.timeLimit;

      // Time Distortion Modifier: 残り時間表示の更新間隔（秒）。複数付与時は最大値を採用
      this.tickIntervalSeconds = 1;
      this.modifiers.forEach(m => {
        if (m.effect.tickIntervalSeconds) {
          this.tickIntervalSeconds = Math.max(this.tickIntervalSeconds, m.effect.tickIntervalSeconds);
        }
      });

      this.ui.renderColorLegend(this.puzzle.allowedColors);
      this.ui.buildBoard(this.game, { hiddenColor: this.hiddenColor, invertColorOrder: this.invertHintColorOrder });
      this.ui.hideClear();

      this._tick(); // 開始直後の残り時間表示は間引かず即座に反映する
      this.timerHandle = setInterval(() => this._onTimerTick(), 1000);
    }

    /** @returns {boolean} 現在のmodifiersのいずれかがkeyという真偽値効果を持つか */
    _hasModifierEffect(key) {
      return this.modifiers.some(m => !!m.effect[key]);
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
     *
     * Blue Spectrum Environment所持時（hasBlueBias()）は、既存のリトライ回数
     * （maxAttempts=5）をそのまま使いつつ「最初の成功をすぐ返す」のではなく
     * 「複数候補を生成してBLUE比率が最も高いものを選ぶ」方式に切り替える
     * （generator.js/solver.js自体には一切手を加えない、事後選抜による実現）。
     */
    _generateWithRetry(size, emptyRatio, label) {
      const maxAttempts = 5;
      const wantsBlueBias = this.environmentManager && this.environmentManager.hasBlueBias();
      let lastError = null;
      let best = null;
      let bestBlueRatio = -1;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const seed = `endless-${size}-${Date.now()}-${Math.floor(Math.random() * 1e9)}-${attempt}`;
        try {
          const puzzle = this.puzzleManager.getGeneratedPuzzleWithRatio(size, emptyRatio, seed, label);
          if (!wantsBlueBias) return puzzle;

          const ratio = this._blueRatio(puzzle);
          if (ratio > bestBlueRatio) {
            best = puzzle;
            bestBlueRatio = ratio;
          }
        } catch (e) {
          lastError = e;
        }
      }

      if (best) return best;
      throw lastError;
    }

    /** @returns {number} puzzle.answer中の色付きマスに対するBLUEマスの割合（0〜1） */
    _blueRatio(puzzle) {
      const answer = puzzle.answer;
      let blue = 0;
      let colored = 0;
      for (let r = 0; r < answer.length; r++) {
        for (let c = 0; c < answer[r].length; c++) {
          const cell = answer[r][c];
          if (cell === G.CellState.EMPTY) continue;
          colored++;
          if (cell === G.CellState.BLUE) blue++;
        }
      }
      return colored === 0 ? 0 : blue / colored;
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

      // Time Distortion Modifier: 残り時間の表示更新をtickIntervalSeconds秒おきに間引く
      // （内部のremaining自体は毎秒正しく減り続ける。表示だけが粗くなる）
      this._ticksSinceDisplay++;
      if (this._ticksSinceDisplay >= this.tickIntervalSeconds) {
        this._ticksSinceDisplay = 0;
        this._tick();
      }
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
        bossName: this.isBoss ? this.bossConfig.name : null,
        isElite: !!(this.currentNode && this.currentNode.type === 'elite'),
        modifierIds: this.modifiers.map(m => m.id),
        tier: this.currentTier || null
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
      // Noise Data Modifier: UNDOそのものを禁止する
      if (this.undoDisabled) {
        this.ui.showToast('NOISE DATA: UNDOは使用できません');
        return;
      }
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

      // Analyzerアップグレード・STEP30-2 DIGITAL GRIDの「Puzzle Hint Effect +1」:
      // 1回のHINTで追加のマスも同時に開示する
      const envHintBonus = this.environmentModifierManager
        ? this.environmentModifierManager.applyPuzzleModifier({}).hintRevealBonus
        : 0;
      // STEP30-6: GRID OPTIMIZATION Eventの「Puzzle Hint Effect +1」
      const eventHintBonus = this.environmentEventManager ? this.environmentEventManager.getEventHintRevealBonus() : 0;
      const revealCount = 1 + this._effectTotal('hintRevealBonus') + envHintBonus + eventHintBonus;
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
      // ライフを消費するのは実際に1マス以上開示できた時のみ（開示するマスが無かった空振りは対象外）。
      // 開示マス数（revealCount）に関わらず、このhandleHint()呼び出し1回につき常に1回分として通知する
      if (this.onHintUsed) this.onHintUsed();
      if (this.game.cleared) this._handleClear();
    }

    _handleClear() {
      this.stop();
      if (this.onClear) this.onClear(this._buildStats(true));
    }
  }

  G.EndlessRoundController = EndlessRoundController;
})(typeof globalThis !== 'undefined' ? globalThis : this);
