/**
 * theme.js
 * 「NEURAL GRID / AI SYSTEM」をテーマにした背景演出のみを担当するモジュール。
 * ゲームロジック・DOM上のゲーム要素には一切関与せず、画面全体の裏に敷く
 * canvas（ノードが緩やかに漂い、近くのノード同士を線で結ぶネットワーク風の
 * アニメーション背景）を生成・管理する。
 *
 * - prefers-reduced-motion が有効な環境ではアニメーションを止め、静止画のみ描画する
 * - タブが非表示（visibilitychange）の間はrequestAnimationFrameを止めて無駄な描画をしない
 * - ui.js / game.js など他モジュールへの依存は一切無い（単独で完結する）
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  const NODE_SPACING = 72; // ノード間の目安間隔(px)
  const LINK_DISTANCE = 110; // これより近いノード同士を線で結ぶ
  const DRIFT_SPEED = 0.12; // ノードの漂う速度(px/frame目安)
  const MAX_NODES = 260; // 大画面(4K等)でノード間距離計算がO(n^2)で重くなり過ぎないための上限
  const FRAME_INTERVAL_MS = 1000 / 30; // 装飾アニメーションは30fpsで十分なため間引く

  class NeuralGridTheme {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.nodes = [];
      this.rafId = null;
      this.reduced = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this._onResize = this._onResize.bind(this);
      this._onVisibility = this._onVisibility.bind(this);
    }

    init() {
      if (this.canvas) return; // 二重初期化防止
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'neuralGridCanvas';
      this.canvas.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(this.canvas, document.body.firstChild);
      this.ctx = this.canvas.getContext('2d');

      this._resize();
      window.addEventListener('resize', this._onResize);
      document.addEventListener('visibilitychange', this._onVisibility);

      if (this.reduced) {
        this._draw(); // 静止画を1回だけ描画
      } else {
        this._start();
      }
    }

    _onResize() {
      this._resize();
      if (this.reduced) this._draw();
    }

    _onVisibility() {
      if (document.hidden) this._stop();
      else if (!this.reduced) this._start();
    }

    _resize() {
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._buildNodes(w, h);
    }

    _buildNodes(w, h) {
      let cols = Math.max(2, Math.round(w / NODE_SPACING));
      let rows = Math.max(2, Math.round(h / NODE_SPACING));
      if ((cols + 1) * (rows + 1) > MAX_NODES) {
        const scale = Math.sqrt(((cols + 1) * (rows + 1)) / MAX_NODES);
        cols = Math.max(2, Math.round(cols / scale));
        rows = Math.max(2, Math.round(rows / scale));
      }
      const stepX = w / cols;
      const stepY = h / rows;
      this.nodes = [];
      for (let ry = 0; ry <= rows; ry++) {
        for (let rx = 0; rx <= cols; rx++) {
          const baseX = rx * stepX;
          const baseY = ry * stepY;
          this.nodes.push({
            x: baseX + (Math.random() - 0.5) * stepX * 0.5,
            y: baseY + (Math.random() - 0.5) * stepY * 0.5,
            vx: (Math.random() - 0.5) * DRIFT_SPEED,
            vy: (Math.random() - 0.5) * DRIFT_SPEED,
            phase: Math.random() * Math.PI * 2
          });
        }
      }
    }

    _start() {
      if (this.rafId) return;
      let lastFrame = 0;
      const loop = now => {
        this.rafId = requestAnimationFrame(loop);
        // 背景の装飾アニメーションなので60fpsは不要。約30fpsに間引いてCPU/GPU負荷を抑える
        if (now - lastFrame < FRAME_INTERVAL_MS) return;
        lastFrame = now;
        this._tick();
        this._draw();
      };
      this.rafId = requestAnimationFrame(loop);
    }

    _stop() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    _tick() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        n.phase += 0.02;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      });
    }

    _draw() {
      const ctx = this.ctx;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // ノード間リンク
      ctx.lineWidth = 1;
      for (let i = 0; i < this.nodes.length; i++) {
        const a = this.nodes[i];
        for (let j = i + 1; j < this.nodes.length; j++) {
          const b = this.nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DISTANCE) {
            const alpha = (1 - dist / LINK_DISTANCE) * 0.18;
            ctx.strokeStyle = `rgba(41, 224, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // ノード本体（緩やかに明滅）
      this.nodes.forEach(n => {
        const glow = 0.35 + Math.sin(n.phase) * 0.25;
        ctx.fillStyle = `rgba(67, 255, 160, ${Math.max(0.1, glow)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  G.Theme = new NeuralGridTheme();
})(typeof globalThis !== 'undefined' ? globalThis : this);
