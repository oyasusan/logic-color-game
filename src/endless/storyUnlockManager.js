/**
 * storyUnlockManager.js
 * STEP32「Narrative & Story System」セクション5: Story Unlock Manager。
 * StoryEntry（storyData.js）の解放条件判定のみを行う、状態を持たない純粋な
 * 評価モジュール（protocolUnlock.js/achievements.jsと全く同じ設計・同じ
 * `{type,value}`をsnapshotと`>=`で比較する汎用ルール）。実際の「解放済み」の
 * 保持・永続化はresearchDatabase.js、いつ判定を呼ぶか（Layer進行時・
 * Hidden Environment入場時等）はendless.js側の責務（要求仕様セクション13
 * 「イベント通知を受け取って処理する」を守るための役割分担）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { StoryData } = G;

  /**
   * @param {Object} condition StoryEntry.unlockCondition
   * @param {Object} snapshot endless.jsが組み立てる現在の生涯進行状況
   * @returns {boolean}
   */
  function checkUnlockCondition(condition, snapshot) {
    if (!condition) return false;
    snapshot = snapshot || {};
    // Hidden Environment固有のFILE用: 数値のしきい値ではなく、解放済みidの配列への
    // 包含判定になる（storyData.jsのコメント参照）
    if (condition.type === 'hiddenEnvironmentUnlocked') {
      return (snapshot.hiddenUnlockedIds || []).indexOf(condition.value) !== -1;
    }
    const current = snapshot[condition.type] || 0;
    return current >= condition.value;
  }

  /**
   * 要求仕様セクション5のAPI。指定した1件のStoryEntryを実際に解放する
   * （researchDatabase.addEntry()への委譲のみ、副作用はここでは条件判定を行わない）。
   * @param {Object} entry storyData.jsの1件
   * @param {Object} researchDatabase ResearchDatabaseインスタンス
   * @returns {boolean} 新規解放ならtrue（既に解放済みならfalse）
   */
  function unlockStory(entry, researchDatabase) {
    if (!entry || !researchDatabase) return false;
    return researchDatabase.addEntry(entry.id);
  }

  /**
   * @param {Object} snapshot 現在の生涯進行状況
   * @param {Object} researchDatabase ResearchDatabaseインスタンス（既に解放済みかの判定・
   *   実際の解放の両方に使う）
   * @returns {Array<Object>} この呼び出しで新たに解放されたStoryEntry定義の配列
   */
  function findNewlyUnlockable(snapshot, researchDatabase) {
    if (!researchDatabase) return [];
    const newlyUnlocked = [];
    StoryData.ALL.forEach(entry => {
      if (entry.type === 'ENDING') return; // EndingはendingManager.js経由でのみ解放する
      if (researchDatabase.isUnlocked(entry.id)) return;
      if (!checkUnlockCondition(entry.unlockCondition, snapshot)) return;
      if (unlockStory(entry, researchDatabase)) newlyUnlocked.push(entry);
    });
    return newlyUnlocked;
  }

  G.StoryUnlockManager = { checkUnlockCondition, unlockStory, findNewlyUnlockable };
})(typeof globalThis !== 'undefined' ? globalThis : this);
