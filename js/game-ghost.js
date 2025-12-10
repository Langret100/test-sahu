// game-ghost.js v4 - blink 3s, emotion 5s, ground-aligned, character-following
(function () {
  if (window.gameGhostUI) return;

  // 감정 키별 프레임 목록 (1은 보통 눈 뜬 프레임, 2는 눈 감은 프레임)
  const EMOTIONS = {
    idle: ["기본대기1.png", "기본대기2.png"],
    listen: ["경청1.png", "경청2.png"],
    greet: ["인사1.png","인사2.png"],
    cheer: ["만세2.png"],
    joy: ["기쁨2.png"],
    fun: ["신남1.png", "신남2.png"],
    fail: ["절망1.png", "절망2.png"],
    sad: ["실망2.png"],
    shy: ["부끄러움1.png", "부끄러움2.png"]
  };

  // 이벤트별 감정 키 후보 (단일 감정 개념)
  const EMOTION_POOL = {
    start: ["cheer","listen","greet"],
    correct: ["joy","fun","cheer","greet"],
    gameover: ["fail", "sad", "shy"]
  };

  // 이벤트별 말풍선 후보
  const LINES = {
    start: [
      "좋아, 한 번 제대로 놀아보자!",
      "준비 완료! 시작해 볼까?",
      "집중~ 이번 판은 꼭 해보자!",
      "파이팅! 내가 옆에서 지켜보고 있을게.",
      "천천히 해도 괜찮아. 우리 같이 해보자."
    ],
    correct: [
      "와, 정답이야! 완전 멋진데?",
      "맞췄다! 이런 감각이라면 금방 끝내겠는걸?",
      "굿! 지금 흐름 아주 좋아!",
      "정답! 방금 그 느낌 기억해 둬!",
      "오 훌륭해, 이번 판 에이스다!",
      "이 속도면 최고 기록도 노려보겠다!",
      "방금 그 선택, 완전 프로 감각인데?",
      "멋지다! 한 문제씩 확실히 쌓여 가고 있어.",
      "이렇게만 계속 가면 금방 마스터 하겠는걸?",
      "좋았어! 지금 리듬 그대로 이어가보자."
    ],
    gameover: [
      "아쉽지만 다음에 더 잘할 수 있어.",
      "실패해도 괜찮아. 다시 하면 되지!",
      "이번 판은 여기까지! 한 번 더 도전해 볼까?",
      "에이, 이 정도면 워밍업이지 뭐.",
      "괜찮아. 나도 옆에서 다시 도와줄게."
    ]
  };

  let container, imgEl, bubbleEl;
  let frameTimer = null;
  let hideTimer = null;

  function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // 부모/오프너/로컬스토리지의 캐릭터 설정을 이용해서 현재 캐릭터 이미지 경로로 변환
  function resolveImagePath(fileName) {
    const baseSrc = "images/emotions/" + fileName;

    // 1) 부모 iframe(메인 화면) 우선
    try {
      if (window.parent && window.parent !== window) {
        if (typeof window.parent.getCharImagePath === "function") {
          const mapped = window.parent.getCharImagePath(baseSrc);
          if (mapped && typeof mapped === "string") {
            return "../" + mapped.replace(/^\/?/, "");
          }
        }
      }
    } catch (e) {
      // 부모 접근 실패 시 계속 진행
    }

    // 2) 새 창으로 열린 경우 window.opener 사용
    try {
      if (window.opener && !window.opener.closed) {
        if (typeof window.opener.getCharImagePath === "function") {
          const mapped = window.opener.getCharImagePath(baseSrc);
          if (mapped && typeof mapped === "string") {
            return "../" + mapped.replace(/^\/?/, "");
          }
        }
      }
    } catch (e) {
      // 오프너 접근 실패 시 계속 진행
    }

    // 3) 마지막으로, 로컬스토리지에 저장된 캐릭터 키를 직접 사용
    try {
      const key = window.localStorage && window.localStorage.getItem("ghostCurrentCharacter");
      let basePath = "images/emotions/";
      if (key === "minsu") {
        basePath = "images/emotions_ma1/";
      }
      return "../" + (basePath + fileName).replace(/^\/?/, "");
    } catch (e) {
      // 로컬스토리지도 실패하면 완전 기본 경로 사용
    }

    return "../" + baseSrc;
  }

  function ensureDom() {
    if (container) return;
    const d = document;

    const isDreamShapeGame = (location.pathname.indexOf("꿈틀이도형추적자") !== -1);

    const style = d.createElement("style");
    style.textContent = `
      .game-ghost-widget {
        position: fixed;
        right: ${isDreamShapeGame ? 0 : 4}px;
        bottom: 0;
        width: 144px;
        height: 192px;
        z-index: 9999;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
      }
      .game-ghost-bubble {
        max-width: 240px;
        margin-bottom: 4px;
        padding: 6px 10px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.95);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
        font-size: 0.85rem;
        line-height: 1.4;
        text-align: center;
        color: #333;
        opacity: 0;
        transform: translateY(6px);
        transition: opacity 0.18s ease-out, transform 0.18s ease-out;
      }
      .game-ghost-bubble.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .game-ghost-widget img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35));
      }
      @media (max-width: 480px) {
        .game-ghost-widget {
          right: ${isDreamShapeGame ? 0 : 2}px;
          bottom: 0;
          width: 112px;
          height: 160px;
        }
        .game-ghost-bubble {
          max-width: 200px;
          font-size: 0.8rem;
        }
      }
    `;
    d.head.appendChild(style);

    container = d.createElement("div");
    container.id = "gameGhostWidget";
    container.className = "game-ghost-widget";

    bubbleEl = d.createElement("div");
    bubbleEl.className = "game-ghost-bubble";
    container.appendChild(bubbleEl);

    imgEl = d.createElement("img");
    imgEl.alt = "게임 고스트";
    container.appendChild(imgEl);

    d.body.appendChild(container);

    setEmotionFrames("idle");
  }

  // 지정된 감정 키의 프레임을 3초 간격으로 깜빡이게 설정
  function setEmotionFrames(key) {
    if (!imgEl) return;
    if (frameTimer) {
      clearInterval(frameTimer);
      frameTimer = null;
    }

    const frames = EMOTIONS[key] || EMOTIONS.idle;
    if (!frames || frames.length === 0) return;

    let idx = 0;
    imgEl.style.transform = ""; // 크기 조절 없음
    imgEl.src = resolveImagePath(frames[0]); // 항상 1번 프레임(눈 뜬 상태)부터 시작

    if (frames.length > 1) {
      frameTimer = setInterval(function () {
        idx = (idx + 1) % frames.length;
        imgEl.src = resolveImagePath(frames[idx]);
      }, 3000); // 3초에 한 번 깜빡임
    }
  }

  function showBubble(text) {
    if (!bubbleEl) return;
    if (text) {
      bubbleEl.textContent = text;
      bubbleEl.classList.add("visible");
    } else {
      bubbleEl.textContent = "";
      bubbleEl.classList.remove("visible");
    }
  }

  function react(eventType) {
    ensureDom();
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    const pool = EMOTION_POOL[eventType] || ["idle"];
    const emoKey = choice(pool);
    const linePool = LINES[eventType] || [""];
    const line = choice(linePool);

    setEmotionFrames(emoKey);
    showBubble(line);

    // 감정 + 말풍선은 최대 5초 동안 유지, 그 후 기본으로 복귀
    hideTimer = setTimeout(function () {
      setEmotionFrames("idle");
      showBubble("");
    }, 5000);
  }

  window.gameGhostUI = {
    react: react
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureDom);
  } else {
    ensureDom();
  }
})();
