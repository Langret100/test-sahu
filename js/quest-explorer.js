// quest-explorer.js - 오늘의 퀘스트 창(퀘스트 탐사)
// - 수첩의 "오늘의 퀘스트" 메모지를 눌렀을 때 뜨는 간단한 퀘스트 선택 창입니다.
// - 각 퀘스트 카드는 추후 하이퍼링크(학습지, 퀴즈, 가상교실, 책 읽기, 글쓰기 등)로 연결할 수 있습니다.
//
// 이 기능을 사용하지 않으려면:
// 1) 이 파일(js/quest-explorer.js)을 삭제하고
// 2) js/notebook-menu.js 안의 `case "quest"` 블록(오늘의 퀘스트 모듈 연동)도 같이 삭제하면
//    관련 코드가 모두 사라집니다.

(function(){
  const QUEST_LINKS = {
    worksheet: "https://docs.google.com/document/d/1Ixoc3qxps1rgiYfAb62XYOesA49ho_L2pdOCAroSJN8/edit?usp=sharing",        // 시간표
    quiz: "https://langret100.github.io/testcro/",
// 숫자악어
    virtualClass: "https://zep.us/play/2Xpkwp",
// 가상교실탐사
    reading: "https://langret100.github.io/testdama/",
// 동물키우기
    writing: "https://docs.google.com/document/d/12-FD31NrJTB6a8VxOhYKLfAxjziZo6qTSmasPoZkNLM/edit?usp=sharing"           // 학습지
  };

  const QUEST_KEYS = ["worksheet","quiz","virtualClass","reading","writing"];





  let panel = null;
  let questStatusBar = null;

  function playQuestStampSound() {
    try {
      if (!window.__ghostQuestStampAudio) {
        window.__ghostQuestStampAudio = new Audio("sounds/stamp.mp3");
      }
      const a = window.__ghostQuestStampAudio;
      a.currentTime = 0;
      a.play().catch(function(){});
    } catch (e) {}
  }


  function getQuestProgressStorageKey() {
    try {
      const user = (window && window.currentUser) || null;
      const uid = (user && user.user_id) ? user.user_id : "guest";
      return "questProgress:" + uid;
    } catch (e) {
      return "questProgress:guest";
    }
  }

  function getTodayIso() {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  function loadQuestProgress() {
    try {
      const key = getQuestProgressStorageKey();
      const raw = window.localStorage && localStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      // 날짜가 바뀌었으면 자동 초기화
      const today = getTodayIso();
      if (!parsed.date || parsed.date !== today) {
        return {};
      }
      return parsed.progress && typeof parsed.progress === "object"
        ? parsed.progress
        : {};
    } catch (e) {
      return {};
    }
  }

  function saveQuestProgress(progress) {
    try {
      const key = getQuestProgressStorageKey();
      const payload = {
        date: getTodayIso(),
        progress: progress || {}
      };
      window.localStorage && localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {}
  }

  function getQuestCounts() {
    const progress = loadQuestProgress();
    let done = 0;
    QUEST_KEYS.forEach(function (k) {
      if (progress && progress[k]) done++;
    });
    return { done, total: QUEST_KEYS.length };
  }

  function applyQuestStampToCard(key) {
    if (!panel || !key) return;
    try {
      const card = panel.querySelector('.qe-card[data-quest-key="' + key + '"]');
      if (card) {
        card.classList.add("qe-card-done");
        card.classList.add("done");
      }
    } catch (e) {}
  }

  function checkAllDoneEffect() {
    try {
      const progress = loadQuestProgress();
      const allDone = QUEST_KEYS.every(function (k) {
        return !!(progress && progress[k]);
      });
      if (!panel) return;
      const panelInner = panel.querySelector(".qe-panel");
      if (!panelInner) return;
      if (allDone) {
        // 5개 모두 완료되면 은은한 테두리 빛을 계속 유지
        panelInner.classList.add("qe-panel-glow");

        // 오늘의 퀘스트 5개 모두 완료 시 코인 보너스 훅 호출
        try {
          if (window.CoinBonus && typeof window.CoinBonus.handleQuestAllDone === "function") {
            window.CoinBonus.handleQuestAllDone();
          }
        } catch (e2) {}

      } else {
        // 하나라도 빠지면 다시 일반 상태로
        panelInner.classList.remove("qe-panel-glow");
      }
    } catch (e) {}
  }

  function markQuestDone(key) {
    if (!key) return;
    const progress = loadQuestProgress();
    if (progress[key]) {
      // 이미 완료 처리된 경우라도 상태 텍스트와 이펙트는 다시 갱신
      applyQuestStampToCard(key);
      checkAllDoneEffect();
      updateQuestStatusText();
      return;
    }
    progress[key] = true;
    saveQuestProgress(progress);
    playQuestStampSound();
    applyQuestStampToCard(key);
    checkAllDoneEffect();
    updateQuestStatusText();

    // 5개 퀘스트 모두 완료된 경우 코인 보상 요청 (옵션)
    try {
      if (window.__ghostCoinReward && typeof window.__ghostCoinReward.questAllDoneToday === "function") {
        var allDone = QUEST_KEYS.every(function (k) {
          return !!(progress && progress[k]);
        });
        if (allDone) {
          window.__ghostCoinReward.questAllDoneToday();
        }
      }
    } catch (e) {}
  }

  function restoreQuestStampsFromStorage() {
    const progress = loadQuestProgress();
    QUEST_KEYS.forEach(function (k) {
      if (progress && progress[k]) {
        applyQuestStampToCard(k);
      }
    });
    checkAllDoneEffect();
    updateQuestStatusText();
  }

  function ensureQuestStatusDom() {
    if (questStatusBar && document.body && document.body.contains(questStatusBar)) {
      return questStatusBar;
    }
    if (!document.body) return null;

    const bar = document.createElement("div");
    bar.id = "questStatusBar";
    bar.className = "quest-status-bar";

    const title = document.createElement("div");
    title.className = "quest-status-title";
    title.textContent = "퀘스트 현황";

    const link = document.createElement("div");
    link.className = "quest-status-link";
    link.textContent = "오늘의 과제 해결 (0/5)";

    link.addEventListener("click", function () {
      if (typeof window.openQuestExplorer === "function") {
        window.openQuestExplorer();
      } else if (typeof openQuestExplorer === "function") {
        openQuestExplorer();
      }
    });

    bar.appendChild(title);
    bar.appendChild(link);
    document.body.appendChild(bar);
    questStatusBar = bar;

    // 코인 상태 표시 모듈이 있다면, 퀘스트 바 생성 후 한 번 갱신을 요청
    try {
      if (window.__ghostRefreshCoinStatusBar) {
        window.__ghostRefreshCoinStatusBar();
      }
    } catch (e) {}

    return bar;
  }

  function updateQuestStatusText() {
    try {
      const bar = ensureQuestStatusDom();
      if (!bar) return;
      const counts = getQuestCounts();
      const titleEl = bar.querySelector(".quest-status-title");
      const linkEl = bar.querySelector(".quest-status-link");
      if (linkEl) {
        linkEl.textContent = "오늘의 과제 해결 (" + counts.done + "/" + counts.total + ")";
      }
      // 5개 모두 완료되면 제목/퀘스트 텍스트만 숨기고,
      // 코인 라벨이 같은 바 안에 남아 있을 수 있도록 바 자체는 유지한다.
      if (counts.done >= counts.total) {
        if (titleEl) titleEl.style.display = "none";
        if (linkEl) linkEl.style.display = "none";
        bar.style.display = "block";
      } else {
        if (titleEl) titleEl.style.display = "";
        if (linkEl) linkEl.style.display = "";
        bar.style.display = "block";
      }
    } catch (e) {}
  }

  function injectStyle(){
    if (document.getElementById("quest-explorer-style")) return;
    const style = document.createElement("style");
    style.id = "quest-explorer-style";
    style.textContent = `
      #questExplorerOverlay {
        position: fixed;
        inset: 0;
        z-index: 1800;
        display: none;
      }
      #questExplorerOverlay.active {
        display: block;
      }
      #questExplorerOverlay .qe-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.45);
      }
      #questExplorerOverlay .qe-panel {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        background: #faf4e6;
        border-radius: 20px;
        box-shadow: 0 18px 40px rgba(0,0,0,0.45);
        padding: 18px 20px 16px;
        width: min(420px, 90vw);
        max-height: 80vh;
        display: flex;
        flex-direction: column;
      }
      #questExplorerOverlay .qe-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      #questExplorerOverlay .qe-title {
        font-size: 18px;
        font-weight: 700;
        color: #333;
      }
      #questExplorerOverlay .qe-subtitle {
        font-size: 12px;
        color: #666;
        margin-bottom: 10px;
      }
      #questExplorerOverlay .qe-close {
        border: none;
        background: transparent;
        font-size: 18px;
        cursor: pointer;
        color: #888;
      }
      #questExplorerOverlay .qe-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 10px;
        margin-bottom: 4px;
      }
      #questExplorerOverlay .qe-card {
        border-radius: 14px;
        padding: 10px 12px;
        background: #fffdf7;
        box-shadow: 0 3px 0 #e1c9a0;
        border: 1px solid #f0dfc0;
        text-align: left;
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }
      #questExplorerOverlay .qe-card::before {
        content: "";
        position: absolute;
        top: 6px;
        left: 50%;
        width: 42px;
        height: 6px;
        background: #f0dfc0;
        border-radius: 999px;
        transform: translateX(-50%);
      }
      #questExplorerOverlay .qe-card-title {
        font-size: 14px;
        font-weight: 600;
        color: #333;
        margin-top: 10px;
      }
      #questExplorerOverlay .qe-card-desc {
        font-size: 11px;
        color: #777;
        margin-top: 4px;
      }
      #questExplorerOverlay .qe-footer {
        font-size: 11px;
        color: #999;
        margin-top: 4px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 8px;
      }
      #questExplorerOverlay .qe-footer-text {
        flex: 1;
        text-align: left;
      }
      #questExplorerOverlay .qe-footer-stamp {
        width: 54px;
        height: 54px;
        background-image: url("images/etcimage/quest_stamp.png");
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        opacity: 0.6;
        flex-shrink: 0;
      }
      #questExplorerOverlay .qe-card {
        border-radius: 14px;
        padding: 10px 12px;
        background: #fffdf7;
        box-shadow: 0 3px 0 #e1c9a0;
        border: 1px solid #f0dfc0;
        text-align: left;
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }
      #questExplorerOverlay .qe-card-stamp {
        position: absolute;
        right: -10px;
        bottom: -14px;
        width: 70px;
        height: 70px;
        background-image: url("images/etcimage/quest_stamp.png");
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        opacity: 0;
        transform: scale(0.4) rotate(-16deg);
        pointer-events: none;
        transition: opacity 0.22s ease-out, transform 0.22s ease-out;
      }
      #questExplorerOverlay .qe-card.done .qe-card-stamp,
      #questExplorerOverlay .qe-card.qe-card-done .qe-card-stamp {
        opacity: 1;
        transform: scale(1) rotate(-8deg);
      }
      #questExplorerOverlay .qe-card.done {
        background: #fffaf0;
        box-shadow: 0 3px 0 #e1c9a0, 0 0 0 1px rgba(255, 210, 160, 0.35);
      }
      #questExplorerOverlay .qe-panel.qe-panel-glow {
        animation: qeQuestGlow 1.2s ease-out 2;
      }
      @keyframes qeQuestGlow {
        0% {
          box-shadow: 0 18px 30px rgba(30, 16, 0, 0.32);
        }
        50% {
          box-shadow: 0 18px 34px rgba(30, 16, 0, 0.45), 0 0 30px rgba(255, 225, 150, 0.75);
        }
        100% {
          box-shadow: 0 18px 30px rgba(30, 16, 0, 0.32);
        }
      }

      .quest-status-bar {
        position: absolute;
        left: 18px;
        top: 122px; /* 시계보다 70px 더 아래 */
        z-index: 3;
        color: rgba(255,255,255,0.9);
        text-shadow: none;
        pointer-events: auto;
        user-select: none;
      }
      .quest-status-title {
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.12em;
        color: rgba(255,255,255,0.35); /* 조금 더 선명하게 */
      }
      .quest-status-link {
        margin-top: 2px;
        font-size: 13px; /* 위보다 조금 작게 */
        font-weight: 600;
        color: rgba(255,255,255,0.35); /* 위와 같은 색/투명도 */
        cursor: pointer;
        display: inline-block;
      }

      @media (max-width: 768px) {
        .quest-status-bar {
          left: 14px;
          top: 116px; /* 모바일에서도 70px 더 아래 */
        }
        .quest-status-title {
          font-size: 14px;
        }
        .quest-status-link {
          font-size: 12px;
        }
      }

      /* 퀘스트 전체 완료 시 패널 빛나는 이펙트 (천천히 반복 반짝임) */
      #questExplorerOverlay .qe-panel.qe-panel-glow {
        animation: qeQuestGlow 2.6s ease-in-out infinite;
      }
      @keyframes qeQuestGlow {
        0% {
          box-shadow: 0 18px 26px rgba(30, 16, 0, 0.40);
        }
        50% {
          box-shadow: 0 18px 44px rgba(30, 16, 0, 0.80), 0 0 34px rgba(255, 240, 200, 0.95);
        }
        100% {
          box-shadow: 0 18px 26px rgba(30, 16, 0, 0.40);
        }
      }

      @media (max-width: 700px) {
        #questExplorerOverlay .qe-panel {
          width: 94vw;
          padding: 14px 14px 12px;
        }
        #questExplorerOverlay .qe-title {
          font-size: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePanel(){
    if (panel) return panel;
    injectStyle();

    const overlay = document.createElement("div");
    overlay.id = "questExplorerOverlay";

    const backdrop = document.createElement("div");
    backdrop.className = "qe-backdrop";
    overlay.appendChild(backdrop);

    const panelInner = document.createElement("div");
    panelInner.className = "qe-panel";
    overlay.appendChild(panelInner);

    const header = document.createElement("div");
    header.className = "qe-header";

    const title = document.createElement("div");
    title.className = "qe-title";
    title.textContent = "퀘스트 목록";

    const closeBtn = document.createElement("button");
    closeBtn.className = "qe-close";
    closeBtn.textContent = "✕";

    header.appendChild(title);
    header.appendChild(closeBtn);

    const subtitle = document.createElement("div");
    subtitle.className = "qe-subtitle";
    subtitle.textContent = "오늘은 어떤 퀘스트를 해결해 볼까요?";

    const grid = document.createElement("div");
    grid.className = "qe-grid";

    const quests = [
      { key: "worksheet", label: "시간표", desc: "오늘의 수업 시간표를 확인해봐요." },
      { key: "quiz", label: "숫자악어", desc: "가볍게 문제를 풀며 복습해요." },
      { key: "virtualClass", label: "가상교실탐사", desc: "온라인 교실이나 가상 체험으로 떠나요." },
      { key: "reading", label: "동물친구", desc: "조용히 책을 읽으며 생각을 정리해요." },
      { key: "writing", label: "학습지", desc: "오늘의 학습지로 실력을 다져요." }
    ];

    quests.forEach((q) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "qe-card";
      card.setAttribute("data-quest-key", q.key);

      const titleEl = document.createElement("div");
      titleEl.className = "qe-card-title";
      titleEl.textContent = q.label;

      const descEl = document.createElement("div");
      descEl.className = "qe-card-desc";
      descEl.textContent = q.desc;

      card.appendChild(titleEl);
      card.appendChild(descEl);

      const stampEl = document.createElement("div");
      stampEl.className = "qe-card-stamp";
      card.appendChild(stampEl);

      card.addEventListener("click", () => {
        const link = QUEST_LINKS[q.key];
        const hasLink = !!(link && typeof link === "string" && /^https?:\/\//.test(link));
        if (hasLink) {
          // 링크가 연결된 퀘스트라면, 링크를 새 창으로 열어 주고
          // 현재 카드에는 도장(완료 표시)을 찍어 둡니다.
          markQuestDone(q.key);
          window.open(link, "_blank", "noopener");
        } else {
          if (window.showBubble) {
            try {
              window.showBubble("아직 '" + q.label + "' 퀘스트 링크가 연결되지 않았어요.");
            } catch (e) {}
          }
        }
      });

      grid.appendChild(card);
    });

    const footer = document.createElement("div");
    footer.className = "qe-footer";

    const footerText = document.createElement("div");
    footerText.className = "qe-footer-text";
    footerText.textContent = "※ 퀘스트 클리어시 도장이 찍혀요.";

    const footerStamp = document.createElement("div");
    footerStamp.className = "qe-footer-stamp";

    footer.appendChild(footerText);
    footer.appendChild(footerStamp);

    panelInner.appendChild(header);
    panelInner.appendChild(subtitle);
    panelInner.appendChild(grid);
    panelInner.appendChild(footer);

    backdrop.addEventListener("click", () => {
      overlay.classList.remove("active");
    });
    closeBtn.addEventListener("click", () => {
      overlay.classList.remove("active");
    });

    document.body.appendChild(overlay);
    panel = overlay;

    // 저장된 퀘스트 진행 상황(도장)을 복원합니다.
    restoreQuestStampsFromStorage();

    return overlay;
  }

  
  function openQuestExplorer(){
    // 오늘의 퀘스트 창을 열 때 고스트가 퀘스트 관련 멘트를 무작위로 안내
    if (window.showBubble) {
      try {
        const phrases = [
          "오늘은 어떤 미션이 기다리고 있을까요? 마음에 드는 걸 골라 보세요.",
          "퀘스트를 하나 골라서 천천히 도전해 볼까요?",
          "너무 어렵게 생각하지 말고, 재미있어 보이는 것부터 가볍게 시작해요.",
          "하고 싶은 활동을 고르면 제가 옆에서 계속 응원할게요!"
        ];
        const msg = phrases[Math.floor(Math.random() * phrases.length)];
        window.showBubble(msg);
      } catch (e) {}
    }

    const overlay = ensurePanel();
    overlay.classList.add("active");
  }

  // 페이지가 준비되면 상단 퀘스트 현황 바를 초기화합니다.
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const initQuestStatus = function () {
      try {
        // 퀘스트 현황 바 스타일도 함께 준비해 둡니다.
        injectStyle();
        updateQuestStatusText();
      } catch (e) {}
    };

    if (document.body) {
      // 이미 body가 존재하면 바로 한 번 실행
      initQuestStatus();
    } else {
      // 혹시 모를 상황을 위해 DOMContentLoaded에서 한 번 더 실행
      window.addEventListener("DOMContentLoaded", initQuestStatus);
    }

    // 혹시 타이밍이 어긋나는 경우를 대비해, 한 번 더 비동기로 실행
    }

  // 전역으로 공개
  window.openQuestExplorer = openQuestExplorer;
})();