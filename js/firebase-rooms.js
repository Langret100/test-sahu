/* ============================================================
   [firebase-rooms.js] Firebase 방 목록 실시간 동기화
   ------------------------------------------------------------
   - Firebase /rooms/{roomId} : 방 메타데이터 캐시
   - 구글 시트가 원본, Firebase는 빠른 읽기용 캐시
   - 방 생성/입장/나가기는 여전히 시트 API 사용 (정확성)
   - 방 목록 첫 로딩: Firebase 우선 → 시트 폴백
   ============================================================ */

(function () {
  if (window.FirebaseRooms) return;

  var FB_ROOMS = "rooms";

  function getDb() {
    try {
      if (typeof firebase === "undefined") return null;
      if (!firebase.apps || firebase.apps.length === 0) return null;
      return firebase.database();
    } catch (e) { return null; }
  }

  /* 방 목록 Firebase에서 빠르게 읽기 */
  function loadRoomsFromFirebase() {
    return new Promise(function (resolve) {
      var db = getDb();
      if (!db) return resolve(null);
      db.ref(FB_ROOMS).once("value")
        .then(function (snap) {
          if (!snap.exists()) return resolve(null);
          var rooms = [];
          snap.forEach(function (child) {
            var r = child.val();
            if (r && r.room_id) rooms.push(r);
          });
          resolve(rooms.length > 0 ? rooms : null);
        })
        .catch(function () { resolve(null); });
    });
  }

  /* 방 메타데이터 Firebase에 저장/갱신 (시트 응답 받은 후 호출) */
  function syncRoomToFirebase(room) {
    if (!room || !room.room_id) return;
    var db = getDb();
    if (!db) return;
    var safeId = String(room.room_id).replace(/[.#$\[\]\/]/g, "_");
    var data = {
      room_id:      room.room_id,
      name:         room.name || "대화방",
      has_password: !!room.has_password,
      enter_mode:   room.enter_mode || "public",
      is_public:    !!room.is_public,
      participants: Array.isArray(room.participants) ? room.participants : [],
      members_count: room.members_count || 0,
      creator:      room.creator || "",
      is_global:    !!room.is_global,
      can_leave:    room.can_leave !== false,
      ts:           Date.now()
    };
    db.ref(FB_ROOMS + "/" + safeId).set(data).catch(function () {});
  }

  /* 방 목록 전체 Firebase에 동기화 */
  function syncRoomsToFirebase(rooms) {
    if (!Array.isArray(rooms)) return;
    rooms.forEach(function (r) { syncRoomToFirebase(r); });
  }

  /* Firebase 방 목록 실시간 구독 */
  var _sub = null;
  function subscribeRooms(onUpdate) {
    var db = getDb();
    if (!db) return;
    if (_sub) { try { _sub.off(); } catch(e) {} }
    _sub = db.ref(FB_ROOMS);
    _sub.on("value", function (snap) {
      if (!snap.exists()) return;
      var rooms = [];
      snap.forEach(function (child) {
        var r = child.val();
        if (r && r.room_id) rooms.push(r);
      });
      if (rooms.length > 0 && typeof onUpdate === "function") onUpdate(rooms);
    });
  }

  function unsubscribe() {
    if (_sub) { try { _sub.off(); _sub = null; } catch(e) {} }
  }

  window.FirebaseRooms = {
    loadRoomsFromFirebase: loadRoomsFromFirebase,
    syncRoomToFirebase:    syncRoomToFirebase,
    syncRoomsToFirebase:   syncRoomsToFirebase,
    subscribeRooms:        subscribeRooms,
    unsubscribe:           unsubscribe
  };
})();
