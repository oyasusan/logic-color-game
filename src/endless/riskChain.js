/**
 * riskChain.js
 * STEP27「Risk Chain System」。Threat Level 3以上（高危険/Elite/Extreme）の
 * Nodeを連続で選択するとスコア倍率が段階的に上昇し、Threat Level 2以下の
 * 安全なNodeを選ぶとリセットされる仕組みを管理する。RUNごとにreset()される
 * メモリ上の状態のみを持ち、LocalStorageには一切保存しない
 * （upgradeManager.js/protocolManager.jsと同じ設計）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const HIGH_RISK_THRESHOLD = 3; // このThreat Level以上の選択でChainが進む
  const MULTIPLIER_BY_CHAIN = [1, 1.2, 1.5, 1.8, 2.2, 2.6]; // index=chainCount（末尾で頭打ち）

  class RiskChain {
    constructor() {
      this.chainCount = 0;
    }

    reset() {
      this.chainCount = 0;
    }

    /**
     * @param {number|null} threatLevel 選んだ（あるいは確定した）Nodeの脅威度。
     *   null（Unknown解析でEliteへ変質しなかった場合等）は安全側として扱いリセットする。
     * @returns {number} 更新後のchainCount
     */
    registerSelection(threatLevel) {
      if (typeof threatLevel === 'number' && threatLevel >= HIGH_RISK_THRESHOLD) {
        this.chainCount = Math.min(MULTIPLIER_BY_CHAIN.length - 1, this.chainCount + 1);
      } else {
        this.chainCount = 0;
      }
      return this.chainCount;
    }

    getChainLevel() {
      return this.chainCount;
    }

    getMultiplier() {
      return MULTIPLIER_BY_CHAIN[this.chainCount];
    }
  }

  G.RiskChain = RiskChain;
})(typeof globalThis !== 'undefined' ? globalThis : this);
