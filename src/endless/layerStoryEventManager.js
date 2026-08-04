/**
 * layerStoryEventManager.js
 * STEP32-1「Story Framework Base System」セクション5: Story Event Trigger基盤。
 * 要求仕様どおりの名前は"StoryEventManager.js"だが、既にSTEP32(Story Scenario
 * Framework、CHOICE型Story Eventの取得・選択記録を持つ`storyEventManager.js`/
 * `G.StoryEventManager`クラス)で使用済みのため、衝突を避けて
 * "LayerStoryEventManager"と命名した。
 *
 * 要求仕様セクション5どおり「今回は表示処理は作らない。イベント検索のみ」を厳守し、
 * `checkLayerEvent(layer)`のみを実装する（呼び出し側での表示演出は今回のスコープ外）。
 * データ（セクション6のStoryEvent形式）は「将来追加用」の位置づけのため、
 * 各Chapter開始Layer（layerStoryData.jsのstartLayerと対応）分のみ最小限に用意した。
 *
 * 【STEP32-2追記】Dialogue System実装に伴い、実際にdialogueData.jsへ台詞を用意した
 * Chapter1（Layer1〜4）分は、Layer1だけでなくLayer2〜4のクリアイベントも追加した
 * （それ以外のChapterは引き続き「将来追加用」のプレースホルダーのまま、Chapter開始
 * Layerの1件のみ）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    { id: 'chapter01_layer01_clear', trigger: 'LAYER_CLEAR', chapter: 'chapter01', layer: 1, type: 'DIALOGUE' },
    { id: 'chapter01_layer02_clear', trigger: 'LAYER_CLEAR', chapter: 'chapter01', layer: 2, type: 'DIALOGUE' },
    { id: 'chapter01_layer03_clear', trigger: 'LAYER_CLEAR', chapter: 'chapter01', layer: 3, type: 'DIALOGUE' },
    { id: 'chapter01_layer04_clear', trigger: 'LAYER_CLEAR', chapter: 'chapter01', layer: 4, type: 'DIALOGUE' },
    { id: 'chapter02_layer05_clear', trigger: 'LAYER_CLEAR', chapter: 'chapter02', layer: 5, type: 'DIALOGUE' },
    { id: 'chapter03_layer09_clear', trigger: 'LAYER_CLEAR', chapter: 'chapter03', layer: 9, type: 'DIALOGUE' },
    { id: 'chapter04_layer13_clear', trigger: 'LAYER_CLEAR', chapter: 'chapter04', layer: 13, type: 'DIALOGUE' },
    { id: 'chapter05_layer17_clear', trigger: 'LAYER_CLEAR', chapter: 'chapter05', layer: 17, type: 'DIALOGUE' },
    { id: 'chapter06_layer21_clear', trigger: 'LAYER_CLEAR', chapter: 'chapter06', layer: 21, type: 'DIALOGUE' }
  ];

  /**
   * 要求仕様セクション5のAPI。
   * @param {number} layer
   * @returns {Object|null} 一致するStoryEvent定義（無ければnull）
   */
  function checkLayerEvent(layer) {
    return ALL.find(e => e.trigger === 'LAYER_CLEAR' && e.layer === layer) || null;
  }

  G.LayerStoryEventManager = { ALL, checkLayerEvent };
})(typeof globalThis !== 'undefined' ? globalThis : this);
