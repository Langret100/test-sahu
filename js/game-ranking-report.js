// 게임 점수 랭킹 연동 모듈 (game-ranking-report.js)
// - 각 게임 HTML에서 이 모듈의 send 함수를 호출해 Google Apps Script로 점수를 전송합니다.
// - 이 파일을 삭제하면 점수 기록/랭킹 연동 기능만 사라지고, 게임 자체는 정상 동작합니다.

(function(global){
  const GAS_URL = "https://script.google.com/macros/s/AKfycbz6PjWqKuoTmTalX7ieq3NuhJr-6DPwFQI3c7sDCu9cSCFDt90DP4Ju0yIjfjOgyNoI6w/exec";

  function getUserInfo(){
    try {
      // 1) localStorage 에 저장된 로그인 정보 우선 사용
      let userId = null;
      let nickname = null;
      let username = null;

      if (global.localStorage) {
        const raw = global.localStorage.getItem("ghostUser") 
                 || global.localStorage.getItem("webGhostUser")
                 || global.localStorage.getItem("user");
        if (raw) {
          try {
            const u = JSON.parse(raw);
            userId   = u.user_id || u.id || u.userId || userId;
            nickname = u.nickname || u.nick || u.displayName || nickname;
            username = u.username || u.name || username;
          } catch(e){}
        }
      }

      // 2) 부모 창 전역 currentUser 참고 (있을 경우)
      const parentWin = global.parent && global.parent !== global ? global.parent : null;
      if (parentWin && parentWin.currentUser) {
        const cu = parentWin.currentUser;
        userId   = userId   || cu.user_id || cu.id || cu.userId;
        nickname = nickname || cu.nickname || cu.username || cu.name;
        username = username || cu.username || cu.name;
      }

      if (!userId) return null;

      return {
        user_id: userId,
        username: username || nickname || userId,
        nickname: nickname || username || ""
      };
    } catch(e){
      return null;
    }
  }

  
  
  async function send(gameName, score){
    try {
      const info = getUserInfo();
      if (!info) {
        // 로그인 정보가 없어서 랭킹에 기록하지 못한 경우
        try {
          const parentWin = global.parent && global.parent !== global ? global.parent : null;
          if (parentWin && typeof parentWin.showBubble === "function") {
            parentWin.showBubble("로그인 정보를 찾지 못해서 랭킹에 기록하지 못했어요.");
          }
        } catch(e2){}
        return;
      }
      const s = Number(score);
      if (!isFinite(s) || s <= 0) {
        // 점수가 0 이하일 때는 랭킹에 올리지 않음
        return;
      }

      const payload = {
        mode: "game_update_score",
        game_name: gameName,
        user_id: info.user_id,
        username: info.nickname || info.username || info.user_id,
        score: String(s)
      };

      const body = new URLSearchParams(payload);
      await fetch(GAS_URL, { method: "POST", body });
} catch(e){
      console.error("[game-ranking-report] send error", e);
      try {
        const parentWin = global.parent && global.parent !== global ? global.parent : null;
        if (parentWin && typeof parentWin.showBubble === "function") {
          parentWin.showBubble("랭킹 점수 전송 중 오류가 발생했어요.");
        }
      } catch(e2){}
    }
  }

  global.gameRankingReport = {
    send
  };

})(window);
