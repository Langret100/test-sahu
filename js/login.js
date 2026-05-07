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
      '</div>',
      '<div id="loginAutoOverlay" class="login-auto-overlay hidden">',
      '  <div id="loginAutoText" class="login-auto-card">로그인 완료!</div>',
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
  // 자동 로그인 완료 안내(이미 로그인 상태에서 1회 표시 후 자동 닫힘)
  // - 로그인창 "앞"에 오버레이로 '로그인 완료!'만 표시
  // - 이 모드에서는 로그아웃 버튼/입력폼을 보여주지 않음
  // ==============================
  function showLoginAutoOverlay(msg) {
    var panel = document.getElementById("loginPanel");
    if (!panel) return;
    var overlay = document.getElementById("loginAutoOverlay");
    var textEl = document.getElementById("loginAutoText");
    if (textEl) textEl.textContent = msg || "로그인 완료!";
    if (overlay) overlay.classList.remove("hidden");
    panel.classList.add("autoclose-mode");
    // 로그아웃 버튼은 굳이 노출하지 않음(요청사항)
    try {
      var els = getEls();
      if (els && els.logoutBtn) els.logoutBtn.classList.add("hidden");
    } catch (e) {}
  }

  function hideLoginAutoOverlay() {
    var panel = document.getElementById("loginPanel");
    var overlay = document.getElementById("loginAutoOverlay");
    if (overlay) overlay.classList.add("hidden");
    if (panel) panel.classList.remove("autoclose-mode");
  }



  // ==============================
  // 비로그인 상태에서는 로그인 패널을 닫을 수 없게
  // - 바깥(백드롭) 클릭, X 버튼 클릭으로 닫히지 않음
  // - 로그인/게스트 로그인 성공 시에만 닫힘
  // ==============================
  function canCloseLoginPanel() {
    return !!(window.__loginConfirmed && window.currentUser && window.currentUser.user_id);
  }

  function requestCloseLoginPanel() {
    if (!canCloseLoginPanel()) {
      setStatus("로그인해야 계속 사용할 수 있어요.");
      return;
    }
    closeLoginPanel(true);
  }

  // ==============================
  // 로그인 / 회원가입 처리
  // ==============================
  function handleLoginSubmit(ev) {
    ev.preventDefault();
    if (!window.fetch || typeof postToSheet !== "function") return;

    var els = getEls();
    var username = (els.loginUsernameInput && els.loginUsernameInput.value.trim()) || "";
    var password = (els.loginPasswordInput && els.loginPasswordInput.value.trim()) || "";

    if (!username || !password) {
      setStatus("아이디와 비밀번호를 입력해 주세요.");
      return;
    }

    setStatus("로그인 중이에요...");
    Promise.resolve()
      .then(function () {
        return postToSheet({
          mode: "login",
          username: username,
          password: password
        });
      })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json || !json.ok) {
          setStatus((json && json.error) || "로그인에 실패했어요.");
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
        window.__loginConfirmed = true;

        // 프로필 매니저 등에 알림
        try {
          window.dispatchEvent(new CustomEvent("ghost:login-complete", {
            detail: { nickname: window.currentUser.nickname, user_id: window.currentUser.user_id }
          }));
          // 출석 도장 모듈 연동 (attendance-stamp.js가 수신)
          window.dispatchEvent(new CustomEvent("ghost:attendanceLogin", {
            detail: { user: window.currentUser }
          }));
        } catch (eEv) {}

        setStatus("로그인에 성공했어요!");
        if (typeof showBubble === "function") {
          showBubble((window.currentUser.nickname || username) + "님, 어서 와요!");
        }

        updateLogoutVisibility();
        setTimeout(closeLoginPanel, 800);
      })
      .catch(function (e) {
        console.error("로그인 실패:", e);
        setStatus("로그인 중 오류가 발생했어요.");
      });
  }

  function handleSignupSubmit(ev) {
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

    setStatus("회원가입 중이에요...");
    Promise.resolve()
      .then(function () {
        return postToSheet({
          mode: "signup",
          username: username,
          password: password,
          nickname: nickname
        });
      })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json || !json.ok) {
          setStatus((json && json.error) || "회원가입에 실패했어요.");
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
        window.__loginConfirmed = true;
        try {
          window.dispatchEvent(new CustomEvent("ghost:login-complete", {
            detail: { nickname: window.currentUser.nickname, user_id: window.currentUser.user_id }
          }));
          window.dispatchEvent(new CustomEvent("ghost:attendanceLogin", {
            detail: { user: window.currentUser }
          }));
        } catch (eEv) {}
        setStatus("회원가입이 완료되었어요! 자동으로 로그인했어요.");
        if (typeof showBubble === "function") {
          showBubble((window.currentUser.nickname || username) + "님, 반가워요!");
        }

        updateLogoutVisibility();
        setTimeout(closeLoginPanel, 800);
      })
      .catch(function (e) {
        console.error("회원가입 실패:", e);
        setStatus("회원가입 중 오류가 발생했어요.");
      });
  }

  function doLogout() {
    try {
      localStorage.removeItem("ghostUser");
    } catch (e) {}
    window.currentUser = null;
    window.__loginConfirmed = false;
    if (typeof showBubble === "function") {
      showBubble("다음에 또 와요!");
    }
    updateLogoutVisibility();
    // 로그아웃 이벤트 발송 → 버튼 텍스트 갱신
    window.dispatchEvent(new CustomEvent("ghost:logout"));
    // 로그인 패널 자동 오픈
    setTimeout(function () {
      openLoginPanel();
    }, 300);
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
      els.closeBtn.addEventListener("click", requestCloseLoginPanel);
      els.closeBtn._wiredClose = true;
    }
    if (els.backdrop && !els.backdrop._wiredClose) {
      els.backdrop.addEventListener("click", requestCloseLoginPanel);
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
        window.__loginConfirmed = true;
        setStatus("게스트로 입장했어요. 나중에 회원가입하면 더 오래 기록을 남길 수 있어요.");
        if (typeof showBubble === "function") {
          showBubble(window.currentUser.nickname + "님, 가볍게 놀다 가요!");
        }
        try {
          window.dispatchEvent(new CustomEvent("ghost:login-complete", {
            detail: { nickname: window.currentUser.nickname, user_id: window.currentUser.user_id }
          }));
        } catch (eEv) {}
        updateLogoutVisibility();
        setTimeout(closeLoginPanel, 600);
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

    try { hideLoginAutoOverlay(); } catch (e) {}

    panel.classList.remove("hidden");
    requestAnimationFrame(function () {
      panel.classList.add("open");
    });
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
  }

  function closeLoginPanel(force) {
    // 비로그인 상태에서는 패널이 절대 닫히지 않게(로그인 성공 시에만 닫힘)
    if (!force && !canCloseLoginPanel()) {
      return;
    }
    var panel = document.getElementById("loginPanel");
    if (!panel) return;
    panel.classList.remove("open"); // opacity:0 transition 시작
    setTimeout(function () {
      if (!panel.classList.contains("open")) {
        panel.classList.add("hidden"); // transition 끝난 후 숨김
      }
    }, 220);
    try { hideLoginAutoOverlay(); } catch (e) {}
    hideLoginLogo();
    if (window.showFullscreenButton) {
      try { window.showFullscreenButton(); } catch (e) {}
    }
  }

  function initLoginModule() {
    createLoginDomIfNeeded();
    wireEventsOnce();
    updateLogoutVisibility();

    // 저장된 사용자 정보가 있으면 먼저 복원(로딩 순서 이슈로 비로그인인데 닫히는 현상 방지)
    if ((!window.currentUser || !window.currentUser.user_id) && typeof localStorage !== "undefined") {
      try {
        var _raw = localStorage.getItem("ghostUser");
        if (_raw) {
          var _obj = JSON.parse(_raw);
          if (_obj && _obj.user_id) {
            window.currentUser = _obj;
            window.__loginConfirmed = true;
          }
        }
      } catch (e) {}
    }

    // 첫 접속 시 로그인 패널 표시 규칙
    // - 비로그인 상태: 반드시 표시
    // - 이미 로그인 상태라도(저장된 ghostUser 복원 등): "이번 탭에서 아직 한 번도 로그인창을 띄운 적이 없으면" 1회 표시
    //   (계정 전환/로그인 상태 확인 목적, 닫기는 가능)
    var _promptShown = false;
    try { _promptShown = (sessionStorage.getItem("ghostLoginPromptShown") === "1"); } catch (e) {}

    var _needPrompt = (!window.currentUser || !window.currentUser.user_id) || !_promptShown;
    if (_needPrompt) {
      try {
        openLoginPanel();
        // 이미 로그인 상태라면 로그인창 "앞"에 "로그인 완료!"만 표시하고 자동으로 닫기
        if (window.currentUser && window.currentUser.user_id) {
          try { showLoginAutoOverlay("로그인 완료!"); } catch (e) {}
          try { setTimeout(function () { try { closeLoginPanel(); } catch (e2) {} }, 650); } catch (e) {}
        }
        try { sessionStorage.setItem("ghostLoginPromptShown", "1"); } catch (e) {}
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