/**
 * protocols.js
 * ENDLESS RESEARCHのRUN開始時に選択する「Protocol」の定義データ。
 * このファイルは純粋なデータ（+参照用の小さなヘルパー）のみを持ち、
 * 効果の適用ロジックは持たない（protocolManager.jsの責務）。
 *
 * データ形式: { id, name, description, effects, rarity, unlock }
 *   - id: 一意なID
 *   - name: 表示名
 *   - description: プレイヤー向けの効果説明（日本語）
 *   - effects: protocolManager.jsが解釈する汎用的な効果記述。
 *     未定義のキーは「効果なし（倍率なら1、加算なら0）」として扱われる。
 *   - rarity: 'common'|'rare'|'legendary'。Protocol Archive（protocolArchive.js）の
 *     表示用（未発見のProtocolでもレア度だけは表示する）
 *   - unlock: protocolUnlock.jsが解釈する解放条件 { type, value }。
 *     このファイル（RUN開始時のProtocol Selectで提示される基本3種）は
 *     全て`{ type: 'always' }`＝初期状態から常に解放済み
 *
 * Phase A時点ではRUN開始時に1つを選んだらRUN終了までそのまま
 * （Protocol交換・解放・シナジーはPhase Bで実装、Season ModifierはPhase C時点でも
 * 未対応。README参照）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    {
      id: 'explorer',
      name: 'Explorer',
      description: 'ライフ+1。その代わり獲得スコアが×0.9になる',
      effects: { lifeBonus: 1, scoreMultiplier: 0.9 },
      rarity: 'common',
      unlock: { type: 'always' }
    },
    {
      id: 'analyst',
      name: 'Analyst',
      description: 'PERFECTボーナスが+50%、コンボボーナスが+20%になる',
      effects: { perfectBonusMultiplier: 1.5, comboBonusMultiplier: 1.2 },
      rarity: 'common',
      unlock: { type: 'always' }
    },
    {
      id: 'overclock',
      name: 'Overclock',
      description: '目標難易度が+1段階される。その代わり獲得スコアが×1.5になる',
      effects: { difficultyTierOffset: 1, scoreMultiplier: 1.5 },
      rarity: 'common',
      unlock: { type: 'always' }
    }
  ];

  const BY_ID = new Map(ALL.map(p => [p.id, p]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  G.Protocols = { ALL, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
