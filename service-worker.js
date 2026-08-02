/**
 * service-worker.js
 * LOGIC COLORのPWA対応（ホーム画面追加後のオフライン起動）を担うService Worker。
 * ゲームロジックには一切関与しない、静的アセットのキャッシュ管理のみを行う。
 *
 * 戦略: stale-while-revalidate（同一オリジンのGETのみ対象）
 *   - キャッシュにあれば即座に返す（オフラインでも高速に起動できる）
 *   - 同時にバックグラウンドでネットワークから取得し、キャッシュを最新化する
 *     （次回起動時には更新後の内容が反映される）
 *   - キャッシュに無い場合はネットワークを待つ。ネットワークも失敗した場合、
 *     ナビゲーション要求（画面遷移）だけはキャッシュ済みのindex.htmlへ
 *     フォールバックする（完全オフラインでも起動画面までは表示できるように）
 *
 * CACHE_VERSIONを上げると、旧キャッシュはactivate時に破棄される。
 * 開発中にファイルを変更したのに反映されない場合は、ブラウザの開発者ツールで
 * Service Workerを一度unregisterするか、CACHE_VERSIONを上げること。
 */
'use strict';

const CACHE_VERSION = 'v1';
const CACHE_NAME = `logic-color-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './src/board.js',
  './src/solver.js',
  './src/difficulty.js',
  './src/seed.js',
  './src/generator.js',
  './src/puzzleManager.js',
  './src/score.js',
  './src/progress.js',
  './src/stage.js',
  './src/tutorial.js',
  './src/game.js',
  './src/theme.js',
  './src/animation.js',
  './src/sound.js',
  './src/debug.js',
  './src/ui.js',
  './src/main.js',
  './data/puzzles.json',
  './data/stages.json',
  './data/tutorials.json',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './assets/images/icon-maskable-512.png',
  './assets/images/apple-touch-icon.png',
  './assets/images/favicon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 外部リソースはSWで扱わない

  event.respondWith(staleWhileRevalidate(request));
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then(response => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkFetch; // バックグラウンドで更新（結果は待たない）
    return cached;
  }

  const networkResponse = await networkFetch;
  if (networkResponse) return networkResponse;

  // 完全オフライン & 未キャッシュ: 画面遷移リクエストだけはindex.htmlへフォールバック
  if (request.mode === 'navigate') {
    const fallback = await cache.match('./index.html');
    if (fallback) return fallback;
  }

  return new Response('Offline', { status: 503, statusText: 'Offline' });
}
