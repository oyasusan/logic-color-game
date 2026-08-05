/**
 * researchConsole.js
 * STEP41-4「Research Console System」。ENDLESS RESEARCH画面を「ゲーム画面」ではなく
 * 「研究コンソールを操作している」体感にするためのHUD群のDOM描画のみを担当する
 * （directorHud.js/environmentHud.jsと同じ役割分担。状態は持たず、endless.js側が
 * 保持するデータをrender()へ渡すだけ）。ゲームルール・問題生成・判定ロジック・
 * セーブデータには一切関与しない。
 *
 * 表示内容（要求仕様セクション1〜7）:
 *   - Header: RESEARCH CONSOLE / RESEARCHER-01 / ARIA CONNECTED / Research Depth / Current Theme
 *   - System Status Panel: Facility Status / Memory Integrity / Node Stability / Protocol / AI Status
 *     （5項目とも既存データ（World Stability/Life/Protocol/AI Director）から導出した
 *     装飾的表示のみで、新しいゲームメカニクスは一切追加しない）
 *   - Analysis Log: 直近5件のイベントログ（RUNスコープの配列、endless.jsが保持）
 *   - Mini Research Map: 現在のPhase内でのDepth位置（themeManager.jsのPHASESを利用）
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class ResearchConsoleHud {
    constructor() {
      this.el = {
        panel: document.getElementById('researchConsolePanel'),
        scanline: document.getElementById('researchConsoleScanline'),
        detailToggle: document.getElementById('rcDetailToggle'),
        detailBody: document.getElementById('rcDetailBody'),
        ariaBadge: document.querySelector('.rc-aria-badge'),
        ariaStatus: document.getElementById('rcAriaStatus'),
        themeValue: document.getElementById('rcThemeValue'),
        depthValue: document.getElementById('rcDepthValue'),
        facilityStatus: document.getElementById('rcFacilityStatus'),
        memoryIntegrity: document.getElementById('rcMemoryIntegrity'),
        nodeStability: document.getElementById('rcNodeStability'),
        protocolStatus: document.getElementById('rcProtocolStatus'),
        aiStatus: document.getElementById('rcAiStatus'),
        analysisLog: document.getElementById('rcAnalysisLog'),
        miniMapLabel: document.getElementById('rcMiniMapLabel'),
        miniMapFill: document.getElementById('rcMiniMapFill')
      };

      if (this.el.detailToggle && this.el.detailBody) {
        this.el.detailToggle.addEventListener('click', () => {
          const expanded = this.el.detailToggle.getAttribute('aria-expanded') === 'true';
          this.el.detailToggle.setAttribute('aria-expanded', String(!expanded));
          this.el.detailBody.classList.toggle('hidden', expanded);
        });
      }
    }

    show() {
      if (this.el.panel) this.el.panel.classList.remove('hidden');
      if (this.el.scanline) this.el.scanline.classList.remove('hidden');
    }

    hide() {
      if (this.el.panel) this.el.panel.classList.add('hidden');
      if (this.el.scanline) this.el.scanline.classList.add('hidden');
    }

    /**
     * @param {{depth:number, themeName:string, facilityStatus:string, memoryIntegrity:number,
     *   nodeStability:number, nodeStabilityStatus:string, protocolLabel:string, aiStatus:string,
     *   phaseLabel:string, phaseProgressPercent:number}} viewModel
     */
    render(viewModel) {
      if (!this.el.panel) return;
      if (this.el.themeValue) this.el.themeValue.textContent = viewModel.themeName || '-';
      if (this.el.depthValue) this.el.depthValue.textContent = `DEPTH ${viewModel.depth}`;
      if (this.el.facilityStatus) this.el.facilityStatus.textContent = viewModel.facilityStatus;
      if (this.el.memoryIntegrity) this.el.memoryIntegrity.textContent = `${viewModel.memoryIntegrity}%`;
      if (this.el.nodeStability) this.el.nodeStability.textContent = `${viewModel.nodeStability}% ${viewModel.nodeStabilityStatus}`;
      if (this.el.protocolStatus) this.el.protocolStatus.textContent = viewModel.protocolLabel || '-';
      if (this.el.aiStatus) this.el.aiStatus.textContent = viewModel.aiStatus || '-';
      if (this.el.miniMapLabel) this.el.miniMapLabel.textContent = viewModel.phaseLabel;
      if (this.el.miniMapFill) this.el.miniMapFill.style.width = `${viewModel.phaseProgressPercent}%`;
    }

    /** @param {boolean} active Story Dialogue再生中はtrue（ARIA Terminalの「拡張」表現） */
    setAriaActive(active) {
      if (this.el.ariaStatus) this.el.ariaStatus.textContent = active ? 'ACTIVE' : 'CONNECTED';
      if (this.el.ariaBadge) this.el.ariaBadge.classList.toggle('rc-aria-active', !!active);
    }

    /** @param {Array<{icon:string, text:string}>} entries 新しい順（先頭が最新）、最大5件 */
    renderAnalysisLog(entries) {
      if (!this.el.analysisLog) return;
      this.el.analysisLog.innerHTML = (entries || []).map(e =>
        `<div class="rc-analysis-log-entry">${e.icon || '▹'} ${e.text}</div>`
      ).join('');
    }
  }

  G.ResearchConsoleHud = ResearchConsoleHud;
})(typeof globalThis !== 'undefined' ? globalThis : this);
