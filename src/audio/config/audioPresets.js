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
    },

    // ---- Research Facility Interaction Pass: Audio Language（14カテゴリ専用音色）。
    // 既存'ui'プリセットを流用せず、カテゴリごとに波形/フィルタ/エンベロープを変えることで
    // 「押した瞬間に何が起きたか」を音色だけで区別できるようにする。UISynth.js自体は
    // 無変更（波形/フィルタまでpreset経由で完全に差し替え可能な既存設計をそのまま使う）。
    lang_navigation: {
      waveform: 'square', attack: 0.002, decay: 0.04, sustain: 0.0, release: 0.04,
      filterType: 'lowpass', filterFreq: 2600, filterQ: 0.6,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.07, pan: 0, reverbSend: 0.03, delaySend: 0
    },
    lang_selection: {
      waveform: 'square', attack: 0.002, decay: 0.05, sustain: 0.0, release: 0.05,
      filterType: 'lowpass', filterFreq: 3400, filterQ: 0.8,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.08, pan: 0, reverbSend: 0.04, delaySend: 0
    },
    lang_confirm: {
      waveform: 'triangle', attack: 0.003, decay: 0.09, sustain: 0.0, release: 0.09,
      filterType: 'lowpass', filterFreq: 3000, filterQ: 0.6,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.09, pan: 0, reverbSend: 0.08, delaySend: 0
    },
    lang_cancel: {
      waveform: 'square', attack: 0.002, decay: 0.06, sustain: 0.0, release: 0.05,
      filterType: 'lowpass', filterFreq: 1400, filterQ: 0.6,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.07, pan: 0, reverbSend: 0.05, delaySend: 0
    },
    lang_popup: {
      waveform: 'triangle', attack: 0.004, decay: 0.08, sustain: 0.0, release: 0.08,
      filterType: 'lowpass', filterFreq: 2200, filterQ: 0.7,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.07, pan: 0, reverbSend: 0.1, delaySend: 0.05
    },
    lang_discovery: {
      waveform: 'triangle', attack: 0.005, decay: 0.18, sustain: 0.0, release: 0.2,
      filterType: 'highpass', filterFreq: 500, filterQ: 0.5,
      lfoRate: 9, lfoDepth: 120, lfoTarget: 'filter', // 高速LFOでキラキラした揺らぎを表現
      gain: 0.1, pan: 0, reverbSend: 0.25, delaySend: 0.1
    },
    lang_protocol: {
      waveform: 'sawtooth', attack: 0.003, decay: 0.12, sustain: 0.0, release: 0.1,
      filterType: 'bandpass', filterFreq: 1200, filterQ: 2.2,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.08, pan: 0, reverbSend: 0.1, delaySend: 0.08
    },
    lang_story: {
      waveform: 'triangle', attack: 0.01, decay: 0.14, sustain: 0.1, release: 0.2,
      filterType: 'lowpass', filterFreq: 1800, filterQ: 0.7,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.07, pan: 0, reverbSend: 0.2, delaySend: 0.05
    },
    lang_memory: {
      waveform: 'sine', attack: 0.02, decay: 0.16, sustain: 0.1, release: 0.24,
      filterType: 'lowpass', filterFreq: 1600, filterQ: 0.5,
      lfoRate: 0.5, lfoDepth: 20, lfoTarget: 'filter',
      gain: 0.07, pan: 0, reverbSend: 0.3, delaySend: 0.1
    },
    lang_research: {
      waveform: 'triangle', attack: 0.006, decay: 0.2, sustain: 0.0, release: 0.2,
      filterType: 'highpass', filterFreq: 700, filterQ: 0.5,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.09, pan: 0, reverbSend: 0.15, delaySend: 0.1
    },
    lang_warning: {
      waveform: 'sawtooth', attack: 0.002, decay: 0.14, sustain: 0.0, release: 0.1,
      filterType: 'lowpass', filterFreq: 900, filterQ: 1.4,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.09, pan: 0, reverbSend: 0.05, delaySend: 0
    },
    lang_error: {
      waveform: 'sawtooth', attack: 0.002, decay: 0.22, sustain: 0.0, release: 0.15,
      filterType: 'lowpass', filterFreq: 500, filterQ: 1.8,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.1, pan: 0, reverbSend: 0.05, delaySend: 0
    },
    lang_environment: {
      waveform: 'sine', attack: 0.008, decay: 0.1, sustain: 0.0, release: 0.15,
      filterType: 'bandpass', filterFreq: 900, filterQ: 1.2,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.06, pan: 0, reverbSend: 0.2, delaySend: 0.15
    },
    lang_ending: {
      waveform: 'triangle', attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.4,
      filterType: 'lowpass', filterFreq: 2400, filterQ: 0.5,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.11, pan: 0, reverbSend: 0.3, delaySend: 0.15
    },

    // ---- Popup Feedback専用の6カテゴリ（Audio Languageの14種と同じ`lang_*`命名・
    // 同じplayCategorySfx()経路。Popup Feedbackの要求リスト12種のうちWarning/Error/
    // Discovery/Story/Memory/Protocolは上記14種を再利用し、ここではPopup特有の
    // 残り6種のみを追加する） ----
    lang_information: {
      waveform: 'sine', attack: 0.006, decay: 0.09, sustain: 0.0, release: 0.12,
      filterType: 'lowpass', filterFreq: 2000, filterQ: 0.5,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.06, pan: 0, reverbSend: 0.12, delaySend: 0.05
    },
    lang_success: {
      waveform: 'triangle', attack: 0.004, decay: 0.12, sustain: 0.05, release: 0.15,
      filterType: 'lowpass', filterFreq: 2800, filterQ: 0.6,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.09, pan: 0, reverbSend: 0.15, delaySend: 0.08
    },
    lang_achievement: {
      waveform: 'triangle', attack: 0.006, decay: 0.24, sustain: 0.15, release: 0.3,
      filterType: 'highpass', filterFreq: 400, filterQ: 0.4,
      lfoRate: 7, lfoDepth: 90, lfoTarget: 'filter',
      gain: 0.1, pan: 0, reverbSend: 0.28, delaySend: 0.12
    },
    lang_relationship: {
      waveform: 'sine', attack: 0.015, decay: 0.15, sustain: 0.1, release: 0.22,
      filterType: 'lowpass', filterFreq: 1500, filterQ: 0.5,
      lfoRate: 0.3, lfoDepth: 15, lfoTarget: 'filter',
      gain: 0.06, pan: 0, reverbSend: 0.25, delaySend: 0.08
    },
    lang_continue: {
      waveform: 'triangle', attack: 0.005, decay: 0.1, sustain: 0.0, release: 0.14,
      filterType: 'lowpass', filterFreq: 2200, filterQ: 0.6,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.08, pan: 0, reverbSend: 0.1, delaySend: 0.05
    },
    lang_layerClear: {
      waveform: 'triangle', attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.25,
      filterType: 'lowpass', filterFreq: 3000, filterQ: 0.6,
      lfoRate: 0, lfoDepth: 0, lfoTarget: null,
      gain: 0.1, pan: 0, reverbSend: 0.18, delaySend: 0.1
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
