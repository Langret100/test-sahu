/* ============================================================
   [chat-rooms.js]  "대화방 목록 + 방 전환/생성/나가기" UI
   ------------------------------------------------------------
   - games/social-messenger.html 에서 사용
   - Apps Script(postToSheet)로 대화방 목록/생성/나가기를 요청
   - '전체 대화방' (room_id='global') 은 항상 1번, 나가기 불가

   [제거 시 함께 삭제/정리할 요소]
   1) games/social-messenger.html 의 #roomPanel / #roomList / #roomAddBtn / #roomTitle / #roomSub
   2) games/social-messenger.html 에 추가된 .room-* / .chat-* CSS
   3) games/social-messenger.html 의 chat-rooms.js include
   4) js/social-messenger.js 의 window.ChatRooms 연동부
   ============================================================ */

(function () {
  var roomListEl = null;
  var addBtnEl = null;
  var titleEl = null;
  var subEl = null;

  var rooms = [];
  var activeRoomId = null;
  var activeRoom = null;

  var LS_ACTIVE_ID = "ghostActiveRoomId";
  var LS_ACTIVE_NAME = "ghostActiveRoomName";
  var LS_ROOMS_CACHE = "ghostRoomsCache_v1";
  var LS_VISITED = "ghostRoomVisited_v1"; // 내가 실제로 들어간(확인한) 방만 알림/표시

  var LONGPRESS_MS = 650;

  function safeNick() {
    try {
      if (window.currentUser && window.currentUser.nickname) return String(window.currentUser.nickname);
      var raw = localStorage.getItem("ghostUser");
      if (raw) {
        var u = JSON.parse(raw);
        if (u && u.nickname) return String(u.nickname);
      }
    } catch (e) {}
    return "익명";
  }

  function loadVisitedMap() {
    try {
      var raw = localStorage.getItem(LS_VISITED);
      if (raw) {
        var obj = JSON.parse(raw || "{}");
        return (obj && typeof obj === "object") ? obj : {};
      }
    } catch (e) {}
    return {};
  }

  function saveVisitedMap(map) {
    try { localStorage.setItem(LS_VISITED, JSON.stringify(map || {})); } catch (e) {}

    // 같은 탭에서도 즉시 반영
    try {
      window.dispatchEvent(new CustomEvent("ghost:visited-rooms-updated", { detail: { visited: map || {} } }));
    } catch (e2) {}

    // signals 구독 갱신(방 목록 패널 key)
    try {
      if (window.SignalBus && typeof window.SignalBus.syncRooms === "function") {
        window.SignalBus.syncRooms(getMySignalRoomIds(rooms || []), "rooms-panel");
      }
    } catch (e3) {}
  }

  function markVisitedRoom(roomId) {
    try {
      roomId = roomId ? String(roomId).trim() : "";
      if (!roomId) return;
      var map = loadVisitedMap();
      map[roomId] = Date.now();
      map["global"] = map["global"] || Date.now();
      saveVisitedMap(map);
    } catch (e) {}
  }

  function removeVisitedRoom(roomId) {
    try {
      roomId = roomId ? String(roomId).trim() : "";
      if (!roomId) return;
      var map = loadVisitedMap();
      delete map[roomId];
      map["global"] = map["global"] || Date.now();
      saveVisitedMap(map);
    } catch (e) {}
  }

  function pruneVisitedAgainstRooms(roomList) {
    try {
      var list = Array.isArray(roomList) ? roomList : [];
      var map = loadVisitedMap();
      map = (map && typeof map === "object") ? map : {};
      var allowed = { "global": true };
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (!r || !r.room_id) continue;
        allowed[String(r.room_id)] = true;
      }
      var changed = false;
      Object.keys(map).forEach(function (rid) {
        if (!rid || rid === "global") return;
        if (!allowed[rid]) { delete map[rid]; changed = true; }
      });
      if (changed) saveVisitedMap(map);
    } catch (e) {}
  }

  function api(payload) {
    if (typeof window.postToSheet !== "function") return Promise.reject(new Error("postToSheet missing"));
    return window.postToSheet(payload).then(function (res) {
      return res.text().then(function (t) {
        var json = {};
        try { json = JSON.parse(t || "{}"); } catch (e) {}
        return json;
      });
    });
  }

    function ensureGlobalRoom(list) {
    var arr = Array.isArray(list) ? list : [];
    var has = false;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] && String(arr[i].room_id || "") === "global") { has = true; break; }
    }
    if (!has) {
      arr.unshift({
        room_id: "global",
        name: "전체 대화방",
        is_public: true,
        has_password: false,
        enter_mode: "public",
        participants: [],
        members_count: 0,
        is_global: true,
        can_leave: false
      });
    }
    return arr;
  }

  function normalizeRooms(list) {
    var out = Array.isArray(list) ? list.slice() : [];
    out = ensureGlobalRoom(out);

    // 이름 기준 정렬(단, global은 항상 맨 위)
    out.sort(function (a, b) {
      var ag = a && (a.is_global || String(a.room_id || "") === "global");
      var bg = b && (b.is_global || String(b.room_id || "") === "global");
      if (ag && !bg) return -1;
      if (!ag && bg) return 1;
      if (!a || !b) return 0;
      return (String(a.name || "")).localeCompare(String(b.name || ""), "ko");
    });
    return out;
  }

  // signals 구독 대상(내 소속 방들)만 추려내기
  // - 글로벌은 항상 포함
  // - 초대(멤버)방 기능을 제거했으므로, 방 목록(캐시 포함)에 있는 방들은
  //   메시지 내용을 불러오지 않고도 'signals'만 구독해서 알림만 받을 수 있음
  
  function getMySignalRoomIds(list) {
    var arr = Array.isArray(list) ? list : [];
    var ids = [];
    var visited = loadVisitedMap();
    visited = (visited && typeof visited === "object") ? visited : {};

    function add(id) {
      if (!id) return;
      id = String(id);
      if (ids.indexOf(id) >= 0) return;
      ids.push(id);
    }

    add("global");

    var vIds = Object.keys(visited || {});
    for (var i = 0; i < vIds.length && ids.length < 30; i++) {
      var rid = String(vIds[i] || "");
      if (!rid || rid === "global") continue;
      var exists = arr.some(function (r) { return r && String(r.room_id || "") === rid; });
      if (exists) add(rid);
    }
    return ids.slice(0, 30);
  }

  function render() {
    if (!roomListEl) return;
    roomListEl.innerHTML = "";
    rooms.forEach(function (r) {
      if (!r || !r.room_id) return;

      var item = document.createElement("button");
      item.type = "button";
      item.className = "room-item" + (r.room_id === activeRoomId ? " active" : "");
      item.setAttribute("data-room-id", r.room_id);

      var name = document.createElement("div");
      name.className = "room-name";
      name.textContent = r.name || "대화방";
      item.appendChild(name);

      var meta = document.createElement("div");
      meta.className = "room-meta";

      var hasPwd2 = !!r.has_password || (r.enter_mode === "password");
      var participants2 = Array.isArray(r.participants) ? r.participants : [];
      var c = (typeof r.members_count === "number") ? r.members_count : (participants2.length ? participants2.length : 0);
      var me2 = safeNick();

      var isPublic2 = !hasPwd2; // 비번 없으면 공개방
var isMember2 = isPublic2 || (participants2.indexOf(me2) >= 0);

      // 표시 라벨: 공개방/비번방만 사용(초대/입장제한 라벨 제거)
      if (hasPwd2 && !isMember2) meta.textContent = "🔒 비번 필요";
      else if (hasPwd2) meta.textContent = c ? ("참여 " + c) : "🔒 비번방";
      else meta.textContent = "공개";
item.appendChild(meta);

      // (미확인 표시) 방에 새 글이 있으면 오른쪽 위 점 표시
      try {
        if (window.RoomUnreadBadge && typeof window.RoomUnreadBadge.applyToItem === "function") {
          window.RoomUnreadBadge.applyToItem(item, r.room_id);
        }
      } catch (eBadge) {}

      // 클릭 = 방 전환
      item.addEventListener("click", function () {
  var me = safeNick();

  var targetId = String(r.room_id || "");
  if (!targetId) return;

  var prevId = activeRoomId || "global";

  var hasPwd = !!r.has_password || (r.enter_mode === "password");
  var participants = Array.isArray(r.participants) ? r.participants : [];
  var isMember = participants.indexOf(me) >= 0;

  // 1) 비번방 + 비멤버 → 비번 입력 후 입장 성공 시에만 활성화(실패하면 그대로)
  if (hasPwd && !isMember) {
    var pwd = prompt("이 대화방은 비밀번호가 필요해요.", "");
    if (pwd === null) return;

    api({ mode: "social_room_enter", room_id: targetId, nickname: me, password: (pwd || "").trim() })
      .then(function (json) {
        if (!json || !json.ok) {
          alert((json && json.error) || "입장에 실패했어요.");
          return;
        }
        // 성공하면 즉시 활성화(중요: loadRooms 대기 금지)
        setActiveRoom(targetId);
        markVisitedRoom(targetId);
        // 명단/라벨 반영은 백그라운드로 갱신
        loadRooms();
      })
      .catch(function () { alert("입장에 실패했어요."); });
    return;
  }

  // 2) 공개방 또는 이미 멤버인 방 → 즉시 활성화(중요: 입장 API 대기 금지)
  setActiveRoom(targetId);
  markVisitedRoom(targetId);

  // 입장 기록(멤버 등록/명단 반영)은 백그라운드로 처리
  api({ mode: "social_room_enter", room_id: targetId, nickname: me })
    .then(function (json) {
      if (!json || !json.ok) {
        // 예외적으로 실패하면 이전 방으로 복귀
        removeVisitedRoom(targetId);
        setActiveRoom(prevId);
        alert((json && json.error) || "입장에 실패했어요.");
        return;
      }
      loadRooms();
    })
    .catch(function () {
      removeVisitedRoom(targetId);
      setActiveRoom(prevId);
      alert("입장에 실패했어요.");
    });
});

// 꾹 누르기 = 나가기(단, 전체 대화방은 불가)
      if (r.can_leave !== false && !r.is_global && String(r.room_id || "") !== "global") {
        var t = null;
        var fired = false;

        var start = function () {
          fired = false;
          clearTimeout(t);
          t = setTimeout(function () {
            fired = true;
            askLeave(r);
          }, LONGPRESS_MS);
        };
        var cancel = function () {
          clearTimeout(t);
          t = null;
        };

        item.addEventListener("pointerdown", start);
        item.addEventListener("pointerup", cancel);
        item.addEventListener("pointercancel", cancel);
        item.addEventListener("pointerleave", cancel);
        // iOS Safari fallback
        item.addEventListener("touchstart", start, { passive: true });
        item.addEventListener("touchend", cancel);
      }

      roomListEl.appendChild(item);
    });

    updateHeader();
  }

  function updateHeader() {
    activeRoom = null;
    for (var i = 0; i < rooms.length; i++) {
      if (rooms[i] && rooms[i].room_id === activeRoomId) activeRoom = rooms[i];
    }
    if (!activeRoom) {
      if (titleEl) titleEl.textContent = "대화방";
      if (subEl) subEl.textContent = "";
      try {
        var input0 = document.getElementById("msgInput");
        var send0 = document.getElementById("msgSendBtn");
        if (input0) { input0.disabled = true; input0.placeholder = "대화방을 선택해 주세요"; }
        if (send0) send0.disabled = true;
      } catch (e0) {}
      return;
    }

    if (titleEl) titleEl.textContent = activeRoom.name || "대화방";
        if (subEl) {
      var isGlobal = !!activeRoom.is_global || (String(activeRoom.room_id || "") === "global") || (activeRoom.can_leave === false);
      if (isGlobal) {
        subEl.textContent = "나가기 불가";
      } else {
        var p = (activeRoom.participants || []).slice();
        // 너무 길면 자르기
        var show = p.join(", ");
        if (show.length > 40) show = show.slice(0, 40) + "…";
        subEl.textContent = p.length ? ("참여자: " + show) : "";
      }
    }

    // 입력창 활성/비활성: 참여자가 아니면 막기(서버가 돌려준 참가자 기준)
    try {
      var input = document.getElementById("msgInput");
      var sendBtn = document.getElementById("msgSendBtn");
      var isMember = true;
      if (activeRoom && activeRoom.room_id) {
        var me = safeNick();
        // 공개방(participants 비움)은 누구나 대화 가능
        var isPublic = !!activeRoom.is_public || (String(activeRoom.enter_mode || "") === "public") || (!Array.isArray(activeRoom.participants) || activeRoom.participants.length === 0);
        isMember = isPublic || (Array.isArray(activeRoom.participants) && activeRoom.participants.indexOf(me) >= 0);
      }
      if (input) input.disabled = !isMember;
      if (sendBtn) sendBtn.disabled = !isMember;
      if (input) {
        if (isMember) input.placeholder = "메시지를 입력하세요";
        else if (activeRoom && (activeRoom.has_password || activeRoom.enter_mode === "password")) input.placeholder = "비밀번호로 입장 후 대화할 수 있어요";
        else input.placeholder = "입장 권한이 없어요";
      }
    } catch (e) {}
  }

  function setActiveRoom(roomId) {
    roomId = roomId ? String(roomId) : "";
    roomId = roomId.trim();
    if (!roomId) {
      activeRoomId = null;
      try { localStorage.removeItem(LS_ACTIVE_ID); localStorage.removeItem(LS_ACTIVE_NAME); } catch (e0) {}
      render();
      try { if (typeof window.__onRoomChanged === "function") window.__onRoomChanged("", null); } catch (e1) {}
      return;
    }
    activeRoomId = roomId;

    // 해당 방을 "확인"한 것으로 처리 → 미확인 표시 제거
    try {
      if (window.RoomUnreadBadge && typeof window.RoomUnreadBadge.clear === "function") {
        window.RoomUnreadBadge.clear(activeRoomId);
      }
    } catch (eBadge2) {}
    try { localStorage.setItem(LS_ACTIVE_ID, String(roomId)); } catch (e) {}
    // 방 이름도 저장(재접속 시 상단 표시용)
    try {
      var nm = "";
      for (var i2 = 0; i2 < rooms.length; i2++) {
        if (rooms[i2] && rooms[i2].room_id === activeRoomId) { nm = rooms[i2].name || ""; break; }
      }
      if (nm) localStorage.setItem(LS_ACTIVE_NAME, String(nm));
    } catch (e2) {}

    render();

    // social-messenger.js 에 알림
    try {
      if (typeof window.__onRoomChanged === "function") {
        window.__onRoomChanged(activeRoomId, activeRoom);
      }
    } catch (e) {}
  }

    function askLeave(room) {
    if (!room || !room.room_id) return;

    // 전체 대화방(global)은 나가기 불가
    if (room.can_leave === false || String(room.room_id || "") === "global" || room.is_global) {
      alert("전체 대화방은 나갈 수 없어요.");
      return;
    }

    var ok = confirm("이 대화방에서 나갈까요?\n(나가면 더 이상 이 방의 대화를 볼 수 없어요)");
    if (!ok) return;

    api({
      mode: "social_room_leave",
      room_id: room.room_id,
      nickname: safeNick()
    }).then(function (json) {
      if (!json || !json.ok) {
        alert((json && json.error) || "나가기에 실패했어요.");
        return;
      }
      // 방문(입장) 기록 제거 + 미확인 점 제거
      removeVisitedRoom(room.room_id);
      try { if (window.RoomUnreadBadge && typeof window.RoomUnreadBadge.clear === "function") window.RoomUnreadBadge.clear(room.room_id); } catch (eBadge) {}

      // 나간 뒤에는 현재 방이면 비우기
      loadRooms().then(function () {
        setActiveRoom(null);
      });
    }).catch(function () {
      alert("나가기에 실패했어요.");
    });
  }

  function openCreateDialog() {
    // 1인당 생성 제한: 3개
    try {
      var me = safeNick();
      var count = 0;
      for (var i = 0; i < rooms.length; i++) {
        var r = rooms[i];
        if (!r || !r.room_id) continue;
        // 서버가 creator를 내려주는 경우(권장)
        if (r.creator && String(r.creator) === me) { count++; continue; }
        // fallback(구버전 서버): 비밀번호 방은 participants[0]이 생성자일 가능성이 높음
        if (Array.isArray(r.participants) && r.participants.length && String(r.participants[0] || "") === me && (r.has_password || r.enter_mode === "password")) {
          count++;
        }
      }
      if (count >= 3) {
        alert("생성불가\n한 명당 최대 3개의 방만 만들 수 있어요.");
        return;
      }
    } catch (e) {}

    var roomName = prompt("새 대화방 이름(선택)\n비워두면 자동으로 만들어져요.", "");
    if (roomName === null) return;

    var pwd = prompt("입장 비밀번호(선택)\n비워두면 공개방(누구나 목록에서 입장)으로 만들어져요.", "");
    if (pwd === null) return;

    api({
      mode: "social_room_create",
      nickname: safeNick(),
      title: roomName || "",
      room_name: roomName || "",
      password: (pwd || "").trim()
    }).then(function (json) {
      if (!json || !json.ok) {
        alert((json && json.error) || "대화방 생성에 실패했어요.");
        return;
      }
      loadRooms().then(function () {
        alert("대화방을 만들었어요.\n방 목록에서 선택해 입장해 주세요.");
      });
    }).catch(function () {
      alert("대화방 생성에 실패했어요.");
    });
  }

  function loadRooms() {
    return api({
      mode: "social_rooms",
      nickname: safeNick()
    }).then(function (json) {
      if (!json || !json.ok) throw new Error("rooms api fail");
      rooms = normalizeRooms(json.rooms || []);

      // 방문 기록은 현재 목록 기준으로 정리(삭제된 방 구독 방지)
      pruneVisitedAgainstRooms(rooms);

      // 방 목록 캐시(localStorage): 패널이 닫혀 있어도 signals 구독/표시용으로 사용
      try {
        var slim = (rooms || []).map(function (r) {
          if (!r) return null;
          return {
            room_id: r.room_id || "",
            name: r.name || "",
            participants: Array.isArray(r.participants) ? r.participants : [],
            has_password: !!r.has_password,
            enter_mode: r.enter_mode || "",
            is_public: !!r.is_public,
            creator: r.creator || "",
            is_global: !!r.is_global,
            can_leave: (r.can_leave !== false)
          };
        }).filter(Boolean);
        localStorage.setItem(LS_ROOMS_CACHE, JSON.stringify({ ts: Date.now(), rooms: slim }));
      } catch (eCache) {}

      // signals 구독 대상(내 소속 방들) 갱신
      try {
        if (window.SignalBus && typeof window.SignalBus.syncRooms === "function") {
          window.SignalBus.syncRooms(getMySignalRoomIds(rooms || []), "rooms-panel");
        }
      } catch (e) {}

      // 현재 활성 방은 유지(목록 갱신으로 사라진 경우만 비우기)
      var prev = activeRoomId;
      var exists = activeRoomId ? rooms.some(function (r) { return r && r.room_id === activeRoomId; }) : false;
      if (!exists) {
        activeRoomId = null;
        try { localStorage.removeItem(LS_ACTIVE_ID); localStorage.removeItem(LS_ACTIVE_NAME); } catch (e0) {}
      } else {
        // 활성 방 이름 갱신(표시용)
        try {
          var ar = getActiveRoom();
          if (ar && ar.name) localStorage.setItem(LS_ACTIVE_NAME, String(ar.name));
        } catch (e1) {}
      }

      render();

      // 활성 방이 바뀐 경우에만 콜백(불필요한 방 이동/메시지 로딩 방지)
      try {
        if (prev !== activeRoomId && typeof window.__onRoomChanged === "function") {
          window.__onRoomChanged(activeRoomId, getActiveRoom());
        }
      } catch (e2) {}
      return rooms;
    }).catch(function () {
      // 서버 미지원 시: 방 목록 비움
      var prev = activeRoomId;
      rooms = normalizeRooms([]);
      activeRoomId = null;
      try { localStorage.removeItem(LS_ROOMS_CACHE); } catch (eCache2) {}
      try { localStorage.removeItem(LS_ACTIVE_ID); localStorage.removeItem(LS_ACTIVE_NAME); } catch (e0) {}

      render();
      try {
        if (prev && typeof window.__onRoomChanged === "function") window.__onRoomChanged("", null);
      } catch (e) {}
      return rooms;
    });
  }

  function getActiveRoom() {
    for (var i = 0; i < rooms.length; i++) {
      if (rooms[i] && rooms[i].room_id === activeRoomId) return rooms[i];
    }
    return null;
  }

  function init() {
    // global은 기본 방문 처리
    try {
      var vm = loadVisitedMap();
      if (!vm || typeof vm !== "object") vm = {};
      if (!vm["global"]) { vm["global"] = Date.now(); saveVisitedMap(vm); }
    } catch (e) {}

    roomListEl = document.getElementById("roomList");
    addBtnEl = document.getElementById("roomAddBtn");
    titleEl = document.getElementById("roomTitle");
    subEl = document.getElementById("roomSub");

    if (addBtnEl) addBtnEl.addEventListener("click", openCreateDialog);

    // 활성 방 복원(목록 API 호출 없이)
    activeRoomId = null;
    try {
      var rid = localStorage.getItem(LS_ACTIVE_ID) || ""; activeRoomId = (rid && String(rid).trim()) ? String(rid).trim() : "global";
    } catch (e0) { activeRoomId = null; }

    // 캐시된 목록으로 1차 렌더(패널을 열 때만 서버에서 갱신)
    rooms = normalizeRooms([]);
    try {
      var raw = localStorage.getItem(LS_ROOMS_CACHE);
      if (raw) {
        var cached = JSON.parse(raw || "{}");
        if (cached && cached.rooms) rooms = normalizeRooms(cached.rooms);
      }
    } catch (e1) {}

    // 캐시에 활성 방이 없으면(예: 첫 실행/캐시 삭제) 임시로 추가해서 표시 유지
    try {
      var has = false;
      for (var k = 0; k < rooms.length; k++) {
        if (rooms[k] && rooms[k].room_id === activeRoomId) { has = true; break; }
      }
      if (!has && activeRoomId) {
        var nm2 = "";
        try { nm2 = localStorage.getItem(LS_ACTIVE_NAME) || ""; } catch (eNm) {}
        rooms.push({ room_id: activeRoomId, name: nm2 || "대화방", participants: [] });
        rooms = normalizeRooms(rooms);
      }
    } catch (eTmp) {}

    // 상단 표시용 이름도 복원(캐시에 없을 수 있음)
    try {
      var nm = localStorage.getItem(LS_ACTIVE_NAME);
      if (titleEl && nm) titleEl.textContent = String(nm);
    } catch (e2) {}

    render();

    // signals 구독 대상(캐시 기준) 설정 - db attach 전이어도 OK
    try {
      if (window.SignalBus && typeof window.SignalBus.syncRooms === "function") {
        window.SignalBus.syncRooms(getMySignalRoomIds(rooms || []));
      }
    } catch (e3) {}

    return Promise.resolve(rooms);
  }

  // 전역 노출
  window.ChatRooms = {
    init: init,
    reload: loadRooms,
    setActive: setActiveRoom,
    getRooms: function () { return rooms.slice(); },
    getActiveRoomId: function () { return activeRoomId; },
    getActiveRoom: getActiveRoom
  };
})();
