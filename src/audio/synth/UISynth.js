/**
 * UISynth.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。UI Sound（9種、
 * audioEvents.jsのUI_SFX）とDialogue Text Sound（4キャラクター分、audioPresets.jsの
 * dialogueAria/dialogueDrLeon/dialogueLostResearcher/dialogueSystem）の両方が使う
 * 汎用的な単発トーン再生エンジン。両者とも「短いトーンを1つ鳴らす」という点で
 * 構造が同一のため、要求仕様のディレクトリ構成（UISynth.jsのみでDialogue用の
 * 別ファイルは指定されていない）どおり1ファイルへ統合した。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class UISynth {
    constructor(ctx, output) {
      this.ctx = ctx;
      this.output = output;
    }

    /**
     * @param {number} freq @param {Object} preset audioPresets.jsの'ui'または
     *   'dialogue*'エントリ @param {number} [time] @param {number} [gainMultiplier=1]
     */
    trigger(freq, preset, time, gainMultiplier) {
      const t0 = time != null ? time : this.ctx.currentTime;
      const mult = gainMultiplier != null ? gainMultiplier : 1;

      const filter = this.ctx.createBiquadFilter();
      filter.type = preset.filterType;
      filter.frequency.setValueAtTime(preset.filterFreq, t0);
      filter.Q.setValueAtTime(preset.filterQ, t0);

      const gain = this.ctx.createGain();
      const peak = Math.max(0.0002, preset.gain * mult);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + Math.max(0.002, preset.attack));
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + preset.attack + preset.decay + preset.release);

      const osc = this.ctx.createOscillator();
      osc.type = preset.waveform;
      osc.frequency.setValueAtTime(freq, t0);
      osc.connect(filter).connect(gain).connect(this.output);

      const stopTime = t0 + preset.attack + preset.decay + preset.release + 0.05;
      let lfo = null;
      if (preset.lfoTarget === 'filter' && preset.lfoRate > 0) {
        lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(preset.lfoRate, t0);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(preset.lfoDepth, t0);
        lfo.connect(lfoGain).connect(filter.frequency);
        lfo.start(t0);
        lfo.stop(stopTime);
      }

      osc.start(t0);
      osc.stop(stopTime);
    }
  }

  G.UISynth = UISynth;
})(typeof globalThis !== 'undefined' ? globalThis : this);
