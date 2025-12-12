/* ============================================================
   [social-messenger.js] 소통 채팅 메신저형 전체 화면 뷰
   ------------------------------------------------------------
   - games/social-messenger.html 안에서만 사용
   - Firebase Realtime Database "socialChat" 경로와 Apps Script를 활용해
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

  // Firebase 설정: social-chat-firebase.js 와 동일
  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyCALueOFTz3SJ4wnfyDlssqK9jmu3FyV-U",
    authDomain: "web-ghost-c447b.firebaseapp.com",
    databaseURL: "https://web-ghost-c447b-default-rtdb.firebaseio.com",
    projectId: "web-ghost-c447b",
    storageBucket: "web-ghost-c447b.firebasestorage.app",
    messagingSenderId: "198377381878",
    appId: "1:198377381878:web:83b56b1b4d63138d27b1d7"
  };

  var app, db, ref;
  var bodyEl, statusEl, msgInput, sendBtn, emojiBtn, emojiPanel, closeBtn;
  var myId = null;
  var myNickname = null;
  var messages = [];
  var MAX_BUFFER = 100;


  function isEmojiOnlyText(text) {
    if (!text || typeof text !== "string") return false;
    var compact = text.replace(/\s+/g, "");
    return /^(?:\:e(0?[1-9]|1[0-2])\:)+$/.test(compact);
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
      ref = db.ref("socialChat");
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
    var text = msg.text || "";
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

    var meta = document.createElement("div");
    meta.className = "msg-meta";

    var nameSpan = document.createElement("span");
    nameSpan.className = "msg-name";
    nameSpan.textContent = (msg.nickname || "익명") + " ";

    var timeSpan = document.createElement("span");
    timeSpan.className = "msg-time";
    if (msg.ts) {
      var d = new Date(msg.ts);
      var hh = d.getHours().toString().padStart(2, "0");
      var mm = d.getMinutes().toString().padStart(2, "0");
      timeSpan.textContent = hh + ":" + mm;
    }

    meta.appendChild(nameSpan);
    meta.appendChild(timeSpan);

    var inner = document.createElement("div");
    inner.className = "msg-inner";
    inner.appendChild(bubble);
    inner.appendChild(meta);
    wrapper.appendChild(inner);

    bodyEl.appendChild(wrapper);
    bodyEl.scrollTop = bodyEl.scrollHeight;
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

  async function loadRecentFromSheet() {
    if (typeof window.postToSheet !== "function") return;
    try {
      var res = await window.postToSheet({
        mode: "social_recent",
        limit: MAX_BUFFER
      });
      if (!res || !res.ok) return;
      var text = await res.text();
      var json = JSON.parse(text || "{}");
      if (!json || !json.messages || !json.messages.length) return;

      messages = [];
      json.messages.forEach(function (row) {
        if (!row) return;
        messages.push({
          user_id: row.user_id || "",
          nickname: row.nickname || "익명",
          text: row.message || "",
          ts: row.ts || row.timestamp || Date.now()
        });
      });

      if (messages.length > MAX_BUFFER) {
        messages = messages.slice(messages.length - MAX_BUFFER);
      }
      renderAll();
    } catch (e) {
      console.warn("[messenger] 최근 메시지 불러오기 실패:", e);
    }
  }

  function startListen() {
    var db = ensureFirebase();
    if (!db || !ref) return;

    ref.limitToLast(MAX_BUFFER).on("child_added", function (snap) {
      var val = snap.val() || {};
      var msg = {
        key: snap.key,
        user_id: val.user_id || "",
        nickname: val.nickname || "익명",
        text: val.text || "",
        ts: val.ts || Date.now()
      };
      messages.push(msg);
      if (messages.length > MAX_BUFFER) {
        messages.splice(0, messages.length - MAX_BUFFER);
      }
      renderAll();
      try {
        snap.ref.remove();
      } catch (e) {}
    });

    showStatus("실시간 연결 완료");
  }

  function logToSheet(text, ts) {
    if (typeof window.postToSheet !== "function") return;
    try {
      var payload = {
        mode: "social_chat",
        user_id: myId || "",
        nickname: getSafeNickname(),
        message: text,
        ts: ts || Date.now()
      };
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

    var db = ensureFirebase();
    if (!db || !ref) return;

    var now = Date.now();
    var payload = {
      user_id: myId || "",
      nickname: getSafeNickname(),
      text: clean,
      ts: now
    };

    try {
      ref.push(payload, function (err) {
        if (err) {
          console.error("[messenger] 메시지 전송 실패:", err);
          showStatus("전송 중 문제가 생겼어요.");
        }
      });
    } catch (e) {
      console.error("[messenger] 메시지 전송 중 오류:", e);
      showStatus("전송 중 오류가 발생했어요.");
    }

    logToSheet(clean, now);
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
  }

  function init() {
    bodyEl = document.getElementById("messengerBody");
    statusEl = document.getElementById("msgStatus");
    msgInput = document.getElementById("msgInput");
    sendBtn = document.getElementById("msgSendBtn");

    loadUserFromStorage();
    attachEvents();
    loadRecentFromSheet();
    startListen();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 0);
  }
})();
