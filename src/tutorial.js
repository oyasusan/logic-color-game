/**
 * tutorial.js
 * data/tutorials.json を読み込み、Tutorial 01 → 02 → 03 の進行を管理する。
 * 各ステップはgame.jsのGameインスタンスとして扱えるよう、puzzles.jsonと
 * 互換の形式（size/rowHints/columnHints/answer）で提供する。
 *
 * チュートリアル自体はステージ扱いしない（stages.jsonには含めない）ため、
 * 完了状態はProgressStore側のtutorialCompletedフラグで別管理する。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class TutorialController {
    constructor() {
      this.steps = [];
      this.currentIndex = -1;
    }

    async load() {
      const res = await fetch('data/tutorials.json');
      const data = await res.json();
      this.steps = data.tutorials.slice().sort((a, b) => a.step - b.step);
      return this.steps;
    }

    get totalSteps() {
      return this.steps.length;
    }

    /** チュートリアルを最初から開始し、最初のステップのpuzzle相当のデータを返す */
    begin() {
      this.currentIndex = 0;
      return this.getCurrentPuzzle();
    }

    getCurrentPuzzle() {
      return this.steps[this.currentIndex] || null;
    }

    isLastStep() {
      return this.currentIndex >= this.steps.length - 1;
    }

    /**
     * 次のステップへ進む。
     * @returns {Object|null} 次のpuzzleデータ。最終ステップの後は null。
     */
    advance() {
      if (this.isLastStep()) {
        this.currentIndex = -1;
        return null;
      }
      this.currentIndex++;
      return this.getCurrentPuzzle();
    }

    isActive() {
      return this.currentIndex >= 0;
    }
  }

  G.TutorialController = TutorialController;
})(typeof globalThis !== 'undefined' ? globalThis : this);
