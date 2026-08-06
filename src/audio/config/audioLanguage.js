/**
 * audioLanguage.js
 * 「Research Facility Interaction Pass」セクション: Research Facility Audio Language。
 * ゲーム全体のSEを14カテゴリへ分類し、それぞれ専用Synth音色（audioPresets.jsの
 * `lang_*`プリセット）を持たせる。状態を持たない純粋データ。
 *
 * freq/durationは要求仕様に数値指定が無かったため設計した値。既存`audioEvents.js`の
 * UI_SFX（Navigation≒menu, Selection≒nodeSelect, Confirm≒confirm, Cancel≒back,
 * Discovery≒discovery, Protocol≒protocol, Research≒researchComplete, Warning≒warning,
 * Error≒error）と近い音高に揃え、既存の「聞き慣れた音の記憶」を壊さないようにしつつ、
 * 音色（preset）だけを専用のものへ差し替えている。
 *
 * priorityは既存のAudioTimelines.PRIORITY_RANK（low/normal/high/critical）と同じ4段階を
 * 流用し、`AudioManager.playCategorySfx()`側のCooldown/Priority間引きに使う
 * （Timeline本体には接続しない、UI音専用の軽量な独立機構。理由はAudioManager.js参照）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const CATEGORIES = {
    navigation:  { freq: 392.00, duration: 0.05, preset: 'lang_navigation', priority: 'low' },
    selection:   { freq: 523.25, duration: 0.06, preset: 'lang_selection', priority: 'low' },
    confirm:     { freq: 783.99, duration: 0.09, preset: 'lang_confirm', priority: 'normal' },
    cancel:      { freq: 293.66, duration: 0.06, preset: 'lang_cancel', priority: 'normal' },
    popup:       { freq: 659.25, duration: 0.08, preset: 'lang_popup', priority: 'normal' },
    discovery:   { freq: 932.33, duration: 0.18, preset: 'lang_discovery', priority: 'high' },
    protocol:    { freq: 440.00, duration: 0.12, preset: 'lang_protocol', priority: 'normal' },
    story:       { freq: 587.33, duration: 0.14, preset: 'lang_story', priority: 'normal' },
    memory:      { freq: 622.25, duration: 0.16, preset: 'lang_memory', priority: 'normal' },
    research:    { freq: 1046.50, duration: 0.20, preset: 'lang_research', priority: 'normal' },
    warning:     { freq: 233.00, duration: 0.14, preset: 'lang_warning', priority: 'critical' },
    error:       { freq: 174.61, duration: 0.22, preset: 'lang_error', priority: 'critical' },
    environment: { freq: 349.23, duration: 0.10, preset: 'lang_environment', priority: 'low' },
    ending:      { freq: 1318.51, duration: 0.30, preset: 'lang_ending', priority: 'critical' },

    // ---- Popup Feedback専用（要求仕様の12種のうちWarning/Error/Discovery/Story/Memory/
    // Protocolは上記14種を再利用し、Popup特有の残り6種のみをここに追加する） ----
    information: { freq: 698.46, duration: 0.10, preset: 'lang_information', priority: 'low' },
    success:     { freq: 880.00, duration: 0.13, preset: 'lang_success', priority: 'normal' },
    achievement: { freq: 1174.66, duration: 0.24, preset: 'lang_achievement', priority: 'high' },
    relationship:{ freq: 554.37, duration: 0.16, preset: 'lang_relationship', priority: 'normal' },
    continueTone:{ freq: 493.88, duration: 0.12, preset: 'lang_continue', priority: 'normal' },
    layerClear:  { freq: 1046.50, duration: 0.20, preset: 'lang_layerClear', priority: 'high' }
  };

  function getById(category) {
    return CATEGORIES[category] || null;
  }

  G.AudioLanguage = { CATEGORIES, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
