
// [옵션 모듈] 게임 모드 관리자 - game-manager.js
// - 게임 오버레이 표시/닫기
// - 캐릭터 축소, 채팅창 숨김, 감정표현 + 대사 트리거
// - 각 게임별 BGM 재생/정지
// - 제거하려면 index.html의 gameOverlay 영역과 js/game-manager.js 삭제,
//   js/menu-games.js 및 notebook-menu.js 안의 game1/2/3 연동 블록도 함께 삭제하세요.

(function(){
  const overlay = document.getElementById("gameOverlay");
  const frame = document.getElementById("gameFrame");
  const closeBtn = document.getElementById("gameCloseBtn");
  // [WG_XBTN_RELOCATED] 닫기 버튼이 iframe에 가려지거나(game-frame이 위에 그려짐),
  // topbar의 pointer-events 설정 영향으로 클릭이 막히는 문제를 피하기 위해
  // 오버레이 직속(iframe 뒤)으로 이동합니다.
  try {
    if (overlay && closeBtn && closeBtn.parentElement !== overlay) {
      overlay.appendChild(closeBtn); // iframe 다음으로 이동 -> 항상 위에 보이도록
    }
  } catch(e) {}

  const chatPanel = document.getElementById("chatPanel");
  const body = document.body;

  // [게임 BGM] 각 게임별 배경 음악 관리
  const gameBgm = (function(){
    try {
      const audio = new Audio();
      audio.loop = true;
      audio.volume = 0.6;
      return audio;
    } catch(e){
      return null;
    }
  })();

  const BGM_MAP = {
    game1: "sounds/game1.mp3",
    game2: "sounds/game2.mp3",
    game3: "sounds/game3.mp3"
  };

  function playGameBgm(key){
    if (!gameBgm) return;
    const src = BGM_MAP[key];
    if (!src) return;
    try {
      gameBgm.pause();
      gameBgm.src = src;
      gameBgm.currentTime = 0;
      gameBgm.play().catch(()=>{});
    } catch(e){}
  }

  function stopGameBgm(){
    if (!gameBgm) return;
    try { gameBgm.pause(); } catch(e){}
  }

  function enterGame(url, bgmKey){
    if (!overlay || !frame) return;
    const isMessenger = (bgmKey === "messenger");
    frame.src = url;
    overlay.classList.remove("hidden");
    try { overlay.dataset.mode = bgmKey || ""; } catch(e) {}
    // [X-only 닫기 버튼] 일부 게임(구구단/덧셈주사위/꿈틀이도형추적자/수학탐험대)에서만 외부 ✕ 표시
    const xOnly = (bgmKey === "game1" || bgmKey === "game2" || bgmKey === "game3" || bgmKey === "game4");
    try {
      if (xOnly) overlay.classList.add("x-only");
      else overlay.classList.remove("x-only");
    } catch(e) {}
    try {
      if (closeBtn) closeBtn.style.display = xOnly ? "inline-flex" : "none";
    } catch(e) {}


    

    // 실시간 톡 화면에서는 외부 상단바를 확실히 숨기기 위한 모드 클래스
    try {
      if (bgmKey === "messenger") {
        overlay.classList.add("mode-messenger");
      } else {
        overlay.classList.remove("mode-messenger");
      }
    } catch(e) {}
if (chatPanel) chatPanel.classList.add("hidden");
    if (body) body.classList.add("is-game-mode");

    if (bgmKey) playGameBgm(bgmKey);

    // '실시간 톡 보기(마이파 톡)'는 게임 시작 멘트 대신 전용 안내 멘트 사용
    // - 요구사항: 아래 두 문장 중 하나만 "무작위"로 말하기 (이어 말하기/붙여 말하기 금지)
    if (isMessenger) {
      if (typeof setEmotion === "function") {
        const lines = [
          "저는 잠시 조용히 있을게요.",
          "마이파 톡을 열게요."
        ];
        const pick = lines[Math.floor(Math.random() * lines.length)];
        try { setEmotion("미소", pick); } catch(e){}
      }
    } else {
      if (typeof window.gameReact === "function"){
        try { window.gameReact("start"); } catch(e){}
      }
    }
  }

  function exitGame(){
    if (!overlay || !frame) return;
    const wasMessenger = (overlay.classList.contains("mode-messenger") || (overlay.dataset && overlay.dataset.mode === "messenger"));
    try { overlay.dataset.mode = ""; overlay.removeAttribute("data-mode"); } catch(e) {}
    
    try { overlay.classList.remove("mode-messenger"); } catch(e) {}
overlay.classList.add("hidden");
    frame.src = "";
    stopGameBgm();

    if (chatPanel) chatPanel.classList.remove("hidden");
    if (body) body.classList.remove("is-game-mode");

    // [마이파 톡 예외] 닫을 때는 다른 게임들과 달리 "닫힘 대사"를 치지 않기
    // - 즉시 조용히 기본대기 표정으로 복귀 (말풍선 없이)
    if (wasMessenger && typeof setEmotion === "function"){
      try { setEmotion("기본대기", null, { silent: true }); } catch(e){}
    }

    // 종료 멘트 + 감정 표현 (실시간 톡은 끌 때 아무 말도 하지 않음)
    if (!wasMessenger && typeof window.gameReact === "function"){
      try { window.gameReact("exit"); } catch(e){}
    }

    // 혹시 다른 모듈에서 감정을 바꾸더라도,
    // 일정 시간이 지나면 강제로 기본대기로 한 번 더 복귀시킵니다.
    if (typeof setEmotion === "function"){
      // 실시간 톡(마이파 톡)은 닫을 때 캐릭터가 "대사"를 치지 않도록 조용히 복귀
      // - 기존: "기본대기"로 돌릴 때 빈 문자열(" ")이 들어가면 랜덤 대사가 나올 수 있음
      // - 해결: wasMessenger인 경우 silent 옵션으로 표정만 복귀
      setTimeout(function(){
        try {
          if (wasMessenger) setEmotion("기본대기", null, { silent: true });
          else setEmotion("기본대기", "");
        } catch(e){}
      }, 6000);
    }
  }

  if (closeBtn){
    closeBtn.addEventListener("click", exitGame);
  }

  window.launchGame1 = function(){ enterGame("games/구구단게임.html","game1"); };
  window.launchGame2 = function(){ enterGame("games/덧셈주사위.html","game2"); };
  window.launchGame3 = function(){ enterGame("games/꿈틀이도형추적자.html","game3"); };
  window.launchGame4 = function(){ enterGame("games/math-explorer.html","game4"); };
  window.launchMessenger = function(){ enterGame("games/social-messenger.html","messenger"); };

  window.exitGame = exitGame;

  // iframe(게임/실시간 톡) 내부에서 닫기 요청이 오는 경우(postMessage)
  window.addEventListener("message", function(ev){
    const data = ev && ev.data;
    if (!data) return;
    // {type:"WG_EXIT_GAME"} 또는 문자열 형태 모두 지원
    if (data === "WG_EXIT_GAME" || (typeof data === "object" && data.type === "WG_EXIT_GAME")) {
      exitGame();
    }
  });

})();
