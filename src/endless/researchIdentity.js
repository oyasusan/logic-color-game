/**
 * researchIdentity.js
 * STEP29「Research Identity System」。新規プレイ開始時に1つだけ選ぶ
 * 「どのような研究者として成長するか」を表す恒久データ。Protocol（RUNごとに
 * リセットされる戦略選択）とは異なり、選択後はセーブに永続し、RUNをまたいで
 * 育つ（identityManager.js参照）。
 *
 * このファイルは純粋なデータ（+参照用の小さなヘルパー）のみを持ち、
 * 状態管理・効果集計はidentityManager.jsの責務（researchTree.js/protocols.js
 * と同じ役割分担）。
 *
 * データ形式: { id, name, theme, description, levelTitles, primaryBonus,
 *   secondaryBonus, perkTree, expSources }
 *   - primaryBonus/secondaryBonus: { type, value, label } 選択直後から常時有効。
 *     typeはidentityManager._effectTotal()が読むキー（researchTree.jsのeffect.type
 *     と同じ「加算/乗算どちらもまず生の値を合算し、乗算系はgetter側で1+する」規約）
 *   - perkTree: 3段階の固定チェーン。Research Tree（NEURAL LAB、Research Data
 *     で購入）とは異なり、Identity Levelに到達すると自動解放される（お金は不要）
 *   - expSources: { [source]: amount } 関連Node攻略/関連Reward取得時に
 *     identityManager.addExp(source)で加算される固定EXP量（要求仕様に数値指定が
 *     無かったため設計。全Identity共通で'puzzleClear'は基礎EXPとして必ず持つ）
 *
 * Lv1〜10の必要EXPは「次のレベルに必要な単発EXP = 100 * (1 + (現在Lv-1)*0.5)」
 * という、researchTree.jsのコスト式と同じ発想の逓増式で設計した
 * （要求仕様に数値指定が無かったため）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const MAX_LEVEL = 10;
  const EXP_BASE = 100;

  const ALL = [
    {
      id: 'analyst',
      name: 'ANALYST',
      theme: 'Logical Analysis Specialist',
      description: 'パズルの論理構造を読み解くことに特化した研究者。解析力とPERFECTクリアの精度を磨く',
      levelTitles: [
        { minLevel: 1, title: 'Observer' },
        { minLevel: 5, title: 'Logic Master' },
        { minLevel: 10, title: 'Neural Decoder' }
      ],
      primaryBonus: { type: 'unknownRevealChance', value: 0.10, label: 'Puzzle Analysis +10%' },
      secondaryBonus: { type: 'unknownRevealChance', value: 0.05, label: 'AI Confidence +5%' },
      perkTree: [
        { id: 'analyst_pattern_scan', name: 'Pattern Scan', description: 'Unknown Nodeの事前解析確率+5%', unlockLevel: 1, effect: { type: 'unknownRevealChance', value: 0.05 } },
        { id: 'analyst_perfect_bonus', name: 'Perfect Bonus', description: 'PERFECTボーナスがさらに+15%', unlockLevel: 5, effect: { type: 'perfectBonusMultiplier', value: 0.15 } },
        { id: 'analyst_hint_optimization', name: 'Hint Optimization', description: 'コンボボーナスがさらに+10%', unlockLevel: 10, effect: { type: 'comboBonusMultiplier', value: 0.10 } }
      ],
      expSources: { puzzleClear: 5, perfectClear: 15, unknownAnalyze: 10 }
    },
    {
      id: 'explorer',
      name: 'EXPLORER',
      theme: 'Deep Research Explorer',
      description: '未知の領域へ踏み込むことに特化した研究者。Unknown Nodeの探索と分岐の幅を広げる',
      levelTitles: [
        { minLevel: 1, title: 'Wanderer' },
        { minLevel: 5, title: 'Deep Pathfinder' },
        { minLevel: 10, title: 'Void Cartographer' }
      ],
      primaryBonus: { type: 'unknownRewardMultiplier', value: 0.15, label: 'Unknown Reward +15%' },
      secondaryBonus: { type: 'extraMapChoices', value: 1, label: 'Map Scan +1' },
      perkTree: [
        { id: 'explorer_deep_scan', name: 'Deep Scan', description: 'Map分岐候補がさらに+1枚', unlockLevel: 1, effect: { type: 'extraMapChoices', value: 1 } },
        { id: 'explorer_unknown_analysis', name: 'Unknown Analysis', description: 'Unknown Node報酬がさらに+15%', unlockLevel: 5, effect: { type: 'unknownRewardMultiplier', value: 0.15 } },
        { id: 'explorer_secret_discovery', name: 'Secret Discovery', description: 'Unknown Node事前解析確率+10%', unlockLevel: 10, effect: { type: 'unknownRevealChance', value: 0.10 } }
      ],
      expSources: { puzzleClear: 5, depthAdvance: 8, unknownAnalyze: 12 }
    },
    {
      id: 'protocol_engineer',
      name: 'PROTOCOL ENGINEER',
      theme: 'Protocol Evolution Specialist',
      description: 'Protocolの構築・進化に特化した研究者。Fragment収集とSynergy運用を磨く',
      levelTitles: [
        { minLevel: 1, title: 'Technician' },
        { minLevel: 5, title: 'Synthesis Engineer' },
        { minLevel: 10, title: 'Protocol Architect' }
      ],
      primaryBonus: { type: 'fragmentGainMultiplier', value: 0.10, label: 'Fragment Chance +10%' },
      secondaryBonus: { type: 'startingFragmentBonus', value: 1, label: 'Starting Fragment +1' },
      perkTree: [
        { id: 'engineer_protocol_lab', name: 'Protocol Lab', description: 'Protocol Fragment獲得量がさらに+10%', unlockLevel: 1, effect: { type: 'fragmentGainMultiplier', value: 0.10 } },
        { id: 'engineer_evolution_cost_down', name: 'Evolution Cost Down', description: 'Protocol Evolutionのコストが-15%', unlockLevel: 5, effect: { type: 'evolutionCostReduction', value: 0.15 } },
        { id: 'engineer_synergy_boost', name: 'Synergy Boost', description: 'Synergy発動中のスコアがさらに+20%', unlockLevel: 10, effect: { type: 'synergyScoreMultiplier', value: 0.20 } }
      ],
      expSources: { puzzleClear: 5, fragmentGain: 8, synergyActive: 20, protocolEvolve: 30 }
    },
    {
      id: 'survivalist',
      name: 'SURVIVALIST',
      theme: 'Long Term Research Specialist',
      description: '長期生存と安定運用に特化した研究者。ライフ管理とリスク軽減を磨く',
      levelTitles: [
        { minLevel: 1, title: 'Field Researcher' },
        { minLevel: 5, title: 'Endurance Specialist' },
        { minLevel: 10, title: 'Eternal Researcher' }
      ],
      primaryBonus: { type: 'lifeBonus', value: 1, label: 'Starting Life +1' },
      secondaryBonus: { type: 'missPenaltyMultiplier', value: -0.10, label: 'Risk Penalty -10%' },
      perkTree: [
        { id: 'survivalist_recovery_system', name: 'Recovery System', description: '一定クリアごとにライフが自動回復するようになる', unlockLevel: 1, effect: { type: 'lifeRegenIntervalBonus', value: 1 } },
        { id: 'survivalist_life_increase', name: 'Life Increase', description: '最大ライフがさらに+1', unlockLevel: 5, effect: { type: 'lifeBonus', value: 1 } },
        { id: 'survivalist_risk_control', name: 'Risk Control', description: 'ミス時のライフ損失がさらに-15%', unlockLevel: 10, effect: { type: 'missPenaltyMultiplier', value: -0.15 } }
      ],
      expSources: { puzzleClear: 5, bossClear: 25, recoveryUse: 10 }
    }
  ];

  const BY_ID = new Map(ALL.map(i => [i.id, i]));

  // Hybrid Identity System（section7）。Primary+Secondaryの組み合わせ名は仕様例の
  // 1組（PROTOCOL ENGINEER + EXPLORER = "Protocol探索特化型"）のみ指定されており、
  // 他組み合わせは今回UI選択が無いデータ基盤のみのため、汎用フォールバック表記で対応する
  const COMBO_LABELS = {
    'protocol_engineer:explorer': 'Protocol探索特化型'
  };

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  function getLevelTitle(identityId, level) {
    const def = getById(identityId);
    if (!def) return '';
    let title = def.levelTitles[0].title;
    def.levelTitles.forEach(t => { if (level >= t.minLevel) title = t.title; });
    return title;
  }

  /** @returns {number} 現在levelから次のlevel+1へ上がるのに必要なEXP量（MAX_LEVEL到達後は0） */
  function getExpRequiredForLevel(level) {
    if (level >= MAX_LEVEL) return 0;
    return Math.round(EXP_BASE * (1 + (level - 1) * 0.5));
  }

  function getExpForSource(identityId, source) {
    const def = getById(identityId);
    if (!def) return 0;
    return def.expSources[source] || 0;
  }

  /** @returns {string} Primary+Secondaryの組み合わせ表示名（未指定の組み合わせは汎用フォールバック） */
  function getHybridLabel(primaryId, secondaryId) {
    if (!secondaryId) return null;
    const key = `${primaryId}:${secondaryId}`;
    if (COMBO_LABELS[key]) return COMBO_LABELS[key];
    const primary = getById(primaryId);
    const secondary = getById(secondaryId);
    if (!primary || !secondary) return null;
    return `${primary.name} × ${secondary.name}`;
  }

  G.ResearchIdentity = { ALL, MAX_LEVEL, getById, getLevelTitle, getExpRequiredForLevel, getExpForSource, getHybridLabel };
})(typeof globalThis !== 'undefined' ? globalThis : this);
