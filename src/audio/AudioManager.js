/**
 * AudioManager.js
 * STEP43.6「Adaptive Music System & Audio Data Architecture」。
 *
 * 【設計方針】要求仕様どおり「AudioManagerは『音を鳴らす』だけを担当する」。
 * AudioContext・マスター/カテゴリ音量バス・共有Reverb/Delay送り・各Synthインスタンスの
 * 生成と配線・音量設定の永続化のみを持ち、「いつ・どの音を鳴らすか」（Theme/Chord/
 * Pattern解釈、ゲームイベントへの反応）は一切判断しない（それはAdaptiveMusicEngine.js
 * の責務）。STEP43.5の`src/audioManager.js`/`src/audioData.js`を置き換える
 * （両ファイルは削除済み）。
 *
 * 音量バスは4種（Master込みで5設定項目）: bgm/ui/dialogue/environment。
 * UI Sound・System Sound・Discovery SoundはいずれもuiバスへまとめてSTEP43.5から
 * 引き継いだ設計を維持しつつ、要求仕様の項目名に合わせて'effect'を'ui'に改名した。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { AudioPresets, AudioEvents } = G;

  const STORAGE_KEY = 'logicColor.audio.v1';
  const DEFAULT_VOLUMES = { bgm: 0.35, ui: 0.6, dialogue: 0.5, environment: 0.4 };
  const NOISE_BUFFER_SECONDS = 2;
  const REVERB_IR_SECONDS = 1.6;
  const DELAY_TIME_SEC = 0.32;
  const DELAY_FEEDBACK = 0.28;

  const LAYER_PRESET_ID = { drone: 'drone', pad: 'pad', pulse: 'pulse', arpeggio: 'arpeggio', texture: 'texture' };

  class AudioManager {
    constructor() {
      this.ctx = null;
      this._settings = this._load();
      this._masterGain = null;
      this._busGains = null;   // { bgm, ui, dialogue, environment }
      this._reverbNode = null; // ConvolverNode
      this._reverbGain = null;
      this._delayNode = null;  // DelayNode
      this._delayFeedback = null;
      this._delayGain = null;
      this._noiseBuffer = null;
      this._layerBuses = null; // { drone, pad, pulse, arpeggio, texture }: GainNode（Synth接続先）
      this._synths = null;     // { drone, pad, pulse, arpeggio, texture, ambient, ui }
      this._environmentVoices = new Map(); // id -> {source, filter, gain, lfo}
      this._built = false;
      this._bindUnlock();
    }

    /** ---------------- 永続化（要求仕様「音量設定保存」） ---------------- */

    _load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { enabled: true, ambientEnabled: true, volumes: Object.assign({}, DEFAULT_VOLUMES) };
        const parsed = JSON.parse(raw);
        const storedVolumes = parsed.volumes || {};
        // STEP43.5からの移行: 'effect'キーで保存されていた場合は'ui'へ読み替える
        if (storedVolumes.effect != null && storedVolumes.ui == null) storedVolumes.ui = storedVolumes.effect;
        return {
          enabled: parsed.enabled !== false,
          ambientEnabled: parsed.ambientEnabled !== false,
          volumes: Object.assign({}, DEFAULT_VOLUMES, storedVolumes)
        };
      } catch (e) {
        return { enabled: true, ambientEnabled: true, volumes: Object.assign({}, DEFAULT_VOLUMES) };
      }
    }

    _save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings)); } catch (e) { /* セッション内動作は継続 */ }
    }

    isEnabled() { return this._settings.enabled; }
    setEnabled(value) {
      this._settings.enabled = !!value;
      this._save();
      if (this._masterGain) this._masterGain.gain.setTargetAtTime(this._settings.enabled ? 1 : 0, this._now(), 0.08);
    }

    isAmbientEnabled() { return this._settings.ambientEnabled; }
    setAmbientEnabled(value) {
      this._settings.ambientEnabled = !!value;
      this._save();
    }

    /** @param {'bgm'|'ui'|'dialogue'|'environment'} bus */
    getVolume(bus) { return this._settings.volumes[bus] != null ? this._settings.volumes[bus] : 0; }
    setVolume(bus, value) {
      const clamped = Math.max(0, Math.min(1, value));
      this._settings.volumes[bus] = clamped;
      this._save();
      if (this._busGains && this._busGains[bus]) this._busGains[bus].gain.setTargetAtTime(clamped, this._now(), 0.05);
    }

    /**
     * STEP43.6追加要件「Audio Timeline System」用。指定busを一時的にduckする
     * （`_settings.volumes`＝ユーザーの永続音量設定には触れない、ライブのgain値だけを
     * 動かす一時効果。`restoreBusVolume()`で必ずユーザー設定値へ戻す）。
     * @param {'bgm'|'ui'|'dialogue'|'environment'} bus @param {number} targetRatio 0〜1
     *   （ユーザー設定音量に対する比率。0.4なら「普段の40%まで下げる」の意味）
     * @param {number} durationSec @param {'linear'|'easeIn'|'easeOut'|'easeInOut'} [ease]
     */
    duckBusVolume(bus, targetRatio, durationSec, ease) {
      if (!this._busGains || !this._busGains[bus]) return;
      const target = this.getVolume(bus) * Math.max(0, Math.min(1, targetRatio));
      this._rampGain(this._busGains[bus].gain, target, durationSec, ease);
    }

    /** @param {'bgm'|'ui'|'dialogue'|'environment'} bus @param {number} durationSec @param {string} [ease] */
    restoreBusVolume(bus, durationSec, ease) {
      if (!this._busGains || !this._busGains[bus]) return;
      this._rampGain(this._busGains[bus].gain, this.getVolume(bus), durationSec, ease);
    }

    /** @private AudioParamを指定easeで目標値へ遷移させる（Web Audio標準の自動化メソッドのみで近似する簡易実装） */
    _rampGain(gainParam, target, durationSec, ease) {
      const t0 = this._now();
      const safeDuration = Math.max(0.02, durationSec || 0.3);
      const safeTarget = Math.max(0.0001, target);
      if (ease === 'linear') {
        gainParam.linearRampToValueAtTime(safeTarget, t0 + safeDuration);
      } else if (ease === 'easeOut' && gainParam.value > 0) {
        // exponentialRampToValueAtTimeは開始値が0だと実ブラウザで例外になるため、
        // 現在値が0の場合はsetTargetAtTimeへフォールバックする
        gainParam.exponentialRampToValueAtTime(safeTarget, t0 + safeDuration);
      } else {
        // easeIn/easeInOut/未指定: setTargetAtTimeによる滑らかな指数的接近で近似する
        gainParam.setTargetAtTime(safeTarget, t0, safeDuration / 3);
      }
    }

    /** ---------------- Web Audio基盤 ---------------- */

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
      this._build();
    }

    _now() { return this.ctx ? this.ctx.currentTime : 0; }

    /** @returns {number} AudioContextの現在時刻（AdaptiveMusicEngine.js等の外部呼び出し用の公開API） */
    now() { return this._now(); }

    /** マスター/バス/共有Reverb・Delay/各Synthを一度だけ構築する */
    _build() {
      if (this._built || !this.ctx) return;
      const ctx = this.ctx;

      this._masterGain = ctx.createGain();
      this._masterGain.gain.setValueAtTime(this._settings.enabled ? 1 : 0, ctx.currentTime);
      this._masterGain.connect(ctx.destination);

      this._busGains = {};
      ['bgm', 'ui', 'dialogue', 'environment'].forEach(bus => {
        const g = ctx.createGain();
        g.gain.setValueAtTime(this.getVolume(bus), ctx.currentTime);
        g.connect(this._masterGain);
        this._busGains[bus] = g;
      });

      // 共有Reverb（アルゴリズム生成インパルスレスポンス、外部音源ファイル不使用）
      this._reverbNode = ctx.createConvolver();
      this._reverbNode.buffer = this._generateReverbImpulse();
      this._reverbGain = ctx.createGain();
      this._reverbGain.gain.setValueAtTime(0.5, ctx.currentTime);
      this._reverbNode.connect(this._reverbGain).connect(this._busGains.bgm);

      // 共有Delay（フィードバックループ付きDelayNode）
      this._delayNode = ctx.createDelay(1.0);
      this._delayNode.delayTime.setValueAtTime(DELAY_TIME_SEC, ctx.currentTime);
      this._delayFeedback = ctx.createGain();
      this._delayFeedback.gain.setValueAtTime(DELAY_FEEDBACK, ctx.currentTime);
      this._delayGain = ctx.createGain();
      this._delayGain.gain.setValueAtTime(0.4, ctx.currentTime);
      this._delayNode.connect(this._delayFeedback).connect(this._delayNode);
      this._delayNode.connect(this._delayGain).connect(this._busGains.bgm);

      this._noiseBuffer = this._generateNoiseBuffer();

      this._layerBuses = {};
      ['drone', 'pad', 'pulse', 'arpeggio', 'texture'].forEach(layer => {
        this._layerBuses[layer] = this._buildLayerBus(AudioPresets.getById(LAYER_PRESET_ID[layer]), this._busGains.bgm);
      });
      const ambientBus = this._buildLayerBus(AudioPresets.getById('ambient'), this._busGains.environment);
      const uiBus = this._busGains.ui;
      const dialogueBus = this._busGains.dialogue;

      this._synths = {
        drone: new G.DroneSynth(ctx, this._layerBuses.drone),
        pad: new G.PadSynth(ctx, this._layerBuses.pad),
        pulse: new G.PulseSynth(ctx, this._layerBuses.pulse),
        arpeggio: new G.ArpeggioSynth(ctx, this._layerBuses.arpeggio),
        texture: new G.TextureSynth(ctx, this._layerBuses.texture, this._noiseBuffer),
        ambient: new G.AmbientSynth(ctx, ambientBus),
        ui: new G.UISynth(ctx, uiBus),
        dialogue: new G.UISynth(ctx, dialogueBus) // Dialogue Sound。UISynthを共用（同一の単発トーン再生機構）
      };

      this._built = true;
    }

    /**
     * @private 1つのMusic Layer用「チャンネルストリップ」を作る: 入力→Dry(destination直結)
     *   ＋Reverb送り＋Delay送り。Synth側はこの戻り値(入力ノード)へ接続するだけでよく、
     *   Reverb/Delayの配線自体は意識しなくてよい設計（AudioManagerが「鳴らす」の一部として持つ）。
     * @param {Object} preset reverbSend/delaySendを持つプリセット
     * @param {AudioNode} destination
     * @returns {GainNode}
     */
    _buildLayerBus(preset, destination) {
      const ctx = this.ctx;
      const input = ctx.createGain();
      input.gain.setValueAtTime(1, ctx.currentTime);
      input.connect(destination);
      if (preset.reverbSend > 0) {
        const send = ctx.createGain();
        send.gain.setValueAtTime(preset.reverbSend, ctx.currentTime);
        input.connect(send).connect(this._reverbNode);
      }
      if (preset.delaySend > 0) {
        const send = ctx.createGain();
        send.gain.setValueAtTime(preset.delaySend, ctx.currentTime);
        input.connect(send).connect(this._delayNode);
      }
      return input;
    }

    /** @private ノイズソース用の共有バッファ（生成は1回のみ、CPU負荷を抑える） */
    _generateNoiseBuffer() {
      const ctx = this.ctx;
      const length = Math.floor(ctx.sampleRate * NOISE_BUFFER_SECONDS);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      return buffer;
    }

    /** @private 指数減衰する白色ノイズによる、アルゴリズム生成のReverbインパルスレスポンス */
    _generateReverbImpulse() {
      const ctx = this.ctx;
      const length = Math.floor(ctx.sampleRate * REVERB_IR_SECONDS);
      const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          const decay = Math.pow(1 - i / length, 2.2);
          data[i] = (Math.random() * 2 - 1) * decay;
        }
      }
      return buffer;
    }

    /** ---------------- Synth/バスへのアクセス（AdaptiveMusicEngine.js専用） ---------------- */

    /** @returns {Object|null} { drone, pad, pulse, arpeggio, texture, ambient, ui, dialogue } */
    getSynths() {
      this._ensureContext();
      return this._synths;
    }

    getLayerDensityGain(bus) { return this._busGains ? this._busGains[bus === 'ambient' ? 'environment' : 'bgm'] : null; }

    /** ---------------- UI Sound / Dialogue Sound ---------------- */

    /** @param {string} id audioEvents.jsのUI_SFXキー */
    playUiSfx(id) {
      this._ensureContext();
      if (!this._synths) return;
      const def = AudioEvents.UI_SFX[id];
      if (!def) return;
      const busGain = this._settings.enabled ? this.getVolume('ui') : 0;
      if (busGain <= 0) return;
      this._synths.ui.trigger(def.freq, AudioPresets.getById('ui'), this._now(), 1);
    }

    /**
     * STEP43.6追加要件「Adaptive Scan Progress」。バー進行に同期した短いtick音を鳴らし、
     * 100%へ近づくほど少し高音化する。
     * @param {number} progress01 0〜1（0%〜100%）
     */
    playScanTick(progress01) {
      this._ensureContext();
      if (!this._synths) return;
      const busGain = this._settings.enabled ? this.getVolume('ui') : 0;
      if (busGain <= 0) return;
      const preset = AudioPresets.getById('scanProgress');
      const clamped = Math.max(0, Math.min(1, progress01));
      const freq = preset.freqStart + (preset.freqEnd - preset.freqStart) * clamped;
      this._synths.ui.trigger(freq, preset, this._now(), 1);
    }

    /** @param {string} characterId 'aria'|'dr_leon'|'lost_researcher'、未定義はsystem扱い */
    playDialogueTick(characterId) {
      this._ensureContext();
      if (!this._synths) return;
      const busGain = this._settings.enabled ? this.getVolume('dialogue') : 0;
      if (busGain <= 0) return;
      const presetId = characterId === 'aria' ? 'dialogueAria'
        : characterId === 'dr_leon' ? 'dialogueDrLeon'
        : characterId === 'lost_researcher' ? 'dialogueLostResearcher'
        : 'dialogueSystem';
      const preset = AudioPresets.getById(presetId);
      this._synths.dialogue.trigger(preset.freq, preset, this._now(), 1);
    }

    /** STEP43.6追加要件「Audio Timeline System」用の単発アクセント音（Bell）。ArpeggioSynthの
     *  単発トーン再生機構をそのまま流用する（新しい発音経路を増やさない） */
    playBell() {
      this._ensureContext();
      if (!this._synths) return;
      const busGain = this._settings.enabled ? this.getVolume('ui') : 0;
      if (busGain <= 0) return;
      this._synths.arpeggio.trigger(880, AudioPresets.getById('bell'), this._now(), 1);
    }

    /** ---------------- Research Console Ambient ---------------- */

    startAmbient(freq) {
      this._ensureContext();
      if (!this._settings.ambientEnabled || !this._synths) return;
      this._synths.ambient.start(freq || 60, AudioPresets.getById('ambient'));
    }

    stopAmbient() {
      if (this._synths) this._synths.ambient.stop();
    }

    /** ---------------- Environment Audio（要求仕様「Environment Audio」6種、Theme別ON/OFF） ---------------- */

    /** @param {string[]} ids audioThemes.jsのenvironmentSounds配列 */
    setActiveEnvironmentSounds(ids) {
      this._ensureContext();
      if (!this.ctx) return;
      const idSet = new Set(ids || []);
      // 不要になった音を停止
      Array.from(this._environmentVoices.keys()).forEach(id => {
        if (!idSet.has(id)) this._stopEnvironmentVoice(id);
      });
      // 新たに必要な音を開始
      idSet.forEach(id => {
        if (!this._environmentVoices.has(id)) this._startEnvironmentVoice(id);
      });
    }

    _startEnvironmentVoice(id) {
      const preset = AudioPresets.getEnvironmentPreset(id);
      if (!preset || !this.ctx) return;
      const ctx = this.ctx;
      const t0 = ctx.currentTime;

      const filter = ctx.createBiquadFilter();
      filter.type = preset.filterType;
      filter.frequency.setValueAtTime(preset.filterFreq, t0);
      filter.Q.setValueAtTime(preset.filterQ, t0);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, preset.gain), t0 + 1.5);
      filter.connect(gain).connect(this._busGains.environment);

      let source;
      if (preset.waveform === 'noise') {
        source = ctx.createBufferSource();
        source.buffer = this._noiseBuffer;
        source.loop = true;
      } else {
        source = ctx.createOscillator();
        source.type = preset.waveform;
        source.frequency.setValueAtTime(preset.freq, t0);
      }
      source.connect(filter);

      let lfo = null;
      if (preset.lfoRate > 0) {
        lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(preset.lfoRate, t0);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(preset.gain * preset.lfoDepth * 0.5, t0);
        lfo.connect(lfoGain).connect(gain.gain);
        lfo.start(t0);
      }

      source.start(t0);
      this._environmentVoices.set(id, { source, filter, gain, lfo });
    }

    _stopEnvironmentVoice(id) {
      const voice = this._environmentVoices.get(id);
      if (!voice) return;
      const t0 = this._now();
      voice.gain.gain.setTargetAtTime(0.0001, t0, 0.4);
      setTimeout(() => {
        try { voice.source.stop(); } catch (e) { /* 無視 */ }
        if (voice.lfo) { try { voice.lfo.stop(); } catch (e) { /* 無視 */ } }
      }, 1200);
      this._environmentVoices.delete(id);
    }

    /** ---------------- 全停止（RUN終了・Voiceリーク防止用の一括クリーンアップ） ---------------- */

    stopAllVoices() {
      if (!this._synths) return;
      this._synths.drone.stop();
      this._synths.pad.stop();
      this._synths.texture.stop();
      this._synths.ambient.stop();
      Array.from(this._environmentVoices.keys()).forEach(id => this._stopEnvironmentVoice(id));
    }
  }

  G.AudioManager = new AudioManager();
})(typeof globalThis !== 'undefined' ? globalThis : this);
