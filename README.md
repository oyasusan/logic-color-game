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
├ index.html          TITLE/STAGE SELECT/GAME画面の構成とネオン・ダークテーマCSS
├ src/
│ ├ main.js           エントリーポイント。各モジュールを統括するAppクラス。
│ │                    画面フロー(TITLE→STAGE SELECT→GAME→CLEAR→NEXT STAGE)を制御
│ ├ game.js           1ステージ分の進行管理（タップ巡回/Undo/Reset/Hint/クリア判定、
│ │                    星評価用のhintCount/undoCountを個別カウント）
│ ├ board.js          盤面データ構造（EMPTY/BLUE/RED/GREENの純粋な状態管理、色の巡回ロジック）
│ ├ solver.js         ヒント条件から解の数・探索量(steps/guessCount)を求める探索エンジン
│ ├ difficulty.js     solverの探索統計から難易度(easy/normal/hard/expert)を判定
│ ├ seed.js           同じseedなら同じ乱数列になる決定的な擬似乱数(mulberry32)
│ ├ generator.js      唯一解の問題を自動生成するエンジン（2段階の掘り出し法。後述）
│ ├ puzzleManager.js  固定問題(puzzles.json)・生成問題・Daily Puzzleを統一形式で提供
│ ├ ui.js             DOM描画・タップ操作・発光アニメーション・画面切り替え
│ ├ score.js          時間フォーマット(mm:ss)・星評価(★1〜★3)の計算
│ ├ progress.js       LocalStorage管理（クリア済みステージ/星/ベストタイム/レベル/EXP/
│ │                    チュートリアル完了フラグ）
│ ├ stage.js          data/stages.json + data/puzzles.jsonの読込、ステージ解放判定
│ └ tutorial.js       data/tutorials.jsonの読込、チュートリアル1→2→3の進行制御
├ data/
│ ├ puzzles.json      パズル本体（id, size, rowHints, columnHints, answer, parSeconds）
│ ├ stages.json       ステージのメタ情報（id, name, difficulty, puzzle参照, unlock）
│ └ tutorials.json    チュートリアル3問（3×3盤面、使用色制限、instructional message）
├ tools/
│ └ build_puzzles.js  data/puzzles.json を生成する開発用Node.jsスクリプト（ゲーム本体には不要）
├ assets/
│ ├ images/           画像アセット置き場（現状プレースホルダー）
│ └ sounds/           効果音アセット置き場（現状プレースホルダー）
└ README.md
```

`index.html` は `<script>` タグを直接並べる方式（ESモジュール不使用）で `src/*.js` を読み込む。理由は `file://` で開いた場合でもESモジュールのCORS制限を受けずに動作させるため。各ファイルは `window.LogicColor` 名前空間にクラス/関数を登録することでファイル間の依存を解決している。読み込み順は `board→solver→difficulty→seed→generator→puzzleManager→score→progress→stage→tutorial→game→ui→main` （依存する側を後に置く）。

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

`data/puzzles.json` を再生成する開発用スクリプト。各ステージのseedを固定しているため、再実行しても同じ6ステージが再現される。

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
`puzzle` フィールドは `data/puzzles.json` 内の対応する `id` を指す文字列参照。`unlock` は「前提条件に関わらず常に解放する」ための特別フラグで、現在の6ステージは全て `false`（＝下記の動的解放ルールのみで運用）にしている。

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

- 効果音（`assets/sounds/`）・画像アセット（`assets/images/`）は未実装（プレースホルダーのみ）。
- チュートリアルの3問は手作業で選んだ教材であり、`generator.js`による自動生成・唯一解保証の対象外（唯一解であることはNode.js上のブルートフォース探索で個別確認済み）。
- ステージの星評価・ベストタイムは「良い方を保持」する設計だが、再挑戦時に前回より星が下がってもUI上に警告は出さない（黙って保持されるのみ）。
- 星3判定の基準（Undo3回以下）はハードコード（`score.js` の `STAR3_MAX_UNDO`）。ステージごとに変えたい場合は `puzzles.json` 側にフィールドを追加する拡張が考えられる。
- レベルアップの経験値カーブは200EXP固定の線形（`EXP_PER_LEVEL`）。今後のステージ数増加に応じて、非線形カーブや実績（Achievement）システムへの拡張が考えられる。
- 現状は6ステージ・チュートリアル3問のみ。ステージを増やす場合は `data/stages.json` にエントリを追加し、対応する `puzzle` idを `data/puzzles.json`（`tools/build_puzzles.js`で生成）に用意すればよい。
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
