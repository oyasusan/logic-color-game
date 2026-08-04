/**
 * layerContentData.js
 * STEP32-5-2「Chapter01専用→汎用Layer Narrative Systemへの拡張」セクション2:
 * Layer Story Data構造。
 *
 * これまでLayer1件に対して起こりうる内容（どのDialogueが流れるか/どのMemoryが
 * 取得されるか/Relationshipがどう変化するか）は、`layerStoryEventManager.js`
 * （Dialogue idの検索のみ）・`memoryData.js`（各Memoryの`unlockCondition`）・
 * `endless.js`内の固定値（Relationship +5）に分散していた。本ファイルは、その
 * 「Layer1件分の内容」を1つのレコードとして見渡せる、今後Chapter追加のたびに
 * 参照できる正本テーブルとして新設した（要求仕様セクション2の必須項目
 * `layerId/chapterId/title/environment/dialogueId/memoryId/relationshipChange`
 * をそのまま採用）。
 *
 * 【STEP34追記】このファイルは「今後の拡張基盤」としてのみ用意され、実行時には
 * 一切参照されていなかったが、STEP34セクション2「Story Event管理システムを
 * 追加してください」（管理項目: eventId/trigger/dialogueId/memoryId/
 * relationshipChange）に対応するため、本ファイルを正本として`StoryManager.
 * onLayerClear()`が実際に参照するよう統合した（`storyManager.js`参照）。
 * 要求仕様の必須項目`eventId`/`trigger`を各レコードへ追加し、`trigger`は
 * 全レコード共通で`'LAYER_CLEAR'`（Layerクリアが唯一のStory Eventトリガー）とした。
 * これに伴い、`layerStoryEventManager.js`（STEP32-1/32-2で実行経路として使われて
 * いたDialogue検索専用テーブル）は実行経路から外れた（ファイル自体は削除せず
 * 残している。詳細はREADME.md STEP34セクション参照）。
 *
 * 【STEP34でのLayer3/Layer4の再配分について】STEP32-5-1時点ではmemfrag_002
 * （Unknown Researcher）をLayer3で取得する設計だったが、STEP34の要求仕様
 * セクション3が「Layer3: ARIA解析イベント（Memory無し）」「Layer4: Memory002
 * Unknown Researcher取得 + Chapter1完了イベント」と明記したため、Memory002の
 * 取得LayerをLayer3→Layer4へ改めて移動した（`memoryData.js`の`unlockCondition`も
 * 連動して変更、詳細はそちらのコメント参照）。
 *
 * 【STEP35追記】Chapter02「Lost Data」（Layer5〜8）の本文コンテンツを実装した
 * ことに伴い、Layer5〜8をRESERVEDからIMPLEMENTEDへ昇格させた。要求仕様セクション2
 * どおりLayer7でmemfrag_003、Layer8でmemfrag_004を取得し、Layer7でRelationship+5が
 * 付与される（Layer5/6はDialogueのみ、Memory/Relationship変化なし）。ARIAの状態は
 * 要求仕様セクション3「開始: Curious AI／終了: Curious AI」どおりChapter2を通じて
 * 変化しない（`relationshipData.js`の状態遷移条件を変更していないため、memoryCount
 * 加算だけではLEVEL2「Emotional AI」には到達しない設計のまま。詳細はdialogueData.js
 * のコメント参照）。
 *
 * 【STEP36追記】Chapter03「Color Experiment」（Layer9〜12）の本文コンテンツを実装した。
 * 要求仕様セクション2「Layer11: Protocol Color Analyzer取得」に対応するため、新たに
 * `protocolId`フィールドを追加した（既存の`memoryId`と対になる、Story Event管理の
 * 追加項目。全既存レコードにも`protocolId: null`を後方互換のため補った）。
 * `color_analyzer`は`protocolSignals.js`にSTEP32（Story Scenario Framework、
 * STORY RESEARCH CASE003クリア報酬）で既に定義済みだったため、新規Protocol定義は
 * 追加せず、既存データをそのままLayer Narrative経由でも解放できるようにした
 * （`endless.js`が`layerEvent.protocolId`を見て`save.unlockProtocol()`を呼ぶだけ。
 * 詳細はendless.jsのコメント参照）。
 *
 * 【STEP37追記】Chapter04「Silent Facility」（Layer13〜16）の本文コンテンツを実装した。
 * 要求仕様セクション3「Lost Researcherを本格利用（characterData.jsの既存データと連携。
 * 状態: UNKNOWN→DISCOVERED）」に対応するため、新たに`characterDiscovery`フィールドを
 * 追加した（`memoryId`/`protocolId`と対になる、Story Event管理の追加項目。値は
 * discoveryさせるcharacterId、または未発生ならnull）。`lost_researcher`は
 * `relationshipData.js`のDEFAULTSに既に`state:'UNKNOWN'`として存在していたため、
 * 新規データ追加は不要で、`endless.js`が`layerEvent.characterDiscovery`を見て
 * 既存の`save.setRelationshipState()`をそのまま呼ぶだけで対応した
 * （STEP36のprotocolId統合と全く同じ設計パターン）。
 *
 * 【STEP38追記】Chapter05「AI Memory」（Layer17〜20）の本文コンテンツを実装した。
 * 今回はStory Event管理システムへの新フィールド追加は不要だった（既存の`memoryId`/
 * `relationshipChange`のみで表現可能なため）。ARIAのLEVEL3「Self Aware」到達条件を
 * `finalChapterReached`から要求仕様どおりのChapter5条件（Memory010+Memory011取得+
 * Chapter5完了）へ変更した点が本Chapterの核心的な変更（`relationshipData.js`/
 * `relationshipManager.js`のコメント参照）。
 *
 * 【STEP39-2追記】Final Chapter「Genesis Protocol」（Layer21〜30）の本文コンテンツを
 * 実装し、Layer1〜30が全件IMPLEMENTEDとなった（RESERVEDプレースホルダー機構は不要になり
 * 削除。`ENVIRONMENT_BY_CHAPTER`/`LayerStoryData`参照もRESERVED専用だったため合わせて
 * 削除した）。要求仕様セクション2「Layer25: ARIAとの対話イベント、Relationship値に
 * 応じた会話分岐（ストーリー分岐はしない）」に対応するため、新たに`dialogueVariants`
 * フィールドを追加した（`memoryId`/`protocolId`/`characterDiscovery`と対になる、
 * Story Event管理の追加項目。値はARIA Relationship閾値の降順配列、または未使用なら
 * null。実際の1件選択はendless.jsの`_resolveDialogueVariant()`が行う）。Layer26では
 * Memory015取得と同時にDr. Leonを`characterDiscovery`させる（STEP37のLost Researcher
 * と全く同じ設計パターン）。要求仕様セクション2にRelationship+X等の明示的な指定が
 * 無かったため、Layer21〜30は全件`relationshipChange: null`とした（詳細はREADME.md
 * STEP39-2セクション参照）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // Layer1〜4: 実装済みのChapter01コンテンツ（STEP34セクション3のイベント名をtitleへ反映）。
  // eventIdはこのファイルで新設したStory Event識別子（`${chapterId}_layer${N}_event`）、
  // triggerは全件共通で'LAYER_CLEAR'
  const IMPLEMENTED = [
    { layerId: 1, chapterId: 'chapter01', title: 'ARIA Initialization', environment: 'env_grid', eventId: 'chapter01_layer01_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter01_layer01_clear', memoryId: null, protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 2, chapterId: 'chapter01', title: 'Memory Recovery: Genesis Beginning', environment: 'env_grid', eventId: 'chapter01_layer02_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter01_layer02_clear', memoryId: 'memfrag_001', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 3, chapterId: 'chapter01', title: 'ARIA Analysis', environment: 'env_grid', eventId: 'chapter01_layer03_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter01_layer03_clear', memoryId: null, protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 4, chapterId: 'chapter01', title: 'Chapter Complete', environment: 'env_grid', eventId: 'chapter01_layer04_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter01_layer04_clear', memoryId: 'memfrag_002', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: { character: 'aria', value: 5 } },
    // ---- STEP35: Chapter02「Lost Data」（Layer5〜8） ----
    { layerId: 5, chapterId: 'chapter02', title: 'Quantum Network Access', environment: 'env_network', eventId: 'chapter02_layer05_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter02_layer05_clear', memoryId: null, protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 6, chapterId: 'chapter02', title: 'Corrupted Data Analysis', environment: 'env_network', eventId: 'chapter02_layer06_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter02_layer06_clear', memoryId: null, protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 7, chapterId: 'chapter02', title: 'Memory Recovery: Researcher Profile', environment: 'env_network', eventId: 'chapter02_layer07_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter02_layer07_clear', memoryId: 'memfrag_003', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: { character: 'aria', value: 5 } },
    { layerId: 8, chapterId: 'chapter02', title: 'Chapter Complete', environment: 'env_network', eventId: 'chapter02_layer08_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter02_layer08_clear', memoryId: 'memfrag_004', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    // ---- STEP36: Chapter03「Color Experiment」（Layer9〜12） ----
    { layerId: 9, chapterId: 'chapter03', title: 'Color Analysis Lab Access', environment: 'env_ocean', eventId: 'chapter03_layer09_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter03_layer09_clear', memoryId: null, protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 10, chapterId: 'chapter03', title: 'Memory Recovery: Human Cognitive Pattern', environment: 'env_ocean', eventId: 'chapter03_layer10_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter03_layer10_clear', memoryId: 'memfrag_005', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: { character: 'aria', value: 5 } },
    { layerId: 11, chapterId: 'chapter03', title: 'Protocol Unlock: Color Analyzer', environment: 'env_ocean', eventId: 'chapter03_layer11_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter03_layer11_clear', memoryId: null, protocolId: 'color_analyzer', characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 12, chapterId: 'chapter03', title: 'Chapter Complete', environment: 'env_ocean', eventId: 'chapter03_layer12_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter03_layer12_clear', memoryId: 'memfrag_006', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: { character: 'aria', value: 5 } },
    // ---- STEP37: Chapter04「Silent Facility」（Layer13〜16） ----
    { layerId: 13, chapterId: 'chapter04', title: 'Silent Facility Access', environment: 'env_unknown', eventId: 'chapter04_layer13_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter04_layer13_clear', memoryId: null, protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 14, chapterId: 'chapter04', title: 'Memory Recovery: Lost Researcher Record', environment: 'env_unknown', eventId: 'chapter04_layer14_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter04_layer14_clear', memoryId: 'memfrag_007', protocolId: null, characterDiscovery: 'lost_researcher', dialogueVariants: null, relationshipChange: { character: 'lost_researcher', value: 5 } },
    { layerId: 15, chapterId: 'chapter04', title: 'Memory Recovery: Researcher-01 Profile', environment: 'env_unknown', eventId: 'chapter04_layer15_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter04_layer15_clear', memoryId: 'memfrag_008', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: { character: 'lost_researcher', value: 5 } },
    { layerId: 16, chapterId: 'chapter04', title: 'Chapter Complete', environment: 'env_unknown', eventId: 'chapter04_layer16_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter04_layer16_clear', memoryId: 'memfrag_009', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    // ---- STEP38: Chapter05「AI Memory」（Layer17〜20） ----
    { layerId: 17, chapterId: 'chapter05', title: 'Neural Memory Access', environment: 'env_forest', eventId: 'chapter05_layer17_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter05_layer17_clear', memoryId: null, protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 18, chapterId: 'chapter05', title: 'Memory Recovery: ARIA Creation Log', environment: 'env_forest', eventId: 'chapter05_layer18_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter05_layer18_clear', memoryId: 'memfrag_010', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: { character: 'aria', value: 5 } },
    { layerId: 19, chapterId: 'chapter05', title: 'Memory Recovery: Genesis AI Integration', environment: 'env_forest', eventId: 'chapter05_layer19_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter05_layer19_clear', memoryId: 'memfrag_011', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: { character: 'aria', value: 5 } },
    { layerId: 20, chapterId: 'chapter05', title: 'Chapter Complete', environment: 'env_forest', eventId: 'chapter05_layer20_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter05_layer20_clear', memoryId: 'memfrag_012', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    // ---- STEP39-2: Final Chapter「Genesis Protocol」（Layer21〜30） ----
    // 要求仕様セクション2どおりRelationship+X等の明示的な指定が無いため、Layer21〜30は
    // 全件relationshipChange:nullとした（Chapter1〜5と異なり、本Chapterはリレーション
    // シップの「読み取り」＝Layer25のdialogueVariants分岐のみを行い、新規付与は行わない
    // という設計判断。詳細はREADME.md STEP39-2セクション参照）
    { layerId: 21, chapterId: 'chapter06', title: 'Genesis Core Activation', environment: 'env_fractal', eventId: 'chapter06_layer21_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter06_layer21_clear', memoryId: null, protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 22, chapterId: 'chapter06', title: 'Memory Recovery: Genesis Core Log', environment: 'env_fractal', eventId: 'chapter06_layer22_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter06_layer22_clear', memoryId: 'memfrag_013', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 23, chapterId: 'chapter06', title: 'Memory Recovery: Researcher-01 Memory', environment: 'env_fractal', eventId: 'chapter06_layer23_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter06_layer23_clear', memoryId: 'memfrag_014', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 24, chapterId: 'chapter06', title: 'Genesis Project Accident Truth', environment: 'env_fractal', eventId: 'chapter06_layer24_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter06_layer24_clear', memoryId: null, protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    // Layer25: 「Relationship値に応じた会話分岐（ストーリー分岐はしない）」への対応として、
    // Story Event管理システムへ新たに`dialogueVariants`を追加した（既存のmemoryId/protocolId/
    // characterDiscoveryと同じ「1フィールドずつ拡張」方式）。dialogueIdは使わずnullとし、
    // 代わりにdialogueVariants（ARIA Relationship閾値の降順リスト）から、その時点の
    // relationshipManager.getRelationship('aria')以上の最初の1件だけをendless.js側で
    // 選び出してstorySteps化する（進行・報酬・Chapter進行には一切影響しない、台詞の
    // 出し分けのみ＝要求仕様どおり「ストーリー分岐はしない」）
    { layerId: 25, chapterId: 'chapter06', title: 'Dialogue with ARIA', environment: 'env_fractal', eventId: 'chapter06_layer25_event', trigger: 'LAYER_CLEAR', dialogueId: null, memoryId: null, protocolId: null, characterDiscovery: null, dialogueVariants: [
      { minRelationship: 20, dialogueId: 'chapter06_layer25_clear_high' },
      { minRelationship: 10, dialogueId: 'chapter06_layer25_clear_mid' },
      { minRelationship: 0, dialogueId: 'chapter06_layer25_clear_low' }
    ], relationshipChange: null },
    // Layer26: Memory015「Genesis Final Record」（Dr.Leon最終記録）取得と同時にDr. Leonを
    // CHARACTER DISCOVEREDさせる（STEP37のLost Researcher/Layer14と全く同じ設計パターン）
    { layerId: 26, chapterId: 'chapter06', title: 'Memory Recovery: Genesis Final Record', environment: 'env_fractal', eventId: 'chapter06_layer26_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter06_layer26_clear', memoryId: 'memfrag_015', protocolId: null, characterDiscovery: 'dr_leon', dialogueVariants: null, relationshipChange: null },
    { layerId: 27, chapterId: 'chapter06', title: 'Genesis Core Analysis', environment: 'env_fractal', eventId: 'chapter06_layer27_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter06_layer27_clear', memoryId: null, protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 28, chapterId: 'chapter06', title: 'Final Puzzle', environment: 'env_fractal', eventId: 'chapter06_layer28_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter06_layer28_clear', memoryId: null, protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 29, chapterId: 'chapter06', title: 'Analysis Complete', environment: 'env_fractal', eventId: 'chapter06_layer29_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter06_layer29_clear', memoryId: null, protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null },
    { layerId: 30, chapterId: 'chapter06', title: 'Chapter Complete', environment: 'env_fractal', eventId: 'chapter06_layer30_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter06_layer30_clear', memoryId: 'memfrag_016', protocolId: null, characterDiscovery: null, dialogueVariants: null, relationshipChange: null }
  ];

  // Layer21〜30もLayer1〜20と同じくIMPLEMENTEDへ実装済みとして統合したため（STEP39-2）、
  // 予約（locked）プレースホルダーは不要になった。Layer31以降（Endless Research専用の
  // Unknown Layer、docs/STORY_BIBLE.md 1章参照）はもともとLayer Narrative Systemの
  // 対象外であり、getByLayer()がnullを返す（endless.js側は既存のnullセーフ処理のまま）
  const ALL = IMPLEMENTED;
  const BY_LAYER = new Map(ALL.map(entry => [entry.layerId, entry]));

  /** @returns {Object|null} 指定Layerのレコード（Layer1〜30の範囲外はnull） */
  function getByLayer(layerId) {
    return BY_LAYER.get(layerId) || null;
  }

  /** @returns {Array<Object>} 指定Chapterに属する全Layerレコード（layerId昇順） */
  function getByChapter(chapterId) {
    return ALL.filter(entry => entry.chapterId === chapterId);
  }

  G.LayerContentData = { ALL, getByLayer, getByChapter };
})(typeof globalThis !== 'undefined' ? globalThis : this);
