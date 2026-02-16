// Service Worker - 最小構成（PWAインストール条件を満たすため）
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // キャッシュ制御なし - 通常のネットワークリクエストをそのまま使用
});
