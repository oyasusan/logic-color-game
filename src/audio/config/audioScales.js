/**
 * audioScales.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。音階のデータ定義。
 * 状態を持たない純粋データのみ（researchEventData.js等と同じ構成）。将来スケールを
 * 追加する場合はこの配列へ1エントリ追加するだけでよい（コード修正不要）。
 *
 * `root`はそのスケールの基準周波数(Hz、オクターブ3付近)。`intervals`は半音単位の
 * 音程差（rootからの相対位置、1オクターブ=12半音）。`getFrequency(scaleId, degreeIndex)`
 * はdegreeIndexがintervals.lengthを超えるとオクターブを跨いで自動的に折り返す。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const SCALES = [
    { id: 'd_dorian', name: 'D Dorian', root: 146.83, intervals: [0, 2, 3, 5, 7, 9, 10] },
    { id: 'e_dorian', name: 'E Dorian', root: 164.81, intervals: [0, 2, 3, 5, 7, 9, 10] },
    { id: 'f_dorian', name: 'F Dorian', root: 174.61, intervals: [0, 2, 3, 5, 7, 9, 10] },
    // Phrygian: 半音の降下(intervals[1]=1)が緊張感・歪みの表現に合うためMemory Distortionで使用
    { id: 'phrygian', name: 'Phrygian', root: 155.56, intervals: [0, 1, 3, 5, 7, 8, 10] },
    // Lydian: 増4度(intervals[3]=6)による明るさ・荘厳さがGenesis Coreの世界観に合う
    { id: 'lydian', name: 'Lydian', root: 146.83, intervals: [0, 2, 4, 6, 7, 9, 11] },
    // Minor Pentatonic: 音数が少なく不確定さを表現しやすいためUnknown Layerで使用
    { id: 'minor_pentatonic', name: 'Minor Pentatonic', root: 220.00, intervals: [0, 3, 5, 7, 10] }
  ];

  const BY_ID = new Map(SCALES.map(s => [s.id, s]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  /**
   * @param {string} scaleId @param {number} degreeIndex 0始まり、スケール外の値は
   *   オクターブを跨いで自動的に折り返す（負数も可）
   * @returns {number} 周波数(Hz)。未知のscaleIdなら440(A4)を返す
   */
  function getFrequency(scaleId, degreeIndex) {
    const scale = getById(scaleId);
    if (!scale) return 440;
    const len = scale.intervals.length;
    const octave = Math.floor(degreeIndex / len);
    const idx = ((degreeIndex % len) + len) % len;
    const semitones = scale.intervals[idx] + octave * 12;
    return scale.root * Math.pow(2, semitones / 12);
  }

  G.AudioScales = { SCALES, getById, getFrequency };
})(typeof globalThis !== 'undefined' ? globalThis : this);
