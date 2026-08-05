/**
 * AudioTimelineManager.js
 * STEP43.6追加要件「Audio Timeline System」。複数の演出（SE/Music/Animation/Popup/
 * Dialogue/Camera）を時間軸で束ねて再生するTimelineエンジン。
 *
 * 【設計方針】要求仕様「Feedback連携」どおり、Timelineは`FeedbackManager`（本体は
 * `src/endless/feedbackManager.js`）からのみ起動される想定で、画面側（ui.js/endless.js）が
 * このクラスを直接操作することは無い。Popup/Dialogue/Animation/Cameraの実際の中身は
 * このファイルには一切知識を持たせず、`registerHandler(name, fn)`で外から登録された
 * 関数を呼ぶだけに徹する（`src/audio/`配下がui.js等の描画コードへ依存しないようにする
 * ための境界）。
 *
 * 【Priority連携】要求仕様どおり「PriorityAudioManager」と連携する設計だが、実際に
 * 分離が必要なほどの複雑さ（優先度に基づく音量調整・再生中Timelineの管理）は本クラス
 * 自身の責務と重複するため、独立ファイルには分離せず本クラス内へ統合した
 * （優先度比較・pause/duck/cancelの判定はいずれも「今どのTimelineが再生中か」という
 * 本クラスの内部状態を直接必要とするため）。
 *
 * 【スケジューリング方式】AdaptiveMusicEngine.js（Web Audioのタイムライン精度が必要な
 * 音楽データ）とは異なり、TimelineのステップはPopup表示やDialogue開始等、メインスレッド上の
 * DOM操作を伴うため、`setTimeout`ベースのスケジューリングを採用している（Pause/Resumeで
 * 経過時間を計算し直し、残りステップを再スケジュールする）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { AudioTimelines, AudioEvents } = G;

  class AudioTimelineManager {
    constructor() {
      this._handlers = {};     // { [name]: (context, step) => {} } popup/dialogue/animation/camera/callback用
      this._active = new Map();  // id -> instance
      this._queue = [];          // Array<{id, context}> Priorityに阻まれて待機中のTimeline
      this._musicEngine = null;  // AdaptiveMusicEngineインスタンス（musicReactionステップ用）
    }

    /** endless.js側がAdaptiveMusicEngineインスタンス生成後に1度だけ呼ぶ */
    setMusicEngine(engine) { this._musicEngine = engine; }

    /** @param {string} name 'clearPopup'等、audioTimelines.jsのstep.handlerと対応するid @param {Function} fn */
    registerHandler(name, fn) { this._handlers[name] = fn; }

    /** @private id→Timeline定義を解決する。audioTimelines.js未定義でもaudioEvents.jsのGAME_EVENTSから1ステップ分を自動合成する */
    _resolveDef(id) {
      const explicit = AudioTimelines.getById(id);
      if (explicit) return explicit;
      const gameEvent = AudioEvents.GAME_EVENTS[id];
      if (!gameEvent) return null;
      const steps = [];
      if (gameEvent.sfx) steps.push({ at: 0, type: 'sfx', sfxId: gameEvent.sfx });
      if (gameEvent.musicReaction && gameEvent.musicReaction.type !== 'none') {
        steps.push({ at: 0, type: 'musicReaction', reaction: gameEvent.musicReaction });
      }
      return { priority: 'low', onLowerPriority: 'duck', cancelOn: [], steps };
    }

    /**
     * @param {string} timelineId audioTimelines.jsまたはaudioEvents.js(GAME_EVENTS)のid
     * @param {Object} [context] handler呼び出し時に渡す任意のデータ
     * @returns {boolean} 即座に再生開始できればtrue、Priorityに阻まれQueueされた場合false
     */
    play(timelineId, context) {
      const def = this._resolveDef(timelineId);
      if (!def || def.steps.length === 0) return false;
      const rank = G.AudioTimelines.PRIORITY_RANK[def.priority] != null ? G.AudioTimelines.PRIORITY_RANK[def.priority] : 1;

      // 同じidが既に再生中の場合、ここで無条件にインスタンスを上書きすると旧インスタンスの
      // タイマーが孤立してリーク・多重発火の原因になるため、Queueして完了後に鳴らす
      if (this._active.has(timelineId)) {
        this._queue.push({ timelineId, context });
        return false;
      }

      // 自分より優先度の高いTimelineが再生中なら、割り込まずQueueする
      const blocking = Array.from(this._active.values()).find(inst => this._rankOf(inst) > rank);
      if (blocking) {
        this._queue.push({ timelineId, context });
        return false;
      }

      // 自分より優先度の低いTimelineは、このTimeline自身のonLowerPriorityに従って処理する
      Array.from(this._active.entries()).forEach(([id, inst]) => {
        if (this._rankOf(inst) < rank) this._demote(id, inst, def.onLowerPriority || 'cancel');
      });

      this._start(timelineId, def, context);
      return true;
    }

    _rankOf(inst) {
      return G.AudioTimelines.PRIORITY_RANK[inst.def.priority] != null ? G.AudioTimelines.PRIORITY_RANK[inst.def.priority] : 1;
    }

    _demote(id, inst, policy) {
      if (policy === 'cancel') this.cancel(id);
      else if (policy === 'pause') this.pause(id);
      // 'duck'は「他Timelineのスケジュール自体には触れない」という設計（ファイル冒頭コメント参照）。
      // 実際の音量ダッキングは新しいTimeline自身のmusicDuckステップがバス単位で行う
    }

    _start(id, def, context) {
      const startedAt = Date.now();
      const instance = {
        id, def, context: context || {},
        startedAt, pausedAt: null, elapsedBeforePause: 0,
        timers: [], state: 'playing',
        remainingSteps: def.steps.slice()
      };
      this._active.set(id, instance);
      this._scheduleSteps(instance, def.steps, 0);
    }

    /** @private stepsをoffsetMs（一時停止から再開する場合の経過時間）を差し引いた上で予約する */
    _scheduleSteps(instance, steps, offsetMs) {
      steps.forEach(step => {
        const delayMs = Math.max(0, (step.at + (step.delay || 0)) * 1000 - offsetMs);
        const timer = setTimeout(() => {
          this._executeStep(instance, step);
          instance.remainingSteps = instance.remainingSteps.filter(s => s !== step);
          if (instance.remainingSteps.length === 0) this._finish(instance.id);
        }, delayMs);
        instance.timers.push({ timer, step });
      });
    }

    _executeStep(instance, step) {
      const audioManager = G.AudioManager;
      switch (step.type) {
        case 'sfx':
          if (audioManager) audioManager.playUiSfx(step.sfxId);
          break;
        case 'bell':
          if (audioManager) audioManager.playBell();
          break;
        case 'musicReaction':
          if (this._musicEngine) this._musicEngine.applyMusicReaction(step.reaction);
          break;
        case 'musicDuck':
          if (audioManager) audioManager.duckBusVolume(step.bus, step.target, step.duration, step.ease);
          break;
        case 'musicRestore':
          if (audioManager) audioManager.restoreBusVolume(step.bus, step.duration, step.ease);
          break;
        case 'cancelOthers':
          Array.from(this._active.keys()).forEach(id => { if (id !== instance.id) this.cancel(id); });
          this._queue = [];
          break;
        case 'popup':
        case 'dialogue':
        case 'animation':
        case 'camera':
        case 'callback': {
          const fn = this._handlers[step.handler];
          if (fn) fn(instance.context, step);
          break;
        }
        default:
          break;
      }
    }

    _finish(id) {
      const inst = this._active.get(id);
      if (!inst) return;
      this._active.delete(id);
      this._resumePausedDemotees();
      this._playNextQueued();
    }

    /** ---------------- 再生制御（要求仕様「Timeline制御」） ---------------- */

    pause(id) {
      const inst = this._active.get(id);
      if (!inst || inst.state !== 'playing') return;
      inst.pausedAt = Date.now();
      inst.elapsedBeforePause += inst.pausedAt - inst.startedAt;
      inst.timers.forEach(t => clearTimeout(t.timer));
      inst.timers = [];
      inst.state = 'paused';
    }

    resume(id) {
      const inst = this._active.get(id);
      if (!inst || inst.state !== 'paused') return;
      inst.startedAt = Date.now();
      inst.state = 'playing';
      this._scheduleSteps(inst, inst.remainingSteps, inst.elapsedBeforePause);
    }

    cancel(id) {
      const inst = this._active.get(id);
      if (!inst) return;
      inst.timers.forEach(t => clearTimeout(t.timer));
      this._active.delete(id);
      this._queue = this._queue.filter(q => q.timelineId !== id);
    }

    /** 残りのステップのうち、ゲーム進行に関わるcallback系だけは即座に実行してから終了する */
    skip(id) {
      const inst = this._active.get(id);
      if (!inst) return;
      inst.timers.forEach(t => clearTimeout(t.timer));
      const pendingCallbacks = inst.remainingSteps.filter(s => s.type === 'callback');
      pendingCallbacks.forEach(step => this._executeStep(inst, step));
      this._active.delete(id);
      this._resumePausedDemotees();
      this._playNextQueued();
    }

    /** @param {string} eventName 例:'runEnd'。cancelOnにこのeventNameを含むTimelineを中断する */
    notifyEvent(eventName) {
      Array.from(this._active.entries()).forEach(([id, inst]) => {
        if (inst.def.cancelOn && inst.def.cancelOn.indexOf(eventName) !== -1) this.cancel(id);
      });
      this._queue = this._queue.filter(q => {
        const def = this._resolveDef(q.timelineId);
        return !(def && def.cancelOn && def.cancelOn.indexOf(eventName) !== -1);
      });
    }

    _resumePausedDemotees() {
      Array.from(this._active.entries()).forEach(([id, inst]) => {
        if (inst.state === 'paused') this.resume(id);
      });
    }

    _playNextQueued() {
      if (this._queue.length === 0) return;
      const next = this._queue.shift();
      this.play(next.timelineId, next.context);
    }

    /** ---------------- Debug（要求仕様「Timeline Debug」） ---------------- */

    /** @returns {Object} AudioDebugPanel.js表示用のスナップショット */
    getSnapshot() {
      const activeList = Array.from(this._active.values()).map(inst => ({
        id: inst.id,
        priority: inst.def.priority,
        state: inst.state,
        remainingSteps: inst.remainingSteps.length
      }));
      return {
        active: activeList,
        queueLength: this._queue.length,
        queue: this._queue.map(q => q.timelineId)
      };
    }
  }

  G.AudioTimelineManager = new AudioTimelineManager();
})(typeof globalThis !== 'undefined' ? globalThis : this);
