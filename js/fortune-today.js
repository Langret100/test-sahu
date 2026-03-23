// fortune-today.js - 오늘의 운세 간단 점보기 모듈
// 이 파일을 삭제하면 '오늘의 운세 / 점봐줘' 기능은 깨끗하게 사라집니다.
// core.js의 handleUserSubmit 안에서 window.FortuneToday.handleRequest(text)를 호출합니다.

(function(){
  if (window.FortuneToday) return;

  function seedFromString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  function pickFrom(arr, seed, offset) {
    if (!arr || !arr.length) return "";
    const idx = Math.abs(seed + (offset || 0)) % arr.length;
    return arr[idx];
  }

  function getTodayKey() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    let key = yyyy + "-" + mm + "-" + dd;
    if (window.currentUser && window.currentUser.nickname) {
      key += "|" + window.currentUser.nickname;
    }
    return key;
  }

  const LEVELS = [
    { emo: "기쁨", label: "오늘 운세: 👍 아주 좋아요!", hint: "새로운 시도나 도전을 하기에 딱 좋은 날이에요." },
    { emo: "신남", label: "오늘 운세: 😀 꽤 괜찮아요!", hint: "마음이 끌리는 일을 해 보면 기대 이상으로 즐거울 수 있어요." },
    { emo: "기본대기", label: "오늘 운세: 🙂 평온해요.", hint: "큰 일보다는 작은 행복들을 챙기면서 보내면 좋아요." },
    { emo: "불안", label: "오늘 운세: 😕 조금 조심해요.", hint: "서두르기보단 한 번 더 확인하고 천천히 나아가면 괜찮아요." },
    { emo: "슬픔", label: "오늘 운세: 😢 살짝 지치는 날이에요.", hint: "혼자 버티지 말고, 믿을 수 있는 사람에게 살짝 기대 보세요." }
  ];

  const LUCKY_ITEMS = [
    "좋아하는 색이 들어간 물건",
    "따뜻한 음료 한 잔",
    "편안한 운동화",
    "즐겨 듣는 노래",
    "귀여운 캐릭터 스티커",
    "책상 위를 정리하는 5분",
    "활짝 웃는 미소 한 번",
    "가볍게 산책하는 시간"
  ];

  const LUCKY_MESSAGES = [
    "오늘은 너무 완벽하려고 하기보단, '괜찮아, 이 정도면 충분해' 하고 넘어가도 좋아요.",
    "작은 실수는 행운으로 가는 연습 문제일지도 몰라요.",
    "마음에 드는 노래를 들으면서 하루를 시작해 보면 어때요?",
    "누군가에게 따뜻한 한마디를 건네면, 그 운이 그대로 돌아올지도 몰라요.",
    "오늘은 나 자신에게 조금 더 친절하게 대하는 연습을 해봐요."
  ];

  function buildFortuneText() {
    const key = getTodayKey();
    const seed = seedFromString(key);

    const level = pickFrom(LEVELS, seed, 0) || LEVELS[2];
    const item = pickFrom(LUCKY_ITEMS, seed, 7);
    const extra = pickFrom(LUCKY_MESSAGES, seed, 13);

    let nicknamePart = "";
    if (window.currentUser && window.currentUser.nickname) {
      nicknamePart = window.currentUser.nickname + "의 ";
    }

    const lines = [];
    lines.push(nicknamePart + level.label);
    lines.push("· 한 줄 조언: " + level.hint);
    if (item) {
      lines.push("· 오늘의 행운 포인트: " + item);
    }
    if (extra) {
      lines.push("· 한 마디 더: " + extra);
    }
    return { text: lines.join("\n"), emotion: level.emo };
  }

  window.FortuneToday = {
    handleRequest: function(rawText) {
      const result = buildFortuneText();
      if (typeof setEmotion === "function") {
        try {
          setEmotion(result.emotion, result.text, { shake: false });
          return;
        } catch (e) {}
      }
      if (typeof showBubble === "function") {
        showBubble(result.text);
      }
    }
  };
})();
