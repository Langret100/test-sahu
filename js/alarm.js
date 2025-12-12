/* js/alarm.js - 알람 / 타이머 모듈 (옵션 기능)
   - dialog.js 에서 ghost:alarmRequest 이벤트를 받아
     일정 시간이 지난 후 고스트가 알려주는 역할을 합니다.
   - 이 파일을 삭제한다면, dialog.js 안의
     [옵션 기능] 알람/타이머 모듈 연동 블록도 함께 삭제해도 됩니다.
*/
(function () {
  if (typeof window === "undefined" || !window.addEventListener) return;

  const ACTIVE_ALARMS = [];

  // 알람 안내 멘트 (dialog.js 등에서 재사용 가능)
  const ALARM_ASK_LINES = [
    "내가 알람이라 채팅하면, 얼마 뒤에 불러줄까?",
    "알람을 맞춰볼까? 몇 분 뒤에 다시 불러주면 될까?",
    "좋아, 알람 모드로 들어갈게. 언제 다시 불러주면 될지 말해줘!",
  ];

    const ALARM_DONE_LINES = [
    "약속했던 시간이 됐어. 잠깐 잊고 있었어도 괜찮아, 나는 계속 기억하고 있었어.",
    "띠링! 말해준 시간이 다 됐어. 이제 나랑 다시 이야기해볼까?",
    "기다리던 시간이 왔어. 우리가 정해 둔 그 순간이야.",
    "알람 시간 도착! 이제 잠깐 나한테로 다시 시선을 돌려볼래?",
    "똑똑, 부탁했던 시간이야. 조용히 한 번 더 불러보러 왔어.",
  ];

  function parseDelay(text) {
    // 매우 단순한 한글 패턴 파서: "5초", "10초 뒤", "3분", "2분 후" 등
    if (!text) return null;
    text = String(text);
    let m = text.match(/(\d+)\s*초/);
    if (m) {
      return parseInt(m[1], 10) * 1000;
    }
    m = text.match(/(\d+)\s*분/);
    if (m) {
      return parseInt(m[1], 10) * 60 * 1000;
    }
    // 기본값: 10초
    return 10000;
  }

  function handleAlarmRequest(ev) {
    const detail = (ev && ev.detail) || {};
    const text = detail.text || "";
    const delay = parseDelay(text);
    if (!delay) return;

    if (typeof console !== "undefined") {
      console.log("[alarm.js] 새 알람 요청:", text, "delay(ms)=", delay);
    }

    const timerId = setTimeout(function () {
      // 시간이 되었을 때 고스트가 알려주기
      if (typeof showBubble === "function") {
        try {
          const line = ALARM_DONE_LINES[Math.floor(Math.random() * ALARM_DONE_LINES.length)] || ALARM_DONE_LINES[0];
          showBubble(line);
        } catch (e) {}
      }
    }, delay);

    ACTIVE_ALARMS.push(timerId);
  }

  window.addEventListener("ghost:alarmRequest", handleAlarmRequest);
})();