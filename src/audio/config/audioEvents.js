/**
 * audioEvents.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。
 *
 * GAME_EVENTS: ゲーム状態同期で音楽が反応する14イベント（要求仕様「ゲーム状態同期」
 * セクション）。各イベントは任意のUI SFX id（無ければ鳴らさない）と、
 * AdaptiveMusicEngine.jsが解釈するmusicReaction記述子を持つ。musicReactionのtypeは
 * 'none'|'chordAdvance'|'densityBoost'|'filterSweep'|'stinger'|'layerFlash'のいずれか。
 *
 * UI_SFX: UI Sound（要求仕様「UI Sound」セクション）9種＋STEP43.6追加要件「System Event SE」
 * 6種（Analyze/Upgrade/Complete/Discovery/Error/Continue、重複するProtocol/Warning/
 * Layer Start/Layer Complete/Menu/Back/Confirmは追加しない）の定義。いずれも
 * audioPresets.jsの'ui'プリセットを使い、音程だけをここで指定する。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const GAME_EVENTS = {
    layerStart:        { sfx: 'layerStart', musicReaction: { type: 'chordAdvance' } },
    layerComplete:      { sfx: 'layerComplete', musicReaction: { type: 'densityBoost', layer: 'pad', amount: 0.2, durationSec: 2 } },
    puzzleStart:        { sfx: 'nodeSelect', musicReaction: { type: 'none' } },
    puzzleClear:         { sfx: 'puzzleClear', musicReaction: { type: 'densityBoost', layer: 'pulse', amount: 0.15, durationSec: 1.5 } },
    perfect:             { sfx: 'confirm', musicReaction: { type: 'filterSweep', amount: 800, durationSec: 1 } },
    miss:                { sfx: 'warning', musicReaction: { type: 'filterSweep', amount: -400, durationSec: 0.8 } },
    protocolObtain:      { sfx: 'protocol', musicReaction: { type: 'stinger', layer: 'arpeggio' } },
    memoryObtain:        { sfx: 'researchComplete', musicReaction: { type: 'stinger', layer: 'pad' } },
    relationshipChange:  { sfx: 'confirm', musicReaction: { type: 'densityBoost', layer: 'ambient', amount: 0.1, durationSec: 2 } },
    storyStart:          { sfx: null, musicReaction: { type: 'densityBoost', layer: 'pad', amount: 0.25, durationSec: 4 } },
    storyEnd:            { sfx: null, musicReaction: { type: 'densityBoost', layer: 'drone', amount: 0.1, durationSec: 3 } },
    hiddenEnvironment:   { sfx: 'warning', musicReaction: { type: 'layerFlash', layer: 'texture', durationSec: 5 } },
    discovery:           { sfx: 'researchComplete', musicReaction: { type: 'stinger', layer: 'arpeggio' } },
    ending:              { sfx: 'researchComplete', musicReaction: { type: 'chordAdvance' } },
    // STEP43.6追加要件「Audio Timeline System」対応イベント一覧のうち、本編時点では
    // 未定義だった6種を追加（Story/Dialogueは既存のstoryStart/storyEnd＋Dialogue Text
    // Soundで対応済みのため追加しない）
    continueEvent:       { sfx: 'continue', musicReaction: { type: 'none' } },
    achievement:         { sfx: 'complete', musicReaction: { type: 'stinger', layer: 'arpeggio' } },
    collection:          { sfx: 'discovery', musicReaction: { type: 'none' } },
    environmentChange:   { sfx: 'analyze', musicReaction: { type: 'none' } }, // Bell/Theme切替自体はsetWorldEnvironment側が担当
    researchRankUp:      { sfx: 'complete', musicReaction: { type: 'densityBoost', layer: 'pad', amount: 0.2, durationSec: 3 } },
    popup:               { sfx: null, musicReaction: { type: 'none' } }, // 汎用のPopup通知（内容は呼び出し側のcontextに委ねる）
    // 「Cognitive Re-Synchronization System」Audio演出セクションの専用SE5種
    // （calibrationManager.js参照。いずれも短い単発SEのみでmusicReactionは持たせない
    // ＝BGMの演出フローには干渉しない）
    restoringSignal:      { sfx: 'restoringSignal', musicReaction: { type: 'none' } },
    signalLock:           { sfx: 'signalLock', musicReaction: { type: 'none' } },
    memoryRestore:        { sfx: 'memoryRestore', musicReaction: { type: 'none' } },
    calibration:          { sfx: 'calibration', musicReaction: { type: 'none' } },
    synchronizationComplete: { sfx: 'synchronizationComplete', musicReaction: { type: 'none' } }
  };

  // UI Sound 9種（要求仕様どおりの名称）。freqはaudioPresets.js'ui'プリセットへ渡す音程
  const UI_SFX = {
    nodeSelect:       { freq: 520, duration: 0.05 },
    nodeConfirm:      { freq: 660, duration: 0.08 },
    signalSync:       { freq: 784, duration: 0.1 },
    protocol:         { freq: 440, duration: 0.12 },
    menu:             { freq: 392, duration: 0.06 },
    back:             { freq: 330, duration: 0.06 },
    confirm:          { freq: 880, duration: 0.09 },
    warning:          { freq: 233, duration: 0.14 },
    researchComplete: { freq: 1046.5, duration: 0.2 },
    // STEP43.5互換のid（既存呼び出し側の移行を容易にするための別名）
    layerStart:       { freq: 392, duration: 0.14 },
    layerComplete:    { freq: 659.25, duration: 0.22 },
    signalInject:     { freq: 660, duration: 0.08 },
    nodeSync:         { freq: 784, duration: 0.1 },
    puzzleClear:      { freq: 659.25, duration: 0.12 },
    protocolActivate: { freq: 440, duration: 0.12 },
    // STEP43.6追加要件「System Event SE」。Protocol/Warning/Layer Start/Layer Complete/
    // Menu/Back/Confirmは上記で既に定義済みのため重複追加しない
    analyze:          { freq: 587.33, duration: 0.15 },
    upgrade:          { freq: 698.46, duration: 0.16 },
    complete:         { freq: 1174.66, duration: 0.22 },
    discovery:        { freq: 932.33, duration: 0.18 },
    error:            { freq: 174.61, duration: 0.2 },
    continue:         { freq: 493.88, duration: 0.1 },
    // 「Cognitive Re-Synchronization System」Audio演出セクションの専用SE5種。
    // 低音から高音へ上げていくことで「同期が徐々に回復していく」聴感上の流れを表現した
    // （Restoring Signal→Signal Lock/Memory Restore→Calibration→Synchronization Complete）
    restoringSignal:         { freq: 349.23, duration: 0.18 },
    signalLock:              { freq: 587.33, duration: 0.14 },
    memoryRestore:           { freq: 622.25, duration: 0.16 },
    calibration:             { freq: 466.16, duration: 0.12 },
    synchronizationComplete: { freq: 1318.51, duration: 0.26 }
  };

  G.AudioEvents = { GAME_EVENTS, UI_SFX };
})(typeof globalThis !== 'undefined' ? globalThis : this);
