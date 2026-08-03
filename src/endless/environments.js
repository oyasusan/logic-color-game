/**
 * environments.js
 * ENDLESS RESEARCHのRUN開始時（Protocol Select完了後のEnvironment Detection画面）で
 * 選択する「Research Environment」の定義データ。Protocolがプレイヤーの戦略選択なのに
 * 対し、EnvironmentはRUNごとに異なる環境条件を与える「その場の舞台設定」で、
 * 同じProtocol構成でも毎回違う攻略を要求されるようにする（README参照）。
 *
 * このファイルは純粋なデータ（+参照用の小さなヘルパー）のみを持ち、効果の適用
 * ロジックは持たない（environmentManager.jsの責務）。
 *
 * データ形式: { id, name, description, effects }
 *   - effects: environmentManager.jsが解釈する汎用的な効果記述。
 *     未定義のキーは「効果なし」として扱われる。キーの意味・合算ルールは
 *     protocolManager.jsの対応するキーと共通（scoreMultiplier系は乗算、
 *     difficultyTierOffsetは加算）で、Protocol側の効果と独立に積み重なる
 *     （例: Deep Research(+1 Tier) + Overclock Protocol(+1 Tier) = 合計+2）。
 *   - Unstable SystemのみRUN開始時に他5種からランダムに1つの効果を借用する
 *     特殊挙動で、`effects`を持たず`environmentManager.js`側で解決する。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    {
      id: 'normal_signal',
      name: 'Normal Signal',
      description: '効果なし。ノイズの無いクリーンな信号',
      effects: {}
    },
    {
      id: 'blue_spectrum',
      name: 'Blue Spectrum',
      description: '生成される問題がBLUEの多い構成に偏る。BLUEマスの割合が高いほど獲得スコアが最大+30%される',
      effects: { blueBias: true, blueRewardMultiplier: 1.3 }
    },
    {
      id: 'signal_noise',
      name: 'Signal Noise',
      description: 'Event Nodeの発生率が+30%される',
      effects: { eventRateMultiplier: 1.3 }
    },
    {
      id: 'critical_logic',
      name: 'Critical Logic',
      description: 'PERFECTボーナスが×2になる。その代わりミス（タイムアップ）時に失うライフが2倍になる',
      effects: { perfectBonusMultiplier: 2, missPenaltyMultiplier: 2 }
    },
    {
      id: 'deep_research',
      name: 'Deep Research',
      description: '目標Difficulty Tierが+1段階される。その代わりProtocol Fragmentの獲得量が×2になる',
      effects: { difficultyTierOffset: 1, fragmentMultiplier: 2 }
    },
    {
      id: 'unstable_system',
      name: 'Unstable System',
      description: 'RUN開始時、他5種のEnvironmentから1つがランダムに選ばれ、その効果がこのRUNに適用される（開始するまで何が出るか分からない）',
      effects: null
    }
  ];

  const BY_ID = new Map(ALL.map(e => [e.id, e]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  G.Environments = { ALL, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
