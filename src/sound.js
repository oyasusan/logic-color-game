/**
 * sound.js
 * Web Audio APIでシンセ音を鳴らすだけの効果音モジュール（音声ファイル不使用）。
 * tap / place / complete / clear の4種類を提供する。
 * ゲームロジックには一切関与せず、ミュート状態は専用のLocalStorageキーで
 * 個別に管理する（progress.js のセーブ形式は変更しない）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const STORAGE_KEY = 'logicColor.sound.enabled';

  class SoundManager {
    constructor() {
      this.ctx = null;
      this.enabled = this._loadEnabled();
      this._bindUnlock();
    }

    _loadEnabled() {
      try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === null ? true : v === '1';
      } catch (e) {
        return true;
      }
    }

    _saveEnabled() {
      try {
        localStorage.setItem(STORAGE_KEY, this.enabled ? '1' : '0');
      } catch (e) {
        // 保存できなくても効果音のON/OFF自体はそのセッション内で機能する
      }
    }

    /** モバイルブラウザはユーザー操作がないとAudioContextを開始できないため、初回タップで解錠する */
    _bindUnlock() {
      const unlock = () => {
        this._ensureContext();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        document.removeEventListener('pointerdown', unlock);
      };
      document.addEventListener('pointerdown', unlock, { once: true });
    }

    _ensureContext() {
      if (this.ctx) return;
      const AudioContextClass = global.AudioContext || global.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();
    }

    isEnabled() {
      return this.enabled;
    }

    setEnabled(value) {
      this.enabled = !!value;
      this._saveEnabled();
    }

    toggle() {
      this.setEnabled(!this.enabled);
      return this.enabled;
    }

    /** @private 単一のトーンを再生する */
    _tone({ freq, duration = 0.09, type = 'sine', gain = 0.14, sweepTo, delay = 0 }) {
      if (!this.enabled) return;
      this._ensureContext();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + duration);

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

      osc.connect(g).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.03);
    }

    /** マスをタップした瞬間（結果色が決まる前）の短いクリック音 */
    tap() {
      this._tone({ freq: 520, duration: 0.045, type: 'square', gain: 0.07 });
    }

    /** マスにライトが配置された時の音。色ごとに音程を変える */
    place(color) {
      const freqMap = { BLUE: 660, RED: 392, GREEN: 523 };
      const freq = freqMap[color] || 587;
      this._tone({ freq, duration: 0.1, type: 'sine', gain: 0.13, sweepTo: freq * 1.35 });
    }

    /** 行/列の条件を達成した時の短いチャイム */
    complete() {
      this._tone({ freq: 784, duration: 0.12, type: 'triangle', gain: 0.13 });
      this._tone({ freq: 988, duration: 0.15, type: 'triangle', gain: 0.1, delay: 0.07 });
    }

    /** ステージクリア時のファンファーレ（4音の上昇アルペジオ） */
    clear() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        this._tone({ freq, duration: 0.18, type: 'sine', gain: 0.13, delay: i * 0.1 });
      });
    }
  }

  G.Sound = new SoundManager();
})(typeof globalThis !== 'undefined' ? globalThis : this);
