// [옵션 모듈] 말풍선 TTS 읽어주기 - tts-voice.js
// - 말풍선(showBubble) 내용이 표시될 때 Web Speech API로 음성을 재생합니다.
// - 플러스(+) 메뉴의 '읽어주기' 버튼으로 ON/OFF 및 음성 선택 UI를 제공합니다.

(function(){
  const STORAGE_KEY = "ghostTTSOn";
  const VOICE_KEY = "ghostTTSVoice";
  const RATE_KEY = "ghostTTSRate";
  const TONE_KEY = "ghostTTSTone";

  // Web Speech API 가 없는 환경에서는 바로 비활성화
  const hasSpeech = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);

  let enabled = true;
  let selectedVoiceId = null; // voice.name 또는 voiceURI 저장
  let voicesCache = [];
  let settingsPanel = null;
  const SOUND_MIN = 0.1;
  const SOUND_MAX = 10.0;

  let rateValue = 1.0;
  let toneValue = 4.5;

  function loadInitialState(){
    if (!hasSpeech) {
      enabled = false;
      selectedVoiceId = null;
      return;
    }
    try {
      const raw = window.localStorage && window.localStorage.getItem(STORAGE_KEY);
      if (raw === "off") enabled = false;
      else enabled = true;
    } catch(e){
      enabled = true;
    }

    try {
      const v = window.localStorage && window.localStorage.getItem(VOICE_KEY);
      if (v) selectedVoiceId = v;
    } catch(e){}

    try {
      const rawRate = window.localStorage && window.localStorage.getItem(RATE_KEY);
      if (rawRate !== null && rawRate !== undefined && rawRate !== "") {
        rateValue = clampRange(parseFloat(rawRate), SOUND_MIN, SOUND_MAX, 1.0);
      }
    } catch(e){}

    try {
      const rawTone = window.localStorage && window.localStorage.getItem(TONE_KEY);
      if (rawTone !== null && rawTone !== undefined && rawTone !== "") {
        toneValue = clampRange(parseFloat(rawTone), SOUND_MIN, SOUND_MAX, 1.0);
      }
    } catch(e){}
  }

  function saveState(){
    try {
      if (!window.localStorage) return;
      window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch(e){}
  }

  function saveVoice(){
    try {
      if (!window.localStorage) return;
      if (selectedVoiceId) {
        window.localStorage.setItem(VOICE_KEY, selectedVoiceId);
      } else {
        window.localStorage.removeItem(VOICE_KEY);
      }
    } catch(e){}
  }

  function clampRange(value, min, max, fallback){
    const num = parseFloat(value);
    if (!isFinite(num) || isNaN(num)) return fallback;
    if (num < min) return min;
    if (num > max) return max;
    return num;
  }

  function normalizeDisplayValue(value){
    return clampRange(value, SOUND_MIN, SOUND_MAX, 1.0).toFixed(1);
  }

  function saveSoundSettings(){
    try {
      if (!window.localStorage) return;
      window.localStorage.setItem(RATE_KEY, normalizeDisplayValue(rateValue));
      window.localStorage.setItem(TONE_KEY, normalizeDisplayValue(toneValue));
    } catch(e){}
  }

  function mapToneToPitch(value){
    const slider = clampRange(value, SOUND_MIN, SOUND_MAX, 1.0);
    const ratio = (slider - SOUND_MIN) / (SOUND_MAX - SOUND_MIN);
    if (ratio <= 0.5) {
      const lowRatio = ratio / 0.5;
      return 0.05 + (lowRatio * 0.95);
    }
    const highRatio = (ratio - 0.5) / 0.5;
    return 1.0 + Math.pow(highRatio, 0.72) * 1.0;
  }

  function mapToneRateFactor(value){
    const slider = clampRange(value, SOUND_MIN, SOUND_MAX, 1.0);
    if (slider <= 1.0) {
      return 0.92 - ((1.0 - slider) * 0.08);
    }
    if (slider <= 2.0) {
      return 1.0;
    }
    if (slider <= 5.0) {
      return 1.0 + ((slider - 2.0) / 3.0) * 0.12;
    }
    return 1.12 + ((slider - 5.0) / 5.0) * 0.24;
  }

  function mapRateToUtteranceRate(value){
    return clampRange(value, SOUND_MIN, SOUND_MAX, 1.0);
  }

  function getToneDescriptor(value){
    const v = clampRange(value, SOUND_MIN, SOUND_MAX, 1.0);
    if (v <= 0.6) return "매우 낮고 묵직한 톤";
    if (v <= 1.3) return "낮은 톤";
    if (v <= 2.4) return "기본에 가까운 톤";
    if (v <= 4.2) return "높은 톤";
    if (v <= 6.5) return "가볍고 얇은 톤";
    return "아주 가볍고 얇은 톤";
  }

  // 현재 사용 가능한 음성 목록 새로고침
  function refreshVoices(){
    if (!hasSpeech) {
      voicesCache = [];
      return;
    }
    const list = window.speechSynthesis.getVoices() || [];
    voicesCache = list.slice();
  }

  function pickVoiceForUtterance(){
    if (!hasSpeech) return null;
    if (!voicesCache.length) refreshVoices();

    let chosen = null;
    if (selectedVoiceId && voicesCache.length){
      chosen = voicesCache.find(v => v.name === selectedVoiceId || v.voiceURI === selectedVoiceId) || null;
    }

    // 저장된 음성을 못 찾으면, ko-KR 우선 선택
    if (!chosen && voicesCache.length){
      const ko = voicesCache.filter(v => (v.lang || '').toLowerCase().startsWith('ko'));
      chosen = (ko && ko[0]) || voicesCache[0];
    }
    return chosen || null;
  }

  function speak(text){
    if (!hasSpeech || !enabled) return;
    if (!text || typeof text !== "string") return;
    try {
      const utter = new window.SpeechSynthesisUtterance(text);
      const voice = pickVoiceForUtterance();
      if (voice) {
        utter.voice = voice;
      }
      utter.lang = (voice && voice.lang) || "ko-KR";
      utter.pitch = mapToneToPitch(toneValue);
      utter.rate = clampRange(mapRateToUtteranceRate(rateValue) * mapToneRateFactor(toneValue), SOUND_MIN, SOUND_MAX, 1.0);

      // 이전 재생 중인 음성 정리
      // Chrome에서 cancel() 직후 speak() 시 첫 음절 끊김 방지 → 50ms 딜레이
      try { window.speechSynthesis.cancel(); } catch(e){}
      setTimeout(function() {
        try { window.speechSynthesis.speak(utter); } catch(e2){}
      }, 50);
    } catch(e){
      // 실패해도 UI에 영향은 없도록 무시
    }
  }

  function refreshLabel(){
    try {
      // 메인 플러스 메뉴의 설정(읽어주기) 버튼 라벨 갱신
      const plusMenu = document.getElementById("plusMenu");
      if (plusMenu) {
        const btn = plusMenu.querySelector('button[data-action="settings"]');
        if (btn) {
          btn.textContent = enabled ? "🔊 읽어주기" : "🔇 읽어주기";
        }
      }
    } catch(e){}
  }

  function setEnabled(on){
    enabled = !!on && hasSpeech;
    saveState();
    refreshLabel();
    // 설정 패널 내 체크박스 상태도 동기화
    if (settingsPanel) {
      const chk = settingsPanel.querySelector('input[name="ttsEnabled"]');
      if (chk) chk.checked = enabled;
    }
  }

  function toggle(){
    setEnabled(!enabled);
    return enabled;
  }

  // ----- 설정 패널 UI -----
  function ensureSettingsPanel(){
    if (settingsPanel) return settingsPanel;

    const panel = document.createElement("div");
    panel.id = "ttsSettingsPanel";
    panel.style.position = "fixed";
    panel.style.left = "50%";
    panel.style.top = "50%";
    panel.style.transform = "translate(-50%, -50%)";
    panel.style.zIndex = "2000";
    panel.style.background = "rgba(10,10,20,0.96)";
    panel.style.borderRadius = "18px";
    panel.style.boxShadow = "0 18px 40px rgba(0,0,0,0.55)";
    panel.style.padding = "16px 20px 18px";
    panel.style.minWidth = "260px";
    panel.style.maxWidth = "320px";
    panel.style.color = "#f5f5ff";
    panel.style.fontSize = "14px";

    const title = document.createElement("div");
    title.textContent = "읽어주기 설정";
    title.style.fontWeight = "600";
    title.style.marginBottom = "8px";
    panel.appendChild(title);

    const desc = document.createElement("div");
    desc.textContent = "말풍선 내용을 소리로 읽어줄지와 목소리를 선택할 수 있어요.";
    desc.style.fontSize = "12px";
    desc.style.opacity = "0.8";
    desc.style.marginBottom = "10px";
    panel.appendChild(desc);

    const enabledRow = document.createElement("label");
    enabledRow.style.display = "flex";
    enabledRow.style.alignItems = "center";
    enabledRow.style.gap = "6px";
    enabledRow.style.marginBottom = "10px";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.name = "ttsEnabled";
    chk.checked = enabled;
    enabledRow.appendChild(chk);

    const chkSpan = document.createElement("span");
    chkSpan.textContent = "읽어주기 켜기";
    enabledRow.appendChild(chkSpan);

    panel.appendChild(enabledRow);

    chk.addEventListener("change", function(){
      setEnabled(chk.checked);
    });

    const voiceTitle = document.createElement("div");
    voiceTitle.textContent = "목소리 선택";
    voiceTitle.style.fontSize = "12px";
    voiceTitle.style.marginBottom = "6px";
    panel.appendChild(voiceTitle);

    const voiceBox = document.createElement("div");
    voiceBox.id = "ttsVoiceList";
    voiceBox.style.maxHeight = "140px";
    voiceBox.style.overflowY = "auto";
    voiceBox.style.padding = "6px 8px";
    voiceBox.style.borderRadius = "10px";
    voiceBox.style.background = "rgba(20,20,40,0.9)";
    panel.appendChild(voiceBox);

    function makeSliderBlock(options){
      const wrap = document.createElement("div");
      wrap.style.marginTop = "12px";

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      header.style.gap = "8px";
      header.style.marginBottom = "4px";

      const title = document.createElement("div");
      title.textContent = options.title;
      title.style.fontSize = "12px";
      header.appendChild(title);

      const value = document.createElement("div");
      value.style.fontSize = "12px";
      value.style.opacity = "0.92";
      header.appendChild(value);

      const input = document.createElement("input");
      input.type = "range";
      input.min = String(SOUND_MIN);
      input.max = String(SOUND_MAX);
      input.step = "0.1";
      input.value = normalizeDisplayValue(options.value);
      if (options.role) input.setAttribute("data-role", options.role);
      input.style.width = "100%";
      input.style.cursor = "pointer";
      wrap.appendChild(header);
      wrap.appendChild(input);

      const hint = document.createElement("div");
      hint.style.fontSize = "11px";
      hint.style.opacity = "0.75";
      hint.style.marginTop = "3px";
      wrap.appendChild(hint);

      function render(current){
        const safe = clampRange(current, SOUND_MIN, SOUND_MAX, options.fallback);
        value.textContent = safe.toFixed(1);
        if (typeof options.describe === "function") {
          hint.textContent = options.describe(safe);
        } else {
          hint.textContent = options.hint || "";
        }
      }

      input.addEventListener("input", function(){
        const safe = clampRange(input.value, SOUND_MIN, SOUND_MAX, options.fallback);
        options.onInput(safe);
        render(safe);
      });

      render(options.value);

      return { wrap: wrap, input: input, render: render };
    }

    const toneSlider = makeSliderBlock({
      title: "목소리 톤",
      role: "tone",
      value: toneValue,
      fallback: 1.0,
      describe: function(v){
        return getToneDescriptor(v);
      },
      onInput: function(v){
        toneValue = v;
        saveSoundSettings();
      }
    });
    panel.appendChild(toneSlider.wrap);

    const rateSlider = makeSliderBlock({
      title: "읽는 빠르기",
      role: "rate",
      value: rateValue,
      fallback: 1.0,
      describe: function(v){
        if (v < 0.8) return "천천히 읽어요";
        if (v <= 1.6) return "기본 속도예요";
        if (v <= 3.2) return "조금 빠르게 읽어요";
        if (v <= 6.0) return "빠르게 읽어요";
        return "아주 빠르게 읽어요";
      },
      onInput: function(v){
        rateValue = v;
        saveSoundSettings();
      }
    });
    panel.appendChild(rateSlider.wrap);

    const footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.justifyContent = "space-between";
    footer.style.alignItems = "center";
    footer.style.marginTop = "10px";

    const testBtn = document.createElement("button");
    testBtn.textContent = "테스트 재생";
    testBtn.style.border = "none";
    testBtn.style.borderRadius = "14px";
    testBtn.style.padding = "4px 10px";
    testBtn.style.fontSize = "12px";
    testBtn.style.cursor = "pointer";
    testBtn.style.background = "#ffc857";
    testBtn.style.color = "#222";
    footer.appendChild(testBtn);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "닫기";
    closeBtn.style.border = "none";
    closeBtn.style.borderRadius = "14px";
    closeBtn.style.padding = "4px 10px";
    closeBtn.style.fontSize = "12px";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.background = "#555b";
    closeBtn.style.color = "#eee";
    footer.appendChild(closeBtn);

    panel.appendChild(footer);

    closeBtn.addEventListener("click", function(){
      panel.classList.add("hidden");
      panel.style.display = "none";
    });

    testBtn.addEventListener("click", function(){
      if (!enabled) {
        setEnabled(true);
      }
      const sample = "지금 설정한 목소리 톤과 빠르기로 읽어 드릴게요. 높은 톤도, 낮은 톤도 확인해 보세요.";
      speak(sample);
    });

    document.body.appendChild(panel);
    settingsPanel = panel;

    return panel;
  }

  function describeGender(voice){
    const name = (voice.name || "") + " " + (voice.voiceURI || "");
    const lowered = name.toLowerCase();
    if (/(female|woman|여성)/i.test(name)) return "여성";
    if (/(male|man|남성)/i.test(name)) return "남성";
    return "";
  }

  function rebuildVoiceList(){
    if (!settingsPanel) return;
    const listBox = settingsPanel.querySelector("#ttsVoiceList");
    if (!listBox) return;
    listBox.innerHTML = "";

    if (!hasSpeech) {
      const info = document.createElement("div");
      info.textContent = "브라우저에서 음성을 지원하지 않아요.";
      info.style.fontSize = "12px";
      listBox.appendChild(info);
      return;
    }

    if (!voicesCache.length) refreshVoices();

    const voices = voicesCache.slice();
    if (!voices.length) {
      const info = document.createElement("div");
      info.textContent = "사용 가능한 목소리 목록을 불러오는 중이에요.";
      info.style.fontSize = "12px";
      listBox.appendChild(info);
      return;
    }

    // ko-KR 우선 정렬
    voices.sort(function(a, b){
      const ak = (a.lang || "").toLowerCase().startsWith("ko");
      const bk = (b.lang || "").toLowerCase().startsWith("ko");
      if (ak && !bk) return -1;
      if (!ak && bk) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    voices.forEach(function(voice, index){
      const row = document.createElement("label");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "6px";
      row.style.padding = "3px 2px";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "ttsVoiceOption";

      const id = voice.name || voice.voiceURI || String(index);
      radio.value = id;

      if (selectedVoiceId) {
        radio.checked = (id === selectedVoiceId);
      } else if (index === 0) {
        radio.checked = true;
      }

      const text = document.createElement("span");
      const gender = describeGender(voice);
      const lang = voice.lang || "";
      let label = voice.name || ("Voice " + (index + 1));
      const parts = [];
      if (gender) parts.push(gender);
      if (lang) parts.push(lang);
      if (parts.length) {
        label += " (" + parts.join(", ") + ")";
      }
      text.textContent = label;
      text.style.fontSize = "12px";

      row.appendChild(radio);
      row.appendChild(text);
      listBox.appendChild(row);

      radio.addEventListener("change", function(){
        if (!radio.checked) return;
        selectedVoiceId = id;
        saveVoice();
      });
    });
  }

  function openSettings(){
    if (!hasSpeech) {
      if (window.showBubble) {
        try { window.showBubble("이 브라우저에서는 아직 음성 읽어주기를 쓸 수 없어요."); } catch(e){}
      }
      return;
    }
    const panel = ensureSettingsPanel();
    panel.style.display = "block";
    panel.classList.remove("hidden");

    const toneInput = panel.querySelector('input[type="range"][data-role="tone"]');
    const rateInput = panel.querySelector('input[type="range"][data-role="rate"]');
    if (toneInput) toneInput.value = normalizeDisplayValue(toneValue);
    if (rateInput) rateInput.value = normalizeDisplayValue(rateValue);

    refreshVoices();
    rebuildVoiceList();
    refreshLabel();
  }

  // 초기 상태 로드
  loadInitialState();
  refreshVoices();

  if (hasSpeech && typeof window.speechSynthesis !== "undefined") {
    try {
      window.speechSynthesis.addEventListener("voiceschanged", function(){
        refreshVoices();
        rebuildVoiceList();
      });
    } catch(e){}
  }

  // 전역 공개 API
  window.ttsVoice = {
    isAvailable: hasSpeech,
    isEnabled: function(){ return enabled; },
    speak: speak,
    setEnabled: setEnabled,
    toggle: toggle,
    refreshLabel: refreshLabel,
    openSettings: openSettings
  };

  // 초기 로드시 한 번 라벨 갱신
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshLabel);
  } else {
    refreshLabel();
  }
})();
