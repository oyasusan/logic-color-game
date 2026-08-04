/**
 * memoryData.js
 * STEP32-3「Memory Fragment System」セクション2: Memory Data。
 * データ駆動方式（要求仕様どおり）: `{id, title, description, chapter, type,
 * content, unlockCondition}`。要求仕様セクション7の`character`（関連キャラクター、
 * CharacterData.js参照）も各エントリへ含めた。
 *
 * 【idの命名について】このプロジェクトには既にSTEP32(Narrative & Story System)の
 * `storyData.js`が`memory_001`〜`memory_006`というidを使用済みのため、紛らわしさを
 * 避けて本ファイルのidは`memfrag_`接頭辞（Memory Fragmentの略）で統一した
 * （`memoryProgress`というフィールド名自体は衝突しないためそのまま使えたが、
 * 中身のidまで似せると人間が読んだ時に混同しやすいための配慮）。
 *
 * 要求仕様セクション3の「初期Memory Fragment作成（Chapter1用）」どおり2件のみ実装。
 *
 * 【STEP32-5-1追記】Chapter01「First Signal」のコンテンツ本実装に伴い、取得Layerと
 * 内容を要求仕様に合わせて改訂した（コード構造は変更せずデータのみの改訂）。
 *   - memfrag_001: 取得LayerをLayer3→Layer2へ変更。要求仕様のLayer2〜3で「Memory取得」
 *     と明示されているのはLayer3のみ（Relationship +5とセットで書かれている）で、
 *     Layer2のMemory取得にはRelationship変化の記載が無いため、`character`をnullにして
 *     Relationship付与対象から外した（endless.jsの`if (m.character) ...`が自動的に
 *     スキップする、既存コードを一切変更しない設計）
 *   - memfrag_002: 取得LayerをLayer4→Layer3へ変更。titleを"Unknown Access"→
 *     "Unknown Researcher"へ、contentを要求仕様どおりに更新した。`character:'aria'`は
 *     維持し、Layer3クリアで要求仕様どおりRelationship +5が付与されるようにした
 *
 * 【STEP32-5-2追記】要求仕様セクション3「Memory003〜030を予約状態で追加。未実装データは
 * locked状態」どおり、残り28件を追加した。`unlockCondition: null`にすることで
 * `MemoryManager._checkUnlockCondition()`（`if (!condition) return false`）が常にfalseを
 * 返すため、実際のコード変更を一切加えずに「絶対に自動取得されないlocked状態」を実現できる
 * （memoryManager.js自体は無変更）。Chapter2〜6への割り当てはLayer範囲の比率に合わせた
 * 目安（Chapter2〜5各4件・Final Chapterのみ12件、合計28件+既存2件=30件）。
 *
 * 【STEP34追記】要求仕様セクション3が「Layer3: ARIA解析イベント（Memory無し）」
 * 「Layer4: Memory002 Unknown Researcher取得 + Chapter1完了イベント」と明記したため、
 * memfrag_002の取得LayerをLayer3→Layer4へ再度変更した（STEP32-5-1時点はLayer3だった）。
 * これに伴い、実際の取得タイミングを制御する正本は`layerContentData.js`の`memoryId`
 * フィールドへ移った（`storyManager.js`参照）。この`unlockCondition`はデータの整合性を
 * 保つ目的でLayer4に更新してあるが、実行時には直接は参照されなくなった点に注意。
 *
 * 【STEP35追記】Chapter02「Lost Data」の本文実装に伴い、memfrag_003（Researcher
 * Profile、Layer7）とmemfrag_004（Genesis Project Log、Layer8）をlocked予約から
 * 実装済みへ昇格させた。取得タイミングの正本は引き続き`layerContentData.js`の
 * `memoryId`（このunlockConditionはデータ整合性のための記録用）。
 *
 * 【STEP36追記: memfrag_005/006の所属Chapter訂正】STEP35時点ではmemfrag_005/006を
 * 「chapter02の予約枠（未使用）」として生成していたが、STEP36の要求仕様セクション4が
 * 「Memory005: Human Cognitive Pattern」「Memory006: Color Experiment Final Report」を
 * 明示的にChapter03（Color Experiment）のMemoryとして指定したため、この2件を
 * chapter02→chapter03へ再割当し、実装済みへ昇格させた。これにより判明したのは、
 * 実際のコンテンツ実装パターンが「各Chapterに予約4枠のうち2枠を実装」ではなく
 * 「各Chapterに実装2件・予約枠は持たない」（Chapter1が最初からその形だった）という
 * ことだったため、STEP32-5-2時点の`RESERVED_COUNT_BY_CHAPTER`（Chapter2〜5に各4枠）を
 * この機会に実態に合わせて整理した。Chapter2はmemfrag_003/004の2件で確定（予約枠0）、
 * Chapter3はmemfrag_005/006の2件で確定（予約枠0）とし、空いた分はChapter6
 * （Final Chapter、Layer21〜30と範囲が広い）の予約枠へ吸収した
 * （4+4+12=20→ 4(Chapter4)+4(Chapter5)+16(Chapter6)=24、実装6件+予約24件=合計30件で不変）。
 *
 * 【STEP37追記】Chapter04「Silent Facility」の本文実装に伴い、memfrag_007（Lost
 * Researcher Record、Layer14）/memfrag_008（Researcher-01 Profile、Layer15）/
 * memfrag_009（Facility Shutdown Report、Layer16）をlocked予約から実装済みへ
 * 昇格させた。Chapter1〜3で確定した「各Chapter実装2件」パターンと異なり、Chapter4は
 * 要求仕様セクション5が明示的に3件（Memory007〜009）を指定したため3件昇格させ、
 * 残りのmemfrag_010は引き続きlocked予約のまま（`RESERVED_COUNT_BY_CHAPTER`の
 * chapter04を4→1へ調整。合計30件は不変）。memfrag_007/008は要求仕様セクション6の
 * Relationship+5と対応させ`character: 'lost_researcher'`とした（Chapter1〜3は
 * 全てARIAへのRelationship変化だったが、Chapter4はLost Researcher本人を発見・
 * 理解していく物語のため、初めて`lost_researcher`へのRelationship変化を持たせた。
 * 詳細はlayerContentData.js/endless.jsのコメント参照）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const IMPLEMENTED = [
    {
      id: 'memfrag_001',
      title: 'Genesis Beginning',
      description: 'Genesis Protocolの起源に関する記録の断片。',
      chapter: 'chapter01',
      type: 'LOG',
      content: 'Genesis Protocol研究開始記録',
      character: null,
      unlockCondition: { type: 'layerReached', value: 2 }
    },
    {
      id: 'memfrag_002',
      title: 'Unknown Researcher',
      description: 'Genesis Protocol責任者に関する記録の断片。',
      chapter: 'chapter01',
      type: 'LOG',
      content: 'Genesis Protocol責任者記録',
      character: 'aria',
      unlockCondition: { type: 'layerReached', value: 4 }
    },
    // ---- STEP35: Chapter02「Lost Data」 ----
    {
      id: 'memfrag_003',
      title: 'Researcher Profile',
      description: 'Genesis Protocol関連研究者の人物記録の断片。',
      chapter: 'chapter02',
      type: 'LOG',
      content: '研究員プロフィール記録：Genesis Protocol関連研究者',
      character: 'aria',
      unlockCondition: { type: 'layerReached', value: 7 }
    },
    {
      id: 'memfrag_004',
      title: 'Genesis Project Log',
      description: 'Genesis Protocol研究進捗に関する記録の断片。',
      chapter: 'chapter02',
      type: 'LOG',
      content: 'Genesis Protocol研究進捗ログ',
      character: null,
      unlockCondition: { type: 'layerReached', value: 8 }
    },
    // ---- STEP36: Chapter03「Color Experiment」 ----
    {
      id: 'memfrag_005',
      title: 'Human Cognitive Pattern',
      description: '人間の認知パターンに関する解析記録の断片。',
      chapter: 'chapter03',
      type: 'LOG',
      content: '人間の認知パターン解析記録',
      character: 'aria',
      unlockCondition: { type: 'layerReached', value: 10 }
    },
    {
      id: 'memfrag_006',
      title: 'Color Experiment Final Report',
      description: 'Color Experimentの最終報告に関する記録の断片。',
      chapter: 'chapter03',
      type: 'LOG',
      content: 'Color Experiment最終報告書',
      character: 'aria',
      unlockCondition: { type: 'layerReached', value: 12 }
    },
    // ---- STEP37: Chapter04「Silent Facility」 ----
    {
      id: 'memfrag_007',
      title: 'Lost Researcher Record',
      description: '施設内で発見された、身元不明の研究者に関する記録の断片。',
      chapter: 'chapter04',
      type: 'LOG',
      content: 'Lost Researcher記録：身元不明の研究者アクセスログ',
      character: 'lost_researcher',
      unlockCondition: { type: 'layerReached', value: 14 }
    },
    {
      id: 'memfrag_008',
      title: 'Researcher-01 Profile',
      description: '主人公自身のアクセスID「Researcher-01」に関する記録の断片。',
      chapter: 'chapter04',
      type: 'LOG',
      content: 'Researcher-01プロフィール記録',
      character: 'lost_researcher',
      unlockCondition: { type: 'layerReached', value: 15 }
    },
    {
      id: 'memfrag_009',
      title: 'Facility Shutdown Report',
      description: '施設が停止に至った経緯に関する報告書の断片。',
      chapter: 'chapter04',
      type: 'LOG',
      content: 'Facility Shutdown報告書',
      character: null,
      unlockCondition: { type: 'layerReached', value: 16 }
    }
  ];

  // STEP32-5-2: Memory010〜030の予約枠。
  // 【STEP36追記】Chapter1〜3が「各Chapter実装2件・予約枠0」という実態のパターンで
  // 確定したため、Chapter4/5は各4件、余った分をChapter6（Final Chapter、Layer21〜30と
  // 範囲が広い）へ吸収して16件とした（4+4+16=24件、実装6件+予約24件=合計30件で不変）
  // 【STEP37追記】Chapter04はmemfrag_007〜009の3件が実装済みへ昇格したため、
  // 予約数を4→1（memfrag_010のみ）へ調整した（合計30件は不変）
  const RESERVED_COUNT_BY_CHAPTER = [
    { chapter: 'chapter04', count: 1 },
    { chapter: 'chapter05', count: 4 },
    { chapter: 'chapter06', count: 16 }
  ];
  const RESERVED = [];
  let nextNumber = 10;
  RESERVED_COUNT_BY_CHAPTER.forEach(({ chapter, count }) => {
    for (let i = 0; i < count; i++) {
      RESERVED.push({
        id: `memfrag_${String(nextNumber).padStart(3, '0')}`,
        title: null,
        description: null,
        chapter,
        type: 'LOG',
        content: null,
        character: null,
        unlockCondition: null, // locked: 条件が無いため自動取得されることは無い
        locked: true
      });
      nextNumber++;
    }
  });

  const ALL = IMPLEMENTED.concat(RESERVED);

  const BY_ID = new Map(ALL.map(m => [m.id, m]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  G.MemoryData = { ALL, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
