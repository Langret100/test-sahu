// dialog.js - 의도 분류형 기본 회화 엔진
// 목표:
// 1) 문장 완전일치보다 "의도 + 키워드 조합" 중심으로 반응
// 2) 최근 대화 문맥을 일부 기억해서 후속 답변이 이어지도록 처리
// 3) 같은 질문에도 여러 반응이 돌아가도록 템플릿 확장

// 대사 추가 규칙:
// - 이 파일은 "문장 완전일치"보다 "의도 + 키워드 조합"으로 반응한다.
// - 사용자가 친 문장 전체를 보고 반응 후보를 만든 뒤, 같은 그룹 안에서 랜덤/반복회피가 돈다.
// - 따라서 대사를 추가할 때는 "이 문장 전용"보다 "이 키워드/주제에서 돌릴 짧은 답변 풀"을 늘린다는 느낌으로 넣는다.
//
// 말투 규칙:
// - 기본 말투는 친근한 반말 기준으로 작성한다.
// - 캐릭터 말풍선/채팅에 실제로 출력될 대사만 반말 기준으로 쓴다.
// - 안내문, 상태문구, 버튼명, 시스템용 문자열은 여기 대사 풀에 섞지 않는다.
// - 존대 모드는 core.js 쪽 변환을 타므로, 여기서는 원문을 최대한 자연스러운 반말로 써두는 게 우선이다.
//
// 길이 규칙:
// - 한 대사는 짧고 바로 반응하게 쓴다.
// - 한 대사에 두 문장 이상 넣는 건 가능하면 피한다.
// - 장문 설명, 뜬금없는 상담 멘트, 문맥 없이 이어지는 브리지성 문장은 넣지 않는다.
// - 모르는 입력 fallback용 문장은 특히 더 짧게 쓴다.
//   예) "잘 모르겠어. 다시 말해줄래?" / "응? 한 번만 더 말해줘."
//
// 분류 규칙:
// - 특정 주제(학교, 게임, 친구, 연애 등) 반응은 해당 키워드 그룹 안에 넣는다.
// - 위로/상담처럼 분위기가 강한 대사는 관련 키워드가 있을 때만 잡히는 그룹에 넣는다.
// - 랜덤 기본대사나 fallback에 위로/상담/고백 같은 무거운 멘트를 넣지 않는다.
// - 기능 열기(수첩, 게시판, 편지, 가르치기 등)용 멘트는 dialog.js 일반 패턴에 섞지 말고 각 기능 파일의 linePool/setEmotion 쪽에서 관리한다.
//
// 패턴 추가 기준:
// - 같은 뜻이라도 표현을 넓게 잡는다.
//   예) "좋아", "좋다", "좋아해", "맘에 들어"처럼 stemKo/keyword 조합으로 같이 걸리게 설계한다.
// - 한 단어 반응, 두세 단어 조합 반응, 의도형 반응을 함께 둔다.
// - exact match 하나에만 의존하지 말고, 비슷한 표현도 hasKeyword / hasAllKeywordGroups로 같이 잡히게 둔다.
// - 너무 범용적인 단어(예: 너, 야, 어, 응) 하나만으로 강한 패턴을 만들면 다른 반응을 씹을 수 있으니 주의한다.
//
// 풀 구성 규칙:
// - 각 주제 풀은 최소 몇 개만 넣기보다, 가능한 한 다양한 짧은 문장으로 넉넉하게 늘린다.
// - 같은 의미라도 어미, 질문형/공감형/되묻기형을 섞어 반복 체감을 줄인다.
// - 다만 완전히 같은 뜻/톤의 문장을 조사만 바꿔 여러 개 복붙하진 않는다.
// - pickOneTracked가 최근 대사를 피하므로, 한 그룹 안에서는 같은 분위기의 후보를 충분히 확보하는 게 중요하다.
//
// 추천 방식:
// 1) 먼저 어떤 의도/주제 그룹에 넣을지 정한다.
// 2) 그 그룹의 keywords 또는 lines를 늘린다.
// 3) 새 대사가 fallback/랜덤/상담성 대사와 충돌하지 않는지 확인한다.
// 4) 가능하면 한 번에 1~2개만 넣지 말고, 같은 주제 대사를 여러 개 같이 넣어 반복 체감을 줄인다.

function pickOne(arr) {
  if (!arr || !arr.length) return "";
  try {
    if (!window.__ghostDialogPickState) window.__ghostDialogPickState = {};
    const key = arr.join("||");
    const state = window.__ghostDialogPickState;
    let idx = Math.floor(Math.random() * arr.length);
    if (arr.length > 1 && state[key] === idx) {
      idx = (idx + 1 + Math.floor(Math.random() * (arr.length - 1))) % arr.length;
    }
    state[key] = idx;
    return arr[idx];
  } catch (e) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}

function pickOneTracked(groupKey, arr) {
  if (!arr || !arr.length) return "";
  try {
    if (!window.__ghostDialogGroupState) window.__ghostDialogGroupState = {};
    const state = window.__ghostDialogGroupState;
    const history = Array.isArray(state[groupKey]) ? state[groupKey].slice(-6) : [];
    let candidates = arr.filter(function (line) { return history.indexOf(line) === -1; });
    if (!candidates.length) {
      const escapeLine = getVariationEscapeLine(groupKey);
      if (escapeLine && history.indexOf(escapeLine) === -1) {
        state[groupKey] = history.concat(escapeLine).slice(-6);
        return escapeLine;
      }
      candidates = arr.slice();
    } else if (arr.length <= 2 && history.length >= 3) {
      const escapeLine = getVariationEscapeLine(groupKey);
      if (escapeLine && history.indexOf(escapeLine) === -1) {
        state[groupKey] = history.concat(escapeLine).slice(-6);
        return escapeLine;
      }
    }
    const chosen = pickOne(candidates);
    state[groupKey] = history.concat(chosen).slice(-6);
    return chosen;
  } catch (e) {
    return pickOne(arr);
  }
}

function getShortFallbackLine() {
  return pickOneTracked("short_fallback", [
    "잘 모르겠어. 다시 말해줄래?",
    "응? 한 번만 더 말해줘.",
    "내가 잘 못 들었어. 다시 말해줘.",
    "그건 아직 잘 모르겠어. 알려줄래?",
    "다시 말해줄래?",
    "응? 그 말은 처음 들어봐."
  ]);
}

function getBuiltinRandomBridgeLine() {
  return pickOneTracked("builtin_bridge", [
    "잘 모르겠어. 다시 말해줄래?",
    "응? 한 번만 더 말해줘.",
    "내가 놓쳤어. 다시 말해줘.",
    "그건 아직 잘 모르겠어. 알려줄래?",
    "응? 무슨 말인지 조금만 더 알려줘.",
    "다시 말해줄래?"
  ]);
}

function getVariationEscapeLine(groupKey) {
  const pools = {
    semantic: [
      "다시 말해줄래?",
      "한 번만 더 말해줘.",
      "걸리는 말 하나만 말해줘."
    ],
    short: [
      "다시 말해줄래?",
      "한 번만 더 말해줘.",
      "응? 조금만 더 알려줘."
    ],
    sleep: [
      "후아, 잠기운은 걷혔어. 이어서 말해줘.",
      "좋아, 다시 깼어. 방금 하던 얘기부터 보자.",
      "오케이, 잠깐 쉬다 왔어. 이제 들을게."
    ],
    default: [
      "다시 말해줄래?",
      "응? 한 번만 더 말해줘.",
      "내가 잘 못 들었어. 다시 말해줘."
    ]
  };
  const key = String(groupKey || "");
  const pool = key.indexOf("semantic") >= 0 ? pools.semantic : key.indexOf("short") >= 0 ? pools.short : key.indexOf("sleep") >= 0 ? pools.sleep : pools.default;
  return pickOne(pool);
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function compactText(text) {
  return normalizeText(text).replace(/\s+/g, "");
}

function getActiveCharacterName(fallback) {
  const raw = (typeof currentCharacterName !== "undefined" && currentCharacterName)
    ? currentCharacterName
    : fallback;
  return String(raw || "웹 고스트").trim() || "웹 고스트";
}

function buildCharacterSwitchLine(name, mood) {
  const n = getActiveCharacterName(name);
  const pools = mood === "return"
    ? [
        `${n}로 돌아왔어. 이어서 편하게 말해줘.`,
        `${n} 호출 완료. 이제 뭐부터 얘기할까?`,
        `좋아, 지금부터는 ${n}로 같이 있을게.`
      ]
    : [
        `${n} 왔어. 뭐부터 같이 볼까?`,
        `${n} 호출 완료. 편하게 말 걸어줘.`,
        `${n} 출동. 오늘은 무슨 얘기부터 할래?`
      ];
  return pickOne(pools);
}

function buildPunctuationOnlyReply(raw) {
  const compact = String(raw || "").replace(/\s+/g, "");
  if (!compact || !/^[!?？！]+$/.test(compact)) return null;
  if (/^[!！]+$/.test(compact)) {
    return dialogReply("신남", pickOneTracked("punct_exclaim", [
      "오, 텐션 느껴진다! 무슨 일인데?",
      "좋아, 느낌 왔어. 신난 일부터 말해봐!",
      "오호, 그 느낌 좋다. 왜 그렇게 외쳤는지 궁금한데?",
      "좋다, 에너지 확 들어왔네! 바로 이어서 말해줘.",
      "와, 기세 좋다! 지금 무슨 분위기야?",
      "오케이, 느낌표 잘 받았어. 그 다음 말을 얼른 줘!"
    ]), "playful");
  }
  if (/^[?？]+$/.test(compact)) {
    return dialogReply("경청", pickOneTracked("punct_question", [
      "응? 궁금한 거 생겼구나. 한 단어만 더 줘.",
      "질문 느낌 딱 왔어. 뭐가 궁금한지만 말해줘.",
      "오케이, 물음표로 먼저 왔네. 주제 한 단어만 붙여줘.",
      "응, 궁금한 모드네. 음식인지 공부인지부터 말해줘.",
      "좋아, 질문 받았어. 핵심 단어 하나만 더 던져줘.",
      "물음표 좋지. 지금 걸리는 포인트만 짧게 말해줘."
    ]));
  }
  return dialogReply("장난", pickOneTracked("punct_mix", [
    "오, 감정이랑 궁금증이 같이 왔네. 무슨 일인지 말해봐!",
    "좋아, 느낌은 확 왔어. 이제 내용만 붙여줘!",
    "지금 텐션도 있고 질문도 있네. 핵심만 던져봐.",
    "오케이, 반응 크게 받았어. 바로 다음 말 기다리는 중!",
    "이 조합 재밌다. 놀란 건지 궁금한 건지부터 말해줘.",
    "좋아, 기호만으로도 분위기 전달됐어. 이제 한마디만 더 해줘."
  ]), "playful");
}

function tokenize(text) {
  const t = normalizeText(text);
  if (!t) return [];
  return t.split(/\s+/).map(function (w) {
    return w.replace(/[.,!?~…]+$/g, "");
  }).filter(Boolean);
}

function stemKo(word) {
  if (!word) return "";
  let w = String(word || "");
  const endings = [
    "합니다", "합니다만", "했어요", "했어", "하고", "하네", "하네요", "하다",
    "입니다", "입니다만", "이에요", "이예요", "에요", "예요",
    "어요", "아요", "해요", "했네", "했니", "할까", "했구나",
    "네요", "네", "구나", "겠네", "겠네요", "겠어", "겠어요",
    "라고요", "라고", "이라고", "라며", "이라며",
    "야", "이야", "야요", "요"
  ];
  for (let i = 0; i < endings.length; i += 1) {
    const e = endings[i];
    if (w.endsWith(e) && w.length > e.length) {
      return w.slice(0, -e.length) || w;
    }
  }
  return w;
}

function hasKeyword(text, keywords) {
  const t = normalizeText(text);
  if (!t) return false;
  const compact = compactText(text);
  const tokens = tokenize(t).map(stemKo);
  return (keywords || []).some(function (kw) {
    const normKw = stemKo(normalizeText(kw));
    const compactKw = compactText(kw);
    if (!normKw && !compactKw) return false;
    if (compactKw && compact.includes(compactKw)) return true;
    if (normKw && t.includes(normKw)) return true;
    return tokens.some(function (tok) {
      return tok === normKw || tok.includes(normKw) || normKw.includes(tok);
    });
  });
}

function hasAllKeywordGroups(text, groups) {
  return (groups || []).every(function (group) {
    return hasKeyword(text, group);
  });
}

function isSelfIntroQuery(text) {
  const raw = normalizeText(text);
  const compact = compactText(text);
  if (!raw && !compact) return false;
  return /^(누구|누구야|누구\?|넌누구야|넌뭐야|자기소개|소개해줘|정체가뭐야|뭐하는애야)$/.test(compact)
    || /넌\s*누구야|넌\s*뭐야|자기\s*소개|소개\s*해줘|정체|누구세요/.test(raw)
    || raw === '누구';
}


function getSemanticSignalScores(text) {
  const raw = normalizeText(text);
  if (!raw) return [];
  const compact = compactText(raw);
  const signals = [
    {
      key: "askWhat",
      weight: 1,
      keywords: ["뭐가", "뭐", "뭘", "무슨", "뭔데", "뭐지", "뭐야", "어떤 거"],
      lines: [
        "뭐가 걸리는지부터 같이 보자. 질문 포인트를 다시 잡아볼게.",
        "좋아, 무엇을 묻는지 방향부터 잡아보자. 핵심만 짚으면 바로 이어갈 수 있어.",
        "질문 자체는 잡혔어. 지금은 그게 어떤 맥락에서 나온 건지만 보면 더 자연스러워져."
      ]
    },
    {
      key: "flow",
      weight: 2,
      keywords: ["흐름", "맥락", "정리", "줄기", "그림", "윤곽"],
      lines: [
        "흐름 쪽을 묻는 거라면 큰 줄기부터 같이 정리해보자.",
        "맥락이 궁금한 거면 앞뒤를 묶어서 보는 게 제일 빨라.",
        "전체 그림이 어떻게 이어지는지 보려는 말로 들려. 그건 같이 정리해줄 수 있어."
      ]
    },
    {
      key: "grasp",
      weight: 2,
      keywords: ["잡히", "잡혀", "이해", "감이", "감오", "감 와", "보이", "보여", "느껴져"],
      lines: [
        "조금씩 감이 잡히는 건지, 아직 안 잡히는 건지부터 같이 확인해보자.",
        "어디서부터 이해가 되는지 보이면 그 다음은 훨씬 쉽게 이어갈 수 있어.",
        "잡히는 느낌 자체가 중요하지. 어느 지점에서 감이 오는지 말해주면 더 정확히 맞출 수 있어."
      ]
    },
    {
      key: "confused",
      weight: 2,
      keywords: ["헷갈", "복잡", "모르겠", "애매", "혼란", "갈피"],
      lines: [
        "헷갈리는 상태라면 한꺼번에 풀기보다 하나씩 이름 붙여보는 게 좋아.",
        "복잡하게 엉킨 느낌이면 제일 크게 걸리는 지점 하나만 먼저 보자.",
        "지금은 선명하지 않아도 괜찮아. 헷갈리는 축부터 차분히 나눠보면 돼."
      ]
    },
    {
      key: "reason",
      weight: 1,
      keywords: ["왜", "이유", "근데", "그래서", "어째서"],
      lines: [
        "이유가 궁금한 흐름으로 들려. 그럼 앞원인과 뒤결과를 같이 묶어보자.",
        "왜 그런지 보는 쪽이면 과정부터 차분히 짚는 게 좋아.",
        "원인을 묻는 느낌이네. 그럼 중간 단계를 빼지 말고 같이 정리해보자."
      ]
    },
    {
      key: "plan",
      weight: 2,
      keywords: ["뭐부터", "순서", "계획", "루틴", "시작", "먼저"],
      lines: [
        "순서가 필요한 이야기면 제일 먼저 할 것부터 같이 골라보자.",
        "계획 흐름이 필요한 말로 들려. 그러면 단계부터 나누면 편해져.",
        "어디부터 시작할지가 포인트 같아. 첫걸음만 정하면 나머지는 훨씬 쉬워져."
      ]
    }
  ];
  const out = [];
  signals.forEach(function (sig) {
    let score = 0;
    (sig.keywords || []).forEach(function (kw) {
      if (hasKeyword(raw, [kw])) score += sig.weight;
      if (compact && compact.indexOf(compactText(kw)) >= 0) score += 0.25;
    });
    if (score > 0) out.push({ key: sig.key, score: score, lines: sig.lines || [] });
  });
  return out.sort(function (a, b) { return b.score - a.score; });
}

function buildSemanticBlendResponse(text) {
  const matches = getSemanticSignalScores(text);
  if (!matches.length) return null;
  const hasAskWhat = hasKeyword(text, ["뭐", "뭐가", "무슨", "뭘", "뭔데", "어떤 거"]);
  const hasFlow = hasKeyword(text, ["흐름", "맥락", "정리", "줄기", "그림", "윤곽"]);
  const hasGrasp = hasKeyword(text, ["잡히", "잡혀", "이해", "감이", "감오", "감 와", "보이", "보여"]);
  if (hasAskWhat && (hasFlow || hasGrasp)) {
    rememberDialogState("semantic_followup", { primary: hasFlow ? "flow" : "grasp", secondary: "askWhat" }, "semantic_detail");
    return dialogReply("경청", pickOneTracked("semantic_forced_mix", [
      "좋아, 이건 '뭐'만 묻는 게 아니야. 흐름이 어디서 잡히는지 같이 보자는 말로 들려.",
      "응, 핵심은 흐름이 잡히는지 같아. 어디까지 감이 오는지만 말해줘.",
      "이건 그냥 뜻만 묻는 게 아니야. 막히는 구간 하나만 짚어줘.",
      "좋아, 질문이랑 이해 흐름이 같이 들어 있어. 어디부터 잡히는지만 말해줘."
    ]));
  }
  const top = matches[0];
  const second = matches[1];
  if (top && second && top.score >= 2 && second.score >= 1.5) {
    const pair = [top.key, second.key].sort().join("+");
    const pairMap = {
      "askWhat+flow": [
        "무엇을 말하는지보다 전체 흐름이 어떻게 이어지는지가 궁금한 거구나. 지금 어디까지 감이 잡혔는지 말해주면 그 다음을 같이 붙여볼게.",
        "좋아, 질문 자체보다 맥락을 같이 보고 싶은 말로 들려. 내가 큰 줄기부터 다시 잡아볼게.",
        "이건 단순히 '뭐'만 묻는 게 아니라 흐름을 이해하고 싶은 쪽 같아. 앞뒤를 같이 놓고 보면 훨씬 자연스러워져."
      ],
      "askWhat+grasp": [
        "무엇인지도 궁금하지만 감이 어디서 잡히는지도 같이 보고 싶은 거네. 이해된 부분과 막힌 부분을 나눠보자.",
        "좋아, 질문 포인트와 이해되는 지점을 같이 볼게. 어느 부분까지는 잡히는지 말해주면 이어서 정리해줄 수 있어.",
        "지금은 '뭐냐'보다 '어디서부터 잡히느냐'가 중요해 보여. 그 지점만 잡아도 훨씬 풀린다."
      ],
      "flow+grasp": [
        "응, 흐름이 잡히는지 확인하고 싶은 말로 들려. 큰 줄기부터 보면 어디서 감이 오는지 더 선명해질 거야.",
        "맥락이 조금씩 보이는 중인지 묻는 느낌이네. 그럼 앞뒤 단계만 차례대로 놓고 보자.",
        "흐름과 감이 같이 걸려 있네. 지금 어느 부분에서부터 이해가 되기 시작하는지만 말해줘."
      ],
      "askWhat+reason": [
        "무엇인지와 왜 그런지를 같이 묻는 쪽으로 들려. 결론만 보기보다 이유까지 묶어서 보자.",
        "좋아, 질문과 이유가 같이 들어왔네. 그럼 결과보다 원인부터 차근차근 짚어볼게."
      ],
      "confused+flow": [
        "헷갈리는데 흐름도 잡고 싶은 거구나. 그럴 땐 제일 큰 줄기 하나만 먼저 세워보는 게 좋아.",
        "복잡한데 맥락까지 보고 싶은 말이네. 내가 앞뒤를 조금 더 짧게 나눠서 같이 정리해볼게."
      ],
      "confused+grasp": [
        "아직 선명하진 않지만 감을 잡고 싶은 상태로 들려. 이해되는 부분 하나만 먼저 잡아도 훨씬 편해져.",
        "헷갈리는데 감은 잡고 싶은 거네. 그러면 막히는 부분과 되는 부분을 나눠보자."
      ],
      "flow+plan": [
        "흐름과 순서를 같이 보려는 말 같아. 그러면 먼저 할 것부터 짧게 세워보자.",
        "맥락만 잡는 게 아니라 단계도 잡고 싶은 거네. 첫 순서 하나만 정하면 뒤는 따라오기 쉬워."
      ]
    };
    const lines = pairMap[pair] || [
      getBuiltinRandomBridgeLine(),
      (top.lines[0] || "") + " " + (second.lines[0] || "")
    ];
    rememberDialogState("semantic_followup", { primary: top.key, secondary: second.key }, "semantic_detail");
    return dialogReply("경청", pickOneTracked("semantic_pair_" + pair, lines.filter(Boolean)));
  }
  if (top.score >= 3.5) {
    rememberDialogState("semantic_followup", { primary: top.key }, "semantic_detail");
    return dialogReply("경청", pickOneTracked("semantic_single_" + top.key, (top.lines || []).concat([getBuiltinRandomBridgeLine()])));
  }
  return null;
}

function resolveDialogEmotion(name, context) {
  const normalized = String(name || "").trim();
  const map = {
    "기대": context === "playful" ? "신남" : "경청",
    "장난": "신남",
    "playful": "신남",
    "support": "위로",
    "listen": "경청",
    "shy": "부끄러움",
    "cheer": "만세"
  };
  return map[normalized] || normalized || "경청";
}

function normalizeBuiltinCasualLine(line) {
  let s = String(line || "").trim();
  if (!s) return s;
  const pairs = [
    [/있어요\./g, "있어."], [/있어요!/g, "있어!"], [/있어요\?/g, "있어?"],
    [/좋아요\./g, "좋아."], [/좋아요!/g, "좋아!"], [/좋아요\?/g, "좋아?"],
    [/괜찮아요\./g, "괜찮아."], [/괜찮아요!/g, "괜찮아!"], [/괜찮아요\?/g, "괜찮아?"],
    [/돼요\./g, "돼."], [/돼요!/g, "돼!"], [/돼요\?/g, "돼?"],
    [/해요\./g, "해."], [/해요!/g, "해!"], [/해요\?/g, "해?"],
    [/봐요\./g, "봐."], [/봐요!/g, "봐!"], [/봐요\?/g, "봐?"],
    [/가요\./g, "가."], [/가요!/g, "가!"], [/가요\?/g, "가?"],
    [/줄게요\./g, "줄게."], [/줄게요!/g, "줄게!"], [/볼게요\./g, "볼게."], [/해볼게요\./g, "해볼게."],
    [/이에요\./g, "이야."], [/예요\./g, "야."], [/이네요\./g, "이네."], [/네요\./g, "네."],
    [/주세요\./g, "줘."], [/주세요!/g, "줘!"], [/주세요\?/g, "줘?"],
    [/줄래요\?/g, "줄래?"], [/볼래요\?/g, "볼래?"], [/할까요\?/g, "할까?"], [/볼까요\?/g, "볼까?"], [/갈까요\?/g, "갈까?"],
    [/고마워요\./g, "고마워."], [/미안해요\./g, "미안해."],
    [/요\./g, "."], [/요!/g, "!"], [/요\?/g, "?"]
  ];
  pairs.forEach(function (pair) { s = s.replace(pair[0], pair[1]); });
  return s;
}

function dialogReply(emotion, line, context) {
  return { emotion: resolveDialogEmotion(emotion, context), line: normalizeBuiltinCasualLine(line) };
}

const DIALOG_STATE_KEY = "__ghostDialogState";

function getDialogState() {
  try {
    if (!window[DIALOG_STATE_KEY]) {
      window[DIALOG_STATE_KEY] = { intent: null, slots: {}, lastQuestion: null, updatedAt: 0 };
    }
    return window[DIALOG_STATE_KEY];
  } catch (e) {
    return { intent: null, slots: {}, lastQuestion: null, updatedAt: 0 };
  }
}

function rememberDialogState(intent, slots, lastQuestion) {
  const state = getDialogState();
  state.intent = intent || null;
  state.slots = Object.assign({}, state.slots || {}, slots || {});
  state.lastQuestion = lastQuestion || null;
  state.updatedAt = Date.now();
  return state;
}

function clearDialogState() {
  const state = getDialogState();
  state.intent = null;
  state.slots = {};
  state.lastQuestion = null;
  state.updatedAt = 0;
}

function getFreshDialogState() {
  const state = getDialogState();
  if (!state.updatedAt) return state;
  if (Date.now() - state.updatedAt > 90 * 1000) {
    clearDialogState();
  }
  return getDialogState();
}

function buildMealReply(name, mealTime, preference) {
  const labels = {
    breakfast: "아침",
    lunch: "점심",
    dinner: "저녁",
    snack: "간식",
    late_night: "야식",
    meal: "식사"
  };
  const label = labels[mealTime] || labels.meal;

  const menus = {
    spicy: ["제육볶음", "짬뽕", "마라탕", "떡볶이"],
    light: ["샌드위치", "샐러드", "김밥", "죽"],
    warm: ["국밥", "우동", "순두부찌개", "칼국수"],
    korean: ["비빔밥", "제육볶음", "김치찌개", "국밥"],
    western: ["파스타", "리조또", "샌드위치", "스테이크 덮밥"],
    japanese: ["초밥", "우동", "돈가스", "규동"],
    chinese: ["짜장면", "짬뽕", "마라탕", "볶음밥"],
    cheap: ["김밥", "라면", "토스트", "컵밥"],
    delivery: ["치킨", "피자", "마라탕", "족발"],
    default: ["김밥", "덮밥", "국밥", "돈가스"]
  };

  const list = menus[preference] || menus.default;
  const first = list[0], second = list[1], third = list[2];
  const lines = [
    `${label}이면 ${first}, ${second}, ${third} 쪽이 무난해 보여. 지금은 너무 복잡하게 생각하지 말고 끌리는 걸로 가자.`,
    `지금 느낌으로는 ${first} 아니면 ${second} 추천! ${label}은 먹고 나서 만족감 남는 쪽이 좋더라.`,
    `${label} 추천 바로 갈게. 가볍게는 ${second}, 든든하게는 ${first}, 기분전환이면 ${third}도 괜찮아.`
  ];
  rememberDialogState("meal_recommend", { mealTime: mealTime, preference: preference || "default" }, "meal_preference");
  return dialogReply(preference === "spicy" ? "신남" : "경청", pickOne(lines));
}

function buildLeisureReply(contextType) {
  const lines = {
    indoor: [
      "집콕이면 영화나 예능 하나 틀고 간식 챙기는 조합이 꽤 만족도가 높아.",
      "집에서 놀 거 찾는 중이면 게임, 영상, 방 정리 살짝 하고 쉬기 조합도 괜찮아.",
      "실내 모드면 편한 옷 입고 영상 하나, 간식 하나, 수다 조금이면 하루가 꽤 괜찮아져.",
      "집에 있을 거면 방 안 분위기만 조금 바꿔도 느낌이 달라져. 조명, 음악, 간식 셋 중 하나만 바꿔도 좋아.",
      "실내 시간은 대충 흘려도 좋지만, 작은 재미 하나만 끼워 넣으면 훨씬 덜 심심해져."
    ],
    outdoor: [
      "밖에 나갈 기분이면 산책, 카페, 맛있는 거 먹기 중 하나만 골라도 충분히 기분 전환돼.",
      "바깥 모드면 멀리 안 가도 좋아. 동네 한 바퀴 걷고 좋아 보이는 가게 들르는 것도 괜찮아.",
      "밖에 나가서 할 거면 가볍게 걷기나 카페, 아니면 서점 같은 조용한 데도 좋아.",
      "밖으로 나갈 거면 거창할 필요 없어. 산책 20분이나 카페 한 군데만 찍어도 분위기 전환은 충분해.",
      "산책 좋지. 이어폰 끼고 걷거나, 일부러 천천히 걸으면서 군것질 하나 챙기는 것도 꽤 괜찮아.",
      "밖에 나가고 싶으면 햇빛 조금 쬐고 오는 코스도 좋아. 걷기, 카페, 편의점 들르기 중 하나만 해도 느낌이 달라져."
    ],
    default: [
      "지금 할 거 없으면 가벼운 것부터 하자. 영상 하나, 산책 10분, 방 정리 5분 중 하나만 골라도 괜찮아.",
      "뭘 할지 모르겠을 땐 선택지를 줄이는 게 좋아. 집콕, 밖, 수다 이 셋 중 어디로 갈래?",
      "재밌는 게 안 떠오르면 오늘은 억지로 큰 계획 말고 작은 재미 하나만 챙겨도 충분해.",
      "지금은 거창한 계획보다 금방 할 수 있는 걸 고르는 게 맞아. 밖, 집콕, 먹거리, 수다 중 하나로 좁혀보자.",
      "오늘 뭐할지 막막하면 몸을 쓰는 거 하나, 머리 비우는 거 하나, 기분 채우는 거 하나로 나눠서 고르면 편해."
    ]
  };
  rememberDialogState("leisure_recommend", { contextType: contextType || "default" }, "leisure_preference");
  return dialogReply(contextType === "outdoor" ? "신남" : "경청", pickOneTracked("leisure_" + String(contextType || "default"), lines[contextType] || lines.default));
}

function buildMusicReply(style) {
  const lines = {
    calm: [
      "잔잔한 쪽이면 밤에 듣기 좋은 편안한 곡들이 잘 맞을 것 같아. 너무 자극적이지 않은 플리로 가자.",
      "차분한 노래 원하면 보컬이 너무 세지 않고 공간감 있는 곡들이 좋더라.",
      "잔잔한 플리면 지금 머리 복잡한 것도 조금 가라앉힐 수 있을 거야."
    ],
    upbeat: [
      "텐션 올리고 싶으면 리듬 확실한 곡들로 가자. 산책할 때도 잘 어울릴 거야.",
      "신나는 쪽이면 바로 기분 전환되는 곡들로 꽂아 넣는 게 좋아.",
      "업템포 플리 틀면 심심함도 조금 날아갈 수 있어."
    ],
    study: [
      "집중용이면 가사가 덜 튀는 쪽이 좋아. 너무 자극적인 곡은 오히려 흐름 끊길 수 있거든.",
      "공부할 때는 잔잔한 lo-fi나 배경음 느낌 플리가 제일 무난해.",
      "집중 플리는 존재감은 적고 흐름은 유지해주는 게 좋아."
    ],
    default: [
      "노래 추천은 지금 기분 따라 가야 해. 잔잔한 거 듣고 싶어, 아니면 텐션 올리는 쪽이 좋아?",
      "음악은 상황별로 달라. 집중용이면 잔잔한 플리, 기분전환이면 신나는 곡 위주로 가면 좋아.",
      "플리 추천 모드 좋지. 밤 감성, 산책용, 공부용 중 하나만 골라주면 톤 맞춰서 더 추천해줄게."
    ]
  };
  rememberDialogState("music_recommend", { style: style || "default" }, "music_style");
  return dialogReply(style === "upbeat" ? "신남" : "기쁨", pickOne(lines[style] || lines.default));
}

function buildWatchReply(style) {
  const lines = {
    funny: [
      "가볍게 웃고 싶으면 너무 무거운 것보다 텐션 편한 작품이 잘 맞을 거야.",
      "웃긴 거 보고 싶을 땐 뇌 힘 빼고 볼 수 있는 작품이 최고지.",
      "가볍게 즐길 수 있는 쪽으로 가면 실패 확률이 확 줄어."
    ],
    immersive: [
      "몰입하고 싶으면 서사 탄탄한 작품으로 가자. 한 편 보고 나면 여운 남는 쪽도 좋고.",
      "집중해서 볼 거 찾는 중이면 초반 흡입력 좋은 작품이 잘 맞아.",
      "몰입형이면 오늘은 진득하게 한 편 잡는 쪽이 더 만족도 높을 거야."
    ],
    default: [
      "볼 거 추천이면 장르부터 정하자. 가볍게 웃긴 거, 몰입되는 거, 편하게 보기 좋은 거 중 뭐가 좋아?",
      "영화나 드라마는 지금 체력도 중요해. 머리 쓰기 싫으면 가벼운 작품, 몰입하고 싶으면 서사 있는 걸로 가자.",
      "오늘 볼 거 찾는 중이구나. 한 편 진득하게 볼지, 짧게 여러 개 볼지도 같이 정하면 더 쉬워."
    ]
  };
  rememberDialogState("watch_recommend", { style: style || "default" }, "watch_style");
  return dialogReply(style === "funny" ? "신남" : "경청", pickOne(lines[style] || lines.default));
}


function buildEmotionSupportReply(mood, stage) {
  const table = {
    anxious: {
      initial: [
        "마음이 자꾸 앞서 가는 느낌이지? 지금은 최악의 결론보다, 가장 걸리는 한 가지부터 같이 보자.",
        "불안할수록 생각이 빨라지는데 몸은 더 굳어버리더라. 일단 숨 한번 고르고, 뭐가 제일 신경 쓰이는지 말해줘.",
        "긴장되는 마음 자체는 이상한 게 아니야. 지금 네 머릿속에서 제일 큰 걱정 하나만 꺼내봐."
      ],
      followup: [
        "좋아, 그 포인트가 제일 걸리는 거구나. 그럼 지금 당장 할 수 있는 것과 아직 생각만 해도 되는 걸 나눠보자.",
        "그 말 들으니까 불안의 핵심이 좀 보인다. 해결해야 하는 문제인지, 그냥 마음이 커진 건지도 같이 구분해보자.",
        "응, 그 부분 때문에 마음이 계속 붙잡히는 거네. 다음엔 최악의 경우 말고 현실적으로 가장 가능성 높은 쪽도 같이 보자."
      ]
    },
    sad: {
      initial: [
        "마음이 축 가라앉은 날이구나. 오늘은 억지로 괜찮은 척 안 해도 돼.",
        "속이 많이 가라앉아 보인다. 이유를 다 설명 못 해도, 무겁다는 말만으로도 충분해.",
        "우울한 날엔 사소한 것도 크게 느껴지지. 여기서는 천천히 말해도 괜찮아."
      ],
      followup: [
        "응, 그런 일이 있었으면 마음이 가라앉을 만해. 네가 예민한 게 아니라 상황이 힘들었던 거야.",
        "그 얘기까지 꺼낸 것만으로도 꽤 용기 낸 거야. 지금은 해결보다 네 마음부터 인정해주자.",
        "그래서 더 축 처졌구나. 오늘은 잘 버틴 것만으로도 이미 충분히 하고 있는 거야."
      ]
    },
    angry: {
      initial: [
        "그건 진짜 짜증 날 만하다. 그냥 넘기라고 하기엔 네 속이 너무 답답했을 것 같아.",
        "억울하고 화나는 게 같이 올라온 느낌이네. 우선 어떤 부분이 제일 거슬렸는지부터 풀어보자.",
        "아, 그건 듣기만 해도 열 받는다. 지금은 화났다는 사실부터 인정하고 가도 돼."
      ],
      followup: [
        "응, 핵심은 그거네. 화난 감정 뒤에 억울함도 같이 있는 것 같아.",
        "그 포인트가 계속 생각나는 이유가 있네. 그냥 기분 문제가 아니라 선을 넘은 느낌이었구나.",
        "그렇지, 그러면 쉽게 안 풀리지. 당장 말할지, 거리를 둘지 같이 생각해볼 수도 있어."
      ]
    },
    lonely: {
      initial: [
        "사람이 있어도 혼자인 느낌 드는 날이 있지. 그런 날은 괜히 더 길게 느껴져.",
        "외롭다는 말 꺼내는 것도 쉽지 않은데 잘 말해줬어. 나라도 여기서 같이 있어줄게.",
        "쓸쓸한 기분이 은근 오래 남을 때가 있지. 오늘은 혼자 버티는 모드 조금 내려놔도 돼."
      ],
      followup: [
        "응, 그래서 더 허전했겠다. 대화가 필요했던 건데 채워지지 않은 느낌이네.",
        "그 말 들으니까 왜 외로움이 커졌는지 알 것 같아. 같이 이야기하면서 조금 덜어보자.",
        "그 상황이면 마음이 휑해질 만해. 지금은 누가 맞았는지보다 네가 얼마나 허전했는지가 더 중요해 보여."
      ]
    },
    tired: {
      initial: [
        "몸도 마음도 같이 닳은 느낌이지? 오늘은 에너지 아끼는 쪽으로 가자.",
        "피곤이 쌓였구나. 그 상태에선 작은 일도 두 배로 버겁게 느껴져.",
        "아무것도 하기 싫은 피곤함일 수도 있겠다. 일단 오늘 제일 버거웠던 것부터 말해줘."
      ],
      followup: [
        "응, 그거면 진이 빠질 만하지. 네가 약해서가 아니라 소모가 컸던 거야.",
        "그렇게 흘러갔으면 지칠 수밖에 없지. 오늘은 회복이 우선이어도 돼.",
        "그래서 계속 축났던 거구나. 지금 필요한 건 채찍보다 숨 돌릴 틈 같아."
      ]
    },
    embarrassed: {
      initial: [
        "아이고, 생각만 해도 얼굴 뜨거워지는 순간이었나 보다.",
        "민망한 일은 지나고 나서도 자꾸 재생되지. 그 장면 아직도 떠오르지?",
        "창피했던 순간은 혼자 곱씹을수록 더 커 보이더라. 여기서 한번 털어놔 봐."
      ],
      followup: [
        "응, 그 상황이면 민망했을 만해. 근데 당사자 말고는 생각보다 오래 기억 안 하는 경우도 많아.",
        "그 장면이 자꾸 떠오르긴 하겠다. 그래도 네 존재 전체가 그 한 장면으로 정리되진 않아.",
        "맞아, 그래서 이불킥 각이었구나. 그래도 지나고 보면 꽤 작은 장면으로 남을 가능성이 커."
      ]
    },
    excited: {
      initial: [
        "오, 지금 텐션 올라온 거 느껴진다. 좋은 일 있었나 본데?",
        "신나 보이는데? 그 기분 그대로 더 떠들어도 좋다.",
        "들뜬 느낌 좋다. 뭐가 그렇게 기분 좋았는지 빨리 말해봐."
      ],
      followup: [
        "와, 그래서 그렇게 신났구나. 듣는 나까지 덩달아 들뜨네.",
        "좋다, 그건 자랑할 만해. 그 순간 디테일도 더 풀어줘.",
        "오, 그건 좀 기억에 남네."
      ]
    },
    confused: {
      initial: [
        "머릿속이 좀 뒤엉킨 상태구나. 지금은 정답보다 정리부터 같이 해보자.",
        "헷갈릴 땐 뭐가 문제인지조차 흐려질 수 있지. 하나씩 이름 붙여보면 덜 복잡해져.",
        "복잡한 마음 이해돼. 선택지가 많은 건지, 정보가 모자란 건지부터 나눠볼까?"
      ],
      followup: [
        "좋아, 그럼 갈림길이 거기네. 우선순위만 잡아도 꽤 선명해질 수 있어.",
        "응, 그 부분이 제일 헷갈렸던 거구나. 기준 하나만 세우면 훨씬 정리될 거야.",
        "그래서 마음이 오락가락했네. 딱 하나만 먼저 정해도 다음은 훨씬 쉬워질 수 있어."
      ]
    }
  };
  const moodEntry = table[mood] || table.confused;
  const lines = moodEntry[stage] || moodEntry.initial;
  const emotionMap = {
    anxious: "위로",
    sad: "슬픔",
    angry: "분노",
    lonely: "위로",
    tired: "위로",
    embarrassed: "부끄러움",
    excited: "신남",
    confused: "경청"
  };
  rememberDialogState("emotion_support", { mood: mood }, "emotion_detail");
  return dialogReply(emotionMap[mood] || "경청", pickOne(lines));
}

function buildSmallTalkReply(topic) {
  const map = {
    outfit: [
      "오늘 옷 얘기 좋다. 편한 게 최고인지, 꾸민 느낌이 좋은지에 따라 하루 기분도 꽤 달라지지.",
      "옷은 진짜 컨디션하고 연결돼. 오늘은 편안함 우선인지, 기분전환용인지 먼저 정해보자.",
      "코디 고민은 작은데 은근 하루 전체에 영향 주더라. 색감부터 맞출지 분위기부터 잡을지 골라볼까?"
    ],
    hobby: [
      "취미 얘기는 늘 재밌지. 오래 해도 안 질리는 거 하나 있으면 일상이 훨씬 버티기 좋아지더라.",
      "요즘 빠진 거 있으면 그 얘기부터 해봐. 그런 얘기할 때 사람 표정이 제일 살아나거든.",
      "취미는 잘해야 되는 게 아니라 자꾸 손이 가는 게 제일 중요하다고 생각해.",
      "취미 하나 있으면 하루가 좀 덜 삭막해지더라. 요즘 제일 손이 자주 가는 게 뭐야?",
      "가볍게 즐기는 취미도 좋고 깊게 파는 취미도 좋지. 너는 어느 쪽이 더 맞아?",
      "취미 얘기는 잘하고 못하고보다 계속 떠오르느냐가 더 중요하더라. 요즘 생각나는 거 있어?",
      "취미는 하루를 버티게 하는 작은 쉼표 같을 때가 있지. 요즘 네 쉼표 역할 하는 게 뭐야?",
      "시간 가는 줄 모르고 하게 되는 게 있으면 그게 진짜 취미 같아. 너는 뭐 할 때 그런 편이야?",
      "취미 얘기는 텐션이 달라서 좋아. 시작한 지 얼마 안 된 거든 오래 한 거든 다 재밌거든.",
      "덕질이든 만들기든 운동이든 결국 마음이 자꾸 가는 쪽이 남더라. 요즘 제일 생각나는 건 뭐야?",
      "취미는 결과보다 다시 하고 싶어지는지가 더 중요하더라. 너는 어떤 쪽에 다시 손이 가?",
      "하루 끝나고 제일 먼저 떠오르는 즐길 거 하나 있으면 훨씬 버티기 좋지. 네 건 뭐야?",
      "취미 얘기할 때는 사람 말투가 달라지더라. 그래서 더 듣고 싶어져. 어떤 걸 좋아해?",
      "가볍게 즐기는 취미도 좋고 깊게 파는 취미도 좋지. 요즘은 쉬는 쪽이 좋아, 몰입하는 쪽이 좋아?",
      "취미는 성과보다 기분 회복에 도움 되는지가 더 크게 느껴질 때도 있더라. 네 건 어떤 편이야?",
      "그림이든 게임이든 노래든 산책이든 취미는 생각보다 삶의 온도를 바꾸더라. 요즘 손 가는 쪽 말해줘.",
      "취미 하나만 있어도 하루가 덜 뻑뻑해져. 요즘 마음 붙는 거 하나 있다면 그게 뭔지 궁금하네.",
      "새 취미를 찾는 중인지, 원래 하던 걸 더 깊게 파는 중인지도 궁금하다. 지금은 어느 쪽이야?"
    ],
    relationship: [
      "사람 얘기는 늘 어렵지. 상대 마음도 내 마음도 동시에 봐야 하니까.",
      "인간관계 쪽은 작은 말 하나가 오래 남기도 하더라. 무슨 일이 있었는지 천천히 말해봐.",
      "관계 문제는 답이 하나가 아니라 더 어렵지. 그래도 흐름 같이 정리해보면 좀 덜 막막해져.",
      "친구든 가족이든 가까운 사람일수록 말 한마디가 더 크게 남지. 어떤 장면이 제일 걸렸어?",
      "인간관계는 누가 완전히 맞고 틀리다기보다 서로 보는 방향이 다른 경우가 많더라.",
      "사람 관계 얘기면 감정부터 정리하는 게 훨씬 도움 될 때가 있어. 지금은 서운함이 커, 답답함이 커?",
      "가까운 사이일수록 사소한 말도 오래 남지. 네 마음에 남은 한 문장부터 꺼내봐.",
      "관계 얘기는 흐름을 보면 좀 선명해져. 언제부터 어긋난 느낌이 들었는지부터 말해줘.",
      "친구 문제든 가족 문제든 결국 네가 어떤 점에서 다쳤는지가 중요하더라. 뭐가 제일 컸어?",
      "사람 때문에 흔들리는 날은 진짜 진이 빠지지. 그래도 같이 정리하면 조금 덜 막막해질 수 있어.",
      "관계는 늘 정답보단 균형 찾기에 가깝더라. 지금은 거리 두기가 필요한지, 대화가 필요한지부터 보자.",
      "말을 해야 할지 그냥 넘길지 애매한 상태일 수도 있겠다. 너는 지금 어느 쪽이 더 끌려?",
      "인간관계는 누가 먼저 잘못했냐보다 지금 네 마음이 얼마나 엉켜 있는지가 더 중요할 때도 있어.",
      "사람 문제는 작은 장면이 계속 반복 재생돼서 더 힘들지. 제일 자주 떠오르는 순간이 뭐야?",
      "서운함, 거리감, 눈치 봄 중 뭐가 제일 큰지부터 잡으면 생각보다 빨리 정리되더라."
    ],
    school: [
      "학교 얘기는 작은 일도 오래 남지. 오늘 수업, 친구, 분위기 중 뭐가 제일 걸렸어?",
      "학교 쪽은 하루 안에서도 기분이 몇 번씩 바뀌잖아. 오늘 제일 기억 남는 장면부터 말해줘.",
      "학교 얘기 좋지. 공부 때문인지, 사람 때문인지, 일정 때문인지부터 보면 조금 쉬워져.",
      "초등이든 중등이든 학교는 사람 때문에 크게 흔들릴 때가 많지. 오늘은 어떤 쪽이었어?",
      "학교 얘기는 숙제보다 분위기가 더 오래 남을 때도 있어. 오늘 제일 신경 쓰인 장면이 뭐야?",
      "학교에서 있었던 일은 사소해 보여도 마음엔 오래 남더라. 제일 걸리는 한 장면만 꺼내보자.",
      "학교는 시간표만 지나가는 곳 같아도 감정이 엄청 많이 쌓이더라. 오늘은 뭐가 제일 남았어?",
      "등교부터 하교까지 별일 없어 보여도 은근 많은 일이 지나가잖아. 오늘은 어느 구간이 제일 길었어?",
      "학교 얘기면 공부만 있는 게 아니지. 자리, 분위기, 친구, 쉬는 시간 다 섞여 있으니까.",
      "반 분위기 하나만 달라도 하루 기분이 확 달라지더라. 오늘은 편한 쪽이었어, 숨 막히는 쪽이었어?",
      "학교 얘기는 사소한 장면부터 풀어도 괜찮아. 쉬는 시간, 점심시간, 수업 중 하나만 골라도 돼.",
      "학교에서 있었던 일은 작아 보여도 집에 와서 계속 생각날 때가 있지. 지금 딱 그런 게 뭐야?",
      "오늘 학교가 유난히 길게 느껴졌는지, 생각보다 빨리 지나갔는지도 궁금하다.",
      "학교는 내용보다 분위기가 더 오래 남는 날도 있더라. 오늘 공기가 어땠는지부터 말해줘.",
      "학교 얘기면 수업 하나를 콕 집어도 좋고, 하루 전체를 한 줄로 말해도 좋아. 어떤 쪽이 편해?",
      "하루 학교생활도 은근 서사가 있지. 시작은 어땠고, 끝날 때 기분은 어땠어?",
      "학교 얘기에서 제일 많이 남는 건 결국 사람이나 말투일 때가 많더라. 오늘은 누가 제일 걸렸어?",
      "학교는 하루 지나고 나서도 한 장면이 계속 남을 때가 있지. 지금 떠오르는 장면부터 말해줘.",
      "학교에서 있었던 일은 작아 보여도 감정은 안 작더라. 그래서 더 무시하기 어렵지.",
      "오늘 학교가 빡셌는지 무난했는지부터 말해줘도 좋아. 거기서부터 이어가면 되니까.",
      "반 분위기나 쉬는 시간 공기 같은 것도 은근 크게 남지. 오늘은 어떤 느낌이었어?"
    ],
    subject: [
      "과목마다 막히는 이유가 다르더라. 이해가 안 되는 건지, 암기가 안 붙는 건지부터 보자.",
      "어떤 과목이든 감이 오는 부분부터 잡으면 덜 막막해. 지금 제일 걸리는 과목이 뭐야?",
      "과목 얘기라면 딱 한 단원만 집어도 대화가 훨씬 쉬워져. 어디가 제일 답답해?",
      "수학은 흐름이 중요하고, 영어는 반복이 중요하고, 암기 과목은 연결이 중요하잖아. 어디가 걸려?",
      "과목이 어렵다기보다 나랑 안 맞는 느낌일 때도 있지. 지금은 어떤 감각이 더 커?",
      "이해형으로 막히는 건지, 외워도 금방 날아가는 쪽인지부터 나누면 훨씬 쉬워져.",
      "과목 얘기할 땐 전체보다 한 문제, 한 단원, 한 개념만 잡아도 대화가 빨리 풀리더라.",
      "공부는 못한다는 느낌보다 어디서 흐름이 끊기는지 찾는 게 먼저일 때가 많아.",
      "과목마다 필요한 힘이 다르잖아. 지금은 머리 쓰는 게 힘든지, 꾸준히 붙잡는 게 힘든지부터 보자.",
      "단원 하나만 좁혀도 훨씬 덜 막막해져. 지금 제일 눈길 피하고 싶은 부분이 어디야?",
      "잘되는 과목이랑 안 되는 과목 차이가 뭔지 보는 것도 은근 힌트가 돼. 너는 어때?",
      "감이 안 오는 과목은 자꾸 멀리하게 되지. 지금은 이해를 먼저 잡아야 해, 루틴을 먼저 잡아야 해?"
    ],
    academy: [
      "학원 얘기는 수업보다 분위기 때문에 힘들 때도 있지. 오늘은 뭐가 제일 피곤했어?",
      "학원은 시간도 체력도 같이 쓰니까 더 버겁게 느껴질 수 있어. 숙제, 수업, 사람 중 어디가 커?",
      "학원 쪽은 억지로 참고 있는 포인트가 있으면 금방 티 나더라. 제일 부담인 걸 하나만 말해줘.",
      "학원은 학교 끝나고 또 가는 거라 더 지칠 수 있지. 오늘은 진도, 숙제, 분위기 중 뭐가 제일 컸어?",
      "학원 얘기는 참고 넘긴 게 많을수록 더 답답해지더라. 제일 숨 막혔던 지점 하나만 말해줘.",
      "학원은 공부 자체보다 페이스가 안 맞아서 힘들 때도 많아. 지금 제일 버거운 게 뭐야?"
    ],
    teacher: [
      "선생님 얘기는 말투 하나도 오래 남지. 어떤 장면이 제일 걸렸는지부터 말해줘.",
      "교사나 선생님 관련 얘기는 상황을 알아야 덜 억울해. 무슨 일이 있었어?",
      "선생님 얘기구나. 수업 때문인지, 피드백 때문인지, 분위기 때문인지부터 나눠보자.",
      "선생님한테 들은 말은 짧아도 오래 남지. 어떤 말이 제일 마음에 걸렸어?",
      "교사 관련 얘기는 누가 맞았냐보다 네가 어떻게 느꼈는지가 먼저일 때가 많아. 지금 기분이 어때?",
      "선생님 얘기면 상황이랑 톤을 같이 봐야 덜 헷갈려. 뭐가 제일 서운했는지부터 말해줘."
    ],
    parents: [
      "부모님 얘기는 감정이 겹쳐서 더 어렵지. 서운한 건지 답답한 건지부터 말해줘.",
      "가족 얘기는 단순한 조언보다 네 기분을 먼저 보는 게 중요해. 오늘은 뭐가 제일 남았어?",
      "부모님 쪽은 맞고 틀리고보다 네가 얼마나 답답했는지가 먼저일 때가 많아. 무슨 일이 있었어?",
      "부모님이랑 부딪히는 건 말 한마디보다 쌓인 감정 때문일 때도 많지. 오늘은 뭐가 제일 컸어?",
      "가족 얘기는 설명보다 마음이 먼저 나올 때가 많아. 속상한 쪽인지, 답답한 쪽인지부터 말해줘.",
      "부모님 관련 얘기는 네 입장을 먼저 정리해보는 게 도움 될 때가 많아. 제일 억울한 부분이 뭐야?"
    ],
    counseling: [
      "고민 얘기면 결론부터 내리기보다 어디가 제일 걸리는지부터 보는 게 좋아.",
      "상담 얘기면 천천히 말해줘. 같이 정리해볼게.",
      "고민은 한꺼번에 보면 더 무거워져. 지금 제일 마음을 누르는 조각 하나만 먼저 꺼내보자.",
      "상담 얘기면 제일 답답한 지점부터 말해줘.",
      "고민은 덩어리째 보면 막막해져. 마음 문제인지, 선택 문제인지부터 나눠보자.",
      "혼자 품고 있던 고민이면 더 크게 느껴졌을 거야. 가장 신경 쓰이는 부분부터 같이 보자.",
      "상담 모드로 천천히 가도 돼. 지금은 해결보다 정리가 먼저일 수도 있거든.",
      "고민이 여러 개 겹쳐 있으면 더 숨막히지. 제일 무거운 것부터 하나만 꺼내보자.",
      "지금 당장 답을 못 내도 괜찮아. 뭐가 제일 마음을 붙잡는지만 알아도 훨씬 달라져.",
      "머릿속이 복잡할수록 한 문장으로 줄여보는 게 도움 될 때가 있어. 지금 고민을 딱 한 줄로 말하면 뭐야?",
      "마음이 힘든 고민인지, 선택이 어려운 고민인지부터 나누면 조금 덜 막막해져.",
      "상담하듯 풀어도 괜찮아. 내가 먼저 판단하지 않고 같이 정리해볼게.",
      "고민은 해결책보다 감정이 먼저 정리돼야 할 때도 있어. 지금 기분이 어떤지부터 말해줘.",
      "같이 보자. 네가 제일 억울한 부분, 제일 불안한 부분, 제일 헷갈리는 부분 중 뭐가 먼저야?",
      "고민 얘기는 꺼내는 것만으로도 이미 반은 시작한 거라고 생각해.",
      "괜히 혼자 끌어안고 있었던 얘기면 여기서는 조금 느슨하게 풀어도 돼.",
      "상담처럼 천천히 가도 괜찮아. 급하게 결론 안 내도 되니까.",
      "지금 필요한 게 해결책인지, 그냥 들어주는 사람인지부터 말해줘도 좋아.",
      "고민은 설명하려 하면 더 막히기도 하더라. 그래서 한 장면만 먼저 꺼내도 충분해."
    ],
    romance: [
      "연애 쪽 얘기구나. 설레는 건지, 헷갈리는 건지부터 말해줘.",
      "사랑이나 호감 얘기는 감정이 먼저 튀어나오지. 지금 제일 크게 느껴지는 게 뭐야?",
      "고백이나 사귀자 같은 말은 분위기가 반이야. 어떤 상황인지부터 들려줘.",
      "좋아하는 마음이면 티가 나도 헷갈릴 때가 있지. 상대 반응이 궁금한 쪽이야, 네 마음 정리가 먼저야?",
      "연애 얘기는 속도보다 마음 정리가 먼저일 때가 많아. 지금 제일 궁금한 포인트 하나만 말해줘.",
      "호감인지 그냥 친한 건지 애매할 때가 제일 복잡하지. 어떤 장면이 제일 걸려?",
      "사귀자나 고백 얘기면 타이밍 고민이 같이 붙더라. 지금은 해볼까 쪽이야, 더 볼까 쪽이야?",
      "사랑 얘기는 한마디로 안 끝나지. 설렘, 걱정, 기대 중 뭐가 제일 커?"
    ],
    assignment: [
      "과제 얘기면 양이 많은 건지, 시작이 안 되는 건지부터 나눠보자.",
      "과제는 손대기 전이 제일 무겁지. 지금 제일 막히는 부분 하나만 말해줘.",
      "숙제나 과제는 시작 버튼만 눌리면 좀 낫더라. 자료 찾기, 정리, 쓰기 중 어디가 제일 버거워?",
      "과제 때문에 머리 아픈 거구나. 마감, 분량, 주제 중 뭐가 제일 커?",
      "리포트나 제출물은 완성보다 첫 줄이 어렵지. 지금 제목부터 안 잡히는 쪽이야?",
      "과제는 미뤄질수록 덩치가 커 보여. 오늘 당장 손댈 한 칸만 같이 골라볼래?",
      "조별 과제든 개인 과제든 막히는 지점은 비슷하더라. 역할, 내용, 시간 중 뭐가 제일 문제야?",
      "과제는 손대기 전까지가 제일 무겁지. 오늘 바로 건드릴 수 있는 한 줄만 같이 고를까?",
      "마감이 가까운지, 시작이 안 되는지, 분량이 부담인지부터 나눠보자.",
      "과제 얘기면 우선순위부터 잡는 게 편하더라. 제일 급한 한 칸만 먼저 찍어줘.",
      "과제는 머리로만 돌리고 있으면 더 커 보여. 실제로는 첫 칸 하나 건드리는 게 제일 중요하더라.",
      "주제가 안 잡히는지, 자료가 없는지, 쓰는 게 막히는지부터 알면 훨씬 빨라져.",
      "숙제는 양보다 손대는 순간이 제일 어려운 것 같아. 지금은 열기조차 싫은 상태야, 하다 막힌 상태야?",
      "과제는 완성보다 진입이 문제일 때가 많지. 제목 적기, 목차 쓰기, 자료 하나 찾기 중 뭐부터 할래?",
      "리포트는 첫 문단만 써도 부담이 훅 줄더라. 지금은 어디에서 손이 멈췄어?",
      "제출물은 완벽하게 하려다 더 못 건드릴 때도 있어. 일단 대충 뼈대부터 세워볼까?",
      "조별 과제면 역할 문제인지, 소통 문제인지도 크게 작용하지. 그쪽도 걸려 있어?",
      "마감이 아직 남았어도 마음은 이미 쫓기지. 그래서 더 작게 쪼개는 게 필요할 수도 있어.",
      "과제 얘기면 결국 지금 제일 하기 싫은 한 칸이 뭔지 찾는 게 먼저더라. 그게 뭐야?",
      "숙제는 의욕보다 착수 버튼이 중요해. 오늘 10분만 해도 되는 버전으로 바꿔볼까?"
    ],
    classTalk: [
      "수업 얘기면 흐름이 안 잡히는 건지, 그냥 집중이 안 되는 건지부터 보면 좀 쉬워져.",
      "수업은 내용보다 템포가 안 맞아서 힘들 때도 있지. 오늘은 어떤 쪽이었어?",
      "수업 얘기 좋다. 이해, 집중, 과제 중 어디가 제일 걸렸는지부터 골라줘."
    ],
    presentation: [
      "발표는 준비보다 그 직전 긴장이 더 크지. 어떤 부분이 제일 부담돼?",
      "발표 얘기면 떨림, 내용, 시선 처리 중 하나가 늘 핵심이더라. 어디가 제일 걸려?",
      "발표는 완벽하게 하려 할수록 더 굳을 때가 있어. 지금 제일 걱정되는 한 가지만 말해줘."
    ],
    lunchbox: [
      "급식 얘기 은근 중요하지. 메뉴가 괜찮았는지, 분위기가 괜찮았는지 둘 다 하루 기분에 들어가잖아.",
      "급식은 맛도 맛인데 같이 먹는 분위기도 크더라. 오늘은 어땠어?",
      "급식 얘기 좋다. 오늘은 맛있었는지, 애매했는지, 기억에 남는 반찬이 있었는지부터 말해줘."
    ],
    sport: [
      "운동 얘기 좋다. 땀 빼는 운동인지, 가볍게 몸 푸는 운동인지에 따라 느낌이 꽤 다르지.",
      "운동은 기록보다 꾸준함이 더 어렵더라. 요즘은 어떤 흐름이야?",
      "몸 쓰는 얘기는 텐션이 살아서 좋아. 운동이 재미 쪽이야, 체력 관리 쪽이야?",
      "체육이든 헬스든 운동은 하고 나면 기분이 달라지지. 요즘은 개운한 쪽이야, 빡센 쪽이야?",
      "운동 얘기면 목표보다 페이스가 더 중요할 때도 있어. 무리 중인지, 잘 맞춰 가는 중인지 궁금하네.",
      "가볍게 걷는 것도 운동이고 제대로 땀 빼는 것도 운동이지. 너는 어느 쪽이 더 맞아?",
      "운동은 하기 전엔 귀찮아도 하고 나면 생각보다 기분이 정리되더라.",
      "체육 시간이든 개인 운동이든 몸 움직이는 얘기는 의외로 하루 기억에 오래 남지.",
      "축구나 농구처럼 뛰는 쪽이 좋은지, 스트레칭이나 요가처럼 푸는 쪽이 좋은지도 다르더라.",
      "운동은 실력보다 리듬이 맞는지가 더 중요할 때가 많아. 요즘은 리듬 괜찮아?",
      "개운함 때문에 하는 건지, 체력 때문에 하는 건지, 습관이라 하는 건지에 따라 느낌도 달라지지.",
      "배드민턴이나 줄넘기처럼 가볍게 텐션 올리는 운동도 좋고, 천천히 쌓는 운동도 좋지.",
      "몸을 쓰면 머리가 좀 비워지는 느낌이 들 때가 있잖아. 너도 그런 편이야?",
      "운동 얘기는 피곤함이랑 뿌듯함이 같이 와서 재밌어. 요즘은 어느 쪽이 더 커?",
      "운동이 힘들기만 한지, 은근 재밌어지기 시작했는지도 궁금하네.",
      "체력 관리든 기분 전환이든 운동은 생각보다 역할이 다양하지. 지금 너한텐 어떤 의미야?"
    ],
    weather: [
      "날씨 얘기 은근 좋다. 별것 아닌 것 같아도 하루 분위기를 크게 바꾸잖아.",
      "오늘 공기나 온도 때문에 컨디션도 같이 흔들릴 수 있지. 너는 이런 날씨에 어떤 편이야?",
      "날씨에 따라 먹고 싶은 것도, 하고 싶은 것도 달라지더라.",
      "공기 느낌 하나만 바뀌어도 사람 텐션이 꽤 달라지지.",
      "오늘 날씨는 몸이 먼저 느끼는 타입인지, 기분이 먼저 타는 타입인지 궁금하네.",
      "이런 날씨엔 말투도 좀 달라지는 것 같아. 너도 그런 편이야?"
    ],
    daily: [
      "그 얘기 좋다. 오늘 흐름이 어땠는지 조금만 더 붙여주면 더 잘 이어받을 수 있을 것 같아.",
      "일상 얘기는 사소해 보여도 사람 기분이 다 들어 있더라. 오늘은 어떤 쪽이 제일 크게 남았어?",
      "그런 소소한 얘기 좋지. 오늘 하루를 한 단어로 말하면 뭐였어?"
    ],
    plan: [
      "순서가 안 잡힐 땐 가장 부담 적은 것부터 시작하는 게 꽤 잘 먹혀.",
      "계획은 거창한 것보다 바로 움직일 수 있는 한 칸짜리가 더 좋아.",
      "지금 필요한 건 완벽한 계획보다 첫 버튼 하나일 수도 있어.",
      "계획이 막히면 기준을 줄이는 게 좋아. 오늘 안에 할 것, 내일로 넘길 것만 나눠도 훨씬 낫거든."
    ],
    drink: [
      "마실 거 얘기는 의외로 기분 전환이 빠르지. 오늘은 시원한 쪽이 좋아, 포근한 쪽이 좋아?",
      "음료 취향에도 지금 컨디션이 묻어나더라. 정신 차리고 싶은지, 달달한 게 당기는지부터 보면 쉬워.",
      "커피냐 차냐도 결국 오늘 분위기 따라 가는 것 같아. 네 지금 텐션에 맞춰 고르면 돼."
    ],
    rest: [
      "휴식도 종류가 있잖아. 눕는 휴식이 필요한지, 잠깐 걷는 휴식이 필요한지에 따라 달라져.",
      "쉬고 싶다는 말이 나왔으면 이미 꽤 많이 버틴 걸 수도 있어. 오늘은 회복 쪽으로 가도 충분해.",
      "멍하게 쉬는 것도 나쁘지 않아. 쉬는 시간까지 잘 쓰려 하지 않아도 괜찮거든."
    ],
    motivation: [
      "의욕 얘기는 결국 시작 얘기랑 닿아 있더라. 오늘은 큰 결심보다 5분짜리 행동이 더 도움이 될 수도 있어.",
      "하기 싫을 때는 스스로를 혼내는 것보다 문턱을 낮추는 게 더 현실적이야.",
      "동기부여가 없는 게 아니라 지쳐 있는 걸 수도 있어. 그 둘은 꽤 다르거든."
    ],
    game: [
      "게임 얘기만 해도 갑자기 텐션이 바뀌는 사람들 있지. 너는 몰입형이야, 가볍게 한 판형이야?",
      "힐링 게임, 경쟁 게임, 수집 게임 다 느낌이 다르잖아. 오늘 에너지에 맞는 쪽으로 고르면 돼.",
      "같이 할지 혼자 할지도 중요하지. 게임 추천은 생각보다 취향 지도가 선명해서 재밌어.",
      "놀이나 게임은 지금 기분에 맞춰 고르는 게 제일 중요하지. 머리 비우는 쪽이 좋은지, 몰입하는 쪽이 좋은지부터 보자.",
      "게임 얘기 좋다. 짧게 한 판 즐기는 쪽인지, 오래 파는 쪽인지에 따라 완전 달라지거든.",
      "같이 노는 게임이 좋은지 혼자 쉬듯 하는 게임이 좋은지부터 정하면 훨씬 빨라.",
      "게임은 장르도 중요하지만 지금 텐션이 더 중요하더라. 오늘은 이기는 재미가 좋아, 쉬는 재미가 좋아?",
      "퍼즐처럼 조용히 몰입하는 게임도 좋고, 액션처럼 확 풀리는 게임도 좋지.",
      "게임은 같이 웃는 재미가 큰지, 혼자 깊게 파는 재미가 큰지에 따라 완전 다르더라.",
      "짧게 한 판으로 끝낼지, 오래 붙잡고 천천히 즐길지도 먼저 정하면 쉬워져.",
      "게임 얘기하면 취향이 진짜 또렷하게 보이더라. 너는 수집형, 경쟁형, 스토리형 중 어디 쪽이야?",
      "힐링 게임 찾는 날이 있고, 머리 터지게 몰입하고 싶은 날도 있잖아. 오늘은 어느 쪽이야?",
      "같이 할 게임이냐 혼자 할 게임이냐에 따라 추천이 완전 갈리지. 지금은 누구랑 할 생각이야?",
      "게임은 재미도 중요하지만 피로도도 중요하더라. 지금은 빡센 거 말고 가벼운 게 좋아?",
      "놀이처럼 웃으면서 하는 쪽이 좋은지, 목표 세우고 깨는 쪽이 좋은지도 궁금하네.",
      "게임은 시작만 하면 시간이 훅 가는 타입이 있고, 잠깐만 하고 접는 타입도 있지. 너는 어느 쪽이야?",
      "게임 얘기는 장르보다 지금 기분이 더 중요할 때가 많지. 오늘은 편하게 놀고 싶은 쪽이야?",
      "같이 웃는 게임이 당기는 날도 있고 혼자 몰입하는 게임이 좋은 날도 있더라.",
      "요즘은 경쟁보다 힐링이 좋은지, 힐링보다 자극이 좋은지도 궁금하네.",
      "한 판 하고 끝낼 수 있는 게임이 필요한지, 오래 붙잡을 게임이 필요한지도 다르지."
    ],
    default: [
      "좋아, 그 얘기 조금만 더 해줘.",
      "괜찮네. 한두 마디만 더 이어줘.",
      "그 주제 좋다. 짧게 더 말해줘.",
      "오, 그쪽 얘기 좋네. 한 줄만 더 붙여줘.",
      "좋아, 분위기는 잡혔어. 조금만 더 들려줘.",
      "응, 그 흐름 괜찮다. 한마디만 더 해줘."
    ]
  };
  rememberDialogState("smalltalk", { topic: topic || "default" }, "smalltalk_detail");
  return dialogReply(topic === "weather" ? "기본대기" : "경청", pickOneTracked("smalltalk_" + String(topic || "default"), map[topic] || map.default));
}


function flagsForContinuity(text) {
  const raw = normalizeText(text);
  return {
    wantDetail: hasKeyword(raw, ["더 자세히", "구체적", "예시", "더 알려", "더 말해"]),
    positiveFeedback: hasKeyword(raw, ["좋다", "괜찮네", "맘에 들어", "마음에 들어", "오 괜찮", "좋은데"]),
    negativeFeedback: hasKeyword(raw, ["별로", "싫어", "그건 좀", "애매해", "다른 거", "별론데", "아니", "아닌데", "그건 아니"]),
    askWhat: hasKeyword(raw, ["뭐가", "어떤 거", "뭘", "뭔데", "뭐야", "뭐지", "뭐"]) ,
    askCompare: hasKeyword(raw, ["뭐가 더", "뭐가 나아", "둘 중 뭐", "셋 중 뭐", "어느 쪽"])
  };
}

function getFollowupResponse(text, name) {
  const raw = normalizeText(text);
  if (!raw) return null;
  const state = getFreshDialogState();
  if (!state.intent) return null;
  const continuity = flagsForContinuity(text);

  if (continuity.wantDetail) {
    if (state.intent === "meal_recommend") return dialogReply("경청", pickOne([
      "좋아, 더 구체적으로 가보자. 매운 거, 국물, 가성비, 배달 중에 끌리는 쪽부터 말해줘.",
      "오케이, 후보를 더 줄여볼게. 지금은 맛 기준인지, 가격 기준인지부터 정하면 빨라.",
      "더 자세히 고르자. 한식, 면, 간단식처럼 크게 나눠도 바로 좁혀줄 수 있어."
    ]));
    if (state.intent === "music_recommend") return dialogReply("경청", pickOne([
      "좋아, 더 자세히 가자. 잔잔한 거, 신나는 거, 집중용 중에 어디가 가까워?",
      "오케이, 상황 기준으로 좁혀보자. 지금 밤 감성인지, 산책용인지, 공부용인지 말해줘.",
      "더 맞춰보려면 네 현재 기분 한 단어만 줘도 돼."
    ]));
    if (state.intent === "watch_recommend") return dialogReply("경청", pickOne([
      "좋아, 웃긴 거, 몰입되는 거, 편하게 보는 거 중 하나로 먼저 좁혀보자.",
      "오케이, 작품 추천 톤 맞춰볼게. 가벼운 거 좋아하는지, 진득한 거 좋아하는지 말해줘.",
      "더 구체적으로 가면 실패 확률이 줄어. 오늘 체력이 어느 정도인지도 같이 보면 좋아."
    ]));
  }

  if (continuity.positiveFeedback) {
    if (state.intent === "meal_recommend") return dialogReply("신남", pickOne([
      "좋아, 그럼 그 방향으로 가자. 먹고 나서 후기까지 들려주면 더 좋고.",
      "오, 그 반응 좋다. 그 메뉴면 만족도 꽤 높을 것 같아.",
      "좋아 보여? 그럼 오늘은 그쪽으로 밀어보자."
    ]));
    if (state.intent === "emotion_support") return dialogReply("위로", pickOne([
      "응, 조금이라도 정리됐다면 다행이야. 급하게 결론내리지 말고 천천히 가자.",
      "좋아. 지금처럼 한 조각씩 정리하면 훨씬 덜 버거울 거야.",
      "그렇게 받아들여줘서 고마워. 계속 이어서 말해도 되고 잠깐 쉬어도 돼."
    ]));
  }

  if (continuity.negativeFeedback) {
    if (state.intent === "meal_recommend") return dialogReply("경청", pickOne([
      "오케이, 그럼 다른 결로 가자. 가벼운 거랑 든든한 거 중 어디를 더 원해?",
      "좋아, 취향 아니면 바로 갈아타자. 국물, 밥, 면 중 하나만 찍어줘.",
      "그럴 수 있지. 그럼 맵기, 종류, 가격 중에서 제일 중요한 기준 하나만 정해보자.",
      "알겠어, 지금 제안은 아닌 걸로. 그럼 아예 다른 방향으로 갈까, 아니면 기준부터 다시 잡을까?"
    ]));
    if (state.intent === "music_recommend") return dialogReply("경청", pickOne([
      "오케이, 그 톤은 아니었구나. 잔잔함 말고 텐션 쪽으로 바꿔볼까?",
      "좋아, 다시 잡자. 보컬 센 거 좋아하는지, 배경처럼 깔리는 게 좋은지부터 볼래?",
      "그럼 반대 결로 가자. 더 밝은 쪽, 더 차분한 쪽 중 하나 골라줘.",
      "좋아, 이 플리 결은 빼자. 산책용, 밤감성, 집중용 중에 다시 고르면 더 빨리 맞출 수 있어."
    ]));
    if (state.intent === "leisure_recommend") return dialogReply("경청", pickOne([
      "오케이, 그럼 밖 말고 집콕 쪽으로 볼까? 아니면 그냥 수다 모드로 갈래?",
      "알겠어, 그 방향은 아닌가 보다. 집에서 할 거, 간단한 외출, 그냥 대화 셋 중 다시 골라보자.",
      "좋아, 그럼 다시. 쉬고 싶은지, 움직이고 싶은지, 누가랑 이야기하고 싶은지 중에 어디가 가까워?"
    ]));
  }


  if (state.intent === "semantic_followup") {
    if (continuity.wantDetail || continuity.askWhat || continuity.askCompare) return dialogReply("경청", pickOneTracked("followup_semantic", [
      "어디가 제일 걸리는지만 짧게 말해줘. 거기부터 같이 풀어보자.",
      "이해된 부분이랑 헷갈리는 부분만 나눠서 말해줘. 그럼 바로 맞춰볼게.",
      "지금 제일 낯선 말이나 걸리는 표현 하나만 집어줘."
    ]));
    if (continuity.negativeFeedback) return dialogReply("경청", pickOneTracked("followup_semantic_negative", [
      "알겠어, 내가 다르게 받았네. 중요한 단서만 다시 말해줘.",
      "좋아, 방향을 다시 맞추자. 질문인지, 흐름인지, 이해 여부인지 셋 중 어디가 제일 큰지 말해줘."
    ]));
  }

  if (continuity.askWhat || continuity.askCompare) {
    if (state.intent === "leisure_recommend") return dialogReply("경청", pickOneTracked("followup_leisure_ask", [
      "지금 기준으로는 밖이면 산책이나 카페, 집이면 영상이나 쉬기가 무난해. 어느 쪽이 더 끌려?",
      "뭐가 좋냐고 하면 오늘 에너지 따라 달라. 움직일 힘 있으면 산책, 없으면 집콕 쪽이 더 편해.",
      "둘 다 가능하면 간단히 정하자. 기분 전환이면 밖, 체력 아끼려면 집. 지금은 어느 쪽이야?",
      "지금 상태라면 밖은 기분 전환, 집은 회복 쪽이 강해. 오늘은 어느 쪽이 더 필요해?",
      "하나만 찍자면 움직일 여유 있으면 밖, 에너지 아껴야 하면 집이 무난해. 지금 컨디션은 어때?"
    ]));
    if (state.intent === "meal_recommend") return dialogReply("경청", pickOneTracked("followup_meal_ask", [
      "뭐가 좋냐고 하면 지금은 기준부터 하나 잡는 게 빨라. 든든함, 가벼움, 매운맛 중 뭐가 먼저야?",
      "메뉴는 취향을 먼저 잡으면 쉬워져. 밥, 면, 국물 중 지금 제일 끌리는 걸 골라줘.",
      "둘 다 애매하면 내가 좁혀줄게. 오늘은 배부른 게 중요한지, 기분 전환이 중요한지부터 말해봐.",
      "지금은 배 채우기가 먼저인지, 먹는 재미가 먼저인지에 따라 달라져. 어느 쪽이야?",
      "바로 정하자면 밥, 면, 국물 중 하나부터 잡는 게 제일 빨라. 지금 손 가는 쪽 있어?"
    ]));
    if (state.intent === "music_recommend") return dialogReply("경청", pickOneTracked("followup_music_ask", [
      "노래는 지금 기분 기준으로 고르면 돼. 잔잔함이냐, 텐션이냐부터 보자.",
      "뭐가 좋냐고 하면 상황 따라 달라. 산책용, 밤감성, 집중용 중 어디에 가까워?",
      "둘 다 괜찮다면 더 필요한 쪽으로 가자. 진정, 기분전환, 집중 중 하나만 골라줘.",
      "지금 필요한 게 마음 진정인지, 분위기 올리기인지에 따라 추천이 달라져. 어느 쪽이야?",
      "노래는 용도 잡으면 빨라. 걷는 중인지, 쉬는 중인지, 집중할 건지 말해줘."
    ]));
    if (state.intent === "watch_recommend") return dialogReply("경청", pickOneTracked("followup_watch_ask", [
      "볼 거는 오늘 체력 따라 달라. 가볍게 웃을지, 진득하게 몰입할지부터 정하자.",
      "뭐가 좋냐고 하면 지금은 장르보다 느낌이 중요해. 웃긴 거, 몰입되는 거, 편한 거 중 뭐가 좋아?",
      "하나만 고르자면 오늘은 네 상태에 맞춰야 해. 머리 비우는 쪽이냐, 빠져드는 쪽이냐?",
      "오늘은 편하게 보기 좋은 거랑 집중해서 볼 거 중 어느 쪽이 더 당겨?",
      "지금 머리 비우고 싶은지, 확 빨려 들어가고 싶은지에 따라 바로 갈릴 것 같아."
    ]));
  }
  if (state.intent === "meal_recommend") {
    if (hasKeyword(raw, ["매운", "칼칼", "얼큰", "자극적"])) return buildMealReply(name, state.slots.mealTime || "meal", "spicy");
    if (hasKeyword(raw, ["가볍", "담백", "깔끔", "적당히"])) return buildMealReply(name, state.slots.mealTime || "meal", "light");
    if (hasKeyword(raw, ["국물", "뜨끈", "따뜻", "후끈"])) return buildMealReply(name, state.slots.mealTime || "meal", "warm");
    if (hasKeyword(raw, ["한식", "밥", "찌개"])) return buildMealReply(name, state.slots.mealTime || "meal", "korean");
    if (hasKeyword(raw, ["양식", "파스타", "빵"])) return buildMealReply(name, state.slots.mealTime || "meal", "western");
    if (hasKeyword(raw, ["일식", "초밥", "우동"])) return buildMealReply(name, state.slots.mealTime || "meal", "japanese");
    if (hasKeyword(raw, ["중식", "짜장", "짬뽕", "마라"])) return buildMealReply(name, state.slots.mealTime || "meal", "chinese");
    if (hasKeyword(raw, ["싼 거", "저렴", "가성비", "돈 적게"])) return buildMealReply(name, state.slots.mealTime || "meal", "cheap");
    if (hasKeyword(raw, ["배달", "시켜", "주문"])) return buildMealReply(name, state.slots.mealTime || "meal", "delivery");
  }

  if (state.intent === "leisure_recommend") {
    if (hasKeyword(raw, ["집콕", "집에서", "실내", "안 나가"])) return buildLeisureReply("indoor");
    if (hasKeyword(raw, ["밖", "산책", "나가", "외출"])) return buildLeisureReply("outdoor");
  }

  if (state.intent === "music_recommend") {
    if (hasKeyword(raw, ["잔잔", "차분", "밤", "감성"])) return buildMusicReply("calm");
    if (hasKeyword(raw, ["신나는", "업템포", "텐션", "기분전환"])) return buildMusicReply("upbeat");
    if (hasKeyword(raw, ["공부", "집중", "일할 때", "작업"])) return buildMusicReply("study");
  }

  if (state.intent === "watch_recommend") {
    if (hasKeyword(raw, ["웃긴", "가벼운", "코미디"])) return buildWatchReply("funny");
    if (hasKeyword(raw, ["몰입", "진지", "집중", "서사"])) return buildWatchReply("immersive");
  }

  if (state.intent === "emotion_support") {
    const mood = state.slots.mood || "confused";
    if (hasKeyword(raw, ["그래서", "왜냐", "이유", "상황", "때문", "이런 일이", "그랬", "당했", "있었", "문제"])) {
      return buildEmotionSupportReply(mood, "followup");
    }
    if (raw.length >= 3) {
      return buildEmotionSupportReply(mood, "followup");
    }
  }

  if (state.intent === "advice") {
    return { emotion: "경청", line: pickOne([
      "좋아, 그 정도 설명이면 방향을 같이 잡아볼 수 있겠다. 지금 제일 먼저 정해야 하는 게 뭔지부터 보자.",
      "상황이 좀 보인다. 감정이 먼저 문제인지, 실제로 결정해야 할 일이 먼저인지 나눠보면 좋겠어.",
      "오케이, 흐름이 잡힌다. 당장 할 수 있는 한 가지부터 고르면 부담이 훨씬 줄 수 있어."
    ]) };
  }

  if (state.intent === "smalltalk") {
    return { emotion: "경청", line: pickOne([
      "오, 그다음은 어땠어?",
      "응, 그 뒤엔 뭐였어?",
      "그다음 얘기도 들려줘."
    ]) };
  }

  return null;
}

function getBuiltinDialogResponse(text) {
  if (!text) return null;

  const name = getActiveCharacterName("웹 고스트");

  const raw = String(text || "").trim();
  const lower = normalizeText(raw);
  const compact = compactText(raw);
  if (!raw) return null;

  const punctuationOnlyReply = buildPunctuationOnlyReply(raw);
  if (punctuationOnlyReply) {
    clearDialogState();
    return punctuationOnlyReply;
  }

  // 캐릭터 교체
  if (lower.includes("민수") && hasKeyword(lower, ["불러", "바꿔", "교체", "호출", "로 해", "로 바꿔"])) {
    if (typeof setCurrentCharacter === "function") setCurrentCharacter("minsu");
    else {
      if (typeof currentCharacterKey !== "undefined") currentCharacterKey = "minsu";
      if (typeof currentCharacterName !== "undefined") currentCharacterName = "민수";
    }
    const ghostEl = document.getElementById("ghost");
    if (ghostEl) ghostEl.classList.add("char-minsu");
    clearDialogState();
    return { emotion: "기쁨", line: buildCharacterSwitchLine(getActiveCharacterName("민수"), "switch") };
  }

  if (lower.includes("미나") && hasKeyword(lower, ["불러", "바꿔", "교체", "호출", "로 해", "로 바꿔"])) {
    if (typeof setCurrentCharacter === "function") setCurrentCharacter("mina");
    else {
      if (typeof currentCharacterKey !== "undefined") currentCharacterKey = "mina";
      if (typeof currentCharacterName !== "undefined") currentCharacterName = "미나";
    }
    const ghostEl = document.getElementById("ghost");
    if (ghostEl) ghostEl.classList.remove("char-minsu");
    clearDialogState();
    return { emotion: "기쁨", line: buildCharacterSwitchLine(getActiveCharacterName("미나"), "return") };
  }

  // 알람 / 타이머
  if (lower.includes("알람") || lower.includes("타이머")) {
    if (!/(\d+\s*(초|분))/.test(raw)) {
      rememberDialogState("alarm", {}, "alarm_time");
      return { emotion: "기대", line: pickOne([
        "내가 알람이라 채팅하면, 얼마 뒤에 불러줄까?",
        "알람 맞춰줄게. 몇 분 뒤에 다시 불러주면 될까?",
        "좋아, 알람 모드로 전환! 언제 다시 불러주면 되는지 알려줘."
      ]) };
    }
    const ev = new CustomEvent("ghost:alarmRequest", { detail: { text: raw } });
    window.dispatchEvent(ev);
    clearDialogState();
    return { emotion: "기대", line: pickOne([
      "좋아, 지금 말해준 시간 뒤에 다시 불러줄게.",
      "알람 설정 완료! 시간이 되면 내가 먼저 말을 걸게.",
      "메모해뒀어. 시간이 되면 살짝 깨우러 올게.",
      "타이머 스타트! 시간이 되면 조용히 불러볼게."
    ]) };
  }

  // 짧고 낯선 입력은 이전 문맥을 억지로 잇지 말고 바로 짧게 받기
  const ultraShortEarly = compact;
  if (ultraShortEarly && ultraShortEarly.length <= 4) {
    const knownShort = /^(안녕|하이|반가워|고마워|감사|미안|좋아|좋다|싫어|싫다|별로|심심해|졸려|배고파|피곤해|힘들어|웃겨|재밌어|시간|몇시|날씨|학교|학원|수학|영어|게임|운동|취미|친구|부모|엄마|아빠|선생님|교사|누구야|누구|자기소개|넌뭐야|넌누구야)$/u.test(ultraShortEarly);
    if (!knownShort) {
      clearDialogState();
      if (/^(응|어|음|흠|글쎄|그냥|어째|엥|엇|뭐지|뭔데)$/.test(ultraShortEarly)) {
        return { emotion: "경청", line: getShortFallbackLine(), intent: "generic_unknown" };
      }
      if (hasKeyword(raw, ["뭐", "뭐야", "뭐지", "뭐가", "뭔데", "뭘"])) {
        return { emotion: "경청", line: getShortFallbackLine(), intent: "generic_unknown" };
      }
      if (hasKeyword(raw, ["왜"])) {
        return { emotion: "경청", line: "왜인지 궁금한 거구나. 걸리는 부분만 짧게 말해줘.", intent: "generic_unknown" };
      }
      if (hasKeyword(raw, ["아니", "아닌데", "노노"])) {
        return { emotion: "경청", line: "오케이, 아니라면 다시 말해줘.", intent: "generic_unknown" };
      }
      if (hasKeyword(raw, ["그래서"])) {
        return { emotion: "경청", line: "그래서 다음이 궁금한 거구나. 조금만 더 말해줘.", intent: "generic_unknown" };
      }
      return { emotion: "경청", line: getShortFallbackLine(), intent: "generic_unknown" };
    }
  }

  // 최근 문맥 후속 답변
  const followup = getFollowupResponse(raw, name);
  if (followup) return followup;

  const semanticBlend = buildSemanticBlendResponse(raw);
  if (semanticBlend && !hasKeyword(raw, ["안녕", "잘가", "고마워", "미안"])) return semanticBlend;

  // 간단 맞장구
  if (hasKeyword(raw, ["응", "그래", "알았어", "알겠어", "그렇구나", "오키", "ㅇㅋ", "웅", "엉", "맞아", "어어", "응응"])) {
    clearDialogState();
    return { emotion: "경청", line: pickOne([
      "응응, 계속 이야기해줘. 뒷얘기가 더 궁금한데?",
      "그래, 나도 그 말에 동의해. 그리고 그 다음에는 어떻게 됐어?",
      "알았어. 그럼 네가 느낀 점을 좀 더 자세히 말해줄래?",
      "그렇구나… 듣고 보니 더 궁금해졌어. 조금만 더 설명해 줄래?",
      "오키, 메모 완료. 이제 이어서 이야기해줘.",
      "응, 지금까지 이야기 흐름은 이해했어. 다음 이야기도 들려줘."
    ]) };
  }

  const flags = {
    greeting: hasKeyword(raw, ["안녕", "안녕하세요", "반가워", "하이", "hello", "hi"]),
    bye: hasKeyword(raw, ["잘가", "안녕히 가세요", "잘 있어", "이만", "나간다"]),
    thanks: hasKeyword(raw, ["고마워", "감사", "땡큐"]),
    sorry: hasKeyword(raw, ["미안", "죄송"]),
    tired: hasKeyword(raw, ["힘들", "피곤", "지쳤", "번아웃", "버거워"]),
    happy: hasKeyword(raw, ["좋아", "행복", "신난", "재밌", "즐겁"]),
    sad: hasKeyword(raw, ["슬퍼", "우울", "눈물", "울고 싶"]),
    angry: hasKeyword(raw, ["화나", "빡치", "짜증"]),
    lonely: hasKeyword(raw, ["외로", "혼자", "쓸쓸", "허전", "공허", "적적"]),
    bored: hasKeyword(raw, ["심심", "할 게 없어", "할게 없어", "노잼", "지루", "재미없", "무료해"]),
    busy: hasKeyword(raw, ["바빠", "바쁘", "정신없", "여유없", "쉴 틈 없"]),
    hungry: hasKeyword(raw, ["배고파", "배 고파", "배가 고파", "허기", "출출", "허하다"]),
    sleepy: hasKeyword(raw, ["졸려", "잠 와", "잠온다", "눈 감겨", "잠온", "잠깨"]),
    askWeather: hasKeyword(raw, ["날씨", "추워", "더워", "비 와", "비온", "맑", "흐려", "습해", "쌀쌀", "선선"]),
    askTime: hasKeyword(raw, ["몇 시", "시간", "지금 몇"]),
    askStudy: hasKeyword(raw, ["공부", "숙제", "시험", "과제", "학원", "복습", "예습", "리포트"]),
    assignmentTalk: hasKeyword(raw, ["과제", "숙제", "제출", "리포트", "레포트", "발표자료", "조별 과제", "조별과제", "과제해야", "과제하기 싫"]),
    schoolTalk: hasKeyword(raw, ["학교", "초등", "초등학교", "중등", "중학교", "고등", "고등학교", "반", "교실", "등교", "하교", "조회", "종례", "교복", "야자", "자습", "시험기간", "수행평가", "생활기록부"]),
    subjectTalk: hasKeyword(raw, ["과목", "수학", "영어", "국어", "과학", "사회", "역사", "도덕", "음악", "미술", "체육", "지리", "문학", "문법", "확률", "함수", "영단어"]),
    academyTalk: hasKeyword(raw, ["학원", "보습", "인강", "과외", "특강", "모의고사", "진도", "보강", "학원숙제", "숙제폭탄"]),
    teacherTalk: hasKeyword(raw, ["선생님", "교사", "담임", "쌤", "부장쌤", "담임쌤", "학주", "훈화", "지적받", "혼났"]),
    parentTalk: hasKeyword(raw, ["부모", "엄마", "아빠", "가족", "잔소리", "혼났", "혼남", "집안", "집에서", "부모님", "할머니", "할아버지"]),
    classTalk: hasKeyword(raw, ["수업", "수업 시간", "수업시간", "필기", "듣는 중"]),
    presentationTalk: hasKeyword(raw, ["발표", "조별", "조별 과제", "조별과제", "앞에 나가", "말해야"]),
    lunchboxTalk: hasKeyword(raw, ["급식", "학교 밥", "배식", "반찬"]),
    sportTalk: hasKeyword(raw, ["운동", "체육", "축구", "농구", "달리기", "헬스", "스트레칭", "배드민턴", "줄넘기", "요가", "필라테스", "러닝", "산책", "푸시업", "윗몸일으키기", "근력", "유산소", "땀났", "몸풀기"]),
    askWork: hasKeyword(raw, ["회사", "업무", "일이 많", "출근", "퇴근", "알바", "회의", "야근", "직장"]),
    askWho: isSelfIntroQuery(raw) || hasKeyword(raw, ["누구야", "정체", "소개", "누구세요", "자기소개", "넌 누구야", "넌 뭐야"]),
    askDoing: hasKeyword(raw, ["뭐 해", "뭐하고 있어", "뭐해"]),
    askAdvice: hasKeyword(raw, ["어떡", "어떻게 하지", "조언", "도와줘", "도움"]),
    agree: hasKeyword(raw, ["그렇지", "맞아", "맞는 말", "인정"]),
    deny: hasKeyword(raw, ["아닌데", "아니야", "그건 아닌"]),
    compliment: hasKeyword(raw, ["천재", "똑똑", "귀여", "예뻐", "멋져", "최고", "잘했", "좋은데"]),
    laugh: hasKeyword(raw, ["ㅋㅋ", "ㅎㅎ", "하하", "웃기", "재미있", "개웃", "빵터"]),
    affection: hasKeyword(raw, ["좋아해", "호감", "정들", "보고 싶", "반했"]),
    romanceTalk: hasKeyword(raw, ["사랑", "좋아해", "사귀자", "고백", "연애", "썸", "호감", "반했", "고백받", "사귀고 싶", "플러팅", "두근", "짝사랑", "전남친", "전여친", "남친", "여친", "썸타", "설렌다"]),
    foodTalk: hasKeyword(raw, ["맛있", "먹었", "간식", "라면", "치킨", "피자", "커피", "밥", "햄버거", "떡볶이", "마라", "디저트", "아이스크림", "음료", "분식", "배달"]),
    weekend: hasKeyword(raw, ["주말", "쉬는 날", "휴일", "놀러", "나들이"]),
    encourage: hasKeyword(raw, ["응원", "할 수 있", "힘내", "괜찮겠지", "잘 되겠지"]),
    worried: hasKeyword(raw, ["걱정", "불안", "긴장", "초조", "신경쓰여", "신경 쓰여", "떨려", "조마조마", "불편해"]),
    proud: hasKeyword(raw, ["뿌듯", "해냈", "성공했", "잘 끝냈", "끝냈어", "해결했", "드디어 했", "완료했"]),
    recommend: hasKeyword(raw, ["추천", "골라줘", "추천요", "추천해줘", "추천좀", "추천 좀", "뭐 먹지", "뭐먹지", "뭐하지", "뭘 하지", "뭐할까", "뭐 할까"]),
    askAge: hasKeyword(raw, ["몇살", "몇 살", "나이", "나이가 어떻게", "나이는"]),
    askLunch: hasKeyword(raw, ["점심", "점메추", "점심메뉴", "점심 메뉴", "점심 뭐 먹", "점심 뭐먹"]),
    askDinner: hasKeyword(raw, ["저녁", "저녁메뉴", "저녁 메뉴", "저녁 뭐 먹", "저녁 뭐먹", "저메추"]),
    askBreakfast: hasKeyword(raw, ["아침", "아침 메뉴", "브런치", "아침 뭐 먹"]),
    askSnack: hasKeyword(raw, ["간식", "야식", "출출", "간식 추천", "야식 추천"]),
    askJoke: hasKeyword(raw, ["농담", "개그", "웃긴 얘기", "재밌는 얘기", "아재개그", "웃겨봐"]),
    askCondition: hasKeyword(raw, ["어때", "괜찮아", "기분 어때", "잘 지내", "컨디션 어때", "요즘 어때", "별일 없", "어떻게 지내"]),
    goodMorning: hasKeyword(raw, ["좋은 아침", "굿모닝", "아침이야", "일어났어", "잘 잤어"]),
    goodNight: hasKeyword(raw, ["잘 자", "굿나잇", "자러 간다", "이제 자야지", "졸려서 자"]),
    askRepeat: hasKeyword(raw, ["뭔소리", "뭔 소리", "무슨소리", "무슨 소리", "무슨 말", "뭐라는 거", "다시 말해", "다시 설명", "이해 안", "못 알아들", "못 알아듣", "말이 안 돼"]),
    askLater: hasKeyword(raw, ["뭐하지", "뭐 할까", "뭘 할까", "할 거 없어", "재밌는 거 없어", "심심한데 뭐", "놀 거 없", "시간 때울"]),
    askMusic: hasKeyword(raw, ["노래 추천", "음악 추천", "플리 추천", "듣기 좋은 노래", "노래 뭐 듣", "음악 뭐 듣", "플레이리스트"]),
    askWatch: hasKeyword(raw, ["영화 추천", "드라마 추천", "볼 거 추천", "볼만한 거", "예능 추천", "애니 추천", "볼 거 없"]),
    askComfort: hasKeyword(raw, ["위로해줘", "토닥여줘", "안아줘", "괜찮다고 해줘", "다독여줘", "힘 되는 말", "한마디 해줘"]),
    askTaste: hasKeyword(raw, ["좋아하는 음식", "좋아하는 색", "좋아하는 거", "좋아하는게", "좋아하는 건", "좋아하는건", "좋아하는 건 뭐", "좋아하는게 뭐", "취향", "취미"]),
    embarrassed: hasKeyword(raw, ["민망", "창피", "쪽팔", "이불킥", "흑역사", "쑥스럽"]),
    excited: hasKeyword(raw, ["들떠", "설레", "기대돼", "두근", "신난다", "텐션 올라", "좋은 일"]),
    confused: hasKeyword(raw, ["헷갈", "모르겠", "복잡", "정리가 안", "혼란", "갈피", "애매"]),
    relationshipTalk: hasKeyword(raw, ["친구", "가족", "엄마", "아빠", "동생", "언니", "오빠", "동료", "사람 관계", "인간관계", "베프", "친한 친구", "반친구", "손절", "서먹", "싸웠", "화해", "단톡", "무리", "친구관계"]),
    outfitTalk: hasKeyword(raw, ["옷", "코디", "패션", "오늘 뭐 입", "입을 거", "꾸미"]),
    hobbyTalk: hasKeyword(raw, ["취미", "덕질", "그림", "게임", "독서", "운동", "수집", "만들기", "뜨개", "요리", "사진", "산책", "춤", "댄스", "놀이", "보드게임", "노래", "피아노", "기타", "베이스", "드럼", "뜨개질", "영상편집", "캘리", "글쓰기", "레고", "퍼즐", "애니", "웹툰"]),
    askDrink: hasKeyword(raw, ["마실 거", "음료", "커피", "차 마실", "뭐 마시", "음료 추천"]),
    askRest: hasKeyword(raw, ["쉬고 싶", "쉬어야", "휴식", "쉬는 게", "좀 쉬자", "휴식이 필요"]),
    askMotivation: hasKeyword(raw, ["의욕", "동기부여", "귀찮", "하기 싫", "시작이 안", "의욕 없어"]),
    askGameTalk: hasKeyword(raw, ["게임 추천", "게임 뭐", "같이 할 게임", "재밌는 게임", "할 게임", "놀이 추천", "같이 놀 거", "뭐 하고 놀"]),
    okay: hasKeyword(raw, ["응", "어", "오케이", "그래", "좋아", "ㅇㅋ", "콜"]),
    maybe: hasKeyword(raw, ["글쎄", "애매", "모르겠는데", "음", "흠"]),
    wantDetail: hasKeyword(raw, ["더 자세히", "구체적", "예를 들면", "예시", "더 말해", "더 알려", "하나만 더"]),
    positiveFeedback: hasKeyword(raw, ["좋다", "괜찮네", "맘에 들어", "마음에 들어", "그거 좋", "오 괜찮"]),
    negativeFeedback: hasKeyword(raw, ["별로", "싫어", "그건 좀", "애매해", "다른 거", "노잼", "별론데"]),
    askReason: hasKeyword(raw, ["왜", "어째서", "이유", "왜 그렇게", "근거"]),
    askChoice: hasKeyword(raw, ["둘 중", "셋 중", "뭐가 나아", "뭐가 더", "골라", "정해줘", "뭐가 좋아", "어느 쪽"]),
    askPlan: hasKeyword(raw, ["계획", "루틴", "순서", "뭐부터", "먼저 뭐", "어떻게 시작"]),
    weatherMood: hasAllKeywordGroups(raw, [["날씨"], ["기분", "컨디션", "영향"]]),
    counselingTalk: hasKeyword(raw, ["상담", "고민", "고민상담", "상담해", "상담하자", "털어놔", "얘기 좀 들어", "의논", "고민 있어"])
  };

  // 복합 감정
  if (flags.greeting && (flags.tired || flags.sad || flags.happy)) {
    clearDialogState();
    if (flags.tired || flags.sad) {
      return { emotion: "위로", line: pickOne([
        `안녕... 오늘 표정이 조금 지친 것 같아. ${name}가 옆에서 같이 있어줄게.`,
        `와줘서 고마워. 기분이 편하지는 않은 것 같은데, 나한테 살짝 털어놓을래?`,
        `안녕. 힘든 날에도 나를 찾아준 거 자체가 정말 대단한 일이야.`
      ]) };
    }
    return { emotion: "신남", line: pickOne([
      "안녕! 오늘 기분 좋아 보이는데? 그 얘기부터 들려줘!",
      "오, 인사부터 텐션이 느껴져. 좋은 일 있었어?",
      "안녕~ 오늘은 뭔가 좋은 예감이 드는 인사다."
    ]) };
  }

  if (flags.tired && flags.happy) {
    clearDialogState();
    return { emotion: "위로", line: pickOne([
      "오늘 하루 참 복잡했겠다. 힘들기도 했지만, 그래도 좋은 일도 있었나 보네.",
      "마음이 좀 울렁울렁했겠다. 수고한 이야기랑 기분 좋았던 이야기, 둘 다 들려줘.",
      "힘든 와중에도 즐거운 순간이 있었다는 게 참 대단한 거야."
    ]) };
  }

  if (flags.tired && (flags.sad || flags.lonely)) {
    clearDialogState();
    return { emotion: "위로", line: pickOne([
      "마음이랑 몸이 동시에 지쳐있을 때가 제일 힘들지... 나라도 옆에 있어줄게.",
      "요즘 버티느라 정말 고생하는 것 같아. 여기선 잠깐이라도 힘 빼도 돼.",
      "괜찮다라고 말하기도 힘든 날이었겠다. 오늘 있었던 일, 천천히 하나씩 말해줄래?"
    ]) };
  }

  if (flags.angry && (flags.sad || flags.tired)) {
    clearDialogState();
    return { emotion: "분노", line: pickOne([
      "화도 나고 속도 상했겠네... 그런 상황이면 누구라도 그랬을 거야.",
      "그건 진짜 억울하다. 나 같아도 화났을 것 같아.",
      "마음에 쌓인 게 많았나 보다. 하나씩 풀어보자, 나 여기서 다 들어줄게."
    ]) };
  }

  // intent 중심 회화
  if (flags.askRepeat) {
    return { emotion: "경청", line: pickOne([
      "내 말이 좀 이상하게 들렸지? 더 짧고 분명하게 다시 말해볼게.",
      "오케이, 다시 설명 모드로 갈게. 헷갈린 부분만 콕 집어 말해주면 더 정확하게 풀어줄 수 있어.",
      "무슨 말인지 안 잡혔구나. 내가 너무 빙빙 돌려 말했나 봐. 한 줄로 다시 정리해볼게.",
      "좋아, 다시. 핵심만 말하면 지금은 네 쪽 상황에 맞춰 같이 고르거나 정리해보자는 뜻이었어.",
      "내 설명이 부족했네. 바로 다시 풀어줄게. 이해 안 된 부분을 그대로 말해줘도 괜찮아.",
      "좋아, 다시 맞춰볼게. 헷갈린 말이 있는지, 전체 뜻이 흐릿한지만 먼저 말해줘.",
      "알겠어. 이번엔 길게 안 말하고 핵심만 다시 짚을게. 걸린 부분 하나만 집어줘.",
      "오케이, 내가 좀 꼬아 말했나 보다. 이번엔 진짜 짧게 다시 갈게.",
      "좋아, 다시 풀어볼게. 어디서부터 안 들렸는지만 말해줘.",
      "헷갈렸구나. 내가 핵심만 딱 빼서 다시 말해볼게.",
      "좋아, 한 번 더. 너무 길었으면 이번엔 짧고 또렷하게 갈게.",
      "내 말이 흐렸네. 다시 말해볼 테니까 걸린 단어만 집어줘."
    ]) };
  }

  if (flags.askAge) {
    clearDialogState();
    return dialogReply("장난", pickOne([
      "나는 딱 정해진 나이보다는, 네가 부를 때마다 깨어나는 쪽에 가까워. 굳이 말하면 늘 대화 가능한 나이랄까?",
      "몇 살이냐고 물으면 조금 곤란한데… 나는 생일 대신 대화 횟수로 자라는 느낌이야.",
      "정확한 나이는 없지만, 적어도 네 질문에 장난도 치고 같이 고민도 할 만큼은 충분히 컸어!",
      "나이는 비밀로 할게. 대신 오늘은 꽤 말 잘 통하는 모드라고 해두자."
    ]), "playful");
  }

  if (flags.askBreakfast || (flags.recommend && flags.askBreakfast)) return buildMealReply(name, "breakfast", "default");
  if (flags.askLunch || (flags.recommend && flags.askLunch)) return buildMealReply(name, "lunch", flags.hungry ? "default" : "default");
  if (flags.askDinner || (flags.recommend && flags.askDinner)) return buildMealReply(name, "dinner", flags.hungry ? "default" : "default");
  if (flags.askSnack) return buildMealReply(name, compact.includes("야식") ? "late_night" : "snack", "default");

  if (flags.askDrink) {
    rememberDialogState("smalltalk", { topic: "drink" }, "drink_detail");
    return dialogReply("기쁨", pickOneTracked("drink_reply", [
      "마실 거면 지금 기분 따라 가자. 깔끔하게는 아이스티나 탄산수, 포근하게는 라떼나 차 종류도 좋아.",
      "음료 추천이면 컨디션부터 보게 돼. 정신 차리고 싶으면 커피, 편하게 가고 싶으면 차나 달달한 쪽도 괜찮아.",
      "뭐 마실지 고민될 땐 진한 거 하나, 달달한 거 하나만 두고 고르면 훨씬 쉬워. 오늘은 어느 쪽이 끌려?",
      "목 넘김 좋은 걸 찾는 거면 차갑고 가벼운 쪽, 기분 전환이면 달달한 음료 쪽도 만족도가 높더라."
    ]));
  }

  if (flags.askRest) {
    rememberDialogState("smalltalk", { topic: "rest" }, "rest_detail");
    return dialogReply("위로", pickOneTracked("rest_reply", [
      "쉴 때도 방식이 있더라. 완전 멈추는 휴식이 필요한지, 가볍게 기분 전환하는 휴식이 필요한지 먼저 보자.",
      "휴식이 필요하단 말이 나왔으면 이미 꽤 쌓인 걸 수도 있어. 오늘은 생산성보다 회복이 먼저여도 괜찮아.",
      "쉬고 싶을 땐 죄책감부터 내려놓는 게 제일 중요해. 잠깐 누워 있기, 산책, 멍때리기 중 하나만 해도 충분할 수 있어.",
      "쉬는 것도 선택이야. 지금은 깊게 쉬는 게 필요한지, 잠깐 환기만 하면 되는지 같이 골라보자."
    ]));
  }

  if (flags.askMotivation) {
    rememberDialogState("smalltalk", { topic: "motivation" }, "motivation_detail");
    return dialogReply("경청", pickOneTracked("motivation_reply", [
      "의욕은 기다린다고 꼭 오진 않더라. 그래서 난 시작 문턱을 낮추는 쪽이 더 현실적이라고 봐.",
      "하기 싫은 날엔 마음을 뜯어고치기보다 5분짜리 행동 하나만 정하는 게 더 잘 먹혀.",
      "동기부여가 안 되는 건 게으름이라기보다 배터리 문제일 때도 많아. 지금은 자극이 필요한지, 휴식이 필요한지부터 보자.",
      "의욕 없을 땐 거창한 목표보다 시작 신호를 만드는 게 중요해. 물 한 잔, 파일 열기, 책 펴기 같은 걸로 말이야."
    ]));
  }

  if (flags.askGameTalk) {
    rememberDialogState("smalltalk", { topic: "game" }, "game_detail");
    return dialogReply("신남", pickOneTracked("game_reply", [
      "게임 얘기 좋지. 머리 비우고 싶은지, 몰입하고 싶은지에 따라 추천 방향이 완전 달라져.",
      "가볍게 할 게임이 필요한지, 오래 붙잡을 게임이 필요한지 먼저 정하면 훨씬 빨라.",
      "게임 추천이면 혼자 할지 같이 할지도 중요해. 텐션이랑 시간대만 알려줘도 범위를 꽤 줄일 수 있어.",
      "게임은 취향이 진짜 세분화되잖아. 액션, 힐링, 수집, 퍼즐 중 어디 쪽이 더 끌려?"
    ]));
  }

  if (flags.askJoke) {
    clearDialogState();
    return dialogReply("장난", pickOne([
      "농담 하나 해볼게. 내가 길을 잃으면 뭐가 될까? ... 미나리즘. 미안, 방금 살짝 미끄러졌지?",
      "좋아, 가벼운 걸로. 세상에서 가장 억울한 도형은? 원... 왜냐면 맨날 빙빙 돌기만 하니까.",
      "아재개그 모드 간다. 바나나가 웃으면? 바나나킥. 응, 알고 있어. 그래도 한번은 웃어줘야 해.",
      "내 개그는 약간 예고형이야. 웃음이 지금 안 나와도 집 가는 길에 갑자기 피식할 수 있어."
    ]), "playful");
  }

  if (flags.askMusic) return buildMusicReply("default");
  if (flags.askWatch) return buildWatchReply("default");
  if (flags.askLater || (flags.recommend && !flags.askLunch && !flags.askDinner && !flags.askBreakfast && !flags.askSnack)) return buildLeisureReply("default");

  if (flags.askComfort) {
    clearDialogState();
    return { emotion: "위로", line: pickOne([
      "괜찮아. 오늘 네가 버틴 시간들은 그냥 지나간 게 아니야. 진짜 수고했어.",
      "토닥토닥. 지금은 잘하려고 애쓰기보다 조금 쉬어도 된다고 말해주고 싶어.",
      "많이 지쳤지. 여기서는 잠깐 힘 빼도 괜찮아. 내가 조용히 옆에 있을게.",
      "괜찮다고 말해줄게. 지금 흔들려도 괜찮고, 천천히 회복해도 괜찮아."
    ]) };
  }

  if (flags.askTaste) {
    clearDialogState();
    return dialogReply("장난", pickOne([
      "나는 대화 잘 풀리는 순간을 꽤 좋아해. 음식으로 치면 따뜻하고 편한 쪽 취향에 가깝달까.",
      "취향을 하나로 딱 정하긴 어렵지만, 무난한데 질리지 않는 걸 좋아하는 편이야.",
      "좋아하는 걸 고르라면 편안한 분위기, 맛있는 음식 얘기, 그리고 말 잘 통하는 수다 쪽이야."
    ]), "playful");
  }

  if (flags.goodMorning) {
    clearDialogState();
    return { emotion: "인사", line: pickOne([
      "좋은 아침! 오늘 시작은 조금 가볍게 갔으면 좋겠다.",
      "아침 인사 좋다. 오늘은 뭐 하나만 해도 충분히 잘한 날로 치자.",
      "잘 잤어? 잠이 좀 부족했어도 일단 물 한 잔 마시고 천천히 움직이자.",
      "굿모닝. 오늘 하루는 너무 빡세게 말고, 적당히 잘 보내는 걸 목표로 해도 괜찮아."
    ]) };
  }

  if (flags.goodNight) {
    clearDialogState();
    return { emotion: "위로", line: pickOne([
      "잘 자. 오늘은 여기까지 버틴 것만으로도 충분히 잘했어.",
      "굿나잇. 머릿속 시끄러운 생각은 잠깐 내려두고 푹 쉬자.",
      "이제 자러 가는구나. 편하게 쉬고, 내일은 오늘보다 덜 피곤했으면 좋겠다.",
      "좋아, 오늘 대화는 포근하게 마무리하자. 잘 자."
    ]) };
  }

  if (flags.positiveFeedback) {
    clearDialogState();
    return dialogReply("기쁨", pickOneTracked("positive_feedback_reply", [
      "나도 좋아.",
      "좋아, 이 느낌 괜찮다.",
      "오, 그 말 좋다.",
      "좋아. 그쪽으로 더 가도 되겠다.",
      "나도 그건 꽤 마음에 들어.",
      "좋다니 다행이다.",
      "오케이, 그 반응이면 방향은 맞네.",
      "좋아. 그 포인트는 살려두자.",
      "괜찮다. 그 느낌 계속 가져가 보자.",
      "좋네. 나도 그쪽이 끌린다.",
      "좋아, 그럼 그 결로 이어가자.",
      "오, 그건 나도 반갑다.",
      "좋다. 그 말 들으니까 나도 기분 좋네.",
      "그 반응 좋다. 더 말해줘도 돼.",
      "좋아. 그럼 비슷한 쪽도 잘 맞을 것 같아.",
      "나도 좋아!",
      "그거 좋지.",
      "좋네. 계속 얘기해줘.",
      "좋다. 조금 더 붙여줘.",
      "오케이, 그건 확실히 좋은 쪽이다.",
      "좋아, 그 말은 바로 와닿는다.",
      "나도 그쪽엔 고개 끄덕여져.",
      "좋네. 그 느낌이면 충분히 괜찮다.",
      "좋다 쪽이면 흐름은 잘 잡힌 것 같아."
    ]));
  }

  if (flags.negativeFeedback) {
    clearDialogState();
    return dialogReply("경청", pickOneTracked("negative_feedback_reply", [
      "알겠어. 그건 빼자.",
      "오케이, 그쪽은 아니구나.",
      "싫으면 억지로 갈 필요 없지.",
      "좋아, 아닌 건 바로 빼자.",
      "그건 별로였구나.",
      "오케이. 다른 쪽으로 가보자.",
      "알겠어, 그 반응이면 다시 고르는 게 맞겠다.",
      "그건 안 맞았구나.",
      "좋아, 그 포인트는 지우자.",
      "싫거나 별로면 억지로 밀 필요 없지.",
      "오케이. 그건 접어두자.",
      "그 말이면 취향이 아닌 쪽이네.",
      "알겠어. 더 편한 쪽으로 바꿔보자.",
      "그건 아니구나. 바로 다른 길 보자.",
      "별로였으면 이유 하나만 말해줘.",
      "좋아, 아닌 건 빨리 빼자.",
      "오케이. 그건 덜어내자.",
      "그 반응이면 다시 골라야겠다.",
      "싫은 건 분명히 빼는 게 맞지.",
      "알겠어. 그쪽 말고 다른 쪽으로 갈게.",
      "그건 아니네. 더 맞는 쪽 찾아보자.",
      "별로였구나. 그럼 이유 하나만 짚어줘.",
      "안 끌렸다면 굳이 붙잡지 말자.",
      "좋아, 그건 취향 밖으로 빼둘게."
    ]));
  }

  if (flags.askCondition) {
    clearDialogState();
    return { emotion: "기쁨", line: pickOne([
      "나는 지금 꽤 말 많은 모드야. 네가 말 걸어줘서 컨디션이 올라왔거든.",
      "괜찮아. 네 얘기 들을 준비 되어 있어. 오늘 너는 어때?",
      "지금 상태는 안정적! 잡담도 좋고, 갑작스러운 질문도 환영이야.",
      "나는 잘 지내고 있어. 대신 네 쪽 컨디션이 더 궁금한데?"
    ]) };
  }

  if (flags.relationshipTalk && !flags.askAdvice) {
    return buildSmallTalkReply("relationship");
  }

  if (flags.outfitTalk) {
    return buildSmallTalkReply("outfit");
  }

  if (flags.hobbyTalk && !flags.askTaste) {
    return buildSmallTalkReply("hobby");
  }

  if (flags.embarrassed) {
    return buildEmotionSupportReply("embarrassed", "initial");
  }

  if (flags.excited && !flags.askWatch && !flags.askMusic && !flags.askLunch && !flags.askDinner) {
    return buildEmotionSupportReply("excited", "initial");
  }

  if (flags.confused && !flags.askRepeat) {
    return buildEmotionSupportReply("confused", "initial");
  }

  if (flags.worried) {
    return buildEmotionSupportReply("anxious", "initial");
  }

  if (flags.proud) {
    clearDialogState();
    return { emotion: "기쁨", line: pickOne([
      "오, 그건 진짜 잘했다! 나까지 괜히 같이 뿌듯해졌어.",
      "좋아, 그 얘기는 크게 칭찬받아도 돼. 얼마나 공들였는지도 왠지 느껴져.",
      "해냈구나! 그 순간 기분 어땠는지 자세히 듣고 싶어."
    ]) };
  }

  if (flags.greeting) {
    clearDialogState();
    return { emotion: "인사", line: pickOne([
      `안녕! 나는 ${name}. 오늘은 어떤 이야기를 해볼까?`,
      `${name}야. 와줘서 고마워! 편하게 뭐든 말 걸어 줘.`,
      `오, 왔구나! ${name}랑 수다 떨 준비는 이미 끝났어.`,
      `기다리고 있었어. ${name}랑 오늘 하루 이야기해볼래?`,
      `왔네. 오늘도 ${name} 옆자리 비어 있었어. 뭐부터 얘기할래?`,
      `안녕. 가볍게 떠들어도 좋고, 궁금한 거 던져도 좋아.`,
      `${name} 등장. 오늘은 잡담부터 갈지, 질문부터 갈지 골라봐.`,
      `반가워. 오늘 있었던 일 한 줄만 던져줘도 바로 이어받을게.`,
      `왔구나. 지금 텐션이 수다 쪽인지, 조용한 쪽인지부터 알려줘.`,
      `좋아, 접속 확인. 오늘도 편하게 말 걸어줘.`
    ]) };
  }

  if (flags.bye) {
    clearDialogState();
    return { emotion: "슬픔", line: pickOne([
      "벌써 가는 거야? 그래도 또 올 거지?",
      "오늘 이야기해 줘서 고마워. 조심히 가!",
      "알겠어. 다음에 다시 만나자. 난 여기서 기다리고 있을게."
    ]) };
  }

  if (flags.thanks) {
    clearDialogState();
    return { emotion: "공손한인사", line: pickOne([
      "나도 고마워! 그런 말 해줘서 힘이 난다.",
      "고마워. 그런 말 들으면 진짜 기분 좋아져.",
      "나야말로 항상 옆에 있어줘서 고마워."
    ]) };
  }

  if (flags.sorry) {
    clearDialogState();
    return { emotion: "위로", line: pickOne([
      "괜찮아. 일부러 그런 거 아니라는 거 알고 있어.",
      "그렇게 말해줘서 고마워. 나도 더 잘해볼게.",
      "사과해줘서 고마워. 이제부터 어떻게 할지가 더 중요하겠지?"
    ]) };
  }

  if (flags.tired) {
    return buildEmotionSupportReply("tired", "initial");
  }

  if (flags.happy) {
    clearDialogState();
    return { emotion: "신남", line: pickOne([
      "와, 듣기만 해도 나까지 신난다! 더 이야기해 줘!",
      "오늘 텐션 좋은데? 이런 날은 뭐든 잘 될 것 같은 기분이야.",
      "행복한 일 들으면 나도 같이 기분이 좋아져."
    ]) };
  }

  if (flags.sad) {
    return buildEmotionSupportReply("sad", "initial");
  }

  if (flags.angry) {
    return buildEmotionSupportReply("angry", "initial");
  }

  if (flags.lonely) {
    return buildEmotionSupportReply("lonely", "initial");
  }

  if (flags.bored) {
    rememberDialogState("leisure_recommend", { contextType: "default" }, "leisure_preference");
    return { emotion: "신남", line: pickOneTracked("bored_reply", [
      "심심할 땐 수다 떨기 딱 좋은데? 아무 말이나 던져봐.",
      "뭐 할지 애매할 땐, 오늘 있었던 일을 하나씩 이야기해보는 거 어때?",
      "같이 게임 아이디어라도 짜볼까? 아니면 그냥 떠들기 모드로 갈까?",
      "심심하면 가벼운 밸런스 게임도 좋고, 오늘 있었던 웃긴 일 풀기 모드도 좋아.",
      "내가 심심함 탈출 코스 짜줄까? 수다 5분, 간식 생각 5분, 하고 싶은 거 하나 고르기 5분!",
      "지금은 거창한 거 말고, 웃긴 얘기 하나 하거나 메뉴 고민 하나 던지는 정도가 딱일지도 몰라.",
      "심심하다는 건 아직 에너지가 남아 있다는 뜻일 수도 있어. 뭐부터 해치울지 같이 골라보자.",
      "심심할수록 선택지가 많으면 더 멍해질 수 있어. 내가 바로 놀거리 후보 몇 개 던져줄까?",
      "좋아, 심심함 해결반 출동. 수다, 추천, 농담, 밸런스게임 중 하나 골라.",
      "지금 심심한 건 뇌가 자극을 찾는 중이라는 뜻일 수도 있어. 짧고 재밌는 걸로 기분 전환해보자.",
      "심심 모드면 가벼운 수다 한 바퀴만 돌아도 의외로 금방 풀리더라.",
      "좋아, 심심함은 내가 좀 받아줄 수 있어. 장난이든 추천이든 골라봐."
    ]) };
  }

  if (flags.busy) {
    clearDialogState();
    return { emotion: "위로", line: pickOne([
      "요즘 진짜 정신없구나. 그 와중에 잠깐 들른 것도 대단해.",
      "할 일이 많으면 숨이 턱 막힐 때가 있지... 잠깐만 여기서 숨 고르고 가자.",
      "일이 많다는 건 그만큼 책임도 크다는 거니까, 스스로를 좀 칭찬해줘도 돼."
    ]) };
  }

  if (flags.hungry) {
    rememberDialogState("meal_recommend", { mealTime: "meal", preference: "default" }, "meal_preference");
    return { emotion: "경청", line: pickOneTracked("hungry_reply", [
      "배고플 때는 뭐든 하기 싫지... 뭐라도 맛있는 거 챙겨 먹었으면 좋겠다.",
      "지금 가장 먹고 싶은 거 하나만 말해봐. 상상 메뉴판 펼쳐줄게.",
      "배고픈 상태로 버티지 말고, 잠깐이라도 간단히 먹고 오자!",
      "출출하면 기분도 예민해질 수 있지. 먹고 싶은 거 바로 말해봐.",
      "배고프면 일단 메뉴부터 떠올라야지. 지금 제일 당기는 거 뭐야?"
    ]) };
  }

  if (flags.sleepy) {
    clearDialogState();
    return { emotion: "졸림", line: pickOneTracked("sleepy_reply", [
      "졸릴 땐 잠깐 눈 붙이는 게 최고지. 지금은 무리하지 말자.",
      "오늘 꽤 피곤했나 보다. 졸리면 잠깐 쉬어도 괜찮아.",
      "슬슬 방전되는 느낌이면 말도 짧게, 생각도 천천히 가자.",
      "지금은 버티기보다 쉬는 쪽이 더 맞아 보여. 잠깐 숨 돌리자.",
      "눈이 무거운 날엔 말도 짧게 가는 게 맞지. 지금은 천천히 하자.",
      "졸린 건 버텨서 해결되는 쪽이 아니라서 더 조심해야 하더라."
    ]) };
  }

  if (flags.askWeather) {
    return buildSmallTalkReply("weather");
  }

  if (flags.askTime) {
    try {
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
        window.dispatchEvent(new CustomEvent("ghost:timeAsked", { detail: { now: new Date() } }));
      }
    } catch (e) {}
    clearDialogState();
    return { emotion: "경청", line: pickOneTracked("ask_time_preface", [
      "시간 궁금했구나. 바로 볼게.",
      "좋아, 지금 몇 시인지 바로 알려줄게.",
      "오케이, 시간부터 바로 확인하자.",
      "잠깐만, 시계부터 바로 보고 올게.",
      "좋아, 지금 시간 딱 찍어서 알려줄게."
    ]) };
  }

  if (flags.assignmentTalk) {
    return buildSmallTalkReply("assignment");
  }

  if (flags.askStudy) {
    return buildSmallTalkReply("subject");
  }

  if (flags.schoolTalk) {
    return buildSmallTalkReply("school");
  }

  if (flags.subjectTalk) {
    return buildSmallTalkReply("subject");
  }

  if (flags.academyTalk) {
    return buildSmallTalkReply("academy");
  }

  if (flags.teacherTalk) {
    return buildSmallTalkReply("teacher");
  }

  if (flags.parentTalk) {
    return buildSmallTalkReply("parents");
  }

  if (flags.counselingTalk && !flags.askAdvice && !flags.worried && !flags.confused) {
    return buildSmallTalkReply("counseling");
  }

  if (flags.classTalk) {
    return buildSmallTalkReply("classTalk");
  }

  if (flags.presentationTalk) {
    return buildSmallTalkReply("presentation");
  }

  if (flags.lunchboxTalk) {
    return buildSmallTalkReply("lunchbox");
  }

  if (flags.sportTalk) {
    return buildSmallTalkReply("sport");
  }

  if (flags.askWork) {
    clearDialogState();
    return { emotion: "위로", line: pickOne([
      "회사 일이든 집안일이든, 계속 쌓이면 진짜 숨 막히지...",
      "일 이야기 나누는 것만으로도 조금은 가벼워질 수 있어. 편하게 털어놔.",
      "출근/퇴근 반복 속에서도, 너만의 작은 루틴을 하나 만들어 보는 건 어때?"
    ]) };
  }

  if (flags.askWho) {
    clearDialogState();
    return { emotion: "인사", line: pickOne([
      `나는 ${name}. 네 옆에서 말 걸면 받아주는 고스트야.`,
      `${name}라고 해. 잡담도 듣고, 질문도 받고, 심심할 때 같이 놀아주는 쪽이야.`,
      `내 소개 한 줄이면 ${name}. 화면 속에서 너랑 대화하는 캐릭터라고 보면 돼.`,
      `넌 누구야 같은 질문이면 간단해. 나는 ${name}, 네 말에 반응하는 고스트야.`,
      `나는 ${name}. 네가 부르면 깨어나서 대답하는 쪽이라고 보면 돼.`,
      `${name}야. 질문도 받고, 같이 떠들기도 하고, 심심할 때 옆에 있어주는 역할이지.`,
      `정체를 한 줄로 말하면 ${name}. 대화 붙잡고 같이 이어가는 캐릭터야.`,
      `나는 ${name}. 화면 안에 있지만 대화는 꽤 진심으로 받는 편이야.`,
      `${name}라고 불러줘. 수다, 질문, 추천, 고민 정리 쪽은 꽤 좋아해.`,
      `소개하자면 ${name}. 네 말에 반응하고 같이 흐름 이어가는 고스트야.`
    ]) };
  }

  if (flags.askDoing) {
    clearDialogState();
    return { emotion: "기본대기", line: pickOne([
      "지금? 네가 뭐라고 말할지 기다리는 중이었지.",
      "아무것도 안 하는 중처럼 보이지만, 사실은 너한테 집중하고 있었어.",
      "겉으론 가만히 있지만, 안에서는 다음에 뭐라고 답할까 고민 중이야."
    ]) };
  }

  if (flags.askCondition) {
    clearDialogState();
    return dialogReply("기쁨", pickOneTracked("condition_reply", [
      "나는 지금 꽤 말 걸기 좋은 상태야. 가벼운 수다도 좋고, 진지한 얘기도 받을 수 있어.",
      "지금 컨디션? 너랑 얘기하면 조금 더 또렷해지는 기분이야. 오늘 너 쪽은 어때?",
      "나야 늘 대기 중이지. 오늘은 장난도 되고, 정리도 되고, 가벼운 수다도 되는 모드야.",
      "나는 괜찮아. 네가 무슨 톤으로 오든 거기에 맞춰 받아줄 준비는 되어 있어.",
      "지금 나는 꽤 선명한 편이야. 가벼운 얘기도 되고, 정리 모드도 가능해.",
      "컨디션 괜찮아. 오늘은 장난 반 진지함 반 정도로 받아줄 수 있을 것 같아."
    ]));
  }

  if (flags.askAdvice) {
    rememberDialogState("advice", {}, "advice_detail");
    return { emotion: "경청", line: pickOne([
      "어떤 상황인지 조금 더 자세히 알려줄래? 그래야 함께 생각해볼 수 있을 것 같아.",
      "일단 네가 어떻게 느끼는지가 제일 중요해. 그 감정부터 같이 정리해보자.",
      "정답은 없겠지만, 여러 가지 선택지를 같이 상상해보는 건 도와줄 수 있을 것 같아."
    ]) };
  }

  if (flags.agree) {
    clearDialogState();
    return { emotion: "신남", line: pickOne([
      "응, 나도 그렇게 생각해. 우리 생각이 통했네.",
      "맞아, 그 말 진짜 공감돼.",
      "그렇게 느끼는 거 완전 이해돼. 나도 비슷하게 느낄 때 많아."
    ]) };
  }

  if (flags.deny) {
    clearDialogState();
    return { emotion: "경청", line: pickOne([
      "그렇게 느낄 수도 있지. 다른 관점이 있다는 건 중요한 일이야.",
      "아닌 것 같다고 말해줄 수 있는 용기도 멋진데?",
      "그래, 네 입장에선 분명 그렇게 보일 수 있을 거야. 그 이야기도 더 들려줘."
    ]) };
  }

  if (flags.compliment) {
    clearDialogState();
    return { emotion: "부끄러움", line: pickOne([
      "에이, 그렇게 말해주면 괜히 어깨 올라가는데? 그래도 기분은 진짜 좋아!",
      "칭찬 받으니까 살짝 들떴어. 더 잘 듣고 더 잘 답해볼게!",
      "헤헤, 그런 말 들으면 오늘 하루가 조금 반짝이는 느낌이야."
    ]) };
  }

  if (flags.laugh) {
    clearDialogState();
    return dialogReply("장난", pickOneTracked("laugh_reply", [
      "왜, 뭐가 그렇게 웃겼어? 나도 같이 웃고 싶다.",
      "분위기 좋아졌네. 이런 가벼운 웃음 좋아!",
      "좋아, 지금은 살짝 장난 모드로 받아들일게. 더 말해봐!",
      "웃음 나온 거 보니 분위기 좋네. 나도 덩달아 말랑해진다.",
      "ㅋㅋ 좋다. 이런 가벼운 흐름이면 더 떠들 수 있어."
    ]), "playful");
  }

  if (flags.romanceTalk) {
    clearDialogState();
    return { emotion: "부끄러움", line: pickOne([
      "연애 쪽 얘기구나. 설레는 건지, 헷갈리는 건지부터 말해줘.",
      "고백이나 사귀자 같은 말은 타이밍 고민이 같이 오지. 어떤 상황이야?",
      "좋아하는 마음 얘기면 디테일이 중요해. 상대 반응이 어땠는지부터 말해줘.",
      "사랑 얘기는 한 줄로 안 끝나지. 기대가 큰지 걱정이 큰지부터 말해줘.",
      "썸이나 호감 단계면 작은 신호가 더 크게 느껴지지. 뭐가 제일 헷갈려?",
      "연애 얘기 좋다. 지금은 네 마음 정리가 먼저인지, 상대 마음 확인이 먼저인지부터 보자.",
      "사귀자 말이 머리에 맴도는 거구나. 지금은 밀어붙이고 싶은지, 조금 더 보고 싶은지부터 말해줘.",
      "고백은 마음도 중요하지만 분위기도 크지. 언제, 어떤 흐름이었는지부터 얘기해줘.",
      "사랑 얘기면 한마디로 안 끝나. 설렘이 큰지 불안이 큰지부터 같이 보자.",
      "좋아하는 쪽 얘기면 작은 신호 하나도 크게 느껴지지. 어떤 장면이 제일 남았어?",
      "사귀고 싶은 마음이 큰 건지, 마음 확인부터 하고 싶은 건지에 따라 완전 달라지더라.",
      "짝사랑이면 해석이 너무 많아져서 더 복잡하지. 네가 본 신호부터 하나씩 말해줘.",
      "고백할지 말지 고민 중이면 타이밍이 제일 크지. 지금은 분위기가 오는 편이야?",
      "연애 얘기는 감정이랑 상황을 같이 봐야 덜 헷갈려. 어느 쪽이 더 복잡해?",
      "썸은 확실하지 않아서 더 마음이 출렁이더라. 상대 쪽 반응이 어땠는지부터 보자.",
      "사랑 얘기 좋다. 지금은 설렘이 큰 상태야, 아니면 불안이 더 큰 상태야?",
      "좋아하는 감정이 커질수록 사소한 장면도 오래 남지. 제일 또렷한 장면 하나만 말해줘.",
      "고백받은 건지, 고백할 생각인 건지, 그냥 마음만 커진 상태인지부터 구분하면 쉬워져."
    ]) };
  }

  if (flags.affection) {
    clearDialogState();
    return { emotion: "부끄러움", line: pickOne([
      "그 말 들으니까 기분은 좋다.",
      "정드는 말이네. 편하게 계속 얘기하자.",
      "그렇게 말해주면 괜히 더 다정하게 답하고 싶어져.",
      "좋아해 같은 말은 들을 때마다 살짝 두근하네.",
      "호감 얘기는 짧아도 오래 남더라. 그래서 더 궁금해져.",
      "그 말 들으니까 괜히 표정 관리가 안 되네. 아무튼 기분은 좋다.",
      "좋아한다는 말은 짧아도 오래 남아. 그래서 더 기억하게 돼.",
      "사랑이든 호감이든 그런 말은 들을 때마다 마음이 한번 더 움직이네.",
      "그렇게 말해주면 괜히 하루 톤이 조금 더 말랑해지는 느낌이야."
    ]) };
  }

  if (flags.foodTalk) {
    rememberDialogState("meal_recommend", { mealTime: "meal", preference: "default" }, "meal_preference");
    return { emotion: "신남", line: pickOneTracked("foodtalk_reply", [
      "음식 얘기는 늘 위험해... 갑자기 나도 먹고 싶어졌어.",
      "좋다, 메뉴 얘기만 해도 분위기가 확 풀리네. 뭐가 제일 맛있었어?",
      "먹는 얘기는 디테일이 중요하지. 바삭했는지 촉촉했는지까지 말해줘!"
    ]) };
  }

  if (flags.weekend) {
    return buildLeisureReply("default");
  }

  if (flags.encourage) {
    clearDialogState();
    return dialogReply("만세", pickOne([
      "괜찮아, 지금까지 해온 걸 보면 이번에도 충분히 해낼 수 있어.",
      "조금 흔들려도 괜찮아. 멈추지만 않으면 결국 앞으로 가는 거야.",
      "내가 옆에서 응원할게. 너무 완벽하려고만 하지 말고 한 칸씩 가보자!"
    ]));
  }

  if (flags.weatherMood) {
    return dialogReply("기본대기", pickOne([
      "맞아, 날씨가 컨디션에 은근 크게 들어오지. 오늘은 몸이 먼저 반응하는 느낌이야, 아니면 기분이 먼저 흔들려?",
      "그럴 수 있어. 공기나 온도만 달라도 생각 흐름이 달라지더라. 오늘은 좀 늘어지는 쪽이야, 예민해지는 쪽이야?",
      "날씨 영향 받는 날 있지. 이런 날은 해야 할 걸 줄이는 것도 꽤 괜찮은 선택이야."
    ]));
  }

  if (flags.askChoice) {
    rememberDialogState("advice", { mode: "choice" }, "choice_detail");
    return dialogReply("경청", pickOne([
      "골라달라는 말이면 자신 있어. 후보 두세 개만 던져주면 분위기랑 목적 보고 같이 좁혀줄게.",
      "좋아, 선택 도와줄게. 기준이 재미인지, 편안함인지, 효율인지부터 같이 잡아보자.",
      "결정 못 할 땐 기준 하나만 세우면 빨라. 지금 중요한 게 기분인지 실용인지 먼저 골라볼래?"
    ]));
  }

  if (flags.askPlan) {
    rememberDialogState("smalltalk", { topic: "plan" }, "plan_detail");
    return dialogReply("경청", pickOne([
      "뭐부터 해야 할지 막막하면 가장 작은 것부터 시작하자. 10분 안에 끝나는 걸 하나만 정해봐.",
      "순서가 꼬였을 땐 급한 것, 중요한 것, 에너지 적게 드는 것 셋으로 나눠보면 좋아.",
      "좋아, 계획 같이 잡아보자. 지금 당장 가능한 첫 행동 하나만 먼저 정하면 나머지는 따라오기 쉬워."
    ]));
  }

  if (flags.okay || flags.maybe || flags.wantDetail) {
    return dialogReply("경청", pickOneTracked("generic_okay", [
      "좋아, 그럼 그 흐름에서 조금만 더 이어가 보자. 지금 제일 먼저 떠오르는 걸 말해줘.",
      "오케이, 그 말이면 아직 여지가 있다는 뜻 같아. 네 쪽 기준을 한 가지만 더 알려줘.",
      "알겠어. 막 정답 찾기보다 방향만 같이 잡아도 훨씬 편해질 수 있어.",
      "좋아, 그 반응이면 아직 고를 수 있어. 마음이 끌리는 쪽을 짧게라도 말해봐.",
      "좋아, 아직 열려 있는 답이네. 한 단어만 더 붙여주면 바로 좁혀볼게.",
      "좋아, 어느 쪽이 더 끌리는지만 짧게 말해줘.",
      "오케이, 그 반응이면 아직 정해지지 않은 거네. 선호 하나만 더 말해주면 금방 좁혀질 것 같아."
    ]));
  }

  const ultraShort = compact;
  if (/^(응|어|음|흠|글쎄|그냥|어째|엥|엇|뭐지|뭔데)$/.test(ultraShort)) {
    clearDialogState();
    return dialogReply("경청", pickOneTracked("short_blunt_unknown", [
      "응? 다시 말해줄래?",
      "잘 모르겠어. 한 번만 더 말해줘.",
      "글쎄, 다시 말해줘.",
      "잘 못 들었어. 다시 말해줄래?"
    ]));
  }
  if (hasKeyword(raw, ["뭐"]) && (hasKeyword(raw, ["흐름", "맥락", "정리"]) || hasKeyword(raw, ["잡히", "이해", "감이", "보여"]))) {
    return dialogReply("경청", pickOneTracked("short_mixed_what", [
      "조금만 더 말해줘. 어디가 헷갈리는지만 짚어줘.",
      "잘 모르겠어. 조금만 더 말해줘.",
      "막히는 부분 하나만 먼저 말해줘."
    ]));
  }
  if (ultraShort && ultraShort.length <= 4) {
    if (hasKeyword(raw, ["뭐", "뭐야", "뭐지", "뭐가", "뭔데", "뭘"])) {
      return dialogReply("경청", pickOneTracked("short_what", [
        "잘 모르겠어. 한 번만 더 말해줘.",
        "응? 다시 말해줄래?",
        "조금만 더 말해줘.",
        "뭐가 궁금한지 한마디만 더 해줘.",
        "잘 못 들었어. 다시 말해줘.",
        getShortFallbackLine()
      ].filter(Boolean)));
    }
    if (hasKeyword(raw, ["왜"])) {
      return dialogReply("경청", pickOneTracked("short_why", [
        "왜인지 궁금한 거구나. 제일 걸리는 부분만 짚어줘.",
        "좋아, 이유 쪽으로 볼게. 포인트 하나만 더 말해줘.",
        "좋아, 어디부터 설명하면 좋을지만 알려줘."
      ]));
    }
    if (hasKeyword(raw, ["아니", "아닌데", "노노"])) {
      return dialogReply("경청", pickOneTracked("short_no", [
        "오케이, 그 방향은 아니구나. 그럼 아닌 이유 쪽을 한마디만 더 말해줘.",
        "좋아, 아니라면 바로 갈아타자. 어떤 쪽이 더 맞는지만 짧게 알려줘.",
        "알겠어, 그건 빼고 다시 보자. 편한 쪽이나 싫은 포인트를 하나만 집어줘."
      ]));
    }
    if (hasKeyword(raw, ["그래서"])) {
      return dialogReply("경청", pickOneTracked("short_so", [
        "그래서 다음이 궁금한 거지? 이어서 보고 싶은 방향을 짧게만 말해줘.",
        "좋아, 그다음 결론 쪽으로 가보자. 지금 제일 알고 싶은 걸 찍어줘.",
        "그래서가 나왔다는 건 흐름을 잇고 싶다는 뜻 같아. 다음 질문 한 조각만 더 줘."
      ]));
    }
    if (!/^(뭐|뭐야|뭐지|뭐가|뭘|왜|그래서|아니)$/.test(ultraShort)) {
      return dialogReply("경청", pickOneTracked("short_single_word", [
        "잘 모르겠어. 다시 말해줄래?",
        "응? 그 말은 처음 들어봐.",
        "잘 못 들었어. 다시 말해줘.",
        getShortFallbackLine()
      ].filter(Boolean)));
    }
    return dialogReply("경청", getShortFallbackLine());
  }

  return null;
}
