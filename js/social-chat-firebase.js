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
  // [보안] 공개 repo 커밋에는 apiKey를 올리지 않습니다.
  // apiKey는 "__FIREBASE_API_KEY__"로 두고, GitHub Actions 배포 시점에 Secrets(FIREBASE_API_KEY)로 치환합니다.
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

  var MAX_BUFFER = 100;           

// ---- fix28: robust ts parse + sheet<->relay dedupe helpers ----
function __parseTs(v) {
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

function __sigOf(user_id, text) {
  return String(user_id || "") + "|" + String(text || "").trim();
}

function __buildRelayMidIndex(list) {
  // map: sig|bucket -> mid (bucket = 5s)
  var idx = {};
  try {
    (list || []).forEach(function (m) {
      if (!m || !m.mid) return;
      var ts = __parseTs(m.ts || 0);
      var b = Math.floor(ts / 5000);
      var sig = __sigOf(m.user_id, m.text);
      // store a small neighborhood to be tolerant to ts drift between relay and sheet
      for (var d = -2; d <= 2; d++) {
        var k = sig + "|" + String(b + d);
        if (!idx[k]) idx[k] = String(m.mid);
      }
    });
  } catch (e) {}
  return idx;
}

function __tryAttachMidFromRelayIndex(m, idx) {
  try {
    if (!m || m.mid) return;
    var ts = __parseTs(m.ts || 0);
    var b = Math.floor(ts / 5000);
    var sig = __sigOf(m.user_id, m.text);
    var deltas = [0, -1, 1, -2, 2, -3, 3];
    for (var i = 0; i < deltas.length; i++) {
      var k = sig + "|" + String(b + deltas[i]);
      if (idx[k]) {
        m.mid = idx[k];
        return;
      }
    }
  } catch (e) {}
}
// ---- end fix28 helpers ----

// 브라우저에서만 보관할 최대 메시지 수
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

// ------------------------------------------------------------
// (B안) Firebase( SignalBus /signals/<room>/q )를 '중계'로만 사용
// - 시트 저장과 별개로 즉시 전파하여 체감 속도 개선
// - mid 기반 디듀프/리트랙트(retract) 지원
// ------------------------------------------------------------
var __relaySeen = {};
var __relaySeenOrder = [];
var __RELAY_SEEN_MAX = 260;

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
    for (var i = socialMessages.length - 1; i >= 0; i--) {
      var it = socialMessages[i];
      if (!it) continue;
      if (String(it.mid || "") === mid) {
        socialMessages.splice(i, 1);
        removed = true;
      }
    }
    if (removed && socialChatMode) renderSocialMessages();
    return removed;
  } catch (e) { return false; }
}

function __applyRelayGlobal(msgInfo) {
  try {
    if (!msgInfo || msgInfo.roomId !== "global") return;

    // retract 처리
    if (String(msgInfo.kind || "") === "retract") {
      __removeByMid(msgInfo.mid || "");
      return;
    }

    var mid = msgInfo.mid || "";
    if (mid && __hasRelay(mid)) return;
    if (mid) __rememberRelay(mid);

    var msg = {
      user_id: msgInfo.user_id || "",
      nickname: msgInfo.nickname || "익명",
      text: msgInfo.text || "",
      ts: msgInfo.ts || Date.now(),
      mid: mid
    };

    // 소통 모드일 때만 화면에 즉시 반영
    if (socialChatMode) {
      handleIncomingMessage_(msg);
      try {
        if (window.SignalBus && typeof window.SignalBus.markSeenTs === "function") {
          window.SignalBus.markSeenTs("global", msg.ts);
        }
      } catch (eSeen) {}
    } else {
      // 모드가 아니어도 버퍼에는 쌓아두되, MAX_BUFFER 유지
      socialMessages.push(msg);
      if (socialMessages.length > MAX_BUFFER) socialMessages.splice(0, socialMessages.length - MAX_BUFFER);
    }
  } catch (e) {}
}

  var originalHandleUserSubmit = null;
  var waitingFirstReply = false;  // 내가 방금 쓴 글에 대한 첫 답글을 기다리는지 여부

  function ensureFirebase() {
    try {
      if (firebaseDb) return firebaseDb;

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
      firebaseRef = null; // (B안) 저장용 ref 사용 안 함(중계는 SignalBus가 담당)
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

function logSocialToSheet(message, ts, mid) {
  try {
    if (typeof postToSheet !== "function") return Promise.resolve(true);

    var base = {
      user_id: getSafeUserId(),
      nickname: getSafeNickname(),
      message: message,
      text: message,
      ts: ts || Date.now(),
      mid: mid || ""
    };

    // 우선 room 방식(현재 메신저와 동일)을 시도
    var payload1 = { mode: "social_chat_room", room_id: "global" };
    try { for (var k1 in base) { if (Object.prototype.hasOwnProperty.call(base, k1)) payload1[k1] = base[k1]; } } catch (e0) {}
    var p1 = postToSheet(payload1);
    return Promise.resolve(p1).then(function (res) {
      if (res && res.ok) return true;
      throw new Error("sheet not ok");
    }).catch(function () {
      // 호환: 기존 social_chat 모드 fallback
      try {
        var payload2 = { mode: "social_chat" };
        try { for (var k2 in base) { if (Object.prototype.hasOwnProperty.call(base, k2)) payload2[k2] = base[k2]; } } catch (e1) {}
        var p2 = postToSheet(payload2);
        return Promise.resolve(p2).then(function (res2) {
          return !!(res2 && res2.ok);
        }).catch(function () { return false; });
      } catch (e2) {
        return false;
      }
    });
  } catch (e) {
    return Promise.resolve(false);
  }
}



  

async function loadRecentMessagesFromSheet(force) {
  // "마이파-톡"(전체 대화방) 화면은 시트에서 최신글을 불러옵니다.
  // (B안) 실시간 표시는 Firebase 중계로 즉시 반영되고,
  // 시트 로딩은 "정렬/누락 보정" 용도로만 사용합니다(merge, 덮어쓰기 금지).

  if (!force) {
    // 너무 잦은 호출 방지(짧은 디바운스)
    if (Date.now() - lastSheetLoadedAt < 350) return;
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

    var sheetList = [];
    (json.messages || []).forEach(function (row) {
      if (!row) return;
      var rawMsg = (row.text || row.chatlog || row.message || row.msg || "").toString();
      sheetList.push({
        user_id: row.user_id || "",
        nickname: row.nickname || "익명",
        text: rawMsg,
        ts: __parseTs(row.ts || row.timestamp || row.date || 0),
        mid: row.mid || row.message_id || row.id || ""
      });
    });

    // merge (기존 relay 메시지를 유지 + 시트 내용을 합치기)
    var __relayIdx = __buildRelayMidIndex(socialMessages);
    // 시트에 mid가 없더라도(스크립트가 저장하지 않는 경우) relay에서 온 동일 메시지를 찾아 mid를 붙여 중복을 막습니다.
    sheetList.forEach(function(m){ __tryAttachMidFromRelayIndex(m, __relayIdx); });

    var map = {};
    function keyOf(m) {
      var mid = (m && m.mid) ? String(m.mid) : "";
      if (mid) return "m:" + mid;
      return "k:" + String(m.user_id || "") + "|" + String(m.nickname || "") + "|" + String(m.text || "") + "|" + String(m.ts || 0);
    }

    // 기존(릴레이 포함) 먼저 넣고
    (socialMessages || []).forEach(function (m) {
      if (!m) return;
      map[keyOf(m)] = m;
    });

    // 시트 값으로 덮어쓰되(정답 우선), 기존 릴레이(mid 있음)와도 병합
    sheetList.forEach(function (m) {
      if (!m) return;
      map[keyOf(m)] = m;
    });

    var merged = Object.keys(map).map(function (k) { return map[k]; });

    merged.sort(function (a, b) {
      return Number(a.ts || 0) - Number(b.ts || 0);
    });

    if (merged.length > MAX_BUFFER) {
      merged = merged.slice(merged.length - MAX_BUFFER);
    }

    socialMessages = merged;

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
    // (B안) Firebase 직접 채팅경로(socialChat)를 구독하지 않습니다.
    // 중계는 SignalBus(/signals/global/q)의 onMessage로 수신합니다.
    return;
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
  if (!db) {
    if (typeof showBubble === "function") {
      showBubble("소통 서버와 연결되지 않았어요. 잠시 후 다시 시도해 주세요.");
    }
    return;
  }

  var now = Date.now();
  var __mid = "g_" + now + "_" + Math.random().toString(16).slice(2);

  var payload = {
    user_id: getSafeUserId(),
    nickname: getSafeNickname(),
    text: trimmed,
    ts: now,
    mid: __mid
  };

  waitingFirstReply = true;

  // 낙관적 렌더 + Firebase signals 큐로 즉시 중계
  try {
    // 내 화면 즉시 반영
    handleIncomingMessage_(payload);

    // (중요) 내가 push한 이벤트가 내 리스너로 다시 돌아올 때
    // 한 번 더 그려지는(2번 표시되는) 문제를 막기 위해
    // push 전에 mid를 relay-seen에 등록합니다.
    try { __rememberRelay(__mid); } catch (e0) {}

    // 중계(저장 X)
    if (window.SignalBus && typeof window.SignalBus.push === "function") {
      window.SignalBus.push("global", {
        kind: "chat",
        mid: __mid,
        room_id: "global",
        user_id: payload.user_id,
        nickname: payload.nickname,
        text: payload.text,
        ts: now
      });
    }

    // 내 ts 갱신(알림 오탐 방지)
    if (window.SignalBus && typeof window.SignalBus.markMyTs === "function") {
      window.SignalBus.markMyTs("global", now);
    }
    if (window.SignalBus && typeof window.SignalBus.markSeenTs === "function") {
      window.SignalBus.markSeenTs("global", now);
    }
  } catch (e) {
    console.error("[social-chat] 중계 처리 중 오류:", e);
  }

  // 시트 기록은 별도로, 실패 시 retract
  logSocialToSheet(trimmed, now, __mid).then(function (ok) {
    if (ok) return;
    // 시트 기록 실패 시: 다른 클라이언트에 취소(retract) + 내 화면도 롤백
    try {
      if (window.SignalBus && typeof window.SignalBus.push === "function") {
        window.SignalBus.push("global", { kind: "retract", mid: __mid, room_id: "global", user_id: getSafeUserId(), ts: Date.now() });
      }
    } catch (eR) {}
    try {
      // 내 화면 롤백
      for (var i = socialMessages.length - 1; i >= 0; i--) {
        var it = socialMessages[i];
        if (!it) continue;
        if (String(it.mid || "") === String(__mid)) {
          socialMessages.splice(i, 1);
        }
      }
      if (socialChatMode) renderSocialMessages();
    } catch (eL) {}
    if (typeof showBubble === "function") {
      showBubble("소통 메시지를 보내는 동안 문제가 생겼어요.");
    }
  });

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
          // 큐 기반 중계(onMessage)가 기본.
          // onSignal은 '누락 보정' 용도로만 시트 merge를 가볍게 호출합니다.
          try {
            if (!socialChatMode) return;
            if (!info || info.roomId !== "global") return;
            loadRecentMessagesFromSheet(false);
          } catch (e0) {}
        },
        onMessage: function (msgInfo) {
          try { __applyRelayGlobal(msgInfo); } catch (e1) {}
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
