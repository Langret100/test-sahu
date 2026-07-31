(function(){
  if (window.AlwaysListen) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SpeechRecognition;
  const STORAGE_KEY = "mina.alwaysListen.enabled";

  let recognition = null;
  let enabled = false;
  let recognizing = false;
  let restarting = false;
  let stopRequested = false;
  let lastHandledAt = 0;
  let lastHandledText = '';
  let pausedForVoiceInput = false;
  let permissionState = "unknown";
  let overlayEl = null;

  function qs(id){ return document.getElementById(id); }

  function normalize(text){ return String(text || "").toLowerCase().replace(/\s+/g, ""); }

  function setUiState(on){
    enabled = !!on;
    try { localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0"); } catch(e){}
    document.body.classList.toggle("always-listen-on", enabled);
    const btn = qs("plusBarobaroBtn");
    const label = qs("barobaroStateLabel");
    if (btn) btn.classList.toggle("active", enabled);
    if (label) label.textContent = enabled ? "켜짐" : "꺼짐";
  }

  function showBubbleSafe(msg){
    if (!msg) return;
    if (typeof window.showBubble === "function") {
      try { window.showBubble(msg); } catch(e){}
    }
  }

  function centerGhost(enable){
    document.body.classList.toggle("always-listen-center", !!enable);
  }

  function buildOverlay(){
    if (overlayEl) return overlayEl;
    const wrap = document.createElement("div");
    wrap.id = "barobaroPermissionOverlay";
    wrap.className = "barobaro-permission-overlay hidden";
    wrap.innerHTML = [
      '<div class="barobaro-permission-backdrop"></div>',
      '<div class="barobaro-permission-box">',
      '<div class="barobaro-permission-title">🎙️ 바로바로!</div>',
      '<div class="barobaro-permission-text">상시 음성인식을 켜려면 마이크 권한이 필요해요. 허용하면 주변에서 말을 거는 듯한 말에 더 빠르게 반응할 수 있어요.</div>',
      '<div class="barobaro-permission-actions">',
      '<button type="button" class="barobaro-cancel">취소</button>',
      '<button type="button" class="barobaro-allow">권한 허용하고 켜기</button>',
      '</div>',
      '</div>'
    ].join("");
    document.body.appendChild(wrap);
    wrap.querySelector('.barobaro-permission-backdrop').addEventListener('click', hideOverlay);
    wrap.querySelector('.barobaro-cancel').addEventListener('click', hideOverlay);
    wrap.querySelector('.barobaro-allow').addEventListener('click', async function(){
      await enableFromUserGesture();
    });
    overlayEl = wrap;
    return wrap;
  }

  function showOverlay(){
    buildOverlay().classList.remove('hidden');
  }
  function hideOverlay(){ if (overlayEl) overlayEl.classList.add('hidden'); }

  async function refreshPermissionState(){
    if (!navigator.permissions || !navigator.permissions.query) return permissionState;
    try {
      const status = await navigator.permissions.query({ name: 'microphone' });
      permissionState = status && status.state ? status.state : permissionState;
      if (status && !status.__minaBound) {
        status.__minaBound = true;
        status.onchange = function(){ permissionState = status.state || permissionState; };
      }
    } catch(e){}
    return permissionState;
  }

  async function ensurePermissionByGesture(){
    await refreshPermissionState();
    if (permissionState === 'granted') return true;
    // getUserMedia로 권한을 별도 요청하면 SpeechRecognition.start()가 또
    // 권한 팝업을 띄워 두 번 뜨는 문제가 생깁니다.
    // 권한이 명시적으로 거부된 경우에만 안내하고, 그 외엔
    // SpeechRecognition이 직접 권한 요청을 처리하도록 위임합니다.
    if (permissionState === 'denied') {
      showBubbleSafe('마이크 권한이 허용되지 않았어요. 주소창 옆 마이크 설정에서 허용으로 바꿔 주세요.');
      return false;
    }
    return true;
  }

  function escapeRegExp(value){
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const WAKE_NAME_ALIASES = {
    '미나': ['미나','민아','민앙','민하','미라','미나아'],
    '성훈': ['성훈','성운','성후나','성후니'],
    '민수': ['민수','민서','민소','민슈','민쑤'],
    '아라': ['아라','알아','아랑','아라야'],
    '해찌': ['해찌','해지','해치','하치','헤찌','헤지','헤치']
  };

  function getCurrentCharacterNameSafe(){
    try {
      if (window.GhostCoreBridge && typeof window.GhostCoreBridge.getCurrentCharacterName === 'function') {
        const bridged = String(window.GhostCoreBridge.getCurrentCharacterName() || '').trim();
        if (bridged) return bridged;
      }
    } catch(e){}
    try {
      const direct = String(window.currentCharacterName || '').trim();
      if (direct) return direct;
    } catch(e){}
    return '';
  }

  function getWakeNames(){
    const names = [];
    const current = getCurrentCharacterNameSafe();
    if (current) names.push(current);

    // 미나 계열 공통 파일 하나를 미나·성훈·민수·아라·해찌 버전에
    // 함께 사용할 수 있도록 전체 별칭 사전을 내장한다. 실제 호출 판정에는
    // 현재 core.js에서 선택된 캐릭터의 별칭만 우선 활성화한다.
    if (current && WAKE_NAME_ALIASES[current]) {
      names.push.apply(names, WAKE_NAME_ALIASES[current]);
    } else {
      // 구형 core.js나 초기 로딩처럼 현재 이름을 아직 읽지 못한 경우에도
      // 호출이 완전히 먹통이 되지 않도록 모든 별칭을 임시 fallback으로 쓴다.
      Object.keys(WAKE_NAME_ALIASES).forEach(function(key){
        names.push.apply(names, WAKE_NAME_ALIASES[key]);
      });
    }

    names.push('마이파이','마이파','얘','야','저기','있잖아','잠깐');
    return Array.from(new Set(names.filter(Boolean))).sort(function(a,b){ return b.length - a.length; });
  }

  function stripWakeCommand(text){
    let raw = String(text || '').trim();
    if (!raw) return '';
    const names = getWakeNames();
    names.forEach(function(name){
      if (!name) return;
      const re = new RegExp('^(?:' + escapeRegExp(name) + ')([야아아요요!,~ ]+)?', 'i');
      raw = raw.replace(re, '').trim();
    });
    return raw;
  }

  function shouldReact(text){
    const raw = String(text || '').trim();
    if (!raw) return false;
    const norm = normalize(raw);
    const names = getWakeNames();
    if (names.some(function(n){ return n && norm.includes(normalize(n)); })) return true;

    const messengerOpen = !!(typeof window.isMessengerOpen === 'function' && window.isMessengerOpen());
    if (messengerOpen) {
      try {
        if (typeof window.tryHandleMessengerVoiceCommand === 'function') {
          if (window.tryHandleMessengerVoiceCommand(raw, { dryRun: true })) return true;
        }
      } catch(e) {}
      if (/(적어줘|적어 줘|적어|써줘|써 줘|써|말해줘|말해 줘|말해|보내줘|보내 줘|보내|전송해줘|전송해 줘|전송해|전달해줘|전달해 줘|전달해|전달|전해줘|전해 줘|전해|닫아|닫아줘|나가|종료)[.!?~…]*$/.test(raw)) return true;
    }

    if (/[?？]$/.test(raw)) return true;
    if (/(열어줘|열어 줘|켜줘|켜 줘|들어가|접속해|닫아|닫아줘|기본화면|기본 화면|도와줘|봐줘|알려줘|해줘)$/.test(raw)) return true;
    if (/(뭐해|뭐 하|어디 있|들리|말해봐|대답해|답해)/.test(raw)) return true;
    // 이전에는 10자를 넘는 일반 문장을 여기서 버렸기 때문에,
    // 기기별 인식 차이처럼 보이는 누락이 발생했다. 음성엔진이 최종 문장으로
    // 확정한 2자 이상의 발화는 기본적으로 전달하고, 호출어/명령어 판정은
    // 빠른 처리 경로로만 사용한다.
    if (raw.replace(/\s+/g, '').length >= 2) return true;
    return false;
  }

  function ensureRecognition(){
    if (!supported) return null;
    if (recognition) return recognition;
    const rec = new SpeechRecognition();
    rec.lang = 'ko-KR';
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = function(){ recognizing = true; restarting = false; };
    rec.onerror = function(event){
      recognizing = false;
      const code = event && event.error ? event.error : '';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        permissionState = 'denied';
        stopInternal();
        showBubbleSafe('마이크 권한이 막혀 있어요. 주소창 옆 마이크 설정을 확인해 주세요.');
        return;
      }
      if (code === 'no-speech' || code === 'aborted') return;
      console.warn('AlwaysListen recognition error:', code, event);
    };
    rec.onend = function(){
      recognizing = false;
      // 모바일 Chrome 등은 종료된 인스턴스를 다시 start()하면 InvalidStateError가
      // 나는 경우가 있어 다음 루프에서는 새 인스턴스를 만든다.
      if (recognition === rec) recognition = null;
      if (!enabled || stopRequested || pausedForVoiceInput) return;
      if (restarting) return;
      restarting = true;
      setTimeout(function(){
        restarting = false;
        if (enabled && !recognizing && !stopRequested && !pausedForVoiceInput) {
          startRecognitionLoop();
        }
      }, 350);
    };
    rec.onresult = function(event){
      if (!event || !event.results) return;
      const parts = [];
      for (let i = event.resultIndex || 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || !result.isFinal || !result[0]) continue;
        const part = String(result[0].transcript || '').trim();
        if (part) parts.push(part);
      }
      const text = parts.join(' ').trim();
      if (!text || !shouldReact(text)) return;
      const now = Date.now();
      const normalizedText = normalize(text);
      // 동일 결과의 중복 콜백만 막고, 서로 다른 연속 발화는 빠르게 처리한다.
      if (normalizedText === lastHandledText && now - lastHandledAt < 1800) return;
      if (now - lastHandledAt < 700) return;
      lastHandledAt = now;
      lastHandledText = normalizedText;

      const wakeCommandText = stripWakeCommand(text) || text;
      const messengerOpen = !!(typeof window.isMessengerOpen === 'function' && window.isMessengerOpen());

      if (window.WebLauncher && typeof window.WebLauncher.handleCommand === 'function') {
        try {
          const handled = window.WebLauncher.handleCommand(wakeCommandText, { source: 'voice' });
          if (handled) return;
        } catch(e){}
      }

      const input = qs('userInput');
      if (input) input.value = text;
      if (typeof window.handleUserSubmit === 'function') {
        try { window.handleUserSubmit(); } catch(e){ console.warn('AlwaysListen submit error', e); }
      }
    };
    recognition = rec;
    return rec;
  }

  function startRecognitionLoop(){
    if (!supported) {
      showBubbleSafe('이 브라우저에서는 상시 음성인식을 지원하지 않아요.');
      return false;
    }
    const rec = ensureRecognition();
    if (!rec) return false;
    stopRequested = false;
    if (recognizing) return true;
    try {
      rec.start();
      return true;
    } catch(e) {
      console.warn('AlwaysListen start error', e);
      if ((e && e.name) === 'NotAllowedError') {
        permissionState = 'denied';
        showBubbleSafe('마이크 권한이 아직 없어요. 주소창 옆 마이크 설정을 확인해 주세요.');
      }
      return false;
    }
  }

  function stopInternal(){
    stopRequested = true;
    if (recognition) {
      try { recognition.stop(); } catch(e){}
      try { recognition.abort(); } catch(e2){}
    }
    recognition = null;
    recognizing = false;
    restarting = false;
  }

  function pauseForVoiceInput(){
    if (!enabled) return false;
    pausedForVoiceInput = true;
    stopRequested = true;
    if (recognition) {
      try { recognition.abort(); } catch(e){}
    }
    recognition = null;
    recognizing = false;
    restarting = false;
    return true;
  }

  function resumeAfterVoiceInput(){
    if (!enabled || !pausedForVoiceInput) return;
    pausedForVoiceInput = false;
    stopRequested = false;
    setTimeout(function(){
      if (enabled && !recognizing && !pausedForVoiceInput) startRecognitionLoop();
    }, 300);
  }

  async function enableFromUserGesture(){
    hideOverlay();
    const ok = await ensurePermissionByGesture();
    if (!ok) return false;
    setUiState(true);
    centerGhost(true);
    startRecognitionLoop();
    showBubbleSafe('바로바로!를 켰어요. 이제 더 빨리 귀 기울여 볼게요.');
    return true;
  }

  function disable(){
    setUiState(false);
    centerGhost(false);
    stopInternal();
    showBubbleSafe('바로바로!를 껐어요. 다시 조용히 기다릴게요.');
  }

  async function toggle(){
    if (enabled) {
      disable();
      return;
    }
    await refreshPermissionState();
    if (permissionState === 'granted') {
      setUiState(true);
      centerGhost(true);
      startRecognitionLoop();
      showBubbleSafe('바로바로!를 켰어요. 이제 더 민감하게 듣고 있을게요.');
      return;
    }
    showOverlay();
  }

  function init(){
    setUiState(false);
    centerGhost(false);
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') {
        const btn = qs('plusBarobaroBtn');
        const label = qs('barobaroStateLabel');
        if (btn) btn.classList.add('pending');
        if (label) label.textContent = '대기';
      }
    } catch(e){}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.AlwaysListen = {
    toggle: toggle,
    enable: enableFromUserGesture,
    disable: disable,
    isEnabled: function(){ return enabled; },
    pauseForVoiceInput: pauseForVoiceInput,
    resumeAfterVoiceInput: resumeAfterVoiceInput
  };
})();
