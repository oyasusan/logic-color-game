/**
 * endlessResult.js
 * ENDLESS RESEARCHのRESULT画面（DEPTH/SCORE/PERFECT COUNT/BEST DEPTH表示、
 * RETRY・TITLEボタン）のDOM取得・描画・イベント配線のみを担当する。
 * スコア計算やRUN進行の管理は持たない（endless.js側の責務）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class EndlessResultScreen {
    /**
     * @param {Object} callbacks
     *   onRetry() RETRYボタン押下時
     *   onTitle() TITLEボタン押下時
     */
    constructor(callbacks) {
      this.cb = callbacks || {};

      this.el = {
        depth: document.getElementById('endlessResultDepth'),
        score: document.getElementById('endlessResultScore'),
        perfect: document.getElementById('endlessResultPerfect'),
        best: document.getElementById('endlessResultBest'),
        newBest: document.getElementById('endlessResultNewBest'),
        retryBtn: document.getElementById('endlessRetryBtn'),
        titleBtn: document.getElementById('endlessResultTitleBtn'),

        // STEP27: AI Analysis Risk/Reward System
        deepestLayer: document.getElementById('endlessResultLayer'),
        researchData: document.getElementById('endlessResultResearchData'),
        protocolsFound: document.getElementById('endlessResultProtocolsFound'),
        riskChain: document.getElementById('endlessResultRiskChain'),
        unknownAnalysis: document.getElementById('endlessResultUnknownAnalysis'),

        // STEP29: AI Feedback System
        aiObservation: document.getElementById('endlessResultAiObservation'),
        aiRecommendation: document.getElementById('endlessResultAiRecommendation'),

        // STEP31: AI Director Report
        directorSolveTime: document.getElementById('directorReportSolveTime'),
        directorAccuracy: document.getElementById('directorReportAccuracy'),
        directorRisk: document.getElementById('directorReportRisk'),
        directorFavoriteEnv: document.getElementById('directorReportFavoriteEnv'),
        directorRecommendation: document.getElementById('directorReportRecommendation')
      };

      if (this.el.retryBtn) {
        this.el.retryBtn.addEventListener('click', () => this.cb.onRetry && this.cb.onRetry());
      }
      if (this.el.titleBtn) {
        this.el.titleBtn.addEventListener('click', () => this.cb.onTitle && this.cb.onTitle());
      }
    }

    /**
     * @param {{depth:number, score:number, perfectCount:number, researchData?:number,
     *   deepestLayer?:number, protocolsFound?:number, riskChainMultiplier?:number,
     *   unknownAnalysisCount?:number}} runStats
     * @param {{bestDepth:number, isNewBestDepth:boolean, isNewBestScore:boolean}} saveInfo
     * @param {{observation:string, recommendation:string}} [aiFeedback] STEP29: AI Feedback System
     * @param {{averageSolveTime:number, accuracy:number, risk:number, favoriteEnvironment:string|null,
     *   recommendation:{name:string}|null}} [directorReport] STEP31: AI Director System
     */
    render(runStats, saveInfo, aiFeedback, directorReport) {
      if (!this.el.depth) return;
      this.el.depth.textContent = String(runStats.depth);
      this.el.score.textContent = String(runStats.score);
      this.el.perfect.textContent = String(runStats.perfectCount);
      this.el.best.textContent = String(saveInfo.bestDepth);
      if (this.el.newBest) {
        this.el.newBest.classList.toggle('hidden', !(saveInfo.isNewBestDepth || saveInfo.isNewBestScore));
      }

      // STEP27: AI Analysis Risk/Reward System（RESEARCH REPORT）
      if (this.el.deepestLayer) this.el.deepestLayer.textContent = `L${runStats.deepestLayer || 1}`;
      if (this.el.researchData) this.el.researchData.textContent = String(runStats.researchData || 0);
      if (this.el.protocolsFound) this.el.protocolsFound.textContent = String(runStats.protocolsFound || 0);
      if (this.el.riskChain) this.el.riskChain.textContent = `x${(runStats.riskChainMultiplier || 1).toFixed(1)}`;
      if (this.el.unknownAnalysis) this.el.unknownAnalysis.textContent = String(runStats.unknownAnalysisCount || 0);

      // STEP29: AI Feedback System
      if (aiFeedback) {
        if (this.el.aiObservation) this.el.aiObservation.textContent = `"${aiFeedback.observation}"`;
        if (this.el.aiRecommendation) this.el.aiRecommendation.textContent = aiFeedback.recommendation;
      }

      // STEP31: AI Director Report（要求仕様セクション12）
      if (directorReport) {
        if (this.el.directorSolveTime) this.el.directorSolveTime.textContent = `${directorReport.averageSolveTime || 0}s`;
        if (this.el.directorAccuracy) this.el.directorAccuracy.textContent = `${Math.round((directorReport.accuracy || 0) * 100)}%`;
        if (this.el.directorRisk) this.el.directorRisk.textContent = `${Math.round((directorReport.risk || 0) * 100)}%`;
        if (this.el.directorFavoriteEnv) this.el.directorFavoriteEnv.textContent = directorReport.favoriteEnvironment || '-';
        if (this.el.directorRecommendation) {
          this.el.directorRecommendation.textContent = directorReport.recommendation ? directorReport.recommendation.name : 'None';
        }
      }
    }
  }

  G.EndlessResultScreen = EndlessResultScreen;
})(typeof globalThis !== 'undefined' ? globalThis : this);
