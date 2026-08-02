/**
 * debug.js
 * URLに ?debug=true が付いている場合だけ有効になる開発者向けデバッグパネル。
 * 通常プレイには一切影響しない（`debug`未指定時はDOMへ何も追加しない）。
 *
 * 表示する情報はすべて既存モジュールが既に持っているデータの読み取りのみ
 * （generator.js/solver.jsの計算結果、puzzleManager.js/tools/build_puzzles.jsが
 * puzzleオブジェクトに埋め込んだseed/difficulty/stats）で、ゲームロジック・
 * 問題生成ロジックには一切書き込みを行わない。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  function isEnabled() {
    try {
      return new URLSearchParams(global.location.search).get('debug') === 'true';
    } catch (e) {
      return false;
    }
  }

  /** puzzleオブジェクトの形は生成元(固定/生成/Daily)で微妙にフィールド名が違うため吸収する */
  function extractSeed(puzzle) {
    if (puzzle.seed != null) return String(puzzle.seed);
    if (typeof puzzle.id === 'string' && puzzle.id.includes('-')) {
      return puzzle.id.slice(puzzle.id.indexOf('-') + 1);
    }
    return '-';
  }

  function extractDifficulty(puzzle) {
    return puzzle.difficulty || puzzle.generatedDifficulty || '-';
  }

  function extractStats(puzzle) {
    return puzzle.stats || puzzle.generatorStats || null;
  }

  class DebugPanel {
    constructor() {
      this.enabled = isEnabled();
      this.el = null;
      this.showAnswer = false;
      this._onToggleAnswer = null;
      if (this.enabled) this._build();
    }

    _build() {
      const panel = document.createElement('div');
      panel.id = 'debugPanel';
      panel.innerHTML = `
        <div class="debug-row"><span class="debug-key">SEED</span><span id="dbgSeed">-</span></div>
        <div class="debug-row"><span class="debug-key">DIFF</span><span id="dbgDifficulty">-</span></div>
        <div class="debug-row"><span class="debug-key">SOLVER</span><span id="dbgSolver">-</span></div>
        <button type="button" id="dbgToggleAnswer">SHOW ANSWER</button>
      `;
      document.body.appendChild(panel);
      this.el = panel;
      this.seedEl = panel.querySelector('#dbgSeed');
      this.difficultyEl = panel.querySelector('#dbgDifficulty');
      this.solverEl = panel.querySelector('#dbgSolver');
      this.answerBtn = panel.querySelector('#dbgToggleAnswer');
      this.answerBtn.addEventListener('click', () => {
        this.showAnswer = !this.showAnswer;
        this.answerBtn.classList.toggle('active', this.showAnswer);
        if (this._onToggleAnswer) this._onToggleAnswer(this.showAnswer);
      });
    }

    /** 答え表示トグルが押された時に呼ばれるコールバックを登録する */
    onToggleAnswer(cb) {
      this._onToggleAnswer = cb;
    }

    /** ステージ/チュートリアル/Daily Puzzleが切り替わるたびに表示内容を更新する */
    render(puzzle) {
      if (!this.enabled || !this.el || !puzzle) return;

      this.seedEl.textContent = extractSeed(puzzle);

      const difficulty = extractDifficulty(puzzle);
      this.difficultyEl.textContent = typeof difficulty === 'string' ? difficulty.toUpperCase() : String(difficulty);

      const stats = extractStats(puzzle);
      this.solverEl.textContent = stats
        ? `sol=${stats.solutions} steps=${stats.steps} guess=${stats.guessCount} hints=${stats.hintCount}`
        : 'N/A';

      // パズルが切り替わったら答え表示は毎回オフに戻す
      this.showAnswer = false;
      if (this.answerBtn) this.answerBtn.classList.remove('active');
    }
  }

  G.Debug = new DebugPanel();
})(typeof globalThis !== 'undefined' ? globalThis : this);
