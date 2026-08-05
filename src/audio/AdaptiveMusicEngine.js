/**
 * AdaptiveMusicEngine.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。
 *
 * 【設計方針】要求仕様どおり「AdaptiveMusicEngineは『現在の状態から演奏を生成する』
 * だけを担当する」。Web Audio APIのノードには一切触れず（それはsynth/*.js・
 * AudioManager.jsの責務）、AudioStateManager.jsの状態とaudioThemes.js/audioChords.js/
 * audioScales.js/audioPatterns.js/audioLayerTable.js/audioEvents.jsのデータから
 * 「いつ・どの音を鳴らすか」を決定し、AudioManager.getSynths()経由でSynthへ指示するだけ。
 *
 * スケジューリングは標準的なWeb Audio Lookaheadパターン（低頻度setIntervalで数百ms先
 * までを先読みしAudioContextのタイムライン上へ予約する。実際の発音タイミング自体は
 * オーディオスレッド側の精度に委ねるため、メインスレッド/描画フレームへの負荷が
 * ほぼ無い＝60FPS維持・CPU負荷低減の要求仕様に対応する）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { AudioThemes, AudioChords, AudioScales, AudioPatterns, AudioLayerTable, AudioEvents, AudioEnvironmentThemes, Seed } = G;

  const SCHEDULER_INTERVAL_MS = 100;
  const LOOKAHEAD_SEC = 0.3;
  const BEATS_PER_BAR = 4;
  // STEP43.6追加要件「Dynamic Layer Mixing」のしきい値。要求仕様に数値指定が無かったため設計した
  const RISK_CHAIN_PULSE_THRESHOLD = 2;   // このRisk Chainレベル以上でPulseを強制追加する
  const UNSTABLE_TEXTURE_STATUSES = ['CRITICAL', 'COLLAPSE']; // World StabilityがこのStatusの間はTexture(Noise)を強制追加する

  class AdaptiveMusicEngine {
    constructor() {
      this.themeManager = new G.AudioThemeManager();
      this.state = new G.AudioStateManager();
      this._timer = null;
      this._running = false;
      this._layer = 1;
      this._nextChordTime = 0;
      this._nextPulseTime = 0;
      this._nextArpTime = 0;
      this._pulseStep = 0;
      this._arpStep = 0;
      this._rng = Math.random;
      this._densityOverrides = {}; // { [layer]: {multiplier, expiresAt} } 一時的なdensityBoost用
      this._unknownProgressionCache = null;
      this._lastTickDurationMs = 0; // AudioDebugPanel.jsの「CPU負荷」表示用の自己計測値
      // STEP43.6追加要件「Facility Audio Theme」: BGM本体(Phase Theme)とは独立した軸
      this._worldEnvId = null;
      this._hiddenEnvId = null; // 秘匿領域滞在中のみ非null。滞在終了時は_worldEnvIdのThemeへ戻す
      // STEP43.6追加要件「Dynamic Layer Mixing」: Layerしきい値に依らず強制的に有効化するレイヤー
      this._forcedLayers = new Set();
    }

    /** ---------------- RUNライフサイクル ---------------- */

    /** @param {number|string} musicSeed RUN開始時のMusic Seed（省略時は非決定的） */
    startRun(musicSeed) {
      this.stopRun();
      this.state.reset(musicSeed);
      this._rng = Seed ? Seed.createRng(this.state.musicSeed) : Math.random;
      this._unknownProgressionCache = null;
      this._layer = 1;
      this._applyThemeForLayer(1, true);
      this._running = true;
      const audioManager = G.AudioManager;
      audioManager.startAmbient();
      const ctx0 = audioManager.getSynths() ? audioManager.now() : 0;
      this._nextChordTime = ctx0 + 0.1;
      this._nextPulseTime = ctx0 + 0.1;
      this._nextArpTime = ctx0 + 0.1;
      this._timer = setInterval(() => this._tick(), SCHEDULER_INTERVAL_MS);
    }

    stopRun() {
      if (this._timer) clearInterval(this._timer);
      this._timer = null;
      this._running = false;
      const audioManager = G.AudioManager;
      if (audioManager) { audioManager.stopAllVoices(); audioManager.stopAmbient(); }
      this._densityOverrides = {};
      this._worldEnvId = null;
      this._hiddenEnvId = null;
      this._forcedLayers.clear();
    }

    /** ---------------- Layer進行（要求仕様「Layer進行」セクション） ---------------- */

    /** @param {number} layer 現在のLayer（Depth） */
    setLayer(layer) {
      this._layer = layer;
      this._applyThemeForLayer(layer, false);
    }

    _applyThemeForLayer(layer, isRunStart) {
      const themeId = this.themeManager.getThemeIdForLayer(layer);
      const themeChanged = themeId !== this.state.themeId;
      const theme = AudioThemes.getById(themeId);
      const { unknownMode } = AudioLayerTable.getActiveLayers(layer);

      this.state.themeId = themeId;
      this.state.scaleId = theme.scaleId;
      this.state.tempoBpm = theme.tempoBpm;
      this.state.unknownMode = unknownMode;
      this.state.activePatterns = {
        arpeggio: unknownMode ? this._pickRandomPatternId() : 'ascending',
        pulse: unknownMode ? this._pickRandomPatternId() : 'pulse'
      };
      this._recomputeActiveLayers(); // Layerしきい値 ∪ Dynamic Layer Mixingの強制レイヤー

      if (themeChanged || isRunStart) {
        this.state.chordProgression = unknownMode
          ? this._getUnknownProgression()
          : (AudioChords.PROGRESSIONS[theme.chordSetId] || AudioChords.PROGRESSIONS.research);
        this.state.chordIndex = 0;
        // STEP43.6追加要件「Facility Audio Theme」: Environment AudioはPhase Themeではなく
        // WorldEnvironment/Hidden Environment側（setWorldEnvironment/setHiddenEnvironment）が
        // 管理するようになったため、ここでは呼ばない
        this._restartContinuousLayers(theme);
      } else {
        this._applyLayerMembership(theme);
      }
    }

    /**
     * STEP43.6追加要件「Dynamic Layer Mixing」。Layerしきい値（audioLayerTable.js）による
     * 基本レイヤー構成と、ゲーム状態に応じて一時的に追加される強制レイヤー（_forcedLayers）を
     * 合成し、state.activeLayersへ反映する。基本構成に無いレイヤーが混ざる可能性があるため、
     * Theme切替を伴わない場合は`_applyLayerMembership()`で実際の追加/除去も行う。
     */
    _recomputeActiveLayers() {
      const { layers: baseLayers } = AudioLayerTable.getActiveLayers(this._layer);
      const merged = new Set(baseLayers);
      this._forcedLayers.forEach(l => merged.add(l));
      this.state.activeLayers = Array.from(merged);
    }

    _pickRandomPatternId() {
      const ids = Object.keys(AudioPatterns.PATTERNS);
      return ids[Math.floor(this._rng() * ids.length)];
    }

    _getUnknownProgression() {
      if (!this._unknownProgressionCache) {
        this._unknownProgressionCache = AudioChords.generateUnknownProgression(this._rng);
      }
      return this._unknownProgressionCache;
    }

    _currentChordFreqs() {
      const chord = this.state.getCurrentChord();
      return chord.degrees.map(d => AudioScales.getFrequency(this.state.scaleId, d));
    }

    /** Theme変化時、Drone/Pad/Textureをまとめて新しいTheme設定で立ち上げ直す */
    _restartContinuousLayers(theme) {
      const synths = G.AudioManager.getSynths();
      if (!synths) return;
      const freqs = this._currentChordFreqs();
      const G_AudioPresets = G.AudioPresets;

      if (this.state.activeLayers.indexOf('drone') !== -1) {
        synths.drone.start(freqs, G_AudioPresets.getById('drone'), theme.density.drone);
      }
      if (this.state.activeLayers.indexOf('pad') !== -1) {
        synths.pad.changeChord(freqs, G_AudioPresets.getById('pad'), theme.density.pad);
      } else {
        synths.pad.stop();
      }
      if (this.state.activeLayers.indexOf('texture') !== -1) {
        synths.texture.start(G_AudioPresets.getById('texture'), theme.density.texture);
      } else {
        synths.texture.stop();
      }
      this._updateVoiceCount();
    }

    /**
     * Theme切替を伴わない場合の差分反映。Layerしきい値による新規解放（従来どおり増える一方）
     * だけでなく、STEP43.6追加要件「Dynamic Layer Mixing」の強制レイヤーが解除された場合は
     * 実際に停止もする（Layerしきい値による基本構成に含まれるレイヤーは停止しない）。
     */
    _applyLayerMembership(theme) {
      const synths = G.AudioManager.getSynths();
      if (!synths) return;
      const freqs = this._currentChordFreqs();
      const G_AudioPresets = G.AudioPresets;
      const active = this.state.activeLayers;

      if (active.indexOf('drone') !== -1 && !synths.drone.isActive()) {
        synths.drone.start(freqs, G_AudioPresets.getById('drone'), theme.density.drone);
      } else if (active.indexOf('drone') === -1 && synths.drone.isActive()) {
        synths.drone.stop();
      }
      if (active.indexOf('pad') !== -1 && !synths.pad.isActive()) {
        synths.pad.changeChord(freqs, G_AudioPresets.getById('pad'), theme.density.pad);
      } else if (active.indexOf('pad') === -1 && synths.pad.isActive()) {
        synths.pad.stop();
      }
      if (active.indexOf('texture') !== -1 && !synths.texture.isActive()) {
        synths.texture.start(G_AudioPresets.getById('texture'), theme.density.texture);
      } else if (active.indexOf('texture') === -1 && synths.texture.isActive()) {
        synths.texture.stop();
      }
      this._updateVoiceCount();
    }

    /** ---------------- STEP43.6追加要件「Facility Audio Theme」 ---------------- */

    /**
     * WorldEnvironment（worldEnvironment.js、5Layerごとに巡回する「今いるゾーン」）が
     * 確定/変化した時に呼ぶ。Hidden Environment滞在中はこちらを直接反映せず、
     * 滞在終了後に復元する値として保持するだけにする。
     * @param {string} envId worldEnvironment.jsのEnvironment id
     */
    setWorldEnvironment(envId) {
      this._worldEnvId = envId;
      if (this._hiddenEnvId) return; // 秘匿領域滞在中は反映を後回しにする
      this._applyFacilityAudioTheme(AudioEnvironmentThemes.getWorldEnvironmentTheme(envId));
    }

    /**
     * Hidden Environment（hiddenEnvironmentData.js）へ入退場した時に呼ぶ。
     * @param {string|null} envId 入場時はHidden Environment id、退場時はnull
     *   （nullの場合、直前のWorldEnvironment用Themeへ自動的に戻す）
     */
    setHiddenEnvironment(envId) {
      this._hiddenEnvId = envId;
      if (envId) {
        this._applyFacilityAudioTheme(AudioEnvironmentThemes.getHiddenEnvironmentTheme(envId));
      } else if (this._worldEnvId) {
        this._applyFacilityAudioTheme(AudioEnvironmentThemes.getWorldEnvironmentTheme(this._worldEnvId));
      }
    }

    _applyFacilityAudioTheme(facilityTheme) {
      if (!facilityTheme) return;
      const audioManager = G.AudioManager;
      audioManager.setActiveEnvironmentSounds(facilityTheme.environmentSounds);
      // Drone Layerのfilter周波数へ「色付け」を掛ける。BGM本体(Phase Theme)のfilter設定を
      // 基準に、Facility Audio ThemeのfilterMultiplierで軽く揺らす程度に留める
      const synths = audioManager.getSynths();
      const phaseTheme = AudioThemes.getById(this.state.themeId);
      if (synths && synths.drone.isActive() && synths.drone.filter) {
        const target = phaseTheme.filter.frequency * (facilityTheme.filterMultiplier || 1);
        synths.drone.filter.frequency.setTargetAtTime(target, audioManager.now(), 1.5);
      }
      // Zone/秘匿領域へ入った合図として、短いベル音を1つ鳴らす
      if (synths) {
        const chord = this.state.getCurrentChord();
        const freq = AudioScales.getFrequency(this.state.scaleId, chord.degrees[0] + chord.degrees.length * 2);
        synths.arpeggio.trigger(freq, G.AudioPresets.getById(facilityTheme.accentPreset || 'bell'), audioManager.now(), 1);
      }
    }

    /** ---------------- STEP43.6追加要件「Dynamic Layer Mixing」 ---------------- */

    /**
     * ゲーム状態に応じてPulse/Textureレイヤーをリアルタイムに追加・除去する。
     * endless.js側から`_renderHud()`等の既存の頻繁な更新タイミングで呼ばれる想定
     * （新しいポーリングタイマーは追加しない）。
     * @param {{riskChainLevel?:number, worldStabilityStatus?:string, isBossActive?:boolean}} snapshot
     */
    syncGameState(snapshot) {
      if (!this._running) return;
      snapshot = snapshot || {};
      let changed = false;

      const wantsPulse = (snapshot.riskChainLevel || 0) >= RISK_CHAIN_PULSE_THRESHOLD || !!snapshot.isBossActive;
      changed = this._setForcedLayer('pulse', wantsPulse) || changed;

      const wantsTexture = UNSTABLE_TEXTURE_STATUSES.indexOf(snapshot.worldStabilityStatus) !== -1 || !!snapshot.isBossActive;
      changed = this._setForcedLayer('texture', wantsTexture) || changed;

      if (changed) {
        this._recomputeActiveLayers();
        const theme = AudioThemes.getById(this.state.themeId);
        this._applyLayerMembership(theme);
      }
    }

    /** @returns {boolean} 実際に状態が変化すればtrue */
    _setForcedLayer(layer, active) {
      const had = this._forcedLayers.has(layer);
      if (active === had) return false;
      if (active) this._forcedLayers.add(layer); else this._forcedLayers.delete(layer);
      return true;
    }

    _updateVoiceCount() {
      const synths = G.AudioManager.getSynths();
      if (!synths) { this.state.setVoiceCount(0); return; }
      let count = 0;
      if (synths.drone.isActive()) count += this._currentChordFreqs().length;
      if (synths.pad.isActive()) count += this._currentChordFreqs().length;
      if (synths.texture.isActive()) count += 1;
      if (synths.ambient.isActive()) count += 1;
      this.state.setVoiceCount(count);
    }

    /** ---------------- スケジューラ（Drone/Padのコード進行・Pulse/Arpeggio発音） ---------------- */

    _tick() {
      if (!this._running) return;
      const perfStart = (global.performance && global.performance.now) ? global.performance.now() : Date.now();
      this._tickBody();
      const perfEnd = (global.performance && global.performance.now) ? global.performance.now() : Date.now();
      this._lastTickDurationMs = perfEnd - perfStart;
    }

    _tickBody() {
      const audioManager = G.AudioManager;
      const synths = audioManager.getSynths();
      if (!synths) return;
      const now = audioManager.now();
      this._expireDensityOverrides(now);

      const beatDuration = 60 / Math.max(1, this.state.tempoBpm);
      const chord = this.state.getCurrentChord();
      const chordDurationSec = chord.bars * BEATS_PER_BAR * beatDuration;

      while (this._nextChordTime < now + LOOKAHEAD_SEC) {
        this._scheduleChordChange(this._nextChordTime, synths);
        this._nextChordTime += chordDurationSec;
      }
      if (this.state.activeLayers.indexOf('pulse') !== -1) {
        while (this._nextPulseTime < now + LOOKAHEAD_SEC) {
          this._schedulePulseStep(this._nextPulseTime, synths);
          this._nextPulseTime += beatDuration;
        }
      }
      if (this.state.activeLayers.indexOf('arpeggio') !== -1) {
        while (this._nextArpTime < now + LOOKAHEAD_SEC) {
          this._scheduleArpStep(this._nextArpTime, synths);
          this._nextArpTime += beatDuration / 2;
        }
      }
    }

    _scheduleChordChange(time, synths) {
      this.state.advanceChord();
      if (this.state.unknownMode && this.state.chordIndex === 0) {
        // Unknown Modeは1周するたびにコード進行自体を新しいSeed派生値で作り直す
        // （「コード変化」の部分的ランダム生成、要求仕様「Layer進行」セクション）
        this._unknownProgressionCache = AudioChords.generateUnknownProgression(this._rng);
        this.state.chordProgression = this._unknownProgressionCache;
      }
      const freqs = this._currentChordFreqs();
      const theme = AudioThemes.getById(this.state.themeId);
      if (synths.drone.isActive()) synths.drone.retune(freqs, 1.2);
      if (synths.pad.isActive()) synths.pad.changeChord(freqs, G.AudioPresets.getById('pad'), this._densityFor('pad', theme));
      this._updateVoiceCount();
    }

    _schedulePulseStep(time, synths) {
      const chord = this.state.getCurrentChord();
      const step = AudioPatterns.resolveStep(this.state.activePatterns.pulse, chord.degrees, this._pulseStep, this._rng);
      this._pulseStep++;
      if (!step) return;
      const degree = chord.degrees[step.index] + step.octave * chord.degrees.length;
      const freq = AudioScales.getFrequency(this.state.scaleId, degree);
      const theme = AudioThemes.getById(this.state.themeId);
      synths.pulse.trigger(freq, G.AudioPresets.getById('pulse'), time, this._densityFor('pulse', theme));
    }

    _scheduleArpStep(time, synths) {
      const chord = this.state.getCurrentChord();
      const step = AudioPatterns.resolveStep(this.state.activePatterns.arpeggio, chord.degrees, this._arpStep, this._rng);
      this._arpStep++;
      if (!step) return;
      const degree = chord.degrees[step.index] + step.octave * chord.degrees.length;
      const freq = AudioScales.getFrequency(this.state.scaleId, degree);
      const theme = AudioThemes.getById(this.state.themeId);
      synths.arpeggio.trigger(freq, G.AudioPresets.getById('arpeggio'), time, this._densityFor('arpeggio', theme));
    }

    _densityFor(layer, theme) {
      const base = theme.density[layer] != null ? theme.density[layer] : 0.5;
      const override = this._densityOverrides[layer];
      return override ? Math.min(1, base + override.amount) : base;
    }

    _expireDensityOverrides(now) {
      Object.keys(this._densityOverrides).forEach(layer => {
        if (this._densityOverrides[layer].expiresAt <= now) delete this._densityOverrides[layer];
      });
    }

    /** ---------------- ゲーム状態同期（要求仕様「ゲーム状態同期」14イベント） ---------------- */

    /** @param {string} eventId audioEvents.jsのGAME_EVENTSキー */
    onGameEvent(eventId) {
      const def = AudioEvents.GAME_EVENTS[eventId];
      if (!def) return;
      if (def.sfx) G.AudioManager.playUiSfx(def.sfx);
      this._applyMusicReaction(def.musicReaction);
    }

    /**
     * STEP43.6追加要件「Audio Timeline System」用の公開ラッパー。
     * `AudioTimelineManager.js`の'musicReaction'ステップから呼ばれる
     * （Timeline側は反応の中身を知らず、既存の反応プリミティブをそのまま再利用するだけ）。
     * @param {Object} reaction {type, ...}（audioEvents.jsのmusicReactionと同じ形）
     */
    applyMusicReaction(reaction) {
      this._applyMusicReaction(reaction);
    }

    _applyMusicReaction(reaction) {
      if (!reaction || reaction.type === 'none') return;
      const audioManager = G.AudioManager;
      const synths = audioManager.getSynths();
      if (!synths) return;
      const now = audioManager.now();

      switch (reaction.type) {
        case 'chordAdvance':
          this._nextChordTime = now + 0.05; // 次のtickで即座にコード進行させる
          break;
        case 'densityBoost':
          this._densityOverrides[reaction.layer] = { amount: reaction.amount, expiresAt: now + reaction.durationSec };
          break;
        case 'filterSweep': {
          // filterプロパティを持つのは常時発音レイヤー(Drone/Pad/Texture)のみのため、
          // reaction.layerに関わらずDroneを対象にする（未指定でも安全に動作する）
          const target = synths.drone;
          if (target && target.filter) {
            target.filter.frequency.setTargetAtTime(
              target.filter.frequency.value + reaction.amount, now, reaction.durationSec / 3
            );
          }
          break;
        }
        case 'stinger': {
          // Pad/Drone等、trigger()を持たない常時発音レイヤーが指定された場合でも、
          // 実際の発音は必ずArpeggioSynth（単発トーン再生機構）経由で行う
          // （プリセットだけreaction.layerに応じて差し替える）
          const chord = this.state.getCurrentChord();
          const freq = AudioScales.getFrequency(this.state.scaleId, chord.degrees[0] + chord.degrees.length);
          const presetId = reaction.layer === 'pad' ? 'pad' : reaction.layer === 'pulse' ? 'pulse' : 'arpeggio';
          synths.arpeggio.trigger(freq, G.AudioPresets.getById(presetId), now, 1);
          break;
        }
        case 'layerFlash':
          if (reaction.layer === 'texture' && !synths.texture.isActive()) {
            const theme = AudioThemes.getById(this.state.themeId);
            synths.texture.start(G.AudioPresets.getById('texture'), theme.density.texture);
            setTimeout(() => { if (this.state.activeLayers.indexOf('texture') === -1) synths.texture.stop(); }, reaction.durationSec * 1000);
          }
          break;
        default:
          break;
      }
    }
  }

  G.AdaptiveMusicEngine = AdaptiveMusicEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
