/**
 * cognitiveTheme.js
 * STEP41-1「Cognitive Neural Mapping System」セクション1: 表示用語のマッピングデータ。
 * このファイルは純粋なデータ（+参照用の小さなヘルパー）のみを持ち、ゲームルール・
 * 問題生成・判定ロジック・セーブデータ構造には一切関与しない。既存のCellState内部id
 * （'EMPTY'/'BLUE'/'RED'/'GREEN'、board.js参照）は変更せず、それらを画面表示用の
 * 語彙（Signal名等）へ変換するためだけの薄いマッピング層として存在する。
 *
 * 【適用範囲についての設計判断】この用語変更はENDLESS RESEARCH（Layer/ARIA/Protocol/
 * Storyの世界観が既に存在する場所）に限定して適用する。STAGE SELECT/TUTORIAL/
 * DAILY PUZZLEは元々ARIAや研究施設の物語と紐づいていない独立したモードのため、
 * そちらのラベル（"STAGE CLEAR!"等）は意図的に変更していない（要求仕様の
 * 「過度な変更は行わない・既存UI構造を維持する」を優先した解釈。詳細はREADME.md
 * STEP41-1セクション参照）。ただし色のSignal名（title/aria-label属性）だけは
 * 見た目のレイアウトに一切影響しない付加情報のため、全モード共通でui.js側から
 * 参照可能にしている。
 *
 * 【STEP41-2追記】Grid Cell表示をMemory Node表示（円形/SF Node UI）へ変更するにあたり、
 * `NODE_THEME`（盤面の見た目テーマ設定）と`SIGNAL_LABELS_SHORT`（凡例用の短縮Signal名）を
 * 追加した。Node状態（UNKNOWN=未解析/SYNCING=同期中/STABLE=安定）はboard.jsのCellState
 * とは別の、純粋に表示専用の概念で、ui.js側がCellStateから都度算出する（新しい内部状態を
 * 追加したわけではない）。
 *
 * 【STEP41-3追記】`setActiveNodeTheme()`を追加した。themeManager.js（Neural Evolution
 * System）がLayer Phaseの変化を検知するたびにこれを呼び、NODE_THEMEの中身（shape/
 * connection/animation）を差し替える。NODE_THEME自体はこのファイルが唯一の所有者で
 * あり続け、themeManager.js側は値を直接書き換えない（読み書きの責務を分離するため）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // ---- Signal名称。内部のCellState id（'BLUE'/'RED'/'GREEN'）はそのまま、表示のみ変換する ----
  const SIGNAL_LABELS = {
    BLUE: 'LOGIC SIGNAL',
    RED: 'MEMORY SIGNAL',
    GREEN: 'EMOTION SIGNAL'
  };

  // STEP41-2: 凡例（Signal Button）に可視テキストとして添える短縮形。ヒントチップは
  // 従来どおり数字のみ（title属性でSIGNAL_LABELSを参照）のため対象外
  const SIGNAL_LABELS_SHORT = {
    BLUE: 'LOGIC',
    RED: 'MEMORY',
    GREEN: 'EMOTION'
  };

  /** @param {string} colorId 'BLUE'|'RED'|'GREEN'等の内部id @returns {string} 表示用Signal名（未知idはそのまま返す） */
  function getSignalLabel(colorId) {
    return SIGNAL_LABELS[colorId] || colorId;
  }

  /** @param {string} colorId @returns {string} 凡例用の短縮Signal名（未知idはそのまま返す） */
  function getSignalLabelShort(colorId) {
    return SIGNAL_LABELS_SHORT[colorId] || colorId;
  }

  /**
   * STEP41-2: Layer Theme対応準備。盤面（Memory Node）の見た目を決めるテーマ設定。
   * 現時点では固定の1種類（basic_neural）のみを全画面で使うが、将来Chapter/
   * WorldEnvironment等に応じて複数テーマを切り替えられるよう、値そのものが
   * ui.js側の描画を実際に左右する構造にしてある（データだけの空箱にしない）。
   *   - shape: 'circle'ならMemory Nodeを円形に、それ以外は既存の角丸矩形のまま
   *   - connection: trueならNode間のメッシュ状の縁取り（Node Link相当の装飾）を有効化
   *   - animation: 'pulse'なら未解析(UNKNOWN)Nodeにアイドル時のパルス演出を追加
   */
  const NODE_THEME = {
    type: 'basic_neural',
    shape: 'circle',
    connection: true,
    animation: 'pulse'
  };

  /**
   * STEP41-3: Neural Evolution System。themeManager.jsのTHEME_DEFS[phase].nodeThemeを
   * ここへ反映する。オブジェクト参照（NODE_THEME）自体は差し替えず中身だけを更新するため、
   * 既にこの参照を保持しているui.js側は次回buildBoard()呼び出し時に自動で新しい値を拾う
   * （新しいsetterを呼ぶ側・呼ばれる側どちらにも追加の配線が要らない）。
   * @param {{shape?:string, connection?:boolean, animation?:string}} partial
   */
  function setActiveNodeTheme(partial) {
    if (!partial) return;
    Object.assign(NODE_THEME, partial);
  }

  // ---- ENDLESS RESEARCHのCognitive Analysis(Puzzle)演出まわりの用語・文言 ----
  const TERMS = {
    puzzleLabel: 'Cognitive Analysis',
    mapLabel: 'Cognitive Map',
    nodeLabel: 'Memory Node',
    analysisPhaseToast: '🔬 Cognitive Analysis...',
    syncPhaseToast: '🔄 Neural Synchronization...',
    completeTitle: 'Cognitive Map Restored',
    completeSubtitle: 'Neural Synchronization Complete'
  };

  // ---- ARIAコメント（Layer開始時等、Cognitive Mapping System起動の説明に使う） ----
  const ARIA_INTRO_LINES = [
    'Cognitive Mapping Systemを起動します。',
    'Memory Nodeの解析を開始します。',
    '指定されたSignal配置を確認してください。'
  ];

  G.CognitiveTheme = {
    SIGNAL_LABELS, getSignalLabel, SIGNAL_LABELS_SHORT, getSignalLabelShort,
    TERMS, ARIA_INTRO_LINES, NODE_THEME, setActiveNodeTheme
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
