/**
 * relationshipData.js
 * STEP32-4「Character Relationship System」セクション2/3/4: Relationship Data。
 * データ駆動方式（要求仕様どおり）: `{characterId, relationship, state, level}`。
 * 実際の永続化（relationship/state）はendlessSave.jsが持つため、このファイルは
 * 初期値の定義と、要求仕様セクション4のARIA状態変化テーブル（LEVEL 0〜3）、
 * および表示名解決ヘルパーのみを持つ純粋なデータモジュール。
 *
 * 【levelを保存しない設計について】要求仕様セクション2のデータ形式は`level`を含むが、
 * セクション9の実際のSave対象は`{characterId, relationship, state}`のみで`level`が
 * 無い。本実装では`state`から`ARIA_LEVELS`を逆引きすれば`level`は常に一意に導出できる
 * ため、あえて別フィールドとして重複永続化しない設計にした（endlessSave.jsの
 * 既存パターン、例:「discoveryRate」等の「重複データを持たず都度計算する」判断と同じ）。
 *
 * 【STEP32-5-2追記】要求仕様セクション4「Partner AIは将来拡張用として予約」どおり、
 * LEVEL4を追加した。`condition.type`に、`relationshipManager.js`の`_buildAriaSnapshot()`が
 * 絶対に生成しないキー（`reserved`）を指定することで、「データとしては存在するが実際には
 * 絶対に到達しない」inertな予約状態を実現した（`_checkLevelCondition()`は
 * `snapshot[condition.type]||0 >= condition.value`で判定するため、snapshotに存在しない
 * キーは常に0として扱われ、条件を満たすことが無い）。将来Partner AIへの実際の到達条件を
 * 設計する際は、この`condition`を実際の判定可能な値へ差し替えるだけでよい。
 *
 * 【STEP38追記: LEVEL3到達条件の変更】要求仕様セクション3「ARIA状態更新: Emotional AI→
 * Self Aware、条件: Memory010取得・Memory011取得・Chapter5 Complete」に対応するため、
 * LEVEL3の`condition.type`を`finalChapterReached`から`selfAwareReady`へ変更した
 * （STORY_BIBLE.mdもこの変更に合わせて更新済み。詳細はREADME.md STEP38セクション参照）。
 * `finalChapterReached`のsnapshotキー自体は`relationshipManager.js`に残してあり
 * （Final Chapter到達を必要とする将来の別用途のために保持）、ARIA_LEVELSからの参照が
 * 無くなっただけで削除はしていない。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // 要求仕様セクション3の初期状態
  const DEFAULTS = {
    player: { characterId: 'player', relationship: 0, state: 'RESEARCHER' },
    aria: { characterId: 'aria', relationship: 0, state: 'LOGICAL_AI' },
    lost_researcher: { characterId: 'lost_researcher', relationship: 0, state: 'UNKNOWN' },
    // STEP39-2: Final Chapter Layer26でcharacterDiscoveryさせるため、lost_researcherと
    // 同じ`UNKNOWN`初期状態を用意した（Character Archiveのstate表示が'null'にならない
    // ようにするための最小限の追加。詳細はcharacterData.js/layerContentData.jsのコメント参照）
    dr_leon: { characterId: 'dr_leon', relationship: 0, state: 'UNKNOWN' }
  };

  // 要求仕様セクション4のARIA状態変化テーブル。conditionはrelationshipManager.jsが
  // 組み立てるsnapshotに対する`{type,value}>=`比較（storyUnlockManager.js等と同じ規約）。
  // LEVEL2「重要Memory取得」はmemfrag_002（Unknown Access、ARIA自身のアクセスIDに関わる、
  // より個人的な記録）を「重要Memory」として設計した。LEVEL3「Final Chapter」は
  // layerStoryData.jsの最終Chapter（chapter06）到達とした
  const ARIA_LEVELS = [
    { level: 0, state: 'LOGICAL_AI', name: 'Logical AI', condition: null },
    { level: 1, state: 'CURIOUS_AI', name: 'Curious AI', condition: { type: 'memoryCount', value: 1 } },
    { level: 2, state: 'EMOTIONAL_AI', name: 'Emotional AI', condition: { type: 'importantMemoryCollected', value: 1 } },
    { level: 3, state: 'SELF_AWARE', name: 'Self Aware', condition: { type: 'selfAwareReady', value: 1 } },
    // 将来拡張用の予約枠（現時点では到達不可能。上部コメント参照）
    { level: 4, state: 'PARTNER_AI', name: 'Partner AI', condition: { type: 'reserved', value: 1 }, reserved: true }
  ];

  function getDefault(characterId) {
    return DEFAULTS[characterId] || null;
  }

  function getAriaLevelByState(state) {
    return ARIA_LEVELS.find(l => l.state === state) || ARIA_LEVELS[0];
  }

  /** @returns {string} Character Archive UI表示用の状態名。ARIAはLevel名、他は生のstate文字列 */
  function getStateName(characterId, state) {
    if (characterId === 'aria') return getAriaLevelByState(state).name;
    return state;
  }

  G.RelationshipData = { DEFAULTS, ARIA_LEVELS, getDefault, getAriaLevelByState, getStateName };
})(typeof globalThis !== 'undefined' ? globalThis : this);
