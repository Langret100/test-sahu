// web-launcher.js - 외부 사이트(구글/유튜브/네이버 등) 열기/닫기/기본화면 복귀
(function () {
  if (window.WebLauncher) return;

  const SITES = [
    { key: "google", labels: ["구글", "google"], url: "https://www.google.com/", displayName: "구글" },
    { key: "youtube", labels: ["유튜브", "youtube", "yt"], url: "https://www.youtube.com/", displayName: "유튜브" },
    { key: "naver", labels: ["네이버", "naver"], url: "https://www.naver.com/", displayName: "네이버" },
    { key: "myparty", labels: ["마이파티", "multiroom", "멀티룸"], url: "https://langret100.github.io/multiroom-playground/", displayName: "마이파티" }
  ];

  let openedSiteWindow = null;
  let openedSiteInfo = null;

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/\s+/g, "");
  }

  function stripWakePrefix(text) {
    let t = String(text || "").trim();
    const names = [];
    try {
      if (window.currentCharacterName) names.push(String(window.currentCharacterName));
    } catch (e) {}
    names.push("미나", "민수", "마이파이", "얘", "야", "저기", "있잖아");
    names.forEach(function (name) {
      if (!name) return;
      const re = new RegExp("^(?:" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")([야아야요!,~ ]+)?", "i");
      t = t.replace(re, "").trim();
    });
    return t;
  }

  function detectSite(text) {
    const norm = normalize(text);
    for (const site of SITES) {
      for (const label of site.labels) {
        if (norm.includes(normalize(label))) return site;
      }
    }
    return null;
  }

  function containsAny(text, arr) {
    const norm = normalize(text);
    return arr.some(function (word) { return norm.includes(normalize(word)); });
  }

  function isOpenCommand(text) {
    return containsAny(text, ["열어줘", "열어 줘", "열어", "켜줘", "켜 줘", "켜", "들어가", "들어가줘", "접속해", "접속해줘", "접속해 줘", "접속", "틀어줘"]);
  }


  function isDirectSiteOnlyCommand(text, site) {
    if (!site) return false;
    const norm = normalize(text);
    return site.labels.some(function (label) {
      return norm === normalize(label);
    });
  }

  function isCloseCommand(text) {
    return containsAny(text, ["닫아", "닫아줘", "닫아 줘", "꺼줘", "꺼 줘", "꺼", "끄기", "기본화면", "기본 화면", "처음화면", "처음 화면", "돌아가", "돌아가줘", "홈으로"]);
  }

  function speak(line) {
    if (typeof window.showBubble === "function") {
      try { window.showBubble(line); } catch (e) {}
    }
    if (typeof window.logMessage === "function") {
      try { window.logMessage("ghost", line); } catch (e) {}
    }
  }

  function closeKnownPanels() {
    try {
      const overlay = document.getElementById("gameOverlay");
      const isGameOpen = !!(overlay && !overlay.classList.contains("hidden"));
      if (isGameOpen && typeof window.exitGame === "function") window.exitGame();
    } catch (e) {}
    try { if (typeof window.closeNotebookMenu === "function") window.closeNotebookMenu(); } catch (e) {}
    try { if (typeof window.closeBoardPanel === "function") window.closeBoardPanel(); } catch (e) {}
    try {
      if (typeof window.closeLoginPanel === "function") window.closeLoginPanel();
      else {
        const loginPanel = document.getElementById("loginPanel");
        if (loginPanel) { loginPanel.classList.remove("open"); loginPanel.classList.add("hidden"); }
      }
    } catch (e) {}
    try {
      const manual = document.getElementById("manualPanel");
      if (manual) { manual.classList.remove("open"); manual.classList.add("hidden"); }
    } catch (e) {}
    try {
      const plusMenu = document.getElementById("plusMenu");
      if (plusMenu) plusMenu.classList.remove("open");
    } catch (e) {}
  }

  function restoreDefaultScreen() {
    closeKnownPanels();
    if (openedSiteWindow && !openedSiteWindow.closed) {
      try { openedSiteWindow.close(); } catch (e) {}
    }
    openedSiteWindow = null;
    openedSiteInfo = null;
  }

  function openSite(site, options) {
    if (!site) return false;
    restoreDefaultScreen();

    const lines = [
      site.displayName + " 열어드릴게요~",
      site.displayName + "로 접속합니다!"
    ];
    const line = lines[Math.floor(Math.random() * lines.length)];

    const silent = !!(options && options.silent);
    try { if (!silent && typeof window.setEmotion === "function") window.setEmotion("기쁨", line); } catch (e) {}
    if (!silent) speak(line);

    let popup = null;
    try {
      popup = window.open(site.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("WebLauncher window.open error:", e);
    }
    openedSiteWindow = popup || null;
    openedSiteInfo = site;

    if (!popup && typeof window.showBubble === "function") {
      setTimeout(function () {
        try { window.showBubble("새 창이 막혔을 수 있어요. 브라우저의 팝업 차단 설정을 확인해 주세요."); } catch (e) {}
      }, 800);
    }
    return true;
  }

  function closeSiteOrReturn(options) {
    const plusMenu = document.getElementById("plusMenu");
    const notebookMenu = document.getElementById("notebookMenu");
    const boardPanel = document.getElementById("boardPanel");
    const loginPanel = document.getElementById("loginPanel");
    const overlay = document.getElementById("gameOverlay");
    const hasOpenSite = !!(openedSiteWindow && !openedSiteWindow.closed);
    const hasOpenUi = !!((plusMenu && plusMenu.classList.contains("open")) ||
      (notebookMenu && notebookMenu.classList.contains("open")) ||
      (boardPanel && !boardPanel.classList.contains("hidden")) ||
      (loginPanel && !loginPanel.classList.contains("hidden")) ||
      (overlay && !overlay.classList.contains("hidden")));
    const targetName = openedSiteInfo ? openedSiteInfo.displayName : (hasOpenUi ? "열린 화면" : "메뉴");
    const line = hasOpenSite || hasOpenUi
      ? targetName + " 닫고 기본화면으로 돌아갈게요."
      : "기본화면으로 정리해둘게요.";
    const silent = !!(options && options.silent);
    try { if (!silent && typeof window.setEmotion === "function") window.setEmotion("인사", line); } catch (e) {}
    if (!silent) speak(line);
    restoreDefaultScreen();
    return true;
  }

  function handleCommand(rawText, options) {
    const original = String(rawText || "").trim();
    if (!original) return false;
    const text = stripWakePrefix(original);
    const site = detectSite(text);

    if (site && (isOpenCommand(text) || isDirectSiteOnlyCommand(text, site))) {
      return openSite(site, options);
    }

    if (isCloseCommand(text)) {
      return closeSiteOrReturn(options);
    }

    return false;
  }

  window.WebLauncher = {
    handleCommand: handleCommand,
    openSiteByText: function (text, options) {
      const site = detectSite(text);
      if (!site) return false;
      return openSite(site, options);
    },
    restoreDefaultScreen: restoreDefaultScreen,
    hasOpenWindow: function () {
      return !!(openedSiteWindow && !openedSiteWindow.closed);
    }
  };
})();
