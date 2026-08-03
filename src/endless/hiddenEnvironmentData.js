/**
 * hiddenEnvironmentData.js
 * STEP30-7「Hidden Environment System」。通常のWorldEnvironment（worldEnvironment.js、
 * STEP30-1、Layerに紐づく常時テーマ）とは別に、特定の達成条件を満たした時だけ
 * アクセスできる「隠しEnvironment」6種の静的定義データ。状態を持たない純粋な
 * データ＋ヘルパーのみ（worldEnvironment.js/mutationData.jsと同じ設計）。
 *
 * データ形式: { id, name, description, unlockCondition, theme, bgm, modifiers, exclusiveEvents, exclusiveRewards }
 *   - unlockCondition: { type, value }。判定はhiddenEnvironmentManager.checkUnlock()の責務。
 *     type一覧: 'unknownStreak'（RUN内のUnknown Node連続成功数）/'protocolFragmentsTotal'
 *     （生涯Protocol Fragment累計）/'researchLabVisitsTotal'（生涯Research Lab到達回数）/
 *     'bestLayer'（最高到達Layer）/'totalRuns'（生涯RUN数）/'worldCollapseNoExtract'
 *     （現在RUNがWorld Status=COLLAPSEかつExtract未実行の瞬間、の真偽判定）
 *   - modifiers: worldEnvironment.js/mutationData.jsと同じ規約の[{type,value}]配列。
 *     既存のtype語彙（rewardMultiplier/researchDataMultiplier/protocolFragmentMultiplier/
 *     puzzleDifficulty/riskChainBonus/nodeWeightMultiplier_*等）を極力再利用する
 *   - exclusiveEvents/exclusiveRewards: id配列。実体はEXCLUSIVE_EVENTS/HIDDEN_REWARDSに定義
 *
 * 【要求仕様との差分（数値・詳細指定が無かった箇所の設計判断）】:
 *   - LOST ARCHIVEの「Protocol50種類取得」は、現行の実装済みProtocol総数（8種、
 *     protocols.js3種+protocolSignals.js5種）を大きく超える数値のため文字どおりには
 *     実現不可能。同じ「Protocol」という語を持つ既存の生涯累計リソース
 *     `protocolFragments`の閾値50への到達、と読み替えて実装した
 *   - ECHO NETWORKの解放条件は要求仕様セクション4の一覧に記載が無かったため、
 *     「過去Runの残響」というテーマに沿って「生涯RUN数30到達」として設計した
 *   - PARADOX COREの「Modifier反転」「RiskとReward逆転」は、既存のModifier適用
 *     パイプライン（environmentModifierManager.js/worldMutationManager.js）の
 *     符号を汎用的に反転させる仕組みを新設すると影響範囲が広くなりすぎる
 *     （architecture rule「既存Environmentを変更しすぎない」に反する）ため、
 *     「リスクを受け入れるほど報酬も跳ね上がる」という核心の意図を保ったまま
 *     既存のrewardMultiplier/riskChainBonusを大きく積み増す設計に単純化した
 *   - GENESIS LABの「Upgrade無料」は、既存のResearchTree（有償の永続強化）へ
 *     割引を差し込むより、入場時に無料Upgradeを1つ即時付与する
 *     （`freeUpgradeInstant`）方が既存システムへの侵襲が小さいため採用した
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    {
      id: 'void_memory',
      name: 'VOID MEMORY',
      description: '失われたAI記憶が漂う領域。',
      unlockCondition: { type: 'unknownStreak', value: 5 },
      theme: '失われたAI記憶',
      bgm: 'bgm_hidden_void',
      modifiers: [
        { type: 'protocolFragmentMultiplier', value: 0.80 },
        { type: 'nodeWeightMultiplier_unknown', value: 0.50 },
        { type: 'rareEventWeightBoost', value: 0.30 }
      ],
      exclusiveEvents: ['lost_signal'],
      exclusiveRewards: ['hidden_protocol_echo']
    },
    {
      id: 'lost_archive',
      name: 'LOST ARCHIVE',
      description: '削除された研究データの残骸が眠る領域。',
      unlockCondition: { type: 'protocolFragmentsTotal', value: 50 },
      theme: '削除済み研究データ',
      bgm: 'bgm_hidden_archive',
      modifiers: [
        { type: 'researchDataMultiplier', value: 1.0 }
      ],
      exclusiveEvents: ['archive_recovery'],
      exclusiveRewards: ['hidden_archive_deleted_records']
    },
    {
      id: 'genesis_lab',
      name: 'GENESIS LAB',
      description: 'AIそのものが生まれたとされる開発施設。',
      unlockCondition: { type: 'researchLabVisitsTotal', value: 10 },
      theme: 'AI開発施設',
      bgm: 'bgm_hidden_genesis',
      modifiers: [
        { type: 'nodeWeightMultiplier_research_lab', value: 2.0 }
      ],
      exclusiveEvents: ['creator_log'],
      exclusiveRewards: ['mythic_upgrade_genesis']
    },
    {
      id: 'simulation_zero',
      name: 'SIMULATION ZERO',
      description: '最初に構築された仮想世界の残滓。',
      unlockCondition: { type: 'bestLayer', value: 100 },
      theme: '最初の仮想世界',
      bgm: 'bgm_hidden_simulation',
      modifiers: [
        { type: 'puzzleDifficulty', value: 0.50 },
        { type: 'rewardMultiplier', value: 2.0 }
      ],
      exclusiveEvents: ['simulation_glitch'],
      exclusiveRewards: ['hidden_cosmetic_simulation_frame']
    },
    {
      id: 'echo_network',
      name: 'ECHO NETWORK',
      description: '過去のRUNの残響が漂うネットワーク空間。',
      unlockCondition: { type: 'totalRuns', value: 30 },
      theme: '過去Runの残響',
      bgm: 'bgm_hidden_echo',
      modifiers: [
        { type: 'ghostRouteDisplay', value: 1 }
      ],
      exclusiveEvents: ['ghost_echo'],
      exclusiveRewards: ['hidden_cosmetic_echo_trail']
    },
    {
      id: 'paradox_core',
      name: 'PARADOX CORE',
      description: '論理そのものが崩壊した空間。',
      unlockCondition: { type: 'worldCollapseNoExtract', value: 1 },
      theme: '論理崩壊空間',
      bgm: 'bgm_hidden_paradox',
      modifiers: [
        { type: 'rewardMultiplier', value: 1.0 },
        { type: 'riskChainBonus', value: 0.50 }
      ],
      exclusiveEvents: ['logic_failure'],
      exclusiveRewards: ['legend_identity_paradox']
    }
  ];

  const BY_ID = new Map(ALL.map(e => [e.id, e]));

  // ---- Exclusive Event（要求仕様セクション8。VOID MEMORY/GENESIS LAB/PARADOX COREの
  // 3種は要求仕様の例をそのまま採用、残り3種は同じ思想でこちらが設計した） ----
  const EXCLUSIVE_EVENTS = [
    { id: 'lost_signal', name: 'LOST SIGNAL', environment: 'void_memory', message: '失われたAI残響信号を受信した。', effect: { type: 'researchDataInstant', value: 50 } },
    { id: 'archive_recovery', name: 'ARCHIVE RECOVERY', environment: 'lost_archive', message: '削除済みデータの断片を復元した。', effect: { type: 'protocolFragmentInstant', value: 4 } },
    { id: 'creator_log', name: 'CREATOR LOG', environment: 'genesis_lab', message: '開発者の記録ログを発見した。', effect: { type: 'lifeRecoveryInstant', value: 1 } },
    { id: 'simulation_glitch', name: 'SIMULATION GLITCH', environment: 'simulation_zero', message: '仮想世界の境界にノイズが走る。', effect: { type: 'researchDataInstant', value: 80 } },
    { id: 'ghost_echo', name: 'GHOST ECHO', environment: 'echo_network', message: '過去のRUNの経路が残響として再生される。', effect: { type: 'revealLastRunRoute', value: 1 } },
    { id: 'logic_failure', name: 'LOGIC FAILURE', environment: 'paradox_core', message: '論理構造がさらに不安定化する。', effect: { type: 'stabilityDelta', value: -5 } }
  ];
  const EVENTS_BY_ID = new Map(EXCLUSIVE_EVENTS.map(e => [e.id, e]));

  // ---- Exclusive Reward（要求仕様セクション7。5カテゴリ全てを最低1つずつ割り当てた） ----
  const HIDDEN_REWARDS = [
    { id: 'hidden_protocol_echo', name: 'Hidden Protocol: ECHO', category: 'protocol', environment: 'void_memory', description: '失われたProtocolの断片。', effect: { type: 'protocolFragmentInstant', value: 10 } },
    { id: 'hidden_archive_deleted_records', name: 'Archive Entry: Deleted Records', category: 'archive', environment: 'lost_archive', description: '削除済み研究記録のアーカイブ登録。', effect: { type: 'researchDataInstant', value: 200 } },
    { id: 'mythic_upgrade_genesis', name: 'Mythic Upgrade: Genesis Core', category: 'upgrade', environment: 'genesis_lab', description: '無償で付与される神話級Upgrade。', effect: { type: 'freeUpgradeInstant', value: 1 } },
    { id: 'hidden_cosmetic_simulation_frame', name: 'Hidden Cosmetic: Simulation Frame', category: 'cosmetic', environment: 'simulation_zero', description: '仮想世界の記念フレーム。', effect: { type: 'researchDataInstant', value: 150 } },
    { id: 'hidden_cosmetic_echo_trail', name: 'Hidden Cosmetic: Echo Trail', category: 'cosmetic', environment: 'echo_network', description: '残響の軌跡を纏う演出。', effect: { type: 'researchDataInstant', value: 150 } },
    { id: 'legend_identity_paradox', name: 'Legend Identity: Paradox', category: 'identity', environment: 'paradox_core', description: '伝説級の研究者として記録される。', effect: { type: 'researchDataInstant', value: 300 } }
  ];
  const REWARDS_BY_ID = new Map(HIDDEN_REWARDS.map(r => [r.id, r]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  function getEventById(id) {
    return EVENTS_BY_ID.get(id) || null;
  }

  function getRewardById(id) {
    return REWARDS_BY_ID.get(id) || null;
  }

  /** @param {Object} def hiddenEnvironmentData.ALLの1件 @returns {Object|null} そのEnvironmentの専用Eventの実体（1件目のみ、現状どのEnvironmentも1件ずつのため） */
  function getExclusiveEventForEnvironment(def) {
    if (!def || !def.exclusiveEvents || def.exclusiveEvents.length === 0) return null;
    return getEventById(def.exclusiveEvents[0]);
  }

  /** @param {Object} def hiddenEnvironmentData.ALLの1件 @returns {Object|null} そのEnvironmentの限定報酬の実体（1件目のみ） */
  function getExclusiveRewardForEnvironment(def) {
    if (!def || !def.exclusiveRewards || def.exclusiveRewards.length === 0) return null;
    return getRewardById(def.exclusiveRewards[0]);
  }

  G.HiddenEnvironmentData = {
    ALL, EXCLUSIVE_EVENTS, HIDDEN_REWARDS,
    getById, getEventById, getRewardById,
    getExclusiveEventForEnvironment, getExclusiveRewardForEnvironment
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
