// [옵션 모듈] 수첩(메뉴) UI - notebook-menu.js
// - 📔 메뉴 버튼을 눌렀을 때 뜨는 수첩형 메뉴 오버레이를 담당합니다.
// - index.html 의 #notebook-menu-overlay DOM 구조에 의존합니다.
// - 로그인한 사용자의 닉네임이 있으면 "(닉네임) 수첩"으로 제목을 바꾸고,
//   없으면 기본값 "누군가의 수첩"을 사용합니다.
//
// 이 모듈을 사용하지 않으려면:
// 1) js/notebook-menu.js 파일을 삭제하고
// 2) js/startup.js 안의
//    `// [옵션 기능] 수첩(메뉴) UI 초기화 시작` 부터
//    `// [옵션 기능] 수첩(메뉴) UI 초기화 끝` 까지의 블록을 통째로 삭제하고
// 3) js/actions.js 안의
//    `// [옵션 기능] 수첩(메뉴) 열기 기능 시작` 부터
//    `// [옵션 기능] 수첩(메뉴) 열기 기능 끝` 까지의 블록을 통째로 삭제한 뒤
// 4) index.html 안의 `<!-- 수첩형 메뉴 오버레이 -->` 영역 전체를 삭제하면,
//    메뉴 기능과 관련된 흔적을 모두 제거할 수 있습니다.

// [모바일 위치 주의]
// 수첩(메뉴) 위치는 css/ghost.css 의 `.notebook-wrapper`의 bottom 값으로 조절합니다.
// 모바일 위치를 바꾸고 싶을 때는 JS가 아니라 CSS bottom(px)만 미세 조정해주세요.

// [레이아웃 주의사항]
// 수첩(메뉴) 위치와 크기는 JS가 아니라 css/ghost.css 의
// `.notebook-overlay`(flex 중앙 정렬)와 `.notebook-wrapper`(카드 크기) 스타일로만 조절합니다.
// 모바일/PC에서 위치가 어색할 때는 이 JS를 건드리지 말고, 해당 CSS만 수정하세요.


function initNotebookMenu() {
  const overlay = document.getElementById("notebook-menu-overlay");

  function playPaperSound() {
    try {
      if (!window.__ghostPaperAudio) {
        window.__ghostPaperAudio = new Audio("sounds/page.mp3");
      }
      const a = window.__ghostPaperAudio;
      a.currentTime = 0;
      a.play().catch(function(){});
    } catch (e) {}
  }

  if (!overlay) return;

  const closeBtn = document.getElementById("notebook-close-btn");
  const backdrop = overlay.querySelector(".notebook-backdrop");
  const memoCards = overlay.querySelectorAll(".memo-card");
  const notebookTabs = overlay.querySelector(".notebook-tabs");
  const bookmarkTab = notebookTabs ? notebookTabs.querySelector(".bookmark") : null;

  if (bookmarkTab) {
    bookmarkTab.addEventListener("click", function(){
      // 상단 별(★) 탭을 누르면 수학 탐험대 게임을 실행합니다.
      if (typeof playPaperSound === "function") {
        try { playPaperSound(); } catch (e) {}
      }
      if (typeof openMenuGame4 === "function") {
        try { openMenuGame4(); } catch (e) {}
      } else if (typeof showBubble === "function") {
        try { showBubble("수학 탐험대 게임이 아직 준비 중이에요."); } catch (e) {}
      }
      // 게임을 열면서 수첩은 닫습니다.
      try { closeNotebookMenu(); } catch (e) {}
    });
  }


  // 메뉴가 열릴 때 말풍선이 가려지지 않도록 위치를 조정하기 위해 사용하는 요소입니다.
  // 이 파일을 삭제한다면, #bubbleWrapper 에 추가되는 "menu-open" 클래스도 더 이상 사용되지 않습니다.
  const bubbleWrapper = document.getElementById("bubbleWrapper");

  const notebookTitleEl = overlay.querySelector(".notebook-title");
  const notebookSubtitleEl = overlay.querySelector(".notebook-subtitle");
  const notebookCoinHudEl = overlay.querySelector("#notebookCoinHud");
  const notebookCoinTextEl = overlay.querySelector("#notebookCoinText");

  function setNotebookCoinText(textValue, needsLogin) {
    if (!notebookCoinHudEl || !notebookCoinTextEl) return;
    notebookCoinTextEl.textContent = textValue || "0";
    notebookCoinHudEl.classList.toggle("is-login-needed", !!needsLogin);
  }

  async function refreshNotebookCoinStatus() {
    if (!notebookCoinHudEl || !notebookCoinTextEl) return;

    const user = window.currentUser;
    const isGuest = !!(user && (user.isGuest || String(user.user_id || "").indexOf("guest-") === 0));
    if (!user || !user.user_id || isGuest) {
      setNotebookCoinText("로그인을 해야해!", true);
      return;
    }

    setNotebookCoinText("...", false);

    if (typeof window.__ghostFetchCoinStatus === "function") {
      try {
        const result = await window.__ghostFetchCoinStatus(user);
        if (!result || !result.ok) {
          setNotebookCoinText("로그인을 해야해!", true);
          return;
        }
        const coin = Math.max(0, parseInt(result.coin, 10) || 0);
        setNotebookCoinText(coin >= 100 ? "MAX" : String(coin), false);
        return;
      } catch (e) {}
    }

    setNotebookCoinText("0", false);
  }

  // 수첩 헤더를 현재 로그인 사용자 닉네임 기준으로 갱신
  function refreshNotebookHeader() {
    if (!notebookTitleEl || !notebookSubtitleEl) return;
    const user = window.currentUser;
    const baseName = user && (user.nickname || user.username);
    if (baseName) {
      notebookTitleEl.textContent = baseName + " 수첩";
    } else {
      notebookTitleEl.textContent = "누군가의 수첩";
    }
    notebookSubtitleEl.textContent = "원하는 메모지를 눌러 보세요.";
    refreshNotebookCoinStatus();
  }

  function openNotebookMenu() {
    // 수첩을 열기 전에 게시판 패널 등이 떠 있다면 먼저 정리해 줍니다.
    if (typeof closeBoardPanel === "function") {
      try {
        closeBoardPanel();
      } catch (e) {}
    } else {
      const boardPanel = document.getElementById("boardPanel");
      if (boardPanel) {
        boardPanel.classList.remove("open");
        boardPanel.classList.add("hidden");
      }
    }

    refreshNotebookHeader();
    refreshNotebookCoinStatus();

    playPaperSound();

    overlay.classList.remove("hidden");
    requestAnimationFrame(() => {
      overlay.classList.add("active");
      if (window.hideFullscreenButton) {
        try { window.hideFullscreenButton(); } catch (e) {}
      }
      // 메뉴가 열려 있을 때 말풍선이 메뉴에 가려지지 않도록 살짝 위로 올립니다.
      if (bubbleWrapper) {
        bubbleWrapper.classList.add("menu-open");
      }
      // 메뉴를 여는 행동도 활동으로 간주하여 졸림 타이머를 초기화합니다.
      if (typeof resetSleepTimer === "function") {
        try { resetSleepTimer(); } catch (e) {}
      }
    });
  }

  function closeNotebookMenu() {
    overlay.classList.remove("active");
    if (window.showFullscreenButton) {
      try { window.showFullscreenButton(); } catch (e) {}
    }

    // 메뉴가 닫힐 때는 말풍선 위치를 원래대로 되돌립니다.
    if (bubbleWrapper) {
      bubbleWrapper.classList.remove("menu-open");
    }

    setTimeout(() => {
      if (!overlay.classList.contains("active")) {
        overlay.classList.add("hidden");
      }
      // 메뉴를 닫은 뒤에도 다시 기본 대기/졸림 루틴이 자연스럽게 돌아가도록
      if (typeof resetSleepTimer === "function") {
        try { resetSleepTimer(); } catch (e) {}
      }

      // 메뉴를 완전히 닫은 시점에 상단 코인 표시를 최신 상태로 갱신
      if (window.__ghostRefreshCoinStatusBar) {
        try { window.__ghostRefreshCoinStatusBar(); } catch (e) {}
      }
      refreshNotebookCoinStatus();
    }, 180);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeNotebookMenu);
  }
  if (backdrop) {
    backdrop.addEventListener("click", closeNotebookMenu);
  }

  // 각 메모 카드를 눌렀을 때 해당 기능 열기
  memoCards.forEach((card) => {
    // PC에서도 '누르는(들어가는)' 애니메이션이 보이도록 보조 클래스 사용
    function setPressed(on) {
      try { card.classList.toggle("is-pressed", !!on); } catch (e) {}
    }

    card.addEventListener("pointerdown", function () {
      setPressed(true);
    });
    card.addEventListener("pointerup", function () {
      // 클릭 후 바로 메뉴가 닫혀도 0.08초 정도 눌림 효과가 남도록
      setTimeout(function(){ setPressed(false); }, 80);
    });
    card.addEventListener("pointercancel", function () { setPressed(false); });
    card.addEventListener("pointerleave", function () { setPressed(false); });

    card.addEventListener("click", () => {
      if (card.dataset.__opening === "1") return;
      card.dataset.__opening = "1";
      setPressed(true);
      const page = card.getAttribute("data-page");
      if (!page) { card.dataset.__opening = ""; setPressed(false); return; }

      // 메모지를 열 때 살짝 종이 넘기는 효과음
      playPaperSound();

      setTimeout(function(){
        switch (page) {
        case "attendance": {
        // [옵션 기능] 출석 도장 모듈 연동 시작
        // 이 코드는 js/attendance-stamp.js 와 같은 출석 모듈이 있을 때만 의미가 있습니다.
        // 만약 그런 모듈을 사용하지 않는다면,
        // 이 case 블록 전체를 삭제해도 됩니다.
        if (typeof openAttendanceStamp === "function") {
        openAttendanceStamp();
        } else if (typeof showBubble === "function") {
        try {
        showBubble("출석 도장 기능은 아직 준비 중이에요.");
        } catch (e) {}
        }
        // [옵션 기능] 출석 도장 모듈 연동 끝
        break;
        }

        case "login":
        if (typeof openLoginPanel === "function") {
        openLoginPanel();
        }
        break;

        case "letter":
        if (window.LettersLocal && typeof LettersLocal.openFromMenu === "function") {
        LettersLocal.openFromMenu();
        } else if (typeof showBubble === "function") {
        try {
        showBubble("편지함 기능이 아직 준비 중이에요.");
        } catch (e) {}
        }
        break;

        case "board":
        if (typeof openBoardPanel === "function") {
        openBoardPanel();
        } else {
        const p = document.getElementById("boardPanel");
        if (p) {
        p.classList.remove("hidden");
        p.classList.add("open");
        } else if (typeof showBubble === "function") {
        try {
        showBubble("게시판 기능이 아직 준비 중이에요.");
        } catch (e) {}
        }
        }
        break;

        case "game1":
        if (typeof openMenuGame1 === "function") {
        openMenuGame1();
        } else if (typeof showBubble === "function") {
        try { showBubble("구구단 게임이 아직 준비 중이에요."); } catch(e){}
        }
        break;

        case "game2":
        if (typeof openMenuGame2 === "function") {
        openMenuGame2();
        } else if (typeof showBubble === "function") {
        try { showBubble("덧셈주사위 게임이 아직 준비 중이에요."); } catch(e){}
        }
        break;

        case "game3":
        if (typeof openMenuGame3 === "function") {
        openMenuGame3();
        } else if (typeof showBubble === "function") {
        try { showBubble("꿈틀도형 게임이 아직 준비 중이에요."); } catch(e){}
        }
        break;

        case "quest":
        // [옵션 기능] 오늘의 퀘스트 모듈 연동 시작
        // 이 코드는 js/quest-explorer.js 모듈이 있을 때만 의미가 있습니다.
        // 해당 모듈을 사용하지 않는다면 이 case 블록 전체를 삭제해도 됩니다.
        if (typeof openQuestExplorer === "function") {
        openQuestExplorer();
        } else if (typeof showBubble === "function") {
        try {
        showBubble("오늘의 퀘스트 기능은 아직 준비 중이에요. 나중에 같이 채워 넣자!");
        } catch (e) {}
        }
        break;
        // [옵션 기능] 오늘의 퀘스트 모듈 연동 끝

        case "arcamera":
        // AR 카메라 기능 (추후 WebAR, 3D 뷰어 등으로 연결하기 위한 자리입니다.)
        // 아직 실제 기능이 없다면 안내만 보여 줍니다.
        if (typeof openARCamera === "function") {
        openARCamera();
        } else if (typeof showBubble === "function") {
        try {
        showBubble("AR 카메라 기능은 아직 준비 중이에요. 나중에 같이 만들어 볼까?");
        } catch (e) {}
        }
        break;


        case "ranking":
        if (typeof openRankingPopup === "function") {
        openRankingPopup();
        } else if (typeof showBubble === "function") {
        try {
        showBubble("게임 랭킹은 아직 준비 중이에요.");
        } catch (e) {}
        }
        break;

        default:
        if (typeof showBubble === "function") {
        try {
        showBubble("아직 연결되지 않은 메뉴예요. 나중에 같이 채워 넣자!");
        } catch (e) {}
        }
        break;
        }

        closeNotebookMenu();
        try { card.dataset.__opening = ""; } catch (e) {}
        setPressed(false);
      }, 80);
    });
  });

  // 전역으로 열기/닫기 함수 노출
  try {
    window.addEventListener("ghost:userChanged", function(){
      try { refreshNotebookHeader(); } catch (e) {}
      try { refreshNotebookCoinStatus(); } catch (e) {}
    });
  } catch (e) {}

  window.openNotebookMenu = openNotebookMenu;
  window.closeNotebookMenu = closeNotebookMenu;
}
