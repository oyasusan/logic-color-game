/**
 * AudioDebugPanel.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。既存の`debug.js`
 * （`?debug=true`時のみ有効、通常プレイには一切影響しない）と同じ方針の
 * Audio専用デバッグパネル。表示内容は要求仕様どおりTheme/Scale/Chord/Pattern/
 * Tempo/Voice数/CPU負荷/Active Layer/Music Seed。
 *
 * 表示更新は4回/秒に間引き、`_tick()`の処理時間（AdaptiveMusicEngine.js側で
 * `performance.now()`により自己計測）を「CPU負荷」の目安として表示する
 * （ブラウザ全体のCPU使用率そのものはJSから直接取得できないため、スケジューラ自身の
 * 処理時間を軽量なプロキシ指標として採用した設計判断）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const UPDATE_INTERVAL_MS = 250;

  function isEnabled() {
    try {
      return new URLSearchParams(global.location.search).get('debug') === 'true';
    } catch (e) {
      return false;
    }
  }

  class AudioDebugPanel {
    constructor() {
      this.enabled = isEnabled();
      this.engine = null;
      this.el = null;
      this._timer = null;
      this._presentation = null; // Research Facility Interaction Pass: bindPresentation()参照
      this._fps = 0;
      this._fpsFrameCount = 0;
      this._fpsWindowStart = 0;
      if (this.enabled) {
        this._build();
        this._startFpsSampling(); // デバッグパネル表示時のみの専用rAFループ（通常プレイには一切追加しない）
      }
    }

    _build() {
      const panel = document.createElement('div');
      panel.id = 'audioDebugPanel';
      panel.innerHTML = `
        <div class="debug-row"><span class="debug-key">THEME</span><span id="adbgTheme">-</span></div>
        <div class="debug-row"><span class="debug-key">SCALE</span><span id="adbgScale">-</span></div>
        <div class="debug-row"><span class="debug-key">CHORD</span><span id="adbgChord">-</span></div>
        <div class="debug-row"><span class="debug-key">PATTERN</span><span id="adbgPattern">-</span></div>
        <div class="debug-row"><span class="debug-key">TEMPO</span><span id="adbgTempo">-</span></div>
        <div class="debug-row"><span class="debug-key">VOICES</span><span id="adbgVoices">-</span></div>
        <div class="debug-row"><span class="debug-key">CPU(tick)</span><span id="adbgCpu">-</span></div>
        <div class="debug-row"><span class="debug-key">LAYERS</span><span id="adbgLayers">-</span></div>
        <div class="debug-row"><span class="debug-key">SEED</span><span id="adbgSeed">-</span></div>
        <div class="debug-divider">TIMELINE</div>
        <div class="debug-row"><span class="debug-key">ACTIVE</span><span id="adbgTimelineActive">-</span></div>
        <div class="debug-row"><span class="debug-key">STATE</span><span id="adbgTimelineState">-</span></div>
        <div class="debug-row"><span class="debug-key">PRIORITY</span><span id="adbgTimelinePriority">-</span></div>
        <div class="debug-row"><span class="debug-key">REMAINING</span><span id="adbgTimelineRemaining">-</span></div>
        <div class="debug-row"><span class="debug-key">QUEUE</span><span id="adbgTimelineQueue">-</span></div>
        <div class="debug-divider">PRESENTATION</div>
        <div class="debug-row"><span class="debug-key">ZONE THEME</span><span id="adbgZoneTheme">-</span></div>
        <div class="debug-row"><span class="debug-key">QUALITY</span><span id="adbgPresentationQuality">-</span></div>
        <div class="debug-row"><span class="debug-key">ANIM</span><span id="adbgAnimCount">-</span></div>
        <div class="debug-row"><span class="debug-key">FPS</span><span id="adbgFps">-</span></div>
      `;
      document.body.appendChild(panel);
      this.el = panel;
    }

    /** endless.js等がAdaptiveMusicEngineインスタンス生成後に1度だけ呼ぶ */
    bind(engine) {
      if (!this.enabled) return;
      this.engine = engine;
      clearInterval(this._timer);
      this._timer = setInterval(() => this._render(), UPDATE_INTERVAL_MS);
      this._render();
    }

    /**
     * 「Research Facility Interaction Pass」Debug拡張。endless.js/main.jsが
     * InteractionFeedback/EnvironmentRenderer生成後に1度だけ呼ぶ（省略可、呼ばれなければ
     * PRESENTATIONセクションは"-"のまま）。
     * @param {{getZoneThemeName?:Function, getPresentationQuality?:Function, getAnimationCount?:Function}} deps
     */
    bindPresentation(deps) {
      this._presentation = deps || null;
    }

    /** @private ?debug=true時のみ動く専用rAFループ。FPS計測だけを目的とし、他の描画には一切関与しない */
    _startFpsSampling() {
      const sample = now => {
        this._fpsFrameCount++;
        if (now - this._fpsWindowStart >= 500) {
          this._fps = Math.round((this._fpsFrameCount * 1000) / (now - this._fpsWindowStart));
          this._fpsFrameCount = 0;
          this._fpsWindowStart = now;
        }
        this._fpsRafHandle = global.requestAnimationFrame(sample);
      };
      this._fpsRafHandle = global.requestAnimationFrame(sample);
    }

    _render() {
      if (!this.enabled || !this.el || !this.engine) return;
      const snap = this.engine.state.getSnapshot();
      const q = id => this.el.querySelector(`#${id}`);
      q('adbgTheme').textContent = snap.themeId;
      q('adbgScale').textContent = snap.scaleId;
      q('adbgChord').textContent = `${snap.chordIndex + 1}/${snap.chordTotal || 0}${snap.unknownMode ? ' (seeded)' : ''}`;
      q('adbgPattern').textContent = Object.entries(snap.activePatterns).map(([k, v]) => `${k}:${v}`).join(' ') || '-';
      q('adbgTempo').textContent = `${snap.tempoBpm} BPM`;
      q('adbgVoices').textContent = String(snap.voiceCount);
      q('adbgCpu').textContent = `${(this.engine._lastTickDurationMs || 0).toFixed(2)}ms`;
      q('adbgLayers').textContent = snap.activeLayers.join(',') || '-';
      q('adbgSeed').textContent = String(snap.musicSeed);

      // STEP43.6追加要件「Timeline Debug」。現在Timeline/残り時間(残りステップ数で代替)/
      // Queue/Priority/Stateを表示する
      if (G.AudioTimelineManager) {
        const timelineSnap = G.AudioTimelineManager.getSnapshot();
        const current = timelineSnap.active[0] || null;
        q('adbgTimelineActive').textContent = current ? current.id : '-';
        q('adbgTimelineState').textContent = current ? current.state : '-';
        q('adbgTimelinePriority').textContent = current ? current.priority : '-';
        q('adbgTimelineRemaining').textContent = current ? `${current.remainingSteps} steps` : '-';
        q('adbgTimelineQueue').textContent = timelineSnap.queue.length ? timelineSnap.queue.join(',') : '-';
      }

      // Research Facility Interaction Pass: PRESENTATION section
      if (this._presentation) {
        const p = this._presentation;
        q('adbgZoneTheme').textContent = p.getZoneThemeName ? (p.getZoneThemeName() || '-') : '-';
        q('adbgPresentationQuality').textContent = p.getPresentationQuality ? (p.getPresentationQuality() || '-').toUpperCase() : '-';
        q('adbgAnimCount').textContent = p.getAnimationCount ? String(p.getAnimationCount()) : '-';
      }
      q('adbgFps').textContent = String(this._fps);
    }
  }

  G.AudioDebugPanel = new AudioDebugPanel();
})(typeof globalThis !== 'undefined' ? globalThis : this);
