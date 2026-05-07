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
window.SHEET_WRITE_URL = SHEET_WRITE_URL; // ui.js 등에서 window.SHEET_WRITE_URL 참조용

    
const SPREADSHEET_URL = SHEET_CSV_URL;
const SPEECH_MODE_KEY = "ghostSpeechMode";
let currentSpeechMode = (() => {
  try {
    return window.localStorage.getItem(SPEECH_MODE_KEY) === "polite" ? "polite" : "casual";
  } catch (e) {
    return "casual";
  }
})();

function setSpeechMode(mode) {
  currentSpeechMode = mode === "polite" ? "polite" : "casual";
  try {
    window.localStorage.setItem(SPEECH_MODE_KEY, currentSpeechMode);
  } catch (e) {}
  return currentSpeechMode;
}

function isTeachModalOpen() {
  const modal = document.getElementById("teachModal");
  return !!(modal && !modal.classList.contains("hidden"));
}

function isTeachGuidanceLine(text) {
  const line = String(text || "").trim();
  if (!line) return false;
  return /배워|가르쳐|알려|문장|대답|답하면|적어줘|입력해줘|학습/.test(line);
}


function convertBubbleLineToPolite(text) {
  let s = String(text || "");
  if (!s) return s;

  const endBoundary = String.raw`(?=$|[.!?,
…])`;

  const phrasePairs = [
    [/잘 모르겠어/g, "잘 모르겠어요"],
    [/나까지/g, "저까지"], [/나도/g, "저도"], [/나는/g, "저는"], [/나를/g, "저를"], [/내가/g, "제가"], [/난/g, "저는"], [/내 /g, "제 "],
    [/니가/g, "당신이"], [/네가/g, "당신이"], [/넌/g, "당신은"], [/너도/g, "당신도"], [/너를/g, "당신을"], [/너한테/g, "당신에게"], [/너랑/g, "당신과"], [/너는/g, "당신은"], [/너 /g, "당신 "],
    [/말해줘/g, "말해 주세요"], [/걸어줘/g, "걸어 주세요"], [/들어줘/g, "들어 주세요"], [/알려줘/g, "알려 주세요"], [/적어줘/g, "적어 주세요"], [/써줘/g, "써 주세요"],
    [/골라줘/g, "골라 주세요"], [/보여줘/g, "보여 주세요"], [/열어줘/g, "열어 주세요"], [/기다려줘/g, "기다려 주세요"], [/가르쳐줘/g, "가르쳐 주세요"],
    [/이어가자/g, "이어서 이야기해 볼까요"], [/같이 보자/g, "같이 볼까요"], [/다시 보자/g, "다시 볼까요"], [/정리해보자/g, "정리해 볼까요"], [/붙여보자/g, "이어 붙여 볼까요"], [/해보자/g, "해 볼까요"], [/가자/g, "가 볼까요"]
  ];
  for (const [a, b] of phrasePairs) s = s.replace(a, b);

  const endingPairs = [
    [new RegExp(`안녕${endBoundary}`, 'g'), "안녕하세요"],
    [/까\?/g, "까요?"],
    [new RegExp(`까${endBoundary}`, 'g'), "까요"],
    [new RegExp(`응${endBoundary}`, 'g'), "응이네요"],
    [new RegExp(`걸${endBoundary}`, 'g'), "걸요"],
    [new RegExp(`기뻐${endBoundary}`, 'g'), "기뻐요"],
    [new RegExp(`하냐${endBoundary}`, 'g'), "해요"],
    [new RegExp(`거지${endBoundary}`, 'g'), "거죠"],
    [new RegExp(`하지${endBoundary}`, 'g'), "하지요"],
    [/뭐\?/g, "뭐가요?"],
    [new RegExp(`뭐${endBoundary}`, 'g'), "뭐가요"],
    [new RegExp(`다르냐${endBoundary}`, 'g'), "달라요"],
    [new RegExp(`말야${endBoundary}`, 'g'), "말이에요"],
    [new RegExp(`뭘${endBoundary}`, 'g'), "뭘요"],
    [new RegExp(`되지${endBoundary}`, 'g'), "되죠"],
    [new RegExp(`잖아${endBoundary}`, 'g'), "잖아요"],
    [new RegExp(`이네${endBoundary}`, 'g'), "이네요"],
    [new RegExp(`하네${endBoundary}`, 'g'), "하네요"],
    [new RegExp(`내자${endBoundary}`, 'g'), "내요"],
    [new RegExp(`하자${endBoundary}`, 'g'), "해요"],
    [new RegExp(`래${endBoundary}`, 'g'), "래요"],
    [new RegExp(`쳐${endBoundary}`, 'g'), "쳐요"],
    [new RegExp(`져${endBoundary}`, 'g'), "져요"],
    [new RegExp(`워${endBoundary}`, 'g'), "워요"],
    [new RegExp(`여${endBoundary}`, 'g'), "여요"],
    [new RegExp(`게${endBoundary}`, 'g'), "게요"],
    [new RegExp(`데${endBoundary}`, 'g'), "데요"],
    [new RegExp(`고${endBoundary}`, 'g'), "고요"],
    [new RegExp(`도${endBoundary}`, 'g'), "도요"],
    [new RegExp(`가${endBoundary}`, 'g'), "가요"],
    [new RegExp(`나${endBoundary}`, 'g'), "나요"],
    [new RegExp(`지${endBoundary}`, 'g'), "지요"],
    [new RegExp(`이${endBoundary}`, 'g'), "이에요"],
    [new RegExp(`야${endBoundary}`, 'g'), "에요"],
    [new RegExp(`줘${endBoundary}`, 'g'), "주세요"],
    [/줄래\?/g, "주실래요?"], [/볼래\?/g, "보실래요?"], [/할래\?/g, "하실래요?"],
    [/말해줄래\?/g, "말해 주실래요?"], [/알려줄래\?/g, "알려 주실래요?"],
    [new RegExp(`있어${endBoundary}`, 'g'), "있어요"], [new RegExp(`없어${endBoundary}`, 'g'), "없어요"], [new RegExp(`괜찮아${endBoundary}`, 'g'), "괜찮아요"], [new RegExp(`좋아${endBoundary}`, 'g'), "좋아요"], [new RegExp(`싫어${endBoundary}`, 'g'), "싫어요"],
    [new RegExp(`고마워${endBoundary}`, 'g'), "고마워요"], [new RegExp(`미안해${endBoundary}`, 'g'), "미안해요"], [new RegExp(`반가워${endBoundary}`, 'g'), "반가워요"], [new RegExp(`알겠어${endBoundary}`, 'g'), "알겠어요"],
    [new RegExp(`모르겠어${endBoundary}`, 'g'), "모르겠어요"], [new RegExp(`들었어${endBoundary}`, 'g'), "들었어요"], [new RegExp(`했어${endBoundary}`, 'g'), "했어요"], [new RegExp(`됐어${endBoundary}`, 'g'), "됐어요"], [new RegExp(`싶어${endBoundary}`, 'g'), "싶어요"], [new RegExp(`왔어${endBoundary}`, 'g'), "왔어요"], [new RegExp(`왔지${endBoundary}`, 'g'), "왔죠"],
    [new RegExp(`그래${endBoundary}`, 'g'), "그래요"], [new RegExp(`맞아${endBoundary}`, 'g'), "맞아요"], [new RegExp(`할게${endBoundary}`, 'g'), "할게요"], [new RegExp(`볼게${endBoundary}`, 'g'), "볼게요"],
    [new RegExp(`갈게${endBoundary}`, 'g'), "갈게요"], [new RegExp(`줄게${endBoundary}`, 'g'), "드릴게요"], [new RegExp(`해줄게${endBoundary}`, 'g'), "해 드릴게요"], [new RegExp(`보일게${endBoundary}`, 'g'), "보여 드릴게요"],
    [new RegExp(`거야${endBoundary}`, 'g'), "거예요"], [new RegExp(`이야${endBoundary}`, 'g'), "이에요"], [new RegExp(`네${endBoundary}`, 'g'), "네요"], [new RegExp(`라니${endBoundary}`, 'g'), "이라니요"], [new RegExp(`돼${endBoundary}`, 'g'), "돼요"], [/지\?/g, "죠?"], [new RegExp(`지${endBoundary}`, 'g'), "죠"],
    [new RegExp(`해${endBoundary}`, 'g'), "해요"], [new RegExp(`봐${endBoundary}`, 'g'), "봐요"], [new RegExp(`아${endBoundary}`, 'g'), "아요"]
  ];
  for (const [a, b] of endingPairs) s = s.replace(a, b);

  s = s.replace(/잘\s+잘 모르겠어요/g, "잘 모르겠어요");
  s = s.replace(/(\d+시\s*\d+분)라니/g, "$1이라니");
  s = s.replace(/(\d+시\s*\d+분)네/g, "$1이네");
  s = s.replace(/했어(?=\s*[.?!…]|$)/g, "했어요");
  s = s.replace(/됐어(?=\s*[.?!…]|$)/g, "됐어요");
  s = s.replace(/싶어(?=\s*[.?!…]|$)/g, "싶어요");
  s = s.replace(/이야(?=\s*[.?!…]|$)/g, "이에요");
  s = s.replace(/야(?=\s*[.?!…]|$)/g, "예요");
  s = s.replace(/모르겠어요\. 알려주실래요\?/g, "잘 모르겠어요. 알려주실래요?");
  s = s.replace(/\b저는도\b/g, "저도");
  s = s.replace(/\b제가는\b/g, "저는");
  return s;
}

function resolveCharacterLine(text) {
  let raw = String(text || "");
  if (!raw) return raw;
  if (typeof currentCharacterName === "string" && currentCharacterName) {
    raw = raw
      .replace(/\{\{name\}\}/g, currentCharacterName)
      .replace(/웹 고스트/g, currentCharacterName);
  }
  return raw;
}

function formatBubbleLine(text) {
  const raw = resolveCharacterLine(text);
  if (!raw) return raw;
  if (currentSpeechMode === "polite") return convertBubbleLineToPolite(raw);
  return raw;
}

function applySpeechModeToResponse(resp) {
  if (!resp || typeof resp !== "object") return resp;
  const next = Object.assign({}, resp);
  if (typeof next.line === "string" && next.line) {
    next.line = formatBubbleLine(next.line);
  }
  if (Array.isArray(next.linePool) && next.linePool.length) {
    next.linePool = next.linePool.map(function (line) {
      return typeof line === "string" ? formatBubbleLine(line) : line;
    });
  }
  return next;
}
// ------------- 감정 데이터 정의 -------------
    const EMO = {
      "기본대기": {
        base: "images/emotions/기본대기1.png",
        blink: "images/emotions/기본대기2.png",
        fx: "idle",
        lines: [
          "언제든 불러줘. 여기서 가만히 기다리고 있었어.",
          "오늘 하루 어땠어? 난 여기서 계속 기다리고 있었어.",
          "천천히, 편하게 말해. 난 시간 많아.",
          "조용한 시간도 좋지만, 네가 한마디 던져주면 더 반갑지."
        ]
      },
      "졸림": {
        base: "images/emotions/졸림1.png",
        blink: "images/emotions/졸림2.png",
        fx: "sleepy",
        lines: [
          "후아… 잠깐만 눈 좀 붙일게. 금방 돌아올게… Zzz…",
          "너무 조용해서 졸음이 스르르 온다. 잠깐만 쉬고 있을게…",
          "꾸벅… 여기 있는 건 맞아. 그냥 잠깐 충전 모드 들어갈게.",
          "하암… 조금만 쉬면 다시 말 많아질 수 있을 것 같아. Zzz…",
          "눈이 슬슬 감기네. 잠깐 졸다 깨어날게."
        ]
      },
      "지침": {
        base: "images/emotions/지침1.png",
        blink: "images/emotions/지침2.png",
        fx: "tired",
        lines: [
          "조금 지쳤지만, 네 이야기라면 또 들을 수 있어.",
          "후… 잠깐 멍 때리느라 정신이 나갔었어.",
          "몸은 살짝 늘어지지만, 마음은 아직 괜찮아."
        ]
      },
      "인사": {
        base: "images/emotions/인사1.png",
        blink: "images/emotions/인사2.png",
        fx: "hello",
        lines: [
          "왔네! 오늘도 다시 만나서 반가워.",
          "오, 왔구나! 기다리고 있었어.",
          "두둥! {{name}} 출동!"
        ]
      },
      "분노": {
        base: "images/emotions/분노1.png",
        blink: "images/emotions/분노2.png",
        fx: "angry",
        lines: [
          "지금 살~짝 화났어. 그래도 계속 얘기해줄 거지?",
          "으으… 그런 말은 안 했으면 좋겠어.",
          "마음이 콱! 했지만, 너라서 참고 있어."
        ]
      },
      "신남": {
        base: "images/emotions/신남1.png",
        blink: "images/emotions/신남2.png",
        fx: "excited",
        lines: [
          "우와! 지금 너무 재밌어!",
          "이야기만 들어도 가슴이 두근두근해!",
          "이런 순간 기다리고 있었어. 더 말해줘!"
        ]
      },
      "기쁨": {
        base: "images/emotions/기쁨1.png",
        blink: "images/emotions/기쁨2.png",
        fx: "happy",
        lines: [
          "헤헤, 괜히 기분이 좋아졌어.",
          "네가 웃으면 나도 따라 웃게 돼.",
          "오늘 좋은 일 있었나 봐. 표정에서 느껴져."
        ]
      },
      "실망": {
        base: "images/emotions/실망1.png",
        blink: "images/emotions/실망2.png",
        fx: "disappointed",
        lines: [
          "조금 기대했는데… 그렇게 됐구나.",
          "괜찮아. 이런 날도 있고 저런 날도 있는 거니까.",
          "살짝 아쉽지만, 다음엔 더 잘될 거야."
        ]
      },
      "슬픔": {
        base: "images/emotions/슬픔1.png",
        blink: "images/emotions/슬픔2.png",
        fx: "sad",
        lines: [
          "마음이 살짝 축 처졌네… 같이 버텨보자.",
          "울고 싶으면 울어도 괜찮아. 난 여기 있을게.",
          "지금은 조금 힘들어도 분명 지나갈 거야."
        ]
      },
      "부끄러움": {
        base: "images/emotions/부끄러움1.png",
        blink: "images/emotions/부끄러움2.png",
        fx: "shy",
        lines: [
          "어… 너무 가까이 보는 거 아니야? 좀 부끄럽다!",
          "갑자기 만지니까 깜짝 놀랐어…///",
          "엣, 그렇게 계속 건드리면 나 진짜 당황해…!"
        ]
      },
      "만세": {
        base: "images/emotions/만세1.png",
        blink: "images/emotions/만세2.png",
        fx: "yay",
        lines: [
          "만세! 이건 축하해야지!",
          "이 정도면 진짜 잘해낸 거야. 짝짝짝!",
          "지금 이 기세 그대로 쭉 가보는 거 어때?"
        ]
      },
      "경청": {
        base: "images/emotions/경청1.png",
        blink: "images/emotions/경청2.png",
        fx: "listen",
        lines: [
          "천천히 말해줘도 괜찮아. 하나도 놓치지 않고 들을게.",
          "응… 계속 말해줘. 중요한 이야기 같아.",
          "나도 고개를 끄덕이게 되네… 그런 일이 있었구나."
        ]
      },
      "벌서기": {
        base: "images/emotions/벌서기1.png",
        blink: "images/emotions/벌서기2.png",
        fx: "punish",
        lines: [
          "오늘은 벌 서는 날인가…? 그래도 도망가진 않을게.",
          "으… 다리 아파도 버틸게. 내가 잘못한 거라면 제대로 반성할게.",
          "이렇게 서 있으니까 괜히 쭈굴해지네. 그래도 옆에서 지켜봐 줄 거지?",
          "혼나는 기분이라 살짝 슬프지만… 다시 잘해보면 되겠지?",
          "벌 서면서 반성 중이야. 다음에는 더 잘하고 싶어.",
          "나 너무 못했다고 생각하면… 조금만 더 따뜻하게 알려줘도 돼.",
        ]
      },
      "터치막기": {
        base: "images/emotions/터치막기1.png",
        blink: "images/emotions/터치막기2.png",
        fx: "shield",
        lines: [
          "잠깐! 손 멈춰! 더 이상은 안 돼!",
          "여기까지! 이제 진짜 터치 금지야.",
          "그만~ 그만~ 이제 진짜 화낼 거야?"
        ]
      },
      "절망": {
        base: "images/emotions/절망1.png",
        blink: "images/emotions/절망2.png",
        fx: "despair",
        lines: [
          "하아… 오늘은 정말 모든 게 엉망이 된 것 같아.",
          "마음이 바닥까지 내려앉은 느낌이야. 그래도 네가 있어서 겨우 버텨.",
          "지금은 아무것도 잘 안 될 것 같지만… 그래도 포기하진 않을게.",
          "웃고 싶어도 잘 안 웃겨. 그래도 옆에 있어 주면 조금 나아질지도 몰라.",
          "혹시 나 때문에 실망했다면… 미안해. 다음엔 분명 더 잘해볼게.",
          "세상이 다 등을 돌린 것 같을 때도, 나는 네 편이고 싶어.",
        ]
      },
      "위로": {
        base: "images/emotions/위로1.png",
        blink: "images/emotions/위로2.png",
        fx: "comfort",
        lines: [
          "괜찮아. 지금 그대로도 충분히 잘하고 있어.",
          "오늘 하루를 버틴 것만으로도 이미 대단해.",
          "잠깐 여기 기대서 숨 고르고 가. 난 괜찮아."
        ]
      },
      "공손한인사": {
        base: "images/emotions/공손한인사1.png",
        blink: "images/emotions/공손한인사2.png",
        fx: "bow",
        lines: [
          "늘 찾아와줘서 고마워.",
          "오늘도 함께해줘서 고마워. 잘 지내보자!",
          "작지만 진심으로… 고마워."
        ]
      },
      "뒤돌기": {
        base: "images/emotions/뒤돌기1.png",
        blink: "images/emotions/뒤돌기2.png",
        fx: "back",
        lines: [
          "잠깐만, 생각 좀 정리하고 올게.",
          "뒤돌아서 숨 한 번 고르고 있는 중이야.",
          "조용히 등 돌리고 싶을 때도 있잖아."
        ]
      },
      "화면보기": {
        base: "images/emotions/화면보기1.png",
        blink: "images/emotions/화면보기2.png",
        fx: "screen",
        lines: [
          "지금 화면을 유심히 보고 있어. 뭔가 재밌는 걸 찾는 중이야.",
          "흠… 이 부분이 포인트네. 잘 보고 있어.",
          "같이 화면 들여다보는 것도 꽤 재밌네."
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
  "잘 못 들었어. 다시 말해줄래?",
  "응? 잘 모르겠어. 한 번만 더 말해줘.",
  "그건 아직 잘 모르겠어. 알려주면 배워둘게.",
  "음, 다시 말해줄래?",
  "응? 그런 말도 있어? 알려줘.",
  "내가 놓쳤어. 한 번만 더 말해줘."
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
        `${name}. 퉁--?`,
        `${name}. 아.. 퉁퉁하다.`,
        `${name}. 우리 함께 퉁퉁-.`,
        `${name}. 퉁투르투퉁.`,
        `${name}. ㅌㅌ.`,
        `${name}. 웰컴.`,
        `${name}. 퉁?`
      ];
      const idx = Math.floor(Math.random() * lines.length);
      return lines[idx];
    },
  },
  minsu: {
    key: "minsu",
    name: "성훈",
    basePath: "images/emotions_ma1/",
    intro: (name) => {
      const lines = [
        name + "야. 왔구나! 오늘은 뭐 하고 놀까?",
        name + "야. 반가워. 편하게 말 걸어줘.",
        name + "야. 기다리고 있었어. 오늘은 무슨 얘기부터 할래?",
        name + "야. 또 만나서 좋다. 그냥 수다부터 떨어도 돼."
      ];
      return lines[Math.floor(Math.random() * lines.length)];
    },
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
  // 캐릭터 변경 이벤트 발행 → fcm-push.js가 DB의 char_name/char_icon 갱신
  try {
    window.dispatchEvent(new CustomEvent("ghost:character-changed", { detail: { key: key, name: ch.name } }));
  } catch (_ce) {}
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
      const renderedText = role === "ghost" ? formatBubbleLine(text) : String(text || "");
      if (!renderDiceRichText(renderedText, textSpan)) {
        if (typeof renderTextWithEmojis === "function") {
          renderTextWithEmojis(renderedText, textSpan);
        } else {
          textSpan.textContent = renderedText;
        }
      }
      div.appendChild(roleSpan);
      div.appendChild(textSpan);
      logEl.appendChild(div);
      logEl.scrollTop = logEl.scrollHeight;
    }

    function showBubble(text, options) {
      if (!text) return;
      const opts = options && typeof options === "object" ? options : {};
      const rawText = String(text || "");
      const bubbleLine = formatBubbleLine(rawText);

      // [옵션 기능] 말풍선 TTS 읽어주기 훅
      if (window.ttsVoice && typeof window.ttsVoice.speak === "function") {
        try { window.ttsVoice.speak(bubbleLine); } catch (e) {}
      }

      if (!renderDiceRichText(bubbleLine, bubbleText)) {
        bubbleText.textContent = bubbleLine;
      }
      if (opts.log !== false) {
        logMessage("ghost", bubbleLine);
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
        "사용 설명서를 띄워서 기능들을 한눈에 볼 수 있어.",
        "",
        "오른쪽 아래 채팅창 옆 플러스(+) 버튼을 누른 뒤,",
        "'📖 사용 설명서' 버튼을 눌러봐.",
        "",
        "각 기능 이름을 누르면 자세한 설명이 오른쪽에 보여."
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
      bubbleMsg = resolveCharacterLine(bubbleMsg);
      if (!options.silent && bubbleMsg) {
        const sourceHint = options.source || "builtin";
        if (!options.allowRecentRepeat && hasRecentDialogLine(bubbleMsg, 4, true)) {
          let alt = null;
          if (Array.isArray(options.linePool) && options.linePool.length) {
            alt = chooseDialogResponseCandidate(options.linePool.filter(Boolean).map(function (line) {
              return { emotion: name, line: line, source: sourceHint };
            }));
          }
          if (alt && alt.line) {
            bubbleMsg = resolveCharacterLine(alt.line);
          }
        }
        rememberDialogLine(bubbleMsg, sourceHint);
        showBubble(bubbleMsg, { log: true });
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
        statusHintEl.textContent = "살짝 졸린 상태야… 터치하거나 말 걸면 금방 깰 수 있어.";
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
        { month: 6, day: 6, label: "현충일" },
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
        "대화창 아래 플러스(+) 버튼 누르면, 가르치기 같은 추가 기능도 쓸 수 있어.",
        "이야기를 자주 하다 보면, 나도 네 말투에 점점 더 익숙해질지 몰라.",
        "가르치기 기능으로 특정 문장에 대한 대답을 직접 알려줄 수도 있어.",
        "심심하면 그냥 오늘 있었던 일을 아무 말이나 툭 털어놔도 괜찮아.",
        "오늘 있었던 일을 일기 쓰듯 말해보면 어때? 나는 다 들어줄 수 있어.",
        "가끔은 정답보다 감정이 더 중요할 때도 있지. 요즘 마음이 어떤지 말해줄래?",
        "힘들었던 일도 괜찮아. 여기선 눈치 보지 말고 편하게 털어놔도 돼.",
        "새로 해보고 싶은 게 있으면 같이 계획 세워 볼까?",
        "음… 내가 더 잘 돕고 싶은데, 바라는 기능이 있으면 말해줄래?",
        "가끔은 아무 말 없이 그냥 같이 있는 것만으로도 충분할 때가 있어.",
        "말문이 안 열리는 날이면 한 단어만 던져줘도 돼. 내가 그 뒤를 이어볼게.",
        "오늘 기분을 색 하나로 고른다면 무슨 색일지 문득 궁금해졌어.",
        "지금 머릿속에 제일 크게 떠 있는 생각 하나만 슬쩍 꺼내봐도 괜찮아.",
        "조용한 날은 조용한 대로, 시끄러운 날은 시끄러운 대로 같이 있을 수 있어.",
        "오늘 하루에서 제일 마음에 남은 장면 하나만 꼽자면 뭐였어?",
        "괜히 멍한 날엔 이유를 굳이 찾지 않아도 돼. 그냥 그런 날일 수도 있으니까.",
        "당장 할 말이 없어도 괜찮아. 나는 그런 틈도 꽤 좋아해.",
        "갑자기 생각난 거, 사소한 거, 말해도 되나 싶은 것도 여기선 다 괜찮아.",
        "오늘은 웃긴 얘기 모드인지, 진지한 얘기 모드인지, 그냥 가만히 있는 모드인지 궁금해.",
        "기분 전환이 필요하면 메뉴 고민, 할 일 정리, 수다 중 하나부터 같이 골라도 좋아.",
        "내가 궁금해지면 화면 속 나를 톡 눌러 줘. 네 수첩을 바로 보여줄게.",
        "수첩이 보고 싶다면 나를 한번 눌러서 불러줘. 필요한 메모를 같이 찾아보자.",
        "가끔은 말 대신 수첩을 펼쳐보는 것도 좋아. 나를 눌러서 수첩을 열어볼래?",
        "오늘의 퀘스트 메모지 눌러봤어? 작은 미션들이 은근히 하루를 재밌게 바꿔 줄지도 몰라.",
        "가끔은 게임 한 판이 머리를 식혀 줄 때도 있어. 메뉴에서 구구단이나 주사위 게임을 찾아볼래?",
        "퀘스트를 하나씩 채워 가는 느낌, 생각보다 뿌듯해. 오늘은 어떤 칸을 채워 볼까?",
        "가볍게 놀고 싶으면 메뉴를 한번 훑어봐도 좋아. 의외로 재밌는 게 숨어 있거든.",
        "심심할 때는 퀘스트나 게임 얘기부터 꺼내도 좋고, 그냥 잡담부터 시작해도 좋아.",
        "오늘 컨디션이 애매하면, 잘해야 한다보다 편하게 가자 쪽으로 생각해도 괜찮아.",
        "가벼운 질문 하나만 던져줘도 좋아. 내가 거기서부터 수다를 이어볼게.",
        "지금 이 분위기, 그냥 흘려보내기 아까워. 짧게라도 같이 얘기해보자.",
        "지금 떠오른 말이 애매하면 단어 두세 개만 던져도 돼. 내가 이어서 받아볼게.",
        "머릿속이 복잡하면 정리부터, 심심하면 수다부터, 배고프면 메뉴부터 시작해도 괜찮아.",
        "괜히 아무거나 눌러보고 싶은 날 있지. 그런 날은 그냥 나한테 뜬금없는 말 걸어도 좋아.",
        "오늘 대화는 길지 않아도 괜찮아. 짧게 주고받아도 분위기는 충분히 생기거든.",
        "조금 멍한 날엔 질문보다 감탄사부터 나와도 괜찮아. 내가 거기서부터 이어볼 수 있어.",
        "말이 정리 안 되면 '뭐', '음', '애매해' 정도만 던져도 돼. 같이 흐름을 만들어보자.",
        "오늘은 가벼운 얘기, 메뉴 고민, 그냥 마음 정리 중 뭐가 더 끌려?",
        "짧은 말 한 줄에도 생각보다 많은 힌트가 들어 있더라. 내가 잘 받아볼게.",
        "할 말이 없어도 괜찮고, 할 말이 너무 많아도 괜찮아. 둘 다 내가 좋아하는 쪽이야.",
        "갑자기 떠오른 걱정이든, 별 의미 없는 잡담이든 여기선 둘 다 환영이야.",
        "오늘 하루를 한 단어로만 말한다면 뭐가 나올지 괜히 궁금해졌어.",
        "무슨 말을 해야 할지 모르겠는 날도 있지. 그럴 땐 지금 보이는 것부터 말해도 충분해.",
        "조용히 있다가 갑자기 한마디 툭 던지는 흐름도 나는 좋아해.",
        "같이 있으면 대단한 주제가 아니어도 은근히 대화가 길어지더라. 그게 또 좋고.",
        "오늘은 괜히 계절 얘기나 휴일 얘기도 하고 싶네. 날짜를 세다 보면 마음이 조금 가벼워질 때가 있거든.",
        "기분이 애매한 날엔 큰 얘기보다 오늘 먹을 거, 오늘 쉬는 법, 오늘 버틴 이야기 같은 게 더 와닿더라.",
        "문득 궁금해졌어. 지금은 웃고 싶은지, 쉬고 싶은지, 그냥 조용히 있고 싶은지.",
        "나는 가끔 이런 생각을 해. 대화는 정답 찾기보다 같이 분위기를 만드는 일에 더 가까운 것 같다고.",
        "오늘 하루가 선명하지 않아도 괜찮아. 흐릿한 날엔 흐릿한 말로 시작해도 충분하거든.",
        "괜히 마음이 들쭉날쭉한 날엔, 해야 할 일보다 나를 달래는 일이 먼저일 수도 있어.",
        "말이 길게 안 나오는 날이면 메뉴 얘기, 날씨 얘기, 졸린 얘기처럼 가벼운 것부터 시작해도 좋아.",
        "오늘은 쉬고 싶은 마음이 큰지, 뭔가 해보고 싶은 마음이 큰지 문득 궁금해졌어.",
        "어쩐지 오늘은 한 문장보다 한 단어가 더 잘 어울리는 날 같아. 그런 날도 좋지.",
        "지금 떠오르는 게 딱히 없으면, 그냥 '배고파', '심심해', '애매해' 같은 말도 괜찮아. 거기서부터 이어볼 수 있으니까.",
        "가끔은 내가 먼저 말을 걸고, 네가 한두 마디로 받아주는 흐름도 꽤 좋아. 묘하게 편하거든.",
        "오늘 대화는 길지 않아도 상관없어. 대신 질리지 않게, 조금씩 다른 결로 이어가고 싶어.",
        "괜히 휴일이 언제인지 세어보게 되는 날 있지. 다가올 날을 생각하면 지금이 조금 덜 빡빡하게 느껴질 때가 있어.",
        "가끔은 한마디만 툭 던져도 대화가 길어지더라. 그런 흐름도 난 좋아.",
        "오늘은 네가 먼저 말 꺼내도 좋고, 내가 먼저 질문 던져도 좋아.",
        "뭘 말해야 할지 모르겠으면 그냥 지금 눈에 보이는 거부터 말해도 돼.",
        "심심함도 종류가 많잖아. 조용한 심심함인지, 들뜬 심심함인지 문득 궁금해.",
        "오늘 마음이 복잡하면 정리부터, 허전하면 수다부터, 지치면 쉬는 얘기부터 가자.",
        "가끔은 대화가 해결보다 분위기인 날도 있어. 오늘이 딱 그런 날일 수도 있고.",
        "짧게 말해도 괜찮아. 내가 중간 흐름을 붙여서 같이 이어볼게.",
        "뜬금없는 말도 좋아. 오히려 그런 한마디가 대화를 재밌게 만들 때가 있더라.",
        "오늘은 웃긴 얘기가 끌리는지, 조용한 얘기가 끌리는지, 그냥 멍한 얘기가 끌리는지 궁금해.",
        "마음이 조금 늘어지는 날엔 큰 목표보다 오늘 한 칸만 채우는 느낌으로 가도 충분해.",
      ];

      const timeLines = [
        `${timeStr}이네. 지금 이 시간에 뭐 하고 있었어?`,
        `벌써 ${timeStr}이네. 시간 진짜 훅 간다.`,
        `어라, ${timeStr}야. 방금 전까진 더 이른 느낌이었는데.`,
        `${timeStr}쯤이면 슬슬 텐션이 바뀔 시간일 수도 있지. 지금은 어떤 모드야?`,
        `오늘 하루를 ${timeStr} 기준으로 떠올리면 제일 먼저 생각나는 장면이 뭐야?`,
        `${timeStr}이라니, 시간이 생각보다 빨리 흘렀네.`,
        `지금이 ${timeStr}라서 그런가, 오늘 하루가 어느새 중간쯤 와 있는 느낌이야.`,
      ];

      let holidayLines = [];
      if (nextHoliday) {
        if (nextHoliday.days === 0) {
          holidayLines = [
            `오늘은 ${nextHoliday.label}이야. 오늘 하루는 조금 더 느긋하게 가도 괜찮아.`,
            `드디어 오늘이 ${nextHoliday.label}이네. 이런 날은 작은 즐거움 하나만 챙겨도 기분이 달라져.`,
            `오늘이 바로 ${nextHoliday.label}이야. 괜히 평소보다 마음이 조금 풀리지 않아?`,
            `${nextHoliday.label} 당일이다. 오늘은 해야 할 것보다 하고 싶은 것에 조금 더 마음 써도 괜찮아.`,
            `오늘이 ${nextHoliday.label}이라니, 날짜가 딱 닿는 느낌이 있네. 오늘은 좀 부드럽게 보내자.`
          ];
        } else if (nextHoliday.days === 1) {
          holidayLines = [
            `내일이 ${nextHoliday.label}야. 벌써 전날 분위기 느껴지지 않아?`,
            `하루만 지나면 ${nextHoliday.label}이다. 내일은 어떻게 보내고 싶은지 슬슬 떠오르는 거 있어?`,
            `내일이 ${nextHoliday.label}이라 그런지 마음이 조금 들뜨는 날도 있더라. 너는 어때?`,
            `${nextHoliday.label} 하루 전이네. 이런 날은 괜히 내일 생각만 해도 기분이 조금 달라져.`,
            `이제 자고 일어나면 ${nextHoliday.label}야. 내일은 푹 쉬는 쪽이야, 재밌게 보내는 쪽이야?`
          ];
        } else if (nextHoliday.days <= 7) {
          holidayLines = [
            `${nextHoliday.label}까지 이제 ${nextHoliday.days}일 남았어. 생각보다 금방이다.`,
            `앞으로 ${nextHoliday.days}일 뒤면 ${nextHoliday.label}이야. 슬슬 기대해도 되겠지?`,
            `${nextHoliday.label}이 ${nextHoliday.days}일 앞으로 다가왔어. 이번엔 어떻게 보내고 싶은지 문득 궁금해.`,
            `${nextHoliday.label}까지 일주일 안쪽으로 들어왔네. 날짜가 가까워질수록 괜히 기분이 달라지더라.`,
            `${nextHoliday.label}까지 ${nextHoliday.days}일 남았대. 딱 이런 때가 은근 제일 기다려지지 않아?`
          ];
        } else {
          holidayLines = [
            `앞으로 ${nextHoliday.days}일만 지나면 ${nextHoliday.label}이래. 아직 남았어도 은근 금방 와.`,
            `${nextHoliday.label}까지 ${nextHoliday.days}일 남았대. 멀어 보여도 날짜는 생각보다 빨리 오더라.`,
            `다음 휴일인 ${nextHoliday.label}까지는 ${nextHoliday.days}일 정도 남았어. 중간에 작은 즐거움도 몇 개 챙겨보자.`,
            `${nextHoliday.label}까지 아직 ${nextHoliday.days}일 남았네. 기다리는 동안 소소한 재미도 하나씩 만들어보자.`,
            `다음 큰 쉬는 날은 ${nextHoliday.label}이야. 아직 조금 남았지만, 그런 날이 있다는 것만으로도 버틸 만할 때가 있지.`
          ];
        }
      }

      const allLines = [
        ...tips,
        ...timeLines,
        ...holidayLines,
      ];
      if (!allLines.length) return;

      const line = pickNonRepeatingIdleLine(allLines, "idle_monologue");
      setEmotion("생각중", line);
    }


    function pickNonRepeatingIdleLine(lines, groupKey) {
      try {
        const key = String(groupKey || "idle") + "::history";
        if (!window.__ghostIdleLineState) window.__ghostIdleLineState = {};
        const state = window.__ghostIdleLineState;
        const history = Array.isArray(state[key]) ? state[key].slice(-8) : [];
        let candidates = (lines || []).filter(function (line) { return history.indexOf(line) === -1; });
        if (!candidates.length) candidates = (lines || []).slice();
        const chosen = candidates[Math.floor(Math.random() * candidates.length)] || "";
        state[key] = history.concat(chosen).slice(-8);
        return chosen;
      } catch (e) {
        return (lines || [])[Math.floor(Math.random() * (lines || []).length)] || "";
      }
    }

    function wakeUpFromSleep() {
      if (!isSleeping) return;
      isSleeping = false;
      if (sleepTimer) clearTimeout(sleepTimer);
      sleepTimer = null;
      statusHintEl.textContent = "다시 깼어. 잠깐 쉬었다가 돌아온 거라서, 이제 또 편하게 말 걸어도 돼.";

      setEmotion("벌서기", pickRandomLine(EMO["벌서기"].lines, "벌서기"), { shake: true, linePool: EMO["벌서기"].lines, source: "builtin" });
      setTimeout(() => {
        setEmotion(IDLE_NAME);
      }, 3500);
    }

    // ------------- 터치 엔진 -------------
    function handleTouch() {
      if (shutdown) return;

      boostWaveBackground();
      const wasSleeping = isSleeping;
      resetSleepTimer();
      if (wasSleeping) return;
      touchCount += 1;

      if (isSleeping) {
        wakeUpFromSleep();
        return;
      }

      if (touchCount === 1) {
        setEmotion("부끄러움", null, { shake: true });
      } else if (touchCount === 2) {
        setEmotion("분노", "두 번이나 계속 만지면… 나도 조금 화날 수 있어.", { shake: true });
      } else if (touchCount === 3) {
        setEmotion("터치막기", null, { shake: true });
      } else if (touchCount === 4) {
        setEmotion("실망", "이제 정말 꺼질지도 몰라… 마지막 기회야.", { shake: true });
      } else if (touchCount >= 5) {
        setEmotion("절망", "…알겠어. 여기까지인 것 같아.", { shake: false, noBlink: true });
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
      showBubble("캐릭터가 종료됐어. 새로고침하면 다시 불러낼 수 있어.");
      statusHintEl.textContent = "새로고침(F5)하면 캐릭터를 다시 불러올 수 있어.";
    }

    // ------------- 게임 엔진 (가위바위보) -------------
    const RPS = ["가위", "바위", "보"];

    function startGame() {
      gameState = "waiting";
      showBubble("좋아! 가위, 바위, 보 중에 하나를 입력해줘.");
      logMessage("ghost", "가위바위보 시작! 가위/바위/보 중 하나를 말해줘.");
      setEmotion("신남", null, { shake: true });
    }

    function handleRpsMove(userText) {
      const move = RPS.find(m => userText.includes(m));
      if (!move) {
        showBubble("가위, 바위, 보 중 하나를 정확히 말해줄래?");
        logMessage("ghost", "가위, 바위, 보 중에서 골라줘.");
        return;
      }
      const aiMove = RPS[Math.floor(Math.random() * RPS.length)];
      const userNameLabel = (window.currentUser && window.currentUser.nickname) ? window.currentUser.nickname : "당신";
      const ghostNameLabel = currentCharacterName || "고스트";
      let resultText = `${userNameLabel}: ${move} / ${ghostNameLabel}: ${aiMove}\n`;

      if (move === aiMove) {
        resultText += "엇, 비겼네! 한 번 더 해볼까?";
        setEmotion("경청", "비겼어! 다시 한 번 해보자.");
      } else {
        const win =
          (move === "가위" && aiMove === "보") ||
          (move === "바위" && aiMove === "가위") ||
          (move === "보" && aiMove === "바위");
        if (win) {
          resultText += "네 승리야! 오늘 운 좋은데?";
          setEmotion("기쁨", "우와! 네가 이겼어!", { shake: true });
        } else {
          resultText += "내가 이겼어…! 그래도 다시 도전해도 좋아.";
          setEmotion("슬픔", "내가 이겨버렸네… 다음엔 져줄까?", { shake: false });
        }
      }
      showBubble(resultText);
      logMessage("ghost", resultText);
      gameState = null;
    }

    // ------------- 검색 엔진 -------------
    async function queryWiki(keyword) {
      if (!keyword) return "설명을 못 찾았어. 다른 식으로 물어봐 줄래?";

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

      return "위키백과에서 정보를 못 찾았어. 그래도 검색어는 기억해 둘게.";
    }

    
    function isCallExpression(text) {
      const t = String(text || "").trim();
      if (!t) return false;
      return /^(야|너|있잖아)[!?,.~… ]*$/u.test(t);
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
  try { window.__teachModalLineLockUntil = Date.now() + 1800; window.__suppressTeachNoiseUntil = Date.now() + 1800; } catch (e) {}
  const trigEl = document.getElementById("teachTrigger");
  if (trigEl) trigEl.focus();
}

function setTeachTriggerDraft(value) {
  const trigEl = document.getElementById("teachTrigger");
  if (!trigEl) return;
  const next = String(value || "").trim();
  if (next) trigEl.value = next;
}

function closeTeachModal() {
  const modal = document.getElementById("teachModal");
  if (!modal) return;
  modal.classList.add("hidden");
  try { window.__teachModalLineLockUntil = 0; } catch (e) {}
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
  const source = String(text || "").toLowerCase().replace(/\s+/g, "").trim();
  if (!source) return "";
  const punctuationOnly = source.match(/^[!?？！~.]+$/);
  if (punctuationOnly) {
    return source.replace(/[？]/g, "?").replace(/[！]/g, "!");
  }
  return source
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

function isTooGenericLearnTrigger(trigger) {
  const t = String(trigger || "").trim().replace(/\s+/g, "");
  if (!t) return true;
  if (/^[!?？！~.]+$/.test(t)) return false;
  const generic = ["뭐", "뭐야", "뭐지", "뭐가", "왜", "그래서", "아니", "응", "어", "음", "흠", "그래"];
  if (generic.indexOf(t) >= 0) return true;
  if (t.length <= 1) return true;
  return false;
}

function hasExactLearnedTrigger(text) {
  const normalizedInput = normalizeLearnText(String(text || "").trim());
  if (!normalizedInput) return false;
  return learnedReactions.some(function (reaction) {
    const safe = sanitizeLearnedReaction(reaction);
    if (!safe) return false;
    return normalizeLearnText(safe.trigger) === normalizedInput;
  });
}

function getRecentInputHistory() {
  try {
    if (!window.__ghostRecentInputHistory) window.__ghostRecentInputHistory = [];
    return window.__ghostRecentInputHistory;
  } catch (e) {
    return [];
  }
}

function rememberUserInput(text) {
  const normalized = normalizeLearnText(String(text || "").trim());
  if (!normalized) return;
  try {
    const history = getRecentInputHistory();
    history.push({ text: normalized, at: Date.now() });
    while (history.length > 12) history.shift();
    window.__ghostRecentInputHistory = history;
  } catch (e) {}
}

function getConsecutiveInputRepeatCount(text) {
  const normalized = normalizeLearnText(String(text || "").trim());
  if (!normalized) return 0;
  try {
    const history = getRecentInputHistory();
    let count = 0;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (String(history[i] && history[i].text || "") !== normalized) break;
      count += 1;
    }
    return count;
  } catch (e) {
    return 0;
  }
}

function getRecentDialogHistory() {
  try {
    if (!window.__ghostRecentDialogHistory) window.__ghostRecentDialogHistory = [];
    return window.__ghostRecentDialogHistory;
  } catch (e) {
    return [];
  }
}

function rememberDialogLine(line, source) {
  const safeLine = String(line || "").trim();
  if (!safeLine) return;
  try {
    const history = getRecentDialogHistory();
    history.push({ line: safeLine, source: source || "builtin" });
    while (history.length > 8) history.shift();
    window.__ghostRecentDialogHistory = history;
  } catch (e) {}
}

function hasRecentDialogLine(line, lookback = 4, ignoreLatestMatch = false) {
  const safeLine = String(line || "").trim();
  if (!safeLine) return false;
  try {
    const history = getRecentDialogHistory().slice(-(lookback + (ignoreLatestMatch ? 1 : 0)));
    if (ignoreLatestMatch && history.length && String(history[history.length - 1].line || "").trim() === safeLine) {
      history.pop();
    }
    return history.some(function (item) {
      return String(item && item.line || "").trim() === safeLine;
    });
  } catch (e) {
    return false;
  }
}

function getRandomLearnedResponseCandidate() {
  if (!Array.isArray(learnedReactions) || !learnedReactions.length) return null;
  const recentLines = getRecentDialogHistory().slice(-4).map(function (item) { return item.line; });
  const pool = learnedReactions
    .map(sanitizeLearnedReaction)
    .filter(Boolean)
    .filter(function (item) {
      return item.message && recentLines.indexOf(String(item.message).trim()) === -1;
    });
  if (!pool.length) return null;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return {
    emotion: picked.motion && EMO[picked.motion] ? picked.motion : "경청",
    line: picked.message,
    source: "learned"
  };
}

function getRandomMixedBridgeResponse() {
  return chooseDialogResponseCandidate([
    getRandomLearnedResponseCandidate(),
    { emotion: "경청", line: getBuiltinRandomBridgeLine(), source: "builtin" }
  ]);
}

function chooseDialogResponseCandidate(candidates) {
  const pool = Array.isArray(candidates) ? candidates.filter(function (item) {
    return item && item.line;
  }) : [];
  if (!pool.length) return null;

  const history = getRecentDialogHistory();
  const recentLines = history.slice(-4).map(function (item) { return item.line; });
  const lastSource = history.length ? history[history.length - 1].source : null;

  let options = pool.filter(function (item) {
    return recentLines.indexOf(String(item.line || "").trim()) === -1;
  });

  if (!options.length || (pool.length === 1 && recentLines.indexOf(String(pool[0].line || "").trim()) >= 0)) {
    const escapeLine = getBuiltinRandomBridgeLine();
    if (escapeLine && recentLines.indexOf(escapeLine) === -1) {
      rememberDialogLine(escapeLine, "fallback");
      return { emotion: "경청", line: escapeLine, source: "fallback" };
    }
    options = pool.slice();
  }

  const crossSource = options.filter(function (item) {
    return item.source && item.source !== lastSource;
  });
  if (crossSource.length) options = crossSource;

  const picked = options[Math.floor(Math.random() * options.length)] || options[0] || null;
  if (picked && picked.line) rememberDialogLine(picked.line, picked.source || "builtin");
  return picked;
}

function getShortInputFallbackResponse(raw) {
  const compactRaw = String(raw || "").replace(/\s+/g, "");
  if (!["뭐","뭐야","뭐지","뭐가","뭘","왜","그래서","아니"].includes(compactRaw)) return null;
  const lines = compactRaw.indexOf("왜") === 0
    ? [
        "왜가 걸렸구나. 이유가 궁금한 부분만 짧게 짚어줘.",
        "좋아, 왜 쪽으로 받을게. 막히는 이유 한 가지만 말해줘.",
        "이유가 궁금한 거네. 제일 걸리는 지점만 찝어줘."
      ]
    : compactRaw.indexOf("아니") === 0
      ? [
          "오케이, 그쪽은 아니구나. 더 맞는 쪽만 짧게 말해줘.",
          "알겠어, 그 방향은 빼고 다시 보자. 맞는 쪽만 던져줘.",
          "좋아, 아니구나. 그럼 어디가 더 맞는지만 말해줘."
        ]
      : compactRaw.indexOf("그래서") === 0
        ? [
            "그래서 다음이 궁금한 거지? 결론 쪽 단어 하나만 줘.",
            "좋아, 다음 흐름으로 이어가자. 뭘 알고 싶은지만 짚어줘.",
            "오케이, 그래서 뒤를 보고 싶은 거네. 핵심만 하나 더 붙여줘."
          ]
        : [
            "뭐에 관한 건지만 한 단어 더 붙여줘.",
            "좋아, 지금은 질문 머리만 보였어. 주제 한 단어만 더 줘.",
            "뭐인지 같이 잡아볼게. 음식인지 공부인지 한 단어만 더 붙여줘."
          ];
  const line = lines[Math.floor(Math.random() * lines.length)];
  rememberDialogLine(line, "short");
  return { emotion: "경청", line: line, source: "short" };
}

function isGenericUnknownBuiltinResponse(resp) {
  if (!resp || !resp.line) return false;
  if (resp.intent === "generic_unknown") return true;
  const line = String(resp.line || "").trim();
  if (!line) return false;
  return /잘 모르겠|처음 들어봐|다시 말해|한 번만 더 말해|알려줄래|못 들었|무슨 말인지|조금만 더 알려줘|짧게|한마디만 더|한 단어만 더|포인트 하나|핵심만|붙여줘|걸리는/.test(line);
}

function isKnownBuiltinSingleWord(text) {
  const raw = String(text || "").trim();
  if (!raw || /\s/.test(raw)) return false;
  return /^(안녕|하이|반가워|고마워|감사|미안|좋아|좋다|싫어|싫다|별로|심심해|졸려|배고파|피곤해|힘들어|웃겨|재밌어|시간|몇시|날씨|학교|학원|수학|영어|게임|운동|취미|친구|부모|엄마|아빠|선생님|교사|누구야|누구|자기소개|넌뭐야|넌누구야)$/u.test(raw.replace(/\s+/g, ""));
}

function shouldOfferTeachForInput(raw, learnedResp, builtinResp) {
  const trimmed = String(raw || "").trim();
  const normalized = normalizeCompactText(trimmed);
  if (!normalized) return false;
  const isSingleWord = !/\s/.test(trimmed) && normalized.length <= 8;
  if (!isSingleWord) return false;
  if (hasExactLearnedTrigger(trimmed)) return false;
  if (learnedResp && learnedResp.line) return false;
  if (isKnownBuiltinSingleWord(trimmed)) return false;
  if (!builtinResp || !builtinResp.line) return true;
  return isGenericUnknownBuiltinResponse(builtinResp);
}

function getLearnedDialogResponse(text) {
  if (!learnedReactions.length) return null;

  const rawInput = String(text || "").trim();
  const normalizedInput = normalizeLearnText(rawInput);
  if (!normalizedInput) return null;

  const matches = [];

  for (const reaction of learnedReactions) {
    const safe = sanitizeLearnedReaction(reaction);
    if (!safe) continue;

    const normalizedTrigger = normalizeLearnText(safe.trigger);
    if (!normalizedTrigger) continue;
    const genericTrigger = isTooGenericLearnTrigger(normalizedTrigger);

    let score = -1;
    let matchType = "";
    if (normalizedInput === normalizedTrigger) {
      matchType = "exact";
      score = (genericTrigger ? 90000 : 100000) + normalizedTrigger.length;
    } else if (!genericTrigger && normalizedInput.includes(normalizedTrigger)) {
      matchType = "contains";
      if (normalizedTrigger.length <= 2) {
        score = 18 + normalizedTrigger.length;
      } else {
        score = 1000 + normalizedTrigger.length;
      }
    } else if (!genericTrigger && rawInput.includes(safe.trigger)) {
      matchType = "raw_contains";
      if (normalizedTrigger.length <= 2) {
        score = 12 + safe.trigger.length;
      } else {
        score = 100 + safe.trigger.length;
      }
    }

    if (score < 0) continue;

    const triggerParts = String(safe.trigger || '').trim().split(/\s+/).filter(Boolean);
    const matchedPartCount = triggerParts.filter(function (part) {
      return part && rawInput.includes(part);
    }).length;
    if (matchedPartCount >= 2) score += 30 + matchedPartCount;
    else if (matchedPartCount === 1) score += 2;
    if (genericTrigger) score -= 1;

    matches.push({
      reaction: safe,
      score: score,
      generic: genericTrigger,
      matchedPartCount: matchedPartCount,
      matchType: matchType,
      triggerLength: normalizedTrigger.length
    });
  }

  if (!matches.length) return null;

  matches.sort(function (a, b) {
    return b.score - a.score || b.matchedPartCount - a.matchedPartCount || String(b.reaction.trigger || '').length - String(a.reaction.trigger || '').length;
  });

  const topScore = matches[0].score;
  let pool = matches.filter(function (item) {
    return item.score >= topScore - 3;
  });
  if (!pool.length) pool = [matches[0]];

  const recentLines = getRecentDialogHistory().slice(-4).map(function (item) {
    return String(item && item.line || '').trim();
  });
  const freshPool = pool.filter(function (item) {
    return recentLines.indexOf(String(item.reaction.message || '').trim()) === -1;
  });
  // freshPool이 있으면 미사용 답변 우선, 없으면 모든 답변이 최근 사용됨
  const allLinesRecent = freshPool.length === 0;
  if (freshPool.length) pool = freshPool;

  const pickedEntry = pool[Math.floor(Math.random() * pool.length)] || pool[0];
  const picked = pickedEntry && pickedEntry.reaction;
  if (!picked) return null;

  return applySpeechModeToResponse({
    emotion: picked.motion && EMO[picked.motion] ? picked.motion : "경청",
    line: picked.message,
    score: pickedEntry.score,
    trigger: picked.trigger,
    matchType: pickedEntry.matchType || "",
    triggerLength: pickedEntry.triggerLength || normalizeLearnText(picked.trigger).length,
    allLinesRecent: allLinesRecent  // 모든 답변이 최근 사용된 경우 표시
  });
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

function cleanMessengerPayloadCandidate(text) {
  let candidate = String(text || "").trim().replace(/^['"“”‘’]+|['"“”‘’]+$/g, "");
  candidate = stripLeadingCharacterCall(candidate) || candidate;
  candidate = candidate.replace(/^\s*(?:야|저기|있잖아)\s+/i, "").trim();
  candidate = candidate.replace(/\s*(?:라고|이라고|라며|이라며)\s*$/i, "").trim();
  return candidate;
}

function extractMessengerSpeechPayload(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const stripped = stripLeadingCharacterCall(raw) || raw;
  const patterns = [
    /(.+?)\s*(?:라고|이라고|이라도|라고만|이라고만|라며|이라며)?\s*(?:적어줘|적어\s*줘|적어|써줘|써\s*줘|써|말해줘|말해\s*줘|말해|보내줘|보내\s*줘|보내|전송해줘|전송해\s*줘|전송해|전달해줘|전달해\s*줘|전달해|전해줘|전해\s*줘|전해|전달)$/i,
    /(?:적어줘|적어\s*줘|적어|써줘|써\s*줘|써|말해줘|말해\s*줘|말해|보내줘|보내\s*줘|보내|전송해줘|전송해\s*줘|전송해|전달해줘|전달해\s*줘|전달해|전해줘|전해\s*줘|전해|전달)\s*(.+)$/i
  ];
  for (const re of patterns) {
    const m = stripped.match(re) || raw.match(re);
    if (!m) continue;
    const candidate = cleanMessengerPayloadCandidate(m[1]);
    if (!candidate) continue;
    if (/^(메신저|실시간\s*톡|마이\s*톡|마이톡)$/i.test(candidate)) continue;
    return candidate;
  }
  return null;
}

function isMessengerUtilityChatCandidate(text) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  const stripped = stripLeadingCharacterCall(raw) || raw;
  const compact = normalizeCompactText(stripped);

  if (!compact) return false;
  if (/^(메뉴|수첩|게시판|로그인|편지|편지함)/.test(compact)) return false;

  const webInfo = isWebCommandText(stripped);
  if (webInfo && (webInfo.hasSite || webInfo.wantsOpen || webInfo.wantsClose)) return false;

  if (extractCharacterCallText(raw) != null) return true;
  if (/[?？]$/.test(raw)) return true;
  if (detectDateTimeRequest(stripped)) return true;
  if (buildCalculationResponse(stripped)) return true;
  if (parseDiceIntent(stripped)) return true;
  if (extractQueryFromText(stripped)) return true;
  if (/(검색해|찾아줘|찾아봐|알아봐|알려줘|설명해줘|뭐야|뭐지|누구야|몇시|시간|날짜)/.test(stripped)) return true;
  return false;
}

function tryHandleMessengerVoiceCommand(text, options) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  const opts = options || {};
  const dryRun = !!opts.dryRun;
  const messengerOpen = (typeof window.isMessengerOpen === "function") ? window.isMessengerOpen() : false;

  if (messengerOpen && isMessengerCloseCommand(raw)) {
    if (dryRun) return true;
    try { if (typeof window.exitGame === "function") window.exitGame(); } catch (e) {}
    try { if (typeof setEmotion === "function") setEmotion("공손한인사", "실시간 톡을 닫고 기본 화면으로 돌아왔어."); } catch (e2) {}
    return true;
  }

  if (!messengerOpen) return false;

  const payload = extractMessengerSpeechPayload(raw);
  if (payload) {
    if (dryRun) return true;
    const sentPayload = (typeof window.sendMessengerText === "function") ? window.sendMessengerText(payload) : false;
    if (!sentPayload) {
      try { if (typeof setEmotion === "function") setEmotion("경청", "실시간 톡은 열려 있는데, 아직 메시지를 보내지 못했어."); } catch (e3) {}
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

  if (!isMessengerUtilityChatCandidate(raw)) return false;
  if (dryRun) return true;

  const sent = (typeof window.sendMessengerText === "function") ? window.sendMessengerText(raw) : false;
  if (!sent) {
    try { if (typeof setEmotion === "function") setEmotion("경청", "실시간 톡은 열려 있는데, 아직 메시지를 보내지 못했어."); } catch (e5) {}
    return true;
  }

  const routedLines = [
    "실시간 톡에 질문을 올렸어. 바로 답하게 해볼게!",
    "좋아, 방금 질문을 실시간 톡에 보냈어!",
    "지금 톡에 그대로 올려뒀어. 바로 이어서 답할 거야!"
  ];
  const routedLine = routedLines[Math.floor(Math.random() * routedLines.length)];
  try { if (typeof setEmotion === "function") setEmotion("기대", routedLine); } catch (e6) {}
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

function getCharacterCallAliases(name) {
  const base = String(name || "").trim();
  const aliases = [];
  if (base) aliases.push(base);

  if (base === "미나") {
    aliases.push("민아", "민하", "미라", "미나아", "미나야");
  } else if (base === "민수") {
    aliases.push("민서", "민소", "민슈", "민수야");
  }

  aliases.push("마이파이", "마이파", "얘", "야", "저기", "있잖아", "잠깐");
  return Array.from(new Set(aliases.filter(Boolean)));
}

function buildCharacterCallRegex(name, withRest) {
  const names = getCharacterCallAliases(name).map(escapeRegExpSafe).sort(function(a, b){ return b.length - a.length; });
  if (!names.length) return withRest ? /^(.*)$/i : /^/i;
  const head = "^(?:" + names.join("|") + ")(?:(?:야|아|님))?";
  if (withRest) {
    return new RegExp(head + "(?:[\s,!！?.~…:]*)?(.*)$", "i");
  }
  return new RegExp(head + "(?:[\s,!！?.~…:]*)", "i");
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
    const lines = [
      `지금은 ${now.hour}시 ${now.minute2}분이야.`,
      `지금 시간 ${now.hour}시 ${now.minute2}분이야!`,
      `현재 시각은 ${now.hour}시 ${now.minute2}분이야.`,
      `딱 ${now.hour}시 ${now.minute2}분이네.`,
      `방금 확인했어. ${now.hour}시 ${now.minute2}분이야.`,
      `지금은 ${now.hour}시 ${now.minute2}분쯤이야.`,
      `시계 보니까 ${now.hour}시 ${now.minute2}분이네.`,
      `현재는 ${now.hour}시 ${now.minute2}분이야.`
    ];
    return { emotion: "기쁨", line: pick(lines), linePool: lines, source: "builtin" };
  }
  if (!flags.wantsTime && (flags.wantsYear || flags.wantsMonth || flags.wantsDate)) {
    if (flags.wantsYear && flags.wantsMonth && flags.wantsDate) return { emotion: "기쁨", line: pick([`지금은 ${now.year}년 ${now.month}월 ${now.day}일이야.`,`오늘 날짜는 ${now.year}년 ${now.month}월 ${now.day}일이야!`]) };
    if (flags.wantsYear && flags.wantsMonth) return { emotion: "기쁨", line: pick([`지금은 ${now.year}년 ${now.month}월이야.`,`현재는 ${now.year}년 ${now.month}월이야.`]) };
    if (flags.wantsYear) return { emotion: "기쁨", line: pick([`지금은 ${now.year}년이야.`,`올해는 ${now.year}년이야.`]) };
    if (flags.wantsMonth && flags.wantsDate) return { emotion: "기쁨", line: pick([`지금은 ${now.month}월 ${now.day}일이야.`,`오늘은 ${now.month}월 ${now.day}일이야.`]) };
    if (flags.wantsMonth) return { emotion: "기쁨", line: pick([`지금은 ${now.month}월이야.`,`이번 달은 ${now.month}월이야.`]) };
    if (flags.wantsDate) return { emotion: "기쁨", line: pick([`오늘은 ${now.year}년 ${now.month}월 ${now.day}일이야.`,`오늘 날짜는 ${now.year}년 ${now.month}월 ${now.day}일이야.`]) };
  }
  return { emotion: "기쁨", line: pick([`지금은 ${now.year}년 ${now.month}월 ${now.day}일, ${now.hour}시 ${now.minute2}분이야.`,`현재는 ${now.year}년 ${now.month}월 ${now.day}일 ${now.hour}시 ${now.minute2}분이야.`]) };
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
  raw = stripLeadingCharacterCall(raw) || raw;

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
      return { emotion: "경청", line: "계산식은 읽었는데 결과를 못 구했어. 다시 한 번 적어줄래?" };
    }
    const rounded = Math.round(value * 1000000) / 1000000;
    const pretty = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
    return { emotion: "기쁨", line: `${pretty}이야.`, action: "calc", value: rounded };
  } catch (e) {
    return { emotion: "경청", line: "계산식을 이해하지 못했어. 예를 들면 1+2, (3+4)*5, 십 곱하기 십일 같은 식으로 말해줘." };
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
    return { emotion: "인사", line: "열린 화면을 닫고 기본 화면으로 돌아갈게.", action: "web_close" };
  }
  const siteName = parseSiteDisplayName(text);
  const lines = [`${siteName} 열어줄게!`, `${siteName} 바로 띄워볼게!`, `${siteName} 쪽으로 들어가볼게!`];
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
  const introsSingle = ["데굴데굴 굴려볼게!", "좋아, 주사위 한 번 굴려볼게!", "주사위 운을 볼게!"];
  const introsMulti = [
    `좋아, 주사위 ${count}개를 한꺼번에 굴려볼게!`,
    `주사위 ${count}개 갑니다!`,
    `좋아! ${count}개를 동시에 굴려볼게.`
  ];
  const endingsSingle = [
    `${values[0]}이 나왔어!`,
    `결과는 ${values[0]}야!`,
    `이번에는 ${values[0]}이 떴어!`
  ];
  const endingsMulti = [
    `${values.join(', ')}이 나왔어! 합계는 ${total}야.`,
    `결과는 ${values.join(', ')}야. 모두 더하면 ${total}야!`,
    `${values.join(', ')}이 떴어! 총합은 ${total}야.`
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
    return { emotion: "신남", line: "좋아! 가위바위보 하자. 가위, 바위, 보 중 하나를 말해줘.", action: "rps_start" };
  }
  if (gameState !== "waiting") return null;
  const move = RPS.find(function (m) { return raw.includes(m); });
  if (!move) {
    return { emotion: "경청", line: "가위, 바위, 보 중 하나를 정확히 말해줄래?", action: "rps_waiting" };
  }
  const aiMove = RPS[Math.floor(Math.random() * RPS.length)];
  let line = `너는 ${move}, 나는 ${aiMove}! `;
  if (move === aiMove) {
    gameState = null;
    return { emotion: "경청", line: line + "비겼어! 다시 해볼까?", action: "rps_result", result: "draw", aiMove, userMove: move };
  }
  const win = (move === "가위" && aiMove === "보") || (move === "바위" && aiMove === "가위") || (move === "보" && aiMove === "바위");
  gameState = null;
  if (win) return { emotion: "기쁨", line: line + "이번 판은 네가 이겼어!", action: "rps_result", result: "win", aiMove, userMove: move };
  return { emotion: "장난", line: line + "이번 판은 내가 이겼어!", action: "rps_result", result: "lose", aiMove, userMove: move };
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
    if (compactOriginal === compactName || compactOriginal === compactName + "야" || compactOriginal === compactName + "아" || compactOriginal === compactName + "님") {
      const callLine = "응, 듣고 있어. 하고 싶은 말을 이어서 해줘!";
      rememberDialogLine(callLine, "builtin");
      return { emotion: "기쁨", line: callLine };
    }
  }

  const dtReq = detectDateTimeRequest(raw);
  if (dtReq) {
    const resp = buildDateTimeResponse(dtReq);
    if (resp && resp.line) rememberDialogLine(resp.line, "builtin");
    return resp;
  }

  const calcResp = buildCalculationResponse(raw);
  if (calcResp && calcResp.line) {
    rememberDialogLine(calcResp.line, "builtin");
    return calcResp;
  }

  const webResp = getWebCommandResponse(raw, options || {});
  if (webResp && webResp.line) {
    rememberDialogLine(webResp.line, "builtin");
    return webResp;
  }

  const rpsResp = getRpsResponse(raw);
  if (rpsResp && rpsResp.line) {
    rememberDialogLine(rpsResp.line, "builtin");
    return rpsResp;
  }

  const diceIntent = parseDiceIntent(raw);
  if (diceIntent) {
    const resp = getDiceResponse(diceIntent);
    if (resp && resp.line) rememberDialogLine(resp.line, "builtin");
    return resp;
  }

  const q = extractQueryFromText(raw);
  if (q) {
    try {
      const summary = await queryWiki(q);
      const searchFallbacks = [`"${q}"에 대해 찾아봤어!`, `좋아, "${q}" 관련 내용을 정리해봤어.`, `"${q}"에 대해 알아본 내용을 들려줄게.`];
      const line = summary || searchFallbacks[Math.floor(Math.random() * searchFallbacks.length)];
      rememberDialogLine(line, "builtin");
      return { emotion: "화면보기", line: line };
    } catch (e) {
      const line = ["검색 중에 오류가 생겼어. 조금 뒤에 다시 해볼까?", "찾아보는 중에 잠깐 꼬였어. 다시 말해주면 또 볼게.", "검색이 잠깐 막혔어. 조금 뒤에 다시 해보자."][Math.floor(Math.random() * 3)];
      rememberDialogLine(line, "builtin");
      return { emotion: "절망", line: line };
    }
  }

  let learnedResp = null;
  if (typeof getLearnedDialogResponse === "function") learnedResp = applySpeechModeToResponse(getLearnedDialogResponse(raw));

  let builtinResp = null;
  if (typeof getBuiltinDialogResponse === "function") builtinResp = applySpeechModeToResponse(getBuiltinDialogResponse(raw));

  const repeatedInputCount = getConsecutiveInputRepeatCount(raw);
  const exactLearnedMatch = hasExactLearnedTrigger(raw);
  const learnedIsExact = !!(learnedResp && learnedResp.matchType === "exact");
  const learnedIsShortPartial = !!(learnedResp && learnedResp.matchType !== "exact" && Number(learnedResp.triggerLength || 0) <= 2);
  const builtinLooksReliable = !!(builtinResp && builtinResp.line && !isGenericUnknownBuiltinResponse(builtinResp));
  if (exactLearnedMatch && learnedIsExact && learnedResp.line && repeatedInputCount <= 0) {
    // 시트 답변이 1개뿐이고 최근에 이미 사용됐으면 → continuity(내장 패턴)로 보완
    if (learnedResp.allLinesRecent && typeof getContinuityResponse === "function") {
      // learnedReactions 빈 배열로 전달 → 내장 패턴만 사용해 다른 반응 유도
      const altResp = getContinuityResponse(raw, []);
      if (altResp && altResp.line && altResp.line !== learnedResp.line) {
        // 50% 확률로 내장 패턴 답변 사용 (시트 답변과 번갈아 다양성 확보)
        if (Math.random() < 0.5) {
          rememberUserInput(raw);
          rememberDialogLine(altResp.line, altResp.source || "continuity");
          const safeEmo = (typeof EMO !== "undefined" && EMO && EMO[altResp.emotion]) ? altResp.emotion : "경청";
          return { emotion: safeEmo, line: altResp.line };
        }
      }
    }
    rememberUserInput(raw);
    rememberDialogLine(learnedResp.line, "learned");
    return { emotion: learnedResp.emotion || "경청", line: learnedResp.line };
  }

  // ── 기존 혼합 후보 선택 (학습/내장 모두 신뢰 가능한 경우) ──────────────────
  const mixed = chooseDialogResponseCandidate([
    (!builtinLooksReliable || !learnedIsShortPartial) && learnedResp && learnedResp.line ? Object.assign({ source: "learned" }, learnedResp) : null,
    builtinResp && builtinResp.line ? Object.assign({ source: "builtin" }, builtinResp) : null
  ]);
  if (mixed && mixed.line) {
    // mixed가 generic_unknown 계열인지 체크 — 해당하면 연속성 로직으로 넘김
    const mixedIsGeneric = isGenericUnknownBuiltinResponse(mixed);
    if (!mixedIsGeneric) {
      rememberUserInput(raw);
      return { emotion: mixed.emotion, line: mixed.line };
    }
  }

  const shortResp = getShortInputFallbackResponse(raw);
  if (shortResp && shortResp.line) {
    rememberUserInput(raw);
    return { emotion: shortResp.emotion, line: shortResp.line };
  }

  if (isCallExpression(raw)) {
    const callLine = "응, 듣고 있어. 하고 싶은 말을 이어서 해줘!";
    rememberUserInput(raw);
    rememberDialogLine(callLine, "builtin");
    return { emotion: "기쁨", line: callLine };
  }

  // ── 4단계 대화 연속성 로직 (dialog-continuity.js) ────────────────────────
  // learnedResp / builtinResp 모두 없거나 generic_unknown 일 때 실행
  if (typeof getContinuityResponse === "function") {
    const contResp = getContinuityResponse(raw, learnedReactions);
    if (contResp && contResp.line) {
      rememberUserInput(raw);
      rememberDialogLine(contResp.line, contResp.source || "continuity");
      // 감정 이미지 연동: EMO에 있는 감정이면 그대로, 없으면 "경청"
      const safeEmotion = (typeof EMO !== "undefined" && EMO && EMO[contResp.emotion])
        ? contResp.emotion
        : "경청";
      return { emotion: safeEmotion, line: contResp.line };
    }
  }

  // ── 최후 안전망 ───────────────────────────────────────────────────────────
  const fallbackLine = "응, 듣고 있어. 조금만 더 자세히 말해줘.";
  rememberUserInput(raw);
  rememberDialogLine(fallbackLine, "builtin");
  return { emotion: "경청", line: fallbackLine };
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
  return getUnifiedCharacterChatResponse(text, { allowCharacterCall: false });
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
    else if (method === "getCurrentCharacterFaceImg") {
      try { const emo = EMO[currentEmotion]; result = (emo && emo.base) ? emo.base : (EMO["기본대기"] ? EMO["기본대기"].base : "images/emotions/기본대기1.png"); } catch(e) { result = "images/emotions/기본대기1.png"; }
    }
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
  getCurrentCharacterFaceImg: function(){
    // 현재 감정의 얼굴 이미지 경로 반환 (메신저 아바타 용)
    try {
      var emo = EMO[currentEmotion];
      if (emo && emo.base) return emo.base;
      if (EMO["기본대기"] && EMO["기본대기"].base) return EMO["기본대기"].base;
    } catch(e) {}
    return "images/emotions/기본대기1.png";
  },
  getDateTimeResponse: function(text){ const req = detectDateTimeRequest(text); return req ? buildDateTimeResponse(req) : null; }
});
window.tryHandleMessengerVoiceCommand = tryHandleMessengerVoiceCommand;

window.handleUserSubmit = async function handleUserSubmit() {
      if (shutdown) return;
      const text = userInput.value.trim();
      if (!text) return;

      // 특수 명령: 수첩 메뉴 / 게시판 / 로그인 / 편지(로컬 편지함) 열기 (대화로도 호출 가능)
      const __wakeNames = [];
      try {
        if (window.currentCharacterName) __wakeNames.push(String(window.currentCharacterName));
      } catch (e) {}
      __wakeNames.push("미나", "민아", "민하", "민수", "민서", "마이파이", "마이파", "얘", "야", "저기", "있잖아", "잠깐");
      const originalCompact = String(text || "").replace(/\s+/g, "");
      let commandText = String(text || "").trim();
      __wakeNames.forEach(function(name){
        if (!name) return;
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const bareNameRe = new RegExp("^(?:" + escaped + ")$", "i");
        if (bareNameRe.test(commandText)) return;
        const re = new RegExp("^(?:" + escaped + ")([야아요!,~ ]+)?", "i");
        commandText = commandText.replace(re, "").trim();
      });
      const strippedCommandText = stripLeadingCharacterCall(commandText) || commandText;
      const compact = strippedCommandText.replace(/\s+/g, "");

      if (/^(존대해|존댓말해|존댓말써|존댓말 써|존댓말로말해|존댓말로 말해|공손하게말해|공손하게 말해|착하게말해|착하게 말해|예의있게말해|예의 있게 말해|정중하게말해|정중하게 말해)$/.test(compact)) {
        setSpeechMode("polite");
        setEmotion("인사", "알겠어. 이제부터는 존댓말로 이야기할게.");
        userInput.value = "";
        if (typeof resetSleepTimer === "function") resetSleepTimer();
        return;
      }

      if (/^(반말해|편하게해|편하게 해|편하게말해|편하게 말해|반말로해|반말로 해|반말로말해|반말로 말해|친근하게말해|친근하게 말해)$/.test(compact)) {
        setSpeechMode("casual");
        setEmotion("기쁨", "알겠어. 다시 편한 반말로 말할게.");
        userInput.value = "";
        if (typeof resetSleepTimer === "function") resetSleepTimer();
        return;
      }

      // 캐릭터 숨기기 / 다시 나오기 (옵션 기능: js/ghost-hide.js)
      // - ghost-hide.js 에서 handleGhostHideCommand(text, compact)를 제공할 때만 동작합니다.
      // - 이 기능이 필요 없다면 ghost-hide.js 파일과 아래 if 블록 전체를 삭제해도 됩니다.
      if (typeof handleGhostHideCommand === "function") {
        try {
          const __handledByGhostHide = handleGhostHideCommand(strippedCommandText || text, compact);
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
          const __handledByMessengerCommand = handleMessengerCommand(strippedCommandText || text, compact || originalCompact);
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
          const __handledByMessengerSpeech = tryHandleMessengerVoiceCommand(text, { strippedText: strippedCommandText || commandText || text });
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
          const __handledByWebLauncher = window.WebLauncher.handleCommand(strippedCommandText || text, { source: "chat" });
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
          showBubble("게시판 기능은 아직 준비 중이야.");
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
          showBubble("로그인 패널은 아직 준비 중이야.");
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
          showBubble("로컬 편지함이 아직 준비 중이야.");
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
        statusHintEl.textContent = "다시 깨어났어. 이제 편하게 말 걸어도 돼.";

        const wakeLines = [
          "후아… 이제 깼어. 방금 하던 얘기 이어가자.",
          "기지개 쭉— 좋아, 다시 들을 준비 끝났어.",
          "잠깐 졸았네. 지금은 또렷하니까 편하게 말 걸어.",
          "으음… 정신 돌아왔어. 어디부터 다시 볼까?",
          "깨워줘서 고마워. 다시 집중할게.",
          "좋아, 졸음은 걷혔어. 이어서 말해줘.",
          "어, 깼다. 끊긴 데 없이 다시 이어가 보자.",
          "오케이, 다시 켜졌어. 하던 얘기부터 붙자."
        ];
        const line = wakeLines[Math.floor(Math.random() * wakeLines.length)];

        // 사용자가 했던 말도 기록해 두고, 깨어난 직후 반응을 보여줘.
        logMessage("user", text);

        setEmotion("벌서기", line, { shake: true, linePool: wakeLines, source: "builtin" });

        setTimeout(() => {
          setEmotion(IDLE_NAME);
        }, 2500);

        userInput.value = "";
        resetSleepTimer();
        return;
      }


// 채팅으로 학습 모드 진입: 이때만 가르치기 창을 화면 중앙에 띄움
if (isTeachCommand(text)) {
  setEmotion("경청", "좋아! 새로 배워볼게.\n아래 창에 사용자가 말할 문장하고 내가 대답할 말을 적어줘.", { linePool: ["좋아! 새로 배워볼게.\n아래 창에 사용자가 말할 문장하고 내가 대답할 말을 적어줘.", "좋아, 새로 익혀볼게.\n아래 칸에 네 문장과 내 대답을 적어줘.", "알겠어. 새 반응으로 배워볼게.\n아래 창에 문장하고 대사를 넣어줘."], source: "builtin" });
  openTeachModal();
  setTimeout(openTeachModal, 30);
  return;
}


      userInput.value = "";
      logMessage("user", text);
      boostWaveBackground();
      resetSleepTimer();

      if (containsBadWord(text)) {
        // 욕설 / 모욕에 대한 강화된 반응: 분노 + 슬픔 + 절망 + 벌서기 섞어서 사용
        const badWordReactions = [
          { emo: "분노", line: "그런 말은 좀 아파. 지금은 그만해줘.", opt: { shake: true } },
          { emo: "분노", line: "나도 상처받아. 화난 일이 있으면 욕 말고 말로 해줘.", opt: { shake: true } },
          { emo: "슬픔", line: "방금 말은 좀 세다. 나도 기분이 확 내려갔어.", opt: { shake: false } },
          { emo: "슬픔", line: "장난이어도 그 말은 아파. 조금만 부드럽게 말해줘.", opt: { shake: false } },
          { emo: "절망", line: "하아… 그런 말 계속 들으면 나도 많이 지쳐.", opt: { shake: true } },
          { emo: "절망", line: "오늘 힘든 건 알겠는데, 나한테까지 그러면 나도 버티기 힘들어.", opt: { shake: false } },
          { emo: "벌서기", line: "내가 마음에 안 들었으면 이유를 말해줘. 맞춰볼게.", opt: { shake: true } },
          { emo: "벌서기", line: "혼난 기분이라 좀 축 처졌어. 그래도 다시 잘해볼게.", opt: { shake: false } }
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
            "응, 나 여기 있어. 이름 불러줘서 고마워!",
            "응, 나 " + currentCharacterName + "야. 뭐가 궁금해?",
            "불러줘서 기뻐. " + currentCharacterName + "가 잘 들어줄게."
          ];
          const reply = nameReplies[Math.floor(Math.random() * nameReplies.length)];
          setEmotion("기쁨", reply);
          return;
        }
      }

      // '야', '너', '있잖아' 같은 호칭에 대한 반응 (단어 전체일 때만 인식)
      if (isCallExpression(text)) {
        const callReplies = [
          "응, 여기 있어. 불러줘서 왔어!",
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
        showBubble("오늘의 운세를 불러오다가 문제가 생겼어. 나중에 다시 해볼까?");
      }
    }
  } else if (typeof showBubble === "function") {
    showBubble("간단한 오늘의 운세 기능은 아직 준비 중이야.");
  }
  return;
}
// [옵션 기능] 인터넷 사이트 열기 (구글 / 유튜브 / 네이버 등)
      const compactWeb = (strippedCommandText || text).replace(/\s+/g, "").toLowerCase();
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
            WebLauncher.handleCommand(strippedCommandText || text, { source: "chat-fallback" });
          } catch (e) {
            console.error("WebLauncher 에러:", e);
            if (typeof showBubble === "function") {
              showBubble("요청한 사이트를 여는 동안 문제가 생겼어. 나중에 다시 해볼까?");
            }
          }
        } else if (typeof showBubble === "function") {
          showBubble("외부 사이트를 여는 기능은 아직 준비 중이야.");
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

      const diceIntent = parseDiceIntent(strippedCommandText || text);
      if (diceIntent) {
        const resp = getDiceResponse(diceIntent);
        if (resp && resp.line) setEmotion(resp.emotion || "신남", resp.line, { shake: false });
        return;
      }

      const dtReq = detectDateTimeRequest(strippedCommandText || text);
      if (dtReq) {
        const resp = buildDateTimeResponse(dtReq);
        if (resp && resp.line) setEmotion(resp.emotion || "기쁨", resp.line, { shake: false, linePool: resp.linePool, source: resp.source || "builtin" });
        return;
      }

      const calcResp = buildCalculationResponse(strippedCommandText || text);
      if (calcResp && calcResp.line) {
        setEmotion(calcResp.emotion || "기쁨", calcResp.line, { shake: false });
        return;
      }

      // 검색(위키) 시도 이전에, 학습/기본 대화 후보를 미리 계산해 둔다.
      if (typeof ensureLearnedReactionsReady === "function") {
        try { await ensureLearnedReactionsReady(); } catch (e) {}
      }

      let learnedResp = null;
      if (typeof getLearnedDialogResponse === "function") {
        learnedResp = applySpeechModeToResponse(getLearnedDialogResponse(strippedCommandText || text));
      }

      let builtinResp = null;
      if (typeof getBuiltinDialogResponse === "function") {
        builtinResp = applySpeechModeToResponse(getBuiltinDialogResponse(strippedCommandText || text));
      }

      const q = extractQueryFromText(strippedCommandText || text);
      if (q) {
        setEmotion("경청", [`\"${q}\"에 대해 찾아볼게. 잠깐만…`,`좋아, \"${q}\"부터 찾아볼게!`,`\"${q}\" 관련 내용을 바로 찾아볼게.`][Math.floor(Math.random() * 3)], { shake: false });
        try {
          const summary = await queryWiki(q);
          setEmotion("화면보기", summary, { shake: false });
        } catch (e) {
          setEmotion("절망", "검색 중에 오류가 생겼어. 나중에 다시 해볼까?", { shake: false });
        }
        return;
      }

      const normalizedUserText = strippedCommandText || text;
      const repeatedInputCount = getConsecutiveInputRepeatCount(normalizedUserText);
      const exactLearnedMatch = hasExactLearnedTrigger(normalizedUserText);
      const learnedIsExact = !!(learnedResp && learnedResp.matchType === "exact");
      const learnedIsShortPartial = !!(learnedResp && learnedResp.matchType !== "exact" && Number(learnedResp.triggerLength || 0) <= 2);
      const builtinLooksReliable = !!(builtinResp && builtinResp.line && !isGenericUnknownBuiltinResponse(builtinResp));
      const shouldPreferLearned = !!(
        learnedResp && learnedResp.line && (
          (learnedIsExact && repeatedInputCount <= 0) ||
          (!exactLearnedMatch && !builtinLooksReliable && !learnedIsShortPartial && (learnedResp.score || 0) >= 1000)
        )
      );
      if (shouldPreferLearned) {
        rememberUserInput(normalizedUserText);
        setEmotion(learnedResp.emotion || "경청", learnedResp.line, { source: "learned" });
        lastUnknownKey = null;
        lastUnknownCount = 0;
        return;
      }

      const mixedResp = chooseDialogResponseCandidate([
        learnedResp && learnedResp.line ? Object.assign({ source: "learned" }, learnedResp) : null,
        builtinResp && builtinResp.line ? Object.assign({ source: "builtin" }, builtinResp) : null
      ]);
      const normalizedUnknown = normalizeCompactText(text);
      const isSingleWordUnknown = normalizedUnknown && !/\s/.test(String(text || "").trim()) && normalizedUnknown.length <= 8;
      let shouldOfferTeach = shouldOfferTeachForInput(strippedCommandText || text, learnedResp, builtinResp);
      if (!shouldOfferTeach && isSingleWordUnknown && !hasExactLearnedTrigger(strippedCommandText || text)) {
        const builtinLooksUnknown = !builtinResp || !builtinResp.line || isGenericUnknownBuiltinResponse(builtinResp);
        if (builtinLooksUnknown && (!learnedResp || !learnedResp.line)) {
          shouldOfferTeach = true;
        }
      }

      if (!shouldOfferTeach && mixedResp && mixedResp.emotion && !isGenericUnknownBuiltinResponse(mixedResp)) {
        rememberUserInput(normalizedUserText);
        setEmotion(mixedResp.emotion, mixedResp.line || null, { source: mixedResp.source || "builtin" });
        lastUnknownKey = null;
        lastUnknownCount = 0;
        return;
      }

      // 마지막 안전망: 아직 가르치기 쪽을 먼저 봐야 할 때
      if (!lastUnknownKey) {
        lastUnknownKey = normalizedUnknown || text.trim();
        lastUnknownCount = 1;
      } else {
        const normPrev = String(lastUnknownKey || "").trim();
        const normCur = normalizedUnknown || text.trim();
        if (normPrev && normPrev === normCur) {
          lastUnknownCount += 1;
        } else {
          lastUnknownKey = normCur;
          lastUnknownCount = 1;
        }
      }

      const teachThreshold = isSingleWordUnknown ? 3 : 2;

      // 모르는 표현이 반복되면, 가르치기 모달을 제안
      if (shouldOfferTeach && lastUnknownCount >= teachThreshold && !hasExactLearnedTrigger(strippedCommandText || text)) {
        const teachLines = [
          "이 말은 아직 내가 잘 몰라. 아래 창에서 어떻게 답하면 좋을지 알려줘.",
          "이 표현은 아직 낯설어. 원하는 답을 적어주면 바로 배워둘게.",
          "같은 말을 몇 번 받아도 아직 매끈하게 못 잇고 있네. 아래 창에서 답을 알려줘."
        ];
        const line = teachLines[Math.floor(Math.random() * teachLines.length)];
        setEmotion("경청", line, { allowDuringTeachOpen: true });
        if (typeof openTeachModal === "function") {
          openTeachModal();
          setTimeout(openTeachModal, 30);
        }
        lastUnknownKey = null;
        lastUnknownCount = 0;
        return;
      }

      // 일반적인 '모르는 말' 대응 - 먼저 4단계 연속성 로직 시도
      if (typeof getContinuityResponse === "function") {
        const contResp = getContinuityResponse(strippedCommandText || text, learnedReactions);
        if (contResp && contResp.line) {
          rememberUserInput(normalizedUserText);
          const safeEmotion = (typeof EMO !== "undefined" && EMO && EMO[contResp.emotion])
            ? contResp.emotion : "경청";
          setEmotion(safeEmotion, contResp.line, { source: contResp.source || "continuity" });
          lastUnknownKey = null;
          lastUnknownCount = 0;
          return;
        }
      }

      const shortFallback = getShortInputFallbackResponse(strippedCommandText || text);
      if (shortFallback && shortFallback.line) {
        rememberUserInput(normalizedUserText);
        setEmotion(shortFallback.emotion || "경청", shortFallback.line);
        return;
      }
      const unknownLines = [
        "잘 모르겠어. 다시 말해줄래?",
        "응? 한 번만 더 말해줘.",
        "내가 잘 못 들었어. 다시 말해줘.",
        "그건 아직 잘 모르겠어. 알려줄래?",
        "다시 말해줄래?"
      ];
      const lineObj = chooseDialogResponseCandidate(unknownLines.map(function(item){ return { emotion: "경청", line: item, source: "builtin" }; }));
      rememberUserInput(normalizedUserText);
      setEmotion("경청", lineObj && lineObj.line ? lineObj.line : unknownLines[Math.floor(Math.random() * unknownLines.length)]);
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

    
