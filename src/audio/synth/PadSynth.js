/**
 * PadSynth.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。コードが変わるたびに
 * ゆるやかにクロスフェードする和音パッド（Pad Layer）。DroneSynth.jsは音程を滑らかに
 * 「地続きで」変化させるのに対し、PadSynthはコードごとに新しい和音を「ふわっと」
 * 立ち上げては消す（Padらしい、コードの輪郭がはっきりした表現にするため意図的に
 * DroneSynthとは異なる遷移方式にした）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class PadSynth {
    constructor(ctx, output) {
      this.ctx = ctx;
      this.output = output;
      this._current = null; // {voices, filter, gain, lfo}|null
      this._active = false;
    }

    isActive() { return this._active; }

    /**
     * @param {number[]} freqs @param {Object} preset audioPresets.jsの'pad'エントリ
     * @param {number} densityMultiplier 0〜1
     */
    changeChord(freqs, preset, densityMultiplier) {
      const t0 = this.ctx.currentTime;
      const previous = this._current;

      const filter = this.ctx.createBiquadFilter();
      filter.type = preset.filterType;
      filter.frequency.setValueAtTime(preset.filterFreq, t0);
      filter.Q.setValueAtTime(preset.filterQ, t0);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      const targetGain = Math.max(0.0002, preset.gain * (densityMultiplier != null ? densityMultiplier : 1));
      gain.gain.exponentialRampToValueAtTime(targetGain, t0 + preset.attack);
      filter.connect(gain).connect(this.output);

      let lfo = null;
      if (preset.lfoTarget === 'filter' && preset.lfoRate > 0) {
        lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(preset.lfoRate, t0);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(preset.lfoDepth, t0);
        lfo.connect(lfoGain).connect(filter.frequency);
        lfo.start(t0);
      }

      const voices = freqs.map(freq => {
        const osc = this.ctx.createOscillator();
        osc.type = preset.waveform;
        osc.frequency.setValueAtTime(freq, t0);
        osc.connect(filter);
        osc.start(t0);
        return osc;
      });

      this._current = { voices, filter, gain, lfo, preset };
      this._active = true;

      if (previous) {
        previous.gain.gain.setTargetAtTime(0.0001, t0, previous.preset.release / 3);
        setTimeout(() => {
          previous.voices.forEach(osc => { try { osc.stop(); } catch (e) { /* 無視 */ } });
          if (previous.lfo) { try { previous.lfo.stop(); } catch (e) { /* 無視 */ } }
        }, (previous.preset.release + 0.4) * 1000);
      }
    }

    setDensity(densityMultiplier) {
      if (!this._current) return;
      const t0 = this.ctx.currentTime;
      const targetGain = Math.max(0.0002, this._current.preset.gain * densityMultiplier);
      this._current.gain.gain.setTargetAtTime(targetGain, t0, 0.4);
    }

    stop() {
      if (!this._current) { this._active = false; return; }
      const t0 = this.ctx.currentTime;
      const current = this._current;
      current.gain.gain.setTargetAtTime(0.0001, t0, current.preset.release / 3);
      setTimeout(() => {
        current.voices.forEach(osc => { try { osc.stop(); } catch (e) { /* 無視 */ } });
        if (current.lfo) { try { current.lfo.stop(); } catch (e) { /* 無視 */ } }
      }, (current.preset.release + 0.4) * 1000);
      this._current = null;
      this._active = false;
    }
  }

  G.PadSynth = PadSynth;
})(typeof globalThis !== 'undefined' ? globalThis : this);
