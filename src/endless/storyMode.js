/**
 * storyMode.js
 * STEP32「Story Scenario Framework」の中核Coordinator。ENDLESS RESEARCHの
 * endless.js（EndlessMode）と対になる、STORY RESEARCH側の統括役。
 *
 * 【設計方針】
 * - ENDLESS RESEARCHとは完全に分離したモード（要求仕様セクション1）としつつ、
 *   Save/AI Director/Environment描画は既存のEndlessMode/EndlessSaveStoreを
 *   そのまま再利用する（`app.endless`経由）。同じlocalStorageキーを2つの
 *   EndlessSaveStoreインスタンスで別々に読み書きすると、片方の変更がもう
 *   片方のメモリ上の状態に反映されずページ再読込までズレるため、必ず
 *   `app.endless.save`を共有する（新規にnew EndlessSaveStore()しない）。
 * - Puzzle自体は、時間制限もLifeも無い「Stage Modeと全く同じ」既存の
 *   Game/PuzzleManager/UI盤面描画をそのまま再利用する（Story Modeは
 *   ロジックパズルの合間に物語を読ませることが主目的で、Endless RESEARCHの
 *   ような時間切迫のスリルは要求仕様に無いため）。main.js側もEndlessと違い
 *   handleCellTap等へ個別分岐を増やす必要が無く、`_handleClear()`と
 *   `handleGameBack()`の2箇所だけで完結する（詳細はmain.jsのコメント参照）。
 * - Environment Modifier（Map重み/Reward倍率等）は意図的に適用しない
 *   （scenarioData.jsのコメント参照。対象がEndless専用の仕組みのため）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const {
    ScenarioManager, StoryEventManager, StoryEndingManager, ScenarioSelectUI,
    StoryNode, DifficultyManager, WorldEnvironment, Score
  } = G;

  // Scenario難易度(★1〜5)からPuzzle生成用の仮想Depthへの変換テーブル（要求仕様に数値指定が
  // 無かったため設計した。既存DifficultyManager/PuzzleTierのTier境界と対応させている）
  const BASE_DEPTH_BY_DIFFICULTY = { 1: 3, 2: 8, 3: 15, 4: 35, 5: 50 };
  const BOSS_DEPTH_BONUS = 10;       // BossチャプターはさらにDepthを押し上げ、通常Puzzleより明確に難化させる
  const DEPTH_STEP_PER_PUZZLE = 2;   // Scenario内でPuzzleを重ねるごとの緩やかな難易度上昇

  const EVENT_ICONS = { DIALOGUE: '💬', DISCOVERY: '🔍', MEMORY: '🧠', CINEMATIC: '🎬' };

  class StoryMode {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス
     * @param {Object} deps.puzzleManager 既存PuzzleManagerインスタンス（問題生成を再利用する）
     * @param {Object} deps.app main.jsのAppインスタンス（this.endless/_loadPuzzleIntoGame参照用）
     */
    constructor({ ui, puzzleManager, app }) {
      this.ui = ui;
      this.puzzleManager = puzzleManager;
      this.app = app;

      // app.endless（main.jsのApp constructorで必ずthis.endlessより後にthis.storyModeが
      // 生成される前提。main.js参照）のsaveをそのまま共有する
      this.save = app.endless.save;

      this.scenarioManager = new ScenarioManager({ save: this.save });
      this.storyEventManager = new StoryEventManager({ save: this.save });
      this.scenarioSelectUI = new ScenarioSelectUI({ ui, scenarioManager: this.scenarioManager });
      this.scenarioSelectUI.onSelect = id => this.startScenario(id);
      this.scenarioSelectUI.onBack = () => this.app.showTitle();

      this.activeScenario = null;
      this.activeNodes = [];
      this.activeIndex = 0;

      this._bindEvents();
    }

    _bindEvents() {
      const titleBtn = document.getElementById('titleStoryBtn');
      if (titleBtn) titleBtn.addEventListener('click', () => this.showScenarioSelect());
    }

    showScenarioSelect() {
      this.scenarioSelectUI.show();
    }

    /** ---------------- STEP31: AI Director連携（要求仕様セクション8） ---------------- */

    /** @returns {string} 現在のAI Director人格名（app.endless.aiDirector未初期化ならデフォルト表記） */
    _directorName() {
      const director = this.app.endless && this.app.endless.aiDirector;
      return director ? director.getPersonality().name : 'AI DIRECTOR';
    }

    _showDirectorLine(line) {
      if (!line) return;
      this.ui.showToast(`🤖 ${this._directorName()}: "${line}"`);
    }

    /** ---------------- Scenario開始・進行 ---------------- */

    startScenario(id) {
      const result = this.scenarioManager.startScenario(id);
      if (!result) {
        this.ui.showToast('このCASEはまだ解放されていない');
        return;
      }
      this.activeScenario = result.scenario;
      this.activeNodes = result.nodes;
      this.activeIndex = 0;
      this._applyScenarioEnvironment();
      this._showScenarioBriefing();
    }

    /** ---------------- STEP32セクション9: Environment連携 ---------------- */

    _applyScenarioEnvironment() {
      const renderer = this.app.endless && this.app.endless.environmentRenderer;
      if (!renderer || !WorldEnvironment) return;
      const envDef = WorldEnvironment.getById(this.activeScenario.environment.id);
      if (envDef) renderer.render(envDef);
    }

    _showScenarioBriefing() {
      const s = this.activeScenario;
      const stars = '★'.repeat(s.difficulty) + '☆'.repeat(5 - s.difficulty);
      this.ui.showNodeResult({
        icon: '📖',
        title: s.title,
        message: `${s.description}\n\n難易度: ${stars}\n舞台: ${s.environment.flavorName}`,
        onContinue: () => this._enterCurrentNode()
      });
    }

    _enterCurrentNode() {
      if (!this.activeScenario) return;
      if (this.activeIndex >= this.activeNodes.length) {
        this._finishScenario();
        return;
      }
      const node = this.activeNodes[this.activeIndex];
      if (node.directorLine) this._showDirectorLine(node.directorLine);

      if (node.type === 'story') {
        this._enterStoryNode(node);
      } else {
        this._enterPuzzleNode(node);
      }
    }

    _advanceNode() {
      this.scenarioManager.updateProgress();
      this.activeIndex++;
      this._enterCurrentNode();
    }

    /** ---------------- Story Event（要求仕様セクション6） ---------------- */

    _enterStoryNode(node) {
      const event = this.storyEventManager.getEvent(this.activeScenario.id, node.storyEventId);
      if (!event) { this._advanceNode(); return; }

      if (event.type === 'CHOICE') {
        this.ui.showStoryChoice({
          title: node.chapterTitle,
          message: event.dialogue,
          options: event.choices,
          onChoose: choiceId => {
            this.storyEventManager.recordChoice(this.activeScenario.id, event.id, choiceId);
            this._advanceNode();
          }
        });
        return;
      }

      this.ui.showNodeResult({
        icon: EVENT_ICONS[event.type] || '📖',
        title: `${node.chapterTitle}`,
        message: event.dialogue,
        onContinue: () => this._advanceNode()
      });
    }

    /** ---------------- Puzzle/Boss Node ---------------- */

    _puzzleNodesConsumedSoFar() {
      return this.activeNodes.slice(0, this.activeIndex).filter(n => n.type === 'puzzle' || n.type === 'boss').length;
    }

    _generatePuzzle(size, emptyRatio, label) {
      const maxAttempts = 5;
      let lastError = null;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const seed = `story-${size}-${Date.now()}-${Math.floor(Math.random() * 1e9)}-${attempt}`;
        try {
          return this.puzzleManager.getGeneratedPuzzleWithRatio(size, emptyRatio, seed, label);
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError;
    }

    _enterPuzzleNode(node) {
      const scenario = this.activeScenario;
      let virtualDepth = (BASE_DEPTH_BY_DIFFICULTY[scenario.difficulty] || 10) + this._puzzleNodesConsumedSoFar() * DEPTH_STEP_PER_PUZZLE;
      if (node.type === 'boss') virtualDepth += BOSS_DEPTH_BONUS;

      const config = DifficultyManager.getPuzzleConfig(virtualDepth, {});
      const puzzle = this._generatePuzzle(config.size, config.emptyRatio, node.type === 'boss' ? 'boss' : config.label);

      if (node.type === 'boss') {
        const director = this.app.endless && this.app.endless.aiDirector;
        if (director) this._showDirectorLine(director.getDialogue('bossBefore'));
      }

      this.app._loadPuzzleIntoGame(puzzle, 'story');
      this.ui.hideTutorialBanner();
      const stars = '★'.repeat(scenario.difficulty);
      this.ui.renderGameHeader({
        label: node.type === 'boss' ? `👑 ${node.chapterTitle}` : node.chapterTitle,
        starsText: stars
      });
      this.ui.showScreen('game');
    }

    /** main.jsの`_handleClear()`から呼ばれる（mode==='story'時）。Puzzle/Boss Nodeクリア処理 */
    handleNodeClear(game) {
      const node = this.activeNodes[this.activeIndex];
      if (!node) return;

      let directorLine = null;
      if (node.type === 'boss') {
        const director = this.app.endless && this.app.endless.aiDirector;
        directorLine = director ? director.getDialogue('bossAfter') : null;
      }

      const seconds = game ? game.elapsedSeconds() : 0;
      const message = `経過時間: ${Score ? Score.formatTime(seconds) : `${seconds}s`}`
        + (directorLine ? `\n\n🤖 "${directorLine}"` : '');

      this.ui.showNodeResult({
        icon: node.type === 'boss' ? '👑' : '✅',
        title: node.type === 'boss' ? `${node.chapterTitle} DEFEATED!` : `${node.chapterTitle} CLEAR`,
        message,
        onContinue: () => this._advanceNode()
      });
    }

    /** ---------------- Ending（要求仕様セクション11）+ Endless Research連携（セクション14） ---------------- */

    _finishScenario() {
      const scenario = this.activeScenario;
      const choiceHistory = this.storyEventManager.getChoiceHistory(scenario.id);
      const endingDef = StoryEndingManager.determineEnding(scenario, choiceHistory);
      const endingId = endingDef ? endingDef.id : null;
      const result = this.scenarioManager.completeScenario(endingId);
      if (result) this._grantReward(result.reward);
      this._showEndingOverlay(result || { title: scenario.title, endingTitle: null, endingDescription: null });
    }

    /**
     * 要求仕様セクション14: Story Mode完了報酬をEndless Researchへ渡す。
     * 既存のendlessSave.js APIをそのまま呼ぶだけで、Protocol Archive/Research Data等
     * 既存の表示・消費経路にそのまま反映される（新しい保存領域を作らない）
     */
    _grantReward(reward) {
      if (!reward) return;
      if (reward.researchData) this.save.grantScenarioResearchData(reward.researchData);
      if (reward.protocolId) this.save.unlockProtocol(reward.protocolId);
      if (reward.environmentId) this.save.unlockWorldEnvironment(reward.environmentId);
    }

    _showEndingOverlay(result) {
      this.ui.showNodeResult({
        icon: '🏁',
        title: result.endingTitle || 'SCENARIO COMPLETE',
        message: result.endingDescription || '',
        onContinue: () => this._returnToScenarioSelect()
      });
    }

    _returnToScenarioSelect() {
      this.app.mode = null;
      this.activeScenario = null;
      this.activeNodes = [];
      this.activeIndex = 0;
      this.scenarioSelectUI.show();
    }

    /** main.jsの`handleGameBack()`から呼ばれる（mode==='story'時）。挑戦中断してScenario Selectへ戻る */
    exitScenario() {
      this.scenarioManager.exitScenario();
      this._returnToScenarioSelect();
    }
  }

  G.StoryMode = StoryMode;
})(typeof globalThis !== 'undefined' ? globalThis : this);
