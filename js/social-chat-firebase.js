/* ============================================================
   [social-chat-firebase.js] 소통 채팅 (Firebase Realtime DB 연동)
   ------------------------------------------------------------
   - 채팅창 왼쪽 상단의 ㄴ자 모양 버튼(#socialToggleBtn)으로
     캐릭터와의 대화 모드 ↔ 소통 채팅 모드를 전환합니다.
   - Firebase Realtime Database 를 통해 여러 사용자가 동시에
     같은 방에서 채팅할 수 있습니다.
   - 이 버전은 Firebase 에 채팅 로그가 남지 않도록
     child_added 이벤트 처리 후 해당 노드를 즉시 삭제합니다.
     (브라우저 화면과, 선택한 경우 구글 시트에만 기록이 남습니다.)
   - 또한 postToSheet({ mode: "social_chat", ... }) 를 통해
     Apps Script 로 전송하면 '소통' 시트에 기록을 남길 수 있습니다.

   [제거 시 함께 정리해야 할 것]
   1) index.html 안의 #socialToggleBtn 버튼 HTML
   2) index.html 맨 아래 firebase-app-compat.js / firebase-database-compat.js / social-chat-firebase.js <script> 태그
   3) css/ghost.css 안의 .social-toggle-btn / .chat-panel-social 관련 스타일
   4) (선택) Apps Script 프로젝트의 social_chat.gs 및 doPost(e) 분기(mode="social_chat")
   ============================================================ */

(function () {
  // ----- Firebase 설정 (필수) -----
  // Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹) → SDK 설정 및 구성에서
  // 제공하는 구성 객체를 아래 SOCIAL_CHAT_FIREBASE_CONFIG 에 붙여넣어 주세요.
  var SOCIAL_CHAT_FIREBASE_CONFIG = {
    apiKey: "__FIREBASE_API_KEY__",
    authDomain: "web-ghost-c447b.firebaseapp.com",
    databaseURL: "https://web-ghost-c447b-default-rtdb.firebaseio.com",
    projectId: "web-ghost-c447b",
    storageBucket: "web-ghost-c447b.firebasestorage.app",
    messagingSenderId: "198377381878",
    appId: "1:198377381878:web:83b56b1b4d63138d27b1d7"
  };

  // 필요하다면 index.html 에서 window.SOCIAL_CHAT_FIREBASE_CONFIG 로
  // 재정의할 수도 있습니다.
  if (window.SOCIAL_CHAT_FIREBASE_CONFIG) {
    SOCIAL_CHAT_FIREBASE_CONFIG = window.SOCIAL_CHAT_FIREBASE_CONFIG;
  }

  var MAX_BUFFER = 100;           // 브라우저에서만 보관할 최대 메시지 수
  var RECENT_DEFAULT = 5;         // 기본으로 보이는 개수
  var RECENT_EXPANDED = 10;       // 위로 스크롤 시 보이는 최대 개수

  var firebaseApp = null;
  var firebaseDb = null;
  var firebaseRef = null;

  var chatPanel = null;
  var logEl = null;
  var userInput = null;
  var toggleBtn = null;

  var socialChatMode = false;
  var socialMessages = [];        // { user_id, nickname, text, ts }
  var viewCount = RECENT_DEFAULT;
  var initialLoadedFromSheet = false;  // (호환) 사용하지 않음
  var lastSheetLoadedAt = 0;

  var originalHandleUserSubmit = null;
  var waitingFirstReply = false;  // 내가 방금 쓴 글에 대한 첫 답글을 기다리는지 여부

  function ensureFirebase() {
    try {
      if (firebaseDb && firebaseRef) return firebaseDb;

      if (typeof firebase === "undefined" || !firebase || !firebase.initializeApp) {
        console.warn("[social-chat] Firebase SDK 가 로드되지 않았습니다.");
        return null;
      }
      if (!SOCIAL_CHAT_FIREBASE_CONFIG || !SOCIAL_CHAT_FIREBASE_CONFIG.apiKey) {
        console.warn("[social-chat] SOCIAL_CHAT_FIREBASE_CONFIG 가 설정되지 않았습니다.");
        return null;
      }

      if (firebase.apps && firebase.apps.length > 0) {
        firebaseApp = firebase.app();
      } else {
        firebaseApp = firebase.initializeApp(SOCIAL_CHAT_FIREBASE_CONFIG);
      }
      firebaseDb = firebase.database();
      firebaseRef = firebaseDb.ref("socialChat");
      return firebaseDb;
    } catch (e) {
      console.error("[social-chat] Firebase 초기화 실패:", e);
      return null;
    }
  }

  function getSafeNickname() {
    if (window.currentUser && window.currentUser.nickname) {
      return String(window.currentUser.nickname);
    }
    return "익명";
  }

  function getSafeUserId() {
    if (window.currentUser && window.currentUser.user_id) {
      return String(window.currentUser.user_id);
    }
    return "";
  }

  function logSocialToSheet(message, ts) {
    try {
      if (typeof postToSheet !== "function") return;
      var payload = {
        mode: "social_chat",
        user_id: getSafeUserId(),
        nickname: getSafeNickname(),
        message: message,
        ts: ts || Date.now()
      };
      var p = postToSheet(payload);
      if (p && typeof p.catch === "function") {
        p.catch(function (e) {
          console.warn("[social-chat] 소통 시트 기록 실패:", e);
        });
      }
    } catch (e) {
      console.warn("[social-chat] 소통 시트 기록 중 오류:", e);
    }
  }


  

async function loadRecentMessagesFromSheet(force) {
  // "마이파-톡"(전체 대화방) 화면은 시트에서 최신글을 불러옵니다.
  // force=true면 항상 다시 로드합니다.

  if (!force) {
    // 너무 잦은 호출 방지(짧은 디바운스)
    if (Date.now() - lastSheetLoadedAt < 250) return;
  }
  lastSheetLoadedAt = Date.now();

  if (typeof postToSheet !== "function") {
    console.warn("[social-chat] postToSheet 함수가 없어 최근 메시지를 불러올 수 없습니다.");
    return;
  }

  try {
    var res = await postToSheet({
      mode: "social_recent_room",
      room_id: "global",
      limit: MAX_BUFFER
    });
    if (!res || !res.ok) {
      console.warn("[social-chat] 최근 메시지 응답이 올바르지 않습니다.");
      return;
    }
    var text = await res.text();
    var json;
    try { json = JSON.parse(text); } catch (e) { return; }
    if (!json || !json.messages) return;

    socialMessages = [];
    (json.messages || []).forEach(function (row) {
      if (!row) return;
      var rawMsg = (row.text || row.chatlog || row.message || row.msg || "").toString();
      socialMessages.push({
        user_id: row.user_id || "",
        nickname: row.nickname || "익명",
        text: rawMsg,
        ts: row.ts || row.timestamp || row.date || 0
      });
    });

    if (socialMessages.length > MAX_BUFFER) {
      socialMessages = socialMessages.slice(socialMessages.length - MAX_BUFFER);
    }

    if (socialChatMode) {
      renderSocialMessages();
    }
  } catch (e) {
    console.warn("[social-chat] 최근 메시지 불러오기 실패:", e);
  }
}

  function renderSocialMessages() {
    if (!logEl || !socialChatMode) return;

    logEl.innerHTML = "";

    var total = socialMessages.length;
    if (total === 0) {
      var emptyDiv = document.createElement("div");
      emptyDiv.className = "log-line social";
      emptyDiv.textContent = "아직 올라온 소통 메시지가 없어요. 먼저 말을 걸어 볼래요?";
      logEl.appendChild(emptyDiv);
      return;
    }

    var limit = viewCount;
    if (limit > RECENT_EXPANDED) limit = RECENT_EXPANDED;
    if (limit < 1) limit = 1;

    var start = total - limit;
    if (start < 0) start = 0;

    for (var i = start; i < total; i++) {
      var msg = socialMessages[i];
      var div = document.createElement("div");
      div.className = "log-line social";

      var roleSpan = document.createElement("span");
      roleSpan.className = "role";
      roleSpan.textContent = (msg.nickname || "익명") + ": ";

            var textSpan = document.createElement("span");
      if (typeof renderTextWithEmojis === "function") {
        renderTextWithEmojis(msg.text || "", textSpan);
      } else {
        textSpan.textContent = msg.text || "";
      }

      div.appendChild(roleSpan);
      div.appendChild(textSpan);
      logEl.appendChild(div);
    }

    logEl.scrollTop = logEl.scrollHeight;
  }

  function onLogScroll() {
    if (!socialChatMode || !logEl) return;
    try {
      var nearTop = logEl.scrollTop <= 0;
      var nearBottom = (logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight) <= 2;

      if (nearTop && viewCount < RECENT_EXPANDED) {
        viewCount = RECENT_EXPANDED;
        renderSocialMessages();
      } else if (nearBottom && viewCount > RECENT_DEFAULT) {
        viewCount = RECENT_DEFAULT;
        renderSocialMessages();
      }
    } catch (e) {
      console.warn("[social-chat] onLogScroll 오류:", e);
    }
  }


  // 이모티콘 전용 메시지인지 확인하는 헬퍼
  function isEmojiOnlyMessage(text) {
    if (!text) return false;
    var t = String(text).trim();
    if (!t) return false;
    // :e1: ~ :e12: 패턴만 남기고 나머지를 제거해서 확인
    var stripped = t.replace(/:e(0?[1-9]|1[0-2]):/g, "").trim();
    return stripped.length === 0;
  }

  function handleIncomingMessage_(msg) {
    // 배열에 추가 (브라우저 메모리에서만 유지)
    socialMessages.push(msg);
    if (socialMessages.length > MAX_BUFFER) {
      socialMessages.splice(0, socialMessages.length - MAX_BUFFER);
    }

    // 내가 방금 쓴 글에 대해 첫 번째로 도착한 다른 사람의 답글이라면 읽어주기
    var myId = getSafeUserId();
    if (waitingFirstReply && msg.user_id && myId && msg.user_id !== myId) {
      waitingFirstReply = false;
      try {
        var name = (typeof currentCharacterName === "string" && currentCharacterName.trim())
          ? currentCharacterName.trim()
          : "웹 고스트";
        if (typeof showBubble === "function") {
          var bubbleText = msg.text || "";
          if (isEmojiOnlyMessage(bubbleText)) {
            var patterns = [
              "이모티콘을 보냈어요.",
              "이모티콘이네요.",
              "이모티콘으로 대답했어요."
            ];
            var idx = Math.floor(Math.random() * patterns.length);
            bubbleText = patterns[idx];
          }
          showBubble(name + " : " + bubbleText);
        }
      } catch (e) {
        console.warn("[social-chat] showBubble 호출 중 오류:", e);
      }
    }

    if (socialChatMode) {
      renderSocialMessages();
    }
  }

  function startListening() {
    var db = ensureFirebase();
    if (!db || !firebaseRef) return;

    // child_added 로 새 메시지만 받고, 처리 후 즉시 삭제
    firebaseRef.limitToLast(MAX_BUFFER).on("child_added", function (snapshot) {
      var val = snapshot.val() || {};
      var msg = {
        key: snapshot.key,
        user_id: val.user_id || "",
        nickname: val.nickname || "익명",
        text: val.text || "",
        ts: val.ts || 0
      };

      handleIncomingMessage_(msg);

      // Firebase 에는 기록이 남지 않도록 즉시 삭제
      try {
        snapshot.ref.remove();
      } catch (e) {
        console.warn("[social-chat] snapshot 제거 중 오류:", e);
      }
    });
  }

  function sendSocialMessage(text) {
    var trimmed = (text || "").trim();
    if (!trimmed) return;

    if (!window.currentUser || !window.currentUser.user_id) {
      if (typeof showBubble === "function") {
        showBubble("소통 채팅을 쓰려면 먼저 로그인해 주세요.");
      }
      if (typeof openLoginPanel === "function") {
        try { openLoginPanel(); } catch (e) {}
      }
      return;
    }

    var db = ensureFirebase();
    if (!db || !firebaseRef) {
      if (typeof showBubble === "function") {
        showBubble("소통 서버와 연결되지 않았어요. 잠시 후 다시 시도해 주세요.");
      }
      return;
    }

    var now = Date.now();
    var payload = {
      user_id: getSafeUserId(),
      nickname: getSafeNickname(),
      text: trimmed,
      ts: now
    };

    waitingFirstReply = true;

    try {
      firebaseRef.push(payload, function (err) {
        if (err) {
          console.error("[social-chat] 메시지 전송 실패:", err);
          if (typeof showBubble === "function") {
            showBubble("소통 메시지를 보내는 동안 문제가 생겼어요.");
          }
        }
      });
    } catch (e) {
      console.error("[social-chat] 메시지 전송 중 오류:", e);
      if (typeof showBubble === "function") {
        showBubble("소통 메시지를 보내는 동안 문제가 생겼어요.");
      }
    }

    // 시트 기록은 별도로, 실패하더라도 채팅에는 영향 없게
    logSocialToSheet(trimmed, now);

    if (userInput) {
      userInput.value = "";
    }
  }

  
  function updatePlusSocialButtonLabel() {
    try {
      var btn = document.querySelector('#plusMenu button[data-action="social"]');
      if (!btn) return;
      if (socialChatMode) {
        btn.textContent = "💬 캐릭터-톡";
      } else {
        btn.textContent = "💬 마이파-톡";
      }
    } catch (e) {
      // ignore
    }
  }

function setModeSocial(enabled) {
    socialChatMode = !!enabled;
    viewCount = RECENT_DEFAULT;

    if (!chatPanel || !logEl) return;

    if (socialChatMode) {
      chatPanel.classList.add("chat-panel-social");
      loadRecentMessagesFromSheet(true);
      renderSocialMessages();
      try {
        var name = (typeof currentCharacterName === "string" && currentCharacterName.trim())
          ? currentCharacterName.trim()
          : "웹 고스트";
        if (typeof showBubble === "function") {
          showBubble('지금은 "소통 모드"예요. 여기 적는 말은 ' + name + "와 함께 보고 있어요.");
        }
      } catch (e) {}
    } else {
      chatPanel.classList.remove("chat-panel-social");
      logEl.innerHTML = "";
      try {
        var name2 = (typeof currentCharacterName === "string" && currentCharacterName.trim())
          ? currentCharacterName.trim()
          : "웹 고스트";
        if (typeof showBubble === "function") {
          showBubble("다시 " + name2 + "와의 대화 모드로 돌아왔어요.");
        }
      } catch (e) {}
    }
    updatePlusSocialButtonLabel();
  }

  function toggleMode() {
    setModeSocial(!socialChatMode);
  }

  function patchHandleUserSubmit() {
    if (typeof window.handleUserSubmit !== "function") return;
    if (originalHandleUserSubmit) return;

    originalHandleUserSubmit = window.handleUserSubmit;

    window.handleUserSubmit = async function () {
      if (!socialChatMode) {
        return originalHandleUserSubmit();
      }

      var inputEl = userInput || document.getElementById("userInput");
      var text = "";
      if (inputEl && typeof inputEl.value === "string") {
        text = inputEl.value;
      }
      sendSocialMessage(text);
    };
  }

    function initSocialChat() {
    try {
      chatPanel = document.getElementById("chatPanel");
      logEl = document.getElementById("log");
      userInput = document.getElementById("userInput");
      toggleBtn = document.getElementById("socialToggleBtn");

      if (!chatPanel || !logEl || !userInput || !toggleBtn) {
        return;
      }

      toggleBtn.classList.add("social-toggle-btn");
      updatePlusSocialButtonLabel();

      // 짧게 누르면 모드만 전환 (크기 조절은 채팅창 상단 드래그로 처리)
      toggleBtn.addEventListener("click", function (e) {
        try { e.stopPropagation(); } catch (err) {}
        toggleMode();
      });

      // 위/아래 스크롤에 따른 메시지 개수 조정
      logEl.addEventListener("scroll", onLogScroll);

      // 채팅창 상단 드래그로 높이 조절 (버튼이 아닌 상단 영역 전체)
      (function () {
        var dragState = {
          isDown: false,
          dragging: false,
          startY: 0,
          startHeight: 0
        };
        var MIN_H = 240;
        var MAX_H = 420;
        var MOVE_THRESHOLD = 3;
        function isInteractiveTarget(ev) {
          var el = ev && ev.target;
          while (el && el !== chatPanel) {
            var tag = (el.tagName || "").toLowerCase();
            if (tag === "button" || tag === "a" || tag === "input" || tag === "textarea" || tag === "select") {
              return true;
            }
            if (el.getAttribute && el.getAttribute("data-no-drag") === "1") {
              return true;
            }
            el = el.parentElement;
          }
          return false;
        }


        function getMaxHeight() {
          var h = 0;
          if (logEl.style && logEl.style.maxHeight) {
            h = parseInt(logEl.style.maxHeight, 10);
          }
          if (!h || isNaN(h)) {
            try {
              var cs = window.getComputedStyle ? window.getComputedStyle(logEl) : null;
              if (cs && cs.maxHeight && cs.maxHeight !== "none") {
                h = parseInt(cs.maxHeight, 10);
              }
            } catch (e) {}
          }
          if (!h || isNaN(h)) h = MIN_H;
          return h;
        }

        function getClientY(ev) {
          if (ev.touches && ev.touches.length > 0) {
            return ev.touches[0].clientY;
          }
          if (ev.changedTouches && ev.changedTouches.length > 0) {
            return ev.changedTouches[0].clientY;
          }
          return ev.clientY;
        }

        function updateViewCountForHeight(h) {
          try {
            var span = MAX_H - MIN_H;
            if (span <= 0) {
              viewCount = RECENT_DEFAULT;
            } else {
              var ratio = (h - MIN_H) / span;
              if (ratio < 0) ratio = 0;
              if (ratio > 1) ratio = 1;
              var extra = Math.round(ratio * (RECENT_EXPANDED - RECENT_DEFAULT));
              viewCount = RECENT_DEFAULT + extra;
            }
            if (socialChatMode) {
              renderSocialMessages();
            }
          } catch (e) {}
        }

        function onDown(ev) {
          // 채팅창 상단 20px 영역에서만 반응
          var rect = chatPanel.getBoundingClientRect();
          var y = getClientY(ev);
          if (y > rect.top + 40) return;
          if (isInteractiveTarget(ev)) return;

          dragState.isDown = true;
          dragState.dragging = false;
          dragState.startY = y;
          dragState.startHeight = getMaxHeight();
        }

        function onMove(ev) {
          if (!dragState.isDown) return;
          var y = getClientY(ev);
          var dy = dragState.startY - y;
          if (!dragState.dragging && Math.abs(dy) > MOVE_THRESHOLD) {
            dragState.dragging = true;
          }
          if (!dragState.dragging) return;

          try { ev.preventDefault(); } catch (e) {}
          var target = dragState.startHeight + dy;
          if (target < MIN_H) target = MIN_H;
          if (target > MAX_H) target = MAX_H;

          if (logEl && logEl.style) {
            logEl.style.maxHeight = target + "px";
          }
          updateViewCountForHeight(target);
        }

        function onUp(ev) {
          if (!dragState.isDown) return;
          dragState.isDown = false;
          dragState.dragging = false;
        }

        chatPanel.addEventListener("mousedown", onDown);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);

        chatPanel.addEventListener("touchstart", onDown, { passive: false });
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("touchend", onUp);
        window.addEventListener("touchcancel", onUp);
      })();

      // 플러스(+) 메뉴에서 사용할 전역 토글 함수
      window.toggleSocialChatMode = function () {
        toggleMode();
      };

      patchHandleUserSubmit();


// signals 기반으로 "전체 대화방(global)" 실시간 갱신
try {
  if (window.SignalBus && typeof window.SignalBus.attach === "function") {
    var dbSig = ensureFirebase();
    if (dbSig) {
      window.SignalBus.attach({
        db: firebaseDb,
        getMyId: function () { return getSafeUserId(); },
        onSignal: function (info) {
          try {
            if (!socialChatMode) return;
            if (!info || info.roomId !== "global") return;
            loadRecentMessagesFromSheet(false);
          } catch (e0) {}
        },
        onNotify: function () {}
      });
      if (typeof window.SignalBus.syncRooms === "function") {
        window.SignalBus.syncRooms(["global"], "social-chat-global");
      }
    }
  }
} catch (eSig) {}
      startListening();

      console.log("[social-chat] 소통 채팅 모듈이 초기화되었습니다.");
    } catch (e) {
      console.error("[social-chat] 초기화 중 오류:", e);
    }
  }


  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(initSocialChat, 0);
  } else {
    window.addEventListener("DOMContentLoaded", initSocialChat);
  }
})();