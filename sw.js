/* 우리집 플래너 - 푸시 알림 + 앱 설치(PWA) 서비스워커 */
var CACHE = 'homelog-v1';
var SHELL = ['./', './index.html', './manifest.json',
             './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); })
    .catch(function(){}).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
/* 네트워크 우선 — 항상 최신 코드를 받고, 오프라인일 때만 캐시로 연다 */
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  if(new URL(req.url).origin !== location.origin) return;   /* Firebase 등 외부는 손대지 않음 */
  e.respondWith(
    fetch(req).then(function(res){
      var cp = res.clone();
      caches.open(CACHE).then(function(c){ c.put(req, cp); });
      return res;
    }).catch(function(){
      return caches.match(req).then(function(r){ return r || caches.match('./index.html'); });
    })
  );
});

self.addEventListener('push', function(e){
  var data = {};
  try { data = e.data ? e.data.json() : {}; }
  catch(err){ data = { title: '🏠 우리집 플래너', body: e.data ? e.data.text() : '' }; }
  var title = data.title || '🏠 우리집 플래너';
  var opts = {
    body: data.body || '',
    tag: 'home-planner-daily',
    renotify: true,
    data: { url: data.url || './' }
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
