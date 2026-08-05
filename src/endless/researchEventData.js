/**
 * researchEventData.js
 * STEP42「Dynamic Research Event System」。Layer開始時に低確率で表示する、
 * 演出専用（ゲームルール・問題生成・難易度・判定には一切影響しない）の
 * 短いフレーバーイベントの静的定義データ。状態を持たない純粋なデータのみ
 * （researchIdentity.js/environmentLog.js等と同じ構成）。
 *
 * カテゴリ:
 *   SYSTEM      施設側のシステムログ風の一言
 *   ARIA        ARIAの短いコメント（世界観補強、AI Director 5人格とは別存在）
 *   ENVIRONMENT 背景ノイズ・照明・警告灯・モニター等の環境描写
 *   STORY       固定Layerでのみ発生する伏線的な一言（ランダム抽選の対象外）
 *   UNKNOWN     Layer31以降のみ。説明を与えない、謎だけを残す一言
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const CATEGORIES = ['SYSTEM', 'ARIA', 'ENVIRONMENT', 'STORY', 'UNKNOWN'];

  const SYSTEM_EVENTS = [
    { id: 'sys_subsystem_online', category: 'SYSTEM', icon: '🟢', text: 'SUBSYSTEM ONLINE' },
    { id: 'sys_power_shift', category: 'SYSTEM', icon: '⚡', text: 'POWER SHIFT DETECTED' },
    { id: 'sys_archive_connected', category: 'SYSTEM', icon: '📡', text: 'ARCHIVE CONNECTED' },
    { id: 'sys_diagnostic_complete', category: 'SYSTEM', icon: '🔧', text: 'DIAGNOSTIC COMPLETE' },
    { id: 'sys_backup_cycle', category: 'SYSTEM', icon: '💾', text: 'BACKUP CYCLE INITIATED' }
  ];

  // ARIAは「感情ではなく理解能力を獲得する存在」（STORY_BIBLE.md 2章）という設計方針のため、
  // Relationship Level（LOGICAL AI等）に関わらずどのLevelでも違和感が無い、冷静・観測的な
  // 短いコメントに統一している（AI Director 5人格システムとは別の存在として区別するため
  // 「🤖 ARIA:」の表記を既存のendless.js内の使用例と揃えた）
  const ARIA_EVENTS = [
    { id: 'aria_flavor_analysis_smooth', category: 'ARIA', icon: '🤖', text: '「解析は順調に進んでいます。」' },
    { id: 'aria_flavor_new_pattern', category: 'ARIA', icon: '🤖', text: '「新しいパターンを記録しました。」' },
    { id: 'aria_flavor_status_good', category: 'ARIA', icon: '🤖', text: '「Researcher-01、状態は良好です。」' },
    { id: 'aria_flavor_layer_different', category: 'ARIA', icon: '🤖', text: '「この階層、少し様子が違いますね。」' },
    { id: 'aria_flavor_observing', category: 'ARIA', icon: '🤖', text: '「観測を継続します。」' }
  ];

  const ENVIRONMENT_EVENTS = [
    { id: 'env_background_noise', category: 'ENVIRONMENT', icon: '📻', text: '背景ノイズを検知した' },
    { id: 'env_light_flicker', category: 'ENVIRONMENT', icon: '💡', text: '照明が点滅している' },
    { id: 'env_warning_light', category: 'ENVIRONMENT', icon: '🚨', text: '警告灯が点灯した' },
    { id: 'env_monitor_shift', category: 'ENVIRONMENT', icon: '🖥️', text: 'モニターの表示が変化した' }
  ];

  // Storyイベントは「固定」（要求仕様セクション2）＝ランダム抽選の対象外とし、指定Layerで
  // 必ず1回だけ発生する。既存のChapter境界Layer（4/8/12/16/20/30、Chapter構成参照）や
  // 既存Story Dialogue/Memory取得Layer（layerContentData.js）とは重ならないLayerを選び、
  // 実際のStory演出（Chapter Complete等）と同一Layerで二重に演出が重ならないようにした
  const STORY_EVENTS = [
    { id: 'story_fixed_layer2', category: 'STORY', icon: '📁', text: '施設の奥から微かな振動を感じる', layer: 2 },
    { id: 'story_fixed_layer6', category: 'STORY', icon: '📁', text: '見覚えのある記録の断片が掠めた', layer: 6 },
    { id: 'story_fixed_layer10', category: 'STORY', icon: '📁', text: 'ARIAの応答に、わずかな間があった', layer: 10 },
    { id: 'story_fixed_layer14', category: 'STORY', icon: '📁', text: '古いログが自動的に再生された', layer: 14 },
    { id: 'story_fixed_layer18', category: 'STORY', icon: '📁', text: '誰かが先にここを歩いた形跡がある', layer: 18 },
    { id: 'story_fixed_layer24', category: 'STORY', icon: '📁', text: '施設の設計図に無いはずの区画が見えた', layer: 24 }
  ];

  // Unknownは要求仕様どおり「説明しない、謎だけ残す」ため、他カテゴリと違いARIAのコメントや
  // 施設側の説明を一切付けず、簡潔な断片のみで構成している
  const UNKNOWN_EVENTS = [
    { id: 'unknown_watching', category: 'UNKNOWN', icon: '❓', text: '……何かがこちらを見ている', minLayer: 31 },
    { id: 'unknown_signal', category: 'UNKNOWN', icon: '❓', text: '説明のつかない信号を検知した', minLayer: 31 },
    { id: 'unknown_silence', category: 'UNKNOWN', icon: '❓', text: '……', minLayer: 31 },
    { id: 'unknown_pattern', category: 'UNKNOWN', icon: '❓', text: '既知のいかなる分類にも当てはまらない', minLayer: 31 }
  ];

  const EVENTS_BY_CATEGORY = {
    SYSTEM: SYSTEM_EVENTS,
    ARIA: ARIA_EVENTS,
    ENVIRONMENT: ENVIRONMENT_EVENTS,
    STORY: STORY_EVENTS,
    UNKNOWN: UNKNOWN_EVENTS
  };

  G.ResearchEventData = { CATEGORIES, EVENTS_BY_CATEGORY, SYSTEM_EVENTS, ARIA_EVENTS, ENVIRONMENT_EVENTS, STORY_EVENTS, UNKNOWN_EVENTS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
