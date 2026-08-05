/**
 * environmentScan.js
 * STEP30-3「Environment Visual / HUD Evolution」セクション1: Environment Scan
 * Sequence。Layer開始時、Environmentが実際に変化した瞬間にのみ表示する
 * 2段階の演出（要求仕様の"Layer Change→Environment Scan→Analysis Complete→
 * Puzzle Start"フロー）。DOM描画・タイマー制御のみを持ち、いつ呼ぶか
 * （＝Environmentが変化した時のみ）はendless.js側の責務。
 *
 * 【重要な設計判断】要求仕様のフロー図は字面上「Layer Change」のたびに毎回
 * Scanを挟むようにも読めるが、5Layerごとにしか環境が変わらない現行仕様で
 * 毎Layer（数十秒に1回のPuzzle開始のたび）に2秒超の演出を強制すると、
 * 既存のテンポ良い進行体験を大きく損なう（アーキテクチャルール「既存ゲーム
 * 処理を変更しない」の趣旨に反する）。そのためSTEP30-1で既に確立していた
 * 「Environmentが実際に変化した時のみ」という判定をそのまま踏襲する。
 *
 * Phase1「SCANNING AREA...」: 約1.2秒のプログレスバー演出（自動でPhase2へ遷移する。
 * 読む情報が無い純粋な演出のため自動遷移のままにしている）。
 * Phase2「ENVIRONMENT IDENTIFIED」: Environment名+AI Research Logのフレーバー
 * テキストを表示する。ここは読む情報があるため自動では進まず、「続ける」ボタンを
 * プレイヤーが押すまで表示し続ける（ユーザーフィードバック「トーストが消えるのが
 * 速すぎて読めない」を受けて、情報系オーバーレイは自動で消えない設計に変更した）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const SCAN_DURATION_MS = 1200;
  const PROGRESS_TICK_MS = 100;
  const TOTAL_TICKS = Math.round(SCAN_DURATION_MS / PROGRESS_TICK_MS);

  /**
   * 「進捗バー速度を一定ではなくランダム変化」させつつ「処理時間は維持」するための
   * ステップ配分を生成する。TOTAL_TICKS個のランダムな重みを正規化し、合計がちょうど
   * 100になる非負の配列を返す（要素数・合計・呼び出し側のタイマー刻み幅はいずれも
   * 既存どおり固定のため、実際にScanが完了するまでの時間そのものは一切変えていない）。
   * @returns {number[]}
   */
  function generateRandomProgressSteps() {
    const weights = [];
    for (let i = 0; i < TOTAL_TICKS; i++) weights.push(0.4 + Math.random()); // 0.4〜1.4の範囲で緩急を付ける
    const total = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => (w / total) * 100);
  }

  class EnvironmentScan {
    /** @param {Object} deps @param {Object} deps.ui 既存UIインスタンス（今回はDOM取得のみで直接は使わない） */
    constructor({ ui }) {
      this.ui = ui;
      this.el = {
        overlay: document.getElementById('environmentScanOverlay'),
        scanningPhase: document.getElementById('environmentScanPhaseScanning'),
        identifiedPhase: document.getElementById('environmentScanPhaseIdentified'),
        progressFill: document.getElementById('environmentScanProgressFill'),
        progressPercent: document.getElementById('environmentScanProgressPercent'),
        name: document.getElementById('environmentScanName'),
        logMessage: document.getElementById('environmentScanLogMessage'),
        statusLogMessage: document.getElementById('environmentScanStatusLogMessage'),
        skipBtn: document.getElementById('environmentScanSkipBtn')
      };
      this._onComplete = null;
      this._completed = true;

      if (this.el.skipBtn) this.el.skipBtn.addEventListener('click', () => this._complete());
    }

    /**
     * @param {Object} envDef worldEnvironment.jsの定義（このLayerで確定したEnvironment）
     * @param {string|Function} [worldStatusOrOnComplete] STEP30-4: World Status
     *   （'STABLE'等）を渡すとAI Research Logの下にStatus別メッセージも表示する。
     *   省略してonCompleteだけ渡す既存の呼び出し方（STEP30-3まで）とも互換
     * @param {Function} [onComplete] Scan完了後（またはSkip後）に呼ばれる
     */
    show(envDef, worldStatusOrOnComplete, onComplete) {
      let worldStatus = null;
      if (typeof worldStatusOrOnComplete === 'function') {
        onComplete = worldStatusOrOnComplete;
      } else {
        worldStatus = worldStatusOrOnComplete || null;
      }

      if (!this.el.overlay) { if (onComplete) onComplete(); return; }
      this._onComplete = onComplete;
      this._completed = false;

      if (this.el.scanningPhase) this.el.scanningPhase.classList.remove('hidden');
      if (this.el.identifiedPhase) this.el.identifiedPhase.classList.add('hidden');
      this._setProgress(0);
      this.el.overlay.classList.remove('hidden');

      this._clearTimers();
      // STEP43.6追加要件「Adaptive Scan Progress」: 見た目の刻み幅だけをランダム化する。
      // タイマー自体（PROGRESS_TICK_MS間隔・TOTAL_TICKS回・SCAN_DURATION_MS後に完了）は
      // 既存のまま変更していないため、実際にScanが完了するまでの処理時間は維持される
      const steps = generateRandomProgressSteps();
      let cumulativePct = 0;
      let tickIndex = 0;
      this._progressInterval = setInterval(() => {
        tickIndex++;
        cumulativePct = tickIndex >= TOTAL_TICKS ? 100 : Math.min(100, cumulativePct + steps[tickIndex - 1]);
        const displayPct = Math.round(cumulativePct);
        this._setProgress(displayPct);
        // Progress SE: バー進行に同期した短い音、100%へ近づくほど高音化する
        if (G.AudioManager) G.AudioManager.playScanTick(displayPct / 100);
        if (tickIndex >= TOTAL_TICKS) clearInterval(this._progressInterval);
      }, PROGRESS_TICK_MS);

      this._timer1 = setTimeout(() => {
        if (this._completed) return;
        if (this.el.scanningPhase) this.el.scanningPhase.classList.add('hidden');
        if (this.el.identifiedPhase) this.el.identifiedPhase.classList.remove('hidden');
        if (this.el.name) this.el.name.textContent = envDef.name;
        if (this.el.logMessage) this.el.logMessage.textContent = G.EnvironmentLog ? G.EnvironmentLog.getLogMessage(envDef.id) : '';
        if (this.el.statusLogMessage) {
          this.el.statusLogMessage.textContent = (worldStatus && G.EnvironmentLog) ? G.EnvironmentLog.getStatusLogMessage(worldStatus) : '';
        }
        // Phase2は情報を読む必要があるため自動では進めない。「続ける」ボタンのクリックを待つ
      }, SCAN_DURATION_MS);
    }

    _setProgress(pct) {
      if (this.el.progressFill) this.el.progressFill.style.width = `${pct}%`;
      if (this.el.progressPercent) this.el.progressPercent.textContent = `${pct}%`;
    }

    _clearTimers() {
      clearTimeout(this._timer1);
      clearInterval(this._progressInterval);
    }

    /** 「続ける」ボタンのクリックで呼ばれる。何度呼ばれても1回しか完了しない */
    _complete() {
      if (this._completed) return;
      this._completed = true;
      this._clearTimers();
      if (this.el.overlay) this.el.overlay.classList.add('hidden');
      const cb = this._onComplete;
      this._onComplete = null;
      if (cb) cb();
    }
  }

  G.EnvironmentScan = EnvironmentScan;
})(typeof globalThis !== 'undefined' ? globalThis : this);
