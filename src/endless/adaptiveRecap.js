/**
 * adaptiveRecap.js
 * 「Cognitive Re-Synchronization System」セクション: Adaptive Story Recap /
 * Adaptive Operation Review / Adaptive Logic Review。
 * calibrationManager.jsから呼ばれ、現在のセーブ済み進行状況（Chapter/Memory/
 * Relationship/Protocol/Research Codex）を読み取るだけの状態を持たない集計モジュール
 * （endless.jsの`_buildResearchCodexSummary()`と同じ「読み取り専用ビルダー」設計）。
 * DOM・SEには一切触れず、カード用のプレーンなデータ構造だけを返す。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { CharacterData, ProtocolUnlock, RelationshipData } = G;

  /** ARIAのstate値から表示名を引く。他キャラクターはstateをそのまま人間可読化する */
  function stateLabel(characterId, state) {
    if (characterId === 'aria' && RelationshipData) {
      const level = RelationshipData.ARIA_LEVELS.find(l => l.state === state);
      if (level) return level.name;
    }
    if (!state) return 'UNKNOWN';
    return String(state).replace(/_/g, ' ');
  }

  /**
   * Adaptive Story Recap。ARIAが30〜60秒程度で話す想定の複数行の台詞配列を返す。
   * @param {Object} deps {storyManager, memoryManager, relationshipManager}
   * @returns {string[]} ARIAのセリフ行（ui.showDialogueへ1行ずつ渡す想定）
   */
  function buildStoryRecapLines({ storyManager, memoryManager }) {
    const chapter = storyManager.getCurrentChapter();
    const layer = storyManager.getCurrentStoryLayer();
    // memoryManager.getCollectedMemories()はid配列ではなく、MemoryData定義オブジェクトの配列を返す
    const collected = memoryManager.getCollectedMemories();
    const latestMemory = collected.length ? collected[collected.length - 1] : null;

    const lines = [];
    lines.push(`おかえりなさい、Researcher。信号強度を再確認しています。`);
    lines.push(chapter
      ? `現在の研究段階は「${chapter.title}」、Layer${layer}まで到達済みです。`
      : `現在の研究段階を照合中です。`);
    if (latestMemory) {
      lines.push(`直近に復元した記録は「${latestMemory.title}」でした。${latestMemory.description}`);
    } else {
      lines.push(`まだ復元済みの記録断片はありません。`);
    }
    lines.push(`Genesis Protocolとこの施設の真実の解明、それが私たちの目的です。`);
    return lines;
  }

  /** Research Summary card: 既存の_buildResearchCodexSummary()結果をカード形式へ整形する */
  function buildResearchSummaryCard(codexSummary) {
    const lines = Object.entries(codexSummary).map(([key, v]) => `${key}: ${v.unlocked}/${v.total}`);
    return {
      icon: '📊',
      title: 'RESEARCH SUMMARY',
      lines
    };
  }

  /** Memory Review card: 取得済みMemory Fragmentのタイトル一覧 */
  function buildMemoryReviewCard({ memoryManager }) {
    // memoryManager.getCollectedMemories()はid配列ではなく、MemoryData定義オブジェクトの配列を返す
    const collected = memoryManager.getCollectedMemories();
    const lines = collected.length
      ? collected.map(def => `${def.title} — ${def.description}`)
      : ['まだ復元済みの記録断片はありません。'];
    return { icon: '🧩', title: 'MEMORY REVIEW', lines };
  }

  /** Relationship Review card: player/system以外の各キャラクターの関係値・状態一覧 */
  function buildRelationshipReviewCard({ relationshipManager }) {
    const targets = CharacterData.ALL.filter(c => c.id !== 'player' && c.id !== 'system');
    const lines = targets
      .map(c => {
        const rel = relationshipManager.getRelationship(c.id);
        const state = relationshipManager.getCharacterState(c.id);
        if (state === 'UNKNOWN' && rel === 0) return null; // 未接触のキャラクターは表示しない
        return `${c.name}: ${stateLabel(c.id, state)}（関係値 ${rel}）`;
      })
      .filter(Boolean);
    return {
      icon: '🧑‍🤝‍🧑',
      title: 'RELATIONSHIP REVIEW',
      lines: lines.length ? lines : ['まだ関係が構築されたキャラクターはいません。']
    };
  }

  /** Protocol Review card: 生涯解放済みProtocol一覧 */
  function buildProtocolReviewCard({ save }) {
    const ids = save.getUnlockedProtocols();
    const lines = ids.map(id => {
      const def = ProtocolUnlock.getById(id);
      return def ? `${def.name} — ${def.description}` : id;
    });
    return { icon: '🔧', title: 'PROTOCOL REVIEW', lines: lines.length ? lines : ['解放済みProtocolはありません。'] };
  }

  /** Operation Review card: 操作方法の固定リマインダー（進行状況に依存しない静的コンテンツ） */
  function buildOperationReviewCard() {
    return {
      icon: '🖐️',
      title: 'OPERATION REVIEW',
      lines: [
        'マスをタップするたびに EMPTY → 色1 → 色2 → 色3 → EMPTY と巡回します。',
        '行・列の数字はその行/列に置くべき色ごとのライト数です。',
        'HINTボタンで1マスだけ正解を開示できます（使用回数は評価に影響します）。',
        '画面上部のバッジで現在のProtocol/Environment/Riskを確認できます。'
      ]
    };
  }

  /** Logic Review card: 考え方の再確認（静的コンテンツ） */
  function buildLogicReviewCard() {
    return {
      icon: '🧠',
      title: 'LOGIC REVIEW',
      lines: [
        'ヒントは「その行/列に何個あるか」だけを示し、並び順のヒントはありません。',
        'まず数字が確定しやすい行・列（0や盤面サイズと同じ数）から埋めると崩れにくくなります。',
        '色の重なりが矛盾する配置は誤りです。一度戻って見直しましょう。'
      ]
    };
  }

  G.AdaptiveRecap = {
    buildStoryRecapLines,
    buildResearchSummaryCard,
    buildMemoryReviewCard,
    buildRelationshipReviewCard,
    buildProtocolReviewCard,
    buildOperationReviewCard,
    buildLogicReviewCard
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
