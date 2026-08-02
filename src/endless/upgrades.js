/**
 * upgrades.js
 * ENDLESS RESEARCHのRESEARCH LABで提示されるアップグレードの定義データ。
 * このファイルは純粋なデータ（+参照用の小さなヘルパー）のみを持ち、
 * 効果の適用ロジックは持たない（upgradeManager.jsの責務）。
 *
 * データ形式: { id, name, category, description, effect }
 *   - id: 一意なID
 *   - name: 表示名
 *   - category: 'survival' | 'score' | 'logic'
 *   - description: プレイヤー向けの効果説明（日本語）
 *   - effect: { type, value } — upgradeManager.jsが解釈する汎用的な効果記述。
 *     同じtypeのアップグレードを複数所持した場合、valueは加算される（重複所持=効果が積み重なる）。
 *
 * 各アップグレードの効果は endless.js / endlessGame.js 側で
 * upgradeManager.getEffectTotal(type) / hasEffectType(type) を通じて参照される。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    // ---------------- Survival ----------------
    {
      id: 'repair_system',
      name: 'Repair System',
      category: 'survival',
      description: '最大ライフが+1される（獲得時、現在ライフも1回復する）',
      effect: { type: 'maxLifeBonus', value: 1 }
    },
    {
      id: 'backup_memory',
      name: 'Backup Memory',
      category: 'survival',
      description: 'ミス（タイムアップ）してもコンボがリセットされなくなる',
      effect: { type: 'keepComboOnMiss', value: 1 }
    },
    {
      id: 'recovery_protocol',
      name: 'Recovery Protocol',
      category: 'survival',
      description: '一定回数クリアするごとにライフを1回復する（所持数が多いほど間隔が短縮される）',
      effect: { type: 'lifeRegenInterval', value: 1 }
    },

    // ---------------- Score ----------------
    {
      id: 'overclock',
      name: 'Overclock',
      category: 'score',
      description: '獲得スコアが+20%される',
      effect: { type: 'scoreMultiplier', value: 0.2 }
    },
    {
      id: 'perfect_analysis',
      name: 'Perfect Analysis',
      category: 'score',
      description: 'PERFECTボーナスが+50される',
      effect: { type: 'perfectBonusAdd', value: 50 }
    },
    {
      id: 'combo_core',
      name: 'Combo Core',
      category: 'score',
      description: 'コンボボーナスの単価が+15される',
      effect: { type: 'comboBonusAdd', value: 15 }
    },

    // ---------------- Logic ----------------
    {
      id: 'analyzer',
      name: 'Analyzer',
      category: 'logic',
      description: 'HINT使用時、1マス多く同時に開示する',
      effect: { type: 'hintRevealBonus', value: 1 }
    },
    {
      id: 'deep_scan',
      name: 'Deep Scan',
      category: 'logic',
      description: '制限時間が+20%延長される',
      effect: { type: 'timeLimitMultiplierBonus', value: 0.2 }
    },
    {
      id: 'undo_core',
      name: 'Undo Core',
      category: 'logic',
      description: 'UNDOを使うたびに、経過時間から2秒差し引かれる（Speed Bonus判定に有利）',
      effect: { type: 'undoTimeRefundSeconds', value: 2 }
    },
    {
      id: 'ai_prediction',
      name: 'AI Prediction',
      category: 'logic',
      description: '残り時間が30%を切ると、自動的にHINTが1回発動する',
      effect: { type: 'autoHintThresholdRatio', value: 0.3 }
    }
  ];

  const BY_ID = new Map(ALL.map(u => [u.id, u]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  G.Upgrades = { ALL, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
