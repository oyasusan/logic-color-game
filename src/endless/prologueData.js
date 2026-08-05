/**
 * prologueData.js
 * STEP40-3「PROLOGUE『Awakening』」セクション1: Prologue Data。
 * Chapter0（PROLOGUE、Layer番号を持たない導入シーケンス）の純粋なデータのみを持つ
 * （worldEnvironment.js等と同じ「データ＋参照ヘルパー」構成）。実際の描画・進行制御は
 * prologueManager.js側の責務。
 *
 * Chapter0は`layerStoryData.js`（Layer1〜30、Chapter1〜Final Chapterの区切り）とは
 * 別枠として扱う。Layer範囲を持たないため、`LayerStoryData.ALL`には含めない
 * （`LayerStoryData.getByLayer()`等の既存Layer番号ベースの判定ロジックに影響を
 * 与えないための設計判断。詳細はdocs/STORY_BIBLE.md 3章参照）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const CHAPTER = { id: 'chapter00', title: 'Awakening', type: 'PROLOGUE' };

  // Scene001「System Boot」: 会話ではないため、Dialogue SystemではなくprologueManager.js
  // 側の専用パネルで表示する（ok=falseの項目は警告色で強調表示する）
  const BOOT_LINES = [
    { label: 'Research Facility', status: 'ONLINE', ok: true },
    { label: 'Memory System', status: 'ERROR', ok: false },
    { label: 'Cognitive Data', status: 'Unavailable', ok: false }
  ];

  // Scene004「First Mission」のミッション名（ARIA Dialogueに続けて表示する）
  const MISSION_TITLE = 'Restore Cognitive Mapping System';

  // Scene順序。Scene002〜004の会話部分はdialogueData.jsのid（DialogueManager経由で再生）
  const SCENES = [
    { id: 'system_boot', type: 'boot' },
    { id: 'researcher_awakening', type: 'dialogue', dialogueId: 'prologue_awakening' },
    { id: 'aria_first_contact', type: 'dialogue', dialogueId: 'prologue_aria_contact' },
    { id: 'first_mission', type: 'dialogue', dialogueId: 'prologue_first_mission', mission: MISSION_TITLE }
  ];

  G.PrologueData = { CHAPTER, BOOT_LINES, MISSION_TITLE, SCENES };
})(typeof globalThis !== 'undefined' ? globalThis : this);
