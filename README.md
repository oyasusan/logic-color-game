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
│ └ debug.js          ?debug=true時のみ有効なデバッグパネル（答え/Seed/難易度/Solver情報表示）
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

`index.html` は `<script>` タグを直接並べる方式（ESモジュール不使用）で `src/*.js` を読み込む。理由は `file://` で開いた場合でもESモジュールのCORS制限を受けずに動作させるため。各ファイルは `window.LogicColor` 名前空間にクラス/関数を登録することでファイル間の依存を解決している。読み込み順は `board→solver→difficulty→seed→generator→puzzleManager→score→progress→stage→tutorial→game→theme→animation→sound→debug→ui→main` （依存する側を後に置く）。`theme.js`/`animation.js`/`sound.js`/`debug.js`はゲームロジック側のモジュールに依存しない独立モジュールで、`ui.js`/`main.js`が消費する。

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
