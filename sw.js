/* ============================================================
   Firebase Messaging SDK - 백그라운드 푸시 수신용
   ============================================================ */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase Messaging 초기화 (백그라운드 수신용)
// __FIREBASE_API_KEY__ 는 GitHub Actions 배포 시 실제 키로 치환됩니다.
var _fbMessaging = null;
try {
  firebase.initializeApp({
    apiKey: "__FIREBASE_API_KEY__",
    authDomain: "web-ghost-c447b.firebaseapp.com",
    databaseURL: "https://web-ghost-c447b-default-rtdb.firebaseio.com",
    projectId: "web-ghost-c447b",
    storageBucket: "web-ghost-c447b.firebasestorage.app",
    messagingSenderId: "198377381878",
    appId: "1:198377381878:web:83b56b1b4d63138d27b1d7"
  });
  _fbMessaging = firebase.messaging();
} catch (e) {
  console.warn('[SW] Firebase 초기화 실패 (배포 환경에서는 자동 치환됨):', e.message || e);
}

// Firebase SDK가 push 이벤트를 가로채지 않도록 빈 핸들러 등록
// 실제 알림/배지 처리는 아래 push 이벤트에서 통합 처리
_fbMessaging && _fbMessaging.onBackgroundMessage(function() {});

/* ============================================================
   [sw.js] Service Worker - 마이파이 PWA
   ============================================================ */

/* ── SW 내부 배지 카운트 (IndexedDB로 영구 보존) ── */
var _badgeCount = 0;

/* IndexedDB 기반 배지 카운트 저장/로드 (SW는 localStorage 불가) */
function _loadBadgeCount() {
  return new Promise(function(resolve) {
    try {
      var req = indexedDB.open('mypai_sw', 1);
      req.onupgradeneeded = function(e) {
        e.target.result.createObjectStore('kv');
      };
      req.onsuccess = function(e) {
        var db = e.target.result;
        var tx = db.transaction('kv', 'readonly');
        var get = tx.objectStore('kv').get('badgeCount');
        get.onsuccess = function() { resolve(Number(get.result) || 0); };
        get.onerror = function() { resolve(0); };
      };
      req.onerror = function() { resolve(0); };
    } catch(e) { resolve(0); }
  });
}
function _saveBadgeCount(n) {
  try {
    var req = indexedDB.open('mypai_sw', 1);
    req.onupgradeneeded = function(e) { e.target.result.createObjectStore('kv'); };
    req.onsuccess = function(e) {
      var db = e.target.result;
      var tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(n, 'badgeCount');
    };
  } catch(e) {}
}

var CACHE_NAME = "mypai-v8";
var CACHE_URLS = [
  "./",
  "./index.html",
  "./games/social-messenger.html",
  "./js/config.js",
  "./js/profile-manager.js",
  "./js/pwa-manager.js",
  "./js/social-messenger.js",
  "./js/fcm-push.js",
  "./sounds/page.mp3",
  "./images/icons/icon-192x192.png",
  "./images/icons/favicon-32x32.png",
  "./images/icons/favicon.ico"
  // 캐릭터 이미지는 fetch 이벤트에서 자동 캐시됨 (캐릭터 종류에 무관하게 동작)
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CACHE_URLS).catch(function () {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = e.request.url;
  if (url.indexOf("script.google.com") > -1 ||
      url.indexOf("firebaseio.com") > -1 ||
      url.indexOf("googleapis.com") > -1 ||
      url.indexOf("gstatic.com") > -1) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(e.request, clone);
          });
        }
        return res;
      })
      .catch(function () {
        return caches.match(e.request).then(function (cached) {
          return cached || new Response("", { status: 503, statusText: "Offline" });
        });
      })
  );
});

/* ════════════════════════════════════════════════════════
   FCM 푸시 메시지 수신
   ════════════════════════════════════════════════════════ */
self.addEventListener("push", function (e) {
  if (!e.data) return;

  var data;
  try { data = e.data.json(); } catch (err) { data = { title: "마이파이", body: e.data.text() }; }

  // title 우선순위: data.char_name(클라이언트 전달) → notification.title → data.title → "마이파이"
  var title  = (data.data && data.data.char_name)
             || (data.notification && data.notification.title)
             || data.title
             || data.notification_title
             || "마이파이";
  var body   = data.body     || data.notification_body  || "새 메시지가 있어요.";
  var roomId = data.room_id  || (data.data && data.data.room_id) || "";

  /* 아이콘: scope 기준 절대경로 → 안드로이드 헤드업 알림에 표시됨 */
  var scope  = self.registration.scope;
  // icon 우선순위: data.char_icon(클라이언트 전달) → 기본 캐릭터 이미지
  var icon   = scope + ((data.data && data.data.char_icon) || "images/emotions/기본대기1.png");
  var badge  = scope + "images/icons/favicon-32x32.png";  /* 상태바 흑백 아이콘 */
  // tag는 방 단위로 고정 → renotify:true가 기존 알림을 교체하며 다시 울림 (알림 쌓임 방지)
  var tag    = "mypai-msg-" + (roomId || "global");

  // 미나는 index.html이 메인 - 알림 클릭 시 메인 페이지로 이동
  var appUrl  = scope + "index.html";

  var notifyMode = (data.data && data.data.notify_mode) || "sound";
  var isMute     = notifyMode === "mute";

  e.waitUntil(
    _loadBadgeCount().then(function(savedCount) {
      _badgeCount = savedCount + 1;
      _saveBadgeCount(_badgeCount);

      var opts = {
        body:     body,
        icon:     icon,
        badge:    badge,
        tag:      tag,
        renotify: true,
        silent:   isMute,
        // sound: 진동 없음(시스템 소리만), vibrate: 진동만, mute: 둘 다 없음
        vibrate:  isMute ? [] : (notifyMode === "vibrate" ? [200, 100, 200] : []),
        data:     { roomId: roomId, url: appUrl, notifyMode: notifyMode }
      };

      return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {
        var isForeground = clients.some(function (c) {
          return c.visibilityState === "visible";
        });

        var tasks = [];

        if (!isForeground) {
          // 포그라운드에서는 showNotification, setAppBadge, postMessage 모두 생략
          // → 배지/알림은 onNotify/child_added/visibilitychange에서 처리
          tasks.push(self.registration.showNotification(title, opts));

          if (self.navigator && self.navigator.setAppBadge) {
            tasks.push(self.navigator.setAppBadge(_badgeCount).catch(function(){}));
          }

          clients.forEach(function (client) {
            client.postMessage({ type: "FCM_PUSH_RECEIVED", roomId: roomId, count: _badgeCount });
          });
        }

        return Promise.all(tasks);
      });
    })
  );
});

/* ── 알림 클릭 → PWA 앱으로 열기 + 해당 방으로 이동 ── */
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var roomId = (e.notification.data && e.notification.data.roomId) || "";

  // SW 등록 scope 기준 절대경로 생성 (브라우저 열림 방지 핵심)
  // self.registration.scope = "https://도메인/" (루트)
  var scope = self.registration.scope; // 끝에 "/" 포함
  var appUrl = scope + "index.html" + (roomId ? "?room=" + roomId : "");

  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {

      // 1) 이미 열린 PWA/브라우저 창 중 같은 origin 창 찾기
      for (var i = 0; i < clients.length; i++) {
        var c = clients[i];
        if (!c.url) continue;
        // social-messenger 또는 같은 origin의 어떤 창이든
        if (c.url.indexOf(scope) === 0 && "focus" in c) {
          return c.focus().then(function (wc) {
            // 방 이동 메시지 전달
            if (roomId) wc.postMessage({ type: "FCM_OPEN_ROOM", roomId: roomId });
            // URL이 다른 페이지면 navigate
            if (wc.url.indexOf("index.html") === -1 && !wc.url.endsWith("/")) {
              return wc.navigate(appUrl);
            }
          }).catch(function () {
            return self.clients.openWindow(appUrl);
          });
        }
      }

      // 2) 열린 창 없으면 PWA scope 내 URL로 새 창 열기
      //    scope 내 절대경로를 쓰면 Android Chrome이 브라우저 대신 PWA로 열음
      return self.clients.openWindow(appUrl);
    })
  );
});

/* ── 앱 배지 제어 (클라이언트 postMessage) ── */
self.addEventListener("message", function (e) {
  if (!e.data) return;
  var count = Number(e.data.count) || 0;
  if (e.data.type === "SET_BADGE") {
    _badgeCount = count;
    _saveBadgeCount(count);
    try {
      if (self.navigator && self.navigator.setAppBadge) {
        count > 0 ? self.navigator.setAppBadge(count) : self.navigator.clearAppBadge();
      }
    } catch (err) {}
  }
  if (e.data.type === "CLEAR_BADGE") {
    _badgeCount = 0;
    _saveBadgeCount(0);
    try {
      if (self.navigator && self.navigator.clearAppBadge) self.navigator.clearAppBadge();
    } catch (err) {}
  }
});
