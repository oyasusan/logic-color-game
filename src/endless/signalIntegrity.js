/**
 * signalIntegrity.js
 * 「Cognitive Re-Synchronization System」セクション: Signal Integrity / Cognitive Drift。
 * 最終プレイ日時(endlessSave.jsの`metaData.lastPlayed`)からの経過時間だけを見て、
 * Signal Integrity(%)とCognitive Driftの段階を算出する純粋関数群。状態を持たず、
 * DOM・SE・セーブへは一切触れない（worldState.js/difficultyManager.jsと同じ
 * 「計算だけを担うCoordinator」設計）。
 *
 * 【段階の決め方】要求仕様が明示した5点（24時間以内100%/3日95%/1週間85%/
 * 2週間75%/1か月以上60%=下限）を、そのまま5段階の閾値テーブルとして使う。
 * "2週間〜1か月"の間の値は要求仕様に指定が無かったため、独自の中間値を
 * 補間で作らず「14日を超えたら下限60%」という単純な段差にした
 * （worldState.jsのStability判定＝80/50/20の離散バンドと同じ考え方に揃えた
 * ほうが、この既存プロジェクトの設計言語として一貫すると判断したため）。
 *
 * Cognitive Driftは「プレイヤーの能力低下」ではなく「Researcher-01（プレイヤー
 * キャラクター）の施設同期率低下」という設定上の建てつけのため、この段階に
 * 紐づくラベル・説明文もその前提で用意する（呼び出し側=calibrationManager.js/
 * ui.jsが表示に使う）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const DAY_MS = 24 * 60 * 60 * 1000;
  const INTEGRITY_FLOOR = 60;

  // 経過日数の閾値以下ならこのTierを使う（先頭から順に判定、配列末尾がフォールバック=下限）
  const TIERS = [
    { id: 'synced', maxDays: 1, integrity: 100, driftLevel: 'NONE',
      driftLabel: '同期維持', driftDesc: '施設同期率は正常範囲内です。' },
    { id: 'light', maxDays: 3, integrity: 95, driftLevel: 'MINOR',
      driftLabel: '軽微なドリフト', driftDesc: 'Researcher-01の施設同期率にわずかな低下が見られます。' },
    { id: 'moderate', maxDays: 7, integrity: 85, driftLevel: 'MODERATE',
      driftLabel: '中程度のドリフト', driftDesc: 'Researcher-01の施設同期率が低下しています。記憶照合を推奨します。' },
    { id: 'advanced', maxDays: 14, integrity: 75, driftLevel: 'ADVANCED',
      driftLabel: '進行したドリフト', driftDesc: 'Researcher-01の施設同期率が大きく低下しています。キャリブレーションを推奨します。' },
    { id: 'critical', maxDays: Infinity, integrity: INTEGRITY_FLOOR, driftLevel: 'SEVERE',
      driftLabel: '重度のドリフト', driftDesc: 'Researcher-01の施設同期率は下限に達しています。全項目のキャリブレーションを推奨します。' }
  ];

  /**
   * @param {number|null} lastPlayedMs endlessSave.getLastPlayed()の値。nullなら未プレイ扱いで満タン。
   * @param {number} nowMs 現在時刻(Date.now())
   * @returns {Object} TIERSの要素そのもの（id/maxDays/integrity/driftLevel/driftLabel/driftDesc）
   */
  function getTier(lastPlayedMs, nowMs) {
    if (!lastPlayedMs || !Number.isFinite(lastPlayedMs)) return TIERS[0];
    const elapsedDays = Math.max(0, (nowMs - lastPlayedMs) / DAY_MS);
    for (let i = 0; i < TIERS.length; i++) {
      if (elapsedDays <= TIERS[i].maxDays) return TIERS[i];
    }
    return TIERS[TIERS.length - 1];
  }

  /** @returns {number} 0-100のSignal Integrity値のみ欲しい場合の簡易ヘルパー */
  function computeIntegrity(lastPlayedMs, nowMs) {
    return getTier(lastPlayedMs, nowMs).integrity;
  }

  G.SignalIntegrity = { TIERS, getTier, computeIntegrity, INTEGRITY_FLOOR };
})(typeof globalThis !== 'undefined' ? globalThis : this);
