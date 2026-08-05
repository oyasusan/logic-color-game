/**
 * TextureSynth.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。フィルタリングした
 * ノイズによる質感（Texture Layer、Layer21以降・Memory Distortion等で使用）を
 * 生成する。ノイズソースはCPU負荷を抑えるため、AudioManager.js側で1度だけ生成した
 * 共有バッファ（`noiseBuffer`）をループ再生する（呼び出しのたびに新規生成しない）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class TextureSynth {
    /** @param {AudioContext} ctx @param {AudioNode} output @param {AudioBuffer} noiseBuffer AudioManager.js共有 */
    constructor(ctx, output, noiseBuffer) {
      this.ctx = ctx;
      this.output = output;
      this.noiseBuffer = noiseBuffer;
      this.source = null;
      this.filter = null;
      this.gain = null;
      this.lfo = null;
      this._active = false;
      this._preset = null;
    }

    isActive() { return this._active; }

    /** @param {Object} preset audioPresets.jsの'texture'エントリ @param {number} densityMultiplier 0〜1 */
    start(preset, densityMultiplier) {
      this.stop();
      if (!this.noiseBuffer) return;
      const t0 = this.ctx.currentTime;

      this.source = this.ctx.createBufferSource();
      this.source.buffer = this.noiseBuffer;
      this.source.loop = true;

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = preset.filterType;
      this.filter.frequency.setValueAtTime(preset.filterFreq, t0);
      this.filter.Q.setValueAtTime(preset.filterQ, t0);

      this.gain = this.ctx.createGain();
      this.gain.gain.setValueAtTime(0.0001, t0);
      const targetGain = Math.max(0.0002, preset.gain * (densityMultiplier != null ? densityMultiplier : 1));
      this.gain.gain.exponentialRampToValueAtTime(targetGain, t0 + preset.attack);

      this.source.connect(this.filter).connect(this.gain).connect(this.output);

      if (preset.lfoTarget === 'filter' && preset.lfoRate > 0) {
        this.lfo = this.ctx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.setValueAtTime(preset.lfoRate, t0);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(preset.lfoDepth, t0);
        this.lfo.connect(lfoGain).connect(this.filter.frequency);
        this.lfo.start(t0);
      }

      this.source.start(t0);
      this._active = true;
      this._preset = preset;
    }

    setDensity(densityMultiplier) {
      if (!this._active || !this.gain || !this._preset) return;
      const t0 = this.ctx.currentTime;
      const targetGain = Math.max(0.0002, this._preset.gain * densityMultiplier);
      this.gain.gain.setTargetAtTime(targetGain, t0, 0.4);
    }

    stop() {
      if (!this._active) return;
      const t0 = this.ctx.currentTime;
      const release = this._preset ? this._preset.release : 1;
      const source = this.source;
      const lfo = this.lfo;
      if (this.gain) this.gain.gain.setTargetAtTime(0.0001, t0, release / 3);
      setTimeout(() => {
        try { source.stop(); } catch (e) { /* 無視 */ }
        if (lfo) { try { lfo.stop(); } catch (e) { /* 無視 */ } }
      }, (release + 0.4) * 1000);
      this.source = null;
      this.lfo = null;
      this._active = false;
    }
  }

  G.TextureSynth = TextureSynth;
})(typeof globalThis !== 'undefined' ? globalThis : this);
