
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
    frame.src = url;
    overlay.classList.remove("hidden");

    if (chatPanel) chatPanel.classList.add("hidden");
    if (body) body.classList.add("is-game-mode");

    if (bgmKey) playGameBgm(bgmKey);

    if (typeof window.gameReact === "function"){
      try { window.gameReact("start"); } catch(e){}
    }
  }

  function exitGame(){
    if (!overlay || !frame) return;
    overlay.classList.add("hidden");
    frame.src = "";
    stopGameBgm();

    if (chatPanel) chatPanel.classList.remove("hidden");
    if (body) body.classList.remove("is-game-mode");

    // 종료 멘트 + 감정 표현
    if (typeof window.gameReact === "function"){
      try { window.gameReact("exit"); } catch(e){}
    }

    // 혹시 다른 모듈에서 감정을 바꾸더라도,
    // 일정 시간이 지나면 강제로 기본대기로 한 번 더 복귀시킵니다.
    if (typeof setEmotion === "function"){
      setTimeout(function(){
        try { setEmotion("기본대기", ""); } catch(e){}
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

  
})();
