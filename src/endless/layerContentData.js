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
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { LayerStoryData } = G;

  // 要求仕様のStory Bible（docs/STORY_BIBLE.md 6章）に定義済みのChapter⇔Environment対応
  const ENVIRONMENT_BY_CHAPTER = {
    chapter01: 'env_grid',
    chapter02: 'env_network',
    chapter03: 'env_ocean',
    chapter04: 'env_unknown',
    chapter05: 'env_forest',
    chapter06: 'env_fractal'
  };

  // Layer1〜4: 実装済みのChapter01コンテンツ（STEP34セクション3のイベント名をtitleへ反映）。
  // eventIdはこのファイルで新設したStory Event識別子（`${chapterId}_layer${N}_event`）、
  // triggerは全件共通で'LAYER_CLEAR'
  const IMPLEMENTED = [
    { layerId: 1, chapterId: 'chapter01', title: 'ARIA Initialization', environment: 'env_grid', eventId: 'chapter01_layer01_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter01_layer01_clear', memoryId: null, protocolId: null, characterDiscovery: null, relationshipChange: null },
    { layerId: 2, chapterId: 'chapter01', title: 'Memory Recovery: Genesis Beginning', environment: 'env_grid', eventId: 'chapter01_layer02_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter01_layer02_clear', memoryId: 'memfrag_001', protocolId: null, characterDiscovery: null, relationshipChange: null },
    { layerId: 3, chapterId: 'chapter01', title: 'ARIA Analysis', environment: 'env_grid', eventId: 'chapter01_layer03_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter01_layer03_clear', memoryId: null, protocolId: null, characterDiscovery: null, relationshipChange: null },
    { layerId: 4, chapterId: 'chapter01', title: 'Chapter Complete', environment: 'env_grid', eventId: 'chapter01_layer04_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter01_layer04_clear', memoryId: 'memfrag_002', protocolId: null, characterDiscovery: null, relationshipChange: { character: 'aria', value: 5 } },
    // ---- STEP35: Chapter02「Lost Data」（Layer5〜8） ----
    { layerId: 5, chapterId: 'chapter02', title: 'Quantum Network Access', environment: 'env_network', eventId: 'chapter02_layer05_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter02_layer05_clear', memoryId: null, protocolId: null, characterDiscovery: null, relationshipChange: null },
    { layerId: 6, chapterId: 'chapter02', title: 'Corrupted Data Analysis', environment: 'env_network', eventId: 'chapter02_layer06_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter02_layer06_clear', memoryId: null, protocolId: null, characterDiscovery: null, relationshipChange: null },
    { layerId: 7, chapterId: 'chapter02', title: 'Memory Recovery: Researcher Profile', environment: 'env_network', eventId: 'chapter02_layer07_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter02_layer07_clear', memoryId: 'memfrag_003', protocolId: null, characterDiscovery: null, relationshipChange: { character: 'aria', value: 5 } },
    { layerId: 8, chapterId: 'chapter02', title: 'Chapter Complete', environment: 'env_network', eventId: 'chapter02_layer08_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter02_layer08_clear', memoryId: 'memfrag_004', protocolId: null, characterDiscovery: null, relationshipChange: null },
    // ---- STEP36: Chapter03「Color Experiment」（Layer9〜12） ----
    { layerId: 9, chapterId: 'chapter03', title: 'Color Analysis Lab Access', environment: 'env_ocean', eventId: 'chapter03_layer09_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter03_layer09_clear', memoryId: null, protocolId: null, characterDiscovery: null, relationshipChange: null },
    { layerId: 10, chapterId: 'chapter03', title: 'Memory Recovery: Human Cognitive Pattern', environment: 'env_ocean', eventId: 'chapter03_layer10_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter03_layer10_clear', memoryId: 'memfrag_005', protocolId: null, characterDiscovery: null, relationshipChange: { character: 'aria', value: 5 } },
    { layerId: 11, chapterId: 'chapter03', title: 'Protocol Unlock: Color Analyzer', environment: 'env_ocean', eventId: 'chapter03_layer11_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter03_layer11_clear', memoryId: null, protocolId: 'color_analyzer', characterDiscovery: null, relationshipChange: null },
    { layerId: 12, chapterId: 'chapter03', title: 'Chapter Complete', environment: 'env_ocean', eventId: 'chapter03_layer12_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter03_layer12_clear', memoryId: 'memfrag_006', protocolId: null, characterDiscovery: null, relationshipChange: { character: 'aria', value: 5 } },
    // ---- STEP37: Chapter04「Silent Facility」（Layer13〜16） ----
    { layerId: 13, chapterId: 'chapter04', title: 'Silent Facility Access', environment: 'env_unknown', eventId: 'chapter04_layer13_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter04_layer13_clear', memoryId: null, protocolId: null, characterDiscovery: null, relationshipChange: null },
    { layerId: 14, chapterId: 'chapter04', title: 'Memory Recovery: Lost Researcher Record', environment: 'env_unknown', eventId: 'chapter04_layer14_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter04_layer14_clear', memoryId: 'memfrag_007', protocolId: null, characterDiscovery: 'lost_researcher', relationshipChange: { character: 'lost_researcher', value: 5 } },
    { layerId: 15, chapterId: 'chapter04', title: 'Memory Recovery: Researcher-01 Profile', environment: 'env_unknown', eventId: 'chapter04_layer15_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter04_layer15_clear', memoryId: 'memfrag_008', protocolId: null, characterDiscovery: null, relationshipChange: { character: 'lost_researcher', value: 5 } },
    { layerId: 16, chapterId: 'chapter04', title: 'Chapter Complete', environment: 'env_unknown', eventId: 'chapter04_layer16_event', trigger: 'LAYER_CLEAR', dialogueId: 'chapter04_layer16_clear', memoryId: 'memfrag_009', protocolId: null, characterDiscovery: null, relationshipChange: null }
  ];

  // Layer17〜30: 要求仕様セクション3どおりの予約（locked）プレースホルダー。
  // chapterId/environmentはlayerStoryData.js/ENVIRONMENT_BY_CHAPTERから機械的に導出する
  const RESERVED = [];
  for (let layer = 17; layer <= 30; layer++) {
    const chapter = LayerStoryData.getByLayer(layer);
    const chapterId = chapter ? chapter.id : null;
    RESERVED.push({
      layerId: layer,
      chapterId,
      title: null,
      environment: chapterId ? ENVIRONMENT_BY_CHAPTER[chapterId] : null,
      eventId: null,
      trigger: null,
      dialogueId: null,
      memoryId: null,
      protocolId: null,
      characterDiscovery: null,
      relationshipChange: null,
      locked: true
    });
  }

  const ALL = IMPLEMENTED.concat(RESERVED);
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
