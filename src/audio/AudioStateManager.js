/**
 * AudioStateManager.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。要求仕様「Audio State
 * Manager」セクションどおり、現在の音楽状態（Current Theme/Scale/Chord/Pattern/
 * Layer構成/Tempo/Seed/Voice数）を保持するだけの状態コンテナ。Web Audio APIの
 * ノードは一切持たず、AdaptiveMusicEngine.jsが読み書きし、AudioDebugPanel.jsが
 * 表示のために読み取る（researchConsole.js等と同じ「描画側は状態を持たない」設計の
 * 対になる、「状態だけを持ち描画・音生成は持たない」側）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class AudioStateManager {
    constructor() {
      this.reset();
    }

    /** RUN開始時に呼ぶ。Music Seedも含め全状態を初期化する */
    reset(musicSeed) {
      this.themeId = 'basic';
      this.scaleId = 'd_dorian';
      this.chordProgression = [];  // Array<{degrees:number[], bars:number}>
      this.chordIndex = 0;
      this.activePatterns = {};    // { arpeggio: 'ascending', pulse: 'pulse' }
      this.activeLayers = ['drone']; // Array<string>
      this.tempoBpm = 60;
      this.musicSeed = musicSeed != null ? musicSeed : Date.now();
      this.voiceCount = 0;
      this.unknownMode = false;
    }

    getCurrentChord() {
      return this.chordProgression[this.chordIndex] || { degrees: [0, 2, 4], bars: 4 };
    }

    advanceChord() {
      if (this.chordProgression.length === 0) return;
      this.chordIndex = (this.chordIndex + 1) % this.chordProgression.length;
    }

    setVoiceCount(count) { this.voiceCount = count; }

    /** @returns {Object} AudioDebugPanel.js表示用のスナップショット */
    getSnapshot() {
      return {
        themeId: this.themeId,
        scaleId: this.scaleId,
        chordIndex: this.chordIndex,
        chordTotal: this.chordProgression.length,
        activePatterns: Object.assign({}, this.activePatterns),
        activeLayers: this.activeLayers.slice(),
        tempoBpm: this.tempoBpm,
        musicSeed: this.musicSeed,
        voiceCount: this.voiceCount,
        unknownMode: this.unknownMode
      };
    }
  }

  G.AudioStateManager = AudioStateManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
