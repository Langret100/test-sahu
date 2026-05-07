/* ============================================================
   [send-voice-hold.js] 보내기 버튼 '꾹 누르기' 음성인식
   ------------------------------------------------------------
   - #msgSendBtn을 짧게 누르면 기존처럼 텍스트 전송(기존 click 핸들러 유지)
   - '꾹 누르기'(기본 450ms) 시 Web Speech API로 음성인식을 시작하고,
     손을 떼면 인식을 종료합니다.
   - 인식된 텍스트는 #msgInput에 입력(또는 추가)됩니다.

   [제거 시 함께 삭제/정리할 요소]
   1) games/social-messenger.html 에서 본 스크립트 include 제거
      - <script src="../js/send-voice-hold.js"></script>
   ============================================================ */

(function () {
  var HOLD_MS = 450;

  function toast(text) {
    try {
      var el = document.getElementById("msgStatus");
      if (!el) return;
      el.textContent = text || "";
      el.classList.add("show");
      clearTimeout(el.__toastTimer);
      el.__toastTimer = setTimeout(function () {
        el.classList.remove("show");
      }, 1200);
    } catch (e) {}
  }

  function getRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function bind() {
    var sendBtn = document.getElementById("msgSendBtn");
    var inputEl = document.getElementById("msgInput");
    if (!sendBtn || !inputEl) return;

    var Rec = getRecognitionCtor();
    var recognition = null;
    var holding = false;
    var holdTimer = null;
    var voiceActive = false;
    var ignoreNextClick = false;
    var originalLabel = sendBtn.textContent || "보내기";

    function setBtnListening(on) {
      // 버튼 라벨은 바꾸지 않습니다(보내기 버튼 유지).
      // 필요 시 스타일만 토글(기본 CSS엔 영향 없음)
      try {
        if (on) sendBtn.classList.add("voice-listening");
        else sendBtn.classList.remove("voice-listening");
      } catch (e) {}
    }


    function startVoice() {
      if (!Rec) {
        toast("이 브라우저는 음성인식을 지원하지 않아요.");
        return;
      }

      // 새 인스턴스로 시작(일부 환경에서 재사용 시 오류 방지)
      try {
        recognition = new Rec();
      } catch (e) {
        toast("음성인식을 시작할 수 없어요.");
        return;
      }

      voiceActive = true;
      ignoreNextClick = true;
      setBtnListening(true);
      toast("🎤 듣는 중… (손을 떼면 종료)");

      try {
        recognition.lang = "ko-KR";
        recognition.interimResults = true;
        recognition.continuous = true;
      } catch (e) {}

      var interim = "";
      var finalText = "";

      recognition.onresult = function (event) {
        try {
          interim = "";
          for (var i = event.resultIndex; i < event.results.length; i++) {
            var res = event.results[i];
            if (!res || !res[0]) continue;
            var txt = String(res[0].transcript || "").trim();
            if (!txt) continue;
            if (res.isFinal) finalText += (finalText ? " " : "") + txt;
            else interim += (interim ? " " : "") + txt;
          }

          // 입력창에는 interim+final을 미리 보여줌(확정되면 final로 정리)
          var base = inputEl.__voiceBaseText;
          if (typeof base !== "string") base = inputEl.value || "";
          var merged = (base ? base + " " : "") + (finalText || interim);
          inputEl.value = merged.trim();
        } catch (e) {}
      };

      recognition.onerror = function (e) {
        try {
          // not-allowed / service-not-allowed / network 등
          toast("음성인식이 차단되었거나 사용할 수 없어요.");
        } catch (e2) {}
      };

      recognition.onend = function () {
        // 사용자가 손을 떼어서 stop()한 경우에도 onend로 들어옴
        voiceActive = false;
        setBtnListening(false);

        // (요구사항) 손을 떼면 인식된 텍스트를 그대로 전송
        try {
          var textToSend = (inputEl.value || "").trim();
          if (textToSend) {
            // touchend 후 따라오는 click 전송은 차단하되,
            // 여기서만(음성 종료 시) 프로그램matic 전송을 허용
            sendBtn.__voiceBypassClick = true;
            try { sendBtn.click(); } catch (e0) {}
            setTimeout(function () {
              try { sendBtn.__voiceBypassClick = false; } catch (e1) {}
            }, 0);
          }
        } catch (eSend) {}

        try {
          inputEl.__voiceBaseText = null;
          inputEl.focus();
        } catch (e) {}

        // 클릭 전송 방지 플래그는 잠깐 유지
        setTimeout(function () {
          ignoreNextClick = false;
        }, 350);
      };

      try {
        // 현재 입력값을 base로 잡고, 인식 텍스트를 이어붙임
        inputEl.__voiceBaseText = inputEl.value || "";
      } catch (e) {}

      try {
        recognition.start();
      } catch (e) {
        // 이미 시작된 상태 등
        toast("음성인식을 시작할 수 없어요.");
        voiceActive = false;
        setBtnListening(false);
      }
    }

    function stopVoice() {
      try {
        if (recognition && voiceActive) {
          recognition.stop();
        }
      } catch (e) {
        // ignore
      }
    }

    function onPressStart(ev) {
      // 마우스 우클릭 등 제외
      try {
        if (ev && ev.button != null && ev.button !== 0) return;
      } catch (e) {}

      holding = true;
      clearTimeout(holdTimer);

      holdTimer = setTimeout(function () {
        if (!holding) return;
        startVoice();
      }, HOLD_MS);
    }

    function onPressEnd() {
      holding = false;
      clearTimeout(holdTimer);

      // 길게 눌러 음성모드가 켜졌다면, 손을 떼면 종료
      if (voiceActive) {
        stopVoice();
      }
    }

    // (중요) long-press 후 발생하는 click 전송을 캡처 단계에서 차단
    sendBtn.addEventListener(
      "click",
      function (ev) {
        if (!ignoreNextClick) return;
        try { if (sendBtn.__voiceBypassClick) return; } catch (e0) {}
        ev.preventDefault();
        ev.stopPropagation();
        if (typeof ev.stopImmediatePropagation === "function") ev.stopImmediatePropagation();
      },
      true
    );

    // Pointer Events 우선
    sendBtn.addEventListener("pointerdown", onPressStart);
    sendBtn.addEventListener("pointerup", onPressEnd);
    sendBtn.addEventListener("pointercancel", onPressEnd);
    sendBtn.addEventListener("pointerleave", onPressEnd);

    // 구형 모바일(혹시) 대비
    sendBtn.addEventListener("touchstart", onPressStart, { passive: true });
    sendBtn.addEventListener("touchend", onPressEnd);
    sendBtn.addEventListener("touchcancel", onPressEnd);

    // 마우스(데스크톱) 대비
    sendBtn.addEventListener("mousedown", onPressStart);
    document.addEventListener("mouseup", onPressEnd);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
