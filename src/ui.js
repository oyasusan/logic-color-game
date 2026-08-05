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
  const { CellState, COLORS, Score, Animation, Sound, CognitiveTheme, AudioManager } = G;

  const DIALOGUE_TYPE_SPEED_MS = 30; // STEP32-2: Dialogue System。1文字あたりの表示間隔

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
          // STEP40-3: PROLOGUE「Awakening」（Chapter0、NEW RESEARCH開始時のみ）
          prologue: document.getElementById('screen-prologue'),
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
          neuralLab: document.getElementById('screen-neurallab'),
          endlessResult: document.getElementById('screen-endlessresult'),
          // STEP29: Research Identity System
          identitySelect: document.getElementById('screen-identityselect'),
          researchProfile: document.getElementById('screen-researchprofile'),
          // STEP30-3: World Environment Archive
          worldEnvArchive: document.getElementById('screen-worldenvarchive'),
          // STEP30-6: Environment Event Archive
          envEventArchive: document.getElementById('screen-enveventarchive'),
          // STEP30-7: Hidden Environment Archive
          hiddenArchive: document.getElementById('screen-hiddenarchive'),
          // UI改修: 5種のArchive画面への入口をまとめたハブ画面
          archiveHub: document.getElementById('screen-archivehub'),
          // STEP32: Narrative & Story System「RESEARCH DATABASE」画面
          storyArchive: document.getElementById('screen-storyarchive'),
          // STEP32: Story Scenario Framework「STORY RESEARCH」画面
          storyResearch: document.getElementById('screen-storyresearch'),
          // STEP32-3: Memory Fragment System「MEMORY ARCHIVE」画面
          memoryArchive: document.getElementById('screen-memoryarchive'),
          // STEP32-4: Character Relationship System「CHARACTER ARCHIVE」画面
          characterArchive: document.getElementById('screen-characterarchive'),
          // STEP33: Research Archive System
          researchArchive: document.getElementById('screen-researcharchive'),
          chapterArchive: document.getElementById('screen-chapterarchive'),
          // STEP43: Research Progression System「Research Report」画面
          researchReport: document.getElementById('screen-researchreport'),
          // STEP43.5: Research Facility Audio System「Audio Settings」画面
          audioSettings: document.getElementById('screen-audiosettings')
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

        // Node Result overlay（Recovery/Event等、盤面を介さないNodeの結果表示）
        nodeResultOverlay: document.getElementById('nodeResultOverlay'),
        nodeResultIcon: document.getElementById('nodeResultIcon'),
        nodeResultTitle: document.getElementById('nodeResultTitle'),
        nodeResultMessage: document.getElementById('nodeResultMessage'),
        nodeResultContinueBtn: document.getElementById('nodeResultContinueBtn'),

        // STEP29: Identity Level Up / Perk Unlock overlay
        identityEventOverlay: document.getElementById('identityEventOverlay'),
        identityEventLabel: document.getElementById('identityEventLabel'),
        identityEventName: document.getElementById('identityEventName'),
        identityEventSub: document.getElementById('identityEventSub'),

        // STEP32: Story Scenario Framework - CHOICE型Story Event用2択オーバーレイ
        storyChoiceOverlay: document.getElementById('storyChoiceOverlay'),
        storyChoiceTitle: document.getElementById('storyChoiceTitle'),
        storyChoiceMessage: document.getElementById('storyChoiceMessage'),
        storyChoiceBtn1: document.getElementById('storyChoiceBtn1'),
        storyChoiceBtn2: document.getElementById('storyChoiceBtn2'),

        // STEP32-2: Dialogue System
        dialogueOverlay: document.getElementById('dialogueOverlay'),
        dialogueSpeaker: document.getElementById('dialogueSpeaker'),
        dialogueText: document.getElementById('dialogueText'),
        dialogueNextIndicator: document.getElementById('dialogueNextIndicator'),

        toast: document.getElementById('toast')
      };

      this.cellEls = []; // [r][c] -> element
      this.rowHintEls = []; // [r][color] -> element
      this.colHintEls = []; // [c][color] -> element
      this._rowSatisfied = []; // [r] -> boolean (前回描画時点、達成演出の再生判定に使う)
      this._colSatisfied = []; // [c] -> boolean

      this._bindStaticEvents();
      this._bindSoundToggle();
      this._bindAudioSettings(); // STEP43.5: Research Facility Audio System
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

      if (this.el.nodeResultContinueBtn) {
        this.el.nodeResultContinueBtn.addEventListener('click', () => {
          if (this._nodeResultContinue) this._nodeResultContinue();
        });
      }

      // STEP32-2: Dialogue System。オーバーレイ全体をタップ領域にする
      // （文字送り中ならこの一度のタップで全文表示、表示済みなら次セリフへ進む）
      if (this.el.dialogueOverlay) {
        this.el.dialogueOverlay.addEventListener('click', () => {
          if (this._dialogueTapHandler) this._dialogueTapHandler();
        });
      }
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

    /**
     * STEP43.6: Adaptive Music System & Audio Data Architecture「Audio Settings」画面の
     * 配線。TITLE画面の🎚️ボタンから開き、BACKでTITLEへ戻る（現状の唯一の入口のため固定）。
     * AudioManager自体の値の保持・永続化はsrc/audio/AudioManager.js側の責務で、ここでは
     * DOM⇔AudioManagerの双方向同期のみを行う（既存の`_bindSoundToggle()`と同じ役割分担）。
     * 音量バスはMaster/BGM/UI/Dialogue/Environmentの4+1項目（要求仕様どおり）。
     */
    _bindAudioSettings() {
      const openBtn = document.getElementById('titleAudioSettingsBtn');
      const backBtn = document.getElementById('audioSettingsBackBtn');
      const masterToggle = document.getElementById('audioSettingsMasterToggle');
      const ambientToggle = document.getElementById('audioSettingsAmbientToggle');
      const sliders = {
        bgm: document.getElementById('audioSettingsBgmSlider'),
        ui: document.getElementById('audioSettingsUiSlider'),
        dialogue: document.getElementById('audioSettingsDialogueSlider'),
        environment: document.getElementById('audioSettingsEnvironmentSlider')
      };
      const values = {
        bgm: document.getElementById('audioSettingsBgmValue'),
        ui: document.getElementById('audioSettingsUiValue'),
        dialogue: document.getElementById('audioSettingsDialogueValue'),
        environment: document.getElementById('audioSettingsEnvironmentValue')
      };
      if (!openBtn || !AudioManager) return;

      const syncFromAudio = () => {
        masterToggle.textContent = AudioManager.isEnabled() ? '🔊' : '🔇';
        ambientToggle.textContent = AudioManager.isAmbientEnabled() ? '🔊' : '🔇';
        Object.keys(sliders).forEach(cat => {
          const percent = Math.round(AudioManager.getVolume(cat) * 100);
          sliders[cat].value = String(percent);
          values[cat].textContent = `${percent}%`;
        });
      };

      openBtn.addEventListener('click', () => { syncFromAudio(); this.showScreen('audioSettings'); });
      if (backBtn) backBtn.addEventListener('click', () => this.showScreen('title'));
      if (masterToggle) masterToggle.addEventListener('click', () => { AudioManager.setEnabled(!AudioManager.isEnabled()); syncFromAudio(); });
      if (ambientToggle) ambientToggle.addEventListener('click', () => { AudioManager.setAmbientEnabled(!AudioManager.isAmbientEnabled()); syncFromAudio(); });
      Object.keys(sliders).forEach(cat => {
        const slider = sliders[cat];
        if (!slider) return;
        slider.addEventListener('input', () => {
          const percent = Number(slider.value);
          AudioManager.setVolume(cat, percent / 100);
          values[cat].textContent = `${percent}%`;
        });
      });
      syncFromAudio();
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
        // STEP41-1: Cognitive Neural Mapping System。見た目（色の丸のみ）は変えず、
        // title/aria-labelとしてのみSignal名を付与する（表示レイアウトへの影響ゼロ）
        if (colorName && CognitiveTheme) dot.title = CognitiveTheme.getSignalLabel(colorName);
        if (!colorName) return dot; // EMPTY側の丸にはSignal名が無いためそのまま返す
        // STEP41-2: Signal Button改善。丸の下に短縮Signal名を可視テキストとして添える
        // （EMPTY側の丸・矢印のレイアウトはそのまま、色の丸だけ縦積みラッパーで包む）
        const item = document.createElement('span');
        item.className = 'legend-item';
        item.appendChild(dot);
        if (CognitiveTheme) {
          const label = document.createElement('span');
          label.className = 'legend-label';
          label.textContent = CognitiveTheme.getSignalLabelShort(colorName);
          item.appendChild(label);
        }
        return item;
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

      // STEP41-2: Layer Theme対応準備。NODE_THEMEの値に応じて盤面全体の見た目
      // （Memory Nodeの形状/Node Link風の縁取り/アイドルパルスの有無）を切り替える。
      // タップ領域（.board-cellの矩形サイズ・grid配置）自体は一切変更しない
      const nodeTheme = CognitiveTheme ? CognitiveTheme.NODE_THEME : null;
      wrapper.classList.toggle('theme-circle', !!nodeTheme && nodeTheme.shape === 'circle');
      wrapper.classList.toggle('theme-connected', !!nodeTheme && nodeTheme.connection === true);
      wrapper.classList.toggle('theme-pulse', !!nodeTheme && nodeTheme.animation === 'pulse');

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
          // STEP41-2: 未解析(UNKNOWN)Nodeのアイドルパルスを位置ごとに少しずらし、
          // 全マス同時に点滅する単調さを避ける（インラインstyleのためupdateCell()の
          // className上書きでも消えず、pulse自体の有無はCSS側のtheme-pulseで制御する）
          cell.style.animationDelay = `${((r + c) % 6) * 0.12}s`;
          cell.setAttribute('aria-label', `row${r + 1} col${c + 1}`);
          cell.addEventListener('click', () => {
            if (Sound) Sound.tap();
            if (AudioManager && this._isEndlessConsoleActive()) AudioManager.playUiSfx('nodeSelect'); // STEP43.6
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
        // STEP41-1: Cognitive Neural Mapping System。チップの見た目（数字のみ）は変えず、
        // title属性として「Signal名 + Node数」を付与する（例: "LOGIC SIGNAL — 3 Nodes"）
        if (CognitiveTheme) chip.title = `${CognitiveTheme.getSignalLabel(color)} — ${count} Nodes`;
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

    /**
     * STEP41-2: Memory Node表示。CellState（'EMPTY'/'BLUE'/'RED'/'GREEN'、判定ロジックが
     * 参照する内部状態）は一切変更せず、表示専用のNode状態名だけをここで都度算出する。
     *   - UNKNOWN: 未解析（EMPTY）
     *   - STABLE: Signal配置済みで安定している状態
     * SYNCING（同期中）はupdateCell()の配置アニメーション中だけ一時的に付与する別軸の
     * クラスのため、ここでは扱わない。
     * @returns {string} 'node-unknown'|'node-stable'
     */
    _nodeStateClass(color) {
      return color === CellState.EMPTY ? 'node-unknown' : 'node-stable';
    }

    /** @returns {string} `.board-cell`に設定すべきclassName全体（Node状態＋lit/color） */
    _cellClassName(color) {
      const state = this._nodeStateClass(color);
      return color !== CellState.EMPTY ? `board-cell ${state} lit color-${color.toLowerCase()}` : `board-cell ${state}`;
    }

    renderCells(game) {
      for (let r = 0; r < game.size; r++) {
        for (let c = 0; c < game.size; c++) {
          const color = game.board.get(r, c);
          const el = this.cellEls[r][c];
          el.className = this._cellClassName(color);
        }
      }
    }

    /** 特定マスだけ更新し、配置時は発光アニメーションを再生する */
    updateCell(r, c, color, animate) {
      const el = this.cellEls[r][c];
      el.className = this._cellClassName(color);
      if (animate && color !== CellState.EMPTY) {
        el.classList.remove('flash', 'signal-inject', 'node-syncing');
        // reflowを挟んでアニメーションを再トリガー
        void el.offsetWidth;
        // STEP41-2: 既存のflash（配置発光）に加え、Signal Inject（注入演出）・
        // Node Syncing（同期中の一瞬の演出）を追加する。いずれも一度だけ再生される
        // CSSアニメーションで、時間経過後は自然に静止画（STABLE状態の見た目）へ収束する
        el.classList.add('flash', 'signal-inject', 'node-syncing');
        if (Animation) Animation.placeLight(el);
        if (Sound) Sound.place(color);
        if (AudioManager && this._isEndlessConsoleActive()) AudioManager.playUiSfx('signalInject'); // STEP43.6
      }
    }

    /** STEP43.5: Endless RESEARCH中（Research Console有効時）のみtrue。STEP41-4で確立した
     *  `research-console-active`クラスをそのまま流用し、モード判定の二重管理を避ける */
    _isEndlessConsoleActive() {
      const screenEl = document.getElementById('screen-game');
      return !!(screenEl && screenEl.classList.contains('research-console-active'));
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

    /**
     * STEP29: Identity Level Up / Perk Unlock演出を一時的に表示する
     * （showProtocolDiscoveryと同じオーバーレイ構造を流用）。
     * @param {{label:string, name:string, sub:string}} info
     */
    showIdentityEvent(info) {
      if (Animation) {
        Animation.showIdentityEvent(
          this.el.identityEventOverlay, this.el.identityEventLabel,
          this.el.identityEventName, this.el.identityEventSub, info
        );
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
      this._toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    /**
     * Recovery/Event等、盤面遷移を伴わずその場で結果が確定するNodeの結果を、
     * 現在の画面の上にオーバーレイ表示する（トースト+screen('game')への一時遷移
     * だと、直前のPuzzle盤面が一瞬見えてから即トースト→次のMap画面に切り替わり、
     * 何が起きたか分かりにくいという問題があったため導入）。
     * 自動では閉じず、「つづける」ボタンのクリックを待ってから次へ進む
     * （ユーザーフィードバック「トーストが消えるのが速すぎて読めない」を受けた変更）。
     * @param {{icon:string, title:string, message:string, onContinue?:Function}} opts
     */
    showNodeResult({ icon, title, message, onContinue }) {
      if (!this.el.nodeResultOverlay) { if (onContinue) onContinue(); return; }
      this.el.nodeResultIcon.textContent = icon || '';
      this.el.nodeResultTitle.textContent = title || '';
      this.el.nodeResultMessage.textContent = message || '';
      this.el.nodeResultOverlay.classList.remove('hidden');

      this._nodeResultContinue = () => {
        this.hideNodeResult();
        if (onContinue) onContinue();
      };
    }

    hideNodeResult() {
      if (this.el.nodeResultOverlay) this.el.nodeResultOverlay.classList.add('hidden');
    }

    /**
     * STEP32: Story Scenario Framework。CHOICE型Story Eventの2択オーバーレイ表示。
     * showNodeResult()は「つづける」1ボタンのみのため、2択専用に新設した。
     * @param {{title:string, message:string, options:Array<{id:string,label:string}>, onChoose:Function}} opts
     */
    showStoryChoice({ title, message, options, onChoose }) {
      if (!this.el.storyChoiceOverlay) { return; }
      this.el.storyChoiceTitle.textContent = title || '';
      this.el.storyChoiceMessage.textContent = message || '';

      const buttons = [this.el.storyChoiceBtn1, this.el.storyChoiceBtn2];
      buttons.forEach((btn, i) => {
        const option = (options || [])[i];
        if (!btn) return;
        if (!option) { btn.classList.add('hidden'); return; }
        btn.classList.remove('hidden');
        btn.textContent = option.label;
        btn.onclick = () => {
          this.hideStoryChoice();
          if (onChoose) onChoose(option.id);
        };
      });

      this.el.storyChoiceOverlay.classList.remove('hidden');
    }

    hideStoryChoice() {
      if (this.el.storyChoiceOverlay) this.el.storyChoiceOverlay.classList.add('hidden');
    }

    /**
     * STEP32-2: Dialogue System セクション4/5。Character Name/Dialogue Text/Next
     * Indicatorの表示と、1文字ずつの文字送り演出を行う。要求仕様セクション5どおり
     * 「タップで全文表示、次タップで次セリフ」の状態遷移はこのメソッドが持つ
     * `_dialogueTapHandler`（_bindStaticEvents側の1つのクリックリスナーから呼ばれる）
     * で切り替える。
     * @param {{speakerName:string, text:string, onTap:Function, speakerId?:string}} opts
     *   speakerId: STEP43.5 Dialogue Text Sound用のキャラクターid（省略時は既定音）
     */
    showDialogue({ speakerName, text, onTap, speakerId }) {
      if (!this.el.dialogueOverlay) { if (onTap) onTap(); return; }
      clearInterval(this._dialogueTypeTimer);

      this.el.dialogueSpeaker.textContent = speakerName || '';
      this.el.dialogueText.textContent = '';
      this.el.dialogueNextIndicator.classList.add('hidden');
      this.el.dialogueOverlay.classList.remove('hidden');

      const fullText = text || '';
      let charIndex = 0;
      const revealFull = () => {
        clearInterval(this._dialogueTypeTimer);
        this.el.dialogueText.textContent = fullText;
        this.el.dialogueNextIndicator.classList.remove('hidden');
        this._dialogueTyping = false;
      };

      this._dialogueTyping = true;
      this._dialogueTypeTimer = setInterval(() => {
        charIndex++;
        this.el.dialogueText.textContent = fullText.slice(0, charIndex);
        // STEP43.6: Dialogue Text Sound。1文字ごとに鳴らすと煩雑なため、2文字に1回だけ
        // 短いtick音を鳴らす（空白文字はスキップし、無音の間延びを避ける）
        if (AudioManager && charIndex % 2 === 0 && fullText[charIndex - 1] && fullText[charIndex - 1] !== ' ') {
          AudioManager.playDialogueTick(speakerId);
        }
        if (charIndex >= fullText.length) revealFull();
      }, DIALOGUE_TYPE_SPEED_MS);

      this._dialogueTapHandler = () => {
        if (this._dialogueTyping) { revealFull(); return; }
        if (onTap) onTap();
      };
    }

    hideDialogue() {
      clearInterval(this._dialogueTypeTimer);
      if (this.el.dialogueOverlay) this.el.dialogueOverlay.classList.add('hidden');
      this._dialogueTapHandler = null;
    }
  }

  G.UI = UI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
