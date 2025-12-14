/* ============================================================
   [room-unread-badge.js] 대화방 목록에 "새 글"(미확인) 표시(점) 추가
   ------------------------------------------------------------
   - signals.js 의 onNotify(방별 새 메시지 감지)에서 roomId를 전달받아
     해당 방을 "미확인" 상태로 표시합니다.
   - 사용자가 그 방으로 들어가 확인(setActiveRoom)하면 표시가 자동으로 사라집니다.
   - 상태는 localStorage에 저장되어 새로고침/재접속 후에도 유지됩니다.

   [중요 정책]
   - "내가 실제로 들어가 본(visited) 방"만 미확인 표시를 합니다.
     (들어가지 못한 방/소속되지 않은 방은 알림/표시 없음)

   [제거 시 함께 삭제/정리할 요소]
   1) games/social-messenger.html 의 .room-unread-badge CSS
   2) games/social-messenger.html 의 room-unread-badge.js include
   3) js/social-messenger.js 의 RoomUnreadBadge.mark 호출부
   4) js/chat-rooms.js 의 RoomUnreadBadge.applyToItem / clear 연동부
   ============================================================ */

(function () {
  if (window.RoomUnreadBadge) return;

  var KEY = "ghostRoomUnread_v1";
  var LS_VISITED = "ghostRoomVisited_v1";

  var unread = {}; // roomId -> ts
  var visitedCache = null;

  function normId(roomId) {
    roomId = roomId == null ? "" : String(roomId);
    return roomId.trim();
  }

  function loadVisited() {
    try {
      var raw = localStorage.getItem(LS_VISITED);
      visitedCache = raw ? (JSON.parse(raw) || {}) : {};
    } catch (e) {
      visitedCache = {};
    }
  }

  function isVisited(roomId) {
    roomId = normId(roomId);
    if (!roomId) return false;
    if (roomId === "global") return true;
    if (!visitedCache) loadVisited();
    return !!(visitedCache && visitedCache[roomId]);
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) { unread = {}; return; }
      var obj = JSON.parse(raw || "{}");
      unread = (obj && typeof obj === "object") ? obj : {};
    } catch (e) {
      unread = {};
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(unread || {})); } catch (e) {}
  }

  function prune() {
    loadVisited();
    var changed = false;
    try {
      Object.keys(unread || {}).forEach(function (rid) {
        if (!rid) return;
        if (!isVisited(rid)) {
          delete unread[rid];
          changed = true;
        }
      });
    } catch (e) {}
    if (changed) save();
  }

  function isUnread(roomId) {
    roomId = normId(roomId);
    if (!roomId) return false;
    if (!isVisited(roomId)) return false;
    return !!unread[roomId];
  }

  function ensureBadgeEl(item) {
    if (!item) return null;
    var b = item.querySelector(".room-unread-badge");
    if (!b) {
      b = document.createElement("span");
      b.className = "room-unread-badge";
      b.setAttribute("aria-hidden", "true");
      item.appendChild(b);
    }
    return b;
  }

  function applyToItem(item, roomId) {
    roomId = normId(roomId);
    if (!item || !roomId) return;
    var badge = ensureBadgeEl(item);
    if (!badge) return;

    // 방문하지 않은 방은 표시하지 않음
    if (!isVisited(roomId)) {
      badge.classList.remove("show");
      return;
    }

    if (isUnread(roomId)) badge.classList.add("show");
    else badge.classList.remove("show");
  }

  function refresh() {
    try {
      var list = document.getElementById("roomList");
      if (!list) return;
      var items = list.querySelectorAll(".room-item[data-room-id]");
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it) continue;
        var rid = it.getAttribute("data-room-id") || "";
        applyToItem(it, rid);
      }
    } catch (e) {}
  }

  function mark(roomId, ts) {
    roomId = normId(roomId);
    if (!roomId) return;

    // 방문하지 않은 방은 아예 저장/표시하지 않음
    if (!isVisited(roomId)) {
      if (unread[roomId]) {
        delete unread[roomId];
        save();
      }
      refresh();
      return;
    }

    var t = Number(ts || Date.now());
    var prev = Number(unread[roomId] || 0);
    if (t > prev) {
      unread[roomId] = t;
      save();
    }
    refresh();
  }

  function clear(roomId) {
    roomId = normId(roomId);
    if (!roomId) return;
    if (unread[roomId]) {
      delete unread[roomId];
      save();
    }
    refresh();
  }

  loadVisited();
  load();
  prune();

  // visited 갱신 시 점 표시도 정리
  try {
    window.addEventListener("ghost:visited-rooms-updated", function () {
      try { prune(); } catch (e0) {}
      try { refresh(); } catch (e1) {}
    });
  } catch (e) {}

  window.RoomUnreadBadge = {
    mark: mark,
    clear: clear,
    isUnread: isUnread,
    applyToItem: applyToItem,
    refresh: refresh,
    _debugState: function () {
      try { return JSON.parse(JSON.stringify(unread || {})); } catch (e) { return {}; }
    }
  };
})();
