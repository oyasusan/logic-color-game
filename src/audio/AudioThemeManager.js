/**
 * AudioThemeManager.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。Layer番号から
 * Audio Themeを解決するだけの薄い層。視覚面のNeural Evolution System
 * （STEP41-3、themeManager.js）とまったく同じPhase境界（Layer1-4/5-12/13-20/
 * 21-30/31+）を流用し、Layer範囲の定義自体はこのファイルに持たせない
 * （境界値の二重管理を避けるため、`G.EvolutionThemeData.getThemeIdForLayer()`を
 * 呼ぶだけ）。Theme本体の設定はaudioThemes.jsから取得する。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { AudioThemes } = G;

  class AudioThemeManager {
    /** @param {number} layer @returns {string} 'basic'|'network'|'distortion'|'genesis'|'unknown' */
    getThemeIdForLayer(layer) {
      return G.EvolutionThemeData ? G.EvolutionThemeData.getThemeIdForLayer(layer) : 'basic';
    }

    /** @param {number} layer @returns {Object} audioThemes.jsのTHEME_DEFSエントリ */
    getTheme(layer) {
      return AudioThemes.getById(this.getThemeIdForLayer(layer));
    }
  }

  G.AudioThemeManager = AudioThemeManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
