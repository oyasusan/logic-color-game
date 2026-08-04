/**
 * storyManager.js
 * STEP32-1「Story Framework Base System」セクション1: StoryManager。
 * ENDLESS RESEARCHのLayer進行（Layerクリア）をトリガーとして、Chapter管理・
 * Story Progress保存・Story Event検索を行うCoordinator本体（要求仕様どおりの
 * ファイル名/API名。他STEP32系との衝突は無い）。実際の永続化は完全に
 * endlessSave.jsへ委譲し（researchDatabase.js/scenarioManager.js等と同じ設計）、
 * 本クラス自身は状態を持たない。
 *
 * 【STEP34追記】Story Event検索の参照先を`layerStoryEventManager.js`
 * （Dialogue idのみを持つ検索専用テーブル）から`layerContentData.js`
 * （eventId/trigger/dialogueId/memoryId/relationshipChangeを1レコードにまとめた
 * 正本テーブル、STEP32-5-2で新設）へ切り替えた。STEP32-5-2の時点でLayer1〜4の値が
 * 旧実装と1:1一致することを検証済みのため、Chapter1の挙動は変化しない
 * （`onLayerClear()`の返り値の型だけが変わる。呼び出し側=endless.jsの対応は
 * README.md STEP34セクション参照）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { LayerStoryData, LayerContentData } = G;

  class StoryManager {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス */
    constructor({ save }) {
      this.save = save;
    }

    /** 要求仕様セクション1のAPI。現在のStory状態を読み込む（永続化・デフォルト補完はendlessSave.js側で完結済み） */
    initializeStory() {
      return this.save.getLayerStoryProgress();
    }

    /** @returns {Object|null} 現在Chapterの定義（layerStoryData.js参照） */
    getCurrentChapter() {
      return LayerStoryData.getById(this.save.getLayerStoryProgress().currentChapter);
    }

    /** @returns {number} 現在のStory Layer（直近クリアしたLayer番号） */
    getCurrentStoryLayer() {
      return this.save.getLayerStoryProgress().currentLayer;
    }

    /**
     * 要求仕様セクション1のAPI。Layerクリア時に呼び出す（STEP34セクション1の
     * 「Layer Clear→Story Event Check→...」フローの起点）。
     * 処理順: 1.Layerクリア記録 2.Story Event確認 3.Chapter進行確認 4.Save更新
     * @param {number} layer クリアしたLayer番号
     * @returns {Object|null} 該当Layerの`layerContentData.js`レコード（eventId/trigger/
     *   dialogueId/memoryId/relationshipChange等を含む。lockedなLayerでも該当Chapterの
     *   情報だけを持つレコードを返す。Layer1〜30の範囲外はnull）
     */
    onLayerClear(layer) {
      // 1. Layerクリア記録
      this.save.recordLayerStoryLayerCleared(layer);
      // 2. Story Event確認（検索のみ。実際の表示・取得処理はendless.js側の責務）
      const event = LayerContentData.getByLayer(layer);
      // 4. Save更新（現在Layerの更新）。3のChapter進行確認より先に行い、
      //   Chapter境界をまたいだ瞬間も必ずcurrentLayerが最新化されるようにする
      this.save.setLayerStoryCurrentLayer(layer);
      // 3. Chapter進行確認
      const chapter = this.getCurrentChapter();
      if (chapter && layer >= chapter.endLayer) this.completeChapter();

      return event;
    }

    /** 要求仕様セクション1のAPI。現在Chapterの完了処理（完了記録＋次Chapterへの遷移） */
    completeChapter() {
      const progress = this.save.getLayerStoryProgress();
      const current = LayerStoryData.getById(progress.currentChapter);
      if (!current) return null;
      this.save.recordLayerStoryChapterCompleted(current.id);
      const next = LayerStoryData.getNextChapter(current.id);
      if (next) this.save.setLayerStoryCurrentChapter(next.id);
      return next;
    }

    /** 要求仕様セクション1のAPI。テスト用リセット */
    resetStoryProgress() {
      this.save.resetLayerStoryProgress();
    }
  }

  G.StoryManager = StoryManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
