/**
 * stage.js
 * data/stages.json（ステージのメタ情報）と data/puzzles.json（実際の盤面/ヒント）を
 * 読み込み、ステージ一覧の取得・ステージ切り替え・解放判定を担当する。
 *
 * 解放ルール（"次ステージ自動解放"）:
 *   - 先頭ステージ（配列の0番目）は、チュートリアル完了で解放される
 *   - それ以降のステージは、直前のステージをクリア済みならば解放される
 *   - stages.jsonの"unlock"フィールドは「上記に関わらず常に解放する」ための
 *     追加フラグとして扱う（今回のステージ構成では全て false ＝チュートリアル/
 *     直前クリアの条件のみで解放を管理する）
 *
 * progress（ProgressStoreインスタンス）は呼び出し側から都度渡す設計にし、
 * stage.js自体はLocalStorageの存在を知らない。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class StageManager {
    constructor() {
      this.stages = [];
      this.puzzleById = new Map();
    }

    async load() {
      const [stagesRes, puzzlesRes] = await Promise.all([
        fetch('data/stages.json'),
        fetch('data/puzzles.json')
      ]);
      const stagesData = await stagesRes.json();
      const puzzlesData = await puzzlesRes.json();

      this.stages = stagesData.stages.slice().sort((a, b) => a.id - b.id);
      this.puzzleById = new Map(puzzlesData.puzzles.map(p => [p.id, p]));
      return this.stages;
    }

    getStages() {
      return this.stages;
    }

    getStageById(stageId) {
      return this.stages.find(s => s.id === stageId) || null;
    }

    getPuzzleForStage(stageId) {
      const stage = this.getStageById(stageId);
      if (!stage) return null;
      return this.puzzleById.get(stage.puzzle) || null;
    }

    /** @param {Object} progress ProgressStoreインスタンス */
    isUnlocked(stage, progress) {
      if (stage.unlock === true) return true;

      const index = this.stages.findIndex(s => s.id === stage.id);
      if (index === 0) {
        return progress.isTutorialCompleted();
      }
      const prevStage = this.stages[index - 1];
      return progress.isStageCompleted(prevStage.id);
    }

    getFirstStage() {
      return this.stages[0] || null;
    }

    getNextStage(stageId) {
      const index = this.stages.findIndex(s => s.id === stageId);
      if (index === -1 || index + 1 >= this.stages.length) return null;
      return this.stages[index + 1];
    }
  }

  G.StageManager = StageManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
