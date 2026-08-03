/**
 * environmentRenderer.js
 * STEP30-3「Environment Visual / HUD Evolution」セクション3/4: Environment Theme
 * Animation + Performance Control。既存のtheme.js（ネオンAIテーマのcanvas背景、
 * 全画面共通）自体には一切手を加えず、ENDLESS RESEARCH中（GAME画面/MAP画面）に
 * だけ重ねる軽量なCSSアニメーション背景レイヤーの表示クラスを切り替えるだけの
 * 薄いモジュール（「既存Canvas/CSS構造を利用する」という要求仕様の指示を、
 * 新しいJS描画ループを追加せずCSS keyframesのみで満たす設計判断）。
 *
 * Environment 6種 × background種別（worldEnvironment.js参照）→CSSクラス:
 *   grid→theme-grid(Grid Line/Scan Line/Digital Noise) / network→theme-network
 *   (Connection Line/Node Pulse/Data Wave) / neural→theme-neural(Neural Pulse/
 *   Circuit Growth/Data Flow) / data→theme-data(Data Particle/Ripple/Flowing Code)
 *   / fractal→theme-fractal(Geometric Transform/Recursive Pattern/Rotation) /
 *   glitch→theme-glitch(Glitch/Screen Distortion/Random Noise)
 *   （各演出の実体はindex.htmlのCSS keyframesとして定義）
 *
 * performanceMode（'high'|'normal'|'low'、endlessSave.js委譲）が'low'の間は
 * `perf-low`クラスが付与され、CSS側でParticle/Glitch等の重い演出をOFFにする。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  class EnvironmentRenderer {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス（performanceMode委譲用） */
    constructor({ save }) {
      this.save = save;
      this.el = {
        gameLayer: document.getElementById('environmentThemeLayer'),
        mapLayer: document.getElementById('mapEnvironmentThemeLayer')
      };
    }

    /** @param {Object} envDef 現在確定しているWorldEnvironment定義（worldEnvironment.js参照） */
    render(envDef) {
      const className = `environment-theme-layer theme-${envDef.background} perf-${this.getPerformanceMode()}`;
      [this.el.gameLayer, this.el.mapLayer].forEach(el => {
        if (el) el.className = className;
      });
    }

    getPerformanceMode() {
      return this.save.getPerformanceMode();
    }

    /** @param {string} mode 'high'|'normal'|'low' */
    setPerformanceMode(mode) {
      this.save.setPerformanceMode(mode);
    }
  }

  G.EnvironmentRenderer = EnvironmentRenderer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
