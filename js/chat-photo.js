/* ============================================================
   [chat-photo.js] 채팅 사진(카메라) 모듈
   ------------------------------------------------------------
   - games/social-messenger.html 의 + 첨부 메뉴(사진촬영/이미지 첨부)와 연결되어,
     이미지 선택/촬영 → 480x480(정사각) 리사이즈 → Apps Script 업로드 → URL 반환.
   - Apps Script는 SHEET_IMAGE_UPLOAD_URL 에서 mode=social_upload_image 를
     처리해야 합니다(Drive 저장 후 공개 URL을 응답).

   [제거 시 함께 삭제할 요소]
   1) js/chat-photo.js
   2) games/social-messenger.html 의 #msgCameraBtn 버튼(+)
   3) games/social-messenger.html 의 <script src="../js/chat-photo.js"></script>
   ============================================================ */

(function () {
  if (window.ChatPhoto) return;

  var DEFAULT_SIZE = 480;
  var DEFAULT_QUALITY = 0.78; // jpeg quality

  // (기능) 사진/이미지 선택용 input
  // - 사진촬영: capture=environment
  // - 이미지첨부: capture 속성 제거(앨범/파일 선택)
  var inputEl = null;

  function ensureInput() {
    if (inputEl) return inputEl;
    inputEl = document.createElement("input");
    inputEl.type = "file";
    inputEl.accept = "image/*";
    inputEl.style.position = "fixed";
    inputEl.style.left = "-9999px";
    inputEl.style.top = "-9999px";
    document.body.appendChild(inputEl);
    return inputEl;
  }

  // capture 설정(사진촬영/이미지첨부 분기)
  function setCaptureEnabled(enabled) {
    var input = ensureInput();
    try {
      if (enabled) input.setAttribute("capture", "environment");
      else input.removeAttribute("capture");
    } catch (e) {}
  }

  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(new Error("file read failed")); };
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("image load failed")); };
      img.src = src;
    });
  }

  // 중앙 크롭(정사각) + 리사이즈
  function resizeToSquare(dataUrl, size, quality) {
    size = size || DEFAULT_SIZE;
    quality = (quality == null ? DEFAULT_QUALITY : quality);
    return loadImage(dataUrl).then(function (img) {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      var side = Math.min(w, h);
      var sx = Math.floor((w - side) / 2);
      var sy = Math.floor((h - side) / 2);

      var canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      var ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

      return new Promise(function (resolve) {
        canvas.toBlob(function (blob) {
          if (!blob) {
            // fallback: dataURL
            var fallback = canvas.toDataURL("image/jpeg", quality);
            resolve({
              blob: null,
              mime: "image/jpeg",
              dataUrl: fallback
            });
            return;
          }
          var r = new FileReader();
          r.onload = function () {
            resolve({
              blob: blob,
              mime: blob.type || "image/jpeg",
              dataUrl: String(r.result || "")
            });
          };
          r.readAsDataURL(blob);
        }, "image/jpeg", quality);
      });
    });
  }

  async function uploadToSheet(opts) {
    // opts: { base64, mime, user_id, nickname, ts }
    if (typeof window.fetch !== "function") throw new Error("fetch not available");
    if (typeof window.SHEET_IMAGE_UPLOAD_URL === "undefined" || !window.SHEET_IMAGE_UPLOAD_URL) {
      throw new Error("SHEET_IMAGE_UPLOAD_URL not configured");
    }
    var body = new URLSearchParams();
    body.append("mode", "social_upload_image");
    body.append("mime", opts.mime || "image/jpeg");
    body.append("data", opts.base64 || "");
    body.append("user_id", opts.user_id || "");
    body.append("nickname", opts.nickname || "");
    body.append("ts", String(opts.ts || Date.now()));

    var res = await fetch(window.SHEET_IMAGE_UPLOAD_URL, {
      method: "POST",
      body: body
    });
    var txt = await res.text();
    var json = {};
    try { json = JSON.parse(txt || "{}"); } catch (e) {}
    if (!res.ok || !json || !json.ok) {
      throw new Error((json && json.error) ? json.error : "upload failed");
    }
    var url = json.url || json.image_url || "";
    if (!url) throw new Error("no url returned");
    return { url: url };
  }

  // 사용자 액션: 사진 선택/촬영 → 리사이즈 → 업로드
  function pickAndUpload(params) {
    params = params || {};
    var size = params.size || DEFAULT_SIZE;
    var quality = (params.quality == null ? DEFAULT_QUALITY : params.quality);
    var user_id = params.user_id || "";
    var nickname = params.nickname || "";

    // (기능) 사진촬영/이미지첨부
    // - params.capture === true  -> 사진촬영(가능하면 카메라 UI 우선)
    // - params.capture === false -> 이미지첨부(앨범/파일 선택)
    setCaptureEnabled(!!params.capture);

    var input = ensureInput();
    input.value = "";

    return new Promise(function (resolve, reject) {
      var onChange = async function () {
        try {
          input.removeEventListener("change", onChange);
          var file = input.files && input.files[0];
          if (!file) {
            reject(new Error("no file"));
            return;
          }
          var dataUrl = await readFileAsDataURL(file);
          var resized = await resizeToSquare(dataUrl, size, quality);

          // dataUrl -> base64 only
          var base64 = resized.dataUrl.split(",").slice(1).join(",");
          if (!base64) throw new Error("base64 empty");

          var result = await uploadToSheet({
            base64: base64,
            mime: resized.mime || "image/jpeg",
            user_id: user_id,
            nickname: nickname,
            ts: Date.now()
          });
          resolve(result);
        } catch (e) {
          reject(e);
        }
      };
      input.addEventListener("change", onChange);
      try { input.click(); } catch (e) { reject(e); }
    });
  }

  window.ChatPhoto = {
    pickAndUpload: pickAndUpload
  };
})();
