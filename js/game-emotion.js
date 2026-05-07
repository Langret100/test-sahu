// game-emotion.js
// [독립 모듈] 게임 전용 감정 반응 모듈
// - 각 게임에서 _safeGameReact(type)을 호출하면 여기서만 처리합니다.
// - 이 파일을 삭제하면 게임 관련 감정 반응이 모두 비활성화되며,
//   다른 기능(채팅, 말풍선, 기본 감정)은 그대로 유지됩니다.

(function(){
  const REACTIONS = {
    start: {
      emotions: ["만세","기쁨","신남"],
      lines: [
        "게임 모드 돌입! 준비되셨나요?",
        "좋아요! 한 번 신나게 해볼까요?",
        "이번 판은 왠지 좋은 느낌인데요?",
        "집중, 집중! 제가 응원할게요!",
        "손가락 풀기 끝났죠? 이제 시작!"
      ]
    },
    good: {
      emotions: ["기쁨","신남","만세"],
      lines: [
        "좋아요! 방금 플레이 정말 멋졌어요!",
        "오, 이대로 쭉쭉 가봅시다!",
        "역시 오늘의 실력자!",
        "집중한 만큼 결과가 바로 나오네요!",
        "지금 텐션 그대로 유지해봐요!"
      ]
    },
    miss: {
      emotions: ["당황","불안"],
      lines: [
        "괜찮아요, 지금은 감 잡는 중이에요.",
        "한 번 더 해보면 분명 더 좋아질 거예요.",
        "실수도 연습의 일부니까요.",
        "어디가 헷갈렸는지 같이 다시 볼까요?"
      ]
    },
    gameover: {
      emotions: ["당황","피곤"],
      lines: [
        "수고했어요! 한 판 제대로 했네요.",
        "이번 판은 여기까지! 다음에 기록 다시 노려봐요.",
        "어디서 막혔는지 같이 되돌아봐도 좋겠어요.",
        "충분히 잘했어요. 잠깐 쉬었다가 다시 할까요?"
      ]
    },
    exit: {
      emotions: ["미소","평온"],
      lines: [
        "게임 끝! 다시 이야기 모드로 돌아왔어요.",
        "재밌었어요. 이제 천천히 대화해볼까요?",
        "게임 정리 완료! 이어서 뭐 하고 싶어요?",
        "좋아요, 이제 다른 이야기도 해봐요."
      ]
    }
  };

  
  let lastGameEmotion = null;

  function pickRandom(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickEmotion(type) {
    const cfg = REACTIONS[type];
    if (!cfg || !cfg.emotions || !cfg.emotions.length) return null;
    if (cfg.emotions.length === 1) return cfg.emotions[0];

    // 직전 감정과 2연속으로만 안 나오도록 조정
    let candidate = cfg.emotions[Math.floor(Math.random() * cfg.emotions.length)];
    if (candidate === lastGameEmotion) {
      candidate = cfg.emotions[Math.floor(Math.random() * cfg.emotions.length)];
    }
    return candidate;
  }

  function gameReactCore(type) {
    const cfg = REACTIONS[type];
    if (!cfg) return;

    const emo  = pickEmotion(type);
    const line = pickRandom(cfg.lines || []) || "";

    if (emo) {
      lastGameEmotion = emo;
    }

    // 감정만 변경 (게임에서는 말풍선을 따로 띄우지 않습니다)
    if (emo && typeof setEmotion === "function") {
      try { setEmotion(emo, line); } catch(e) {}
    }
  }

  // 전역 노출: game-manager.js 및 각 게임 iframe에서 사용
  window.gameReact = function(type){
    try {
      gameReactCore(type);
    } catch(e){}
  };
})();