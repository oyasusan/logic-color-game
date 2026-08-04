/**
 * endingManager.js
 * STEP32「Narrative & Story System」セクション9: Ending System。5種のEnding
 * （要求仕様どおりEND A〜D + END TRUE）の判定・永続化を統括する。
 *
 * Ending条件はstoryUnlockManager.jsの単純な`{type,value}>=`比較では表現できない
 * 複合条件（World Status、Hidden Environment全種発見、他Systemの完成率の組合せ等）
 * のため、aiFeedback.jsのRULESテーブルと同じ`match: snapshot => boolean`関数の
 * 集合として実装した（このプロジェクトで複合条件を扱う既存パターン）。
 *
 * 達成したEndingはendlessSave.jsの`endingFlags`へ永続化される（一度達成したら
 * 二度と失われない、worldEnvironmentManager.unlockWorldEnvironment等と同じ設計）。
 * 同時にresearchDatabase.addEntry(id)も呼ばれ、Story Archiveの「ENDING X/5」表示・
 * Timelineへも反映される（endless.js側の責務、要求仕様セクション13
 * 「イベント通知を受け取って処理する」を守るため、endingManager自身は
 * researchDatabaseを直接操作しない）。
 *
 * 【要求仕様に無く、こちらで設計した各Endingの具体的な判定基準】
 *   - END A「Complete Research」: 全12件のLOG Entry解放（要求仕様の「主要Story Log完成」）
 *   - END B「World Collapse」: RUN終了時点でWorld Status=COLLAPSEだったこと
 *   - END C「AI Liberation」: 全6件のMEMORY Entry解放（要求仕様の「AI Memory Complete」）
 *   - END D「Simulation Zero」: SIMULATION ZERO（Hidden Environment）内で
 *     Puzzle/Elite/Bossを1回以上クリアしたこと（要求仕様の「SIMULATION ZERO攻略」）
 *   - END TRUE「GENESIS」: 全6種のHidden Environment発見+Story全体100%+
 *     Layer50到達（要求仕様の「Hidden Environment+Story Complete+Special Conditions」。
 *     Special ConditionsはEND A/D等が要求する到達点よりさらに深いLayerを踏んだ経験
 *     として設計した）
 *
 * 【STEP39-2追記】Final Chapter（chapter06）完了直後にも`checkEndings()`を呼ぶよう
 * `endless.js`から配線した（`_checkFinalChapterEnding()`）。判定ロジック自体（上記ALL・
 * 全件独立判定）は変更していない。
 *
 * 【STEP39-3追記: Story Ending（本編の結末）の新設】上記`checkEndings()`はRUN終了時点の
 * 生涯達成条件（例: END TRUEはLayer50到達必須）であり、Layer30（Chapter6完了）の時点では
 * ほぼ成立しない。要求仕様セクション1「Normal/True/Hidden/Bad Endingを実装、判定条件は
 * データ化し今後追加可能な構造にする」に対応するため、Layer30到達時点で評価可能な閾値の
 * 優先順位付き判定テーブル`STORY_ENDING_ORDER`と、そこから必ず1件だけを選び出す
 * `determineStoryEnding()`を新設した。既存のEnding定義（`ALL`、name/description等）は
 * そのまま再利用し、新規のEnding名を増やしていない（Story EndingはEND A/B/D/TRUEのいずれか
 * 1つとして表現される。END C「AI Liberation」は要求仕様セクション1の対象外のため
 * Story Endingの候補には含めていない）。
 *   - Bad（`ending_b`）: World StabilityがCOLLAPSE状態（既存END Bと同一条件）。他の
 *     達成状況に関わらず最優先で判定する（「世界の崩壊」は個々の達成を覆す結末という
 *     設計判断）
 *   - True（`ending_true`）: Hidden Environment発見率100%（既存END TRUEからLayer50/
 *     Story100%条件を除いた、Layer30時点で現実的に到達しうる閾値に調整）
 *   - Hidden（`ending_d`）: SIMULATION ZERO攻略済み（既存END Dと同一条件。Hidden
 *     Environment全種発見ほどではないが、通常プレイでは辿り着かない発見要素）
 *   - Normal（`ending_a`）: 上記いずれも満たさない場合のデフォルト（`match:()=>true`
 *     で必ず成立する保証されたフォールバック）
 * 優先順位（Bad > True > Hidden > Normal）はdocs/STORY_BIBLE.md 3章/7章に記載済みの
 * 「将来の代表Ending表示指針」（STEP39-1）とTrue/Hidden/Normalの順序を合わせてある。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    {
      id: 'ending_a',
      name: 'END A — Complete Research',
      description: '主要なStory Logをすべて集めた。',
      match: s => (s.logCompletionRate || 0) >= 1.0
    },
    {
      id: 'ending_b',
      name: 'END B — World Collapse',
      description: 'World StabilityがCOLLAPSE状態のままRUNを終えた。',
      match: s => s.worldStatus === 'COLLAPSE'
    },
    {
      id: 'ending_c',
      name: 'END C — AI Liberation',
      description: 'AIの記憶をすべて取り戻した。',
      match: s => (s.memoryCompletionRate || 0) >= 1.0
    },
    {
      id: 'ending_d',
      name: 'END D — Simulation Zero',
      description: 'SIMULATION ZEROの深部を攻略した。',
      match: s => !!s.simulationZeroCleared
    },
    {
      id: 'ending_true',
      name: 'END TRUE — GENESIS',
      description: '隠された領域・研究記録・特別な条件、すべてが揃った。',
      match: s => (s.hiddenCompletionRate || 0) >= 1.0 && (s.storyCompletionRate || 0) >= 1.0 && (s.bestLayer || 0) >= 50
    }
  ];

  const BY_ID = new Map(ALL.map(e => [e.id, e]));

  // STEP39-3: Story Ending判定テーブル（優先順位＝配列順、最初に条件を満たした1件のみを
  // 採用する）。データ化されているため、今後Endingを追加する場合はこの配列へ
  // `{id, match}`を1件追加するだけでよい（末尾の`ending_a`は必ず成立するフォールバックの
  // ため、新規追加分はその手前へ挿入すること）
  const STORY_ENDING_ORDER = [
    { id: 'ending_b', match: s => s.worldStatus === 'COLLAPSE' },
    { id: 'ending_true', match: s => (s.hiddenCompletionRate || 0) >= 1.0 },
    { id: 'ending_d', match: s => !!s.simulationZeroCleared },
    { id: 'ending_a', match: () => true }
  ];

  class EndingManager {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス */
    constructor({ save }) {
      this.save = save;
    }

    /**
     * 要求仕様セクション9のAPI。新たに条件を満たしたEndingを判定・永続化する。
     * @param {Object} snapshot endless.jsが組み立てる現在の進行状況スナップショット
     * @returns {Array<Object>} 新たに達成したEnding定義の配列
     */
    checkEndings(snapshot) {
      snapshot = snapshot || {};
      const achievedIds = this.save.getEndingFlags();
      const newlyAchieved = [];
      ALL.forEach(def => {
        if (achievedIds.indexOf(def.id) !== -1) return;
        if (!def.match(snapshot)) return;
        this.save.recordEndingAchieved(def.id);
        newlyAchieved.push(def);
      });
      return newlyAchieved;
    }

    /**
     * STEP39-3: 本編（Layer Narrative System）の結末を1つだけ確定させる。`STORY_ENDING_ORDER`
     * を先頭から評価し、最初に条件を満たした1件を採用する（末尾のNormalが必ず成立する
     * ため、戻り値の`ending`が空になることは無い）。永続化は既存の`checkEndings()`と
     * 同じ`save.recordEndingAchieved()`を再利用するため、生涯達成Endingの記録
     * （Research Archiveの表示等）とも整合する。
     * @param {Object} snapshot endless.jsが組み立てる現在の進行状況スナップショット
     * @returns {{ending:Object, isNewlyAchieved:boolean}}
     */
    determineStoryEnding(snapshot) {
      snapshot = snapshot || {};
      const matched = STORY_ENDING_ORDER.find(def => def.match(snapshot));
      const ending = BY_ID.get(matched.id);
      const isNewlyAchieved = this.save.recordEndingAchieved(matched.id);
      return { ending, isNewlyAchieved };
    }

    getAchievedEndings() {
      return this.save.getEndingFlags();
    }

    getAllEndings() {
      return ALL;
    }

    getById(id) {
      return BY_ID.get(id) || null;
    }
  }

  G.EndingManager = EndingManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
