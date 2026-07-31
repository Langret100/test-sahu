// 기본화면 보내기 버튼 길게 누르기 음성 입력
(function () {
  "use strict";

  var HOLD_MS = 420;
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function ensureVoiceStatus(input) {
    var status = document.getElementById("voiceInputStatus");
    if (status) return status;
    status = document.createElement("div");
    status.id = "voiceInputStatus";
    status.setAttribute("aria-live", "polite");
    status.style.cssText = "display:none;position:absolute;left:8px;bottom:calc(100% + 4px);z-index:20;width:max-content;max-width:calc(100% - 16px);white-space:nowrap;writing-mode:horizontal-tb;font-size:12px;line-height:1.3;opacity:.82;pointer-events:none;";
    var host = document.getElementById("inputRow") || (input && input.parentElement) || document.body;
    try {
      var pos = window.getComputedStyle(host).position;
      if (!pos || pos === "static") host.style.position = "relative";
    } catch (e) { host.style.position = "relative"; }
    host.appendChild(status);
    return status;
  }

  function pauseAlwaysListen() {
    try {
      if (window.AlwaysListen && typeof window.AlwaysListen.pauseForVoiceInput === "function") {
        return window.AlwaysListen.pauseForVoiceInput();
      }
    } catch (e) {}
    return false;
  }

  function resumeAlwaysListen(wasPaused) {
    if (!wasPaused) return;
    try {
      if (window.AlwaysListen && typeof window.AlwaysListen.resumeAfterVoiceInput === "function") {
        window.AlwaysListen.resumeAfterVoiceInput();
      }
    } catch (e) {}
  }

  function setup() {
    var button = document.getElementById("sendBtn");
    var input = document.getElementById("userInput");
    if (!button || !input || button.__voiceHoldBound) return;
    button.__voiceHoldBound = true;

    var holdTimer = null;
    var pointerHeld = false;
    var recognition = null;
    var listening = false;
    var longPressTriggered = false;
    var suppressClickUntil = 0;
    var baseText = "";
    var finalText = "";
    var interimText = "";
    var pausedAlwaysListen = false;
    var inputWasReadOnly = false;
    var previousInputMode = null;
    var keyboardGuardUntil = 0;
    var unlockTimer = null;
    var finalized = false;
    var voiceStatus = ensureVoiceStatus(input);

    function setVoiceStatus(message) {
      voiceStatus.textContent = message || "";
      voiceStatus.style.display = message ? "block" : "none";
    }

    function showStatus(message) {
      setVoiceStatus(message);
      clearTimeout(voiceStatus.__hideTimer);
      if (message) {
        voiceStatus.__hideTimer = setTimeout(function () { setVoiceStatus(""); }, 2600);
      }
    }

    function lockVirtualKeyboard() {
      inputWasReadOnly = !!input.readOnly;
      previousInputMode = input.getAttribute("inputmode");
      try { input.blur(); } catch (e) {}
      input.readOnly = true;
      input.setAttribute("inputmode", "none");
    }

    function unlockVirtualKeyboardNow() {
      try { input.blur(); } catch (e) {}
      input.readOnly = inputWasReadOnly;
      if (previousInputMode == null) input.removeAttribute("inputmode");
      else input.setAttribute("inputmode", previousInputMode);
      setTimeout(function () {
        if (Date.now() < keyboardGuardUntil) {
          try { input.blur(); } catch (e) {}
        }
      }, 0);
    }

    function unlockVirtualKeyboard(delay) {
      clearTimeout(unlockTimer);
      unlockTimer = setTimeout(unlockVirtualKeyboardNow, delay || 0);
    }


    function finalizeAndSend() {
      if (finalized) return;
      finalized = true;
      listening = false;
      recognition = null;
      button.classList.remove("voice-listening");
      setVoiceStatus("");
      resumeAlwaysListen(pausedAlwaysListen);
      pausedAlwaysListen = false;

      var spokenText = (finalText + (interimText ? (finalText ? " " : "") + interimText : "")).trim();
      var text = ((baseText ? baseText + " " : "") + spokenText).trim();
      if (text && longPressTriggered) {
        // 전송 직전에만 값을 넣고 바로 전송한다. 인식 중에는 입력창을 건드리지 않는다.
        input.value = text;
        try { input.dispatchEvent(new Event("input", { bubbles: true })); } catch (e0) {}
        try {
          if (typeof window.handleUserSubmit === "function") window.handleUserSubmit();
        } catch (e) {
          console.warn("Voice submit failed:", e);
        }
      }
      keyboardGuardUntil = Date.now() + 1400;
      try { input.blur(); } catch (e) {}
      unlockVirtualKeyboard(1450);
    }

    function startRecognition() {
      if (!pointerHeld || listening) return;
      longPressTriggered = true;
      finalized = false;
      suppressClickUntil = Date.now() + 1400;

      if (!SpeechRecognition) {
        showStatus("이 브라우저에서는 음성 인식을 지원하지 않아요.");
        unlockVirtualKeyboard(300);
        return;
      }

      pausedAlwaysListen = pauseAlwaysListen();
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
        resumeAlwaysListen(pausedAlwaysListen);
        pausedAlwaysListen = false;
        showStatus("음성 인식을 시작할 수 없어요.");
        unlockVirtualKeyboard(300);
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
        if (code === "not-allowed" || code === "service-not-allowed") showStatus("마이크 권한이 막혀 있어요.");
        else if (code === "audio-capture") showStatus("마이크를 찾지 못했어요.");
        else if (code !== "aborted" && code !== "no-speech") showStatus("음성 인식이 끊겼어요.");
      };

      recognition.onend = function () {
        listening = false;
        button.classList.remove("voice-listening");
        recognition = null;
        // 엔진이 먼저 끝나도 손을 떼기 전에는 보내지 않는다.
        if (!pointerHeld) finalizeAndSend();
      };

      try {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        recognition.start();
      } catch (e) {
        recognition = null;
        listening = false;
        button.classList.remove("voice-listening");
        resumeAlwaysListen(pausedAlwaysListen);
        pausedAlwaysListen = false;
        showStatus("음성 인식을 시작하지 못했어요.");
        unlockVirtualKeyboard(300);
      }
    }

    function pressStart(event) {
      if (event && event.button != null && event.button !== 0) return;
      if (pointerHeld) return;
      pointerHeld = true;
      finalized = false;
      lockVirtualKeyboard();
      longPressTriggered = false;
      clearTimeout(holdTimer);
      holdTimer = setTimeout(startRecognition, HOLD_MS);
      try { button.setPointerCapture && event.pointerId != null && button.setPointerCapture(event.pointerId); } catch (e) {}
    }

    function pressEnd(event) {
      if (!pointerHeld && !listening && !longPressTriggered) return;
      if (longPressTriggered && event) {
        try { event.preventDefault(); } catch (e) {}
        try { event.stopPropagation(); } catch (e) {}
      }
      pointerHeld = false;
      clearTimeout(holdTimer);
      if (longPressTriggered) {
        if (recognition) {
          try { recognition.stop(); } catch (e) { finalizeAndSend(); }
        } else {
          finalizeAndSend();
        }
      } else {
        unlockVirtualKeyboard(0);
      }
    }

    input.addEventListener("focus", function () {
      if (Date.now() < keyboardGuardUntil || input.readOnly) {
        try { input.blur(); } catch (e) {}
      }
    }, true);

    button.addEventListener("pointerdown", pressStart);
    button.addEventListener("pointerup", pressEnd);
    button.addEventListener("pointercancel", pressEnd);
    button.addEventListener("contextmenu", function (e) { if (pointerHeld) e.preventDefault(); });

    button.addEventListener("click", function (event) {
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
