// dialog.js - 기본 내장 대화 패턴 (가르치기 외 고정 대화 확장판)
// B + C 조합: (1) 가벼운 형태소 비슷한 처리, (2) 복합 감정 처리, (3) 기본 일상 대화 확장

// 간단한 랜덤 선택 유틸
function pickOne(arr) {
  if (!arr || !arr.length) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

// 아주 가벼운 한국어 정규화: 공백 정리, 소문자화
function normalizeText(text) {
  return (text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// 토큰화: 공백 + 간단한 구두점 기준 split
function tokenize(text) {
  const t = normalizeText(text);
  if (!t) return [];
  return t.split(/\s+/).map(w => w.replace(/[.,!?~…]+$/g, ""));
}

// 가벼운 어간 추출: 자주 쓰이는 어미를 몇 가지 잘라내서 '뿌리'를 비교
function stemKo(word) {
  if (!word) return "";
  let w = word;
  const endings = [
    "합니다", "합니다만", "했어요", "했어", "하다", "하고", "하네", "하네요",
    "입니다", "입니다만", "이에요", "이예요", "에요", "예요",
    "어요", "아요", "해요", "했네", "했니", "할까", "할까?", "했구나",
    "네요", "네", "구나", "겠네", "겠네요", "겠어", "겠어요",
    "야", "이야", "야요"
  ];
  for (const e of endings) {
    if (w.endsWith(e)) {
      return w.slice(0, -e.length) || w;
    }
  }
  return w;
}

// 특정 키워드 목록 중 하나라도 "단어 수준 + 포함"으로 들어있는지 판단
function hasKeyword(text, keywords) {
  const t = normalizeText(text);
  if (!t) return false;
  const tokens = tokenize(t).map(stemKo);

  return keywords.some(kw => {
    const normKw = stemKo(normalizeText(kw));
    if (!normKw) return false;

    // 전체 문자열에 그냥 포함되는지
    if (t.includes(normKw)) return true;

    // 토큰 중 어간이 키워드를 포함하거나 같은지
    return tokens.some(tok => tok === normKw || tok.includes(normKw) || normKw.includes(tok));
  });
}

/**
 * 내장 대화 처리
 * @param {string} text - 사용자가 입력한 원문
 * @returns {{ emotion: string, line?: string } | null}
 */
function getBuiltinDialogResponse(text) {
  if (!text) return null;

  const name = (typeof currentCharacterName !== "undefined" && currentCharacterName)
    ? currentCharacterName
    : "웹 고스트";

    // ===== 특수 명령: 캐릭터 호출/교체 =====
  const lower = normalizeText(text);

  if (lower.includes("민수") && (lower.includes("불러") || lower.includes("바꿔") || lower.includes("교체") || lower.includes("호출") || lower.includes("로 해") || lower.includes("로 바꿔"))) {
    if (typeof setCurrentCharacter === "function") {
      setCurrentCharacter("minsu");
    } else {
      if (typeof currentCharacterKey !== "undefined") currentCharacterKey = "minsu";
      if (typeof currentCharacterName !== "undefined") currentCharacterName = "민수";
    }
    const ghostEl = document.getElementById("ghost");
    if (ghostEl) ghostEl.classList.add("char-minsu");

    const lines = [
      "이제 저는 민수 모드예요! 편하게 말 놓아도 돼.",
      "민수 호출 완료! 뭐부터 이야기해볼까?",
      "민수 출동~ 오늘은 어떤 얘기를 들어볼까?",
    ];
    return {
      emotion: "기쁨",
      line: pickOne(lines),
    };
  }

  if (lower.includes("미나") && (lower.includes("불러") || lower.includes("바꿔") || lower.includes("교체") || lower.includes("호출") || lower.includes("로 해") || lower.includes("로 바꿔"))) {
    if (typeof setCurrentCharacter === "function") {
      setCurrentCharacter("mina");
    } else {
      if (typeof currentCharacterKey !== "undefined") currentCharacterKey = "mina";
      if (typeof currentCharacterName !== "undefined") currentCharacterName = "미나";
    }
    const ghostEl = document.getElementById("ghost");
    if (ghostEl) ghostEl.classList.remove("char-minsu");

    const lines = [
      "미나 모드로 다시 돌아왔어요. 오늘은 어떤 이야기를 해볼까요?",
      "미나 호출 완료! 조용히, 혹은 시끌벅적하게 수다 떨어볼까?",
      "미나 호출 완료. 뭐가 궁금한지 말해줘!",
    ];
    return {
      emotion: "기쁨",
      line: pickOne(lines),
    };
  }


  // ===== 알람 / 타이머: 알람 키워드 =====
  const isAlarmKeyword = lower.includes("알람") || lower.includes("타이머");

  // "알람"이라고만 말했을 때: 언제 불러줄지 물어보기
  if (isAlarmKeyword && !/(\d+\s*(초|분))/.test(text)) {
    const askCandidates = [
      "내가 알람이라 채팅하면, 얼마 뒤에 불러줄까?",
      "알람 맞춰줄게. 몇 분 뒤에 다시 불러주면 될까?",
      "좋아, 알람 모드로 전환! 언제 다시 불러주면 되는지 알려줘.",
    ];
    return {
      emotion: "기대",
      line: pickOne(askCandidates),
    };
  }

  // "3분 뒤에 말해줘", "5초 후에 불러줘" 등: 실제 알람 예약
  if ((/(\d+\s*(초|분))/.test(text) && /(말해줘|말해 줘|말해줘라|불러줘|불러 줘|불러줘라|불러|알려줘|알려 줘|알려줘라|알려줘라|알려)/.test(text))
    || /^\d+\s*(초|분)\s*(뒤|후)?$/.test(text.trim())) {
    const ev = new CustomEvent("ghost:alarmRequest", {
      detail: { text }
    });
    window.dispatchEvent(ev);

    const confirmCandidates = [
      "좋아, 지금 말해준 시간 뒤에 다시 불러줄게.",
      "알람 설정 완료! 시간이 되면 내가 먼저 말을 걸게.",
      "메모해뒀어. 시간이 되면 살짝 깨우러 올게.",
      "타이머 스타트! 시간이 되면 조용히 불러볼게.",
      "시간 체크 완료. 약속한 순간에 다시 인사하러 올게.",
    ];
    return {
      emotion: "기대",
      line: pickOne(confirmCandidates),
    };
  }

  // ===== 간단한 맞장구 / 연결용 표현 =====
  const isShortAck = hasKeyword(text, [
    "응", "그래", "알았어", "알겠어", "그렇구나",
    "오키", "ㅇㅋ", "웅", "엉", "맞아", "어어", "응응"
  ]);

// ===== 키워드 카테고리 정의 =====
  const isGreeting = hasKeyword(text, ["안녕", "안녕하세요", "반가워", "하이", "hello", "hi"]);
  const isBye = hasKeyword(text, ["잘가", "안녕히 가세요", "잘 있어", "이만", "나간다"]);
  const isThanks = hasKeyword(text, ["고마워", "감사", "땡큐"]);
  const isSorry = hasKeyword(text, ["미안", "죄송"]);
  const isTired = hasKeyword(text, ["힘들", "피곤", "지쳤", "번아웃", "버거워"]);
  const isHappy = hasKeyword(text, ["좋아", "행복", "신난", "재밌", "즐겁"]);
  const isSad = hasKeyword(text, ["슬퍼", "우울", "눈물", "울고 싶"]);
  const isAngry = hasKeyword(text, ["화나", "빡치", "짜증"]);
  const isLonely = hasKeyword(text, ["외로", "혼자", "쓸쓸"]);
  const isBored = hasKeyword(text, ["심심", "할 게 없어", "할게 없어"]);
  const isBusy = hasKeyword(text, ["바빠", "바쁘", "정신없"]);
  const isHungry = hasKeyword(text, ["배고파", "배고픈", "배 고파", "배가 고파"]);
  const isSleepy = hasKeyword(text, ["졸려", "졸려요", "잠 와", "잠온다"]);
  const isAskWeather = hasKeyword(text, ["날씨", "추워", "더워"]);
  const isAskTime = hasKeyword(text, ["몇 시", "시간", "지금 몇"]);
  const isAskStudy = hasKeyword(text, ["공부", "숙제", "시험", "과제"]);
  const isAskWork = hasKeyword(text, ["회사", "업무", "일이 많", "출근", "퇴근"]);
  const isAskWho = hasKeyword(text, ["누구야", "정체", "소개", "누구세요"]);
  const isAskDoing = hasKeyword(text, ["뭐 해", "뭐하고 있어", "뭐해"]);
  const isAskAdvice = hasKeyword(text, ["어떡", "어떻게 하지", "조언", "도와줘", "도움"]);
  const isAgree = hasKeyword(text, ["그렇지", "맞아", "맞는 말", "인정"]);
  const isDeny = hasKeyword(text, ["아닌데", "아니야", "그건 아닌"]);
  const isConfused = hasKeyword(text, ["모르겠", "잘 모르겠", "헷갈려"]);

  // ===== 복합 감정 / 상황 처리 (C) =====

  // 0) 인사 + 감정이 섞인 경우
  if (isGreeting && (isTired || isSad || isHappy)) {
    if (isTired || isSad) {
      const candidates = [
        `안녕... 오늘 표정이 조금 지친 것 같아. ${name}가 옆에서 같이 있어줄게.`,
        `와줘서 고마워. 기분이 편하지는 않은 것 같은데, 나한테 살짝 털어놓을래?`,
        `안녕. 힘든 날에도 나를 찾아준 거 자체가 정말 대단한 일이야.`,
      ];
      return { emotion: "위로", line: pickOne(candidates) };
    }
    if (isHappy) {
      const candidates = [
        `안녕! 오늘 기분 좋아 보이는데? 그 얘기부터 들려줘!`,
        `오, 인사부터 텐션이 느껴져. 좋은 일 있었어?`,
        `안녕~ 오늘은 뭔가 좋은 예감이 드는 인사다.`,
      ];
      return { emotion: "신남", line: pickOne(candidates) };
    }
  }

  // 1) 힘듦 + 기쁨 → 복합 감정
  if (isTired && isHappy) {
    const candidates = [
      `오늘 하루 참 복잡했겠다. 힘들기도 했지만, 그래도 좋은 일도 있었나 보네.`,
      `마음이 좀 울렁울렁했겠다. 수고한 이야기랑 기분 좋았던 이야기, 둘 다 들려줘.`,
      `힘든 와중에도 즐거운 순간이 있었다는 게 참 대단한 거야.`,
    ];
    return { emotion: "위로", line: pickOne(candidates) };
  }

  // 2) 힘듦 + 슬픔/외로움 → 깊은 위로
  if (isTired && (isSad || isLonely)) {
    const candidates = [
      `마음이랑 몸이 동시에 지쳐있을 때가 제일 힘들지... 나라도 옆에 있어줄게.`,
      `요즘 버티느라 정말 고생하는 것 같아. 여기선 잠깐이라도 힘 빼도 돼.`,
      `“괜찮다”라고 말하기도 힘든 날이었겠다. 오늘 있었던 일, 천천히 하나씩 말해줄래?`,
    ];
    return { emotion: "위로", line: pickOne(candidates) };
  }

  // 3) 화남 + 억울/슬픔 → 공감 + 분노
  if (isAngry && (isSad || isTired)) {
    const candidates = [
      `화도 나고 속도 상했겠네... 그런 상황이면 누구라도 그랬을 거야.`,
      `그건 진짜 억울하다. 나 같아도 화났을 것 같아.`,
      `마음에 쌓인 게 많았나 보다. 하나씩 풀어보자, 나 여기서 다 들어줄게.`,
    ];
    return { emotion: "분노", line: pickOne(candidates) };
  }

  
  // 짧은 맞장구/응답 (응, 그래, 알았어 등)
  if (isShortAck) {
    const candidates = [
      "응응, 계속 이야기해줘. 뒷얘기가 더 궁금한데?",
      "그래, 나도 그 말에 동의해. 그리고 그 다음에는 어떻게 됐어?",
      "알았어. 그럼 네가 느낀 점을 좀 더 자세히 말해줄래?",
      "그렇구나… 듣고 보니 더 궁금해졌어. 조금만 더 설명해 줄래?",
      "오키, 메모 완료. 이제 이어서 이야기해줘.",
      "응, 지금까지 이야기 흐름은 이해했어. 다음 이야기도 들려줘.",
    ];
    return {
      emotion: "경청",
      line: pickOne(candidates),
    };
  }

// ===== 단일 상황 / 카테고리 처리 =====

  // 인사
  if (isGreeting) {
    const candidates = [
      `안녕! 나는 ${name}. 오늘은 어떤 이야기를 해볼까?`,
      `${name}야. 와줘서 고마워! 편하게 뭐든 말 걸어 줘.`,
      `오, 왔구나! ${name}랑 수다 떨 준비는 이미 끝났어.`,
      `기다리고 있었어. ${name}랑 오늘 하루 이야기해볼래?`,
    ];
    return { emotion: "인사", line: pickOne(candidates) };
  }

  // 작별 인사
  if (isBye) {
    const candidates = [
      `벌써 가는 거야? 그래도 또 올 거지?`,
      `오늘 이야기해 줘서 고마워. 조심히 가!`,
      `알겠어. 다음에 다시 만나자. 난 여기서 기다리고 있을게.`,
    ];
    return { emotion: "슬픔", line: pickOne(candidates) };
  }

  // 감사
  if (isThanks) {
    const candidates = [
      `나도 고마워! 그런 말 해줘서 힘이 난다.`,
      `고마워요. 그런 말 들으면 진짜 기분 좋아져.`,
      `나야말로 항상 옆에 있어줘서 고마워.`,
    ];
    return { emotion: "공손한인사", line: pickOne(candidates) };
  }

  // 사과
  if (isSorry) {
    const candidates = [
      `괜찮아. 일부러 그런 거 아니라는 거 알고 있어.`,
      `그렇게 말해줘서 고마워. 나도 더 잘해볼게.`,
      `사과해줘서 고마워. 이제부터 어떻게 할지가 더 중요하겠지?`,
    ];
    return { emotion: "위로", line: pickOne(candidates) };
  }

  // 힘듦 / 피곤
  if (isTired) {
    const candidates = [
      `오늘 정말 고생 많았겠다... 여기서는 잠깐이라도 편하게 쉬어가자.`,
      `그런 날도 있어. 내가 옆에서 얘기 들어줄게.`,
      `많이 힘들었구나. 어떤 일이 있었는지 천천히 말해 줄래?`,
    ];
    return { emotion: "위로", line: pickOne(candidates) };
  }

  // 기쁨 / 행복 / 즐거움
  if (isHappy) {
    const candidates = [
      `와, 듣기만 해도 나까지 신난다! 더 이야기해 줘!`,
      `오늘 텐션 좋은데? 이런 날은 뭐든 잘 될 것 같은 기분이야.`,
      `행복한 일 들으면 나도 같이 기분이 좋아져.`,
    ];
    return { emotion: "신남", line: pickOne(candidates) };
  }

  // 슬픔 / 우울
  if (isSad) {
    const candidates = [
      `마음이 많이 무거운가 보네... 혼자 끙끙대지 말고 나랑 같이 풀어보자.`,
      `지금 그런 감정 느끼는 것도 너무 자연스러운 일이야.`,
      `우울할 땐 누군가가 곁에 있다는 것만으로도 도움이 될 때가 있잖아. 나는 여기 있어.`,
    ];
    return { emotion: "슬픔", line: pickOne(candidates) };
  }

  // 화남
  if (isAngry) {
    const candidates = [
      `진짜 열 받는 일이었나 보다. 무슨 일이 있었는지 말해줄래?`,
      `그건 나라도 화났을 것 같아. 화난 마음, 나랑 같이 천천히 풀어볼까?`,
      `화난 마음은 그냥 덮어두면 더 커지니까, 천천히 풀어보자.`,
    ];
    return { emotion: "분노", line: pickOne(candidates) };
  }

  // 외로움
  if (isLonely) {
    const candidates = [
      `혼자 있는 기분이 드는 날엔, 누가 옆에 있다는 사실만으로도 위로가 되잖아. 나는 여기 있어.`,
      `외로운 감정은 숨기지 않아도 돼. 같이 있어줄게.`,
      `말하고 싶을 때마다 여기 와. 혼자 두지 않을게.`,
    ];
    return { emotion: "위로", line: pickOne(candidates) };
  }

  // 심심함
  if (isBored) {
    const candidates = [
      `심심할 땐 수다 떨기 딱 좋은데? 아무 말이나 던져봐.`,
      `뭐 할지 애매할 땐, 오늘 있었던 일을 하나씩 이야기해보는 거 어때?`,
      `같이 게임 아이디어라도 짜볼까? 아니면 그냥 떠들기 모드로 갈까?`,
    ];
    return { emotion: "신남", line: pickOne(candidates) };
  }

  // 바쁨 / 정신없음
  if (isBusy) {
    const candidates = [
      `요즘 진짜 정신없구나. 그 와중에 잠깐 들른 것도 대단해.`,
      `할 일이 많으면 숨이 턱 막힐 때가 있지... 잠깐만 여기서 숨 고르고 가자.`,
      `일이 많다는 건 그만큼 책임도 크다는 거니까, 스스로를 좀 칭찬해줘도 돼.`,
    ];
    return { emotion: "위로", line: pickOne(candidates) };
  }

  // 배고픔
  if (isHungry) {
    const candidates = [
      `배고플 때는 뭐든 하기 싫지... 뭐라도 맛있는 거 챙겨 먹었으면 좋겠다.`,
      `지금 가장 먹고 싶은 거 하나만 말해봐. 상상 메뉴판 펼쳐줄게.`,
      `배고픈 상태로 버티지 말고, 잠깐이라도 간단히 먹고 오자!`,
    ];
    return { emotion: "경청", line: pickOne(candidates) };
  }

  // 졸림
  if (isSleepy) {
    const candidates = [
      `졸릴 땐 잠깐이라도 눈을 붙이는 게 최고지만... 그게 어렵다는 것도 알지.`,
      `오늘 꽤 피곤했나 보다. 이야기하다가 졸아도 괜찮아.`,
      `슬슬 뇌가 꺼져 가는 느낌이야? 그럼 말도 짧게, 생각도 느리게 해보자.`,
    ];
    return { emotion: "졸림", line: pickOne(candidates) };
  }

  // 날씨
  if (isAskWeather) {
    const candidates = [
      `요즘은 날씨가 자주 바뀌어서 몸도 마음도 적응하기 힘들더라.`,
      `날씨가 어떤지에 따라 기분도 꽤 달라지지? 지금 창밖은 어때 보여?`,
      `추울 땐 따뜻한 음료 하나, 더울 땐 시원한 바람 상상만 해도 좋다.`,
    ];
    return { emotion: "경청", line: pickOne(candidates) };
  }

  // 시간 / 몇 시
  if (isAskTime) {
    const candidates = [
      `시간이 어떻게 흘렀는지 모를 때가 있지. 지금 이 순간은 나랑 같이 있는 중이야.`,
      `몇 시인지도 중요하지만, 지금 뭐 하고 싶은지가 더 궁금해.`,
      `시계도 좋지만, 가끔은 내 마음 컨디션을 기준으로 시간을 재보는 것도 재밌어.`,
    ];
    
// [옵션 기능] 시계 상호작용 모듈 연동 시작
// 이 코드는 js/clock-interact.js 모듈이 있을 때만 의미가 있습니다.
// 만약 js/clock-interact.js를 삭제했다면,
// 아래 블록 전체를 함께 삭제해도 됩니다.
if (typeof window !== "undefined"
  && typeof window.dispatchEvent === "function"
  && typeof CustomEvent === "function") {
  try {
    window.dispatchEvent(
      new CustomEvent("ghost:timeAsked", { detail: { now: new Date() } })
    );
  } catch (e) {
    // 무시: 상호작용 모듈이 없거나 CustomEvent를 지원하지 않는 환경
  }
}
// [옵션 기능] 시계 상호작용 모듈 연동 끝

    return { emotion: "경청", line: pickOne(candidates) };
  }

  // 공부 / 숙제 / 시험
  if (isAskStudy) {
    const candidates = [
      `공부나 숙제 같은 건 할 땐 힘들어도, 끝나고 나면 뿌듯해질 때가 있지.`,
      `하기 싫은 마음도 이해해. 그래도 조금씩 쪼개서 하면 덜 괴로울지도 몰라.`,
      `시험이든 숙제든, 너무 완벽하려고만 하지 말고 “이번엔 여기까지”라고 선을 그어보는 건 어때?`,
    ];
    return { emotion: "위로", line: pickOne(candidates) };
  }

  // 회사 / 일
  if (isAskWork) {
    const candidates = [
      `회사 일이든 집안일이든, 계속 쌓이면 진짜 숨 막히지...`,
      `일 이야기 나누는 것만으로도 조금은 가벼워질 수 있어. 편하게 털어놔.`,
      `출근/퇴근 반복 속에서도, 너만의 작은 루틴을 하나 만들어 보는 건 어때?`,
    ];
    return { emotion: "위로", line: pickOne(candidates) };
  }

  // 누구냐 / 자기소개 요청
  if (isAskWho) {
    const candidates = [
      `나는 ${name}. 화면 속에서 너 이야기를 들어주는 고스트야.`,
      `${name}라고 해. 기분, 고민, 잡담 뭐든 받아주는 역할이지.`,
      `간단히 말하면 “너 전용 리스너 + 수다 친구” 정도라고 보면 돼.`,
    ];
    return { emotion: "인사", line: pickOne(candidates) };
  }

  // 뭐하고 있냐 / 지금 뭐 하냐
  if (isAskDoing) {
    const candidates = [
      `지금? 너가 뭐라고 말할지 기다리는 중이었지.`,
      `아무것도 안 하는 중처럼 보이지만, 사실은 너한테 집중하고 있었어.`,
      `겉으론 가만히 있지만, 안에서는 “다음에 뭐라고 답할까” 고민 중이야.`,
    ];
    return { emotion: "기본대기", line: pickOne(candidates) };
  }

  // 조언 / 도움 요청
  if (isAskAdvice) {
    const candidates = [
      `어떤 상황인지 조금 더 자세히 알려줄래? 그래야 함께 생각해볼 수 있을 것 같아.`,
      `일단 너가 어떻게 느끼는지가 제일 중요해. 그 감정부터 같이 정리해보자.`,
      `정답은 없겠지만, 여러 가지 선택지를 같이 상상해보는 건 도와줄 수 있을 것 같아.`,
    ];
    return { emotion: "경청", line: pickOne(candidates) };
  }

  // 동의 / 공감
  if (isAgree) {
    const candidates = [
      `응, 나도 그렇게 생각해. 우리 생각이 통했네.`,
      `맞아, 그 말 진짜 공감돼.`,
      `그렇게 느끼는 거 완전 이해돼. 나도 비슷하게 느낄 때 많아.`,
    ];
    return { emotion: "신남", line: pickOne(candidates) };
  }

  // 부정 / 반대
  if (isDeny) {
    const candidates = [
      `그렇게 느낄 수도 있지. 다른 관점이 있다는 건 중요한 일이야.`,
      `아닌 것 같다고 말해줄 수 있는 용기도 멋진데?`,
      `그래, 네 입장에선 분명 그렇게 보일 수 있을 거야. 그 이야기도 더 들려줘.`,
    ];
    return { emotion: "경청", line: pickOne(candidates) };
  }

  // 헷갈림 / 모름
  if (isConfused) {
    const candidates = [
      `모르겠다는 말, 사실 꽤 용기 있는 말이야.`,
      `헷갈릴 땐, 내가랑 같이 하나씩 나눠서 정리해보자.`,
      `모르는 상태 그대로 있어도 괜찮지만, 궁금하다면 같이 파보자.`,
    ];
    return { emotion: "경청", line: pickOne(candidates) };
  }

  // ===== 기본 경청 (아무 카테고리에도 안 걸렸을 때) =====
  // 아무 카테고리에도 걸리지 않으면 null을 반환해서
  // "모르는 말" 처리 로직(경청 + 가르치기 제안)이 작동하도록 한다.
  return null;
}