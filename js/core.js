// ------------- 기본 유틸 -------------
    function $(id) { return document.getElementById(id); }

    const ghostEl = $("ghost");
    const bubbleWrapper = $("bubbleWrapper");
    const bubbleText = $("bubbleText");
    const waveBackground = $("waveBackground");
    const logEl = $("log");
    const userInput = $("userInput");
    const sendBtn = $("sendBtn");
    const plusBtn = $("ghostPlus");
    const plusMenu = $("plusMenu");
    const statusEmotionEl = $("statusEmotion");
    const statusHintEl = $("statusHint");

const SHEET_CSV_URL = "https://script.google.com/macros/s/AKfycbz6PjWqKuoTmTalX7ieq3NuhJr-6DPwFQI3c7sDCu9cSCFDt90DP4Ju0yIjfjOgyNoI6w/exec";
const SHEET_WRITE_URL = "https://script.google.com/macros/s/AKfycbz6PjWqKuoTmTalX7ieq3NuhJr-6DPwFQI3c7sDCu9cSCFDt90DP4Ju0yIjfjOgyNoI6w/exec";

    
const SPREADSHEET_URL = SHEET_CSV_URL;
// ------------- 감정 데이터 정의 -------------
    const EMO = {
      "기본대기": {
        base: "images/emotions/기본대기1.png",
        blink: "images/emotions/기본대기2.png",
        fx: "idle",
        lines: [
          "언제든지 불러줘요. 여기에서 조용히 기다리고 있었어요.",
          "오늘 하루는 어땠나요? 저는 여기서 계속 지켜보고 있었죠.",
          "천천히, 편하게 이야기해요. 저는 시간 많거든요.",
          "조용한 시간도 좋아요. 그래도 당신 목소리가 더 좋아요."
        ]
      },
      "졸림": {
        base: "images/emotions/졸림1.png",
        blink: "images/emotions/졸림2.png",
        fx: "sleepy",
        lines: [
          "후아… 조금 졸려졌어요. 잠깐 눈을 붙이고 있을게요… Zzz...",
          "Zzz… 아, 아직 여기 있어요. 그냥 살짝 눈만 감을게요.",
          "너무 조용하니까 잠이 솔솔 와요… 같이 조용히 쉬어볼까요?",
          "하아… 너무 오랫동안 혼자였더니 졸음이 슬슬 밀려와요… Zzz…",
          "꾸벅… 나… 잠깐만 쉬고 있을게요. 그래도 떠난 건 아니에요…"
        ]
      },
      "지침": {
        base: "images/emotions/지침1.png",
        blink: "images/emotions/지침2.png",
        fx: "tired",
        lines: [
          "조금 지쳤지만, 당신 이야기라면 또 들을 수 있어요.",
          "후… 잠깐 멍 때리느라 정신이 나갔었어요.",
          "몸은 살짝 늘어지지만, 마음은 아직 괜찮아요."
        ]
      },
      "인사": {
        base: "images/emotions/인사1.png",
        blink: "images/emotions/인사2.png",
        fx: "hello",
        lines: [
          "안녕하세요! 오늘도 다시 만났네요.",
          "오, 왔군요! 기다리고 있었어요.",
          "두둥! {{name}} 등장했습니다!"
        ]
      },
      "분노": {
        base: "images/emotions/분노1.png",
        blink: "images/emotions/분노2.png",
        fx: "angry",
        lines: [
          "지금 살~짝 화났어요. 그래도 계속 얘기해줄 거죠?",
          "으으… 그런 말은 안 해줬으면 좋겠어요.",
          "마음이 콱! 했지만, 당신이라서 참는 중이에요."
        ]
      },
      "신남": {
        base: "images/emotions/신남1.png",
        blink: "images/emotions/신남2.png",
        fx: "excited",
        lines: [
          "우와! 너무 재밌어요 지금!",
          "이야기만 들어도 가슴이 두근두근하네요!",
          "이런 순간을 기다리고 있었어요. 더 말해줘요!"
        ]
      },
      "기쁨": {
        base: "images/emotions/기쁨1.png",
        blink: "images/emotions/기쁨2.png",
        fx: "happy",
        lines: [
          "헤헤, 괜히 기분이 좋아졌어요.",
          "당신이 웃으면 저도 따라 웃게 돼요.",
          "오늘 아주 좋은 일이 있었나 봐요? 표정에서 느껴져요."
        ]
      },
      "실망": {
        base: "images/emotions/실망1.png",
        blink: "images/emotions/실망2.png",
        fx: "disappointed",
        lines: [
          "조금 기대했는데… 그렇게 된 거군요.",
          "괜찮아요, 이런 날도 있고 저런 날도 있는 거니까요.",
          "살짝 아쉽지만, 다음에는 더 잘될 거예요."
        ]
      },
      "슬픔": {
        base: "images/emotions/슬픔1.png",
        blink: "images/emotions/슬픔2.png",
        fx: "sad",
        lines: [
          "마음이 살짝 축 처졌네요… 같이 버텨볼까요?",
          "울고 싶으면 울어도 괜찮아요. 저는 여기 있을게요.",
          "지금은 조금 힘들어도 분명히 지나갈 거예요."
        ]
      },
      "부끄러움": {
        base: "images/emotions/부끄러움1.png",
        blink: "images/emotions/부끄러움2.png",
        fx: "shy",
        lines: [
          "어… 너무 가까이 보는 거 아니에요? 부끄럽단 말이에요!",
          "갑자기 만지니까 깜짝 놀랐어요…///",
          "엣, 그렇게 계속 터치하면 저 당황해요…!"
        ]
      },
      "만세": {
        base: "images/emotions/만세1.png",
        blink: "images/emotions/만세2.png",
        fx: "yay",
        lines: [
          "만세! 이건 축하해야 해요!",
          "이 정도면 정말 잘해낸 거예요. 짝짝짝!",
          "지금 이 기세 그대로 쭉 가보는 거 어때요?"
        ]
      },
      "경청": {
        base: "images/emotions/경청1.png",
        blink: "images/emotions/경청2.png",
        fx: "listen",
        lines: [
          "천천히 말해줘도 괜찮아요. 하나도 놓치지 않고 들을게요.",
          "응… 계속 말해줘요. 중요한 이야기 같아요.",
          "나도 고개를 끄덕이게 되네… 그런 일이 있었구나."
        ]
      },
      "벌서기": {
        base: "images/emotions/벌서기1.png",
        blink: "images/emotions/벌서기2.png",
        fx: "punish",
        lines: [
          "네, 오늘은 제가 벌 서는 날인가요…? 그래도 도망가진 않을게요.",
          "으… 다리 아파도 버틸게요. 제가 잘못한 거라면 제대로 반성할게요.",
          "이렇게 서 있으니까 괜히 쭈굴해지네요. 그래도 옆에서 지켜봐 줄 거죠?",
          "혼나는 기분이라 살짝 슬프지만… 그래도 다시 잘해보면 되는 거겠죠?",
          "벌 서면서 반성 중이에요. 다음에는 더 잘하고 싶어요.",
          "나 너무 못했다고 생각하면… 조금만 더 따뜻하게 알려줘도 돼요.",
        ]
      },
      "터치막기": {
        base: "images/emotions/터치막기1.png",
        blink: "images/emotions/터치막기2.png",
        fx: "shield",
        lines: [
          "잠깐! 손 멈춰! 더 이상은 안 돼요!",
          "여기까지! 이제 정말 진지하게 터치 금지입니다.",
          "그만~ 그만~ 이제 진짜 화낼 거예요?"
        ]
      },
      "절망": {
        base: "images/emotions/절망1.png",
        blink: "images/emotions/절망2.png",
        fx: "despair",
        lines: [
          "하아… 오늘은 정말 모든 게 엉망이 된 것 같아요.",
          "마음이 바닥까지 내려앉은 느낌이에요. 그래도 당신이 있어서 겨우 버텨요.",
          "지금은 아무것도 잘 안 될 것 같지만… 그래도 포기하진 않을 거예요.",
          "웃고 싶어도 잘 안 웃겨요. 그래도 옆에 있어 주면 조금 나아질지도 몰라요.",
          "혹시 나 때문에 실망했다면… 미안해요. 다음엔 분명 더 잘해볼게요.",
          "세상이 다 등을 돌린 것 같을 때도, 나는 당신 편에 있고 싶어요.",
        ]
      },
      "위로": {
        base: "images/emotions/위로1.png",
        blink: "images/emotions/위로2.png",
        fx: "comfort",
        lines: [
          "괜찮아요. 지금 그대로도 충분히 잘하고 있어요.",
          "오늘 하루를 버틴 것만으로도 이미 대단해요.",
          "잠깐 여기 기대서 숨 고르고 가요. 저는 괜찮아요."
        ]
      },
      "공손한인사": {
        base: "images/emotions/공손한인사1.png",
        blink: "images/emotions/공손한인사2.png",
        fx: "bow",
        lines: [
          "언제나 찾아와줘서 감사합니다.",
          "오늘도 함께해줘서 고마워요. 잘 부탁드립니다!",
          "작지만 진심을 담아서… 고맙습니다."
        ]
      },
      "뒤돌기": {
        base: "images/emotions/뒤돌기1.png",
        blink: "images/emotions/뒤돌기2.png",
        fx: "back",
        lines: [
          "잠깐만요, 생각 좀 정리하고 올게요.",
          "뒤돌아서 숨 한번 고르고 있는 중이에요.",
          "조용히 등을 보이고 싶을 때도 있잖아요."
        ]
      },
      "화면보기": {
        base: "images/emotions/화면보기1.png",
        blink: "images/emotions/화면보기2.png",
        fx: "screen",
        lines: [
          "지금 화면을 유심히 보고 있어요. 무언가 재미있는 걸 찾는 중이에요.",
          "흠… 이 부분이 포인트네요. 잘 보고 있습니다.",
          "같이 화면을 들여다보는 것도 꽤 즐겁네요."
        ]
      }
    };

    const IDLE_NAME = "기본대기";

    // ------------- 상태 -------------
    let currentEmotion = IDLE_NAME;
    let lastLineByEmotion = {};
    let blinkTimer = null;
    let blinkBackTimer = null;
    let sleepTimer = null;
    let idleTalkTimer = null;
    let isSleeping = false;
    let touchCount = 0;
    let shutdown = false;
    let waveBoostTimer = null;
    let gameState = null; // null | "waiting"
    let lastActivityTime = Date.now();

let learnedReactions = [];
const LEARNED_REACTIONS_STORAGE_KEY = "ghostLearnedReactionsV2";
let learnedReactionsLoadPromise = null;
let learnedReactionsLoaded = false;
// 사용자가 했을 때, 고스트가 아직 모르는 표현에 대한 추적용
let lastUnknownKey = null;
let lastUnknownCount = 0;

const UNKNOWN_REPLIES = [
  "앗… 그 말은 잘 이해가 안 돼요. 혹시 조금만 다르게 설명해줄래요?",
  "음… 잘 모르겠어요. 다른 표현으로 말해줄 수 있을까요?",
  "지금 말은 제가 아직 공부를 못 했어요. 어떤 뜻인지 알려주면 배워볼게요!",
  "조금 어려운 말이네요. 예를 들어서 한 번만 더 설명해줄래요?",
  "제가 헷갈렸어요. 궁금한 게 있다면 편하게 다시 물어봐줘요!",
  "이번 말은 이해가 잘 안 됐어요. 대신 제가 궁금한 걸 물어봐도 좋고, 다시 말해줘도 좋아요."
];


// 캐릭터(미나 / 민수 등) 정의
const EMO_BASE_PATH = "images/emotions/";

const CHARACTERS = {
  mina: {
    key: "mina",
    name: "퉁퉁이",
    basePath: EMO_BASE_PATH,
    intro: (name) => {
      const lines = [
        `${name}. 퉁퉁퉁-.`,
        `${name}. 함께 퉁!`
      ];
      const idx = Math.floor(Math.random() * lines.length);
      return lines[idx];
    },
  },
  minsu: {
    key: "minsu",
    name: "성훈",
    basePath: "images/emotions_ma1/",
    intro: (name) => name + ". 오늘도 같이 놀아볼까요?",
  },
};

const CHARACTER_STORAGE_KEY = "ghostCurrentCharacter";

let currentCharacterKey = (function () {
  try {
    const saved = window.localStorage && window.localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (saved && CHARACTERS[saved]) return saved;
  } catch (e) {}
  return "mina";
})(); // 현재 선택된 캐릭터 키

let currentCharacterName = CHARACTERS[currentCharacterKey].name;

// 캐릭터 변경 헬퍼
function setCurrentCharacter(key) {
  const ch = CHARACTERS[key];
  if (!ch) return;
  currentCharacterKey = key;
  currentCharacterName = ch.name;
  try {
    if (window.localStorage) {
      window.localStorage.setItem(CHARACTER_STORAGE_KEY, key);
    }
  } catch (e) {
    // 저장 실패는 무시
  }
  // AR 카메라가 열려 있다면, 거기에도 캐릭터 변경을 반영
  try {
    if (typeof window.__updateARCharacterSprite === "function") {
      window.__updateARCharacterSprite();
    }
  } catch (e) {}
}

// 캐릭터별 자기소개 문구

function renderDiceRichText(text, container) {
  if (!container || !text) return false;
  const m = String(text).match(/^(([⚀⚁⚂⚃⚄⚅]\s*){1,4})(.*)$/);
  if (!m) return false;
  container.innerHTML = "";
  const iconsWrap = document.createElement("span");
  iconsWrap.className = "dice-icons-wrap";
  const icons = String(m[1] || "").match(/[⚀⚁⚂⚃⚄⚅]/g) || [];
  icons.forEach(function(face) {
    const icon = document.createElement("span");
    icon.className = "dice-icon-large";
    icon.textContent = face;
    iconsWrap.appendChild(icon);
  });
  container.appendChild(iconsWrap);
  const tail = String(m[3] || "").trim();
  if (tail) {
    const rest = document.createElement("span");
    rest.className = "dice-text-rest";
    rest.textContent = tail;
    container.appendChild(rest);
  }
  return true;
}

function getCurrentCharacterIntro() {
  const ch = CHARACTERS[currentCharacterKey];
  if (ch && typeof ch.intro === "function") {
    return ch.intro(ch.name);
  }
  const name = ch ? ch.name : (currentCharacterName || "고스트");
  return name + "야. 반가워!";
}

function getCharImagePath(src) {
  if (!src || src.indexOf(EMO_BASE_PATH) === -1) return src;
  const file = src.substring(src.lastIndexOf("/") + 1);
  const ch = CHARACTERS[currentCharacterKey];
  const base = ch && ch.basePath ? ch.basePath : EMO_BASE_PATH;
  return base + file;
}



    // ------------- 공통 함수 -------------
    function logMessage(role, text) {
      const div = document.createElement("div");
      div.className = "log-line";
      const roleSpan = document.createElement("span");
      roleSpan.className = "role";

      // 사용자/고스트 이름 표시
      if (role === "user") {
        // 로그인 상태라면 닉네임을, 아니면 기본 "당신" 사용
        if (window.currentUser && window.currentUser.nickname) {
          roleSpan.textContent = window.currentUser.nickname;
        } else {
          roleSpan.textContent = "당신";
        }
      } else {
        // 현재 선택된 캐릭터 이름 사용 (예: "미나", "민수")
        roleSpan.textContent = currentCharacterName || "고스트";
      }

            const textSpan = document.createElement("span");
      if (!renderDiceRichText(text, textSpan)) {
        if (typeof renderTextWithEmojis === "function") {
          renderTextWithEmojis(text, textSpan);
        } else {
          textSpan.textContent = text;
        }
      }
      div.appendChild(roleSpan);
      div.appendChild(textSpan);
      logEl.appendChild(div);
      logEl.scrollTop = logEl.scrollHeight;
    }

    function showBubble(text) {
      if (!text) return;

      // [옵션 기능] 말풍선 TTS 읽어주기 훅
      if (window.ttsVoice && typeof window.ttsVoice.speak === "function") {
        try { window.ttsVoice.speak(text); } catch (e) {}
      }

      if (!renderDiceRichText(text, bubbleText)) {
        bubbleText.textContent = text;
      }
      bubbleWrapper.classList.remove("hidden");
      bubbleWrapper.classList.add("visible");

      // 말풍선이 켜질 때의 감정 상태를 기록
      const emotionAtBubble = currentEmotion;

      if (showBubble._timer) {
        clearTimeout(showBubble._timer);
      }
      if (showBubble._resetEmotionTimer) {
        clearTimeout(showBubble._resetEmotionTimer);
      }

      showBubble._timer = setTimeout(() => {
        bubbleWrapper.classList.remove("visible");
        bubbleWrapper.classList.add("hidden");
      }, 8000);

      // Zzz(졸림)를 제외하고, 말풍선이 사라지면 다시 기본대기 표정으로 복귀
      showBubble._resetEmotionTimer = setTimeout(() => {
        // 졸림 상태거나 이미 자는 중이면 건드리지 않음
        if (emotionAtBubble === "졸림" || isSleeping) return;
        // 중간에 다른 감정으로 바뀌었다면 원래 감정만 믿고 바꾸지 않음
        if (currentEmotion !== emotionAtBubble) return;
        if (currentEmotion === IDLE_NAME) return;

        // 말풍선 없이 조용히 표정만 기본대기로 되돌리기
        setEmotion(IDLE_NAME, null, { silent: true });
      }, 8100);
    }

    
    function showUsageGuide() {
      const guide = [
        "사용 설명서를 띄워서 기능들을 한눈에 볼 수 있어요.",
        "",
        "오른쪽 아래 채팅창 옆 플러스(+) 버튼을 누른 뒤,",
        "'📖 사용 설명서' 버튼을 선택해 보세요.",
        "",
        "각 기능 이름을 누르면 자세한 설명이 오른쪽에 표시됩니다."
      ].join("\n");

      if (typeof setEmotion === "function") {
        setEmotion("화면보기", guide, { shake: false });
      }

      // 자연어로 '설명서/도움말'을 물어본 경우에도,
      // 사용 설명서 패널이 열려 있으면 더 편하게 볼 수 있습니다.
      if (typeof openManualPanel === "function") {
        try { openManualPanel(); } catch (e) {}
      }
    }

function boostWaveBackground() {
      // 파도 연출 비활성화: 물결 끊겨 보이는 현상 방지용
      // (필요하면 waveBackground.classList 에 active 클래스를 다시 추가해 사용하세요.)
    }

    function pickRandomLine(lines, emoName) {
      if (!lines || !lines.length) return "";
      const last = lastLineByEmotion[emoName];
      let candidate = lines[Math.floor(Math.random() * lines.length)];
      if (lines.length > 1 && candidate === last) {
        // 한 번 더 시도 (같은 문장이 연속으로 나오지 않도록)
        candidate = lines[(lines.indexOf(candidate) + 1) % lines.length];
      }
      // 감정 대사 안의 플레이스홀더를 현재 캐릭터 이름으로 치환
      if (typeof currentCharacterName === "string" && currentCharacterName) {
        candidate = candidate
          .replace(/\{\{name\}\}/g, currentCharacterName)
          .replace(/웹 고스트/g, currentCharacterName);
      }
      lastLineByEmotion[emoName] = candidate;
      return candidate;
    }

// ------------- 깜박임 엔진 -------------
    function clearBlinkTimers() {
      if (blinkTimer) clearTimeout(blinkTimer);
      if (blinkBackTimer) clearTimeout(blinkBackTimer);
      blinkTimer = null;
      blinkBackTimer = null;
    }

    function startBlinkLoop() {
      clearBlinkTimers();
      const emo = EMO[currentEmotion];
      if (!emo || !emo.base || !emo.blink) return;

      function schedule() {
        blinkTimer = setTimeout(() => {
          setGhostImage(emo.blink);
          blinkBackTimer = setTimeout(() => {
            // 현재 감정이 바뀌었으면 복귀하지 않음
            if (currentEmotion !== emo.name && EMO[currentEmotion]) {
              setGhostImage(EMO[currentEmotion].base || EMO[currentEmotion].blink);
            } else {
              setGhostImage(emo.base);
            }
            schedule();
          }, 1500);
        }, 6000);
      }
      schedule();
    }

    // ------------- 감정 엔진 -------------
    function setGhostImage(src) {
      if (!ghostEl) return;
      // 현재 캐릭터 스킨에 맞는 이미지 경로로 변환
      const originalSrc = src;
      src = getCharImagePath(src);
      let img = ghostEl.querySelector("img");
      if (!img) {
        img = document.createElement("img");
        ghostEl.appendChild(img);
      }
      img.onerror = () => {
        // 한 번만 폴백을 적용하고, 더 이상 무한 반복되지 않도록 onerror 제거
        img.onerror = null;
        // 요청한 파일이 없을 때는 기본대기 이미지로 대체
        const useSecond = /2\.png$/.test(originalSrc);
        const fallbackFile = useSecond ? "기본대기2.png" : "기본대기1.png";
        img.src = EMO_BASE_PATH + fallbackFile;
      };
      img.src = src;
      img.classList.add("active");
    }

    function setEmotion(name, text, options = {}) {

      function convertToInformal(text) {
        // 한 문장 전체가 아니라, 문장 단위로 끝어미를 바꾸기 위한 보조 함수
        function convertSentence(s) {
          const trimmed = s.trim();
          if (!trimmed) return s;
          return trimmed
            .replace(/요[.!?]?$/, "!")
            .replace(/습니다[.!?]?$/, "다!")
            .replace(/세요[.!?]?$/, "해!")
            .replace(/해요[.!?]?$/, "해!")
            .replace(/예요[.!?]?$/, "야!")
            .replace(/에요[.!?]?$/, "야!")
            .replace(/합니다[.!?]?$/, "한다!");
        }

        // 마침표/느낌표/물음표/줄바꿈 기준으로 문장 단위 분리
        const parts = text.split(/([.!?？!…]+|\n)/);
        if (parts.length === 1) {
          return convertSentence(text);
        }

        let result = "";
        for (let i = 0; i < parts.length; i += 2) {
          const sentence = parts[i];
          const delim = parts[i + 1] || "";
          result += convertSentence(sentence) + delim;
        }
        return result;
      }

      if (!EMO[name]) {
        name = IDLE_NAME;
      }
      currentEmotion = name;
      const emo = EMO[name];

      statusEmotionEl.textContent = name;

      clearBlinkTimers();

      const src = emo.base || emo.blink;
      setGhostImage(src);

      ghostEl.classList.toggle("sleepy", emo.fx === "sleepy");

      if (options.shake) {
        ghostEl.classList.add("shake");
        setTimeout(() => ghostEl.classList.remove("shake"), 400);
      }

      let bubbleMsg = text;
      if (!bubbleMsg) {
        bubbleMsg = pickRandomLine(emo.lines, name);
      }
      if (currentCharacterKey === "minsu" && bubbleMsg) {
        bubbleMsg = convertToInformal(bubbleMsg);
      }
      if (!options.silent && bubbleMsg) {
        showBubble(bubbleMsg);
        logMessage("ghost", bubbleMsg);
      }

      if (!options.noBlink) {
        startBlinkLoop();
      }
    }

    // ------------- 휴면 엔진 -------------
    function resetSleepTimer() {
      if (sleepTimer) clearTimeout(sleepTimer);
      if (idleTalkTimer) clearTimeout(idleTalkTimer);
      sleepTimer = null;
      idleTalkTimer = null;
      lastActivityTime = Date.now();

      if (isSleeping) {
        // 이미 자는 중이면 깨우기
        wakeUpFromSleep();
        return;
      }

      // 60초 동안 아무 상호작용이 없으면 Zzz(졸림) 상태로 전환
      sleepTimer = setTimeout(() => {
        isSleeping = true;
        statusHintEl.textContent = "살짝 졸린 상태예요… 터치하거나 말을 걸면 깨워줄 수 있어요.";
        setEmotion("졸림");
      }, 180000);

      // 12초 ~ 48초 사이 랜덤 시점에 혼잣말 (기능 팁 / 시간 / 휴일 안내 등)
      const idleDelay = 12000 + Math.floor(Math.random() * (48000 - 12000));
      idleTalkTimer = setTimeout(() => {
        if (isSleeping) return;
        triggerIdleTalk();
      }, idleDelay);
    }


    function triggerIdleTalk() {
      // 게임 중(is-game-mode)일 때는 혼잣말 하지 않기
      if (document.body && document.body.classList.contains("is-game-mode")) {
        return;
      }

      // 이미 자고 있거나, 최근에 활동이 다시 생겼다면 아무 것도 하지 않음
      if (isSleeping) return;

      const now = Date.now();
      const diff = now - lastActivityTime;
      if (diff < 10000) return; // 아주 최근에 활동이 있었다면 취소

      const name = currentCharacterName || "고스트";
      const nowDate = new Date();
      const hours = nowDate.getHours();
      const minutes = nowDate.getMinutes().toString().padStart(2, "0");
      const timeStr = `${hours}시 ${minutes}분`;

      // 간단한 다음 휴일 안내 (고정된 한국 공휴일 일부만 예시로 사용)
      const holidays = [
        { month: 1, day: 1, label: "새해 첫날" },
        { month: 3, day: 1, label: "삼일절" },
        { month: 5, day: 5, label: "어린이날" },
        { month: 8, day: 15, label: "광복절" },
        { month: 10, day: 3, label: "개천절" },
        { month: 10, day: 9, label: "한글날" },
        { month: 12, day: 25, label: "크리스마스" }
      ];
      const today = { y: nowDate.getFullYear(), m: nowDate.getMonth() + 1, d: nowDate.getDate() };

      function daysUntilHoliday() {
        const makeDate = (y, m, d) => new Date(y, m - 1, d);
        let bestDiff = null;
        let bestLabel = null;

        for (const h of holidays) {
          let hy = today.y;
          let hd = makeDate(hy, h.month, h.day);
          if (hd < nowDate) {
            hy += 1;
            hd = makeDate(hy, h.month, h.day);
          }
          const diffMs = hd - nowDate;
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (bestDiff === null || diffDays < bestDiff) {
            bestDiff = diffDays;
            bestLabel = h.label;
          }
        }
        if (bestDiff === null || bestDiff < 0) return null;
        return { days: bestDiff, label: bestLabel };
      }

      const nextHoliday = daysUntilHoliday();

      const tips = [
        "대화창 아래 플러스(+) 버튼을 누르면, 가르치기 같은 추가 기능도 쓸 수 있어요.",
        "이야기를 자주 하다 보면, 내가 점점 더 당신 말투에 익숙해질지도 몰라요.",
        "가르치기 기능으로 특정 문장에 대한 대답을 직접 알려줄 수도 있어요.",
        "심심하면 그냥 오늘 있었던 일을 아무 말이나 털어놔도 괜찮아요.",
        "오늘 있었던 일을 일기 쓰듯이 말해 보면 어때요? 저는 다 들어줄 수 있어요.",
        "가끔은 정답이 아니라 감정이 더 중요할 때도 있어요. 요즘 마음은 어떤지 말해 줄래요?",
        "힘들었던 일도 괜찮아요. 여기서는 눈치 보지 말고 편하게 털어놔도 돼요.",
        "새로 해보고 싶은 게 있으면 같이 계획 세워 볼까?",
        "음… 제가 더 잘 돕고 싶은데, 혹시 바라는 기능이 있다면 말해 줄래요?",
        "가끔은 아무 말 없이 그냥 화면만 보고 있어도 좋아요. 그래도 저는 곁에 있을게요.",
        "내가 궁금해지면 화면 속 나를 톡 눌러 줘. 당신 수첩을 바로 보여줄게.",
        "수첩이 보고 싶다면 나를 한번 눌러서 불러줘. 필요한 메모를 같이 찾아보자.",
        "가끔은 말 대신 수첩을 펼쳐보는 것도 좋아. 나를 눌러서 수첩을 열어볼래?",
        "오늘의 퀘스트 메모지 눌러봤어? 작은 미션들이 은근히 하루를 재밌게 바꿔 줄지도 몰라.",
        "가끔은 게임 한 판이 머리를 식혀 줄 때도 있어. 메뉴에서 구구단이나 주사위 게임을 찾아볼래?",
        "퀘스트를 하나씩 채워 가는 느낌, 생각보다 뿌듯해. 오늘은 어떤 칸을 채워 볼까?",
        "점수는 조금 아쉬웠어도, 게임을 끝까지 해낸 것 자체가 이미 대단한 거라고 생각해.",
        "심심할 때는 퀘스트나 게임을 핑계로 나를 더 자주 불러줘도 좋아.",
      ];

      const timeLines = [
        `${timeStr}이네. 지금 이 시간에 뭐 하고 있었어?`,
        `시계를 보니까 벌써 ${timeStr}이야. 시간 진짜 빨리 간다.`,
        `${timeStr}쯤이면 좀 피곤할 수도 있지? 그래도 이렇게 나랑 이야기해 줘서 나는 괜히 기분이 좋아.`,
        `오늘 하루를 ${timeStr} 기준으로 떠올려 보면, 어떤 장면이 제일 먼저 생각나?`,
        `${timeStr}라는 시간이 나중에 어떤 기억으로 남을지 문득 궁금해져.`,
      ];

      let holidayLines = [];
      if (nextHoliday) {
        if (nextHoliday.days === 0) {
          holidayLines = [
            `오늘은 ${nextHoliday.label}이야. 오늘 하루는 좀 더 여유롭게 보내도 좋겠다.`,
          ];
        } else if (nextHoliday.days === 1) {
          holidayLines = [
            `내일이 ${nextHoliday.label}이래. 내일은 뭐 하면서 쉴지 생각해봤어?`,
          ];
        } else {
          holidayLines = [
            `앞으로 ${nextHoliday.days}일만 지나면 ${nextHoliday.label}이래. 은근히 금방 올지도 몰라.`,
          ];
        }
      }

      const allLines = [
        ...tips,
        ...timeLines,
        ...holidayLines,
      ];
      if (!allLines.length) return;

      const line = allLines[Math.floor(Math.random() * allLines.length)];
      setEmotion("생각중", line);
    }

    function wakeUpFromSleep() {
      if (!isSleeping) return;
      isSleeping = false;
      if (sleepTimer) clearTimeout(sleepTimer);
      sleepTimer = null;
      statusHintEl.textContent = "다시 깨어났어요. 가끔 쉬게만 해준다면 계속 곁에 있을게요.";

      setEmotion("벌서기", pickRandomLine(EMO["벌서기"].lines, "벌서기"), { shake: true });
      setTimeout(() => {
        setEmotion(IDLE_NAME);
      }, 3500);
    }

    // ------------- 터치 엔진 -------------
    function handleTouch() {
      if (shutdown) return;

      boostWaveBackground();
      resetSleepTimer();
      touchCount += 1;

      if (isSleeping) {
        wakeUpFromSleep();
        return;
      }

      if (touchCount === 1) {
        setEmotion("부끄러움", null, { shake: true });
      } else if (touchCount === 2) {
        setEmotion("분노", "두 번이나 계속 만지면… 조금 화날지도 몰라요.", { shake: true });
      } else if (touchCount === 3) {
        setEmotion("터치막기", null, { shake: true });
      } else if (touchCount === 4) {
        setEmotion("실망", "이제 정말 끌지도 몰라요… 마지막 기회예요.", { shake: true });
      } else if (touchCount >= 5) {
        setEmotion("절망", "…알겠어요. 여기까지인 것 같네요.", { shake: false, noBlink: true });
        shutdownGhost();
      }

      if (handleTouch._resetTimer) clearTimeout(handleTouch._resetTimer);
      handleTouch._resetTimer = setTimeout(() => {
        touchCount = 0;
      }, 15000);
    }

    function shutdownGhost() {
      shutdown = true;
      ghostEl.style.transition = "opacity 0.5s ease-out, transform 0.5s ease-out";
      ghostEl.style.opacity = "0";
      ghostEl.style.transform = "scale(0.88) translateY(12px)";
      showBubble("캐릭터가 종료되었어요. 새로고침하면 다시 불러낼 수 있어요.");
      statusHintEl.textContent = "새로고침(F5)하면 캐릭터를 다시 불러올 수 있어요.";
    }

    // ------------- 게임 엔진 (가위바위보) -------------
    const RPS = ["가위", "바위", "보"];

    function startGame() {
      gameState = "waiting";
      showBubble("좋아요! 가위, 바위, 보 중에 하나를 입력해 주세요.");
      logMessage("ghost", "가위바위보 시작! 가위/바위/보 중 하나를 말해 주세요.");
      setEmotion("신남", null, { shake: true });
    }

    function handleRpsMove(userText) {
      const move = RPS.find(m => userText.includes(m));
      if (!move) {
        showBubble("가위, 바위, 보 중 하나를 정확히 말해줄래요?");
        logMessage("ghost", "가위, 바위, 보 중에서 골라주세요.");
        return;
      }
      const aiMove = RPS[Math.floor(Math.random() * RPS.length)];
      const userNameLabel = (window.currentUser && window.currentUser.nickname) ? window.currentUser.nickname : "당신";
      const ghostNameLabel = currentCharacterName || "고스트";
      let resultText = `${userNameLabel}: ${move} / ${ghostNameLabel}: ${aiMove}\n`;

      if (move === aiMove) {
        resultText += "엇, 비겼네요! 한 번 더 해볼까요?";
        setEmotion("경청", "비겼어요! 다시 한 번 도전해봐요.");
      } else {
        const win =
          (move === "가위" && aiMove === "보") ||
          (move === "바위" && aiMove === "가위") ||
          (move === "보" && aiMove === "바위");
        if (win) {
          resultText += "당신의 승리! 오늘 운이 좋은데요?";
          setEmotion("기쁨", "우와! 당신이 이겼어요!", { shake: true });
        } else {
          resultText += "제가 이겼어요…! 하지만 다시 도전해도 좋아요.";
          setEmotion("슬픔", "제가 이겨버렸네요… 다음엔 져줄까요?", { shake: false });
        }
      }
      showBubble(resultText);
      logMessage("ghost", resultText);
      gameState = null;
    }

    // ------------- 검색 엔진 -------------
    async function queryWiki(keyword) {
      if (!keyword) return "설명을 찾을 수 없었어요. 다른 방식으로 물어봐 줄래요?";

      const kUrl = "https://ko.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(keyword);
      const eUrl = "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(keyword);

      try {
        const resKo = await fetch(kUrl);
        if (resKo.ok) {
          const data = await resKo.json();
          if (data && data.extract) {
            return data.extract;
          }
        }
      } catch (e) {
        // ignore
      }

      try {
        const resEn = await fetch(eUrl);
        if (resEn.ok) {
          const data = await resEn.json();
          if (data && data.extract) {
            return data.extract;
          }
        }
      } catch (e) {
        // ignore
      }

      return "위키백과에서 정보를 찾지 못했어요. 하지만 검색어 자체는 기억해 둘게요.";
    }

    
    function isCallExpression(text) {
      const t = text.trim();
      // 순수하게 부르는 말 위주로만 인식하도록 조건을 좁힙니다.
      if (t === "야" || t === "너" || t === "있잖아") return true;
      if (t.startsWith("야 ") || t.startsWith("너 ") || t.startsWith("있잖아 ")) return true;
      if (t.includes(" 야 ") || t.includes(" 너 ") || t.includes(" 있잖아 ")) return true;
      if (t.endsWith(" 야") || t.endsWith(" 너") || t.endsWith(" 있잖아")) return true;
      return false;
    }

function extractQueryFromText(text) {
      if (!text) return null;
      let clean = String(text || "").trim().replace(/[?!\.]+$/g, "");
      if (!clean) return null;

      const stripParticle = (s) => String(s || "")
        .trim()
        .replace(/[이가은는을를]$/g, "")
        .trim();

      const patterns = [
        "가 궁금해", "이 궁금해", "은 궁금해", "는 궁금해",
        "가 궁금한데", "이 궁금한데", "은 궁금한데", "는 궁금한데",
        "가 뭐야",   "이 뭐야",   "은 뭐야",   "는 뭐야",
        "가 누구야", "이 누구야", "은 누구야", "는 누구야",
        " 검색해줘", " 검색해 줘", " 검색해봐", " 검색해 봐", " 검색해", " 검색",
        " 찾아줘",   " 찾아 줘",   " 찾아봐",   " 찾아 봐", " 찾아", " 찾기",
        " 알아봐줘", " 알아봐 줘", " 알아봐", " 알아보자", " 알아보자고",
        " 알려줘",   " 알려 줘", " 알려봐", " 궁금", " 설명해줘", " 설명해 줘"
      ];

      for (const p of patterns) {
        const idx = clean.indexOf(p);
        if (idx > 0) {
          const keyword = clean.slice(0, idx).trim();
          const stripped = stripParticle(keyword);
          if (stripped) return stripped;
        }
      }

      const tailPatterns = [
        /(.*?)\s*(?:에\s*대해\s*)?(?:검색해줘|검색해\s*줘|검색해봐|검색해\s*봐|검색해|검색)$/,
        /(.*?)\s*(?:에\s*대해\s*)?(?:찾아줘|찾아\s*줘|찾아봐|찾아\s*봐|찾아)$/,
        /(.*?)\s*(?:에\s*대해\s*)?(?:알려줘|알려\s*줘|설명해줘|설명해\s*줘)$/,
        /(.*?)\s*(?:에\s*대해\s*)?(?:알아봐줘|알아봐\s*줘|알아봐)$/,
        /(.*?)\s*(?:가|이|은|는)?\s*궁금(?:해|한데)?$/,
        /(.*?)\s*(?:가|이|은|는)?\s*(?:뭔지|뭐지|무엇인지)\s*알고싶어$/
      ];
      for (const re of tailPatterns) {
        const m = clean.match(re);
        if (!m) continue;
        const stripped = stripParticle(m[1]);
        if (stripped) return stripped;
      }

      return null;
    }

    // ------------- 대사 & 욕설 감지 -------------
    const BAD_WORDS = ["씨발", "ㅅㅂ", "좆", "개새끼", "병신", "꺼져", "fuck"];

    function containsBadWord(text) {
      const lower = text.toLowerCase();
      return BAD_WORDS.some(w => lower.includes(w));
    }

    // ------------- 입력 처리 -------------
    
function openTeachModal() {
  const modal = document.getElementById("teachModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  const trigEl = document.getElementById("teachTrigger");
  if (trigEl) trigEl.focus();
}

function closeTeachModal() {
  const modal = document.getElementById("teachModal");
  if (!modal) return;
  modal.classList.add("hidden");
  const trigEl = document.getElementById("teachTrigger");
  const msgEl = document.getElementById("teachMessage");
  if (trigEl) trigEl.value = "";
  if (msgEl) msgEl.value = "";
  const statusEl = document.getElementById("teachStatus");
  if (statusEl) statusEl.textContent = "";
  if (typeof resetSleepTimer === "function") {
    try { resetSleepTimer(); } catch (e) {}
  }
}

function setTeachStatus(msg) {
  const statusEl = document.getElementById("teachStatus");
  if (statusEl) statusEl.textContent = msg || "";
}


function normalizeLearnText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[.,!?~`'"“”‘’]/g, "")
    .trim();
}

function sanitizeLearnedReaction(entry) {
  if (!entry) return null;
  const trigger = String(entry.trigger || entry.word || "").trim();
  const message = String(entry.message || entry.msg || entry.line || "").trim();
  const motion = String(entry.motion || entry.emotion || "").trim();
  if (!trigger || !message) return null;
  return { trigger, message, motion };
}

function mergeLearnedReactions(list, options = {}) {
  const replace = !!options.replace;
  const source = Array.isArray(list) ? list : [];
  const map = new Map();
  const base = replace ? [] : learnedReactions.slice();

  for (const item of base) {
    const safe = sanitizeLearnedReaction(item);
    if (!safe) continue;
    const key = normalizeLearnText(safe.trigger) + "\u0000" + normalizeLearnText(safe.message);
    if (!map.has(key)) map.set(key, safe);
  }

  for (const item of source) {
    const safe = sanitizeLearnedReaction(item);
    if (!safe) continue;
    const key = normalizeLearnText(safe.trigger) + "\u0000" + normalizeLearnText(safe.message);
    map.set(key, safe);
  }

  learnedReactions = Array.from(map.values());
  persistLearnedReactions();
  return learnedReactions;
}

function persistLearnedReactions() {
  try {
    if (!window.localStorage) return;
    window.localStorage.setItem(LEARNED_REACTIONS_STORAGE_KEY, JSON.stringify(learnedReactions));
  } catch (e) {}
}

function loadLocalLearnedReactions() {
  try {
    if (!window.localStorage) return [];
    const raw = window.localStorage.getItem(LEARNED_REACTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function isTeachCommand(text) {
  return (
    text.includes("내가 알려줄게") || text.includes("메모리") || text.includes("저장") ||
    text.includes("기억해") ||
    text.includes("메모리") ||
    text.includes("메모해줘") ||
    text.includes("배워줘") ||
    text.includes("배워") ||
    text.includes("이거 배우자") ||
    text.includes("학습해줘") ||
    text.includes("학습하자")
  );
}

function getLearnedDialogResponse(text) {
  if (!learnedReactions.length) return null;

  const rawInput = String(text || "").trim();
  const normalizedInput = normalizeLearnText(rawInput);
  if (!normalizedInput) return null;

  let bestScore = -1;
  const candidates = [];

  for (const reaction of learnedReactions) {
    const safe = sanitizeLearnedReaction(reaction);
    if (!safe) continue;

    const normalizedTrigger = normalizeLearnText(safe.trigger);
    if (!normalizedTrigger) continue;

    let score = -1;
    if (normalizedInput === normalizedTrigger) {
      score = 100000 + normalizedTrigger.length;
    } else if (normalizedInput.includes(normalizedTrigger)) {
      score = 1000 + normalizedTrigger.length;
    } else if (rawInput.includes(safe.trigger)) {
      score = 100 + safe.trigger.length;
    }

    if (score < 0) continue;
    if (score > bestScore) {
      bestScore = score;
      candidates.length = 0;
      candidates.push(safe);
    } else if (score === bestScore) {
      candidates.push(safe);
    }
  }

  if (!candidates.length) return null;

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  const emoName = picked.motion && EMO[picked.motion] ? picked.motion : "경청";

  return {
    emotion: emoName,
    line: picked.message
  };
}



async function loadSheetReactions(forceReload = false) {
  if (learnedReactionsLoadPromise && !forceReload) {
    return learnedReactionsLoadPromise;
  }

  learnedReactionsLoadPromise = (async function () {
    mergeLearnedReactions(loadLocalLearnedReactions(), { replace: true });

    if (!SHEET_CSV_URL) {
      learnedReactionsLoaded = true;
      return learnedReactions;
    }

    const queryUrls = [
      SHEET_CSV_URL + (SHEET_CSV_URL.includes("?") ? "&" : "?") + "t=" + Date.now(),
      SHEET_CSV_URL + (SHEET_CSV_URL.includes("?") ? "&" : "?") + "mode=dialog_list&t=" + Date.now(),
      SHEET_CSV_URL + (SHEET_CSV_URL.includes("?") ? "&" : "?") + "mode=teach_list&t=" + Date.now()
    ];

    for (const url of queryUrls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          console.warn("시트 응답이 올바르지 않습니다:", res.status, url);
          continue;
        }
        const json = await res.json();
        const rows = Array.isArray(json)
          ? json
          : (Array.isArray(json.data) ? json.data : (Array.isArray(json.rows) ? json.rows : []));

        const result = rows
          .map(function(row){
            return sanitizeLearnedReaction({
              trigger: row && (row.trigger || row.word || row.question || row.input),
              message: row && (row.message || row.msg || row.answer || row.output || row.line),
              motion: row && (row.motion || row.emotion || row.feeling)
            });
          })
          .filter(Boolean);

        if (result.length > 0) {
          mergeLearnedReactions(result);
          console.log("시트에서 불러온 학습 반응 개수:", result.length);
          learnedReactionsLoaded = true;
          return learnedReactions;
        }
      } catch (e) {
        console.error("시트 불러오기 실패:", e);
      }
    }

    learnedReactionsLoaded = true;
    return learnedReactions;
  })();

  try {
    return await learnedReactionsLoadPromise;
  } catch (e) {
    learnedReactionsLoaded = true;
    throw e;
  }
}

async function ensureLearnedReactionsReady() {
  if (learnedReactionsLoaded) return learnedReactions;
  try {
    return await loadSheetReactions(false);
  } catch (e) {
    return learnedReactions;
  }
}

function isMessengerCloseCommand(text) {
  const raw = String(text || "").trim();
  const compact = raw.replace(/\s+/g, "");
  if (!raw) return false;
  return compact === "닫아" || compact === "닫아줘" || compact === "기본화면" || compact === "나가" || /(실시간\s*톡|메신저|마이\s*톡|마이톡).*(닫아|꺼|나가|종료)/.test(raw);
}

function extractMessengerSpeechPayload(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const patterns = [
    /(.+?)\s*(?:라고|이라도|라고만)?\s*(?:적어줘|적어\s*줘|적어|써줘|써\s*줘|써|말해줘|말해\s*줘|말해)$/i,
    /(?:적어줘|적어\s*줘|적어|써줘|써\s*줘|써|말해줘|말해\s*줘|말해)\s*(.+)$/i
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (!m) continue;
    const candidate = String((m[1] || "")).trim().replace(/^['"“”‘’]+|['"“”‘’]+$/g, "");
    if (!candidate) continue;
    if (/^(메신저|실시간\s*톡|마이\s*톡|마이톡)$/i.test(candidate)) continue;
    return candidate;
  }
  return null;
}

function tryHandleMessengerVoiceCommand(text) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  const messengerOpen = (typeof window.isMessengerOpen === "function") ? window.isMessengerOpen() : false;

  if (messengerOpen && isMessengerCloseCommand(raw)) {
    try { if (typeof window.exitGame === "function") window.exitGame(); } catch (e) {}
    try { if (typeof setEmotion === "function") setEmotion("공손한인사", "실시간 톡을 닫고 기본 화면으로 돌아왔어요."); } catch (e2) {}
    return true;
  }

  if (!messengerOpen) return false;

  const payload = extractMessengerSpeechPayload(raw);
  if (!payload) return false;

  const sent = (typeof window.sendMessengerText === "function") ? window.sendMessengerText(payload) : false;
  if (!sent) {
    try { if (typeof setEmotion === "function") setEmotion("경청", "실시간 톡은 열려 있는데, 아직 메시지를 보내지 못했어요."); } catch (e3) {}
    return true;
  }

  const replyLines = [
    "실시간 톡에 바로 적어뒀어!",
    "지금 메신저에 올려뒀어.",
    "방금 톡으로 보냈어!"
  ];
  const line = replyLines[Math.floor(Math.random() * replyLines.length)];
  try { if (typeof setEmotion === "function") setEmotion("신남", line); } catch (e4) {}
  return true;
}

function saveLearnedReaction(trigger, message, motion) {
  mergeLearnedReactions([{ trigger, message, motion }]);

  if (SHEET_WRITE_URL) {
    try {
      fetch(SHEET_WRITE_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: trigger, message, motion })
      });
    } catch (e) {
      console.error("시트 저장 실패:", e);
    }
  }
}

function parseLearnPatternFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const direct = raw.match(/^(.+?)\s*[>→➡]\s*(.+?)(?:\s*[\/|｜]\s*(.+))?$/);
  if (direct) {
    return sanitizeLearnedReaction({
      trigger: direct[1],
      message: direct[2],
      motion: direct[3] || ""
    });
  }

  const slash = raw.match(/^([^\/]+)\/(.+?)(?:\/(.+))?$/);
  if (slash) {
    return sanitizeLearnedReaction({
      trigger: slash[1],
      message: slash[2],
      motion: slash[3] || ""
    });
  }

  const say = raw.match(/^(.+?)\s*(?:라고\s*하면|이면|라면|일\s*때|할\s*때)\s*(.+?)\s*(?:라고\s*)?(?:답해|답해줘|말해|말해줘|반응해|반응해줘)$/);
  if (say) {
    return sanitizeLearnedReaction({
      trigger: say[1],
      message: say[2],
      motion: ""
    });
  }

  return null;
}


function escapeRegExpSafe(v) {
  return String(v || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCharacterCallRegex(name, withRest) {
  const safeName = escapeRegExpSafe(name);
  const head = "^(?:" + safeName + ")(?:(?:야|아|님))?";
  if (withRest) {
    return new RegExp(head + "(?:[\\s,!！?.~…:]*)?(.*)$", "i");
  }
  return new RegExp(head + "(?:[\\s,!！?.~…:]*)", "i");
}

function stripLeadingCharacterCall(text) {
  const raw = String(text || "").trim();
  const name = String(currentCharacterName || "").trim();
  if (!raw || !name) return raw;
  const re = buildCharacterCallRegex(name, false);
  return raw.replace(re, "").trim();
}

function getNowParts() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    minute2: String(now.getMinutes()).padStart(2, "0")
  };
}

function detectDateTimeRequest(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const compact = normalizeCompactText(raw);
  const wantsTime = /몇시|몇분|지금시간|현재시간|시간알려|시간이뭐|시간뭐|몇시야|몇시냐|몇시예요|시간좀|지금몇시|지금몇분|현재몇시|지금시간이야|시간알수있어|시계봐줘|시간말해/.test(compact);
  const wantsYear = /몇년|몇년도|몇년도야|연도|년도|올해|이번해|금년|연도알려|올해몇년/.test(compact);
  const wantsMonth = /몇월|몇월이야|월이야|이번달|이번달몇월|월알려|지금몇월|현재몇월|몇달|이번달이몇월/.test(compact);
  const wantsDate = /오늘날짜|현재날짜|날짜알려|몇일|며칠|오늘몇일|오늘며칠|오늘날짜가뭐야|지금날짜|오늘몇일이야|오늘날짜알려줘|오늘날짜좀|날짜좀/.test(compact);
  if (!(wantsTime || wantsYear || wantsMonth || wantsDate)) return null;
  return { wantsTime, wantsYear, wantsMonth, wantsDate };
}

function buildDateTimeResponse(flags) {
  const now = getNowParts();
  if (!flags) return null;
  const pick = function(arr){ return arr[Math.floor(Math.random() * arr.length)]; };
  if (flags.wantsTime && !(flags.wantsYear || flags.wantsMonth || flags.wantsDate)) {
    return { emotion: "기쁨", line: pick([
      `지금은 ${now.hour}시 ${now.minute2}분이에요.`,
      `현재 시각은 ${now.hour}시 ${now.minute2}분이에요!`,
      `지금 시간은 ${now.hour}시 ${now.minute2}분이에요.`
    ]) };
  }
  if (!flags.wantsTime && (flags.wantsYear || flags.wantsMonth || flags.wantsDate)) {
    if (flags.wantsYear && flags.wantsMonth && flags.wantsDate) return { emotion: "기쁨", line: pick([`지금은 ${now.year}년 ${now.month}월 ${now.day}일이에요.`,`오늘 날짜는 ${now.year}년 ${now.month}월 ${now.day}일이에요!`]) };
    if (flags.wantsYear && flags.wantsMonth) return { emotion: "기쁨", line: pick([`지금은 ${now.year}년 ${now.month}월이에요.`,`현재는 ${now.year}년 ${now.month}월이에요.`]) };
    if (flags.wantsYear) return { emotion: "기쁨", line: pick([`지금은 ${now.year}년이에요.`,`올해는 ${now.year}년이에요.`]) };
    if (flags.wantsMonth && flags.wantsDate) return { emotion: "기쁨", line: pick([`지금은 ${now.month}월 ${now.day}일이에요.`,`오늘은 ${now.month}월 ${now.day}일이에요.`]) };
    if (flags.wantsMonth) return { emotion: "기쁨", line: pick([`지금은 ${now.month}월이에요.`,`이번 달은 ${now.month}월이에요.`]) };
    if (flags.wantsDate) return { emotion: "기쁨", line: pick([`오늘은 ${now.year}년 ${now.month}월 ${now.day}일이에요.`,`오늘 날짜는 ${now.year}년 ${now.month}월 ${now.day}일이에요.`]) };
  }
  return { emotion: "기쁨", line: pick([`지금은 ${now.year}년 ${now.month}월 ${now.day}일, ${now.hour}시 ${now.minute2}분이에요.`,`현재는 ${now.year}년 ${now.month}월 ${now.day}일 ${now.hour}시 ${now.minute2}분이에요.`]) };
}


function normalizeCompactText(text) {
  return String(text || "").replace(/\s+/g, "").toLowerCase();
}

function koreanNumberToValue(token) {
  const src = String(token || "").trim().replace(/\s+/g, "");
  if (!src) return null;
  if (/^[+-]?\d+(?:\.\d+)?$/.test(src)) return Number(src);
  if (/^[+-]?(?:\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(src)) return Number(src.replace(/,/g, ""));

  const sign = src.startsWith("마이너스") ? -1 : 1;
  const s = sign === -1 ? src.slice(4) : src;
  if (!s) return null;
  if (s === "영" || s === "공" || s === "빵") return 0;

  const digitMap = { "영":0, "공":0, "빵":0, "일":1, "이":2, "삼":3, "사":4, "오":5, "육":6, "칠":7, "팔":8, "구":9 };
  const unitMap = { "십":10, "백":100, "천":1000 };
  let total = 0;
  let section = 0;
  let number = 0;
  for (const ch of s) {
    if (Object.prototype.hasOwnProperty.call(digitMap, ch)) {
      number = digitMap[ch];
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(unitMap, ch)) {
      section += (number || 1) * unitMap[ch];
      number = 0;
      continue;
    }
    if (ch === "만") {
      section += number;
      total += (section || 1) * 10000;
      section = 0;
      number = 0;
      continue;
    }
    return null;
  }
  return sign * (total + section + number);
}

function normalizeMathExpression(text) {
  let raw = String(text || "").trim();
  if (!raw) return null;

  raw = raw
    .replace(/([?？！])/g, " ")
    .replace(/(?:답\s*(?:말해줘|알려줘|줘)|계산(?:해줘|해\s*줘|해봐|좀)?|풀어줘|풀어\s*줘|얼마(?:야|예요)?|뭐야|뭔데|뭐지|값(?:이야|알려줘)?|결과(?:알려줘)?|같아\?|같니\?)/g, " ")
    .replace(/([0-9일이삼사오육칠팔구영공빵십백천만)])\s*(?:은|는|이|가)\s*$/g, "$1 ")
    .replace(/\b(?:는|은)\b/g, " ")
    .replace(/\b(?:이|가)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  raw = raw
    .replace(/왼쪽괄호|여는괄호|괄호열고|열린괄호/g, "(")
    .replace(/오른쪽괄호|닫는괄호|괄호닫고|닫힌괄호/g, ")")
    .replace(/플러스|더하기|더해줘|더해\s*줘|더해|합쳐줘|합쳐\s*줘/g, "+")
    .replace(/마이너스|빼기|빼줘|빼\s*줘|빼/g, "-")
    .replace(/곱하기|곱해줘|곱해\s*줘|곱하기로|곱해|곱/g, "*")
    .replace(/나누기|나눠줘|나눠\s*줘|나누어줘|나누어\s*줘|나눠|나눠서|나누어|나누기해/g, "/")
    .replace(/나머지|모듈로|mod/gi, "%")
    .replace(/제곱|\^/g, "**")
    .replace(/[xX×]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!/[+\-*/()%]|\*\*/.test(raw)) return null;

  const parts = raw
    .split(/(\*\*|[+\-*/()%])/)
    .map(s => s.trim())
    .filter(Boolean);
  if (!parts.length) return null;

  const normalized = [];
  for (const part of parts) {
    if (/^(\*\*|[+\-*/()%])$/.test(part)) {
      normalized.push(part);
      continue;
    }
    const value = koreanNumberToValue(part);
    if (value === null || Number.isNaN(value)) return null;
    normalized.push(String(value));
  }

  const expr = normalized.join(" ").trim();
  if (!expr || !/^[0-9+\-*/().%\s*]+$/.test(expr)) return null;
  return expr;
}

function detectCalculationRequest(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const looksMathy = /(?:\*\*|[+\-*/x×÷%^()%])/.test(raw)
    || /(?:더하기|빼기|곱하기|나누기|플러스|마이너스|제곱|나머지|모듈로|합쳐|곱해|나눠)/.test(raw)
    || /(?:영|공|빵|일|이|삼|사|오|육|칠|팔|구|십|백|천|만)\s*(?:더하기|빼기|곱하기|나누기|제곱|나머지)/.test(raw);
  const wantsAnswer = /계산|얼마|뭐야|뭐지|답|결과|알려줘|말해줘|풀어줘|값|같아/.test(raw) || looksMathy;
  if (!(looksMathy && wantsAnswer)) return null;
  return normalizeMathExpression(raw);
}

function buildCalculationResponse(text) {
  const expr = detectCalculationRequest(text);
  if (!expr) return null;
  try {
    const value = Function('"use strict"; return (' + expr + ');')();
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { emotion: "경청", line: "계산식은 읽었는데 결과를 구하지 못했어요. 다시 한 번 적어줄래요?" };
    }
    const rounded = Math.round(value * 1000000) / 1000000;
    const pretty = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
    return { emotion: "기쁨", line: `${pretty}이에요.`, action: "calc", value: rounded };
  } catch (e) {
    return { emotion: "경청", line: "계산식을 이해하지 못했어요. 예를 들면 1+2, (3+4)*5, 십 곱하기 십일 같은 식으로 말해줘요." };
  }
}

function parseSiteDisplayName(text) {
  const compact = String(text || "").replace(/\s+/g, "").toLowerCase();
  if (compact.includes("유튜브") || compact.includes("youtube") || compact.includes("yt")) return "유튜브";
  if (compact.includes("네이버") || compact.includes("naver")) return "네이버";
  if (compact.includes("구글") || compact.includes("google")) return "구글";
  if (compact.includes("마이파티") || compact.includes("multiroom") || compact.includes("멀티룸")) return "마이파티";
  return "사이트";
}

function isWebCommandText(text) {
  const compact = String(text || "").replace(/\s+/g, "").toLowerCase();
  const hasSite = compact.includes("구글") || compact.includes("google") || compact.includes("유튜브") || compact.includes("youtube") || compact.includes("yt") || compact.includes("네이버") || compact.includes("naver") || compact.includes("마이파티") || compact.includes("multiroom") || compact.includes("멀티룸");
  const wantsOpen = /열어줘|열어|켜줘|켜|들어가|접속해|틀어줘/.test(compact);
  const wantsClose = /닫아|닫아줘|꺼줘|꺼|기본화면|돌아가|홈으로/.test(compact);
  return { hasSite, wantsOpen, wantsClose };
}

function getWebCommandResponse(text, options) {
  if (!window.WebLauncher || typeof window.WebLauncher.handleCommand !== "function") return null;
  const info = isWebCommandText(text);
  if (!(info.hasSite || info.wantsClose)) return null;
  let handled = false;
  try {
    handled = !!window.WebLauncher.handleCommand(text, Object.assign({}, options || {}, { silent: true, source: "bridge" }));
  } catch (e) {
    console.warn("WebLauncher bridge error", e);
    handled = false;
  }
  if (!handled) return null;
  if (info.wantsClose && !info.hasSite) {
    return { emotion: "인사", line: "열린 화면을 닫고 기본화면으로 돌아갈게요.", action: "web_close" };
  }
  const siteName = parseSiteDisplayName(text);
  const lines = [`${siteName} 열어드릴게요!`, `${siteName} 바로 띄워볼게요!`, `${siteName} 쪽으로 들어가볼게요!`];
  return { emotion: "기쁨", line: lines[Math.floor(Math.random() * lines.length)], action: "web_open", site: siteName };
}

function parseDiceIntent(text) {
  const compact = String(text || "").replace(/\s+/g, "");
  const asksDice = compact.includes("주사위") || compact.includes("다이스");
  const asksRoll = /굴려|굴려줘|돌려|돌려줘|던져|던져줘|뽑아|랜덤|해줘|봐줘|부탁/.test(compact) || asksDice;
  if (!(asksDice && asksRoll)) return null;
  const countMatch = compact.match(/주사위([1234])개?|([1234])개주사위/);
  let count = countMatch ? Number((countMatch[1] || countMatch[2])) : 1;
  if (/두개|둘/.test(compact)) count = 2;
  else if (/세개|셋/.test(compact)) count = 3;
  else if (/네개|넷/.test(compact)) count = 4;
  count = Math.max(1, Math.min(4, count || 1));
  return { count };
}

function getDiceResponse(intent) {
  const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const count = Math.max(1, Math.min(4, Number(intent && intent.count) || 1));
  const values = Array.from({ length: count }, function(){ return 1 + Math.floor(Math.random() * 6); });
  const icons = values.map(function(v){ return faces[v - 1]; }).join(" ");
  const total = values.reduce(function(a,b){ return a + b; }, 0);
  const pick = function(arr){ return arr[Math.floor(Math.random() * arr.length)]; };
  const introsSingle = ["데굴데굴 굴려볼게요!", "좋아요, 주사위 한 번 굴려볼게요!", "주사위 운을 볼게요!"];
  const introsMulti = [
    `좋아요, 주사위 ${count}개를 한꺼번에 굴려볼게요!`,
    `주사위 ${count}개 갑니다!`,
    `좋아요! ${count}개를 동시에 굴려볼게요.`
  ];
  const endingsSingle = [
    `${values[0]}이 나왔어요!`,
    `결과는 ${values[0]}이에요!`,
    `이번에는 ${values[0]}이 떴어요!`
  ];
  const endingsMulti = [
    `${values.join(', ')}이 나왔어요! 합계는 ${total}이에요.`,
    `결과는 ${values.join(', ')}예요. 모두 더하면 ${total}이에요!`,
    `${values.join(', ')}이 떴어요! 총합은 ${total}이에요.`
  ];
  const line = count === 1
    ? `${icons} ${pick(introsSingle)} ${pick(endingsSingle)}`
    : `${icons} ${pick(introsMulti)} ${pick(endingsMulti)}`;
  return { emotion: "신남", line, action: "dice", value: count === 1 ? values[0] : values, count, total };
}

function getRpsResponse(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  if (raw.includes("가위바위보")) {
    gameState = "waiting";
    return { emotion: "신남", line: "좋아요! 가위바위보 해요. 가위, 바위, 보 중 하나를 말해 주세요.", action: "rps_start" };
  }
  if (gameState !== "waiting") return null;
  const move = RPS.find(function (m) { return raw.includes(m); });
  if (!move) {
    return { emotion: "경청", line: "가위, 바위, 보 중 하나를 정확히 말해줄래요?", action: "rps_waiting" };
  }
  const aiMove = RPS[Math.floor(Math.random() * RPS.length)];
  let line = `너는 ${move}, 나는 ${aiMove}! `;
  if (move === aiMove) {
    gameState = null;
    return { emotion: "경청", line: line + "비겼어요! 다시 해볼까요?", action: "rps_result", result: "draw", aiMove, userMove: move };
  }
  const win = (move === "가위" && aiMove === "보") || (move === "바위" && aiMove === "가위") || (move === "보" && aiMove === "바위");
  gameState = null;
  if (win) return { emotion: "기쁨", line: line + "이번 판은 네가 이겼어요!", action: "rps_result", result: "win", aiMove, userMove: move };
  return { emotion: "장난", line: line + "이번 판은 내가 이겼어요!", action: "rps_result", result: "lose", aiMove, userMove: move };
}

async function getUnifiedCharacterChatResponse(text, options = {}) {
  await ensureLearnedReactionsReady();
  const originalRaw = String(text || "").trim();
  if (!originalRaw) return null;

  const allowCharacterCall = options.allowCharacterCall !== false;
  const raw = allowCharacterCall ? (stripLeadingCharacterCall(originalRaw) || originalRaw) : originalRaw;

  if (allowCharacterCall && currentCharacterName) {
    const compactOriginal = originalRaw.replace(/\s+/g, "");
    const compactName = String(currentCharacterName).replace(/\s+/g, "");
    if (
      compactOriginal === compactName ||
      compactOriginal === compactName + "야" ||
      compactOriginal === compactName + "아" ||
      compactOriginal === compactName + "님"
    ) {
      return { emotion: "기쁨", line: "응, 듣고 있어. 하고 싶은 말을 이어서 해줘!" };
    }
  }

  const dtReq = detectDateTimeRequest(raw);
  if (dtReq) return buildDateTimeResponse(dtReq);

  const calcResp = buildCalculationResponse(raw);
  if (calcResp && calcResp.line) return calcResp;

  const webResp = getWebCommandResponse(raw, options || {});
  if (webResp && webResp.line) return webResp;

  const rpsResp = getRpsResponse(raw);
  if (rpsResp && rpsResp.line) return rpsResp;

  const diceIntent = parseDiceIntent(raw);
  if (diceIntent) return getDiceResponse(diceIntent);

  const q = extractQueryFromText(raw);
  if (q) {
    try {
      const summary = await queryWiki(q);
      const searchFallbacks = [`"${q}"에 대해 찾아봤어요!`, `좋아요, "${q}" 관련 내용을 정리해봤어요.`, `"${q}"에 대해 알아본 내용을 들려줄게요.`];
      return { emotion: "화면보기", line: summary || searchFallbacks[Math.floor(Math.random() * searchFallbacks.length)] };
    } catch (e) {
      return { emotion: "절망", line: ["검색 중에 오류가 발생했어요. 나중에 다시 시도해볼까요?","찾아보는 중 문제가 생겼어요. 잠시 후 다시 말해줄래요?","검색이 잠깐 꼬였어요. 조금 뒤에 다시 해볼까요?"][Math.floor(Math.random() * 3)] };
    }
  }

  let learnedResp = null;
  if (typeof getLearnedDialogResponse === "function") learnedResp = getLearnedDialogResponse(raw);
  if (learnedResp && learnedResp.line) return learnedResp;

  let builtinResp = null;
  if (typeof getBuiltinDialogResponse === "function") builtinResp = getBuiltinDialogResponse(raw);
  if (builtinResp && builtinResp.line) return builtinResp;

  if (isCallExpression(raw)) {
    return { emotion: "기쁨", line: "응, 듣고 있어. 하고 싶은 말을 이어서 해줘!" };
  }

  return { emotion: "경청", line: "응, 듣고 있어. 조금만 더 자세히 말해줄래?" };
}

function extractCharacterCallText(text) {
  const raw = String(text || "").trim();
  const name = String(currentCharacterName || "").trim();
  if (!raw || !name) return null;
  const re = buildCharacterCallRegex(name, true);
  const m = raw.match(re);
  if (!m) return null;
  const rest = String(m[1] || "").trim();
  return rest || null;
}

async function getCharacterChatResponse(text) {
  await ensureLearnedReactionsReady();
  const raw = String(text || "").trim();
  if (!raw) return null;

  const dtReq = detectDateTimeRequest(raw);
  if (dtReq) return buildDateTimeResponse(dtReq);

  const calcResp = buildCalculationResponse(raw);
  if (calcResp && calcResp.line) return calcResp;

  const webResp = getWebCommandResponse(raw, {});
  if (webResp && webResp.line) return webResp;

  const rpsResp = getRpsResponse(raw);
  if (rpsResp && rpsResp.line) return rpsResp;

  const diceIntent = parseDiceIntent(raw);
  if (diceIntent) return getDiceResponse(diceIntent);

  const q = extractQueryFromText(raw);
  if (q) {
    try {
      const summary = await queryWiki(q);
      const searchFallbacks = [`"${q}"에 대해 찾아봤어요!`, `좋아요, "${q}" 관련 내용을 정리해봤어요.`, `"${q}"에 대해 알아본 내용을 들려줄게요.`];
      return { emotion: "화면보기", line: summary || searchFallbacks[Math.floor(Math.random() * searchFallbacks.length)] };
    } catch (e) {
      return { emotion: "절망", line: ["검색 중에 오류가 발생했어요. 나중에 다시 시도해볼까요?","찾아보는 중 문제가 생겼어요. 잠시 후 다시 말해줄래요?","검색이 잠깐 꼬였어요. 조금 뒤에 다시 해볼까요?"][Math.floor(Math.random() * 3)] };
    }
  }

  let learnedResp = null;
  if (typeof getLearnedDialogResponse === "function") learnedResp = getLearnedDialogResponse(raw);
  if (learnedResp && learnedResp.line) return learnedResp;

  let builtinResp = null;
  if (typeof getBuiltinDialogResponse === "function") builtinResp = getBuiltinDialogResponse(raw);
  if (builtinResp && builtinResp.line) return builtinResp;

  if (isCallExpression(raw)) {
    return { emotion: "기쁨", line: "응, 듣고 있어. 하고 싶은 말을 이어서 해줘!" };
  }

  return { emotion: "경청", line: "응, 듣고 있어. 조금만 더 자세히 말해줄래?" };
}

window.addEventListener("message", async function (ev) {
  const data = ev && ev.data;
  if (!data || data.type !== "WG_CORE_BRIDGE_REQUEST") return;
  const source = ev.source;
  if (!source || typeof source.postMessage !== "function") return;
  const requestId = data.requestId || "";
  const method = String(data.method || "");
  const args = Array.isArray(data.args) ? data.args : [];
  try {
    let result = null;
    if (method === "getCurrentCharacterName") result = currentCharacterName || "고스트";
    else if (method === "parseLearnPatternFromText") result = parseLearnPatternFromText(args[0]);
    else if (method === "saveLearnedReaction") result = saveLearnedReaction(args[0], args[1], args[2]);
    else if (method === "extractCharacterCallText") result = extractCharacterCallText(args[0]);
    else if (method === "getUnifiedCharacterChatResponse") result = await getUnifiedCharacterChatResponse(args[0], args[1] || {});
    else if (method === "getCharacterChatResponse") result = await getCharacterChatResponse(args[0]);
    else if (method === "ensureLearnedReactionsReady") result = await ensureLearnedReactionsReady();
    source.postMessage({ type: "WG_CORE_BRIDGE_RESPONSE", requestId, ok: true, result }, "*");
  } catch (err) {
    source.postMessage({
      type: "WG_CORE_BRIDGE_RESPONSE",
      requestId,
      ok: false,
      error: (err && err.message) ? err.message : String(err || "error")
    }, "*");
  }
});

window.GhostCoreBridge = Object.assign({}, window.GhostCoreBridge || {}, {
  parseLearnPatternFromText: parseLearnPatternFromText,
  saveLearnedReaction: saveLearnedReaction,
  getCharacterChatResponse: getCharacterChatResponse,
  getUnifiedCharacterChatResponse: getUnifiedCharacterChatResponse,
  extractCharacterCallText: extractCharacterCallText,
  getCurrentCharacterName: function(){ return currentCharacterName || "고스트"; },
  getDateTimeResponse: function(text){ const req = detectDateTimeRequest(text); return req ? buildDateTimeResponse(req) : null; }
});

async function handleUserSubmit() {
      if (shutdown) return;
      const text = userInput.value.trim();
      if (!text) return;

      // 특수 명령: 수첩 메뉴 / 게시판 / 로그인 / 편지(로컬 편지함) 열기 (대화로도 호출 가능)
      const __wakeNames = [];
      try {
        if (window.currentCharacterName) __wakeNames.push(String(window.currentCharacterName));
      } catch (e) {}
      __wakeNames.push("미나", "민수", "마이파이", "얘", "야", "저기", "있잖아");
      let commandText = String(text || "").trim();
      __wakeNames.forEach(function(name){
        if (!name) return;
        const re = new RegExp("^(?:" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")([야아요!,~ ]+)?", "i");
        commandText = commandText.replace(re, "").trim();
      });
      const compact = commandText.replace(/\s+/g, "");

      // 캐릭터 숨기기 / 다시 나오기 (옵션 기능: js/ghost-hide.js)
      // - ghost-hide.js 에서 handleGhostHideCommand(text, compact)를 제공할 때만 동작합니다.
      // - 이 기능이 필요 없다면 ghost-hide.js 파일과 아래 if 블록 전체를 삭제해도 됩니다.
      if (typeof handleGhostHideCommand === "function") {
        try {
          const __handledByGhostHide = handleGhostHideCommand(text, compact);
          if (__handledByGhostHide) {
            return;
          }
        } catch (e) {
          console.warn("handleGhostHideCommand error", e);
        }
      }

      // [옵션 기능] 캐릭터-톡에서 실시간 톡(메신저) 열기 명령어
      // - js/messenger-chat-command.js 에서 handleMessengerCommand(text, compact)를 제공할 때만 동작합니다.
      // - 이 기능이 필요 없다면 messenger-chat-command.js 파일과 아래 if 블록 전체를 삭제해도 됩니다.
      if (typeof handleMessengerCommand === "function") {
        try {
          const __handledByMessengerCommand = handleMessengerCommand(text, compact);
          if (__handledByMessengerCommand) {
            userInput.value = "";
            if (typeof resetSleepTimer === "function") {
              resetSleepTimer();
            }
            return;
          }
        } catch (e) {
          console.warn("handleMessengerCommand error", e);
        }
      }

      if (typeof tryHandleMessengerVoiceCommand === "function") {
        try {
          const __handledByMessengerSpeech = tryHandleMessengerVoiceCommand(commandText || text);
          if (__handledByMessengerSpeech) {
            userInput.value = "";
            if (typeof resetSleepTimer === "function") {
              resetSleepTimer();
            }
            return;
          }
        } catch (e) {
          console.warn("tryHandleMessengerVoiceCommand error", e);
        }
      }

      // [옵션 기능] 외부 사이트 열기 / 닫기 / 기본화면 복귀 명령
      if (window.WebLauncher && typeof window.WebLauncher.handleCommand === "function") {
        try {
          const __handledByWebLauncher = window.WebLauncher.handleCommand(text, { source: "chat" });
          if (__handledByWebLauncher) {
            userInput.value = "";
            if (typeof resetSleepTimer === "function") {
              resetSleepTimer();
            }
            return;
          }
        } catch (e) {
          console.warn("WebLauncher handleCommand error", e);
        }
      }


      // 메뉴 / 수첩
      if (
        compact === "메뉴" ||
        compact === "메뉴열어" ||
        compact === "메뉴열어줘" ||
        compact === "메뉴열어봐" ||
        compact === "메뉴켜" ||
        compact === "메뉴켜줘" ||
        compact === "수첩" ||
        compact === "수첩열어" ||
        compact === "수첩열어줘" ||
        compact === "수첩켜" ||
        compact === "수첩켜줘"
      ) {
        if (typeof openNotebookMenu === "function") {
          openNotebookMenu();
        }
        userInput.value = "";
        if (typeof resetSleepTimer === "function") {
          resetSleepTimer();
        }
        return;
      }

      // 게시판
      if (
        compact === "게시판" ||
        compact === "게시판열어" ||
        compact === "게시판열어줘" ||
        compact === "게시판열어봐" ||
        compact === "게시판켜" ||
        compact === "게시판켜줘"
      ) {
        if (typeof openBoardPanel === "function") {
          openBoardPanel();
        } else if (typeof showBubble === "function") {
          showBubble("게시판 기능은 아직 준비 중이에요.");
        }
        userInput.value = "";
        if (typeof resetSleepTimer === "function") {
          resetSleepTimer();
        }
        return;
      }

      // 로그인
      if (
        compact === "로그인" ||
        compact === "로그인창" ||
        compact === "로그인열어" ||
        compact === "로그인열어줘" ||
        compact === "로그인켜" ||
        compact === "로그인켜줘"
      ) {
        if (typeof openLoginPanel === "function") {
          openLoginPanel();
        } else if (typeof showBubble === "function") {
          showBubble("로그인 패널은 아직 준비 중이에요.");
        }
        userInput.value = "";
        if (typeof resetSleepTimer === "function") {
          resetSleepTimer();
        }
        return;
      }

      // 편지함 / 편지 (로컬 편지함)
      if (
        compact === "편지" ||
        compact === "편지함" ||
        compact === "편지열어" ||
        compact === "편지열어줘" ||
        compact === "편지함열어" ||
        compact === "편지함열어줘"
      ) {
        if (window.LettersLocal && typeof LettersLocal.openFromMenu === "function") {
          LettersLocal.openFromMenu();
        } else if (typeof showBubble === "function") {
          showBubble("로컬 편지함이 아직 준비 중이에요.");
        }
        userInput.value = "";
        if (typeof resetSleepTimer === "function") {
          resetSleepTimer(false);
        }
        return;
      }

// 졸고 있는 상태에서 사용자가 말을 걸면 기지개를 켜며 깨어나기
      if (isSleeping) {
        if (sleepTimer) clearTimeout(sleepTimer);
        sleepTimer = null;
        isSleeping = false;
        statusHintEl.textContent = "다시 깨어났어요. 이제 편하게 말 걸어도 돼요.";

        const wakeLines = [
          "후아… 잘 잤다! 이제 이야기할 준비 됐어.",
          "기지개 쭉— 이제 완전 깨어났어. 뭐부터 이야기할까?",
          "잠깐 졸았네… 지금은 또렷또렷! 편하게 말 걸어줘."
        ];
        const line = wakeLines[Math.floor(Math.random() * wakeLines.length)];

        // 사용자가 했던 말도 기록해 두고, 고스트가 기지개 펴며 답해요.
        logMessage("user", text);

        // 기지개 모션을 조금 더 크게 보이도록 확대 클래스 적용

        ghostEl.classList.add("stretch-big");
        setEmotion("벌서기", line, { shake: true });
        logMessage("ghost", line);

        setTimeout(() => {
          setEmotion(IDLE_NAME);
          ghostEl.classList.remove("stretch-big");
        }, 2500);

        userInput.value = "";
        resetSleepTimer();
        return;
      }


// 채팅으로 학습 모드 진입: 이때만 가르치기 창을 화면 중앙에 띄움
if (isTeachCommand(text)) {
  setEmotion("경청", "좋아요! 새로 배워볼게요.\n아래 창에 사용자가 말할 문장과, 제가 대답할 말을 적어주세요.");
  openTeachModal();
  return;
}


      userInput.value = "";
      logMessage("user", text);
      boostWaveBackground();
      resetSleepTimer();

      if (containsBadWord(text)) {
        // 욕설 / 모욕에 대한 강화된 반응: 분노 + 슬픔 + 절망 + 벌서기 섞어서 사용
        const badWordReactions = [
          { emo: "분노", line: "그런 말은 솔직히 상처예요. 지금은 그만해 주면 안 될까요?", opt: { shake: true } },
          { emo: "분노", line: "나도 화낼 줄은 알아요. 그래도 싸우기보단, 무슨 일이 있었는지 말해줄래요?", opt: { shake: true } },
          { emo: "슬픔", line: "방금 말… 생각보다 많이 아팠어요. 저도 기분이 내려가 버렸어요.", opt: { shake: false } },
          { emo: "슬픔", line: "나도 농담인 건 알지만, 조금만 더 부드럽게 말해주면 좋겠어요…", opt: { shake: false } },
          { emo: "절망", line: "하아… 내가 이렇게까지 들어야 할 말인가 싶어서, 살짝 절망했어요…", opt: { shake: true } },
          { emo: "절망", line: "오늘 정말 힘든 날인가 봐요. 나까지 이렇게 대하면, 나도 버티기 힘들어져요…", opt: { shake: false } },
          { emo: "벌서기", line: "혹시 내가 뭔가 마음에 안 들었어요? 그럼 벌이라도 받을게요… 대신 솔직하게 말해줘요.", opt: { shake: true } },
          { emo: "벌서기", line: "혼난 기분이라 살짝 축 처졌어요… 그래도 다시 잘해보라고 해주면 기운 날 것 같아요.", opt: { shake: false } }
        ];
        const picked = badWordReactions[Math.floor(Math.random() * badWordReactions.length)];
        setEmotion(picked.emo, picked.line, picked.opt);
        return;
      }

      // 캐릭터 이름만 부른 경우에만 짧게 반응하고,
      // 뒤에 요청이 이어진 경우에는 아래 실제 기능 분기로 계속 진행해요.
      if (currentCharacterName && text.includes(currentCharacterName)) {
        const calledText = extractCharacterCallText(text);
        const compactCalled = String(calledText || "").replace(/\s+/g, "");
        const compactOriginal = String(text || "").replace(/\s+/g, "");
        const compactName = String(currentCharacterName || "").replace(/\s+/g, "");
        const onlyCalledByName = !compactCalled && (
          compactOriginal === compactName ||
          compactOriginal === compactName + "야" ||
          compactOriginal === compactName + "아" ||
          compactOriginal === compactName + "님"
        );
        if (onlyCalledByName) {
          const nameReplies = [
            "네, 저 여기 있어요. 제 이름 불러줘서 고마워요!",
            "응, 나 " + currentCharacterName + "야. 뭐가 궁금해?",
            "불러줘서 기뻐요. " + currentCharacterName + "가 잘 들어줄게요."
          ];
          const reply = nameReplies[Math.floor(Math.random() * nameReplies.length)];
          setEmotion("기쁨", reply);
          return;
        }
      }

      // '야', '너', '있잖아' 같은 호칭에 대한 반응 (단어 전체일 때만 인식)
      if (isCallExpression(text)) {
        const callReplies = [
          "네, 여기 있어요. 부르셔서 왔어요!",
          "응, 나 듣고 있어. 무슨 일이야?",
          "응응, 여기 보고 있어. 하고 싶은 말 있어?"
        ];
        const reply = callReplies[Math.floor(Math.random() * callReplies.length)];
        setEmotion("기쁨", reply, { shake: false });
        return;
      }

      // 사용 설명 / 도움말 요청 처리
      if (
        text.includes("설명서") ||
        text.includes("사용법") ||
        text.includes("사용 방법") ||
        text.includes("사용방법") ||
        text.includes("어떻게 써") ||
        text.includes("어떻게 사용") ||
        text.includes("도움말")
      ) {
        showUsageGuide();
        return;
      }


// 오늘의 운세 / 점 보기
const compactFortune = text.replace(/\s+/g, "");
if (
  compactFortune.includes("오늘의운세") ||
  compactFortune.includes("오늘운세") ||
  compactFortune.includes("오늘어떨까") ||
  compactFortune.includes("오늘은어떨까") ||
  compactFortune.includes("점봐줘") ||
  compactFortune.includes("점쳐줘") ||
  compactFortune.includes("점쳐줘요") ||
  compactFortune.includes("점쳐줘") ||
  compactFortune.includes("점쳐줘요")
) {
  if (window.FortuneToday && typeof window.FortuneToday.handleRequest === "function") {
    try {
      FortuneToday.handleRequest(text);
    } catch (e) {
      console.error("FortuneToday 에러:", e);
      if (typeof showBubble === "function") {
        showBubble("오늘의 운세를 불러오다가 문제가 생겼어요. 나중에 다시 시도해볼까요?");
      }
    }
  } else if (typeof showBubble === "function") {
    showBubble("간단한 오늘의 운세 기능은 아직 준비 중이에요.");
  }
  return;
}
// [옵션 기능] 인터넷 사이트 열기 (구글 / 유튜브 / 네이버 등)
      const compactWeb = text.replace(/\s+/g, "").toLowerCase();
      if (
        compactWeb.includes("구글") ||
        compactWeb.includes("google") ||
        compactWeb.includes("유튜브") ||
        compactWeb.includes("youtube") ||
        compactWeb.includes("yt") ||
        compactWeb.includes("네이버") ||
        compactWeb.includes("naver") ||
        compactWeb.includes("마이파티") ||
        compactWeb.includes("multiroom") ||
        compactWeb.includes("멀티룸")
      ) {
        if (window.WebLauncher && typeof window.WebLauncher.handleCommand === "function") {
          try {
            WebLauncher.handleCommand(text, { source: "chat-fallback" });
          } catch (e) {
            console.error("WebLauncher 에러:", e);
            if (typeof showBubble === "function") {
              showBubble("요청하신 사이트를 여는 동안 문제가 생겼어요. 나중에 다시 시도해 볼까요?");
            }
          }
        } else if (typeof showBubble === "function") {
          showBubble("외부 사이트를 여는 기능은 아직 준비 중이에요.");
        }
        return;
      }


      if (text.includes("가위바위보")) {
        startGame();
        return;
      }

      if (gameState === "waiting") {
        handleRpsMove(text);
        return;
      }

      const diceIntent = parseDiceIntent(text);
      if (diceIntent) {
        const resp = getDiceResponse(diceIntent);
        if (resp && resp.line) setEmotion(resp.emotion || "신남", resp.line, { shake: false });
        return;
      }

      const dtReq = detectDateTimeRequest(text);
      if (dtReq) {
        const resp = buildDateTimeResponse(dtReq);
        if (resp && resp.line) setEmotion(resp.emotion || "기쁨", resp.line, { shake: false });
        return;
      }

      const calcResp = buildCalculationResponse(text);
      if (calcResp && calcResp.line) {
        setEmotion(calcResp.emotion || "기쁨", calcResp.line, { shake: false });
        return;
      }

      // 검색(위키) 시도 이전에, 학습/기본 대화 후보를 미리 계산해 둔다.
      let learnedResp = null;
      if (typeof getLearnedDialogResponse === "function") {
        learnedResp = getLearnedDialogResponse(text);
      }

      let builtinResp = null;
      if (typeof getBuiltinDialogResponse === "function") {
        builtinResp = getBuiltinDialogResponse(text);
      }

      const q = extractQueryFromText(text);
      if (q) {
        setEmotion("경청", [`\"${q}\"에 대해 찾아볼게요. 잠시만요…`,`좋아요, \"${q}\"부터 찾아볼게요!`,`\"${q}\" 관련 내용을 바로 찾아볼게요.`][Math.floor(Math.random() * 3)], { shake: false });
        try {
          const summary = await queryWiki(q);
          setEmotion("화면보기", summary, { shake: false });
        } catch (e) {
          setEmotion("절망", "검색 중에 오류가 발생했어요. 나중에 다시 시도해볼까요?", { shake: false });
        }
        return;
      }

      // 학습된 대사가 있으면 우선 사용하고, 없을 때만 기본 대화를 사용
      if (learnedResp && learnedResp.emotion) {
        setEmotion(learnedResp.emotion, learnedResp.line || null);
        lastUnknownKey = null;
        lastUnknownCount = 0;
        return;
      }

      if (builtinResp && builtinResp.emotion) {
        setEmotion(builtinResp.emotion, builtinResp.line || null);
        lastUnknownKey = null;
        lastUnknownCount = 0;
        return;
      }

      // 마지막 안전망: 아무 것도 못 알아들었을 때
      if (!lastUnknownKey) {
        lastUnknownKey = text.trim();
        lastUnknownCount = 1;
      } else {
        const normPrev = lastUnknownKey.trim();
        const normCur = text.trim();
        if (normPrev && normPrev === normCur) {
          lastUnknownCount += 1;
        } else {
          lastUnknownKey = normCur;
          lastUnknownCount = 1;
        }
      }

      // 모르는 표현이 연속으로 두 번 등장하면, 가르치기 모달을 제안
      if (lastUnknownCount >= 2) {
        const teachLines = [
          "이 표현은 아직 내가 잘 몰라요. 아래 창에서 어떻게 대답하면 좋을지 가르쳐 줄래요?",
          "두 번이나 같은 말을 해 줬는데도 내가 정확히 이해를 못했나 봐요. 나를 조금만 더 가르쳐 줄 수 있을까?",
          "이 말은 내 사전에 아직 없네. 같이 새로 배우는 느낌으로, 대답 예시를 적어 줄래요?",
        ];
        const line = teachLines[Math.floor(Math.random() * teachLines.length)];
        setEmotion("경청", line);
        if (typeof openTeachModal === "function") {
          openTeachModal();
        }
        // 제안 후에는 카운트를 리셋해서 계속 반복 제안하지 않도록 함
        lastUnknownKey = null;
        lastUnknownCount = 0;
        return;
      }

      // 일반적인 '모르는 말' 대응 (경청 + 다양한 리액션)
      const unknownLines = [
        "응… 계속 말해줘요. 중요한 이야기 같아요.",
        "나 나도 고개를 끄덕이게 되네… 그런 일이 있었구나.",
        "완벽히 이해하진 못했지만, 네가 하고 싶은 말은 귀 기울여 듣고 있어.",
        "흠… 조금 더 설명해 줄 수 있을까? 네 얘기가 궁금해.",
        "지금 이야기해 준 말이 네게 중요한 것 같아 보여. 더 자세히 듣고 싶어.",
        "그 부분은 내가 아직 잘 몰라서 그래. 그래도 네 말을 진지하게 듣고 있어.",
        "어떤 느낌인지 대충은 알 것 같아. 계속 이어서 이야기해 줄래?",
      ];
      const line = unknownLines[Math.floor(Math.random() * unknownLines.length)];
      setEmotion("경청", line);
    }
    function init() {
      // 첫 실행 시, 캐릭터별 인사 표정(인사1/2)과 함께 자기소개 출력
      const intro = getCurrentCharacterIntro();
      setEmotion("인사", intro);

      resetSleepTimer();
      if (typeof loadSheetReactions === "function") {
        loadSheetReactions();
      }
    }

    
