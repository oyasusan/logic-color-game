/**
 * facilityRestoration.js
 * STEP43「Research Progression System」セクション2: Facility Restoration。
 * 「長期間停止状態にあった研究施設」（Story Bible 1章「Research Facility」）が、
 * プレイヤーの研究進行に応じて少しずつ復旧していく、という世界観を表す0〜100%の
 * 進行度。要求仕様どおり表示専用ではなく実際にendlessSave.jsへ保存される
 * （`recordFacilityRestorationPercent()`は既存値を下回る値では更新しない、
 * 増加のみのモノトニック値）。
 *
 * 【設計方針】新しい生涯統計を積み上げる仕組みではなく、既存の生涯データ
 * （Story Database完成率・Memory収集率・最深到達Layer）から都度算出する
 * 純粋関数にした。理由:
 *   1) 新しい加算ロジックを増やすとバグ（二重加算等）の温床になりやすい
 *      （このプロジェクトで繰り返し踏んできた落とし穴）
 *   2) 既存の3指標は全て「増加のみ」の生涯データのため、算出結果も自然に
 *      単調増加になり、`recordFacilityRestorationPercent()`のガードと整合する
 *   3) 「将来的にStory演出でも利用できる構造」（要求仕様）を、算出元を差し替えるだけで
 *      拡張できる単純な重み付き合成にしておくことで満たす
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // 重み付けは要求仕様に数値指定が無かったため設計した。Story Database（Log/Memory/File/
  // Ending等の解放）を最も重く、Memory収集・最深到達Layerを残りで按分している
  const WEIGHT_DATABASE = 0.5;
  const WEIGHT_MEMORY = 0.25;
  const WEIGHT_DEPTH = 0.25;
  const DEPTH_NORMALIZE = 30; // Layer30(Genesis Protocol完了)到達で最大値とする

  class FacilityRestorationManager {
    /**
     * @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス
     * @param {Object} deps.researchDatabase ResearchDatabaseインスタンス
     * @param {Object} deps.memoryManager MemoryManagerインスタンス
     */
    constructor({ save, researchDatabase, memoryManager }) {
      this.save = save;
      this.researchDatabase = researchDatabase;
      this.memoryManager = memoryManager;
    }

    /** @returns {number} 現在の算出値（0〜100、保存済み値とは独立した「今の実力」） */
    compute() {
      const dbRate = this.researchDatabase.getCompletionRate().rate;
      const memRate = this.memoryManager.getMemoryProgress().rate;
      const depthRate = Math.min(1, this.save.getBestDepth() / DEPTH_NORMALIZE);
      const percent = (dbRate * WEIGHT_DATABASE + memRate * WEIGHT_MEMORY + depthRate * WEIGHT_DEPTH) * 100;
      return Math.round(Math.max(0, Math.min(100, percent)));
    }

    /** @returns {number} 保存済みの進行度（0〜100） */
    getPercent() {
      return this.save.getFacilityRestorationPercent();
    }

    /**
     * RUN終了時等に呼ぶ。現在値を算出し、保存済み値より高ければ更新する。
     * @returns {{percent:number, increased:boolean}} 更新後の値と、実際に増加したか
     */
    refresh() {
      const computed = this.compute();
      const increased = this.save.recordFacilityRestorationPercent(computed);
      return { percent: this.getPercent(), increased };
    }

    /** @returns {string} 復旧度合いに応じたラベル（表示用、要求仕様に無いため設計した） */
    getStatusLabel() {
      const percent = this.getPercent();
      if (percent >= 100) return 'FULLY RESTORED';
      if (percent >= 75) return 'MOSTLY ONLINE';
      if (percent >= 40) return 'PARTIALLY ONLINE';
      if (percent >= 10) return 'POWERING UP';
      return 'OFFLINE';
    }
  }

  G.FacilityRestorationManager = FacilityRestorationManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
