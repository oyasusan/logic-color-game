/**
 * popupFeedback.js
 * 「Research Facility Interaction Pass」Popup Feedback。ゲーム全体の全オーバーレイ
 * （`.overlay`、25個）が表示された瞬間に、専用カテゴリのSE＋専用Animationクラスを
 * 一括で後付けする。
 *
 * 【設計方針: MutationObserver】25個のオーバーレイはそれぞれ別々のファイル（ui.js/
 * environmentScan.js/mutationRenderer.js/calibrationManager.js等）が個別に
 * `classList.remove('hidden')`している。1つ1つの呼び出し元へ手を加えると変更範囲が
 * 大きくなりすぎるため、`document.body`を`subtree:true`で監視するMutationObserverを
 * 1つだけ使い、`hidden`クラスが外れた瞬間を検知する（新しいDOMを追加しない・新しい
 * rAFループを増やさない、という要求仕様の制約に自然に合致する）。
 *
 * 【既存の演出音との二重再生について】discoveryOverlay等の一部ポップアップは、表示
 * 直前に`feedbackManager.trigger('discovery')`のような既存のTimeline演出音が
 * 既に鳴っていることがある。ここで鳴らすのはその「内容の音」ではなく「パネルが
 * 開いたこと」を示す短く控えめなUI Chrome音（既存演出の音量・尺よりも小さい）で
 * あり、意図的に薄く重ねる設計とした（実際のゲームでも報酬演出のファンファーレの
 * 下にUI開閉音が薄く重なるのは一般的な演出）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  // オーバーレイid → Popup Feedbackカテゴリ（audioLanguage.js参照）。
  // 要求仕様が求めていない限り厳密な内容判定はせず、パネルの性質から機械的に割り当てた
  const CATEGORY_BY_ID = {
    rmNodeDetail: 'information',
    rmUpgradePanel: 'information',
    rmProtocolPanel: 'information',
    rmHistoryPanel: 'information',
    surfaceArrivalOverlay: 'story',
    technologyInstalledOverlay: 'success',
    clearOverlay: 'layerClear',
    levelUpOverlay: 'achievement',
    discoveryOverlay: 'discovery',
    identityEventOverlay: 'achievement',
    environmentScanOverlay: 'environment',
    environmentTransitionOverlay: 'environment',
    evolutionTransitionOverlay: 'environment',
    mutationSequenceOverlay: 'warning',
    mutationChoiceOverlay: 'warning',
    environmentEventOverlay: 'environment',
    environmentEventChoiceOverlay: 'environment',
    hiddenDiscoveryOverlay: 'discovery',
    nodeResultOverlay: 'information',
    dialogueOverlay: 'story',
    storyChoiceOverlay: 'story',
    rewardChoiceOverlay: 'success',
    extractOverlay: 'information',
    statusSequenceOverlay: 'continueTone',
    signalIntegrityOverlay: 'continueTone',
    calibrationCardOverlay: 'continueTone'
  };

  // カテゴリごとの専用Animation（既存の`.clear-card { animation: clearCardIn }`に
  // 上乗せする修飾クラス。対象は各オーバーレイ直下のカード要素1つ）
  const ANIM_CLASS_BY_CATEGORY = {
    warning: 'popup-fx-shake',
    discovery: 'popup-fx-bounce',
    success: 'popup-fx-bounce',
    achievement: 'popup-fx-bounce',
    layerClear: 'popup-fx-bounce'
  };
  const ANIM_DURATION_MS = 420;

  class PopupFeedback {
    constructor() {
      this._visible = new Set(); // 直近に「表示中」と判定したid（同じ表示状態への多重発火防止）
      this._observer = null;
      this._bind();
    }

    _bind() {
      const doc = global.document;
      if (!doc || !global.MutationObserver) return;
      this._observer = new global.MutationObserver(records => this._handleMutations(records));
      this._observer.observe(doc.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    _handleMutations(records) {
      records.forEach(record => {
        const el = record.target;
        if (!el || !el.id || !CATEGORY_BY_ID[el.id]) return;
        const isVisible = !el.classList.contains('hidden');
        const wasVisible = this._visible.has(el.id);
        if (isVisible && !wasVisible) {
          this._visible.add(el.id);
          this._onShow(el, CATEGORY_BY_ID[el.id]);
        } else if (!isVisible && wasVisible) {
          this._visible.delete(el.id);
        }
      });
    }

    _onShow(el, category) {
      if (G.AudioManager) G.AudioManager.playCategorySfx(category);
      const animClass = ANIM_CLASS_BY_CATEGORY[category];
      if (!animClass) return;
      // オーバーレイ直下のカード要素（.clear-card等）は既に`animation: clearCardIn`を
      // 持っており、同じ要素へ別のanimationクラスを足すとCSSの`animation`ショートハンドが
      // 上書きされ入場演出が消えてしまう。オーバーレイ自身（`position:fixed`の透明な
      // 全画面コンテナ、flexで中央寄せ）には元々animationが無いため、代わりにこちらへ
      // 適用する（中身を含めて全体が動くため、見た目上はカードを揺らす/弾ませるのと同じ）
      el.classList.remove(animClass);
      void el.offsetWidth; // reflow強制（retrigger）
      el.classList.add(animClass);
      setTimeout(() => el.classList.remove(animClass), ANIM_DURATION_MS);
    }
  }

  G.PopupFeedback = PopupFeedback;
})(typeof globalThis !== 'undefined' ? globalThis : this);
