/**
 * protocolUnlock.js
 * Protocol Archive（protocolArchive.js）/ Protocol Signal（protocolSignal.js）が
 * 参照する「Protocol解放条件」の判定ロジック。protocols.js（基本3種）と
 * protocolSignals.js（Signal限定5種）の各定義に埋め込まれた`unlock`フィールドを
 * 読み取るだけの、状態を持たない純粋な評価モジュール（boss.js/map.js等と同じ
 * データ+ヘルパー構成）。実際に「解放済みProtocol一覧」を保持・永続化するのは
 * endlessSave.js、いつ判定を呼ぶか（Depth進行時・イベント発生時・クリア時）を
 * 決めるのはendless.js側の責務。
 *
 * `unlock.type`は「達成すべき指標の名前」を表し、値は`snapshot`オブジェクトの
 * 同名キーと`value`（達成に必要な閾値）を`>=`で比較するだけの汎用ルールにしている
 * （'always'のみ特別扱いで、閾値に関係なく常にtrueを返す）。
 * snapshotの各キーの意味（endless.jsが組み立てる）:
 *   - bestDepthEver:   これまでで最も深く到達したDepth（今RUNの進行中の値も含む）
 *   - bossClearTotal:  生涯Boss撃破回数（今RUNの分も含む）
 *   - eventTotal:      生涯Event Node発生回数（今RUNの分も含む）
 *   - perfectTotal:    生涯PERFECTクリア回数（今RUNの分も含む）
 *   - life1AtDepth20:  Depth20以上にライフ1の状態で到達したことが一度でもあれば1、無ければ0
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  /** @returns {Array<Object>} protocols.js（基本3種）+ protocolSignals.js（Signal限定5種）の全定義 */
  function getAllDefs() {
    const base = G.Protocols ? G.Protocols.ALL : [];
    const signals = G.ProtocolSignals ? G.ProtocolSignals.ALL : [];
    return base.concat(signals);
  }

  /** @returns {Object|null} 全プールから定義を引く（upgradeManager._getDef等と同じ横断検索） */
  function getById(id) {
    const base = G.Protocols ? G.Protocols.getById(id) : null;
    if (base) return base;
    return G.ProtocolSignals ? G.ProtocolSignals.getById(id) : null;
  }

  /** @param {Object} def protocols.js/protocolSignals.jsの1件 @param {Object} snapshot */
  function isConditionMet(def, snapshot) {
    const condition = def && def.unlock;
    if (!condition) return false;
    if (condition.type === 'always') return true;
    const current = (snapshot && snapshot[condition.type]) || 0;
    return current >= condition.value;
  }

  /**
   * @param {Object} snapshot 現在の生涯進行状況（endless.jsが組み立てる）
   * @param {string[]} unlockedIds 既に解放済みのProtocol id一覧
   * @returns {string[]} 新たに条件を満たした（まだunlockedIdsに含まれない）Protocol idの一覧
   */
  function findNewlyUnlockable(snapshot, unlockedIds) {
    const unlockedSet = new Set(unlockedIds || []);
    return getAllDefs()
      .filter(def => !unlockedSet.has(def.id))
      .filter(def => isConditionMet(def, snapshot))
      .map(def => def.id);
  }

  /** Protocol Archiveで未発見のProtocolに表示する、解放条件の日本語ラベル */
  function getConditionLabel(def) {
    const condition = def && def.unlock;
    if (!condition) return '';
    switch (condition.type) {
      case 'always': return '初期解放済み';
      case 'bestDepthEver': return `DEPTH ${condition.value} 到達`;
      case 'bossClearTotal': return `Boss撃破 ${condition.value}回`;
      case 'eventTotal': return `Event発生 ${condition.value}回`;
      case 'perfectTotal': return `PERFECTクリア ${condition.value}回`;
      case 'life1AtDepth20': return 'ライフ1でDEPTH 20到達';
      case 'metaRank': return `Research Rank ${condition.value} 到達`; // STEP28: Meta Progression
      // STEP36: color_analyzerはChapter3 Layer11到達でも解放されるようになったため、
      // 表示ラベルへ2つ目の経路を追記する（他のscenarioReward系Protocolは従来どおり）
      case 'scenarioReward':
        if (def.id === 'color_analyzer') return `STORY RESEARCH ${String(condition.value).toUpperCase()} クリア報酬 または Chapter3 Layer11到達`;
        return `STORY RESEARCH ${String(condition.value).toUpperCase()} クリア報酬`; // STEP32: Story Scenario Framework
      default: return '???';
    }
  }

  G.ProtocolUnlock = { getAllDefs, getById, isConditionMet, findNewlyUnlockable, getConditionLabel };
})(typeof globalThis !== 'undefined' ? globalThis : this);
