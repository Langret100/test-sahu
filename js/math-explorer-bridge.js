// [Feature] Math Explorer game bridge (postMessage 버전)
// - 역할: 수학 탐험대 게임 오버 시 부모 창으로 점수를 postMessage로 보냅니다.
// - 사용 위치: games/math-explorer.html iframe 내부
// - 의존성: 전역 G 객체(const G 또는 window.G), 전역 hardMode 플래그
// - 제거 방법:
//   1) games/math-explorer.html 의 <script src="../js/math-explorer-bridge.js"> 태그를 삭제하고
//   2) js/math-explorer-bridge.js 파일을 삭제하세요.

(function () {
  function getGameGlobal() {
    try {
      if (typeof G !== "undefined" && G && typeof G.gameOver === "function") {
        return G;
      }
    } catch (e) {
      // G가 전혀 선언되지 않은 경우 ReferenceError 방지
    }
    if (window.G && typeof window.G.gameOver === "function") {
      return window.G;
    }
    return null;
  }

  function patchGameOver() {
    var gameGlobal = getGameGlobal();
    if (!gameGlobal) return false;

    if (gameGlobal.__mathExplorerBridgePatched) {
      return true;
    }

    var originalGameOver = gameGlobal.gameOver.bind(gameGlobal);

    gameGlobal.gameOver = function () {
      // 원래 게임 오버 동작 먼저 수행
      try {
        originalGameOver.apply(gameGlobal, arguments);
      } catch (e) {
        if (window.console && console.warn) {
          console.warn("[math-explorer-bridge] original gameOver error", e);
        }
      }

      try {
        var score = (typeof gameGlobal.score === "number")
          ? gameGlobal.score
          : (parseInt(gameGlobal.score || 0, 10) || 0);
        var stage = (typeof gameGlobal.stage === "number")
          ? gameGlobal.stage
          : (parseInt(gameGlobal.stage || 1, 10) || 1);
        // 하드 모드 플래그 결정
        // - 2025-12-08 변경:
        //   * games/math-explorer.html 에서 top-level `let hardMode = true/false;` 로 설정한 값
        //   * gameGlobal.hardMode
        //   * window.hardMode
        //   세 군데 중 어느 쪽이든 true 면 하드 모드로 취급합니다.
        var hardFlag = false;
        try {
          var localHardMode = (typeof hardMode !== "undefined") ? hardMode : undefined;
          hardFlag = !!(localHardMode || gameGlobal.hardMode || window.hardMode);
        } catch (e) {
          hardFlag = !!(gameGlobal.hardMode || window.hardMode);
        }

        // 캐릭터 정보 추출 (게임 내 캐릭터)
        var charName = "";
        var charType = "";
        try {
          if (gameGlobal.player && gameGlobal.player.design) {
            if (typeof gameGlobal.player.design.name === "string") {
              charName = gameGlobal.player.design.name;
            }
            if (typeof gameGlobal.player.design.type === "string") {
              charType = gameGlobal.player.design.type;
            }
          }
        } catch (e) {
          // 캐릭터 정보 실패는 치명적이지 않으므로 무시
        }

        if (window.console && console.log) {
          console.log("[math-explorer-bridge] gameOver -> score:", score, "stage:", stage, "hard:", hardFlag, "char:", charName || charType || "(unknown)");
        }

        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: "MATH_EXPLORER_RESULT",
            score: score,
            stage: stage,
            hardMode: hardFlag,
            endedAt: Date.now(),
            characterName: charName,
            characterType: charType
          }, "*");
        }
      } catch (err) {
        if (window.console && console.warn) {
          console.warn("[math-explorer-bridge] reporting/postMessage error", err);
        }
      }
    };

    gameGlobal.__mathExplorerBridgePatched = true;
    if (window.console && console.log) {
      console.log("[math-explorer-bridge] patched gameOver on gameGlobal");
    }
    return true;
  }

  // 즉시 시도 후, 아직 G가 준비되지 않았다면 잠시 간격을 두고 재시도
  if (!patchGameOver()) {
    var retryCount = 0;
    var timer = setInterval(function () {
      retryCount++;
      if (patchGameOver() || retryCount > 20) { // 최대 약 2초 정도 재시도
        clearInterval(timer);
      }
    }, 100);
  }
})();
