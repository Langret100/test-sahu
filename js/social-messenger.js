/* ============================================================
   [social-messenger.js] 소통 채팅 메신저형 전체 화면 뷰
   ------------------------------------------------------------
   - games/social-messenger.html 안에서만 사용
   - Firebase Realtime Database "socialChatRooms/{roomId}" 경로와 Apps Script를 활용해
     기존 소통 채팅(마이파-톡)과 같은 방/기록을 사용합니다.
   - 기본 채팅창 모드와 관계없이, 이 화면에서는 항상 "소통 채팅"처럼 동작합니다.
   - 이모티콘(:e1: ~ :e12:)은 chat-emoji.js 의 renderTextWithEmojis 로 렌더링합니다.

   [제거 시 함께 삭제할 요소]
   1) games/social-messenger.html
   2) js/social-messenger.js
   3) js/game-manager.js 의 window.launchMessenger 정의
   4) js/actions.js 의 data-action="social-messenger" 분기
   5) index.html 플러스 메뉴의 "📱 실시간 톡 보기" 버튼
   ============================================================ */
(function () {
  if (window.SocialMessengerView) return;
  window.SocialMessengerView = true;

  // [보안] GitHub 공개 저장소에서 apiKey(AIza...)가 노출 경고가 뜨지 않도록
  // apiKey는 "__FIREBASE_API_KEY__" 플레이스홀더로 두고, 배포(GitHub Actions) 단계에서만
  // Repository Secret(FIREBASE_API_KEY) 값으로 치환해 Pages에 올리는 방식을 사용합니다.
  // Firebase 설정: social-chat-firebase.js 와 동일
  var FIREBASE_CONFIG = {
    apiKey: "__FIREBASE_API_KEY__",
    authDomain: "web-ghost-c447b.firebaseapp.com",
    databaseURL: "https://web-ghost-c447b-default-rtdb.firebaseio.com",
    projectId: "web-ghost-c447b",
    storageBucket: "web-ghost-c447b.firebasestorage.app",
    messagingSenderId: "198377381878",
    appId: "1:198377381878:web:83b56b1b4d63138d27b1d7"
  };

  var app, db, ref;
  var bodyEl, statusEl, msgInput, sendBtn, emojiBtn, emojiPanel, cameraBtn, closeBtn;
  var zoomOverlay, zoomImg;
  var myId = null;
  var myNickname = null;
  var messages = [];
  var MAX_BUFFER = 30;
  

  // ---- fix28: robust ts parse + sheet<->relay dedupe helpers ----
  function __smParseTs(v) {
    try {
      if (typeof v === "number" && isFinite(v)) return v;
      if (typeof v === "string") {
        var t = v.trim();
        if (/^\d{10,13}$/.test(t)) return Number(t);
        var p = Date.parse(t);
        if (!isNaN(p)) return p;
        var n = Number(t);
        if (!isNaN(n)) return n;
      }
    } catch (e) {}
    return 0;
  }

  function __smSigOf(user_id, text) {
    return String(user_id || "") + "|" + String(text || "").trim();
  }

  function __smBuildRelayMidIndex(list) {
    var idx = {};
    try {
      (list || []).forEach(function (m) {
        if (!m || !m.mid) return;
        var ts = __smParseTs(m.ts || 0);
        var b = Math.floor(ts / 5000);
        var sig = __smSigOf(m.user_id, m.text);
        for (var d = -2; d <= 2; d++) {
          var k = sig + "|" + String(b + d);
          if (!idx[k]) idx[k] = String(m.mid);
        }
      });
    } catch (e) {}
    return idx;
  }

  function __smTryAttachMidFromRelayIndex(m, idx) {
    try {
      if (!m || m.mid) return;
      var ts = __smParseTs(m.ts || 0);
      var b = Math.floor(ts / 5000);
      var sig = __smSigOf(m.user_id, m.text);
      var deltas = [0, -1, 1, -2, 2, -3, 3];
      for (var i = 0; i < deltas.length; i++) {
        var k = sig + "|" + String(b + deltas[i]);
        if (idx[k]) { m.mid = idx[k]; return; }
      }
    } catch (e) {}
  }
  // ---- end fix28 helpers ----

var __loadSeq = 0; // 방별 최근글 요청 순번(느린 응답 섞임 방지)
// 대화방(rooms)
  var currentRoomId = null;
  var currentRoomMeta = null;
  
  var listenStartedAt = Date.now();



// ------------------------------------------------------------
// (통합) + 버튼 첨부 메뉴 / 알림음 모듈
// - 기존 js/modules/* 의 attach-menu.js, notify-sound.js 를
//   본 파일로 통합했습니다(동작/디자인 동일).
// ------------------------------------------------------------

var AttachMenu = (function () {
  function buildMenu(root) {
    var menu = document.createElement("div");
    menu.className = "msg-attach-menu";
    menu.setAttribute("aria-hidden", "true");

    function makeItem(label, action) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "msg-attach-item";
      btn.textContent = label;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        try { action && action(); } catch (err) {}
      });
      return btn;
    }

    menu.appendChild(makeItem("📷 사진촬영", function () { menu._fire && menu._fire("takePhoto"); }));
menu.appendChild(makeItem("🔎 QR 링크 스캔", function () { menu._fire && menu._fire("scanQr"); }));
menu.appendChild(makeItem("🖼️ 이미지 첨부", function () { menu._fire && menu._fire("pickImage"); }));
menu.appendChild(makeItem("📎 파일 첨부", function () { menu._fire && menu._fire("pickFile"); }));

// 알림 설정(켜짐/꺼짐 표시)
var notifyBtn = makeItem("", function () { menu._fire && menu._fire("toggleNotify"); });
menu._notifyBtn = notifyBtn;
menu.appendChild(notifyBtn);

    root.appendChild(menu);
    return menu;
  }

  function init(options) {
    // options: { buttonEl, containerEl, onTakePhoto, onScanQr, onPickImage, onPickFile }
    options = options || {};
    var btn = options.buttonEl;
    var container = options.containerEl || (btn ? btn.parentElement : null);
    if (!btn || !container) return null;

    // 중복 바인딩 방지(동작 영향 없이 안전장치)
    if (btn.__attachMenuBound) return btn.__attachMenuApi || null;

    var existing = container.querySelector(":scope > .msg-attach-menu");
    var menu = existing || buildMenu(container);

    function closeMenu() {
      menu.classList.remove("open");
      menu.setAttribute("aria-hidden", "true");
    }
    function openMenu() {
      if (menu._notifyBtn && typeof options.getNotifyLabel === "function") {
        menu._notifyBtn.textContent = options.getNotifyLabel();
      }
      menu.classList.add("open");
      menu.setAttribute("aria-hidden", "false");
    }
    function toggleMenu() {
      if (menu.classList.contains("open")) closeMenu();
      else openMenu();
    }

    menu._fire = function (type) {
      closeMenu();
      if (type === "takePhoto") return options.onTakePhoto && options.onTakePhoto();
      if (type === "scanQr") return options.onScanQr && options.onScanQr();
      if (type === "pickImage") return options.onPickImage && options.onPickImage();
      if (type === "pickFile") return options.onPickFile && options.onPickFile();
      if (type === "toggleNotify") return options.onToggleNotify && options.onToggleNotify();
    };

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
    });

    document.addEventListener("click", function (e) {
      if (!menu.classList.contains("open")) return;
      if (e.target === btn || btn.contains(e.target)) return;
      if (menu.contains(e.target)) return;
      closeMenu();
    });

    window.addEventListener("resize", closeMenu);
    container.addEventListener("scroll", closeMenu, { passive: true });

    var api = { open: openMenu, close: closeMenu, element: menu };
    btn.__attachMenuBound = true;
    btn.__attachMenuApi = api;
    return api;
  }

  return { init: init };
})();

var NotifySound = (function () {
  var ctx = null;
  var masterGain = null;
  var keepAliveOsc = null;
  var enabled = false;
  var bound = false;

  function ensureContext() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;
    masterGain.connect(ctx.destination);
    return ctx;
  }

  function tryResume() {
    try {
      var c = ensureContext();
      if (!c) return;
      if (c.state === "suspended") c.resume();
    } catch (e) {}
  }

  function startKeepAlive() {
    try {
      var c = ensureContext();
      if (!c || !masterGain) return;
      if (keepAliveOsc) return;
      keepAliveOsc = c.createOscillator();
      var g = c.createGain();
      g.gain.value = 0.00001;
      keepAliveOsc.frequency.value = 1;
      keepAliveOsc.connect(g);
      g.connect(masterGain);
      keepAliveOsc.start();
    } catch (e) {}
  }

  function armByUserGesture() {
    if (enabled) return;
    tryResume();
    enabled = true;
    startKeepAlive();
  }

  function bindUserGesture(target) {
    if (bound) return;
    bound = true;
    target = target || document;

    var once = function () {
      armByUserGesture();
      try {
        target.removeEventListener("pointerdown", once);
        target.removeEventListener("touchstart", once);
        target.removeEventListener("mousedown", once);
        target.removeEventListener("click", once);
      } catch (e) {}
    };

    target.addEventListener("pointerdown", once, { passive: true });
    target.addEventListener("touchstart", once, { passive: true });
    target.addEventListener("mousedown", once, { passive: true });
    target.addEventListener("click", once, { passive: true });

    document.addEventListener("visibilitychange", function () {
      if (!enabled) return;
      tryResume();
    });
  }

  function playDdiring() {
    if (!enabled) return false;
    var c = ensureContext();
    if (!c || !masterGain) return false;
    tryResume();

    var now = c.currentTime;
    var scheduleTone = function (freq, t, dur) {
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.8, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    };

    scheduleTone(880, now + 0.00, 0.18);
    scheduleTone(1320, now + 0.20, 0.22);
    return true;
  }

  return { bindUserGesture: bindUserGesture, playDdiring: playDdiring };
})()

var NotifySetting = (function () {
  // 알림(띠리링 + 백그라운드 시스템 알림 시도) ON/OFF 설정
  // - 기본값: 켜짐 (KEY가 없거나 "1"이면 켜짐, "0"이면 꺼짐)
  // - 시스템 알림은 권한(granted)일 때 + 화면이 보이지 않을 때(document.hidden)만 "시도"합니다.
  // - Service Worker / Push 는 사용하지 않습니다(앱이 실행 중일 때만 동작).
  var KEY = "mypai_notify_enabled";

  function getPermission() {
    if (!("Notification" in window)) return "unsupported";
    try { return Notification.permission || "default"; } catch (e) { return "default"; }
  }

  function isEnabled() {
    try {
      var v = localStorage.getItem(KEY);
      return v !== "0"; // 기본 ON
    } catch (e) {
      return true;
    }
  }

  function setEnabled(v) {
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {}
  }

  function getMenuLabel() {
    var perm = getPermission();
    var on = isEnabled();

    if (perm === "denied") return on ? "🔔 알림: 켜짐(차단됨)" : "🔕 알림: 꺼짐(차단됨)";
    if (perm === "unsupported") return on ? "🔔 알림: 켜짐(지원안함)" : "🔕 알림: 꺼짐(지원안함)";
    if (perm === "default" && on) return "🔔 알림: 켜짐(권한 필요)";
    return on ? "🔔 알림: 켜짐" : "🔕 알림: 꺼짐";
  }

  function requestPermission() {
    if (!("Notification" in window)) return Promise.resolve("unsupported");
    try {
      var p = Notification.requestPermission();
      if (p && typeof p.then === "function") return p;
    } catch (e) {}
    return new Promise(function (resolve) {
      try { Notification.requestPermission(function (perm) { resolve(perm); }); }
      catch (e2) { resolve("default"); }
    });
  }

  function toggle(showStatus) {
    var next = !isEnabled();
    setEnabled(next);

    if (!next) {
      showStatus && showStatus("알림을 껐어요.");
      return Promise.resolve(false);
    }

    // 켜는 경우: 시스템 알림은 권한이 있으면 백그라운드에서만 시도
    var perm = getPermission();
    if (perm === "default") {
      // 사용자가 "알림 켜기"를 눌렀을 때만 권한 요청(자동 팝업 방지)
      showStatus && showStatus("백그라운드 알림을 쓰려면 권한이 필요해요.");
      return requestPermission().then(function (p) {
        if (p === "granted") showStatus && showStatus("알림을 켰어요.");
        else if (p === "denied") showStatus && showStatus("브라우저 설정에서 알림 허용이 필요해요.");
        else showStatus && showStatus("알림 권한이 아직 없어요.");
        return true;
      });
    }

    if (perm === "denied") {
      showStatus && showStatus("알림은 켜졌지만, 시스템 알림은 차단돼 있어요.");
      return Promise.resolve(true);
    }

    showStatus && showStatus("알림을 켰어요.");
    return Promise.resolve(true);
  }

  function maybeShow(msg) {
    if (!isEnabled()) return;
    if (getPermission() !== "granted") return;

    // 보이는 상태에서는 시스템 알림 생략(중복 방지)
    try {
      if (typeof document !== "undefined" && document.visibilityState === "visible") return;
    } catch (e) {}

    var title = "새 메시지";
    var body = "새 메시지가 도착했어요.";
    try {
      var t = msg && msg.type || "text";
      var summary = "";
      if (t === "image") summary = "사진";
      else if (t === "file") summary = "파일";
      else summary = (msg && msg.text) ? String(msg.text) : "메시지";
      body = (msg && msg.nickname ? (msg.nickname + " : ") : "") + summary;
      if (body.length > 80) body = body.slice(0, 77) + "...";
    } catch (e2) {}

    var opts = {
      body: body,
      tag: "mypai-social-chat",
      renotify: true
    };

    try { new Notification(title, opts); } catch (e3) {}
  }

  return {
    isEnabled: isEnabled,
    getMenuLabel: getMenuLabel,
    toggle: toggle,
    maybeShow: maybeShow
  };
})();


;

  function isEmojiOnlyText(text) {
    if (!text || typeof text !== "string") return false;
    var compact = text.replace(/\s+/g, "");
    return /^(?:\:e(0?[1-9]|1[0-2])\:)+$/.test(compact);
  }

  // [[FILE]]<url>|<encodeURIComponent(filename)> 형태 파싱
  function parseFileToken(raw) {
    if (!raw || typeof raw !== "string") return null;
    if (raw.indexOf("[[FILE]]") !== 0) return null;
    var rest = raw.replace("[[FILE]]", "");
    var parts = rest.split("|");
    var url = (parts[0] || "").trim();
    var encName = parts.slice(1).join("|");
    var name = "파일";
    try {
      if (encName) name = decodeURIComponent(encName.trim());
    } catch (e) {
      if (encName) name = encName.trim();
    }
    if (!url) return null;
    return { url: url, name: name };
  }

  // [[IMG]]<url> 형태 파싱
  function parseImageToken(raw) {
    if (!raw || typeof raw !== "string") return null;
    if (raw.indexOf("[[IMG]]") !== 0) return null;
    var url = raw.replace("[[IMG]]", "").trim();
    if (!url) return null;
    return { url: url };
  }

  // Drive URL에서 FILEID 추출
  function extractDriveId(url) {
    url = String(url || "").trim();
    if (!url) return "";
    try {
      // https://drive.google.com/file/d/FILEID/view?...
      var m = url.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/i);
      if (m && m[1]) return m[1];
      // https://drive.google.com/open?id=FILEID
      var m2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/i);
      if (m2 && m2[1]) return m2[1];
      // https://drive.google.com/uc?id=FILEID&...
      var m3 = url.match(/drive\.google\.com\/uc\?[^#]*id=([^&]+)/i);
      if (m3 && m3[1]) return m3[1];
      // 이미 fileId만 온 경우
      if (/^[a-zA-Z0-9_-]{10,}$/.test(url) && url.indexOf("http") !== 0) return url;
    } catch (e) {}
    return "";
  }

  // Drive '미리보기 페이지' URL을 <img>에서 보이는 직접 URL로 변환(구버전 호환)
  function normalizeDriveUrl(url) {
    url = String(url || "").trim();
    if (!url) return "";
    try {
      var id = extractDriveId(url);
      if (id) return "https://drive.google.com/uc?export=view&id=" + id;
    } catch (e) {}
    return url;
  }

  // 채팅 목록에서는 가벼운 썸네일로 보여주기(데이터 절약)
  function toChatThumbUrl(url) {
    url = String(url || "").trim();
    if (!url) return "";
    try {
      var id = extractDriveId(url);
      if (id) {
        // w480 정도면 모바일에서도 충분히 선명(표시 크기는 CSS로 제한)
        return "https://drive.google.com/thumbnail?id=" + id + "&sz=w480";
      }
    } catch (e) {}
    // Drive가 아니면 그대로(또는 normalize)
    return normalizeDriveUrl(url);
  }

    function getFirebasePath(roomId) {
    // Firebase에는 "메시지 본문"을 절대 저장하지 않습니다.
    // (기록은 Google Sheet에만 저장 / Firebase는 signals 트리거만 사용)
    return null;
  }

  function stopListen() {
    // 방 이동 시 이전 방 리스너 확실히 해제(중복 수신/성능 저하 방지)
    try {
      if (window.RoomMessageStream && typeof window.RoomMessageStream.stop === "function") {
        window.RoomMessageStream.stop();
      }
    } catch (e0) {}

    // 혹시 남아있는 ref 리스너까지 정리(안전망)
    try {
      if (ref && typeof ref.off === "function") ref.off();
    } catch (e) {}
  }


  // ------------------------------------------------------------
  // Firebase Anonymous Auth (규칙 auth != null 대응)
  // - 앱 시작 시 익명 로그인 자동 수행(사용자에게 구글 로그인 요구 X)
  // - init 이후 signInAnonymously() 1회 보장
  // ------------------------------------------------------------
  var __anonAuthPromise = null;

  function ensureAnonAuth() {
    // 익명 Auth를 쓰지 않는 구성(Realtime DB를 "relay"로만 사용)
    // - Auth 관련 네트워크 호출(identitytoolkit/securetoken) 자체를 하지 않음
    // - DB 접근은 rules에서 해당 경로를 unauth 허용하도록 설정 필요
    return Promise.resolve(true);
  }


  function ensureFirebase() {
    if (!window.firebase || !firebase.initializeApp) {
      console.warn("[messenger] Firebase SDK 가 없습니다.");
      showStatus("실시간 서버 연결에 실패했어요.");
      return null;
    }
    try {
      if (firebase.apps && firebase.apps.length > 0) {
        app = firebase.app();
      } else {
        app = firebase.initializeApp(FIREBASE_CONFIG);
      }
      db = firebase.database();
      var __p = getFirebasePath(currentRoomId);
      ref = __p ? db.ref(__p) : null;
      return db;
    } catch (e) {
      console.error("[messenger] Firebase 초기화 실패:", e);
      showStatus("연결 중 문제가 발생했어요.");
      return null;
    }
  }

  function loadUserFromStorage() {
    try {
      var raw = localStorage.getItem("ghostUser");
      if (!raw) return;
      var obj = JSON.parse(raw);
      if (!obj || !obj.user_id) return;
      myId = obj.user_id;
      myNickname = obj.nickname || obj.username || "익명";
    } catch (e) {
      console.warn("[messenger] ghostUser 파싱 실패:", e);
    }
  }

  function getSafeNickname() {
    if (myNickname && String(myNickname).trim()) return String(myNickname).trim();
    if (window.currentUser && window.currentUser.nickname) {
      return String(window.currentUser.nickname).trim();
    }
    return "익명";
  }

  function requireLogin() {
    if (myId) return true;
    showStatus("소통 채팅을 쓰려면 먼저 로그인해 주세요.");
    try {
      if (window.parent && typeof window.parent.openLoginPanel === "function") {
        window.parent.openLoginPanel();
      }
    } catch (e) {}
    return false;
  }

  function showStatus(text) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.add("show");
    clearTimeout(showStatus._timer);
    showStatus._timer = setTimeout(function () {
      statusEl.classList.remove("show");
    }, 1600);
  }

  function formatDateKey(ts) {
    var d = new Date(ts || Date.now());
    var y = d.getFullYear();
    var m = (d.getMonth() + 1).toString().padStart(2, "0");
    var day = d.getDate().toString().padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function formatDateLabel(ts) {
    var d = new Date(ts || Date.now());
    var y = d.getFullYear();
    var m = (d.getMonth() + 1).toString().padStart(2, "0");
    var day = d.getDate().toString().padStart(2, "0");
    return y + "." + m + "." + day;
  }

  function appendDateSeparator(ts) {
    if (!bodyEl) return;
    var wrap = document.createElement("div");
    wrap.className = "date-separator";
    var span = document.createElement("span");
    span.textContent = formatDateLabel(ts);
    wrap.appendChild(span);
    bodyEl.appendChild(wrap);
  }

  function appendMessage(msg) {
    if (!bodyEl) return;
    var wrapper = document.createElement("div");
    var isMe = msg.user_id && myId && msg.user_id === myId;
    wrapper.className = "msg-row " + (isMe ? "me" : "other");

    var bubble = document.createElement("div");
    bubble.className = "bubble";

    // 메시지 타입: text | image | file
    var type = msg.type || "text";
    var text = msg.text || "";

    if (type === "image" && msg.image_url) {
      bubble.classList.add("photo-bubble");
      var img = document.createElement("img");
      img.className = "chat-photo";
      img.setAttribute("data-zoomable", "1");
      img.alt = "사진";
      img.loading = "lazy";
      img.dataset.fullsrc = normalizeDriveUrl(msg.image_url);
      img.src = toChatThumbUrl(msg.image_url);
      img.onerror = function () {
        try {
          bubble.innerHTML = "";
          bubble.classList.remove("photo-bubble");
          bubble.classList.add("file-bubble");
          var aErr = document.createElement("a");
          aErr.className = "file-link";
          aErr.href = msg.image_url;
          aErr.target = "_blank";
          aErr.rel = "noopener";
          aErr.textContent = "📷 사진 열기";
          bubble.appendChild(aErr);
        } catch (e) {}
      };
      bubble.appendChild(img);
    } else if (type === "file" && (msg.file_url || msg.file_name)) {
      bubble.classList.add("file-bubble");
      var a = document.createElement("a");
      a.className = "file-link";
      a.href = msg.file_url || "#";
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "📎 " + (msg.file_name || "파일 열기");
      bubble.appendChild(a);
    } else {
      // 시트 기록(텍스트)에서 [[IMG]]/[[FILE]]로 복원되는 경우
      var parsedImg = parseImageToken(text);
      if (parsedImg) {
        bubble.classList.add("photo-bubble");
        var img2 = document.createElement("img");
        img2.className = "chat-photo";
        img2.setAttribute("data-zoomable", "1");
        img2.alt = "사진";
        img2.loading = "lazy";
        img2.dataset.fullsrc = normalizeDriveUrl(parsedImg.url);
        img2.src = toChatThumbUrl(parsedImg.url);
        img2.onerror = function () {
          try {
            bubble.innerHTML = "";
            bubble.classList.remove("photo-bubble");
            bubble.classList.add("file-bubble");
            var aImg = document.createElement("a");
            aImg.className = "file-link";
            aImg.href = parsedImg.url;
            aImg.target = "_blank";
            aImg.rel = "noopener";
            aImg.textContent = "📷 사진 열기";
            bubble.appendChild(aImg);
          } catch (e) {}
        };
        bubble.appendChild(img2);
      } else {
      var parsedFile = parseFileToken(text);
      if (parsedFile) {
        bubble.classList.add("file-bubble");
        var a2 = document.createElement("a");
        a2.className = "file-link";
        a2.href = parsedFile.url;
        a2.target = "_blank";
        a2.rel = "noopener";
        a2.textContent = "📎 " + (parsedFile.name || "파일 열기");
        bubble.appendChild(a2);
      } else {
      var emojiOnly = isEmojiOnlyText(text);
      if (emojiOnly) bubble.classList.add("emoji-only");
      if (typeof window.renderTextWithEmojis === "function") {
        try {
          window.renderTextWithEmojis(text, bubble);
        } catch (e) {
          bubble.textContent = text;
        }
      } else {
        bubble.textContent = text;
      }
      }
      }
    }

    // 링크 자동 변환 + 유튜브 미리보기(텍스트 메시지)
    if (type === "text") {
      try {
        if (window.ChatLinkify && typeof window.ChatLinkify.enhanceBubble === "function") {
          window.ChatLinkify.enhanceBubble(bubble, text);
        }
      } catch (e) {}
    }


    var meta = document.createElement("div");
    meta.className = "msg-meta";

    // 내 메시지는 닉네임을 숨김
    if (!isMe) {
      var nameSpan = document.createElement("span");
      nameSpan.className = "msg-name";
      nameSpan.textContent = (msg.nickname || "익명") + " ";
      meta.appendChild(nameSpan);
    }

    var timeSpan = document.createElement("span");
    timeSpan.className = "msg-time";
    if (msg.ts) {
      var d = new Date(msg.ts);
      var hh = d.getHours().toString().padStart(2, "0");
      var mm = d.getMinutes().toString().padStart(2, "0");
      timeSpan.textContent = hh + ":" + mm;
    }
    meta.appendChild(timeSpan);

    var inner = document.createElement("div");
    inner.className = "msg-inner";

    // 내 메시지는 시간표시를 말풍선 반대쪽(좌측)으로
    if (isMe) {
      inner.appendChild(meta);
      inner.appendChild(bubble);
    } else {
      inner.appendChild(bubble);
      inner.appendChild(meta);
    }

    wrapper.appendChild(inner);

    bodyEl.appendChild(wrapper);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  // ------------------------------------------------------------
  // 이미지 확대 보기 (사진/미디어 메시지용)
  //  - img.chat-photo 또는 [data-zoomable="1"] 클릭 시 전체 화면 확대
  //  - 다시 누르면(오버레이 클릭) 닫힘
  // ------------------------------------------------------------
  function initImageZoom() {
    zoomOverlay = document.getElementById("imageZoomOverlay");
    zoomImg = document.getElementById("imageZoomImg");
    var zoomLink = document.getElementById("imageZoomOpenLink");
    if (!zoomOverlay || !zoomImg || !bodyEl) return;

    function openZoom(src) {
      if (!src) return;

      // 원본 열기 링크
      try {
        if (zoomLink) {
          zoomLink.href = src;
          zoomLink.style.display = "block";
        }
      } catch (e0) {}

      // Drive 링크는 여러 방식으로 폴백 시도
      var tries = [];
      try {
        tries.push(src);
        var id = null;
        try { id = extractDriveId(src); } catch (e1) { id = null; }
        if (id) {
          tries.push("https://drive.google.com/uc?export=download&id=" + id);
          tries.push("https://drive.google.com/thumbnail?id=" + id + "&sz=w2048");
        }
      } catch (e2) {
        tries = [src];
      }

      zoomImg.dataset.tryIndex = "0";
      zoomImg.dataset.tryList = JSON.stringify(tries);
      zoomImg.src = tries[0];

      zoomOverlay.classList.add("open");
      zoomOverlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
    }
    function closeZoom() {
      zoomOverlay.classList.remove("open");
      zoomOverlay.setAttribute("aria-hidden", "true");
      zoomImg.removeAttribute("src");
      document.body.classList.remove("no-scroll");
    }

    // 확대 이미지 로드 실패 시 Drive 폴백(다운로드/큰 썸네일) 순서로 재시도
    zoomImg.onerror = function () {
      try {
        var list = [];
        try { list = JSON.parse(zoomImg.dataset.tryList || "[]") || []; } catch (e1) { list = []; }
        var i = Number(zoomImg.dataset.tryIndex || "0");
        if (i + 1 < list.length) {
          zoomImg.dataset.tryIndex = String(i + 1);
          zoomImg.src = list[i + 1];
          return;
        }
        // 모두 실패하면 원본 열기 링크만 남김
        if (zoomLink) zoomLink.style.display = "block";
      } catch (e0) {}
    };

    // 채팅 내 이미지 클릭(이벤트 위임)
    bodyEl.addEventListener("click", function (e) {
      var img = e.target && e.target.closest ? e.target.closest("img") : null;
      if (!img) return;
      var isZoomable = img.classList.contains("chat-photo") || img.getAttribute("data-zoomable") === "1";
      if (!isZoomable) return;
      e.preventDefault();
      e.stopPropagation();
      openZoom(img.dataset.fullsrc || img.currentSrc || img.src);
    });

    // 오버레이를 누르면 닫힘(다시 누르면 돌아가기)
    zoomOverlay.addEventListener("click", function () {
      closeZoom();
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && zoomOverlay.classList.contains("open")) {
        closeZoom();
      }
    });
  }

  function renderAll() {
    if (!bodyEl) return;
    bodyEl.innerHTML = "";
    if (!messages || messages.length === 0) {
      var empty = document.createElement("div");
      empty.className = "empty-hint";
      empty.textContent = "아직 올라온 소통 메시지가 없어요. 먼저 말을 걸어 볼래요?";
      bodyEl.appendChild(empty);
      return;
    }

    var lastKey = null;
    messages.forEach(function (m) {
      if (!m) return;
      var ts = m.ts || Date.now();
      var key = formatDateKey(ts);
      if (lastKey !== key) {
        appendDateSeparator(ts);
        lastKey = key;
      }
      appendMessage(m);
    });
  }

  async function loadRecentFromSheet(roomId) {
  var wantedRoomId = String(roomId || currentRoomId || "").trim();
  var seq = ++__loadSeq;
  if (typeof window.postToSheet !== "function") return;
  try {
    var res = await window.postToSheet({
      mode: "social_recent_room",
      room_id: wantedRoomId,
      nickname: getSafeNickname(),
      limit: MAX_BUFFER
    });
    if (!res || !res.ok) return;

    var text = await res.text();
    var json = JSON.parse(text || "{}");
    var rows = (json && json.messages) ? json.messages : [];

    // 방이 바뀐 뒤/새 요청이 시작된 뒤 늦게 온 응답은 무시(대화 섞임 방지)
    if (seq !== __loadSeq) return;
    if (currentRoomId !== wantedRoomId) return;

    // 시트 목록 파싱
    var sheetList = [];
    (rows || []).forEach(function (row) {
      if (!row) return;
      var rawMsg = (row.text || row.chatlog || row.message || row.msg || "").toString();
      var mid = row.mid || row.message_id || row.id || "";
      var m = {
        key: mid ? ("m_" + mid) : ("s_" + (row.ts || row.timestamp || row.date || Date.now()) + "_" + Math.random().toString(16).slice(2)),
        mid: mid || "",
        user_id: row.user_id || "",
        nickname: row.nickname || "익명",
        text: rawMsg,
        ts: row.ts || row.timestamp || row.date || Date.now(),
        room_id: wantedRoomId,
        _sheet: true
      };

      // 토큰 기반 타입 복원([[IMG]] / [[FILE]])
      try {
        if (rawMsg.indexOf("[[IMG]]") === 0) {
          m.type = "image";
          m.image_url = rawMsg.replace("[[IMG]]", "").trim();
          m.text = "";
        } else if (rawMsg.indexOf("[[FILE]]") === 0) {
          var pf = parseFileToken(rawMsg);
          if (pf) {
            m.type = "file";
            m.file_url = pf.url;
            m.file_name = pf.name;
            m.text = "";
          } else {
            m.type = "text";
          }
        } else {
          m.type = "text";
        }
      } catch (e0) {
        m.type = "text";
      }

      sheetList.push(m);
    });

    // merge: 기존(릴레이 포함)을 덮어쓰지 않고 합치기 (mid 우선)
    var __relayIdx = __smBuildRelayMidIndex(messages);
    sheetList.forEach(function(m){ __smTryAttachMidFromRelayIndex(m, __relayIdx); });

    var map = {};
    function keyOf(m) {
      var mid2 = (m && m.mid) ? String(m.mid) : "";
      if (mid2) return "m:" + mid2;
      return "k:" + String(m.user_id || "") + "|" + String(m.nickname || "") + "|" + String(m.text || "") + "|" + String(m.ts || 0);
    }

    (messages || []).forEach(function (m) {
      if (!m) return;
      map[keyOf(m)] = m;
    });

    sheetList.forEach(function (m) {
      if (!m) return;
      map[keyOf(m)] = m; // 시트가 정답 우선
      // 디듀프 힌트
      try { if (m.mid) __rememberRelay(m.mid); } catch (eD) {}
    });

    var merged = Object.keys(map).map(function (k) { return map[k]; });
    merged.sort(function (a, b) { return Number(a.ts || 0) - Number(b.ts || 0); });

    if (merged.length > MAX_BUFFER) {
      merged = merged.slice(merged.length - MAX_BUFFER);
    }

    messages = merged;
    renderAll();
  } catch (e) {
    console.warn("[messenger] 최근 메시지 불러오기 실패:", e);
  }
}



  // signals 수신에 따라 현재 방의 최근글(30개)만 '짧게' 갱신 (속도/혼선 방지)
  var __roomRefreshTimer = null;
  

function isVisitedRoomForNotify(roomId) {
  try {
    if (!roomId) return false;
    if (String(roomId) === "global") return true;
    var raw = localStorage.getItem("ghostRoomVisited_v1");
    if (!raw) return false;
    var map = JSON.parse(raw) || {};
    return !!map[String(roomId)];
  } catch (e) {
    return false;
  }
}

// ------------------------------------------------------------
// (B안) Firebase를 "저장소"가 아니라 "중계"로만 사용해 실시간 속도 확보
// - SignalBus(/signals/<room>/q)의 onMessage를 받아 현재 방 UI에 즉시 반영합니다.
// - 중복/에코 방지용 mid(메시지 ID) 기반 디듀프를 포함합니다.
// ------------------------------------------------------------
var __relaySeen = {};
var __relaySeenOrder = [];
var __RELAY_SEEN_MAX = 240;

function __rememberRelay(mid) {
  try {
    if (!mid) return;
    mid = String(mid);
    if (__relaySeen[mid]) return;
    __relaySeen[mid] = 1;
    __relaySeenOrder.push(mid);
    if (__relaySeenOrder.length > __RELAY_SEEN_MAX) {
      var old = __relaySeenOrder.splice(0, __relaySeenOrder.length - __RELAY_SEEN_MAX);
      old.forEach(function (k) { delete __relaySeen[k]; });
    }
  } catch (e) {}
}

function __hasRelay(mid) {
  try { return !!(__relaySeen && mid && __relaySeen[String(mid)]); } catch (e) { return false; }
}

function __removeByMid(mid) {
  try {
    if (!mid) return false;
    mid = String(mid);
    var removed = false;
    for (var i = messages.length - 1; i >= 0; i--) {
      var it = messages[i];
      if (!it) continue;
      if (String(it.mid || it.key || "") === mid) {
        messages.splice(i, 1);
        removed = true;
      }
    }
    if (removed) renderAll();
    return removed;
  } catch (e) { return false; }
}

function __toMessageFromRelay(msgInfo) {
  var txt = (msgInfo && msgInfo.text != null) ? String(msgInfo.text) : "";
  var m = {
    key: (msgInfo.mid || ("relay_" + (msgInfo.ts || Date.now()))),
    mid: msgInfo.mid || "",
    user_id: msgInfo.user_id || "",
    nickname: msgInfo.nickname || "익명",
    text: txt,
    ts: msgInfo.ts || Date.now(),
    room_id: msgInfo.roomId || currentRoomId || "",
    _relay: true
  };

  // 토큰 기반 타입 복원([[IMG]] / [[FILE]])
  try {
    if (txt.indexOf("[[IMG]]") === 0) {
      m.type = "image";
      m.image_url = txt.replace("[[IMG]]", "").trim();
      m.text = "";
    } else if (txt.indexOf("[[FILE]]") === 0) {
      var pf = (typeof parseFileToken === "function") ? parseFileToken(txt) : null;
      if (pf) {
        m.type = "file";
        m.file_url = pf.url;
        m.file_name = pf.name;
        m.text = "";
      } else {
        m.type = "text";
      }
    } else {
      m.type = "text";
    }
  } catch (e2) {
    m.type = "text";
  }

  return m;
}

function __applyRelayMessage(msgInfo) {
  try {
    if (!msgInfo || !msgInfo.roomId) return;
    if (!currentRoomId) return;
    if (String(msgInfo.roomId) !== String(currentRoomId)) return;

    // retract(전송 실패/취소) 처리
    if (String(msgInfo.kind || "") === "retract") {
      __removeByMid(msgInfo.mid || "");
      return;
    }

    var mid = msgInfo.mid || "";
    if (mid && __hasRelay(mid)) return;
    if (mid) __rememberRelay(mid);

    var m = __toMessageFromRelay(msgInfo);

    // 현재 방에서 보고 있을 때는 lastSeenTs 갱신(알림 오탐 방지)
    try {
      if (window.SignalBus && typeof window.SignalBus.markSeenTs === "function") {
        window.SignalBus.markSeenTs(currentRoomId || "", m.ts || Date.now());
      }
    } catch (eSeen) {}

    messages.push(m);
    if (messages.length > MAX_BUFFER) messages.splice(0, messages.length - MAX_BUFFER);
    renderAll();
  } catch (e) {}
}

function scheduleRoomRefresh(roomId) {
    try {
      if (!roomId) return;
      if (!currentRoomId) return;
      if (String(roomId) !== String(currentRoomId)) return;

      clearTimeout(__roomRefreshTimer);
      __roomRefreshTimer = setTimeout(function () {
        try { loadRecentFromSheet(roomId); } catch (e) {}
      }, 200);
    } catch (e0) {}
  }

  function startListen() {
    var db0 = ensureFirebase();
    if (!db0 || !ref) return;

    // auth 보장 후 리스너 시작
    ensureAnonAuth().then(function () {
      var roomIdNow = currentRoomId;
      var refNow = ref;

      // 리스너 중복 방지
      stopListen();
      listenStartedAt = Date.now();

      var onChildAdded = function (snap) {
        // 방이 바뀐 뒤 늦게 도착한 이벤트는 무시
        if (currentRoomId !== roomIdNow) return;
        var arrivedAt = Date.now();
        var val = snap.val() || {};
        // 과거 데이터 호환:
        // - 일부 클라이언트는 text 대신 message/chatlog/msg 키를 사용했을 수 있음
        var msgText = (val.text || val.message || val.chatlog || val.msg || "");

        var msg = {
          key: snap.key,
          user_id: val.user_id || "",
          nickname: val.nickname || "익명",
          text: msgText,
          type: val.type || "text",
          image_url: val.image_url || "",
          file_url: val.file_url || "",
          file_name: val.file_name || "",
          file_mime: val.file_mime || "",
          file_size: val.file_size || 0,
          ts: val.ts || Date.now(),
          room_id: val.room_id || roomIdNow
        };

        // text에 [[IMG]]가 있으면 보정
        if ((!msg.type || msg.type === "text") && msg.text && msg.text.indexOf("[[IMG]]") === 0) {
          msg.type = "image";
          msg.image_url = msg.text.replace("[[IMG]]", "").trim();
          msg.text = "";
        }
        // text에 [[FILE]]가 있으면 보정
        if ((!msg.type || msg.type === "text") && msg.text && msg.text.indexOf("[[FILE]]") === 0) {
          var pf2 = parseFileToken(msg.text);
          if (pf2) {
            msg.type = "file";
            msg.file_url = pf2.url;
            msg.file_name = pf2.name;
            msg.text = "";
          }
        }

        // 다른 방 메시지가 섞이는 것을 방지(메시지에 room_id가 들어있는 경우)
        try {
          if (msg.room_id && String(msg.room_id) !== String(roomIdNow)) return;
        } catch (eRoom) {}

        // 낙관적 렌더(로컬) 메시지/중복 제거
        try {
          for (var di = messages.length - 1; di >= 0; di--) {
            var mm = messages[di];
            if (!mm) continue;
            if (mm.key && msg.key && mm.key === msg.key) return;
            var same = (mm.ts === msg.ts) && (String(mm.user_id || "") === String(msg.user_id || "")) && (String(mm.type || "text") === String(msg.type || "text")) &&
              (String(mm.text || "") === String(msg.text || "")) && (String(mm.image_url || "") === String(msg.image_url || "")) && (String(mm.file_url || "") === String(msg.file_url || ""));
            if (same) {
              if (mm._local) { messages.splice(di, 1); }
              else { return; }
              break;
            }
          }
        } catch (eDup) {}

        // 방에 들어와 있는 동안은 "봤음"으로 계속 갱신(알림 오탐 방지)
        try {
          if (window.SignalBus && typeof window.SignalBus.markSeenTs === "function") {
            window.SignalBus.markSeenTs(roomIdNow, msg.ts);
          }
        } catch (e0) {}

        // 내 메시지면 lastMyTs 갱신(다른 기기에서 보낸 경우 포함)
        try {
          if (myId && msg.user_id && String(msg.user_id) === String(myId)) {
            if (window.SignalBus && typeof window.SignalBus.markMyTs === "function") {
              window.SignalBus.markMyTs(roomIdNow, msg.ts);
            }
          }
        } catch (e1) {}

        // (기존 알림음) 내 글 직후 다른 사람이 메시지를 보내면 띠리링(현재 방 내부)
        var prev = messages.length ? messages[messages.length - 1] : null;
        var shouldRing = false;
        if (myId && prev && prev.user_id === myId && msg.user_id && msg.user_id !== myId) {
          if (arrivedAt - listenStartedAt > 1500) shouldRing = true;
        }

        messages.push(msg);
        if (messages.length > MAX_BUFFER) {
          messages.splice(0, messages.length - MAX_BUFFER);
        }
        renderAll();

        if (shouldRing && NotifySetting && NotifySetting.isEnabled && NotifySetting.isEnabled()) {
          NotifySound.playDdiring();
          if (NotifySetting.maybeShow) NotifySetting.maybeShow(msg);
        }
        try { snap.ref.remove(); } catch (e) {}
      };

      // Query(limitToLast) 리스너는 같은 Query 객체에서 off 해야 함
      // → 전용 스트림 모듈(RoomMessageStream)로 attach/stop 관리
      if (window.RoomMessageStream && typeof window.RoomMessageStream.start === "function") {
        window.RoomMessageStream.start(refNow, MAX_BUFFER, onChildAdded);
      } else {
        // fallback (권장되지 않음)
        try { refNow.limitToLast(MAX_BUFFER).on("child_added", onChildAdded); } catch (e0) {}
      }

      showStatus("실시간 연결 완료");
    }).catch(function () {
      showStatus("실시간 서버 인증에 실패했어요.");
    });
  }

  function logToSheet(text, ts) {
    if (typeof window.postToSheet !== "function") return;
    try {
      var payload = {
        mode: "social_chat_room",
        room_id: currentRoomId || "",
        user_id: myId || "",
        nickname: getSafeNickname(),
        message: text,
        text: text,
        ts: ts || Date.now()
      };
      // 구버전 서버(rooms 미지원) 대비: global이면 기존 mode도 함께 기록 시도
      if (!currentRoomId) {
        try {
          window.postToSheet({
            mode: "social_chat",
            user_id: myId || "",
            nickname: getSafeNickname(),
            message: text,
            text: text,
            ts: ts || Date.now()
          });
        } catch (e0) {}
      }

      var p = window.postToSheet(payload);
      if (p && typeof p.catch === "function") {
        p.catch(function (e) {
          console.warn("[messenger] 시트 기록 실패:", e);
        });
      }
    } catch (e) {
      console.warn("[messenger] logToSheet 예외:", e);
    }
  }

    function sendTextMessage(text) {
    var clean = (text || "").trim();
    if (!clean) {
      showStatus("보낼 내용을 입력해 주세요.");
      return;
    }
    if (!requireLogin()) return;

    if (!currentRoomId) {
      showStatus("상단 왼쪽 '대화방' 버튼을 눌러 방을 선택해 주세요.");
      try {
        if (window.RoomGuard && typeof window.RoomGuard.renderNoRoomHint === "function") {
          window.RoomGuard.renderNoRoomHint(bodyEl);
        }
      } catch (e0) {}
      return;
    }

    var now = Date.now();

    // 즉시 화면에 반영(낙관적 렌더)
    var __mid = "m_" + now + "_" + Math.random().toString(16).slice(2);
    var __localKey = "local_" + __mid;
    var __localMsg = {
      key: __localKey,
      mid: __mid,
      user_id: myId || "",
      nickname: getSafeNickname(),
      text: clean,
      type: "text",
      ts: now,
      room_id: currentRoomId || "",
      _local: true
    };

    try {
      messages.push(__localMsg);
      if (messages.length > MAX_BUFFER) messages.splice(0, messages.length - MAX_BUFFER);
      renderAll();
      if (window.SignalBus && typeof window.SignalBus.markSeenTs === "function") {
        window.SignalBus.markSeenTs(currentRoomId || "", now);
      }
      if (window.SignalBus && typeof window.SignalBus.markMyTs === "function") {
        window.SignalBus.markMyTs(currentRoomId || "", now);
      }
    } catch (e0) {}

    // (B안) Firebase signals 큐로 즉시 중계(시트 저장과는 별개)
    try {
      __rememberRelay(__mid);
      if (window.SignalBus && typeof window.SignalBus.push === "function") {
        window.SignalBus.push(currentRoomId || "", {
          kind: "chat",
          mid: __mid,
          room_id: currentRoomId || "",
          user_id: myId || "",
          nickname: getSafeNickname(),
          text: clean,
          ts: now
        });
      }
    } catch (eRelay) {}

    // 1) 시트에 기록 (진짜 저장소)
    // 2) 성공 시 signals 트리거(실시간 갱신/알림용, Firebase에는 메시지 저장 안함)
    try {
      if (typeof window.postToSheet !== "function") throw new Error("postToSheet missing");

      window.postToSheet({
        mode: "social_chat_room",
        room_id: currentRoomId || "",
        mid: __mid,
        user_id: myId || "",
        nickname: getSafeNickname(),
        message: clean,
        text: clean,
        ts: now
      }).then(function (res) {
        if (!res || !res.ok) throw new Error("sheet write failed");

        // 성공 토스트(보냈어요!)는 표시하지 않음

        // (선택) 시트 기반으로 1회 정렬/동기화(필요 시)
        scheduleRoomRefresh(currentRoomId || "");
      }).catch(function (err) {
        console.warn("[messenger] 시트 전송 실패:", err);
        showStatus("전송 중 문제가 생겼어요.");

        // (B안) 다른 클라이언트에 임시 중계 취소(retract)
        try {
          if (window.SignalBus && typeof window.SignalBus.push === "function") {
            window.SignalBus.push(currentRoomId || "", { kind: "retract", mid: __mid, room_id: currentRoomId || "", user_id: myId || "", ts: Date.now() });
          }
        } catch (eR) {}

        // 낙관적 렌더 롤백
        try {
          for (var i = messages.length - 1; i >= 0; i--) {
            if (messages[i] && messages[i].key === __localKey) { messages.splice(i, 1); break; }
          }
          renderAll();
        } catch (e0) {}
      });
    } catch (e) {
      console.warn("[messenger] 전송 예외:", e);
      showStatus("전송 중 문제가 생겼어요.");
    }
  }

  function sendCurrentMessage() {
    if (!msgInput) return;
    var text = (msgInput.value || "").trim();
    if (!text) {
      showStatus("보낼 내용을 입력해 주세요.");
      return;
    }
    // 입력창은 미리 비우고 전송(키 입력 반복 방지)
    msgInput.value = "";
    sendTextMessage(text);
  }

  function buildEmojiPanel() {
    emojiBtn = document.getElementById("msgEmojiBtn");
    emojiPanel = document.getElementById("msgEmojiPanel");
    if (!emojiBtn || !emojiPanel || !msgInput) return;

    if (!emojiPanel.dataset.built) {
      emojiPanel.dataset.built = "1";
      var grid = document.createElement("div");
      grid.className = "emoji-grid";
      for (var i = 1; i <= 12; i++) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "emoji-item";
        btn.setAttribute("data-code", "e" + i);

        var img = document.createElement("img");
        img.className = "chat-emoji";
        img.src = "../images/emoticon/e" + i + ".png";
        img.alt = ":e" + i + ":";
        btn.appendChild(img);
        grid.appendChild(btn);
      }
      emojiPanel.appendChild(grid);
    }

    function closePanel() {
      emojiPanel.classList.remove("open");
    }

    emojiBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (emojiPanel.classList.contains("open")) {
        emojiPanel.classList.remove("open");
      } else {
        emojiPanel.classList.add("open");
      }
    });

    emojiPanel.addEventListener("click", function (e) {
      var btn = e.target.closest(".emoji-item");
      if (!btn) return;
      var code = btn.getAttribute("data-code");
      if (!code) return;
      var token = ":" + code + ":";

      // 방 선택 전에는 전송 불가
      if (!currentRoomId) {
        showStatus("상단 왼쪽 '대화방' 버튼을 눌러 방을 선택해 주세요.");
        try {
          if (window.RoomGuard && typeof window.RoomGuard.renderNoRoomHint === "function") {
            window.RoomGuard.renderNoRoomHint(bodyEl);
          }
        } catch (e0) {}
        closePanel();
        return;
      }

      // [요청사항] 실시간 톡 보기에서는 이모티콘을 고르면 즉시 전송
      sendTextMessage(token);
      try { msgInput.focus(); } catch (e2) {}
      closePanel();
    });

    document.addEventListener("click", function (e) {
      if (!emojiPanel.classList.contains("open")) return;
      if (e.target === emojiBtn || emojiBtn.contains(e.target)) return;
      if (emojiPanel.contains(e.target)) return;
      emojiPanel.classList.remove("open");
    });
  }

  function attachEvents() {
    if (!sendBtn || !msgInput) return;
    sendBtn.addEventListener("click", function () {
      sendCurrentMessage();
    });
    msgInput.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        sendCurrentMessage();
      }
    });

    closeBtn = document.getElementById("topCloseBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        try {
          if (window.parent && typeof window.parent.exitGame === "function") {
            window.parent.exitGame();
          } else {
            window.close();
          }
        } catch (e) {
          window.close();
        }
      });
    }

    buildEmojiPanel();

    // + 첨부 메뉴(사진촬영/이미지/파일)
    cameraBtn = document.getElementById("msgCameraBtn");
    if (cameraBtn && AttachMenu && typeof AttachMenu.init === "function") {
      AttachMenu.init({
          buttonEl: cameraBtn,
          containerEl: cameraBtn.parentElement,
          onTakePhoto: async function () {
            if (!requireLogin()) return;
            if (!window.ChatPhoto || typeof window.ChatPhoto.pickAndUpload !== "function") {
              showStatus("사진 기능이 준비되지 않았어요.");
              return;
            }
            try {
              showStatus("사진 촬영 준비 중...");
              var result = await window.ChatPhoto.pickAndUpload({
                capture: true,
                size: 480,
                quality: 0.78,
                user_id: myId || "",
                nickname: getSafeNickname()
              });
              if (!result || !result.url) {
                showStatus("사진 업로드에 실패했어요.");
                return;
              }
              sendImageMessage(result.url);
            } catch (e) {
              console.warn("[messenger] take photo error:", e);
              showStatus("사진 전송에 실패했어요.");
            }
          },
                    onScanQr: async function () {
            if (!requireLogin()) return;
            if (!window.QRLinkScanner || typeof window.QRLinkScanner.start !== "function") {
              showStatus("QR 스캔 기능이 준비되지 않았어요.");
              return;
            }
            try {
              window.QRLinkScanner.start({
                onResult: function (val) {
                  try {
                    if (!val) return;
                    sendTextMessage(String(val));
                  } catch (e) {}
                }
              });
            } catch (e) {
              showStatus("QR 스캔을 시작할 수 없어요.");
            }
          },
onPickImage: async function () {
            if (!requireLogin()) return;
            if (!window.ChatPhoto || typeof window.ChatPhoto.pickAndUpload !== "function") {
              showStatus("이미지 기능이 준비되지 않았어요.");
              return;
            }
            try {
              showStatus("이미지 준비 중...");
              var result2 = await window.ChatPhoto.pickAndUpload({
                capture: false,
                size: 480,
                quality: 0.78,
                user_id: myId || "",
                nickname: getSafeNickname()
              });
              if (!result2 || !result2.url) {
                showStatus("이미지 업로드에 실패했어요.");
                return;
              }
              sendImageMessage(result2.url);
            } catch (e2) {
              console.warn("[messenger] pick image error:", e2);
              showStatus("이미지 전송에 실패했어요.");
            }
          },
          onPickFile: async function () {
            if (!requireLogin()) return;
            if (!window.ChatFile || typeof window.ChatFile.pickAndUpload !== "function") {
              showStatus("파일 기능이 준비되지 않았어요.");
              return;
            }
            try {
              showStatus("파일 준비 중...");
              var fr = await window.ChatFile.pickAndUpload({
                maxBytes: 5 * 1024 * 1024,
                user_id: myId || "",
                nickname: getSafeNickname()
              });
              if (!fr || !fr.url) {
                showStatus("파일 업로드에 실패했어요.");
                return;
              }
              sendFileMessage(fr.url, fr.filename, fr.mime, fr.size);
            } catch (e3) {
              console.warn("[messenger] file error:", e3);
              if (String(e3 && e3.message || "").indexOf("file too large") >= 0) {
                showStatus("파일은 5MB를 넘길 수 없어요.");
              } else {
                showStatus("파일 전송에 실패했어요.");
              }
            }
          },
          getNotifyLabel: function () { return NotifySetting.getMenuLabel(); },
          onToggleNotify: function () { NotifySetting.toggle(showStatus); }
        });
    }
  }

    function sendImageMessage(imageUrl) {
    if (!imageUrl) return;
    if (!requireLogin()) return;

    if (!currentRoomId) {
      showStatus("상단 왼쪽 '대화방' 버튼을 눌러 방을 선택해 주세요.");
      return;
    }

    var now = Date.now();
    var token = "[[IMG]]" + imageUrl;

    // 낙관적 렌더
    var __mid = "mimg_" + now + "_" + Math.random().toString(16).slice(2);
    var __localKey = "local_img_" + __mid;
    var __localMsg = {
      key: __localKey,
      mid: __mid,
      user_id: myId || "",
      nickname: getSafeNickname(),
      type: "image",
      image_url: imageUrl,
      text: "",
      ts: now,
      room_id: currentRoomId || "",
      _local: true
    };

    try {
      messages.push(__localMsg);
      if (messages.length > MAX_BUFFER) messages.splice(0, messages.length - MAX_BUFFER);
      renderAll();
      if (window.SignalBus && typeof window.SignalBus.markSeenTs === "function") {
        window.SignalBus.markSeenTs(currentRoomId || "", now);
      }
      if (window.SignalBus && typeof window.SignalBus.markMyTs === "function") {
        window.SignalBus.markMyTs(currentRoomId || "", now);
      }
    } catch (e0) {}

    // (B안) Firebase signals 큐로 즉시 중계
    try {
      __rememberRelay(__mid);
      if (window.SignalBus && typeof window.SignalBus.push === "function") {
        window.SignalBus.push(currentRoomId || "", {
          kind: "chat",
          mid: __mid,
          room_id: currentRoomId || "",
          user_id: myId || "",
          nickname: getSafeNickname(),
          text: token,
          ts: now
        });
      }
    } catch (eRelay) {}

    try {
      if (typeof window.postToSheet !== "function") throw new Error("postToSheet missing");

      window.postToSheet({
        mode: "social_chat_room",
        room_id: currentRoomId || "",
        mid: __mid,
        user_id: myId || "",
        nickname: getSafeNickname(),
        message: token,
        text: token,
        ts: now
      }).then(function (res) {
        if (!res || !res.ok) throw new Error("sheet write failed");

        // 성공 토스트(사진을 보냈어요!)는 표시하지 않음

        scheduleRoomRefresh(currentRoomId || "");
      }).catch(function (err) {
        console.warn("[messenger] 이미지 시트 전송 실패:", err);
        showStatus("전송 중 문제가 생겼어요.");

        // (B안) 다른 클라이언트에 임시 중계 취소(retract)
        try {
          if (window.SignalBus && typeof window.SignalBus.push === "function") {
            window.SignalBus.push(currentRoomId || "", { kind: "retract", mid: __mid, room_id: currentRoomId || "", user_id: myId || "", ts: Date.now() });
          }
        } catch (eR) {}

        try {
          for (var i = messages.length - 1; i >= 0; i--) {
            if (messages[i] && messages[i].key === __localKey) { messages.splice(i, 1); break; }
          }
          renderAll();
        } catch (e0) {}
      });
    } catch (e) {
      console.warn("[messenger] 이미지 전송 예외:", e);
      showStatus("전송 중 문제가 생겼어요.");
    }
  }

    function sendFileMessage(fileUrl, fileName, fileMime, fileSize) {
    if (!fileUrl) return;
    if (!requireLogin()) return;

    if (!currentRoomId) {
      showStatus("상단 왼쪽 '대화방' 버튼을 눌러 방을 선택해 주세요.");
      return;
    }

    var now = Date.now();

    var safeName = "";
    try { safeName = encodeURIComponent(String(fileName || "파일")); } catch (e2) { safeName = String(fileName || "파일"); }
    var token = "[[FILE]]" + fileUrl + "|" + safeName;

    // 낙관적 렌더
    var __mid = "mfile_" + now + "_" + Math.random().toString(16).slice(2);
    var __localKey = "local_file_" + __mid;
    var __localMsg = {
      key: __localKey,
      mid: __mid,
      user_id: myId || "",
      nickname: getSafeNickname(),
      type: "file",
      file_url: fileUrl,
      file_name: fileName || "파일",
      file_mime: fileMime || "application/octet-stream",
      file_size: fileSize || 0,
      text: "",
      ts: now,
      room_id: currentRoomId || "",
      _local: true
    };

    try {
      messages.push(__localMsg);
      if (messages.length > MAX_BUFFER) messages.splice(0, messages.length - MAX_BUFFER);
      renderAll();
      if (window.SignalBus && typeof window.SignalBus.markSeenTs === "function") {
        window.SignalBus.markSeenTs(currentRoomId || "", now);
      }
      if (window.SignalBus && typeof window.SignalBus.markMyTs === "function") {
        window.SignalBus.markMyTs(currentRoomId || "", now);
      }
    } catch (e0) {}

    // (B안) Firebase signals 큐로 즉시 중계
    try {
      __rememberRelay(__mid);
      if (window.SignalBus && typeof window.SignalBus.push === "function") {
        window.SignalBus.push(currentRoomId || "", {
          kind: "chat",
          mid: __mid,
          room_id: currentRoomId || "",
          user_id: myId || "",
          nickname: getSafeNickname(),
          text: token,
          ts: now
        });
      }
    } catch (eRelay) {}

    try {
      if (typeof window.postToSheet !== "function") throw new Error("postToSheet missing");

      window.postToSheet({
        mode: "social_chat_room",
        room_id: currentRoomId || "",
        mid: __mid,
        user_id: myId || "",
        nickname: getSafeNickname(),
        message: token,
        text: token,
        ts: now
      }).then(function (res) {
        if (!res || !res.ok) throw new Error("sheet write failed");

        // 성공 토스트(파일을 보냈어요!)는 표시하지 않음

        scheduleRoomRefresh(currentRoomId || "");
      }).catch(function (err) {
        console.warn("[messenger] 파일 시트 전송 실패:", err);
        showStatus("전송 중 문제가 생겼어요.");

        // (B안) 다른 클라이언트에 임시 중계 취소(retract)
        try {
          if (window.SignalBus && typeof window.SignalBus.push === "function") {
            window.SignalBus.push(currentRoomId || "", { kind: "retract", mid: __mid, room_id: currentRoomId || "", user_id: myId || "", ts: Date.now() });
          }
        } catch (eR) {}

        try {
          for (var i = messages.length - 1; i >= 0; i--) {
            if (messages[i] && messages[i].key === __localKey) { messages.splice(i, 1); break; }
          }
          renderAll();
        } catch (e0) {}
      });
    } catch (e) {
      console.warn("[messenger] 파일 전송 예외:", e);
      showStatus("전송 중 문제가 생겼어요.");
    }
  }


  function clearChatView() {
    try {
      if (bodyEl) bodyEl.innerHTML = "";
    } catch (e) {}
    messages = [];
    lastKey = null;
  }

  function switchRoom(roomId, meta) {
    roomId = (roomId === undefined || roomId === null) ? "" : String(roomId);
    roomId = roomId.trim();

    currentRoomId = roomId || null;
    currentRoomMeta = meta || null;

    // 방이 선택되지 않았으면: 리스너/뷰 초기화만
    if (!currentRoomId) {
      stopListen();
      clearChatView();
      showStatus("상단 왼쪽 '대화방' 버튼을 눌러 방을 선택해 주세요.");
      try {
        if (window.RoomGuard && typeof window.RoomGuard.renderNoRoomHint === "function") {
          window.RoomGuard.renderNoRoomHint(bodyEl);
        }
      } catch (eHint) {}
      try {
        var titleEl0 = document.getElementById("roomTitle");
        if (titleEl0) titleEl0.textContent = "대화방";
      } catch (e0) {}
      return;
    }

    // 방 입장: lastSeenTs 갱신(알림 오탐 방지)
    try {
      if (window.SignalBus && typeof window.SignalBus.markSeenTs === "function") {
        window.SignalBus.markSeenTs(currentRoomId, Date.now());
      }
    } catch (e1) {}

    // Firebase ref 갱신
    stopListen();
    try {
      var db0 = ensureFirebase();
      if (db0 && db) {
        var p = getFirebasePath(currentRoomId);
        ref = p ? db.ref(p) : null;
      }
    } catch (e2) {}

    clearChatView();
    loadRecentFromSheet(currentRoomId);
    // Firebase에는 메시지를 저장/구독하지 않고, signals만 사용합니다.

    // 상단 상태
    try {
      var titleEl = document.getElementById("roomTitle");
      if (titleEl && meta && meta.name) titleEl.textContent = meta.name;
    } catch (e3) {}
  }

  // chat-rooms.js 에서 방이 바뀔 때 호출
  try {
    window.__onRoomChanged = function (roomId, meta) {
      switchRoom(roomId, meta);
    };
  } catch (e) {}
  function init() {
    bodyEl = document.getElementById("messengerBody");
    statusEl = document.getElementById("msgStatus");
    msgInput = document.getElementById("msgInput");
    sendBtn = document.getElementById("msgSendBtn");

    loadUserFromStorage();

    // (알림음 정책) 첫 터치/클릭 이후에만 소리 재생 가능 → 미리 바인딩
    NotifySound.bindUserGesture(document);
    // signals 알림(방별 reply 감지) 초기화
    try {
      if (window.SignalBus && typeof window.SignalBus.attach === "function") {
        ensureAnonAuth().then(function () {
          try {
            var db0 = ensureFirebase();
            if (db0) {
              window.SignalBus.attach({
                db: db0,
                getMyId: function () { return myId || ""; },
                onSignal: function (info) {
                  // 큐 기반 중계(onMessage)가 기본. onSignal은 fallback 용도로만 남깁니다.
                },
                onMessage: function (msgInfo) {
                  try { __applyRelayMessage(msgInfo); } catch (e) {}
                },
                onNotify: function (info) {
                  // 현재 열려있는 방이면 알림 생략
                  if (info && info.roomId && currentRoomId && info.roomId === currentRoomId) return;


// 방문(입장)하지 않은 방은 알림/소리/점 표시를 하지 않음
try {
  if (!isVisitedRoomForNotify(info.roomId)) return;
} catch (eV) {}

                  // 방 목록에 "새 글"(미확인) 표시
                  try {
                    if (window.RoomUnreadBadge && typeof window.RoomUnreadBadge.mark === "function") {
                      window.RoomUnreadBadge.mark(info.roomId, info.ts);
                    }
                  } catch (eBadge) {}

                  if (NotifySetting && NotifySetting.isEnabled && NotifySetting.isEnabled()) {
                    NotifySound.playDdiring();
                    if (NotifySetting.maybeShow) {
                      NotifySetting.maybeShow({
                        room_id: info.roomId,
                        user_id: info.user_id,
                        ts: info.ts,
                        nickname: "알림",
                        text: "새 메시지"
                      });
                    }
                  }
                }
              });
            }
          } catch (e2) {}
        }).catch(function () {});
      }
    } catch (e) {}

attachEvents();

    initImageZoom();

    // 대화방 초기화
    // - 방 목록은 "방 목록 패널을 열 때만" 서버에서 갱신합니다.
    // - 현재 방은 localStorage(ghostActiveRoomId/Name) 기반으로 복원합니다.
    try {
      if (window.ChatRooms && typeof window.ChatRooms.init === "function") {
        window.ChatRooms.init(); // 여기서는 목록 API를 호출하지 않음
      }
    } catch (e0) {}

        var initialRoomId = "";
    var initialRoomName = "";
    try {
      var rid = localStorage.getItem("ghostActiveRoomId");
      var rname = localStorage.getItem("ghostActiveRoomName");
      if (rid && String(rid).trim()) initialRoomId = String(rid).trim();
      if (rname && String(rname).trim()) initialRoomName = String(rname).trim();
    } catch (e1) {}

    // 저장된 방이 있으면 그 방으로, 없으면 기본 '전체 대화방(global)'로 접속
    if (!initialRoomId) {
      initialRoomId = "global";
      if (!initialRoomName) initialRoomName = "전체 대화방";
    }

    switchRoom(initialRoomId, { room_id: initialRoomId, name: initialRoomName || (initialRoomId === "global" ? "전체 대화방" : "대화방"), is_global: (initialRoomId === "global"), can_leave: (initialRoomId !== "global") });

    // 시작 시 현재 방은 이미 보고 있는 상태로 간주 → 미확인 표시 제거
    try {
      if (window.RoomUnreadBadge && typeof window.RoomUnreadBadge.clear === "function") {
        window.RoomUnreadBadge.clear(initialRoomId);
      }
    } catch (eBadgeInit) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 0);
  }
})();
