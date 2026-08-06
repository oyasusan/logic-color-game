/**
 * interactionFeedback.js
 * 「Research Facility Interaction Pass」Button Feedback。ゲーム全体（Stage/Tutorial/
 * Story/Endless問わず）のボタン相当要素へ、押下SE・押下Animation・Hover(PC限定)・
 * 長押し・Toggleを一括で後付けする。
 *
 * 【設計方針: event delegationのみ】117箇所に分散した既存の個別クリックハンドラには
 * 一切触れない（既存のゲームロジック呼び出しを壊すリスクを避けるため）。document直下へ
 * pointerイベントを1系統だけ登録し、`closest()`でボタン相当要素を判定する。新しく
 * 追加されるボタンにも自動的に効く。
 *
 * 【Input Feel: レスポンス優先】pointerdown（実際のclickより早く発火する）の時点で
 * 即座に押下Animationを開始する。「処理開始前にAnimation開始」という要求仕様どおり、
 * 実際のクリックハンドラ（ゲームロジック）の実行結果を待たない。
 *
 * 【Animation同時数上限・Object Pool】CSSアニメーションは`.fx-press`等のクラス付け外し
 * のみ（Canvas/DOM追加は一切しない）。同時に進行中のアニメーション数を`_activeAnimCount`
 * で数え、上限（Presentation品質がminimalなら3、それ以外は8）を超えたら新規のアニメーション
 * 適用だけをスキップする（SEは常に鳴らす。「押した感触」の核はSEとレスポンス優先動作にあり、
 * 視覚演出はCPU保護のため間引いても体験を大きく損なわないという判断）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const PRESS_ANIM_MS = 140;
  const LONG_PRESS_MS = 600;
  const DEFAULT_MAX_CONCURRENT = 8;
  const MINIMAL_MAX_CONCURRENT = 3;

  // 明示的にToggleとして扱うid（サウンド/Ambientのon-off。aria-expandedを持つ折りたたみ
  // トグル(.map-env-detail-toggle系)は属性ベースで別途検出するためここには含めない）
  const TOGGLE_IDS = new Set([
    'titleSoundToggle', 'gameSoundToggle', 'audioSettingsMasterToggle', 'audioSettingsAmbientToggle'
  ]);

  // 分類ルール（先勝ち）。既存クラス名だけで7割以上のボタンを機械的に分類できる
  // （調査で確認済み: ghost-btn 51 / primary-btn 19 / icon-btn 12 / lab-card 12 /
  // story-tab-btn 6 / rm-nav-btn 5 / archive-tab-btn 6）
  const CLASSIFICATION_RULES = [
    { selector: '.primary-btn', category: 'confirm' },
    { selector: '.lab-card, .story-choice-btn, .reward-choice-option, .mutation-choice-option, button.rm-node, .map-node-card, .env-choice-card', category: 'selection' },
    { selector: '.ghost-btn', category: 'cancel' },
    { selector: '.icon-btn, .story-tab-btn, .archive-tab-btn, .rm-nav-btn, .map-env-detail-toggle', category: 'navigation' }
  ];

  // 明示的にUI Chromeと分かっているクラスのみ（盤面セル等、ゲーム本体の高頻度操作は含めない）
  const SPECIFIC_SELECTOR = '.primary-btn, .ghost-btn, .icon-btn, .lab-card, .story-tab-btn, .rm-nav-btn, ' +
    '.archive-tab-btn, .story-choice-btn, .reward-choice-option, .mutation-choice-option, button.rm-node, ' +
    '.map-node-card, .env-choice-card, .map-env-detail-toggle';
  // UNDO/RESET/HINT等、専用クラスを持たない素の<button>を拾うための保険。ただし
  // 「盤面セル(.board-cell)を巻き込んで二重にSE/Animation/reflowを発生させ、タップ連打時に
  // 実機で応答が重くなる（新規探索開始直後の数タップで詰まって見える）」という不具合の
  // 原因になっていたため、盤面コンテナ(#boardWrapper)の中は対象から除外する
  const GENERIC_FALLBACK_SELECTOR = 'button, [role="button"]';
  const EXCLUDED_CONTAINER_SELECTOR = '#boardWrapper';

  class InteractionFeedback {
    /**
     * @param {Object} [deps]
     * @param {Function} [deps.getPresentationQuality] () => 'high'|'normal'|'low'（省略時は常に'normal'扱い）
     */
    constructor({ getPresentationQuality } = {}) {
      this.getPresentationQuality = getPresentationQuality || (() => 'normal');
      this._activeAnimCount = 0;
      this._pressedEl = null;
      this._longPressTimer = null;
      this._longPressFired = false;
      // pointerType==='mouse'かつホバー可能なポインティングデバイスの場合のみHover SEを鳴らす
      // （「Hover(SEはPCのみ)」要求仕様どおり、タッチ操作ではHover相当のpointeroverが
      // タップ直後に発火してしまい鳴らすと不自然なため）
      this._hoverCapable = (() => {
        try { return global.matchMedia && global.matchMedia('(hover: hover) and (pointer: fine)').matches; }
        catch (e) { return false; }
      })();
      this._bind();
    }

    _bind() {
      const doc = global.document;
      if (!doc) return;
      doc.addEventListener('pointerdown', e => this._handlePress(e), { passive: true });
      doc.addEventListener('pointerup', e => this._handleRelease(e), { passive: true });
      doc.addEventListener('pointercancel', e => this._handleRelease(e), { passive: true });
      if (this._hoverCapable) {
        doc.addEventListener('pointerover', e => this._handleHoverIn(e), { passive: true });
        doc.addEventListener('pointerout', e => this._handleHoverOut(e), { passive: true });
      }
    }

    _isMinimal() { return this.getPresentationQuality() === 'low'; }
    _maxConcurrent() { return this._isMinimal() ? MINIMAL_MAX_CONCURRENT : DEFAULT_MAX_CONCURRENT; }

    /**
     * @private イベントターゲットからUI Chrome要素を探す。SPECIFIC_SELECTORへは
     * 常にマッチしてよいが、GENERIC_FALLBACK_SELECTOR（素の<button>等）は
     * 盤面コンテナ内では一切マッチさせない（バグ修正: 盤面セルは既に専用の
     * タップ演出・SEを持っており、ここへ二重にSE/Animation/reflowを足すと
     * 実機でタップ連打時の応答が重くなる不具合があったため）。
     */
    _findTarget(e) {
      if (!e.target.closest) return null;
      const specific = e.target.closest(SPECIFIC_SELECTOR);
      if (specific) return specific;
      const generic = e.target.closest(GENERIC_FALLBACK_SELECTOR);
      if (generic && !generic.closest(EXCLUDED_CONTAINER_SELECTOR)) return generic;
      return null;
    }

    _classify(el) {
      if (el.dataset && el.dataset.sfxCategory) return el.dataset.sfxCategory;
      if (TOGGLE_IDS.has(el.id) || el.hasAttribute('aria-expanded')) return 'selection';
      for (let i = 0; i < CLASSIFICATION_RULES.length; i++) {
        if (el.matches(CLASSIFICATION_RULES[i].selector)) return CLASSIFICATION_RULES[i].category;
      }
      return 'selection';
    }

    _handlePress(e) {
      const el = this._findTarget(e);
      if (!el || el.disabled || el.classList.contains('disabled')) return;

      // Input Feel: 実際のクリックハンドラ（ゲームロジック）より先に、即座にAnimationを開始する
      this._applyMicroMotion(el, 'fx-press');

      const category = this._classify(el);
      if (G.AudioManager) G.AudioManager.playCategorySfx(category);

      this._pressedEl = el;
      this._longPressFired = false;
      clearTimeout(this._longPressTimer);
      this._longPressTimer = setTimeout(() => {
        this._longPressFired = true;
        el.classList.add('fx-held');
      }, LONG_PRESS_MS);
    }

    _handleRelease() {
      clearTimeout(this._longPressTimer);
      if (this._pressedEl) {
        this._pressedEl.classList.remove('fx-held');
        this._pressedEl = null;
      }
    }

    _handleHoverIn(e) {
      const el = this._findTarget(e);
      if (!el || el.disabled || el.classList.contains('disabled') || this._isMinimal()) return;
      if (el._fxHovering) return; // pointerover多重発火防止（子要素間の移動でも1回だけ）
      el._fxHovering = true;
      el.classList.add('fx-hover');
      // Hoverは押下時のカテゴリと区別し、常に最も控えめなnavigationトーンで統一する
      // （14カテゴリ全てをHoverでも鳴らすと種類が多すぎて煩雑になるため）
      if (G.AudioManager) G.AudioManager.playCategorySfx('navigation');
    }

    _handleHoverOut(e) {
      const el = this._findTarget(e);
      if (!el) return;
      el._fxHovering = false;
      el.classList.remove('fx-hover');
    }

    /** @private CSSクラスを一時的に付与し、Animation数上限に達していたら見た目だけスキップする */
    _applyMicroMotion(el, className) {
      if (this._activeAnimCount >= this._maxConcurrent()) return;
      this._activeAnimCount++;
      // 既存animation.jsのretrigger()と同じ「remove→reflow→add」パターン
      el.classList.remove(className);
      void el.offsetWidth; // reflow強制
      el.classList.add(className);
      setTimeout(() => {
        el.classList.remove(className);
        this._activeAnimCount = Math.max(0, this._activeAnimCount - 1);
      }, PRESS_ANIM_MS);
    }

    /** AudioDebugPanel等が参照する、現在同時進行中のマイクロモーション数 */
    getActiveAnimationCount() {
      return this._activeAnimCount;
    }
  }

  G.InteractionFeedback = InteractionFeedback;
})(typeof globalThis !== 'undefined' ? globalThis : this);
