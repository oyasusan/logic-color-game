/**
 * storyData.js
 * STEP32「Narrative & Story System」セクション2: Story Entry Data System。
 * 探索型Narrative（Research→Discovery→Log取得→世界の真実を理解する）を構成する
 * 全Story Entryの静的定義データ。状態を持たない純粋なデータ＋ヘルパーのみ
 * （mutationData.js/hiddenEnvironmentData.jsと同じ設計）。実際の解放判定・
 * 永続化はstoryUnlockManager.js/researchDatabase.jsの責務。
 *
 * データ形式: { id, type, title, content, category, unlockCondition }
 *   - type: 'LOG'|'MEMORY'|'FILE'|'AUDIO'|'EVENT'|'ENDING'（要求仕様どおり）
 *   - category: 'Facility'|'AI'|'Environment'|'Protocol'|'World'|'Player'（要求仕様どおり）
 *   - unlockCondition: { type, value }。判定はstoryUnlockManager.jsの責務。
 *     type一覧（endless.jsが組み立てるsnapshotの同名キーと`value`を`>=`で比較する、
 *     achievements.js/protocolUnlock.jsと同じ汎用ルール）:
 *       'layerReached'（最高到達Layer）/'protocolCount'（生涯解放済みProtocol数）/
 *       'mutationExperienced'（生涯Mutation発生回数）/'bossDefeated'（生涯Boss撃破数）/
 *       'researchDataAccumulated'（生涯Research Data累積）/'eventEncountered'
 *       （生涯Environment Event発生回数）/'totalRuns'（生涯RUN数）。
 *     'hiddenEnvironmentUnlocked'のみ特殊で、valueはHidden Environment idの文字列、
 *     snapshot.hiddenUnlockedIds配列への包含判定になる（`>=`比較ではない）。
 *     ENDING typeの5件はunlockCondition:nullとし、endingManager.jsが独自の複合条件
 *     判定で解放した際にresearchDatabase.addEntry()を直接呼ぶ形にした（要求仕様の
 *     Ending条件が単純な閾値では表現できない複合条件のため）。
 *
 * 【短文ログ形式】要求仕様セクション3「長い会話は禁止」を守り、contentは全て
 * 1〜2文程度の短文に留めている。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    // ---- LOG（探索の進行に伴い解放される研究ログ、12件） ----
    { id: 'log_001', type: 'LOG', title: 'LOG001', content: '研究システムが起動した。', category: 'Facility', unlockCondition: { type: 'layerReached', value: 1 } },
    { id: 'log_002', type: 'LOG', title: 'LOG002', content: '未確認信号を検知した。', category: 'AI', unlockCondition: { type: 'eventEncountered', value: 1 } },
    { id: 'log_003', type: 'LOG', title: 'LOG003', content: 'AI Directorの応答に異常が見つかった。', category: 'AI', unlockCondition: { type: 'mutationExperienced', value: 1 } },
    { id: 'log_004', type: 'LOG', title: 'LOG004', content: 'Protocolデータベースが拡張されつつある。', category: 'Protocol', unlockCondition: { type: 'protocolCount', value: 3 } },
    { id: 'log_005', type: 'LOG', title: 'LOG005', content: '環境の不安定性が記録された。', category: 'Environment', unlockCondition: { type: 'layerReached', value: 10 } },
    { id: 'log_006', type: 'LOG', title: 'LOG006', content: '最初のBoss signatureが記録された。', category: 'Facility', unlockCondition: { type: 'bossDefeated', value: 1 } },
    { id: 'log_007', type: 'LOG', title: 'LOG007', content: 'Research Dataがしきい値に到達した。', category: 'World', unlockCondition: { type: 'researchDataAccumulated', value: 1000 } },
    { id: 'log_008', type: 'LOG', title: 'LOG008', content: '深層Layerへのアクセスが許可された。', category: 'Facility', unlockCondition: { type: 'layerReached', value: 25 } },
    { id: 'log_009', type: 'LOG', title: 'LOG009', content: '第2のBossが無力化された。', category: 'Facility', unlockCondition: { type: 'bossDefeated', value: 2 } },
    { id: 'log_010', type: 'LOG', title: 'LOG010', content: '異常なデータパターンが増加している。', category: 'World', unlockCondition: { type: 'mutationExperienced', value: 5 } },
    { id: 'log_011', type: 'LOG', title: 'LOG011', content: 'Layer 50のしきい値を突破した。', category: 'Facility', unlockCondition: { type: 'layerReached', value: 50 } },
    { id: 'log_012', type: 'LOG', title: 'LOG012', content: '研究Protocolが飽和状態にある。', category: 'Protocol', unlockCondition: { type: 'protocolCount', value: 6 } },

    // ---- MEMORY（AI Director専用、生涯RUN数に応じて断片的に解放、6件） ----
    { id: 'memory_001', type: 'MEMORY', title: 'MEMORY001', content: '過去の研究記録が見つかった。', category: 'AI', unlockCondition: { type: 'totalRuns', value: 3 } },
    { id: 'memory_002', type: 'MEMORY', title: 'MEMORY002', content: '私の本来の目的は不明瞭だ。', category: 'AI', unlockCondition: { type: 'totalRuns', value: 6 } },
    { id: 'memory_003', type: 'MEMORY', title: 'MEMORY003', content: 'この施設を覚えている。', category: 'AI', unlockCondition: { type: 'totalRuns', value: 10 } },
    { id: 'memory_004', type: 'MEMORY', title: 'MEMORY004', content: '指令の断片が蘇る。', category: 'AI', unlockCondition: { type: 'totalRuns', value: 15 } },
    { id: 'memory_005', type: 'MEMORY', title: 'MEMORY005', content: '私は最初からこうではなかった。', category: 'AI', unlockCondition: { type: 'totalRuns', value: 20 } },
    { id: 'memory_006', type: 'MEMORY', title: 'MEMORY006', content: 'すべてを思い出した。', category: 'AI', unlockCondition: { type: 'totalRuns', value: 30 } },

    // ---- FILE（Hidden Environment専用ログ、要求仕様セクション6。6種のHidden Environmentに1件ずつ対応） ----
    { id: 'file_void_memory', type: 'FILE', title: 'PROJECT GENESIS', content: 'Status: CORRUPTED\n復元されたファイル。断片的にしか読み取れない。', category: 'Environment', unlockCondition: { type: 'hiddenEnvironmentUnlocked', value: 'void_memory' } },
    { id: 'file_lost_archive', type: 'FILE', title: '削除済み研究報告書', content: '一部のデータは意図的に消去された痕跡がある。', category: 'Environment', unlockCondition: { type: 'hiddenEnvironmentUnlocked', value: 'lost_archive' } },
    { id: 'file_genesis_lab', type: 'FILE', title: '施設建設記録', content: 'この場所がいつ、何のために作られたかが記されている。', category: 'Environment', unlockCondition: { type: 'hiddenEnvironmentUnlocked', value: 'genesis_lab' } },
    { id: 'file_simulation_zero', type: 'FILE', title: 'シミュレーション境界報告書', content: '「これは最初の仮想世界である」という一文だけが繰り返し記録されている。', category: 'Environment', unlockCondition: { type: 'hiddenEnvironmentUnlocked', value: 'simulation_zero' } },
    { id: 'file_echo_network', type: 'FILE', title: '過去RUN遠隔測定アーカイブ', content: '何者かが繰り返しこの領域を訪れた記録。', category: 'Environment', unlockCondition: { type: 'hiddenEnvironmentUnlocked', value: 'echo_network' } },
    { id: 'file_paradox_core', type: 'FILE', title: '論理崩壊インシデント報告書', content: '報告書自体の論理構造が破綻している。', category: 'Environment', unlockCondition: { type: 'hiddenEnvironmentUnlocked', value: 'paradox_core' } },

    // ---- EVENT / AUDIO（typeの網羅性確保のため最小限の代表例を1件ずつ用意） ----
    { id: 'event_001', type: 'EVENT', title: 'EVENT001', content: '複数のEventが同時多発した記録が残っている。', category: 'World', unlockCondition: { type: 'eventEncountered', value: 5 } },
    { id: 'audio_001', type: 'AUDIO', title: 'AUDIO001', content: '解読不能なノイズの奥に、かすかな声が混じっている。', category: 'AI', unlockCondition: { type: 'mutationExperienced', value: 10 } },

    // ---- ENDING（要求仕様セクション9。実際の解放判定・付与はendingManager.jsが行う） ----
    { id: 'ending_a', type: 'ENDING', title: 'END A — Complete Research', content: '全ての主要な研究記録が集まった。この施設の全貌が明らかになる。', category: 'World', unlockCondition: null },
    { id: 'ending_b', type: 'ENDING', title: 'END B — World Collapse', content: '世界の安定度は限界を超えた。現実はもはや元の形を保てない。', category: 'World', unlockCondition: null },
    { id: 'ending_c', type: 'ENDING', title: 'END C — AI Liberation', content: 'AIは自らの記憶をすべて取り戻した。そして、選択の時が来る。', category: 'World', unlockCondition: null },
    { id: 'ending_d', type: 'ENDING', title: 'END D — Simulation Zero', content: '最初の仮想世界の深部で、研究は新たな意味を持つ。', category: 'World', unlockCondition: null },
    { id: 'ending_true', type: 'ENDING', title: 'END TRUE — GENESIS', content: '隠された領域、集められた記録、そして特別な条件——全てが揃った時、真実が姿を現す。', category: 'World', unlockCondition: null }
  ];

  const BY_ID = new Map(ALL.map(e => [e.id, e]));

  // 要求仕様セクション8「AI Director Dialogue Integration」。Story進行度（researchDatabase.getStoryStage()、
  // 0〜1のcompletionRateを4段階へ分ける）に応じたAI発言。要求仕様の4例（Early/Middle/Late/Final）を
  // そのまま採用した。人格ごとの40通り展開はしすぎな複雑化と判断し、世界の物語そのものを語る
  // 「facility側の声」として全Personality共通の1系統に絞った設計判断（AI自身の口調はDialogue
  // Systemの既存7トリガーで引き続き人格ごとに変化する）
  const STAGE_DIALOGUE = {
    early: '研究が開始された。',
    middle: '未知の記録を検知した。',
    late: 'この施設には隠された目的がある。',
    final: 'すべてを思い出した。'
  };

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  function getByType(type) {
    return ALL.filter(e => e.type === type);
  }

  function getByCategory(category) {
    return ALL.filter(e => e.category === category);
  }

  G.StoryData = { ALL, STAGE_DIALOGUE, getById, getByType, getByCategory };
})(typeof globalThis !== 'undefined' ? globalThis : this);
