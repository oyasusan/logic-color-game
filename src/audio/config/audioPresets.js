/**
 * audioPresets.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。音色（Synth Preset）の
 * データ定義。要求仕様どおり、各プリセットは波形/ADSR/Filter/LFO/Gain/Stereo/
 * Reverb/Delayを持つ。`synth/*.js`はこのデータを読むだけで、周波数・音量等の
 * リテラル値を直書きしない。
 *
 * ADSRは秒単位（attack/decay/release）とsustain(0〜1、ゲインの保持割合)。
 * lfoTargetは'gain'|'filter'|'pitch'のいずれか（未指定ならLFO無し）。
 * pan・reverbSend・delaySendはいずれも0〜1。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const PRESETS = {
    // ---- Music Layer用 ----
    drone: {
      waveform: 'sine', attack: 2.2, decay: 0.5, sustain: 0.85, release: 2.5,
      filterType: 'lowpass', filterFreq: 900, filterQ: 0.6,
      lfoRate: 0.06, lfoDepth: 40, lfoTarget: 'filter',
      gain: 0.16, pan: 0, reverbSend: 0.35, delaySend: 0.05
    },
    pad: {
      waveform: 'triangle', attack: 1.4, decay: 0.6, sustain: 0.7, release: 1.8,
      filterType: 'lowpass', filterFreq: 1400, filterQ: 0.8,
      lfoRate: 0.12, lfoDepth: 60, lfoTarget: 'filter',
      gain: 0.12, pan: -0.15, reverbSend: 0.4, delaySend: 0.1
    },
    pulse: {
      waveform: 'square', attack: 0.005, decay: 0.12, sustain: 0.0, release: 0.08,
      filterType: 'lowpass', filterFreq: 2000, filterQ: 1.2,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.09, pan: 0.15, reverbSend: 0.15, delaySend: 0.25
    },
    arpeggio: {
      waveform: 'triangle', attack: 0.01, decay: 0.25, sustain: 0.0, release: 0.3,
      filterType: 'lowpass', filterFreq: 2600, filterQ: 1,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.1, pan: 0.1, reverbSend: 0.3, delaySend: 0.3
    },
    texture: {
      waveform: 'noise', attack: 1.8, decay: 0.8, sustain: 0.5, release: 2.2,
      filterType: 'bandpass', filterFreq: 1600, filterQ: 2.5,
      lfoRate: 0.18, lfoDepth: 300, lfoTarget: 'filter',
      gain: 0.06, pan: 0, reverbSend: 0.45, delaySend: 0.15
    },
    ambient: {
      waveform: 'sine', attack: 3, decay: 0, sustain: 1, release: 3,
      filterType: 'lowpass', filterFreq: 400, filterQ: 0.4,
      lfoRate: 0.12, lfoDepth: 0.5, lfoTarget: 'gain',
      gain: 0.03, pan: 0, reverbSend: 0.2, delaySend: 0
    },

    // ---- UI Sound用（単一プリセット、SFXごとの周波数はaudioEvents.js/呼び出し側で指定） ----
    ui: {
      waveform: 'square', attack: 0.002, decay: 0.05, sustain: 0.0, release: 0.05,
      filterType: 'lowpass', filterFreq: 3200, filterQ: 0.7,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.1, pan: 0, reverbSend: 0.05, delaySend: 0
    },

    // ---- STEP43.6追加要件「Adaptive Scan Progress」用。非常に短く控えめなtick音 ----
    scanProgress: {
      freqStart: 420, freqEnd: 720, // 0%→100%でこの範囲を線形補間する（AudioManager.playScanTick()が使う）
      waveform: 'sine', attack: 0.001, decay: 0.02, sustain: 0.0, release: 0.02,
      filterType: 'highpass', filterFreq: 300, filterQ: 0.4,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.035, pan: 0, reverbSend: 0, delaySend: 0
    },

    // ---- STEP43.6追加要件「Dynamic Layer Mixing」用。Zone/Hidden Environment切替や
    // 緊張状態への突入を知らせる短いベル音（ArpeggioSynth.trigger()を流用して鳴らす） ----
    bell: {
      waveform: 'sine', attack: 0.004, decay: 0.6, sustain: 0.0, release: 0.9,
      filterType: 'highpass', filterFreq: 500, filterQ: 0.3,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.09, pan: 0, reverbSend: 0.4, delaySend: 0.2
    },

    // ---- Dialogue Sound用（キャラクター別） ----
    dialogueAria: {
      freq: 1100, waveform: 'triangle', attack: 0.002, decay: 0.02, sustain: 0.0, release: 0.02,
      filterType: 'highpass', filterFreq: 600, filterQ: 0.5,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.05, pan: 0, reverbSend: 0.2, delaySend: 0.05
    },
    dialogueDrLeon: {
      freq: 200, waveform: 'sine', attack: 0.004, decay: 0.03, sustain: 0.0, release: 0.03,
      filterType: 'lowpass', filterFreq: 900, filterQ: 0.6,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.055, pan: 0, reverbSend: 0.15, delaySend: 0
    },
    dialogueLostResearcher: {
      freq: 330, waveform: 'sawtooth', attack: 0.002, decay: 0.025, sustain: 0.0, release: 0.02,
      filterType: 'bandpass', filterFreq: 1100, filterQ: 3.5,
      lfoRate: 6, lfoDepth: 80, lfoTarget: 'filter', // 高速LFOでノイズ混じりの揺らぎを表現
      gain: 0.04, pan: 0, reverbSend: 0.1, delaySend: 0.02
    },
    dialogueSystem: {
      freq: 380, waveform: 'square', attack: 0.001, decay: 0.015, sustain: 0.0, release: 0.015,
      filterType: 'highpass', filterFreq: 1200, filterQ: 0.8,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.045, pan: 0, reverbSend: 0.05, delaySend: 0
    }
  };

  // ---- Environment Audio（要求仕様「Environment Audio」セクション6種、Theme別ON/OFFは
  // audioThemes.jsのenvironmentSoundsが持つ。いずれも極めて控えめな常時ループ音） ----
  const ENVIRONMENT_PRESETS = {
    facility_hum:    { waveform: 'sine', freq: 55, filterType: 'lowpass', filterFreq: 300, filterQ: 0.5, lfoRate: 0.08, lfoDepth: 0.3, gain: 0.02 },
    electric_noise:  { waveform: 'noise', freq: 0, filterType: 'highpass', filterFreq: 4000, filterQ: 1, lfoRate: 3.5, lfoDepth: 0.4, gain: 0.012 },
    server_pulse:    { waveform: 'square', freq: 90, filterType: 'lowpass', filterFreq: 500, filterQ: 1.2, lfoRate: 1.2, lfoDepth: 0.6, gain: 0.015 },
    air_vent:        { waveform: 'noise', freq: 0, filterType: 'bandpass', filterFreq: 700, filterQ: 0.8, lfoRate: 0.05, lfoDepth: 0.3, gain: 0.018 },
    digital_static:  { waveform: 'noise', freq: 0, filterType: 'highpass', filterFreq: 6000, filterQ: 0.6, lfoRate: 8, lfoDepth: 0.5, gain: 0.008 },
    unknown_noise:   { waveform: 'sawtooth', freq: 37, filterType: 'bandpass', filterFreq: 450, filterQ: 2.5, lfoRate: 0.15, lfoDepth: 0.7, gain: 0.014 }
  };

  function getById(id) {
    return PRESETS[id] || PRESETS.ui;
  }

  function getEnvironmentPreset(id) {
    return ENVIRONMENT_PRESETS[id] || null;
  }

  G.AudioPresets = { PRESETS, ENVIRONMENT_PRESETS, getById, getEnvironmentPreset };
})(typeof globalThis !== 'undefined' ? globalThis : this);
