/**
 * main.js
 * アプリのエントリーポイント。stage.js / progress.js / score.js / tutorial.js /
 * game.js / ui.js を統括し、以下の画面フローを制御する。
 *
 *   TITLE → STAGE SELECT → GAME → CLEAR → (NEXT STAGE / STAGE SELECT)
 *
 * MVP版からの主な変更点:
 *   - 単一Storageオブジェクトだった保存処理を progress.js の ProgressStore に分離
 *   - 単一ステージの直列プレイから、stage.js によるステージ選択制に変更
 *   - 初回プレイヤー向けに tutorial.js によるチュートリアル進行を追加
 *   - クリア時の評価を score.js の星計算に委譲
 *   - puzzleManager.js による自動生成問題（Daily Puzzle）をSTAGE SELECT画面
 *     から遊べるように追加
 * 既存の「配置→判定→クリア」というゲームプレイ自体のロジックはgame.js側で
 * 変更していないため、プレイ感覚は維持されている。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { Game, UI, Score, ProgressStore, StageManager, TutorialController, PuzzleManager, Theme, Debug, EndlessMode } = G;

  class App {
    constructor() {
      this.progress = new ProgressStore();
      this.stageManager = new StageManager();
      this.tutorial = new TutorialController();
      this.puzzleManager = new PuzzleManager();

      this.game = null;
      this.mode = null; // 'tutorial' | 'stage' | 'daily' | 'endless'
      this.currentStageId = null;
      this.timerHandle = null;

      this.ui = new UI({
        onTitleStart: () => this.showStageSelect(),
        onBackToTitle: () => this.showTitle(),
        onSelectTutorial: () => this.startTutorial(),
        onSelectDaily: () => this.startDailyPuzzle(),
        onSelectStage: stageId => this.startStage(stageId),
        onBackToStageSelect: () => this.handleGameBack(),
        onCellTap: (r, c) => this.handleCellTap(r, c),
        onUndo: () => this.handleUndo(),
        onReset: () => this.handleReset(),
        onHint: () => this.handleHint(),
        onNextStageFromClear: () => this.handleNextStageFromClear(),
        onStageSelectFromClear: () => this.showStageSelect()
      });

      // ENDLESS RESEARCH（src/endless/配下）は既存のステージ/チュートリアル/Daily
      // Puzzleとは独立したコントローラで、GAME画面の盤面操作は this.mode==='endless'
      // の時だけ下記の各handle*メソッドから委譲される（既存モードの処理は無変更）
      this.endless = EndlessMode ? new EndlessMode({ ui: this.ui, puzzleManager: this.puzzleManager, app: this }) : null;

      // デバッグモード(?debug=true)の時だけ、答え表示トグルを盤面へ反映する
      if (Debug) {
        Debug.onToggleAnswer(show => {
          if (!this.game) return;
          if (show) this.ui.showAnswerOverlay(this.game.puzzle.answer);
          else this.ui.hideAnswerOverlay();
        });
      }
    }

    async init() {
      if (Theme) Theme.init();
      this._registerServiceWorker();
      this.progress.load();
      await Promise.all([
        this.stageManager.load(),
        this.tutorial.load(),
        this.puzzleManager.loadFixedPuzzles()
      ]);
      this.showTitle();
      this._startTimerLoop();
    }

    /** PWA対応: オフライン起動用のService Workerを登録する（file://直開き時は何もしない） */
    _registerServiceWorker() {
      if (!('serviceWorker' in navigator)) return;
      if (global.location.protocol === 'file:') return;
      navigator.serviceWorker.register('./service-worker.js').catch(err => {
        console.warn('Service Workerの登録に失敗しました。', err);
      });
    }

    /** ---------------- 画面遷移 ---------------- */

    showTitle() {
      this.ui.renderTitle({ level: this.progress.data.level });
      this.ui.showScreen('title');
    }

    showStageSelect() {
      const viewModel = {
        tutorial: { completed: this.progress.isTutorialCompleted() },
        daily: { dateLabel: new Date().toLocaleDateString('ja-JP') },
        stages: this.stageManager.getStages().map(stage => {
          const unlocked = this.stageManager.isUnlocked(stage, this.progress);
          const completed = this.progress.isStageCompleted(stage.id);
          const stars = this.progress.getStars(stage.id);
          const bestTime = this.progress.getBestTime(stage.id);
          return {
            id: stage.id,
            name: stage.name,
            difficulty: stage.difficulty,
            unlocked,
            completed,
            stars,
            bestTimeText: bestTime != null ? Score.formatTime(bestTime) : null
          };
        })
      };
      this.ui.renderStageSelect(viewModel);
      this.ui.showScreen('stageSelect');
    }

    startTutorial() {
      const puzzle = this.tutorial.begin();
      this._loadPuzzleIntoGame(puzzle, 'tutorial');
      this.ui.showTutorialBanner(puzzle.message);
      this.ui.renderGameHeader({ label: puzzle.title, starsText: '' });
      this.ui.showScreen('game');
    }

    /** Daily Puzzle: 日付をseedにした自動生成問題を開始する（毎日1問、同じ日付なら誰でも同じ問題） */
    startDailyPuzzle() {
      const puzzle = this.puzzleManager.getDailyPuzzle();
      this.currentStageId = null;
      this._loadPuzzleIntoGame(puzzle, 'daily');
      this.ui.hideTutorialBanner();
      this.ui.renderGameHeader({
        label: `DAILY PUZZLE ${puzzle.dateSeed}`,
        starsText: ''
      });
      this.ui.showScreen('game');
    }

    startStage(stageId) {
      const stage = this.stageManager.getStageById(stageId);
      const puzzle = this.stageManager.getPuzzleForStage(stageId);
      if (!stage || !puzzle) return;

      this.currentStageId = stageId;
      this._loadPuzzleIntoGame(puzzle, 'stage');
      this.ui.hideTutorialBanner();

      const stars = this.progress.getStars(stageId);
      this.ui.renderGameHeader({
        label: stage.name,
        starsText: stars ? Score.starsToText(stars) : ''
      });
      this.ui.showScreen('game');
    }

    _loadPuzzleIntoGame(puzzle, mode) {
      this.mode = mode;
      this.game = new Game(puzzle);
      this.ui.renderColorLegend(puzzle.allowedColors);
      this.ui.buildBoard(this.game);
      this.ui.hideClear();
      if (Debug) Debug.render(puzzle);
    }

    /** GAME画面の「‹ BACK」。ENDLESS RESEARCH中はMODE SELECTへ、それ以外は既存通りSTAGE SELECTへ戻る */
    handleGameBack() {
      if (this.mode === 'endless' && this.endless) {
        this.endless.exitRun();
        return;
      }
      this.showStageSelect();
    }

    /** ---------------- ゲーム内操作 ---------------- */

    handleCellTap(r, c) {
      if (this.mode === 'endless' && this.endless) {
        this.endless.handleCellTap(r, c);
        return;
      }
      if (!this.game || this.game.cleared) return;
      const color = this.game.tapCell(r, c);
      this.ui.updateCell(r, c, color, true);
      this.ui.renderHintStatus(this.game);
      this.ui.renderStatus(this.game);

      if (this.game.cleared) {
        this._handleClear();
      }
    }

    handleUndo() {
      if (this.mode === 'endless' && this.endless) {
        this.endless.handleUndo();
        return;
      }
      if (!this.game) return;
      const undone = this.game.undo();
      if (undone) {
        this.ui.renderAll(this.game);
        this.ui.hideClear();
      } else {
        this.ui.showToast('これ以上戻せません');
      }
    }

    handleReset() {
      if (this.mode === 'endless' && this.endless) {
        this.endless.handleReset();
        return;
      }
      if (!this.game) return;
      this.game.reset();
      this.ui.renderAll(this.game);
      this.ui.hideClear();
    }

    handleHint() {
      if (this.mode === 'endless' && this.endless) {
        this.endless.handleHint();
        return;
      }
      if (!this.game || this.game.cleared) return;
      const result = this.game.hint();
      if (!result) {
        this.ui.showToast('ヒントはありません');
        return;
      }
      this.ui.updateCell(result.r, result.c, result.color, false);
      this.ui.flashHintCell(result.r, result.c);
      this.ui.renderHintStatus(this.game);
      this.ui.renderStatus(this.game);

      if (this.game.cleared) {
        this._handleClear();
      }
    }

    /** ---------------- クリア処理 ---------------- */

    _handleClear() {
      if (this.mode === 'tutorial') {
        this._handleTutorialClear();
      } else if (this.mode === 'daily') {
        this._handleDailyClear();
      } else {
        this._handleStageClear();
      }
    }

    /**
     * Daily Puzzleのクリア処理。ステージクリアとは異なり進行状況として
     * completedStages/starsには記録しない（1日1問という性質上、ステージの
     * 進捗システムとは別枠として扱う。永続化・連続日数などは今後の拡張候補）。
     */
    _handleDailyClear() {
      this.ui.showClear({
        title: 'DAILY PUZZLE CLEAR!',
        hideStars: true,
        seconds: this.game.elapsedSeconds(),
        hintCount: this.game.hintCount,
        undoCount: this.game.undoCount,
        hasNext: false
      });
    }

    _handleTutorialClear() {
      const isLast = this.tutorial.isLastStep();
      if (isLast) {
        this.progress.completeTutorial();
      }
      this.ui.showClear({
        title: isLast ? 'TUTORIAL CLEAR!' : `TUTORIAL ${this.tutorial.currentIndex + 1}/${this.tutorial.totalSteps} CLEAR!`,
        hideStars: true,
        seconds: this.game.elapsedSeconds(),
        hintCount: this.game.hintCount,
        undoCount: this.game.undoCount,
        hasNext: !isLast
      });
    }

    _handleStageClear() {
      const seconds = this.game.elapsedSeconds();
      const stars = Score.calcStars({
        seconds,
        parSeconds: this.game.puzzle.parSeconds,
        hintCount: this.game.hintCount,
        undoCount: this.game.undoCount
      });

      const result = this.progress.recordClear(this.currentStageId, {
        stars,
        seconds,
        hintCount: this.game.hintCount,
        undoCount: this.game.undoCount
      });

      const next = this.stageManager.getNextStage(this.currentStageId);

      this.ui.showClear({
        title: 'STAGE CLEAR!',
        stars,
        seconds,
        hintCount: this.game.hintCount,
        undoCount: this.game.undoCount,
        expGained: result.expGained,
        levelUp: result.levelUp,
        hasNext: !!next
      });

      if (result.levelUp) {
        this.ui.showLevelUp(result.level);
      }
    }

    handleNextStageFromClear() {
      if (this.mode === 'daily') {
        this.showStageSelect();
        return;
      }

      if (this.mode === 'tutorial') {
        const nextPuzzle = this.tutorial.advance();
        if (nextPuzzle) {
          this._loadPuzzleIntoGame(nextPuzzle, 'tutorial');
          this.ui.showTutorialBanner(nextPuzzle.message);
          this.ui.renderGameHeader({ label: nextPuzzle.title, starsText: '' });
        } else {
          this.showStageSelect();
        }
        return;
      }

      const next = this.stageManager.getNextStage(this.currentStageId);
      if (next && this.stageManager.isUnlocked(next, this.progress)) {
        this.startStage(next.id);
      } else {
        this.showStageSelect();
      }
    }

    _startTimerLoop() {
      if (this.timerHandle) clearInterval(this.timerHandle);
      this.timerHandle = setInterval(() => {
        // ENDLESS RESEARCH中はendless.js側が独自の（カウントダウン）タイマーを
        // 持っているため、こちらのカウントアップタイマーは動かさない
        // （this.gameはendlessモードでは更新されず古い値が残るため、二重更新防止も兼ねる）
        if (this.mode !== 'endless' && this.game && !this.game.cleared) {
          // MOVES/現在カラー表示は操作時に既に更新済みなので、ここではタイマーのみ更新する
          this.ui.updateTimer(this.game);
        }
      }, 1000);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
  });

  G.App = App;
})(typeof globalThis !== 'undefined' ? globalThis : this);
