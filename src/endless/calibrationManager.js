/**
 * calibrationManager.js
 * 「Cognitive Re-Synchronization System」セクション: Continue時のAdaptive Calibration
 * フロー全体を統括するCoordinator。prologueManager.jsと同じ設計思想（Sceneを1つずつ
 * 「続ける」待ちで進める、状態はシーケンス進行中の最小限のみ持つ、実データの読み取りは
 * adaptiveRecap.js側の集計関数に委譲する）。
 *
 * フロー: Restoring Signal... → Signal Integrity + Cognitive Drift表示（1画面へ統合。
 * 理由は後述）→ (Drift無しならそのままSynchronization Completeへ) → Calibrationカード
 * キュー（Tierに応じて組み合わせを決定、Skip可能）→ Synchronization Complete →
 * onComplete()（呼び出し側=endless.jsがLayer復帰処理を続ける）。
 *
 * 【Signal IntegrityとCognitive Driftを1画面に統合した理由】要求仕様のフロー図は
 * 「Signal Integrity表示」→「Cognitive Drift判定」を別々の矢印で描いているが、
 * 判定結果（ドリフト段階）はSignal Integrity%と1:1で決まる値であり、2画面に分けて
 * 同じ情報を2回タップさせるとCONTINUEのたびの摩擦が増えるだけと判断した。
 * 1つのSignal Integrityカードにパーセンテージとドリフトラベル/説明文を並べて
 * 表示することで、フロー図が意図する「情報を順に見せる」目的は保ったまま
 * タップ回数を減らしている。
 *
 * 【Calibrationカードの組み合わせ(Tier→カード種別)】要求仕様は「以下から組み合わせる」
 * とのみ指定し、正確な組み合わせ表までは指定していなかったため、signalIntegrity.jsの
 * 5段階Tierへ1:1で対応させて設計した（下段CARD_SETS参照）。degradationが進むほど
 * カード種別が増える、要求仕様が挙げた8種すべてが最も重いSEVEREで揃う設計。
 * 「プレイヤー進行状況から決定」の要件は、内容が空になるカード（Memory/Relationship/
 * Protocol未取得時）をキューから自動的に取り除く形で対応した。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { SignalIntegrity, AdaptiveRecap, CalibrationPuzzle, CharacterData } = G;

  const CARD_SETS = {
    synced: [],
    light: ['storyRecap'],
    moderate: ['storyRecap', 'memoryReview', 'operationReview'],
    advanced: ['researchSummary', 'storyRecap', 'memoryReview', 'relationshipReview', 'protocolReview'],
    critical: ['researchSummary', 'storyRecap', 'memoryReview', 'relationshipReview', 'protocolReview', 'operationReview', 'logicReview', 'miniPuzzle']
  };

  class CalibrationManager {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス
     * @param {Object} deps.save EndlessSaveStoreインスタンス
     * @param {Object} deps.storyManager
     * @param {Object} deps.memoryManager
     * @param {Object} deps.relationshipManager
     * @param {Object} deps.puzzleManager Mini Puzzle生成に使う既存PuzzleManagerインスタンス
     * @param {Object} [deps.feedbackManager] Audio Timeline System経由のSE/演出通知
     * @param {Function} deps.buildResearchSummary () => endless.js#_buildResearchCodexSummary()相当の集計結果
     */
    constructor({ ui, save, storyManager, memoryManager, relationshipManager, puzzleManager, feedbackManager, buildResearchSummary }) {
      this.ui = ui;
      this.save = save;
      this.storyManager = storyManager;
      this.memoryManager = memoryManager;
      this.relationshipManager = relationshipManager;
      this.puzzleManager = puzzleManager;
      this.feedbackManager = feedbackManager || null;
      this.buildResearchSummary = buildResearchSummary;

      this._queue = [];
      this._tier = null;
      this._onComplete = null;
      this._miniPuzzleActive = false;

      // endless.js側がGAME画面へMini Puzzleを読み込むために差し込むフック。@type {Function|null} (puzzle) => {}
      this.onMiniPuzzleRequest = null;
    }

    /**
     * MODE SELECTの「CONTINUE」から呼ばれる（呼び出し側でスナップショット有無は確認済みの前提）。
     * @param {Function} onComplete Calibration完了（Skipも含む）後に呼ばれる
     */
    start(onComplete) {
      this._onComplete = onComplete;
      this._tier = SignalIntegrity.getTier(this.save.getLastPlayed(), Date.now());
      if (this.feedbackManager) this.feedbackManager.trigger('restoringSignal'); // Audio演出: 専用SE「Restoring Signal」
      this.ui.showStatusSequence(['Restoring Signal...'], () => this._showIntegrity());
    }

    _showIntegrity() {
      const tier = this._tier;
      this.ui.showSignalIntegrity({
        integrity: tier.integrity,
        driftLabel: tier.driftLevel === 'NONE' ? 'SIGNAL LOCKED' : `COGNITIVE DRIFT: ${tier.driftLabel}`,
        driftDesc: tier.driftDesc,
        onContinue: () => this._afterIntegrity()
      });
    }

    _afterIntegrity() {
      const tier = this._tier;
      // Audio演出: Drift無し(NONE)の場合のみ専用SE「Signal Lock」を鳴らす
      if (this.feedbackManager && tier.driftLevel === 'NONE') this.feedbackManager.trigger('signalLock');
      this._queue = this._buildQueue(tier);
      this._playNextCard();
    }

    /** @returns {string[]} Tier.idに応じたカード種別配列。内容が空になるカードは除外する */
    _buildQueue(tier) {
      const base = CARD_SETS[tier.id] || [];
      return base.filter(type => this._hasContent(type));
    }

    _hasContent(type) {
      if (type === 'memoryReview') return this.memoryManager.getCollectedMemories().length > 0;
      if (type === 'protocolReview') return this.save.getUnlockedProtocols().length > 0;
      if (type === 'relationshipReview') {
        return CharacterData.ALL.some(c => {
          if (c.id === 'player' || c.id === 'system') return false;
          return this.relationshipManager.getRelationship(c.id) !== 0 || this.relationshipManager.getCharacterState(c.id) !== 'UNKNOWN';
        });
      }
      return true; // storyRecap/researchSummary/operationReview/logicReview/miniPuzzleは進行状況に関わらず常時表示
    }

    _playNextCard() {
      if (!this._queue.length) { this._finishCalibration(); return; }
      const type = this._queue.shift();
      this._playCard(type);
    }

    _playCard(type) {
      if (type === 'storyRecap') {
        if (this.feedbackManager) this.feedbackManager.trigger('memoryRestore'); // Audio演出: 専用SE「Memory Restore」
        this._playAriaLines(
          AdaptiveRecap.buildStoryRecapLines({ storyManager: this.storyManager, memoryManager: this.memoryManager }),
          () => this._playNextCard()
        );
        return;
      }
      if (type === 'miniPuzzle') {
        this._playMiniPuzzle();
        return;
      }
      if (this.feedbackManager) this.feedbackManager.trigger('calibration'); // Audio演出: 専用SE「Calibration」
      const card = this._buildStaticCard(type);
      this.ui.showCalibrationCard({
        icon: card.icon, title: card.title, lines: card.lines,
        skippable: true,
        onContinue: () => this._playNextCard(),
        onSkip: () => this._skipAll()
      });
    }

    _buildStaticCard(type) {
      switch (type) {
        case 'researchSummary': return AdaptiveRecap.buildResearchSummaryCard(this.buildResearchSummary());
        case 'memoryReview': return AdaptiveRecap.buildMemoryReviewCard({ memoryManager: this.memoryManager });
        case 'relationshipReview': return AdaptiveRecap.buildRelationshipReviewCard({ relationshipManager: this.relationshipManager });
        case 'protocolReview': return AdaptiveRecap.buildProtocolReviewCard({ save: this.save });
        case 'operationReview': return AdaptiveRecap.buildOperationReviewCard();
        case 'logicReview': return AdaptiveRecap.buildLogicReviewCard();
        default: return { icon: '', title: '', lines: [] };
      }
    }

    /**
     * ARIAのセリフをshowDialogue()で1行ずつ再生する。既存DialogueManagerは「一度読んだら
     * 二度と表示しない」既読管理を持つが、Story Recapは進行状況から毎回動的に組み立てる
     * 内容のため、その既読管理は経由せずui.showDialogue()を直接呼ぶ（prologueManager.jsの
     * _playDialogueSceneとは異なり、こちらは動的生成テキスト専用の簡易版）。
     */
    _playAriaLines(lines, onDone) {
      if (!lines || !lines.length) { onDone(); return; }
      let index = 0;
      const showLine = () => {
        this.ui.showDialogue({
          speakerName: 'ARIA',
          text: lines[index],
          speakerId: 'aria',
          onTap: () => {
            index++;
            if (index < lines.length) showLine();
            else { this.ui.hideDialogue(); onDone(); }
          }
        });
      };
      showLine();
    }

    _playMiniPuzzle() {
      const puzzle = CalibrationPuzzle.generate({ puzzleManager: this.puzzleManager, driftLevel: this._tier.driftLevel });
      this._miniPuzzleActive = true;
      if (this.onMiniPuzzleRequest) this.onMiniPuzzleRequest(puzzle);
    }

    /** main.js#_handleClear()経由（app.mode==='calibration'）でMini Puzzleクリア時に呼ばれる */
    handleMiniPuzzleClear() {
      if (!this._miniPuzzleActive) return;
      this._miniPuzzleActive = false;
      this.ui.hideTutorialBanner();
      if (this.feedbackManager) this.feedbackManager.trigger('calibration'); // Audio演出: 専用SE「Calibration」（他カードと同じ扱い）
      this._playNextCard();
    }

    /**
     * GAME画面の「‹ BACK」がCalibration中（Mini Puzzle表示中）に押された場合。
     * Mini Puzzleだけを中断させる手段は用意せず、安全側に倒して残りのCalibration
     * 全体をSkipしたのと同じ扱いにする（Skip確認ダイアログを経由する）。
     */
    handleMiniPuzzleBack() {
      if (!this._miniPuzzleActive) return;
      this._miniPuzzleActive = false;
      this.ui.hideTutorialBanner();
      this._skipAll();
    }

    /**
     * カード表示中の「CALIBRATIONをスキップ」ボタン。要求仕様どおり確認（推奨表示）を挟む。
     * ui.js側のshowCalibrationCard()は、この確認でキャンセルされた場合にカードが消えて
     * しまわないよう、Skipクリック時点では自動でhideしない設計になっている
     * （onContinueとは異なる）ため、実際にスキップが確定した場合のみここでhideする。
     */
    _skipAll() {
      if (!global.confirm('CALIBRATIONを完了すると、復帰後の状況把握がスムーズになります。本当にスキップしますか？')) return;
      this.ui.hideCalibrationCard();
      this._queue = [];
      this._finishCalibration();
    }

    _finishCalibration() {
      if (this.feedbackManager) this.feedbackManager.trigger('synchronizationComplete');
      this.ui.showStatusSequence(['Synchronization Complete'], () => this._finish());
    }

    _finish() {
      const cb = this._onComplete;
      this._onComplete = null;
      if (cb) cb();
    }
  }

  G.CalibrationManager = CalibrationManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
