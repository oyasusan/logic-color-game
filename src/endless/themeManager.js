/**
 * themeManager.js
 * STEP41-3「Neural Evolution System」セクション1/2: Evolution Theme Data + ThemeManager。
 * Layer進行に応じて解析対象（Cognitive Neural Mapping UIの見た目）が5段階に進化して
 * いく世界観を、表示・演出のみで表現する。ゲームルール・問題生成・判定ロジックには
 * 一切関与しない（`board.js`/`game.js`/`generator.js`/`solver.js`は無変更）。
 *
 * 【既存のWorldEnvironment（worldEnvironment.js、STEP30-1〜）との違い】
 * WorldEnvironmentは5Layerごとの細かい周期で切り替わる「その場の環境」（ゲームプレイ
 * 効果も持つ）。今回のNeural Evolution Themeは、それとは別の・もっと広い区切り
 * （Chapterのクラスタ単位、5段階のみ）で切り替わる「解析対象そのものの進化」を表現する
 * 純粋な表示テーマで、ゲームプレイ効果は一切持たない。STEP30-1で「Research
 * Environment」と「WorldEnvironment」を別概念として分離した設計判断を踏襲し、
 * 3つ目の概念として名前衝突を避けている。
 *
 * データ形式:
 *   PHASES: [{id, startLayer, endLayer}] Layer番号→Phase idの区切り
 *   THEME_DEFS: { [phaseId]: {id, name, backgroundLabel, nodeTheme, accentColor,
 *     analysisToast, syncToast, clearTitle, ariaLine} } Phaseごとの表示設定一式
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // Layer番号→Phase idの区切り。要求仕様どおり5段階、Layer31以降は上限なし
  const PHASES = [
    { id: 'basic', startLayer: 1, endLayer: 4 },
    { id: 'network', startLayer: 5, endLayer: 12 },
    { id: 'distortion', startLayer: 13, endLayer: 20 },
    { id: 'genesis', startLayer: 21, endLayer: 30 },
    { id: 'unknown', startLayer: 31, endLayer: Infinity }
  ];

  // Themeごとの設定一式（データ化。将来テーマを追加する場合はこのオブジェクトへ
  // 1エントリ追加するだけでよい構造にしてある）
  const THEME_DEFS = {
    basic: {
      id: 'basic', name: 'Basic Cognitive Map',
      backgroundLabel: 'Basic Research Lab',
      // nodeTheme: cognitiveTheme.js NODE_THEMEへ反映される値（STEP41-2の仕組みをそのまま利用）
      nodeTheme: { shape: 'circle', connection: true, animation: 'pulse' },
      accentColor: '#29e0ff',
      analysisToast: '🔬 Cognitive Analysis...',
      syncToast: '🔄 Neural Synchronization...',
      clearTitle: 'Cognitive Map Restored',
      ariaLine: '基礎的なCognitive Mapの解析を開始します。'
    },
    network: {
      id: 'network', name: 'Neural Network',
      backgroundLabel: 'Neural Network',
      nodeTheme: { shape: 'circle', connection: true, animation: 'pulse' },
      accentColor: '#43ffa0',
      analysisToast: '🔬 Network Analysis...',
      syncToast: '🔄 Neural Synchronization...',
      clearTitle: 'Neural Network Mapped',
      ariaLine: 'ニューラルネットワークの複雑性が増しています。解析範囲を拡張します。'
    },
    distortion: {
      id: 'distortion', name: 'Memory Distortion',
      backgroundLabel: 'Broken Memory',
      // 歪み(distortion)の表現として、Node Link相当の縁取り（connection）を切る
      nodeTheme: { shape: 'circle', connection: false, animation: 'pulse' },
      accentColor: '#ff3f6b',
      analysisToast: '🔬 Distorted Memory Analysis...',
      syncToast: '⚠️ Signal Instability Detected...',
      clearTitle: 'Memory Fragment Stabilized',
      ariaLine: '記憶データに歪みを検出しました。解析精度の低下に注意してください。'
    },
    genesis: {
      id: 'genesis', name: 'Genesis Neural Core',
      backgroundLabel: 'Genesis Core',
      nodeTheme: { shape: 'circle', connection: true, animation: 'pulse' },
      accentColor: '#ffd54a',
      analysisToast: '🔬 Genesis Core Analysis...',
      syncToast: '🔄 Core Synchronization...',
      clearTitle: 'Genesis Core Restored',
      ariaLine: 'Genesis Neural Coreの中枢へ到達しました。全解析リソースを集中します。'
    },
    unknown: {
      id: 'unknown', name: 'Unknown Structure',
      backgroundLabel: 'Unknown Dimension',
      // 未知の構造(unknown)の表現として、既知のNode形状（circle）から意図的に外す
      nodeTheme: { shape: 'square', connection: false, animation: 'pulse' },
      accentColor: '#b26bff',
      analysisToast: '🔬 Unknown Structure Analysis...',
      syncToast: '❓ Signal Origin Unclear...',
      clearTitle: 'Unknown Structure Logged',
      ariaLine: '既知のパターンに一致しない構造を検出しました。解析を継続します。'
    }
  };

  /** @param {number} layer @returns {string} Phase id（範囲外に落ちることはない設計、最後はunknownで無限に受け止める） */
  function getThemeIdForLayer(layer) {
    const found = PHASES.find(p => layer >= p.startLayer && layer <= p.endLayer);
    return found ? found.id : 'unknown';
  }

  /** @param {number} layer @returns {Object} THEME_DEFSの該当エントリ */
  function getTheme(layer) {
    return THEME_DEFS[getThemeIdForLayer(layer)];
  }

  class ThemeManager {
    /** @param {number} layer @returns {string} 'basic'|'network'|'distortion'|'genesis'|'unknown' */
    getThemeIdForLayer(layer) {
      return getThemeIdForLayer(layer);
    }

    /** @param {number} layer @returns {Object} Theme定義一式 */
    getTheme(layer) {
      return getTheme(layer);
    }

    /** @returns {Array<Object>} Phase区切り定義の複製（Continue画面表示等の参照用） */
    getAllPhases() {
      return PHASES.map(p => Object.assign({}, p, THEME_DEFS[p.id]));
    }
  }

  G.ThemeManager = ThemeManager;
  G.EvolutionThemeData = { PHASES, THEME_DEFS, getThemeIdForLayer, getTheme };
})(typeof globalThis !== 'undefined' ? globalThis : this);
