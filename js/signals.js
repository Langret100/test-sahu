/* ============================================================
   [signals.js] SignalBus — 실시간 채팅 신호 버스
   ------------------------------------------------------------
   - Firebase Realtime DB /signals/{roomId}/{signalId} 에
     메시지 신호를 push/구독합니다.
   - messenger-reply-ghost-bubble.js 등에서 사용합니다.
   ============================================================ */
(function () {
  if (window.SignalBus) return;

  var _db = null;
  var _listeners = {};        // roomId -> { ref, handler }
  var _myTsMap = {};          // roomId -> 내가 마지막 보낸 ts
  var _seenTsMap = {};        // roomId -> 내가 마지막 확인한 ts (localStorage 영속)
  var _subscribeStartTs = {}; // roomId -> 구독 최초 등록 시각
  var _attachedHandlers = []; // { getMyId, onNotify, onSignal, onMessage }

  // ── seenTs 영속화 ─────────────────────────────────────────
  // SW는 localStorage 못 읽으므로 signals.js에서만 관리
  var _SEEN_TS_KEY = 'signalbus_seenTs_v1';

  function _loadSeenTs() {
    try {
      var obj = JSON.parse(localStorage.getItem(_SEEN_TS_KEY) || '{}');
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(function(rid) {
          _seenTsMap[rid] = Number(obj[rid]) || 0;
        });
      }
    } catch(e) {}
  }

  function _saveSeenTs() {
    try { localStorage.setItem(_SEEN_TS_KEY, JSON.stringify(_seenTsMap)); } catch(e) {}
  }

  _loadSeenTs();

  // ─────────────────────────────────────────────────────────

  function setDb(db) { _db = db; }

  function getDb() {
    if (_db) return _db;
    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        _db = firebase.database();
        return _db;
      }
    } catch (e) {}
    return null;
  }

  /* 신호 push — 메신저에서 메시지 보낼 때 호출 */
  function push(roomId, payload) {
    var db = getDb();
    if (!db || !roomId) return;
    try {
      var safe = String(roomId).replace(/[.#$\[\]]/g, '_');
      var _p = Object.assign({}, payload);
      if (!_p.ts) _p.ts = Date.now();
      db.ref('signals/' + safe).push(_p).catch(function () {});
      _pruneSignals(safe);
    } catch (e) {}
  }

  /* 오래된 신호 정리 — 10분 초과 항목 삭제 */
  var _pruneThrottle = {};
  function _pruneSignals(safeRoomId) {
    var now = Date.now();
    if (_pruneThrottle[safeRoomId] && now - _pruneThrottle[safeRoomId] < 60000) return;
    _pruneThrottle[safeRoomId] = now;
    var db = getDb();
    if (!db) return;
    var cutoff = now - 10 * 60 * 1000;
    try {
      db.ref('signals/' + safeRoomId).orderByChild('ts').endAt(cutoff)
        .once('value').then(function (snap) {
          if (!snap.exists()) return;
          var updates = {};
          snap.forEach(function (child) { updates[child.key] = null; });
          db.ref('signals/' + safeRoomId).update(updates).catch(function () {});
        }).catch(function () {});
    } catch (e) {}
  }

  /* 특정 방 구독 */
  function _subscribeRoom(roomId) {
    var db = getDb();
    if (!db || !roomId) return;
    var safe = String(roomId).replace(/[.#$\[\]]/g, '_');
    if (_listeners[safe]) return;

    _pruneSignals(safe);

    var since = Date.now();
    _subscribeStartTs[roomId] = since;

    // startAt(since)로 서버에서 1차 필터, child_added에서 2차 필터
    var ref = db.ref('signals/' + safe).orderByChild('ts').startAt(since);

    var handler = ref.on('child_added', function (snap) {
      try {
        var val = snap.val();
        if (!val || !val.ts) return;

        // Firebase reconnect replay 및 앱 재시작 오탐 차단
        // max(구독시작시각, 마지막읽은ts) 이전 신호는 드롭
        if (val.ts <= Math.max(_subscribeStartTs[roomId] || since, _seenTsMap[roomId] || 0)) return;

        _attachedHandlers.forEach(function (h) {
          try {
            // 내가 보낸 신호 스킵
            var myId = h.getMyId ? h.getMyId() : '';
            if (myId && val.user_id && String(val.user_id) === String(myId)) return;

            // 내가 보낸 메시지 ts 이전 스킵
            if (val.ts <= (_myTsMap[roomId] || 0)) return;

            // chat 신호 → onMessage 전달
            if (h.onMessage && String(val.kind || 'chat') === 'chat') {
              h.onMessage({
                roomId: roomId, mid: val.mid || '',
                user_id: val.user_id || '', nickname: val.nickname || '익명',
                text: val.text || '', ts: val.ts, kind: val.kind || 'chat'
              });
            }

            // onMessage 안에서 markSeenTs가 갱신됐을 수 있으므로 재확인
            if (val.ts <= (_seenTsMap[roomId] || 0)) return;

            if (h.onNotify) h.onNotify({ roomId: roomId, ts: val.ts, user_id: val.user_id || '', signal: val });
            if (h.onSignal) h.onSignal(roomId, val);
          } catch (e2) {}
        });
      } catch (e) {}
    });

    _listeners[safe] = { ref: ref, handler: handler };
  }

  function syncRooms(roomIds) {
    if (!roomIds || !roomIds.length) return;
    roomIds.forEach(function (rid) { if (rid) _subscribeRoom(String(rid)); });
  }

  function attach(opts) {
    if (!opts) return;
    _attachedHandlers.push(opts);
    if (opts.db) setDb(opts.db);
  }

  function markMyTs(roomId, ts) {
    if (roomId) _myTsMap[String(roomId)] = ts || Date.now();
  }

  function markSeenTs(roomId, ts) {
    if (roomId) {
      _seenTsMap[String(roomId)] = ts || Date.now();
      _saveSeenTs();
    }
  }

  window.SignalBus = {
    push: push, attach: attach, syncRooms: syncRooms,
    markMyTs: markMyTs, markSeenTs: markSeenTs, setDb: setDb
  };
})();
