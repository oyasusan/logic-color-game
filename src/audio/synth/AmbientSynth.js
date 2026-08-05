/**
 * AmbientSynth.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。Research Console
 * Ambient（要求仕様セクション5、控えめな環境音・ON/OFF可能）を担当する。単一の
 * 低音サイン波にLFOでゲインをゆっくり揺らし、「施設の呼吸」のような質感を出す
 * （STEP43.5のResearch Console Ambient実装を、データ駆動プリセット経由に移行したもの）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class AmbientSynth {
    constructor(ctx, output) {
      this.ctx = ctx;
      this.output = output;
      this.osc = null;
      this.gain = null;
      this.lfo = null;
      this.lfoGain = null;
      this._active = false;
      this._preset = null;
    }

    isActive() { return this._active; }

    /** @param {number} freq @param {Object} preset audioPresets.jsの'ambient'エントリ */
    start(freq, preset) {
      if (this._active) return; // 既に鳴っている場合は多重起動しない
      const t0 = this.ctx.currentTime;

      this.osc = this.ctx.createOscillator();
      this.osc.type = preset.waveform;
      this.osc.frequency.setValueAtTime(freq, t0);

      this.gain = this.ctx.createGain();
      this.gain.gain.setValueAtTime(0.0001, t0);

      if (preset.lfoTarget === 'gain' && preset.lfoRate > 0) {
        this.lfo = this.ctx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.setValueAtTime(preset.lfoRate, t0);
        this.lfoGain = this.ctx.createGain();
        this.lfoGain.gain.setValueAtTime(preset.gain * preset.lfoDepth * 0.5, t0);
        this.lfo.connect(this.lfoGain).connect(this.gain.gain);
        this.lfo.start(t0);
      }

      this.osc.connect(this.gain).connect(this.output);
      this.gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, preset.gain), t0 + preset.attack);
      this.osc.start(t0);

      this._active = true;
      this._preset = preset;
    }

    stop() {
      if (!this._active) return;
      const t0 = this.ctx.currentTime;
      const release = this._preset ? this._preset.release : 1;
      const osc = this.osc;
      const lfo = this.lfo;
      if (this.gain) this.gain.gain.setTargetAtTime(0.0001, t0, release / 3);
      setTimeout(() => {
        try { osc.stop(); } catch (e) { /* 無視 */ }
        if (lfo) { try { lfo.stop(); } catch (e) { /* 無視 */ } }
      }, (release + 0.4) * 1000);
      this.osc = null;
      this.lfo = null;
      this._active = false;
    }
  }

  G.AmbientSynth = AmbientSynth;
})(typeof globalThis !== 'undefined' ? globalThis : this);
