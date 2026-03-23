// speech-input.js - 보내기 버튼을 빠르게 두 번 눌러 음성 인식으로 채팅 보내기
// 이 파일을 삭제하면 음성 입력 기능은 완전히 사라집니다.
// actions.js에서 send 버튼 클릭 처리부가 window.__voiceInputLastWasLongPress 플래그를 참고하므로
// 이 파일을 제거할 때는 해당 플래그 관련 코드도 함께 제거해 주세요.

(function(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SpeechRecognition;

  let recognition = null;
  let isRecognizing = false;
  let pressTimer = null;
  let pressStarted = 0;

  function showInfoBubble(message){
    if (!message) return;
    if (window.showBubble) {
      try { window.showBubble(message); } catch(e){}
    }
  }

  function ensureRecognition(){
    if (!supported) return null;
    if (recognition) return recognition;
    const rec = new SpeechRecognition();
    rec.lang = "ko-KR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = function(event){
      isRecognizing = false;
      try { window.__voiceInputLastWasLongPress = true; } catch(e){}
      if (!event.results || !event.results[0] || !event.results[0][0]) return;
      const text = event.results[0][0].transcript || "";
      if (!text) return;

      const input = document.getElementById("userInput");
      if (input) {
        input.value = text;
      }
      if (typeof window.handleUserSubmit === "function") {
        window.handleUserSubmit();
      }
    };

    rec.onerror = function(event){
      isRecognizing = false;
      let msg = "음성 인식 중 문제가 생겼어요. 다시 시도해볼까요?";
      if (event && event.error) {
        switch (event.error) {
          case "not-allowed":
          case "service-not-allowed":
            msg = "마이크 권한이 막혀 있어요. 주소창 옆 마이크 아이콘에서 허용으로 바꿔 주세요.";
            break;
          case "audio-capture":
            msg = "마이크 장치를 찾지 못했어요. 마이크 연결과 설정을 확인해 주세요.";
            break;
          case "no-speech":
            msg = "아무 소리가 들리지 않았어요. 조금 더 또렷하게 말씀해 줄래요?";
            break;
          case "network":
            msg = "네트워크 문제로 음성 인식이 끊겼어요. 잠시 후 다시 시도해 주세요.";
            break;
        }
      }
      showInfoBubble(msg);
    };

    rec.onend = function(){
      isRecognizing = false;
    };

    recognition = rec;
    return rec;
  }

  function startRecognition(){
    if (!supported) {
      showInfoBubble("이 브라우저에서는 음성 인식을 지원하지 않아요.");
      return;
    }
    if (isRecognizing) return;
    const rec = ensureRecognition();
    if (!rec) {
      showInfoBubble("음성 인식을 시작할 수 없어요. 브라우저 설정을 확인해 주세요.");
      return;
    }
    isRecognizing = true;
    try {
      showInfoBubble("지금 말씀해 주세요. 음성을 글로 옮길게요.");
      if (window.speechSynthesis && window.speechSynthesis.cancel) {
        window.speechSynthesis.cancel();
      }
    } catch(e){}
    try {
      rec.start();
    } catch(e){
      isRecognizing = false;
      // 예: 보안 연결(HTTPS)이 아닌 경우 등
      showInfoBubble("이 페이지에서는 음성 인식을 시작할 수 없어요. https 환경인지 확인해 주세요.");
    }
  }

  function clearPressTimer(){
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  function setup(){
    const sendBtn = document.getElementById("sendBtn");
    if (!sendBtn) return;
    // 길게 누르기 대신, 모바일에서는 빠른 "두 번 탭"으로 음성 인식을 시작합니다.
    // - 터치 환경: touchend 기준 더블 탭만 인식
    // - 마우스 환경(PC): click 기준 더블 클릭 인식
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    let lastTap = 0;
    function onTap(ev){
      const now = Date.now();
      const delta = now - lastTap;
      lastTap = now;
      if (delta > 0 && delta < 400) {
        try { window.__voiceInputLastWasLongPress = true; } catch(e){}
        startRecognition();
      }
    }
    // 환경에 따라 하나의 이벤트만 사용해서, 단일 탭이 두 번 카운트되지 않도록 합니다.
    if (isTouch) {
      sendBtn.addEventListener('touchend', onTap);
    } else {
      sendBtn.addEventListener('click', onTap);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
