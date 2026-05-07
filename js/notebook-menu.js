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
        try { showBubble("수학 탐험대 게임은 아직 준비 중이야."); } catch (e) {}
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
    overlay.classList.remove("active"); // opacity:0 transition 시작
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
  // notebook-wrapper 외부(backdrop 포함 overlay 여백) 클릭 시 닫힘
  // backdrop과 overlay 이벤트 중복 방지: overlay 이벤트만 사용
  overlay.addEventListener("click", function (e) {
    var wrapper = overlay.querySelector(".notebook-wrapper");
    if (wrapper && !wrapper.contains(e.target)) {
      closeNotebookMenu();
    }
  });

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
        showBubble("출석 도장 기능은 아직 준비 중이야.");
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
        showBubble("편지함 기능은 아직 준비 중이야.");
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
        showBubble("게시판 기능은 아직 준비 중이야.");
        } catch (e) {}
        }
        }
        break;

        case "game1":
        if (typeof openMenuGame1 === "function") {
        openMenuGame1();
        } else if (typeof showBubble === "function") {
        try { showBubble("구구단 게임은 아직 준비 중이야."); } catch(e){}
        }
        break;

        case "game2":
        if (typeof openMenuGame2 === "function") {
        openMenuGame2();
        } else if (typeof showBubble === "function") {
        try { showBubble("덧셈주사위 게임은 아직 준비 중이야."); } catch(e){}
        }
        break;

        case "game3":
        if (typeof openMenuGame3 === "function") {
        openMenuGame3();
        } else if (typeof showBubble === "function") {
        try { showBubble("꿈틀도형 게임은 아직 준비 중이야."); } catch(e){}
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
        showBubble("오늘의 퀘스트 기능은 아직 준비 중이야. 나중에 같이 채워 넣자!");
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
        showBubble("AR 카메라 기능은 아직 준비 중이야. 나중에 같이 만들어 볼까?");
        } catch (e) {}
        }
        break;


        case "ranking":
        if (typeof openRankingPopup === "function") {
        openRankingPopup();
        } else if (typeof showBubble === "function") {
        try {
        showBubble("게임 랭킹은 아직 준비 중이야.");
        } catch (e) {}
        }
        break;

        default:
        if (typeof showBubble === "function") {
        try {
        showBubble("아직 연결되지 않은 메뉴야. 나중에 같이 채워 넣자!");
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

/* ── 게시판 패널 열기/닫기 + 글 목록 로드 ── */
(function () {
  var PAGE_SIZE = 10;
  var _page = 1;
  var _allItems = [];

  function openBoardPanel() {
    var panel = document.getElementById('boardPanel');
    if (!panel) return;
    panel.classList.remove('hidden');
    panel.style.display = 'flex';
    requestAnimationFrame(function () {
      panel.classList.add('open');
    });
    loadBoardList();
  }

  function closeBoardPanel() {
    var panel = document.getElementById('boardPanel');
    if (!panel) return;
    panel.classList.remove('open');
    setTimeout(function () {
      if (!panel.classList.contains('open')) {
        panel.style.display = 'none';
        panel.classList.add('hidden');
      }
    }, 200);
  }

  function renderPage() {
    var container = document.getElementById('boardListContainer');
    var pageInfo = document.getElementById('boardPageInfo');
    if (!container) return;

    var totalPages = Math.max(1, Math.ceil(_allItems.length / PAGE_SIZE));
    if (_page < 1) _page = 1;
    if (_page > totalPages) _page = totalPages;

    var start = (_page - 1) * PAGE_SIZE;
    var slice = _allItems.slice(start, start + PAGE_SIZE);

    if (slice.length === 0) {
      container.innerHTML = '<div style="color:#aaa;text-align:center;padding:24px;">등록된 글이 없습니다.</div>';
    } else {
      container.innerHTML = slice.map(function (item, i) {
        return [
          '<div class="board-item" style="padding:10px 8px;border-bottom:1px solid #eee;cursor:pointer;" data-idx="' + (start + i) + '">',
          '  <div style="font-weight:600;font-size:14px;">' + escHtml(item.title || item.subject || item.제목 || '(제목없음)') + '</div>',
          '  <div style="font-size:12px;color:#888;margin-top:2px;">' + escHtml(item.author || item.writer || item.name || item.이름 || '') + ' · ' + escHtml(item.created_at || item.date || item.날짜 || '') + '</div>',
          '</div>'
        ].join('');
      }).join('');

      // 글 클릭 시 내용 표시
      container.querySelectorAll('.board-item').forEach(function (el) {
        el.addEventListener('click', function () {
          var idx = parseInt(el.dataset.idx, 10);
          var item = _allItems[idx];
          if (!item) return;
          var hint = document.getElementById('boardHint');
          if (hint) {
            hint.classList.remove('hidden');
            hint.innerHTML = [
              '<div style="font-weight:700;font-size:15px;margin-bottom:6px;">' + escHtml(item.title || item.subject || item.제목 || '') + '</div>',
              '<div style="font-size:12px;color:#888;margin-bottom:8px;">' + escHtml(item.author || item.writer || item.name || item.이름 || '') + ' · ' + escHtml(item.created_at || item.date || item.날짜 || '') + '</div>',
              '<div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">' + escHtml(item.content || item.body || item.내용 || '') + '</div>'
            ].join('');
          }
        });
      });
    }

    if (pageInfo) pageInfo.textContent = _page + ' / ' + totalPages;
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function loadBoardList() {
    var container = document.getElementById('boardListContainer');
    if (container) container.innerHTML = '<div style="color:#aaa;text-align:center;padding:24px;">불러오는 중...</div>';

    // 구버전과 동일한 방식: SHEET_WRITE_URL(=SHEET_CSV_URL)에 GET + 캐시버스터
    var gasUrl = (typeof window.SHEET_WRITE_URL === 'string' && window.SHEET_WRITE_URL)
      ? window.SHEET_WRITE_URL
      : (typeof SHEET_WRITE_URL === 'string' ? SHEET_WRITE_URL : '');

    if (!gasUrl) {
      if (container) container.innerHTML = '<div style="color:#f00;text-align:center;padding:24px;">연결 오류</div>';
      return;
    }

    var sep = gasUrl.indexOf('?') >= 0 ? '&' : '?';
    var url = gasUrl + sep + 'mode=board_list&t=' + Date.now();

    fetch(url)
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(json) {
        // 구버전과 동일: json.data 배열 우선, 없으면 다른 형태도 허용
        var rows = [];
        if (Array.isArray(json.data))  rows = json.data;
        else if (Array.isArray(json.items)) rows = json.items;
        else if (Array.isArray(json.list))  rows = json.list;
        else if (Array.isArray(json))       rows = json;

        // 최신 글이 위에 오도록 역순
        _allItems = rows.slice().reverse();
        _page = 1;
        renderPage();
      })
      .catch(function(err) {
        console.warn('[Board] 불러오기 실패:', err);
        if (container) container.innerHTML = '<div style="color:#f00;text-align:center;padding:24px;">불러오기 실패. 네트워크나 Apps Script 설정을 확인해주세요.</div>';
      });
  }

  // 버튼 핸들러 등록
  document.addEventListener('DOMContentLoaded', function () {
    var closeBtn = document.getElementById('boardCloseBtn');
    var backdrop = document.querySelector('#boardPanel .board-backdrop');
    var reloadBtn = document.getElementById('boardReloadBtn');
    var prevBtn = document.getElementById('boardPrevPageBtn');
    var nextBtn = document.getElementById('boardNextPageBtn');

    if (closeBtn) closeBtn.addEventListener('click', closeBoardPanel);
    // backdrop 클릭: board-inner(fixed)가 backdrop(absolute) 위에 있어서
    // backdrop 이벤트가 안 닿음 → board-panel 자체에서 inner 외부 클릭 감지
    var boardPanel = document.getElementById('boardPanel');
    if (boardPanel) {
      boardPanel.addEventListener('click', function (e) {
        var inner = boardPanel.querySelector('.board-inner');
        if (inner && !inner.contains(e.target)) {
          closeBoardPanel();
        }
      });
    }
    if (reloadBtn) reloadBtn.addEventListener('click', loadBoardList);
    if (prevBtn) prevBtn.addEventListener('click', function () { _page--; renderPage(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { _page++; renderPage(); });
  });

  window.openBoardPanel = openBoardPanel;
  window.closeBoardPanel = closeBoardPanel;
})();
