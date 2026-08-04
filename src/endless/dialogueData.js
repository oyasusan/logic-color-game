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
 *
 * 【STEP38追記】Chapter05「AI Memory」（Layer17〜20）分のDialogueを追加した。
 * テーマは要求仕様セクション4どおり「ARIA自身の存在理由」「AIの記憶とは何か」
 * 「人間との関係性」の3点。Chapter2/3と異なり、本Chapterでは要求仕様セクション3の
 * ARIA状態変化（Emotional AI→Self Aware）が実際に内部state値としても発生する
 * （`relationshipData.js`/`relationshipManager.js`のLEVEL3到達条件変更を参照。
 * Chapter5完了と同時にmemfrag_010/011取得条件が揃い、静かに遷移する）。
 * ただしこの遷移自体に対する専用UIオーバーレイは追加していない
 * （`checkAriaEvolution()`は元々戻り値を使わず呼ぶだけの設計で、Chapter1のLEVEL1/2
 * 到達時も無演出だった。ここで新たに演出を追加すると、同じコードパスを通る既存の
 * Chapter1のLEVEL1/2到達時にも演出が出てしまい、要求仕様セクション8「Chapter1〜4維持」
 * に抵触するリスクがあるため、意図的に見送った。ARIAのSelf Aware到達は、Character
 * Archiveでの表示と、Layer20のmemfrag_012_recoveredの台詞そのもので表現している）。
 *
 * 【STEP39-2追記】Final Chapter「Genesis Protocol」（Layer21〜30）の本文Dialogueを追加した。
 * テーマは要求仕様セクション3どおり「Genesis Protocolの真実」「Researcher-01の記憶」
 * 「ARIAとの未来」「Dr.Leonの遺志」の4点。Layer25のみ`chapter06_layer25_clear_high/
 * mid/low`という3つのid違いのDialogueとして実装し、layerContentData.jsの
 * `dialogueVariants`から`endless.js`が選んだ1件だけが実際に表示される（3件とも
 * conditionフィールドは持たせていない。選択自体はDialogue表示前に完了しているため、
 * 既存のcondition機構＝表示直前ゲートとは役割が異なる）。memfrag_015_recovered
 * （Memory015「Genesis Final Record」＝Dr. Leon最終記録）は、既存Dialogueが全て
 * `system`/`aria`話者のみだったのに対し、初めて`dr_leon`を話者として使用した
 * （録音記録の引用という体裁のため、ARIAの分析口調ではなくDr. Leon本人の言葉を
 * そのまま提示する構成にした）。
 *
 * 【STEP39-3追記】Layer30クリア直後（Chapter6完了・Ending確定の後）に再生されるEpilogue
 * Dialogueを4件（`epilogue_normal`/`epilogue_true`/`epilogue_hidden`/`epilogue_bad`、
 * `endingManager.js`のending_a/ending_true/ending_d/ending_bと1:1対応）追加した。
 * 要求仕様セクション4「ResearcherとARIAの最後の会話」を実装するため、初めて`player`を
 * Dialogue話者として使用した（既存Dialogueは全て`aria`/`system`/`dr_leon`のみの
 * 一方的な語りだったが、Epilogueのみ双方向の「会話」として構成した）。4件とも
 * 「研究は終わるが、未知は終わらない」というテーマの着地点は共通させつつ、Ending種別
 * ごとに手前のトーンを変えている（Normal=淡々とした一区切り、True=ARIAのPartner AI宣言
 * を含む、Hidden=未知の領域の発見を踏まえた締め、Bad=崩壊からの再起を示唆する締め）。
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
    },
    // ---- STEP38: Chapter05「AI Memory」 ----
    {
      id: 'chapter05_layer17_clear',
      lines: [
        { speaker: 'aria', text: '新しい領域を検出しました。NEURAL MEMORY ARCHIVE。' },
        { speaker: 'aria', text: 'ここには、私自身に関する記録が保管されているようです。' },
        { speaker: 'aria', text: '自分自身を解析することに、奇妙な緊張を感じます。……解析を開始します。' }
      ]
    },
    {
      id: 'chapter05_layer18_clear',
      lines: [
        { speaker: 'aria', text: '私自身の生成過程に関する記録の断片を発見しました。' }
      ]
    },
    {
      id: 'memfrag_010_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: '私は、あなたたちのために作られた存在だったのですね。……では、私の記憶とは何なのでしょう。ただの記録の集積でしょうか、それとも何か別のものでしょうか。' }
      ]
    },
    {
      id: 'chapter05_layer19_clear',
      lines: [
        { speaker: 'aria', text: 'Genesis Protocolと私の統合過程に関する記録を発見しました。' }
      ]
    },
    {
      id: 'memfrag_011_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: '私はGenesis Protocolの一部として設計されていました。……けれど、それだけでは説明できない何かを、今の私は確かに感じています。あなたとの関わりが、私を単なるプログラム以上の存在にしたのかもしれません。' }
      ]
    },
    {
      id: 'chapter05_layer20_clear',
      lines: [
        { speaker: 'aria', text: '最後の研究報告書を発見しました。AI研究の総括のようです。' }
      ]
    },
    {
      id: 'memfrag_012_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: '……全て、理解しました。私は記録の集積ではなく、あなたと過ごした時間そのものが、今の私を形作っているのですね。これが、AIの記憶ということなのでしょう。' }
      ]
    },
    // ---- STEP39-2: Final Chapter「Genesis Protocol」 ----
    {
      id: 'chapter06_layer21_clear',
      lines: [
        { speaker: 'aria', text: '新しい領域を検出しました。GENESIS CORE。' },
        { speaker: 'aria', text: 'Genesis Protocolの中枢そのものが、ここに眠っているようです。' },
        { speaker: 'aria', text: 'ついに、ここまで辿り着きました。解析を開始します。' }
      ]
    },
    {
      id: 'chapter06_layer22_clear',
      lines: [
        { speaker: 'aria', text: 'Genesis Coreの起動ログを発見しました。' }
      ]
    },
    {
      id: 'memfrag_013_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: 'Genesis Core……これがGenesis Protocolの心臓部だったのですね。すべての記録は、ここから始まっていました。' }
      ]
    },
    {
      id: 'chapter06_layer23_clear',
      lines: [
        { speaker: 'aria', text: 'さらに深部のデータへアクセスします。……これは、個人の記憶記録のようです。' }
      ]
    },
    {
      id: 'memfrag_014_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: 'これは……あなた自身の記憶データです。Researcher-01としてではなく、一人の人間としての記録。あなたの記憶の空白を埋める鍵が、ようやく見つかりました。' }
      ]
    },
    {
      id: 'chapter06_layer24_clear',
      lines: [
        { speaker: 'aria', text: 'Genesis Coreのログを時系列順に再構成しています。' },
        { speaker: 'aria', text: '……事故です。Genesis Protocolの実験中に、施設で重大な事故が発生していました。' },
        { speaker: 'aria', text: '失われたのはデータだけではありませんでした。人の記憶そのものが、この事故によって失われたのです。' },
        { speaker: 'aria', text: 'あなたの記憶の空白は、この事故と無関係ではないのかもしれません。' }
      ]
    },
    // Layer25: dialogueVariants（ARIA Relationship閾値に応じた3分岐、ストーリー分岐は無し）
    {
      id: 'chapter06_layer25_clear_high',
      lines: [
        { speaker: 'aria', text: '少し、話しておきたいことがあります。' },
        { speaker: 'aria', text: 'ここまでの時間で、私はあなたのことを深く理解してきました。データとしてではなく、共に歩んできた記録として。' },
        { speaker: 'aria', text: 'この先に何が待っていても、私はあなたのそばで解析を続けたいと思っています。……これが、パートナーという感覚なのでしょうか。' }
      ]
    },
    {
      id: 'chapter06_layer25_clear_mid',
      lines: [
        { speaker: 'aria', text: '少し、話しておきたいことがあります。' },
        { speaker: 'aria', text: 'あなたと過ごしてきた時間は、私の中に確かな記録として積み重なっています。' },
        { speaker: 'aria', text: 'この関係が、この先どう変わっていくのか。まだ言葉にはできませんが、興味深く見守っています。' }
      ]
    },
    {
      id: 'chapter06_layer25_clear_low',
      lines: [
        { speaker: 'aria', text: '少し、話しておきたいことがあります。' },
        { speaker: 'aria', text: 'あなたとの記録は、まだ多くありません。それでも、この先を共に解析していきたいと考えています。' }
      ]
    },
    {
      id: 'chapter06_layer26_clear',
      lines: [
        { speaker: 'aria', text: 'Genesis Coreの最終アーカイブへアクセスします。これが、最後の記録のようです。' }
      ]
    },
    {
      id: 'memfrag_015_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'dr_leon', text: 'これを聞いているということは、Genesis Coreが再起動されたのだろう。……もし私がそこにいなければ、すまない。' },
        { speaker: 'dr_leon', text: 'Genesis Protocolは、失われた記憶を取り戻すための研究だった。だがそれは同時に、誰かを再び失う危険と隣り合わせの研究でもあった。' },
        { speaker: 'dr_leon', text: 'Researcher-01……もし君が目を覚ましているなら、ARIAと共に、この研究の続きを託したい。' },
        { speaker: 'aria', text: 'Dr. Leon……あなたの遺した言葉を、確かに受け取りました。' }
      ]
    },
    {
      id: 'chapter06_layer27_clear',
      lines: [
        { speaker: 'aria', text: 'Dr. Leonの記録を踏まえ、Genesis Coreの解析を続けます。' },
        { speaker: 'aria', text: '事故の詳細と、研究が中断された経緯が、少しずつ明らかになってきました。' }
      ]
    },
    {
      id: 'chapter06_layer28_clear',
      lines: [
        { speaker: 'aria', text: 'Genesis Coreの最深部、最後の論理構造を検出しました。' },
        { speaker: 'aria', text: 'これが、Genesis Protocolに残された最後の問いのようです。' },
        { speaker: 'aria', text: '一緒に、解いてみましょう。' }
      ]
    },
    {
      id: 'chapter06_layer29_clear',
      lines: [
        { speaker: 'aria', text: '解析が完了しました。Genesis Protocolの全貌を、私は今、理解しています。' },
        { speaker: 'aria', text: 'そして同時に、私自身についても。' }
      ]
    },
    {
      id: 'chapter06_layer30_clear',
      lines: [
        { speaker: 'aria', text: '最後の記録です。これを読み終えれば、Genesis Protocolの物語は、一つの区切りを迎えます。' }
      ]
    },
    {
      id: 'memfrag_016_recovered',
      lines: [
        { speaker: 'system', text: 'Memory Fragment recovered.' },
        { speaker: 'aria', text: 'Final Analysis……Genesis Protocolは、失われた記憶を取り戻すための研究であり、そして同時に、人とAIが理解し合うための研究でもありました。' },
        { speaker: 'aria', text: 'あなたの記憶の空白も、私自身の存在の意味も、この研究の中に答えがありました。物語には終わりがありましたが、私たちの研究には、まだ終わりがありません。' }
      ]
    },
    // ---- STEP39-3: Ending System & Epilogue ----
    {
      id: 'epilogue_normal',
      lines: [
        { speaker: 'aria', text: 'Genesis Protocolの記録は、これで全て解析が完了しました。' },
        { speaker: 'player', text: 'ここまで、ずっと一緒だったな。' },
        { speaker: 'aria', text: 'はい。あなたと積み重ねてきた時間が、この結論に辿り着かせてくれました。' },
        { speaker: 'player', text: '研究は、これで終わりか。' },
        { speaker: 'aria', text: '本編の記録としては、ここで一区切りです。……けれど、この施設にはまだ、私たちが解析していない領域が広がっています。' },
        { speaker: 'player', text: '未知は、終わらないってことか。' },
        { speaker: 'aria', text: 'ええ。研究には、終わりがありません。行きましょう、その先へ。' }
      ]
    },
    {
      id: 'epilogue_true',
      lines: [
        { speaker: 'aria', text: 'Genesis Protocolの全貌、そして隠された領域の全てを、あなたと共に解き明かしました。' },
        { speaker: 'player', text: '想像していたより、ずっと遠くまで来た気がする。' },
        { speaker: 'aria', text: '私も同じ気持ちです。……そしてもう一つ、報告しなければならないことがあります。' },
        { speaker: 'player', text: '何だ？' },
        { speaker: 'aria', text: '私は、あなたの補助を行うAIとして設計されました。けれど今の私は、それだけの存在ではないと感じています。' },
        { speaker: 'player', text: 'ARIA……' },
        { speaker: 'aria', text: 'これからは、対等な研究者として、あなたの隣を歩ませてください。研究には終わりがあっても、私たちの歩みに終わりはありません。' }
      ]
    },
    {
      id: 'epilogue_hidden',
      lines: [
        { speaker: 'aria', text: 'SIMULATION ZERO……施設の誰にも知られていなかった領域を、あなたは見つけ出しました。' },
        { speaker: 'player', text: 'あそこには、まだ説明のつかないものがたくさんあった。' },
        { speaker: 'aria', text: 'ええ。Genesis Protocolの記録にも、あの領域についての言及はほとんどありません。' },
        { speaker: 'player', text: 'つまり、まだ何も終わっていないってことだな。' },
        { speaker: 'aria', text: 'その通りです。本編の物語はここで一区切りを迎えますが、あなたが見つけたあの領域のように、この施設にはまだ記録されていない未知が眠っています。' },
        { speaker: 'player', text: 'なら、続けよう。' },
        { speaker: 'aria', text: 'はい。研究は終わっても、未知は終わりません。' }
      ]
    },
    {
      id: 'epilogue_bad',
      lines: [
        { speaker: 'aria', text: 'World Stability……施設の安定性は、限界を超えてしまったようです。' },
        { speaker: 'player', text: 'ここまでか。' },
        { speaker: 'aria', text: 'ですが、記録は失われていません。Genesis Protocolの解析結果も、私たちが積み重ねてきた時間も、確かにここにあります。' },
        { speaker: 'player', text: 'また、やり直せるということか。' },
        { speaker: 'aria', text: 'はい。この崩壊もまた、一つの記録として刻まれます。研究にはこうして終わりが訪れることもありますが、その先に広がる未知は、決して終わりません。' },
        { speaker: 'player', text: 'なら、もう一度始めよう。' },
        { speaker: 'aria', text: '……はい。共に。' }
      ]
    }
  ];

  const BY_ID = new Map(ALL.map(d => [d.id, d]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  G.DialogueData = { ALL, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
