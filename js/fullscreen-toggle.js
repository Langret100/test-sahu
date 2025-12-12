// fullscreen-toggle.js
// 전체 화면 토글 버튼
// - 기본 화면에서만 보이도록 다른 패널/창에서 숨길 수 있는 전역 함수 제공
//   window.showFullscreenButton(), window.hideFullscreenButton()

(function () {
  var fullscreenBtn = null;

  // ============================
  //  스타일 주입
  // ============================
  function injectStyle() {
    if (document.getElementById("fullscreenToggleStyle")) return;

    var style = document.createElement("style");
    style.id = "fullscreenToggleStyle";
    style.textContent = `
      .fullscreen-btn {
        position: fixed;
        top: 10px;
        right: 10px;
        left: auto;
        width: 32px;
        height: 32px;
        background: rgba(255,255,255,0.02); /* 거의 투명한 버튼 영역 */
        border: none;
        border-radius: 10px;
        cursor: pointer;
        z-index: 9999;
        display: none;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        transition: background 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.12s ease;
      }
      .fullscreen-btn:hover {
        background: rgba(255,255,255,0.08);
        box-shadow: 0 0 10px rgba(0,0,0,0.4);
        opacity: 1;
        transform: translateY(-1px);
      }
      .fullscreen-btn.fullscreen-active {
        background: rgba(255,255,255,0.12);
      }
      .fullscreen-icon {
        width: 18px;
        height: 18px;
        border-radius: 3px;
        border-top: 2px solid rgba(255,255,255,0.4);
        border-right: 2px solid rgba(255,255,255,0.4);
        border-bottom: none;
        border-left: none;
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);
  }

  // ============================
  //  전체 화면 헬퍼 함수
  // ============================
  function isFullscreen() {
    return document.fullscreenElement ||
           document.webkitFullscreenElement ||
           document.mozFullScreenElement ||
           document.msFullscreenElement;
  }

  function requestFullscreen(el) {
    if (!el) return;
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
    if (el.msRequestFullscreen) return el.msRequestFullscreen();
  }

  function exitFullscreen() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
  }

  function updateButtonState() {
    if (!fullscreenBtn) return;
    if (isFullscreen()) {
      fullscreenBtn.classList.add("fullscreen-active");
    } else {
      fullscreenBtn.classList.remove("fullscreen-active");
    }
  }

  // ============================
  //  버튼 생성 및 이벤트 연결
  // ============================
    function createButton() {
    if (fullscreenBtn) return;

    fullscreenBtn = document.createElement("button");
    fullscreenBtn.type = "button";
    fullscreenBtn.className = "fullscreen-btn";
    fullscreenBtn.setAttribute("aria-label", "전체 화면 전환");

    // 내부 조준판 아이콘 (정사각형 테두리)
    var icon = document.createElement("div");
    icon.className = "fullscreen-icon";
    fullscreenBtn.appendChild(icon);

    fullscreenBtn.addEventListener("click", function () {
      if (!isFullscreen()) {
        requestFullscreen(document.documentElement);
      } else {
        exitFullscreen();
      }
    });

    // 전체 화면 상태 바뀔 때 버튼 스타일 갱신
    ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"].forEach(function (ev) {
      document.addEventListener(ev, updateButtonState);
    });

    document.body.appendChild(fullscreenBtn);
    updateButtonState();
  }


  function initFullscreenButton() {
    injectStyle();
    createButton();
    // 첫 초기화 시에도 기본 화면 여부에 따라 노출 상태를 맞춰줍니다.
    autoUpdateVisibility();

    // 주기적으로 화면 상태를 확인하여 버튼 노출을 자동으로 제어합니다.
    setInterval(autoUpdateVisibility, 500);

    // 사용자가 클릭으로 패널을 열고 닫은 직후 상태를 반영하기 위해 클릭 후에도 한 번 갱신
    document.addEventListener("click", function () {
      setTimeout(autoUpdateVisibility, 0);
    });
  }


  // ============================
  //  기본 화면 감지 & 자동 노출 제어
  // ============================
  function isBaseScreen() {
    // 기본 채팅 패널이 존재하고 숨겨져 있지 않을 때를 기준으로 삼습니다.
    var chat = document.getElementById("chatPanel");
    if (!chat || (chat.classList && chat.classList.contains("hidden"))) {
      return false;
    }

    // 다른 '창' / 오버레이 / 패널이 떠 있으면 기본 화면이 아닌 것으로 간주
    var blockers = [
      "loginPanel",   // 로그인 패널 (login.js에서 생성)
      "gameOverlay",  // 게임 전체화면 오버레이
      "boardPanel",   // 게시판 패널
      "manualPanel"   // 사용 설명서 패널
    ];

    for (var i = 0; i < blockers.length; i++) {
      var el = document.getElementById(blockers[i]);
      if (!el) continue;
      if (el.classList && !el.classList.contains("hidden")) {
        return false;
      }
    }

    return true;
  }

  function autoUpdateVisibility() {
    if (!fullscreenBtn) return;
    if (isBaseScreen()) {
      fullscreenBtn.style.display = "flex";
    } else {
      fullscreenBtn.style.display = "none";
    }
  }
  // ============================
  //  전역 제어 함수 (다른 모듈에서 사용)
  // ============================
  function showBtn() {
    if (!fullscreenBtn) return;
    fullscreenBtn.style.display = "flex";
  }

  function hideBtn() {
    if (!fullscreenBtn) return;
    fullscreenBtn.style.display = "none";
  }

  // 전역 노출
  window.showFullscreenButton = showBtn;
  window.hideFullscreenButton = hideBtn;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFullscreenButton);
  } else {
    initFullscreenButton();
  }
})();
