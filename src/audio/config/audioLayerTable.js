/**
 * audioLayerTable.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。Layer進行に応じて
 * どのMusic Layer（Drone/Pad/Pulse/Arpeggio/Texture）が有効になるかのデータ定義。
 * 要求仕様どおり「Layer1〜Drone、Layer5〜Pad追加、Layer10〜Pulse追加、
 * Layer15〜Arpeggio追加、Layer21〜Texture追加、Layer31〜Unknown Mode」。
 * Ambient/EventレイヤーはLayer進行と無関係に常時利用可能なため、この表には含めない
 * （AdaptiveMusicEngine.js側でTheme/ゲームイベント駆動として個別に扱う）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // 昇順の閾値テーブル。将来Layerを追加する場合はこの配列へ1行足すだけでよい
  const THRESHOLDS = [
    { minLayer: 1, layers: ['drone'] },
    { minLayer: 5, layers: ['drone', 'pad'] },
    { minLayer: 10, layers: ['drone', 'pad', 'pulse'] },
    { minLayer: 15, layers: ['drone', 'pad', 'pulse', 'arpeggio'] },
    { minLayer: 21, layers: ['drone', 'pad', 'pulse', 'arpeggio', 'texture'] },
    { minLayer: 31, layers: ['drone', 'pad', 'pulse', 'arpeggio', 'texture'], unknownMode: true }
  ];

  /** @param {number} layer @returns {{layers:string[], unknownMode:boolean}} */
  function getActiveLayers(layer) {
    let matched = THRESHOLDS[0];
    for (const entry of THRESHOLDS) {
      if (layer >= entry.minLayer) matched = entry;
    }
    return { layers: matched.layers.slice(), unknownMode: !!matched.unknownMode };
  }

  G.AudioLayerTable = { THRESHOLDS, getActiveLayers };
})(typeof globalThis !== 'undefined' ? globalThis : this);
