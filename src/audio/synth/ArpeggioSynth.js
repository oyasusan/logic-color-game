/**
 * ArpeggioSynth.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。audioPatterns.jsが
 * 決めた順序で単音を1つずつ鳴らすアルペジオレイヤー（Layer15以降で有効）。PulseSynth.js
 * と同様、ノートは自己完結で持続状態を持たない。PulseSynthとの違いは音色（プリセット）と
 * 呼び出し元（AdaptiveMusicEngine.jsのパターン解決結果）のみで、実装構造はほぼ共通だが、
 * 「異なる楽器として明示的に分離する」という要求仕様のディレクトリ構成に従い別ファイルにした。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class ArpeggioSynth {
    constructor(ctx, output) {
      this.ctx = ctx;
      this.output = output;
    }

    /**
     * @param {number} freq @param {Object} preset audioPresets.jsの'arpeggio'エントリ
     * @param {number} time @param {number} densityMultiplier 0〜1
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
      osc.stop(stopTime);
    }
  }

  G.ArpeggioSynth = ArpeggioSynth;
})(typeof globalThis !== 'undefined' ? globalThis : this);
