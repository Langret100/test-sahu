/* ============================================================
   [pwa-manager.js] PWA 설치 + 앱 배지 관리
   ------------------------------------------------------------
   - Service Worker 등록
   - 홈화면 추가 버튼 (프로필 설정 모달에서 호출)
   - 앱 배지: 내가 들어간 방에 새 글 오면 카톡처럼 빨간 숫자
   - 배지 카운트: localStorage로 방별 미확인 수 관리
   ============================================================ */

(function () {
  if (window.PwaManager) return;

  // 루트(index.html)에서 로드되는 경우 ./sw.js, games/ 하위이면 ../sw.js 자동 선택
  var SW_PATH = location.pathname.indexOf("/games/") > -1 ? "../sw.js" : "./sw.js";
  var LS_UNREAD = "ghostUnreadCounts_v1";  // { roomId: count }
  var swReg = null;
  var deferredPrompt = null; // beforeinstallprompt 이벤트

  /* ── Service Worker 등록 ──
   * games/ 하위에서 ../sw.js 등록 시 scope 충돌 방지:
   * 이미 등록된 SW가 있으면 재사용, 없으면 scope 없이 등록
   */
  function registerSW() {
    if (!("serviceWorker" in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.getRegistrations().then(function (regs) {
      for (var i = 0; i < regs.length; i++) {
        var r = regs[i];
        var sw = r.active || r.installing || r.waiting;
        if (sw && sw.scriptURL && sw.scriptURL.indexOf("sw.js") > -1) {
          swReg = r;
          console.log("[PWA] 기존 SW 재사용:", sw.scriptURL);
          return r;
        }
      }
      // 기존 SW 없으면 등록 시도
      var _swScope = (function() {
        try { return new URL("../", location.href).pathname; } catch(e) { return "/"; }
      })();
      return navigator.serviceWorker.register(SW_PATH, { scope: _swScope })
        .then(function (reg) {
          swReg = reg;
          console.log("[PWA] SW 신규 등록:", reg.scope);
          return reg;
        })
        .catch(function (e) {
          console.warn("[PWA] SW 등록 실패:", e.message || e);
          return null;
        });
    }).catch(function (e) {
      console.warn("[PWA] SW 조회 실패:", e.message || e);
      return null;
    });
  }

  /* ── 홈화면 추가 가능 여부 ── */
  function canInstall() {
    return !!deferredPrompt;
  }

  /* ── 홈화면 추가 요청 ── */
  function install() {
    // Android/PC Chrome: beforeinstallprompt 이벤트 캐치된 경우 → 즉시 설치 프롬프트
    if (deferredPrompt) {
      var p = deferredPrompt;
      deferredPrompt = null;
      p.prompt();
      return p.userChoice.then(function (result) {
        return result.outcome; // "accepted" | "dismissed"
      });
    }

    // iOS Safari
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      showIosInstallGuide();
      return Promise.resolve("ios_guide");
    }

    // beforeinstallprompt 아직 안 온 경우:
    // PWA 조건(HTTPS + SW + manifest) 충족 여부에 따라 안내 분기
    var isHttps = location.protocol === "https:";
    var hasSW   = "serviceWorker" in navigator;
    if (isHttps && hasSW) {
      // 조건은 갖춰진 상태 → Chrome이 아직 판단 중이거나 이미 설치됨
      // Chrome 주소창 우측 설치 아이콘(⊕)을 직접 클릭하도록 시각 안내
      showChrombarInstallGuide();
      return Promise.resolve("guide_shown");
    }

    // 조건 미충족(HTTP 등)
    showGenericInstallGuide();
    return Promise.resolve("guide_shown");
  }

  /* 일반 브라우저 설치 안내 */
  /* 공통 안내 박스 생성 헬퍼 */
  function _makeGuideBox(id, steps) {
    var existing = document.getElementById(id);
    if (existing) { existing.style.display = "flex"; return; }

    var overlay = document.createElement("div");
    overlay.id = id;
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.5);";

    var box = document.createElement("div");
    box.style.cssText = [
      "width:100%;max-width:480px;",
      "background:#1e293b;color:#fff;",
      "padding:20px 20px 36px;",
      "border-radius:24px 24px 0 0;",
      "display:flex;flex-direction:column;gap:14px;",
      "box-shadow:0 -4px 40px rgba(0,0,0,0.4);"
    ].join("");

    var stepsHtml = steps.map(function (s, i) {
      return [
        "<div style='display:flex;gap:12px;align-items:flex-start;'>",
        "  <div style='flex:0 0 auto;width:26px;height:26px;border-radius:50%;",
        "    background:#3b82f6;display:flex;align-items:center;justify-content:center;",
        "    font-size:13px;font-weight:800;margin-top:1px;'>" + (i + 1) + "</div>",
        "  <div style='flex:1;font-size:14px;line-height:1.6;color:#e2e8f0;'>" + s + "</div>",
        "</div>"
      ].join("");
    }).join("");

    box.innerHTML = [
      "<div style='display:flex;justify-content:space-between;align-items:center;'>",
      "  <span style='font-size:16px;font-weight:800;'>📱 홈화면에 앱 추가하기</span>",
      "  <button onclick=\"document.getElementById('" + id + "').remove()\" ",
      "    style='border:0;background:rgba(255,255,255,0.1);color:#fff;font-size:16px;",
      "    cursor:pointer;width:32px;height:32px;border-radius:8px;'>✕</button>",
      "</div>",
      "<div style='height:1px;background:rgba(255,255,255,0.1);'></div>",
      stepsHtml,
      "<div style='display:flex;justify-content:center;margin-top:4px;'>",
      "  <div style='width:40px;height:4px;border-radius:2px;background:#475569;'></div>",
      "</div>"
    ].join("");

    overlay.appendChild(box);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  /* Chrome 주소창 설치 아이콘 직접 안내 (beforeinstallprompt 대기 중일 때) */
  function showChrombarInstallGuide() {
    var isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid) {
      _makeGuideBox("androidChrombarGuide", [
        "Chrome 주소창 오른쪽 끝 <b>점 세 개 메뉴(⋮)</b>를 탭하세요.",
        "<b>'앱 설치'</b> 또는 <b>'홈 화면에 추가'</b>를 탭하세요.",
        "<b>'설치'</b>를 탭하면 완료!<br><span style='color:#94a3b8;font-size:12px;'>메뉴에 없으면 페이지를 새로고침 후 다시 시도해 주세요.</span>"
      ]);
    } else {
      _makeGuideBox("pcChrombarGuide", [
        "Chrome 주소창 오른쪽 끝 <b>⊕ 설치 아이콘</b>을 클릭하세요.<br><span style='color:#94a3b8;font-size:12px;'>아이콘이 안 보이면 페이지를 새로고침(F5) 후 다시 시도해 주세요.</span>",
        "<b>'마이파이 설치'</b>를 클릭하세요.",
        "<b>'설치'</b>를 클릭하면 완료!<br><span style='color:#94a3b8;font-size:12px;'>바탕화면과 작업표시줄에 아이콘이 생깁니다.</span>"
      ]);
    }
  }

  function showGenericInstallGuide() {
    var isAndroid = /android/i.test(navigator.userAgent);

    if (isAndroid) {
      _makeGuideBox("androidInstallGuide", [
        "화면 오른쪽 위 <b>점 세 개 메뉴(⋮)</b>를 탭하세요.",
        "<b>'홈 화면에 추가'</b> 또는 <b>'앱 설치'</b>를 탭하세요.",
        "확인 팝업에서 <b>'추가'</b>를 탭하면 완료!<br><span style='color:#94a3b8;font-size:12px;'>홈 화면에 마이메신저 아이콘이 생깁니다.</span>"
      ]);
    } else {
      // PC Chrome
      _makeGuideBox("pcInstallGuide", [
        "Chrome 주소창 오른쪽 끝 <b>⊕ 아이콘</b>을 클릭하세요.<br><span style='color:#94a3b8;font-size:12px;'>(아이콘이 없으면 아직 설치 조건 미충족 — 잠시 후 다시 시도)</span>",
        "<b>'마이메신저 설치'</b>를 클릭하세요.",
        "<b>'설치'</b> 버튼을 클릭하면 완료!<br><span style='color:#94a3b8;font-size:12px;'>바탕화면과 작업표시줄에 아이콘이 생깁니다.</span>"
      ]);
    }
  }

  /* iOS Safari 설치 안내 */
  function showIosInstallGuide() {
    _makeGuideBox("iosInstallGuide", [
      "<b>Safari</b> 브라우저로 접속하세요.<br><span style='color:#94a3b8;font-size:12px;'>Chrome, 카카오 브라우저 등에서는 홈화면 추가가 안 됩니다.</span>",
      "화면 하단 가운데 <b>공유 버튼 ⎋</b> 을 탭하세요.<br><span style='color:#94a3b8;font-size:12px;'>(네모 위에 화살표 모양 아이콘)</span>",
      "스크롤을 내려 <b>'홈 화면에 추가'</b>를 탭하세요.",
      "오른쪽 위 <b>'추가'</b>를 탭하면 완료!<br><span style='color:#94a3b8;font-size:12px;'>홈 화면에 마이메신저 아이콘이 생깁니다.</span>"
    ]);
  }

  /* ── 앱 배지 (미확인 메시지 수) ── */

  function getUnreadCounts() {
    try { return JSON.parse(localStorage.getItem(LS_UNREAD) || "{}"); } catch (e) { return {}; }
  }
  function saveUnreadCounts(obj) {
    try { localStorage.setItem(LS_UNREAD, JSON.stringify(obj || {})); } catch (e) {}
  }

  /* 특정 방 미확인 수 증가 */
  function incrementUnread(roomId) {
    if (!roomId) return;
    var counts = getUnreadCounts();
    counts[roomId] = (counts[roomId] || 0) + 1;
    saveUnreadCounts(counts);
    _applyBadge();
    _updateRoomBadgeUI(roomId, counts[roomId]);
  }

  /* 특정 방 미확인 초기화 (입장 시) */
  function clearUnread(roomId) {
    if (!roomId) return;
    var counts = getUnreadCounts();
    delete counts[roomId];
    saveUnreadCounts(counts);
    var total = getTotalUnread();
    _applyBadge();
    _updateRoomBadgeUI(roomId, 0);
    // SW IndexedDB 카운트를 항상 localStorage 합계로 동기화 (부분 읽기 포함)
    if (total === 0) {
      _postToSW({ type: "CLEAR_BADGE" });
      try { if (navigator.clearAppBadge) navigator.clearAppBadge(); } catch (e) {}
    } else {
      _postToSW({ type: "SET_BADGE", count: total });
    }
  }

  /* 전체 미확인 수 합산 */
  function getTotalUnread() {
    var counts = getUnreadCounts();
    return Object.keys(counts).reduce(function (sum, k) { return sum + (counts[k] || 0); }, 0);
  }

  /* SW에 메시지 전송 (controller 우선, swReg.active fallback) */
  function _postToSW(msg) {
    try {
      var sw = (navigator.serviceWorker && navigator.serviceWorker.controller)
               || (swReg && swReg.active)
               || null;
      if (sw) sw.postMessage(msg);
    } catch (e) {}
  }

  /* SW / relay 메시지 공통 처리 */
  function _handleSwMessage(d) {
    try {
      if (!d) return;
      if (d.type === "FCM_PUSH_RECEIVED" && d.roomId) {
        var counts = getUnreadCounts();
        counts[d.roomId] = (counts[d.roomId] || 0) + 1;
        saveUnreadCounts(counts);
        _updateRoomBadgeUI(d.roomId, counts[d.roomId]);
        _applyBadge();
      }
      if (d.type === "FCM_OPEN_ROOM" && d.roomId) {
        // ghost:open-room 이벤트는 수신자가 없음
        // games/ iframe의 social-messenger.js가 FCM_OPEN_ROOM을 직접 처리하므로
        // iframe을 찾아 postMessage로 전달
        try {
          var gameFrame = document.getElementById("gameFrame");
          if (gameFrame && gameFrame.contentWindow) {
            gameFrame.contentWindow.postMessage({ type: "FCM_OPEN_ROOM", roomId: d.roomId }, "*");
          }
        } catch (_eFrame) {}
      }
    } catch (e) {}
  }

  /* 앱 배지 실제 적용 */
  function _applyBadge() {
    var total = getTotalUnread();
    // 1) 직접 API - 가장 우선 (SW 없어도 동작, Chrome 81+/Android Chrome 지원)
    try {
      if (navigator.setAppBadge) {
        if (total > 0) {
          navigator.setAppBadge(total).catch(function(){});
        } else {
          navigator.clearAppBadge().catch(function(){});
        }
      }
    } catch (e) {}
    // 2) SW를 통한 배지 (fallback - 일부 브라우저는 SW 경유 필요)
    _postToSW({ type: "SET_BADGE", count: total });
    // 3) 탭 타이틀에도 표시 (모든 환경)
    try {
      var base = "마이파이";
      document.title = total > 0 ? ("(" + total + ") " + base) : base;
    } catch (e) {}
  }

  /* 방 목록 아이템의 배지 UI 갱신 */
  function _updateRoomBadgeUI(roomId, count) {
    try {
      var items = document.querySelectorAll('[data-room-id="' + roomId + '"]');
      items.forEach(function (item) {
        // 기존 RoomUnreadBadge가 만든 요소 재활용, 없으면 새로 생성
        var badge = item.querySelector(".room-unread-badge");
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "room-unread-badge";
          item.appendChild(badge);
        }
        if (count > 0) {
          badge.textContent = count > 99 ? "99+" : String(count);
          badge.classList.add("show");
        } else {
          badge.textContent = "";
          badge.classList.remove("show");
        }
      });
    } catch (e) {}
  }

  /* 모든 방 배지 UI 복원 (페이지 로드 시) */
  function restoreAllBadgeUI() {
    var counts = getUnreadCounts();
    Object.keys(counts).forEach(function (roomId) {
      _updateRoomBadgeUI(roomId, counts[roomId]);
    });
    _applyBadge();
  }

  /* ── 초기화 ── */
  function init() {
    // Service Worker 등록
    registerSW().then(function () {
      restoreAllBadgeUI();
      // SW 등록 완료 후 배지 재동기화
      setTimeout(function () {
        _applyBadge();
        // FCM 토큰 초기화 (login.js가 없는 환경 대응)
        // ghostUser가 아직 안 세팅됐을 수 있으므로 3회 재시도
        var _fcmTries = 0;
        function _tryFcmInit() {
          _fcmTries++;
          try {
            var userId = "";
            try {
              if (window.currentUser && window.currentUser.user_id) {
                userId = String(window.currentUser.user_id);
              } else {
                var raw = localStorage.getItem("ghostUser");
                if (raw) { var u = JSON.parse(raw); if (u && u.user_id) userId = String(u.user_id); }
              }
            } catch (e) {}

            if (userId && window.FcmPush && typeof window.FcmPush.init === "function") {
              window.FcmPush.init(userId);
              return; // 성공 시 재시도 중단
            }
          } catch (e) {}
          // userId 없으면 최대 3회, 2초 간격 재시도
          if (_fcmTries < 3) setTimeout(_tryFcmInit, 2000);
        }
        setTimeout(_tryFcmInit, 500);
      }, 1000);
    });

    // beforeinstallprompt 캐치 (Android Chrome 등)
    // ※ 이 이벤트는 페이지 로드 직후 발화하므로 모달이 아직 안 열렸을 수 있음
    //   → deferredPrompt에 저장해두고 모달 열릴 때 profile-manager.js가 canInstall()로 확인
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      // 모달이 이미 열려있으면 버튼 텍스트 즉시 갱신
      var btn = document.getElementById("pwaInstallBtn");
      if (btn && !btn.disabled) {
        btn.textContent = "📲 지금 바로 설치";
        btn.style.background = "#16a34a";
        btn.style.color = "#fff";
        btn.style.border = "1px solid #15803d";
      }
    });

    // 앱 설치 완료
    window.addEventListener("appinstalled", function () {
      deferredPrompt = null;
      var btn = document.getElementById("pwaInstallBtn");
      if (btn) btn.style.display = "none";
    });

    // 현재 방 입장 시 미확인 초기화 이벤트 리스닝
    window.addEventListener("ghost:room-entered", function (ev) {
      try {
        var roomId = ev.detail && ev.detail.roomId ? ev.detail.roomId : "";
        if (roomId) clearUnread(roomId);
      } catch (e) {}
    });

    // 앱이 백그라운드에서 포그라운드로 복귀할 때 배지 재동기화
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        // 현재 보고 있는 방의 배지가 쌓였으면 자동 초기화
        try {
          var activeRoom = localStorage.getItem("ghostActiveRoomId");
          if (activeRoom) clearUnread(activeRoom);
        } catch (e) {}
        _applyBadge();
      }
    });

    // SW로부터 FCM 푸시 수신 알림 (백그라운드 → 포그라운드 복귀 시)
    // 직접 SW 메시지 (최상위 페이지에서 실행될 때)
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", function (ev) {
        _handleSwMessage(ev.data);
      });
    }
    // iframe 안에서 parent→child postMessage relay (미나는 social-messenger.js가 직접 SW 메시지 처리)
    window.addEventListener("message", function (ev) {
      try {
        var d = ev && ev.data;
        if (!d || typeof d !== "object") return;
        // FCM 관련 타입만 처리, 나머지는 무시
        if (d.type !== "FCM_PUSH_RECEIVED" && d.type !== "FCM_OPEN_ROOM") return;
        _handleSwMessage(d);
      } catch (e) {}
    });
  }

  window.PwaManager = {
    install:          install,
    canInstall:       canInstall,
    incrementUnread:  incrementUnread,
    clearUnread:      clearUnread,
    getTotalUnread:   getTotalUnread,
    restoreAllBadgeUI: restoreAllBadgeUI,
    registerSW:       registerSW
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 0);
  }
})();
