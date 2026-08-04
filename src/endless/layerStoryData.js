/**
 * layerStoryData.js
 * STEP32-1「Story Framework Base System」セクション2: Story Data System。
 * 要求仕様どおりの名前は"StoryData.js"だが、既にSTEP32（Narrative & Story System、
 * LOG/MEMORY/FILE等のStoryEntryを持つ`storyData.js`/`G.StoryData`）で使用済みのため、
 * 3つ目の衝突を避けて"LayerStoryData"と命名した（ENDLESS RESEARCHのLayer番号に
 * 直接紐づくChapter区切りデータ、という性質を名前に反映させた）。
 *
 * データ駆動方式（要求仕様どおり）: { chapters: [{ id, title, startLayer, endLayer,
 * unlockCondition }] }。新しいChapterを追加する場合はこのファイルへのデータ追加のみで
 * 対応できる（scenarioData.js等と同じ設計）。
 *
 * 【Chapterのtitleについて】STEP32(Story Scenario Framework)のCASE001〜006と同じ
 * タイトル（First Signal/Lost Data≒Missing Data/Color Experiment/Silent Facility/
 * AI Memory/Genesis Protocol）を意図的に踏襲している（要求仕様どおり）。CASE側は
 * 「1回で完結する独立Scenario」、こちら側は「ENDLESS RESEARCHのLayer進行そのものに
 * 紐づく章立て」という、同じ物語を異なる構造で語る2つの独立した仕組みという位置づけ。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    { id: 'chapter01', title: 'First Signal', startLayer: 1, endLayer: 4, unlockCondition: null },
    { id: 'chapter02', title: 'Lost Data', startLayer: 5, endLayer: 8, unlockCondition: { type: 'layerReached', value: 5 } },
    { id: 'chapter03', title: 'Color Experiment', startLayer: 9, endLayer: 12, unlockCondition: { type: 'layerReached', value: 9 } },
    { id: 'chapter04', title: 'Silent Facility', startLayer: 13, endLayer: 16, unlockCondition: { type: 'layerReached', value: 13 } },
    { id: 'chapter05', title: 'AI Memory', startLayer: 17, endLayer: 20, unlockCondition: { type: 'layerReached', value: 17 } },
    { id: 'chapter06', title: 'Genesis Protocol', startLayer: 21, endLayer: 30, unlockCondition: { type: 'layerReached', value: 21 } }
  ];

  const BY_ID = new Map(ALL.map(c => [c.id, c]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  /** @returns {Object|null} 指定Layerが属するChapter（Layer30を超える場合は最後のChapterのまま） */
  function getByLayer(layer) {
    const found = ALL.find(c => layer >= c.startLayer && layer <= c.endLayer);
    if (found) return found;
    return layer > ALL[ALL.length - 1].endLayer ? ALL[ALL.length - 1] : null;
  }

  /** @returns {Object|null} 次のChapter定義（現在が最後のChapterならnull） */
  function getNextChapter(id) {
    const index = ALL.findIndex(c => c.id === id);
    if (index === -1 || index >= ALL.length - 1) return null;
    return ALL[index + 1];
  }

  G.LayerStoryData = { ALL, getById, getByLayer, getNextChapter };
})(typeof globalThis !== 'undefined' ? globalThis : this);
