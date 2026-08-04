/**
 * researchArchiveUI.js
 * STEP33「Research Archive System」セクション1: Research Archive UI。
 * Story/Memory/Character/Protocol/Facilityの5カテゴリへの入口をまとめた新設ハブ画面。
 *
 * 【設計方針】5カテゴリのうちStory以外（Memory/Character/Protocol/Facility）は、
 * 既存の実装済みArchive（memoryArchiveUI.js/characterArchiveUI.js/protocolArchive.js/
 * worldEnvironmentArchive.js）をそのまま再利用する（要求仕様セクション5「Protocol
 * Archiveは既存システムがある場合統合」の方針をStory以外の全カテゴリへ適用した）。
 * Storyのみ、これまで存在しなかったChapter進行の一覧表示として`chapterArchiveUI.js`を
 * 新設した（要求仕様セクション2）。
 *
 * 各既存Archiveクラスの`onBack`プロパティ（呼び出し元へ戻るコールバック）は、
 * このHubの各ボタンをクリックした瞬間に動的に上書きする（`show()`直前に
 * `targetUI.onBack = () => this.show()`を設定する）。これにより、同じArchive画面が
 * 従来の「ARCHIVE HUB」経由で開かれた場合はそちらへ、この「RESEARCH ARCHIVE」経由で
 * 開かれた場合はこちらへ、正しく「戻る」ことができる（コンストラクタ時点の固定値ではなく
 * 都度上書きする設計のため、二重のHubが共存しても矛盾しない）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class ResearchArchiveUI {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.save EndlessSaveStoreインスタンス（archiveData.lastViewedTabを書く）
     * @param {Object} deps.chapterArchiveUI STEP33新設のStory Archive
     * @param {Object} deps.memoryArchiveUI STEP32-3のMemory Archive
     * @param {Object} deps.characterArchiveUI STEP32-4のCharacter Archive
     * @param {Object} deps.protocolArchive 既存のProtocol Archive
     * @param {Object} deps.worldEnvironmentArchive 既存のWorld Environment Archive（Facility相当）
     */
    constructor({ ui, save, chapterArchiveUI, memoryArchiveUI, characterArchiveUI, protocolArchive, worldEnvironmentArchive }) {
      this.ui = ui;
      this.save = save;
      this.onBack = null; // () => {} 呼び出し元（ARCHIVE HUB想定）へ戻るコールバック

      this.el = {
        backBtn: document.getElementById('researchArchiveBackBtn'),
        storyBtn: document.getElementById('researchArchiveStoryBtn'),
        memoryBtn: document.getElementById('researchArchiveMemoryBtn'),
        characterBtn: document.getElementById('researchArchiveCharacterBtn'),
        protocolBtn: document.getElementById('researchArchiveProtocolBtn'),
        facilityBtn: document.getElementById('researchArchiveFacilityBtn')
      };

      if (this.el.backBtn) this.el.backBtn.addEventListener('click', () => { if (this.onBack) this.onBack(); });

      this._bindTabButton(this.el.storyBtn, 'story', chapterArchiveUI);
      this._bindTabButton(this.el.memoryBtn, 'memory', memoryArchiveUI);
      this._bindTabButton(this.el.characterBtn, 'character', characterArchiveUI);
      this._bindTabButton(this.el.protocolBtn, 'protocol', protocolArchive);
      this._bindTabButton(this.el.facilityBtn, 'facility', worldEnvironmentArchive);
    }

    _bindTabButton(btn, tabName, targetUI) {
      if (!btn || !targetUI) return;
      btn.addEventListener('click', () => {
        this.save.setArchiveLastViewedTab(tabName);
        targetUI.onBack = () => this.show();
        targetUI.show();
      });
    }

    show() {
      this.ui.showScreen('researchArchive');
    }
  }

  G.ResearchArchiveUI = ResearchArchiveUI;
})(typeof globalThis !== 'undefined' ? globalThis : this);
