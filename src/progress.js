/**
 * progress.js
 * LocalStorageによるセーブデータの読み書きを一元管理する。
 * - クリア済みステージ / 星評価 / ベストタイム
 * - プレイヤーレベル・経験値
 * - チュートリアル完了フラグ
 * - 設定・プレイ履歴
 *
 * 旧バージョン（v1: bestStageのみを保持する単一ステージ時代のセーブ）が
 * 残っている場合は、初回読み込み時に自動的に引き継ぐ。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const STORAGE_KEY_V2 = 'logicColor.save.v2';
  const STORAGE_KEY_V1 = 'logicColor.save.v1'; // 旧: 単一ステージ時代のセーブ（移行元）
  const MAX_HISTORY_ENTRIES = 30;

  // 経験値200ごとにレベルアップする単純な線形カーブ
  const EXP_PER_LEVEL = 200;
  const EXP_STAGE_CLEAR = 100;
  const EXP_STAR3_BONUS = 50;

  function defaultData() {
    return {
      version: 2,
      completedStages: [], // クリア済みステージID(number)の配列
      stars: {},           // { [stageId]: 1|2|3 }
      bestTime: {},        // { [stageId]: seconds }
      level: 1,
      exp: 0,
      tutorialCompleted: false,
      settings: {
        soundOn: true
      },
      history: [] // { stageId, stars, seconds, hintCount, undoCount, clearedAt }
    };
  }

  /** 旧v1セーブ（bestStage方式）から新形式へ引き継ぐ */
  function migrateFromV1(data) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_V1);
      if (!raw) return data;
      const old = JSON.parse(raw);
      const bestStage = old.bestStage || 0; // 0-indexed: クリア済みの数
      for (let i = 1; i <= bestStage; i++) {
        if (!data.completedStages.includes(i)) data.completedStages.push(i);
      }
      // 旧システムで何かしらクリア済みなら、チュートリアル未実装時代のプレイヤーなので
      // 今からチュートリアルへ差し戻さないようにする
      if (bestStage > 0) data.tutorialCompleted = true;
      if (old.settings) data.settings = Object.assign(data.settings, old.settings);
      if (Array.isArray(old.history)) data.history = old.history.slice(-MAX_HISTORY_ENTRIES);
    } catch (e) {
      console.warn('旧セーブデータの移行に失敗しました。', e);
    }
    return data;
  }

  class ProgressStore {
    constructor() {
      this.data = defaultData();
    }

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_V2);
        if (raw) {
          this.data = Object.assign(defaultData(), JSON.parse(raw));
        } else {
          this.data = migrateFromV1(defaultData());
          this.save();
        }
      } catch (e) {
        console.warn('セーブデータの読み込みに失敗しました。初期値を使用します。', e);
        this.data = defaultData();
      }
      return this.data;
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(this.data));
      } catch (e) {
        console.warn('セーブに失敗しました。', e);
      }
    }

    isStageCompleted(stageId) {
      return this.data.completedStages.includes(stageId);
    }

    getStars(stageId) {
      return this.data.stars[stageId] || 0;
    }

    getBestTime(stageId) {
      return this.data.bestTime[stageId];
    }

    /** 経験値を加算し、レベルアップしたかどうかを返す */
    addExp(amount) {
      if (amount <= 0) return { levelUp: false, level: this.data.level };
      const beforeLevel = this.data.level;
      this.data.exp += amount;
      this.data.level = Math.floor(this.data.exp / EXP_PER_LEVEL) + 1;
      return { levelUp: this.data.level > beforeLevel, level: this.data.level };
    }

    /**
     * ステージクリアを記録する。
     * @param {number} stageId
     * @param {Object} result
     * @param {number} result.stars
     * @param {number} result.seconds
     * @param {number} result.hintCount
     * @param {number} result.undoCount
     * @returns {{expGained:number, isFirstClear:boolean, levelUp:boolean, level:number}}
     */
    recordClear(stageId, result) {
      const isFirstClear = !this.isStageCompleted(stageId);
      const previousStars = this.getStars(stageId);
      const previousBestTime = this.getBestTime(stageId);

      if (isFirstClear) {
        this.data.completedStages.push(stageId);
      }

      let expGained = 0;
      if (isFirstClear) expGained += EXP_STAGE_CLEAR;

      if (result.stars > previousStars) {
        this.data.stars[stageId] = result.stars;
        if (result.stars === 3 && previousStars < 3) expGained += EXP_STAR3_BONUS;
      }

      if (previousBestTime === undefined || result.seconds < previousBestTime) {
        this.data.bestTime[stageId] = result.seconds;
      }

      const expResult = this.addExp(expGained);

      this.data.history.push({
        stageId,
        stars: result.stars,
        seconds: result.seconds,
        hintCount: result.hintCount,
        undoCount: result.undoCount,
        clearedAt: new Date().toISOString()
      });
      if (this.data.history.length > MAX_HISTORY_ENTRIES) {
        this.data.history = this.data.history.slice(-MAX_HISTORY_ENTRIES);
      }

      this.save();

      return {
        expGained,
        isFirstClear,
        levelUp: expResult.levelUp,
        level: expResult.level
      };
    }

    completeTutorial() {
      if (this.data.tutorialCompleted) return;
      this.data.tutorialCompleted = true;
      this.save();
    }

    isTutorialCompleted() {
      return this.data.tutorialCompleted;
    }
  }

  G.ProgressStore = ProgressStore;
  G.EXP_PER_LEVEL = EXP_PER_LEVEL;
})(typeof globalThis !== 'undefined' ? globalThis : this);
