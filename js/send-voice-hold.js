// 실시간-챗(마이파이) 보내기 버튼 길게 누르기 음성 입력
(function () {
  "use strict";

  var HOLD_MS = 420;
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function ensureVoiceStatus(input) {
    var status = document.getElementById("msgVoiceInputStatus");
    if (status) return status;
    status = document.createElement("div");
    status.id = "msgVoiceInputStatus";
    status.setAttribute("aria-live", "polite");
    status.style.cssText = "display:none;position:absolute;left:8px;bottom:calc(100% + 4px);z-index:20;width:max-content;max-width:calc(100% - 16px);white-space:nowrap;writing-mode:horizontal-tb;font-size:12px;line-height:1.3;opacity:.82;pointer-events:none;";
    var wrap = input && input.closest ? input.closest(".msg-input-wrap") : null;
    var host = (wrap && wrap.parentElement) || (input && input.parentElement) || document.body;
    try {
      var pos = window.getComputedStyle(host).position;
      if (!pos || pos === "static") host.style.position = "relative";
    } catch (e) { host.style.position = "relative"; }
    host.appendChild(status);
    return status;
  }

  function setup() {
    var button = document.getElementById("msgSendBtn");
    var input = document.getElementById("msgInput");
    if (!button || !input || button.__voiceHoldBound) return;
    button.__voiceHoldBound = true;

    var holdTimer = null;
    var held = false;
    var recognition = null;
    var listening = false;
    var longPressTriggered = false;
    var suppressClickUntil = 0;
    var baseText = "";
    var finalText = "";
    var interimText = "";
    var inputLockTimer = null;
    var oldReadOnly = false;
    var oldInputMode = null;
    var voiceInputLocked = false;
    var finalized = false;
    var voiceStatus = ensureVoiceStatus(input);

    function setVoiceStatus(message) {
      voiceStatus.textContent = message || "";
      voiceStatus.style.display = message ? "block" : "none";
    }

    function showStatus(message) {
      setVoiceStatus(message);
      clearTimeout(voiceStatus.__hideTimer);
      if (message) voiceStatus.__hideTimer = setTimeout(function () { setVoiceStatus(""); }, 2200);
    }

    function lockInputForVoice() {
      clearTimeout(inputLockTimer);
      if (!voiceInputLocked) {
        oldReadOnly = !!input.readOnly;
        oldInputMode = input.getAttribute("inputmode");
      }
      voiceInputLocked = true;
      input.readOnly = true;
      input.setAttribute("inputmode", "none");
      try { input.blur(); } catch (e) {}
    }

    function unlockInputAfterVoice(delay) {
      clearTimeout(inputLockTimer);
      inputLockTimer = setTimeout(function () {
        try { input.blur(); } catch (e) {}
        input.readOnly = oldReadOnly;
        if (oldInputMode == null) input.removeAttribute("inputmode");
        else input.setAttribute("inputmode", oldInputMode);
        voiceInputLocked = false;
      }, delay == null ? 1200 : delay);
    }


    function finalizeAndSend() {
      if (finalized) return;
      finalized = true;
      listening = false;
      recognition = null;
      button.classList.remove("voice-listening");
      setVoiceStatus("");
      var spokenText = (finalText + (interimText ? (finalText ? " " : "") + interimText : "")).trim();
      var text = ((baseText ? baseText + " " : "") + spokenText).trim();
      if (text && longPressTriggered) {
        // 전송 직전에만 값을 넣고 바로 전송한다. 인식 중에는 입력창을 건드리지 않는다.
        input.value = text;
        try { input.dispatchEvent(new Event("input", { bubbles: true })); } catch (e0) {}
        button.__voiceProgrammaticSend = true;
        try { button.click(); } catch (e) {}
        setTimeout(function () {
          button.__voiceProgrammaticSend = false;
          try { input.blur(); } catch (e2) {}
        }, 0);
      }
      unlockInputAfterVoice(1350);
    }

    function start() {
      if (!held || listening) return;
      longPressTriggered = true;
      finalized = false;
      suppressClickUntil = Date.now() + 1500;
      lockInputForVoice();

      if (!SpeechRecognition) {
        showStatus("이 브라우저에서는 음성 인식을 지원하지 않아요.");
        unlockInputAfterVoice(300);
        return;
      }

      baseText = String(input.value || "").trim();
      finalText = "";
      interimText = "";

      try {
        recognition = new SpeechRecognition();
        recognition.lang = "ko-KR";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
      } catch (e) {
        showStatus("음성 인식을 시작할 수 없어요.");
        unlockInputAfterVoice(300);
        return;
      }

      recognition.onstart = function () {
        listening = true;
        button.classList.add("voice-listening");
        setVoiceStatus("🎤 음성인식 중…");
      };
      recognition.onresult = function (event) {
        interimText = "";
        for (var i = event.resultIndex; i < event.results.length; i++) {
          var result = event.results[i];
          if (!result || !result[0]) continue;
          var text = String(result[0].transcript || "").trim();
          if (!text) continue;
          if (result.isFinal) finalText += (finalText ? " " : "") + text;
          else interimText += (interimText ? " " : "") + text;
        }
        // 인식 중에는 기존 채팅 입력창을 변경하지 않는다.
      };
      recognition.onerror = function (event) {
        var code = event && event.error ? event.error : "";
        if (code === "not-allowed" || code === "service-not-allowed") showStatus("마이크 권한을 허용해 주세요.");
        else if (code === "audio-capture") showStatus("마이크 장치를 찾지 못했어요.");
        else if (code !== "aborted" && code !== "no-speech") showStatus("음성 인식이 끊겼어요.");
      };
      recognition.onend = function () {
        listening = false;
        button.classList.remove("voice-listening");
        recognition = null;
        // 엔진 종료가 손 떼기보다 빨라도 자동 전송하지 않는다.
        if (!held) finalizeAndSend();
      };

      try { recognition.start(); }
      catch (e) {
        recognition = null;
        setVoiceStatus("");
        showStatus("음성 인식을 시작하지 못했어요.");
        unlockInputAfterVoice(300);
      }
    }

    function pressStart(event) {
      if (event && event.button != null && event.button !== 0) return;
      if (held) return;
      held = true;
      finalized = false;
      longPressTriggered = false;
      clearTimeout(holdTimer);
      holdTimer = setTimeout(start, HOLD_MS);
      try { button.setPointerCapture && event.pointerId != null && button.setPointerCapture(event.pointerId); } catch (e) {}
    }

    function pressEnd(event) {
      if (!held && !listening && !longPressTriggered) return;
      if (longPressTriggered && event) {
        try { event.preventDefault(); } catch (e) {}
        try { event.stopPropagation(); } catch (e) {}
      }
      held = false;
      clearTimeout(holdTimer);
      if (longPressTriggered) {
        if (recognition) {
          try { recognition.stop(); } catch (e) { finalizeAndSend(); }
        } else {
          finalizeAndSend();
        }
      }
    }

    input.addEventListener("focus", function () {
      if (!voiceInputLocked) return;
      setTimeout(function () { try { input.blur(); } catch (e) {} }, 0);
    }, true);

    button.addEventListener("pointerdown", pressStart);
    button.addEventListener("pointerup", pressEnd);
    button.addEventListener("pointercancel", pressEnd);
    button.addEventListener("contextmenu", function (e) { if (held) e.preventDefault(); });

    button.addEventListener("click", function (event) {
      if (button.__voiceProgrammaticSend) return;
      if (!longPressTriggered && Date.now() >= suppressClickUntil) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      longPressTriggered = false;
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
