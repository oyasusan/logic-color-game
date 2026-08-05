/**
 * nodeTypes.js
 * Map Generation Systemが生成するMap Node 8種の定義データ。
 * このファイルは純粋なデータ（+参照用の小さなヘルパー）のみを持ち、実際に
 * どの深さでどの種類がどんな比率で出るか（生成ロジック）はmapGenerator.jsの、
 * 選ばれた後の実処理（パズル開始/Event適用/Lab表示等）はendless.jsの責務。
 *
 * データ形式: { id, name, icon, risk, reward, description }
 *   - risk: 'NONE'|'LOW'|'MEDIUM'|'HIGH'|'VERY_HIGH'|'UNKNOWN'（表示・危険度の目安）
 *   - reward: プレイヤー向けの短い報酬説明
 *   - description: Node種類そのものの説明文
 * 実際にMapへ生成される個々のNodeインスタンスは、この定義をベースに
 * mapGenerator.jsが（Modifierの付与・Unknownの中身の事前決定等を含めて）組み立てる。
 *
 * 【Elite変種からの変更】Elite Nodeの特殊条件は、当初このファイルの
 * `ELITE_VARIANTS`（3種、1つだけ付与）として実装していたが、Puzzle Evolution
 * System導入に伴い`puzzleModifier.js`の5種Modifier（複数付与対応）に置き換えた。
 * `ELITE_VARIANTS`は完全に不要になったため削除している（Elite Node自体の定義
 * ＝TYPES.eliteは引き続きここに残る）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const TYPES = {
    // STEP41-1: Cognitive Neural Mapping System。表示名/説明文のみ変更（id='puzzle'は
    // 既存のUNKNOWN_RESOLVABLE_TYPES・mapGenerator.js・endless.js等が参照するため無変更）
    puzzle: {
      id: 'puzzle', name: 'Cognitive Analysis', icon: '🧩',
      risk: 'LOW', reward: 'スコア',
      description: 'Memory Nodeの解析作業。失われたCognitive Mapを復元しスコアを獲得する'
    },
    event: {
      id: 'event', name: 'Event', icon: '✨',
      risk: 'MEDIUM', reward: '良し悪し不確定',
      description: 'ライフ回復/コンボリセット/Upgrade獲得等、ランダムな効果が即座に発生する'
    },
    research_lab: {
      id: 'research_lab', name: 'Research Lab', icon: '🔬',
      risk: 'NONE', reward: 'Upgrade獲得',
      description: '3択からUpgradeを1つ選んで獲得できる安全地帯'
    },
    elite: {
      id: 'elite', name: 'Elite', icon: '⚠️',
      risk: 'HIGH', reward: '高スコア + Protocol Fragment',
      description: '特殊条件付きの高難度パズル。クリアできれば報酬も大きい'
    },
    recovery: {
      id: 'recovery', name: 'Recovery', icon: '❤️',
      risk: 'NONE', reward: 'ライフ回復',
      description: 'パズルを解かずに即座にライフを回復できる安全地帯'
    },
    protocol_signal: {
      id: 'protocol_signal', name: 'Protocol Signal', icon: '📡',
      risk: 'NONE', reward: 'Protocol強化',
      description: '新しいProtocolをMerge/Replaceできる（詳細はprotocolSignal.js参照）'
    },
    unknown: {
      id: 'unknown', name: 'Unknown', icon: '❓',
      risk: 'UNKNOWN', reward: '???',
      description: '中身は選ぶまで分からない。実際には他の種類のいずれかが起こる'
    },
    boss: {
      id: 'boss', name: 'Boss', icon: '💀',
      risk: 'VERY_HIGH', reward: '大量スコア + Protocol Fragment',
      description: '固定Depthに出現する強大なBoss Puzzle。避けて通れない'
    },
    // STEP32: Story Scenario Framework セクション7。Puzzleを介さず、施設に眠る
    // 物語の断片に触れる安全地帯（STORY RESEARCH各CASEの正史とは独立した、
    // Endless RESEARCH世界線側の断片。storyNode.js参照）
    story: {
      id: 'story', name: 'Story', icon: '📖',
      risk: 'NONE', reward: '物語の断片',
      description: '施設に眠る、まだ語られていない記録の断片に触れる安全地帯'
    }
  };

  /** Unknown Nodeが実際に解決しうる種類（Lab/Signal/Boss/Unknown自身は対象外） */
  const UNKNOWN_RESOLVABLE_TYPES = ['puzzle', 'event', 'elite', 'recovery'];

  function getType(id) {
    return TYPES[id] || null;
  }

  G.NodeTypes = { TYPES, UNKNOWN_RESOLVABLE_TYPES, getType };
})(typeof globalThis !== 'undefined' ? globalThis : this);
