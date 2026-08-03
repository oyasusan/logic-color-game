/**
 * identityManager.js
 * STEP29「Research Identity System」。選択中のResearch Identity（researchIdentity.js
 * 参照）の状態管理・EXP加算・レベルアップ・Perk自動解放・効果集計を担当する。
 *
 * metaProgression.jsと同じ設計: 実際の永続化はendlessSave.jsへ完全に委譲し、
 * 本クラス自身は状態を持たない（save.load()済みのEndlessSaveStoreインスタンスを
 * 都度参照する）。Protocol（RUNごとにreset()される）とは異なり、Identityは
 * 「一度選んだらRUNをまたいでずっと育つ」ため、reset()メソッドを持たない。
 *
 * 効果集計は researchTree.js / metaProgression._effectTotal() と同じ規約:
 * primaryBonus・secondaryBonus・解放済みPerkのeffectを横断してtype別に加算し、
 * 乗算系（〜Multiplier）は呼び出し側で「1 + 合計値」にする。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { ResearchIdentity } = G;

  class IdentityManager {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス */
    constructor({ save }) {
      this.save = save;
    }

    /** ---------------- 選択・基本情報 ---------------- */

    isSelected() {
      return !!this.save.getSelectedIdentityId();
    }

    getSelectedId() {
      return this.save.getSelectedIdentityId();
    }

    getSelectedDef() {
      const id = this.getSelectedId();
      return id ? ResearchIdentity.getById(id) : null;
    }

    /** 新規プレイ開始時のIdentity選択画面から一度だけ呼ばれる想定 */
    select(id) {
      if (!ResearchIdentity.getById(id)) return false;
      this.save.setSelectedIdentityId(id);
      return true;
    }

    /** Hybrid Identity System（データ構造のみ。現時点でUI選択の呼び出し口は無い） */
    getSecondaryId() {
      return this.save.getSecondaryIdentityId();
    }

    setSecondary(id) {
      this.save.setSecondaryIdentityId(id);
    }

    /** @returns {string|null} Hybrid組み合わせ表示名。secondary未設定ならnull */
    getHybridLabel() {
      const primaryId = this.getSelectedId();
      const secondaryId = this.getSecondaryId();
      if (!primaryId || !secondaryId) return null;
      return ResearchIdentity.getHybridLabel(primaryId, secondaryId);
    }

    /** ---------------- Level / EXP ---------------- */

    getLevel() {
      return this.save.getIdentityLevel();
    }

    getExp() {
      return this.save.getIdentityExp();
    }

    isMaxLevel() {
      return this.getLevel() >= ResearchIdentity.MAX_LEVEL;
    }

    getExpRequiredForNextLevel() {
      return ResearchIdentity.getExpRequiredForLevel(this.getLevel());
    }

    getLevelTitle() {
      const id = this.getSelectedId();
      if (!id) return '';
      return ResearchIdentity.getLevelTitle(id, this.getLevel());
    }

    /**
     * 関連Node攻略/関連Reward取得のたびに呼ぶ。未選択時は何もしない。
     * @param {string} source researchIdentity.jsのexpSourcesキー
     * @returns {{gained:number, leveledUp:boolean, newLevel:number, newlyUnlockedPerks:Array<Object>}}
     */
    addExp(source) {
      const identityId = this.getSelectedId();
      if (!identityId) return { gained: 0, leveledUp: false, newLevel: this.getLevel(), newlyUnlockedPerks: [] };

      const gained = ResearchIdentity.getExpForSource(identityId, source);
      if (gained <= 0) return { gained: 0, leveledUp: false, newLevel: this.getLevel(), newlyUnlockedPerks: [] };

      let exp = this.getExp() + gained;
      let level = this.getLevel();
      let leveledUp = false;

      while (level < ResearchIdentity.MAX_LEVEL) {
        const required = ResearchIdentity.getExpRequiredForLevel(level);
        if (exp < required) break;
        exp -= required;
        level++;
        leveledUp = true;
      }
      if (level >= ResearchIdentity.MAX_LEVEL) exp = 0; // MAX到達後は超過分を切り捨てる

      this.save.setIdentityProgress(exp, level);

      const newlyUnlockedPerks = leveledUp ? this._checkPerkUnlocks() : [];
      return { gained, leveledUp, newLevel: level, newlyUnlockedPerks };
    }

    /** @returns {Array<Object>} 今回新たに解放されたPerk定義の一覧 */
    _checkPerkUnlocks() {
      const def = this.getSelectedDef();
      if (!def) return [];
      const level = this.getLevel();
      const unlocked = this.save.getUnlockedIdentityPerks();
      const newly = [];
      def.perkTree.forEach(perk => {
        if (level < perk.unlockLevel) return;
        if (unlocked.indexOf(perk.id) !== -1) return;
        this.save.unlockIdentityPerk(perk.id);
        newly.push(perk);
      });
      return newly;
    }

    /** @returns {Array<Object>} 選択中Identityの、解放済みPerk定義の一覧 */
    getUnlockedPerkDefs() {
      const def = this.getSelectedDef();
      if (!def) return [];
      const unlocked = new Set(this.save.getUnlockedIdentityPerks());
      return def.perkTree.filter(p => unlocked.has(p.id));
    }

    /** ---------------- 効果集計（researchTree.js/metaProgression.jsと同じ規約） ---------------- */

    _allEffectSources() {
      const def = this.getSelectedDef();
      if (!def) return [];
      return [def.primaryBonus, def.secondaryBonus].concat(this.getUnlockedPerkDefs().map(p => p.effect));
    }

    _effectTotal(type) {
      return this._allEffectSources().reduce((sum, e) => sum + (e && e.type === type ? e.value : 0), 0);
    }

    getUnknownRevealChanceBonus() {
      return this._effectTotal('unknownRevealChance');
    }

    /** 現行4 IdentityではscoreMultiplier型のeffectを持たないが、endless.js側の
     * 「各ソースの倍率を横断して掛け合わせる」既存の乗算パターンに揃えるため用意する */
    getScoreMultiplier() {
      return 1 + this._effectTotal('scoreMultiplier');
    }

    getUnknownRewardMultiplier() {
      return 1 + this._effectTotal('unknownRewardMultiplier');
    }

    getExtraMapChoices() {
      return Math.round(this._effectTotal('extraMapChoices'));
    }

    getFragmentGainMultiplier() {
      return 1 + this._effectTotal('fragmentGainMultiplier');
    }

    getStartingFragmentBonus() {
      return Math.round(this._effectTotal('startingFragmentBonus'));
    }

    getLifeBonus() {
      return this._effectTotal('lifeBonus');
    }

    /** ミス時のライフ損失に掛ける倍率（Survivalistのマイナス効果で1未満になりうる。0未満にはしない） */
    getMissPenaltyMultiplier() {
      return Math.max(0, 1 + this._effectTotal('missPenaltyMultiplier'));
    }

    getPerfectBonusMultiplier() {
      return 1 + this._effectTotal('perfectBonusMultiplier');
    }

    getComboBonusMultiplier() {
      return 1 + this._effectTotal('comboBonusMultiplier');
    }

    /** Protocol Engineer「Evolution Cost Down」: metaProgression.getEvolutionCost()から参照される */
    getEvolutionCostReduction() {
      return Math.min(0.5, this._effectTotal('evolutionCostReduction'));
    }

    /** Protocol Engineer「Synergy Boost」: Synergy発動中のみendless.js側が乗算する */
    getSynergyScoreMultiplier() {
      return 1 + this._effectTotal('synergyScoreMultiplier');
    }

    /** Survivalist「Recovery System」: ライフ自動回復に必要なクリア間隔の短縮量 */
    getLifeRegenIntervalBonus() {
      return Math.round(this._effectTotal('lifeRegenIntervalBonus'));
    }
  }

  G.IdentityManager = IdentityManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
