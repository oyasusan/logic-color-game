/**
 * audioEnvironmentThemes.js
 * STEP43.6追加要件「Facility Audio Theme」。EnvironmentごとのAudio Theme定義。
 *
 * 【既存システムとの関係】audioThemes.js（STEP43.6本編）はLayer番号(5段階のPhase、
 * themeManager.jsと同じ区切り)に応じたBGM（テンポ・スケール・コード進行）を担う。
 * 本ファイルはそれとは別軸の、WorldEnvironment（worldEnvironment.js、5Layerごとに
 * 巡回する「今いるゾーン」、STEP30-1）・Hidden Environment（hiddenEnvironmentData.js、
 * STEP30-7の秘匿領域）に応じたEnvironment Audio（環境音ループ）とアクセント音の
 * 切り替えのみを担当する。BGM本体（テンポ/スケール/コード）には関与しない
 * （両者は完全に独立した軸のため、同時に反映される）。
 *
 * WORLD_ENVIRONMENT_THEMESのキーはworldEnvironment.jsのEnvironment id
 * （env_grid/env_network/env_forest/env_ocean/env_fractal/env_unknown）とそのまま一致させ、
 * 二重管理を避けている。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const WORLD_ENVIRONMENT_THEMES = {
    env_grid:    { name: 'Digital Grid', environmentSounds: ['facility_hum'], filterMultiplier: 1.0, accentPreset: 'bell' },
    env_network: { name: 'Quantum Network', environmentSounds: ['facility_hum', 'server_pulse'], filterMultiplier: 1.15, accentPreset: 'bell' },
    env_forest:  { name: 'Neural Forest', environmentSounds: ['air_vent', 'facility_hum'], filterMultiplier: 0.9, accentPreset: 'bell' },
    env_ocean:   { name: 'Data Ocean', environmentSounds: ['air_vent', 'server_pulse'], filterMultiplier: 0.85, accentPreset: 'bell' },
    env_fractal: { name: 'Fractal Core', environmentSounds: ['server_pulse', 'digital_static'], filterMultiplier: 1.3, accentPreset: 'bell' },
    env_unknown: { name: 'Unknown Dimension', environmentSounds: ['unknown_noise', 'digital_static'], filterMultiplier: 0.7, accentPreset: 'bell' }
  };

  // Hidden Environmentは全て「秘匿領域」の異質さを共有しつつ、僅かに構成を変えて区別する
  const HIDDEN_ENVIRONMENT_THEMES = {
    void_memory:     { name: 'Void Memory', environmentSounds: ['unknown_noise'], filterMultiplier: 0.6, accentPreset: 'bell' },
    lost_archive:    { name: 'Lost Archive', environmentSounds: ['digital_static'], filterMultiplier: 0.75, accentPreset: 'bell' },
    genesis_lab:     { name: 'Genesis Lab', environmentSounds: ['server_pulse', 'unknown_noise'], filterMultiplier: 1.2, accentPreset: 'bell' },
    simulation_zero: { name: 'Simulation Zero', environmentSounds: ['digital_static', 'unknown_noise'], filterMultiplier: 0.65, accentPreset: 'bell' },
    echo_network:    { name: 'Echo Network', environmentSounds: ['unknown_noise', 'facility_hum'], filterMultiplier: 0.95, accentPreset: 'bell' },
    paradox_core:    { name: 'Paradox Core', environmentSounds: ['unknown_noise', 'digital_static'], filterMultiplier: 0.55, accentPreset: 'bell' }
  };

  function getWorldEnvironmentTheme(id) {
    return WORLD_ENVIRONMENT_THEMES[id] || null;
  }

  function getHiddenEnvironmentTheme(id) {
    return HIDDEN_ENVIRONMENT_THEMES[id] || null;
  }

  G.AudioEnvironmentThemes = { WORLD_ENVIRONMENT_THEMES, HIDDEN_ENVIRONMENT_THEMES, getWorldEnvironmentTheme, getHiddenEnvironmentTheme };
})(typeof globalThis !== 'undefined' ? globalThis : this);
