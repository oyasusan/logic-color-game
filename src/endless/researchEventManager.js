/**
 * researchEventManager.js
 * STEP42「Dynamic Research Event System」。Layer開始時にResearch Eventを抽選する
 * 状態管理クラス（DOM描画は持たない、researchEventBanner.jsが担当。他の*Manager.jsと
 * 同じ役割分担）。ゲームルール・問題生成・難易度・判定には一切関与しない演出専用システム。
 *
 * 抽選ルール（要求仕様セクション2）:
 *   - Storyイベントは固定Layerで必ず1回発生し、ランダム抽選より優先される
 *   - Storyイベントが無いLayerでは、まず「今Layerは何も起きない」確率（NO_EVENT_CHANCE）を
 *     判定してからカテゴリ抽選する（毎Layer必ず発生させるとテンポを阻害するため）
 *   - UnknownカテゴリはLayer31以降のみ候補に入る
 *   - 直近に表示した最大RECENT_LIMIT件のidは候補から除外する（8. イベント履歴保存の
 *     「同じイベントばかり続かないよう制御」に対応。全滅した場合は制限を解除して抽選する）
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { ResearchEventData } = G;

  const NO_EVENT_CHANCE = 0.55; // Story固定でないLayerのうち、何も起きない確率
  const RECENT_LIMIT = 3; // 直近何件のidを重複除外の対象にするか

  class ResearchEventManager {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス（履歴の永続化用） */
    constructor({ save }) {
      this.save = save;
      this._recentIds = []; // RUNスコープの直近表示id（重複抑制用、永続化しない）
    }

    /** RUN開始時に呼ぶ */
    reset() {
      this._recentIds = [];
    }

    /**
     * @param {number} layer 現在のLayer（Depth）
     * @param {{allowRandom?:boolean}} [options] allowRandom=falseの場合、Story固定イベント以外は抽選しない
     *   （STEP41-3のTheme Transitionオーバーレイ等、既に演出が集中しているLayerで
     *   ランダムイベントまで重ねないための呼び出し側の制御）
     * @returns {Object|null} 選ばれたイベント定義（researchEventData.js参照）。無ければnull
     */
    rollEvent(layer, options) {
      const allowRandom = !options || options.allowRandom !== false;

      const storyEvent = ResearchEventData.STORY_EVENTS.find(e => e.layer === layer);
      if (storyEvent) return storyEvent;

      if (!allowRandom) return null;
      if (Math.random() < NO_EVENT_CHANCE) return null;

      const pool = ['SYSTEM', 'ARIA', 'ENVIRONMENT'];
      if (layer >= 31) pool.push('UNKNOWN');
      const category = pool[Math.floor(Math.random() * pool.length)];

      const all = ResearchEventData.EVENTS_BY_CATEGORY[category] || [];
      const eligible = all.filter(e => !e.minLayer || layer >= e.minLayer);
      if (eligible.length === 0) return null;

      const fresh = eligible.filter(e => this._recentIds.indexOf(e.id) === -1);
      const candidates = fresh.length > 0 ? fresh : eligible;
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    /**
     * イベント表示を確定した直後に呼ぶ（重複抑制の更新＋生涯履歴への保存）
     * @param {Object} eventDef rollEvent()の戻り値 @param {{run:number, layer:number}} context
     */
    recordShown(eventDef, context) {
      this._recentIds.unshift(eventDef.id);
      if (this._recentIds.length > RECENT_LIMIT) this._recentIds.length = RECENT_LIMIT;
      this.save.recordResearchEventHistory({
        run: context.run || 0,
        layer: context.layer || 0,
        id: eventDef.id,
        category: eventDef.category,
        text: eventDef.text
      });
    }

    /** @returns {Array<Object>} 生涯履歴（新しい順） */
    getHistory() {
      return this.save.getResearchEventHistory();
    }
  }

  G.ResearchEventManager = ResearchEventManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
