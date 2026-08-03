/**
 * environmentManager.js
 * RUN開始時（Protocol Select完了後）に表示するEnvironment Detection画面（DOM描画・
 * カード選択）と、選択されたEnvironmentの効果を管理する。Protocol系が
 * data(protocols.js)/manager(protocolManager.js)/screen(protocolSelect.js)の3ファイルに
 * 分かれているのに対し、Environmentは「RUN開始時に1つ選ぶだけ」というProtocol Select
 * (Phase A)相当の単純な状態のみで足りるため、状態管理とDetection画面の描画を
 * このファイル1つにまとめている（要求仕様のファイル構成に合わせた設計）。
 *
 * RUNごとにreset()されるメモリ上の状態のみを持ち、効果自体はLocalStorageに
 * 保存しない（保存されるのは「発見済みEnvironment一覧」のみ。endlessSave.js参照）。
 *
 * Unstable System: 選択された時点でRUN開始時に他5種からランダムに1つを内部的に
 * 「解決先(resolved)」として選び直す。selectedId（プレイヤーが選んだ表示上の
 * Environment＝常にUnstable System）と、resolvedId（実際に効果を持つEnvironment）を
 * 分けて保持する（他のEnvironmentではselectedId===resolvedId）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { Environments } = G;

  class EnvironmentManager {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     */
    constructor({ ui }) {
      this.ui = ui;
      this.onSelect = null; // (resolvedDef) => {} RUN初期化のトリガー
      this.selectedId = null;  // プレイヤーが選んだEnvironment id
      this.resolvedId = null;  // 実際に効果を持つEnvironment id（Unstable System以外はselectedIdと同じ）

      this.el = {
        cards: document.getElementById('environmentDetectCards'),
        backBtn: document.getElementById('environmentDetectBackBtn')
      };

      if (this.el.backBtn) {
        this.el.backBtn.addEventListener('click', () => {
          if (this.onBack) this.onBack();
        });
      }
    }

    /** RUN開始時（Protocol Select完了直後）に呼ぶ。選択状態を完全にクリアする */
    reset() {
      this.selectedId = null;
      this.resolvedId = null;
    }

    /** ---------------- Detection画面（DOM描画） ---------------- */

    show() {
      this._renderChoices();
      this.ui.showScreen('environmentDetect');
    }

    _renderChoices() {
      const container = this.el.cards;
      if (!container) return;
      container.innerHTML = '';

      Environments.ALL.forEach(def => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'lab-card environment-card';
        card.innerHTML = `
          <span class="lab-card-name">${def.name}</span>
          <span class="lab-card-desc">${def.description}</span>
        `;
        card.addEventListener('click', () => this._select(def.id));
        container.appendChild(card);
      });
    }

    /** ---------------- 選択・解決 ---------------- */

    _select(id) {
      const def = Environments.getById(id);
      if (!def) return;
      this.selectedId = id;
      this.resolvedId = id === 'unstable_system' ? this._rollRandom() : id;
      if (this.onSelect) this.onSelect(this.getResolved());
    }

    /** Unstable System専用: 自分自身を除く他5種から1つをランダムに選ぶ */
    _rollRandom() {
      const candidates = Environments.ALL.filter(def => def.id !== 'unstable_system');
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      return picked.id;
    }

    getSelectedId() { return this.selectedId; }
    getResolvedId() { return this.resolvedId; }

    /** @returns {Object|null} プレイヤーが選んだEnvironmentの定義（表示用。常にUnstable Systemを含む） */
    getSelected() {
      return this.selectedId ? Environments.getById(this.selectedId) : null;
    }

    /** @returns {Object|null} 実際に効果を持つEnvironmentの定義 */
    getResolved() {
      return this.resolvedId ? Environments.getById(this.resolvedId) : null;
    }

    /** Unstable Systemが選ばれ、かつ表示上の選択と実際の効果元が異なるか */
    isUnstableRoll() {
      return this.selectedId === 'unstable_system' && this.resolvedId !== this.selectedId;
    }

    _effect(key, fallback) {
      const def = this.getResolved();
      if (!def || !def.effects || !(key in def.effects)) return fallback;
      return def.effects[key];
    }

    /** Deep Research/Environment側のDifficulty Tier加算分（Protocol側とは独立に加算される） */
    getDifficultyTierOffset() {
      return this._effect('difficultyTierOffset', 0);
    }

    /** Critical Logic: PERFECTボーナス部分に掛ける倍率（Protocol側の倍率とは別にさらに掛かる） */
    getPerfectBonusMultiplier() {
      return this._effect('perfectBonusMultiplier', 1);
    }

    /** Critical Logic: ミス（タイムアップ）時に失うライフの倍率 */
    getMissPenaltyMultiplier() {
      return this._effect('missPenaltyMultiplier', 1);
    }

    /** Signal Noise: Event Node発生率に掛ける倍率 */
    getEventRateMultiplier() {
      return this._effect('eventRateMultiplier', 1);
    }

    /** Deep Research: Protocol Fragment獲得量に掛ける倍率 */
    getFragmentMultiplier() {
      return this._effect('fragmentMultiplier', 1);
    }

    /** Blue Spectrum: 問題生成時、BLUEの多い構成を優先するか */
    hasBlueBias() {
      return !!this._effect('blueBias', false);
    }

    /** Blue Spectrum: BLUEマスの割合に応じた獲得スコア倍率の上限 */
    getBlueRewardMultiplier() {
      return this._effect('blueRewardMultiplier', 1);
    }
  }

  G.EnvironmentManager = EnvironmentManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
