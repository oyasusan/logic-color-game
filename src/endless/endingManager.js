/**
 * endingManager.js
 * STEP32「Narrative & Story System」セクション9: Ending System。5種のEnding
 * （要求仕様どおりEND A〜D + END TRUE）の判定・永続化を統括する。
 *
 * Ending条件はstoryUnlockManager.jsの単純な`{type,value}>=`比較では表現できない
 * 複合条件（World Status、Hidden Environment全種発見、他Systemの完成率の組合せ等）
 * のため、aiFeedback.jsのRULESテーブルと同じ`match: snapshot => boolean`関数の
 * 集合として実装した（このプロジェクトで複合条件を扱う既存パターン）。
 *
 * 達成したEndingはendlessSave.jsの`endingFlags`へ永続化される（一度達成したら
 * 二度と失われない、worldEnvironmentManager.unlockWorldEnvironment等と同じ設計）。
 * 同時にresearchDatabase.addEntry(id)も呼ばれ、Story Archiveの「ENDING X/5」表示・
 * Timelineへも反映される（endless.js側の責務、要求仕様セクション13
 * 「イベント通知を受け取って処理する」を守るため、endingManager自身は
 * researchDatabaseを直接操作しない）。
 *
 * 【要求仕様に無く、こちらで設計した各Endingの具体的な判定基準】
 *   - END A「Complete Research」: 全12件のLOG Entry解放（要求仕様の「主要Story Log完成」）
 *   - END B「World Collapse」: RUN終了時点でWorld Status=COLLAPSEだったこと
 *   - END C「AI Liberation」: 全6件のMEMORY Entry解放（要求仕様の「AI Memory Complete」）
 *   - END D「Simulation Zero」: SIMULATION ZERO（Hidden Environment）内で
 *     Puzzle/Elite/Bossを1回以上クリアしたこと（要求仕様の「SIMULATION ZERO攻略」）
 *   - END TRUE「GENESIS」: 全6種のHidden Environment発見+Story全体100%+
 *     Layer50到達（要求仕様の「Hidden Environment+Story Complete+Special Conditions」。
 *     Special ConditionsはEND A/D等が要求する到達点よりさらに深いLayerを踏んだ経験
 *     として設計した）
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    {
      id: 'ending_a',
      name: 'END A — Complete Research',
      description: '主要なStory Logをすべて集めた。',
      match: s => (s.logCompletionRate || 0) >= 1.0
    },
    {
      id: 'ending_b',
      name: 'END B — World Collapse',
      description: 'World StabilityがCOLLAPSE状態のままRUNを終えた。',
      match: s => s.worldStatus === 'COLLAPSE'
    },
    {
      id: 'ending_c',
      name: 'END C — AI Liberation',
      description: 'AIの記憶をすべて取り戻した。',
      match: s => (s.memoryCompletionRate || 0) >= 1.0
    },
    {
      id: 'ending_d',
      name: 'END D — Simulation Zero',
      description: 'SIMULATION ZEROの深部を攻略した。',
      match: s => !!s.simulationZeroCleared
    },
    {
      id: 'ending_true',
      name: 'END TRUE — GENESIS',
      description: '隠された領域・研究記録・特別な条件、すべてが揃った。',
      match: s => (s.hiddenCompletionRate || 0) >= 1.0 && (s.storyCompletionRate || 0) >= 1.0 && (s.bestLayer || 0) >= 50
    }
  ];

  const BY_ID = new Map(ALL.map(e => [e.id, e]));

  class EndingManager {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス */
    constructor({ save }) {
      this.save = save;
    }

    /**
     * 要求仕様セクション9のAPI。新たに条件を満たしたEndingを判定・永続化する。
     * @param {Object} snapshot endless.jsが組み立てる現在の進行状況スナップショット
     * @returns {Array<Object>} 新たに達成したEnding定義の配列
     */
    checkEndings(snapshot) {
      snapshot = snapshot || {};
      const achievedIds = this.save.getEndingFlags();
      const newlyAchieved = [];
      ALL.forEach(def => {
        if (achievedIds.indexOf(def.id) !== -1) return;
        if (!def.match(snapshot)) return;
        this.save.recordEndingAchieved(def.id);
        newlyAchieved.push(def);
      });
      return newlyAchieved;
    }

    getAchievedEndings() {
      return this.save.getEndingFlags();
    }

    getAllEndings() {
      return ALL;
    }

    getById(id) {
      return BY_ID.get(id) || null;
    }
  }

  G.EndingManager = EndingManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
