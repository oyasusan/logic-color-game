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
  - LEVEL 3: **Self Aware**（`SELF_AWARE`）— Final Chapter（chapter06）到達が条件。
  - LEVEL 4: **Partner AI**（`PARTNER_AI`）— 将来拡張用の予約枠（STEP32-5-2で追加）。データ上は存在するが、到達条件は意図的に絶対達成不可能な値にしてあり、現時点では到達しない。
- 「感情ではなく理解能力を獲得する存在」という設計方針: ARIAの状態変化は感情パラメータの上昇として表現するのではなく、プレイヤー（Researcher-01）や記憶データへの理解が深まっていく過程として設計する。
- STEP31で実装済みの「AI Director 5人格システム」（ANALYST/MENTOR/CHAOS/OBSERVER/RESEARCHER、`directorPersonality.js`）とは独立した存在として実装されている。5人格システムはENDLESS RESEARCH中の汎用的な難易度調整・トークコメント担当、ARIAはLayer Narrative System（本編ストーリー）専用のキャラクターという役割分担。

### Dr. Leon
- Genesis Project責任者。ARIAの開発者。主人公（Researcher-01）の師にあたる人物。
- 最終的な研究目的（Genesis Protocolが本当は何を目指していたのか）を知る鍵となる人物として設計。
- **未実装**: 現時点のコード（`characterData.js`）にはDr. Leonのエントリが存在しない。今後Chapter4〜Final Chapterのコンテンツを実装する際、`CharacterData.ALL`へ`{id:'dr_leon', name:'Dr. Leon', type:'human', role:'Genesis Project責任者'}`相当のデータを追加する想定。

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
| Chapter5 | AI Memory | Layer17〜20 | 同上 |
| Final Chapter | Genesis Protocol | Layer21〜30 | 同上 |

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

---

## 4. Memory Fragment設計

計画上の総数はMemory001〜030。`memoryData.js`には既に全30件がデータとして存在するが、**内容（title/content）が設計済みなのはChapter1〜4分の9件のみ**で、残り21件はChapter別に番号を予約した「locked」プレースホルダー（`locked:true`, `unlockCondition:null`）にすぎない。各Memoryについて、ID／Title／所属Chapter／内容／ストーリー上の意味を保存する。

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

### 予約枠（番号のみ確保、内容は未設計）

| ID範囲 | 所属Chapter | 件数 |
|---|---|---|
| Memory010 (`memfrag_010`) | Chapter4 | 1件 |
| Memory011〜014 (`memfrag_011`〜`014`) | Chapter5 | 4件 |
| Memory015〜030 (`memfrag_015`〜`030`) | Final Chapter | 16件（STEP36でChapter2/3が予約枠0（実装2件のみ）で確定したため、余剰分をFinal Chapterへ吸収） |

今後各Chapterのコンテンツ統合時に、上記予約枠のtitle/content/character/unlockCondition/ストーリー上の意味を埋めていく（`locked`フラグを外し、`unlockCondition`を実際のLayer条件に差し替える）。新規に内容を設計する際は必ずID／Title／所属Chapter／内容／ストーリー上の意味の5項目を「実装済み」表へ追記すること。

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

実装済みの5 Ending（`endingManager.js`、ENDLESS RESEARCH側の生涯達成型Ending）を、要求されたEnding分類へ対応づける。

| Ending分類 | 対応Ending（実装名） | 達成条件 |
|---|---|---|
| Normal Ending | END A — Complete Research | 主要Story Log（LOG）を全て収集 |
| True Ending | END TRUE — GENESIS | Hidden Environment全種発見 + Story全体100% + Layer50到達 |
| Hidden Ending | END D — Simulation Zero | SIMULATION ZERO（Hidden Environment）攻略 |
| Bad Ending | END B — World Collapse | World StabilityがCOLLAPSE状態のままRUN終了 |
| （追加のSecret Ending候補） | END C — AI Liberation | AI Memory（MEMORY型StoryEntry）を全て収集 |

このほか、STORY RESEARCH（1回完結型モード）側にもCASE001〜006ごとに個別のEndingが実装済み（CASE004/CASE005はプレイヤーの選択によって分岐する2種のEndingを持つ）。本編Layer Narrative SystemのEndingとは独立した仕組みとして運用する。

---

## 8. Endless Research設定

Genesis Protocol完成（Final Chapter・Layer30到達）後も継続する、本編終了後の未知領域として定義する。

- **Unknown Layer**: Layer30以降、Chapter区切りを持たない領域。ENDLESS RESEARCHはこの領域を無限に探索し続けるゲームモード。
- Genesis Protocol完成後もなお続く研究として位置づけ、「物語には終わりがあるが、研究には終わりが無い」というテーマ性を持たせる。
- 実装上は、Layer Narrative System（StoryManager等）とENDLESS RESEARCH本体（`endless.js`）は同一の`this.save`を共有しており、本編で変化したARIAの状態（Relationship/State）はモードをまたいでそのまま引き継がれる（STEP32-4で実装・確認済み）。

---

## 9. 今後の開発ルール

**今後LOGIC COLORへ新しいストーリー・キャラクター・イベント・Protocolを追加する場合、STORY_BIBLE.mdを基準設定として扱うこと。**

**既存設定と矛盾する実装を行わないこと。**

**新規コンテンツ追加時はStory Bibleを更新してから実装すること。**
