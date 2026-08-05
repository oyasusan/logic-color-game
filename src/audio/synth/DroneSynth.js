/**
 * DroneSynth.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。持続する低音の
 * 和音（Drone Layer）を生成する。AudioManager.jsが生成・保持し、AdaptiveMusicEngine.js
 * からのコード変化通知に応じて`retune()`で音程だけを滑らかに変更する（都度作り直さない、
 * ボイスリーク・クリック音を避けるための設計）。
 *
 * 全てのパラメータ（波形/ADSR/Filter/LFO/Gain）はaudioPresets.jsの'drone'プリセットから
 * のみ読み、このファイルへ周波数以外のリテラル値を直書きしない。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class DroneSynth {
    /** @param {AudioContext} ctx @param {AudioNode} output 接続先（AudioManager.js側のバス） */
    constructor(ctx, output) {
      this.ctx = ctx;
      this.output = output;
      this.voices = []; // Array<{osc, gain}> 現在鳴っているコードトーン
      this.filter = null;
      this.lfo = null;
      this.lfoGain = null;
      this.masterGain = null;
      this._active = false;
    }

    isActive() { return this._active; }

    /**
     * @param {number[]} freqs コードトーンの周波数配列（1〜4音想定）
     * @param {Object} preset audioPresets.jsの'drone'エントリ
     * @param {number} densityMultiplier 0〜1（Theme密度・イベント反応で変動）
     */
    start(freqs, preset, densityMultiplier) {
      this.stop(); // 念のため多重開始を防ぐ
      const t0 = this.ctx.currentTime;

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = preset.filterType;
      this.filter.frequency.setValueAtTime(preset.filterFreq, t0);
      this.filter.Q.setValueAtTime(preset.filterQ, t0);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, t0);
      const targetGain = Math.max(0.0002, preset.gain * (densityMultiplier != null ? densityMultiplier : 1));
      this.masterGain.gain.exponentialRampToValueAtTime(targetGain, t0 + preset.attack);

      this.filter.connect(this.masterGain).connect(this.output);

      if (preset.lfoTarget === 'filter' && preset.lfoRate > 0) {
        this.lfo = this.ctx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.setValueAtTime(preset.lfoRate, t0);
        this.lfoGain = this.ctx.createGain();
        this.lfoGain.gain.setValueAtTime(preset.lfoDepth, t0);
        this.lfo.connect(this.lfoGain).connect(this.filter.frequency);
        this.lfo.start(t0);
      }

      this.voices = freqs.map(freq => {
        const osc = this.ctx.createOscillator();
        osc.type = preset.waveform;
        osc.frequency.setValueAtTime(freq, t0);
        osc.connect(this.filter);
        osc.start(t0);
        return osc;
      });

      this._active = true;
      this._preset = preset;
    }

    /** コード変化時、作り直さずに音程だけを滑らかに変える（クリック音・ボイス増加を避ける） */
    retune(freqs, glideSec) {
      if (!this._active) return;
      const t0 = this.ctx.currentTime;
      const glide = glideSec != null ? glideSec : 1.5;
      this.voices.forEach((osc, i) => {
        if (freqs[i] != null) osc.frequency.setTargetAtTime(freqs[i], t0, glide / 3);
      });
    }

    /** @param {number} densityMultiplier 0〜1 */
    setDensity(densityMultiplier) {
      if (!this._active || !this.masterGain || !this._preset) return;
      const t0 = this.ctx.currentTime;
      const targetGain = Math.max(0.0002, this._preset.gain * densityMultiplier);
      this.masterGain.gain.setTargetAtTime(targetGain, t0, 0.4);
    }

    stop() {
      if (!this._active) return;
      const t0 = this.ctx.currentTime;
      const release = this._preset ? this._preset.release : 1;
      const voices = this.voices;
      const lfo = this.lfo;
      if (this.masterGain) this.masterGain.gain.setTargetAtTime(0.0001, t0, release / 3);
      setTimeout(() => {
        voices.forEach(osc => { try { osc.stop(); } catch (e) { /* 既に停止済みでも無視 */ } });
        if (lfo) { try { lfo.stop(); } catch (e) { /* 無視 */ } }
      }, (release + 0.4) * 1000);
      this.voices = [];
      this.lfo = null;
      this._active = false;
    }
  }

  G.DroneSynth = DroneSynth;
})(typeof globalThis !== 'undefined' ? globalThis : this);
