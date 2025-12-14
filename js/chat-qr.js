/* ============================================================
 * chat-qr.js
 * - + 첨부 메뉴에서 QR 코드(링크) 스캔 → 채팅으로 공유
 * - 브라우저 BarcodeDetector(지원 시) 사용
 *
 * 제거 시 함께 지울 것:
 * - games/social-messenger.html 의 script include (chat-qr.js)
 * - QR 오버레이 CSS(.qr-scan-overlay 등)
 * ============================================================ */
(function () {
  "use strict";

  var overlay, videoEl, cancelBtn, hintEl;
  var stream = null;
  var scanning = false;
  var detector = null;
  var lastValue = null;
  var tickTimer = null;

  function ensureUI() {
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "qr-scan-overlay";
    overlay.setAttribute("aria-hidden", "true");

    var box = document.createElement("div");
    box.className = "qr-scan-box";

    var header = document.createElement("div");
    header.className = "qr-scan-header";
    header.textContent = "QR 링크 스캔";

    videoEl = document.createElement("video");
    videoEl.className = "qr-scan-video";
    videoEl.setAttribute("playsinline", "true");
    videoEl.autoplay = true;
    videoEl.muted = true;

    hintEl = document.createElement("div");
    hintEl.className = "qr-scan-hint";
    hintEl.textContent = "카메라에 QR 코드를 비춰주세요.";

    cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "qr-scan-cancel";
    cancelBtn.textContent = "닫기";
    cancelBtn.addEventListener("click", function () {
      stop();
    });

    box.appendChild(header);
    box.appendChild(videoEl);
    box.appendChild(hintEl);
    box.appendChild(cancelBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    return overlay;
  }

  function isLikelyUrl(v) {
    if (!v) return false;
    var s = String(v).trim();
    return /^https?:\/\//i.test(s) || /^www\./i.test(s);
  }

  function normalizeUrl(v) {
    var s = String(v || "").trim();
    if (/^www\./i.test(s)) s = "https://" + s;
    return s;
  }

  function show(msg) {
    try {
      ensureUI();
      hintEl.textContent = msg || "";
    } catch (e) {}
  }

  async function start(opts) {
    opts = opts || {};
    ensureUI();

    lastValue = null;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");

    if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
      show("이 브라우저는 카메라를 지원하지 않아요.");
      return;
    }

    // QR 인식기 준비
    if ("BarcodeDetector" in window) {
      try {
        detector = new BarcodeDetector({ formats: ["qr_code"] });
      } catch (e) {
        detector = null;
      }
    }
    if (!detector) {
      show("이 브라우저는 QR 인식을 지원하지 않아요.(BarcodeDetector 미지원)");
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      videoEl.srcObject = stream;
      await videoEl.play();
    } catch (e) {
      show("카메라 권한이 필요해요.");
      return;
    }

    scanning = true;
    show("카메라에 QR 코드를 비춰주세요.");

    async function tick() {
      if (!scanning) return;
      try {
        // 일부 브라우저는 video 준비 전 width/height가 0일 수 있음
        if (!videoEl.videoWidth || !videoEl.videoHeight) {
          tickTimer = setTimeout(tick, 250);
          return;
        }

        var bitmap = await createImageBitmap(videoEl);
        var codes = await detector.detect(bitmap);
        try { bitmap.close && bitmap.close(); } catch (e) {}

        if (codes && codes.length) {
          var val = (codes[0] && (codes[0].rawValue || codes[0].rawValue === "" ? codes[0].rawValue : codes[0].value)) || "";
          val = String(val || "").trim();
          if (val && val !== lastValue) {
            lastValue = val;
            stop();

            var payload = isLikelyUrl(val) ? normalizeUrl(val) : val;
            try { opts.onResult && opts.onResult(payload); } catch (e) {}
            return;
          }
        }
      } catch (e) {
        // 계속 시도
      }
      tickTimer = setTimeout(tick, 250);
    }

    tick();
  }

  function stop() {
    scanning = false;
    if (tickTimer) {
      try { clearTimeout(tickTimer); } catch (e) {}
      tickTimer = null;
    }
    try {
      if (videoEl) videoEl.pause();
    } catch (e) {}

    if (stream) {
      try {
        stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
      } catch (e) {}
      stream = null;
    }
    try {
      if (videoEl) videoEl.srcObject = null;
    } catch (e) {}

    try {
      if (overlay) {
        overlay.classList.remove("open");
        overlay.setAttribute("aria-hidden", "true");
      }
    } catch (e) {}
  }

  window.QRLinkScanner = { start: start, stop: stop };
})();
