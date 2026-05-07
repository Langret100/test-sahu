/* js/attendance-stamp.js - 출석 도장(주간) 모듈 (옵션 기능)
   - 일주일(일~토) 기준으로 7칸 출석 도장을 관리합니다.
   - 첫 로그인 시 오늘 요일 칸에 도장을 찍어 주고,
     수첩(메뉴)의 "출석 도장" 카드를 통해 언제든 확인할 수 있습니다.
   - 데이터는 Apps Script (attendance_weekly_status / attendance_weekly_stamp)와 연동합니다.
   - 이 파일을 삭제한다면:
     1) css/ghost.css 안의 출석 도장 스타일 블록과
     2) index.html 안의 attendance-stamp.js <script> 태그
     3) login.js / notebook-menu.js 안의 [옵션 기능] 출석 도장 연동 블록
     을 함께 삭제해도 됩니다.
*/
(function (window, document) {
  if (!window || !document) return;

  // Apps Script 엔드포인트: config.js의 SHEET_WRITE_URL 사용
  // SPREADSHEET_URL이 없으면 SHEET_WRITE_URL로 fallback
  var API = (typeof SHEET_WRITE_URL !== "undefined" && SHEET_WRITE_URL)
          || (typeof SPREADSHEET_URL !== "undefined" && SPREADSHEET_URL)
          || (window.SHEET_WRITE_URL)
          || "";

  
  var DAYS = ["일", "월", "화", "수", "목", "금", "토"];
  var hasShownToday = false;
  var lastAutoOpenTime = 0; // 자동 출석 패널 표시 시각(중복 오픈 방지용)
  var lastManualCloseTime = 0; // 사용자가 직접 닫은 시각(재오픈 방지용)

  function playStampSound() {
    try {
      if (!window.__ghostStampAudio) {
        window.__ghostStampAudio = new Audio("sounds/stamp.mp3");
      }
      var a = window.__ghostStampAudio;
      a.currentTime = 0;
      a.play().catch(function(){});
    } catch (e) {}
  }

  // 로컬 스토리지를 이용해 "하루 1번" 출석 제한과 마지막 출석 상태를 기록합니다.
  function getTodayKeyForUser(user) {
    if (!user || !user.user_id) return null;
    try {
      var d = new Date();
      var iso = d.toISOString().slice(0, 10); // YYYY-MM-DD
      return "attendanceStamped:" + user.user_id + ":" + iso;
    } catch (e) {
      return null;
    }
  }

  function saveLastDaysForUser(user, days) {
    if (!user || !user.user_id) return;
    if (!Array.isArray(days)) return;
    try {
      var key = "attendanceLastDays:" + user.user_id;
      window.localStorage && localStorage.setItem(key, JSON.stringify(days));
    } catch (e) {}
  }

  function loadLastDaysForUser(user) {
    if (!user || !user.user_id) return null;
    try {
      var key = "attendanceLastDays:" + user.user_id;
      var raw = window.localStorage && localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }


  function createOverlay() {
    var existing = document.getElementById("attendanceOverlay");
    if (existing) return existing;

    var overlay = document.createElement("div");
    overlay.id = "attendanceOverlay";
    overlay.className = "attendance-overlay";

    overlay.innerHTML =
      '<div class="attendance-backdrop"></div>' +
      '<div class="attendance-panel">' +
      '  <div class="attendance-header">📅 출석 도장</div>' +
      '  <div class="attendance-subtitle">일주일 출석 현황이에요.</div>' +
      '  <div class="attendance-grid">' +
      DAYS.map(function (d, i) {
        return (
          '<div class="attendance-cell" data-day-index="' +
          i +
          '">' +
          '  <div class="attendance-day-label">' +
          d +
          "</div>" +
          '  <div class="attendance-stamp-slot"></div>' +
          "</div>"
        );
      }).join("") +
      "  </div>" +
      '  <button type="button" class="attendance-close-btn">닫기</button>' +
      "</div>";

    document.body.appendChild(overlay);

    function closeAttendanceOverlay() {
      lastManualCloseTime = Date.now();
      overlay.classList.remove("open");
      setTimeout(function () {
        if (!overlay.classList.contains("open")) {
          overlay.style.display = "none";
        }
      }, 220);
    }

    overlay
      .querySelector(".attendance-backdrop")
      .addEventListener("click", closeAttendanceOverlay);

    overlay
      .querySelector(".attendance-close-btn")
      .addEventListener("click", closeAttendanceOverlay);

    return overlay;
  }

  function makeStampSVG() {
    var rot = Math.random() * 26 - 13;
    var dx = Math.random() * 10 - 5;
    var dy = Math.random() * 10 - 5;

    return (
      '<svg class="attendance-stamp-svg" width="60" height="60" viewBox="0 0 60 60" ' +
      'style="transform: translate(' +
      dx +
      "px, " +
      dy +
      "px) rotate(" +
      rot +
      'deg);">' +
      "  <g>" +
      '    <circle cx="30" cy="30" r="16" stroke="rgba(235,70,90,0.85)" stroke-width="3" fill="rgba(235,70,90,0.20)"></circle>' +
      '    <path d="M30 14 Q34 22 30 30 Q26 22 30 14" stroke="rgba(235,70,90,0.8)" stroke-width="2" fill="none"></path>' +
      '    <path d="M30 46 Q34 38 30 30 Q26 38 30 46" stroke="rgba(235,70,90,0.8)" stroke-width="2" fill="none"></path>' +
      '    <path d="M14 30 Q22 26 30 30 Q22 34 14 30" stroke="rgba(235,70,90,0.8)" stroke-width="2" fill="none"></path>' +
      '    <path d="M46 30 Q38 26 30 30 Q38 34 46 30" stroke="rgba(235,70,90,0.8)" stroke-width="2" fill="none"></path>' +
      "  </g>" +
      "</svg>"
    );
  }

  function renderDays(days) {
    var overlay = createOverlay();
    var cells = overlay.querySelectorAll(".attendance-cell");
    var stampedCount = 0;
    cells.forEach(function (cell, idx) {
      var slot = cell.querySelector(".attendance-stamp-slot");
      slot.innerHTML = "";
      var has = days && days[idx];
      if (has) {
        slot.innerHTML = makeStampSVG();
        stampedCount++;
      }
    });

    // 출석 도장 5일 이상 달성 시 코인 보너스 훅 호출
    try {
      if (window.CoinBonus && typeof window.CoinBonus.handleAttendanceWeek === "function") {
        window.CoinBonus.handleAttendanceWeek(stampedCount);
      }
    } catch (e) {}
  }

  function loadStatus(user) {
    if (!API || !user || !user.user_id) {
      return Promise.resolve({ days: [] });
    }
    var url =
      API +
      (API.indexOf("?") >= 0 ? "&" : "?") +
      "mode=attendance_weekly_status&user_id=" +
      encodeURIComponent(user.user_id) +
      "&t=" +
      Date.now();
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch(function () {
        return { days: [] };
      });
  }

  function stampToday(user) {
    if (!API || !user || !user.user_id) {
      return Promise.resolve(null);
    }

    // Apps Script로 보내는 출석 도장 찍기 요청
    // - 다른 기능과 마찬가지로 form-urlencoded 방식으로 보내서
    //   CORS preflight를 피합니다.
    var body = new URLSearchParams();
    body.append("mode", "attendance_weekly_stamp");
    body.append("user_id", user.user_id);
    body.append("username", user.username || "");

    return fetch(API, {
      method: "POST",
      body: body
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch(function () {
        return null;
      });
  }

  function openPanelWithLoad(user) {
    if (!user || !user.user_id) {
      if (typeof showBubble === "function") {
        try {
          showBubble("먼저 로그인해줘.");
        } catch (e) {}
      }
      return;
    }

    // 출석 도장 패널을 여는 동안 고스트가 멘트를 해서 대기 시간을 느끼지 않도록 함
    if (typeof showBubble === "function") {
      try {
        showBubble("오늘 출석 도장을 확인해볼게.");
      } catch (e) {}
    }

    loadStatus(user).then(function (status) {
      var days = (status && status.days) || [];

      // 서버 응답이 비어 있으면, 최근에 저장해 둔 로컬 출석 정보를 사용합니다.
      if ((!days || !days.length || !days.some(Boolean)) && typeof loadLastDaysForUser === "function") {
        var cached = loadLastDaysForUser(user);
        if (cached && cached.length) {
          days = cached;
        }
      }

      renderDays(days || []);
      var overlay = createOverlay();

      // 사용자가 방금 닫은 직후라면 자동 재오픈을 방지합니다.
      var now = Date.now();
      if (lastManualCloseTime && now - lastManualCloseTime < 600000) {
        return;
      }

      // display:none → display:flex 전환 후 transition을 위해 rAF 사용
      overlay.style.display = "flex";
      requestAnimationFrame(function () {
        overlay.classList.add("open");
      });

      // 패널을 열 때 사용한 출석 상태를 로컬에도 저장해 둡니다.
      // (모두 빈 값인 경우에는 기존에 저장된 기록을 덮어쓰지 않습니다.)
      if (typeof saveLastDaysForUser === "function") {
        if (Array.isArray(days) && days.some(Boolean)) {
          saveLastDaysForUser(user, days);
        }
      }
    });
  }

  // 첫 로그인 성공 시 자동 도장 + 패널 1회 표시
  function handleLoginEvent(ev) {
    var detail = (ev && ev.detail) || {};
    var user = detail.user || window.currentUser;
    if (!user || !user.user_id) return;

    // 같은 로그인 과정에서 중복으로 이벤트가 들어오는 경우를 방지합니다.
    var now = Date.now();
    if (lastAutoOpenTime && now - lastAutoOpenTime < 3000) {
      return;
    }
    lastAutoOpenTime = now;

    // 한 탭에서 이미 오늘 한 번 출석 패널을 보여줬다면 다시 열지 않습니다.
    if (hasShownToday) return;

    // 로컬 스토리지 기준으로도 "오늘 이미 출석 처리된 사용자"라면 자동 출석을 생략합니다.
    var dayKey = getTodayKeyForUser(user);
    try {
      if (dayKey && window.localStorage && localStorage.getItem(dayKey)) {
        hasShownToday = true;
        return;
      }
    } catch (e) {}

    loadStatus(user).then(function (status) {
      var daysBefore = (status && status.days) || [];
      var today = new Date();
      var dayIndex = today.getDay();
      var alreadyStamped = !!daysBefore[dayIndex];

      function afterStamp(res) {
        var days = (res && res.days) || daysBefore;
        renderDays(days || []);
        var overlay = createOverlay();
        overlay.style.display = "flex";
        requestAnimationFrame(function () { overlay.classList.add("open"); });
        hasShownToday = true;

        // 출석 상태를 로컬에도 저장해 둡니다.
        // (서버 응답이 비어 있으면 기존 기록을 덮어쓰지 않습니다.)
        if (typeof saveLastDaysForUser === "function") {
          if (Array.isArray(days) && days.some(Boolean)) {
            saveLastDaysForUser(user, days);
          }
        }

        // 출석 도장 처리 후 고스트가 한 번 더 안내 멘트를 해 줍니다.
        if (typeof showBubble === "function") {
          try {
            if (res && res.stampedToday) {
              playStampSound();
              showBubble("짠! 오늘 출석 도장을 찍었어.");
            } else {
              showBubble("오늘도 출석 도장이 잘 찍혀 있어.");
            }
          } catch (e) {}
        }

        // 정상 표시가 끝났다면, 오늘 날짜 기준 출석 완료 플래그를 저장합니다.
        try {
          if (dayKey && window.localStorage) {
            localStorage.setItem(dayKey, "1");
          }
        } catch (e) {}

        // 출석 5일 달성 시 코인 보상 요청 (옵션)
        try {
          if (window.__ghostCoinReward && typeof window.__ghostCoinReward.attendanceWeekIfEligible === "function") {
            window.__ghostCoinReward.attendanceWeekIfEligible(days);
          }
        } catch (e) {}
      }

      if (alreadyStamped) {
        // 이미 시트에 오늘 도장이 찍혀 있으면, 다시 찍지는 않고 상태만 보여 줍니다.
        afterStamp({ stampedToday: false, days: daysBefore });
      } else {
        // 아직 오늘 도장이 없다면 한 번만 찍고, 그 결과를 기반으로 패널을 보여 줍니다.
        stampToday(user).then(afterStamp);
      }
    });
  }

  // 수첩 메뉴에서 열 때 사용하는 전역 함수
  function openAttendanceStamp() {
    // 수동으로 열 때는 닫힘 방지 타이머 초기화 (10분 제한 무시)
    lastManualCloseTime = 0;
    var user = window.currentUser || null;
    if (!user || !user.user_id) {
      if (typeof showBubble === "function") {
        try {
          showBubble("먼저 로그인해줘.");
        } catch (e) {}
      }
      return;
    }

    // 메뉴에서 출석 도장을 열 때는,
    // 1) 최근에 저장해 둔 출석 정보를 먼저 보여 주고,
    // 2) 그 뒤에 서버에서 최신 상태를 다시 불러와 패널을 새로 고칩니다.
    if (typeof loadLastDaysForUser === "function") {
      var cached = loadLastDaysForUser(user);
      if (cached && cached.length) {
        renderDays(cached || []);
        var overlayCached = createOverlay();
        overlayCached.style.display = "flex";
        requestAnimationFrame(function () { overlayCached.classList.add("open"); });
      }
    }

    openPanelWithLoad(user);
  }


  // 전역 노출
  window.openAttendanceStamp = openAttendanceStamp;

  // [옵션 기능] 출석 도장 - 로그인 성공 이벤트 연동 시작
  // login.js 에서 ghost:attendanceLogin 이벤트를 발생시키면,
  // 여기서 첫 로그인 시 자동으로 도장을 찍어 줍니다.
  window.addEventListener("ghost:attendanceLogin", handleLoginEvent);
  // [옵션 기능] 출석 도장 - 로그인 성공 이벤트 연동 끝
})(window, document);