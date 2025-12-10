// [Feature] Math Explorer 자동 게시판 기록 모듈 (postMessage 수신 버전)
// - 역할: 수학 탐험대 iframe에서 보낸 점수 메시지를 받아 게시판에 자동 글을 남깁니다.
// - 사용 위치: index.html (부모 창)에서 로드됩니다.
// - 통신 방식: iframe → parent.postMessage({ type: "MATH_EXPLORER_RESULT", ... })
// - 의존성: postToSheet (ui.js), window.currentUser, currentCharacterName/currentCharacterKey, window.reloadBoardList
// - 제거 방법:
//   1) index.html 에서 js/game-math-explorer-report.js 로딩 스크립트를 삭제하고
//   2) js/game-math-explorer-report.js 파일을 삭제하세요.
//   3) js/math-explorer-bridge.js 파일도 함께 삭제하거나, 게임 HTML에서 <script src="../js/math-explorer-bridge.js"> 태그를 제거하세요.

(function (global) {
  if (!global || !global.addEventListener) return;

  function getNickname() {
    var user = global.currentUser || {};
    return user.nickname || user.username || "누군가";
  }

  function getCharacterName(data) {
    data = data || {};
    try {
      if (typeof data.characterName === "string" && data.characterName.trim()) {
        return data.characterName.trim();
      }
      if (typeof data.characterType === "string" && data.characterType.trim()) {
        var t = data.characterType.trim();
        if (t === "warrior") return "전사";
        if (t === "archer") return "궁수";
        if (t === "mage") return "마법사";
        if (t === "valkyrie") return "발키리";
        return t;
      }
    } catch (e) {
      // 캐릭터 이름 파싱 실패 시에는 아래 전역 이름/기본값을 사용
    }
    if (typeof global.currentCharacterName === "string" && global.currentCharacterName) {
      return global.currentCharacterName;
    }
    return "고스트";
  }

  function getModeLabel(hardFlag) {
    return hardFlag ? "하드 모드" : "일반 모드";
  }

  function formatDateTime(ts) {
    var d = ts ? new Date(ts) : new Date();
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    var h = d.getHours();
    var min = d.getMinutes();
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return y + "년 " + m + "월 " + day + "일 " + pad(h) + "시 " + pad(min) + "분";
  }

  async function handleResultMessage(data) {
    try {
      if (typeof global.postToSheet !== "function") {
        if (global.console && console.warn) {
          console.warn("[math-report] postToSheet 없음, 자동 기록 스킵");
        }
        return;
      }

      data = data || {};
      var rawScore = (typeof data.score === "number")
        ? data.score
        : parseInt(data.score || "0", 10) || 0;
      var score = Math.floor(rawScore);
      var stage = data.stage || 1;
      var hardFlag = !!data.hardMode;

      if (global.console && console.log) {
        console.log("[math-report] 수신 점수:", score, "stage:", stage, "hard:", hardFlag);
      }

      // 5000점 미만은 기록하지 않음
      if (!score || score < 5000) {
        if (global.console && console.log) {
          console.log("[math-report] 점수 미달로 자동 기록 안 함 (score =", score + ")");
        }
        return;
      }

      var nickname = getNickname();
      var charName = getCharacterName(data);
      var modeLabel = getModeLabel(hardFlag);
      var dtLabel = formatDateTime(data.endedAt);

      var title = nickname
        + "께서 수학 탐험대 (" + modeLabel + ")에서 '"
        + charName + "'로 " + score + "점을 달성하셨습니다. 축하드립니다.";

      var contentLines = [];
      contentLines.push("기록 시각: " + dtLabel);
      contentLines.push("도달 라운드: " + stage + " 라운드");
      contentLines.push("최종 점수: " + score + "점");
      contentLines.push("플레이 모드: " + modeLabel);
      contentLines.push("사용 캐릭터: " + charName);

      var content = contentLines.join("\n");
      var author = "[게임자동기록]";

      if (global.console && console.log) {
        console.log("[math-report] postToSheet 호출:", { title: title, author: author });
      }

      await global.postToSheet({
        mode: "board_write",
        title: title,
        author: author,
        content: content
      });

      if (global.console && console.log) {
        console.log("[math-report] postToSheet 완료");
      }

      if (typeof global.reloadBoardList === "function") {
        try {
          global.reloadBoardList();
          if (global.console && console.log) {
            console.log("[math-report] reloadBoardList 호출");
          }
        } catch (e) {
          if (global.console && console.warn) {
            console.warn("[math-report] reloadBoardList 호출 중 오류", e);
          }
        }
      }
    } catch (e) {
      if (global.console && console.warn) {
        console.warn("[math-report] handleResultMessage 오류", e);
      }
    }
  }

  function onMessage(ev) {
    try {
      var data = ev && ev.data;
      if (!data || data.type !== "MATH_EXPLORER_RESULT") return;
      handleResultMessage(data);
    } catch (e) {
      if (global.console && console.warn) {
        console.warn("[math-report] message 이벤트 처리 중 오류", e);
      }
    }
  }

  global.addEventListener("message", onMessage);

})(window);
