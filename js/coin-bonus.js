// coin-bonus.js - 코인 보너스(출석/랭킹/퀘스트 자동 보상) 모듈
// --------------------------------------------------------
// 이 모듈은 다음 조건을 만족할 때 자동으로 코인을 추가합니다.
// 1) 주간 출석 도장 5일 이상 찍었을 때: +1 (주당 1회)
// 2) 게임별 랭킹 1위 달성 시:        +2 (게임당 1회)
// 3) 오늘의 퀘스트 5개 모두 완료 시: +1 (하루 1회)
//
// - 실제 코인 증가는 Apps Script 쪽 coin.gs 의
//     mode=coin_reward_attend / coin_reward_rank / coin_reward_quest
//   처리 로직과 연동됩니다.
// - 이 파일을 제거하려면:
//   1) index.html 의 <script src="js/coin-bonus.js"></script> 구문을 삭제하고
//   2) js/coin-bonus.js 파일을 삭제하면 됩니다.
//   그 외 출석/랭킹/퀘스트 기능은 원래대로 동작합니다.
//
(function (window) {
  if (!window) return;

  // 내부 유틸 -----------------------------

  function getCurrentUser() {
    if (window.currentUser && window.currentUser.user_id) {
      return window.currentUser;
    }
    try {
      var saved = window.localStorage && localStorage.getItem("ghostUser");
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed && parsed.user_id) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }

  function getUserKeySuffix(user) {
    if (!user || !user.user_id) return "";
    return "_user_" + String(user.user_id);
  }

  function todayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return y + "-" + m + "-" + day;
  }

  // ISO 주차 계산 (간단 버전, 대략적인 주 구분용)
  function getIsoWeek(d) {
    var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // 목요일 기준 주차
    var dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return date.getUTCFullYear() + "-W" + ("0" + weekNo).slice(-2);
  }

  function getThisWeekKey() {
    return getIsoWeek(new Date());
  }

  function hasLocalFlag(key) {
    try {
      if (!window.localStorage) return false;
      return !!localStorage.getItem(key);
    } catch (e) {
      return false;
    }
  }

  function setLocalFlag(key) {
    try {
      if (!window.localStorage) return;
      localStorage.setItem(key, "1");
    } catch (e) {}
  }

  async function safePostToSheet(payload) {
    if (typeof postToSheet !== "function") {
      throw new Error("postToSheet not available");
    }
    return await postToSheet(payload);
  }

  function refreshCoinBar() {
    try {
      if (window.__ghostRefreshCoinStatusBar) {
        window.__ghostRefreshCoinStatusBar();
      }
    } catch (e) {}
  }

  function bubble(msg) {
    if (typeof window.showBubble === "function" && msg) {
      try {
        window.showBubble(msg);
      } catch (e) {}
    }
  }

  // 출석 5일 보상 -----------------------------

  async function handleAttendanceWeekInternal(stampedCount) {
    try {
      var user = getCurrentUser();
      if (!user || !user.user_id) return;
      if (!stampedCount || stampedCount < 5) return;

      var weekKey = getThisWeekKey();
      var flagKey = "coinBonus_attend_week_" + weekKey + getUserKeySuffix(user);
      if (hasLocalFlag(flagKey)) {
        return;
      }

      var res = await safePostToSheet({
        mode: "coin_reward_attend",
        user_id: user.user_id,
        username: user.username || user.nickname || "",
        week_key: weekKey
      });

      if (res && res.ok && res.granted) {
        setLocalFlag(flagKey);
        bubble("이번 주 5일 출석 보상으로 코인 1개를 받았어요!");
        refreshCoinBar();
      }
    } catch (e) {
      console.error("[coin-bonus] attendance reward error", e);
    }
  }

  // 랭킹 1위 보상 -----------------------------

  async function handleRankingFirstInternal(gameName) {
    try {
      if (!gameName) return;
      var user = getCurrentUser();
      if (!user || !user.user_id) return;

      var key = "coinBonus_rank_game_" + String(gameName || "").replace(/\s+/g, "_") + getUserKeySuffix(user);
      if (hasLocalFlag(key)) {
        return;
      }

      var res = await safePostToSheet({
        mode: "coin_reward_rank",
        user_id: user.user_id,
        username: user.username || user.nickname || "",
        game_name: gameName
      });

      if (res && res.ok && res.granted) {
        setLocalFlag(key);
        bubble("게임 '" + gameName + "'에서 1위를 해서 코인 2개를 받았어요!");
        refreshCoinBar();
      }
    } catch (e) {
      console.error("[coin-bonus] ranking reward error", e);
    }
  }

  // 오늘의 퀘스트 5개 완료 보상 -----------------------------

  async function handleQuestAllDoneInternal() {
    try {
      var user = getCurrentUser();
      if (!user || !user.user_id) return;

      var dateKey = todayKey();
      var flagKey = "coinBonus_quest_date_" + dateKey + getUserKeySuffix(user);
      if (hasLocalFlag(flagKey)) {
        return;
      }

      var res = await safePostToSheet({
        mode: "coin_reward_quest",
        user_id: user.user_id,
        username: user.username || user.nickname || "",
        date_key: dateKey
      });

      if (res && res.ok && res.granted) {
        setLocalFlag(flagKey);
        bubble("오늘의 퀘스트 5개 완료 보상으로 코인 1개를 받았어요!");
        refreshCoinBar();
      }
    } catch (e) {
      console.error("[coin-bonus] quest reward error", e);
    }
  }

  // 외부에서 호출할 수 있는 훅 -----------------------------

  window.CoinBonus = {
    handleAttendanceWeek: function (stampedCount) {
      // stampedCount: 이번 주 찍힌 도장 개수 (0~7)
      handleAttendanceWeekInternal(stampedCount);
    },
    handleRankingFirst: function (gameName) {
      handleRankingFirstInternal(gameName);
    },
    handleQuestAllDone: function () {
      handleQuestAllDoneInternal();
    }
  };
})(window);
