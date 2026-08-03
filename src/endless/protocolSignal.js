/**
 * protocolSignal.js
 * ENDLESS RESEARCHのProtocol Signal画面（Depth5ごとに出現、新しいProtocolを1つ提示する）
 * を担当する。DOM描画・ボタン配線のみを持ち、いつ出現させるか（Depth5ごと）の判定と
 * RUN進行への組み込みはendless.js側の責務（researchLab.jsと同じ役割分担）。
 *
 * 提示されたProtocolに対し、プレイヤーは以下のいずれかを選ぶ:
 *   - MERGE   : 空きスロットへそのまま追加する（Protocol Slotに空きがある時のみ表示）
 *   - REPLACE : 所持中のProtocolのいずれか1つと入れ替える（所持中Protocolの数だけ
 *               「どれと入れ替えるか」のボタンを表示する）
 *   - IGNORE  : 何もせず見送る（常に表示）
 * 選択結果の適用（protocolManager.merge/replace）・ライフ上限の再計算・次Depthへの
 * 進行はendless.js側（_handleProtocolSignal）の責務。
 *
 * Phase C: 候補選定がprotocolSignals.jsの`unlock`条件を満たしていない（＝Protocol
 * Archiveでまだ未発見の）Protocolを除外するようになった（endlessSave.js経由で
 * 解放状況を参照する）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { ProtocolSignals } = G;

  const SIGNAL_EVERY_DEPTH = 5;

  class ProtocolSignal {
    /**
     * @param {Object} deps
     * @param {Object} deps.ui 既存UIインスタンス（showScreenを再利用する）
     * @param {Object} deps.protocolManager 所持中Protocol・空きスロット判定に使う
     * @param {Object} deps.save EndlessSaveStoreインスタンス（解放済みProtocolの判定に使う）
     */
    constructor({ ui, protocolManager, save }) {
      this.ui = ui;
      this.protocolManager = protocolManager;
      this.save = save;
      this.onDecision = null; // (action:'merge'|'replace'|'ignore', candidateDef, targetId|null) => {}
      this.candidate = null;

      this.el = {
        depthLabel: document.getElementById('protocolSignalDepth'),
        card: document.getElementById('protocolSignalCard'),
        actions: document.getElementById('protocolSignalActions')
      };
    }

    /** @param {number} depth 直前に完了した（クリアまたはミスした）Depth */
    shouldTrigger(depth) {
      return depth > 0 && depth % SIGNAL_EVERY_DEPTH === 0;
    }

    /** @param {number} depth 表示用（「DEPTH N SIGNAL」等の文脈表示に使う） */
    show(depth) {
      if (this.el.depthLabel) this.el.depthLabel.textContent = `DEPTH ${depth} SIGNAL DETECTED`;
      this.candidate = this._pickCandidate();

      // Signal Protocol4種を全て所持中で候補が尽きた場合、画面自体を出さず自動的に見送る
      if (!this.candidate) {
        if (this.onDecision) this.onDecision('ignore', null, null);
        return;
      }

      this._renderCard(this.candidate);
      this._renderActions(this.candidate);
      this.ui.showScreen('protocolSignal');
    }

    /** protocolSignals.js（Signal限定5種）の中から、未所持かつ解放済みのものをランダムに1つ選ぶ */
    _pickCandidate() {
      const pool = ProtocolSignals.ALL.filter(def =>
        !this.protocolManager.isActive(def.id) && this.save.isProtocolUnlocked(def.id)
      );
      if (pool.length === 0) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    _renderCard(def) {
      const container = this.el.card;
      if (!container) return;
      container.innerHTML = `
        <div class="lab-card protocol-card protocol-signal-card">
          <span class="lab-card-name">${def.name}</span>
          <span class="lab-card-desc">${def.description}</span>
        </div>
      `;
    }

    _renderActions(def) {
      const container = this.el.actions;
      if (!container) return;
      container.innerHTML = '';

      if (this.protocolManager.hasSlotAvailable()) {
        container.appendChild(
          this._makeButton('MERGE（組み込む）', 'protocol-signal-btn-merge', () => this._decide('merge', def, null))
        );
      }

      this.protocolManager.getActiveDefs().forEach(active => {
        container.appendChild(
          this._makeButton(
            `REPLACE: ${active.name} → ${def.name}`,
            'protocol-signal-btn-replace',
            () => this._decide('replace', def, active.id)
          )
        );
      });

      container.appendChild(
        this._makeButton('IGNORE（見送る）', 'protocol-signal-btn-ignore', () => this._decide('ignore', def, null))
      );
    }

    _makeButton(label, cls, handler) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'protocol-signal-btn ' + cls;
      btn.textContent = label;
      btn.addEventListener('click', handler);
      return btn;
    }

    _decide(action, def, targetId) {
      if (this.onDecision) this.onDecision(action, def, targetId);
    }
  }

  G.ProtocolSignal = ProtocolSignal;
})(typeof globalThis !== 'undefined' ? globalThis : this);
