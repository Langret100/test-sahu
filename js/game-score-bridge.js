// 게임 점수 전달 브릿지 모듈 (game-score-bridge.js)
// - iframe 안에서 실행되는 각 게임이 부모 창으로 postMessage로 점수를 보내면,
//   이 모듈이 받아서 game-ranking-report.js의 send 함수를 호출해 Google Apps Script로 전송합니다.
// - 이 파일을 삭제하면 postMessage 기반 점수 전송 기능만 비활성화됩니다.

(function(global){
  if (!global || !global.addEventListener) return;

  global.addEventListener("message", function(ev){
    try {
      var data = ev && ev.data;
      if (!data || data.type !== "GAME_SCORE") return;

      if (!global.gameRankingReport || typeof global.gameRankingReport.send !== "function") {
        console.warn("[game-score-bridge] gameRankingReport.send 가 없어 점수를 전송하지 못했습니다.", data);
        return;
      }

      var gameName = data.gameName || data.game || "";
      var score = Number(data.score || 0);
      if (!gameName || !isFinite(score) || score <= 0) {
        console.warn("[game-score-bridge] 잘못된 GAME_SCORE 데이터", data);
        return;
      }

      global.gameRankingReport.send(gameName, score);
    } catch (e){
      console.error("[game-score-bridge] message 처리 중 오류", e);
    }
  });
})(window);
