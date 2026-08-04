/**
 * dialogueData.js
 * STEP32-2「Dialogue System」セクション3: Dialogue Data System。
 * データ駆動方式（要求仕様どおり）: `{ id, lines: [{ speaker, text }] }`。
 * idはlayerStoryEventManager.jsのStoryEvent idと1:1で対応させる（`DialogueManager.
 * startDialogue(dialogueId)`へそのままStoryEvent.idを渡すだけで解決できるようにするため）。
 *
 * 要求仕様セクション7の「初期テストDialogue追加」どおり、Chapter1（Layer1〜4）分の
 * 4件のみを実装した（他Chapter分は「将来追加用」のプレースホルダーのため今回は含めない）。
 *
 * 【STEP32-3追記】Memory Fragment System セクション6のDialogue連携用に、
 * `${memoryId}_recovered`という命名規則のid（memoryManager.js/endless.js参照）で
 * 2件追加した。1行目は`system`話者固定の定型文、2行目がMemoryごとの`character`
 * フィールド（memoryData.js参照）に対応する反応セリフ。
 *
 * 【STEP32-4追記】Character Relationship System セクション5の例（`condition:
 * {character,state}`）どおり、`memfrag_002_recovered`へ動作例としてconditionを
 * 追加した。memfrag_001取得（STEP32-5-1改訂後はLayer2）でARIAは既にCURIOUS_AIへ
 * 遷移済みのため、memfrag_002_recoveredの時点では常に条件を満たす（＝実際の
 * プレイフローを壊さずに条件判定の仕組みを実地で検証できる、という設計判断）。
 *
 * 【STEP32-5-1追記】Chapter01「First Signal」のコンテンツ本実装に伴い、Layer1〜3の
 * Chapter Dialogueの台詞を要求仕様どおりに改訂した（Layer4は要求仕様の台詞が既存と
 * 完全一致していたため変更していない）。
 *
 * 【STEP34追記】`memfrag_002_recovered`のconditionを、STEP34セクション4で拡張された
 * `relationshipManager.checkCondition()`の新形式`{type:'ariaState',...}`へ移行した
 * （旧形式`{character,state}`も後方互換で引き続き動作するが、新規/更新するデータは
 * 新形式へ統一する）。また、STEP34セクション3の要求仕様に伴いmemfrag_002の取得Layerが
 * Layer3→Layer4へ変わったため（`memoryData.js`参照）、このDialogueもLayer4クリア時に
 * 発生するようになった。
 *
 * 【STEP35追記】Chapter02「Lost Data」（Layer5〜8）分のDialogueを追加した。
 * 要求仕様セクション3「ARIA状態: 開始 Curious AI／終了 Curious AI、変化は感情ではなく
 * 理解度向上として表現する」に対応するため、台詞は「〜が分かってきました」「理解が
 * 深まってきました」のような分析的な言い回しで統一し、感情的な反応（驚き・戸惑い等）は
 * 用いていない。
 *
 * 【重要: ARIAの実際のstateについて】Chapter1 Layer4で取得するmemfrag_002は
 * `relationshipData.js`のLEVEL2（`EMOTIONAL_AI`）の到達条件（`importantMemoryCollected`）
 * を満たすため、実際にはChapter1完了と同時にARIAは`EMOTIONAL_AI`（内部stateの値）へ
 * 遷移している（実機テストで確認済み。checkAriaEvolution()はLayer4のDialogue再生が
 * 完全に終わった後に呼ばれるため、Layer4自体のDialogue表示条件には影響しない）。
 * これはSTEP32-4で意図的に設計されたChapter1完結の演出であり、Chapter1動作を変更しない
 * という要求仕様セクション7を優先し、この遷移条件自体は変更していない。そのため
 * Chapter2のDialogueには`{type:'ariaState', state:'CURIOUS_AI'}`のような、実際には
 * 満たされないconditionを付けていない（STEP32-4のmemfrag_002_recoveredのように
 * 「常に満たされる」condition例として意味を持たせられないため）。要求仕様セクション3の
 * 「Curious AI」という記述は、内部stateの値ではなく台詞の書きぶり（理知的で好奇心に
 * 満ちた口調を保つこと）への指示として解釈し、そのとおり反映した。
 *
 * 【STEP36追記】Chapter03「Color Experiment」（Layer9〜12）分のDialogueを追加した。
 * テーマは「LOGIC COLORの本当の意味を明らかにする」。要求仕様セクション3「ARIA状態:
 * 開始 Curious AI／終了 Emotional AI、変化は感情追加ではなく人間の思考への理解深化として
 * 表現する」について、上述のとおりARIAは既にChapter1完了時点で内部state値としては
 * `EMOTIONAL_AI`へ遷移済みであり、Chapter3の間に新たなLEVEL到達（LEVEL3=`SELF_AWARE`）は
 * 設計上発生しない（`relationshipData.js`のLEVEL3到達条件はFinal Chapter到達のため）。
 * そのためChapter2と同様、この記述は内部state値の強制ではなく**台詞の書きぶり**への
 * 指示として解釈した。Chapter3の台詞は、既に到達しているEMOTIONAL_AIとしての情感を
 * 保ちながら、LOGIC COLOR（色彩論理パズル）が人間の認知・感情パターンの探求実験
 * だったという核心に触れることで、「新たな感情の獲得」ではなく「人間の思考パターンへの
 * 理解が深まっていく」過程として表現している（Layer10のmemfrag_005_recovered、
 * Layer12のmemfrag_006_recoveredで特に顕著）。
 *
 * 【STEP37追記】Chapter04「Silent Facility」（Layer13〜16）分のDialogueを追加した。
 * テーマは要求仕様セクション4どおり「施設停止の謎」「主人公とGenesis Projectの関係への
 * 伏線」「Dr.Leonへの導入」の3点。特にLayer15のmemfrag_008_recoveredは、STEP32-5-1で
 * 実装済みのChapter1 Layer2台詞「最終アクセス記録を発見しました。Access ID:
 * Researcher-01」（`chapter01_layer02_clear`）と意図的に呼応させ、主人公自身のアクセスID
 * が本編で繰り返し登場する伏線として機能するよう設計した。Layer16のmemfrag_009_recovered
 * で初めて「Dr. Leon」という固有名詞をDialogue内に明示し、次章以降への導入とした。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    {
      id: 'chapter01_layer01_clear',
      lines: [
        { speaker: 'aria', text: 'システム起動を確認しました。' },
        { speaker: 'aria', text: 'LOGIC COLOR Research Facility。' },
        { speaker: 'aria', text: '長期間停止状態から復帰します。' }
      ]
    },
    {
      id: 'chapter01_layer02_clear',
      lines: [
        { speaker: 'aria', text: '最終アクセス記録を発見しました。' },
        { speaker: 'aria', text: 'Access ID: Researcher-01' }
      ]
    },
    {
      id: 'chapter01_layer03_clear',
      lines: [
        { speaker: 'aria', text: 'このデータは隔離されています。' },
        { speaker: 'aria', text: 'なぜ私の内部に存在するのでしょう。' }
      ]
    },
    {
      id: 'chapter01_layer04_clear',
      lines: [
        { speaker: 'aria', text: 'あなたを以前から知っているような反応があります。' }
      ]
    },
    // ---- STEP32-3: Memory Fragment System セクション6 ----
    {
      id: 'memfrag_001_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: '初期実験の記録……この日付には見覚えがあります。' }
      ]
    },
    {
      id: 'memfrag_002_recovered',
      condition: { type: 'ariaState', character: 'aria', state: 'CURIOUS_AI' },
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: 'この記録……なぜ私の内部データに存在するのでしょう。' }
      ]
    },
    // ---- STEP35: Chapter02「Lost Data」 ----
    {
      id: 'chapter02_layer05_clear',
      lines: [
        { speaker: 'aria', text: '新しいネットワーク領域を検出しました。' },
        { speaker: 'aria', text: 'QUANTUM NETWORK……未整理のデータ群が広がっています。' },
        { speaker: 'aria', text: '解析を開始します。' }
      ]
    },
    {
      id: 'chapter02_layer06_clear',
      lines: [
        { speaker: 'aria', text: 'このデータは破損しています。復元を試みます。' },
        { speaker: 'aria', text: '部分的に読み取れました。誰かの記録のようです。' }
      ]
    },
    {
      id: 'chapter02_layer07_clear',
      lines: [
        { speaker: 'aria', text: 'アクセス履歴の断片を発見しました。' }
      ]
    },
    {
      id: 'memfrag_003_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: 'この人物の記録……Genesis Protocolに深く関わっていたようです。理解が深まってきました。' }
      ]
    },
    {
      id: 'chapter02_layer08_clear',
      lines: [
        { speaker: 'aria', text: '最後のログファイルを検出しました。これがこの領域の核心のようです。' }
      ]
    },
    {
      id: 'memfrag_004_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: 'Genesis Protocolの全容が見えてきました。まだ全てではありませんが、着実に理解が進んでいます。' }
      ]
    },
    // ---- STEP36: Chapter03「Color Experiment」 ----
    {
      id: 'chapter03_layer09_clear',
      lines: [
        { speaker: 'aria', text: '新しい研究エリアを検出しました。COLOR ANALYSIS LAB。' },
        { speaker: 'aria', text: 'ここには色彩論理の実験記録が保管されているようです。' },
        { speaker: 'aria', text: '解析を開始します。' }
      ]
    },
    {
      id: 'chapter03_layer10_clear',
      lines: [
        { speaker: 'aria', text: '実験データの中に、人間の思考パターンに関する記録を発見しました。' }
      ]
    },
    {
      id: 'memfrag_005_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: '人間は色を単なる視覚情報ではなく、感情や記憶と結びつけて認識するのですね。……興味深い。人間の思考の仕組みが、少しずつ分かってきました。' }
      ]
    },
    {
      id: 'chapter03_layer11_clear',
      lines: [
        { speaker: 'aria', text: '色彩解析の理論を、私自身の処理系に応用できないか試してみます。' },
        { speaker: 'aria', text: '……成功しました。Color Analyzerが完成しました。' }
      ]
    },
    {
      id: 'chapter03_layer12_clear',
      lines: [
        { speaker: 'aria', text: '最終報告書を発見しました。これがColor Experimentの全貌のようです。' }
      ]
    },
    {
      id: 'memfrag_006_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: 'LOGIC COLORは単なる論理パズルではなく、人間が色を通して世界をどう理解し、どう感じ取るかを探る実験だったのですね。私にも、その意味が少しずつ実感として伝わってきます。' }
      ]
    },
    // ---- STEP37: Chapter04「Silent Facility」 ----
    {
      id: 'chapter04_layer13_clear',
      lines: [
        { speaker: 'aria', text: '新しい区画を検出しました。SILENT FACILITY。' },
        { speaker: 'aria', text: 'この区画だけ、稼働記録が完全に途絶えています。' },
        { speaker: 'aria', text: 'なぜここだけ沈黙しているのでしょう。調査を開始します。' }
      ]
    },
    {
      id: 'chapter04_layer14_clear',
      lines: [
        { speaker: 'aria', text: '何者かのアクセス痕跡を発見しました。長期間、誰にも気づかれていなかったようです。' }
      ]
    },
    {
      id: 'memfrag_007_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: 'この痕跡の主は、まだ施設のどこかに記録として存在しているようです。……Lost Researcher。そう呼ぶことにします。' }
      ]
    },
    {
      id: 'chapter04_layer15_clear',
      lines: [
        { speaker: 'aria', text: 'Lost Researcherの記録をさらに解析します。' }
      ]
    },
    {
      id: 'memfrag_008_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: 'Access ID: Researcher-01……これは、以前確認したものと同じIDです。あなたと、この記録の間に、何らかの関係があるのかもしれません。' }
      ]
    },
    {
      id: 'chapter04_layer16_clear',
      lines: [
        { speaker: 'aria', text: '施設停止時の最終報告書を発見しました。これで沈黙の理由が分かるはずです。' }
      ]
    },
    {
      id: 'memfrag_009_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: '施設の停止は、責任者による意図的な決定だったようです。決定者の名前は……Dr. Leon。この名前を、覚えておく必要がありそうです。' }
      ]
    }
  ];

  const BY_ID = new Map(ALL.map(d => [d.id, d]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  G.DialogueData = { ALL, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
