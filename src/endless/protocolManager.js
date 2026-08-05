/**
 * protocolManager.js
 * 現在のRUNでActiveなProtocol（最大2個、protocols.js / protocolSignals.js参照）を
 * 管理する。RUNごとにreset()されるメモリ上の状態のみを持ち、LocalStorageには
 * 一切保存しない（RUN終了で必ずリセットされ、ベスト記録にも影響しない）。
 *
 * Phase A（単一Protocol）からPhase B（複数Protocol管理）への変更点:
 *   - `selectedId`（単一）を`activeProtocols`（配列、最大MAX_SLOTS=2）に変更
 *   - RUN開始時のProtocol Select（1個目、protocolSelect.js）はselect()、
 *     Depth5ごとのProtocol Signal（protocolSignal.js）でのMerge/Replaceは
 *     merge()/replace()を使う
 *   - 効果計算（getXxx系）はActive中の全Protocol + 発動中の全Synergy
 *     （protocolSynergy.js）を横断して合算する。合算ルールは効果の性質によって
 *     異なる:
 *       - lifeBonus / difficultyTierOffset: 加算（例: 0 + (-1) = -1）
 *       - scoreMultiplier / perfectBonusMultiplier / comboBonusMultiplier: 乗算
 *         （例: Explorer×0.9 と Overclock×1.5 を両方所持 -> 0.9*1.5=1.35）
 *       - perfectImmuneToHint: 真偽値のOR（1つでも所持していれば有効）
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { Protocols, ProtocolSignals, ProtocolSynergy } = G;

  const MAX_SLOTS = 2;

  class ProtocolManager {
    constructor() {
      this.activeProtocols = []; // Protocol idの配列（所持順=スロット順、最大MAX_SLOTS個）
    }

    /** RUN開始時（Protocol Select前）に呼ぶ。所持状態を完全にクリアする */
    reset() {
      this.activeProtocols = [];
    }

    /** protocols.js（基本3種）/ protocolSignals.js（Signal限定4種）のどちらからでも定義を引けるようにする */
    _getDef(id) {
      const base = Protocols.getById(id);
      if (base) return base;
      return ProtocolSignals ? ProtocolSignals.getById(id) : null;
    }

    hasSlotAvailable() {
      return this.activeProtocols.length < MAX_SLOTS;
    }

    isActive(id) {
      return this.activeProtocols.indexOf(id) !== -1;
    }

    /** @returns {string[]} Active中のProtocol idの配列（コピー） */
    getActiveIds() {
      return this.activeProtocols.slice();
    }

    /** @returns {Array<Object>} Active中のProtocol定義の配列 */
    getActiveDefs() {
      return this.activeProtocols.map(id => this._getDef(id)).filter(Boolean);
    }

    /**
     * RUN開始時のProtocol Select専用。空きスロットへ1つ追加する。
     * @returns {Object|null} 追加できた場合は定義、不正なid・空きスロット無しの場合はnull
     */
    select(id) {
      if (!this.hasSlotAvailable()) return null;
      const def = this._getDef(id);
      if (!def) return null;
      if (this.isActive(id)) return def;
      this.activeProtocols.push(id);
      return def;
    }

    /** Protocol Signalの「Merge」選択。空きスロットへ追加する（selectと実質同じ処理） */
    merge(id) {
      return this.select(id);
    }

    /**
     * STEP40-1: Continue System。保存されていたActive Protocol id一覧をそのまま復元する。
     * 無効なid・MAX_SLOTSを超える分は静かに無視する（Save側のデータ破損に対する耐性）。
     */
    restore(ids) {
      this.activeProtocols = (ids || []).filter(id => this._getDef(id)).slice(0, MAX_SLOTS);
    }

    /**
     * Protocol Signalの「Replace」選択。指定した所持中のoldIdをnewIdへ置き換える。
     * @returns {Object|null} 置換できた場合は新Protocolの定義、oldIdを所持していない場合はnull
     */
    replace(oldId, newId) {
      const idx = this.activeProtocols.indexOf(oldId);
      if (idx === -1) return null;
      const def = this._getDef(newId);
      if (!def) return null;
      this.activeProtocols[idx] = newId;
      return def;
    }

    /** @returns {Array<Object>} 現在Active中の2個の組み合わせで発動しているSynergy定義の一覧（0個か1個） */
    getActiveSynergies() {
      return ProtocolSynergy ? ProtocolSynergy.findActive(this.activeProtocols) : [];
    }

    /** Active中の全Protocol + 発動中の全Synergyのeffectsオブジェクトをまとめて返す（効果集計の内部ヘルパー） */
    _allEffectSources() {
      const protocolEffects = this.getActiveDefs().map(d => d.effects || {});
      const synergyEffects = this.getActiveSynergies().map(s => s.effects || {});
      return protocolEffects.concat(synergyEffects);
    }

    _sumEffect(key) {
      return this._allEffectSources().reduce((total, e) => total + (e[key] || 0), 0);
    }

    _productEffect(key) {
      return this._allEffectSources().reduce((total, e) => total * (key in e ? e[key] : 1), 1);
    }

    _hasBooleanEffect(key) {
      return this._allEffectSources().some(e => !!e[key]);
    }

    /** Explorer(+1)等、Active中の全Protocol+Synergyの加算合計。ChaosのようにマイナスもありうるためRUN側で下限クランプすること */
    getLifeBonus() {
      return this._sumEffect('lifeBonus');
    }

    /** Explorer(×0.9)/Overclock(×1.5)等、Active中の全Protocol+Synergyの乗算合計 */
    getScoreMultiplier() {
      return this._productEffect('scoreMultiplier');
    }

    /** Analyst(×1.5)/Precision(×1.3)等、PERFECTボーナス部分の乗算合計 */
    getPerfectBonusMultiplier() {
      return this._productEffect('perfectBonusMultiplier');
    }

    /** Analyst(×1.2)/Minimal(×1.1)等、コンボボーナス部分の乗算合計 */
    getComboBonusMultiplier() {
      return this._productEffect('comboBonusMultiplier');
    }

    /** Overclock(+1)/Minimal(-1)等、目標Difficulty Tierへの加算合計 */
    getDifficultyTierOffset() {
      return this._sumEffect('difficultyTierOffset');
    }

    /** Oracle: HINTを使用してもPERFECT扱いのままになるか */
    hasPerfectImmuneToHint() {
      return this._hasBooleanEffect('perfectImmuneToHint');
    }
  }

  G.ProtocolManager = ProtocolManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
