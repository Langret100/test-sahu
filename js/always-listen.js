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
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showBubbleSafe('이 브라우저에서는 마이크 권한을 확인할 수 없어요.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionState = 'granted';
      try { stream.getTracks().forEach(function(t){ t.stop(); }); } catch(e){}
      return true;
    } catch(e) {
      permissionState = 'denied';
      showBubbleSafe('마이크 권한이 허용되지 않았어요. 주소창 옆 마이크 설정에서 허용으로 바꿔 주세요.');
      return false;
    }
  }

  function escapeRegExp(value){
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function getWakeNames(){
    const names = [];
    try {
      const current = String(window.currentCharacterName || '').trim();
      if (current) names.push(current);
      if (current === '미나') names.push('민아','민하','미라','미나아');
      if (current === '민수') names.push('민서','민소','민슈');
    } catch(e){}
    names.push('미나','민아','민하','미라','민수','민서','민소','민슈','마이파이','마이파','얘','야','저기','있잖아','잠깐');
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
    if (raw.length <= 10) return true;
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
      if (!enabled || stopRequested) return;
      if (restarting) return;
      restarting = true;
      setTimeout(function(){
        restarting = false;
        if (enabled && !recognizing && !stopRequested) {
          try { rec.start(); } catch(e){}
        }
      }, 500);
    };
    rec.onresult = function(event){
      if (!event || !event.results) return;
      const result = event.results[event.results.length - 1];
      if (!result || !result[0]) return;
      const text = String(result[0].transcript || '').trim();
      if (!text) return;
      if (!shouldReact(text)) return;
      const now = Date.now();
      if (now - lastHandledAt < 2300) return;
      lastHandledAt = now;

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
    if (recognition && recognizing) {
      try { recognition.stop(); } catch(e){}
    }
    recognizing = false;
    restarting = false;
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
    isEnabled: function(){ return enabled; }
  };
})();
