/**
 * metaProgression.js
 * STEP28「Meta Progression / Permanent Research System」。RUNをまたいで恒久的に
 * 蓄積・強化される状態（permanentResearchData・Research Tree購入状況・
 * Research Rank・Permanent Unlock・Protocol Evolution）をまとめて扱う管理クラス。
 * 実際の永続化（LocalStorage）はendlessSave.jsへ完全に委譲し、本クラス自身は
 * 状態を持たない（save.load()済みのEndlessSaveStoreインスタンスを都度参照する）。
 *
 * upgradeManager.js（RUN限定のUpgrade所持状況）と役割が対になるが、こちらは
 * 「RUNをまたいで残る」側の管理を担当する点が異なる。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { ResearchTree } = G;

  // Rank 0(Observer)〜5(Neural Architect=MAX)。要求仕様に数値指定が無かったため、
  // 「生涯Research Data ÷ 500 + 購入Upgrade数×3 + 到達最深Layer×4 + Archive完成率×15」
  // という複合スコアで判定するよう設計した（複数の進行要素をバランス良く反映するため）。
  const RANK_LABELS = ['Observer', 'Analyst', 'Explorer', 'Specialist', 'Deep Researcher', 'Neural Architect'];
  const RANK_THRESHOLDS = [0, 8, 20, 35, 55, 85];

  // Permanent Unlock System（要求仕様セクション6）。Secret Layerは新規の探索深度帯を
  // 丸ごと追加する大規模拡張になるため、今回はRank5到達で解放される「実績フラグ」
  // として実装し、Archive/NEURAL RESEARCH LAB画面上に表示するに留める（README参照）。
  const RANK_GATES = [
    { rank: 2, id: 'protocol_neural_link', label: 'New Protocol: Neural Link' },
    { rank: 3, id: 'environment_quantum_flux', label: 'New Research Environment: Quantum Flux' },
    { rank: 4, id: 'event_temporal_echo', label: 'New Unknown Event: Temporal Echo' },
    { rank: 5, id: 'secret_layer', label: 'Secret Layer' }
  ];

  const EVOLUTION_STAGE_LABELS = ['Basic Protocol', 'Advanced Protocol', 'Quantum Protocol'];

  class MetaProgression {
    /**
     * @param {Object} deps
     * @param {Object} deps.save EndlessSaveStoreインスタンス
     * @param {Object} [deps.identityManager] STEP29: Protocol Engineerの
     *   Evolution Cost Down Perkによるコスト割引に使う（省略可）
     */
    constructor({ save, identityManager }) {
      this.save = save;
      this.identityManager = identityManager || null;
    }

    /** ---------------- Research Data（永続資源） ---------------- */

    getPermanentResearchData() {
      return this.save.getPermanentResearchData();
    }

    /** ---------------- Research Tree ---------------- */

    getLevel(id) {
      return this.save.getResearchTreeLevel(id);
    }

    isMaxed(id) {
      const def = ResearchTree.getById(id);
      if (!def) return true;
      return this.getLevel(id) >= def.maxLevel;
    }

    getCostForNext(id) {
      const def = ResearchTree.getById(id);
      if (!def) return null;
      return ResearchTree.getCostForNextLevel(def, this.getLevel(id));
    }

    canAfford(id) {
      if (this.isMaxed(id)) return false;
      const cost = this.getCostForNext(id);
      return cost !== null && this.getPermanentResearchData() >= cost;
    }

    /** @returns {boolean} 購入できた場合true */
    purchase(id) {
      if (!this.canAfford(id)) return false;
      const cost = this.getCostForNext(id);
      this.save.spendPermanentResearchData(cost);
      this.save.incrementResearchTreeLevel(id);
      return true;
    }

    getPurchasedUpgradeCount() {
      return ResearchTree.ALL.reduce((sum, def) => sum + this.getLevel(def.id), 0);
    }

    _effectTotal(type) {
      return ResearchTree.ALL
        .filter(def => def.effect.type === type)
        .reduce((sum, def) => sum + def.effect.perLevel * this.getLevel(def.id), 0);
    }

    /** Advanced Analysis: Unknown NodeがOracle相当の解析情報を表示する確率(0〜1) */
    getUnknownRevealChance() {
      return Math.min(1, this._effectTotal('unknownRevealChance'));
    }

    /** Protocol Synthesis: Protocol Fragment獲得量に掛ける倍率（Environment側の倍率とは独立） */
    getFragmentGainMultiplier() {
      return 1 + this._effectTotal('fragmentGainMultiplier');
    }

    /** Deep Scan: Research Mapの分岐候補に追加される枚数 */
    getExtraMapChoices() {
      return Math.round(this._effectTotal('extraMapChoices'));
    }

    /** Emergency Recovery: RUN中最初のミスで軽減されるライフ損失量 */
    getFirstMissLifeReduction() {
      return Math.round(this._effectTotal('firstMissLifeReduction'));
    }

    /** ---------------- Research Rank System ---------------- */

    _archiveCompletionRatio() {
      const protocolTotal = G.ProtocolUnlock ? G.ProtocolUnlock.getAllDefs().length : 0;
      const protocolRatio = protocolTotal > 0 ? this.save.getUnlockedProtocols().length / protocolTotal : 0;
      const eventTotal = G.UnknownEvents ? G.UnknownEvents.ALL.length : 0;
      const eventRatio = eventTotal > 0 ? this.save.getDiscoveredUnknownEvents().length / eventTotal : 0;
      return (protocolRatio + eventRatio) / 2;
    }

    getDeepestLayerReached() {
      return G.PuzzleTier ? G.PuzzleTier.getTierNumber(this.save.getBestDepth()) : 1;
    }

    /** @returns {number} 0(Observer)〜5(Neural Architect=MAX)のRank index */
    getRankIndex() {
      const score =
        this.save.getResearchDataTotal() / 500 +
        this.getPurchasedUpgradeCount() * 3 +
        this.getDeepestLayerReached() * 4 +
        this._archiveCompletionRatio() * 15;

      let index = 0;
      for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
        if (score >= RANK_THRESHOLDS[i]) { index = i; break; }
      }
      return index;
    }

    /** @returns {number} 1〜6のRank番号（Permanent Unlock判定・Protocol解放snapshot用） */
    getRankNumber() {
      return this.getRankIndex() + 1;
    }

    getRankLabel() {
      const index = this.getRankIndex();
      return index >= RANK_LABELS.length - 1
        ? `MAX ${RANK_LABELS[RANK_LABELS.length - 1]}`
        : `Lv.${index + 1} ${RANK_LABELS[index]}`;
    }

    /** ---------------- Permanent Unlock System ---------------- */

    /** @returns {Array<{rank:number,id:string,label:string}>} 今回新たに解放された技術（発見演出の対象） */
    checkNewlyUnlockedTechnologies() {
      const rank = this.getRankNumber();
      const newly = [];
      RANK_GATES.forEach(gate => {
        if (rank >= gate.rank && !this.save.isTechnologyUnlocked(gate.id)) {
          this.save.unlockTechnology(gate.id);
          if (gate.id === 'secret_layer') this.save.recordSecretDiscovery('secret_layer');
          newly.push(gate);
        }
      });
      return newly;
    }

    getAllRankGates() {
      return RANK_GATES.slice();
    }

    isTechnologyUnlocked(id) {
      return this.save.isTechnologyUnlocked(id);
    }

    isSecretLayerUnlocked() {
      return this.isTechnologyUnlocked('secret_layer');
    }

    /** ---------------- Protocol Evolution System ---------------- */

    getProtocolEvolutionStage(protocolId) {
      return this.save.getProtocolEvolutionStage(protocolId);
    }

    getProtocolEvolutionLabel(protocolId) {
      return EVOLUTION_STAGE_LABELS[this.getProtocolEvolutionStage(protocolId)] || EVOLUTION_STAGE_LABELS[0];
    }

    isProtocolEvolutionMaxed(protocolId) {
      return this.getProtocolEvolutionStage(protocolId) >= EVOLUTION_STAGE_LABELS.length - 1;
    }

    /**
     * @returns {{dataCost:number, fragmentCost:number, archiveRequirement:number}}
     * STEP29: Protocol Engineerの「Evolution Cost Down」Perk所持時、dataCost/fragmentCostに
     * 割引率を掛ける（archiveRequirementは所持Protocol数の条件のため割引対象外）
     */
    getEvolutionCost(protocolId) {
      const stage = this.getProtocolEvolutionStage(protocolId);
      const discount = this.identityManager ? this.identityManager.getEvolutionCostReduction() : 0;
      return {
        dataCost: Math.round((stage + 1) * 300 * (1 - discount)),
        fragmentCost: Math.round((stage + 1) * 3 * (1 - discount)),
        archiveRequirement: (stage + 1) * 2
      };
    }

    canEvolveProtocol(protocolId) {
      if (this.isProtocolEvolutionMaxed(protocolId)) return false;
      const cost = this.getEvolutionCost(protocolId);
      return this.getPermanentResearchData() >= cost.dataCost
        && this.save.getProtocolFragments() >= cost.fragmentCost
        && this.save.getUnlockedProtocols().length >= cost.archiveRequirement;
    }

    evolveProtocol(protocolId) {
      if (!this.canEvolveProtocol(protocolId)) return false;
      const cost = this.getEvolutionCost(protocolId);
      this.save.spendPermanentResearchData(cost.dataCost);
      this.save.spendProtocolFragments(cost.fragmentCost);
      this.save.setProtocolEvolutionStage(protocolId, this.getProtocolEvolutionStage(protocolId) + 1);
      this.save.incrementProtocolEvolutions(); // STEP29: Achievement「Protocol Creator」判定用
      return true;
    }

    /** RUN中の獲得スコアに掛ける、所持中Protocolの進化段階による追加ボーナス（未進化なら0） */
    getProtocolEvolutionScoreBonus(activeProtocolIds) {
      return (activeProtocolIds || []).reduce((sum, id) => sum + this.getProtocolEvolutionStage(id) * 0.1, 0);
    }
  }

  G.MetaProgression = MetaProgression;
})(typeof globalThis !== 'undefined' ? globalThis : this);
