// [옵션 모듈] 말풍선 TTS 읽어주기 - tts-voice.js
// - 말풍선(showBubble) 내용이 표시될 때 Web Speech API로 음성을 재생합니다.
// - 플러스(+) 메뉴의 '읽어주기' 버튼으로 ON/OFF 및 음성 선택 UI를 제공합니다.

(function(){
  const STORAGE_KEY = "ghostTTSOn";
  const VOICE_KEY = "ghostTTSVoice";

  // Web Speech API 가 없는 환경에서는 바로 비활성화
  const hasSpeech = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);

  let enabled = true;
  let selectedVoiceId = null; // voice.name 또는 voiceURI 저장
  let voicesCache = [];
  let settingsPanel = null;

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
      utter.rate = 1.0;
      utter.pitch = 1.0;

      // 이전 재생 중인 음성 정리
      try { window.speechSynthesis.cancel(); } catch(e){}
      window.speechSynthesis.speak(utter);
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
      const sample = "지금 선택된 목소리로 읽어 드릴게요.";
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
