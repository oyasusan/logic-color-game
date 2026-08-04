/**
 * researchTimeline.js
 * STEP32「Narrative & Story System」セクション7: Research Timeline。研究履歴
 * （researchDatabase.getTimeline()）を時系列表示するだけのDOM描画クラス
 * （worldEnvironmentArchive.js等と同じ「都度データを読んで再描画する」設計、
 * 状態は持たない）。要求仕様の表示例（LOG001→LOG002→MEMORY001→...）どおり、
 * 矢印で解放順を繋いで表示する。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { StoryData } = G;

  class ResearchTimeline {
    /** @param {Object} deps @param {Object} deps.researchDatabase ResearchDatabaseインスタンス */
    constructor({ researchDatabase }) {
      this.researchDatabase = researchDatabase;
      this.el = {
        list: document.getElementById('researchTimelineList')
      };
    }

    render() {
      const container = this.el.list;
      if (!container) return;
      const timeline = this.researchDatabase.getTimeline();
      if (timeline.length === 0) {
        container.innerHTML = '<div class="rt-empty">まだ研究記録が無い</div>';
        return;
      }
      container.innerHTML = timeline.map((entry, i) => {
        const def = StoryData.getById(entry.id);
        const title = def ? def.title : entry.id;
        const arrow = i < timeline.length - 1 ? '<div class="rt-arrow">↓</div>' : '';
        return `<div class="rt-item">${title}</div>${arrow}`;
      }).join('');
    }
  }

  G.ResearchTimeline = ResearchTimeline;
})(typeof globalThis !== 'undefined' ? globalThis : this);
