# LOGIC COLOR（仮）

色と数字を使った論理パズルゲーム。プレイヤーは盤面にライト（BLUE / RED / GREEN）を配置し、盤面の上側（列条件）と左側（行条件）に表示されるヒントをすべて満たすとステージクリアとなる。

ステージ制・チュートリアル・星評価（クリア評価）・プレイヤーレベルを備えた拡張版。

外部ライブラリ不使用（HTML5 + CSS3 + Vanilla JavaScript ES6+ のみ）。スマートフォンのブラウザ（Chrome / Safari）で動作することを想定。

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
