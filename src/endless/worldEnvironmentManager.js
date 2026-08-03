/**
 * worldEnvironmentManager.js
 * STEP30-1「Environment Framework」。現在のResearch Layerに紐づくWorldEnvironment
 * （worldEnvironment.js参照）の管理クラス。metaProgression.js/identityManager.jsと
 * 同じ設計: 実際の永続化はendlessSave.jsへ完全に委譲し、本クラス自身は状態を
 * 持たない。将来のEnvironment Modifier/World Mutation/Environment Event/Stability
 * 変化（STEP30-2以降）へのAPI提供口として、今回は「現在Environment取得・Layerからの
 * 解決・テーマ情報取得・解放管理」のみを実装する（要求仕様セクション0の方針どおり）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { WorldEnvironment } = G;

  const RANDOM_BAND_SIZE = 5; // Layer26以降のランダム選出も5Layerごとに固定し、Layer1-25と同じ体感速度にする

  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  class WorldEnvironmentManager {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス */
    constructor({ save }) {
      this.save = save;
    }

    _isConditionMet(condition, layer) {
      if (!condition || condition.type === 'always') return true;
      if (condition.type === 'layer') return layer >= condition.value;
      return false;
    }

    /**
     * @param {number} layer 現在のResearch Layer（RUN内のDepthそのもの）
     * @returns {Object} 対応するWorldEnvironment定義
     */
    getEnvironmentByLayer(layer) {
      const safeLayer = Math.max(1, layer || 1);
      const fixedId = WorldEnvironment.getFixedIdForLayer(safeLayer);
      if (fixedId) return WorldEnvironment.getById(fixedId);

      // Layer26以降: 5Layerごとのバンド単位で、解放条件を満たしているEnvironmentの中から
      // 決定的に（同じバンドなら常に同じ結果になるよう）1つ選ぶ
      const band = Math.floor((safeLayer - WorldEnvironment.RANDOM_START_LAYER) / RANDOM_BAND_SIZE);
      const pool = WorldEnvironment.ALL.filter(e => this._isConditionMet(e.unlockCondition, safeLayer));
      if (pool.length === 0) return WorldEnvironment.getById(WorldEnvironment.DEFAULT_ID);
      const picked = pool[hashString(`world-env-band-${band}`) % pool.length];
      return picked || WorldEnvironment.getById(WorldEnvironment.DEFAULT_ID);
    }

    /** @returns {Object} 現在保存されているEnvironment（未保存/不正値ならDEFAULT_ID） */
    getCurrentEnvironment() {
      const id = this.save.getCurrentWorldEnvironmentId();
      return WorldEnvironment.getById(id) || WorldEnvironment.getById(WorldEnvironment.DEFAULT_ID);
    }

    /**
     * Layer移動のたびに呼ぶ。Layerに対応するEnvironmentを確定させ、現在値の保存・
     * 解放判定・発見記録までまとめて行う。
     * @param {number} layer
     * @returns {{def:Object, changed:boolean}} changedは直前の確定Environmentから変わったか
     *   （HUD演出を「変化した瞬間だけ」出すための判定に使う）
     */
    setCurrentEnvironment(layer) {
      const def = this.getEnvironmentByLayer(layer);
      const before = this.save.getCurrentWorldEnvironmentId();
      const changed = before !== def.id;
      this.save.setCurrentWorldEnvironmentId(def.id);
      this.unlockEnvironment(def.id);
      this.save.recordWorldEnvironmentDiscovery(def.id);
      return { def, changed };
    }

    /** @returns {boolean} 新規解放ならtrue */
    unlockEnvironment(id) {
      return this.save.unlockWorldEnvironment(id);
    }

    isUnlocked(id) {
      return this.save.isWorldEnvironmentUnlocked(id);
    }

    /** ---------------- Visual Theme Framework / BGM Integration Hook ---------------- */

    getTheme() {
      return this.getCurrentEnvironment().theme;
    }

    getBackground() {
      return this.getCurrentEnvironment().background;
    }

    getUIColor() {
      return this.getCurrentEnvironment().uiColor;
    }

    /** BGM再生自体は未実装。識別子の取得のみ将来のBGM実装向けに提供する */
    getBgmId() {
      return this.getCurrentEnvironment().bgmId;
    }
  }

  G.WorldEnvironmentManager = WorldEnvironmentManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
