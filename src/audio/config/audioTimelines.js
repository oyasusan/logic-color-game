/**
 * audioTimelines.js
 * STEP43.6追加要件「Audio Timeline System」。複数の演出（SE/Music/Animation/Popup/
 * Dialogue/Camera）を時間軸で束ねるTimelineのデータ定義。状態を持たない純粋データ
 * （audioEvents.js等と同じ構成）。`AudioTimelineManager.js`はこのデータを読んで
 * 実行するだけで、Timelineの中身（何秒後に何をするか）はこのファイルへの変更のみで
 * 調整できる。
 *
 * 各ステップ: { at, duration, delay, ease, type, ... }
 *   at: Timeline開始からの秒数 @ duration: 継続時間(秒、連続的に変化する効果向け、
 *   0なら瞬間的) @ delay: atへの追加オフセット(秒、省略時0) @ ease: 'linear'|'easeIn'|
 *   'easeOut'|'easeInOut'（連続変化するステップのみ使用）
 *
 * ステップtype一覧: 'sfx'(UI SFX再生) / 'bell'(アクセント音) /
 *   'musicReaction'(AdaptiveMusicEngineの既存反応=chordAdvance/densityBoost/
 *   filterSweep/stinger/layerFlashを流用) / 'musicDuck'(指定busの音量を一時的に下げる) /
 *   'musicRestore'(musicDuckを解除し元の音量へ戻す) / 'popup'/'dialogue'/'animation'/
 *   'camera'(いずれも登録ハンドラを呼ぶだけ、AudioTimelineManager自身は中身を知らない) /
 *   'callback'(汎用の名前付きハンドラ呼び出し) / 'cancelOthers'(他の再生中Timelineを
 *   問答無用で止める、Priority「critical」用)
 *
 * 【対応イベント16種（要求仕様どおり）】Layer Start/Layer Complete/Discovery/Protocol/
 * Memory/Relationship/Achievement/Collection/Story/Dialogue/Ending/Continue/Popup/
 * Environment Change/Research Rank Upのうち、要求仕様の例で具体的に時間軸が示されていた
 * layerComplete（LayerClearTimelineそのもの）・memoryObtain（Adaptive Music連携の例）・
 * ending（Priority連携の例）の3つのみリッチな複数ステップTimelineとして定義した。
 * 残り13種は、既存のaudioEvents.js（STEP43.6本編）のGAME_EVENTS定義（sfx+musicReaction）を
 * そのまま1ステップのTimelineとして自動的に扱う（AudioTimelineManager.js側の
 * フォールバック、このファイルに重複定義を持たない）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const PRIORITY_RANK = { low: 0, normal: 1, high: 2, critical: 3 };

  const TIMELINES = {
    // 要求仕様の例そのもの: LayerClearTimeline
    layerComplete: {
      priority: 'normal',
      onLowerPriority: 'cancel', // 自分より優先度の低い再生中Timelineをどう扱うか
      cancelOn: ['runEnd'],       // このidのイベントが起きたら即座に中断する
      steps: [
        { at: 0.0, type: 'sfx', sfxId: 'layerComplete' },
        { at: 0.2, type: 'popup', handler: 'clearPopup' },
        { at: 0.5, type: 'popup', handler: 'rankDisplay' },
        { at: 0.8, type: 'sfx', sfxId: 'discovery' },
        { at: 1.2, type: 'musicReaction', reaction: { type: 'chordAdvance' } },
        { at: 1.6, type: 'callback', handler: 'nextLayer' }
      ]
    },
    // 要求仕様「Adaptive Music連携」の例: Memory取得→BGM Duck→Dialogue→Bell→BGM復帰
    memoryObtain: {
      priority: 'high',
      onLowerPriority: 'duck',
      cancelOn: ['runEnd'],
      steps: [
        { at: 0.0, type: 'musicDuck', bus: 'bgm', target: 0.4, duration: 0.6, ease: 'easeOut' },
        { at: 0.1, type: 'sfx', sfxId: 'discovery' },
        { at: 0.1, type: 'dialogue', handler: 'memoryDialogue' },
        { at: 0.9, type: 'bell' },
        { at: 1.6, type: 'musicRestore', bus: 'bgm', duration: 1.0, ease: 'easeIn' }
      ]
    },
    // 要求仕様「Priority連携」の例: Ending開始→通常Timeline停止→Ending Timeline開始
    ending: {
      priority: 'critical',
      onLowerPriority: 'cancel',
      cancelOn: [],
      steps: [
        { at: 0.0, type: 'cancelOthers' },
        { at: 0.0, type: 'sfx', sfxId: 'complete' },
        { at: 0.3, type: 'musicDuck', bus: 'bgm', target: 0.2, duration: 1.0, ease: 'easeOut' },
        { at: 1.5, type: 'popup', handler: 'endingPopup' },
        { at: 2.5, type: 'musicReaction', reaction: { type: 'chordAdvance' } }
      ]
    }
  };

  function getById(id) {
    return TIMELINES[id] || null;
  }

  G.AudioTimelines = { TIMELINES, PRIORITY_RANK, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
