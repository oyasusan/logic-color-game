/**
 * PulseSynth.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。リズミカルな短い
 * トーン（Pulse Layer、Layer10以降で有効）を1音ずつ鳴らす。ノートは自己完結（発音後、
 * 自身のreleaseが終わったら自動的にノードを破棄する）で、持続状態を持たない
 * （PadSynth/DroneSynth等の常時発音レイヤーとは異なる設計、AdaptiveMusicEngine.jsの
 * スケジューラが刻むタイミングごとに`trigger()`を呼ぶだけでよい）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class PulseSynth {
    constructor(ctx, output) {
      this.ctx = ctx;
      this.output = output;
    }

    /**
     * @param {number} freq @param {Object} preset audioPresets.jsの'pulse'エントリ
     * @param {number} time 発音開始時刻(ctx.currentTime基準の絶対時刻)
     * @param {number} densityMultiplier 0〜1
     */
    trigger(freq, preset, time, densityMultiplier) {
      const t0 = time != null ? time : this.ctx.currentTime;

      const filter = this.ctx.createBiquadFilter();
      filter.type = preset.filterType;
      filter.frequency.setValueAtTime(preset.filterFreq, t0);
      filter.Q.setValueAtTime(preset.filterQ, t0);

      const gain = this.ctx.createGain();
      const peak = Math.max(0.0002, preset.gain * (densityMultiplier != null ? densityMultiplier : 1));
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + Math.max(0.002, preset.attack));
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + preset.attack + preset.decay + preset.release);

      const osc = this.ctx.createOscillator();
      osc.type = preset.waveform;
      osc.frequency.setValueAtTime(freq, t0);
      osc.connect(filter).connect(gain).connect(this.output);

      const stopTime = t0 + preset.attack + preset.decay + preset.release + 0.05;
      osc.start(t0);
      osc.stop(stopTime); // 自己完結: ブラウザ側が自動的にノードを解放する（明示的なdisconnect不要）
    }
  }

  G.PulseSynth = PulseSynth;
})(typeof globalThis !== 'undefined' ? globalThis : this);
