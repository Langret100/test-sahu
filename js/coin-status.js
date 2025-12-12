// coin-status.js - 상단 퀘스트 바에 "나의 코인" 표시 모듈
// - 시간 표시 아래 "퀘스트 현황" / "오늘의 과제 해결 (0/5)" 바로 아래
//   "나의 코인 (x/100)" 라벨을 추가합니다.
// - 시각 스타일은 위의 "오늘의 과제 해결" 텍스트(.quest-status-link)와 동일하게 맞추었습니다.
// - 데이터는 Apps Script (mode=coin_status) + 스프레드시트 "보상" 시트와 연동한다고 가정합니다.
//
// 이 기능을 사용하지 않으려면:
// 1) js/coin-status.js 파일을 삭제하고
// 2) index.html 안의 <script src="js/coin-status.js"></script> 태그를 함께 삭제하면
//    관련 UI와 기능이 모두 사라집니다.
//
(function (window, document) {
  if (!window || !document) return;

  // 기존 시스템에서 사용하던 SPREADSHEET_URL을 "실시간"으로 읽기 위한 함수
  // (초기에 undefined였다가 나중에 정의되는 경우를 대비)
  function getCoinApiBase() {
    try {
      if (typeof SPREADSHEET_URL !== "undefined" && SPREADSHEET_URL) {
        return SPREADSHEET_URL;
      }
      if (window && window.SPREADSHEET_URL) {
        return window.SPREADSHEET_URL;
      }
      // 혹시 다른 이름으로 쓰는 경우를 대비한 여분 (있으면 자동 사용)
      if (window && window.API_BASE_URL) {
        return window.API_BASE_URL;
      }
    } catch (e) {}
    return "";
  }

  var COIN_LIMIT_DEFAULT = 100;

  var lastUserId = null;
  var lastState = null; // "disabled" | "enabled" | "error"

  // -----------------------------
  // DOM / 스타일 관련 유틸
  // -----------------------------
  function injectCoinStyle() {
    if (document.getElementById("coin-status-style")) return;
    var style = document.createElement("style");
    style.id = "coin-status-style";
    style.textContent = [
      "#questStatusBar .quest-status-coin {",
      "  /* 위의 .quest-status-link 와 같은 스타일을 공유하도록,",
      "     별도 색/폰트 지정은 하지 않고, 간격만 살짝 조정합니다. */",
      "  display: block;",
      "  margin-top: 1px;",
      "}",
      "#questStatusBar .quest-status-coin.disabled {",
      "  opacity: 0.7;",
      "}"
    ].join("\n");
    (document.head || document.body || document.documentElement).appendChild(style);
  }

  function getQuestBar() {
    return document.getElementById("questStatusBar");
  }

  function ensureCoinLine() {
    var bar = getQuestBar();
    if (!bar) return null;

    var line = bar.querySelector(".quest-status-coin");
    if (line) return line;

    line = document.createElement("div");
    // 위의 "오늘의 과제 해결" 과 같은 디자인을 쓰기 위해
    // quest-status-link 클래스를 그대로 함께 사용
    line.className = "quest-status-link quest-status-coin disabled";
    line.textContent = "나의 코인 (비활성화)";
    bar.appendChild(line);
    return line;
  }

  // -----------------------------
  // 로그인 사용자 정보 확인
  // -----------------------------
  function loadUserFromLocalStorage() {
    if (!window.localStorage) return null;
    try {
      var raw = localStorage.getItem("ghostUser");
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (obj && obj.user_id) {
        return obj;
      }
    } catch (e) {}
    return null;
  }

  function getCurrentUser() {
    // 로그인 모듈에서 현재 세션에 로그인한 사용자만 사용
    if (window.currentUser && window.currentUser.user_id) {
      return window.currentUser;
    }
    // localStorage 에 저장된 과거 로그인 정보는 "자동 로그인"으로 간주하지 않음
    return null;
  }

  function getCurrentUserId() {
    var user = getCurrentUser();
    if (!user || !user.user_id) return null;
    return String(user.user_id);
  }

  // -----------------------------
  // 표시 관련 함수
  // -----------------------------
  function setCoinDisabled() {
    var bar = getQuestBar();
    if (!bar) return;
    var line = ensureCoinLine();
    if (!line) return;
    line.classList.add("disabled");
    line.textContent = "나의 코인 (비활성화)";
    lastState = "disabled";
  }

  function setCoinLoading() {
    var bar = getQuestBar();
    if (!bar) return;
    var line = ensureCoinLine();
    if (!line) return;
    line.classList.add("disabled");
    line.textContent = "나의 코인 (불러오는 중...)";
    lastState = "disabled";
  }

  function setCoinError() {
    var bar = getQuestBar();
    if (!bar) return;
    var line = ensureCoinLine();
    if (!line) return;
    line.classList.add("disabled");
    line.textContent = "나의 코인 (연결 오류)";
    lastState = "error";
  }

  function setCoinValueDisplay(coin, limit) {
    var bar = getQuestBar();
    if (!bar) return;
    var line = ensureCoinLine();
    if (!line) return;

    var numCoin = parseInt(coin, 10);
    if (!isFinite(numCoin) || isNaN(numCoin)) numCoin = 0;
    if (numCoin < 0) numCoin = 0;

    var numLimit = parseInt(limit, 10);
    if (!isFinite(numLimit) || isNaN(numLimit) || numLimit <= 0) {
      numLimit = COIN_LIMIT_DEFAULT;
    }

    line.classList.remove("disabled");
    line.textContent = "나의 코인 (" + numCoin + "/" + numLimit + ")";
    lastState = "enabled";
  }

  // -----------------------------
  // 서버 통신
  // -----------------------------
  function fetchCoinStatus(userId) {
    var base = getCoinApiBase();
    if (!base || !userId) {
      // API 주소가 아직 없거나 userId 가 없으면 요청 자체를 보내지 않음
      return Promise.resolve(null);
    }

    var url =
      base +
      (base.indexOf("?") >= 0 ? "&" : "?") +
      "mode=coin_status&user_id=" +
      encodeURIComponent(userId) +
      "&t=" +
      Date.now();

    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (json) {
        if (!json || json.ok === false) {
          throw new Error((json && json.error) || "coin_status not ok");
        }
        var coin = 0;
        var limit = COIN_LIMIT_DEFAULT;

        if (typeof json.coin !== "undefined") {
          var parsed = parseInt(json.coin, 10);
          if (!isNaN(parsed) && isFinite(parsed)) coin = parsed;
        }
        if (typeof json.limit !== "undefined") {
          var parsedLimit = parseInt(json.limit, 10);
          if (!isNaN(parsedLimit) && isFinite(parsedLimit) && parsedLimit > 0) {
            limit = parsedLimit;
          }
        }
        return { coin: coin, limit: limit };
      })
      .catch(function (err) {
        console.error("[coin-status] fetchCoinStatus error:", err);
        // 에러가 나더라도 resolve(null) 로 넘겨서 이후에 setCoinError 처리
        return null;
      });
  }

  // -----------------------------
  // 메인 갱신 로직
  // -----------------------------
  function refreshCoinStatus(user) {
    injectCoinStyle();

    var bar = getQuestBar();
    if (!bar) return;

    var userObj = user || getCurrentUser();
    var userId = userObj && userObj.user_id ? String(userObj.user_id) : null;

    if (!userId) {
      lastUserId = null;
      setCoinDisabled();
      return;
    }

    lastUserId = userId;
    setCoinLoading();

    fetchCoinStatus(userId).then(function (result) {
      if (!result) {
        // 서버 응답이 없거나 오류인 경우: 로그인은 되었지만, 코인 정보를 가져오지 못함
        setCoinError();
        return;
      }
      setCoinValueDisplay(result.coin, result.limit);
    });
  }

  function checkUserChangeLoop() {
    var current = getCurrentUserId();
    if (!current) {
      if (lastUserId !== null || lastState !== "disabled") {
        setCoinDisabled();
      }
      lastUserId = null;
    } else if (current !== lastUserId || lastState === "error") {
      // 사용자 변경이 있거나, 이전에 오류 상태였다면 다시 시도
      refreshCoinStatus();
    }
  }

  // 출석 도장 / 로그인 모듈에서 쏴 주는 이벤트 연동
  function onAttendanceLogin(ev) {
    var detail = (ev && ev.detail) || {};
    var user = detail.user || getCurrentUser();
    refreshCoinStatus(user);
  }

  // -----------------------------
  // 초기화
  // -----------------------------

  // -----------------------------
  // 외부 모듈에서 코인 표시를 강제로 갱신하고 싶을 때 사용하는 헬퍼
  // -----------------------------
  try {
    window.__ghostRefreshCoinStatusBar = function () {
      try {
        injectCoinStyle();
        ensureCoinLine();
        refreshCoinStatus();
      } catch (e) {}
    };
  } catch (e) {}
  function init() {
    injectCoinStyle();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        injectCoinStyle();
        ensureCoinLine();
        refreshCoinStatus();
      });
    } else {
      ensureCoinLine();
      refreshCoinStatus();
    }

    try {
      window.addEventListener("ghost:attendanceLogin", onAttendanceLogin);
    } catch (e) {
      // 이벤트 시스템이 없으면 무시
    }

    try {
      setInterval(checkUserChangeLoop, 5000);
    } catch (e) {}
  }

  init();
})(window, document);
