/**
 * environmentHud.js
 * STEP30-3「Environment Visual / HUD Evolution」セクション2: Environment HUD。
 * ゲーム画面へ常時表示するリッチなHUDパネル（Layer/Environment名/World Status/
 * Active Modifier一覧）のDOM描画のみを担当する（ui.js/mapUI.jsと同じ役割分担、
 * 状態は持たない）。
 *
 * 【STEP30-4追記】セクション6「HUD Integration」。World Stability（安定度）の
 * バー表示・パーセント・Status（STABLE/UNSTABLE/CRITICAL/COLLAPSE）を追加した。
 * StatusごとにHUD自体の縁の色も変える（COLLAPSEに近づくほど赤みを帯びる）。
 *
 * 【STEP30-5追記】セクション10「HUD Integration」。Active中のMutation名を
 * 「MUTATION: {NAME}」として追加表示する（Mutation未発生時は非表示のまま）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // Statusごとのバー色（--world-env-color系とは独立した、危機感を表す配色）
  const STATUS_COLORS = {
    STABLE: '#3dff8a',
    UNSTABLE: '#ffd54a',
    CRITICAL: '#ff9d3f',
    COLLAPSE: '#ff3f6b'
  };

  class EnvironmentHUD {
    constructor() {
      this.el = {
        panel: document.getElementById('environmentHudPanel'),
        layerValue: document.getElementById('ehLayerValue'),
        envName: document.getElementById('ehEnvName'),
        stabilityBarFill: document.getElementById('ehStabilityBarFill'),
        stabilityPercent: document.getElementById('ehStabilityPercent'),
        stabilityValue: document.getElementById('ehStabilityValue'),
        modifierList: document.getElementById('ehModifierList'),
        mutationRow: document.getElementById('ehMutationRow'),
        mutationValue: document.getElementById('ehMutationValue')
      };
    }

    /**
     * @param {{layer:number, envDef:Object, modifiers:Array<Object>, stability?:number,
     *   status?:string, mutationName?:string|null}} viewModel
     */
    render({ layer, envDef, modifiers, stability, status, mutationName }) {
      if (!this.el.panel) return;
      if (this.el.layerValue) this.el.layerValue.textContent = `LAYER ${layer}`;
      if (this.el.envName) this.el.envName.textContent = `${envDef.icon || ''} ${envDef.name}`.trim();
      if (this.el.modifierList) {
        this.el.modifierList.innerHTML = (modifiers || []).map(m => `<div class="eh-modifier-row">${m.name}</div>`).join('');
      }

      const stabilityValue = typeof stability === 'number' ? stability : 100;
      const statusLabel = status || 'STABLE';
      const statusColor = STATUS_COLORS[statusLabel] || STATUS_COLORS.STABLE;
      if (this.el.stabilityBarFill) {
        this.el.stabilityBarFill.style.width = `${stabilityValue}%`;
        this.el.stabilityBarFill.style.background = statusColor;
      }
      if (this.el.stabilityPercent) this.el.stabilityPercent.textContent = `${stabilityValue}%`;
      if (this.el.stabilityValue) {
        this.el.stabilityValue.textContent = statusLabel;
        this.el.stabilityValue.style.color = statusColor;
      }
      if (this.el.panel) this.el.panel.style.borderColor = statusColor;

      if (this.el.mutationRow) this.el.mutationRow.classList.toggle('hidden', !mutationName);
      if (this.el.mutationValue) this.el.mutationValue.textContent = mutationName || '';

      this.el.panel.classList.remove('hidden');
    }

    hide() {
      if (this.el.panel) this.el.panel.classList.add('hidden');
    }
  }

  G.EnvironmentHUD = EnvironmentHUD;
})(typeof globalThis !== 'undefined' ? globalThis : this);
