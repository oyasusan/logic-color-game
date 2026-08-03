/**
 * unknownEvents.js
 * STEP27「Unknown Node Event System」。Unknown Node（Research Map上の"???"）で
 * ANALYZEを選んだ際に発生する7種類のランダムイベントの定義データ。
 * events.js（Event Node用の5種、既存のPhase3から変更無し）とは別のプールで、
 * 旧来のUnknown Node解決（mapGenerator.jsのresolvedNodeへ即座に差し替えるだけ
 * だった単純な仕組み）を置き換える形でendless.js（`_resolveUnknownNode`）から
 * 呼ばれる。実際の効果適用・画面遷移の分岐はendless.js側の責務で、本ファイルは
 * 純粋なデータ＋抽選のみを持つ（upgrades.js/events.jsと同じ設計）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    { id: 'rare_upgrade', name: 'Rare Upgrade Discovered', description: 'ランダムなRare Upgradeを1つ獲得する', effect: { type: 'rareUpgrade' } },
    { id: 'protocol_fragment', name: 'Protocol Fragment Cache', description: 'Protocol Fragmentを獲得する', effect: { type: 'protocolFragment', value: 5 } },
    { id: 'research_data_surge', name: 'Research Data Surge', description: 'Research Dataを大量に獲得する', effect: { type: 'researchData', value: 300 } },
    { id: 'system_corruption', name: 'System Corruption', description: 'ライフが減少する', effect: { type: 'lifeLoss', value: 1 } },
    { id: 'elite_shift', name: 'Elite Signal Shift', description: '解析対象がElite Nodeへと変質する', effect: { type: 'eliteShift' } },
    { id: 'secret_room', name: 'Secret Room', description: '隠された小部屋を発見し、複数の小さな報酬を得る', effect: { type: 'secretRoom' } },
    { id: 'boss_shortcut', name: 'Boss Shortcut', description: '次のBOSSへの経路が短絡接続される', effect: { type: 'bossShortcut' } },
    // STEP28: Meta ProgressionのResearch Rank4到達で解放される追加イベント
    {
      id: 'temporal_echo',
      name: 'Temporal Echo',
      description: '過去の解析データが蘇り、Protocol FragmentとResearch Dataの両方を獲得する',
      effect: { type: 'temporalEcho', fragmentValue: 4, dataValue: 200 },
      unlock: { type: 'metaRank', value: 4 }
    }
  ];

  const BY_ID = new Map(ALL.map(e => [e.id, e]));

  /**
   * @param {number} [currentRank] STEP28: Meta ProgressionのResearch Rank番号(1〜6)。
   *   `unlock`フィールド付きイベント（現時点ではTemporal Echoのみ）は、この値が
   *   条件を満たすまで抽選対象から除外される（既存イベントはunlockフィールドが
   *   無いため常に対象のまま、後方互換）。
   */
  function pickEvent(currentRank) {
    const pool = ALL.filter(e => !e.unlock || (currentRank || 0) >= e.unlock.value);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  G.UnknownEvents = { ALL, pickEvent, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
