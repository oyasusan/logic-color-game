# LOGIC COLOR（仮）

色と数字を使った論理パズルゲーム。プレイヤーは盤面にライト（BLUE / RED / GREEN）を配置し、盤面の上側（列条件）と左側（行条件）に表示されるヒントをすべて満たすとステージクリアとなる。

ステージ制・チュートリアル・星評価（クリア評価）・プレイヤーレベルを備えた拡張版。

外部ライブラリ不使用（HTML5 + CSS3 + Vanilla JavaScript ES6+ のみ）。スマートフォンのブラウザ（Chrome / Safari）で動作することを想定。

## Documentation

- docs/STORY_BIBLE.md
  - 世界観、キャラクター、ストーリー設定

## 遊び方

1. `logic-color-game` ディレクトリをそのまま静的ファイルとして配信する（`file://` で直接開くと `fetch` でのJSON読み込みが失敗するブラウザがあるため、簡易サーバー経由を推奨）。

   ```bash
   cd logic-color-game
   python3 -m http.server 8000
   # ブラウザで http://localhost:8000 を開く
   ```

2. **TITLE画面**で「STAGE SELECT」をタップする。
3. **STAGE SELECT画面**で、初回は「TUTORIAL」のみ選択可能（他ステージはLOCKED）。チュートリアルをクリアするとStage1が解放され、以降は直前のステージをクリアするたびに次のステージが自動解放される。
4. **GAME画面**で、盤面のマスをタップするたびに `EMPTY → BLUE → RED → GREEN → EMPTY …` と色が巡回する（フッターの凡例がその巡回順を示す）。目的の色になるまで同じマスを連打する。
5. 盤面の上側・左側にあるヒントの数字は、その列/行に必要な色ごとのライト数を表す。条件を満たすとヒントの数字が薄く表示される。
6. 全ての行・列の条件を満たすと**CLEAR画面**が表示され、星評価・タイム・獲得EXPが確認できる。「NEXT STAGE」で次のステージへ、「STAGE SELECT」でステージ選択に戻れる。

### 操作ボタン

| ボタン | 機能 |
| --- | --- |
| （マスタップ） | タップするたびに配置する色が `EMPTY→BLUE→RED→GREEN→EMPTY…` と巡回する。色選択ボタンは無い（後述の理由により廃止） |
| UNDO | 直前の操作を1手戻す |
| RESET | 盤面を全消去する |
| HINT | 未完成のマスを1つ、正解の色で開示する（使うと星評価が下がる） |
| ‹ BACK / ‹ TITLE | 画面を1つ前に戻る |

## ファイル構成

```
logic-color-game/
├ index.html          TITLE/STAGE SELECT/GAME画面の構成とネオン・ダークテーマCSS、PWA/スマホ最適化用meta
├ manifest.json       PWA用Webアプリマニフェスト（ホーム画面追加・アイコン・standalone起動）
├ service-worker.js   オフライン起動用Service Worker（静的アセットをstale-while-revalidateでキャッシュ）
├ src/
│ ├ main.js           エントリーポイント。各モジュールを統括するAppクラス。
│ │                    画面フロー(TITLE→STAGE SELECT→GAME→CLEAR→NEXT STAGE)を制御
│ ├ game.js           1ステージ分の進行管理（タップ巡回/Undo/Reset/Hint/クリア判定、
│ │                    星評価用のhintCount/undoCountを個別カウント）
│ ├ board.js          盤面データ構造（EMPTY/BLUE/RED/GREENの純粋な状態管理、色の巡回ロジック）
│ ├ solver.js         ヒント条件から解の数・探索量(steps/guessCount)を求める探索エンジン
│ ├ difficulty.js     solverの探索統計から難易度(easy/normal/hard/expert)を判定
│ ├ seed.js           同じseedなら同じ乱数列になる決定的な擬似乱数(mulberry32)
│ ├ generator.js      唯一解の問題を自動生成するエンジン（2段階の掘り出し法・公開品質ゲート。後述）
│ ├ puzzleManager.js  固定問題(puzzles.json)・生成問題・Daily Puzzleを統一形式で提供
│ ├ ui.js             DOM描画・タップ操作・発光アニメーション・画面切り替え
│ ├ score.js          時間フォーマット(mm:ss)・星評価(★1〜★3)の計算
│ ├ progress.js       LocalStorage管理（クリア済みステージ/星/ベストタイム/レベル/EXP/
│ │                    チュートリアル完了フラグ）
│ ├ stage.js          data/stages.json + data/puzzles.jsonの読込、ステージ解放判定
│ ├ tutorial.js       data/tutorials.jsonの読込、チュートリアル1→2→3の進行制御
│ ├ theme.js          NEURAL GRID背景演出（漂うノード+リンク線のcanvasアニメーション、30fpsに間引き）
│ ├ animation.js      セル/ヒントチップ/クリア画面の演出用CSSクラス制御ヘルパー
│ ├ sound.js          Web Audio APIによるシンセ効果音(tap/place/complete/clear)
│ ├ debug.js          ?debug=true時のみ有効なデバッグパネル（答え/Seed/難易度/Solver情報表示）
│ └ endless/          ENDLESS RESEARCHモード（詳細は後述の専用セクション参照）
│   ├ map.js            Depth→盤面サイズ/疎密度の決定
│   ├ endlessSave.js     ベスト記録のLocalStorage管理(logicColor.endless.v1)
│   ├ upgrades.js        通常アップグレード10種の定義データ(id/name/category/description/effect)
│   ├ rareUpgrades.js    Rare Upgrade4種の定義データ＋出現率設定(Phase3)
│   ├ upgradeManager.js  RUN中の所持アップグレード管理（取得・重複スタック・Evolution上限・効果集計）
│   ├ protocols.js       Protocol3種の定義データ(id/name/description/effects)。RUN開始時のProtocol Selectで提示(Phase A)
│   ├ protocolSignals.js Protocol Signal限定の追加Protocol5種(Oracle/Precision/Chaos/Minimal/Quantum)の定義データ(Phase B→Phase CでQuantum追加+unlock/rarity付与)
│   ├ protocolSynergy.js 2Protocol組み合わせで発動するSynergy4種(Navigator等)の定義データ・判定(Phase B)
│   ├ protocolManager.js Active中Protocol群(最大2個)の管理・効果集計(加算/乗算/OR)(Phase A→Phase Bで複数管理化)
│   ├ protocolUnlock.js  Protocol解放条件(protocols.js/protocolSignals.jsの`unlock`フィールド)の判定(Phase C)
│   ├ protocolFragment.js Protocol Fragment獲得量の定義(Boss/Event/High Depth)(Phase C)
│   ├ boss.js            Boss Puzzle(Depth10/25/50)の生成設定(Phase3)
│   ├ events.js          Event Node5種の定義データ(Phase3)
│   ├ eventManager.js    Event Nodeの出現判定・ランダム選択(Phase3)
│   ├ endlessGame.js     1問ごとの生成・制限時間・操作中継・アップグレード/Boss/Protocol効果の適用
│   ├ endlessResult.js   RESULT画面の描画
│   ├ researchLab.js     3択アップグレード選択画面（Depth3ごとに出現、Rare混入対応）
│   ├ protocolSelect.js  RUN開始直後のProtocol Select画面(Phase A)
│   ├ protocolSignal.js  Depth5ごとのProtocol Signal画面（Merge/Replace/Ignore、Phase Cで解放済みのみ候補化）(Phase B)
│   ├ protocolArchive.js 発見済み/未発見Protocol一覧・レア度・Fragment表示画面(Phase C)
│   ├ environments.js       Research Environment6種の定義データ(id/name/description/effects)
│   ├ environmentManager.js RUN開始時に選ぶEnvironmentの状態管理＋Detection画面の描画(3ファイル構成の都合上、状態とUIを1ファイルに統合)
│   ├ environmentArchive.js 発見済み/未発見Environment一覧画面
│   ├ nodeTypes.js       Map Node8種の定義データ(Map Generation System。Elite変種は後述puzzleModifier.jsへ移行)
│   ├ puzzleTier.js      Depth→盤面サイズ/疎密度の4段階Tier定義(Puzzle Evolution System。map.jsの後継)
│   ├ puzzleModifier.js  Modifier5種の定義データ(Puzzle Evolution System)
│   ├ difficultyManager.js Difficulty計算(Depth+Protocol+Environment+Node)の一元化(Puzzle Evolution System)
│   ├ mapGenerator.js    Depth別Node分岐候補の生成(Protocol/Environment/Modifier連動込み)(Map Generation System→Puzzle Evolution SystemでModifier付与を追加)
│   ├ mapUI.js           Map画面（分岐候補の描画・Oracle情報表示）(Map Generation System)
│   └ endless.js         RUN全体の統括（画面遷移・スコア計算・アップグレード/Event/Boss/Protocol/Environment/Map/Puzzle Evolution反映）
├ data/
│ ├ puzzles.json      パズル本体（id, size, rowHints, columnHints, answer, parSeconds,
│ │                    generatedDifficulty, generatorStats, seed）
│ ├ stages.json       ステージのメタ情報（id, name, difficulty, puzzle参照, unlock）
│ └ tutorials.json    チュートリアル3問（3×3盤面、使用色制限、instructional message）
├ tools/
│ └ build_puzzles.js  data/puzzles.json を生成する開発用Node.jsスクリプト（生成時に品質ゲートを実行）
├ assets/
│ ├ images/           PWAアイコン一式（icon-192/512.png, icon-maskable-512.png,
│ │                    apple-touch-icon.png, favicon.png）
│ └ sounds/           効果音アセット置き場（sound.jsはWeb Audio API合成音のため未使用・プレースホルダーのまま）
└ README.md
```

`index.html` は `<script>` タグを直接並べる方式（ESモジュール不使用）で `src/*.js` を読み込む。理由は `file://` で開いた場合でもESモジュールのCORS制限を受けずに動作させるため。各ファイルは `window.LogicColor` 名前空間にクラス/関数を登録することでファイル間の依存を解決している。読み込み順は `board→solver→difficulty→seed→generator→puzzleManager→score→progress→stage→tutorial→game→theme→animation→sound→debug→endless/map→endless/endlessSave→endless/upgrades→endless/rareUpgrades→endless/upgradeManager→endless/protocols→endless/protocolSignals→endless/protocolSynergy→endless/protocolManager→endless/protocolUnlock→endless/protocolFragment→endless/environments→endless/nodeTypes→endless/puzzleTier→endless/puzzleModifier→endless/difficultyManager→endless/boss→endless/mapGenerator→endless/events→endless/eventManager→endless/endlessGame→endless/endlessResult→endless/researchLab→endless/protocolSelect→endless/protocolSignal→endless/protocolArchive→endless/environmentManager→endless/environmentArchive→endless/mapUI→endless/endless→ui→main` （依存する側を後に置く）。`theme.js`/`animation.js`/`sound.js`/`debug.js`はゲームロジック側のモジュールに依存しない独立モジュールで、`ui.js`/`main.js`が消費する。`src/endless/`配下は`board`/`game`/`generator`/`puzzleManager`/`score`（既存モジュール）を利用するが、既存モジュール側からは`src/endless/`への依存は一切無い。

## ゲームルール仕様

- 盤面サイズはパズルごとに `size` で指定（チュートリアルは3×3、本編ステージは5×5）。
- 各マスは `EMPTY` / `BLUE` / `RED` / `GREEN` のいずれか。
- `rowHints[r]` / `columnHints[c]` は `{ BLUE: n, RED: n, GREEN: n }` の形式で、その行/列に存在すべき各色のライト数を表す（0も明示的な制約）。UI上は0件のヒントは表示しない。
- クリア条件は「全行条件 + 全列条件」を同時に満たすこと。
- `answer` は開発・Hint機能用のデータで、プレイヤーには直接表示しない（HINTボタンを押すと未完成のマスを1つだけ開示する）。
- `allowedColors`（省略可）を指定すると、そのパズルで使用できる色を制限できる。チュートリアルで使用しており、省略時はBLUE/RED/GREENの3色すべてが使える。

## マス操作の仕様（色選択ボタンを廃止した経緯）

当初は「色ボタンを選んでからマスをタップして配置する」2ステップの操作方式だったが、開発途中でユーザーからの指示により**「マス自体をタップすると色が巡回トグルする」1ステップ方式**に変更した。

- `board.js` の `cycle(r, c, colorList)` が実体: 現在の色を `colorList` 内で探し、次の色へ進める（末尾まで行くと `EMPTY` に戻る）
- `game.js` の `tapCell(r, c)` がこれを呼び出す。`place(r, c, color)` という色指定版のメソッドは廃止した（呼び出し元が無くなったため）
- `ui.js` の色選択ボタン生成（`buildColorButtons` / `selectedColor`）は削除し、代わりに巡回順を示す**非インタラクティブな凡例**（`renderColorLegend`、○→●→●→●→○のドット表示）をフッターに表示するようにした
- チュートリアルの `allowedColors` によって巡回の長さが変わる（Tutorial01はBLUEのみで `EMPTY⇄BLUE`、Tutorial02/03は2色で3状態を巡回する）

## Solver / Generator（問題自動生成エンジン）

### solver.js

マスを1つずつ確定させながら深さ優先探索を行い、行を埋め終えた時点でその行の条件を満たしているかを確認する枝刈りを行うことで5×5盤面でも高速に解の数を数えられる。解が2件見つかった時点で探索を打ち切る（`limit` オプション、デフォルト2）ため「唯一解かどうか」の判定は最短で終了する。

`solve()` の戻り値は `{ solutions, solution, steps, guessCount }`:
- `solutions`: 見つかった解の数（`limit`で打ち切られるため、唯一解判定には`limit:2`で「1件だけ見つかった」ことを確認すれば十分）
- `solution`: 最初に見つかった解の盤面
- `steps`: 探索中に実際に試みたマス割り当ての回数（探索量の目安）
- `guessCount`: あるマスで「ヒントだけでは1色に決められず、複数の候補が残っていた」回数（0か1候補しかない＝確定できるマスはカウントしない）。これが`difficulty.js`の主要な入力になる。

### generator.js の設計判断（数独の「掘り出し法」がそのままでは通用しない理由）

このゲームのヒントは「行/列ごとの色別ライト数」という**集計カウントのみ**で、色の並び順を示す手掛かりが無い。そのため最初に検討した「全マスを色で埋めた完成盤面から、数独のようにマスを掘ってEMPTYにしていく」方式を試したところ、**EMPTYなしの完成盤面はほぼ確実に唯一解にならない**ことが判明した（Node.js上の実測: 5×5でEMPTYなし盤面が唯一解だった割合は0/30）。集計カウントだけでは同じ数字になる色の並び替えが大量に存在してしまうため。

そこで最終的に以下の2段階方式を採用した:

1. **完成盤面生成**: 難易度ごとの目標疎密度（EMPTYになる確率）でマスをEMPTY/3色にランダム割り当てし、`solver.js`で唯一解になるまでリトライする（MVP版のgenerator.jsと同じretry方式）。
2. **ヒント削除（掘り出し）**: 唯一解が見つかった盤面から、さらにマスを1つずつランダムな順でEMPTYへ削り、唯一解を保てる場合だけ確定する。唯一性が既に保証された状態からの掘り出しなので安全に適用できる。ただし全マスを上限なく掘り続けると、どの難易度から始めても「これ以上削れない最小構成」に収束し難易度の作り分けが消えることを実測で確認したため、**掘れる数を盤面の約10%に制限**している。

`generatePuzzle(size, difficulty, seed)` の戻り値:
```js
{
  size,
  hints: { row: [...], column: [...] }, // rowHints/columnHintsと同じ形式
  answer,
  difficulty,   // solver.jsの探索統計から実測した客観的な難易度（下記difficulty.js参照）
  stats: { solutions, steps, guessCount, hintCount, requestedDifficulty }
}
```

### difficulty.js

Node.js上で5×5盤面を各難易度20回ずつ生成して`steps`/`guessCount`/`hintCount`を実測し、閾値を較正した。集計カウント型のヒントでは**疎密度が低い（色が密）ほどsolverのguessCount/stepsが増える＝難しくなる**ことが分かったため、`easy`は疎密度を高く（EMPTYが多い）、`expert`は疎密度を低く（色が密）設定している。

| 難易度 | 目標疎密度 | 実測avgGuessCount | 実測avgSteps | 実測avgHintCount |
| --- | --- | --- | --- | --- |
| easy | 0.6 | 25 | 143 | 7 |
| normal | 0.45 | 53 | 191 | 12 |
| hard | 0.32 | 255 | 765 | 16 |
| expert | 0.18 | 605 | 1686 | 19 |

**注意**: 生成は乱数ベースのため、要求した`difficulty`と実測（返り値の`difficulty`）は必ずしも一致しない（20回中の一致率はeasyで19/20と高いが、normal/hard/expertは半分前後）。要求値は`stats.requestedDifficulty`で確認できる。プレイヤーに提示する難易度ラベルは、要求値ではなく実測値（`difficulty`フィールド）を使うこと。

### seed.js

mulberry32アルゴリズムによる決定的な擬似乱数生成器。文字列seed（例: 日付文字列）はFNV-1a風のハッシュで32bit整数に変換してから使う。同じseedを渡せば、`generator.js`は常に同じ問題を生成する（Node.js上で確認済み）。

### puzzleManager.js

固定問題（`data/puzzles.json`）・生成問題・Daily Puzzleを、Game/UIがそのまま扱える実行時パズル形式（`size`/`rowHints`/`columnHints`/`answer`/`parSeconds`/`id`）に統一するファサード。既存の`stage.js`（ステージ制のフロー）を置き換えるものではなく、新しい用途（現状はDaily Puzzle）のための独立した窓口として追加した。

### tools/build_puzzles.js

`data/puzzles.json` を再生成する開発用スクリプト。各ステージのseedを固定しているため、再実行しても同じ12ステージが再現される。

```bash
node tools/build_puzzles.js
```

### チュートリアルの3問について

`data/tutorials.json` は3×3という小さな盤面のため、唯一解になる配置をNode.js上のブルートフォース探索で選定して埋め込んである（`solver.js`で唯一解であることを確認済み）。ただし本編ステージのようにgenerator.js経由で自動生成したものではなく手作業で選んだ教材という位置づけ。

## Daily Puzzle

STAGE SELECT画面の「DAILY PUZZLE」カードから遊べる。`puzzleManager.js` の `getDailyPuzzle()` が、その日の日付文字列（`YYYY-MM-DD`、端末のローカル日付）を`seed.js`のseedとして`generator.js`に渡す。同じ日付なら誰が何度読み込んでも同じ問題になり、日付が変わると新しい問題になる（5×5・難易度`normal`固定）。

ステージの進行システム（`progress.js`のcompletedStages/stars/EXP）とは別枠として扱っており、クリアしても星評価・経験値・進行状況としては記録しない（クリア画面にタイム・Undo・Hint回数は表示される）。連続クリア日数の記録などは今後の拡張候補（後述）。

## ステージ・チュートリアルのデータ形式

`data/stages.json`:
```json
{ "id": 1, "name": "BEGINNER 01", "difficulty": "easy", "puzzle": "001", "unlock": false }
```
`puzzle` フィールドは `data/puzzles.json` 内の対応する `id` を指す文字列参照。`unlock` は「前提条件に関わらず常に解放する」ための特別フラグで、現在の12ステージは全て `false`（＝下記の動的解放ルールのみで運用）にしている。`difficulty`フィールドは5×5ステージでは`easy`/`normal`/`hard`、6×6以降のステージでは盤面サイズそのもの（`"6×6"`等）を表示用ラベルとして入れている（理由は後述の「ステージ拡張」セクション参照）。

**ステージ解放ルール**（`stage.js` の `isUnlocked()`）:
- 先頭ステージ（Stage1）はチュートリアル完了で解放
- それ以降のステージは、直前のステージをクリア済みなら自動解放

`data/tutorials.json` は3×3のチュートリアル3問を保持し、`step`/`title`/`message`（画面上部のバナーに表示する説明文）/`allowedColors` を持つ。stages.jsonには含めず、`tutorial.js` が別管理している（チュートリアル完了状態はステージクリアとは別に `progress.js` の `tutorialCompleted` フラグで管理）。

## クリア評価（星）とプレイヤーレベル

`score.js` の `calcStars()` による判定:

- **★1**: Hintを1回でも使ってクリアした場合
- **★3**: Hint未使用 **かつ** 規定時間（パズルごとの `parSeconds`）以内 **かつ** Undoが3回以下
- **★2**: 上記どちらにも該当しない通常クリア

経験値（`progress.js` の `recordClear()`）:
- ステージを**初めて**クリアした時 +100 EXP
- そのステージで**初めて**★3を達成した時 +50 EXP（再クリアでの重複加算はしない。再挑戦して星を更新した場合のみ差分を評価）
- 200 EXPごとにレベルが1上がる単純な線形カーブ（`EXP_PER_LEVEL = 200`）

## セーブ機能

`LocalStorage`（キー: `logicColor.save.v2`）に以下を保存する。

- `completedStages`: クリア済みステージIDの配列
- `stars`: `{ [stageId]: 1|2|3 }`（そのステージで獲得した最高の星）
- `bestTime`: `{ [stageId]: seconds }`（そのステージの最短クリアタイム）
- `level` / `exp`: プレイヤーレベルと累計経験値
- `tutorialCompleted`: チュートリアル完了フラグ
- `settings`: 設定（現状 `soundOn` のみ。将来の効果音実装用に予約）
- `history`: プレイ履歴（ステージID・星・タイム・Hint/Undo回数・クリア日時。直近30件を保持）

旧バージョン（MVP版当時の `logicColor.save.v1`、`bestStage` のみを保持する単一ステージ方式）が残っている場合、初回読み込み時に `progress.js` の `migrateFromV1()` が自動的に新形式へ引き継ぐ（`bestStage` からステージ1〜Nのクリア済み扱いへ変換し、チュートリアルは完了扱いにして差し戻しを防ぐ）。

## 実装ステップ

### MVP版（単一ステージ）
基本画面 → 盤面表示 → ライト配置 → ヒント判定 → クリア処理 → Undo → 問題読み込み → セーブ → 問題生成 → 演出追加、の順で実装。

### 拡張版（本README対象）
1. `data/puzzles.json` のid整理・`parSeconds`追加、`data/stages.json` / `data/tutorials.json` 新規作成
2. `score.js`（星評価・時間フォーマット）
3. `progress.js`（LocalStorage拡張・旧v1からの移行）
4. `stage.js`（ステージ読込・動的解放判定）
5. `tutorial.js`（チュートリアル進行制御）
6. `game.js` 拡張（`hintCount`/`undoCount`の個別カウント）
7. `ui.js` 拡張（画面切り替え、動的カラーボタン→後にタップ巡回の凡例表示に置き換え）
8. `main.js` 全面書き換え（TITLE→STAGE SELECT→GAME→CLEAR→NEXT STAGEのフロー統括）
9. `index.html` 書き換え（画面構成・CSS追加）
10. マス操作をタップ巡回方式に変更（ユーザー指示による仕様変更、上記「マス操作の仕様」の節を参照）

### 問題生成エンジン拡張（本README対象）
1. `seed.js`（決定的な擬似乱数、日付seed）
2. `solver.js` 拡張（`solutions`/`steps`/`guessCount`を返すよう変更）
3. `difficulty.js`（探索統計から難易度を判定、実測データで閾値較正）
4. `generator.js` 全面書き換え（完成盤面から掘り出す方式は唯一解にならないことが判明したため、目標疎密度でのリトライ生成→追加の掘り出し、の2段階方式に設計変更）
5. `puzzleManager.js`（固定問題/生成問題/Daily Puzzleの統一窓口）
6. `tools/build_puzzles.js` 更新（新しい`generatePuzzle(size, difficulty, seed)` APIに対応）
7. Daily PuzzleのSTAGE SELECT画面への最小限のUI統合（`main.js`/`ui.js`/`index.html`）

## 動作確認状況

- `node --check` で全 `src/*.js` の構文エラーがないことを確認済み。
- Node.js上で以下をユニットテスト的に確認済み。
  - `score.js`: 時間フォーマット、★1/★2/★3の判定ロジック
  - `progress.js`: 経験値・レベル計算、初回クリア/再クリアでのEXP付与制御、星・ベストタイムの上書き判定、保存→再読込による永続化
  - `stage.js`: 初期状態で全ステージロック、チュートリアル完了でStage1解放、Stage1クリアでStage2自動解放、`getNextStage()`
  - `tutorial.js`: Tutorial 1→2→3の進行、最終ステップ後の`advance()`が`null`を返すこと
  - `game.js`: `tapCell()`による色の巡回（通常ステージは4色巡回、`allowedColors`制限時はそれに応じた巡回）、タップ操作のみでのクリア到達
  - `data/stages.json` の `puzzle` 参照が `data/puzzles.json` の全idと対応し、全6ステージ・チュートリアル3問がGame経由でクリア可能であることを一括検証
  - `ui.js` が参照する全DOM要素IDが `index.html` に存在することを機械的に検証
  - `seed.js`: 同じseedで同じ乱数列・同じshuffle結果になること、異なるseedで異なる系列になること
  - `solver.js`: `solutions`/`steps`/`guessCount`を返すこと、既存パズルで`solution`が`answer`と一致すること
  - `difficulty.js`: 5×5盤面を各難易度20回ずつ生成した際の`easy`〜`expert`の判定分布（下記「問題生成エンジンについて」参照）
  - `generator.js`: 5×5問題生成、唯一解であること（`solver.js`で再確認）、同一seedで同一問題になること、異なるseedで異なる問題になること
  - `puzzleManager.js`: Daily Puzzleが同じ日付なら同じ問題になり異なる日付では変わること、Game経由でクリア可能なこと
  - `tools/build_puzzles.js` で `data/puzzles.json` を新APIで再生成し、全6ステージが引き続きGame経由でクリア可能であることを再検証（既存機能の回帰確認）
  - 問題生成エンジンのチェックリスト5項目（5×5生成・唯一解・難易度判定・同一seed再現・Daily Puzzle動作）を通しスクリプトで一括PASS確認済み
- ブラウザでの実機動作（ChromeOS Chrome経由でローカルサーバーにアクセス）について、画面遷移・チュートリアル進行・ステージ自動解放・星評価・EXP/レベル表示・タップ巡回操作・リロード後の永続化を含めて確認済み。ユーザーより「動作チェックOK」の確認済み（問題生成エンジン拡張版はDaily Puzzleカードの表示・プレイ・クリアをユーザー確認待ち）。

## 既知の制約・今後の拡張余地

- 効果音は`src/sound.js`のWeb Audio APIシンセ音のみで、`assets/sounds/`に音声ファイルは配置していない（未使用のプレースホルダーのまま）。画像アセット（`assets/images/`）はPWAアイコン一式（後述の「公開品質改善」セクション参照）を追加済みで、それ以外（ゲーム内グラフィック等）は未実装。
- チュートリアルの3問は手作業で選んだ教材であり、`generator.js`による自動生成・唯一解保証の対象外（唯一解であることはNode.js上のブルートフォース探索で個別確認済み）。
- ステージの星評価・ベストタイムは「良い方を保持」する設計だが、再挑戦時に前回より星が下がってもUI上に警告は出さない（黙って保持されるのみ）。
- 星3判定の基準（Undo3回以下）はハードコード（`score.js` の `STAR3_MAX_UNDO`）。ステージごとに変えたい場合は `puzzles.json` 側にフィールドを追加する拡張が考えられる。
- レベルアップの経験値カーブは200EXP固定の線形（`EXP_PER_LEVEL`）。今後のステージ数増加に応じて、非線形カーブや実績（Achievement）システムへの拡張が考えられる。
- 現状は12ステージ（5×5〜8×8の4サイズ×3段階）・チュートリアル3問。ステージを増やす場合は `data/stages.json` にエントリを追加し、対応する `puzzle` idを `data/puzzles.json`（`tools/build_puzzles.js`で生成）に用意すればよい。9×9以上へさらに拡張する場合は、後述の「ステージ拡張」セクションの疎密度・色付きマス数の下限調整が追加で必要になる可能性が高い。
- `generator.js`の難易度パラメータは乱数の当たり外れで実際の複雑度に大きなばらつきが出る（要求`difficulty`と実測`difficulty`が一致しない場合がある）。より狙い通りの難易度にしたい場合、生成後に実測`difficulty`を確認して条件を満たすまで再生成する、といった上位ロジックの追加が考えられる。
- `expert`難易度の生成は試行回数が増えやすく、Node.js上の実測で平均0.7秒・最大1.7秒程度かかることがある（メインスレッドで同期実行しているため、この間UIが一瞬固まる）。Web Workerへの切り出しや、生成中のローディング表示の追加が今後の改善候補。
- `stage.js`と`puzzleManager.js`はどちらも`data/puzzles.json`を読み込んでおり、役割が一部重複している（`stage.js`はステージ制フロー専用、`puzzleManager.js`は固定/生成/Dailyを統一的に扱う窓口として独立に追加した）。将来的に`stage.js`側を`puzzleManager.js`経由に統一するリファクタリングが考えられる。
- Daily Puzzleはクリアしてもステージのような星評価・EXP付与・進行状況の記録を行っていない（タイム・Undo・Hint回数の表示のみ）。「今日のクリア済みフラグ」「連続クリア日数（ストリーク）」などをprogress.jsに追加して記録する拡張が考えられる。
- 生成問題（Daily Puzzle含む）はHintボタンを押すと`answer`（生成時の正解盤面）をそのまま開示する。固定ステージと同じ仕組みだが、生成問題は「なぜその配置が正解か」の必然性が薄い（唯一解ではあるが、人間にとって自然な解き筋になっているとは限らない）。難易度に応じたヒントの出し方の工夫は今後の課題。

---

# 問題生成エンジン追加（このセクションは今回の変更点のまとめ）

## 変更ファイル一覧

**新規追加**:
- `src/seed.js` — 決定的な擬似乱数（mulberry32）、日付seed生成、配列シャッフル
- `src/difficulty.js` — solverの探索統計から難易度(easy/normal/hard/expert)を判定
- `src/puzzleManager.js` — 固定問題/生成問題/Daily Puzzleの統一ファサード

**全面書き換え**:
- `src/generator.js` — MVP版の単純retry方式から、「目標疎密度でのリトライ生成→追加の掘り出し」の2段階方式に変更（完成盤面から掘り出す数独方式はこのゲームのヒント形式では唯一解にならないことが判明したため）
- `src/solver.js` — 戻り値を`{count, solution}`から`{solutions, solution, steps, guessCount}`に拡張（`count`→`solutions`にリネーム、`steps`/`guessCount`を新設）

**部分修正**:
- `tools/build_puzzles.js` — 新しい`generatePuzzle(size, difficulty, seed)` APIに対応するよう更新（ステージごとにseedを固定し再現性を確保）
- `data/puzzles.json` — `tools/build_puzzles.js`の再実行により再生成（内容は変わるが形式・スキーマは変更なし）
- `src/main.js` — `PuzzleManager`の初期化、Daily Puzzle開始処理(`startDailyPuzzle`)・クリア処理(`_handleDailyClear`)を追加
- `src/ui.js` — STAGE SELECT画面のDaily Puzzleカード用のDOM参照・イベント・日付表示を追加
- `index.html` — Daily Puzzleカードのマークアップ・CSS、新規スクリプトタグ（`difficulty.js`/`seed.js`/`puzzleManager.js`）を追加

## 動作確認方法

1. ローカルサーバーを起動する:
   ```bash
   cd logic-color-game
   python3 -m http.server 8000
   ```
2. ブラウザで開き、TITLE→STAGE SELECTと進むと、TUTORIALカードの下に「DAILY PUZZLE」カード（青枠、今日の日付表示）が表示される。
3. DAILY PUZZLEカードをタップし、5×5の生成パズルをプレイしてクリアできること、「DAILY PUZZLE CLEAR!」画面が出ることを確認する。
4. 既存のTUTORIAL/ステージのプレイに影響が無いことを確認する（回帰確認）。
5. エンジン単体の動作は、プロジェクトルートでNode.jsを使って直接検証できる:
   ```bash
   node -e "
   require('./src/board.js');
   require('./src/solver.js');
   require('./src/difficulty.js');
   require('./src/seed.js');
   require('./src/generator.js');
   const { Generator, Solver } = globalThis.LogicColor;
   const p = Generator.generatePuzzle(5, 'normal', 'my-seed');
   console.log('difficulty:', p.difficulty);
   console.log('唯一解か:', Solver.solve(5, p.hints.row, p.hints.column, {limit:2}).solutions === 1);
   "
   ```
6. `data/puzzles.json` を作り直したい場合は `node tools/build_puzzles.js` を実行する（既存の6ステージが同じseedで再現される）。

## 今後改善点

- 生成のパフォーマンス: `expert`難易度は生成に最大1.7秒程度かかることがある。Web Workerでの非同期化や生成中のローディング表示を追加したい。
- 難易度の的中率: 要求した`difficulty`と実測`difficulty`が一致しない場合がある（特にnormal/hard/expertで顕著）。生成後に条件を満たすまで再試行する仕組みや、より精緻な複雑度スコアの設計が改善余地。
- Daily Puzzleの永続化: クリア済みフラグ・連続クリア日数（ストリーク）・過去のDaily Puzzleへの再挑戦機能などは未実装。
- `stage.js`と`puzzleManager.js`の役割重複: 将来的に固定問題の読み込みを`puzzleManager.js`に一本化するリファクタリングが考えられる。
- 生成問題向けのヒント演出: 現状は固定ステージと同じ「1マス開示」のみ。難易度が低い問題では複数マス開示、高い問題では開示なしにするなど、難易度に応じたヒント設計の余地がある。
- `size`のバリエーション: 現在は5×5（Daily Puzzleも固定）のみを想定して閾値較正している。6×6・7×7など他サイズへ対応する場合は`difficulty.js`の閾値を再較正する必要がある。

---

# ネオンAIテーマ UIリニューアル（このセクションは今回の変更点のまとめ）

パズル体験の向上を目的に、「NEURAL GRID / AI SYSTEM」をテーマにしたダーク×ネオン発光の近未来UIへ演出面をリニューアルした。**ゲームルール・問題生成エンジン・セーブ機能（`board.js` / `game.js` / `solver.js` / `generator.js` / `difficulty.js` / `seed.js` / `puzzleManager.js` / `stage.js` / `tutorial.js` / `progress.js` / `score.js`）は一切変更していない。** 演出・サウンド・HUD表示の追加はすべて `ui.js` からの呼び出しと新規モジュール（`theme.js` / `animation.js` / `sound.js`）に閉じており、既存のゲーム進行ロジックには影響しない。

## 変更ファイル一覧

**新規追加**:
- `src/theme.js` — NEURAL GRID背景演出専用モジュール。画面全体の裏に敷くcanvasに、緩やかに漂うノードと近接ノード同士を結ぶ線を描画する（AIネットワーク風）。`prefers-reduced-motion`環境では静止画のみ描画し、タブが非表示の間は`requestAnimationFrame`を止める。他モジュールへの依存なし。
- `src/animation.js` — セル/ヒントチップ/クリア画面へのCSSクラス付け外しだけを行う演出ヘルパー（`selectPulse` / `placeLight` / `pulseLine` / `chipBurst` / `syncFlashBoard` / `showLevelUp`）。DOM操作以外の副作用は持たない。
- `src/sound.js` — Web Audio APIでシンセ効果音を生成する`SoundManager`（`tap` / `place` / `complete` / `clear`）。音声ファイルは使用しない。ミュート状態は`logicColor.sound.enabled`という専用のLocalStorageキーで管理し、`progress.js`が管理するセーブデータ（`logicColor.save.v2`）とは別領域にしてセーブ機能の変更を避けている。

**部分修正**:
- `index.html` — ネオンAIテーマ用CSSを追加（`#neuralGridCanvas`の配置、スキャンライン風オーバーレイ、選択発光/配置ポップ/ライン発光/同期発光/チップバーストの各keyframes、現在カラー表示HUD、アイコンボタン、LEVEL UPオーバーレイ）。マークアップに `#colorStatus`（現在カラー表示）、`#titleSoundToggle` / `#gameSoundToggle`（サウンド切替ボタン）、`#levelUpOverlay`（LEVEL UP演出）を追加。`theme.js` / `animation.js` / `sound.js` の `<script>` タグを `game.js` の後・`ui.js` の前に追加。
- `src/ui.js` — 盤面タップ時の`Sound.tap()`/`Animation.selectPulse()`、ライト配置時の`Sound.place()`/`Animation.placeLight()`、行/列条件達成の新規検出時に`Sound.complete()`/`Animation.chipBurst()`/`Animation.pulseLine()`、クリア時の`Sound.clear()`/`Animation.syncFlashBoard()`を追加呼び出し。現在カラー表示を更新する`_renderColorStatus()`、サウンドトグルボタンをバインドする`_bindSoundToggle()`、LEVEL UP演出を出す`showLevelUp()`を新設。**既存の`renderAll`/`renderCells`/`updateCell`/`renderHintStatus`/`renderStatus`/`showClear`のシグネチャは変更していない**（呼び出し元のmain.jsへの影響を最小化するため、内部処理に演出呼び出しを追加しただけ）。
- `src/main.js` — `App.init()`で`Theme.init()`を呼び出す1行を追加。レベルアップ時の表示を`showToast()`から`ui.showLevelUp()`へ変更（クリア画面に重ねてLEVEL UP演出を出すため）。それ以外のゲーム進行ロジックは無変更。

## 追加した演出一覧

**セル**:
- 選択時発光: マスをタップした瞬間（配置結果が決まる前）に白いリング状の発光が広がる（`select-pulse`）
- ライト配置アニメーション: 色が配置された瞬間にポップする拡縮アニメーション（`place-pop`）と、既存の発光フラッシュ（`flash`）を併用
- 条件達成演出: 行/列の条件を新たに満たした瞬間、対象のヒントチップが強調バースト（`chip-burst`）し、対象マス列にライン発光が流れる（`line-clear`）

**クリア**:
- 全ライト同期発光: クリア時、盤面上の点灯中セル全てが同時に強く発光する（`sync-flash`）
- CLEAR演出: クリアカードがバウンドしながら出現する（`clearCardIn`）
- LEVEL UP表示: レベルアップ時、クリア画面の上に「LEVEL UP / Lv.N」をネオングラデーションで一時表示し、自動的にフェードアウトする

**サウンド**（Web Audio APIのシンセ音、音声ファイル不使用）:
- `tap`: マスタップの短いクリック音
- `place`: ライト配置時の音（色ごとに音程を変化）
- `complete`: 行/列の条件達成時のチャイム
- `clear`: ステージクリア時の上昇アルペジオ
- TITLE画面・GAME画面それぞれにサウンドON/OFFボタン（🔊/🔇）を設置。状態は`logicColor.sound.enabled`に保存され、次回起動時も維持される。

**UI改善**:
- タイマー表示・ステージ表示（既存要素をネオンHUDスタイルの土台の上でそのまま活用）
- 現在カラー表示: 盤面下部に、現在盤面上にあるBLUE/RED/GREEN各色のライト数をリアルタイム表示するHUD（`#colorStatus`）を追加
- NEURAL GRID背景: 画面全体の裏でノードが漂うネットワーク風アニメーションが常時再生される（`theme.js`）
- スキャンライン風オーバーレイで近未来ディスプレイ感を演出

## 確認方法

1. ローカルサーバーを起動する:
   ```bash
   cd logic-color-game
   python3 -m http.server 8000
   ```
   ChromeOS(Crostini)環境では`localhost`ではなくコンテナのIP（`hostname -I`で確認、例: `100.115.92.205`）経由でアクセスする。
2. ブラウザで `http://<コンテナのIP>:8000/` を開き、TITLE画面が**ダーク背景＋ネオン発光＋背景に漂うグリッド状のノードアニメーション**で表示されることを確認する。
3. TITLE画面右上の🔊ボタンをタップしてミュート切替が効くこと（アイコンが🔇に変わること）を確認する。リロードしても状態が維持されることも確認する。
4. STAGE SELECT→適当なステージ（またはTUTORIAL）を選び、GAME画面に入る。
5. マスをタップし、**タップ音＋選択時の発光リング**→**色が確定した瞬間のポップ演出＋配置音**が鳴ることを確認する（4色巡回: EMPTY→BLUE→RED→GREEN→EMPTY、既存仕様のまま変化がないことも合わせて確認）。
6. 盤面下部の**現在カラー表示**（BLUE/RED/GREENの数字）が配置に応じてリアルタイムに変化することを確認する。
7. いずれかの行/列の条件を満たし、**チップの強調バースト＋ライン発光＋完了チャイム**が鳴ることを確認する。
8. 全条件を満たしてクリアし、**盤面の全ライトが同期発光**した後に**CLEAR画面がバウンドして出現**し、**クリアファンファーレ**が鳴ることを確認する。EXP獲得でレベルアップした場合は**LEVEL UP演出**がクリア画面の上に重なって表示され、自動的に消えることを確認する。
9. 既存のUNDO/RESET/HINTボタン、ステージ解放・星評価・EXP/レベル・Daily Puzzle・永続化など**ゲームロジック・セーブ機能に回帰が無いこと**を一通り確認する。
10. `node --check` で `src/theme.js` / `src/animation.js` / `src/sound.js` / `src/ui.js` / `src/main.js` の構文エラーが無いことを確認済み（本セクション作成時点で実施済み）。

---

# 公開品質改善（このセクションは今回の変更点のまとめ）

目的は「スマートフォンブラウザで快適に遊べる状態にする」こと。PWA対応（ホーム画面追加・オフライン起動）、スマホ最適化（iPhone Safari / Android Chrome）、パフォーマンス改善、デバッグ機能、問題生成の品質チェックを追加した。**ゲームルール・問題生成アルゴリズム・セーブ機能の仕様は維持している**（`generator.js`の2段階生成方式そのものは変更せず、品質チェックを追加のみ／`board.js`・`game.js`・`progress.js`・`score.js`・`stage.js`・`tutorial.js`は無変更）。

## 変更内容

### 新規追加
- `manifest.json` — PWA用Webアプリマニフェスト（アイコン・standalone表示・テーマカラー）
- `service-worker.js` — 静的アセットをstale-while-revalidate方式でキャッシュし、オフラインでもTITLE画面まで起動できるようにするService Worker
- `src/debug.js` — `?debug=true`の時だけDOMにパネルを追加するデバッグモジュール（それ以外の時は何もしない）
- `assets/images/icon-192.png` / `icon-512.png` / `icon-maskable-512.png` / `apple-touch-icon.png` / `favicon.png` — ネオンテーマ（BLUE/RED/GREENの発光ドット）のPWAアイコン一式。Python(Pillow)のワンオフスクリプトで生成（リポジトリには成果物のPNGのみ含み、生成スクリプト自体はスクラッチ領域に置いたため未コミット）

### 部分修正
- `index.html` — PWA/スマホ最適化用の`<meta>`・`<link>`追加（manifest参照、theme-color、apple-mobile-web-app-*、apple-touch-icon等）、`touch-action: manipulation`とiOSのゴムバンドスクロール抑止（`overflow:hidden` + 画面ごとの内部スクロール）、小型端末・横向き短縦幅向けのレスポンシブメディアクエリ、`prefers-reduced-motion`時のCSSアニメーション無効化、答え表示オーバーレイ用CSS、デバッグパネル用CSS、`src/debug.js`の`<script>`タグ追加
- `src/main.js` — `App.init()`でService Worker登録処理を追加、タイマーループを軽量版`ui.updateTimer()`に変更（後述のパフォーマンス改善）、デバッグモードの答え表示トグルの配線を追加
- `src/ui.js` — `updateTimer()`（タイマー表示だけを更新する軽量メソッド）、`showAnswerOverlay()`/`hideAnswerOverlay()`（デバッグ用の答え表示）を追加。盤面のヒント列/行幅を固定`minmax()`から`clamp(32px, 14vw, 64px)`に変更し、画面サイズに応じて連続的にセルサイズが調整されるようにした（スマホ最適化）
- `src/theme.js` — NEURAL GRID背景アニメーションを60fpsから約30fpsへ間引き、CPU/GPU負荷を軽減（パフォーマンス改善）
- `src/generator.js` — `Generator.validatePuzzle(puzzle)`を新設し、生成した問題を最終出荷前にsolverで再検証する（解なしチェック・複数解チェック・answerとsolverの解の一致チェック・難易度ラベル妥当性チェック）。`generatePuzzle()`内部でも自己検証として呼び出し、失敗時は例外を投げる。戻り値に`seed`フィールドを追加（デバッグ表示用）
- `src/puzzleManager.js` — ランタイムpuzzleオブジェクトに`seed`フィールドを追加（デバッグパネル用）
- `tools/build_puzzles.js` — 各ステージ生成後に`Generator.validatePuzzle()`で品質ゲートを実行し、1問でも失敗があれば`data/puzzles.json`を書き込まずに`exit(1)`する。出力にも`seed`フィールドを追加
- `data/puzzles.json` — 上記スクリプトの再実行により再生成（seedは全て既存のまま固定のため、**盤面内容(rowHints/columnHints/answer)は完全に同一**。差分は追加された`seed`フィールドのみ。既存6ステージのプレイ内容に変更なし）

## PWA対応

- `manifest.json`をhead内で参照し、Android Chromeでは「ホーム画面に追加」バナー、iOS Safariでは共有メニューからの「ホーム画面に追加」でアイコン付きのアプリとして起動できる（`display: standalone`のためアドレスバー無し）
- `service-worker.js`が初回アクセス時にHTML/CSS(インライン)/全`src/*.js`/`data/*.json`/アイコンをキャッシュし、2回目以降はオフラインでもTITLE画面から遊べる。オンライン時はキャッシュを即座に返しつつバックグラウンドで最新版を取得する（stale-while-revalidate）ため、コード更新後は**次の起動時**から反映される
- Service Workerは`navigator.serviceWorker`が使えない環境や`file://`直開き時は登録処理自体をスキップする（エラーにはならない）

## スマホ最適化

- **iPhone Safari**: `apple-mobile-web-app-capable`/`apple-touch-icon`/`viewport-fit=cover`+safe-area対応、ゴムバンドスクロールの抑止
- **Android Chrome**: `manifest.json`によるインストールバナー対応、`theme-color`でステータスバー色を統一
- **タッチ操作**: `touch-action: manipulation`でダブルタップズームの300ms遅延を排除、`-webkit-touch-callout: none`で長押しメニューを抑止、`user-select: none`は既存のまま維持
- **セルサイズ**: 盤面のヒント列/行幅を`clamp(32px, 14vw, 64px)`にし、小型スマホでもマス側のタップ領域が狭くなりすぎないようにした
- **レスポンシブUI**: 幅380px以下・高さ480px以下×横向きのメディアクエリを追加し、狭い画面では余白/ボタンサイズを詰める、または盤面表示を優先してステータス表示を圧縮する

## パフォーマンス

- **不要なDOM更新削減**: 1秒ごとのタイマーループが従来`renderStatus()`（MOVES・TIME・現在カラー表示の3箇所を毎秒書き換え）を呼んでいたが、実際に変化するのはTIMEだけなので`updateTimer()`という軽量メソッドに差し替えた。操作時（タップ/Undo/Reset/Hint）は従来通り`renderStatus()`でMOVES・現在カラー表示も更新される
- **アニメーション負荷軽減**: `theme.js`のNEURAL GRID背景アニメーションを60fpsから約30fpsに間引き。`prefers-reduced-motion`環境では背景canvasのアニメーション（既存対応）に加え、セル/クリア演出のCSSアニメーションも無効化するようにした

## デバッグ機能

URLに`?debug=true`を付けてアクセスした時だけ、画面左下にデバッグパネルが表示される（付けない場合はDOMに一切追加されず、通常プレイには影響しない）。

- **SEED**: 現在の問題の生成seed（固定ステージ/Daily Puzzle/生成問題いずれも表示）
- **DIFF**: 実測された難易度ラベル（easy/normal/hard/expert）
- **SOLVER**: solverの探索統計（`solutions`/`steps`/`guessCount`/`hintCount`）
- **SHOW ANSWERボタン**: 盤面上の各マスに正解の色を点線の枠で重ねて表示するトグル（盤面のセーブデータ・実際の色配置そのものは変更しない、あくまで見た目のオーバーレイ）。ステージ切り替え時は自動でOFFに戻る

## 問題品質

`generator.js`の2段階生成方式（目標疎密度でのリトライ生成→掘り出し）自体は変更せず、生成結果を最終出荷前にもう一段検証する`Generator.validatePuzzle(puzzle)`を追加した。

- **解なしチェック**: solverで`solutions >= 1`であることを確認
- **複数解チェック**: solverで`solutions === 1`（唯一解）であることを確認
- **answer整合性チェック**: solverが実際に導いた解と、puzzleが持つ`answer`が一致することを確認（掘り出し処理のバグ等で食い違いが起きないことの保証）
- **難易度チェック**: `difficulty`が`easy`/`normal`/`hard`/`expert`のいずれかであることを確認

`generatePuzzle()`は生成の最後に自己検証としてこれを呼び、失敗時は例外を投げる（本来は起こらない想定の防御的チェック）。`tools/build_puzzles.js`でも全ステージ生成後に同じ検証を行い、1つでも失敗があれば`data/puzzles.json`を書き込まずに終了コード1で終了する「公開前ゲート」として機能する。

## 変更ファイル一覧

**新規追加**: `manifest.json` / `service-worker.js` / `src/debug.js` / `assets/images/icon-192.png` / `assets/images/icon-512.png` / `assets/images/icon-maskable-512.png` / `assets/images/apple-touch-icon.png` / `assets/images/favicon.png`

**部分修正**: `index.html` / `src/main.js` / `src/ui.js` / `src/theme.js` / `src/generator.js` / `src/puzzleManager.js` / `tools/build_puzzles.js` / `data/puzzles.json`（内容は既存のまま、`seed`フィールドのみ追加）

**無変更（ゲームロジック・セーブ機能）**: `src/board.js` / `src/game.js` / `src/solver.js` / `src/difficulty.js` / `src/seed.js` / `src/score.js` / `src/progress.js` / `src/stage.js` / `src/tutorial.js` / `src/animation.js` / `src/sound.js`

## 確認手順

1. ローカルサーバーを起動する:
   ```bash
   cd logic-color-game
   python3 -m http.server 8000
   ```
   ChromeOS(Crostini)環境では`localhost`ではなくコンテナのIP（`hostname -I`で確認）経由でアクセスする。
2. **マニフェスト/アイコン確認**: ブラウザの開発者ツール（Chrome DevTools）の Application → Manifest で `manifest.json` が読み込まれ、アイコン画像が正しく表示されることを確認する。
3. **ホーム画面追加確認**:
   - Android Chrome: メニューから「ホーム画面に追加」または「アプリをインストール」を実行し、ホーム画面のアイコンから起動してアドレスバー無し(standalone)で開くことを確認する。
   - iPhone Safari: 共有ボタン→「ホーム画面に追加」を実行し、同様に確認する（`apple-touch-icon`が使われていること）。
4. **オフライン起動確認**: 一度通常に開いてService Workerが登録された状態で、DevTools の Network タブを「Offline」にする（または機内モード）→ページをリロードし、TITLE画面が表示されて操作できることを確認する。
5. **タッチ操作確認**: スマホ実機でボタン連打時にダブルタップズームが発生しないこと、盤面を上下に払ってもページ全体がバウンドしないこと、ボタン長押しでコンテキストメニューが出ないことを確認する。
6. **レスポンシブ確認**: DevToolsのデバイスツールバーでiPhone SE等の小型端末・横向き表示に切り替え、盤面・ボタンが画面内に収まる、または画面内で正しくスクロールできることを確認する。
7. **パフォーマンス確認**: GAME画面を開いたまま数十秒放置し、DevTools Performanceタブ等でMOVES/現在カラー表示が毎秒再描画されていない（TIMEのみ更新されている）ことを確認する。背景のNEURAL GRIDアニメーションがカクつかず滑らかであることも確認する。
8. **デバッグ機能確認**: `http://<IP>:8000/index.html?debug=true` でアクセスし、画面左下にSEED/DIFF/SOLVER情報とSHOW ANSWERボタンが表示されること、ボタンを押すと盤面に正解の枠が重なって表示されることを確認する。`?debug=true`を付けない通常URLではパネルが一切表示されないことも確認する。
9. **問題品質チェック確認**: `node tools/build_puzzles.js` を実行し、全ステージが `品質チェック: 全6問PASS` と表示されること、失敗時は非ゼロの終了コードで終わることを確認する（意図的に確認する場合はsolverやgeneratorを一時的に壊してFAILすることを見る、等）。
10. 既存のゲームルール・ステージ解放・星評価・EXP/レベル・Daily Puzzle・永続化・ネオン演出/サウンドなど、**これまでの機能に回帰が無いこと**を一通りプレイして確認する。

## 公開前チェックリスト

- [ ] `manifest.json`がDevToolsのApplicationパネルでエラー無く読み込まれる
- [ ] Service Workerが登録され、オフライン（機内モード）でもTITLE画面まで起動する
- [ ] Android Chromeでホーム画面に追加でき、standalone起動する
- [ ] iPhone Safariでホーム画面に追加でき、アイコン・タイトルが正しく表示される
- [ ] スマホ実機（iPhone Safari / Android Chrome）でタップ操作・アニメーション・レイアウト崩れが無い
- [ ] 通常URL（`?debug=true`無し）でデバッグパネルが一切表示されない
- [ ] `node tools/build_puzzles.js` が全ステージPASSする（品質ゲートが機能している）
- [ ] 既存のゲームルール・セーブデータ形式（`logicColor.save.v2`）に変更が無い
- [ ] コード更新後にService Workerのキャッシュが原因で古い内容が表示され続けないか確認する（反映されない場合はDevToolsでService Workerをunregisterするか、`service-worker.js`の`CACHE_VERSION`を上げる）
- [ ] `node --check` で全`src/*.js`・`service-worker.js`・`tools/build_puzzles.js`の構文エラーが無い（本セクション作成時点で確認済み）

---

# ステージ拡張: 6×6〜8×8サイズ増による「やり込み要素」追加（このセクションは今回の変更点のまとめ）

「ステージ数が足りない・やり込み感が無い」というフィードバックを受け、既存の5×5ステージ6つ（BEGINNER〜ADVANCED、内容は完全に維持）はそのままに、**盤面サイズそのものが段階的に大きくなる**新ステージを6つ追加し、計12ステージ構成にした。

| Stage | 名前 | サイズ | 表示ラベル | 備考 |
| --- | --- | --- | --- | --- |
| 1-2 | BEGINNER 01/02 | 5×5 | easy | 既存・無変更 |
| 3-4 | INTERMEDIATE 01/02 | 5×5 | normal | 既存・無変更 |
| 5-6 | ADVANCED 01/02 | 5×5 | hard | 既存・無変更 |
| 7-8 | EXPERT 01/02 | **6×6** | `6×6` | 新規 |
| 9-10 | MASTER 01/02 | **7×7** | `7×7` | 新規 |
| 11-12 | GRANDMASTER 01/02 | **8×8** | `8×8` | 新規 |

## なぜ盤面サイズを難易度の主軸にしたか

`difficulty.js`の複雑度スコアは`guessCount`/`steps`をセル数(`size²`)で正規化しているため、同じ絶対的な手掛かりの曖昧さでも盤面が大きいほど密度が薄まり**スコア上は「easy」寄りに出る**（実測: 8×8で疎密度0.76でもcomputed difficultyは`easy`）。一方でプレイヤー体験としては、盤面が大きいほど同時に把握すべき行/列の数が増え、明らかに手応えが増す。そのため今回追加したステージでは、`generatedDifficulty`（solver実測値）ではなく**盤面サイズそのもの**をSTAGE SELECT上の難易度ラベル（`stages.json`の`difficulty`フィールドに`"6×6"`のように格納）として表示するようにした。

## 大盤面で発覚した2つの技術的課題と対処

### 1. 生成アルゴリズムが6×6以上で実用的な時間に収まらない

既存の「ランダム完成盤面を作ってsolverで唯一解になるまでリトライ」する生成方式を5×5と同じ疎密度（emptyRatio）のまま6×6以上に適用したところ、Node.js上の実測で**6×6の疎密度0.5は3000回試行しても唯一解が見つからず**、7×7・8×8はさらに悪化することが分かった（唯一解に到達する確率が疎密度低下とともに急落するため、solverを高速化しても解決しない組み合わせ論的な壁）。対処として2点変更した:

- **`solver.js`に列方向の先読み枝刈り(forward checking)を追加**: 従来は列の充足チェックを盤面が全マス埋まった時点でしか行っておらず、大盤面で無駄な探索が膨らむ原因になっていた。マスを1つ置くたびに「残り行数でその列の目標色数に到達可能か」を即座に検証し、不可能なら即座に打ち切るようにした。既存5×5パズルの`rowHints`/`columnHints`/`answer`/難易度ラベルは**完全に同一のまま**（`steps`/`guessCount`という探索統計値のみ減少）であることをリグレッションテストで確認済み——このチェックは探索範囲を狭めるだけで、解の探索結果自体（唯一解かどうか、どの解が見つかるか）は変えないため安全な最適化。
- **`generator.js`にサイズ別の疎密度テーブル`DIFFICULTY_EMPTY_RATIO_BY_SIZE`を追加**: 5×5は既存の較正値のまま、6×6/7×7/8×8はNode.js上の実測（`ratio_probe`的な手動計測）で「数百ms〜数秒で唯一解に到達できる」ことを確認した疎密度を採用した（6×6: easy 0.65/normal 0.60/hard 0.53、7×7: easy 0.75/normal 0.68、8×8: easy 0.82/normal 0.76）。これはステージ生成（`tools/build_puzzles.js`によるビルド時の一度きりの処理）専用のテーブルで、実行時生成（Daily Puzzle）は従来通り5×5のみを使うため影響なし。

### 2. 疎な大盤面で「ヒントがほぼ消えた自明な問題」が生成されるバグを発見・修正

上記の疎密度調整（高疎密度＝色付きマスが少ない）と、既存の`digHoles`（掘り出し）処理の組み合わせで、**色付きマスが数個しか無い盤面から、掘り出しのたびにヒント自体を再計算し直す既存の設計により、最終的に色付きマスを全て掘り尽くして全ヒントが0の自明な問題が生成される**というバグを発見した（7×7・疎密度0.75の実測で、盤面が丸ごと空のパズルが生成されることを確認）。このバグはNode.js上で`Game`クラスに解答を流し込んでクリア可能か検証するリグレッションテストを新たに書いて発見したもので、`Generator.validatePuzzle()`の既存4チェック（解なし/複数解/answer不一致/難易度不正）はいずれも検出できなかった（自明な全空パズルは技術的には「唯一解」であるため）。

対処として3箇所を修正した:
- `generator.js`の`findUniqueBoard()`に`minColoredCells`引数を追加し、色付きマスが少なすぎる候補盤面は唯一解判定の前に足切りしてリトライを続けるようにした
- `generator.js`の`digHoles()`にも同じ下限を追加し、掘りすぎて自明な問題になる前に打ち切るようにした
- `Generator.validatePuzzle()`に5つ目のチェック`notTrivial`（表示ヒント数が盤面の一辺未満なら不合格）を追加し、万が一この下限をすり抜けても出荷前ゲートで検出できるようにした

下限値は`Math.max(3, Math.ceil(size * 0.6))`という緩めの基準にしている（`size`と同数を要求すると8×8で唯一解と両立する候補が少なすぎて生成が終わらなかったため、実測しながら調整した値）。既存5×5ステージはこの下限に一度も抵触しないことを確認済み（内容は完全に不変）。

## 変更ファイル一覧

**部分修正**: `src/solver.js`（列方向の先読み枝刈りを追加）/ `src/generator.js`（サイズ別疎密度テーブル、`minColoredCells`下限、`validatePuzzle`の`notTrivial`チェック追加）/ `tools/build_puzzles.js`（Stage 7〜12の生成設定を追加）/ `data/stages.json`（Stage 7〜12を追加）/ `data/puzzles.json`（再生成。既存Stage 1〜6の内容は完全に同一、Stage 7〜12が新規追加）

**無変更**: `src/board.js` / `src/game.js` / `src/difficulty.js` / `src/seed.js` / `src/puzzleManager.js` / `src/stage.js`（ステージ解放ロジックは配列順の一般的な処理のためステージ数が増えても無変更で動作） / `src/progress.js` / `src/score.js` / `src/tutorial.js` / `data/tutorials.json`

## 確認手順

1. `node tools/build_puzzles.js` を実行し、`品質チェック: 全12問PASS` と表示されることを確認する（所要時間は実測で約25秒。6×6/7×7/8×8の生成は疎密度によって数百ms〜数秒かかることがあるが、ビルド時の一度きりの処理のため実行時パフォーマンスには影響しない）。
2. ローカルサーバーを起動し、STAGE SELECT画面でBEGINNERからGRANDMASTERまで**12枚のステージカードが表示され、2列グリッドが画面内でスクロールできる**ことを確認する。
3. Stage 1〜6（5×5）が**これまでと全く同じ内容・同じ挙動**でプレイできることを確認する（回帰確認）。
4. チュートリアル完了後、Stage 1から順にクリアして**Stage 7（6×6）が自動解放される**ことを確認し、実際に6×6盤面をプレイしてクリアできることを確認する。同様にStage 8→9→10→11→12と進めて7×7・8×8も正しく解放・プレイ・クリアできることを確認する。
5. 8×8盤面で、小さめの画面幅でもマスがタップ可能なサイズで表示され、ヒント数字が正しく折り返し表示されることを確認する（レイアウト崩れが無いこと）。
6. 以下のNode.jsスクリプトで、`data/stages.json`の全12ステージが`data/puzzles.json`と対応し、`answer`を流し込むことで実際にGame経由でクリア可能であることを一括検証できる（本セクション作成時点で全12ステージPASS確認済み）:
   ```bash
   node -e "
   require('./src/board.js'); require('./src/game.js');
   const { Game } = globalThis.LogicColor;
   const fs = require('fs');
   const stages = JSON.parse(fs.readFileSync('data/stages.json')).stages;
   const puzzles = new Map(JSON.parse(fs.readFileSync('data/puzzles.json')).puzzles.map(p=>[p.id,p]));
   stages.forEach(stage => {
     const puzzle = puzzles.get(stage.puzzle);
     const game = new Game(puzzle);
     for (let r=0;r<puzzle.size;r++) for (let c=0;c<puzzle.size;c++) {
       let cur = game.board.get(r,c);
       while (cur !== puzzle.answer[r][c]) cur = game.tapCell(r,c);
     }
     console.log(stage.id, stage.name, 'clearable:', game.cleared);
   });
   "
   ```

## 今後の拡張余地

- 9×9以上へさらに拡張する場合、`DIFFICULTY_EMPTY_RATIO_BY_SIZE`に新しいサイズのエントリを追加する必要がある。疎密度は本セクションと同様に実測しながら「唯一解に数秒〜十数秒で到達できる値」を探る必要がある（機械的に既存の傾き外挿では不十分な可能性が高い）。
- 現状GRANDMASTER(8×8)が最高難度だが、6×6/7×7/8×8それぞれ2ステージのみ。各サイズでさらにステージ数を増やす場合は`tools/build_puzzles.js`にseedを追加するだけでよい（`minColoredCells`と疎密度テーブルの基盤は既に対応済み）。
- `difficulty.js`の複雑度スコアはサイズ正規化の性質上、大盤面ではほぼ`easy`〜`normal`にしか分類されない。大盤面向けに「サイズも加味した」難易度スコアへ拡張する余地がある（現状はSTAGE SELECTの表示をサイズラベルに置き換えることで回避している）。

---

# 新ゲームモード「ENDLESS RESEARCH」追加（このセクションは今回の変更点のまとめ）

生成された問題を連続で解き、ライフが尽きるまでどこまで深く（Depth）進めるかに挑戦するエンドレスモードを追加した。**既存のステージ制・問題生成エンジン・Solver・LocalStorage（`logicColor.save.v2`）・UIテーマ・サウンドは一切変更していない。** ENDLESS RESEARCHは`src/endless/`配下の新規モジュール群として実装し、既存コードへの変更は「新しい画面をシステムに登録する」「GAME画面の操作を現在のモードに応じて委譲する」という最小限の接続点のみに留めている。

## 追加したファイル

**新規追加**（`src/endless/`）:
- `map.js` — Depthから盤面サイズ・疎密度を決定する（`EndlessMap.getDifficultyForDepth(depth)`）。Depth1-5:5×5 / 6-10:7×7 / 11+:7×7（疎密度を上げてより密に）。将来のMap分岐・Boss・Eventノード拡張を見据え、ノード生成をここに集約している
- `endlessSave.js` — ベスト記録（`endlessBestDepth`/`endlessBestScore`/`totalRuns`）を独自のLocalStorageキー`logicColor.endless.v1`に保存する（`progress.js`のセーブ形式とは完全に別領域）
- `endlessGame.js` — 「今挑戦中の1問」を管理するコントローラ（`EndlessRoundController`）。既存の`Game`クラス・`PuzzleManager`・`UI`の盤面描画メソッドをそのまま呼び出すだけで、それら既存モジュールには一切手を加えていない。問題ごとの制限時間管理、タップ/UNDO/RESET/HINT操作の中継、クリア/タイムアップの通知を担当する
- `endlessResult.js` — RESULT画面（DEPTH/SCORE/PERFECT COUNT/BEST DEPTH表示、RETRY・TITLEボタン）のDOM描画とイベント配線のみを担当する
- `endless.js` — ENDLESS RESEARCH全体を統括する`EndlessMode`。画面遷移・RUN状態（depth/score/life/combo/perfectCount）・スコア計算を持ち、上記4ファイルとmain.jsのAppインスタンスを束ねる

**部分修正**:
- `index.html` — TITLE画面に`ENDLESS RESEARCH`ボタン、新規画面`#screen-modeselect`（MODE SELECT）・`#screen-endlessresult`（RESULT）、GAME画面内の`#endlessHud`（Depth/Life/Score/Combo/残り時間、endlessモード中のみ表示）を追加。ネオンテーマに合わせたCSSを追加し、`src/endless/*.js`の`<script>`タグを追加
- `src/ui.js` — `showScreen()`が新規2画面も切り替え対象に含むよう、画面登録に2行追加（既存の`title`/`stageSelect`/`game`の切り替えは無変更）。`showScreen()`自体にnullガードを追加（防御的な安全化のみ）
- `src/main.js` — `App`に`this.endless = new EndlessMode(...)`を追加。GAME画面の盤面操作（タップ/UNDO/RESET/HINT/BACK）は`this.mode === 'endless'`の時だけ`this.endless`へ委譲するよう分岐を追加（既存のtutorial/stage/dailyの処理パスは完全に無変更）。タイマーループにendlessモード時のガードを追加（ENDLESS RESEARCHは独自のカウントダウンタイマーを持つため、既存のカウントアップタイマーとの二重更新を防ぐ）
- `src/generator.js` — `generatePuzzle()`の内部処理を`generatePuzzleWithRatio(size, emptyRatio, seed, label)`として切り出し、疎密度を直接指定できるようにした（既存の`generatePuzzle()`の外部的な挙動・戻り値は完全に無変更、内部委譲のみ）
- `src/puzzleManager.js` — 上記に対応する`getGeneratedPuzzleWithRatio()`を追加（既存の`getGeneratedPuzzle()`/`getDailyPuzzle()`は無変更）

## なぜ疎密度を直接指定できるAPIを追加したか（重要な技術的判断）

ENDLESS RESEARCHの問題生成は、ステージ生成（`tools/build_puzzles.js`）と違い**プレイ中にブラウザのメインスレッドで同期的に実行される**。既存の難易度名ベースの生成（`generatePuzzle(size, 'hard', seed)`）は「唯一解への到達」を最優先に較正されており、7×7 normal/hard相当の疎密度ではNode.js上の実測で生成に数秒〜十数秒（一部試行で10秒超）かかることが判明した。プレイ中にこの時間UIが固まるのは致命的なため、ENDLESS RESEARCH専用に「ほぼ確実に1秒未満で完了する」ことを実測確認済みの疎密度（`map.js`の`DEPTH_TIERS`）を使う`generatePuzzleWithRatio()`を新設した。60回の連続生成テストで最大2.8秒・平均261msという結果を得ている（詳細は`map.js`のコメント参照）。

また、疎密度による品質検証（`Generator.validatePuzzle`の`notTrivial`チェック）がごく稀に失敗し例外を投げるケースも実測で確認されたため、`endlessGame.js`側でseedを変えて最大5回まで自動リトライする仕組みを追加し、RUN中に例外でクラッシュしないようにしている。

## ゲームフロー

```
TITLE
  │ 「ENDLESS RESEARCH」ボタン
  ▼
MODE SELECT（ベストDepth・ベストスコア・累計RUN数を表示）
  │ 「START RUN」ボタン
  ▼
ENDLESS RESEARCH（GAME画面を再利用、上部にENDLESS HUDを表示）
  │
  ├─ パズルをクリア → CLEAR報酬を加算 → 0.9秒後に次のDepthへ ─┐
  │                                                          │
  ├─ 制限時間切れ（ミス） → ライフ-1・コンボリセット           │
  │     ├─ ライフが残っていれば → 0.9秒後に次のDepthへ ───────┤
  │     └─ ライフが0になったら ─────────────────┐            │
  │                                             ▼            │
  │                                          RESULT          │
  │                                    （DEPTH/SCORE/         │
  │                                     PERFECT COUNT/        │
  │                                     BEST DEPTH表示、       │
  │                                     ベスト記録を保存）      │
  │                                       │         │        │
  │                          「RETRY」┘         └「TITLE」    │
  │                    （新しいRUNを開始）    （TITLEへ戻る）   │
  │                                                          │
  └─「‹ BACK」→ RUNを記録せず中断してMODE SELECTへ ───────────┘
```

**Depth進行と難易度**（`map.js`の`DEPTH_TIERS`）:

| Depth | 盤面サイズ | 表示ラベル | 生成疎密度 |
| --- | --- | --- | --- |
| 1〜5 | 5×5 | easy | 0.60 |
| 6〜10 | 7×7 | normal | 0.78 |
| 11以降 | 7×7 | hard | 0.75 |

**スコア計算**（`endless.js`の`_handleRoundClear`）:
- CLEAR: +100（固定）
- PERFECT（そのパズルでHINTを一度も使わなかった場合）: +100
- SPEED BONUS: 目安クリア時間（`parSeconds`）より速くクリアした場合、`(parSeconds - 実測クリア時間) × 5`
- コンボボーナス: 連続クリア数 × 20（コンボはミスでリセットされる。3連続クリア中の3問目なら+60）

**制限時間とミスの仕様**: 各問題には制限時間（目安クリア時間`parSeconds`の1.5倍）を設け、時間内にクリアできなければミス扱いとしてライフを1失う。制限時間内であれば何度でもUNDO/RESET/HINTを使ってよい（ただしHINTを使うとその問題はPERFECT対象外になる）。ミスになったパズルはやり直しにはならず、強制的に次のDepthへ進む。

## テスト

以下をjsdom + 実際のHTML/JSを用いた統合テスト（Node.js上で本セクション作成時に実施、全項目PASS確認済み）で検証した:

- [x] TITLE→MODE SELECT→START RUNでENDLESS RESEARCHを開始できる
- [x] 問題が連続生成される（Depth1〜複数のDepthにわたり生成・クリアを確認）
- [x] クリアするたびにDepthが増える（0.9秒の演出待ちを含めて確認）
- [x] 制限時間切れでライフが減り、コンボがリセットされる
- [x] ライフが0になるとRUNが終了し、RESULT画面が正しい値（DEPTH/SCORE）を表示する
- [x] ベスト記録（`endlessBestDepth`/`endlessBestScore`/`totalRuns`）がLocalStorageへ保存され、次回のMODE SELECT表示に反映される
- [x] RETRYで状態（depth/score/life/combo）が正しくリセットされ再挑戦できる
- [x] GAME画面の「‹ BACK」でRUNを中断し、記録せずMODE SELECTへ戻れる
- [x] 通常モード（STAGE SELECTの12ステージ）への遷移・表示に回帰が無いことを確認（既存機能への影響が無いことの確認）

`node --check`で`src/endless/*.js`および変更した既存ファイルの構文エラーが無いことも確認済み。

## 今後追加予定

- **Map分岐**: 現在の`map.js`はDepthごとに単一のPuzzleノードを直線的に生成するだけだが、将来的にはノードを分岐させ、プレイヤーが「安全なルート」と「報酬の大きいリスクルート」等を選択できるようにする拡張余地がある（`getNode(depth)`の戻り値に選択肢を持たせる形を想定）。
- ~~**Upgrade（強化要素）**~~: RESEARCH LAB＋アップグレードシステムとして実装済み（下記の専用セクション参照）。
- ~~**Boss**~~: `boss.js`として実装済み（Depth10/25/50、下記の専用セクション参照）。
- ~~**Event**~~: `events.js`/`eventManager.js`として実装済み（下記の専用セクション参照）。
- 上記はいずれも`map.js`の`getNode(depth)`が返すノードの`type`を分岐点として実装できるよう設計してある（`endlessGame.js`側で`type`に応じた処理を追加する形になる想定）。
- 疎密度（`map.js`のDEPTH_TIERS）は現状Depth11以降ずっと同じ7×7・疎密度0.75で頭打ちになる。Depthに応じてさらに段階的に疎密度を下げる（＝難しくする）、または8×8以降のサイズへ拡張するには、ステージ拡張時と同様にランタイム生成時間の実測較正が必要になる。

---

# RESEARCH LAB / アップグレードシステム追加（このセクションは今回の変更点のまとめ）

ENDLESS RESEARCHに、毎回異なる攻略になる**ローグライト要素**としてRESEARCH LAB（3択のアップグレード選択画面）を追加した。**既存の問題生成・Endlessモードの基本進行（Depth/制限時間/ミス判定）・Score計算式・Life・LocalStorage（`logicColor.save.v2`/`logicColor.endless.v1`）は一切変更していない。** アップグレードはRUN中のみ有効なメモリ上の状態で、ベスト記録には一切影響しない。

## 追加したファイル

**新規追加**（`src/endless/`）:
- `upgrades.js` — 10種のアップグレード定義（`id`/`name`/`category`/`description`/`effect`）を持つ純粋なデータファイル。効果適用ロジックは持たない
- `upgradeManager.js` — 現在のRUNで取得したアップグレードの所持数を管理する`UpgradeManager`。重複所持（スタック）を許可し、同じ`effect.type`を持つアップグレードのvalueを所持数分合算する汎用的な`getEffectTotal(type)`/`hasEffectType(type)`を提供する。RUN開始時に`reset()`され、LocalStorageには一切保存しない
- `researchLab.js` — RESEARCH LAB画面（3択カードの描画・選択イベント）を担当する`ResearchLab`。`shouldTrigger(depth)`でDepth 3ごとの出現判定を持つ

**部分修正**:
- `index.html` — TITLE直下の`#screen-researchlab`（RESEARCH LAB画面）、GAME画面内の`#endlessUpgradeList`（取得済みアップグレードのバッジ表示）を追加。カテゴリ別（survival=赤/score=金/logic=青）のネオン配色CSSを追加
- `src/ui.js` — `showScreen()`が新画面も切り替え対象に含むよう、画面登録に1行追加（既存画面の切り替えは無変更）
- `src/endless/endlessGame.js` — コンストラクタが`upgradeManager`を受け取るようになり、制限時間（Deep Scan）・HINT開示数（Analyzer）・UNDOによる経過時間割引（Undo Core）・残り時間低下時の自動HINT（AI Prediction）の各効果をここで適用する。既存の生成・タイマー・タップ中継ロジック自体は無変更
- `src/endless/endless.js` — `UpgradeManager`/`ResearchLab`を保持し、Depth 3ごとにLABを挟むフロー（`_afterRoundEnd()`）、アップグレード選択時の即時効果適用（Repair System）、スコア計算式へのOverclock/Perfect Analysis/Combo Coreの反映、ミス時のBackup Memory（コンボ維持）・Recovery Protocol（定期ライフ回復）を追加

## Research Lab

**出現**: Depth 3ごと（Depth3, 6, 9, 12…をクリアまたはミスした直後）。クリア/ミスの演出待ち（0.9秒）の後、次のPuzzleへ進む代わりにRESEARCH LAB画面を表示する。

**画面**: アップグレード全10種からランダムに重複無く3つを選び、カード形式で提示する（カテゴリ・名前・説明・所持中の場合は所持数を表示）。1つを選択すると即座に取得され、GAME画面に戻って次のPuzzleへ進む（スキップは無し、必ず1つ選択する）。

## アップグレードのデータ形式

```js
{ id, name, category, description, effect: { type, value } }
```
`effect.type`は`upgradeManager.js`が解釈する汎用的な識別子で、同じtypeを複数所持すると`value`が所持数分だけ合算される（重複所持でスタックする設計）。

## 初期アップグレード10個

| カテゴリ | 名前 | 効果 |
| --- | --- | --- |
| Survival | Repair System | 最大ライフ+1（取得時に現在ライフも+1回復） |
| Survival | Backup Memory | ミス（タイムアップ）してもコンボがリセットされない |
| Survival | Recovery Protocol | 一定クリアごとにライフ+1（所持数が多いほど間隔短縮、基準3クリア） |
| Score | Overclock | 獲得スコア+20%（乗算、スタックで加算的に増加） |
| Score | Perfect Analysis | PERFECTボーナス+50 |
| Score | Combo Core | コンボボーナス単価+15（20→35） |
| Logic | Analyzer | HINT使用時、追加で1マス多く同時に開示（計2マス） |
| Logic | Deep Scan | 制限時間+20% |
| Logic | Undo Core | UNDO1回ごとに経過時間から2秒割引（Speed Bonus判定に有利） |
| Logic | AI Prediction | 残り時間が制限時間の30%を切ると自動でHINTが1回発動する |

## Upgrade管理（取得・効果適用・重複管理）

- **取得**: `researchLab.js`のカード選択→`endless.js`の`_handleUpgradeSelected(def)`→`upgradeManager.acquire(id)`。`maxLifeBonus`効果（Repair System）のみ、取得時に最大ライフ・現在ライフへ即座に反映する（他の効果は次のPuzzle以降に自然に反映される）
- **効果適用**: スコア計算（`endless.js`の`_handleRoundClear`）・ライフ回復判定（`_tickLifeRegen`）・コンボ維持判定（`_handleRoundTimeout`）は`endless.js`側で、制限時間・HINT開示数・UNDOの経過時間割引・自動HINTは`endlessGame.js`側で、いずれも`upgradeManager.getEffectTotal(type)` / `hasEffectType(type)`を通じて参照する
- **重複管理**: 同じアップグレードを複数回取得できる（スタック）。3択の候補自体は1回のLAB表示内で重複しない（`researchLab.js`の`_pickChoices`がシャッフルして先頭N件を取る）が、複数回のLAB訪問で同じアップグレードが再度候補に上がることは許容し、選択すると所持数が増えて効果が積み重なる

## 表示追加

GAME画面のENDLESS HUD直下に、現在取得済みのアップグレードをバッジ形式で表示する（`#endlessUpgradeList`、カテゴリ別に配色。複数所持時は「Overclock x2」のように所持数を表示）。何も所持していない間は非表示。

## テスト

jsdom + 実際のHTML/JSを用いた統合テスト（Node.js上で本セクション作成時に実施、全項目PASS確認済み）で以下を検証した:

- [x] Labが表示される（Depth3クリア後に`#screen-researchlab`がアクティブになる、Depth1・2では出現しないことも確認）
- [x] 3択選択できる（3枚のカードが表示され、内容が重複しないこと、選択後にGAME画面へ戻り次のDepthへ進むことを確認）
- [x] 効果が反映される（Overclockでスコア加算、重複取得でスタック倍加、Repair Systemで最大/現在ライフが即座に増加、Backup Memoryでミス時のコンボ維持、Analyzerで1回のHINTで2マス開示、をそれぞれ個別に確認）
- [x] RUN終了でリセットされる（`upgradeManager`の所持リストが空になり、HUDのバッジ表示も消えることを確認）
- [x] Best記録には影響しない（LocalStorage`logicColor.endless.v1`の保存内容に`endlessBestDepth`/`endlessBestScore`/`totalRuns`以外のキー（アップグレード関連）が含まれないことを確認）

既存のENDLESS RESEARCH基本フロー（連続クリア・タイムアップ・RUN終了・RESULT表示・RETRY・既存12ステージへの無影響）も同じ統合テストの中で併せて回帰確認済み。`node --check`で新規/変更ファイルの構文エラーが無いことも確認済み。

## 今後の拡張余地

- 現状LABの3択には「スキップ」が無い。所持済みアップグレードばかりが候補に並んだ場合の代替候補提示や、スキップして次に進む選択肢は今後の検討余地。
- `effect.type`の集計は現状すべて「加算」（`getEffectTotal`は所持数×valueの単純合計）。将来的に乗算合成が自然な効果（例: スコア倍率同士の複合）が増えた場合は、`upgradeManager.js`側に集計方式（加算/乗算）をeffectごとに持たせる拡張が考えられる。
- Boss/Eventノード（前述の「今後追加予定」参照）が実装された際は、そのノード専用の報酬としてアップグレードを追加提示する、といった連携も考えられる。

---

# Phase3機能追加: Event Node / Boss Puzzle / Rare Upgrade / Upgrade Evolution（このセクションは今回の変更点のまとめ）

ENDLESS RESEARCHに、より深く潜るほど攻略の幅が広がるPhase3の要素を追加した。**既存のEndless基本フロー・Map(depth→難易度)・Research Lab（3択画面自体の仕組み）・通常Upgradeの10種と基本効果は維持している。** Phase3の追加はいずれもJSON上に一致するidを持たない新しい定義データ＋その適用ロジックとして加わっており、既存のUpgrade10種の効果・生成した5×5〜8×8の各Puzzleの内容には一切変更が無い。

## 追加したファイル

**新規追加**（`src/endless/`）:
- `events.js` — Event Node 5種（AI Anomaly / Data Recovery / System Error / Memory Fragment / Unknown Upgrade）の定義データ
- `eventManager.js` — Event Nodeの出現判定（25%）とランダム選択のみを担当。効果適用自体はendless.js側が行う
- `boss.js` — Boss Puzzle（Depth10/25/50）の生成設定（サイズ・疎密度・制限時間倍率・スコア倍率）
- `rareUpgrades.js` — Rare Upgrade 4種（Quantum Core / Time Dilation / Phoenix Protocol / Omniscience）の定義データと出現率設定

**部分修正**:
- `src/endless/upgradeManager.js` — Upgrade Evolution（Lv1〜Lv3上限）を追加。`getLevel(id)`/`isMaxed(id)`を新設し、`getEffectTotal()`は所持数ではなく上限クランプ後の実効レベルで計算するよう変更。Rare Upgrade（`rare:true`）は上限1（進化しない）。Phoenix Protocol用の`hasUnusedRevive()`/`consumeRevive()`も追加
- `src/endless/researchLab.js` — 候補選定(`_pickChoices`)がRare Upgradeを`RARE_APPEARANCE_RATE`（15%/枠）の確率で混入させ、進化上限に達した通常Upgrade・所持済みRare Upgradeを候補から除外するよう変更。カード表示にRAREバッジ・Lv表示を追加
- `src/endless/endlessGame.js` — `start(depth)`がまずBoss Puzzle対象かを判定し、対象ならboss.jsの設定（8×8・疎密度0.82・専用の制限時間倍率）で生成するよう変更。`_buildStats()`に`isBoss`/`bossScoreMultiplier`/`bossName`を追加
- `src/endless/endless.js` — `_afterRoundEnd()`にEvent Nodeの出現判定を追加（Lab対象でない場合のみ）、`_applyEvent()`で5種の効果を適用、`_handleRoundClear()`にBossスコア倍率・撃破カウント、`_handleRoundTimeout()`にPhoenix Protocol復活、`_handleUpgradeSelected()`にAI Anomalyの多重取得を追加。Boss出現時はGAME画面ラベル・ENDLESS HUDの見た目を切り替える
- `src/endless/endlessSave.js` — `totalBossClear`/`memoryFragments`をセーブデータに追加
- `index.html` — MODE SELECT画面に「BOSS CLEARS」「FRAGMENTS」表示を追加、Rare Upgradeカード・進化Lv表示・Boss出現中のHUD演出（赤いパルス発光）のCSSを追加

## Event Node

Depth3ごと（Lab対象）ではないDepthをクリア/ミスするたびに25%の確率で発生する。専用の画面は持たず、発生した瞬間にトーストで通知しつつ効果を即座に適用してから次のDepthへ進む。

| 種類 | 効果 |
| --- | --- |
| AI Anomaly | 次に取得するアップグレードの効果が2倍になる（Rareは進化上限1のため実質無効） |
| Data Recovery | ライフを1回復する（上限まで） |
| System Error | 現在のコンボがリセットされる（唯一のマイナス効果） |
| Memory Fragment | Memory Fragmentを1〜3個獲得する（生涯累計として保存される） |
| Unknown Upgrade | 未所持または未進化上限の通常アップグレードを1つ無条件で獲得する |

## Boss Puzzle

**出現**: Depth 10・25・50（固定）。それ以外のDepthでは通常通りMapのdepth→難易度テーブルに従う。

**生成設定（すべて8×8・疎密度0.82で統一）**:

| Depth | 名前 | 制限時間倍率 | スコア倍率 |
| --- | --- | --- | --- |
| 10 | BOSS: SYSTEM CORE | ×2.0 | ×3 |
| 25 | BOSS: DEEP ARCHIVE | ×1.7 | ×4 |
| 50 | BOSS: SINGULARITY | ×1.4 | ×5 |

**疎密度をあえて上げていない理由**（実測に基づく安全性優先の判断）: 当初、Bossらしい高難度を出すため8×8で疎密度0.78を試したところ、Node.js上の実測でリトライ込み平均6.4秒・最大17.5秒かかることが判明した。1RUNに最大3回とはいえプレイ中の待ち時間として許容できないため、疎密度は通常のENDLESS生成と同じ「実用的に安全な」0.82（リトライ込み実測平均321ms・最大1.1秒、25回試行で確認）に統一し、代わりに制限時間を段階的に厳しくすることで難易度のエスカレーションを表現している。

Boss出現中はGAME画面のヘッダーラベルがBoss名に切り替わり、ENDLESS HUDの枠が赤くパルス発光する。撃破すると`bossClearCount`（RUN内カウント）に加算され、RUN終了時に生涯累計`totalBossClear`へ加算される。ミス（タイムアップ）した場合は通常のPuzzleと同様にライフを1失って次のDepthへ進む（特別なリトライ機構は無い）。

## Rare Upgrade

`rareUpgrades.js`で通常のUpgrade（`upgrades.js`）とは別ファイルに定義し、`upgradeManager.js`内では同じ仕組み（`Map<id,count>`）で統一的に扱うが、`rare:true`フラグにより進化上限が1（Evolutionの対象外、1回のみ取得可能）である点が異なる。

**出現率設定**: RESEARCH LABの3枠それぞれについて`RARE_APPEARANCE_RATE`（15%）の確率で、通常Upgradeの代わりにRare Upgradeを提示する（`rareUpgrades.js`の定数、候補生成ロジックは`researchLab.js`の`_pickChoices`）。

| 名前 | 効果 |
| --- | --- |
| Quantum Core | 獲得スコアが+50%される |
| Time Dilation | 制限時間が+50%される |
| Phoenix Protocol | ライフが0になっても1度だけライフ1で復活する |
| Omniscience | HINT使用時、常に3マス同時に開示する |

## Upgrade Evolution

通常Upgrade（`upgrades.js`の10種）は同じものを最大3回まで取得でき、Lv1→Lv2→Lv3と効果が段階的に積み上がる。3を超えて取得しても効果はLv3で頭打ちになり（`upgradeManager.js`の`MAX_LEVEL=3`）、RESEARCH LABの候補にもLv3に達したアップグレードは再度出現しなくなる（`isMaxed(id)`で判定）。Rare Upgradeは前述の通り進化の対象外（上限1）。

## 保存

`logicColor.endless.v1`に以下を追加（既存の`endlessBestDepth`/`endlessBestScore`/`totalRuns`は無変更）:
- `totalBossClear` — 生涯Boss撃破回数の累計
- `memoryFragments` — Memory Fragmentイベントで獲得した生涯累計数

**"highestDepth"について**: 要件にあった`highestDepth`は「これまでに到達した最も深いDepth」という意味で、Phase1から存在する`endlessBestDepth`と完全に同じ概念だったため、2つの値が食い違う不整合を避けるべく重複フィールドを新設せず、既存の`endlessBestDepth`をそのままこの要件の実装として扱っている（詳細は`endlessSave.js`のコメント参照）。MODE SELECT画面には「BEST DEPTH」として既に表示済み。

アップグレード（通常・Rare問わず）・イベントで得た`nextUpgradeMultiplier`等のRUN限定状態はいずれもRUN終了時にリセットされ、上記の生涯累計フィールド以外はLocalStorageに保存されない。

## テスト

jsdom + 実際のHTML/JSを用いた統合テスト（Node.js上で本セクション作成時に実施）で以下を検証した:

- [x] Event発生（5種それぞれの効果を個別に適用して検証。発生確率が2000回試行で実測24〜25%前後であることも統計的に確認）
- [x] Boss出現（Depth10まで実際にプレイを進め、8×8盤面で生成されること、ヘッダー・HUDの見た目が切り替わること、撃破でスコア倍率とbossClearCountが反映されることを確認）
- [x] Rare Upgrade取得（通常Upgradeとは別に管理され、2回取得しても実効レベルが1のまま＝進化しないこと、効果が正しく加算されることを確認）
- [x] Upgrade進化（同じ通常Upgradeを4回取得しても実効レベル・効果はLv3で頭打ちになり、`isMaxed()`がtrueを返すことを確認）
- [x] 保存される（RUN終了時に`totalBossClear`/`memoryFragments`がLocalStorageへ正しく加算され、MODE SELECT画面の表示にも反映されることを確認）

既存のENDLESS基本フロー（Lab出現・3択・連続クリア・タイムアップ・RETRY・RESULT表示）およびSTAGE SELECTへの回帰も、独立した最小構成の検証で問題ないことを確認済み（多数のRUNを1つのテストプロセス内で連続実行した際に一部アサーションが状態汚染で誤って失敗したが、単体の新規セッションで再現しないことを確認しテストスクリプト側の問題と判断した）。`node --check`で新規/変更ファイルの構文エラーが無いことも確認済み。

## 今後の拡張余地

- Boss/Event/Rare Upgradeの各出現条件・確率・倍率は初期バランスであり、実プレイでの調整余地が大きい（特にBoss撃破報酬の倍率、Rare出現率15%が妥当かは要検証）。
- Event Nodeは専用の画面を持たずトースト通知のみで完結させている。LEVEL UP演出のような専用オーバーレイを設ける拡張が考えられる。
- Boss Puzzleは疎密度を通常と同じ0.82に統一し、時間倍率のみで難易度差を付けている。将来的にランタイム生成をWeb Worker化できれば、より疎密度の低い（本当に難しい）Boss構成にも安全に対応できる可能性がある。
- 9×9以上のサイズはまだ実測較正されておらず、Boss Puzzleでも8×8止まりにしている。より大きな盤面をBoss専用に導入する場合は、既存のステージ拡張・Phase1と同様の疎密度実測が必要。

---

# Protocolシステム Phase A追加（このセクションは今回の変更点のまとめ）

ENDLESS RESEARCHに、RUN開始時に研究方針（Protocol）を1つ選び、そのRUN専用の効果を適用する仕組みを追加した。**既存のステージ制・Endless基本フロー（Depth進行・制限時間・Life管理）・問題生成・Score計算式の基本部分・Research Lab（Upgrade選択）・Event Node・Boss Puzzle・Rare Upgrade・Upgrade Evolutionは一切変更していない。** Protocolは既存のUpgradeとは別のRUN限定メモリ状態（`protocolManager.js`、RUN開始/終了で必ずreset）として実装しており、LocalStorageには一切保存しない。

## 追加したファイル

**新規追加**（`src/endless/`）:
- `protocols.js` — Protocol 3種（Explorer / Analyst / Overclock）の定義データ（id/name/description/effects）
- `protocolManager.js` — RUN中に選択されたProtocolを管理し、`getLifeBonus()`/`getScoreMultiplier()`/`getPerfectBonusMultiplier()`/`getComboBonusMultiplier()`/`getDifficultyTierOffset()`で効果を参照させる。`upgradeManager.js`と同じ「RUN限定・reset()で必ずクリア」の設計に揃えている
- `protocolSelect.js` — RUN開始直後に表示するProtocol Select画面（3枚のカードから1つを選ぶ、`researchLab.js`と同じ実装パターン）

**部分修正**:
- `src/endless/map.js` — `getDifficultyForDepth(depth, tierOffset)`に第2引数を追加。Overclock Protocol用に目標Difficulty Tierを指定段階分だけ引き上げる（末尾Tierを超える分はクランプ）。`tierOffset`省略時（既存の全呼び出し）は完全に従来通りの挙動
- `src/endless/endlessGame.js` — コンストラクタに`protocolManager`を追加（省略可）し、`start(depth)`でBoss以外の場合に`protocolManager.getDifficultyTierOffset()`を`EndlessMap.getDifficultyForDepth()`へ渡すよう変更
- `src/endless/endless.js` — `startRun()`を「Protocol Select画面を表示するだけ」に変更し、選択確定後（`_handleProtocolSelected`）に旧`startRun()`本体だった`_initializeRun()`を呼ぶ2段階のフローにした。`_initializeRun()`でExplorerのライフボーナスを`maxLife`へ反映。`_handleRoundClear()`のスコア計算にAnalystのPERFECT/コンボボーナス倍率、Explorer/Overclockの総合スコア倍率を適用。`_endRun()`/`exitRun()`/`_exitToTitle()`で`protocolManager.reset()`を追加し、Protocol選択状態がRUNをまたいで残らないようにした
- `src/ui.js` — `showScreen()`が扱う画面一覧に`protocolSelect: #screen-protocolselect`を追加
- `index.html` — MODE SELECTとGAMEの間に新規画面`#screen-protocolselect`（Protocol Selectカード3枚+MODE SELECTへ戻るボタン）を追加、GAME画面の`#endlessHud`に現在選択中のProtocol名を表示する`#endlessProtocolValue`を追加、`src/endless/protocols.js`/`protocolManager.js`/`protocolSelect.js`の`<script>`タグを追加

## Protocolデータ

| 名前 | 効果 |
| --- | --- |
| Explorer | ライフ+1 / 獲得スコア×0.9 |
| Analyst | PERFECTボーナス+50% / コンボボーナス+20% |
| Overclock | 目標Difficulty Tier+1段階 / 獲得スコア×1.5 |

いずれも`effects`オブジェクトの汎用キー（`lifeBonus`/`scoreMultiplier`/`perfectBonusMultiplier`/`comboBonusMultiplier`/`difficultyTierOffset`）で表現しており、未選択時・対象外キーは`protocolManager.js`側で「効果なし」（倍率なら1、加算なら0）を返す。

## Flow変更

```
Before: START → Puzzle
After:  START → Protocol Select → RUN Initialize → Puzzle
```

MODE SELECTの「START RUN」を押すと、まずPROTOCOL SELECT画面（3枚のカード）が表示される。1つを選ぶとその場で`protocolManager.select(id)`により確定し、以後RUN終了までそのまま（Phase Aでは交換不可）。RETRY（RESULT画面から）も毎回このProtocol Selectから始まる。

## Protocol Manager

`upgradeManager.js`と対になる設計だが、Upgradeが「複数所持・重複スタック」を許すのに対し、Protocolは「RUN開始時に1つだけ選択し、RUN終了までそのまま」という単純な状態のみを持つ。
- 選択Protocol保存: `select(id)`/`getSelectedId()`/`getSelected()`
- 効果適用: `getLifeBonus()`等のgetterをendless.js/endlessGame.js側から呼び出す形（Upgradeの`getEffectTotal(type)`と同じ「参照される」設計に統一）
- RUN終了時リセット: `reset()`を`_endRun()`・`exitRun()`・`_exitToTitle()`・`startRun()`（次のRUNのProtocol Select表示直前）から呼び出し、Protocol選択状態がRUNをまたいで残らないようにしている

## UI

- **Protocol Select画面**（`#screen-protocolselect`）: Research Labと同じ`lab-card`ベースの見た目に、識別用のグリーンアクセント（`.protocol-card`）を加えた3枚のカード。MODE SELECTへ戻るボタンも用意（Phase Aでは「選ばずにRUNを開始する」導線は無い＝必ず1つ選択する）
- **ゲーム中HUD**: `#endlessHud`に「PROTOCOL」項目を追加し、現在選択中のProtocol名を常時表示する

## 注意（Phase Aで実装していないこと）

> **Phase B（後述セクション参照）で「Protocol交換」「シナジー」は実装済み。** 以下はPhase A時点（本セクション作成時）の記録として残す。

- Protocol交換（RUN中の切り替え）→ **Phase Bで実装**（Protocol Signal経由のMerge/Replace）
- Protocol解放（初期状態で3種とも常時選択可能。解放条件なし）→ Phase Bでも未実装のまま
- シナジー（Protocol同士・Protocol×Upgradeの組み合わせ効果）→ **Phase Bで実装**（Protocol同士のシナジー4種。Protocol×Upgradeは引き続き未実装）
- Season Modifier → Phase Bでも未実装のまま

## テスト

jsdom + 実サーバー配信のHTML/JSを用いた統合テスト（Node.js上で本セクション作成時に実施、`node --check`で全新規/変更ファイルの構文確認も実施済み）で以下を検証した:

- [x] Protocol選択できる（MODE SELECT→START RUNでPROTOCOL SELECT画面が表示され、GAME画面へは遷移しないこと。3枚のカード[Explorer/Analyst/Overclock]が表示され、いずれかをクリックするとGAME画面へ遷移しRUNが開始することを確認）
- [x] 効果が反映される（Explorer選択時に開始時ライフが3→4になること、Overclock選択時にDepth1の生成盤面が5×5(easy tier)ではなく7×7(normal tier)になること＝Difficulty Tierが実際に1段階引き上がっていることを、生成された盤面のマス数で直接確認。Score倍率・Analystのボーナス倍率は`protocolManager.js`単体の計算ロジックとして個別に検証（Explorer→×0.9、Analyst→PERFECTボーナス×1.5/コンボボーナス×1.2、Overclock→×1.5がそれぞれ正しく返ることを確認）
- [x] Endless以外へ影響しない（TITLE→STAGE SELECT→TUTORIALの通常フローが今回の変更後も問題なく動作し、GAME画面の`#endlessHud`が非表示のまま・盤面が3×3のまま生成されることを確認。`map.js`の`getDifficultyForDepth()`は第2引数省略時に既存呼び出しと完全に同じ値を返すため、Endless内の非Protocol経路（Boss Puzzle等）にも影響が無い）
- [x] RUN終了/中断（GAME画面の「‹ BACK」で中断した場合、Protocol選択状態がリセットされ次にSTART RUNを押すと再度Protocol Selectから始まることを確認）

## 今後の拡張余地

- Phase Aは「1RUNにつき1つのProtocolを選ぶだけ」に留めている。Protocol解放条件（例: 特定のBoss撃破やDepth到達で新Protocolが使用可能になる）を設ければ、Rare Upgradeと同様の進行報酬として機能させられる。
- Protocol×Upgrade、Protocol×Protocol（複数選択）のシナジーは意図的に対象外にした。組み合わせ数が増えるとバランス調整・表示の複雑さが跳ね上がるため、Phase Aでは各Protocolの効果を独立かつシンプルに保っている。
- Season Modifier（期間限定のRUN全体への追加効果）は、Protocol Select画面に4枚目のカード的な要素として将来追加しやすい設計（`protocols.js`のデータ形式をそのまま流用できる）にしてある。

（**上記2点はPhase Bで実装した**。Protocol×Protocolのシナジーは後述の4種、複数所持もProtocol Slot(最大2)として追加。Season Modifierは引き続き未実装）

---

# Protocolシステム Phase B追加（このセクションは今回の変更点のまとめ）

Phase A（[[Protocolシステム Phase A追加]]セクション参照。RUN開始時に単一Protocolを1つ選ぶだけだった）を拡張し、RUN中に複数Protocolを組み合わせて「ビルド」を構築できるようにした。**既存のENDLESS基本フロー・Research Lab・Event Node・Boss Puzzle・Rare Upgrade・Upgrade Evolution・Phase Aの基本3Protocol（Explorer/Analyst/Overclock）自体の効果値は一切変更していない。** Phase Bの追加はいずれも新規ファイル＋`protocolManager.js`の単一→複数管理への置き換えとして実装しており、既存のUpgrade/Boss/Event側のロジックには触れていない。

## 追加したファイル

**新規追加**（`src/endless/`）:
- `protocolSignals.js` — Protocol Signalでのみ提示される追加Protocol4種（Oracle/Precision/Chaos/Minimal）の定義データ。`protocols.js`（RUN開始時のProtocol Selectで提示される基本3種）とは別ファイル・別プールとして扱う（`upgrades.js`/`rareUpgrades.js`の関係と同じ設計）。RUN開始時点では選べず、Signal経由でのみ組み込める
- `protocolSynergy.js` — 2つの特定Protocolが同時にActiveな時だけ追加で発動するSynergy4種（Navigator/Perfect Engine/Critical System/Mad Scientist）の定義データと、Active中のid配列から発動中Synergyを判定する`findActive(activeIds)`
- `protocolSignal.js` — Depth5ごとに出現するProtocol Signal画面（researchLab.jsと同じ役割分担のUIコントローラ）。候補Protocolを1つ提示し、MERGE/REPLACE/IGNOREの選択肢をその場の所持状況に応じて動的に表示する

**部分修正**:
- `src/endless/protocolManager.js` — `selectedId`（単一）を`activeProtocols`（配列、最大`MAX_SLOTS=2`）へ全面的に置き換え。`select(id)`（RUN開始時用、空きスロットへ追加）はそのまま維持しつつ、`merge(id)`（Signal用、実質selectと同じ）・`replace(oldId,newId)`（Signal用、指定スロットの入れ替え）・`getActiveSynergies()`を新設。効果計算（`getLifeBonus()`等の外部APIは名前・戻り値の意味を維持）の内部実装を「Active中の全Protocol＋発動中の全Synergyのeffectsをまとめて合算する」方式に変更（後述）
- `src/endless/endless.js` — `_afterRoundEnd()`にProtocol Signalの出現判定（Research Lab→Protocol Signal→Event Nodeの優先順）を追加。`_handleProtocolSignal(action,def,targetId)`を新設しMerge/Replace/Ignoreを処理。`_recalculateMaxLife()`を新設し、Protocol構成が変わるたび（Signal決定直後）に最大ライフを再計算・現在ライフをクランプする（ChaosをMergeしても即ダメージにはならない設計、詳細は`endless.js`のコメント参照）。`_renderProtocolBadge()`をActive中のProtocol名（複数）＋発動中Synergyの表示に対応。`_handleRoundClear()`のPERFECT判定にOracleの`hasPerfectImmuneToHint()`を追加
- `src/ui.js` — `showScreen()`が扱う画面一覧に`protocolSignal: #screen-protocolsignal`を追加
- `index.html` — 新規画面`#screen-protocolsignal`（Protocol Signal、候補カード+MERGE/REPLACE/IGNOREボタン群）を追加、GAME画面の`#endlessHud`直下に`#endlessSynergyBadge`（発動中Synergy表示、未発動時hidden）を追加、`endlessProtocolValue`は複数Protocol名（` + `区切り）を表示するよう文言更新、`src/endless/protocolSignals.js`/`protocolSynergy.js`/`protocolSignal.js`の`<script>`タグを追加

## Protocol Slot

`protocolManager.js`の`activeProtocols`配列（最大`MAX_SLOTS=2`個）として実装。RUN開始時のProtocol Select（Phase Aの画面をそのまま流用、変更無し）で1個目が埋まり、以後はProtocol Signal経由でしか増減しない。

## Protocol Signal

Depth5ごと（`depth % 5 === 0`）に出現。`protocolSignals.js`の4種（Oracle/Precision/Chaos/Minimal）から、まだActiveでないものをランダムに1つ提示する（既に4種ともActive化不可能な状況、つまり最大2枠のうち残りの候補が無い場合は画面を出さず自動的にIGNORE扱いとする）。選択肢は所持状況に応じて動的に変わる:
- **MERGE**（組み込む）: 空きスロットがある時だけ表示。空きスロットへそのまま追加する
- **REPLACE**（入れ替える）: 所持中のProtocolの数だけボタンを表示する（例: 2個所持中なら「REPLACE: Explorer → Oracle」「REPLACE: Overclock → Oracle」の2つ）。押した方のスロットが新Protocolに置き換わる
- **IGNORE**（見送る）: 常に表示。何も変化しない

## Protocol Manager変更（単一→複数管理）

Phase Aの`selectedId`（文字列1つ）を`activeProtocols`（id配列、最大2個）へ置き換えた。`_getDef(id)`は`protocols.js`（基本3種）と`protocolSignals.js`（Signal限定4種）の両プールから検索する。外部から呼ばれる効果取得系のメソッド名・シグネチャ（`getLifeBonus()`/`getScoreMultiplier()`/`getPerfectBonusMultiplier()`/`getComboBonusMultiplier()`/`getDifficultyTierOffset()`）はPhase Aと完全に同じに保っており、`endlessGame.js`側（Difficulty Tierの参照箇所）は**Phase B対応のための変更が一切不要**だった（内部の集計方法だけがPhase Aの「1つの値をそのまま返す」から「Active中の全Protocol+Synergyを合算する」に変わった）。

## Effect計算

効果の性質によって合算方法を分けている（`protocolManager.js`の`_sumEffect(key)`/`_productEffect(key)`/`_hasBooleanEffect(key)`）:
- **加算**: `lifeBonus`・`difficultyTierOffset`（例: Explorer+1とChaos-1を両方所持 → 0）
- **乗算**: `scoreMultiplier`・`perfectBonusMultiplier`・`comboBonusMultiplier`（例: Explorer×0.9とOverclock×1.5を両方所持 → 0.9×1.5=1.35）
- **OR（真偽値）**: `perfectImmuneToHint`（Oracle所持時、1つでも所持していれば有効）

発動中のSynergyのeffectsも、所持中Protocol自身のeffectsと**全く同列で**この合算に加わる（Synergyだけ特別扱いする分岐は無い）。Protocol Slotが最大2個のため、合算対象は常に「Protocol最大2個＋Synergy最大1個」の最大3ソースに収まる。

`Explorer + Overclock`の場合: `Life +1`（Explorerのみ）、`Score ×1.35`（0.9×1.5、両方の積）、`Difficulty +1`（Overclockのみ）となり、要求仕様の例と一致する。

## Synergy

`protocolIds`（順不同の2つのid）が両方Active中の時にだけ、追加のeffectsが上記の合算に加わる。

| Synergy名 | 組み合わせ | 追加効果 |
| --- | --- | --- |
| Navigator | Explorer + Oracle | ライフ+1、獲得スコア×1.1 |
| Perfect Engine | Analyst + Precision | PERFECTボーナス×1.2 |
| Critical System | Overclock + Chaos | 獲得スコア×1.2、目標Difficulty Tier+1 |
| Mad Scientist | Minimal + Chaos | コンボボーナス×1.3 |

Protocol Slotが最大2個のため、同時に発動しうるSynergyは常に0個か1個（3つ以上のProtocolを同時所持できないため、異なる2組のペアが同時に揃うことは無い）。

**Oracle/Precision/Chaos/Minimalの効果値およびSynergy4種の効果値は、要求仕様に具体的な数値の指定が無かったため実装時にユーザーへ確認を取り、既存Protocol3種の設計（1〜2つのeffectキー・トレードオフのある効果）に沿う形でこちらから提案・承認を得た値を採用している**（Oracle: HINT使用時もPERFECT扱い/Score×0.95、Precision: PERFECTボーナス+30%/Score×0.95、Chaos: Score×1.3/Life-1、Minimal: Difficulty Tier-1/コンボボーナス+10%。Synergy4種の効果は上表の通り）。

## UI

- **Active Protocol表示**: `#endlessProtocolValue`（GAME画面ENDLESS HUD内、Phase Aから継続使用）がActive中の全Protocol名を` + `区切りで表示する（例: `Explorer + Oracle`）
- **Synergy状態表示**: `#endlessSynergyBadge`（ENDLESS HUD直下、新設）が発動中のSynergy名を`⚡ SYNERGY: Navigator`の形式でグリーン発光表示する。発動していない間は`hidden`クラスで非表示（DOM自体は残すが幅を取らない）
- **Protocol Signal画面**（`#screen-protocolsignal`）: Research Labと同じ`lab-card`ベースの候補カード（クリック不可、情報表示専用）＋動的に生成されるMERGE（グリーン）/REPLACE（ゴールド、所持数分）/IGNORE（グレー）のボタン列

## テスト

jsdom + 実サーバー配信のHTML/JSを用いた統合テスト（Node.js上で本セクション作成時に実施。`main.js`が`new EndlessMode(...)`する瞬間のインスタンスをテスト専用のフックで捕まえ、実際のDOM・実際の本番コードに対して直接検証する形を取った。本番コード自体には一切変更を加えていない）で以下27項目を検証し、全てPASSした（詳細な検証ログはテスト実行時のセッションに記録済み。テスト後jsdomはscratchpadから削除済み）:

- [x] 2Protocol保持できる（RUN開始でExplorerを選択→Protocol Signal(Depth5)でOracleをMERGE→`activeProtocols`が`['explorer','oracle']`になり、Protocol Slot上限の2個を実際に保持できることを確認。満杯状態ではMERGEボタン自体が表示されないことも確認）
- [x] Replaceできる（2個所持で満杯の状態でProtocol Signal(Depth10)にChaosが提示された時、所持数分（2つ）のREPLACEボタンが表示され、Oracle用のボタンを押すと`activeProtocols`が`['explorer','oracle']`→`['explorer','chaos']`へ正しく入れ替わることを確認）
- [x] Mergeできる（上記の通り、空きスロットがある状態でMERGEボタンを押すと1個→2個に増えることを確認）
- [x] 効果が合算される（Explorer×Chaos所持時に実際に`_handleRoundClear()`（本番のスコア計算ロジック）を呼び、獲得スコアが手計算の期待値（`Math.round(220 × 0.9 × 1.3) = 257`）と完全一致することを確認。乗算合成が実際のゲーム進行経路で正しく機能していることを検証）
- [x] Synergy発動する（Explorer+Oracle所持時に`getActiveSynergies()`が`Navigator`を返すこと、HUDの`#endlessSynergyBadge`が実際に`Navigator`を表示すること、`maxLife`にNavigatorのライフ+1が正しく加算されること（3+Explorer1+Navigator1=5）を確認。Explorer+Chaos等、定義の無い組み合わせでは0件のままであることも確認）
- [x] Endless以外に影響しない（Phase A同様、TITLE→STAGE SELECT→TUTORIALの通常フローが問題なく動作し、`#endlessHud`非表示・盤面3×3のままであることを確認）
- [x] （追加確認）IGNOREを選んだ場合は`activeProtocols`が一切変化しないこと、GAME画面「‹ BACK」でRUNを中断すると`activeProtocols`が完全に空配列へリセットされることも確認済み

## 今後の拡張余地

- Protocol解放条件（特定のBoss撃破・Depth到達で新しいSignal候補が使用可能になる等）はPhase Bでも未実装。現状は`protocolSignals.js`の4種が常に対等な確率で提示される → **Phase Cで実装**（後述セクション参照）
- Protocol Slotの上限（現在2）を将来的にRUN内で拡張できるようにする（例: 特定のRare Upgrade取得でSlot+1）拡張は、`protocolManager.js`の`MAX_SLOTS`を定数からインスタンスプロパティ化すれば対応しやすい設計にしてある
- Synergyは現在「特定の2Protocol」の組み合わせのみに対応（4種）。3Protocol以上の組み合わせや、Protocol×Upgradeのシナジーは、Protocol Slot自体の拡張と合わせて検討の余地がある
- Season Modifier（期間限定のRUN全体への追加効果）はPhase Cでも引き続き未実装のまま

---

# Protocolシステム Phase C追加（このセクションは今回の変更点のまとめ）

Phase A/B（RUN限定でProtocolを選ぶ/組み合わせる仕組み）に対し、Phase Cは「Protocolを発見・収集して長期プレイの目標を作る」ための**RUNをまたいだ永続的な進行要素**を追加した。**既存のENDLESS基本フロー・Research Lab・Event Node・Boss Puzzle・Rare Upgrade・Upgrade Evolution・Phase A/BのProtocol選択/Slot/Signal/Synergyの仕組み自体・既存7Protocol（Explorer/Analyst/Overclock/Oracle/Precision/Chaos/Minimal）の効果値は一切変更していない。** 追加したのは「未解放のProtocolはSignal候補にもならない」というフィルタと、解放条件を満たすたびに発見演出を出しつつ`logicColor.endless.v1`へ永続化する仕組みのみ。

## 追加したファイル

**新規追加**（`src/endless/`）:
- `protocolUnlock.js` — `protocols.js`/`protocolSignals.js`の各定義に埋め込んだ`unlock:{type,value}`フィールドを読み取るだけの、状態を持たない解放条件判定モジュール（boss.js/map.js等と同じ「データ＋小さいヘルパー」構成）。`findNewlyUnlockable(snapshot, unlockedIds)`が中心API
- `protocolFragment.js` — 「Protocol Fragment」（収集要素としての生涯累計リソース、Phase C時点では消費先は未実装）の獲得量を定義。Boss撃破+3、Event Node発生+1、Depth10ごとの到達+1
- `protocolArchive.js` — MODE SELECTから開けるArchive画面のUIコントローラ。解放済みは通常表示、未解放は`???`＋解放条件のヒントのみを表示する（researchLab.js/protocolSelect.jsと同じ「状態を持たず都度saveを読んで再描画する」設計）

**部分修正**:
- `src/endless/protocols.js` / `protocolSignals.js` — 各定義に`rarity`（'common'|'rare'|'legendary'）と`unlock`（`{type:'always'}`または`{type, value}`の閾値条件）を追加。`protocolSignals.js`には新規Protocol「Quantum」（`unlock:{type:'bestDepthEver',value:30}`、デメリット無しでScore×1.2/PERFECTボーナス+20%、rarity:'legendary'）を追加し5種構成に
- `src/endless/protocolManager.js` — 変更なし（Phase Bのまま）。解放状態はProtocolManagerではなくendlessSave.js（永続化）とendless.js（判定タイミング）側の責務として追加した
- `src/endless/protocolSignal.js` — 候補選定(`_pickCandidate`)に「未解放でないこと」の条件を追加（`save.isProtocolUnlocked(id)`）。コンストラクタに`save`依存を追加
- `src/endless/endlessSave.js` — `unlockedProtocols`（初期値`['explorer','analyst','overclock']`）・`protocolFragments`・`discoveredProtocolCount`・`totalEventCount`・`totalPerfectCount`を`logicColor.endless.v1`へ追加。`unlockProtocol(id)`は即時保存（発見演出のタイミングと合わせるため、`recordRun()`のRUN終了時バッチ処理とは別経路）、Fragment/Event/Perfectの生涯累計は既存の`totalBossClear`/`memoryFragments`と同じく`recordRun()`でRUN終了時にまとめて加算する
- `src/endless/endless.js` — RUN内カウンタ`eventCountThisRun`/`protocolFragmentsThisRun`/`_life1AtDepth20ThisRun`を追加。`_checkProtocolUnlocks()`を新設し、Depth進行時(`_advance`)・Event発生時(`_triggerEvent`)・クリア時(`_handleRoundClear`)の3箇所で呼び出す。Protocol Fragmentの獲得（Boss撃破/Event発生/Depthマイルストーン）もこれらの箇所に追加。MODE SELECTからArchiveを開く導線(`protocolArchiveBtn`)を追加
- `src/animation.js` / `src/ui.js` — 既存のLEVEL UP演出（`showLevelUp`）と同じ構造の`showDiscovery`/`showProtocolDiscovery`を追加し、新規Protocol発見時に流用する
- `index.html` — 新規画面`#screen-protocolarchive`（Archiveカード一覧）、発見演出用オーバーレイ`#discoveryOverlay`、MODE SELECTに「PROTOCOL ARCHIVE」ボタンを追加。レア度別（common/rare/legendary）のカード装飾CSS、`src/endless/protocolUnlock.js`/`protocolFragment.js`/`protocolArchive.js`の`<script>`タグを追加。既存の「FRAGMENTS」表示はMemory FragmentとProtocol Fragmentの混同を避けるため「MEMORY FRAGMENTS」に改称

## Protocol Archive

MODE SELECT画面の「PROTOCOL ARCHIVE」ボタンから開く。表示内容:
- ヘッダー: `DISCOVERED n / 8`（解放済み数/全Protocol数）、`PROTOCOL FRAGMENTS`所持数
- 全8Protocol（基本3種+Signal限定5種）を1枚ずつカード表示。**解放済み**は名前・効果説明・レア度をそのまま表示、**未解放**は名前を`???`に伏せ、レア度と解放条件（例:「Boss撃破 5回」）だけをヒントとして表示する

## Unlock System

初期解放済み（`protocols.js`の基本3種、`unlock:{type:'always'}`）: Explorer / Analyst / Overclock

追加解放条件（`protocolSignals.js`）:

| Protocol | 解放条件 | レア度 |
| --- | --- | --- |
| Oracle | Boss撃破 生涯5回 | RARE |
| Precision | PERFECTクリア 生涯100回 | RARE |
| Chaos | Event Node発生 生涯10回 | RARE |
| Minimal | ライフ1の状態でDepth20以上に到達（1回でも） | RARE |
| Quantum | Depth30以上に到達（1回でも） | LEGENDARY |

判定は「保存済みの過去分（`save.getTotalBossClear()`等） + 今RUNでの分（RUN内カウンタ）」を都度合算した値で行うため、**今まさにプレイ中のRUNで条件を満たした瞬間にも即座に反応する**（例: Boss4回撃破済みの状態で始めたRUNで5回目を撃破した瞬間にOracleが解放される）。一度解放されたProtocolは`unlockedProtocols`に永続化され、二度と条件判定の対象にならない。

## Discovery

条件を満たした瞬間、`endless.js`の`_checkProtocolUnlocks()`が`endlessSave.js`へ即時保存（`unlockProtocol(id)`）した上で、LEVEL UP演出と同じ構造の専用オーバーレイ（`#discoveryOverlay`）でProtocol名・レア度を表示する（1.8秒後に自動で消える）。Archiveへの登録は保存と同時に完了しているため、演出中でもMODE SELECTのArchiveを開けば即座に反映されている。

## Fragment

`protocolFragment.js`で定義した3つの獲得元:

| 獲得元 | 量 |
| --- | --- |
| Boss撃破 | +3 |
| Event Node発生（種類問わず） | +1 |
| Depth10ごとの到達（Depth10/20/30…） | +1 |

Phase C時点ではFragmentの消費先（交換・強化等）は未実装で、生涯累計を伸ばすこと自体が収集要素として機能する（今後の拡張余地参照）。

## Save

`logicColor.endless.v1`へ以下を追加（既存フィールドは無変更）:
- `unlockedProtocols` — 解放済みProtocol idの配列（初期値3件）
- `protocolFragments` — Protocol Fragment生涯累計
- `discoveredProtocolCount` — `unlockedProtocols.length`のミラー（Archive表示用に都度同期）
- `totalEventCount` / `totalPerfectCount` — Chaos/Precisionの解放条件判定に使う生涯累計カウンタ

## テスト

jsdom + 実サーバー配信のHTML/JSを用いた統合テスト（Node.js上で本セクション作成時に実施。Phase Bと同じく`main.js`が`new EndlessMode(...)`する瞬間のインスタンスをフックで捕まえ、実DOM・実本番コードに対して直接検証した）で以下35項目を検証し、全てPASSした:

- [x] Protocol解放される（Boss撃破5回でOracle、Event発生10回でChaos、Depth30到達でQuantum、ライフ1でDepth20到達でMinimal、PERFECTクリア100回でPrecisionの5条件全てを、実際の本番コード経路（`_handleRoundClear`/`_triggerEvent`/`_advance`）を通して個別に検証。「save側に事前の進捗がある状態から、今RUンでの1回分が閾値をまたぐ瞬間」まで再現して確認）
- [x] Archive表示される（未RUN時点でも開けること、解放済み3件/未解放5件が正しい件数で表示されること、未解放カードが`???`＋解放条件ヒントになっていること、全8種解放後は`8/8`表示・未解放カード0件になることを確認）
- [x] Fragment保存される（Boss撃破で+3、Event発生10回で+10されることを`protocolFragmentsThisRun`で確認）
- [x] 新規発見演出が出る（`#discoveryOverlay`の`hidden`クラスが解除され、Protocol名・レア度が正しく表示されることを確認）
- [x] 通常ゲームへ影響しない（TITLE→STAGE SELECT→TUTORIALの通常フローが問題なく動作し、`#endlessHud`非表示・盤面3×3のままであることを確認）
- [x] （追加確認）解放済みProtocolのみがProtocol Signalの候補になること、RUNを中断してもendlessSave側の解放状態（永続）とprotocolManager側のActive状態（RUN限定）が正しく別々に扱われることも確認済み

## 今後の拡張余地

- Protocol Fragmentは収集要素として実装したのみで、消費先（Protocol強化・追加Slot解放・Season Modifier購入等）は未実装。Fragment所持数を活かす二次的な仕組みは今後の検討課題
- Discovery演出はLEVEL UP演出のオーバーレイ構造を流用した簡易版。専用のアニメーション・サウンドを追加する余地がある
- 解放条件（Boss5回・Event10回・PERFECT100回・Depth30・ライフ1でDepth20）は初期バランスであり、実プレイでの調整余地が大きい（特にPERFECT100回はやり込み前提のかなり高い閾値）
- Quantumの効果（デメリット無しでScore×1.2/PERFECTボーナス+20%）はレア度がlegendaryに見合うよう他Protocolよりやや強めに設計したが、実プレイでのバランス調整が必要な可能性がある

---

# Research Environmentシステム追加（このセクションは今回の変更点のまとめ）

ENDLESS RESEARCHに、RUNごとに異なる環境条件（Research Environment）を1つ選ぶ仕組みを追加した。目的は「同じProtocol構成でも、選んだEnvironment次第で毎回違う攻略を要求される」こと。**既存のENDLESS基本フロー・Research Lab・Event Node・Boss Puzzle・Protocol Phase A〜C（Select/Slot/Signal/Synergy/Archive/Unlock/Fragment）は一切変更していない。** Environmentは既存のスコア計算・Difficulty Tier計算・Event発生判定・Fragment獲得計算の各所に、Protocolとは独立した「もう1つの効果ソース」として追加で乗り入れているだけで、既存の計算式・既存Protocol7種の効果値には手を加えていない。

## 追加したファイル

要求仕様のファイル構成（3ファイル: `environments.js`/`environmentManager.js`/`environmentArchive.js`）に合わせ、Protocol系が`protocols.js`(データ)/`protocolManager.js`(状態)/`protocolSelect.js`(UI)の3ファイルに分かれているのに対し、Environmentは「RUN開始時に1つ選ぶだけ」という単純な状態のため、**状態管理とDetection画面のUI描画を`environmentManager.js`1ファイルに統合**している。

**新規追加**（`src/endless/`）:
- `environments.js` — Environment6種（Normal Signal/Blue Spectrum/Signal Noise/Critical Logic/Deep Research/Unstable System）の定義データ（id/name/description/effects）
- `environmentManager.js` — RUN開始時（Protocol Select完了直後）に表示するEnvironment Detection画面のDOM描画と、選択されたEnvironmentの効果参照（`getDifficultyTierOffset()`等、protocolManager.jsと同名の効果取得メソッドを持つ）。Unstable Systemのみ、選択時に他5種からランダムに1つを内部的に「解決先」として選び直す特殊処理を持つ
- `environmentArchive.js` — MODE SELECTから開ける発見済み/未発見Environment一覧画面（researchLab.js/protocolArchive.jsと同じ「状態を持たず都度saveを読んで再描画する」設計）。Environmentには解放条件が無く、一度選んでRUNを開始すれば発見済みになる

**部分修正**:
- `src/endless/endless.js` — `_handleProtocolSelected()`がRUN初期化へ直行するのをやめ、`environmentManager.show()`（Environment Detection画面）を挟むよう変更。`_handleEnvironmentSelected()`を新設。スコア計算・Difficulty Tier計算・Event発生判定・Fragment獲得計算の各所にEnvironmentの効果を追加（後述）
- `src/endless/endlessGame.js` — コンストラクタに`environmentManager`を追加。Difficulty Tierの算出をProtocol分+Environment分の合計に変更。`_generateWithRetry()`にBlue Spectrum用の「複数候補からBLUE比率が最も高いものを選ぶ」ロジックを追加（**generator.js/solver.js自体は一切変更していない**。既存のリトライ機構をそのまま使った事後選抜による実現）
- `src/endless/eventManager.js` — `shouldTrigger()`に省略可能な`rateMultiplier`引数を追加（Signal Noise用。省略時は既存と完全に同じ挙動）
- `src/endless/endlessSave.js` — `logicColor.endless.v1`へ`unlockedEnvironments`（要求仕様の`unlockedEnvironment`を、既存の`unlockedProtocols`と表記を揃えて複数形にしたもの）・`discoveredEnvironmentCount`を追加
- `index.html` — 新規画面`#screen-environmentdetect`（Environment Detection、6枚のカード）・`#screen-environmentarchive`（Archive）、MODE SELECTに「ENVIRONMENT ARCHIVE」ボタン、GAME画面の`#endlessHud`に現在のEnvironmentを表示する`#endlessEnvironmentValue`を追加。`src/endless/environments.js`/`environmentManager.js`/`environmentArchive.js`の`<script>`タグを追加

## Environment（初期実装6種）

| 名前 | 効果 |
| --- | --- |
| Normal Signal | 効果なし |
| Blue Spectrum | 生成される問題がBLUEの多い構成に偏る。BLUEマスの割合が高いほど獲得スコアが最大+30% |
| Signal Noise | Event Nodeの発生率が+30% |
| Critical Logic | PERFECTボーナスが×2。その代わりミス（タイムアップ）時に失うライフが2倍 |
| Deep Research | 目標Difficulty Tierが+1段階。その代わりProtocol Fragmentの獲得量が×2 |
| Unstable System | RUN開始時、他5種からランダムに1つの効果を借用する（開始するまで何が出るか分からない） |

いずれもProtocolの効果（`protocolManager.js`）とは完全に独立した「もう1系統の効果ソース」として計算に加わる。加算/乗算の合成ルールもProtocol側と共通（difficultyTierOffset等は加算、scoreMultiplier系は乗算）で、例えばOverclock Protocol（Tier+1）とDeep Research Environment（Tier+1）を両方選べば目標Tierは合計+2される。

## Flow変更

```
START → Protocol Select → Environment Detection → RUN開始
```

Protocol Selectでの選択完了後、続けてEnvironment Detection画面が表示され、6枚のカードから1つを選ぶとRUNが開始する。Environment Detectionの「‹ PROTOCOL SELECT」ボタンで前段のProtocol Selectへ戻ることもでき、その際は選び直しでActive Protocolが重複しないよう`protocolManager`を一度リセットしてから戻る。

## Archive

`environmentArchive.js`がMODE SELECTの「ENVIRONMENT ARCHIVE」ボタンから開く。`DISCOVERED n / 6`のヘッダーと、解放条件を持たないシンプルな一覧を表示する。発見済みは名前・効果説明をそのまま表示、未発見は`???`のみ（Protocol Archiveと異なり解放条件のヒントは無い＝選べば誰でもすぐ発見できるため）。

## Save

`logicColor.endless.v1`へ以下を追加（既存フィールドは無変更）:
- `unlockedEnvironments` — 一度でも選んでRUNを開始したことがあるEnvironment id一覧（初期値は空配列）
- `discoveredEnvironmentCount` — `unlockedEnvironments.length`のミラー（Archive表示用）

保存タイミングはProtocol Archiveの`unlockProtocol()`と同じく即時（RUN開始時点で、選んだEnvironment・Unstable Systemが実際に解決した先の両方を記録する）。

## テスト

jsdom + 実サーバー配信のHTML/JSを用いた統合テスト（Node.js上で本セクション作成時に実施。Phase A〜Cと同じフック手法で本番の`EndlessMode`インスタンスを直接検証した）で以下31項目を検証し、全てPASSした:

- [x] Environment生成（START RUN→Protocol Select→Environment Detectionの順で画面が遷移し、6枚のカードが表示されること。Detection画面の「戻る」でProtocol Selectへ戻った際にActive Protocolが重複しないことを確認）
- [x] 効果反映（Overclock Protocol+Deep Research EnvironmentのDifficulty Tier合算(+2)、Deep ResearchでのFragment獲得量2倍、Analyst Protocol×Critical Logic EnvironmentでのPERFECTボーナス合成計算(実際のスコア424と手計算値の完全一致)、Critical Logicでのミス時ライフ損失2倍、Blue Spectrumでの生成問題BLUE比率バイアス（6回試行の平均でバイアス無しを明確に上回ることを統計的に確認）、Unstable Systemのランダム解決とHUD表示を個別に検証）
- [x] Archive表示される（発見済み/未発見の件数、`???`表示、`save.getUnlockedEnvironments()`との整合を確認）
- [x] 保存される（Environment選択時に`unlockedEnvironments`/`discoveredEnvironmentCount`が即時更新されることを確認）
- [x] Protocolと併用できる（同一RUN中にProtocol（Analyst）とEnvironment（Critical Logic）の両方がActiveであり、両者の効果が同じスコア計算に同時に（乗算で）反映されることを確認）
- [x] （追加確認）RUN中断でEnvironment状態（`selectedId`/`resolvedId`）がリセットされること、Endless以外（通常STAGE/TUTORIAL）のフローに影響が無いことも確認済み

## 今後の拡張余地

- Environmentには解放条件が無く6種とも初回から選択可能にした。Protocol Phase Cのような「発見でアンロック」ではなく「発見（＝選択した記録）を集める」だけのコレクション要素として設計している。将来的にProtocol同様の解放条件を持たせる拡張も可能（`unlock`フィールドをprotocols.jsと同じ形式で追加するだけで対応できる設計にしてある）
- Environment×Protocolのシナジー（特定の組み合わせで追加ボーナス）は今回実装していない。Protocol Synergy（`protocolSynergy.js`）と同じ仕組みを転用しやすい設計にはしてある
- Blue Spectrumの「BLUEの多い構成に偏る」は、generator.js自体を変更せず既存のリトライ生成から事後選抜する方式で実現した。既存のmaxAttempts=5の枠内で行っているため生成速度への影響は小さいが、より強いバイアスをかけたい場合は候補数を増やす調整の余地がある
- Unstable Systemが選んだ結果（`resolvedId`）はHUDに表示されるのみで、Environment Archiveでは「Unstable Systemを選んだ」という記録と「実際に解決したEnvironment」の両方がそれぞれ独立に発見済みとして記録される。この挙動は意図的（運が良ければ1回のUnstable選択で2つ発見できる）だが、仕様として明記されていなかったため実装時の判断である旨をここに記載する

---

# Map Generation System Phase1追加（このセクションは今回の変更点のまとめ）

ENDLESS RESEARCHの進行を「Depthごとに自動でPuzzleが始まる一本道」から、「毎回2〜3個のMap Node候補から1つを選んで進む」ローグライト型に変更した。**既存のProtocol Phase A〜C・Research Environment・Upgrade（Research Lab）・Event Nodeの内部ロジック（効果適用・選択UI・解放条件・効果計算式）は一切変更していない。** 変更したのは「いつ・どうやってそれらが呼ばれるか」という進行制御の部分のみで、各サブシステム自体はそのまま新しい入口（Map Node選択）から呼ばれるようになった。

## 追加したファイル

要求仕様の3ファイル構成（`mapGenerator.js`/`nodeTypes.js`/`mapUI.js`）に従い、Protocol Signal/Research Lab等と同じ「データ（nodeTypes.js）＋生成ロジック（mapGenerator.js、状態を持たない）＋画面描画（mapUI.js）」の役割分担にした。

**新規追加**（`src/endless/`）:
- `nodeTypes.js` — Map Node 8種（Puzzle/Event/Research Lab/Elite/Recovery/Protocol Signal/Unknown/Boss）と、Elite専用の特殊条件3種（Time Pressure/Hidden Signal/Perfect Trial）の定義データ
- `mapGenerator.js` — 次の1歩の分岐候補（既定でCHOICE_COUNT=3）を生成する。Boss出現Depth（`boss.js`のBOSS_DEPTHS）では分岐せずBoss Nodeのみを返す。Research Lab（3Depthごと）・Protocol Signal（5Depthごと）は既存の出現周期（`researchLab.js`のAPPEAR_EVERY_DEPTH=3・`protocolSignal.js`のSIGNAL_EVERY_DEPTH=5と同じ値をこのファイル内に複製）に合わせて必ず候補の1枠として提示する。残り枠はPuzzle/Event/Elite/Recovery/UnknownをDepth Tier別の重みで抽選し、Protocol（Explorer/Overclock/Chaos）・Environment（Signal Noise）の所持状況に応じて特定Nodeの抽選重みを補正する（後述）
- `mapUI.js` — Map画面（`#screen-map`）のカード描画。Oracle Protocol所持時、Unknown Nodeの実際の中身・Elite Nodeの変種名を選ぶ前から表示する

**部分修正**:
- `src/endless/endless.js` — 進行制御を全面的に作り替えた。旧`_advance()`（Depthを進めてPuzzleを直接開始）を`_showMapChoices()`（次のDepthの分岐候補を生成しMap画面を表示）と`_handleMapNodeSelected(node)`（Depth確定＋Fragment/Unlock判定、旧`_advance()`前半相当）＋`_enterNode(node)`（選ばれたNode種類ごとの実処理への振り分け）に分割。`_afterRoundEnd()`から旧来のResearch Lab/Protocol Signal/Event Nodeの自動判定カスケードを削除し、単純に`_showMapChoices()`を呼ぶだけにした（各判定はmapGenerator.jsの重み付き抽選に統合されたため）。Research Lab選択後・Protocol Signal決定後・Event適用後は、いずれも（旧: 次のPuzzleへ直接進んでいたのに対し）次のMap選択画面へ戻るよう統一した
- `src/endless/endlessGame.js` — `start(depth, eliteVariant)`にElite変種を渡せるよう拡張。Time Pressureは制限時間倍率を縮小、Hidden SignalはHINTボタンを無効化、Perfect TrialはHINT使用時にその場で失敗（タイムアウトと同じ`onTimeout`経路）として扱う。`_buildStats()`に`isElite`/`eliteVariantId`を追加
- `src/endless/eventManager.js` / `src/endless/endlessSave.js`は変更なし（Event Nodeの効果適用ロジック・保存形式はPhase3のまま）

## Node種類

| Node | risk | reward | 補足 |
| --- | --- | --- | --- |
| Puzzle | LOW | スコア | 通常の論理パズル |
| Event | MEDIUM | 良し悪し不確定 | 既存Event Node5種のいずれかが即座に発生（`events.js`は無変更） |
| Research Lab | NONE | Upgrade獲得 | 既存の3択Upgrade選択（`researchLab.js`は無変更） |
| Elite | HIGH | 高スコア+Fragment | 下記3変種のいずれか1つが付与された高難度Puzzle |
| Recovery | NONE | ライフ回復 | パズルを介さず即座にライフ+1 |
| Protocol Signal | NONE | Protocol強化 | 既存のMerge/Replace/Ignore（`protocolSignal.js`は無変更、Phase Cの解放済みフィルタも維持） |
| Unknown | UNKNOWN | ??? | 生成時点で他4種（Puzzle/Event/Elite/Recovery）のいずれかへ既に内部確定済み。選択時に明かされる |
| Boss | VERY_HIGH | 大量スコア+Fragment | 既存のBoss Puzzle（`boss.js`は無変更）。出現Depthでは唯一の選択肢になる |

各Nodeインスタンスは生成時に`risk`/`reward`/`description`を個別に持つ（要求仕様通り）。

## Elite（特殊Puzzle条件）

| 変種 | 効果 |
| --- | --- |
| Time Pressure | 制限時間が半分になる（`timeLimitMultiplierScale: 0.5`） |
| Hidden Signal | HINTボタンが無効化される |
| Perfect Trial | HINTを1回でも使うとその場で失敗（タイムアップと同じ扱い） |

Elite撃破時は獲得スコア×1.5・Protocol Fragment+2のボーナスが付く（Boss同様、`_handleRoundClear()`内で処理）。

## Unknown Node

「内容ランダム」を、選択の瞬間ではなく**生成の瞬間**にあらかじめ1つ確定させる設計にした（Puzzle/Event/Elite/Recoveryのいずれか）。これにより、Oracle Protocol所持時にMap画面上で「Unknownの正体」を事前に見せる、という後述のProtocol連動が自然に実現できる。選択されると、内部で確定していた種類として即座に処理される（トーストで「UNKNOWN NODE → ○○」と明かされる）。

## Depth別生成

`mapGenerator.js`のNode抽選重みはDepth 1-5 / 6-15 / 16+の3段階（Tier）で変化し、深くなるほどElite/Unknownの出現比率が上がる（詳細はコード内の`WEIGHT_TIERS`参照）。

## Protocol連動

| Protocol | 効果 |
| --- | --- |
| Explorer | Recovery Nodeの抽選重みが2.5倍（安全Node増加） |
| Overclock | Elite Nodeの抽選重みが2.5倍（Elite増加） |
| Chaos | Unknown Nodeの抽選重みが2.5倍（Unknown増加） |
| Oracle | Map画面でUnknownの実際の中身・Eliteの変種名を選ぶ前から表示する（Node情報表示） |

Environment側もSignal Noise（Event発生率+30%）がEvent Nodeの抽選重みに引き継がれている（旧`eventManager.shouldTrigger(rateMultiplier)`が担っていた確率補正を、Node出現しやすさの補正として移植した）。

## UI

Map画面（`#screen-map`）に2〜3枚のNodeカードを縦に並べる。各カードはアイコン・種類名・risk（色分け表示）・reward・descriptionを表示し、タップで即座にそのNodeへ入る（researchLab.js/protocolSelect.jsと同じ「選択式カードUI」パターンを踏襲）。Boss出現Depthではカードが1枚だけになる。

## テスト

jsdom + 実サーバー配信のHTML/JSを用いた統合テスト（Node.js上で本セクション作成時に実施。これまでのPhaseと同じフック手法で本番の`EndlessMode`インスタンスを直接検証した）で以下を検証し、mapGenerator.js単体の統計テスト10項目＋統合テスト35項目、全てPASSした:

- [x] 分岐生成（Depth1で3枚の候補が生成されること、Depth10（Boss出現Depth）では候補が1枚だけになり種類がbossであること、Depth3/5/15でResearch Lab/Protocol Signalが必ず候補に含まれることを確認）
- [x] Node選択（Puzzle/Event/Research Lab/Protocol Signal/Recoveryそれぞれを選んだ際に正しい画面遷移・Depth進行・付随処理（ライフ回復量、Event発生カウント等）が起きることを確認。Research Lab/Protocol Signal選択後は次のMap選択画面へ戻ることも確認）
- [x] Elite動作（Time Pressureで制限時間が通常より短くなること、Hidden SignalでHINTボタンを押してもHintが発動しないこと、Perfect TrialでHINTを使うとその場でライフを失う（即失敗扱い）ことをそれぞれ実際のround/game経路で確認）
- [x] Unknown動作（生成時点で確定した`resolvedNode`の種類として実際に処理され、内部カウンタ（例: Event選択時のeventCountThisRun）が正しく反映されることを確認）
- [x] Protocol効果反映（Oracle所持時にMap画面のカード説明文へElite変種名が表示されること、Explorer所持時にRecovery Nodeの出現回数が有意に増えること（300回試行の統計比較）を確認。Overclock/Chaos/Signal Noiseの重み補正はmapGenerator.js単体の統計テストで個別に確認済み）
- [x] （追加確認）RUN中断で既存のProtocol/Environment状態のリセットが引き続き正しく動作すること、Endless以外（通常STAGE/TUTORIAL）のフローに影響が無いことも確認済み

## 今後の拡張余地

- Phase1では「次の1歩」を毎回2〜3枚の候補から選ぶ方式に留めた。Slay the Spireのような複数層先まで見える分岐グラフ・ルート可視化は行っていない（`this.depth`という単一のカウンタで進行管理する既存アーキテクチャとの親和性を優先した設計判断）。Phase2でマップ全体の可視化に発展させる場合、`mapGenerator.js`の生成ロジック自体は概ね流用できる設計にしてある
- Elite/Unknown/RecoveryといったNode種類自体をProtocol Archiveのようにコレクション化・実績化する拡張は今回行っていない
- Node種類ごとのrisk/reward表示は現状「LOW/MEDIUM/HIGH」等の定性的なラベルのみ。実際の数値（期待スコア等）を事前提示するような、より情報量の多いUIへの拡張余地がある
- Boss出現Depthでは分岐が発生しない仕様のままにした。将来的に「Boss前に消耗を抑えるルートを選べる」等、Boss到達前の数手を戦略的に選べるようにする拡張も考えられる

---

# Puzzle Evolution System追加（このセクションは今回の変更点のまとめ）

ENDLESS RESEARCHの問題を「Depthに応じて内容そのものが進化し、毎回違う難易度になる」ようにする仕組みを追加した。**既存のENDLESS基本フロー・Protocol Phase A〜C・Research Environment・Map Generation System・Upgrade（Research Lab）・Event Node・Boss Puzzleの内部ロジックは一切変更していない。** 変更したのは「Depthに応じてどんな盤面サイズ・疎密度で問題を生成するか」（旧map.jsの3段階Tier→新puzzleTier.jsの4段階Tier）と、「Elite Node（Map Generation Systemで既存）にどんな特殊条件を付与するか」（旧nodeTypes.jsの単一ELITE_VARIANTS→新puzzleModifier.jsの複数Modifier）の2点。

## 重要な技術的判断: Tier4も11×11ではなく9×9のまま

要求仕様ではTier4（Depth50+）に11×11を想定していたが、実装前にNode.js上で`generatePuzzleWithRatio(11, ratio, ...)`の生成時間を実測したところ、**11×11では安全な疎密度が見つからなかった**（疎にすると品質チェックのnotTrivialに落ちて再生成が必要になり、密にすると唯一解の探索が長時間化し20秒のタイムアウトに達する試行が頻発した。0.90〜0.92は5試行中4〜5敗、0.87〜0.90は20秒でタイムアウト）。8×8で疎密度0.78が「平均6.4秒・最大17.5秒」で不採用になった過去の判断（boss.js）と同じ現象がサイズ増加でさらに悪化した形。ユーザーに実測結果を提示し、**Tier4もTier3と同じ9×9のまま、疎密度をわずかに下げて（密にして）難易度差を表現する**方針の承認を得た（9×9 ratio0.87でTier3、ratio0.865でTier4。どちらも実測で平均400ms未満・最大1.4秒未満と安全）。11×11以上への対応はgenerator.js自体の生成アルゴリズム改良が必要になるため、今後の拡張課題とした。

## 追加したファイル

**新規追加**（`src/endless/`）:
- `puzzleTier.js` — Depth→盤面サイズ/疎密度の4段階Tier定義。Tier1（Depth1-10、5×5/7×7）・Tier2（Depth11-25、7×7 Advanced）はmap.jsの既存DEPTH_TIERSと完全に同じ値を維持し、Tier3（Depth26-50、9×9）・Tier4（Depth50+、9×9・Tier3よりやや密）を新設。tierOffsetによるクランプ方式もmap.jsと同じ設計を踏襲
- `puzzleModifier.js` — Modifier5種（Mirror Logic/Hidden Color/Inverted Signal/Time Distortion/Noise Data）の定義データ。Elite Nodeは2個（重複無し）、Tier3以降の通常Puzzle Nodeは30%の確率で1個だけ付与される
- `difficultyManager.js` — 「Difficulty計算: Depth + Protocol + Environment + Node」を一元化。旧endlessGame.js内に直接書かれていたProtocol/Environmentのtier offset合算処理を置き換え、そこに「Node」（Elite Nodeは目標Tierを+1する＝Elite難易度上昇の実現）の項を追加した

**部分修正**:
- `src/endless/nodeTypes.js` — 旧`ELITE_VARIANTS`（3種、単一付与）を削除。Elite Nodeの特殊条件は`puzzleModifier.js`の5種（複数付与対応）に完全に置き換えた
- `src/endless/mapGenerator.js` — `buildNode('elite', depth)`がpuzzleModifier.jsから2個のModifierを付与するよう変更。`buildNode('puzzle', depth)`もTier3以降で確率的に1個付与するようになった
- `src/endless/mapUI.js` — Oracle Protocol所持時の情報表示を、旧`node.eliteVariant`単体から`node.modifiers`配列（複数）に対応させた
- `src/endless/endlessGame.js` — `start(depth, node)`のシグネチャを「Elite変種」単体から「選ばれたMap Node全体」に変更。盤面サイズ・疎密度の決定を`EndlessMap.getDifficultyForDepth()`から`DifficultyManager.getPuzzleConfig()`へ切り替え。Modifierの効果（後述）を反映する処理を追加
- `src/ui.js` — `buildBoard(game, options)`に`hiddenColor`/`invertColorOrder`オプションを追加（Hidden Color/Inverted Signal Modifierの表示反映用。省略時は従来と完全に同じ表示になるため、通常ステージ側の呼び出しは無変更のまま動作する）
- `src/endless/endlessSave.js` — `logicColor.endless.v1`へ`puzzleHistory`（直近100件のPuzzle Archive）を追加
- `src/endless/endless.js` — `_handleRoundClear()`/`_handleRoundTimeout()`後にPuzzle Archiveへの記録を追加。Elite撃破の高スコア倍率もここに実装（Map Generation System導入時点では未実装だった具体的な数値を、このセクションで確定させた）

## Tier

| Tier | Depth | サイズ | 疎密度 | 備考 |
| --- | --- | --- | --- | --- |
| Tier1 | 1-5 / 6-10 | 5×5 / 7×7 | 0.60 / 0.78 | map.jsの既存値そのまま |
| Tier2 | 11-25 | 7×7 | 0.75 | map.jsの既存値そのまま（Advanced） |
| Tier3 | 26-50 | 9×9 | 0.87 | 新規（実測: 平均166ms・最大594ms） |
| Tier4 | 51+ | 9×9 | 0.865 | 新規（11×11は不採用。実測: 平均399ms・最大1362ms） |

## Modifier

| 名前 | 効果 | 実現方法 |
| --- | --- | --- |
| Mirror Logic | マスタップの色巡回順が逆になる | `puzzle.allowedColors`を反転するだけ（game.jsが既にこの配列の順序をそのまま使う仕様のため、board.js/game.js自体は無変更） |
| Hidden Color | ランダムな1色のヒント数値が「?」表示になる | `ui.js`の`_renderHintChips()`にhiddenColorオプションを追加 |
| Inverted Signal | ヒントチップの色の並び順が反転表示される | 同、invertColorOrderオプション（`storeMap[color]`は色キー保持のためrenderHintStatus()の達成判定には無影響） |
| Time Distortion | 制限時間が×0.75、残り時間表示の更新が3秒おきに粗くなる | 制限時間倍率への乗算＋`_onTimerTick()`での表示間引き（内部の残り秒数自体は毎秒正しく減る） |
| Noise Data | UNDOが使用できない | `handleUndo()`の先頭でブロック |

## Elite

Elite Nodeは常にModifier2個（重複無し）を組み合わせて持つ。加えてDifficultyManager経由で目標Tierが常に+1される（例: Depth5でも通常Puzzleなら5×5のところ、EliteなればTier+1で7×7になる）。撃破時はスコア×1.5・Protocol Fragment+2のボーナスも得られる（`ELITE_SCORE_MULTIPLIER`/`ELITE_FRAGMENT_BONUS`）。

## Boss

Depth10/25/50は既存の`boss.js`をそのまま使用（8×8・疎密度0.82固定、Tierシステム対象外）。Puzzle Evolution System導入前後で挙動は一切変わらない。

## Difficulty

`difficultyManager.js`の`computeTierOffset()`が「Depth基準Tier + Protocol（`protocolManager.getDifficultyTierOffset()`） + Environment（`environmentManager.getDifficultyTierOffset()`） + Node（Elite Nodeのみ+1）」を合算し、`puzzleTier.js`の該当Tierへクランプする。全て独立して加算されるため、例えばOverclock Protocol（+1）とDeep Research Environment（+1）とElite Node（+1）を同時に満たせば合計+3される。

## Archive

`endlessSave.js`の`puzzleHistory`に、Puzzle/Elite/Boss挑戦を都度（クリア・タイムアップ問わず）記録する（`{depth, size, tier, cleared, isBoss, isElite, modifierIds, timestamp}`、直近100件、超過分は古い順に破棄）。Phase1時点では専用の閲覧画面は追加していない（データとしての保存のみ。今後の拡張余地参照）。

## テスト

jsdom + 実サーバー配信のHTML/JSを用いた統合テスト（Node.js上で本セクション作成時に実施。これまでのPhaseと同じフック手法で本番の`EndlessMode`インスタンスを直接検証した）で、puzzleTier.js/puzzleModifier.js/difficultyManager.js単体の計算テスト7項目＋統合テスト29項目、全てPASSした:

- [x] Tier変化（Depth1/6/26/51それぞれで実際に生成される盤面のマス数が25/49/81/81（Tier3-4はサイズ同一・疎密度差のみ）になること、`endlessGame.js`側の`currentTier`が正しく1/1/3/4になることを確認）
- [x] Modifier付与（Elite Nodeが常に2個の重複しないModifierを持つこと、Tier1-2の通常Puzzleは0個のままなこと、Tier3のPuzzleが200回試行中一部でModifierを獲得すること（0件でも全件でもないこと）を確認。Mirror Logic/Hidden Color/Inverted Signal/Time Distortion/Noise Dataそれぞれの効果が実際のround/ui経路で反映されることも個別に確認）
- [x] Elite難易度上昇（同一Depthで通常Puzzle=5×5に対しElite=7×7（Tier+1）になることを確認）
- [x] Boss動作（Depth10で盤面が引き続き8×8になること、`isBoss`が正しくtrueになること、Bossでは`currentTier`がnull（Tierシステム対象外）のままなことを確認）
- [x] Protocol連動（Overclock Protocol所持時、Depth1でも7×7になる＝DifficultyManager経由でTier+1が正しく反映されることを確認）
- [x] （追加確認）Puzzle Archiveへの履歴記録、RUN中断後の通常ステージ/TUTORIALフローへの無影響も確認済み

## 今後の拡張余地

- Puzzle Archiveは保存のみでUI（専用の閲覧画面）を追加していない。Protocol Archive/Environment Archiveと同じパターンで`puzzleArchive.js`的な画面を追加する拡張が考えられる
- 11×11以上のサイズ対応には、generator.jsの生成アルゴリズム自体の改良（現在の「ランダム完成盤面→掘り出し」方式以外のアプローチ、あるいはWeb Worker化による非同期生成でタイムアウト制約を緩和する等）が必要
- Tier3以降のPuzzle Modifier付与確率（30%）や、Elite撃破ボーナス（スコア×1.5・Fragment+2）は初期バランスであり、実プレイでの調整余地が大きい
- Modifier同士の相性・シナジー（Protocol Synergyのような組み合わせボーナス）は今回実装していない

## リサーチマップ画面追加

ENDLESS RESEARCHのMAP画面（分岐候補から次の1歩を選ぶ既存画面）に🗺️ボタンを追加し、現在のRUNの進行状況を俯瞰できる読み取り専用の「リサーチマップ」画面（`src/endless/researchMap.js`、`#screen-researchmap`）を新設した。

- レイヤー構成はDepth 0-10/11-25/26-50/51+の4層（Surface Research/Data Archive/Deep Analysis/Unknown Core）で固定。この境界は`puzzleTier.js`のTier1-4境界および`boss.js`のBOSS_DEPTHS(10/25/50)と完全に一致させている（レイヤーを跨ぐには実際にそのDepthのBoss Nodeを突破する既存仕様と自然に噛み合うため）
- 表示するNodeは実際に選んだ結果（`endless.js`が`_enterNode()`で記録する`visitedNodes`、RUNごとにリセット）のみを使い、未来の分岐は予測表示しない。現在Depthより先・現在より深いレイヤーは一律「未到達」としてロック表示する（Map Generation Systemが1歩ずつ分岐を生成する既存設計に対して誠実な表示にするための判断）
- 現在地は`YOU ARE HERE`ラベル＋パルスアニメーションで強調。右側にDepthスケール（0/10/25/50/50+の目盛り、現在地ドット付き）を配置
- ノードタップで種類・risk/reward・説明のポップアップを表示。凡例は`nodeTypes.js`の8種定義をそのまま流用し、表示の二重管理を避けている
- 画面下部に5つのナビボタン（研究開始/リサーチマップ/アップグレード/プロトコル/メニュー）を配置。「研究開始」はMAP（分岐選択）画面へ戻るだけ、「アップグレード」「プロトコル」は所持アップグレード・アクティブProtocol/Synergyを一覧表示するパネルを開くだけ、右上の📋ボタンは`puzzleHistory`（直近の挑戦記録）を表示するだけで、いずれも既存の画面遷移・タイマー状態には触れない設計にした。「メニュー」だけは`window.confirm`で確認したうえで既存の`exitRun()`（RUN中断、記録は残らない）を呼ぶ
- 進行中のタイマーがある`screen-game`（Puzzle出題中）からは開けない設計（分岐選択中の`screen-map`からのみ🗺️ボタンで開く）にすることで、タイマー競合やRUN状態の不整合を避けている

jsdomで実サーバー配信のHTML/JSに対する統合テストを実施（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除した）。RUN開始からProtocol Select→Environment Detection→複数Depth分のNode選択（実際のPuzzle/Eliteは`round.puzzle.answer`通りに盤面をタップしてクリアさせた）→リサーチマップを開いて4レイヤー表示・現在地マーカー・凡例9種・ノード詳細ポップアップ・未到達エリア表示・アップグレード/プロトコル/履歴パネル・ナビボタンでの画面遷移・RUN中断までの24項目を検証し、全項目PASSした。

### 改修: MAPアイコンの視認性向上、Recovery/Event Nodeの結果表示の分かりやすさ改善

公開後のフィードバックで2点の改修を行った。

- **MAPアイコンが小さく分かりにくい問題**: `screen-map`ヘッダーの🗺️ボタン（`mapOverviewBtn`）を34px→54×46pxに拡大し、アイコン単体だった表示を「アイコン＋"MAP"テキストラベル」の2段構成に変更、青系の枠線・グローを追加して押せるボタンだと分かりやすくした
- **Recovery/Event Node選択時に「一瞬パズルが表示されてすぐ次画面に切り替わる」問題**: 原因は、これらのNodeは盤面操作を伴わないにもかかわらず`_enterNode()`が`this.ui.showScreen('game')`を呼んでいたため、直前にクリアした（または初期状態の）Puzzle盤面が一瞬だけ表示され、その直後にトースト表示→`ADVANCE_DELAY_MS`(900ms)後に強制的にMAP画面へ戻る、という流れが「何が起きたか分からないまま切り替わる」体験になっていたこと。
  - 修正として、Recovery/Event Nodeでは`showScreen('game')`を呼ぶのをやめ、代わりに専用の**Node Resultオーバーレイ**（`#nodeResultOverlay`、`ui.js`の`showNodeResult()`/`hideNodeResult()`）を新設した。アイコン・タイトル・結果メッセージを表示しつつ`position:fixed`で画面全体を覆うため、裏の画面が何であっても（MAP画面の古い候補カードが残っていても）紛れない
  - 自動送り（`NODE_RESULT_AUTO_ADVANCE_MS`=2200ms、以前の900msより長く読める時間を確保）と「つづける」ボタンによる即時スキップの両方に対応。ボタンを押せばすぐ次のMap選択画面へ進める
  - Research Lab/Protocol Signal Nodeはもともと専用画面（`screen-researchlab`/`screen-protocolsignal`）へ遷移する設計で、盤面が一瞬映る問題は無かったため変更していない
- jsdom統合テストで、MAPボタンのアイコン/ラベルspan、Recovery Node選択時に`screen-game`へ遷移しないこと・オーバーレイの内容・「つづける」ボタンでの復帰、Event Node選択時のオーバーレイ内容・自動送りタイマーでの復帰、の計16項目を検証し全項目PASSした

### 改修2: リサーチマップ画面の文字サイズ拡大、ナビゲーションを画面上部へ移動

さらなるフィードバックを受けて、リサーチマップ画面（`#screen-researchmap`）の視認性を追加改善した。

- 画面内の文字サイズを全項目で2〜3px拡大（ステータスバー・目標テキスト・現在地バナー・レイヤー見出し/範囲/状態・ノードアイコン・凡例・下部ナビ・ノード詳細ポップアップ・各種パネルのテキスト等、`.rm-*`クラス全般）
- 5つのナビボタン（研究開始/リサーチマップ/アップグレード/プロトコル/メニュー）を画面最下部からヘッダー直下（画面最上部）へ移動。画面最下部はスマホのブラウザUIのバー等と被ってタップしづらいという指摘のための変更で、`ui.js`側のロジック（`getElementById`でDOM位置に依存しない）は無変更のまま、HTML内の配置とCSS（`border-top`→`border-bottom`）のみを変更した

## STEP27: AI Analysis Risk / Reward System

Research MapのNode選択に「AI研究施設が未知の論理領域を解析する」体験を追加する要求仕様（STEP27）に基づき、既存のMap Generation System（`mapGenerator.js`/`mapUI.js`、1歩ずつ2〜3枚の分岐候補を生成する仕組み）を維持したまま、AI Analysis Panel・Unknown Node Event System・Reward Choice System・Risk Chain System・Extract Systemを追加した。

**新規ファイル**:
- `src/endless/aiAnalysis.js` — Node種類ごとの基準値+node.idから決定的に導く変動幅で、threatLevel(0-5、Unknownはnull)/rewardPrediction(0-100)/confidenceLevel(HIGH/MEDIUM/LOW)/recommendationを計算する状態を持たないモジュール。同じnode.idなら常に同じ結果になるため、再描画で数値がちらつかない
- `src/endless/riskChain.js` — Threat Level3以上（高危険/Elite/Extreme）のNode選択が連続するとスコア倍率(1→1.2→1.5→1.8→2.2→2.6)が段階的に上昇し、Threat Level2以下の安全なNode選択でリセットされる`RiskChain`クラス。RUNごとにreset()されるメモリ上の状態のみ
- `src/endless/unknownEvents.js` — Unknown NodeでANALYZEした際に発生する7種類のイベント（Rare Upgrade/Protocol Fragment/Research Data Surge/System Corruption(ライフ減少)/Elite Signal Shift/Secret Room/Boss Shortcut）の定義データ
- `src/endless/rewardChoice.js` — Elite Nodeクリア直後に表示する3択報酬画面（Rare Upgrade/Protocol Fragment x2/Research Data +300の固定3枠）。専用の`.screen`は増やさずoverlay(`#rewardChoiceOverlay`)として実装
- `src/endless/extractManager.js` — Research途中で自主的にRUNを終了し蓄積を確定させる「Extract」確認画面。overlay(`#extractOverlay`)として実装。Failure Probabilityは実際の判定に使わないAI演出専用の数値であることをコード上も明示している

**既存ファイルの変更**:
- `mapGenerator.js`: `buildNode()`の末尾で`AIAnalysis.analyze(node)`の結果をNodeへ付与する。Unknown Node自身の`resolvedNode`（既存のOracle Protocol事前表示用データ）にも自動的に解析結果が乗るため、Oracle所持時はresolvedNodeの本当の脅威度/報酬期待値まで覗き見できるようになった（既存の「resolvedNode.nameを覗く」機能はそのまま維持した上での追加）
- `mapUI.js`: 通常Nodeカードは「RISK/REWARD」の代わりに「SIGNAL DETECTED」ラベル+Threat★+Reward Prediction%+AI Confidence+AI Recommendationを表示するAI Analysis Panelに変更。Unknown Nodeのみ専用パネル（"DEEP UNKNOWN SIGNAL"+???表示+ANALYZE/IGNOREの2ボタン）にした（button-in-buttonを避けるため外枠はbuttonではなくdivにしている）
- `endless.js`: Unknown Node解決を`node.resolvedNode`への単純差し替えから`_resolveUnknownNode()`（7種イベント抽選）へ完全に置き換えた。Elite Signal Shift時は`MapGenerator.buildNode('elite', depth)`で新しいElite Nodeを作り`_enterNode()`へ再帰させることで、Risk Chain反映・visitedNodes記録・Reward Choice表示まで既存のElite処理にそのまま合流させている。Boss Shortcutは次のBoss Depthの直前まで`this.depth`を進めるだけで、既存の「Boss Depthでは分岐せず単独ノードになる」仕組みにそのまま乗せている
- `endlessSave.js`: `discoveredUnknownEvents`/`researchDataTotal`/`maxRiskChainMultiplierEver`/`totalUnknownAnalysisCount`/`researchHistory`（直近50件のRUNサマリー）を追加
- `endlessResult.js`: RESEARCH REPORTとしてDEEPEST LAYER/RESEARCH DATA/PROTOCOLS FOUND/RISK CHAIN/UNKNOWN ANALYSISを追加表示

**重要な設計判断（要求仕様に無く、こちらで決めた点）**:
- 「Research Lab Experiment Choice」（要求仕様セクション6）は、既存の`researchLab.js`（3択からUpgradeを1つ選ぶ、Phase1から実装済み）が実質的に同じ体験を既に提供しているため、新規実装をせず既存機能をそのまま採用した。エントリーカードのAI Analysis Panel表示は他のNode種類と統一的に適用される
- Research Data（Extract Systemで使う蓄積リソース）は、Elite Reward Choice/Unknown Event以外に、毎回のPuzzleクリア時にも獲得スコアの10%相当が少量加算されるようにした。Extract Systemに常に一定の意味を持たせるための設計判断
- Risk Chainのスコア倍率は、既存のBoss/Elite固有倍率（`ELITE_SCORE_MULTIPLIER`等）とは独立してさらに乗算される。Unknown Node解析（Elite Shift以外の結果）は安全側としてChainをリセットする
- AI Warningトースト（要求仕様セクション8）は、Risk Chainレベルが上昇した瞬間のみ表示する（毎回表示すると煩雑なため）。持続的な状態は既存の`endlessSynergyBadge`と同じパターンのHUDバッジ（`#endlessRiskChainBadge`）で表現する
- STEP27のUIは既存のネオンテーマ（`--blue`/`--green`/`--gold`/`--red`/`--purple`）をそのまま踏襲し、継続的なスキャンアニメーション等の重い演出は追加していない（過去のフィードバックで「重いアニメーションは避ける」方針が既に確認されているため）

**テスト**: jsdomで実サーバー配信のHTML/JSに対する統合テストを2本実施（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除した）。
1. 通常プレイフロー: AIAnalysis/RiskChain/UnknownEventsの単体計算12項目、RUN開始→MAP画面のAI Analysis Panel表示確認、Risk Chainバッジの表示/非表示切り替え、Extract System（CONTINUE RESEARCH/RETURN TO SURFACE両方、Result画面への反映）、既存のSTAGE SELECT等への無影響、の計30項目
2. Unknown Node 7種イベント個別検証: `UnknownEvents.pickEvent`を各イベントIDに一時的に固定し`_resolveUnknownNode()`を直接叩くことで、Rare Upgrade/Protocol Fragment/Research Data Surge/System Corruption（ライフ減少、0になった場合のRUN終了まで含む）/Secret Room/Boss Shortcut（次のBoss Depthへの短絡接続、Map候補がBoss単独になることまで確認）/Elite Signal Shift（実際にPuzzleが開始されクリア後Reward Choiceが出ることまで確認）の全7種を実際のコード経路で検証、計22項目
全52項目PASS、ランタイムエラー無し。

## STEP28: Meta Progression / Permanent Research System

Endless Researchで獲得したResearch DataをRUNをまたいで恒久的な探索能力へ変換する、長期進行ループを追加する要求仕様（STEP28）に基づき実装した。既存のENDLESS RESEARCHのゲームループ（Protocol Select→Environment Detection→MAP→Puzzle→…→RUN終了）は完全に維持し、RUN終了後の帰還先として新画面「NEURAL RESEARCH LAB」を追加している。

**新規ファイル**:
- `src/endless/researchTree.js` — Research Tree（Analysis System/Protocol Development/Exploration System/Survival Systemの4カテゴリ、各1種の恒久アップグレード）の静的定義。コスト計算式`baseCost × (1 + currentLevel × 0.8)`は要求仕様に数値指定が無かったため設計した
- `src/endless/metaProgression.js` — permanentResearchData（使用可能残高）・Research Tree購入・Research Rank計算・Permanent Unlock判定・Protocol Evolutionをまとめて扱う管理クラス。永続化はendlessSave.jsへ完全に委譲し、自身は状態を持たない
- `src/endless/neuralLab.js` — 「NEURAL RESEARCH LAB」画面（`#screen-neurallab`）のDOM描画・購入イベント配線。Surface Arrival演出・Technology Installed演出もここで担当する

**既存ファイルの変更**:
- `endlessSave.js`: `permanentResearchData`（使用可能残高。研究データの生涯累計`researchDataTotal`＝統計用とは別で、購入すると減る）・`researchTreeLevels`・`unlockedTechnologies`・`protocolEvolution`・`secretsDiscovered`を追加。既存の`load()`が`Object.assign(defaultData(), JSON.parse(raw))`で欠損項目を初期値補完する仕組みを流用しているため、STEP28で要求された「不足項目は初期値で補完する」Save Migrationは追加コード無しで自動的に満たされている
- `protocolUnlock.js`: 汎用的な`unlock.type`判定の仕組み（`snapshot[type] >= value`）はそのままに、`metaRank`という新しい条件タイプを1行追加しただけで、Research Rank到達によるProtocol解放を実現した（既存のPhase C解放条件と全く同じ経路で動く）
- `protocolSignals.js`/`environments.js`/`unknownEvents.js`: Permanent Unlock Systemの実例として、Research Rank2/3/4でそれぞれ1つずつ新規コンテンツ（Protocol「Neural Link」/Environment「Quantum Flux」/Unknown Event「Temporal Echo」）を追加。効果はいずれも各Managerが既存でサポートしている効果キーのみを使い、新しい合算ロジックの追加は不要にした
- `environmentManager.js`: `_renderChoices()`/Unstable Systemの`_rollRandom()`をRank未達のEnvironmentを除外するようフィルタ（既存6種は`unlock`フィールドが無いため無影響）
- `mapGenerator.js`: `generateChoices()`に`extraChoices`引数を追加（Deep Scan用、上限6枚にクランプ）
- `mapUI.js`: Unknown Nodeの解析確率にAdvanced Analysis（researchTree.js）のロール判定を追加（Oracle Protocolと同じ表示経路を共有）
- `endless.js`: metaProgression/neuralLabの生成・配線、Protocol Fragment獲得倍率・Risk Chain後の追加スコア倍率（Protocol Evolution）・Emergency Recoveryの初回ミス軽減・Research Rankのsnapshot反映・RUN終了後のSurface Arrival→Neural Lab遷移を追加

**重要な設計判断（要求仕様に無く、こちらで決めた点）**:
- Research Rank計算式（要求仕様に数値指定が無かったため設計）: `研究データ生涯累計÷500 + 購入Upgrade数×3 + 到達最深Layer×4 + Archive完成率(Protocols+Events平均)×15`のスコアをRANK_THRESHOLDS `[0,8,20,35,55,85]`と比較して0(Observer)〜5(Neural Architect=MAX)を判定する
- 「Secret Layer」（Rank5解放）は、新たな探索深度帯を丸ごと追加する大規模拡張になるため、今回は「実績フラグ」として実装（`unlockedTechnologies`に記録、NEURAL RESEARCH LAB/Archiveに表示するのみ）に留めた。新規Protocol/Environment/Unknown Eventの3つは実際にゲームプレイへ反映される本物のコンテンツとして実装済み
- Protocol Evolution（Basic→Advanced→Quantum）は、要求仕様の条件（Research Data・Fragment・Archive進行度）をそのまま採用しつつ、効果は「所持中Protocolの進化段階合計×10%のスコア倍率ボーナス」というシンプルな形にした（Protocol毎に異なる効果へ個別加算する設計は既存のprotocolManager.jsの合算ロジックへの侵襲が大きいため見送った）
- RUN終了フローの変更は、RESULT画面の「TITLE」ボタンは既存通り即座にタイトルへ戻れるようにし（用事が済んだプレイヤーへの摩擦を増やさないため）、「RETRY」ボタンのみSurface Arrival→NEURAL RESEARCH LABを経由するよう変更した。MODE SELECT画面にも🧪ボタンを追加し、RUNを挟まずいつでもNEURAL RESEARCH LABを開けるようにしている

**テスト**: jsdomで実サーバー配信のHTML/JSに対する統合テストを実施（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除した）。要求仕様セクション13の完了確認フロー（①RUN開始→②Puzzleクリア→③Research Data取得→④Extract→⑤Research Lab到達→⑥Upgrade購入→⑦Save→⑧次回Runで効果確認）を実際のコード経路で通し、旧セーブからのマイグレーション、Research Rank計算とPermanent Unlock（Protocol/Environment/Unknown Eventの3種すべて）、Protocol Evolution、MODE SELECTからの直接アクセス、既存のSTAGE SELECT等への無影響を含めて計46項目を検証、全項目PASS・ランタイムエラー無し。

## STEP29: Research Identity System

プレイヤーが単に強化されるだけでなく「どのような研究者として成長するか」というプレイスタイルの個性を持たせる要求仕様（STEP29）に基づき実装した。既存のENDLESS RESEARCHのゲームループ・Protocol/Environment/Meta Progression等の各システムは一切変更せず、それらに横から効果を合算する形で追加している。

**新規ファイル**:
- `src/endless/researchIdentity.js` — ANALYST/EXPLORER/PROTOCOL ENGINEER/SURVIVALISTの4種Identityの静的定義（primaryBonus/secondaryBonus/Lv1・5・10の3段階Perk Tree/EXP源テーブル）。Lv1〜10の必要EXP式`100 × (1 + (現在Lv-1) × 0.8)`はresearchTree.jsのコスト式と同じ発想で設計した（要求仕様に数値指定が無かったため）
- `src/endless/identityManager.js` — 選択中Identityの状態管理（EXP加算・レベルアップ・Perk自動解放）と効果集計を担当する管理クラス。metaProgression.jsと同じく状態を持たずendlessSave.jsへ委譲し、Protocolと異なりRUNをまたいで恒久的に育つためreset()を持たない
- `src/endless/identitySelect.js` — 新規プレイ開始時（まだIdentity未選択の時のみ）に表示する4択選択画面
- `src/endless/researchProfile.js` — Identity・Level・生涯進行状況（Deepest Layer/Protocols Found/Unknown Analysis/Preferred Risk）・Perk Tree・Achievement一覧を表示する読み取り専用画面
- `src/endless/achievements.js` — Identity関連Achievement4種（Logic Architect/Deep Signal Hunter/Protocol Creator/Endless Researcher）の定義+達成判定。protocolUnlock.jsと同じ「snapshot[type] >= value」汎用判定パターン
- `src/endless/aiFeedback.js` — RUN終了時、今RUNの行動パターン（Risk Chain最大値・Extract有無・Node種類別選択回数・PERFECT率）から観測コメント+推奨行動を1組返す、優先順位付きルールテーブルによる決定的な判定モジュール

**既存ファイルの変更**:
- `endlessSave.js`: `selectedIdentityId`/`secondaryIdentityId`（Hybrid用、データのみ）/`identityExp`/`identityLevel`/`unlockedIdentityPerks`/`completedAchievements`/`totalProtocolEvolutions`を追加。既存のマイグレーション機構（`Object.assign(defaultData(), JSON.parse(raw))`）がそのまま働くため追加コード不要だった
- `metaProgression.js`: コンストラクタが`identityManager`を受け取れるようにし、`getEvolutionCost()`にProtocol Engineerの「Evolution Cost Down」Perkによる割引を反映。`evolveProtocol()`成功時に`totalProtocolEvolutions`をインクリメント（Achievement「Protocol Creator」判定用）
- `neuralLab.js`: `identityManager`を受け取り、Protocol Evolution成功時にEXP源`protocolEvolve`を加算してIdentityイベント演出を出す
- `mapUI.js`: Unknown Nodeの解析確率にAnalyst/ExplorerのIdentityボーナス（`getUnknownRevealChanceBonus()`）を合算
- `ui.js`/`animation.js`: Identity Level Up/Perk Unlock演出`showIdentityEvent()`を追加（Protocol Discoveryと同じオーバーレイ構造を、ラベル文言も差し替え可能にした汎用版として流用）
- `endlessResult.js`: RESULT画面に「AI OBSERVATION」欄（observation文+recommendation）を追加表示
- `endless.js`: identityManager/identitySelect/researchProfileの生成・配線。新規プレイ時のみProtocol Selectの前にIdentity Selectを挟む分岐。スコア計算（scoreMultiplier/perfectBonusMultiplier/comboBonusMultiplier）・Fragment獲得倍率・Miss時ライフ損失倍率・Map分岐候補数・ライフ自動回復間隔・Synergy発動時の追加スコア倍率の各既存計算式へIdentity効果を合算。関連Node攻略/Reward取得の各所（Puzzleクリア・PERFECTクリア・Boss撃破・Depth進行・Unknown解析・Recovery Node・Fragment獲得・Synergy発動）でEXPを加算。RUN終了時にAchievement判定とAI Feedback分析を実行しRESULT画面へ渡す

**重要な設計判断（要求仕様に無く、こちらで決めた点）**:
- Analystの「Puzzle Analysis」（primaryBonus）と「AI Confidence」（secondaryBonus）は、どちらも`unknownRevealChance`という同一の効果キーに合算する設計にした。2つの独立した新規サブシステムを作ると既存のAI Analysis Panel（aiAnalysis.js）へ深く手を入れる必要が生じるため、ラベル（表示文言）だけ分けて実際の効果は1つのレバーに集約した
- Survivalistの「Recovery System」Perkは、既存のRecovery Protocolアップグレード（`lifeRegenInterval`）を所持していなくても単独でライフ自動回復を起動できるようにした（Identity自身がその手段の簡易版を持つ、という判断。既存アップグレードの価値を損なわないよう、両方所持時は効果が合算される）
- Achievementの「Long Run」条件（Survivalist「Endless Researcher」）は要求仕様に閾値指定が無かったため、Boss Depth50到達をLong Runの基準として設計した。「Preferred Risk」（Research Profile）の判定閾値（LOW<1.5, MEDIUM<2.2, HIGH以上）も同様に設計した
- Hybrid Identity System（セクション7）は要求仕様どおりデータ構造（`secondaryIdentityId`の保存・`getHybridLabel()`）のみ対応し、選択UIは実装していない。組み合わせ表示名は要求仕様で例示された1組（PROTOCOL ENGINEER+EXPLORER="Protocol探索特化型"）のみ個別マッピングし、他の組み合わせは汎用フォールバック表記にした
- Identity選択は「新規プレイ開始時に一度だけ」という要求のとおり、以後変更するUIは設けていない（再選択・Identity変更は今回のスコープ外）

**テスト**: jsdomで実サーバー配信のHTML/JSに対する統合テストを実施（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）。要求仕様セクション14の完了確認フロー（①New Research開始→②Identity選択→③Run実行→④Identity Bonus適用確認→⑤EXP獲得→⑥Level Up→⑦Perk Unlock→⑧Profile更新→⑨Save確認）を実際のコード経路で通し、4種Identityそれぞれの効果集計値、実際のPuzzleクリア（盤面へ解答をタップして本物のスコア計算式を経由）によるRESULT画面のAI Observation表示、Achievement判定用カウンタの加算、既存のSTAGE SELECT等への無影響を含めて計47項目を検証、全項目PASS。**テスト中に発見・修正したバグ**: `identityManager.js`に`getScoreMultiplier()`が未定義のまま`endless.js`側から呼ばれており、実際にPuzzleをクリアすると例外が発生する状態だった（現行4 IdentityにはscoreMultiplier型の効果を持つものが無いため単体テストでは表面化せず、実クリアフローのテストで発覚）。既存のprotocolManager.getScoreMultiplier()と同じ「常に1以上を返す」パターンで追加し解消した。

## STEP30-1: Environment Framework（Dynamic Research World 第一段階）

「Research Layerに紐づくEnvironment（研究環境）」という概念の基盤を追加する要求仕様（STEP30-1）に基づき実装した。要求仕様どおり今回はEnvironment Modifier/World Mutation/Environment Event/Stability変化は実装せず、データ構造・Layerとの紐付け・HUD表示・Saveのみの「基盤実装」に留めている。

**命名についての重要な注意**: このプロジェクトには既に「Research Environment」という名前のRUN限定システム（`environments.js`/`environmentManager.js`、RUN開始時に選ぶBlue Spectrum等6種、スコア倍率等のゲームプレイ効果を持つ）が存在する。STEP30-1が要求する「Environment」（Layerに紐づく恒久的な見た目テーマ、ゲームプレイ効果は今回一切持たない）はそれとは全くの別概念のため、クラス名・グローバル名・Save項目名の衝突を避けて`WorldEnvironment`/`WorldEnvironmentManager`という名前にしている。

**新規ファイル**:
- `src/endless/worldEnvironment.js` — env_grid/env_network/env_forest/env_ocean/env_fractal/env_unknownの6種の静的定義（id/name/theme/description/background/uiColor/bgmId/unlockCondition）。Layer1-5/6-10/11-15/16-20/21-25の固定対応表と、Layer26以降がその対応表を離れる境界(`RANDOM_START_LAYER=26`)を保持する
- `src/endless/worldEnvironmentManager.js` — `getCurrentEnvironment()`/`getEnvironmentByLayer(layer)`/`getTheme()`/`getBackground()`/`getUIColor()`/`getBgmId()`/`unlockEnvironment(id)`/`isUnlocked(id)`の要求API全てを実装した管理クラス。metaProgression.js/identityManager.jsと同じく状態を持たずendlessSave.jsへ委譲する

**既存ファイルの変更**:
- `endlessSave.js`: `currentWorldEnvironmentId`（初期値`env_grid`）・`unlockedWorldEnvironments`（初期値はunlockCondition:'always'の5種）・`discoveredWorldEnvironments`を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった
- `ui.js`/`animation.js`: Layer移動でEnvironmentが変化した瞬間のみ表示する約2秒間のHUD演出`showEnvironmentHud()`を追加（Identity Level Up演出と同じオーバーレイ機構を流用）
- `endless.js`: `worldEnvironmentManager`の生成・配線。`_handleMapNodeSelected()`（Layer移動＝Depth進行のタイミング）で`setCurrentEnvironment(depth)`を呼び、変化時のみHUD演出を出す。常時表示の小型バッジ（ENDLESS HUD内「ZONE」欄・MAP画面ヘッダー内`mapWorldEnvLabel`）を新設し、CSS変数`--world-env-color`へ`uiColor`を反映する簡易Visual Theme Framework
- `index.html`: ENDLESS HUDへの「ZONE」バッジ・MAP画面ヘッダーへの小型Layer/Environment表示・Environment HUDオーバーレイ・関連CSSを追加

**重要な設計判断（要求仕様に無く、こちらで決めた点）**:
- ここでの「Layer」は既存の`puzzleTier.js`が持つ4段階Tier（難易度用の粗い区分）とは別物で、RUN内のDepthそのものを指す、5Layerごとに見た目が切り替わるための、より細かい粒度として扱った（要求仕様の「Layer1/6/11/16/21」という区切り方が既存Tier境界と一致しないため独立させた）
- Layer26以降の「ランダム」は、Layerが変わるたびに再抽選すると見た目が毎回チカチカ変わってしまうため、5Layerごとのバンド単位（`Math.floor((layer-26)/5)`をハッシュのシードにする決定的選出）で固定し、Layer1-25までと同じ「5Layer保持される」体感速度に揃えた
- UNKNOWN DIMENSIONの`unlockCondition`は`{type:'layer', value:26}`とし、「Layer26以降のランダムプールに入るタイミング」と「Achievementや他のArchive系と同じ解放の概念で扱えるようにするタイミング」を意図的に一致させた
- HUD演出の「フェードアウト」は、このプロジェクトの`.hidden`が`display:none`固定でCSSトランジションが効かないため、既存のLEVEL UP/Discovery演出と同じ「一定時間（約2秒）後に自動で消える」形で実現している（新しいCSSトランジション機構は追加していない）
- Visual Theme Framework（セクション7）は要求仕様どおり「簡易実装」とし、Canvas演出（`theme.js`のネオンAIテーマ背景）自体には一切手を加えず、CSS変数`--world-env-color`によるHUD/バッジの色味変更のみに留めた
- BGM Integration Hook（セクション8）は要求仕様どおり`getBgmId()`の値を取得可能にするだけで、`sound.js`側の再生ロジックには接続していない

**テスト**: jsdomで実サーバー配信のHTML/JSに対する統合テストを実施（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）。要求仕様セクション11の動作確認フロー（①ゲーム開始→②Research Map表示→③Layer移動→④Environment表示→⑤LayerごとのEnvironment変化→⑥Save→⑦Reload→⑧Environment状態復元）を実際のコード経路で通し、Layer1-25の固定対応10パターン全て、Layer26以降のバンド単位の決定性、実RUNでのバッジ/CSS変数反映、新規`EndlessSaveStore`インスタンスでの永続化復元、`unlockEnvironment`/`isUnlocked`のAPI、旧形式（STEP30-1のフィールドを持たない）セーブデータからのマイグレーション、既存のSTAGE SELECT等への無影響を含めて計42項目を検証、全項目PASS・ランタイムエラー無し。

## STEP30-2: Environment Modifier System

STEP30-1で追加したWorldEnvironment（見た目テーマのみ）を、実際にPuzzle/Reward/Protocol/Map/Unknown/Riskへ影響するシステムへ拡張する要求仕様（STEP30-2）に基づき実装した。既存のENDLESS RESEARCHのPuzzle生成・スコア計算・Protocol/Identity等の各システムは一切破壊せず、それぞれの既存計算式へ「Environment Modifier」という新しい乗算/加算項を追加する形にしている。

**新規ファイル**:
- `src/endless/environmentModifierManager.js` — 要求仕様セクション2の全API（`getActiveModifiers()`/`getModifierValue(type)`/`applyPuzzleModifier(data)`/`applyRewardModifier(data)`/`applyProtocolModifier(data)`）に加え、map/risk向けの補助getter（`getNodeWeightMultiplier`/`getExtraLabChance`/`getLifeRecoveryBonus`/`getRiskChainBonusMultiplier`/`getRareEventWeightBoost`/`getUnknownSuccessBoost`）を実装。状態は持たずworldEnvironmentManagerへ委譲する「Modifier Calculation Layer」（要求仕様セクション8）そのもの

**既存ファイルの変更**:
- `worldEnvironment.js`: 6種それぞれに`modifiers[]`（3種ずつ、計18種）を追加。UNKNOWN DIMENSIONの"Random Modifier"は既存の「Unstable System」Research Environment（environments.js）と同じ設計思想で、`type:'randomModifier'`としてenvironmentModifierManager.js側が呼ばれるたびに他Environmentから無作為に1つ実体を借用する
- `unknownEvents.js`: `pickEvent(currentRank, opts)`に`{rareBoost, successBoost}`の重み補正オプションを追加（省略時は全件重み1の完全一様抽選＝既存挙動と完全に同一、後方互換）
- `mapGenerator.js`: `generateChoices()`に5番目の引数`environmentModifierManager`を追加。Map Node抽選の重み（puzzle/event/elite/recovery/unknown）へ`nodeWeightMultiplier_*`を乗算し、NEURAL FORESTの「Research Lab Spawn +15%」は既存の周期出現ルール（3Depthごと）とは独立に追加候補として上乗せする
- `endlessGame.js`（EndlessRoundController）: `environmentModifierManager`を受け取り、制限時間（FRACTAL COREの「Puzzle Difficulty +25%」）とHINT開示マス数（DIGITAL GRIDの「Puzzle Hint Effect +1」、既存のhintRevealBonusキーへ合算）へ反映
- `mapUI.js`: Unknown Node解析確率へDIGITAL GRIDの「AI Prediction Accuracy +10%」を合算。新規「ENVIRONMENT ANALYSIS」パネル（要求仕様セクション7）を追加し、現在Environment名とActive Modifier名一覧を表示する
- `endlessSave.js`: `discoveredEnvironmentModifiers`を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった
- `endless.js`: environmentModifierManagerの生成・各所への配線。Reward計算（FRACTAL COREの「Reward +40%」・DATA OCEANの「Research Data +20%」）・Risk Chain倍率（FRACTAL COREの「Risk Chain Bonus +20%」）・Protocol Fragment獲得量（QUANTUM NETWORK/DATA OCEANの「Protocol Fragment +10%/+30%」）・Recovery Node回復量（NEURAL FORESTの「Life Recovery +1」）・Unknown Node解決の重み（QUANTUM NETWORKの「Rare Reward +20%」/NEURAL FORESTの「Unknown Analysis Success +10%」）へ反映。Layer移動のたびにActive Modifierを発見済みとして記録する

**重要な設計判断（要求仕様に無く、こちらで決めた点）**:
- FRACTAL COREの「Puzzle Difficulty +25%」は、既存のTier/emptyRatio（実測ベースで安全域が厳密にチューニング済み、puzzleTier.js参照）を直接動かすと生成タイムアウトのリスクがあるため、代わりに制限時間を短縮する既存の仕組み（Elite Nodeの Time Pressure Modifierが使う`timeLimitMultiplierScale`と同じレバー）に乗せて「実質的な難易度上昇」を実現した。要求仕様の例（Base Difficulty5→Final6.25）が想定する連続的な難易度スケールは、このゲームの離散的なTier/疎密度システムには存在しないため、この解釈に置き換えている
- QUANTUM NETWORKの「Reward Prediction Accuracy -15%」とUNKNOWN DIMENSIONの「AI Confidence -50%」は、aiAnalysis.js（STEP27）の決定的な計算式そのものへ手を加えるのは侵襲的すぎると判断し、ENVIRONMENT ANALYSISパネルでの表示専用（`getActiveModifiers()`で値は取得可能）に留めた。要求仕様セクション7の例自体も「Active Effectsの一覧表示」を求めているのみで、既存AI Analysis Panelの数値計算自体の変更は要求していない
- QUANTUM NETWORKの「Rare Reward +20%」とUNKNOWN DIMENSIONの「Rare Event Chance +50%」は、どちらも「特定の抽選結果が出やすくなる」効果のため、前者はunknownEvents.pickEvent()のrare_upgrade重み補正、後者はmapGenerator.jsのevent Node出現重み補正という、それぞれ最も近い既存の抽選ロジックへ接続した
- NEURAL FORESTの「Research Lab Spawn +15%」は、Research Lab Nodeが元々「3Depthごとに必ず1枠出現する」周期ルール（重み抽選の対象外）のため、周期ルール自体は変更せず「対象外Depthでも15%の確率で追加の候補として出現する」という上乗せ方式にした
- Random Modifierの解決は、呼ぶたびに`Math.random()`で無作為に再抽選する設計にした（「Random」という名前どおりの毎回変わる挙動を優先し、決定的キャッシュは行わない）

**テスト**: jsdomで実サーバー配信のHTML/JSに対する統合テストを実施（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）。要求仕様セクション12の確認フロー（①Layer到達→②Environment確認→③Modifier表示→④Puzzle開始→⑤補正確認→⑥Reward取得→⑦Protocol取得→⑧Save）を実際のコード経路で通し、6環境×3Modifierの定義完全性、各Modifierの数値計算（`applyPuzzleModifier`/`applyRewardModifier`/`applyProtocolModifier`の入出力）、Random Modifierの解決、`unknownEvents.pickEvent`の重み付け抽選を統計的に確認、実RUNで21Layer（Layer1のDIGITAL GRIDからLayer21のFRACTAL CORE）まで実際にPuzzleを解いて進行させ、ENVIRONMENT ANALYSISパネルの表示・FRACTAL CORE到達時の制限時間短縮の実測値・Reward/Protocol Fragment増加・Save/Reload後の状態復元・旧形式セーブのマイグレーション・既存のSTAGE SELECT等への無影響を含めて計42項目を検証、全項目PASS。

## STEP30-3: Environment Visual / HUD Evolution

STEP30-1/30-2で追加したWorldEnvironmentを「内部データ」から「プレイヤーが現在探索している研究領域として認識できるUI・演出」へ拡張する要求仕様（STEP30-3）に基づき実装した。Puzzle Generator/Reward Logic/Protocol Logicには一切触れず、新規UI/演出モジュールの追加のみで完結させている。

**新規ファイル**（要求仕様セクション10の推奨命名にほぼ準拠。命名衝突を避けるための変更点は後述）:
- `src/endless/environmentLog.js` — AI Research Log（Environmentごとの解析フレーバーテキスト6種）の静的データ
- `src/endless/environmentScan.js`（EnvironmentScan） — Layer開始時、Environmentが実際に変化した瞬間に表示する2段階演出（"SCANNING AREA..."→プログレスバー→"ENVIRONMENT IDENTIFIED"+AI Research Log）。SKIP可能、合計表示時間は約1〜3秒（要求仕様どおり）
- `src/endless/transitionManager.js`（TransitionManager） — Environment変更時、Scanより前に表示する"ENVIRONMENT SHIFT / Previous→New / Synchronizing..."演出。RUN最初のLayer（比較対象が無い）ではスキップされる
- `src/endless/environmentHud.js`（EnvironmentHUD） — 常時表示のリッチHUDパネル（LAYER/Environment名/World Status/Active Modifier一覧）のDOM描画のみを担当
- `src/endless/environmentRenderer.js`（EnvironmentRenderer） — Environmentごとの軽量CSSアニメーション背景（Theme Animation）のクラス切り替えと、Performance Control（`performanceMode`: high/normal/low）を担当
- `src/endless/worldEnvironmentArchive.js`（`WorldEnvironmentArchive`） — Environment Archive Extension。Protocol Archiveとは別に、First Discovery Layer・Effects一覧を表示する専用画面

**命名についての注意**: 要求仕様は新規moduleの例として`EnvironmentHUD.js`等を挙げているが、この命名規則はSTEP30-1で確立した「既存のRUN限定Research Environmentシステム（`environmentArchive.js`/`EnvironmentArchive`）との衝突を避けるためWorldEnvironment系は`World`を冠する」という方針を踏襲する必要があった。そのためArchive画面のみ`WorldEnvironmentArchive`とし、画面id/ボタンも既存の`screen-environmentarchive`/`environmentArchiveBtn`とは別の`screen-worldenvarchive`/`worldEnvArchiveModeSelectBtn`にしている（他の新規moduleは既存名と衝突しないためそのままの命名を採用した）。

**既存ファイルの変更**:
- `worldEnvironment.js`: 各定義へ`icon`（絵文字1文字）を追加（Research Map Node表示・Archive表示用）
- `endlessSave.js`: `environmentDiscoveryLog`（Environmentごとの初回発見Layer番号）・`environmentVisitHistory`（直近100件の訪問履歴）・`performanceMode`（既定値'normal'）を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった
- `mapUI.js`: 各Map Nodeカードへ現在Environmentのアイコン+名前タグを追加（要求仕様セクション7）
- `ui.js`/`animation.js`: STEP30-1で追加した簡易な2秒ポップアップ`showEnvironmentHud`を削除し、より上位互換のEnvironment Scan Sequence（environmentScan.js）へ完全に置き換えた
- `endless.js`: environmentScan/transitionManager/environmentHud/environmentRenderer/worldEnvironmentArchiveの生成・配線。`_handleMapNodeSelected()`を、Environmentが変化した時のみ「Transition→Scan→Puzzle/Node開始」の順で演出を挟む非同期フロー（コールバックチェーン）に再構成。Event Node発生時にもAI Research Logの1文をトーストへ追記。MODE SELECTに🌍World Environment Archiveボタン・PERFORMANCE（high/normal/low巡回）ボタンを追加
- `index.html`: Environment Scanオーバーレイ・Transitionオーバーレイ・常時表示Environment HUDパネル（`position:fixed`でGAME/MAP両画面に重ねて表示）・Environment Theme Animation用の背景レイヤー（`#environmentThemeLayer`/`#mapEnvironmentThemeLayer`、6環境分のCSS keyframes+`perf-low`での無効化）・World Environment Archive画面・関連CSS一式を追加

**重要な設計判断（要求仕様に無く、こちらで決めた点）**:
- 要求仕様のフロー図（セクション1「Layer Change→Environment Scan→Analysis Complete→Puzzle Start」）は字面上「Layer移動のたびに毎回Scanを挟む」とも読めるが、5Layerごとにしか環境が変わらない現行仕様でこれを字義どおり実装すると、既存のテンポの良い進行体験（数十秒に1回のPuzzle開始のたびに2秒超の演出が強制される）を大きく損なう。これはアーキテクチャルール「既存ゲーム処理を変更しない」の趣旨に反すると判断し、STEP30-1で既に確立していた「Environmentが実際に変化した時のみ」という判定をそのまま踏襲した。ただしこの判定は「RUNをまたいだ保存済みの前回値」ではなく「このRUN内で直前に表示していたEnvironment」との比較に修正した（新規RUNのLayer1が偶然、保存済みの前回値と同じEnvironmentだった場合でも、RUN開始直後には必ずScanを1回表示するため）
- Environment Theme Animation（セクション3）は「既存Canvas/CSS構造を利用する」という指示を、新しいJS描画ループ（`requestAnimationFrame`等）を追加せず、既存の`theme.js`（ネオンAIテーマの全画面共通canvas背景）はそのまま維持しつつ、ENDLESS RESEARCH中の画面にだけ重ねる軽量なCSS keyframesアニメーション層として実現した。パフォーマンスコストがゼロに近いため、Performance Control（セクション4）の「high/normal」は現時点で描画内容を区別せず、「low」でのみ`perf-low`クラスによりアニメーション・不透明度をOFFにする設計にした（high/normalの差別化は将来の拡張余地としてREADMEに明記するに留めた）
- World Statusの表示（セクション2「STABILITY: STABLE」）は、Stability変化システム自体がSTEP30-1〜30-2のどちらでも実装されていない（STEP30-1要求仕様で明示的に将来ステップへ先送りされていた）ため、常に固定値"STABLE"を表示するプレースホルダーとした
- Environment Transitionの「Previous」は、RUN最初のLayerでは存在しない（比較対象が無い）ため、その場合はTransition演出自体をスキップしてScan演出へ直接進む設計にした

**テスト**: jsdomで実サーバー配信のHTML/JSに対する統合テストを実施（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）。要求仕様セクション11の確認フロー（①Run開始→②Environment Scan表示→③Puzzle開始→④HUD表示確認→⑤Layer移動→⑥Environment変更→⑦Transition表示→⑧Archive更新→⑨Save/Load確認）を実際のコード経路で通し、AI Research Log・全環境のicon定義・Performance Control・Scan Sequenceの2段階演出とSKIP・常時HUD表示（Layer/Environment名/STABLE/Active Modifier一覧）・Theme Animation背景クラスの反映・Layer1→Layer6でのenv_grid→env_network実移行（`TransitionManager.show()`の実際の呼び出しをスパイして確認）・World Environment ArchiveでのFirst Discovery Layer/Effects表示・未発見Environmentの???表示・Save/Reload後の状態復元・旧形式セーブのマイグレーション・既存のSTAGE SELECT等への無影響を含めて計48項目を検証、全項目PASS。**テスト実装上の教訓**: このテストで最初「Transition overlayがhiddenクラスを持つかどうか」をポーリングして検出しようとしたところ、オーバーレイの表示→SKIP完了が同じ`advanceOneLayer()`呼び出し内の同期処理で完結してしまい、外側のポーリングタイミングでは既に非表示に戻っていて検出できなかった（false negativeになりかけた）。`TransitionManager.show()`自体をスパイ（元の関数をラップして呼び出し回数を記録）する方式に切り替えて解決した。UIの一時的な表示/非表示を伴う演出系のテストでは、DOM状態のポーリングよりも関数呼び出しのスパイの方が確実というのは、今後もこのプロジェクトで再利用できる教訓。

## STEP30-4: World Stability System

Research World全体に「安定度」という状態パラメータを追加し、プレイヤーの探索行動によって世界状態が変化する基盤を作る要求仕様（STEP30-4）に基づき実装した。要求仕様どおり今回はWorld Mutation発生・Environment変更・Hidden Layer生成は実装せず、Stability管理・状態判定・HUD表示・AI分析連携・Save対応のみに留めている。

**新規ファイル**:
- `src/endless/worldState.js` — WorldStateデータの初期値（stability=100/mutationLevel=0/instabilityCount=0/lastMutation=null/history=[]）とStatus判定（`getStatusForStability()`: 100〜80=STABLE/80〜50=UNSTABLE/50〜20=CRITICAL/20〜0=COLLAPSE、境界値は下限側に含める形で統一）の純粋データ＋ヘルパーのみを持つ
- `src/endless/worldStabilityManager.js` — 要求仕様セクション2の全API（`getStability()`/`increaseStability(value)`/`decreaseStability(value)`/`getStatus()`/`getWorldState()`/`checkMutation()`）に加え、セクション5「Environment連携準備」用の`getEnvironmentStatusKey(environmentId)`（例: `"env_ocean:CRITICAL"`）、セクション8「Reward System Hook」用の`getWorldRewardModifier()`（今回は常に`1.0`固定）を実装

**既存ファイルの変更**:
- `endlessSave.js`: `worldStability`（直近スナップショット、初期値100）・`worldMutationLevel`（初期値0）・`worldInstabilityCount`・`worldLastMutation`（初期値null）・`worldHistory`（直近100件）を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった
- `environmentLog.js`: セクション7「AI Research Log Integration」。World Status別のメッセージ4種（STABLE/UNSTABLE/CRITICAL/COLLAPSE）を追加
- `environmentHud.js`: セクション6「HUD Integration」。WORLD STABILITYバー・パーセント・STATUS表示を追加し、StatusごとにHUD全体の縁の色も変化させる（STABLE=緑〜COLLAPSE=赤）
- `environmentScan.js`: `show(envDef, worldStatus, onComplete)`に第2引数を追加し、"ENVIRONMENT IDENTIFIED"の下にWorld Status別ログも表示するようにした（第2引数を省略する既存の呼び出し方＝STEP30-3までとも互換を保っている）
- `endless.js`: worldStabilityManagerの生成・配線。要求仕様セクション3のStability変化イベント全てを実際のゲームプレイ箇所へ接続: Unknown Node解析-5（`_resolveUnknownNode`）・Unknown Dimension進入-15（`_handleMapNodeSelected`でEnvironmentがenv_unknownへ変化した瞬間）・Risk Chain継続-2（`_registerRiskChain`でChainレベルが上昇した瞬間）・Research Lab+10（`_enterNode`のresearch_labケース）・Safe Node+3（`_handleRecoveryNode`）・Extract成功+5（`_handleExtractReturn`）。RUN開始時に`reset()`で必ず100へ戻す

**重要な設計判断（要求仕様に無く、こちらで決めた点）**:
- `stability`自体はworldEnvironment.jsの`currentWorldEnvironmentId`と同じ設計判断で「RUNごとにリセットされる今RUNの現在値」として扱い、`mutationLevel`/`instabilityCount`/`history`はRUNをまたいで蓄積する生涯データとして扱った。要求仕様セクション9は「stability/mutationLevel/historyを保存」としか書いていないが、動作確認フロー（セクション12「①New Run開始→②Stability100確認」）が明確に「新規RUNでは100から始まる」ことを求めているため、この2つの性質を両立させる設計にした。実装中に発見した細部の一貫性改善として、`WorldStabilityManager`のコンストラクタは（当初は常に100固定で初期化していたが）`worldEnvironmentManager.getCurrentEnvironment()`と同じく直近の保存済みスナップショットを初期値として引き継ぐよう修正した（新規RUN開始時は必ず`reset()`で100に戻すため実プレイ上の見た目は変わらないが、設計の一貫性のため）
- 「Unknown Dimension進入」-15は、Node種類の「Unknown Node」（Research Map上の"???"）ではなく、Environment名の「UNKNOWN DIMENSION」（Layerに紐づく見た目テーマ、STEP30-1参照）を指すという要求仕様の用語を正しく区別し、`_handleMapNodeSelected`でEnvironmentがenv_unknownへ実際に切り替わった瞬間（`changedThisRun`）にのみ発火させた
- 「Safe Node」は要求仕様に定義が無かったため、8種のMap Node中もっともリスクが低い（`nodeTypes.js`のrisk値が最小の）Recovery Nodeとして解釈した
- 「Risk Chain継続」-2は、Risk Chainのレベルが実際に上昇した（＝高危険Nodeを連続選択した）瞬間にのみ発火させ、レベル維持・リセット時には発火しない設計にした
- 「Mutation Event用予約」-10は、World Mutation自体がSTEP30-5以降の実装対象で今回は発生イベントが存在しないため、定数として値だけ定義し、実際に呼び出す箇所は用意していない
- Environment Scanの`show()`シグネチャに第2引数`worldStatus`を追加する際、既存の`show(envDef, onComplete)`という2引数呼び出し（STEP30-3で書いたコード）を壊さないよう、第2引数が関数かどうかで分岐する後方互換処理を入れた

**テスト**: jsdomで実サーバー配信のHTML/JSに対する統合テストを実施（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）。要求仕様セクション12の確認フロー（①New Run開始→②Stability100確認→③Unknown Node選択→④Stability低下確認→⑤Research Lab選択→⑥回復確認→⑦HUD表示確認→⑧Save/Load確認）を実際のコード経路で通し、Status判定の全境界値・`WorldStabilityManager`の増減/クランプ/履歴記録/生涯データ分離・`checkMutation()`/`getWorldRewardModifier()`のプレースホルダー値・`getEnvironmentStatusKey()`・HUDのバー幅/パーセント/Status文字列/縁色反映・Environment ScanオーバーレイへのStatus別ログ表示・Save/Reload後の状態復元・旧形式セーブのマイグレーションを含めて計54項目を検証、全項目PASS。**テスト中に発見した罠**: `UnknownEvents.pickEvent()`は7種の結果からランダムに1つを返すため、Unknown Node解析の単体効果（-5）だけを検証しようとしても、たまたま`elite_shift`が選ばれるとElite Nodeへ再帰してRisk Chain継続の-2も追加でかかってしまい、期待値と実際の値が食い違うことがあった（STEP27テスト時と同じ「pickEventを一時的に固定する」手法で解決）。また`getWorldHistory()`は新しい順（reverse）で返る仕様のため、「最初に記録したエントリ」を検証する際は配列の先頭ではなく末尾を見る必要がある点もテスト実装時に踏んだ落とし穴。

## ENDLESS RESEARCH: HINT使用時のライフ消費

ユーザーからの直接要望（「ヒントを使ったらライフが減る仕様を追加して」）に基づき実装した。**ENDLESS RESEARCHモードのみが対象**（通常ステージ/チュートリアル/Daily Puzzleにはライフの概念自体が存在しないため対象外）。ユーザーへの事前確認で、HINT1回使用あたり-1ライフ・Analyzerアップグレード等による複数マス同時開示でも常に1回分のみ・AI Prediction Protocolによる自動HINT発動も同様に消費する、という仕様を確定させた。

**変更ファイル**:
- `endlessGame.js`（EndlessRoundController）: `onHintUsed`コールバックを新設し、`handleHint()`が実際に1マス以上開示できた瞬間（開示マス数に関わらず1回だけ）に呼び出す。手動HINT・AI Prediction Protocolの自動発動はどちらも同じ`handleHint()`を経由するため、この1箇所の変更だけで両方に反映される
- `endless.js`: `this.round.onHintUsed = () => this._handleHintUsed();`で配線。新設した`_handleHintUsed()`がライフを1減らし、既存の`_handleRoundTimeout()`と同じ考え方でライフ切れ処理を行う

**重要な設計判断（ライフ切れとPuzzleクリアが同時に起こる際の競合回避）**:
- HINTでのライフ消費は、既存の「ミス（タイムアップ）でライフが減る」仕組みと違い、Puzzle攻略の**途中**でライフが尽きうる（既存のライフ変化は全てラウンドの区切り＝クリア/タイムアップのタイミングでしか起きなかった）という、このゲームで初めてのケースになる。特に「HINTがちょうど最後のマスを開示してPuzzleをクリアさせ、かつそのHINTでライフが0になる」という同時発生を、`_handleRoundClear()`・`_endRun()`・RUN終了タイマー（`_advanceTimer`）の二重発火・競合無しに処理する必要があった
- 解決策として、`_handleHintUsed()`内では**Puzzleがまだクリアされていない場合のみ**その場でRUN終了処理（Phoenix Protocol所持時は復活）を行い、Puzzleが同じHINTでクリア済みの場合は何もせず`_handleRoundClear()`側の末尾に新設したライフ0チェックへ判定を委ねる（クリア報酬を正しく加算してからRUNを終える）、という一方通行の分岐にした。どちらか一方の経路だけが必ずRUN終了を担当するため、`_advanceTimer`の奪い合いによる二重処理は起きない
- 既存のPhoenix Protocol（Rare Upgrade、ライフ0の瞬間に1度だけ復活）・Emergency Recovery（researchTree.js、初回ミス限定の軽減）との関係は、HINT起因のライフ0もPhoenix Protocolの復活対象に含めた（プレイヤーから見て「ライフが0になった」という体験は原因を問わず一貫させるべきと判断）一方、Emergency Recoveryは名称・既存コメントどおり「ミス（タイムアップ）」専用の軽減のため、HINT起因の消費には適用していない

**テスト**: jsdomで実サーバー配信のHTML/JSに対する統合テストを実施（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）。通常のHINT使用でライフが正確に1減ること、Analyzerアップグレード相当の複数マス開示でも消費が1のままであること、開示するマスが無い空振りHINTでは消費されないこと、ライフ1の状態でHINTを使い（Puzzle未クリアのまま）ライフ0でRUNが終了しRESULT画面が表示されること、Phoenix Protocol所持時はRUN終了の代わりにライフ1で復活し以後は消費済みになること、「クリアと同時にライフ0になる」ケースでもクリア報酬が正しく加算されてからRUNが終了すること、通常ステージ/チュートリアルにはライフの概念が無く既存のHINT動作が無変更であることを含めて計15項目を検証、全項目PASS。**テスト実装上の注意**: このテストでは前のRUNの`round.puzzle`/`game.cleared`が次のRUN開始直後も一時的に残留するため、「新しいPuzzleに到達したか」の判定は`round.puzzle`の有無だけでなく`!game.cleared`と`screen-game`のアクティブ状態も合わせて確認する必要があった（本番コードの不具合ではなく、テストヘルパー側の判定不足だった）。

## ENDLESS RESEARCH: 情報系オーバーレイの自動送りを廃止し「続ける」ボタン必須化

ユーザーからの直接要望（「トースト表示したとき、SKIPボタンではなく続けるボタンに変更して。トーストが消えるのが速すぎて読めない。続けるボタンをクリックするまで先に進まないようにして」）に基づき実装した。事前確認で対象範囲を確定: **情報量が多く読む必要がある演出系オーバーレイのみ**（Environment Scan・Environment Transition・Node Result〈Recovery/Event結果〉）が対象。DEPTH CLEAR等のプレイ中に毎回出る短い一行トースト（`ui.showToast`、1.6秒で自動的に消える）は対象外のまま維持した。

**変更ファイル**:
- `environmentScan.js`: Phase2「ENVIRONMENT IDENTIFIED」の自動完了タイマー（`IDENTIFIED_DURATION_MS`）を削除。Phase1「SCANNING AREA...」のプログレスバー演出（読む情報が無い純粋な演出のため）はそのまま自動でPhase2へ遷移させ、Phase2以降は「続ける」ボタンのクリックのみで完了するようにした
- `transitionManager.js`: オーバーレイを自動で閉じるタイマー（`TRANSITION_DURATION_MS`後の`_complete()`呼び出し）を削除。プログレスバーの進行アニメーション自体は演出として自動で100%まで走るが、オーバーレイは「続ける」ボタンのクリックまで閉じない
- `ui.js`: `showNodeResult()`から`autoAdvanceMs`パラメータと関連タイマーを削除し、常に「つづける」ボタンのクリックのみで次へ進むようにした
- `endless.js`: `showNodeResult()`の3箇所の呼び出しから`autoAdvanceMs: NODE_RESULT_AUTO_ADVANCE_MS`を削除し、未使用になった定数`NODE_RESULT_AUTO_ADVANCE_MS`を削除した
- `index.html`: `environmentScanSkipBtn`/`environmentTransitionSkipBtn`のボタン文言を「SKIP」から「続ける」に変更（要素id自体は変更していない）

**テスト**: jsdomで実サーバー配信のHTML/JSに対する統合テストを実施（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）。Environment Scanオーバーレイが（旧・約2.2秒だった）3秒待っても自動的には消えず、その間Puzzle/Node開始がブロックされたままであること、「続ける」クリックで初めて進行すること、Node Resultオーバーレイも同様に3秒待っても背後の画面が切り替わらず「つづける」クリックで初めてMAP画面に進むこと、実際のRUNでLayer6まで進めてTransition/Scanの両方を正しくクリックで通過できること、ボタン文言が両方とも「続ける」になっていること、既存のSTAGE SELECT等への無影響を含めて計17項目を検証、全項目PASS。

## STEP30-5: World Mutation Trigger System

World Stabilityの低下によってResearch World自体が変質する「Mutation」システムを追加する要求仕様（STEP30-5）に基づき実装した。Environment→Modifier→Stability→Mutationという一連のパイプラインの最終段。Puzzle Generator/Save System全面変更は行わず、新規moduleの追加とAdditive（加算/乗算）な効果適用のみで完結させている。

**新規ファイル**:
- `src/endless/mutationData.js`（MutationData） — 6種のMutation定義（Minor: DATA STORM/SIGNAL NOISE、Major: FRACTAL OVERFLOW/NEURAL INFECTION/QUANTUM COLLAPSE、Collapse: REALITY BREAK）とLevel 0〜3ラベル、Trigger閾値（60/30/10）の静的データ
- `src/endless/worldMutationManager.js`（WorldMutationManager） — 要求仕様セクション1の全API（`checkMutationTrigger()`/`triggerMutation(type)`/`getActiveMutation()`/`clearMutation()`/`getMutationHistory()`）に加え、Environment Integration用`getEnvironmentState()`/`getDisplayEnvironmentName()`、Reward Integration Hook用`getMutationRewardModifier()`、各効果getter群を実装
- `src/endless/mutationRenderer.js`（MutationRenderer） — Mutation Visual Sequence（SYSTEM WARNING→処理→WORLD MUTATION Complete）とMutation Choice Event（① Stabilize/② Exploit）のDOM描画。直近のユーザーフィードバック「トーストが消えるのが速すぎて読めない」を踏まえ、読む情報がある2段階（Warning/Complete）は自動では進まず「続ける」ボタンのクリックを待つ設計にした

**checkMutationTrigger()とtriggerMutation()を意図的に分離した設計**: 前者は現在の状況が発生条件を満たすかの「確認」のみ行い副作用を持たない、後者は実際にMutationを「発生」させる副作用を持つ。これによりendless.js側で「Level1/2はMutation Choice Eventを挟んでからtriggerMutation()を呼ぶ、Level3は問答無用でtriggerMutation()を呼ぶ」という要求仕様セクション7・11の分岐を自然に実装できた。

**既存ファイルの変更**:
- `endlessSave.js`: `activeMutation`/`mutationLevel`/`mutationHistory`を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった
- `environmentHud.js`: 「MUTATION: {NAME}」行を追加（Mutation未発生時は非表示）
- `mapGenerator.js`: `generateChoices()`に6番目の引数`worldMutationManager`を追加。QUANTUM COLLAPSEの追加候補・Elite重み、REALITY BREAKのUnknown重みをMap Node抽選へ反映
- `endlessGame.js`（EndlessRoundController）: `worldMutationManager`を受け取り、FRACTAL OVERFLOWの「Puzzle Difficulty +30%」を既存のPuzzle Difficulty同様「制限時間短縮」として適用
- `researchMap.js`: 履歴パネルへWorld Mutation History（Archive Integration、要求仕様セクション14）を追加表示
- `endless.js`: worldMutationManager/mutationRendererの生成・配線。Layer移動のたびにMutation持続ターンを消費し（`tickDuration()`）、Trigger判定を行う。要求仕様セクション4の「追加Trigger」（Unknown Node連続解析/Unknown Dimension到達/高Risk Chain/Special Event）はそれぞれの発生箇所（`_resolveUnknownNode`/Unknown Dimension進入/`_registerRiskChain`/`_applyUnknownEvent`のSystem Corruption・Secret Room）から`_checkMutationTrigger()`を呼ぶ形で実装。Reward/Research Data/Protocol Fragment/Risk Chain倍率の各既存計算式へ`worldMutationManager`の効果を追加で乗算

**重要な設計判断（要求仕様に無く、こちらで決めた点）**:
- 要求仕様セクション4の「追加Trigger」4種には具体的な閾値指定が無かったため、「Stability単体ではまだLevel1に届いていない状況でも、危険な兆候（連続Unknown解析3回・Unknown Dimension到達・Risk Chain4以上・Special Event発生）が重なればLevel1相当の機会を与える」という設計にした（`checkMutationTrigger()`が独立した別の閾値系統を持つのではなく、Stability判定が0だった場合のみ追加条件を見る、というシンプルな優先順位にした）
- Mutation Choice Eventの「① Stabilize」はStability+20してMutationの発生自体を回避し、「② Exploit」は発生を受け入れて報酬+50%・リスク+20%のボーナスが上乗せされる設計にした（要求仕様に具体的な数値指定が無かったため設計）。Collapse Mutation（Level3）は「問答無用で発生」という要求仕様セクション7の記述どおりChoice Eventを挟まない
- `duration`（Mutationの持続Layer数）は要求仕様に具体的な数値指定が無かったため、Minor=3・Major=5・Collapse=99（事実上、Stability回復かExtractまで持続）として設計した
- Environment Integration（要求仕様セクション9）の「DATA OCEAN→CORRUPTED DATA OCEAN」は、実際に別のEnvironmentのModifierへ切り替えるような大掛かりな変更はせず、Mutationごとに定義した`namePrefix`（CORRUPTED/DISTORTED/OVERFLOWING/INFECTED/COLLAPSING/BROKEN）を表示名に付け加えるだけの表示専用効果とした。HUD Integration（要求仕様セクション10）の例が「DATA OCEAN」のままMUTATION行を別掲する構成だったため、HUDの環境名表示自体はプレフィックス無しの素の名前のまま維持し、`getDisplayEnvironmentName()`は将来Archiveの詳細表示等で使う想定の別APIとして用意するに留めた
- NEURAL INFECTIONの「Environment Modifier Random」は、他Environmentのmodifiersから1つを無作為に借用する（既存のResearch Environment「Unstable System」・STEP30-2のRandom Modifierと同じ設計思想）。呼ぶたびに再抽選すると値が不安定になるため、Mutation発生時に一度だけ抽選し持続中は同じ結果を返し続けるようキャッシュした
- Mutation Visual Sequence/Choice Eventのオーバーレイは、Unknown Node解析結果のNode Resultオーバーレイ等より手前に表示する必要がある（同じ操作の中で連続してMutationがトリガーされうるため）ため、他の演出オーバーレイより高いz-indexを与えて正しく積み重なるようにした
- Extract成功（RUN終了直前のタイミング）はMutation Trigger判定の対象から意図的に外した。RUNが終わる直前に新しいMutationを通知しても、その後すぐRESULT画面へ切り替わってしまい実際の効果を体験する機会が無く、要求仕様の意図（プレイを続ける中で世界が変質していく体験）にそぐわないと判断したため

**テスト**: jsdomで実サーバー配信のHTML/JSに対する統合テストを実施（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）。要求仕様セクション16の確認フロー（①Run開始→②Stability低下→③Threshold到達→④Mutation発生→⑤Visual表示→⑥HUD更新→⑦Reward Modifier確認→⑧Save/Load確認）を実際のコード経路で通し、6種Mutationの定義完全性・Level別内訳・Trigger閾値（60/30/10）の境界値・追加Trigger4種・`triggerMutation`/`clearMutation`/`tickDuration`（duration到達での自動解除）・各効果getter（researchDataMultiplier/nodeWeightMultiplier/rewardModifier等）の数値計算・NEURAL INFECTIONのRandom Modifierキャッシュ挙動・Environment State/Display Name・実RUNでのStability低下→Mutation Choice Event（Stabilize/Exploitコールバック）→Exploit選択→Visual Sequence（Warning/Complete両フェーズが自動では消えないこと含む）→HUD反映→Reward Modifier反映→Save/Reload後の状態復元・旧形式セーブのマイグレーション・新規RUNでのリセット・既存のSTAGE SELECT等への無影響を含めて計72項目を検証、全項目PASS。

## STEP30-6: Environment Event System

Environment内で発生する一時的なResearch Event（異常/チャンス）を追加する要求仕様（STEP30-6）に基づき実装した。既存4システムとの役割分担は要求仕様どおり: Environment=常時ルール、Environment Modifier=常時補正、**Environment Event=一時的な異常・チャンス（本STEP）**、World Mutation=世界状態変化。Puzzle Generator/Reward System全面変更・Mutation System直接改造は行わず、新規moduleの追加とAdditive（加算/乗算）な効果適用、および結果配列の事後差し替え（Research Lab強制出現）のみで完結させている。

**新規ファイル**:
- `src/endless/environmentEventData.js`（EnvironmentEventData） — 6 Environment × 2種 + UNKNOWN DIMENSION 1種（Choice Event）の計11種のEvent定義。`{id, name, description, environment, rarity, duration, effects, choices, logMessage}`の静的データ＋`getById`/`getByEnvironment`/`pickForEnvironment`（レア度重み付き抽選）
- `src/endless/environmentEventManager.js`（EnvironmentEventManager） — 要求仕様セクション1の全API（`checkEventTrigger()`/`triggerEvent(id)`/`getActiveEvent()`/`resolveEvent()`/`getEventHistory()`）に加え、Reward Integration Hook用`getEventRewardModifier()`（要求仕様セクション12、初期値1.0）、各効果getter群（`getEventResearchDataMultiplier`/`getEventProtocolFragmentMultiplier`/`getEventHintRevealBonus`/`getEventPuzzleTimeLimitMultiplier`/`getEventRareEventWeightBoost`/`getEventUnknownRevealChanceBonus`）、Instant系効果を判定する`getInstantEffect(type)`/`isChoiceEvent()`、Archive集計用`addRewardContribution()`を実装
- `src/endless/environmentEventPanel.js`（EnvironmentEventPanel） — Event結果表示（`show()`）とChoice表示（`showChoice()`）のDOM描画のみを持つ（mutationRenderer.jsと同じ役割分担）。直近のユーザーフィードバック「トーストが消えるのが速すぎて読めない」を踏まえ、いずれも自動では閉じず「続ける」/YES・NOボタンのクリックを待つ設計にした
- `src/endless/environmentEventArchive.js`（EnvironmentEventArchive） — 要求仕様セクション15のArchive画面。worldEnvironmentArchive.js/protocolArchive.jsと同じ「都度saveを読んで再描画する」設計。要求仕様の推奨module一覧（セクション17）には無いが、既存の全Archive系システム（Protocol/Environment/WorldEnvironment）が同じ構成でArchive画面を持つ一貫性を優先し追加した

**checkEventTrigger()とtriggerEvent()を意図的に分離した設計**: worldMutationManager.jsの`checkMutationTrigger`/`triggerMutation`と同じ設計判断で、前者は副作用無しの確認のみ、後者が実際にEventを「開始」させる副作用を持つ。

**Event発生ルール（要求仕様セクション3）**: Layer開始時（`_afterLayerEnvironmentReady`、Mutation判定完了後）にEnvironment取得→Event抽選→発生、という要求仕様どおりの順序で判定する。発生率は「Normal: 5〜10%」に具体的な単一値の指定が無かったため中央値0.08を採用し、`World Mutation中: 20%`/`World Stability Critical: 15%`は該当条件下でその値まで引き上げる（複数条件が同時に該当する場合は最大値を採用、要求仕様に合成方法の指定が無かったための設計）。

**duration設計（要求仕様に数値指定が無かった箇所）**: 全11種のEventはduration=1で統一した。「一時的」という性質（World Mutationの複数Layer持続とは対照的）を反映した設計判断で、次のLayer移動の`tickDuration()`で自動終了する。Instant系効果（forceLabSpawn等）を持つEventはendless.js側が効果適用と同時に`resolveEvent()`を呼ぶため、tickDuration()を待たず即座に終了する。Passive Modifier系効果（rewardMultiplier等）を持つEventはそのLayerのPuzzle/Node解決を跨いでActiveのままにし、`addRewardContribution()`で実際の増分スコアを積算してもらい、tickDuration()による自動終了時にその積算値をArchiveのbestRewardとして記録する。

**11種のEvent（要求仕様セクション4〜9）**:
- DIGITAL GRID: Grid Optimization（Unknown Node事前解析確率+20%・HINT開示数+1）/ System Scan（次のMap選択でOracle相当の事前表示を1回だけ強制、`mapUI.forceRevealNext()`として実装）
- QUANTUM NETWORK: Signal Interference（Reward Prediction Accuracy -30%・Rare Reward +50%）/ Quantum Echo（直近5件の訪問履歴を表示するのみの情報系Instant効果）
- NEURAL FOREST: Root Connection（次のMap選択候補に必ずResearch Labを1つ含める）/ Neural Growth（ライフ+1）
- DATA OCEAN: Data Storm（Research Data×2・Protocol Fragment+20%）/ Lost Archive（Protocol Fragment+6の即時獲得。「過去のProtocol発見」というフレーバーを、既存のFragment獲得系イベント（unknownEvents.jsのprotocol_fragment等）と同じ実装パターンに落とし込んだ）
- FRACTAL CORE: Fractal Shift（Puzzle Difficulty+15%を既存の「制限時間短縮」レバーで適用・Reward+50%）/ Recursive Loop（Research Data+150の即時獲得。「同一Puzzle再挑戦可能」は既存アーキテクチャに再挑戦機構が無く、architecture rule「Puzzle Generator全面変更禁止」に抵触するため、フレーバーを保ったまま数値ボーナスへ単純化した設計判断）
- UNKNOWN DIMENSION: Unknown Signal（Choice Event。YES=Rare Protocol取得試行+Research Data+300+Stability-10、NO=安全終了）。「Rare Protocol」は既存のProtocol Signal（`protocolManager.merge()`）と同じ経路で、未所持かつSlotに空きがあるProtocolを1つ付与する。空きが無い場合はProtocol Fragment+8で代替する（`_applyBossShortcut`の代替報酬と同じ設計判断）

**既存ファイルの変更**:
- `endlessSave.js`: `activeEnvironmentEvent`/`environmentEventHistory`/`discoveredEnvironmentEvents`/`environmentEventArchive`を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった
- `endless.js`: environmentEventManager/environmentEventPanel/environmentEventArchiveの生成・配線。`_afterLayerEnvironmentReady`でMutation判定完了後にEvent持続ターン消費(`tickDuration()`)→Event Trigger判定(`_checkEnvironmentEventTrigger`)を追加。新設した`_applyEnvironmentEventEffect()`（Instant系効果の即時適用）・`_resolveEnvironmentEventChoice()`（Unknown Signalの選択確定）・`_grantRareProtocol()`（Rare Protocol付与）を実装。Reward System Integration（要求仕様セクション12）として`_handleRoundClear()`のreward/researchData計算へ`getEventRewardModifier()`/`getEventResearchDataMultiplier()`を独立に乗算し、実際の増分を`addRewardContribution()`で積算する配線を追加。`_gainProtocolFragments()`/`_resolveUnknownNode()`（rareBoost合算）にも同様に配線
- `endlessGame.js`（EndlessRoundController）: `environmentEventManager`を受け取り、Fractal ShiftのPuzzle Difficultyを既存の「制限時間短縮」レバーで、Grid OptimizationのHINT開示数ボーナスを既存の`hintRevealBonus`集計へそれぞれ独立に合算
- `mapUI.js`: `environmentEventManager`を受け取り、Grid OptimizationのUnknown Node事前解析確率ボーナスを既存の集計へ合算。System Scanの「次Node情報表示」用に、次の`show()`1回だけOracle相当の表示を強制する`forceRevealNext()`を新設
- `mapGenerator.js`: 変更なし（Root Connectionの強制Research Lab出現は、`endless.js`側で`generateChoices()`の戻り値を事後的に1枠差し替えるだけで実現し、生成アルゴリズム自体には手を加えていない）

**テスト**: 2段階で実施した。①jsdom不要のNode.js単体テスト（EnvironmentEventData/EnvironmentEventManagerをwindowレルム内で読み込み、mockのsave/worldEnvironmentManagerを注入して直接検証）で、Event定義完全性（Environment別2種+Unknown1種、Choice/非Choiceの区別）・`pickForEnvironment`のEnvironment一致性・`checkEventTrigger`の発生率3パターン（Normal/Mutation中/Stability Critical、`window.Math.random`を固定して境界値を検証）・`triggerEvent`→`getActiveEvent`→`resolveEvent`のライフサイクル・各効果getterの数値計算・`tickDuration`によるduration=1の自動終了・実`EndlessSaveStore`での永続化と旧形式セーブからのマイグレーションを含め計51項目、全PASS。②jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）で、要求仕様セクション18のTest Flow（①Run開始→②Layer移動→③Event抽選→④Event表示→⑤Choice選択→⑥Effect適用→⑦Reward確認→⑧Archive保存→⑨Save/Load確認）を実際のコード経路で通し、Identity/Protocol/Environment Select→RUN初期化→Layer1移動→Transition/Scan演出→強制発生させたRoot Connection Eventの表示・Instant効果適用（Research Lab強制出現の実際の反映）・Passive Modifier系Event（Fractal Shift）の`_handleRoundClear()`実行によるスコア増加とArchive記録・Choice Event（Unknown Signal）のYES選択によるResearch Data/Stability/Rare Protocol効果の実反映・Archive画面表示（11種全件・発見済み/未発見の区別）・MODE SELECTからの導線・別インスタンスでのSave/Reload後の状態復元・既存のSTAGE SELECT/TITLE等への無影響を含め計47項目、全PASS（テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**未実装/既知の制約**: Quantum Echo/System Scanの情報表示は簡易な文字列/1回限りのフラグのみで、専用の演出UIは無い。Lost Archive/Recursive Loopの効果は要求仕様のフレーバー（「過去のProtocol発見」「同一Puzzle再挑戦」）を数値ボーナスへ単純化しており、フレーバーどおりの再現ではない。

## STEP30-7: Hidden Environment System

通常のWorldEnvironment（Layerに紐づく常時テーマ）とは別に、特定の達成条件を満たした時だけアクセスできる「隠しEnvironment」6種を追加する要求仕様（STEP30-7）に基づき実装した。「通常プレイでは滅多に見つからない、探索・収集・やり込み要素」という目的どおり、解放（初回発見）と再訪（低確率抽選）を明確に分離する二段構えの設計にした。

**新規ファイル**:
- `src/endless/hiddenEnvironmentData.js`（HiddenEnvironmentData） — 6種のHidden Environment定義（VOID MEMORY/LOST ARCHIVE/GENESIS LAB/SIMULATION ZERO/ECHO NETWORK/PARADOX CORE）+ Exclusive Event 6種 + Exclusive Reward 6種（要求仕様セクション7の5カテゴリ=Hidden Protocol/Mythic Upgrade/Legend Identity/Archive Entry/Hidden Cosmeticを全て割り当て）の静的データ
- `src/endless/hiddenEnvironmentManager.js`（HiddenEnvironmentManager） — 要求仕様セクション1の全API（`checkUnlock()`/`rollHiddenEnvironment()`/`enterHiddenEnvironment(id)`/`leaveHiddenEnvironment()`/`getCurrentHiddenEnvironment()`/`getDiscoveryRate()`）に加え、Reward/Puzzle Difficulty/Node Weight等の効果getter群（worldMutationManager.jsと同じ規約）、Archive Completion記録用`markRewardUnlocked()`を実装
- `src/endless/hiddenEnvironmentRenderer.js`（HiddenEnvironmentRenderer） — Discovery Sequence（UNKNOWN SIGNAL→Decrypting...→SECRET ENVIRONMENT FOUND、要求仕様セクション5）とHidden HUD（SECRET AREA、要求仕様セクション6）のDOM描画。「続ける」ボタンはどの段階でもシーケンス全体を即座に終了できる（＝スキップ可能、environmentScan.jsと同じ設計）が、情報が無い前段2フェーズをスキップするだけで最終フェーズの情報を読み逃すことはない
- `src/endless/hiddenEnvironmentArchive.js`（HiddenEnvironmentArchive） — 要求仕様セクション9のArchive画面（Environment/First Discovery/Visit Count/Completion/Unlocked Reward）+ セクション10のDiscovery Rate表示（X/6、パーセント）

**checkUnlock()とrollHiddenEnvironment()の二段構え設計（要求仕様セクション1の意図の実現）**: `checkUnlock(snapshot)`は生涯/RUN内スナップショットを基に未解放のHidden Environmentの条件充足を判定し、満たせば即座に`hiddenUnlockFlags`へ永続解放する（worldEnvironmentManager.unlockWorldEnvironmentと同じ「二度と失われない」設計）。この「初回解放の瞬間」は要求仕様セクション13のTest Flow「条件達成→Hidden抽選」を直接の因果関係で満たすため、その場で入場を確定させる。一方、解放済みのEnvironmentへの以降のRUNでの再訪は`rollHiddenEnvironment()`による低確率抽選（`REVISIT_ROLL_RATE=2%`、要求仕様に数値指定が無かったためWorld Mutation/Environment Eventより低い値を意図的に選び「Hidden」の希少性を保った）でしか起こらない。滞在期間は全Environment共通でduration=1Layer（Environment Event/Mutationと同じ`tickDuration()`パターン）。

**6種のHidden Environmentと解放条件（要求仕様セクション3/4）**:
- VOID MEMORY（Unknown Node成功5連続）: Protocol Fragment+80%・Unknown Node出現+50%・Rare Reward+30%
- LOST ARCHIVE（生涯Protocol Fragment累計50）: Research Data×2 ※「Protocol50種類取得」は現行実装済みProtocol総数(8種)を大きく超えるため、同じ「Protocol」という語を持つ既存リソース`protocolFragments`の閾値50への到達と読み替えた（要求仕様との規模差に対する設計判断）
- GENESIS LAB（生涯Research Lab到達10回）: 次のMap選択でResearch Lab候補を最大2枠まで優先表示・入場時に無料Upgrade1つを即時付与（`freeUpgradeInstant`。既存のResearchTree有償強化へ割引を差し込むより侵襲が小さいため採用）
- SIMULATION ZERO（Layer100到達）: Puzzle Difficulty+50%（制限時間短縮）・Reward×3
- ECHO NETWORK（生涯RUN数30到達） ※要求仕様セクション4の一覧に解放条件の記載が無かったため、「過去Runの残響」というテーマに沿ってこちらで設計した。Ghost Route表示（直前RUNの訪問経路）は、既存のQuantum Echo Event（STEP30-6）と同じ「訪問履歴を表示するだけの情報系Instant効果」として実装した
- PARADOX CORE（World Status=COLLAPSEかつExtract未実行）: Reward×2・Risk Chain倍率+50% ※要求仕様の「Modifier反転」「RiskとReward逆転」は、既存Modifier適用パイプラインの符号を汎用的に反転させる仕組みを新設すると影響範囲が広くなりすぎる（architecture rule「既存Environmentを変更しすぎない」に反する）ため、「リスクを受け入れるほど報酬も跳ね上がる」という核心の意図を保ったまま既存のrewardMultiplier/riskChainBonusの積み増しへ単純化した

**既存ファイルの変更**:
- `endlessSave.js`: `hiddenUnlockFlags`/`hiddenVisitHistory`/`hiddenArchive`/`totalResearchLabVisits`/`lastRunVisitedNodes`を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった。`discoveryRate`自体は`hiddenUnlockFlags.length`から都度計算できるため、重複データとして永続化していない（既存の"highestDepth"=endlessBestDepth重複回避と同じ設計判断）。`recordRun()`に`researchLabVisitsGained`/`lastRunVisitedNodes`パラメータを追加
- `endless.js`: hiddenEnvironmentManager/hiddenEnvironmentRenderer/hiddenEnvironmentArchiveの生成・配線。`_afterLayerEnvironmentReady`でEnvironment Event判定完了後にHidden持続ターン消費(`tickDuration()`)→出現判定(`_checkHiddenEnvironmentTrigger`)を追加。新設した`_checkHiddenEnvironmentTrigger()`（checkUnlock→（新規解放優先で）rollHiddenEnvironment→Discovery Sequence→入場→Exclusive Event/Reward適用→Archive更新の一連の流れを統括）・`_applyHiddenExclusiveEffect()`（Instant系効果の即時適用）を実装。`unknownSuccessStreakThisRun`（`_resolveUnknownNode`でSystem Corruption以外は+1・System Corruptionで0にリセット）・`researchLabVisitsThisRun`（Research Lab Node入場のたびに+1、RUN終了時に生涯累計へ加算）をRUNスコープの新規カウンタとして追加。Reward/Research Data/Protocol Fragment/Risk Chain/Rare Event Weightの各既存計算式へHidden Environmentの効果を追加で乗算。`_showMapChoices()`にGENESIS LAB/VOID MEMORY等のNode重み偏重を、既存のmapGenerator生成アルゴリズムを変更せず戻り値の事後差し替えで反映
- `endlessGame.js`（EndlessRoundController）: `hiddenEnvironmentManager`を受け取り、SIMULATION ZEROのPuzzle Difficultyを既存の「制限時間短縮」レバーで合算
- `mapGenerator.js`: 変更なし（Node重み偏重は`endless.js`側での事後差し替えのみで実現）

**テスト**: 2段階で実施した。①jsdom不要のNode.js単体テスト（HiddenEnvironmentData/HiddenEnvironmentManagerをwindowレルム内で読み込み、mockのsaveを注入して直接検証）で、6種の定義完全性・Exclusive Event/Reward各6種の網羅性（5カテゴリ全て存在）・`checkUnlock`の条件充足判定と永続化・複数条件同時達成・`rollHiddenEnvironment`の確率境界値（`window.Math.random`固定）・`enterHiddenEnvironment`→`getCurrentHiddenEnvironment`→`tickDuration`（duration=1自動退場）→Archive記録のライフサイクル・`getDiscoveryRate`の計算・各効果getterの数値・実`EndlessSaveStore`での永続化と旧形式セーブからのマイグレーションを含め計61項目、全PASS。②jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）で、要求仕様セクション13のTest Flow（①Run開始→②条件達成→③Hidden抽選→④演出→⑤Environment遷移→⑥限定Event→⑦限定Reward→⑧Archive更新→⑨Save→⑩Load確認）を実際のコード経路で通し、Identity/Protocol/Environment Select→RUN初期化→強制解放させたVOID MEMORYのDiscovery Sequence表示（スキップボタンでの即時完了）→入場後のHidden HUD表示→Exclusive Event(Lost Signal)/Exclusive Reward(Hidden Protocol Echo)の実際の効果反映（Research Data/Protocol Fragment増加）→Archive記録（Visit Count/Completion/Reward ID）→次Map選択へのNode重み反映（Unknown強制出現）→1Layer後の自動退場(tickDuration)とHUD非表示・トースト表示→SIMULATION ZEROの`_handleRoundClear()`実行による実際のスコア増加→本番`checkUnlock()`（スタブ無し）でのGENESIS LAB実解放→Archive画面（Discovery Rate 3/6表示・6件全カード・発見済み3件）→MODE SELECTからの導線→別インスタンスでのSave/Reload後の状態復元→既存のSTEP30-3/30-6等既存画面への無影響を含め計43項目、全PASS（テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**未実装/既知の制約**: Hidden Reward（Hidden Protocol/Mythic Upgrade/Legend Identity/Hidden Cosmetic）は、既存のProtocol Slot/Upgrade Lv/Research Identityの各システムへ本格的に組み込む（新規Protocol種別の追加やIdentity5種目の新設等）と影響範囲が既存システム全体に及ぶため、Archiveに記録される「収集要素」+実際のゲームプレイ資源（Protocol Fragment/Research Data等）への即時変換という軽量な実装に留めている。PARADOX COREの「Modifier反転」も上記のとおりreward/riskChainBonusの積み増しへ単純化しており、文字どおりの符号反転ではない。

## STEP31: AI Director System

研究施設を統括するAI「AI Director」を追加する要求仕様（STEP31）に基づき実装した。要求仕様のアーキテクチャルール（セクション14）どおり、ゲームシステム全体を直接制御せず、各Manager（endlessGame.js/environmentEventManager.js/worldMutationManager.js/endless.js reward計算）へ「推奨値」を提供するだけのCoordinatorとして設計している。

**新規ファイル**:
- `src/endless/playerProfile.js`（PlayerProfile） — 要求仕様セクション2の保存項目（averageSolveTime/solveAccuracy/mistakeRate/riskPreference/extractRate/favoriteEnvironment/favoriteProtocol/retryCount）の初期値・EMA（指数移動平均、α=0.25）による更新計算のみを持つ純粋なヘルパー。"runs"は既存`save.getTotalRuns()`と同一概念のため重複データを持たず永続化していない
- `src/endless/directorPersonality.js`（DirectorPersonality） — 要求仕様セクション4の5人格（ANALYST/MENTOR/CHAOS/OBSERVER/RESEARCHER）を完全にData化した定義。初期人格はANALYST固定（要求仕様が「将来追加可能」と明記しているため、今回は選択UIを実装せず、5人格分のデータ・Dialogue・tuningのみ先行して用意した）
- `src/endless/directorDialogue.js`（DirectorDialogue） — 要求仕様セクション10のDialogue System。7トリガー（layerStart/mutation/extract/hiddenFound/bossBefore/bossAfter/runEnd）×5人格=35件の一言をJSオブジェクトとして直接埋め込んだデータ（environmentLog.jsと同じ「JSON管理」の実装形式）
- `src/endless/directorHud.js`（DirectorHud） — 要求仕様セクション11のDirector HUD。「必要最小限の表示とし、UIを圧迫しない」ため、新規の独立オーバーレイパネルは追加せず、既存ENDLESS HUDバー内の`endlessRiskChainBadge`等と同じ並びに1行バッジとして差し込んだ
- `src/endless/aiDirector.js`（AIDirector） — 要求仕様セクション1の全責務（プレイヤー解析/各Managerへのリクエスト/AIログ生成/Adaptive Difficulty/Dialogue/Run Report）を統括するCoordinator本体

**禁止事項の守り方（要求仕様セクション14）**:
- Puzzle直接変更: しない。Adaptive Difficultyは既存の全Difficulty系システム（Fractal Core Modifier/Fractal Overflow Mutation/Fractal Shift Event/Simulation Zero Hidden）と全く同じ「制限時間短縮/延長」レバー（`getDirectorPuzzleTimeLimitMultiplier()`）のみで表現し、Puzzle Generator/DifficultyManagerのTier・density計算には一切触れていない
- Reward直接変更: しない。`getDirectorRewardModifier()`等は既存のReward計算チェーン（`_handleRoundClear`）へ、Environment/Mutation/Event/Hiddenと全く同じ「独立した乗数を1つ追加する」形でのみ関与する
- Environment直接変更: しない。`recommendEnvironment()`はPlayerProfileから導いた「推薦」を返すだけの読み取り専用APIで、WorldEnvironment/Research Environmentの実際の選択・重み計算ロジックには一切書き込まない（推薦内容はAIログ・Run Reportを通じてプレイヤーへ提示されるのみ、という設計判断）

**Recommendation API（要求仕様セクション6〜9）の実装**:
- `recommendEnvironment()`: 要求仕様セクション6の3例（慎重プレイ→DATA OCEAN/Risk好き→FRACTAL CORE/Protocol重視→NEURAL FOREST）をそのままPlayerProfileの閾値判定で実装
- `getEventTriggerRateBonus()`: 「長時間Eventなし」（5Layer以上、要求仕様に数値指定が無かったため設計）でEnvironment Event発生率に加算。`environmentEventManager.checkEventTrigger(context)`へ`directorRateBonus`という新しいcontextキーを追加する形の後方互換拡張で実現
- `getMutationTriggerBias()`: 「簡単すぎる→boost」「苦戦中→suppress」を`worldMutationManager.checkMutationTrigger(context)`へ`directorBoost`/`directorSuppress`という新しいcontextキーで伝える、同じく後方互換拡張
- `getDirectorRewardModifier()`/`getDirectorResearchDataMultiplier()`/`getDirectorRareEventWeightBoost()`: 要求仕様セクション9の例（5連敗→Research Data+20%・Rare Reward+）どおり、RUN内の連続ミス数（`_consecutiveMisses`）が5に達した時のみ通常値より大きくなる

**既存ファイルの変更**:
- `endlessSave.js`: `directorPersonalityId`/`playerProfile`/`directorProfile`/`directorLogs`を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった。`playerProfile`は未初期化(null)の間、初回`getPlayerProfile()`呼び出し時に遅延デフォルト補完する設計にした
- `worldMutationManager.js`: `checkMutationTrigger(context)`に`context.directorBoost`/`context.directorSuppress`の判定を追加（未指定時は完全に従来と同じ挙動）
- `environmentEventManager.js`: `checkEventTrigger(context)`に`context.directorRateBonus`の加算を追加（同上、後方互換）
- `endlessGame.js`（EndlessRoundController）: `aiDirector`を受け取り、Adaptive Difficultyを既存の「制限時間短縮/延長」レバーで適用
- `endlessResult.js`/`index.html`: 要求仕様セクション12のRun Report（AI DIRECTOR REPORT: Average Solve Time/Accuracy/Risk/Favorite Environment/Recommendation）をRESULT画面へ追加
- `endless.js`: aiDirector/directorHudの生成・配線。Layer移動のたびに`updateLayer()`でAdaptive Difficulty再計算（要求仕様セクション5「AIは毎Layer更新」）、7箇所のDialogueトリガー呼び出し、Reward計算チェーンへの独立した乗数追加、RESULT画面「RETRY」クリック時の`recordRetry()`呼び出しを配線した

**実装中に発見・修正した設計上の問題（jsdom統合テストで検出）**:
- 新規プロフィール（`averageSolveTime===0`、まだ1問もクリアしていない）の状態で、`solveAccuracy`/`mistakeRate`の楽観的な初期値（それぞれ1/0）をAdaptive Difficultyのスコア計算にそのまま使うと、実績が全く無いプレイヤーがLayer1からいきなり`hard`判定になってしまうバグを発見した。`averageSolveTime>0`（＝実際に1問以上クリアした実績がある）の場合のみsolveAccuracy/mistakeRate/averageSolveTimeをスコアへ反映するよう修正した
- `ui.showToast()`は単一スロットの「後勝ち（textContent上書き）」実装のため、同一tick内で2回呼ぶと1回目は画面に一切表示されないまま消えることを発見した。具体的には「Boss後Dialogue→即座にBoss撃破報酬トースト」「Extract Dialogue→即座にRun終了(runEnd Dialogue)トースト」「Hidden発見Dialogue→即座にSECRET AREAトースト」の3箇所で発生した。Boss後は両者を1つのトーストへ統合し、Extract/Hidden発見は「直後に別のトーストで必ず上書きされる」既知の構造のため、AIログへの記録のみ行いトースト表示を省略する設計にした（`_showDirectorDialogue(trigger, showToast=false)`という第2引数を新設）

**テスト**: 2段階で実施した。①jsdom不要のNode.js単体テスト（PlayerProfile/DirectorPersonality/DirectorDialogue/AIDirectorをwindowレルム内で読み込み、mockのsaveを注入して直接検証）で、5人格の定義完全性・35件のDialogue完全性・PlayerProfileの各更新関数（EMA計算・argMax・favoriteEnvironment/favoriteProtocol算出）・Adaptive Difficultyのスコア境界値（スキル/苦戦両パターン）・Mutation/Event/Reward各Recommendation APIの発動条件・Personality別tuning（OBSERVERの不介入含む）・Dialogue取得とログ記録・Run Report生成・worldMutationManager/environmentEventManagerのcontext拡張の後方互換性・実`EndlessSaveStore`での永続化と旧形式セーブからのマイグレーションを含め計74項目、全PASS。②jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）で、要求仕様セクション15のTest Flow（①Run開始→②Profile更新→③Difficulty調整→④Environment推薦→⑤Dialogue表示→⑥Run終了→⑦Report生成→⑧Save→⑨Load）を実際のコード経路で通し、Identity/Protocol/Environment Select→RUN初期化→Layer1移動でのDirector HUD初回表示とlayerStart Dialogue→Environment Recommendation（riskPreference操作での推薦切替）→Mutation Trigger Biasのcontext伝達確認→強制発生させたMutationでのDialogue+Visual Sequence連携→Event Trigger Rate Bonusのcontext伝達確認→5連敗シミュレーションでのReward Recommendation実反映→Boss前後のDialogue（統合トースト含む）→Extract Dialogue（ログ記録のみ）→Run終了→AI DIRECTOR REPORT表示（RESULT画面の5項目）→RETRYボタンでのretryCount記録→別インスタンスでのSave/Reload後の状態復元→既存のSTEP30-6/30-7等既存画面への無影響を含め計38項目、全PASS（テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**未実装/既知の制約**: Personality選択UI（MENTOR/CHAOS/OBSERVER/RESEARCHERへの切り替え導線）は要求仕様が「将来追加可能」と明記しているため今回は実装していない（データ・Dialogue・tuningは5種全て用意済みで、選択APIを追加すればすぐ使える状態）。Director Archive画面（Protocol/Environment/Hidden Archiveと同種の一覧UI）は、要求仕様セクション13が保存データ構造のみを求めており専用UI画面を明示的に要求していないため、今回は追加していない（保存データ自体は`directorProfile.reportHistory`/`directorLogs`として完備している）。

## STEP32: Narrative & Story System

研究施設・AI・世界そのものの物語を断片的に開示するStory/Narrative Systemを追加する要求仕様（STEP32）に基づき実装した。要求仕様のアーキテクチャルール（セクション13）どおり、既存のPuzzle Logic/Reward System/Environment Systemには一切手を加えず、既存の各Managerから「進行状況スナップショット」を読み取って判定するだけの、読み取り専用のCoordinator群として設計している。

**新規ファイル**:
- `src/endless/storyData.js`（StoryData） — 要求仕様セクション2の6種別（LOG/MEMORY/FILE/AUDIO/EVENT/ENDING）を持つStoryEntry全31件（LOG12/MEMORY6/FILE6/EVENT1/AUDIO1/ENDING5）を完全にData化した定義。`id`/`type`/`category`（Facility/AI/Environment/Protocol/World/Player、内部定数として英語のまま）は演出用に英語のまま、プレイヤーが読む`title`/`content`は日本語にした（フィードバック「プレイヤーが読んで理解すべきものは日本語に」に従う）。`STAGE_DIALOGUE`（early/middle/late/finalの4段階の世界観一言）も同居させた
- `src/endless/storyUnlockManager.js`（StoryUnlockManager） — 要求仕様セクション5のStory Unlock Manager。`protocolUnlock.js`/`achievements.js`と全く同じ「状態を持たない`{type,value}>=`比較の静的オブジェクト」設計。Hidden Environment固有のFILEのみ、しきい値比較ではなく解放済みid配列への包含判定（`hiddenEnvironmentUnlocked`）にした
- `src/endless/researchDatabase.js`（ResearchDatabase） — 要求仕様セクション1の必須API（`addEntry`/`getEntry`/`isUnlocked`/`getAllEntries`/`getCompletionRate`）を持つCoordinator本体。実際の永続化は完全に`endlessSave.js`へ委譲し（`metaProgression.js`/`identityManager.js`と同じ設計）、自身は状態を持たない。要求仕様セクション8のStory Stage判定（`getStoryStage()`）と、AI Dialogue側の重複通知防止のための`checkStageTransition()`もここに実装した（境界値early&lt;25%/middle&lt;60%/late&lt;90%/final≥90%は要求仕様に数値指定が無かったため設計した）
- `src/endless/researchTimeline.js`（ResearchTimeline） — 要求仕様セクション7のTimeline表示。`#researchTimelineList`へ解放順（古い順）の記録を矢印区切りで描画するだけの、状態を持たない描画専任クラス
- `src/endless/endingManager.js`（EndingManager） — 要求仕様セクション9のEnding System。5種のEnding条件は`storyUnlockManager.js`の単純な`{type,value}>=`比較では表現できない複合条件（World Status/Hidden全種発見/他Systemの完成率の組合せ等）のため、`aiFeedback.js`のRULESテーブルと同じ`match: snapshot => boolean`関数集合として実装した。達成済みEndingは`endingFlags`へ永続化し、一度達成したら二度と失われない
- `src/endless/storyArchiveUI.js`（StoryArchiveUI） — 要求仕様セクション11の新画面「RESEARCH DATABASE」のDOM描画・タブ切替専任クラス。要求仕様セクション10「Research Codex統合」は、このクラス自身が他System（Protocol/Environment/Mutation/Event/Hidden）へ直接アクセスせず、`getCodexSummary`という読み取り専用関数を`endless.js`側から注入する形にした

**要求仕様に無く、こちらで設計した各Endingの具体的な判定基準**:
- END A「Complete Research」: 全12件のLOG Entry解放（要求仕様の「主要Story Log完成」）
- END B「World Collapse」: RUN終了時点でWorld Status=COLLAPSEだったこと
- END C「AI Liberation」: 全6件のMEMORY Entry解放（要求仕様の「AI Memory Complete」）
- END D「Simulation Zero」: SIMULATION ZERO（Hidden Environment）内でPuzzle/Elite/Bossを1回以上クリアしたこと（要求仕様の「SIMULATION ZERO攻略」）
- END TRUE「GENESIS」: 全6種のHidden Environment発見＋Story全体100%＋Layer50到達（要求仕様の「Hidden Environment+Story Complete+Special Conditions」。Special ConditionsはEND A/D等が要求する到達点よりさらに深いLayerを踏んだ経験として設計した）

**禁止事項の守り方（要求仕様セクション13）**:
- Puzzle Logic変更: しない。Story解放判定・Ending判定はいずれも既存の各Manager/Saveから値を読み取るだけの読み取り専用スナップショットで、Puzzle Generator/DifficultyManager等へは一切書き込まない
- Reward System改修: しない。Story/Endingはスコア・Research Data計算チェーンに一切関与しない（純粋な「発見・開示」システムとして設計）
- Environment System改修: しない。FILE解放条件の判定に`hiddenEnvironmentManager`/`worldStabilityManager`の値を「読む」だけで、両System自体には一切書き込まない
- 「既存ゲームロジックへ直接埋め込まない」: `endless.js`（既に全Systemを束ねるCoordinator）が、Layer移動時（`_handleMapNodeSelected`）とRUN終了時（`_endRun`）の2箇所だけで、各Coordinator（`storyUnlockManager`/`researchDatabase`/`endingManager`）へスナップショットを渡して結果を受け取る「イベント通知」形にした

**既存ファイルの変更**:
- `endlessSave.js`: `researchDatabase`（`unlockedIds`）/`storyProgress`（`lastNotifiedStage`）/`timelineData`/`endingFlags`/`simulationZeroCleared`を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった。Timelineは`TIMELINE_LIMIT`(200件)で上限を切る既存の「履歴系フィールド」と同じ設計にした
- `endless.js`: `researchDatabase`/`researchTimeline`/`endingManager`/`storyArchiveUI`の生成・配線。Layer移動のたびに`_checkStoryUnlocks()`でStory解放判定＋Stage遷移判定を行い（トースト通知のみ、Mutation/Event/Hidden Environment発見の一連の演出チェーンへさらに「続ける」ボタンを積み増さないための設計判断）、Puzzleクリア時にSIMULATION ZERO内クリアを`simulationZeroCleared`として記録し、RUN終了時（`_endRun`）にEnding判定→`researchDatabase`への反映→「続ける」ボタン付きオーバーレイでの通知→RESULT画面遷移、という順で統合した。Research Codex統合用の`_buildResearchCodexSummary()`もここに実装した
- `index.html`/`ui.js`: 新画面`#screen-storyarchive`（RESEARCH DATABASE）を追加し、ARCHIVE HUB画面（前回UI改修で新設済み）から遷移できるようにした

**実装中に発見・修正した設計上の問題（jsdom統合テストで検出）**:
- `_checkStoryUnlocks()`内で「新規Story解放通知」と「Stage遷移通知」を続けて`ui.showToast()`していたところ、単一スロットの「後勝ち」実装のため片方が画面に一切表示されないまま消えるバグを発見した（STEP31のDialogue System実装時に発見したのと同種のバグ）。1RUN中で最初にLayer1へ到達した瞬間に両方が同時発火しうるため、実運用でも十分起こりうる不具合だった。両者を1つのトーストへ統合するよう修正した

**テスト**: 2段階で実施した。①jsdom不要のNode.js単体テスト（StoryData/StoryUnlockManager/ResearchDatabase/EndingManagerをwindowレルム内で読み込み、mockのsaveを注入して直接検証）で、StoryData全31件の内訳・`checkUnlockCondition`の各条件タイプ（数値しきい値/Hidden Environment包含判定/null）・ResearchDatabaseの`addEntry`/`isUnlocked`/`getCompletionRate`/`getCompletionByType`・Story Stage判定とStage遷移の重複通知防止・EndingManagerの5種条件判定と永続化・再判定時の非重複を含め計39項目、全PASS。②jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）で、要求仕様のTest Flow（Run開始→Layer進行→条件達成→Story Log取得→AI Dialogue変化→Archive更新→Hidden File取得→Ending条件確認→Save→Load）を実際のコード経路で通し、RUN開始→Layer1移動での`log_001`自動解放とトースト表示→protocolCount条件でのLog解放（RUN開始時デフォルト所持数での自動解放・スナップショットoverrideでの追加解放の両方）→Story Stage遷移（early→middle）でのAI Dialogueトースト→Hidden Environment解放連動のFILE解放→SIMULATION ZERO内クリアでの`simulationZeroCleared`記録→RUN終了でのEND A達成・永続化・ResearchDatabaseへの反映・「続ける」ボタン付きオーバーレイ表示→RESEARCH DATABASE画面（統計表示/Codex一覧/Timeline描画/タブ切替/未解放エントリの「???」表示/戻るボタン）→別インスタンスでのSave/Reload後の状態復元→STEP32フィールドを持たない旧形式セーブからのマイグレーション→既存のSTEP30-7/前回UI改修等既存画面への無影響を含め計49項目、全PASS（テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**未実装/既知の制約**: AI Director Dialogue Integration（要求仕様セクション8）は、5人格×4Stageの組み合わせ全てを個別に用意する完全なクロス積ではなく、AI Directorの人格とは独立した4段階（early/middle/late/final）の「世界観Dialogue」として簡略化して実装した（STEP31で5人格の性格別Dialogueは既に別トリガーとして用意済みのため、Story Stageは人格に依存しない「世界そのものの語り」として役割分担した設計判断）。Research Codexの内訳表示は、要求仕様が挙げた項目のうち実際にゲーム内に存在する集計軸（PROTOCOL/ENVIRONMENT/MUTATION/EVENT/HIDDEN/ACHIEVEMENT/STORY）のみを対象にしている。

## STEP32: Story Scenario Framework

※このセッションでは「STEP32」という番号のToDo仕様が2回提示された（1回目が上記「Narrative & Story System」、2回目が本セクション）。要求仕様の文面が別物のため、番号の重複はそのまま保持し、両方を別セクションとして実装した。

1回の探索で完結するStory型ゲームモード「STORY RESEARCH」を、既存のENDLESS RESEARCHとは完全に分離した新モードとして追加する要求仕様（STEP32 Story Scenario Framework）に基づき実装した。要求仕様のアーキテクチャルール（セクション15）どおり、既存のPuzzle Logic/Reward System/Environment Systemを一切改変せず、既存の各Manager/UIを呼び出すだけの新規Coordinator群として設計している。

**新規ファイル**:
- `src/endless/scenarioData.js`（ScenarioData） — 要求仕様セクション3の形式（id/title/description/difficulty/layerCount/chapters/storyEvents/environment/boss/ending/reward/unlockCondition）でCASE001〜006の6Scenarioを完全にData化した定義。新しいScenarioを追加する場合はこのファイルへのデータ追加のみで対応できる
- `src/endless/storyNode.js`（StoryNode） — 二重の役割を持つ。①`buildScenarioNodes(scenario)`: Scenarioのchapters配列から、Story Mode内部で1つずつ消化する「フラットな1本道のNodeシーケンス」を組み立てる（Story Modeは「Scenario固定・Layer構成固定」のためMap分岐生成は行わない）。②要求仕様セクション7が指す「既存Research Map（Endless RESEARCH側）に追加するStory Node種別」用の、CASE Scenarioとは独立したアンビエントな断片イベントプール
- `src/endless/scenarioManager.js`（ScenarioManager） — 要求仕様セクション2のAPI（`getAvailableScenarios`/`loadScenario`/`startScenario`/`updateProgress`/`completeScenario`/`getScenarioResult`）をそのまま実装。加えてGAME画面の「‹ BACK」で挑戦を中断するための`exitScenario()`を追加した（要求仕様には明示が無いが、途中離脱の受け皿として必須のため）
- `src/endless/storyEventManager.js`（StoryEventManager） — 要求仕様セクション6のStory Event System。DIALOGUE/DISCOVERY/MEMORY/CHOICE/CINEMATICの取得と、CHOICE型で選ばれた選択肢のchoiceHistoryへの記録のみを持つ
- `src/endless/storyEndingManager.js`（StoryEndingManager） — 要求仕様セクション11のEnding System。protocolUnlock.js/storyUnlockManager.jsと同じ「状態を持たない静的オブジェクト」設計で、Scenarioのending配列からそのRUNでの選択履歴に応じた1件を決定する
- `src/endless/scenarioSelectUI.js`（ScenarioSelectUI） — 要求仕様セクション12の新画面「STORY RESEARCH」のDOM描画・カード選択のみを持つ
- `src/endless/storyMode.js`（StoryMode） — ENDLESS RESEARCH側の`endless.js`と対になる中核Coordinator。Scenario進行・Puzzle開始・Story Eventオーバーレイ表示・AI Director連携・Environment連携・Ending表示・Endless Research連携（報酬付与）を統括する

**要求仕様に無く、こちらで設計した主な判断**:
- **保存フィールド名の衝突回避**: 要求仕様セクション13の`storyProgress`は、既に実装済みの前STEP32（Narrative & Story System）が同名フィールド（Story Stage通知用）で使用済みだったため、本機能では`scenarioProgress`（挑戦中Scenarioの一時的な進行位置）という別名にした。`scenarioClearData`/`endingHistory`/`choiceHistory`は衝突が無かったため要求仕様どおりの名前をそのまま使った
- **Puzzle自体の仕様**: Story ModeのPuzzleは、ENDLESS RESEARCHのような制限時間/Life/コンボ/スコアの仕組みを持たない、Stage Modeと全く同じ「時間無制限・自由にUNDO/RESET/HINT可能」な既存Game/PuzzleManagerをそのまま再利用する設計にした（要求仕様に失敗・タイムアップ時の挙動の指定が無く、物語を読ませることが主目的のモードで時間切迫のスリルを追加する必要性が薄いと判断したため）。これにより`main.js`側もENDLESS RESEARCHのようにhandleCellTap等へ個別分岐を増やす必要が無く、`_handleClear()`と`handleGameBack()`の2箇所だけで統合できた
- **Puzzle難易度の決定方法**: Scenarioの`difficulty`（★1〜5）から、既存`DifficultyManager.getPuzzleConfig()`が期待する「仮想Depth」への変換テーブル（`BASE_DEPTH_BY_DIFFICULTY = {1:3, 2:8, 3:15, 4:35, 5:50}`）を設計し、Scenario内でPuzzleを重ねるごとに+2、Bossはさらに+10した仮想Depthを渡すことで、既存のPuzzle生成ロジック（puzzleTier.js）を一切変更せずに難易度スケーリングを実現した
- **Environment連携（セクション9）の範囲**: 6Scenarioそれぞれに既存WorldEnvironment（env_grid/env_network/env_ocean/env_unknown/env_forest/env_fractal）を1つ参照させ、`environmentThemeLayer`の背景描画にのみ反映した（`environmentRenderer`を`app.endless`側から共有）。Modifier効果（Map重み/Reward倍率/Protocol Fragment倍率等）はEndless RESEARCH専用の仕組みが対象のため、Story Modeでは意図的に適用していない（新規に6つの専用Environmentを追加してModifierまでフル実装すると、要求仕様セクション15の「既存Environment Systemへ直接埋め込まない」という制約の趣旨を超える改修規模になるため）
- **Protocol連携（セクション10）**: CASE003報酬のColor Analyzer・CASE006報酬のGenesis Protocolを、RUN開始時のProtocol Select（`protocols.js`）ではなく、Signal限定プール（`protocolSignals.js`）へ`unlock:{type:'scenarioReward',value:<case id>}`として追加した。この`type`はprotocolUnlock.jsのsnapshot判定に存在しないキーのため通常の自動解放では絶対にtrueにならず、Scenario Clear時に`storyMode.js`が直接`save.unlockProtocol(id)`を呼ぶ経路でのみ解放される（解放後はProtocol Archive・Endless RESEARCHのProtocol Signal抽選プールへも自動的に反映される）
- **Ending分岐**: CASE004（Lost Researcherを捜索するか/しないか）・CASE005（AI Memoryを復元するか/消去するか、要求仕様セクション11の例そのまま）の2Scenarioに、CHOICE型Story Eventの選択結果で分岐する2種のEndingを実装した。残り4Scenarioは単一のEndingのみ（`condition:null`）とした
- **Story Node（セクション7）の実装範囲**: Endless RESEARCHの既存Research Mapに新しいNode種類`story`を追加した（`nodeTypes.js`/`aiAnalysis.js`/`mapGenerator.js`へ小さな追加、既存5種の出現バランスへの影響を避けるため固定の低い重みにした）。ただしEndless側の`story`Nodeは、CASE Scenarioの正史とは独立した「Endless世界線側の断片」（`StoryNode.AMBIENT_STORY_EVENTS`、6種）を表示するのみとし、CASEのStoryEventそのものは参照しない設計にした（2つの世界線を混在させると物語の一貫性が崩れるため）

**既存ファイルの変更**:
- `endlessSave.js`: `scenarioProgress`/`scenarioClearData`/`endingHistory`/`choiceHistory`を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった。Scenario報酬のResearch Data付与用に`grantScenarioResearchData()`も追加した（`recordRun()`と同じ2フィールドへの積み増し）
- `protocolSignals.js`: Color Analyzer/Genesis Protocolの2件を追加
- `protocolUnlock.js`: `getConditionLabel()`に`scenarioReward`のケースを追加（Protocol Archiveでの未解放条件表示用）
- `nodeTypes.js`/`aiAnalysis.js`/`mapGenerator.js`/`endless.js`: 前述のStory Node（Endless Map向け）統合
- `main.js`: `this.storyMode`の生成（`this.endless`より後、saveを共有するため）、`_handleClear()`への`story`分岐追加、`handleGameBack()`への`story`分岐追加

**実装中に見つけた既存の不具合の修正（本Stepの実装とは直接関係ないが、影響範囲を調べる過程で発見）**:
- 前STEP32（Narrative & Story System）の`_buildResearchCodexSummary()`で、PROTOCOLの母数(total)が`Protocols.ALL.length`（RUN開始時選択可能な基本3種のみ）になっており、Signal限定6種（本Stepで追加した2種を含む）が集計から漏れていた。`ProtocolUnlock.getAllDefs().length`（基本+Signal全9種、本Step追加分を含め計11種）を使うよう修正した

**テスト**: 2段階で実施した。①jsdom不要のNode.js単体テスト（ScenarioData/StoryNode/ScenarioManager/StoryEventManager/StoryEndingManagerをwindowレルム内で読み込み、mockのsaveを注入して直接検証）で、ScenarioData全6件の内訳・各Scenarioの`layerCount`とhasPuzzleチャプター数の整合性・unlockCondition連鎖・CASE004/CASE005の分岐Ending定義・`buildScenarioNodes`のNode数とdirectorLine付与位置・ScenarioManagerの一連のAPI（Unlock判定→開始→進行→完了→報酬→次Scenario解放→中断）・StoryEventManagerの選択記録・StoryEndingManagerの分岐/フォールバック判定を含め計49項目、全PASS。②jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`App`/`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）で、TITLE画面からの新規導線→STORY RESEARCH画面（Unlock/Locked表示）→CASE001〜004の実際のPuzzle解答（生成された盤面をanswerどおりに実際にタップして解く）を含むフルクリア→Story Event（DIALOGUE/DISCOVERY/MEMORY/CINEMATIC）オーバーレイの表示→AI Directorトースト（CASE001/CASE005の指定台詞）→CASE003クリアでのColor Analyzer実解放→CASE004でのCHOICE分岐と対応するEnding表示・選択履歴の永続化→GAME画面からのBACKボタンによる中断（進行位置のみ破棄、クリア未記録）→Endless RESEARCH側のStory Node統合（NodeTypes/AIAnalysis/MapGenerator）→Research Codexバグ修正の反映確認→別インスタンスでのSave/Reload後の状態復元→STEP32(Scenario)フィールドを持たない旧形式セーブからのマイグレーションを含め計53項目、全PASS（テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**未実装/既知の制約**: Chapter単位の「objectives」フィールドは、要求仕様どおりデータとしては全Chapterに定義したが、達成度を個別に判定・表示する専用UIは実装していない（Story Event/Chapter遷移時の説明文として表示するに留めた。要求仕様に具体的な判定ロジックの指定が無かったため）。Boss Puzzleは既存`boss.js`（Depth10/25/50固定のBoss定義）を経由せず、Scenario側の仮想Depthをさらに引き上げた通常Puzzle生成として実装しており、既存ENDLESS RESEARCHのBoss演出（専用の名前・撃破時の特別なスコア倍率等）は持たない（Story ModeにはそもそもScore/Reward計算チェーンが存在しないため、Boss固有の倍率計算自体が不要という設計判断）。

## STEP32-1: Story Framework Base System

※このセッションでは「STEP32」系の要求仕様が3回提示された（1回目「Narrative & Story System」、2回目「Story Scenario Framework」、3回目が本セクション「STEP32-1 Story Framework Base System」）。3回目は末尾に「-1」が付いた別の番号のため、そのままセクション名として採用した。

ENDLESS RESEARCHのLayerクリアをトリガーに、Chapter進行を管理する基盤（Layer Narrative System）を追加する要求仕様（STEP32-1）に基づき実装した。要求仕様どおり、既存のPuzzle System/Endless Research Mode/Reward処理には一切変更を加えず、Layerクリアの通知を受け取って独自にChapter進行を計算するだけの、既存システムから見て透過的な追加として設計している。

**新規ファイル**:
- `src/endless/storyManager.js`（StoryManager） — 要求仕様セクション1のAPI（`initializeStory`/`getCurrentChapter`/`getCurrentStoryLayer`/`onLayerClear`/`completeChapter`/`resetStoryProgress`）をそのまま実装したCoordinator本体。実際の永続化は完全に`endlessSave.js`へ委譲し、自身は状態を持たない
- `src/endless/layerStoryData.js`（LayerStoryData） — 要求仕様セクション2のデータ駆動形式（`{chapters:[{id,title,startLayer,endLayer,unlockCondition}]}`）でchapter01〜06（Layer1〜30）を定義した
- `src/endless/layerStoryEventManager.js`（LayerStoryEventManager） — 要求仕様セクション5のAPI（`checkLayerEvent(layer)`）のみを実装。要求仕様どおり「今回は表示処理は作らない」ため、検索対象のイベントデータ（セクション6の例を含む、Chapter開始Layerごとの最小限のプレースホルダー6件）とAPIのみに留めた

**要求仕様に無く、こちらで設計した主な判断（保存フィールド名の衝突回避）**: 要求仕様が指定するファイル名/フィールド名の一部が、このセッション内で既に実装済みの他STEP32系機能と重複していたため、以下のとおりリネームして実装した（いずれも実際に生成されるオブジェクトの中身・APIは要求仕様どおり）。
- `StoryData.js` → `layerStoryData.js`（`G.LayerStoryData`）: 既存の`storyData.js`（STEP32 Narrative & Story System、LOG/MEMORY/FILE等のStoryEntryを持つ`G.StoryData`）と同名衝突するため
- `StoryEventManager.js` → `layerStoryEventManager.js`（`G.LayerStoryEventManager`）: 既存の`storyEventManager.js`（STEP32 Story Scenario Framework、CHOICE型Story Eventの取得・選択記録を持つ`G.StoryEventManager`クラス）と同名衝突するため
- Save Data `storyProgress` → `layerStoryProgress`: 既存の`storyProgress`（STEP32 Narrative & Story Systemの`{lastNotifiedStage}`）、および前STEP32(Story Scenario Framework)実装時に同じ理由で`scenarioProgress`へリネーム済みだった経緯の両方と衝突するため、3つ目の重複を避けた
- `StoryManager.js`は衝突が無かったため要求仕様どおりの名前をそのまま使った

**Layer Clear連携（要求仕様セクション3）**: `endless.js`の`_handleRoundClear(stats)`内、既存の報酬計算・Achievement/Identity EXP付与処理の直後に`this.storyManager.onLayerClear(this.depth)`を1行追加しただけで、既存のスコア/Research Data/Protocol Fragment等の報酬処理には一切触れていない。

**UI表示（要求仕様セクション7）**: 「Research画面」をMAP画面（`#screen-map`、コードベース内で実際に「リサーチマップ」と呼ばれる画面）と解釈し、`Chapter N: <title>` / `Layer X / Y`の2行を表示する常時表示の小さなブロックを追加した。既存の折りたたみ式Environment詳細パネルへ入れると見落とされやすいと判断し、あえて独立した要素にした。

**既存ファイルの変更**:
- `endlessSave.js`: `layerStoryProgress`（`currentChapter`/`currentLayer`/`completedLayers`/`completedChapters`）を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった
- `endless.js`: `storyManager`の生成、`_handleRoundClear`への`onLayerClear()`呼び出し追加、MAP画面のStory状態表示（`_renderStoryStatus()`）を追加

**実装中に発見・修正した設計上の問題（jsdom統合テストで検出）**: `_renderStoryStatus()`を`_renderWorldEnvironmentBadge()`（Layer移動時のみ呼ばれる）からしか呼んでいなかったため、Layerクリアの瞬間にChapterが進行しても、次のLayer移動が起きるまでMAP画面のChapter表示が古いまま（1つ前のChapter名）になってしまうバグを実テストで検出した。`_handleRoundClear`内の`onLayerClear()`呼び出し直後にも`_renderStoryStatus()`を呼ぶよう修正し、Layerクリア直後に即座に画面表示が更新されるようにした。

**テスト**: 2段階で実施した。①jsdom不要のNode.js単体テスト（LayerStoryData/LayerStoryEventManager/StoryManagerをwindowレルム内で読み込み、mockのsaveを注入して直接検証）で、LayerStoryData全6Chapterの範囲・`getByLayer`の境界値（Layer1/8/30/999超過時のクランプ）・`getNextChapter`（最終Chapterでnull）・LayerStoryEventManagerの検索結果（要求仕様セクション6の例との完全一致含む）・StoryManagerの一連のAPI（初期化→Layerクリア記録→Story Event返却→Chapter境界での自動進行→手動`completeChapter()`→最終Chapterでの`null`返却→リセット）・実`EndlessSaveStore`での永続化と旧形式セーブからのマイグレーションを含め計41項目、全PASS。②jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）で、実際のRUN開始→Layer1〜4を実際にPuzzleを解いてクリア→各クリアで`completedLayers`が正しく記録されること・既存の報酬処理（スコア加算等）が無影響で動作し続けること・Layer4クリアでChapter1が完了しChapter2（Lost Data）へ自動進行すること・MAP画面のStory状態表示がLayerクリア直後に即座に更新されること・既存Endless RESEARCH機能（HUD表示/STORY RESEARCHボタン等）への無影響・別インスタンスでのSave/Reload後の状態復元を含め計19項目、全PASS（テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**未実装/既知の制約**: 要求仕様セクション5で明示されたとおり、Story Event（`LayerStoryEventManager.checkLayerEvent()`）の検索結果を実際に画面表示する演出（Dialogue Overlay等）は今回実装していない（`StoryManager.onLayerClear()`の返り値として検索結果を返すところまでに留めた。要求仕様が「今回は表示処理は作らない」と明示しているため）。Chapterのunlock判定（`unlockCondition`）はデータとして定義したが、Chapter進行自体が「前ChapterのendLayerへ到達したら自動的に次へ進む」という一本道のため、実際にはこの判定を経由せず`completeChapter()`が無条件で次Chapterへ進める設計にした（Layer Clear経由の進行は必ず順番どおりのため、unlockCondition評価は将来「Chapterを個別に選んでジャンプする」ようなUIを追加する場合に備えたデータとして温存している）。

## STEP32-2: Dialogue System

STEP32-1（Story Framework Base System）で「今回は表示処理は作らない」と明示的にスコープ外にした、Story Eventの実際の演出（キャラクター会話）を追加する要求仕様（STEP32-2）に基づき実装した。要求仕様セクション6のフロー（Layer Clear→StoryEventManager→DialogueManager.startDialogue()→Dialogue終了→StoryManager更新）どおり、STEP32-1で既に用意済みだった`StoryManager.onLayerClear()`の返り値（Story Event定義、これまで未使用だった）を初めて実際に消費する形で統合した。

**新規ファイル**:
- `src/endless/dialogueManager.js`（DialogueManager） — 要求仕様セクション1のAPI（`startDialogue`/`nextLine`/`endDialogue`/`isPlaying`）をそのまま実装したCoordinator本体。文字送り演出やタップ処理などのDOM操作は一切持たず、`ui.showDialogue()`/`ui.hideDialogue()`を呼ぶだけに徹した（researchDatabase.js等と同じ「Coordinator+描画はUI側」という役割分担）
- `src/endless/characterData.js`（CharacterData） — 要求仕様セクション2どおり、player/aria/lost_researcherの3キャラクターを定義した
- `src/endless/dialogueData.js`（DialogueData） — 要求仕様セクション3の形式（`{id, lines:[{speaker,text}]}`）で、要求仕様セクション7の「初期テストDialogue追加」どおりChapter1（Layer1〜4）分の4件を実装した。idは`layerStoryEventManager.js`のStoryEvent idと1:1対応させている

**Dialogue UI（要求仕様セクション4/5）**: 新規ファイルは作らず、既存の全オーバーレイ（`showNodeResult`/`showStoryChoice`等）と同じく`ui.js`へ`showDialogue()`/`hideDialogue()`メソッドとして実装した（このプロジェクトの「オーバーレイ表示は全てui.jsのメソッドとして持つ」という既存の一貫した設計に合わせた）。文字送り演出（1文字ずつ表示、`DIALOGUE_TYPE_SPEED_MS`=30ms間隔）・タップ時の状態遷移（文字送り中のタップ→即座に全文表示、全文表示済みのタップ→次セリフ/終了）は`showDialogue()`内の1つのクリックハンドラ（`_dialogueTapHandler`）で完結させた。

**要求仕様に無く、こちらで設計した主な判断**:
- **ARIAとSTEP31 AI Directorの関係**: STEP31で実装済みのAI Director（5人格: ANALYST/MENTOR/CHAOS/OBSERVER/RESEARCHER）とは統合せず、ARIAを完全に独立したキャラクターとして実装した（要求仕様がARIAを固定の1キャラクターとしてデータ化しており、5人格システムとの統合方法を要求していないため）
- **「StoryManager更新」の実体**: 要求仕様セクション6のフロー図が示す「Dialogue終了→StoryManager更新」は、実際にはStoryManagerの状態更新（Chapter進行）がLayerクリアの瞬間（`StoryManager.onLayerClear()`内、Dialogue開始より前）に既に同期的に完了しているため、Dialogue終了時に追加で呼ぶStoryManager APIは無い。フロー図はあくまで「順序」の説明として扱い、実装は`endless.js`側でクリア結果オーバーレイの「つづける」タップ→（未読のDIALOGUE型イベントがあれば）Dialogue開始→Dialogue終了→既存の`_afterRoundEnd()`/`_endRun()`という一続きのコールバックチェーンとして組み立てた
- **要求仕様セクション9「Endless Research互換」の解釈**: 「Dialogue SystemはStory Modeのみ使用。Endless Researchでは無効」という一文は、文字どおり読むとSTEP32-1で実装済みの唯一のトリガー元（`endless.js`の`_handleRoundClear`、ENDLESS RESEARCHのLayerクリア時に発火）と矛盾する（Dialogue Systemが発火する場所が他に存在しないため）。このセッションには別の「Story Mode」（STEP32 Story Scenario Framework、`storyMode.js`、CASE001〜006の独立Scenario）も存在するため、この一文は「2つの独立した「Story」系システムを混在させず、Dialogue SystemはLayer Narrative System（StoryManagerベース）側にのみ属し、Story Scenario Framework側には配線しない」という要件として解釈した。実際に`storyMode.js`には一切手を加えていない

**既存ファイルの変更**:
- `endlessSave.js`: `dialogueHistory`（`{completedDialogueIds:[]}`）を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった
- `layerStoryEventManager.js`: Chapter1のLayer2〜4クリアイベント（`chapter01_layer02_clear`〜`04_clear`）を追加した（STEP32-1時点ではChapter開始Layer（Layer1）のみ1件用意していたが、`dialogueData.js`の4件のテスト会話に対応させるため、Chapter1に限り全Layerへ拡充した）
- `endless.js`: `dialogueManager`の生成、`_handleRoundClear`内で`storyManager.onLayerClear()`の返り値がDIALOGUE型イベントの場合にクリア結果オーバーレイの「つづける」タップ後Dialogueを挟むよう統合した

**テスト**: 2段階で実施した。①jsdom不要のNode.js単体テスト（CharacterData/DialogueData/LayerStoryEventManager拡張/DialogueManagerをwindowレルム内で読み込み、mockのui/saveを注入して直接検証）で、CharacterData全3件・DialogueData全4件（要求仕様の台詞テキストとの完全一致含む）・LayerStoryEventManagerのChapter1拡充分・DialogueManagerの一連のAPI（開始→セリフ送り→終了→既読記録→既読の再表示拒否→存在しないidの拒否→1行のみのDialogueでのタップ即終了）・実`EndlessSaveStore`での永続化と旧形式セーブからのマイグレーションを含め計38項目、全PASS。②jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）で、実際のPuzzle解答によるLayer1クリア→クリア結果オーバーレイの「つづける」タップ→Dialogueオーバーレイ表示（ARIA表示・文字送り演出の途中経過確認）→タップでの文字送り即時完了→自然完了（タイマー経由）での全文表示確認→次セリフへの遷移→最終セリフタップでのDialogue終了→`dialogueHistory`への記録→既存RUN進行（MAP画面への復帰）が正常に続くこと→Layer2クリアでの新規Dialogue表示→既読Dialogueの再表示拒否確認→既存の報酬処理・HUD表示への無影響→別インスタンスでのSave/Reload後の状態復元を含め計24項目、全PASS（テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**未実装/既知の制約**: `isPlaying()`は要求仕様どおり実装したが、現状これを参照して他の操作をブロックする箇所は無い（Dialogue表示中はオーバーレイが画面全体を覆うため、実質的に他の操作は既に不可能になっている）。他Chapter（2〜6）分のDialogueデータは、要求仕様セクション7が「Chapter1用」と明示的にスコープを限定しているため、今回は追加していない（`layerStoryEventManager.js`のChapter開始Layer分の1件ずつは既にプレースホルダーとして存在するため、`dialogueData.js`へ台詞データを追加するだけで拡張可能な状態にはなっている）。

## STEP32-3: Memory Fragment System

探索中に発見する記憶データ（Memory Fragment）を管理するシステムを追加する要求仕様（STEP32-3）に基づき実装した。要求仕様セクション5「Layer Clear→Story Event→Memory取得チェック」・セクション6「Dialogue連携」どおり、STEP32-1/STEP32-2で既に組み立て済みだったLayer Clear→Story Event→Dialogueのパイプラインへ、Memory取得チェックを差し込む形で統合した。

**新規ファイル**:
- `src/endless/memoryManager.js`（MemoryManager） — 要求仕様セクション1のAPI（`collectMemory`/`hasMemory`/`getCollectedMemories`/`getMemoryProgress`）に加え、要求仕様セクション5用の`checkLayerMemories(snapshot)`（storyUnlockManager.js等と同じ`{type,value}>=`比較でLayer Clear時に新規取得分を判定する）を実装した
- `src/endless/memoryData.js`（MemoryData） — 要求仕様セクション2の形式（`{id,title,description,chapter,type,content,unlockCondition}`）に、セクション7の`character`（関連キャラクター）フィールドを加えて実装。セクション3の「初期Memory Fragment作成（Chapter1用）」どおりMEMORY_001「Genesis Beginning」（Layer3クリアで取得）・MEMORY_002「Unknown Access」（Layer4クリアで取得）の2件のみを実装した
- `src/endless/memoryArchiveUI.js`（MemoryArchiveUI） — 要求仕様セクション4の新画面「MEMORY ARCHIVE」のDOM描画のみを持つ

**要求仕様に無く、こちらで設計した主な判断**:
- **「Memory Fragment」という語の第3の意味について**: このプロジェクトには既に「Memory Fragment」という語が2つの異なる意味で使われている（①`endlessSave.js`の`memoryFragments`＝Event Node等で獲得する単なる生涯累計カウンタ、②STEP32 Narrative & Story Systemの`storyData.js`内`memory_001`〜`006`＝totalRuns条件で解放されるStoryEntry）。本STEPが要求する`memoryProgress`というSave欄フィールド名自体はどちらとも衝突しなかったためそのまま採用したが、中身のMemory idは既存の`memory_001`等と紛らわしくなるのを避け、`memfrag_`接頭辞（`memfrag_001`/`memfrag_002`）で区別した
- **Dialogue連携（セクション6）の実装方法**: 「SYSTEM: Memory Fragment recovered.」という発言者を解決するため、`characterData.js`へ`system`（疑似キャラクター）を追加した。個々のMemory取得時Dialogueは`dialogueData.js`へ`${memoryId}_recovered`という命名規則のidで2行（1行目`system`固定文、2行目はMemoryの`character`フィールドが指す相手の反応セリフ）として実装した
- **Chapter DialogueとMemory Dialogueの同時発生への対応**: Layer3/Layer4クリアでは、STEP32-2のChapter Dialogue（`chapter01_layer03_clear`等）とMemory取得Dialogue（`memfrag_001_recovered`等）の両方が同一Layerクリアで発火する。`ui.showDialogue()`は単一オーバーレイのため同時に2件流し込むと片方が消える（STEP31/STEP32で繰り返し検出したのと同種の「後勝ち」問題）ため、`endless.js`の`_handleRoundClear`内でこれらをキュー（配列）にまとめ、`DialogueManager.onComplete`を使って1件ずつ直列に再生するよう設計した
- **Endless Research連携準備（セクション10）の具体化**: 「Memory収集率をResearch Archiveへ反映可能に」という要求を、既存のSTEP32 Narrative & Story System「RESEARCH DATABASE」画面のResearch Codex一覧（`_buildResearchCodexSummary()`）へ`MEMORY`行として実際に追加する形で満たした（「可能にする」の準備で留めず、実際に反映済みの状態にした）

**既存ファイルの変更**:
- `endlessSave.js`: `memoryProgress`（`{collectedMemoryIds:[]}`）を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった
- `characterData.js`/`dialogueData.js`: 前述のとおり`system`キャラクターと2件のMemory Fragment回収Dialogueを追加
- `endless.js`: `memoryManager`/`memoryArchiveUI`の生成、Archive Hubからの導線配線、`_handleRoundClear`内でのDialogueキュー化統合、`_buildResearchCodexSummary()`への`MEMORY`行追加

**テスト**: 2段階で実施した。①jsdom不要のNode.js単体テスト（MemoryData/CharacterData拡張/DialogueData拡張/MemoryManagerをwindowレルム内で読み込み、mockのsaveを注入して直接検証）で、MemoryData全2件（要求仕様のtitle/content/取得Layerとの完全一致含む）・既存`memory_00X`系idとの非衝突確認・CharacterData/DialogueDataの拡張分・MemoryManagerの一連のAPI（未取得→取得→重複取得拒否→未定義id拒否→一覧取得→収集率算出→Layer Clear連携での新規取得判定と再判定時の非重複）・実`EndlessSaveStore`での永続化と旧形式セーブからのマイグレーションを含め計34項目、全PASS。②jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）で、実際のPuzzle解答によるLayer1〜4の連続クリア→Layer1/2ではMemory未取得のままChapter Dialogueのみ再生されること→Layer3クリアでmemfrag_001が取得され、Chapter DialogueとMemory Dialogueがキューにより正しい順番で直列に再生されること→Layer4クリアでの同様の確認→MEMORY ARCHIVE画面（Collected: 2/2表示、各Memoryのtitle/character/content表示、戻るボタン）→Research CodexへのMEMORY行反映確認→既存の報酬処理・HUD表示への無影響→別インスタンスでのSave/Reload後の状態復元を含め計29項目、全PASS（2回連続実行で安定性も確認済み。テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**未実装/既知の制約**: 要求仕様セクション9「Story分岐準備」（`hasMemory()`を条件として利用可能にする）は、`MemoryManager.hasMemory(id)`が単純な同期的boolean判定として既に利用可能な状態であること自体をもって満たしたとみなし、これを実際に消費する新しい分岐システムは今回追加していない（要求仕様が「準備」と明示しているため）。他Chapter（2〜6）分のMemory Fragmentデータは、要求仕様セクション3が「Chapter1用」と明示的にスコープを限定しているため、今回は追加していない。

## STEP32-4: Character Relationship System

キャラクターごとの関係値・状態を管理し、Story進行によって会話やイベント内容を変化させるシステムを追加する要求仕様（STEP32-4）に基づき実装した。要求仕様セクション6「Memory取得→Relationship変化→状態更新」・セクション5「Dialogue条件対応」どおり、STEP32-2/STEP32-3で既に実装済みだったDialogue/Memory Fragmentパイプラインへ、キャラクター状態の管理と条件判定を差し込む形で統合した。

**新規ファイル**:
- `src/endless/relationshipManager.js`（RelationshipManager） — 要求仕様セクション1のAPI（`getRelationship`/`addRelationship`/`getCharacterState`/`checkCondition`）に加え、要求仕様セクション4/6用の`checkAriaEvolution()`（Memory取得数・重要Memory取得・Final Chapter到達の3条件をprotocolUnlock.js等と同じ`{type,value}>=`比較で判定し、ARIAの状態を進める）を実装した
- `src/endless/relationshipData.js`（RelationshipData） — 要求仕様セクション2/3の初期状態3件と、セクション4のARIA状態変化テーブル（LEVEL0 Logical AI→LEVEL1 Curious AI→LEVEL2 Emotional AI→LEVEL3 Self Aware）を実装した
- `src/endless/characterArchiveUI.js`（CharacterArchiveUI） — 要求仕様セクション8の新画面「CHARACTER ARCHIVE」のDOM描画のみを持つ

**要求仕様に無く、こちらで設計した主な判断**:
- **`level`を独立フィールドとして永続化しない設計**: 要求仕様セクション2のデータ形式は`level`を含むが、セクション9の実際のSave対象は`{characterId,relationship,state}`のみで`level`が無い。`state`から`RelationshipData.ARIA_LEVELS`を逆引きすれば`level`は常に一意に導出できるため、重複データを持たず都度計算する設計にした（`discoveryRate`等、既存endlessSave.jsの一貫した設計判断を踏襲）
- **LEVEL2「重要Memory取得」・LEVEL3「Final Chapter」の具体的な判定基準**: 要求仕様に具体的な指定が無かったため設計した。LEVEL2は`memfrag_002`（Unknown Access、ARIA自身のアクセスIDに関わる記録）を「重要Memory」とした（2件しかないMemoryのうち、より個人的な内容の方を採用）。LEVEL3は`layerStoryData.js`の最終Chapter（chapter06）到達とした
- **ARIA状態遷移のタイミング（実テストで発見・修正したバグ）**: 当初`checkAriaEvolution()`をMemory取得直後、Dialogueキュー再生より前に呼んでいたところ、`memfrag_002_recovered`に付けた`condition:{character:'aria',state:'CURIOUS_AI'}`（セクション5の動作例）が、Dialogue表示前にARIAが既にEMOTIONAL_AIへ進化してしまうため常に不成立になり、Dialogue自体が表示されなくなるバグを検出した。「Dialogueのcondition判定は、そのLayerクリアで取得したMemoryを反映する前の状態に対して行われるべき」という設計に修正し、`checkAriaEvolution()`の呼び出しをDialogueキューが完全に再生し終えた直後（`nextStep()`直前）まで遅らせた
- **Choice対応準備（セクション7）**: `addRelationship(characterId, value)`が既に「任意の理由（Memory取得/将来のChoice結果等）による関係値変更」を受け付ける汎用APIとして成立しているため、これを将来のChoice Event実装時の合成部品として使う想定とし、専用の新しいデータ構造・処理は追加していない
- **Endless Research連携（セクション10）**: STEP32-1の設計（Layer Narrative SystemはENDLESS RESEARCH本体の`endless.js`へ直接組み込まれており、別モードとして分離されていない）により、`relationshipManager`は他の全システムと同じ`this.save`を共有するため、RUNをまたいでもARIAの状態は自然に維持される（新しいRUNを開始してもリセットされない）。実テストでこれを明示的に確認した

**既存ファイルの変更**:
- `endlessSave.js`: `relationshipData`（`{player,aria,lost_researcher}`各`{characterId,relationship,state}`）を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった
- `dialogueManager.js`: `relationshipManager`を任意の依存として受け取れるようにし、`startDialogue()`内で`dialogue.condition`があれば`checkCondition()`でゲートするよう拡張（`relationshipManager`省略時は従来どおり無条件で表示する後方互換を維持）
- `dialogueData.js`: `memfrag_002_recovered`へ要求仕様セクション5の動作例として`condition:{character:'aria',state:'CURIOUS_AI'}`を追加した
- `endless.js`: `memoryManager`より後・`dialogueManager`より前に`relationshipManager`/`characterArchiveUI`を生成する順序に並べ替え（`relationshipManager`が`memoryManager`/`storyManager`に、`dialogueManager`が`relationshipManager`にそれぞれ依存するため）、Archive Hubからの導線配線、`_handleRoundClear`内でのMemory取得時`addRelationship`呼び出しと、Dialogueキュー再生完了後の`checkAriaEvolution()`呼び出しを追加した

**テスト**: 2段階で実施した。①jsdom不要のNode.js単体テスト（RelationshipData/RelationshipManager/DialogueManagerの条件ゲートをwindowレルム内で読み込み、mockのsave/memoryManager/storyManagerを注入して直接検証）で、RelationshipDataの初期値・ARIA_LEVELSの逆引き・状態名解決・RelationshipManagerの一連のAPI（関係値取得/加算/累積/存在しないキャラクターへの安全な加算/条件判定/ARIA状態遷移の3段階すべて＋非ARIAキャラクターへの非適用＋再判定時の非重複進行）・DialogueManagerのcondition判定によるゲート（ブロック/通過/relationshipManager省略時の後方互換/condition無しDialogueへの非影響）・実`EndlessSaveStore`での永続化と旧形式セーブからのマイグレーションを含め計36項目、全PASS。②jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）で、実際のPuzzle解答によるLayer1〜4の連続クリア→Layer1/2ではARIAがLOGICAL_AIのまま変化しないこと→Layer3でのmemfrag_001取得によるrelationship+5とCURIOUS_AIへの遷移→Layer4でのmemfrag_002（重要Memory）取得によるrelationship+5(計10)とEMOTIONAL_AIへの遷移、および条件付きDialogue（memfrag_002_recovered）が正しいタイミングで実際に表示・完了すること→CHARACTER ARCHIVE画面（State/Memory/Relationship表示、戻るボタン）→新規RUN開始をまたいでもARIA状態が維持されること（Endless Research連携）→既存機能への無影響→別インスタンスでのSave/Reload後の状態復元を含め計26項目、全PASS（ユニット/統合とも2回連続実行で安定性も確認済み。テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**未実装/既知の制約**: Lost Researcherの関係値・状態は初期値のまま変化させる仕組みを実装していない（要求仕様セクション4がARIAの状態変化のみを具体的に要求しており、Lost Researcher/Playerの変化条件は指定されていないため）。Choice Event本体（要求仕様セクション7）は前述のとおり「準備」に留め、実際のChoice UIやイベントトリガーは追加していない。

## STEP32-5-1: Chapter01 First Signal Content Integration

Chapter01「First Signal」の実コンテンツ（台詞・Memory Fragment・Chapter完了演出）を、STEP32-1〜STEP32-4で構築済みのLayer Narrative Systemへ追加する要求仕様（STEP32-5-1）に基づき実装した。要求仕様が明記する「コード構造は変更せず、Data追加方式で実装」を徹底し、`StoryManager`/`DialogueManager`/`MemoryManager`/`RelationshipManager`の4クラス自体には一切手を加えず、既存データファイル（`dialogueData.js`/`memoryData.js`）の内容改訂と、`endless.js`（既存の統合・配線レイヤー、これまでの全STEP32系サブステップで一貫して唯一の変更対象だった箇所）への数行の追加のみで実現した。

**新規ファイルは無し（Data改訂のみ）**:
- `dialogueData.js`: Chapter1 Layer1〜3のChapter Dialogue台詞を要求仕様どおりに全面改訂した（Layer1は2行→3行、Layer2/3も文言を全面更新。Layer4は要求仕様の台詞が既存実装と完全一致していたため変更していない）
- `memoryData.js`: `memfrag_001`（Genesis Beginning）の取得LayerをLayer3→Layer2へ、`memfrag_002`の取得LayerをLayer4→Layer3へ、それぞれ前倒しした。`memfrag_002`のtitleを要求仕様どおり「Unknown Access」→「Unknown Researcher」へ改名し、両方のcontentを要求仕様のテキストへ更新した

**要求仕様に無く、こちらで設計した主な判断**:
- **Relationship付与を「Layer3のみ」に絞る方法**: 要求仕様はLayer2のMemory取得（MEMORY_001）にはRelationship変化を記載せず、Layer3のMemory取得（MEMORY_002）にのみ「Relationship: ARIA +5」と明記している。この非対称性を、既存の`endless.js`のロジック（`if (m.character) this.relationshipManager.addRelationship(...)`、STEP32-4で実装済み・無変更）はそのままに、`memfrag_001.character`を`aria`から`null`へ変更するだけの**データ変更のみ**で表現した。これにより「コード構造を変更しない」という制約を完全に満たしつつ、要求仕様どおりの挙動を実現した（副作用として、CHARACTER ARCHIVE画面のARIAの「Memory」欄は2/2ではなく1/2表示になる。memfrag_001は`character`を持たないため、キャラクター別カウントの対象から外れるため。この副作用は許容できる範囲と判断した）
- **Chapter Complete表示の実装方法**: 要求仕様セクション「Layer4 Clear Event」が求める「CHAPTER 01 COMPLETE / FIRST SIGNAL」という完了演出は、既存4クラスのいずれにも該当する表示機能が無かったため、`endless.js`に`_showChapterCompleteOverlay()`という小さなヘルパーメソッドを追加した。ただしこれは既存の`ui.showNodeResult()`（RUN中のあらゆる結果表示に既に使われている汎用オーバーレイ）をそのまま呼ぶだけで、新しいDOM要素・新しいCSS・新しいUIクラスは一切追加していない。Chapter完了の判定自体も、`StoryManager`を変更せず、`_handleRoundClear`内で`storyManager.onLayerClear()`を呼ぶ**前**に`getCurrentChapter()`で「クリア前のChapter」を控え、クリアしたLayerがそのChapterの`endLayer`以上かどうかを`endless.js`側で判定するだけに留めた（StoryManagerの`completeChapter()`内部ロジックと同じ判定式を、呼び出し側で二重に評価する形。StoryManager自体に「Chapter完了を通知する」ための新しい返り値やイベントを追加するコード変更を避けるための設計判断）
- **表示タイミング**: Chapter Complete表示は、Layer4のChapter Dialogue（`chapter01_layer04_clear`）が再生し終わった直後（Dialogueキューが空になった瞬間）に表示するよう統合した。ARIA状態遷移（`checkAriaEvolution()`）の判定より後、`nextStep()`（MAPへの復帰処理）より前、という既存の一連のコールバックチェーンへ自然に追加した

**既存ファイルの変更**: `endless.js`のみ。`_handleRoundClear`冒頭で`chapterBeforeClear`を控える1行、Chapter完了判定の1行、Dialogueキュー完了時のChapter Complete表示呼び出し数行、および`_showChapterCompleteOverlay()`ヘルパーメソッド本体を追加した。

**テスト**: 主に統合テストで検証した（今回はコード変更が最小限のためNode.js単体テストは割愛し、実際のプレイフローを通したjsdom統合テストに焦点を絞った）。jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）で、まずデータ内容そのものの直接検証（`memfrag_001`/`memfrag_002`の新Layer・新content・新character、Layer1〜4の新台詞テキストが要求仕様と完全一致すること）を行い、続けて実際のPuzzle解答によるLayer1〜4の連続クリアで、Layer1では変化無し→Layer2でMEMORY_001取得かつRelationship変化無し（CURIOUS_AIへの遷移のみ）→Layer3でMEMORY_002取得かつRelationship+5ちょうど（Layer2分が加算されていないことも確認）と条件付きDialogueの正常表示→Layer4でのChapter Dialogue再生後にCHAPTER 01 COMPLETE/FIRST SIGNAL表示→chapter01完了記録・chapter02解放・MAP画面への復帰→既存の報酬処理への無影響→別インスタンスでのSave/Reload後の状態復元を含め計31項目、全PASS（2回連続実行で安定性も確認済み、間欠的なjsdom/undiciのネットワークflakeが1回発生したが再実行で正常終了を確認。テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**未実装/既知の制約**: Layer3のChapter Dialogue（「なぜ私の内部に存在するのでしょう。」）と、同じLayer3で連続再生されるMemory Fragment回収Dialogue（`memfrag_002_recovered`、「なぜ私の内部データに存在するのでしょう。」）は、要求仕様がそれぞれ独立して指定した台詞のため、内容が非常に似通ったまま連続表示される（意図的にどちらかを削除・統合していない。要求仕様の記述をそのまま実装した結果であり、将来的に片方を調整する余地がある点をここに記録しておく）。

## STEP32-5-2: Layer Narrative System汎用化基盤

Layer Narrative SystemをChapter1専用から、Chapter2以降を追加可能な汎用システムへ拡張する要求仕様（STEP32-5-2）に基づき実装した。要求仕様が明記する「今回はゲームコンテンツ追加ではなく、Story拡張基盤の整備が目的」を徹底し、`docs/STORY_BIBLE.md`（本要求の事前条件として存在確認済み）を設定の基準として扱いつつ、実際のゲーム進行（`endless.js`の`_handleRoundClear`）には一切手を加えず、新規データファイルの追加と既存データファイルへの「予約枠」追加のみで実装した。

**新規ファイル**:
- `src/endless/layerContentData.js`（LayerContentData） — 要求仕様セクション2が求める統一Layer Story Data構造（`layerId/chapterId/title/environment/dialogueId/memoryId/relationshipChange`）を実装した新規の正本テーブル。これまで`layerStoryEventManager.js`（Dialogue idの検索）・`memoryData.js`（Memoryごとの`unlockCondition`）・`endless.js`内の固定値（Relationship+5）に分散していた「Layer1件分の内容」を、1レコードとして見渡せる形に整理した。Layer1〜4は既存実装（STEP32-5-1）の実際の値と1:1で一致させ、Layer5〜30は要求仕様セクション3と同じ「locked（予約）」プレースホルダーとした

**要求仕様に無く、こちらで設計した主な判断**:
- **セクション1「Chapter Data拡張」は追加不要だった**: `layerStoryData.js`のChapter02〜06（title/Layer範囲/unlockCondition）は、既にSTEP32-1の時点で要求仕様と完全に一致する内容が実装済みだった（Chapter同士のタイトル・Layer範囲は当時からStory Bibleと同じ設計だったため）。データを重複追加せず、既存実装が要求を満たしていることを確認するのみに留めた
- **`LayerContentData`を今回は実行経路から参照させない設計**: 新設した統一テーブルは、要求仕様セクション5「Dialogue管理を確認」・セクション7の検証項目（Chapter1動作が変化していないこと/Endless Research動作に影響がないこと）を踏まえ、あえて`endless.js`側から一切参照させない「純粋な将来の拡張基盤」として設計した。既存の実行パス（`layerStoryEventManager.checkLayerEvent()`/`memoryData.js`の`unlockCondition`/Relationship+5の固定値）は完全に無変更のままとした。Chapter2以降に実際のDialogueコンテンツを追加するタイミング（本ステップより後）で、`StoryManager`側がこのテーブルを正本として参照するよう統合することを見込んでいるが、その統合自体は今回のスコープ外とした
- **Memory003〜030・Partner AIの「locked/予約」実現方法**: 既存コード（`memoryManager.js`/`relationshipManager.js`）を一切変更せず、データの持たせ方だけで安全に無効化した。
  - Memory: `unlockCondition: null`にすると、既存の`MemoryManager._checkUnlockCondition()`（`if (!condition) return false`）が常にfalseを返すため、絶対に自動取得されない
  - Partner AI（LEVEL4）: `condition.type`に、`RelationshipManager._buildAriaSnapshot()`が絶対に生成しないキー（`reserved`）を指定した。`_checkLevelCondition()`は`snapshot[condition.type]||0 >= condition.value`で判定するため、snapshotに存在しないキーは常に0として扱われ、到達不可能になる
  - どちらも「将来、本物の条件に差し替えるだけで有効化できる」形を保ちつつ、今回は絶対に発火しないことをテストで保証した
- **Memory003〜030のChapter割り当て**: 要求仕様に具体的な配分指定が無かったため、Layer範囲の広さに比例させて設計した（Chapter2〜5は各4件、Layer21〜30と特に長いFinal Chapterのみ12件、既存2件と合わせて合計30件）

**既存ファイルの変更（いずれもデータの追加のみ、既存のキー・値は変更していない）**:
- `memoryData.js`: `memfrag_003`〜`memfrag_030`（28件、全て`locked:true`・`unlockCondition:null`）を追加
- `relationshipData.js`: `ARIA_LEVELS`へLEVEL4「Partner AI」（`reserved:true`、到達不可能な`condition`）を追加

**テスト**: 2段階で実施した。①jsdom不要のNode.js単体テスト（LayerContentData/MemoryData/RelationshipDataをwindowレルム内で読み込み、実`MemoryManager`/`RelationshipManager`へmockのsaveを注入して直接検証）で、既存Chapter Dataの内容確認・LayerContentData全30件のスキーマ・Layer1〜4の値が実装済みデータと完全一致すること・Layer5〜30が正しくlocked/導出されたchapterId/environmentを持つこと・MemoryData全30件のid一意性とChapter配分・重要な安全性検証（`layerReached:30`まで到達させても、lockedな28件は一切自動取得されず実装済み2件のみが取得されること）・重要な安全性検証（ARIA進化条件を極端に満たす状況を作っても、Partner AIには絶対到達せずSELF_AWARE止まりであること）を含め計32項目、全PASS。②jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）で、まず`memoryProgress`/`relationshipData`/`layerStoryProgress`を含む既存形式のセーブデータを直接localStorageへ書き込んでLoadが成功しデータが破壊されないことを確認し（要求仕様セクション6）、続けて実際のPuzzle解答によるLayer1〜4の連続クリアがSTEP32-5-1実装時と完全に同一の結果（台詞・Memory取得・Relationship変化・Chapter Complete表示・Chapter2解放）になることを確認、MEMORY ARCHIVE画面が新しい母数を反映して「2 / 30」・ロック済み28件を正しく表示すること・既存Endless RESEARCH機能への無影響・別インスタンスでのSave/Reload後の状態復元を含め計27項目、全PASS（ユニット/統合とも2回連続実行で安定性も確認済み。テスト中、間欠的なjsdomのスクリプト読み込みタイミングflakeが数回発生したため、待機時間を4秒→6秒へ延長して安定させた。テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**未実装/既知の制約**: 要求仕様が明示するとおり、Chapter2以降の本文Dialogue・Memory内容は今回追加していない（`locked`状態のプレースホルダーのみ）。`layerContentData.js`は現時点で実行経路から参照されない「将来の拡張基盤」に留まる。Chapter2以降へ実コンテンツを追加する将来のステップで、`StoryManager`側をこのテーブル経由の参照へ統合するかどうかは、その時点の要求仕様次第とし、今回は判断を先送りにした。

## STEP33: Research Archive System

プレイヤーが探索で取得した情報を確認できるResearch Archiveシステムを追加する要求仕様（STEP33）に基づき実装した。要求仕様セクション5「Protocol Archiveは既存システムがある場合統合」の方針を、Story以外の全カテゴリ（Memory/Character/Protocol/Facility）へ適用し、新規実装は「Story（Chapter進行一覧）」と「5カテゴリへのナビゲーションHub」の2画面のみに絞った。既存の各Archive画面自体（表示内容・データ）には一切手を加えていない。

**新規ファイル**:
- `src/endless/researchArchiveUI.js`（ResearchArchiveUI） — 要求仕様セクション1の「Story/Memory/Character/Protocol/Facility」5メニューを持つ新設Hub画面。各ボタンは対応する既存（または新設の）Archiveクラスの`show()`をそのまま呼ぶだけ
- `src/endless/chapterArchiveUI.js`（ChapterArchiveUI） — 要求仕様セクション2の「Story Archive」。`layerStoryData.js`（Chapter Data）と`layerStoryProgress`（Save Data）を参照し、各Chapterのtitle/unlock状態/completion状態/Layer進行を一覧表示する（これまで存在しなかった、Chapter単位の見渡し画面）

**要求仕様に無く、こちらで設計した主な判断**:
- **カテゴリと既存実装の対応付け**: 要求仕様セクション3「Memory Archive」→既存`memoryArchiveUI.js`（STEP32-3）、セクション4「Character Archive」→既存`characterArchiveUI.js`（STEP32-4）、セクション5「Protocol Archive」→既存`protocolArchive.js`（Phase C）、セクション6「Facility Archive」（`worldEnvironment.js`と連携しEnvironment発見状態を表示）→既存`worldEnvironmentArchive.js`（STEP30-3、要求仕様の説明と完全に一致する画面が既にあった）として、それぞれ新規実装せず統合した
- **二重化した「戻る」ボタンの動的解決**: 既存の各Archive画面は、従来の「ARCHIVE HUB」（8個の詳細アーカイブ一覧、STEP30〜32-4で順次追加されてきた既存画面）からも引き続き開けるようにする必要があった（要求仕様セクション8「Endless Research動作維持」＝既存画面の動作を壊さないことを含むと解釈）。同じ画面を2つの入口（従来のARCHIVE HUB／新設のRESEARCH ARCHIVE）から開けるようにしつつ「戻る」を正しい行き先へ振り分けるため、各Archiveクラスの`onBack`プロパティを**呼び出し直前に動的に上書きする**設計にした（`researchArchiveUI.js`の`_bindTabButton()`が`targetUI.onBack = () => this.show()`を`show()`の直前に設定する）。これにより、ARCHIVE HUB経由なら`_showArchiveHub()`、RESEARCH ARCHIVE経由ならこのHubへ、常に直前に開いた入口へ正しく戻る
- **`protocolArchive.js`への`onBack`追加**: 上記の統一的な「戻る」振り分けを実現するには、`protocolArchive.js`だけが他の6つのArchiveクラスと異なり`onBack`プロパティを持たず、戻るボタンが`endless.js`側で`_showArchiveHub()`に直接ハードコードされていた。他クラスと同じ`onBack`パターンへ揃える最小限の変更（プロパティ追加+`endless.js`側のクリックハンドラを`onBack`優先に変更、無指定時は従来どおり`_showArchiveHub()`へフォールバック）を行い、後方互換を保ったまま二重入口に対応させた
- **`archiveData`の内容**: 要求仕様セクション7が求める新規Save対象として、直近開いていたタブ（`lastViewedTab`）のみを持たせた。5カテゴリのうちStory以外は全て既存のSaveフィールド（`memoryProgress`/`relationshipData`/`unlockedProtocols`/`discoveredWorldEnvironments`等）をそのまま参照するため、真に新規で必要な永続データはこの1項目のみだった
- **既存ARCHIVE HUBの扱い**: 要求仕様セクション8「Mobile UI崩れなし」を踏まえ、既存の8ボタンの並びは一切変更せず、先頭に「🗄️ RESEARCH ARCHIVE」を1つ追加するだけに留めた（既存画面への回帰リスクを最小化する、このセッションで繰り返し採用してきた「既存要素は変更せず追加のみ」の方針）

**既存ファイルの変更**:
- `endlessSave.js`: `archiveData`（`{lastViewedTab:null}`）を追加。既存のマイグレーション機構がそのまま働くため追加コード不要だった
- `protocolArchive.js`: `onBack`プロパティを追加（前述）
- `endless.js`: `chapterArchiveUI`/`researchArchiveUI`の生成（`protocolArchive`/`worldEnvironmentArchive`等5つの依存が揃った直後に配置）、ARCHIVE HUBからの新規導線配線、Protocol Archiveの戻るボタンを`onBack`優先に変更

**テスト**: 統合テストに焦点を絞った（今回は既存クラスの再利用が中心で新規ロジックが少ないため）。jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）で、`archiveData`を持たない旧形式セーブからのマイグレーション確認→ARCHIVE HUBからRESEARCH ARCHIVEへの導線→STORY（Chapter1のみ表示・他5Chapterが正しくLOCKED表示されること）→MEMORY/CHARACTER/PROTOCOL/FACILITYの4カテゴリがそれぞれ既存Archive画面をそのまま開くこと→各画面からRESEARCH ARCHIVEへ正しく戻ること（動的`onBack`の検証）→RESEARCH ARCHIVEからARCHIVE HUBへ戻ること→**回帰確認として**従来どおりARCHIVE HUBからProtocol/Memory Archiveを開いた場合は引き続きARCHIVE HUBへ戻ること（RESEARCH ARCHIVE経由で上書きされた`onBack`が正しく再上書きされ、迷子にならないこと）→実際のPuzzle解答によるLayer1クリアが従来どおり動作すること（STEP32-5-1/5-2の回帰確認）→別インスタンスでのSave/Reload後の状態復元を含め計33項目、全PASS（2回連続実行で安定性も確認済み。テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**未実装/既知の制約**: 要求仕様セクション5「Lore表示項目を追加可能な構造にする」について、`protocolArchive.js`自体は改修していない（既存の`description`/`rarity`表示のまま）。Lore項目（研究技術としての世界観説明等）を追加する場合、`docs/STORY_BIBLE.md`5章で整理済みのProtocol Loreカテゴリ分類を参照し、`protocols.js`/`protocolSignals.js`のデータへ新しいフィールド（例: `lore`）を追加し`protocolArchive.js`の`_render()`で表示するだけで対応できる構造（データ駆動）にはなっているが、実際のフィールド追加・表示は今回のスコープ外とした。

## STEP34: Layer Clear → Story Narrative統合、Chapter1完成

LayerクリアとStory Narrativeを接続し、Chapter1のストーリー体験を完成させる要求仕様（STEP34）に基づき実装した。要求仕様セクション1が明示する新しい演出順序（Layer Clear→Story Event Check→Dialogue→Memory Unlock→Relationship Update→Reward）に合わせて`_handleRoundClear`を再構成し、STEP32-5-2で「将来の拡張基盤」として用意しただけだった`layerContentData.js`を、実際にゲーム進行から参照される正本テーブルへ昇格させた。

**新規ファイルは無し**。既存6ファイルの改修のみ（データ改訂+ロジック統合）。

**要求仕様に無く、こちらで設計した主な判断**:
- **`layerContentData.js`を「Story Event管理システム」として正式採用**: 要求仕様セクション2の管理項目（`eventId/trigger/dialogueId/memoryId/relationshipChange`）のうち、`dialogueId`/`memoryId`/`relationshipChange`は既に`layerContentData.js`（STEP32-5-2）が持っていたため、不足していた`eventId`/`trigger`（`trigger`は全件共通で`'LAYER_CLEAR'`）だけを追加する形で対応した。3つ目の類似データファイルを新設せず、既存の正本テーブルを拡充する選択をした
- **`StoryManager.onLayerClear()`の参照先切り替え**: これまで`layerStoryEventManager.js`（Dialogue idのみを検索する専用テーブル、STEP32-1/32-2で実行経路として使用）を参照していたのを`layerContentData.js`へ切り替えた。STEP32-5-2の時点でLayer1〜4の値が旧実装と1:1一致することを検証済みだったため、この切り替え自体はChapter1の挙動に影響しない（実テストで確認）。`layerStoryEventManager.js`は削除せず、実行経路から外れた状態でファイルとしては残している
- **Layer3/Layer4の再配分**: 要求仕様セクション3が「Layer3: ARIA解析イベント（Memory記載なし）」「Layer4: Memory002 Unknown Researcher取得+Chapter1完了イベント」と明記したため、STEP32-5-1時点でLayer3に置いていたmemfrag_002の取得を再びLayer4へ移した（`memoryData.js`の`unlockCondition`と`layerContentData.js`の`memoryId`/`relationshipChange`を連動して変更）。Layer3の`chapter01_layer03_clear`Dialogue自体（「このデータは隔離されています。／なぜ私の内部に存在するのでしょう。」）は改変せず、そのまま「ARIA解析イベント」として再定義した
- **Memory Unlock/Relationship Updateの駆動方式変更**: 従来`memoryManager.checkLayerMemories()`（`MemoryData.ALL`を毎回全件走査し`unlockCondition`を評価）で行っていたMemory取得判定を、`layerEvent.memoryId`（Story Event管理テーブルが直接指定する値）による直接呼び出し（`memoryManager.collectMemory(id)`）へ変更した。同様にRelationship加算も、従来の「取得したMemoryに`character`フィールドがあれば固定値+5」という判定から、`layerEvent.relationshipChange`（`{character,value}`）が直接指定する値を使う方式へ変更した。`checkLayerMemories()`自体はAPIとして削除せず残している（テスト・将来利用のため）
- **Memory取得時演出「MEMORY FOUND」の設計（要求仕様セクション5）**: 既存の`showNodeResult`をそのまま再利用し、新規オーバーレイ・新規UIクラスは追加しなかった。「MEMORY FOUND / Memory Title / ARIA Analysis」という3行構成を、①`showNodeResult`で"MEMORY FOUND"+Memory Titleと内容を表示→②既存の`${memoryId}_recovered`Dialogue（STEP32-3、ARIAの反応セリフ）を"ARIA Analysis"として再生、という2段階の演出として実現した。新しいDialogue文面は追加していない（既存のものをそのまま「ARIA Analysis」の実体として位置づけ直した）
- **演出順序の入れ替えが既存Endless RESEARCHへ与える影響**: Reward表示を最後に回す変更は、Story内容（`layerEvent.dialogueId`等）が存在するLayerでのみ意味を持つ。Story未実装の大多数のLayer（5以降）では`storySteps`が空になるため、即座にRewardオーバーレイが表示され、体感上は変更前と完全に同一になる（実テストで確認、要求仕様セクション7「Endless Research動作維持」）
- **Dialogue条件`storyProgress`の判定基準**: 要求仕様に具体的な比較対象の指定が無かったため、既存の`layerReached`系の判定と一貫性を持たせ、`{type:'storyProgress', minLayer}`で「現在のStory Layer進行がminLayer以上か」を判定するシンプルな形にした（Chapter比較等の複雑な条件は今回は実装していない）

**既存ファイルの変更**:
- `layerContentData.js`: 全レコードへ`eventId`/`trigger`を追加。Layer3/Layer4の`memoryId`/`relationshipChange`/`title`を前述のとおり再配分
- `memoryData.js`: `memfrag_002.unlockCondition.value`を3→4に変更
- `storyManager.js`: `onLayerClear()`の参照先を`LayerStoryEventManager.checkLayerEvent()`→`LayerContentData.getByLayer()`へ切り替え
- `relationshipManager.js`: `checkCondition()`を`type`付きの3条件（`ariaState`/`relationship`/`storyProgress`）へ拡張（`type`無しのレガシー形式は`ariaState`として後方互換動作）
- `dialogueData.js`: `memfrag_002_recovered`のconditionを新形式`{type:'ariaState',...}`へ移行
- `endless.js`: `_handleRoundClear`の演出順序を再構成（Story Event Check→Dialogue→Memory Unlock→Relationship Update→Chapter Complete→Rewardの順）。`MemoryData`を新たにimportし、Memory Unlock/Relationship Updateを`layerEvent`駆動に変更

**テスト**: 2段階で実施した。①jsdom不要のNode.js単体テスト（layerContentData/memoryData/storyManager/relationshipManager/dialogueDataをwindowレルム内で読み込み、mockのsaveを注入して直接検証）で、Layer1〜5のレコード内容（新eventId/trigger、Layer3/4の再配分）・`memoryData.js`のunlockCondition変更・`StoryManager.onLayerClear()`が新しいレコード形状を返すこと・`RelationshipManager.checkCondition()`の全パターン（レガシー形式/ariaState/relationship/storyProgress/null/未知typeのフェイルオープン）・`dialogueData.js`の条件移行を含め計19項目、全PASS。②jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）で、既存形式セーブのLoad確認→実際のPuzzle解答によるLayer1〜4の完全な新シーケンス確認（Layer1: Dialogueが先でRewardが後になる順序転換／Layer2: Dialogue→MEMORY FOUND→ARIA Analysis→Rewardの4段階、memfrag_001取得・relationship変化無し・CURIOUS_AI遷移／Layer3: ARIA解析イベントのみ（Memory無し）／Layer4: Dialogue→MEMORY FOUND(Unknown Researcher)→条件付きARIA Analysis→relationship+5→Chapter Complete→Reward、chapter02解放）→Story ArchiveへのChapter1 COMPLETE反映確認→Protocol Archive/Research Map画面への無影響確認→既存の報酬処理への無影響→別インスタンスでのSave/Reload後の状態復元を含め計39項目、全PASS（ユニット/統合とも2回連続実行で安定性も確認済み。テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**未実装/既知の制約**: `layerStoryEventManager.js`（STEP32-1/32-2）は実行経路から外れたが、要求仕様に明示的な削除指示が無いためファイル自体は残した（`index.html`の読み込みも残している。未使用コードとして将来整理する余地がある点をここに記録する）。Dialogue条件`storyProgress`のChapter単位の比較（例: 「Chapter2以降でのみ表示」）は今回実装しておらず、Layer番号の比較のみに対応している。

## STEP35: Chapter2「Lost Data」Layer5〜8コンテンツ追加

Chapter2「Lost Data」（Layer5〜8）のストーリーコンテンツを追加する要求仕様（STEP35）に基づき実装した。STEP34で確立した「Story Event Check→Dialogue→Memory Unlock→Relationship Update→Reward」のLayer Clearフローと、`layerContentData.js`を正本とするStory Event管理システムは、Chapter2でも一切の実行ロジック変更なしにそのまま機能した（新規実装は全てデータ追加のみ）。

**要求仕様に無く、こちらで設計した主な判断**:
- **ARIA状態の扱い（要求仕様セクション3「開始: Curious AI／終了: Curious AI」との整合）**: 実装前に実機テストで確認したところ、Chapter1 Layer4で取得するmemfrag_002が`relationshipData.js`のLEVEL2（`EMOTIONAL_AI`）到達条件（`importantMemoryCollected`）を満たすため、実際にはARIAはChapter1完了と同時に内部state値としては`EMOTIONAL_AI`へ遷移済みであることが判明した（これはSTEP32-4で意図的に設計されたChapter1完結の演出）。要求仕様セクション7「Chapter1動作維持」を優先し、この遷移条件自体は変更していない。そのため要求仕様セクション3の「Curious AI」という記述は、内部state値を強制的にCURIOUS_AIへ固定する指示ではなく、**台詞の書きぶり（理知的で好奇心に満ちた口調を保つこと）への指示**として解釈した。Chapter2の全Dialogueは「〜が分かってきました」「理解が深まってきました」のような分析的な言い回しで統一し、要求仕様セクション3の「変化は感情ではなく理解度向上として表現する」を文字どおり満たす形にした。この解釈の経緯と根拠（実機テストのARIA state確認結果）を`dialogueData.js`のコメントに詳しく記録した
- **Layer7/8のRelationship配分**: 要求仕様セクション5「Layer7: ARIA Relationship +5」のみ明記されていたため、Layer8には`relationshipChange: null`を設定した（Chapter1のLayer4パターン、Memory取得と同時にRelationship変化が明記されている箇所にのみ付与する既存の設計方針を踏襲）
- **Memory003/004のcharacterフィールド**: memfrag_003（Layer7、Relationship+5とセット）は`character: 'aria'`、memfrag_004（Layer8、Relationship変化なし）は`character: null`とし、Chapter1のmemfrag_001/002と同じ「Relationship変化を伴うMemoryにはcharacterを設定する」という命名規約を維持した（STEP34以降、実際のRelationship駆動は`layerContentData.js`の`relationshipChange`が正本のため、この`character`フィールド自体はドキュメンテーション目的の記録用）

**既存ファイルの変更**:
- `layerContentData.js`: Layer5〜8を`locked`予約からIMPLEMENTEDへ昇格。Layer9以降は引き続きlocked予約のまま
- `memoryData.js`: memfrag_003（Researcher Profile）/memfrag_004（Genesis Project Log）を`locked`予約からIMPLEMENTEDへ昇格。`RESERVED_COUNT_BY_CHAPTER`のchapter02を4→2件（memfrag_005/006のみ残存）へ調整（合計30件は変わらない）
- `dialogueData.js`: Chapter2 Layer5〜8のChapter Dialogue（4件）とMemory回収Dialogue（memfrag_003_recovered/memfrag_004_recovered、2件）を追加

**新規ファイルは無し**。`layerStoryData.js`のchapter02定義（title/Layer範囲/Environment）は既にSTEP32-1で要求仕様と完全一致する内容が実装済みだったため、変更不要だった。`chapterArchiveUI.js`（STEP33）も、`LayerStoryData`/`layerStoryProgress`を汎用的に参照する設計のため、Chapter2の進行状態表示（要求仕様セクション6）にコード変更なしで対応できた。

**テスト**: jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）を実施した。データ内容確認（Layer5〜8のeventId/dialogueId/memoryId/relationshipChange/environment、memfrag_003/004の内容、reservedカウント調整）→既存形式セーブのLoad確認→実際のPuzzle解答によるChapter1クリア（Chapter1動作維持の回帰確認、ARIAがEMOTIONAL_AIへ到達することも含めて確認）→Chapter2 Layer5〜8の完全な新シーケンス確認（Layer5: Chapter2開始イベント、Dialogueのみ／Layer6: 破損データ解析イベント、Dialogueのみ／Layer7: Dialogue→MEMORY FOUND(Researcher Profile)→ARIA Analysis→Relationship+5／Layer8: Dialogue→MEMORY FOUND(Genesis Project Log)→ARIA Analysis→Chapter Complete→Reward、chapter03解放）→Story Archive/Memory Archiveへの反映確認→Protocol Archive/Research Map/既存報酬処理への無影響確認→別インスタンスでのSave/Reload後の状態復元を含め計49項目、全PASS（2回連続実行で安定性も確認済み。テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**テスト実装中に発見したテストハーネス側の問題（ゲームロジックのバグではない）**: 初回のテスト実装でLayer6のDialogueが表示されない失敗が発生し、原因調査の結果、`transitionManager.js`（STEP30-3のEnvironment Transition演出）が「続ける」ボタンクリック待ちで自動には閉じない設計であるにもかかわらず、既存のテストヘルパー`enterLayer()`がこのオーバーレイの dismiss処理を持っていなかったことが原因と判明した（Chapter1のLayer1〜4は偶然すべて同一Environment内で完結していたため、これまでのSTEP32〜34のテストではこの演出が一度も発生せず、見過ごされていた）。Chapter2の`env_network`遷移で初めて表面化したため、STEP35のテストヘルパーに`dismissEnvTransitionIfShown()`を追加して解消した。ゲーム本体のコードは変更していない。

**未実装/既知の制約**: 要求仕様どおりChapter2のみを実装し、Chapter3以降（Layer9〜）は引き続き`locked`予約のまま。ARIAのLEVEL3（`SELF_AWARE`）到達条件（`finalChapterReached`）はChapter2では変化しないため、Chapter2を通じてARIAは`EMOTIONAL_AI`のまま推移する（前述のとおり要求仕様セクション3の「Curious AI」は内部state値ではなく台詞の書きぶりへの指示として解釈したため、この点は矛盾ではない）。

## STEP36: Chapter3「Color Experiment」Layer9〜12コンテンツ追加

Chapter3「Color Experiment」（Layer9〜12）のストーリーコンテンツを追加する要求仕様（STEP36）に基づき実装した。STEP34/35で確立したLayer Clearフロー・Story Event管理システムは今回も無変更で機能したが、要求仕様セクション2「Layer11: Protocol Color Analyzer取得」に対応するため、Story Event管理システムへ`protocolId`という新しい管理項目を1つ追加した（Memory Unlockの`memoryId`と対になる仕組み）。

**要求仕様に無く、こちらで設計した主な判断**:
- **Color Analyzerは新規Protocolを作らず、既存データを再利用した**: `protocolSignals.js`を調査した結果、`color_analyzer`（Color Analyzer、PERFECTボーナス+40%）が既にSTEP32（Story Scenario Framework）でSTORY RESEARCH CASE003クリア報酬として実装済みであることが判明した。要求仕様セクション5「カテゴリ: Genesis Protocol」も`docs/STORY_BIBLE.md`5章に既に同じ分類で記載済みだった。このため新規Protocol定義は追加せず、`endless.js`のLayer11クリア処理から既存の`save.unlockProtocol('color_analyzer')`を直接呼ぶ設計にした（CASE003クリア経由でも、Chapter3 Layer11経由でも、どちらが先でも正しく動作する。`unlockProtocol()`自体が「既に解放済みならfalseを返す」二重解放防止を内蔵しているため）。Protocol Archiveの解放条件ラベル（`protocolUnlock.js`の`getConditionLabel()`）にも、`color_analyzer`だけ2つ目の解放経路（Chapter3 Layer11到達）を追記する小さな修正を加えた
- **Protocol取得演出「PROTOCOL UNLOCKED」の設計**: 要求仕様に演出の具体的な指定は無かったが、STEP34の「MEMORY FOUND」演出とセッションを通じて確立した「情報系オーバーレイは自動消滅させない（続けるボタン必須）」というユーザーフィードバック方針に合わせ、既存の自動消滅アニメーション`ui.showProtocolDiscovery()`（`_checkProtocolUnlocks()`の通常解放時に使用）ではなく、MEMORY FOUNDと同じ`ui.showNodeResult()`（続けるボタン付き）で表示する新しいStory Stepタイプ`protocolUnlocked`を追加した。新規UIコンポーネントは追加していない
- **memfrag_005/006の所属Chapter訂正（STEP35からの数値整合性の是正）**: STEP35時点では`memfrag_005`/`memfrag_006`を「Chapter2の未使用予約枠」として生成していたが、STEP36の要求仕様セクション4が「Memory005: Human Cognitive Pattern」「Memory006: Color Experiment Final Report」をChapter3のMemoryとして明示的に指定したため、この2件をChapter2→Chapter3へ再割当した。この過程で、実際のコンテンツ実装パターンが「各Chapter予約4枠のうち2枠を実装」ではなく「各Chapter実装2件・予約枠は持たない」（Chapter1が最初からその形だった）と判明したため、`RESERVED_COUNT_BY_CHAPTER`をこの機会に実態に合わせて整理した（Chapter2/3は予約枠0で確定、余った分はFinal Chapter=chapter06の予約枠へ吸収し16件とした。合計30件は不変）。詳細な経緯は`memoryData.js`のコメントに記録した
- **ARIA状態の扱い（要求仕様セクション3「開始: Curious AI／終了: Emotional AI」との整合）**: Chapter2と同じ理由（Chapter1完了時点で既にARIAは内部state値として`EMOTIONAL_AI`へ遷移済み）により、Chapter3の間に新たなLEVEL到達は発生しない（LEVEL3=`SELF_AWARE`はFinal Chapter到達が条件のため）。要求仕様セクション3「変化は感情追加ではなく人間の思考への理解深化として表現する」という指示を踏まえ、「Curious AI→Emotional AI」という記述を内部state値の強制ではなく**台詞のトーンの変化**（Layer9の分析的な語り口から、Layer12のmemfrag_006_recoveredでの「LOGIC COLORの本当の意味」への深い理解と共感へ至る流れ）として解釈し反映した

**既存ファイルの変更**:
- `layerContentData.js`: Layer9〜12を`locked`予約からIMPLEMENTEDへ昇格。新フィールド`protocolId`をスキーマへ追加（既存の全レコードへも後方互換のため`protocolId: null`を補った）
- `memoryData.js`: memfrag_005（Human Cognitive Pattern）/memfrag_006（Color Experiment Final Report）をChapter2予約枠からChapter3実装済みへ再割当。`RESERVED_COUNT_BY_CHAPTER`を実態に合わせて整理（Chapter2/3の余剰枠をFinal Chapterへ統合）
- `dialogueData.js`: Chapter3 Layer9〜12のChapter Dialogue（4件）とMemory回収Dialogue（memfrag_005_recovered/memfrag_006_recovered、2件）を追加
- `endless.js`: `_handleRoundClear`のStory Event Check部にProtocol Unlock処理（`layerEvent.protocolId`駆動）を追加。Story StepsキューへProtocol取得演出（`protocolUnlocked`タイプ）を追加
- `protocolUnlock.js`: `getConditionLabel()`の`scenarioReward`分岐に、`color_analyzer`専用の2経路表示（軽微な表示改善、機能への影響なし）

**新規ファイルは無し**。`layerStoryData.js`のchapter03定義、`protocolSignals.js`のcolor_analyzer定義は既に要求仕様と完全一致する内容が実装済みだったため、いずれも変更不要だった。

**テスト**: jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）を実施した。データ内容確認（Layer9〜12のeventId/dialogueId/memoryId/protocolId/relationshipChange/environment、memfrag_005/006の再割当・所属Chapter、色analyzer既存データの再利用確認）→既存形式セーブのLoad確認→実際のPuzzle解答によるChapter1/2クリア（回帰確認）→Chapter3 Layer9〜12の完全な新シーケンス確認（Layer9: Color Analysis Lab開始イベント、Dialogueのみ／Layer10: Dialogue→MEMORY FOUND(Human Cognitive Pattern)→ARIA Analysis→Relationship+5／Layer11: Dialogue→PROTOCOL UNLOCKED(Color Analyzer)→Reward／Layer12: Dialogue→MEMORY FOUND(Color Experiment Final Report)→ARIA Analysis→Relationship+5→Chapter Complete→Reward、chapter04解放）→Story Archive/Memory Archive/Protocol Archiveへの反映確認→既存報酬処理への無影響確認→別インスタンスでのSave/Reload後の状態復元を含め計84項目、全PASS（2回連続実行で安定性も確認済み。テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**テスト実装中に発見した事象（ゲームロジックのバグではない）**: Layer10がたまたま既存のBoss出現ロジック（Depth 10ごと等の既存仕様）に該当するBoss Layerだったため、クリア時の報酬オーバーレイタイトルが通常の「DEPTH X CLEAR」ではなく「${bossName} DEFEATED!」形式になっていた。これはSTEP31以前からの既存Boss機能がそのまま動作しているだけであり、STEP36の変更とは無関係。テストのアサーションを両方のタイトル形式を許容するよう修正して対応した。

**未実装/既知の制約**: 要求仕様どおりChapter3のみを実装し、Chapter4以降（Layer13〜）は引き続き`locked`予約のまま。

## STEP37: Chapter4「Silent Facility」Layer13〜16コンテンツ追加

Chapter4「Silent Facility」（Layer13〜16）のストーリーコンテンツを追加する要求仕様（STEP37）に基づき実装した。STEP34〜36で確立したLayer Clearフロー・Story Event管理システムは今回も無変更で機能したが、要求仕様セクション3「Lost Researcherを本格利用（characterData.jsの既存データと連携。状態: UNKNOWN→DISCOVERED）」に対応するため、Story Event管理システムへ`characterDiscovery`という新しい管理項目を1つ追加した（STEP36の`protocolId`と全く同じ設計パターン）。

**要求仕様に無く、こちらで設計した主な判断**:
- **Lost Researcherは新規データを作らず既存データを再利用**: `characterData.js`/`relationshipData.js`を調査した結果、`lost_researcher`（表示名"Unknown Researcher"）は既にSTEP32-4（Character Relationship System）で`DEFAULTS`に`{relationship:0, state:'UNKNOWN'}`として定義済みであることが判明した。新規キャラクターデータは追加せず、`endless.js`のLayer14クリア処理から既存の`save.setRelationshipState('lost_researcher', 'DISCOVERED')`を直接呼ぶ設計にした。二重発見防止のガード（既にDISCOVERED済みなら何もしない）も、`protocolId`/`memoryId`と同じパターンで実装した
- **Character Discovery演出「CHARACTER DISCOVERED」の設計**: 要求仕様に演出の具体的な指定は無かったが、STEP34〜36で確立した「情報系オーバーレイは自動消滅させない」方針に合わせ、MEMORY FOUND/PROTOCOL UNLOCKEDと同じ`ui.showNodeResult()`（続けるボタン付き）で表示する新しいStory Stepタイプ`characterDiscovered`を追加した。「Lost Researcher登場」は要求仕様セクション2でMemory007取得とセットで描写されているため、Story StepsキューではMEMORY FOUND→ARIA Analysis Dialogueの**後**にCHARACTER DISCOVEREDを配置し、「記録を読み解いた結果としてキャラクターの存在が明らかになる」という順序で表現した
- **Layer14/15のRelationship変化先の判断**: 要求仕様セクション6は「Layer14: +5」「Layer15: +5」とのみ記載され、対象キャラクターの指定が無かった。Chapter1〜3では一貫してARIAへのRelationship変化だったが、Chapter4は要求仕様セクション3が「Lost Researcherを本格利用」と明記していること、`lost_researcher.relationship`がSTEP32-4以来ずっと未使用（常に0）のまま放置されていたことから、Layer14/15の+5は**Lost Researcher自身へのRelationship変化**として設計した（Lost Researcherを発見し、記録を読み解いていく過程で関係が深まっていく、という自然な物語上の対応）。Memory007/008の`character`フィールドも`aria`ではなく`lost_researcher`とした
- **Layer15のmemfrag_008をChapter1の伏線と接続**: 要求仕様セクション4「主人公とGenesis Projectの関係への伏線」に対応するため、`memfrag_008_recovered`のDialogueをSTEP32-5-1で実装済みのChapter1 Layer2台詞「最終アクセス記録を発見しました。Access ID: Researcher-01」（`chapter01_layer02_clear`）と意図的に呼応させた。既存のDialogueデータは変更せず、新しいDialogueの文面で参照するだけに留めている

**既存ファイルの変更**:
- `layerContentData.js`: Layer13〜16を`locked`予約からIMPLEMENTEDへ昇格。新フィールド`characterDiscovery`をスキーマへ追加（既存の全レコードへも後方互換のため`characterDiscovery: null`を補った）
- `memoryData.js`: memfrag_007（Lost Researcher Record）/memfrag_008（Researcher-01 Profile）/memfrag_009（Facility Shutdown Report）を実装済みへ昇格。`RESERVED_COUNT_BY_CHAPTER`のchapter04を4→1（memfrag_010のみ残存）へ調整
- `dialogueData.js`: Chapter4 Layer13〜16のChapter Dialogue（4件）とMemory回収Dialogue（memfrag_007_recovered/008_recovered/009_recovered、3件）を追加
- `endless.js`: `_handleRoundClear`のStory Event Check部にCharacter Discovery処理（`layerEvent.characterDiscovery`駆動）を追加。Story StepsキューへCharacter Discovery演出（`characterDiscovered`タイプ）を追加。`CharacterData`のimportを追加

**新規ファイルは無し**。`layerStoryData.js`のchapter04定義、`characterData.js`/`relationshipData.js`のlost_researcher定義は既に要求仕様と完全一致する内容が実装済みだったため、いずれも変更不要だった。`characterArchiveUI.js`もキャラクターのstateを汎用的に表示する設計のため、コード変更なしでDISCOVERED状態の表示に対応できた。

**テスト**: jsdomで実サーバー配信のHTML/JSに対する統合テスト（本番の`EndlessMode`インスタンスを一時的なテスト専用フック経由で直接検証し、テスト後にフックは削除・`git diff`で無変更確認済み）を実施した。データ内容確認（Layer13〜16のeventId/dialogueId/memoryId/characterDiscovery/relationshipChange/environment、memfrag_007〜009の内容・character紐付け、lost_researcher既存データの再利用確認）→既存形式セーブのLoad確認→実際のPuzzle解答によるChapter1〜3クリア（回帰確認）→Chapter4 Layer13〜16の完全な新シーケンス確認（Layer13: Silent Facility開始イベント、Dialogueのみ／Layer14: Dialogue→MEMORY FOUND(Lost Researcher Record)→ARIA Analysis→CHARACTER DISCOVERED(Lost Researcher)→Relationship+5／Layer15: Dialogue→MEMORY FOUND(Researcher-01 Profile)→ARIA Analysis→Relationship+5(再発見なし確認)／Layer16: Dialogue→MEMORY FOUND(Facility Shutdown Report)→ARIA Analysis→Chapter Complete→Reward、chapter05解放）→Character Archiveへの反映確認（Lost ResearcherがDISCOVEREDと表示されること）→Story/Memory/Protocol Archiveへの反映確認→既存報酬処理への無影響確認→別インスタンスでのSave/Reload後の状態復元を含め計125項目、全PASS（2回連続実行で安定性も確認済み。テスト用サーバー・jsdomはテスト後に削除、プロジェクトには残していない）。

**テスト実装中に発見した事象（テストハーネス側の問題、ゲームロジックのバグではない）**: 初回のテスト実行でテストフック取得に失敗する事象が発生したが、初期ページ読み込み待機時間（6秒）を8秒へ延長したところ再現しなくなった。以前のSTEPで観測してきたjsdomの初回スクリプト読み込みタイミングflakeと同種の事象と考えられる。ゲーム本体のコードは変更していない。

**未実装/既知の制約**: 要求仕様どおりChapter4のみを実装し、Chapter5以降（Layer17〜）は引き続き`locked`予約のまま。
