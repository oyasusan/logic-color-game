/**
 * audioThemes.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。Theme（Layer Phase）
 * ごとの音楽設定。要求仕様セクション「Theme Data」どおり、各Themeはテンポ・スケール・
 * コード進行・有効Layer・各Layer密度・ランダム性・フィルター設定・リバーブ量を持つ。
 *
 * Themeのid・Layer範囲は既存のNeural Evolution System（STEP41-3、themeManager.js）の
 * Phase（basic/network/distortion/genesis/unknown）とそのまま一致させている
 * （AudioThemeManager.js側でthemeManager.jsのPhase判定関数を呼ぶだけで、Layer範囲の
 * 定義自体は本ファイルには持たせず二重管理を避ける）。
 *
 * 【STEP43.6追加要件で変更】Environment Audio（環境音ループ）はこのファイルの
 * 責務ではなくなった。「EnvironmentごとにAudio Themeを持つ」という追加要件により、
 * WorldEnvironment（5Layerごとに巡回する「今いるゾーン」）単位のより細かい粒度へ
 * 移管したため（audioEnvironmentThemes.js参照）。このファイルはBGM本体
 * （テンポ・スケール・コード進行・Music Layer密度）のみを担当する。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const THEMES = {
    basic: {
      id: 'basic', name: 'Basic Research Lab',
      tempoBpm: 60, scaleId: 'd_dorian', chordSetId: 'research',
      density: { drone: 0.6, pad: 0.3, pulse: 0.2, arpeggio: 0.2, texture: 0.1, ambient: 0.5 },
      randomness: 0.08,
      filter: { type: 'lowpass', frequency: 1200, q: 0.7 },
      reverbAmount: 0.25, delayAmount: 0.08
    },
    network: {
      id: 'network', name: 'Neural Network',
      tempoBpm: 76, scaleId: 'e_dorian', chordSetId: 'neural',
      density: { drone: 0.5, pad: 0.45, pulse: 0.4, arpeggio: 0.35, texture: 0.15, ambient: 0.4 },
      randomness: 0.2,
      filter: { type: 'lowpass', frequency: 1800, q: 0.9 },
      reverbAmount: 0.3, delayAmount: 0.14
    },
    distortion: {
      id: 'distortion', name: 'Memory Distortion',
      tempoBpm: 68, scaleId: 'phrygian', chordSetId: 'distortion',
      density: { drone: 0.55, pad: 0.35, pulse: 0.3, arpeggio: 0.3, texture: 0.5, ambient: 0.35 },
      randomness: 0.45,
      filter: { type: 'bandpass', frequency: 900, q: 3.2 },
      reverbAmount: 0.4, delayAmount: 0.22
    },
    genesis: {
      id: 'genesis', name: 'Genesis Core',
      tempoBpm: 84, scaleId: 'lydian', chordSetId: 'genesis',
      density: { drone: 0.65, pad: 0.55, pulse: 0.45, arpeggio: 0.4, texture: 0.3, ambient: 0.45 },
      randomness: 0.15,
      filter: { type: 'lowpass', frequency: 2400, q: 0.8 },
      reverbAmount: 0.45, delayAmount: 0.16
    },
    unknown: {
      id: 'unknown', name: 'Unknown Layer',
      tempoBpm: 72, scaleId: 'minor_pentatonic', chordSetId: null, // Seedから生成（audioChords.generateUnknownProgression）
      density: { drone: 0.5, pad: 0.3, pulse: 0.35, arpeggio: 0.3, texture: 0.55, ambient: 0.3 },
      randomness: 0.7,
      filter: { type: 'bandpass', frequency: 700, q: 4 },
      reverbAmount: 0.5, delayAmount: 0.3
    }
  };

  function getById(id) {
    return THEMES[id] || THEMES.basic;
  }

  G.AudioThemes = { THEMES, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
