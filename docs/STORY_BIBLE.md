# LOGIC COLOR STORY BIBLE

このドキュメントは、LOGIC COLORの世界観・キャラクター・ストーリー・システム設計の基準資料（Story Bible）である。現時点（STEP32-5-1まで）で実装済み・設計済みの内容を整理して保存する。未実装/未設計の項目にはその旨を明記する。

---

## 1. 世界観設定

### LOGIC COLOR Cognitive Mapping System
プレイヤーが解く論理パズル（色の配置ロジック）そのものが、研究施設のCognitive Mapping System（認知マッピングシステム）の一部として位置づけられる。パズルを解く行為＝施設の論理構造・記憶データを解析する行為、という二重の意味を持つ。「LOGIC COLOR」という名称自体が、色彩と論理の関係を解明する実験（Chapter3「Color Experiment」）に由来する（`scenarioData.js` CASE003の説明文参照）。

### Cognitive Neural Mapping System（STEP41-1で表示用語を追加）
上記のCognitive Mapping Systemを、ENDLESS RESEARCHのパズル画面表示上でより具体的に呼ぶ際の名称。パズル解析システムであり、Memory NodeへSignalを配置し、失われた認知構造（Cognitive Map）を復元する作業として表現する。**ゲームルール・問題生成・判定ロジック・セーブデータ構造は一切変更していない**（`board.js`のCellState内部id`'EMPTY'/'BLUE'/'RED'/'GREEN'`はそのまま）。表示用語のマッピングは`src/endless/cognitiveTheme.js`が正本。

用語対応表:

| 内部/旧表示 | 新しい表示名 |
|---|---|
| Puzzle | Cognitive Analysis |
| Grid（盤面） | Cognitive Map |
| Cell（マス） | Memory Node |
| Clear | Cognitive Map Restored（完了時） |
| （3段階のクリア演出） | ①Cognitive Analysis → ②Neural Synchronization → ③Cognitive Map Restored |

Signal（色の表示名。内部id=BLUE/RED/GREENは無変更）:
- BLUE → **Logic Signal**
- RED → **Memory Signal**
- GREEN → **Emotion Signal**

適用範囲: この用語変更はENDLESS RESEARCH（ARIA/Layer/Protocol/Storyの世界観が既にある場所）のパズル画面・クリア演出に適用する。STAGE SELECT/TUTORIAL/DAILY PUZZLEは元々ARIAや研究施設の物語と結びついていない独立モードのため、ラベル文言はそのまま維持している（Signal名はtitle/aria-label属性としてのみ全モード共通で付与、見た目には影響しない）。詳細はREADME.md STEP41-1セクション参照。

### Memory Node / Neural Node / Cognitive Mapping UI（STEP41-2で追加）
盤面のマス（Grid Cell）は、施設の記憶を保持する「Memory Node」として表示される。円形（近未来的なSF Node UI）で描画され、以下の3状態を持つ（内部の判定ロジック・CellState id`'EMPTY'/'BLUE'/'RED'/'GREEN'`は無変更、表示専用の概念）:
- **UNKNOWN**（未解析）: まだSignalが配置されていないNode。アイドル時にゆっくりとしたパルス演出で「解析待ち」を示す
- **SYNCING**（同期中）: Signalを配置した直後の一瞬の状態。Signal Inject（注入）演出と共に表示される
- **STABLE**（安定）: Signalが配置され安定した状態

Node同士は、Grid上の隣接関係に基づく網目状の縁取り（Node Link）で視覚的に接続されているように見える。これは演出上の表現であり、パズルの判定ロジックには一切使用されない（あくまで隣接するMemory Node同士が同じネットワークの一部であることを示す装飾）。

盤面全体の見た目（Node形状・Node Linkの有無・アイドルパルスの有無）は`cognitiveTheme.js`の`NODE_THEME`設定（`{type, shape, connection, animation}`）で制御される。現時点では全Layer共通で単一のテーマ（`basic_neural`）のみを使うが、将来的にChapter/WorldEnvironmentごとに異なるNode Themeを割り当てられるよう、この設定値が実際に描画へ反映される構造にしてある（詳細はREADME.md STEP41-2セクション参照）。

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

### Chapter0: PROLOGUE「Awakening」（STEP40-3で追加）
- Layer番号を持たない、Layer1開始前の導入シーケンス。`layerStoryData.js`（Layer1〜30のChapter1〜Final Chapterの区切り）とは別枠のため、`LayerStoryData.ALL`には含めていない（`prologueData.js`が正本）。
- **NEW RESEARCH開始時のみ再生**する（Continueでは再生しない。一度開始したRunでは完了済み扱いとして、以降のRETRY等では再表示しない）。
- Scene構成:
  1. **System Boot** — システムステータス表示（Research Facility: ONLINE / Memory System: ERROR / Cognitive Data: Unavailable）
  2. **Researcher-01 Awakening** — 主人公が記憶を失った状態で目覚める最初の独白（Dialogue: `prologue_awakening`）
  3. **ARIA First Contact** — ARIAとの初接触。Researcher-01というAccess IDが登場するが、主人公自身はそれが本当に自分の名前かを確信できない（Dialogue: `prologue_aria_contact`）
  4. **First Mission** — 施設データの大部分が破損していることが明かされ、原因解析にはCognitive Mapping Systemの再起動が必要と告げられる。最初のミッション「Restore Cognitive Mapping System」が示される（Dialogue: `prologue_first_mission`）
- 設定としての位置づけ: Researcher-01の覚醒、ARIAとの初接触、Cognitive Mapping System復旧開始という「物語の起点」を、Chapter1「First Signal」より手前に明示的に置く。Chapter1 Layer1の既存Dialogue（`chapter01_layer01_clear`、「システム起動を確認しました」等）とテーマは重なるが、Prologueは記憶を失った主人公の視点からの導入、Chapter1 Layer1はその後のシステム側の詳細確認という位置づけで、矛盾はしない（両者とも変更していない）。

Layer Narrative System（`layerStoryData.js`）に実装済みの区切り。

| Chapter | Title | Layer範囲 | 実装状況 |
|---|---|---|---|
| Chapter0 | Awakening（PROLOGUE） | Layerなし | ✅ コンテンツ完成（STEP40-3で追加。NEW RESEARCH開始時のみ再生、`layerStoryData.js`のLayer区切りには含まれない） |
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

## 9. Neural Evolution System（STEP41-3で追加）

Layer進行に応じて「解析対象そのものが進化していく」という世界観を、表示・演出のみで表現する仕組み。ゲームルール・問題生成・判定ロジックには一切影響しない（`themeManager.js`が正本）。

### Research Depth（5段階のPhase区切り）
既存のChapter区切り（Layer1-4/5-8/9-12/13-16/17-20/21-30の6章、3章参照）・WorldEnvironment区切り（5Layerごとの細かい周期、1章参照）とは異なる、もっと広い5段階の区切り。研究がどれだけ深部へ到達したか（Research Depth）を表す。

| Phase | Theme名 | Layer範囲 | 背景 |
|---|---|---|---|
| Phase1 | Basic Cognitive Map | Layer1〜4 | Basic Research Lab |
| Phase2 | Neural Network | Layer5〜12 | Neural Network |
| Phase3 | Memory Distortion | Layer13〜20 | Broken Memory |
| Phase4 | Genesis Neural Core | Layer21〜30 | Genesis Core |
| Phase5 | Unknown Structure | Layer31〜 | Unknown Dimension |

Phase1はChapter1「First Signal」、Phase4はFinal Chapter「Genesis Protocol」、Phase5はUnknown Layer（8章）とLayer範囲が一致する。Phase2/Phase3はそれぞれ2つのChapterをまたぐ、より粗い区切りとして意図的に設計した（「解析対象の進化」という体感は、個々のChapterの物語展開よりもゆっくりしたペースで訪れる方が「深化していく研究」というテーマに合うと判断したため）。

### Theme一覧（詳細設定）
各Themeは背景・Node形状・Node Link（接続線）の有無・アイドル演出・UIアクセントカラー・解析中/同期中のトースト文言・クリア完了文言・ARIAコメントを持つ（`themeManager.js`のTHEME_DEFS参照）。Memory Distortion（Phase3）はNode Linkを意図的に切り、Unknown Structure（Phase5）はNode形状を円形から外すことで、それぞれ「歪み」「未知」を表現している。

### Theme Transition
Phaseが切り替わるLayerでは、「NEW ANALYSIS AREA」＋新Theme名＋ARIAの一言（「解析対象が変化しています。」に相当する、Themeごとの専用セリフ）を表示する。既存のWorldEnvironment Transition演出（1章）と同じ「スキップ/続けるボタン必須、自動消滅しない」方針を踏襲しつつ、別の独立したオーバーレイとして実装した（両者は概念が異なり、同一Layerで両方の切り替えが重なることもあるため）。

---

## 10. 今後の開発ルール

**今後LOGIC COLORへ新しいストーリー・キャラクター・イベント・Protocolを追加する場合、STORY_BIBLE.mdを基準設定として扱うこと。**

**既存設定と矛盾する実装を行わないこと。**

**新規コンテンツ追加時はStory Bibleを更新してから実装すること。**

---

## 11. Research Console System（STEP41-4で追加）

ENDLESS RESEARCH画面全体を「ゲームのプレイ画面」ではなく「研究施設のコンソールを操作している」という体感で統一するための、表示・演出のみの仕組み。ゲームルール・問題生成・判定ロジック・セーブデータには一切関与しない（`researchConsole.js`が描画、状態は`endless.js`側が保持）。

### Research Console Header
ゲーム画面上部に常時1行で表示するサマリー行。「RESEARCH CONSOLE」（コンソール名）・「ARIA CONNECTED」（ARIA接続状態）・現在のNeural Evolution Theme名（9章参照）・Research Depth（現在のLayer）を表示する。「詳細」ボタンでSystem Status Panel以下を開閉できる（既存HUD群と同じ折りたたみパターン）。

### System Status Panel
「FACILITY STATUS」「MEMORY INTEGRITY」「NODE STABILITY」「PROTOCOL」「AI STATUS」の5項目。いずれも新しいゲームメカニクスではなく、既存データ（World Stability・現在ライフ・所持Protocol・AI Director人格/目標）から導出した演出的な表示値である。「施設が生きている」という手触りを、既存の裏側の数値をコンソール風に翻訳するだけで表現している。

### Analysis Log
直近5件のイベント（Node同期＝Puzzle Clear、Protocol activated、Memory detected、Research area updated、Anomaly detected）をRUNスコープのリングバッファとして新しい順に表示する。永続化はせず、RUN終了時に消える一時的な表示。

### Mini Research Map
現在のPhase（9章のResearch Depth区切り）内での自分のDepth位置を、簡易な進捗バーとラベル（例: 「PHASE 2 · DEPTH 7/12」）で表示する。フルスクリーンのリサーチマップ画面（RUN中に「MAP」ボタンから開く既存のReadOnlyな俯瞰ビュー）とは別の、常時見える簡易版という位置づけ。

### ARIA Terminal
Header内の小さなバッジとして常時表示（「ARIA: CONNECTED」）し、実際にStory Dialogueが再生されている間だけ「ARIA: ACTIVE」へ切り替わる。会話そのものの表示（拡張表現）は既存のDialogue Systemオーバーレイがそのまま担う。

### Signal Injection Panel
既存のSignal Button（Cognitive Neural Mapping System、1章参照）まわりを、ENDLESS RESEARCH中のみ「SIGNAL INJECTION」ラベル付きの解析UI風の枠で装飾する。DOM構造・既存の操作方法は無変更。

### Console Animation
走査線（scanline）演出を画面全体に低い不透明度で常時重ねる。Node Pulse・Node Link接続線の演出は既にMemory Node表示（1章参照）で実装済みのため重複追加はしていない。

### Story Integration「NEW FILE AVAILABLE」
Layerクリアで実際のChapter Dialogueが再生される場合のみ、再生開始の直前に短い自動消滅トースト「NEW FILE AVAILABLE」を挟む。MEMORY FOUND/PROTOCOL UNLOCKEDなど、それ自体が「続けるボタン必須」の告知オーバーレイを持つ演出には重ねて表示しない。

---

## 12. Dynamic Research Events（STEP42で追加）

Layer開始のたびに低確率で発生する、短いフレーバーイベント。「探索中の世界が常に動いている」という手触りを演出するための仕組みで、**ゲームルール・問題生成・難易度・判定には一切影響しない**（`researchEventManager.js`が抽選、`researchEventBanner.js`が描画。状態はRUNスコープの重複抑制のみで、Save側には生涯履歴のみを持つ）。

### 5つのカテゴリ
- **System**: 施設側のシステムログ風の一言（例: 「SUBSYSTEM ONLINE」「ARCHIVE CONNECTED」）
- **ARIA**: ARIAの短いコメント。「感情ではなく理解能力を獲得する存在」（2章参照）という設計方針どおり、Relationship Levelに関わらずどのLevelでも違和感の無い、冷静・観測的な口調に統一している。AI Director（5人格システム、STEP31）とは別存在
- **Environment**: 背景ノイズ・照明の点滅・警告灯・モニター表示の変化など、施設の環境描写
- **Story**: 指定Layer（2/6/10/14/18/24）でのみ必ず発生する伏線的な一言。他のカテゴリと異なりランダム抽選の対象外で、既存のChapter境界Layer・Story Dialogue発生Layerとは重ならないよう選定している
- **Unknown**: Layer31以降のみ発生。要求仕様どおり説明を一切与えず、断片的な一言だけを残す（例: 「……何かがこちらを見ている」）

### 抽選ルール
Story固定イベントが無いLayerでは、まず約55%の確率で「今Layerは何も起きない」を判定してからカテゴリ抽選する（毎Layer必ず発生させると探索のテンポを損なうため）。UnknownカテゴリはLayer31以降のみ候補に入る。Neural Evolution Theme（9章）のPhaseが切り替わるLayer（Theme Transitionオーバーレイが表示される、既に演出が集中しているLayer）ではランダム抽選自体を行わない。

### 表示方法
既存の`#toast`（単一スロット、他の通知と共有）とは独立した専用バナーとして実装し、フェードイン/フェードアウトで3〜6秒表示される（タップでスキップ可能）。非モーダルで盤面操作をブロックしないため、表示中も探索を継続できる。

### 履歴管理
表示済みイベントは生涯履歴としてSaveへ記録される。直近3件のidは重複除外の対象とし、同じフレーバーが連続して出ないよう制御している。

---

## 13. Research Progression System（STEP43で追加）

RUN終了後、プレイヤーが「今回はどんな研究成果があったか」を実感できるようにするための一連の仕組み。**ゲームルール・問題生成・難易度・判定には一切影響しない**（`researchGrade.js`/`databaseCompletion.js`/`facilityRestoration.js`はいずれも既存データから算出するだけの純粋関数、または増加のみの単純な永続値）。

### Research Report
RUN終了直後、既存のRESULT画面より前に表示される新規画面。到達Research Depth・取得Memory・取得Protocol・Relationship変化・Research Rank・Unknown Signal・獲得報酬（Score/Research Data）を一覧表示し、続けるボタンで既存のRESULT画面へ進む。既存のRESULT画面自体・その先のRETRY/TITLE分岐ロジックは無変更。

### Facility Restoration
「長期間停止状態にあった研究施設」（1章「Research Facility」参照）が、プレイヤーの研究進行に応じて少しずつ復旧していく、という0〜100%の進行度。表示専用ではなく実際にSaveへ保存される（増加のみ、減少しない）。既存のStory Database完成率・Memory収集率・最深到達Layerから算出する設計のため、新しいゲームメカニクスの追加は無い。将来のStory演出（例: 復旧率がある閾値に達した時にARIAが新しい台詞を話す等）から直接参照できる単純な数値として設計してある。

### Database Completion
Characters/Memory/Research Logs/Protocols/Environment/Endingsの6カテゴリの収集率をまとめて表示する。数え方は既存の各Archive画面（Character Archive/Memory Archive/Research Database/Protocol Archive/Environment Archive/Ending判定）が持つ数え方をそのまま再利用しているため、この一覧の数字と個別のArchive画面の数字は常に一致する。NEURAL RESEARCH LAB画面の既存「RESEARCH ARCHIVE」要約（Protocols/Events/Layers/Secrets、STEP28）に追記する形で表示され、Research Report画面にも同じデータの縮小版が表示される。

### Research Timeline（Research Report内、今回のRunのみ）
既存の「Research Timeline」（Story Database解放順を生涯を通じて表示する仕組み、STEP32）とは別に、Research Report画面には「今回のRunで起きた主要イベント」だけを時系列表示する専用の一覧がある（RUN開始・Memory取得・Protocol取得・Boss撃破・Chapter完了・秘匿領域発見・Extract成功/RUN終了、をRUNスコープの一時的なリストとして保持、永続化しない）。

### Research Grade
RUNをS〜Dで評価する。評価基準は到達Depth・PERFECT率・生還方法（Extract成功か死亡か）・主要イベント（Boss撃破/Memory取得/Protocol取得）の件数を重み付き合成したスコアで、各要素の重みと閾値はデータ化されており（`researchGrade.js`のGRADE_DEFS/WEIGHTS）、将来の評価基準追加・調整が容易な構造にしてある。Gradeそのものは保存せず、RUNごとに算出する使い切りの評価。

### ARIA帰還演出
RUN終了後、Research Report画面の冒頭にARIAの短い一言（「解析結果を保存しています。」等）を表示する。ARIAは「感情ではなく理解能力を獲得する存在」（2章参照）という既存方針のため、Relationship Levelに関わらず違和感の無い冷静なトーンに統一している（Dynamic Research Event、12章のARIAカテゴリと同じ設計判断）。

---

## 14. Research Facility Audio System（STEP43.5で追加）

LOGIC COLOR全体に音響を追加し、「研究施設を探索している」体験を音の面から補強する仕組み。既存の`sound.js`（Stage/Tutorial/Daily Puzzle用の効果音、tap/place/complete/clear）とは独立した別システムとして実装し、`sound.js`自体は無変更のまま動作し続ける。**ゲームルール・問題生成・判定には一切影響しない**（`audioManager.js`は音を鳴らすだけで、ゲーム状態を一切変更・参照しない）。

### 音源についての方針
本プロジェクトは`sound.js`の時点から「音声ファイル不使用・Web Audio APIのシンセ音のみ」（`assets/sounds/`は未使用のまま）という一貫した方針を取っている。BGMもこの方針を踏襲し、実音源ファイルではなく複数オシレータによる持続音（Drone/Pad）として実装している。

### Layer Theme BGM
Layer進行に応じて5段階のBGMへ切り替わる。区切りは既存のNeural Evolution System（9章、`themeManager.js`）のPhase境界とまったく同じ（Layer1-4=Basic Research Lab/5-12=Neural Network/13-20=Memory Distortion/21-30=Genesis Core/31+=Unknown Layer）で、境界値の二重管理を避けるため`audioManager.js`は`themeManager.js`のPhase判定関数をそのまま呼び出すだけで、独自のLayer範囲定義を持たない。Phase切り替え時は約1.6秒かけて新旧のBGMをクロスフェードする。

### Dialogue Text Sound
Story Dialogueの文字送り中、2文字に1回の短いtick音を鳴らす。ARIA/Dr. Leon/Lost Researcherでそれぞれ異なる音色（ARIAは高音でデジタルな質感、Dr. Leonは低めで人間らしい質感、Lost Researcherはやや歪んだ記録音源らしい質感）を設定している。

### System SE
Node Select（Memory Nodeタップ）・Signal Inject（Signal配置）・Node Sync（同期完了）・Puzzle Clear（Cognitive Analysis成功）・Layer Start（Layer開始）・Layer Complete（Layer完了報酬）・Protocol Activate（Protocol解放）の7種。いずれもENDLESS RESEARCH中（Research Console有効時）のみ鳴り、Stage/Tutorial/Daily Puzzleの既存の音（`sound.js`）には影響しない。

### Research Console Ambient
Research Console（STEP41-4）が表示されている間、控えめな低音のdrone（呼吸のように緩やかに音量が揺らぐ）を再生する。ON/OFF切り替え可能で、OFFにするとResearch Console表示中でも鳴らない。

### Audio Settings
BGM/UI（UI・System・Discovery Soundをまとめたバス、STEP43.6で「Effect」から改名）/Dialogue/Environmentの4項目を個別に音量調整できる。TITLE画面から開き、設定は既存のprogress.js/endlessSave.jsとは独立したLocalStorageキー（`logicColor.audio.v1`）へ保存される（既存Save構造には一切触れない）。

---

## 15. Adaptive Music System & Audio Data Architecture（STEP43.6で追加）

STEP43.5のResearch Facility Audio Systemを、「BGMを再生するゲーム」ではなく「研究施設AIがリアルタイムに音を生成している」という世界観に沿った、完全生成・完全データ駆動のアーキテクチャへ再構築したもの。**ゲームルール・問題生成・判定には一切影響しない**。外部音源ファイルは一切使用せず、全ての音（BGM・SE・環境音）をWeb Audio APIによりその場で合成する。

### Research Facility Soundscape
BGMという固定コンテンツではなく、Drone/Pad/Pulse/Arpeggio/Texture/Ambient/Eventという独立した「音のレイヤー」が、現在のTheme（研究対象のPhase）・Layer進行・ゲーム内で起きた出来事に応じてリアルタイムに重なり合うことで、施設そのものが生きて音を発しているような体験を作る。Layer1はDroneのみの静かな状態から始まり、探索が進むにつれてPad（Layer5〜）・Pulse（Layer10〜）・Arpeggio（Layer15〜）・Texture（Layer21〜）と、AIが解析を深めるように音のレイヤーが積み重なっていく。

### Audio Data Driven Architecture
Theme・音階・コード進行・アルペジオパターン・音色（Synth Preset）・ゲームイベントへの反応は、すべて`src/audio/config/`配下のデータファイルとして分離されている。AudioManager（音を鳴らすだけ）とAdaptiveMusicEngine（現在の状態から演奏を生成するだけ）は互いの責務を厳密に分離しており、新しいThemeを追加する場合もaudioThemes.js等へエントリを1つ追加するだけでよく、AudioManager/AdaptiveMusicEngine側のコード修正は不要な構造にしてある。

### Music Seed System
研究RUNを開始するたびに固有のMusic Seedが生成される。通常のTheme（Basic〜Genesis Core）はデータで定義された固定のコード進行・音階を使うが、Layer31以降のUnknown Layerだけは、このMusic SeedからPattern・Texture・Pulse・コード進行を部分的にランダム生成する。同じRUN中は同じSeedから生成され続けるため、「今回の研究で聞こえてくる未知の音」として一貫性を保つ（RUNが変われば別の生成結果になる）。

### Research Facility Audio Design（STEP43.6追加要件で追加）
研究施設の音響は「BGMという1本のコンテンツを再生する」のではなく、Music Layer（Drone/Pad/Pulse/Arpeggio/Texture/Ambient/Event）とFacility Audio Theme（今いるゾーンの環境音）を独立した2つの軸として重ね合わせる設計になっている。BGM本体（テンポ・スケール・コード進行）はLayer進行（研究の深度＝5段階のPhase）に、環境音・アクセント音はWorldEnvironment（5Layerごとに巡回する「今いるゾーン」）に、それぞれ別々に反応する。両者は互いに独立しているため、同じPhaseの中でもゾーンが変わるたびに施設の"聞こえ方"が変化し続ける。

### Facility Audio Theme（STEP43.6追加要件で追加）
既存のWorldEnvironment（1章参照）6種、Digital Grid/Quantum Network/Neural Forest/Data Ocean/Fractal Core/Unknown Dimensionそれぞれに専用のAudio Theme（環境音の組み合わせ・Droneへのフィルター色付け・入場時のアクセント音）を割り当てている。既存のHidden Environment（秘匿領域）6種（Void Memory/Lost Archive/Genesis Lab/Simulation Zero/Echo Network/Paradox Core）にも同様に専用Themeを用意しており、秘匿領域滞在中はそちらが一時的に優先され、離脱すると元のWorldEnvironment用Themeへ自動的に戻る。

### Adaptive Scan Progress（STEP43.6追加要件で追加）
既存のEnvironment Scan演出（Layer移動でゾーンが変化した瞬間に表示する「SCANNING AREA...」演出、1章参照）の進捗バーは、単純な一定速度ではなく、区間ごとにランダムな速度で進むようになっている。ただし実際にScanが完了するまでの時間そのものは変えていない（見た目の刻み方だけを変化させている）。バーが進むたびに短いProgress SEが鳴り、100%に近づくほど音が僅かに高くなることで、AIが解析を追い込んでいく緊張感を表現している。

### System Event SE（STEP43.6追加要件で追加）
Analyze/Upgrade/Complete/Discovery/Protocol/Warning/Error/Layer Start/Layer Complete/Continue/Menu/Back/Confirmの各イベントに対応する短いSEを、全てSynthのリアルタイム生成で用意している（音源ファイルは使用しない）。既存のUI Sound（Node選択/Node確定/Signal同期等）と同じ枠組みで管理され、ENDLESS RESEARCH中のみ鳴る。

### Audio Timeline System（STEP43.6追加要件で追加）
研究施設で起きる一つの出来事（Layerクリア・Memory取得・Ending等）は、SE単発ではなく「SE→Popup→Rank表示→次のSE→Music反応→次の演出」という時間軸に沿った一連の流れとして構築されている。この流れをTimelineと呼び、開始時刻（秒）・優先度・キャンセル条件を持つ複数のステップ（SE/Music反応/Popup/Dialogue/Camera/演出）として`src/audio/config/audioTimelines.js`にデータとして定義する。画面側のコード（endless.js）はTimelineへ直接触れることはなく、次項のFeedbackManagerを介してのみ発火させる。これにより「研究施設AIが一連の演出を自律的に組み立てて提示している」という体験を保ちながら、既存のReward/Story/Dialogueといったゲーム進行そのものには一切影響を与えない。

### Timeline Driven Presentation（STEP43.6追加要件で追加）
例えばLayerクリア時のTimeline（layerComplete）は、0.0秒でLayer Clear SE→0.2秒でクリアPopup→0.5秒で研究ランク表示→0.8秒でDiscovery SE→1.2秒でMusic反応（コード進行）→1.6秒で次のLayerへの演出、という順序で進行する。Memory取得（memoryObtain）のTimelineは、取得の瞬間にBGMを40%まで一時的に下げてMemoryにまつわる一言を示し、鐘の音が鳴った後にBGMを元の音量へ戻す、という「AIが一瞬こちらに注意を向けてまた解析へ戻っていく」ような呼吸を表現する。Ending時のTimeline（ending）は最優先（critical）として、進行中の他の全てのTimelineを停止させたうえでEndingだけの演出を独占的に進行する。

### Research Facility Event Timeline（STEP43.6追加要件で追加）
Layer開始/クリア・Discovery・Protocol取得・Memory取得・Relationship変化・実績解除・図鑑コンプリート・Story/Dialogue・Ending・Continue・Popup通知・環境変化・研究ランクアップなど、研究施設内で起きるほぼ全てのイベントがTimelineとして扱われる（うちlayerComplete/memoryObtain/endingの3つは上記のとおり複数ステップの演出として手作りされており、残りは既存のSE・Music反応をそのままTimeline化した単純な1ステップとして自動的に構成される）。優先度の高いTimeline（Memory取得やEndingなど）が進行中に発生すると、優先度の低いTimelineは自身の設定に応じてキャンセル・一時停止・音量Duckのいずれかで道を譲り、高優先度のTimelineが完了または中断されると元の演出へ自動的に復帰する。

---

## 16. Cognitive Re-Synchronization System（STEP44で追加）

長期間ENDLESS RESEARCHを離れていたプレイヤーが、世界観・ストーリー・操作・思考方法を自然に思い出せるようにするための復帰演出システム。**ゲームルール・パズル判定・スコア計算には一切影響しない**。「コンティニュー」という即物的な操作ではなく、Researcher-01（プレイヤーキャラクター）が研究施設と再同期する一連の手続きとして描く。

### Research Suspend
ENDLESS RESEARCH中にRUNを離れる（GAME画面の「‹ BACK」、またはResearch Mapの「メニュー」）際、既に中断可能な状態（Signal Anchorが存在する状態）であれば「Saving Research...」→「Installing Signal Anchor...」→「Research Suspended」という短い状態通知が流れる。これは長い読み物ではなく、施設側が状態を保存していることを示す簡潔なシステムログという位置づけ。

### Signal Anchor
最後に到達したLayer・選択中のProtocol/Environment・Research Mapの進行状況を指す、施設側が設置する目印。実体は既存のContinue Snapshotそのもの（新しい保存領域を追加したわけではない）で、「最後のLayerへ設置される」という演出上の意味づけを与えている。次回のCONTINUEはこのSignal Anchorから再開する。

### Facility SaveとResearch Suspendの分離（バグ修正で明文化）
研究施設の状態は2種類に分かれる。**Facility Save**は「今どの施設内画面を見ているか」（Main Menu/Research Lab/Archive/Protocol Lab/Settings等）という表層の状態で、CONTINUEの判断材料には一切使わない。**Research Suspend**（Signal Anchor）は「中断中の研究そのもの」（Layer/Environment/Story/Protocol/Relationship/Suspend Time/Signal Integrity）を指し、CONTINUEは必ずこちらだけを参照する。この2つを混同すると、「Neural Research Labの画面を単に開いただけ」で中断中のLayerへ戻れなくなる不具合が起きる（施設内を見て回ることと、研究そのものを中断・再開することは別の行為であるべき、という設計原則）。Signal Anchorは、実際にRUNを離れる（Research Suspend演出）・RUNが終了してHubへ帰還する、という「研究が本当に一区切りついた瞬間」にのみ設置・更新され、Labを覗く・Titleへ戻る・ブラウザを閉じるといった行為では一切変化しない。新しい研究を始める（START NEW RESEARCH）と宣言した時だけ、古いSignal Anchorは役目を終えて消える。

### Signal Integrity
最後にプレイした時刻からの経過時間に応じて低下していく、Signal Anchorとの同期強度（%）。24時間以内は100%、3日で95%、1週間で85%、2週間で75%、それ以上経過すると下限の60%で安定する（60%を下回ることはない＝復帰そのものが不可能になることは無い）。CONTINUE時、Restoring Signalの直後に必ず表示される。

### Cognitive Drift
Signal Integrityの低下によって生じる同期のずれ。**これはプレイヤー自身の理解力低下ではなく、Researcher-01（プレイヤーキャラクター）の施設同期率が低下しているという設定上の現象**として描かれる。Drift無し（Signal Integrity 95%以上）ならそのまま研究を再開できるが、Driftが進むほど、次項のCalibration Programでより多くの項目を確認することになる。

### Calibration Program
CONTINUE時、Cognitive Driftの程度とプレイヤーの進行状況に応じて、以下から必要な項目だけが自動的に選ばれ、順番に提示される: Research Summary（図鑑進捗の集計）・Story Recap・Memory Review・Relationship Review・Protocol Review・Operation Review・Logic Review・Mini Puzzle。各項目はいつでもスキップできるが、スキップ時には「本当にスキップしますか」という推奨に反する旨の確認が入る。

### Adaptive Recap System
Story RecapはARIAの声で語られる、その時点の進行状況（現在のChapter・直近に復元したMemory Fragment）に応じて毎回組み立て直される短い要約。Memory/Relationship/Protocol Reviewも同様に、その時点でセーブ済みの実データ（取得済みMemory Fragment・各キャラクターとの関係値・解放済みProtocol）から動的に生成され、あらかじめ書かれた固定文章ではない。Mini Puzzleは通常Layerより明確に簡単な問題（3×3〜4×4）で、操作方法とパズルの考え方だけを思い出させることを目的とし、正誤判定以外はスコア・ライフ等の既存RUN進行には一切影響しない。

---

## 17. Research Facility Interaction Pass（STEP45で追加）

「プレイヤーはゲームを操作しているのではなく、研究施設OSを操作している」という一貫した体感を作るための、UX/演出/音響の全体的な磨き込み。新しいゲームルール・新しい遊び方は一切追加していない（**ゲームルール・パズル判定・スコア計算・進行データには一切影響しない**）。ボタンを押した瞬間の手応え、パネルが開く瞬間の質感、施設の状態そのものがUIの色・音・動きへにじみ出てくることを狙った。

### Research Facility Interaction
施設のあらゆるボタン・パネルには、押した瞬間・開いた瞬間に必ず反応がある。処理の結果を待たず、触れた瞬間にまず施設側が「受け取った」と返す。これは個々の機能を作り込んだのではなく、施設全体（ゲーム全体）に共通の反応様式として後から行き渡らせたもの。

### Audio Language
施設の音は14種の役割（移動/選択/確定/取消/通知/発見/プロトコル/物語/記憶/研究/警告/エラー/環境/終幕）に分類され、それぞれ専用の音色を持つ。プレイヤーは音の高さや音色だけで「今、施設が何に反応したか」を意識せず理解できるようになる。

### State Based UX
研究施設の状態（今いる領域、研究の深度、施設の安定度、ARIAの人格の成熟度、未知領域への到達、物語の進行）は、UIの色調・光の強さ・アニメーションの速さへ静かに反映される。施設が不安定になれば環境音は沈み、光は強く揺れる。派手な演出を足すのではなく、常にそこにある画面が施設の"今の状態"を映す鏡になるという設計。

### Interaction Feedback
ボタンを押す・パネルが開く・アイコンが静かに息づく——これらは全て「施設側からの返答」として統一される。長押しや切り替え操作にもそれぞれ固有の手応えがあり、プレイヤーは常に「自分の入力が施設に届いている」という確信を持てる。

### Presentation Quality
どんな端末でも心地よく施設を操作できるよう、演出の量（High/Normal/Minimal）を選べる。演出を絞っても、施設が反応していること自体は常に保証される（音・レスポンスは質を落とさない、視覚的な華やかさだけを段階的に絞る設計）。
