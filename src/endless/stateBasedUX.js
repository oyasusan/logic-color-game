/**
 * stateBasedUX.js
 * 「Research Facility Interaction Pass」State Based UX。Environment/Layer/World
 * Stability/ARIA State/Unknown Layer/Story Progressの変化に応じ、CSS変数
 * （`--ui-tone`/`--button-tone`/`--popup-tone`/`--progress-color`/`--glow-strength`/
 * `--anim-speed`）とAmbient Volumeだけを更新する。DOM追加・新しいrAFループは一切
 * 持たず、既存の`--world-env-color`（endless.js `_renderWorldEnvironmentBadge`）と
 * 同じ「documentElementへstyle.setPropertyするだけ」という設計を踏襲する。
 *
 * 呼び出し元（endless.js）が各State変化の既存フック地点から`sync*()`を呼ぶだけで、
 * 新しいポーリング・監視ロジックは増やさない。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // World Stabilityが悪化するほどAmbient(environment bus)を絞り、「施設が不安定で
  // 音響も乱れている」体感を作る（要求仕様に数値指定が無かったため設計した値）
  const STABILITY_AMBIENT_RATIO = { STABLE: 1.0, UNSTABLE: 0.9, CRITICAL: 0.7, COLLAPSE: 0.5 };
  const STABILITY_GLOW = { STABLE: 1.0, UNSTABLE: 1.15, CRITICAL: 1.4, COLLAPSE: 1.6 };
  const STABILITY_ANIM_SPEED = { STABLE: 1.0, UNSTABLE: 1.05, CRITICAL: 1.15, COLLAPSE: 1.25 };

  class StateBasedUX {
    constructor() {
      this._root = (typeof document !== 'undefined') ? document.documentElement : null;
      this._state = {
        stabilityStatus: 'STABLE',
        isUnknownLayer: false,
        ariaState: 'LOGICAL_AI',
        storyProgressRate: 0
      };
    }

    /** WorldEnvironment確定時（既存の`--world-env-color`更新と同じタイミング）に呼ぶ */
    syncEnvironment() {
      this._recompute();
    }

    /** Layer移動時。Unknown Layer(Layer26+/未知領域)かどうかで演出強度を変える */
    syncLayer(isUnknownLayer) {
      this._state.isUnknownLayer = !!isUnknownLayer;
      this._recompute();
    }

    /** World Stability変化時。CSS変数更新に加えAmbient Volumeも連動させる */
    syncStability(status) {
      if (this._state.stabilityStatus === status) return;
      this._state.stabilityStatus = status;
      this._recompute();
      const ratio = STABILITY_AMBIENT_RATIO[status] != null ? STABILITY_AMBIENT_RATIO[status] : 1.0;
      if (G.AudioManager) {
        if (ratio >= 1.0) G.AudioManager.restoreBusVolume('environment', 1.5, 'easeInOut');
        else G.AudioManager.duckBusVolume('environment', ratio, 1.5, 'easeInOut');
      }
    }

    /** ARIA状態変化時（relationshipManager.checkAriaEvolution()の戻り値等） */
    syncAriaState(state) {
      this._state.ariaState = state;
      this._recompute();
    }

    /** Story進行時（Chapter/Layer進行率、0〜1） */
    syncStoryProgress(rate) {
      this._state.storyProgressRate = rate;
      this._recompute();
    }

    /** @private 現在のStateから4つのTone用CSS変数とGlow/Anim Speedを算出して反映する */
    _recompute() {
      if (!this._root) return;
      const status = this._state.stabilityStatus;

      // Tone優先順位: World Stability悪化 > Unknown Layer > ARIA後期状態 > Environment(既定)。
      // 「派手すぎる状態」を1つだけ選び、それ以外はEnvironment色（既存--world-env-color）へ
      // フォールバックする設計（複数のTone変化を同時に主張させず、常に1つの根拠に絞る）
      let tone = 'var(--world-env-color, var(--blue))';
      if (status === 'CRITICAL' || status === 'COLLAPSE') {
        tone = 'var(--red)';
      } else if (this._state.isUnknownLayer) {
        tone = 'var(--gold)';
      } else if (this._state.ariaState === 'SELF_AWARE' || this._state.ariaState === 'PARTNER_AI') {
        tone = 'var(--green)';
      }

      this._root.style.setProperty('--ui-tone', tone);
      this._root.style.setProperty('--button-tone', tone);
      this._root.style.setProperty('--popup-tone', tone);
      this._root.style.setProperty('--progress-color', tone);
      this._root.style.setProperty('--glow-strength', String(STABILITY_GLOW[status] != null ? STABILITY_GLOW[status] : 1.0));
      this._root.style.setProperty('--anim-speed', String(STABILITY_ANIM_SPEED[status] != null ? STABILITY_ANIM_SPEED[status] : 1.0));
    }
  }

  G.StateBasedUX = StateBasedUX;
})(typeof globalThis !== 'undefined' ? globalThis : this);
