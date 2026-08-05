/**
 * researchGrade.js
 * STEP43「Research Progression System」セクション5: Research Grade。RUN単体を
 * S〜Dで評価する。状態を持たない純粋なデータ+計算関数のみ（researchIdentity.js等と
 * 同じ構成）。要求仕様どおり「評価基準はデータ化。将来追加可能」を満たすため、
 * 閾値テーブル（GRADE_DEFS）と各要素の重み（WEIGHTS）を定数として分離してある。
 * RUN終了時のみ算出する使い切りの評価で、Save側には保存しない（要求仕様セクション2
 * のFacility Restorationとは異なり「保存する」との明示指定が無いため、保存対象を
 * 増やさずSave互換リスクを避けた）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // 評価基準はいずれも要求仕様に数値指定が無かったため設計した
  const GRADE_DEFS = [
    { grade: 'S', minScore: 85 },
    { grade: 'A', minScore: 70 },
    { grade: 'B', minScore: 50 },
    { grade: 'C', minScore: 30 },
    { grade: 'D', minScore: 0 }
  ];

  const WEIGHTS = { depth: 0.4, perfect: 0.3, survival: 0.2, events: 0.1 };
  const DEPTH_NORMALIZE = 30; // Layer30到達で満点
  const EVENT_BONUS_PER_BOSS = 30;
  const EVENT_BONUS_PER_MEMORY = 20;
  const EVENT_BONUS_PER_PROTOCOL = 20;

  /**
   * @param {{depth:number, perfectCount:number, clearsThisRun:number, bossClearCount:number,
   *   memoriesFoundCount:number, protocolsUnlockedCount:number, extracted:boolean}} stats
   * @returns {{grade:string, score:number}}
   */
  function computeGrade(stats) {
    stats = stats || {};
    const depthScore = Math.min(100, ((stats.depth || 0) / DEPTH_NORMALIZE) * 100);
    const perfectRatio = stats.clearsThisRun > 0 ? (stats.perfectCount || 0) / stats.clearsThisRun : 0;
    const perfectScore = perfectRatio * 100;
    const survivalScore = stats.extracted ? 100 : 40; // Extract成功=計画的撤退、死亡=強制終了
    const eventBonus = Math.min(100,
      (stats.bossClearCount || 0) * EVENT_BONUS_PER_BOSS +
      (stats.memoriesFoundCount || 0) * EVENT_BONUS_PER_MEMORY +
      (stats.protocolsUnlockedCount || 0) * EVENT_BONUS_PER_PROTOCOL
    );

    const score = Math.round(
      depthScore * WEIGHTS.depth +
      perfectScore * WEIGHTS.perfect +
      survivalScore * WEIGHTS.survival +
      eventBonus * WEIGHTS.events
    );

    const matched = GRADE_DEFS.find(g => score >= g.minScore) || GRADE_DEFS[GRADE_DEFS.length - 1];
    return { grade: matched.grade, score };
  }

  G.ResearchGrade = { GRADE_DEFS, WEIGHTS, computeGrade };
})(typeof globalThis !== 'undefined' ? globalThis : this);
