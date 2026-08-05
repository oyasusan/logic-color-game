/**
 * researchReportUI.js
 * STEP43「Research Progression System」セクション1: Research Report画面。
 * RUN終了直後、既存のRESULT画面（endlessResult.js）よりも前に表示する新規画面。
 * DOM描画のみを担当し（researchTimeline.js等と同じ役割分担）、表示するデータ
 * （Depth/Memory/Protocol/Relationship/Rank/Unknown Signal/報酬/Grade/
 * Facility Restoration/Database Completion/Run Timeline/ARIA一言）は
 * すべてendless.js側が組み立てて渡す。
 *
 * 「続ける」ボタンを押すまで自動では消えない（情報系オーバーレイは自動消滅させない、
 * という既存フィードバック方針を画面単位でも踏襲）。既存のRESULT画面・その先の
 * RETRY/TITLE分岐ロジックには一切触れず、その手前に1画面挟むだけの設計のため、
 * 既存のAchievement/Ending通知オーバーレイの連結パターンをそのまま延長できる。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class ResearchReportUI {
    constructor() {
      this.el = {
        ariaLine: document.getElementById('reportAriaLine'),
        gradeValue: document.getElementById('reportGradeValue'),
        gradeScore: document.getElementById('reportGradeScore'),
        depth: document.getElementById('reportDepth'),
        rank: document.getElementById('reportRank'),
        unknownSignal: document.getElementById('reportUnknownSignal'),
        score: document.getElementById('reportScore'),
        researchData: document.getElementById('reportResearchData'),
        memoryList: document.getElementById('reportMemoryList'),
        protocolList: document.getElementById('reportProtocolList'),
        relationshipList: document.getElementById('reportRelationshipList'),
        facilityLabel: document.getElementById('reportFacilityLabel'),
        facilityPercent: document.getElementById('reportFacilityPercent'),
        facilityFill: document.getElementById('reportFacilityFill'),
        databaseList: document.getElementById('reportDatabaseList'),
        timelineList: document.getElementById('reportTimelineList'),
        continueBtn: document.getElementById('reportContinueBtn')
      };
      this._onContinue = null;
      if (this.el.continueBtn) {
        this.el.continueBtn.addEventListener('click', () => {
          const cb = this._onContinue;
          this._onContinue = null;
          if (cb) cb();
        });
      }
    }

    /**
     * @param {Object} data endless.jsが組み立てるRUN終了時のレポートデータ一式
     * @param {Function} onContinue 「続ける」ボタン押下時（この画面を離れてRESULT画面へ進む）
     */
    show(data, onContinue) {
      this._onContinue = onContinue;
      if (!this.el.gradeValue) { if (onContinue) onContinue(); return; }

      if (this.el.ariaLine) this.el.ariaLine.textContent = data.ariaLine || '';
      if (this.el.gradeValue) this.el.gradeValue.textContent = data.grade.grade;
      if (this.el.gradeScore) this.el.gradeScore.textContent = `SCORE ${data.grade.score}`;
      if (this.el.depth) this.el.depth.textContent = `DEPTH ${data.depth}`;
      if (this.el.rank) this.el.rank.textContent = data.rankLabel;
      if (this.el.unknownSignal) this.el.unknownSignal.textContent = String(data.unknownSignalCount);
      if (this.el.score) this.el.score.textContent = String(data.score);
      if (this.el.researchData) this.el.researchData.textContent = String(data.researchData);

      if (this.el.memoryList) {
        this.el.memoryList.innerHTML = data.memories.length
          ? data.memories.map(m => `<div class="report-list-row">🧠 ${m.title}</div>`).join('')
          : '<div class="report-list-empty">今回の取得は無し</div>';
      }
      if (this.el.protocolList) {
        this.el.protocolList.innerHTML = data.protocols.length
          ? data.protocols.map(p => `<div class="report-list-row">📡 ${p.name}</div>`).join('')
          : '<div class="report-list-empty">今回の取得は無し</div>';
      }
      if (this.el.relationshipList) {
        this.el.relationshipList.innerHTML = data.relationshipChanges.length
          ? data.relationshipChanges.map(r => `<div class="report-list-row">${r.name} ${r.delta > 0 ? '+' : ''}${r.delta}</div>`).join('')
          : '<div class="report-list-empty">変化無し</div>';
      }

      if (this.el.facilityLabel) this.el.facilityLabel.textContent = data.facility.statusLabel;
      if (this.el.facilityPercent) this.el.facilityPercent.textContent = `${data.facility.percent}%`;
      if (this.el.facilityFill) this.el.facilityFill.style.width = `${data.facility.percent}%`;

      if (this.el.databaseList) {
        const rows = [
          ['Characters', data.database.characters],
          ['Memory', data.database.memory],
          ['Research Logs', data.database.logs],
          ['Protocols', data.database.protocols],
          ['Environment', data.database.environment],
          ['Endings', data.database.endings]
        ];
        this.el.databaseList.innerHTML = rows.map(([label, c]) =>
          `<div class="report-db-row"><span>${label}</span><span>${c.unlocked} / ${c.total}</span></div>`
        ).join('');
      }

      if (this.el.timelineList) {
        this.el.timelineList.innerHTML = data.timeline.length
          ? data.timeline.map(t => `<div class="report-timeline-row">${t.icon || '▹'} ${t.label}</div>`).join('')
          : '<div class="report-list-empty">記録無し</div>';
      }
      // 画面切り替え（ui.showScreen('researchReport')）はendlessResult.js等と同じく
      // 呼び出し元（endless.js）の責務とし、このクラス自身はDOM描画のみを持つ
    }
  }

  G.ResearchReportUI = ResearchReportUI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
