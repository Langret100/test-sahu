/* ============================================================
   [messenger-reply-ghost-bubble.js]  "실시간 톡" 답글 말풍선 알림(메인 화면)
   ------------------------------------------------------------
   - 실시간 톡(메신저) 창을 띄우지 않은 상태에서,
     '내가 마지막으로 쓴 글' 이후에 다른 사람이 글을 달면
     화면의 캐릭터(고스트)가 말풍선으로 알려줍니다.
   - signals.js(SignalBus) 기반으로 동작하며, 방 목록 캐시(ghostRoomsCache_v1)를
     참고해 내 방들(global 포함)을 구독합니다.
     * 캐시 포맷: { ts, rooms:[{room_id,name,...}] } (chat-rooms.js)

   [제거 시 함께 삭제/정리할 요소]
   1) index.html 에서 본 스크립트 include 제거
   2) (같이 추가된 경우) index.html 의 signals.js include 제거
   ============================================================ */

(function () {
  if (typeof window === "undefined") return;

  // ---- 설정 ----
  var LS_ROOMS_CACHE = "ghostRoomsCache_v1";
  var LS_VISITED = "ghostRoomVisited_v1"; // 내가 "들어간(확인한)" 방만 알림
  var LS_ANNOUNCED = "ghostMessengerReplyAnnounced_v1";
  var COOLDOWN_MS = 15000; // 말풍선 과다 출력 방지(전역)

  // 템플릿: {ROOM} 자리에 방 이름이 들어갑니다.
  var LINES = [
    "{ROOM}에 답글이 달렸어요.",
    "{ROOM}에서 누가 말했나봐요.",
    "{ROOM}{OBJ} 확인해 볼까요?",
    "방금 {ROOM}에 새 말이 올라왔어요.",
    "내가 쓴 글 다음에 {ROOM}에 답글이 달렸어요."
  ];

  var lastSpokenAt = 0;
  var announced = {};
  var roomNameMap = {}; // roomId -> name

  function loadAnnounced() {
    try {
      var raw = localStorage.getItem(LS_ANNOUNCED);
      if (raw) announced = JSON.parse(raw) || {};
    } catch (e) {
      announced = {};
    }
  }

  function saveAnnounced() {
    try { localStorage.setItem(LS_ANNOUNCED, JSON.stringify(announced || {})); } catch (e) {}
  }

  function pickLine() {
    try { return LINES[Math.floor(Math.random() * LINES.length)] || LINES[0]; }
    catch (e) { return LINES[0]; }
  }

  // 한글 받침 여부로 "을/를" 선택(대략적인 자연스러움)
  function pickObjectParticle(word) {
    try {
      if (!word) return "을";
      var last = word.charCodeAt(word.length - 1);
      // 한글 음절 범위
      if (last >= 0xAC00 && last <= 0xD7A3) {
        var jong = (last - 0xAC00) % 28;
        return (jong === 0) ? "를" : "을";
      }
    } catch (e) {}
    return "을";
  }

  function applyTemplate(tpl, roomName) {
    var name = roomName || "대화방";
    var obj = pickObjectParticle(name);
    try {
      return String(tpl)
        .replace(/\{ROOM\}/g, name)
        .replace(/\{OBJ\}/g, obj);
    } catch (e) {
      return name + "에 새 글이 있어요.";
    }
  }

  function isMessengerOpen() {
    try {
      var overlay = document.getElementById("gameOverlay");
      if (!overlay) return false;
      if (overlay.classList.contains("hidden")) return false;
      if (overlay.classList.contains("mode-messenger")) return true;
      if (overlay.dataset && overlay.dataset.mode === "messenger") return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  function getSafeUserId() {
    try {
      if (window.currentUser && window.currentUser.user_id) return String(window.currentUser.user_id);
      var raw = localStorage.getItem("ghostUser");
      if (raw) {
        var u = JSON.parse(raw);
        if (u && u.user_id) return String(u.user_id);
      }
    } catch (e) {}
    return "";
  }

  function loadVisitedMap() {
    try {
      var raw = localStorage.getItem(LS_VISITED);
      if (raw) return JSON.parse(raw) || {};
    } catch (e) {}
    return {};
  }

  function getVisitedRoomIds() {
    var map = loadVisitedMap();
    var ids = ["global"];
    try {
      Object.keys(map || {}).forEach(function (rid) {
        if (!rid) return;
        rid = String(rid);
        if (ids.indexOf(rid) >= 0) return;
        ids.push(rid);
      });
    } catch (e) {}
    return ids.slice(0, 30);
  }

  function isVisitedRoom(roomId) {
    try {
      if (!roomId) return false;
      if (String(roomId) === "global") return true;
      var map = loadVisitedMap();
      return !!(map && map[String(roomId)]);
    } catch (e) {}
    return false;
  }

  function rebuildRoomCacheMap() {
    roomNameMap = { global: "전체 대화방" };
    try {
      var raw = localStorage.getItem(LS_ROOMS_CACHE);
      if (!raw) return;

      var parsed = JSON.parse(raw);
      var list = null;
      // 구버전 캐시(Array) / 신버전 캐시({rooms:[]}) 모두 지원
      if (Array.isArray(parsed)) list = parsed;
      else if (parsed && Array.isArray(parsed.rooms)) list = parsed.rooms;

      if (!list) return;
      for (var i = 0; i < list.length; i++) {
        var r = list[i] || {};
        var rid = r.room_id ? String(r.room_id) : "";
        if (!rid) continue;
        var nm = r.name ? String(r.name) : "";
        if (nm) roomNameMap[rid] = nm;
      }
    } catch (e) {}
  }

  function getRoomIdsToSubscribe() {
    // 캐릭터 알림은 "내가 한 번이라도 들어가 본 방"만 구독합니다.
    // (소속/권한 없는 방의 알림은 말하지 않도록)
    try { rebuildRoomCacheMap(); } catch (e) {}
    return getVisitedRoomIds();
  }

  function getRoomName(roomId) {
    var rid = String(roomId || "");
    if (!rid) return "대화방";
    if (rid === "global") return "전체 대화방";
    try {
      if (roomNameMap && roomNameMap[rid]) return String(roomNameMap[rid]);
    } catch (e) {}
    // 활성 방 이름을 마지막 힌트로 사용
    try {
      var aId = localStorage.getItem("ghostActiveRoomId") || "";
      if (aId && String(aId) === rid) {
        var aNm = localStorage.getItem("ghostActiveRoomName") || "";
        if (aNm) return String(aNm);
      }
    } catch (e2) {}
    return "대화방";
  }

  function ensureFirebaseDb() {
    try {
      if (typeof firebase === "undefined" || !firebase || !firebase.initializeApp) return null;

      // 메신저/소통채팅과 동일한 기본 설정
      // [보안] apiKey는 공개 repo에 커밋하지 않기 위해 플레이스홀더로 유지합니다.
      // (GitHub Actions 배포 시 Secrets(FIREBASE_API_KEY)로 "__FIREBASE_API_KEY__" 치환)
      var cfg = {
        apiKey: "__FIREBASE_API_KEY__",
        authDomain: "web-ghost-c447b.firebaseapp.com",
        databaseURL: "https://web-ghost-c447b-default-rtdb.firebaseio.com",
        projectId: "web-ghost-c447b",
        storageBucket: "web-ghost-c447b.firebasestorage.app",
        messagingSenderId: "198377381878",
        appId: "1:198377381878:web:83b56b1b4d63138d27b1d7"
      };
      if (window.SOCIAL_CHAT_FIREBASE_CONFIG) cfg = window.SOCIAL_CHAT_FIREBASE_CONFIG;

      if (firebase.apps && firebase.apps.length > 0) {
        firebase.app();
      } else {
        firebase.initializeApp(cfg);
      }
      return firebase.database();
    } catch (e) {
      return null;
    }
  }

  function speak(line) {
    if (!line) return;
    if (typeof window.showBubble === "function") {
      try { window.showBubble(line); } catch (e) {}
    } else if (typeof window.setEmotion === "function") {
      // 말풍선 API가 없는 환경 대비
      try { window.setEmotion("미소", line, { shake: false }); } catch (e2) {}
    }
  }

  function onNotify(info) {
    try {
      if (!info || !info.roomId) return;
      if (isMessengerOpen()) return;

      var now = Date.now();
      if (now - lastSpokenAt < COOLDOWN_MS) return;

      var rid = String(info.roomId);

      // 내가 들어가 본 방이 아니면(소속/관심 방 아님) 말하지 않음
      if (!isVisitedRoom(rid)) return;
      var ts = Number(info.ts || 0);

      // 같은 방/같은 ts 반복 안내 방지
      var prev = Number(announced[rid] || 0);
      if (ts && ts <= prev) return;

      announced[rid] = ts || now;
      saveAnnounced();

      // 캐시가 갱신됐을 수도 있으니, 여기서도 한 번 더 최신 맵을 반영
      try { rebuildRoomCacheMap(); } catch (eMap) {}

      var roomName = getRoomName(rid);
      var tpl = pickLine();

      lastSpokenAt = now;
      speak(applyTemplate(tpl, roomName));
    } catch (e) {}
  }

  function attachSignals() {
    // 로그인 안 했으면 동작하지 않음
    var myId = getSafeUserId();
    if (!myId) return;

    if (!window.SignalBus || typeof window.SignalBus.attach !== "function") return;
    var db = ensureFirebaseDb();
    if (!db) return;

    try {
      window.SignalBus.attach({
        db: db,
        getMyId: function () { return getSafeUserId(); },
        onNotify: onNotify,
        onSignal: function () {}
      });
    } catch (e) {}

    // 방 구독 시작(캐시 기준)
    try {
      if (typeof window.SignalBus.syncRooms === "function") {
        window.SignalBus.syncRooms(getRoomIdsToSubscribe(), "ghost-bubble");
      }
    } catch (e2) {}

    

// 같은 탭에서 visited가 갱신되면 즉시 재구독
try {
  window.addEventListener("ghost:visited-rooms-updated", function () {
    try {
      if (window.SignalBus && typeof window.SignalBus.syncRooms === "function") {
        window.SignalBus.syncRooms(getRoomIdsToSubscribe(), "ghost-bubble");
      }
    } catch (e1) {}
  });
} catch (e0) {}
// 방 목록 캐시가 갱신되면(메신저를 한 번 열어 목록을 불러오면) 자동 재구독
    try {
      window.addEventListener("storage", function (ev) {
        if (!ev) return;
        if (ev.key !== LS_ROOMS_CACHE && ev.key !== LS_VISITED) return;
        try {
          if (window.SignalBus && typeof window.SignalBus.syncRooms === "function") {
            window.SignalBus.syncRooms(getRoomIdsToSubscribe(), "ghost-bubble");
          }
        } catch (e3) {}
      });
    } catch (e4) {}
  }

  loadAnnounced();

  // DOM 준비 이후에 붙이는 편이 안전
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachSignals);
  } else {
    attachSignals();
  }
})();
