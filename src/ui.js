/**
 * ui.js
 * DOM描画とスマホ向けタップ操作を担当する。
 * ゲームのルール判定・セーブ・ステージ解放判定などは一切行わず、
 * main.js から渡された状態（Game / 画面用のview-modelオブジェクト）を
 * 表示することだけに専念する。
 *
 * MVP版からの主な変更点（既存互換部分は維持）:
 *   - TITLE / STAGE SELECT / GAME の画面切り替え(showScreen)を追加
 *   - 色ボタンを選んでからマスをタップする方式をやめ、マス自体をタップする
 *     たびに EMPTY→色1→色2→色3→EMPTY と順送りする方式に変更した。
 *     そのため色選択ボタンは廃止し、代わりにタップの順序を示す
 *     非インタラクティブな凡例（renderColorLegend）を表示する。
 *   - クリア画面に星評価・Hint/Undo回数・経験値表示を追加
 * 既存の renderAll / renderCells / updateCell / renderHintStatus /
 * renderStatus / flashHintCell / showToast はシグネチャ変更なしでそのまま利用可能。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { CellState, COLORS, Score } = G;

  class UI {
    /**
     * @param {Object} callbacks
     *   onTitleStart()
     *   onSelectTutorial()
     *   onSelectDaily()
     *   onSelectStage(stageId)
     *   onBackToStageSelect()
     *   onCellTap(r, c)
     *   onUndo() onReset() onHint()
     *   onNextStageFromClear() onStageSelectFromClear()
     */
    constructor(callbacks) {
      this.cb = callbacks || {};

      this.el = {
        // 画面コンテナ
        screens: {
          title: document.getElementById('screen-title'),
          stageSelect: document.getElementById('screen-stageselect'),
          game: document.getElementById('screen-game')
        },

        // TITLE
        titleLevelLabel: document.getElementById('titleLevelLabel'),
        titleStartBtn: document.getElementById('titleStartBtn'),

        // STAGE SELECT
        backToTitleBtn: document.getElementById('backToTitleBtn'),
        tutorialCard: document.getElementById('tutorialCard'),
        dailyPuzzleCard: document.getElementById('dailyPuzzleCard'),
        dailyPuzzleDate: document.getElementById('dailyPuzzleDate'),
        stageGrid: document.getElementById('stageGrid'),

        // GAME - header
        gameBackBtn: document.getElementById('gameBackBtn'),
        stageLabel: document.getElementById('stageLabel'),
        stageBestStars: document.getElementById('stageBestStars'),

        // GAME - main
        tutorialBanner: document.getElementById('tutorialBanner'),
        moveCount: document.getElementById('moveCount'),
        timer: document.getElementById('timer'),
        boardWrapper: document.getElementById('boardWrapper'),

        // GAME - footer
        colorLegend: document.getElementById('colorLegend'),
        undoBtn: document.getElementById('undoBtn'),
        resetBtn: document.getElementById('resetBtn'),
        hintBtn: document.getElementById('hintBtn'),

        // CLEAR overlay
        clearOverlay: document.getElementById('clearOverlay'),
        clearTitle: document.getElementById('clearTitle'),
        clearStars: document.getElementById('clearStars'),
        clearStats: document.getElementById('clearStats'),
        clearExp: document.getElementById('clearExp'),
        nextStageFromClearBtn: document.getElementById('nextStageFromClearBtn'),
        stageSelectFromClearBtn: document.getElementById('stageSelectFromClearBtn'),

        toast: document.getElementById('toast')
      };

      this.cellEls = []; // [r][c] -> element
      this.rowHintEls = []; // [r][color] -> element
      this.colHintEls = []; // [c][color] -> element

      this._bindStaticEvents();
    }

    _bindStaticEvents() {
      this.el.titleStartBtn.addEventListener('click', () => this.cb.onTitleStart && this.cb.onTitleStart());
      this.el.backToTitleBtn.addEventListener('click', () => this.cb.onBackToTitle && this.cb.onBackToTitle());

      this.el.gameBackBtn.addEventListener('click', () => this.cb.onBackToStageSelect && this.cb.onBackToStageSelect());

      this.el.undoBtn.addEventListener('click', () => this.cb.onUndo && this.cb.onUndo());
      this.el.resetBtn.addEventListener('click', () => this.cb.onReset && this.cb.onReset());
      this.el.hintBtn.addEventListener('click', () => this.cb.onHint && this.cb.onHint());

      this.el.nextStageFromClearBtn.addEventListener('click', () => {
        this.hideClear();
        this.cb.onNextStageFromClear && this.cb.onNextStageFromClear();
      });
      this.el.stageSelectFromClearBtn.addEventListener('click', () => {
        this.hideClear();
        this.cb.onStageSelectFromClear && this.cb.onStageSelectFromClear();
      });
    }

    /** ---------------- 画面切り替え ---------------- */

    showScreen(name) {
      Object.keys(this.el.screens).forEach(key => {
        this.el.screens[key].classList.toggle('active', key === name);
      });
    }

    /** ---------------- TITLE ---------------- */

    renderTitle({ level }) {
      this.el.titleLevelLabel.textContent = `LOGIC LEVEL Lv.${level}`;
    }

    /** ---------------- STAGE SELECT ---------------- */

    /**
     * @param {Object} viewModel
     * @param {{completed:boolean}} viewModel.tutorial
     * @param {{dateLabel:string}} viewModel.daily
     * @param {Array<{id:number,name:string,difficulty:string,unlocked:boolean,completed:boolean,stars:number,bestTimeText:string|null}>} viewModel.stages
     */
    renderStageSelect(viewModel) {
      // チュートリアルカード
      this.el.tutorialCard.classList.toggle('completed', viewModel.tutorial.completed);
      this.el.tutorialCard.querySelector('.stage-card-status').textContent =
        viewModel.tutorial.completed ? 'CLEAR' : 'START';
      this.el.tutorialCard.onclick = () => this.cb.onSelectTutorial && this.cb.onSelectTutorial();

      // Daily Puzzleカード
      this.el.dailyPuzzleDate.textContent = viewModel.daily.dateLabel;
      this.el.dailyPuzzleCard.onclick = () => this.cb.onSelectDaily && this.cb.onSelectDaily();

      // ステージ一覧
      this.el.stageGrid.innerHTML = '';
      viewModel.stages.forEach(stage => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'stage-card' + (stage.unlocked ? '' : ' locked') + (stage.completed ? ' completed' : '');
        card.disabled = !stage.unlocked;

        const starsText = stage.completed ? Score.starsToText(stage.stars) : '';
        card.innerHTML = `
          <div class="stage-card-name">${stage.unlocked ? stage.name : 'LOCKED'}</div>
          <div class="stage-card-diff">${stage.unlocked ? stage.difficulty.toUpperCase() : ''}</div>
          <div class="stage-card-stars">${starsText}</div>
          <div class="stage-card-time">${stage.bestTimeText || ''}</div>
        `;

        if (stage.unlocked) {
          card.addEventListener('click', () => this.cb.onSelectStage && this.cb.onSelectStage(stage.id));
        }
        this.el.stageGrid.appendChild(card);
      });
    }

    /** ---------------- GAME: カラー凡例 ---------------- */

    /**
     * マスをタップした時の色の巡回順（EMPTY→色1→色2→...→EMPTY）を
     * 非インタラクティブな凡例として表示する。ステージ/チュートリアルごとに
     * 使用可能な色（allowedColors）が変わるため、盤面構築のたびに再描画する。
     */
    renderColorLegend(allowedColors) {
      const colors = allowedColors && allowedColors.length ? allowedColors : COLORS;
      const container = this.el.colorLegend;
      container.innerHTML = '';

      const makeDot = colorName => {
        const dot = document.createElement('span');
        dot.className = colorName ? `legend-dot legend-${colorName.toLowerCase()}` : 'legend-dot legend-empty';
        return dot;
      };
      const makeArrow = () => {
        const arrow = document.createElement('span');
        arrow.className = 'legend-arrow';
        arrow.textContent = '→';
        return arrow;
      };

      container.appendChild(makeDot(null));
      colors.forEach(color => {
        container.appendChild(makeArrow());
        container.appendChild(makeDot(color));
      });
      container.appendChild(makeArrow());
      container.appendChild(makeDot(null));
    }

    /** ---------------- GAME: 盤面 ---------------- */

    /** ステージが変わった際に盤面DOMを丸ごと再構築する */
    buildBoard(game) {
      const size = game.size;
      const wrapper = this.el.boardWrapper;
      wrapper.innerHTML = '';
      wrapper.style.gridTemplateColumns = `minmax(40px, 64px) repeat(${size}, 1fr)`;
      wrapper.style.gridTemplateRows = `minmax(40px, 64px) repeat(${size}, 1fr)`;

      this.cellEls = Array.from({ length: size }, () => new Array(size));
      this.rowHintEls = Array.from({ length: size }, () => ({}));
      this.colHintEls = Array.from({ length: size }, () => ({}));

      // 左上の空コーナー
      const corner = document.createElement('div');
      corner.className = 'corner-cell';
      corner.style.gridRow = '1';
      corner.style.gridColumn = '1';
      wrapper.appendChild(corner);

      // 上側：列ヒント
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className = 'hint-cell hint-col';
        cell.style.gridRow = '1';
        cell.style.gridColumn = String(c + 2);
        wrapper.appendChild(cell);
        this._renderHintChips(cell, game.puzzle.columnHints[c], this.colHintEls[c]);
      }

      // 左側：行ヒント
      for (let r = 0; r < size; r++) {
        const cell = document.createElement('div');
        cell.className = 'hint-cell hint-row';
        cell.style.gridRow = String(r + 2);
        cell.style.gridColumn = '1';
        wrapper.appendChild(cell);
        this._renderHintChips(cell, game.puzzle.rowHints[r], this.rowHintEls[r]);
      }

      // 盤面本体
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cell = document.createElement('button');
          cell.type = 'button';
          cell.className = 'board-cell';
          cell.style.gridRow = String(r + 2);
          cell.style.gridColumn = String(c + 2);
          cell.setAttribute('aria-label', `row${r + 1} col${c + 1}`);
          cell.addEventListener('click', () => this.cb.onCellTap && this.cb.onCellTap(r, c));
          wrapper.appendChild(cell);
          this.cellEls[r][c] = cell;
        }
      }

      this.renderAll(game);
    }

    _renderHintChips(container, hint, storeMap) {
      COLORS.forEach(color => {
        const count = hint[color] || 0;
        if (count === 0) return; // 0件は表示せずスッキリさせる
        const chip = document.createElement('span');
        chip.className = `hint-chip chip-${color.toLowerCase()}`;
        chip.textContent = String(count);
        container.appendChild(chip);
        storeMap[color] = chip;
      });
    }

    /** 盤面・ヒント・ステータス全部を現在のgame状態に合わせて再描画 */
    renderAll(game) {
      this.renderCells(game);
      this.renderHintStatus(game);
      this.renderStatus(game);
    }

    renderCells(game) {
      for (let r = 0; r < game.size; r++) {
        for (let c = 0; c < game.size; c++) {
          const color = game.board.get(r, c);
          const el = this.cellEls[r][c];
          el.className = 'board-cell' + (color !== CellState.EMPTY ? ` lit color-${color.toLowerCase()}` : '');
        }
      }
    }

    /** 特定マスだけ更新し、配置時は発光アニメーションを再生する */
    updateCell(r, c, color, animate) {
      const el = this.cellEls[r][c];
      el.className = 'board-cell' + (color !== CellState.EMPTY ? ` lit color-${color.toLowerCase()}` : '');
      if (animate && color !== CellState.EMPTY) {
        el.classList.remove('flash');
        // reflowを挟んでアニメーションを再トリガー
        void el.offsetWidth;
        el.classList.add('flash');
      }
    }

    renderHintStatus(game) {
      for (let r = 0; r < game.size; r++) {
        const status = game.getRowStatus(r);
        status.forEach(s => {
          const chip = this.rowHintEls[r][s.color];
          if (chip) chip.classList.toggle('satisfied', s.satisfied);
        });
      }
      for (let c = 0; c < game.size; c++) {
        const status = game.getColumnStatus(c);
        status.forEach(s => {
          const chip = this.colHintEls[c][s.color];
          if (chip) chip.classList.toggle('satisfied', s.satisfied);
        });
      }
    }

    renderStatus(game) {
      this.el.moveCount.textContent = `MOVES: ${game.moveCount}`;
      this.el.timer.textContent = `TIME: ${Score.formatTime(game.elapsedSeconds())}`;
    }

    /** @param {{label:string, starsText:string}} info */
    renderGameHeader(info) {
      this.el.stageLabel.textContent = info.label;
      this.el.stageBestStars.textContent = info.starsText || '';
    }

    /** ---------------- チュートリアルバナー ---------------- */

    showTutorialBanner(text) {
      this.el.tutorialBanner.textContent = text;
      this.el.tutorialBanner.classList.remove('hidden');
    }

    hideTutorialBanner() {
      this.el.tutorialBanner.classList.add('hidden');
    }

    /** ---------------- クリア画面 ---------------- */

    /**
     * @param {Object} stats
     * @param {string} stats.title "STAGE CLEAR!" 等
     * @param {number} stats.stars 1-3
     * @param {number} stats.seconds
     * @param {number} stats.hintCount
     * @param {number} stats.undoCount
     * @param {number} [stats.expGained]
     * @param {boolean} [stats.levelUp]
     * @param {boolean} stats.hasNext 次ステージへ進めるか
     */
    showClear(stats) {
      this.el.clearTitle.textContent = stats.title;
      if (stats.hideStars) {
        this.el.clearStars.textContent = '';
        this.el.clearStars.classList.add('hidden');
      } else {
        this.el.clearStars.textContent = Score.starsToText(stats.stars);
        this.el.clearStars.classList.remove('hidden');
      }
      this.el.clearStats.innerHTML = `
        <div>TIME: ${Score.formatTime(stats.seconds)}</div>
        <div>UNDO: ${stats.undoCount}</div>
        <div>HINT: ${stats.hintCount}</div>
      `;
      if (stats.expGained) {
        this.el.clearExp.textContent = `+${stats.expGained} EXP` + (stats.levelUp ? ' — LEVEL UP!' : '');
        this.el.clearExp.classList.remove('hidden');
      } else {
        this.el.clearExp.classList.add('hidden');
      }
      this.el.nextStageFromClearBtn.classList.toggle('hidden', !stats.hasNext);
      this.el.clearOverlay.classList.remove('hidden');
    }

    hideClear() {
      this.el.clearOverlay.classList.add('hidden');
    }

    flashHintCell(r, c) {
      const el = this.cellEls[r][c];
      el.classList.remove('flash');
      void el.offsetWidth;
      el.classList.add('flash');
    }

    showToast(message) {
      const toast = this.el.toast;
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
    }
  }

  G.UI = UI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
