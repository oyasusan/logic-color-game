/**
 * extractManager.js
 * STEP27「Extract System」。Research途中で自主的にRUNを終了し、それまでの
 * 蓄積（Research Data等）を確定させる「帰還」システム。専用の.screenは増やさず
 * overlay(#extractOverlay)として実装する（MAP画面からいつでも呼べる一過性の
 * 確認画面のため）。
 *
 * 「Failure Probability」はAIのフレーバー表示専用の数値で、実際の判定
 * （成功/失敗の抽選等）には一切使わない。RETURN TO SURFACEは必ず成功する
 * （＝現在の進行を確定してResult画面へ進むだけ）。この点は他の数値的な
 * ゲームロジックと混同しないよう、コード上も明示している。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const BONUS_RATIO = 0.3; // RETURN TO SURFACE時、現在のResearch Dataに掛けるボーナス比率

  class ExtractManager {
    constructor() {
      this.onReturn = null;   // (bonus:number) => {}  RETURN TO SURFACE選択時
      this.onContinue = null; // () => {}  CONTINUE RESEARCH選択時
      this._pendingBonus = 0;

      this.el = {
        overlay: document.getElementById('extractOverlay'),
        currentData: document.getElementById('extractCurrentData'),
        potentialReward: document.getElementById('extractPotentialReward'),
        failureProbability: document.getElementById('extractFailureProbability'),
        recommendation: document.getElementById('extractRecommendation'),
        returnBtn: document.getElementById('extractReturnBtn'),
        continueBtn: document.getElementById('extractContinueBtn')
      };

      if (this.el.returnBtn) {
        this.el.returnBtn.addEventListener('click', () => {
          this.hide();
          if (this.onReturn) this.onReturn(this._pendingBonus);
        });
      }
      if (this.el.continueBtn) {
        this.el.continueBtn.addEventListener('click', () => {
          this.hide();
          if (this.onContinue) this.onContinue();
        });
      }
    }

    /** @param {{researchData:number, life:number, maxLife:number, riskChainLevel:number}} state */
    show(state) {
      const bonus = Math.round(state.researchData * BONUS_RATIO);
      this._pendingBonus = bonus;
      // 演出用のフレーバー数値（実際の判定には使わない。ライフ残量とRisk Chainの雰囲気だけ反映する）
      const failureProbability = Math.max(5, Math.min(95,
        10 + state.riskChainLevel * 15 + (state.maxLife - state.life) * 10
      ));
      const recommend = (state.life <= 1 || state.riskChainLevel >= 3) ? '帰還推奨' : '続行推奨';

      if (this.el.currentData) this.el.currentData.textContent = String(state.researchData);
      if (this.el.potentialReward) this.el.potentialReward.textContent = `+${bonus}`;
      if (this.el.failureProbability) this.el.failureProbability.textContent = `${failureProbability}%`;
      if (this.el.recommendation) this.el.recommendation.textContent = recommend;

      if (this.el.overlay) this.el.overlay.classList.remove('hidden');
    }

    hide() {
      if (this.el.overlay) this.el.overlay.classList.add('hidden');
    }
  }

  G.ExtractManager = ExtractManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
