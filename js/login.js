// 독립 로그인 모듈 (ui.js와 완전히 분리)
// - HTML에 loginPanel이 없어도 스스로 생성
// - openLoginPanel / closeLoginPanel / logout 전역 제공
// - postToSheet, showBubble 있으면 그대로 사용

(function () {

  var loginLogoEl = null;

  function createOrUpdateLoginLogo() {
    var panel = document.getElementById("loginPanel");
    if (!panel) return;
    var inner = panel.querySelector(".login-inner");
    if (!inner) return;

    if (!loginLogoEl) {
      loginLogoEl = document.createElement("img");
      loginLogoEl.src = "images/etcimage/mypai-logo.png";
      loginLogoEl.alt = "마이파이";
      loginLogoEl.className = "login-logo-floating";
      document.body.appendChild(loginLogoEl);
    }

    // 위치 재계산
    var rect = inner.getBoundingClientRect();
    var lw = 372;  // 디자인 기준 고정 너비
    var lh = 110;  // 대략적인 높이 값

    var left = rect.left + rect.width / 2 - lw / 2 - 100;
    var top = rect.top - lh * 0.7;

    loginLogoEl.style.left = left + "px";
    loginLogoEl.style.top = top + "px";
    loginLogoEl.style.display = panel.classList.contains("open") ? "block" : "none";
  }

  function hideLoginLogo() {
    if (loginLogoEl) {
      loginLogoEl.style.display = "none";
    }
  }


  // ==============================
  // DOM 생성
  // ==============================
  function createLoginDomIfNeeded() {
    var panel = document.getElementById("loginPanel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "loginPanel";
    panel.className = "login-panel hidden";

    panel.innerHTML = [
      '<div class="login-backdrop"></div>',
      '<div class="login-inner">',
      '  <div class="login-header">',
      '    <div class="login-title"></div>',
      '    <button id="loginCloseBtn" class="login-close">✕</button>',
      '  </div>',
      '  <div class="login-body">',

      // 로그인 영역 (왼쪽에 아이디/비번 2줄, 오른쪽에 큰 로그인 버튼)
      '    <form id="loginForm" class="login-form">',
      '      <p class="login-helper-text">아이디와 비밀번호를 입력해서 로그인해요.</p>',
      '      <div class="login-main-row">',
      '        <div class="login-fields-col">',
      '          <label class="login-label">아이디</label>',
      '          <input id="loginUsername" type="text" class="login-input" autocomplete="username" placeholder="아이디">',
      '          <label class="login-label" style="margin-top:8px;">비밀번호</label>',
      '          <input id="loginPassword" type="password" class="login-input" autocomplete="current-password" placeholder="비밀번호">',
      '        </div>',
      '        <div class="login-button-col">',
      '          <button type="submit" class="login-submit-btn login-submit-main">로그인</button>',
      '        </div>',
      '      </div>',
      '    </form>',

      // 아래 줄: 게스트 / 회원가입 버튼 (순서: 게스트 -> 회원가입)
      '    <div class="login-bottom-buttons">',
      '      <button id="guestLoginBtn" type="button" class="login-secondary-btn">게스트</button>',
      '      <button id="signupToggleBtn" type="button" class="login-secondary-btn">회원가입</button>',
      '    </div>',

      // 회원가입 영역 (처음엔 접힘)
      '    <div id="signupArea" class="signup-area hidden">',
      '      <form id="signupForm" class="login-form">',
      '        <p class="login-helper-text">간단한 아이디와 비밀번호만으로 계정을 만들 수 있어요.</p>',
      '        <label class="login-label">아이디</label>',
      '        <input id="signupUsername" type="text" class="login-input" autocomplete="username" placeholder="로그인에 사용할 아이디">',
      '        <label class="login-label">비밀번호</label>',
      '        <input id="signupPassword" type="password" class="login-input" autocomplete="new-password" placeholder="비밀번호">',
      '        <label class="login-label">닉네임 (선택)</label>',
      '        <input id="signupNickname" type="text" class="login-input" placeholder="채팅에 보일 이름">',
      '        <button type="submit" class="login-submit-btn" style="margin-top:10px; width:100%;">회원가입 완료</button>',
      '      </form>',
      '    </div>',

      // 상태 + 로그아웃 버튼 줄
      '    <div class="login-footer-row">',
      '      <div id="loginStatus" class="login-status"></div>',
      '      <button id="logoutBtn" type="button" class="login-secondary-btn login-logout-btn hidden">로그아웃</button>',
      '    </div>',

      '  </div>',
      '</div>'
    ].join("");

    document.body.appendChild(panel);
    createOrUpdateLoginLogo();
    return panel;
  }

  function getEls() {
    var panel = createLoginDomIfNeeded();
    return {
      panel: panel,
      formLogin: document.getElementById("loginForm"),
      formSignup: document.getElementById("signupForm"),
      statusEl: document.getElementById("loginStatus"),
      closeBtn: document.getElementById("loginCloseBtn"),
      backdrop: panel.querySelector(".login-backdrop"),
      loginUsernameInput: document.getElementById("loginUsername"),
      loginPasswordInput: document.getElementById("loginPassword"),
      signupUsernameInput: document.getElementById("signupUsername"),
      signupPasswordInput: document.getElementById("signupPassword"),
      signupNicknameInput: document.getElementById("signupNickname"),
      signupArea: document.getElementById("signupArea"),
      signupToggleBtn: document.getElementById("signupToggleBtn"),
      guestLoginBtn: document.getElementById("guestLoginBtn"),
      logoutBtn: document.getElementById("logoutBtn")
    };
  }

  

  function emitUserChanged() {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
      try {
        window.dispatchEvent(new CustomEvent("ghost:userChanged", { detail: { user: window.currentUser || null } }));
      } catch (e) {}
    }
  }

  function updatePlusMenuLoginLabel() {
    var menu = document.getElementById("plusMenu");
    if (!menu) return;
    var btn = menu.querySelector('button[data-action="login"]');
    if (!btn) return;
    if (window.currentUser && window.currentUser.user_id) {
      btn.textContent = "🔓 로그아웃";
    } else {
      btn.textContent = "🔑 로그인";
    }
  }

function setStatus(msg) {
    var el = document.getElementById("loginStatus");
    if (el) el.textContent = msg || "";
  }

  function updateLogoutVisibility() {
    var els = getEls();
    var btn = els.logoutBtn;
    if (!btn) return;
    if (window.currentUser && window.currentUser.user_id) {
      btn.classList.remove("hidden");
    } else {
      btn.classList.add("hidden");
    }
  }

  // ==============================
  // 로그인 / 회원가입 처리
  // ==============================
  async function handleLoginSubmit(ev) {
    ev.preventDefault();
    if (!window.fetch || typeof postToSheet !== "function") return;

    var els = getEls();
    var username = (els.loginUsernameInput && els.loginUsernameInput.value.trim()) || "";
    var password = (els.loginPasswordInput && els.loginPasswordInput.value.trim()) || "";

    if (!username || !password) {
      setStatus("아이디와 비밀번호를 입력해 주세요.");
      return;
    }

    try {
      setStatus("로그인 중이에요...");
      var res = await postToSheet({
        mode: "login",
        username: username,
        password: password
      });
      var json = await res.json();
      if (!json.ok) {
        setStatus(json.error || "로그인에 실패했어요.");
        return;
      }

      window.currentUser = {
        user_id: json.user_id,
        username: username,
        nickname: json.nickname || username
      };
      try {
        localStorage.setItem("ghostUser", JSON.stringify(window.currentUser));
      } catch (e) {}

      

// [옵션 기능] 출석 도장 모듈(첫 로그인 자동 도장) 연동 시작
// js/attendance-stamp.js 가 로드되어 있다면,
// 로그인 성공 시 ghost:attendanceLogin 이벤트를 발생시켜
// 첫 로그인일 경우 자동으로 도장을 찍어 줄 수 있습니다.
if (typeof window !== "undefined"
  && typeof window.dispatchEvent === "function"
  && typeof CustomEvent === "function") {
  try {
    window.dispatchEvent(
      new CustomEvent("ghost:attendanceLogin", { detail: { user: window.currentUser } })
    );
  } catch (e) {
    // 무시: 출석 모듈이 없거나 CustomEvent를 지원하지 않는 환경
  }
}
// [옵션 기능] 출석 도장 모듈(첫 로그인 자동 도장) 연동 끝

setStatus("로그인에 성공했어요!");
      {
        const line = (function(name){ const lines = [name + " 왔네! 기다리고 있었어.", name + " 왔구나! 오늘도 반가워.", name + " 어서 와. 편하게 놀다 가." ]; return lines[Math.floor(Math.random() * lines.length)]; })(window.currentUser.nickname || username);
        if (typeof setEmotion === "function") setEmotion("인사", line);
        else if (typeof showBubble === "function") showBubble(line);
      }

      updateLogoutVisibility();
      updatePlusMenuLoginLabel();
      emitUserChanged();
      setTimeout(closeLoginPanel, 800);
      setTimeout(function () {
        if (window.AttendanceWeekly && typeof AttendanceWeekly.handleLoginSuccess === "function") {
          try {
            AttendanceWeekly.handleLoginSuccess();
          } catch (e) {}
        }
      }, 700);

    } catch (e) {
      console.error("로그인 실패:", e);
      setStatus("로그인 중 오류가 발생했어요.");
    }
  }

  async function handleSignupSubmit(ev) {
    ev.preventDefault();
    if (!window.fetch || typeof postToSheet !== "function") return;

    var els = getEls();
    var username = (els.signupUsernameInput && els.signupUsernameInput.value.trim()) || "";
    var password = (els.signupPasswordInput && els.signupPasswordInput.value.trim()) || "";
    var nickname = (els.signupNicknameInput && els.signupNicknameInput.value.trim()) || "";

    if (!username || !password) {
      setStatus("아이디와 비밀번호는 꼭 입력해야 해요.");
      return;
    }

    try {
      setStatus("회원가입 중이에요...");
      var res = await postToSheet({
        mode: "signup",
        username: username,
        password: password,
        nickname: nickname
      });
      var json = await res.json();
      if (!json.ok) {
        setStatus(json.error || "회원가입에 실패했어요.");
        return;
      }

      window.currentUser = {
        user_id: json.user_id,
        username: username,
        nickname: json.nickname || nickname || username
      };
      try {
        localStorage.setItem("ghostUser", JSON.stringify(window.currentUser));
      } catch (e) {}

      setStatus("회원가입이 완료되었어요! 자동으로 로그인했어요.");
      {
        const line = (function(name){ const lines = [name + " 반가워! 이제 같이 놀자.", name + " 가입 끝났어! 이제 편하게 말 걸어줘.", name + " 왔네! 오늘부터 같이 잘 지내보자." ]; return lines[Math.floor(Math.random() * lines.length)]; })(window.currentUser.nickname || username);
        if (typeof setEmotion === "function") setEmotion("기쁨", line);
        else if (typeof showBubble === "function") showBubble(line);
      }

      updateLogoutVisibility();
      updatePlusMenuLoginLabel();
      emitUserChanged();
      setTimeout(closeLoginPanel, 800);
      setTimeout(function () {
        if (window.AttendanceWeekly && typeof AttendanceWeekly.handleLoginSuccess === "function") {
          try {
            AttendanceWeekly.handleLoginSuccess();
          } catch (e) {}
        }
      }, 700);

    } catch (e) {
      console.error("회원가입 실패:", e);
      setStatus("회원가입 중 오류가 발생했어요.");
    }
  }

  function doLogout() {
    try {
      localStorage.removeItem("ghostUser");
    } catch (e) {}
    window.currentUser = null;
    setStatus("로그아웃 되었어요.");
    {
      const line = "다음에 또 와. 기다리고 있을게!";
      if (typeof setEmotion === "function") setEmotion("인사", line);
      else if (typeof showBubble === "function") showBubble(line);
    }
    updateLogoutVisibility();
    updatePlusMenuLoginLabel();
    emitUserChanged();
  }

  // ==============================
  // 이벤트 연결 / 게스트 / 토글
  // ==============================
  function wireEventsOnce() {
    var els = getEls();
    if (els.formLogin && !els.formLogin._wiredLogin) {
      els.formLogin.addEventListener("submit", handleLoginSubmit);
      els.formLogin._wiredLogin = true;
    }
    if (els.formSignup && !els.formSignup._wiredSignup) {
      els.formSignup.addEventListener("submit", handleSignupSubmit);
      els.formSignup._wiredSignup = true;
    }
    if (els.closeBtn && !els.closeBtn._wiredClose) {
      els.closeBtn.addEventListener("click", closeLoginPanel);
      els.closeBtn._wiredClose = true;
    }
    if (els.backdrop && !els.backdrop._wiredClose) {
      els.backdrop.addEventListener("click", closeLoginPanel);
      els.backdrop._wiredClose = true;
    }
    if (els.signupToggleBtn && !els.signupToggleBtn._wiredToggle) {
      els.signupToggleBtn.addEventListener("click", function () {
        var area = els.signupArea || document.getElementById("signupArea");
        if (!area) return;
        if (area.classList.contains("hidden")) {
          area.classList.remove("hidden");
        } else {
          area.classList.add("hidden");
        }
      });
      els.signupToggleBtn._wiredToggle = true;
    }
    if (els.guestLoginBtn && !els.guestLoginBtn._wiredGuest) {
      els.guestLoginBtn.addEventListener("click", function () {
        var rand = Math.floor(100000 + Math.random() * 900000);
        var username = "guest" + rand;
        window.currentUser = {
          user_id: "guest-" + rand,
          username: username,
          nickname: "게스트" + String(rand).slice(-4),
          isGuest: true
        };
        try {
          localStorage.setItem("ghostUser", JSON.stringify(window.currentUser));
        } catch (e) {}
        setStatus("게스트로 입장했어요. 나중에 회원가입하면 더 오래 기록을 남길 수 있어요.");
        {
          var nick = window.currentUser.nickname;
          var welcomes = [
            nick + "아, 어서 와! 오늘도 반가워.",
            nick + "아, 왔구나! 편하게 놀다 가.",
            nick + "아, 반가워! 오늘 뭐부터 해볼까?",
            nick + "아, 어서 와. 수다 떨고 가도 좋고, 쉬다 가도 좋아.",
            nick + "아, 또 만났네! 편하게 말 걸어줘."
          ];
          var line = welcomes[Math.floor(Math.random() * welcomes.length)];
          if (typeof setEmotion === "function") setEmotion("인사", line);
          else if (typeof showBubble === "function") showBubble(line);
        }
        updateLogoutVisibility();
        updatePlusMenuLoginLabel();
        emitUserChanged();
        setTimeout(closeLoginPanel, 600);
      setTimeout(function () {
        if (window.AttendanceWeekly && typeof AttendanceWeekly.handleLoginSuccess === "function") {
          try {
            AttendanceWeekly.handleLoginSuccess();
          } catch (e) {}
        }
      }, 700);

      });
      els.guestLoginBtn._wiredGuest = true;
    }
    if (els.logoutBtn && !els.logoutBtn._wiredLogout) {
      els.logoutBtn.addEventListener("click", function () {
        doLogout();
      });
      els.logoutBtn._wiredLogout = true;
    }
  }

  // ==============================
  // 열기 / 닫기 / 초기화
  // ==============================
  function openLoginPanel() {
    var panel = createLoginDomIfNeeded();
    wireEventsOnce();

    panel.classList.remove("hidden");
    panel.classList.add("open");
    setStatus("");
    createOrUpdateLoginLogo();
    if (window.hideFullscreenButton) {
      try { window.hideFullscreenButton(); } catch (e) {}
    }

    // 저장된 사용자 아이디 미리 넣어주기
    try {
      var loginUsernameInput = document.getElementById("loginUsername");
      var raw = localStorage.getItem("ghostUser");
      if (raw && loginUsernameInput) {
        var obj = JSON.parse(raw);
        if (obj && obj.username) {
          loginUsernameInput.value = obj.username;
        }
      }
    } catch (e) {}

    updateLogoutVisibility();
    updatePlusMenuLoginLabel();
  }

  function closeLoginPanel() {
    var panel = document.getElementById("loginPanel");
    if (!panel) return;
    panel.classList.remove("open");
    panel.classList.add("hidden");
    hideLoginLogo();
    if (window.showFullscreenButton) {
      try { window.showFullscreenButton(); } catch (e) {}
    }
  }

  function initLoginModule() {
    createLoginDomIfNeeded();
    wireEventsOnce();
    updateLogoutVisibility();
    updatePlusMenuLoginLabel();

    // 첫 접속 시 로그인 패널을 맨 앞에 띄워 주기
    // - 이미 로그인되어 있는(currentUser가 존재하는) 경우에는 자동으로 열지 않습니다.
    // - currentUser가 없으면 반투명 검은 배경(login-backdrop)과 함께 로그인창을 표시합니다.
    if (!window.currentUser || !window.currentUser.user_id) {
      try {
        openLoginPanel();
      } catch (e) {}
    }
  }

  // 전역 노출
  window.openLoginPanel = openLoginPanel;
  window.closeLoginPanel = closeLoginPanel;
  window.initLoginModule = initLoginModule;
  window.logoutGhostUser = doLogout;

  // DOM 로드 후 자동 초기화
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLoginModule);
  } else {
    initLoginModule();
  }

  // window resize 시에도 로고 위치 재조정
  window.addEventListener("resize", function () {
    createOrUpdateLoginLogo();
  });
})();