/**
 * databaseCompletion.js
 * STEP43「Research Progression System」セクション3: Database Completion。
 * Characters/Memory/Research Logs/Protocols/Environment/Endingsの収集率を
 * 1つにまとめて返す純粋関数。状態は持たない（researchDatabase.js等と同じ設計）。
 *
 * 【設計方針】各カテゴリの「discovered/total」の数え方は、既存の各Archive画面
 * （characterArchiveUI.js/memoryManager.js/researchDatabase.js/protocolArchive.js/
 * environmentArchive.js/endingManager.js）が既に持つ数え方をそのまま再利用している。
 * 新しい収集判定ロジックは一切追加していないため、この画面の数字と各既存Archive画面の
 * 数字が食い違うことが無い。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  /**
   * @param {Object} deps
   * @param {Object} deps.save EndlessSaveStoreインスタンス
   * @param {Object} deps.researchDatabase ResearchDatabaseインスタンス（Research Logs用）
   * @param {Object} deps.memoryManager MemoryManagerインスタンス
   * @param {Object} deps.relationshipManager RelationshipManagerインスタンス（Character discovered判定用）
   * @param {Object} deps.endingManager EndingManagerインスタンス
   * @returns {{characters:{unlocked:number,total:number}, memory:{unlocked:number,total:number},
   *   logs:{unlocked:number,total:number}, protocols:{unlocked:number,total:number},
   *   environment:{unlocked:number,total:number}, endings:{unlocked:number,total:number},
   *   overallRate:number}}
   */
  function getCompletionSummary(deps) {
    const { save, researchDatabase, memoryManager, relationshipManager, endingManager } = deps;

    // characterArchiveUI.jsの「alwaysKnown（state!=='UNKNOWN'）」判定をそのまま再利用
    const characterDefs = (G.CharacterData ? G.CharacterData.ALL : []).filter(c => c.id !== 'system');
    const charactersUnlocked = characterDefs.filter(c => relationshipManager.getCharacterState(c.id) !== 'UNKNOWN').length;

    const memoryProgress = memoryManager.getMemoryProgress();
    const logProgress = researchDatabase.getCompletionByType('LOG');

    const protocolTotal = G.ProtocolUnlock ? G.ProtocolUnlock.getAllDefs().length : 0;
    const protocolUnlocked = save.getUnlockedProtocols().length;

    const environmentTotal = G.Environments ? G.Environments.ALL.length : 0;
    const environmentUnlocked = save.getUnlockedEnvironments().length;

    const endingTotal = endingManager.getAllEndings().length;
    const endingUnlocked = endingManager.getAchievedEndings().length;

    const categories = {
      characters: { unlocked: charactersUnlocked, total: characterDefs.length },
      memory: { unlocked: memoryProgress.collected, total: memoryProgress.total },
      logs: { unlocked: logProgress.unlocked, total: logProgress.total },
      protocols: { unlocked: protocolUnlocked, total: protocolTotal },
      environment: { unlocked: environmentUnlocked, total: environmentTotal },
      endings: { unlocked: endingUnlocked, total: endingTotal }
    };

    const totalUnlocked = Object.values(categories).reduce((sum, c) => sum + c.unlocked, 0);
    const totalAll = Object.values(categories).reduce((sum, c) => sum + c.total, 0);
    categories.overallRate = totalAll > 0 ? totalUnlocked / totalAll : 0;

    return categories;
  }

  G.DatabaseCompletion = { getCompletionSummary };
})(typeof globalThis !== 'undefined' ? globalThis : this);
