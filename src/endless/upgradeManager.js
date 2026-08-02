/**
 * upgradeManager.js
 * 現在のRUN中に取得したアップグレード（通常Upgrade・Rare Upgrade両方）の
 * 所持状況を管理する。RUNごとに reset() されるメモリ上の状態のみを持ち、
 * LocalStorageには一切保存しない（RUN終了で必ずリセットされ、ベスト記録にも
 * 影響しない）。
 *
 * 重複所持（同じアップグレードを複数回取得）を許可し、同じeffect.typeを
 * 持つアップグレードのvalueは所持数分だけ加算される設計（例: Overclockを
 * 2つ所持 -> scoreMultiplierが0.2+0.2=0.4）。
 *
 * Upgrade Evolution: 通常Upgrade（upgrades.js）は同じものを最大MAX_LEVEL回
 * まで取得でき、効果はLv1→Lv2→Lv3と段階的に積み上がる（3を超えて取得しても
 * 効果はLv3で頭打ちになる）。Rare Upgrade（rareUpgrades.js）は進化の対象外で
 * 1回のみ取得可能（`rare:true`が付いた定義はmaxLevelが1になる）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { Upgrades } = G;

  const MAX_LEVEL = 3; // 通常Upgradeの進化上限（Lv1〜Lv3）

  class UpgradeManager {
    constructor() {
      this.owned = new Map(); // id -> 所持数(取得回数)
      this._reviveConsumed = false; // Phoenix Protocol(Rare)の使用済みフラグ
    }

    /** RUN開始時に呼ぶ。所持状態を完全にクリアする */
    reset() {
      this.owned.clear();
      this._reviveConsumed = false;
    }

    /** upgrades.js / rareUpgrades.js のどちらからでも定義を引けるようにする */
    _getDef(id) {
      const normal = Upgrades.getById(id);
      if (normal) return normal;
      return G.RareUpgrades ? G.RareUpgrades.getById(id) : null;
    }

    _maxLevelFor(def) {
      return def.rare ? 1 : MAX_LEVEL;
    }

    /** アップグレードを1つ取得する（既に所持していれば所持数を+1する＝重複管理） */
    acquire(id) {
      const def = this._getDef(id);
      if (!def) return null;
      this.owned.set(id, (this.owned.get(id) || 0) + 1);
      return def;
    }

    /** 取得済みの回数（進化上限を超えて取得した分も含む生の回数） */
    getCount(id) {
      return this.owned.get(id) || 0;
    }

    has(id) {
      return this.getCount(id) > 0;
    }

    /** 表示・効果計算用の実効レベル（進化上限でクランプ済み） */
    getLevel(id) {
      const def = this._getDef(id);
      if (!def) return 0;
      return Math.min(this.getCount(id), this._maxLevelFor(def));
    }

    /** これ以上取得しても効果が伸びない（進化上限に達している）か。候補提示時の除外判定に使う */
    isMaxed(id) {
      const def = this._getDef(id);
      if (!def) return false;
      return this.getCount(id) >= this._maxLevelFor(def);
    }

    /** @returns {Array<{id,name,category,description,effect,rare,count,level,maxLevel}>} 所持中の一覧 */
    getOwnedList() {
      return Array.from(this.owned.entries())
        .map(([id, count]) => {
          const def = this._getDef(id);
          if (!def) return null;
          return Object.assign(
            { count, level: this.getLevel(id), maxLevel: this._maxLevelFor(def) },
            def
          );
        })
        .filter(Boolean);
    }

    /** 指定effect.typeを持つ所持アップグレードのvalue合計（進化レベルを考慮済み）を返す */
    getEffectTotal(type) {
      let total = 0;
      this.owned.forEach((count, id) => {
        const def = this._getDef(id);
        if (def && def.effect && def.effect.type === type) {
          const level = Math.min(count, this._maxLevelFor(def));
          total += def.effect.value * level;
        }
      });
      return total;
    }

    /** 指定effect.typeを1つでも所持していればtrue（on/off系の効果判定用） */
    hasEffectType(type) {
      return this.getEffectTotal(type) > 0;
    }

    /** Phoenix Protocol(Rare): ライフ0の瞬間に1度だけ消費して復活できるか */
    hasUnusedRevive() {
      return this.hasEffectType('revive') && !this._reviveConsumed;
    }

    consumeRevive() {
      this._reviveConsumed = true;
    }
  }

  G.UpgradeManager = UpgradeManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
