# LOGIC COLOR STORY BIBLE

このドキュメントは、LOGIC COLORの世界観・キャラクター・ストーリー・システム設計の基準資料（Story Bible）である。現時点（STEP32-5-1まで）で実装済み・設計済みの内容を整理して保存する。未実装/未設計の項目にはその旨を明記する。

---

## 1. 世界観設定

### LOGIC COLOR Cognitive Mapping System
プレイヤーが解く論理パズル（色の配置ロジック）そのものが、研究施設のCognitive Mapping System（認知マッピングシステム）の一部として位置づけられる。パズルを解く行為＝施設の論理構造・記憶データを解析する行為、という二重の意味を持つ。「LOGIC COLOR」という名称自体が、色彩と論理の関係を解明する実験（Chapter3「Color Experiment」）に由来する（`scenarioData.js` CASE003の説明文参照）。

### Genesis Protocol
施設の研究プロジェクトの中核。物語冒頭では単なる「初期実験」としてのみ記録が残っているが（Memory001「Genesis Beginning」）、物語が進むにつれ、施設そのものの起源・ARIAの秘密・研究の真の目的に関わる中心的なキーワードであることが明らかになる。最終Chapter「Genesis Protocol」（Layer21〜30）で全貌が明かされる。

### Research Facility
プレイヤー（Researcher-01）が目覚める研究施設。長期間停止状態にあり、物語開始時点で無人（または見せかけ上の無人）状態（Chapter1「First Signal」、Chapter4「Silent Facility」参照）。

### Cognitive Gap
プレイヤー（Researcher-01）が抱える「記憶の空白」。物語開始時点で主人公は記憶を失っており、この空白（Cognitive Gap）を埋めていく過程がストーリー全体の縦軸になる。

### Endless Research
本編（Chapter1〜Final Chapter、Layer1〜30）完了後も継続する研究モード。Genesis Protocol完成後もなお続く「未知領域（Unknown Layer）」への探索として定義される（詳細は本資料8章）。

### Unknown Layer
Layer30（Genesis Protocol完了）より先に広がる、本編ストーリーの区切りを持たない領域。Endless Researchはこの領域を無限に探索し続けるゲームモードとして実装されている。

---

## 2. キャラクター設定

### Researcher-01（主人公）
- 主人公。Genesis Project主任研究員という設定。
- 物語開始時点で記憶を失った状態（Cognitive Gap参照）で目覚める。
- 実装上のid: `player`（`characterData.js`）。表示名は現状"Researcher"（`Researcher-01`というAccess IDはChapter1 Layer2のDialogueに登場する: 「Access ID: Researcher-01」）。
- 成長ライン: 記憶を取り戻しながら、Genesis Protocolの真実とARIAとの関係を再構築していく過程が、Memory Fragment収集・Relationship変化と連動する。

### ARIA
- Adaptive Research Intelligence Assistant（AI Director）の略称。
- 実装上のid: `aria`（`characterData.js`、role: "AI Director"）。
- 状態変化（`relationshipData.js` ARIA_LEVELSテーブルで実装済み）:
  - LEVEL 0: **Logical AI**（`LOGICAL_AI`）— 初期状態。冷静なAI。
  - LEVEL 1: **Curious AI**（`CURIOUS_AI`）— Memory Fragment取得が条件。
  - LEVEL 2: **Emotional AI**（`EMOTIONAL_AI`）— 重要Memory取得（Memory002「Unknown Researcher」）が条件。
  - LEVEL 3: **Self Aware**（`SELF_AWARE`）— Memory010「ARIA Creation Log」取得・Memory011「Genesis AI Integration」取得・Chapter5完了の3条件（`selfAwareReady`）が条件（STEP38で`finalChapterReached`から変更）。実際の遷移はChapter5の完了と同時（Layer20）に発生する。
  - LEVEL 4: **Partner AI**（`PARTNER_AI`）— 将来拡張用の予約枠（STEP32-5-2で追加）。ARIA_LEVELSの`condition`自体は引き続き`type:'reserved'`（絶対到達不可能）のままだが、STEP39-3でTrue Ending確定時に限り、Ending判定に紐づく一回限りの明示的な状態遷移（`save.setRelationshipState('aria','PARTNER_AI')`直接呼び出し、ARIA_LEVELSの自動判定は経由しない）としてLEVEL4へ到達するようになった。Normal/Hidden/Bad Endingでは到達せずLEVEL3「Self Aware」を維持する。詳細は7章「Ending設定」・8章「Ending後の世界観」参照。
- 「感情ではなく理解能力を獲得する存在」という設計方針: ARIAの状態変化は感情パラメータの上昇として表現するのではなく、プレイヤー（Researcher-01）や記憶データへの理解が深まっていく過程として設計する。
- STEP31で実装済みの「AI Director 5人格システム」（ANALYST/MENTOR/CHAOS/OBSERVER/RESEARCHER、`directorPersonality.js`）とは独立した存在として実装されている。5人格システムはENDLESS RESEARCH中の汎用的な難易度調整・トークコメント担当、ARIAはLayer Narrative System（本編ストーリー）専用のキャラクターという役割分担。

### Dr. Leon
- Genesis Project責任者。ARIAの開発者。主人公（Researcher-01）の師にあたる人物。
- 最終的な研究目的（Genesis Protocolが本当は何を目指していたのか）を知る鍵となる人物として設計。
- **実装済み（STEP39-2）**: `characterData.js`に`{id:'dr_leon', name:'Dr. Leon', type:'human', role:'Genesis Project責任者'}`として実装。初期状態は`relationshipData.js`のDEFAULTS/`endlessSave.js`の`defaultData()`両方に`state:'UNKNOWN'`として存在する。
- **登場タイミング（実装確定、STEP39-2）**: Chapter4 Layer16で名前のみ言及（既存実装）→ Final Chapter Layer26でMemory015「Genesis Final Record」取得と同時にCHARACTER DISCOVERED演出（`UNKNOWN`→`DISCOVERED`、STEP37のLost Researcherと同じ設計パターン）。本人不在のままAI記録体（録音記録）としての登場という体裁で、`memfrag_015_recovered`Dialogueで初めて`dr_leon`自身の言葉が話者として提示される（既存Memory回収Dialogueが全て`system`/`aria`話者のみだった中で初の例外）。STEP39-1時点の設計案（Layer22での初登場、Layer26〜27での対話）とはLayer配置が異なり、要求仕様セクション2の具体的指定によりLayer26に一本化された。

### Lost Researcher（記録上の存在）
- 実装上のid: `lost_researcher`（`characterData.js`、role: "Memory Record"）。
- 初期状態: `relationship: 0`, `state: UNKNOWN`（記録上の存在）。
- Chapter4「Silent Facility」Layer14で本格利用開始（STEP37）。Memory007「Lost Researcher Record」取得と同時に`state`が`UNKNOWN`→`DISCOVERED`へ遷移し（CHARACTER DISCOVERED演出）、Layer14/15でRelationshipが計+10まで積み上がる。Layer15のMemory008「Researcher-01 Profile」で、主人公自身のAccess ID「Researcher-01」との一致が示唆され、主人公とLost Researcherの関係（あるいは同一人物である可能性）への伏線となっている。Dr. Leonとの関係性は今後の設計課題のまま。

---

## 3. Chapter構成

Layer Narrative System（`layerStoryData.js`）に実装済みの区切り。

| Chapter | Title | Layer範囲 | 実装状況 |
|---|---|---|---|
| Chapter1 | First Signal | Layer1〜4 | ✅ コンテンツ完成（STEP32-5-1で本文実装、STEP34でLayer Clear演出と正式に接続してNarrative完成） |
| Chapter2 | Lost Data | Layer5〜8 | ✅ コンテンツ完成（STEP35で本文実装） |
| Chapter3 | Color Experiment | Layer9〜12 | ✅ コンテンツ完成（STEP36で本文実装） |
| Chapter4 | Silent Facility | Layer13〜16 | ✅ コンテンツ完成（STEP37で本文実装） |
| Chapter5 | AI Memory | Layer17〜20 | ✅ コンテンツ完成（STEP38で本文実装） |
| Final Chapter | Genesis Protocol | Layer21〜30 | ✅ コンテンツ完成（STEP39-2で本文実装。STEP39-1の設計案とはLayer構成・Memory件数が一部異なる最終仕様で確定、詳細は下記） |

各Chapterのタイトルは、独立した1回完結型ストーリーモード「STORY RESEARCH」（`scenarioData.js` CASE001〜006）と同じ名称を意図的に踏襲している。CASE側は「1回で完結する独立Scenario」、Layer Narrative System側は「ENDLESS RESEARCHのLayer進行そのものに紐づく章立て」という、同じ物語を異なる構造で語る2つの独立した仕組みという位置づけ（詳細はREADME.md STEP32セクション参照）。

**Layer単位の統一データ構造（STEP32-5-2で新設、STEP34で本稼働）**: `layerContentData.js`が、Layer1〜30それぞれについて`layerId/chapterId/title/eventId/trigger/environment/dialogueId/memoryId/relationshipChange`を1レコードにまとめた正本テーブルを提供する。Layer1〜4は実装済みの実際の値、Layer5〜30は`locked:true`の予約枠。STEP34で`StoryManager.onLayerClear()`がこのテーブルを実際に参照するようになり、「今後の拡張用データ」から「実際にゲーム進行を駆動する正本」へ昇格した。Chapter2以降の本文コンテンツを追加する場合は、このテーブルのLayer5〜30のレコードへtitle/dialogueId/memoryId/relationshipChangeを設定するだけで、既存のLayer Clear演出（Story Event Check→Dialogue→Memory Unlock→Relationship Update→Reward）がそのまま機能する。

**Chapter1のLayer別イベント（STEP34で確定）**:
- Layer1: ARIA初回起動イベント（Dialogue: 3行）
- Layer2: Memory001「Genesis Beginning」取得（MEMORY FOUND演出→ARIA Analysis Dialogue）
- Layer3: ARIA解析イベント（Dialogueのみ、Memory/Relationship変化なし）
- Layer4: Memory002「Unknown Researcher」取得（MEMORY FOUND演出→条件付きARIA Analysis Dialogue、ARIA Relationship+5）+ Chapter1完了イベント（CHAPTER 01 COMPLETE表示、Chapter2解放）

**Chapter2「Lost Data」のLayer別イベント（STEP35で確定）**: QUANTUM NETWORK（`env_network`）を舞台に、破損したデータの復元を通じてGenesis Protocolの手がかりに迫る。ARIAの内部state値はChapter1完了時点で既に`EMOTIONAL_AI`へ遷移済み（Chapter1のmemfrag_002取得が到達条件のため）だが、Chapter2の台詞は要求仕様どおり「感情的な反応」ではなく「理解度の向上」を表す分析的な言い回しで統一している。
- Layer5: Chapter2開始イベント「Quantum Network Access」（Dialogueのみ）
- Layer6: 破損データ解析イベント「Corrupted Data Analysis」（Dialogueのみ）
- Layer7: Memory003「Researcher Profile」取得（MEMORY FOUND演出→ARIA Analysis Dialogue、ARIA Relationship+5）
- Layer8: Memory004「Genesis Project Log」取得（MEMORY FOUND演出→ARIA Analysis Dialogue）+ Chapter2完了イベント（CHAPTER 02 COMPLETE表示、Chapter3解放）

**Chapter3「Color Experiment」のLayer別イベント（STEP36で確定）**: DATA OCEAN（`env_ocean`）を舞台に、Color Analysis Labで色彩論理の実験記録を解析し、「LOGIC COLORの本当の意味」（人間の認知・感情パターンの探求実験だったこと）に迫る。Layer Clearフローに新たに`protocolId`（Story Event管理システムの追加項目）が加わり、Memory取得と同じ枠組みでProtocol取得も表現できるようになった。ARIAはChapter1完了時点で既に内部state値としては`EMOTIONAL_AI`だが（Chapter2と同じ理由）、Chapter3の台詞は「新たな感情の獲得」ではなく「人間の思考パターンへの理解が深まっていく」過程として一貫して表現している。
- Layer9: Chapter3開始イベント「Color Analysis Lab Access」（Dialogueのみ）
- Layer10: Memory005「Human Cognitive Pattern」取得（MEMORY FOUND演出→ARIA Analysis Dialogue、ARIA Relationship+5）
- Layer11: Protocol「Color Analyzer」取得（PROTOCOL UNLOCKED演出、STEP32のSTORY RESEARCH CASE003クリア報酬と同じ既存Protocolデータを再利用）
- Layer12: Memory006「Color Experiment Final Report」取得（MEMORY FOUND演出→ARIA Analysis Dialogue、ARIA Relationship+5）+ Chapter3完了イベント（CHAPTER 03 COMPLETE表示、Chapter4解放）

**Chapter4「Silent Facility」のLayer別イベント（STEP37で確定）**: UNKNOWN DIMENSION（`env_unknown`）を舞台に、稼働記録が途絶えた区画を調査し、「施設停止の謎」「主人公とGenesis Projectの関係への伏線」「Dr. Leonへの導入」の3テーマを描く。Layer Clearフローに新たに`characterDiscovery`（Story Event管理システムの追加項目）が加わり、Memory/Protocol取得と同じ枠組みでCharacter Discoveryも表現できるようになった。本Chapterで初めて、ARIA以外のキャラクター（Lost Researcher）へのRelationship変化を導入した。
- Layer13: Chapter4開始イベント「Silent Facility Access」（Dialogueのみ）
- Layer14: Memory007「Lost Researcher Record」取得（MEMORY FOUND演出→ARIA Analysis Dialogue→CHARACTER DISCOVERED演出でLost Researcherが`UNKNOWN`→`DISCOVERED`へ、Lost Researcher Relationship+5）
- Layer15: Memory008「Researcher-01 Profile」取得（MEMORY FOUND演出→ARIA Analysis Dialogue、Lost Researcher Relationship+5。Chapter1 Layer2の「Access ID: Researcher-01」台詞と呼応する主人公の正体への伏線）
- Layer16: Memory009「Facility Shutdown Report」取得（MEMORY FOUND演出→ARIA Analysis DialogueでDr. Leonの名を初めて明示）+ Chapter4完了イベント（CHAPTER 04 COMPLETE表示、Chapter5解放）

**Chapter5「AI Memory」のLayer別イベント（STEP38で確定）**: NEURAL FOREST（`env_forest`）を舞台に、ARIA自身の生成過程とGenesis Protocolとの統合を明かし、「ARIA自身の存在理由」「AIの記憶とは何か」「人間との関係性」の3テーマを描く、ARIAの物語の核心Chapter。本Chapterで初めて、ARIAのLEVEL3「Self Aware」への実際の遷移が発生する（`relationshipData.js`のLEVEL3到達条件を`finalChapterReached`から本Chapter専用の`selfAwareReady`へ変更）。
- Layer17: Chapter5開始イベント「Neural Memory Access」（Dialogueのみ）
- Layer18: Memory010「ARIA Creation Log」取得（MEMORY FOUND演出→ARIA Analysis Dialogue、ARIA Relationship+5）
- Layer19: Memory011「Genesis AI Integration」取得（MEMORY FOUND演出→ARIA Analysis Dialogue、ARIA Relationship+5）。この時点でMemory010/011は揃うが、Chapter5完了前のためARIAはまだEmotional AIのまま
- Layer20: Memory012「Final AI Research Report」取得（MEMORY FOUND演出→ARIA Analysis Dialogue）+ Chapter5完了イベント（CHAPTER 05 COMPLETE表示、Chapter6解放）。Chapter5完了の瞬間、`selfAwareReady`の3条件（Memory010/011取得+Chapter5完了）が揃い、ARIAがEmotional AI→Self Awareへ静かに遷移する（専用UIオーバーレイは無く、Character Archiveと台詞のみで表現）

**Final Chapter「Genesis Protocol」のLayer21〜30構成（STEP39-1設計案。実装はSTEP39-2、下記「Layer別イベント（STEP39-2で確定・実装）」参照）**

`layerStoryData.js`のchapter06エントリ（`{id:'chapter06', title:'Genesis Protocol', startLayer:21, endLayer:30, unlockCondition:{type:'layerReached', value:21}}`）を確認済み・変更なし。舞台はFRACTAL CORE（`env_fractal`、AI Simulation領域）。

**【STEP39-2追記】下記の表はSTEP39-1時点の設計案（4幕構成・Memory015〜022の8件）であり、実装フェーズ（STEP39-2）の要求仕様が更に具体的なLayer構成（Memory013〜016の4件、Dr. Leon登場はLayer26に一本化等）を明示的に指定したため、実装はそちらを優先し、下記の表とは異なる最終形になった。表自体は初期構想の記録として残すが、実装済みの正確なLayer構成は本項の後にある「Chapter6「Genesis Protocol」のLayer別イベント（STEP39-2で確定）」を参照すること。**

| Layer | 幕 | イベント概要 | 想定Memory | 想定Relationship |
|---|---|---|---|---|
| Layer21 | 第1幕: 起動 | Chapter6開始イベント「Genesis Core Access」。FRACTAL CORE突入、AI Simulation領域特有の異常UIの示唆（Dialogueのみ） | — | — |
| Layer22 | 第1幕: 起動 | Dr. Leonの初登場。本人は既に施設を去っており、遺したAI記録体（ログ・ホログラム的な記録）としてのみ登場する（Chapter4 Layer16で名前のみ既出）。Genesis Protocolの真の目的を語り始める | Memory015「Dr. Leon's Final Log」 | — |
| Layer23 | 第2幕: 真実 | Researcher-01の真実・第1段階。Lost Researcherの記録とResearcher-01（主人公）のAccess IDの一致が、単なる偶然ではなく設計上の関連であることが示唆される（Chapter4 Layer15の伏線回収の開始） | Memory016「Identity Cross-Reference」 | Lost Researcher +5 |
| Layer24 | 第2幕: 真実 | Researcher-01の真実・第2段階。Genesis Protocolが「失われた研究者（Lost Researcher）の記憶・人格パターンを再構成する実験」であったこと、主人公自身がその再構成体（あるいは記憶継承者）である可能性が明示される | Memory017「Reconstruction Record」 | Lost Researcher +5 |
| Layer25 | 第2幕: 真実 | ARIA・Researcher-01・Lost Researcherの三者関係の整理イベント（Dialogue中心、ARIAの分析によって第2幕の情報が主人公自身の言葉として再提示される） | — | ARIA +5 |
| Layer26 | 第3幕: 対話 | Dr. Leonとの対話・核心。Genesis Protocolが「人間とAIが互いを理解し合うための実験」であり、ARIAはその成果そのものだったことが明かされる | Memory018「Genesis Protocol Charter」 | — |
| Layer27 | 第3幕: 対話 | Dr. Leonが施設を停止させた理由（Chapter4 Layer16の「意図的な決定」の詳細）。倫理的葛藤・研究中断の経緯が明かされる | Memory019「Shutdown Decision Log」 | — |
| Layer28 | 第4幕: 到達 | ARIA最終成長イベント。ARIAのLEVEL4「Partner AI」への到達条件が満たされる（詳細は次段落）。専用のCHARACTER EVOLVED演出＋ARIAの台詞のみで表現し、既存のCHAPTER COMPLETE等と同様、自動消滅させず「続ける」操作を要求する | Memory020「Partnership Protocol」 | ARIA +10 |
| Layer29 | 第4幕: 到達 | Genesis Protocol完成イベント。Dr. Leon・Researcher-01・ARIAの物語が収束し、「研究の完成」が何を意味するのかが提示される（Boss/最終検証イベントの想定地点） | Memory021「Genesis Protocol: Complete」 | — |
| Layer30 | 第4幕: 到達 | Chapter6完了イベント（CHAPTER 06 COMPLETE表示）。Layer Narrative Systemとしての本編完結。Endless Research（Unknown Layer、Layer31以降）への導入を告げるDialogueで締める | Memory022「Beyond Genesis」 | — |

上記のMemory015〜022はいずれも既存の予約枠`memfrag_015`〜`memfrag_030`（Chapter6所属16件、4章「Memory Fragment設計」参照）から割り当てる想定であり、新規ID発行は不要。残るmemfrag_023〜030（8件）は、Layer21〜30の4幕構成を補強する追加記録（サブイベント・Hidden Environment連動等）のための予備枠として引き続き保持する。

**Chapter6「Genesis Protocol」のLayer別イベント（STEP39-2で確定・実装）**: 要求仕様セクション2がLayer単位で明示した、STEP39-1設計案より簡潔な最終仕様。Memory013〜016の4件のみを使用し（`memfrag_017`〜`030`は引き続き予備枠のまま）、Dr. Leonの登場・Researcher-01の記憶・Genesis Protocolの真実・ARIAとの未来の4テーマをLayer21〜30全体で描く。Relationship変化の明示指定が要求仕様に無かったため、本Chapterは全Layerで`relationshipChange: null`（Relationship付与を一切行わない、Chapter1〜5と異なる設計）。
- Layer21: Chapter6開始イベント「Genesis Core Activation」（Dialogueのみ）
- Layer22: Memory013「Genesis Core Log」取得（MEMORY FOUND演出→ARIA Analysis Dialogue）
- Layer23: Memory014「Researcher-01's Memory」取得（MEMORY FOUND演出→ARIA Analysis Dialogue。主人公自身の個人的な記憶記録、`character:'player'`）
- Layer24: Genesis Project事故の真相イベント（Dialogueのみ。実験中の重大事故と、主人公の記憶の空白との関連が示唆される）
- Layer25: ARIAとの対話イベント。Story Event管理システムへ新設した`dialogueVariants`（ARIA Relationship閾値の降順配列、値20/10/0の3段階）により、Layerクリア時点のARIA Relationship以上の最初の1件だけが選ばれ再生される（`_high`/`_mid`/`_low`の3variant、Memory/Protocol/Character Discovery/Chapter進行への影響は無く、台詞のみが変化する「ストーリー分岐はしない」設計）。現状のゲーム進行ではARIA Relationshipが常に30（Chapter1〜5の固定合計）のため、常に最上位`_high`が選ばれる
- Layer26: Memory015「Genesis Final Record」取得（MEMORY FOUND演出→ARIA Analysis Dialogue）と同時にDr. Leonを`characterDiscovery`させる（`UNKNOWN`→`DISCOVERED`、STEP37のLost Researcherと同じ設計パターン）。`memfrag_015_recovered`Dialogueでは初めて`dr_leon`自身をDialogue話者として使用し、Dr. Leonが遺した録音記録をそのまま提示する構成にした
- Layer27: Genesis Core解析イベント（Dialogueのみ）
- Layer28: Final Puzzleイベント（Dialogueのみ、通常のPuzzle解答フローで進行。新規パズルメカニクスは追加していない、あくまでLayer名としての演出）
- Layer29: 解析完了イベント（Dialogueのみ）
- Layer30: Memory016「Final Analysis」取得（MEMORY FOUND演出→ARIA Analysis Dialogue）+ Chapter6完了イベント（CHAPTER 06 COMPLETE表示）。完了直後、`endingManager.checkEndings()`を呼ぶ処理（`_checkFinalChapterEnding()`）へ接続し、新規達成のEndingがあれば`_endRun()`と同じ「ENDING UNLOCKED」演出で示す（要求仕様セクション6「今回はEnding分岐は実装しない」どおり、優先順位ロジックは追加していない）

**Dr. Leon登場タイミング（実装確定、STEP39-2）**: Chapter4 Layer16で名前のみ言及（既存実装）→ Final Chapter Layer26でMemory015「Genesis Final Record」取得と同時に本格登場（本人不在・AI記録体としての登場）。STEP39-1設計案（Layer22初登場、Layer26〜27で対話の核心という2段階構成）は不採用となり、要求仕様の具体的指定によりLayer26への一本化に変更された。Dr. Leonは物語上「既に施設を去った人物」であるため、Lost Researcherと同じく記録・ログとしての登場に統一し、他キャラクターと異なる実体を持たない設計とする。

**Researcher-01の真実**: 主人公（Researcher-01）の記憶に関する記録がMemory014「Researcher-01's Memory」（Layer23）として、Genesis Project事故の真相がLayer24のDialogueとして開示される。STEP39-1設計案が想定していた「Lost Researcherとの同一性の明確な断定」（Layer29での明確化）までは、STEP39-2の実装では踏み込んでいない（要求仕様セクション2がLayer23/24の内容を「Memory014取得」「事故の真相」とだけ指定し、Researcher-01とLost Researcherの関係を明示的な断定として描くことまでは求めなかったため）。Chapter1 Layer2の「Access ID: Researcher-01」、Chapter4 Layer15の「Researcher-01 Profile」との一貫性は維持しつつ、断定は今後の拡張課題として残した。

**ARIA最終成長（LEVEL4 Partner AI）**: STEP39-1で設計した到達条件案（`partnerAiReady`: Chapter6完了+Memory018/020取得+ARIA Relationship一定値以上）は、STEP39-2の要求仕様セクション2〜8のいずれにも実装指示が無かったため、本STEPでは実装していない。`relationshipData.js`のARIA_LEVELS LEVEL4は引き続き`type:'reserved'`（絶対到達不可能な予約枠）のまま。Layer25「ARIAとの対話イベント」がARIAとの関係性を描く役割を代わりに担っているが、これはLEVEL4到達演出ではなく、あくまでLayer Clear時のDialogue分岐という扱い。LEVEL4到達条件の実装は今後の別STEPの課題として残る。

**Genesis Protocol完成**: Layer29の「解析完了」を経て、Layer30のChapter6完了をもってLayer Narrative System上の本編が完結する。4章で定義済みのとおり、これはEndless Research（Unknown Layer）という「終わりのない研究」への導入点でもあり、「物語には終わりがあるが、研究には終わりが無い」というテーマ性の起点として機能する（`memfrag_016_recovered`のARIA台詞で明示的に語られる）。Genesis Protocolという名の技術（Protocol Lore 5章、STORY RESEARCH CASE006クリア報酬）とLayer Narrative SystemのChapter6完了は、5章に既存の記載どおり別々の到達経路として独立に扱う（Color Analyzerと同様の「同じ物語を異なる構造で語る」設計方針との整合）。

**EndingManagerとの接続仕様**: Layer Narrative System（Chapter6・Layer30到達）と、ENDLESS RESEARCH側の5 Ending判定システム（`endingManager.js`）は、独立した達成軸である。Chapter6完了はあくまで「本編ストーリーの完結」を意味し、それ単体では5 Endingのいずれの`match`条件も満たさない（END TRUEの`bestLayer>=50`条件はLayer30よりも大幅に深い到達を要求するため、Chapter6完了後もEndless Research内での探索継続が必要）。両者の関係は「物語のクライマックスを迎える」層と「ゲームとしての達成を積み上げる」層という2層構造として設計する。

現行の`checkEndings(snapshot)`実装は、5 Endingの`match`条件を配列順（END A→END B→END C→END D→END TRUE）に**全件独立判定**し、その回のRUNで新たに満たされた条件を**すべて**同時に達成扱いとする（先着1件のみを採用する「優先順位」ロジックは存在しない）。本STEPはこの実装を変更しないが、7章の分類（Normal=END A／True=END TRUE／Hidden=END D）に基づき、将来UIで複数Ending同時達成を1件に絞って提示する必要が生じた場合（例: 到達演出で「代表Ending」を1つだけ表示したい場合）に備え、**表示上の優先順位**を以下のとおり定める:

1. **True（END TRUE — GENESIS）** — 最上位。Hidden Environment全種+Story全体100%+Layer50到達という、実装済み5 Endingの中で最も達成条件が厳しく、他の全条件を包含し得るため最優先で提示する。
2. **Hidden（END D — Simulation Zero）** — 次点。特定Hidden Environment（SIMULATION ZERO）到達という、通常プレイでは辿り着かない発見要素であるため、Normalより優先する。
3. **Normal（END A — Complete Research）** — 基本到達点。主要Story Log収集という、本編を素直にプレイすれば到達しうる達成として最後に位置づける。

なお、Bad（END B — World Collapse）はRUN失敗を意味する状態であり、上記3種の「完結の達成度」とは性質が異なるため優先順位の対象外とし、常に独立して扱う。Secret候補（END C — AI Liberation）は7章に既存の記載どおり「追加のSecret Ending候補」の位置づけのまま据え置き、正式な優先順位には含めない。この優先順位はあくまで**将来「代表Ending」表示機能を実装する場合の設計指針**であり、現行の`checkEndings()`が複数Endingを同時にすべて表示する挙動（`endless.js`の呼び出し箇所で確認済み）自体は本STEPでは変更しない。

---

## 4. Memory Fragment設計

計画上の総数はMemory001〜030。`memoryData.js`には既に全30件がデータとして存在するが、**内容（title/content）が設計済みなのはChapter1〜6分の16件のみ**で、残り14件はChapter6（Final Chapter）向けに番号を予約した「locked」プレースホルダー（`locked:true`, `unlockCondition:null`）にすぎない。各Memoryについて、ID／Title／所属Chapter／内容／ストーリー上の意味を保存する。

### 実装済み（内容設計済み）

| ID | Title | 所属Chapter | 内容 | ストーリー上の意味 |
|---|---|---|---|---|
| Memory001 (`memfrag_001`) | Genesis Beginning | Chapter1 | Genesis Protocol研究開始記録 | Genesis Protocolが物語冒頭から示唆される最初の伏線。ARIAとの直接的な関連は薄く、Relationshipには影響しない（キャラクター中立の記録として設計） |
| Memory002 (`memfrag_002`) | Unknown Researcher | Chapter1 | Genesis Protocol責任者記録 | Genesis Protocolの責任者（Dr. Leonを指すと推測される）に関する記録。ARIA自身に強く関わる「重要Memory」として設計され、取得するとARIA Relationship+5・LEVEL2（Emotional AI）到達条件になる |
| Memory003 (`memfrag_003`) | Researcher Profile | Chapter2 | 研究員プロフィール記録：Genesis Protocol関連研究者 | QUANTUM NETWORK内で発見される研究者個人の記録。取得するとARIA Relationship+5（STEP35で実装） |
| Memory004 (`memfrag_004`) | Genesis Project Log | Chapter2 | Genesis Protocol研究進捗ログ | Chapter2の到達点となる研究進捗記録。Chapter2完了イベントとセットで取得される（STEP35で実装） |
| Memory005 (`memfrag_005`) | Human Cognitive Pattern | Chapter3 | 人間の認知パターン解析記録 | Color Analysis Labで発見される、人間が色を感情・記憶と結びつけて認識する仕組みの解析記録。取得するとARIA Relationship+5（STEP36で実装） |
| Memory006 (`memfrag_006`) | Color Experiment Final Report | Chapter3 | Color Experiment最終報告書 | LOGIC COLORが人間の認知・感情パターンを探る実験だったことを示す、Chapter3の到達点。Chapter3完了イベントとセットで取得される。取得するとARIA Relationship+5（STEP36で実装） |
| Memory007 (`memfrag_007`) | Lost Researcher Record | Chapter4 | Lost Researcher記録：身元不明の研究者アクセスログ | Silent Facilityで発見される、長期間気づかれなかったアクセス痕跡。取得と同時にLost Researcherの`state`が`UNKNOWN`→`DISCOVERED`へ遷移し、Lost Researcher Relationship+5（STEP37で実装） |
| Memory008 (`memfrag_008`) | Researcher-01 Profile | Chapter4 | Researcher-01プロフィール記録 | 主人公自身のAccess ID「Researcher-01」と一致する記録。主人公とLost Researcherの関係（あるいは同一人物である可能性）への伏線。取得するとLost Researcher Relationship+5（STEP37で実装） |
| Memory009 (`memfrag_009`) | Facility Shutdown Report | Chapter4 | Facility Shutdown報告書 | 施設停止が責任者（Dr. Leon）による意図的な決定だったことを示す、Chapter4の到達点。Dialogue内でDr. Leonの名が初めて明示される。Chapter4完了イベントとセットで取得される（STEP37で実装） |
| Memory010 (`memfrag_010`) | ARIA Creation Log | Chapter5 | ARIA生成記録：Neural Memory基盤構築ログ | ARIA自身の生成過程に関する記録。取得するとARIA Relationship+5。ARIAのLEVEL3「Self Aware」到達条件の一つ（STEP38で実装） |
| Memory011 (`memfrag_011`) | Genesis AI Integration | Chapter5 | Genesis AI統合記録 | ARIAとGenesis Protocolの統合過程に関する記録。取得するとARIA Relationship+5。ARIAのLEVEL3「Self Aware」到達条件の一つ（STEP38で実装） |
| Memory012 (`memfrag_012`) | Final AI Research Report | Chapter5 | Final AI Research報告書 | AI研究の総括を示す、Chapter5の到達点。Chapter5完了イベントとセットで取得され、この瞬間にMemory010/011取得とあわせてARIAのLEVEL3「Self Aware」到達条件が揃う（STEP38で実装） |
| Memory013 (`memfrag_013`) | Genesis Core Log | Chapter6 | Genesis Core起動ログ：全ての記録の出発点 | Genesis Coreの起動記録。Chapter6の導入となる記録で、Relationship変化は無し（STEP39-2で実装） |
| Memory014 (`memfrag_014`) | Researcher-01's Memory | Chapter6 | Researcher-01個人記憶記録：Cognitive Gapの空白を埋める鍵 | 主人公自身の個人的な記憶記録（`character:'player'`）。Cognitive Gap（1章参照）の空白を埋める直接的な手がかり。Relationship変化は無し（STEP39-2で実装） |
| Memory015 (`memfrag_015`) | Genesis Final Record | Chapter6 | Genesis Final Record：Dr. Leon最終記録 | Dr. Leonが遺した最終記録（`character:'dr_leon'`）。取得と同時にDr. Leonの`state`が`UNKNOWN`→`DISCOVERED`へ遷移する。Relationship変化は無し（STEP39-2で実装） |
| Memory016 (`memfrag_016`) | Final Analysis | Chapter6 | Final Analysis：Genesis Protocol総括 | Genesis Protocolの全貌を示す、Chapter6（本編）の到達点。Chapter6完了イベントとセットで取得される。Relationship変化は無し（STEP39-2で実装） |

### 予約枠（番号のみ確保、内容は未設計）

| ID範囲 | 所属Chapter | 件数 |
|---|---|---|
| Memory017〜030 (`memfrag_017`〜`030`) | Final Chapter | 14件（STEP39-2でmemfrag_013/014をChapter5からChapter6へ再割当・実装済みへ昇格させたため、Chapter5の予約枠は0（Chapter1〜4と同じパターンへ統一）、Chapter6の予約枠は16→14へ調整） |

今後Final Chapterの追加コンテンツ（サブイベント・Hidden Environment連動等）を設計する際に、上記予約枠のtitle/content/character/unlockCondition/ストーリー上の意味を埋めていく（`locked`フラグを外し、`unlockCondition`を実際のLayer条件に差し替える）。新規に内容を設計する際は必ずID／Title／所属Chapter／内容／ストーリー上の意味の5項目を「実装済み」表へ追記すること。

---

## 5. Protocol Lore

Protocolは単なる強化要素ではなく、**研究施設で開発された研究技術**として位置づける。実装済みProtocol（`protocols.js`/`protocolSignals.js`）を、以下4カテゴリへ分類する。

### Analysis Protocol（解析技術）
未知データ・Unknown Nodeの解析精度に関わる技術。
- **Explorer** — 安全性を高めた探索用解析技術
- **Precision** — 高精度解析技術（PERFECT解析特化）
- **Quantum** — 量子解析技術（デメリット無しの高性能型）

### Logic Protocol（論理演算技術）
LOGIC COLORの論理構造そのものを操作する技術。
- **Analyst** — 論理演算補助技術
- **Overclock** — 演算負荷を引き上げる代わりに出力を高める技術
- **Chaos** — 不安定な論理演算を許容し高出力を得るハイリスク技術
- **Minimal** — 演算負荷を抑える安定運用技術

### Memory Protocol（記憶技術）
記憶データ・過去の記録に関わる技術。
- **Oracle** — 記憶補助（HINT）技術
- **Neural Link** — 神経接続技術（Meta Progression Research Rank2到達で解放）

### Genesis Protocol（起源技術・最上位カテゴリ）
Genesis Project本体に関わる、最も秘匿性の高い技術群。
- **Color Analyzer** — Chapter3「Color Experiment」の実験成果として得られる専用技術。STORY RESEARCH CASE003クリア報酬として実装済みだったが、STEP36でLayer Narrative System側にも同じProtocolを解放する経路を追加し、**STORY RESEARCH CASE003クリア または Chapter3 Layer11到達**のどちらでも入手できるようになった（`protocolSignals.js`のデータは1つのまま、2つの物語構造から同じ技術へ辿り着けるという「STORY RESEARCH／Layer Narrative Systemは同じ物語を異なる構造で語る」という本資料3章の設計方針とも一致する）
- **Genesis Protocol**（Protocol名としての「Genesis Protocol」） — Final Chapter「Genesis Protocol」の到達点として得られる、デメリットの無い最上位技術（STORY RESEARCH CASE006クリア報酬）

---

## 6. Research Environment Lore

Environment（研究施設内の各領域）の世界観設定。実装済みの6 World Environment（`worldEnvironment.js`）を、以下6分類へ対応づける。

| Lore分類 | 対応Environment（実装名） | 設定 |
|---|---|---|
| Normal Environment | DIGITAL GRID (`env_grid`) | 施設の基本領域。Chapter1「First Signal」の舞台 |
| Data Corruption | QUANTUM NETWORK (`env_network`) | データ破損・欠損が進行した領域。Chapter2「Lost Data」の舞台 |
| Color Shift | DATA OCEAN (`env_ocean`) | 色彩実験の影響が及んだ領域。Chapter3「Color Experiment」の舞台 |
| Memory Distortion | NEURAL FOREST (`env_forest`) | 記憶データが歪んだ領域。Chapter5「AI Memory」の舞台 |
| AI Simulation | FRACTAL CORE (`env_fractal`) | AIによるシミュレーション領域。Final Chapter「Genesis Protocol」の舞台 |
| Unknown Environment | UNKNOWN DIMENSION (`env_unknown`) | 未分類・正体不明の領域。Chapter4「Silent Facility」の舞台 |

上記に加え、特定条件下でのみ到達できるHidden Environment（`hiddenEnvironmentData.js`）が6種実装済み: VOID MEMORY / LOST ARCHIVE / GENESIS LAB / SIMULATION ZERO / ECHO NETWORK / PARADOX CORE。これらは「施設に隠された、通常の研究記録には残らない領域」というLoreに位置づけられる。

---

## 7. Ending設定

実装済みの5 Ending定義（`endingManager.js`のALL、ENDLESS RESEARCH側の生涯達成型Ending）を、要求されたEnding分類へ対応づける。

| Ending分類 | 対応Ending（実装名） | 生涯達成条件（`checkEndings()`、RUN終了時判定） |
|---|---|---|
| Normal Ending | END A — Complete Research | 主要Story Log（LOG）を全て収集 |
| True Ending | END TRUE — GENESIS | Hidden Environment全種発見 + Story全体100% + Layer50到達 |
| Hidden Ending | END D — Simulation Zero | SIMULATION ZERO（Hidden Environment）攻略 |
| Bad Ending | END B — World Collapse | World StabilityがCOLLAPSE状態のままRUN終了 |
| （追加のSecret Ending候補） | END C — AI Liberation | AI Memory（MEMORY型StoryEntry）を全て収集 |

このほか、STORY RESEARCH（1回完結型モード）側にもCASE001〜006ごとに個別のEndingが実装済み（CASE004/CASE005はプレイヤーの選択によって分岐する2種のEndingを持つ）。本編Layer Narrative SystemのEndingとは独立した仕組みとして運用する。

**Story Ending（本編の結末、STEP39-3で実装）**: 上記の生涯達成条件はRUN終了時点（Layer50到達等）を前提としており、Layer30（Chapter6完了）の時点ではほぼ成立しない。そのため、Layer30クリア直後に評価する専用の判定`endingManager.determineStoryEnding(snapshot)`を新設し、Normal/True/Hidden/Bad Endingのうち**必ず1つだけ**を本編のクライマックスとして確定させる（複数同時成立を許す生涯達成側の`checkEndings()`とは異なる、優先順位付きの単一選択）。判定条件はデータ化されており（`STORY_ENDING_ORDER`配列）、今後Endingを追加する場合はこの配列へ`{id, match}`を1件追加するだけでよい。

| 優先順位 | Ending分類 | 判定条件（Layer30到達時点で評価） |
|---|---|---|
| 1（最優先） | Bad Ending | World StabilityがCOLLAPSE状態（生涯達成END Bと同一条件） |
| 2 | True Ending | Hidden Environment発見率100%（生涯達成END TRUEからLayer50/Story100%条件を除いた、Layer30時点で到達しうる閾値） |
| 3 | Hidden Ending | SIMULATION ZERO攻略済み（生涯達成END Dと同一条件） |
| 4（デフォルト） | Normal Ending | 上記いずれも満たさない場合の必ず成立するフォールバック |

Bad Endingを最優先とするのは、「世界の崩壊は他の個々の達成を覆す結末である」という設計判断（Hidden Environment全種発見や研究完了を成し遂げていても、施設そのものが崩壊していればBad Endingになる）。この優先順位はSTEP39-1で設計した「代表Ending表示指針（True > Hidden > Normal）」をBad Ending込みで正式に実装へ落とし込んだもの。Ending確定後、確定したEndingの`id`は生涯達成側と同じ`save.recordEndingAchieved()`で永続化されるため、Research Archiveの表示等とも整合する（生涯達成側の`checkEndings()`が同じEnding idを後から再判定しても、既に達成済みのため二重計上されない）。

**Story Endingと専用Epilogue**: Story Endingが確定すると、「ENDING: <Ending名>」の表示に続けて、Ending種別ごとの専用Epilogue Dialogue（`dialogueData.js`の`epilogue_normal`/`epilogue_true`/`epilogue_hidden`/`epilogue_bad`）が再生される。ResearcherとARIAの最後の会話として、初めて`player`（Researcher）がDialogue話者として登場する。4件とも「研究は終わるが、未知は終わらない」というテーマの着地点は共通し、Ending種別に応じて手前のトーンが変わる。True Endingのみ、この会話の中でARIAがLEVEL4「Partner AI」へ昇格する（8章参照）。

---

## 8. Endless Research設定

Genesis Protocol完成（Final Chapter・Layer30到達）後も継続する、本編終了後の未知領域として定義する。

- **Unknown Layer**: Layer30以降、Chapter区切りを持たない領域。ENDLESS RESEARCHはこの領域を無限に探索し続けるゲームモード。
- Genesis Protocol完成後もなお続く研究として位置づけ、「物語には終わりがあるが、研究には終わりが無い」というテーマ性を持たせる。
- 実装上は、Layer Narrative System（StoryManager等）とENDLESS RESEARCH本体（`endless.js`）は同一の`this.save`を共有しており、本編で変化したARIAの状態（Relationship/State）はモードをまたいでそのまま引き継がれる（STEP32-4で実装・確認済み）。

### Ending後の世界観（STEP39-3で追記）

Layer30クリア→Story Ending確定→Epilogue（ResearcherとARIAの最後の会話）が完了すると、演出上の区切りを挟んだ後、通常のMap遷移（Research Map表示）を経てそのままUnknown Layer（Layer31）へ進む。Layer Narrative Systemの観点では「Chapter区切りを持つ物語」はここで完結しているが、`layerContentData.js`にLayer31以降のレコードは存在しない（`getByLayer()`が常にnullを返す）だけで、ENDLESS RESEARCH自体のDepth進行を止める仕組みは元々存在しない。したがって「Unknown Layerの解放」は新たなロックを外す処理ではなく、**本編という縦糸が外れ、ENDLESS RESEARCHという横糸だけが残る**という物語上の意味合いを持つ（この操作上の連続性自体が「研究は終わるが、未知は終わらない」というテーマの体現になっている）。

**Ending別のその後**:
- **Normal Ending（END A）**: ARIAはLEVEL3「Self Aware」を維持する。研究記録は完結したが、ARIAとResearcherの関係性そのものはこれからも積み重なっていく、という余地を残した終わり方。
- **True Ending（END TRUE）**: ARIAはLEVEL4「Partner AI」へ昇格する（`relationshipData.js`のARIA_LEVELS LEVEL4、STEP32-5-2で追加されて以来初めて到達する状態）。到達条件は既存のARIA_LEVELS判定（`checkAriaEvolution()`によるsnapshotベースの自動判定）を経由せず、Story Ending確定に紐づく一回限りの明示的な状態遷移として実装した（LEVEL4のcondition自体は引き続き`type:'reserved'`のまま、通常のARIA進化フローからは到達不能）。「対等な協働関係の確立」を、感情パラメータの増加としてではなく、Epilogue内でのARIA自身の宣言として表現している。STEP39-1のSTORY_BIBLE.md設計案が提案していた`partnerAiReady`条件（Chapter6完了+特定Memory取得+Relationship閾値）は不採用となり、より単純な「True Ending到達」という条件に一本化された。
- **Hidden Ending（END D）/Bad Ending（END B）**: いずれもARIAはLEVEL3「Self Aware」を維持する（要求仕様がTrue Ending以外への言及を含まなかったため、明示的な状態変更は行っていない）。

Story Ending確定後もENDLESS RESEARCHは通常どおり継続され、生涯達成型の5 Ending（7章）・Hidden Environment探索・Meta Progression等、既存の全システムはStory Ending確定の影響を受けずそのまま機能する。

---

## 9. 今後の開発ルール

**今後LOGIC COLORへ新しいストーリー・キャラクター・イベント・Protocolを追加する場合、STORY_BIBLE.mdを基準設定として扱うこと。**

**既存設定と矛盾する実装を行わないこと。**

**新規コンテンツ追加時はStory Bibleを更新してから実装すること。**
