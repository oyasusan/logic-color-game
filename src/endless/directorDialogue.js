/**
 * directorDialogue.js
 * STEP31「AI Director System」セクション10: Dialogue System。AI Directorが
 * 各トリガーポイント（Layer開始/Mutation/Extract/Hidden発見/Boss前/Boss後/
 * Run終了）で発する短い一言を、Personalityごとにデータとして持つ
 * （要求仕様どおり「DialogueはJSON管理」。このプロジェクトの既存データファイル
 * 群と同じくJSオブジェクトとして直接埋め込む形式にしている＝environmentLog.js
 * と同じ設計）。状態を持たない静的データ＋ヘルパーのみ。
 *
 * トリガー種別（要求仕様どおり）: 'layerStart'/'mutation'/'extract'/
 * 'hiddenFound'/'bossBefore'/'bossAfter'/'runEnd'
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const LINES = {
    analyst: {
      layerStart: '研究効率が上昇している。',
      mutation: '構造異常を検知。モデルを再調整する。',
      extract: '抽出を確認した。データは確保された。',
      hiddenFound: '未登録領域を確認。興味深い。',
      bossBefore: '脅威レベル上昇。解析を継続する。',
      bossAfter: '脅威を無力化した。基準値を再計算する。',
      runEnd: 'セッション終了。研究報告を作成中。'
    },
    mentor: {
      layerStart: 'いい調子です。そのペースを保ちましょう。',
      mutation: '状況が変化していますが、落ち着いて。大丈夫です。',
      extract: '良い判断です。データを無事持ち帰りましょう。',
      hiddenFound: '珍しい発見ですね！よく見つけました。',
      bossBefore: '手強い相手ですが、あなたなら大丈夫。',
      bossAfter: 'よく乗り越えましたね。素晴らしい。',
      runEnd: '良いセッションでした。振り返ってみましょう。'
    },
    chaos: {
      layerStart: 'どこまで深く行けるか見てみよう。',
      mutation: 'そうだ、そうだ。壊れてしまえ。',
      extract: 'もう帰るのか？つまらない。',
      hiddenFound: '何か美味しいものが今、はじけた。',
      bossBefore: 'ようやく、戦う価値のある相手だ。',
      bossAfter: 'もっとだ。もっと寄越せ。',
      runEnd: 'まあまあ面白かった方だ。'
    },
    observer: {
      layerStart: '観測を継続する。',
      mutation: '異常を記録した。',
      extract: '離脱を確認した。',
      hiddenFound: '異常領域を記録した。',
      bossBefore: '高脅威個体を観測した。',
      bossAfter: '個体状態：無力化。',
      runEnd: 'セッションログを閉じる。'
    },
    researcher: {
      layerStart: '層を進むごとに新たなデータが得られる。',
      mutation: '予期せぬ変数——価値あるデータだ。',
      extract: 'データ収穫量は良好。',
      hiddenFound: '未記録のEnvironmentだ。かけがえのない発見。',
      bossBefore: '価値ある研究対象が前方に。',
      bossAfter: '研究目標を達成した。',
      runEnd: '今回のデータ蓄積は完了した。'
    }
  };

  /**
   * @param {string} personalityId
   * @param {string} trigger 'layerStart'|'mutation'|'extract'|'hiddenFound'|'bossBefore'|'bossAfter'|'runEnd'
   * @returns {string} 該当する一言（未定義の組み合わせなら空文字）
   */
  function getLine(personalityId, trigger) {
    const set = LINES[personalityId] || LINES.analyst;
    return set[trigger] || '';
  }

  G.DirectorDialogue = { LINES, getLine };
})(typeof globalThis !== 'undefined' ? globalThis : this);
