/* ============================================================
   [signals.js] 방별 휘발성 "실시간 중계" + 답글 알림(signals)
   ------------------------------------------------------------
   ✅ 목표
   - Firebase Realtime Database 를 "저장소"가 아니라 "중계(릴레이)"로만 사용합니다.
   - 채팅 내용은 Google Sheet(앱스 스크립트)로 저장하되,
     화면 표시는 Firebase를 경유해 즉시 반영되도록 합니다.

   ✅ 데이터 경로
   - /signals/<roomId>/q/<pushKey> : 휘발성 큐(메시지/신호 이벤트)
     * sender가 push 후, 짧은 지연 후 remove() 하여 DB에 쌓이지 않게 유지
     * receiver(수신자)는 remove 하지 않습니다(놓침 방지)
     * 오래된(>60초) 찌꺼기만 안전하게 prune 할 수 있습니다.

   ✅ 알림 조건(Reply)
   - "내가 그 방에 마지막으로 쓴 글(lastMyTs) 이후에,
      다른 사람이 쓴 이벤트가 들어오면" 알림.
   - + 이미 그 방을 본 시각(lastSeenTs) 이전 이벤트는 무시.

   [제거 시 함께 삭제/수정할 요소]
   1) games/social-messenger.html 의 signals.js include 제거
   2) js/social-messenger.js / js/social-chat-firebase.js 의 SignalBus 연동부 제거
   ============================================================ */

(function () {
  var db = null;

  // 여러 화면/모듈이 동시에 붙을 수 있도록 리스너를 배열로 관리합니다.
  // - 예: 메신저 화면(알림음/뱃지) + 메인 화면(캐릭터 말풍선) + 기본 채팅창(마이파-톡)
  var listeners = []; // [{ onNotify, onSignal, onMessage, getMyId }]

  var subscribed = {}; // roomId -> { queryRef, handler }
  var wantedRoomIds = [];
  var wantedByKey = {}; // key -> [roomId]

  var LS_KEY_MY = "signal_lastMyTs_v1";
  var LS_KEY_SEEN = "signal_lastSeenTs_v1";

  var lastMyTs = {};
  var lastSeenTs = {};

  // 휘발성 큐 유지 정책
  var REMOVE_DELAY_MS = 9000;     // sender가 push 후 자동 삭제(대략 8~12초 권장)
  var PRUNE_OLDER_MS = 60000;     // 60초 이상 된 찌꺼기만 안전 정리
  var STALE_IGNORE_MS = 30000;    // 30초 이상 지난 큐 이벤트는 표시/알림에서 제외(시트가 정답)

  var lastPruneAt = {};           // roomId -> ts
  var PRUNE_THROTTLE_MS = 15000;  // room별 prune 최소 간격

  function loadState() {
    try {
      var a = localStorage.getItem(LS_KEY_MY);
      if (a) lastMyTs = JSON.parse(a) || {};
    } catch (e) { lastMyTs = {}; }
    try {
      var b = localStorage.getItem(LS_KEY_SEEN);
      if (b) lastSeenTs = JSON.parse(b) || {};
    } catch (e) { lastSeenTs = {}; }
  }

  function saveState() {
    try { localStorage.setItem(LS_KEY_MY, JSON.stringify(lastMyTs || {})); } catch (e) {}
    try { localStorage.setItem(LS_KEY_SEEN, JSON.stringify(lastSeenTs || {})); } catch (e) {}
  }

  function safeMyId() {
    for (var i = 0; i < (listeners || []).length; i++) {
      try {
        var g = listeners[i] && listeners[i].getMyId;
        if (typeof g === "function") {
          var id = g();
          if (id && String(id).trim()) return String(id).trim();
        }
      } catch (e) {}
    }
    return "";
  }

  function normalizeRoomIds(list) {
    var arr = Array.isArray(list) ? list : [];
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var id = arr[i];
      if (!id) continue;
      id = String(id);
      if (out.indexOf(id) >= 0) continue;
      out.push(id);
    }
    if (out.length > 30) out = out.slice(0, 30);
    return out;
  }

  function shouldNotify(roomId, senderId, ts) {
    var myId = safeMyId();
    if (!roomId) return false;
    ts = Number(ts || 0);

    if (senderId && myId && String(senderId) === String(myId)) return false;

    var tMy = Number(lastMyTs[roomId] || 0);
    var tSeen = Number(lastSeenTs[roomId] || 0);

    if (ts <= tMy) return false;
    if (ts <= tSeen) return false;
    return true;
  }

  function fanout(type, info) {
    (listeners || []).forEach(function (L) {
      try {
        if (!L) return;
        if (type === "signal" && typeof L.onSignal === "function") L.onSignal(info);
        if (type === "notify" && typeof L.onNotify === "function") L.onNotify(info);
        if (type === "message" && typeof L.onMessage === "function") L.onMessage(info);
      } catch (e) {}
    });
  }

  function genMid(senderId, ts) {
    try {
      var r = Math.random().toString(16).slice(2);
      return String(senderId || "u") + "_" + String(ts || Date.now()) + "_" + r;
    } catch (e) {
      return "m_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    }
  }

  function safeNumber(x, def) {
    var n = Number(x);
    return isNaN(n) ? (def || 0) : n;
  }

  function maybePruneOld(roomId) {
    if (!db || !db.ref || !roomId) return;
    var now = Date.now();
    var last = safeNumber(lastPruneAt[roomId], 0);
    if (now - last < PRUNE_THROTTLE_MS) return;
    lastPruneAt[roomId] = now;

    try {
      var cutoff = now - PRUNE_OLDER_MS;
      var qRef = db.ref("signals/" + roomId + "/q")
        .orderByChild("ts")
        .endAt(cutoff)
        .limitToFirst(50);

      qRef.once("value", function (snap) {
        try {
          if (!snap || !snap.forEach) return;
          snap.forEach(function (child) {
            try { child.ref.remove(); } catch (e0) {}
          });
        } catch (e1) {}
      });
    } catch (e2) {}
  }

  function handleQueueItem(roomId, snap) {
    try {
      if (!snap || !snap.val) return;
      var val = snap.val() || {};

      var senderId = val.user_id || val.sender || val.u || "";
      var ts = safeNumber(val.ts || val.t, Date.now());
      var mid = val.mid || val.id || snap.key || "";

      // 너무 오래된 이벤트는 UI 표시/알림에서 제외 (시트가 정답)
      var age = Date.now() - ts;
      if (age > PRUNE_OLDER_MS) {
        // 아주 오래된 찌꺼기는 안전 정리
        try { snap.ref.remove(); } catch (eOld) {}
        return;
      }
      if (age > STALE_IGNORE_MS) {
        // 30~60초 구간: 표시/알림은 하지 않되, prune는 가끔 수행
        maybePruneOld(roomId);
        return;
      }

      var kind = val.kind || val.k || val.type || "signal";

      var info = {
        roomId: roomId,
        user_id: senderId,
        ts: ts,
        mid: mid,
        kind: kind,
        raw: val
      };

      // raw signal fanout (로깅/보조 동기화 등)
      fanout("signal", info);

      // message fanout (즉시 UI 반영용)
      // - text/message/msg 중 하나라도 있으면 메시지 이벤트로 간주
      var text = (val.text != null) ? String(val.text)
        : (val.message != null) ? String(val.message)
        : (val.msg != null) ? String(val.msg) : null;

      if (text != null || kind === "retract") {
        var msgInfo = {
          roomId: roomId,
          user_id: senderId,
          nickname: val.nickname || val.nick || "",
          text: text || "",
          ts: ts,
          mid: mid,
          kind: kind,
          raw: val
        };
        fanout("message", msgInfo);
      }

      // notify fanout (답글/새글 알림 트리거)
      if (shouldNotify(roomId, senderId, ts)) {
        fanout("notify", info);
      }
    } catch (e2) {}
  }

  function subscribeRoom(roomId) {
    if (!db || !db.ref || !roomId) return;
    if (subscribed[roomId]) return;

    // 큐를 child_added로 구독 (낮은 버퍼로만)
    var queryRef = db.ref("signals/" + roomId + "/q").limitToLast(50);
    var handler = function (snap) { handleQueueItem(roomId, snap); };

    try { queryRef.on("child_added", handler); } catch (e) {}

    subscribed[roomId] = { queryRef: queryRef, handler: handler };

    // 구독 직후 오래된 찌꺼기 정리(스로틀)
    maybePruneOld(roomId);
  }

  function unsubscribeRoom(roomId) {
    var h = subscribed[roomId];
    if (!h) return;
    try { h.queryRef.off("child_added", h.handler); } catch (e) {}
    try { h.queryRef.off(); } catch (e2) {}
    delete subscribed[roomId];
  }

  function syncSubscriptions(roomIds, key) {
    key = (key == null ? "" : String(key)).trim();
    if (!key) key = "default";

    wantedByKey[key] = normalizeRoomIds(roomIds);

    var union = [];
    Object.keys(wantedByKey || {}).forEach(function (k) {
      (wantedByKey[k] || []).forEach(function (rid) {
        if (!rid) return;
        if (union.indexOf(rid) >= 0) return;
        union.push(rid);
      });
    });

    wantedRoomIds = union.slice(0);

    if (!db) return;

    Object.keys(subscribed).forEach(function (rid) {
      if (wantedRoomIds.indexOf(rid) < 0) unsubscribeRoom(rid);
    });
    wantedRoomIds.forEach(function (rid) { subscribeRoom(rid); });
  }

  function attach(opts) {
    opts = opts || {};
    if (opts.db) db = opts.db;

    var listener = {
      onNotify: (typeof opts.onNotify === "function") ? opts.onNotify : null,
      onSignal: (typeof opts.onSignal === "function") ? opts.onSignal : null,
      onMessage: (typeof opts.onMessage === "function") ? opts.onMessage : null,
      getMyId: (typeof opts.getMyId === "function") ? opts.getMyId : null
    };
    listeners.push(listener);

    if (wantedRoomIds && wantedRoomIds.length) syncSubscriptions(wantedRoomIds);

    return function detach() {
      try {
        var idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      } catch (e) {}
    };
  }

  // push API
  // - push(roomId, senderId, ts) : 기존 호환(signal-only)
  // - push(roomId, payloadObject) : 메시지/이벤트(payload) push
  function push(roomId, a, b) {
    if (!db || !db.ref || !roomId) return Promise.resolve();

    var payload = null;
    if (a && typeof a === "object") {
      payload = {};
      try {
        Object.keys(a).forEach(function (k) { payload[k] = a[k]; });
      } catch (e0) { payload = a; }
    } else {
      payload = { user_id: a || "", ts: safeNumber(b, Date.now()) };
    }

    payload = payload || {};
    payload.room_id = payload.room_id || roomId;
    payload.ts = safeNumber(payload.ts, Date.now());
    payload.user_id = payload.user_id || safeMyId() || "";
    payload.mid = payload.mid || genMid(payload.user_id, payload.ts);
    payload.kind = payload.kind || payload.k || payload.type || (payload.text ? "chat" : "signal");

    try {
      var ref = db.ref("signals/" + roomId + "/q").push();
      ref.set(payload);

      // sender 지연 삭제(수신자는 삭제하지 않음)
      try {
        setTimeout(function () {
          try { ref.remove(); } catch (e2) {}
        }, REMOVE_DELAY_MS);
      } catch (e3) {}

      // 가끔 안전 prune
      maybePruneOld(roomId);

      return ref;
    } catch (e) {
      return Promise.resolve();
    }
  }

  function markMy(roomId, ts) {
    if (!roomId) return;
    var t = safeNumber(ts, Date.now());
    var prev = safeNumber(lastMyTs[roomId], 0);
    if (t > prev) {
      lastMyTs[roomId] = t;
      saveState();
    }
  }

  function markSeen(roomId, ts) {
    if (!roomId) return;
    var t = safeNumber(ts, Date.now());
    var prev = safeNumber(lastSeenTs[roomId], 0);
    if (t > prev) {
      lastSeenTs[roomId] = t;
      saveState();
    }
  }

  loadState();

  window.SignalBus = {
    attach: attach,
    syncRooms: syncSubscriptions,
    push: push,
    markMyTs: markMy,
    markSeenTs: markSeen,
    getState: function () {
      return {
        wanted: (wantedRoomIds || []).slice(),
        subscribed: Object.keys(subscribed),
        lastMyTs: lastMyTs,
        lastSeenTs: lastSeenTs,
        listeners: (listeners || []).length
      };
    }
  };
})();
