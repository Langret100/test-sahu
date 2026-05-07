// dialog-continuity.js - 대화 연속성 강화 엔진 v2.2
//
// 설계안 기반 4단계 로직:
//   Step 1. 어절 가중치 점수제 매칭 (Scoring)
//   Step 2. 랜덤 키워드 낚시 (Random Hook)
//   Step 3. 글자 단위 유사도 매칭 (Fuzzy Matching)
//   Step 4. 대화 심폐소생 리액션 (No-Match Fallback)
//
// v2.2 개선:
//   - 풀 캐싱: learnedReactions 변경 시에만 buildUnifiedPool 재계산
//   - scoringMatch Set 조회: O(n*m*132) → O(n*m)로 성능 개선
//   - JOSA_TAIL1에서 '요' 제거 (종결어미 오탐 방지)
//   - expandInputWords Set 사전 계산으로 반복 조회 최적화

(function (global) {
  "use strict";

  // ── 조사 제거용 목록 ─────────────────────────────────────────────────────
  var JOSA_TAIL2 = ["에서","에게","한테","이라","라도","부터","까지","처럼","같이","마저","조차","마다","밖에","이랑","하고","이고","이든","든지"];
  // '요' 제거: '배고파요'→'배고파' 는 유용하나 '안녕하세요'→'안녕하세' 오탐 발생
  // 대신 raw.includes() 매칭으로 보완하므로 '요' 제외
  var JOSA_TAIL1 = ["은","는","이","가","을","를","의","에","로","과","와","도","만","야","아","고","랑","나"];

  // ── 특수 명사: 5점 가중치 ────────────────────────────────────────────────
  var SPECIAL_NOUNS = ["미나","민수","고스트","유령","학교","학원","게임","수학","영어","과학",
    "엄마","아빠","친구","선생님","시험","숙제","연애","좋아","사랑","행복","슬픔","화남","짜증",
    "오늘","내일","어제","밥","먹었","잠","고민","취미","음악","날씨","운동"];
  var SPECIAL_SET = {};
  SPECIAL_NOUNS.forEach(function(w){ SPECIAL_SET[w] = true; });

  // ── 한국어 활용형 확장 매핑 ──────────────────────────────────────────────
  var CONJUGATION_MAP = {
    "배고파":  ["배고파","배고픈","배고프","고파","고픈","고프","허기"],
    "힘들":    ["힘들","힘드","힘든","힘들어","힘들다","힘들고","힘드네"],
    "슬퍼":    ["슬퍼","슬프","슬픈","슬프다","슬퍼요","슬픔"],
    "외로워":  ["외로워","외롭","외로운","외롭다","외로","외롭네","외로움","혼자","쓸쓸","허전","공허"],
    "졸려":    ["졸려","졸리","졸린","졸리다","졸려요","졸리네"],
    "즐거워":  ["즐거워","즐겁","즐거운","즐겁다","즐거","즐겁네"],
    "심심":    ["심심","심심한","심심해","심심하","심심함"],
    "피곤":    ["피곤","피곤한","피곤해","피곤하","피로","피곤함","지쳐","지쳤","지치","지치다","지칩"],
    "불안":    ["불안","불안한","불안해","불안하","불안함","불안감"],
    "걱정":    ["걱정","걱정돼","걱정해","걱정되","걱정스","걱정거리"],
    "화나":    ["화나","화났","화내","화가","화나다","열받","빡쳐","빡치","짜증나","짜증해"],
    "행복":    ["행복","행복해","행복한","행복하","행복감"],
    "뿌듯":    ["뿌듯","뿌듯해","뿌듯한","뿌듯하","뿌듯함"],
    "설레":    ["설레","설렌","설렘","설레다","설레요","설레네","두근"],
    "무서워":  ["무서워","무섭","무서운","무서워요","무섭다","무섭네"],
    "창피":    ["창피","부끄러","쪽팔","민망","이불킥"],
    "먹었":    ["먹었","먹어","먹다","먹고","먹는","먹은","먹을","드셨","드셔"],
    "잤":      ["잤","자다","자고","자는","잠들","잠","수면"],
    "공부":    ["공부","공부해","공부하","공부했","공부중","공부를"],
    "운동":    ["운동","운동해","운동하","운동했","운동중","달리","뛰었"],
    "힘내":    ["힘내","힘내줘","화이팅","파이팅","응원","힘을내"],
    
  };
  // 역방향 Map: 활용형 → 원형 (빠른 조회용)
  var CONJUGATION_REVERSE = {};
  Object.keys(CONJUGATION_MAP).forEach(function(key) {
    CONJUGATION_MAP[key].forEach(function(form) {
      if (!CONJUGATION_REVERSE[form]) CONJUGATION_REVERSE[form] = key;
    });
  });

  // ── 만능 맞장구 풀 (Step 4-B) ────────────────────────────────────────────
  var BACKCHANNELS = [
    { emotion: "신남",   line: "우와, 진짜? 더 말해줘!" },
    { emotion: "신남",   line: "대박, 그래서 어떻게 됐어?" },
    { emotion: "경청",   line: "오, 그렇구나. 계속 말해줘." },
    { emotion: "경청",   line: "음~ 그래서?" },
    { emotion: "기쁨",   line: "헐, 진짜로?!" },
    { emotion: "경청",   line: "아, 그런 일이 있었구나." },
    { emotion: "신남",   line: "엄청 재밌는데? 계속!" },
    { emotion: "경청",   line: "흠, 나도 그런 생각 해본 적 있어." },
    { emotion: "기쁨",   line: "오오, 진짜 흥미롭다!" },
    { emotion: "경청",   line: "그거 좀 더 얘기해줄 수 있어?" }
  ];

  // ── 유틸: 어절 분리 + 조사 제거 ─────────────────────────────────────────
  function splitWords(text) {
    var t = String(text || "").replace(/[.,!?~\u2026\u201c\u201d\u2018\u2019`ㅠㅜㅡ]/g, "").trim();
    return t.split(/\s+/).map(function (w) {
      var clean = w;
      if (clean.length > 3) {
        for (var i = 0; i < JOSA_TAIL2.length; i++) {
          var j = JOSA_TAIL2[i];
          if (clean.endsWith(j) && clean.length > j.length + 1) { clean = clean.slice(0, -j.length); break; }
        }
      }
      if (clean.length >= 2) {
        for (var k = 0; k < JOSA_TAIL1.length; k++) {
          var j1 = JOSA_TAIL1[k];
          if (clean.endsWith(j1) && clean.length >= j1.length + 1) { clean = clean.slice(0, -j1.length); break; }
        }
      }
      return clean;
    }).filter(function (w) { return w.length > 0; });
  }

  // 활용형 → 원형 변환 (역방향 Map 조회 → O(1))
  function matchConjugation(word) {
    // 직접 일치
    if (CONJUGATION_REVERSE[word]) return CONJUGATION_REVERSE[word];
    // 앞 2글자로 접두 매칭 (짧은 어간 포함 여부)
    var prefix = word.slice(0, 2);
    var keys = Object.keys(CONJUGATION_MAP);
    for (var i = 0; i < keys.length; i++) {
      var forms = CONJUGATION_MAP[keys[i]];
      for (var j = 0; j < forms.length; j++) {
        if (word.length >= 2 && (word.includes(forms[j]) || forms[j].includes(prefix))) {
          return keys[i];
        }
      }
    }
    return null;
  }

  // 입력을 어절 분리 + 활용형 정규화한 Set 반환 (O(1) 조회용)
  function buildInputSet(raw) {
    var base = splitWords(raw);
    var set = {};
    base.forEach(function(w) {
      set[w] = true;
      var norm = CONJUGATION_REVERSE[w] || matchConjugation(w);
      if (norm) set[norm] = true;
    });
    return set;
  }

  function wordScore(word) {
    return SPECIAL_SET[word] ? 5 : 1;
  }

  function isRecentLine(line) {
    try {
      if (typeof getRecentDialogHistory === "function") {
        var hist = getRecentDialogHistory().slice(-5);
        return hist.some(function (h) { return h && h.line === line; });
      }
    } catch (e) {}
    return false;
  }

  function resolveEmotion(emoName) {
    try {
      if (typeof EMO !== "undefined" && EMO && emoName && EMO[emoName]) return emoName;
    } catch (e) {}
    return "경청";
  }

  function pickLine(lines) {
    var fresh = lines.filter(function(l){ return !isRecentLine(l); });
    var pool = fresh.length ? fresh : lines;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── 풀 캐시 ──────────────────────────────────────────────────────────────
  var _cachedPool = null;
  var _cachedReactionsRef = null;

  function buildUnifiedPool(reactions) {
    // learnedReactions 배열 레퍼런스가 같으면 캐시 재사용
    if (_cachedPool && _cachedReactionsRef === reactions) return _cachedPool;

    var pool = [];

    // A) 학습 데이터 (구글 시트 + 로컬)
    if (Array.isArray(reactions)) {
      reactions.forEach(function (r) {
        if (!r || !r.trigger || !r.message) return;
        var triggerWords = splitWords(r.trigger);
        pool.push({
          keywords:    triggerWords,
          rawKeywords: [String(r.trigger)].concat(triggerWords),
          lines:       [String(r.message)],
          emotion:     String(r.motion || "경청"),
          source:      "learned"
        });
      });
    }

    // B) dialog.js 내장 패턴 풀
    if (typeof getBuiltinPatternPool === "function") {
      try {
        getBuiltinPatternPool().forEach(function (p) {
          if (!p || !Array.isArray(p.keywords) || !Array.isArray(p.lines)) return;
          pool.push({
            keywords:    p.keywords.map(function(kw){ return String(kw); }),
            rawKeywords: p.keywords.map(function(kw){ return String(kw); }),
            lines:       p.lines,
            emotion:     String(p.emotion || "경청"),
            source:      "builtin"
          });
        });
      } catch (e) {}
    }

    _cachedPool = pool;
    _cachedReactionsRef = reactions;
    return pool;
  }

  // ── Step 1: 어절 가중치 점수제 매칭 ─────────────────────────────────────
  function scoringMatch(raw, pool) {
    if (!pool.length) return null;
    var inputSet = buildInputSet(raw); // Set으로 O(1) 조회
    var inputSetKeys = Object.keys(inputSet);
    if (!inputSetKeys.length) return null;

    var candidates = [];
    pool.forEach(function (entry) {
      var score = 0;
      entry.keywords.forEach(function (kw) {
        if (inputSet[kw]) {
          score += wordScore(kw);
        } else if (raw.includes(kw) && kw.length >= 2) {
          // 부분 매칭은 키워드가 2글자 이상일 때만, 점수도 낮게
          score += wordScore(kw) * 0.3;
        }
      });
      // learned 항목에 소폭 보정 가중치 → 부분매칭 오버스코어 방지, 동점 시 약간 우세
      if (score > 0 && entry.source === "learned") score *= 1.05;
      if (score > 0) candidates.push({ score: score, entry: entry });
    });

    if (!candidates.length) return null;
    // 점수 내림차순 정렬
    candidates.sort(function (a, b) { return b.score - a.score; });
    var topScore = candidates[0].score;
    var topPool  = candidates.filter(function (c) { return c.score >= topScore; });

    // learned 점수 합산 vs builtin 점수 합산 비교
    // learned가 더 높으면 learned 풀에서만 선택
    // 동점이면 learned + builtin 전체에서 랜덤 → 매번 다른 반응 가능
    var learnedPool  = topPool.filter(function (c) { return c.entry.source === "learned"; });
    var learnedTotal = learnedPool.reduce(function(s, c){ return s + c.score; }, 0);
    var builtinPool  = topPool.filter(function (c) { return c.entry.source !== "learned"; });
    var builtinTotal = builtinPool.reduce(function(s, c){ return s + c.score; }, 0);

    var useTop;
    if (learnedPool.length && learnedTotal > builtinTotal) {
      // learned 점수 합산이 더 높음 → learned 우선
      useTop = learnedPool;
    } else {
      // 동점이거나 learned 없음 → 전체 후보에서 랜덤 (learned + builtin 섞임)
      useTop = topPool;
    }

    var freshPool = useTop.filter(function (c) { return c.entry.lines.some(function(l){ return !isRecentLine(l); }); });
    var chosen    = (freshPool.length ? freshPool : useTop)[Math.floor(Math.random() * (freshPool.length || useTop.length))];
    return { emotion: resolveEmotion(chosen.entry.emotion), line: pickLine(chosen.entry.lines), source: chosen.entry.source };
  }

  // ── Step 2: 랜덤 키워드 낚시 ────────────────────────────────────────────
  function randomHookMatch(raw, pool) {
    if (!pool.length) return null;
    var inputSet = buildInputSet(raw);
    if (!Object.keys(inputSet).length) return null;

    var bucket = pool.filter(function (entry) {
      return entry.keywords.some(function (kw) {
        return inputSet[kw] || raw.includes(kw);
      });
    });

    if (!bucket.length) return null;
    var fresh = bucket.filter(function (e) { return e.lines.some(function(l){ return !isRecentLine(l); }); });
    var usePool = fresh.length ? fresh : bucket;
    var picked  = usePool[Math.floor(Math.random() * usePool.length)];
    return { emotion: resolveEmotion(picked.emotion), line: pickLine(picked.lines), source: picked.source };
  }

  // ── Step 3: 글자 단위 유사도 매칭 (n-gram) ──────────────────────────────
  function fuzzyMatch(raw, pool) {
    if (!pool.length) return null;
    var compact = String(raw || "").replace(/\s+/g, "");
    if (compact.length < 2) return null;

    function ngrams(str, n) {
      var r = [];
      for (var i = 0; i <= str.length - n; i++) r.push(str.slice(i, i + n));
      return r;
    }

    var inputBi  = ngrams(compact, 2);
    var inputTri = ngrams(compact, 3);
    // 어절별 추가 bi-gram (분리된 복합어 대응)
    var wordBiList = splitWords(raw).map(function(w){ return ngrams(w, 2); });

    if (!inputBi.length) return null;
    // 입력 n-gram을 Set으로 변환
    var inputBiSet  = {};
    var inputTriSet = {};
    inputBi.forEach(function(b){ inputBiSet[b] = true; });
    inputTri.forEach(function(t){ inputTriSet[t] = true; });

    var bestScore = 1;
    var bestCandidates = [];

    pool.forEach(function (entry) {
      var triggerStr = entry.rawKeywords.join("").replace(/\s+/g, "");
      if (triggerStr.length < 2) return;

      var score = 0;
      ngrams(triggerStr, 2).forEach(function(b){ if (inputBiSet[b])  score += 1; });
      ngrams(triggerStr, 3).forEach(function(t){ if (inputTriSet[t]) score += 2; });
      wordBiList.forEach(function(wbi){ wbi.forEach(function(b){ if (inputBiSet[b]) score += 0.5; }); });

      if (score > bestScore) { bestScore = score; bestCandidates = [entry]; }
      else if (score === bestScore && score > 1) bestCandidates.push(entry);
    });

    if (!bestCandidates.length) return null;
    var fresh = bestCandidates.filter(function(e){ return e.lines.some(function(l){ return !isRecentLine(l); }); });
    var pool3 = fresh.length ? fresh : bestCandidates;
    var picked = pool3[Math.floor(Math.random() * pool3.length)];
    return { emotion: resolveEmotion(picked.emotion), line: pickLine(picked.lines), source: picked.source };
  }

  // ── Step 4: 대화 심폐소생 리액션 ────────────────────────────────────────
  function noMatchFallback(raw, pool) {
    var strategy = Math.floor(Math.random() * 3);

    // A: 입력 단어 되묻기
    if (strategy === 0) {
      var words = splitWords(raw).filter(function (w) { return w.length >= 2; });
      if (words.length > 0) {
        var w = words[Math.floor(Math.random() * words.length)];
        return { emotion: "경청", line: w + "? 그건 뭐야?", source: "fallback_ask" };
      }
    }

    // B: 만능 맞장구
    if (strategy === 1) {
      var fresh = BACKCHANNELS.filter(function(b){ return !isRecentLine(b.line); });
      var bPool = fresh.length ? fresh : BACKCHANNELS;
      var picked = bPool[Math.floor(Math.random() * bPool.length)];
      return { emotion: picked.emotion, line: picked.line, source: "fallback_backchannel" };
    }

    // C: 화제 전환 (학습+내장 풀에서 무작위)
    if (pool.length) {
      var freshPool = pool.filter(function(e){ return e.lines.some(function(l){ return !isRecentLine(l); }); });
      var usePool = freshPool.length ? freshPool : pool;
      var entry = usePool[Math.floor(Math.random() * usePool.length)];
      return { emotion: resolveEmotion(entry.emotion), line: pickLine(entry.lines), source: "fallback_topic_" + entry.source };
    }

    var safe = BACKCHANNELS[Math.floor(Math.random() * BACKCHANNELS.length)];
    return { emotion: safe.emotion, line: safe.line, source: "fallback_safe" };
  }

  // ── 메인 진입점 ──────────────────────────────────────────────────────────
  function getContinuityResponse(raw, reactions) {
    if (!raw || !String(raw).trim()) {
      var s = BACKCHANNELS[Math.floor(Math.random() * BACKCHANNELS.length)];
      return { emotion: s.emotion, line: s.line, source: "fallback_empty" };
    }

    var pool = buildUnifiedPool(reactions);

    var scored = scoringMatch(raw, pool);
    if (scored && scored.line) return scored;

    var hooked = randomHookMatch(raw, pool);
    if (hooked && hooked.line) return hooked;

    var fuzzy = fuzzyMatch(raw, pool);
    if (fuzzy && fuzzy.line) return fuzzy;

    return noMatchFallback(raw, pool);
  }

  // ── 전역 노출 ─────────────────────────────────────────────────────────────
  global.getContinuityResponse = getContinuityResponse;
  global.__dialogContinuity = {
    buildUnifiedPool:  buildUnifiedPool,
    scoringMatch:      scoringMatch,
    randomHookMatch:   randomHookMatch,
    fuzzyMatch:        fuzzyMatch,
    noMatchFallback:   noMatchFallback,
    splitWords:        splitWords,
    buildInputSet:     buildInputSet,
    matchConjugation:  matchConjugation
  };

}(typeof window !== "undefined" ? window : this));
