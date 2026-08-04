/**
 * characterData.js
 * STEP32-2「Dialogue System」セクション2: Character Data。
 * Dialogue Systemの発言者（speaker）を解決するための、純粋なデータのみのモジュール
 * （worldEnvironment.js等と同じ「データ＋参照ヘルパー」構成）。
 *
 * 【ARIAとSTEP31 AI Directorとの関係について】STEP31で実装済みのAI Director
 * （directorPersonality.js、ANALYST/MENTOR/CHAOS/OBSERVER/RESEARCHERの5人格）とは
 * 別の存在として実装した。要求仕様がARIAを固定の1キャラクターとしてデータ化して
 * おり、5人格システムとの統合方法（例: 現在のPersonalityによってARIAの口調が
 * 変わる等）を要求していないため、両者を混在させず独立させた設計判断
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const ALL = [
    { id: 'player', name: 'Researcher', type: 'human' },
    { id: 'aria', name: 'ARIA', type: 'ai', role: 'AI Director' },
    { id: 'lost_researcher', name: 'Unknown Researcher', type: 'human', role: 'Memory Record' },
    // STEP32-3: Memory Fragment Systemセクション6の「SYSTEM: Memory Fragment recovered.」
    // という発言者を解決するために追加した、施設システム自身を表す疑似キャラクター
    { id: 'system', name: 'SYSTEM', type: 'system' }
  ];

  const BY_ID = new Map(ALL.map(c => [c.id, c]));

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  G.CharacterData = { ALL, getById };
})(typeof globalThis !== 'undefined' ? globalThis : this);
