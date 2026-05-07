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
  var _listeners = {};   // roomId -> { ref, handler }
  var _myTsMap = {};     // roomId -> 내가 마지막 보낸 ts
  var _seenTsMap = {};   // roomId -> 내가 마지막 확인한 ts
  var _attachedHandlers = []; // { getMyId, onNotify, onSignal }

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
      if (!_p.ts) _p.ts = Date.now(); // ts가 이미 있으면 유지 (markMyTs와 일치 보장)
      db.ref('signals/' + safe).push(_p)
        .catch(function () {});
      // 메시지 전송 시 이 방의 오래된 신호 정리 (10분 초과)
      _pruneSignals(safe);
    } catch (e) {}
  }

  /* 오래된 신호 정리 — 10분(600초) 초과 항목 삭제 */
  var _pruneThrottle = {}; // roomId -> lastPruneTs
  function _pruneSignals(safeRoomId) {
    var now = Date.now();
    // 방당 최대 1분에 1번만 실행
    if (_pruneThrottle[safeRoomId] && now - _pruneThrottle[safeRoomId] < 60000) return;
    _pruneThrottle[safeRoomId] = now;

    var db = getDb();
    if (!db) return;
    var cutoff = now - 10 * 60 * 1000; // 10분 전
    try {
      db.ref('signals/' + safeRoomId)
        .orderByChild('ts')
        .endAt(cutoff)
        .once('value')
        .then(function (snap) {
          if (!snap.exists()) return;
          var updates = {};
          snap.forEach(function (child) {
            updates[child.key] = null; // 삭제
          });
          db.ref('signals/' + safeRoomId).update(updates).catch(function () {});
        })
        .catch(function () {});
    } catch (e) {}
  }

  /* 특정 방 구독 */
  function _subscribeRoom(roomId) {
    var db = getDb();
    if (!db || !roomId) return;
    var safe = String(roomId).replace(/[.#$\[\]]/g, '_');
    if (_listeners[safe]) return; // 이미 구독 중

    // 구독 시작 시 오래된 신호 정리 (앱 초기화 1회)
    _pruneSignals(safe);

    var since = Date.now() - 5000; // 최근 5초 내 신호만
    var ref = db.ref('signals/' + safe).orderByChild('ts').startAt(since);

    var handler = ref.on('child_added', function (snap) {
      try {
        var val = snap.val();
        if (!val || !val.ts) return;

        // 각 핸들러에 알림
        _attachedHandlers.forEach(function (h) {
          try {
            var myId = h.getMyId ? h.getMyId() : '';
            // 내가 보낸 신호면 스킵
            if (myId && val.user_id && String(val.user_id) === String(myId)) return;

            // 내가 마지막 쓴 시간 이후에 온 신호인지 확인
            var myLastTs = _myTsMap[roomId] || 0;
            if (val.ts <= myLastTs) return;

            // 이미 본 신호면 스킵
            var seenTs = _seenTsMap[roomId] || 0;
            if (val.ts <= seenTs) return;

            // chat 종류 신호 → onMessage로 전달 (실시간 메시지 중계)
            if (h.onMessage && String(val.kind || 'chat') === 'chat') {
              h.onMessage({
                roomId:   roomId,
                mid:      val.mid || '',
                user_id:  val.user_id || '',
                nickname: val.nickname || '익명',
                text:     val.text || '',
                ts:       val.ts,
                kind:     val.kind || 'chat'
              });
            }

            // onNotify 직전에 seenTs를 다시 읽어 체크한다.
            // onMessage 안에서 markSeenTs가 갱신됐을 수 있고,
            // Firebase child_added와의 타이밍 레이스로 seenTs가 갱신돼 있을 수 있기 때문이다.
            var seenTsNow = _seenTsMap[roomId] || 0;
            if (val.ts <= seenTsNow) return;

            if (h.onNotify) {
              h.onNotify({ roomId: roomId, ts: val.ts, user_id: val.user_id || '', signal: val });
            }
            if (h.onSignal) {
              h.onSignal(roomId, val);
            }
          } catch (e2) {}
        });
      } catch (e) {}
    });

    _listeners[safe] = { ref: ref, handler: handler };
  }

  /* 방 목록 동기화 */
  function syncRooms(roomIds, tag) {
    if (!roomIds || !roomIds.length) return;
    roomIds.forEach(function (rid) {
      if (rid) _subscribeRoom(String(rid));
    });
  }

  /* 핸들러 등록 */
  function attach(opts) {
    if (!opts) return;
    _attachedHandlers.push(opts);
    if (opts.db) setDb(opts.db);
  }

  /* 내가 메시지 보낸 ts 기록 */
  function markMyTs(roomId, ts) {
    if (roomId) _myTsMap[String(roomId)] = ts || Date.now();
  }

  /* 내가 메시지 확인한 ts 기록 */
  function markSeenTs(roomId, ts) {
    if (roomId) _seenTsMap[String(roomId)] = ts || Date.now();
  }

  window.SignalBus = {
    push: push,
    attach: attach,
    syncRooms: syncRooms,
    markMyTs: markMyTs,
    markSeenTs: markSeenTs,
    setDb: setDb
  };
})();
