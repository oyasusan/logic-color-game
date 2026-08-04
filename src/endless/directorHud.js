/**
 * directorHud.js
 * STEP31「AI Director System」セクション11: Director HUD。「DIRECTOR / {人格名} /
 * STATUS / {currentGoal}」のみを表示する最小限のバッジ。要求仕様どおり
 * 「必要最小限の表示とし、UIを圧迫しない」ため、新規の独立オーバーレイパネルは
 * 追加せず、既存のENDLESS HUDバー内（endlessRiskChainBadge等と同じ並び）に
 * 1行のバッジとして差し込む設計にした。DOM描画のみを持つ（環境HUD等と同じ役割分担）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class DirectorHud {
    constructor() {
      this.el = {
        badge: document.getElementById('directorHudBadge'),
        name: document.getElementById('directorHudName'),
        status: document.getElementById('directorHudStatus')
      };
    }

    /** @param {{personality:string, currentGoal:string}} state aiDirector.getState()相当 */
    render(state) {
      if (!this.el.badge) return;
      if (this.el.name) this.el.name.textContent = (state.personality || '').toUpperCase();
      if (this.el.status) this.el.status.textContent = state.currentGoal || 'OBSERVING';
      this.el.badge.classList.remove('hidden');
    }

    hide() {
      if (this.el.badge) this.el.badge.classList.add('hidden');
    }
  }

  G.DirectorHud = DirectorHud;
})(typeof globalThis !== 'undefined' ? globalThis : this);
