/* 나무장터 서비스 워커: 홈 화면에 설치할 수 있게 하고, 한 번 받은 앱 파일은 다시 받지 않는다. */
const CACHE = 'namu001-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 지도 타일 등 다른 곳의 자료는 브라우저에 맡긴다
  if (url.origin !== self.location.origin) return;
  // 앱 받기 페이지와 APK 는 저장해 두지 않는다 (큰 파일이고, 새로 올리면 바로 새것을 받아야 한다)
  if (url.pathname.includes('/download/')) return;

  // 화면(HTML)과 글 목록은 새것을 먼저 받고, 안 되면 저장해 둔 것을 쓴다
  const fresh = req.mode === 'navigate' || url.pathname.endsWith('/data/listings.json');
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const fetching = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return fresh ? fetching.then((res) => res || cached) : cached || fetching;
    }),
  );
});
