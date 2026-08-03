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
  const { CellState, COLORS, Score, Animation, Sound } = G;

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
          game: document.getElementById('screen-game'),
          // ENDLESS RESEARCH用の画面（src/endless/配下が利用する）
          modeSelect: document.getElementById('screen-modeselect'),
          protocolSelect: document.getElementById('screen-protocolselect'),
          protocolSignal: document.getElementById('screen-protocolsignal'),
          protocolArchive: document.getElementById('screen-protocolarchive'),
          environmentDetect: document.getElementById('screen-environmentdetect'),
          environmentArchive: document.getElementById('screen-environmentarchive'),
          map: document.getElementById('screen-map'),
          researchMap: document.getElementById('screen-researchmap'),
          researchLab: document.getElementById('screen-researchlab'),
          endlessResult: document.getElementById('screen-endlessresult')
        },

        // TITLE
        titleLevelLabel: document.getElementById('titleLevelLabel'),
        titleStartBtn: document.getElementById('titleStartBtn'),
        titleSoundToggle: document.getElementById('titleSoundToggle'),

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
        gameSoundToggle: document.getElementById('gameSoundToggle'),

        // GAME - main
        tutorialBanner: document.getElementById('tutorialBanner'),
        moveCount: document.getElementById('moveCount'),
        timer: document.getElementById('timer'),
        csBlue: document.getElementById('csBlue'),
        csRed: document.getElementById('csRed'),
        csGreen: document.getElementById('csGreen'),
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

        // LEVEL UP overlay
        levelUpOverlay: document.getElementById('levelUpOverlay'),
        levelUpValue: document.getElementById('levelUpValue'),

        // Protocol Discovery overlay（Phase C）
        discoveryOverlay: document.getElementById('discoveryOverlay'),
        discoveryName: document.getElementById('discoveryName'),
        discoveryRarity: document.getElementById('discoveryRarity'),

        toast: document.getElementById('toast')
      };

      this.cellEls = []; // [r][c] -> element
      this.rowHintEls = []; // [r][color] -> element
      this.colHintEls = []; // [c][color] -> element
      this._rowSatisfied = []; // [r] -> boolean (前回描画時点、達成演出の再生判定に使う)
      this._colSatisfied = []; // [c] -> boolean

      this._bindStaticEvents();
      this._bindSoundToggle();
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

    /** サウンドON/OFFトグル（TITLE・GAME両方のボタンを同じ状態に同期させる） */
    _bindSoundToggle() {
      const buttons = [this.el.titleSoundToggle, this.el.gameSoundToggle].filter(Boolean);
      const syncIcon = () => {
        const on = !Sound || Sound.isEnabled();
        buttons.forEach(btn => { btn.textContent = on ? '🔊' : '🔇'; });
      };
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          if (Sound) Sound.toggle();
          syncIcon();
        });
      });
      syncIcon();
    }

    /** ---------------- 画面切り替え ---------------- */

    showScreen(name) {
      Object.keys(this.el.screens).forEach(key => {
        const el = this.el.screens[key];
        if (el) el.classList.toggle('active', key === name);
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

    /**
     * ステージが変わった際に盤面DOMを丸ごと再構築する。
     * @param {Object} game
     * @param {Object} [options] Puzzle Modifier（puzzleModifier.js）反映用。ENDLESS RESEARCH
     *   以外（通常ステージ等）からは省略され、その場合は従来通りの表示になる
     * @param {string} [options.hiddenColor] Hidden Color Modifier: この色のヒント数値を「?」にする
     * @param {boolean} [options.invertColorOrder] Inverted Signal Modifier: ヒントチップの色順を反転する
     */
    buildBoard(game, options) {
      const opts = options || {};
      this._hintChipOptions = opts;
      const size = game.size;
      const wrapper = this.el.boardWrapper;
      wrapper.innerHTML = '';
      // ヒント列/行の幅は画面サイズに応じてclamp()で連続的に変化させる
      // （固定のminmaxだと小型スマホでマス側が圧迫され、タップ領域が狭くなるため）
      wrapper.style.gridTemplateColumns = `clamp(32px, 14vw, 64px) repeat(${size}, 1fr)`;
      wrapper.style.gridTemplateRows = `clamp(32px, 14vw, 64px) repeat(${size}, 1fr)`;
      // 6×6以上の大盤面はマス数が多く、隙間(gap)がその分マスの実サイズを圧迫するため詰める
      wrapper.style.gap = size >= 8 ? '2px' : size >= 6 ? '3px' : '4px';

      this.cellEls = Array.from({ length: size }, () => new Array(size));
      this.rowHintEls = Array.from({ length: size }, () => ({}));
      this.colHintEls = Array.from({ length: size }, () => ({}));
      this._rowSatisfied = new Array(size).fill(false);
      this._colSatisfied = new Array(size).fill(false);

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
          cell.addEventListener('click', () => {
            if (Sound) Sound.tap();
            if (Animation) Animation.selectPulse(cell);
            this.cb.onCellTap && this.cb.onCellTap(r, c);
          });
          wrapper.appendChild(cell);
          this.cellEls[r][c] = cell;
        }
      }

      this.renderAll(game);
    }

    _renderHintChips(container, hint, storeMap) {
      const opts = this._hintChipOptions || {};
      // Inverted Signal Modifier: チップの並び順（DOM挿入順）だけを反転する。
      // storeMap[color]は色をキーに保持するため、renderHintStatus()側の
      // 達成判定ロジックには一切影響しない（表示順のみが変わる）
      const order = opts.invertColorOrder ? COLORS.slice().reverse() : COLORS;
      order.forEach(color => {
        const count = hint[color] || 0;
        if (count === 0) return; // 0件は表示せずスッキリさせる
        const chip = document.createElement('span');
        chip.className = `hint-chip chip-${color.toLowerCase()}`;
        // Hidden Color Modifier: 該当色だけ数値を伏せて「?」表示にする
        chip.textContent = (opts.hiddenColor === color) ? '?' : String(count);
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
        if (Animation) Animation.placeLight(el);
        if (Sound) Sound.place(color);
      }
    }

    renderHintStatus(game) {
      for (let r = 0; r < game.size; r++) {
        const status = game.getRowStatus(r);
        const nowSatisfied = status.every(s => s.satisfied);
        status.forEach(s => {
          const chip = this.rowHintEls[r][s.color];
          if (chip) chip.classList.toggle('satisfied', s.satisfied);
        });
        if (nowSatisfied && !this._rowSatisfied[r]) this._celebrateLine('row', r, status);
        this._rowSatisfied[r] = nowSatisfied;
      }
      for (let c = 0; c < game.size; c++) {
        const status = game.getColumnStatus(c);
        const nowSatisfied = status.every(s => s.satisfied);
        status.forEach(s => {
          const chip = this.colHintEls[c][s.color];
          if (chip) chip.classList.toggle('satisfied', s.satisfied);
        });
        if (nowSatisfied && !this._colSatisfied[c]) this._celebrateLine('col', c, status);
        this._colSatisfied[c] = nowSatisfied;
      }
    }

    /** 行/列が新たに条件達成した瞬間の演出（チップ強調・ライン発光・完了音） */
    _celebrateLine(axis, index, status) {
      const hintMap = axis === 'row' ? this.rowHintEls[index] : this.colHintEls[index];
      status.forEach(s => {
        if (s.target > 0 && hintMap[s.color] && Animation) Animation.chipBurst(hintMap[s.color]);
      });
      const cells = axis === 'row'
        ? (this.cellEls[index] || [])
        : this.cellEls.map(row => row[index]);
      if (Animation) Animation.pulseLine(cells);
      if (Sound) Sound.complete();
    }

    renderStatus(game) {
      this.el.moveCount.textContent = `MOVES: ${game.moveCount}`;
      this.updateTimer(game);
      this._renderColorStatus(game);
    }

    /**
     * タイマー表示だけを更新する軽量版。MOVES/現在カラー表示は操作が
     * 発生した時にしか変化しないため、1秒ごとのタイマーTickでは
     * この関数だけを呼び、不要なDOM書き込みを避ける（パフォーマンス改善）。
     */
    updateTimer(game) {
      this.el.timer.textContent = `TIME: ${Score.formatTime(game.elapsedSeconds())}`;
    }

    /** 現在盤面上にある色ごとのライト数（現在カラー表示）を更新する */
    _renderColorStatus(game) {
      if (!this.el.csBlue) return;
      const counts = { BLUE: 0, RED: 0, GREEN: 0 };
      for (let r = 0; r < game.size; r++) {
        for (let c = 0; c < game.size; c++) {
          const color = game.board.get(r, c);
          if (counts[color] !== undefined) counts[color]++;
        }
      }
      this.el.csBlue.textContent = String(counts.BLUE);
      this.el.csRed.textContent = String(counts.RED);
      this.el.csGreen.textContent = String(counts.GREEN);
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

      if (Animation) Animation.syncFlashBoard(this.cellEls);
      if (Sound) Sound.clear();
      this.el.clearOverlay.classList.remove('hidden');
    }

    hideClear() {
      this.el.clearOverlay.classList.add('hidden');
    }

    /** LEVEL UP演出を一時的に表示する（クリア画面の上に重ねて出し、自動で消える） */
    showLevelUp(level) {
      if (Animation) Animation.showLevelUp(this.el.levelUpOverlay, this.el.levelUpValue, level);
    }

    /** Protocol発見演出を一時的に表示する（Phase C。GAME画面の上に重ねて出し、自動で消える） */
    showProtocolDiscovery(def) {
      if (Animation) {
        Animation.showDiscovery(this.el.discoveryOverlay, this.el.discoveryName, this.el.discoveryRarity, def);
      }
    }

    /** ---------------- デバッグ: 答え表示（?debug=true時のみ呼ばれる） ---------------- */

    showAnswerOverlay(answer) {
      for (let r = 0; r < answer.length; r++) {
        for (let c = 0; c < answer[r].length; c++) {
          const el = this.cellEls[r] && this.cellEls[r][c];
          if (!el) continue;
          el.classList.remove('answer-blue', 'answer-red', 'answer-green');
          const color = answer[r][c];
          if (color !== CellState.EMPTY) el.classList.add(`answer-${color.toLowerCase()}`);
        }
      }
    }

    hideAnswerOverlay() {
      this.cellEls.forEach(row => row.forEach(el => {
        if (el) el.classList.remove('answer-blue', 'answer-red', 'answer-green');
      }));
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
