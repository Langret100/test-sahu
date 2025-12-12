/* js/coin-reward.js - 코인 보상 연동 모듈
   - 주간 출석 5일 달성, 게임 랭킹 1위 달성, 하루 5개 퀘스트 모두 완료 시
     Apps Script 웹 앱으로 코인 보상 요청을 보내는 모듈입니다.
   - 이 파일을 삭제하려면:
     1) index.html 안의 <script src="js/coin-reward.js"></script> 태그와
     2) js/attendance-stamp.js / js/quest-explorer.js / js/ranking.js 안의
        __ghostCoinReward.* 호출 구문을 함께 제거해야 합니다.
*/
(function (window) {
  if (typeof window === "undefined") return;

  function getCurrentUser() {
    try {
      if (window.currentUser && window.currentUser.user_id) {
        return window.currentUser;
      }
      if (window.localStorage) {
        var raw = window.localStorage.getItem("ghostUser");
        if (raw) {
          var obj = JSON.parse(raw);
          if (obj && obj.user_id) return obj;
        }
      }
    } catch (e) {}
    return null;
  }

  function getCoinApiBase() {
    try {
      if (typeof SPREADSHEET_URL !== "undefined" && SPREADSHEET_URL) {
        return SPREADSHEET_URL;
      }
      if (window.SPREADSHEET_URL) {
        return window.SPREADSHEET_URL;
      }
      if (window.API_BASE_URL) {
        return window.API_BASE_URL;
      }
    } catch (e) {}
    return "";
  }

  function postReward(payload) {
    try {
      var base = getCoinApiBase();
      if (!base) return Promise.resolve(null);
      if (!payload || !payload.type) return Promise.resolve(null);

      var user = getCurrentUser();
      var userId = payload.userId || (user && user.user_id);
      if (!userId) return Promise.resolve(null);

      var body = new URLSearchParams();
      body.append("mode", "coin_reward");
      body.append("user_id", String(userId));
      body.append("reward_type", String(payload.type));
      if (payload.key) {
        body.append("reward_key", String(payload.key));
      }
      if (payload.meta) {
        try {
          body.append("meta", JSON.stringify(payload.meta));
        } catch (e) {}
      }

      return fetch(base, {
        method: "POST",
        body: body
      })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .catch(function (err) {
          console.error("[coin-reward] request error:", err);
          return null;
        });
    } catch (e) {
      console.error("[coin-reward] postReward failed:", e);
      return Promise.resolve(null);
    }
  }

  function getWeekKey(date) {
    var d = date instanceof Date ? new Date(date.getTime()) : new Date();
    try {
      var year = d.getFullYear();
      var first = new Date(year, 0, 1);
      var msPerDay = 24 * 60 * 60 * 1000;
      var dayOfYear = Math.floor((d - first) / msPerDay);
      var week = Math.floor((dayOfYear + first.getDay()) / 7) + 1;
      if (week < 1) week = 1;
      var w = week < 10 ? "0" + week : String(week);
      return year + "-W" + w;
    } catch (e) {
      return "" + d.getFullYear();
    }
  }

  function getDateKey(date) {
    var d = date instanceof Date ? date : new Date();
    try {
      return d.toISOString().slice(0, 10);
    } catch (e) {
      var y = d.getFullYear();
      var m = d.getMonth() + 1;
      var day = d.getDate();
      var mm = m < 10 ? "0" + m : "" + m;
      var dd = day < 10 ? "0" + day : "" + day;
      return y + "-" + mm + "-" + dd;
    }
  }

  var api = {};

  // 1) 주간 출석 5일 달성 보상 (+1)
  api.attendanceWeekIfEligible = function (days) {
    try {
      if (!days || !days.length) return;
      var count = 0;
      for (var i = 0; i < days.length; i++) {
        if (days[i]) count++;
      }
      if (count < 5) return;

      var key = getWeekKey(new Date());
      postReward({
        type: "ATTEND_5D",
        key: key,
        meta: { daysCount: count }
      });
    } catch (e) {
      console.error("[coin-reward] attendanceWeekIfEligible error:", e);
    }
  };

  // 2) 하루 퀘스트 5개 모두 완료 보상 (+1)
  api.questAllDoneToday = function () {
    try {
      var key = getDateKey(new Date());
      postReward({
        type: "QUEST_5CLEAR",
        key: key
      });
    } catch (e) {
      console.error("[coin-reward] questAllDoneToday error:", e);
    }
  };

  // 3) 게임 랭킹 1위 달성 보상 (+2)
  api.rankingIfFirst = function (gameName, list) {
    try {
      if (!list || !list.length) return;
      var user = getCurrentUser();
      if (!user || !user.user_id) return;
      var uid = String(user.user_id);

      var foundFirst = false;
      for (var i = 0; i < list.length; i++) {
        var item = list[i] || {};
        var rankNum = Number(item.rank || 0);
        var itemUid = item.user_id != null ? String(item.user_id) : "";
        if (rankNum === 1 && itemUid === uid) {
          foundFirst = true;
          break;
        }
      }
      if (!foundFirst) return;

      var key = gameName || "";
      postReward({
        type: "RANKING_1ST",
        key: key,
        meta: { gameName: key }
      });
    } catch (e) {
      console.error("[coin-reward] rankingIfFirst error:", e);
    }
  };

  window.__ghostCoinReward = api;
})(window);
