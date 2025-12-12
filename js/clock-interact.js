// [옵션 모듈] 시계 상호작용 모듈 - clock-interact.js
// 이 파일은 "시간 / 몇 시" 질문이 들어왔을 때
// 현재 시간대에 맞게 고스트의 감정을 살짝 바꿔주는 역할을 합니다.
//
// 이 모듈을 사용하지 않으려면:
// 1) js/clock-interact.js 파일을 삭제하고
// 2) js/dialog.js 안의
//    `// [옵션 기능] 시계 상호작용 모듈 연동 시작` 부터
//    `// [옵션 기능] 시계 상호작용 모듈 연동 끝` 까지의 블록을 통째로 삭제하면 됩니다.

(function () {
  function pickEmotionByHour(hour) {
    if (hour >= 23 || hour < 5) {
      // 너무 늦은 새벽 시간 → 졸림
      return "졸림";
    }
    if (hour >= 5 && hour < 12) {
      // 아침 시간 → 기쁨
      return "기쁨";
    }
    if (hour >= 12 && hour < 18) {
      // 낮 시간 → 신남
      return "신남";
    }
    // 저녁~밤 시간 → 지침 (혹은 비슷한 피곤함 계열)
    return "지침";
  }

  function handleTimeAsked(event) {
    var now = (event && event.detail && event.detail.now) || new Date();
    var hour = now.getHours();

    var emo = pickEmotionByHour(hour);

    if (typeof setEmotion === "function") {
      // silent: true -> 말풍선 텍스트는 dialog.js 결과를 그대로 사용하고,
      // 표정만 시간대에 맞게 조정
      setEmotion(emo, null, { silent: true });
    }
  }

  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("ghost:timeAsked", handleTimeAsked);
  }
})();
