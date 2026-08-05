/**
 * feedbackManager.js
 * STEP43.6追加要件「Audio Timeline System」セクション「Feedback連携」。
 * 「Timelineは FeedbackManagerのみから起動する。画面側から直接Timelineを操作しない」
 * という要求仕様どおり、endless.js（画面側）が触れるのはこのクラスの`trigger()`
 * メソッドだけにし、`AudioTimelineManager`（`src/audio/`配下）への実際のアクセスは
 * 全てこのクラスへ閉じ込める。
 *
 * 【Popup/Dialogue/Callbackハンドラの設計判断】audioTimelines.jsのlayerComplete/
 * memoryObtain Timelineが参照する'popup'/'dialogue'/'callback'ステップは、既存の
 * Reward/Story/Dialogueパイプライン（endless.jsの`_handleRoundClear()`が管理する
 * `storySteps`キュー、単一スロットの`nodeResultOverlay`/`dialogueManager`）とは
 * 意図的に独立させた。既存パイプラインへ深く割り込むと、二重発火やオーバーレイの
 * 競合（「続けるボタン必須」の既存方針・単一スロット実装との衝突）を招くリスクが高いため、
 * 新設の非モーダルなインジケータ（#timelinePopup、STEP42のResearch Event Bannerと
 * 同じ「独立した控えめな通知要素」パターン）へ安全に留めている。'nextLayer'
 * コールバックも同様に、実際のLayer進行トリガーとしては使わない（既存の
 * `nextStep`/`showRewardOverlay`が引き続き唯一の正本のまま）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class FeedbackManager {
    /**
     * @param {Object} deps @param {Object} deps.metaProgression Research Rank表示用（省略可）
     */
    constructor({ metaProgression } = {}) {
      this.metaProgression = metaProgression || null;
      this.el = {
        popup: document.getElementById('timelinePopup'),
        text: document.getElementById('timelinePopupText')
      };
      this._popupTimer = null;
      this._registerHandlers();
    }

    /** 画面側（endless.js）の唯一の呼び出し窓口。裏でAudioTimelineManagerへ委譲する */
    trigger(eventId, context) {
      if (G.AudioTimelineManager) G.AudioTimelineManager.play(eventId, context);
    }

    /** RUN終了等、cancelOnで指定されるイベント名をそのまま伝える */
    notify(eventName) {
      if (G.AudioTimelineManager) G.AudioTimelineManager.notifyEvent(eventName);
    }

    _registerHandlers() {
      const timeline = G.AudioTimelineManager;
      if (!timeline) return;
      timeline.registerHandler('clearPopup', () => this._showPopup('LAYER CLEAR'));
      timeline.registerHandler('rankDisplay', () => {
        const label = this.metaProgression ? this.metaProgression.getRankLabel() : '';
        this._showPopup(label || 'RESEARCH RANK');
      });
      timeline.registerHandler('memoryDialogue', () => this._showPopup('NEW MEMORY DATA')); // 実際の会話再生は既存storySteps側の責務のまま
      timeline.registerHandler('endingPopup', () => this._showPopup('ENDING SEQUENCE'));
      timeline.registerHandler('nextLayer', () => this._showPopup('RESEARCH CONTINUES')); // Layer進行トリガーとしては使わない(演出のみ)
    }

    _showPopup(text) {
      if (!this.el.popup) return;
      clearTimeout(this._popupTimer);
      if (this.el.text) this.el.text.textContent = text;
      this.el.popup.classList.remove('hidden');
      requestAnimationFrame(() => { if (this.el.popup) this.el.popup.classList.add('show'); });
      this._popupTimer = setTimeout(() => {
        if (!this.el.popup) return;
        this.el.popup.classList.remove('show');
        setTimeout(() => { if (this.el.popup) this.el.popup.classList.add('hidden'); }, 400);
      }, 1400);
    }

    hide() {
      clearTimeout(this._popupTimer);
      if (this.el.popup) { this.el.popup.classList.remove('show'); this.el.popup.classList.add('hidden'); }
    }
  }

  G.FeedbackManager = FeedbackManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
