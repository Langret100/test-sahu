/* ============================================================
   [chat-file.js] 채팅 파일 첨부/업로드 모듈(5MB 제한)
   ------------------------------------------------------------
   - games/social-messenger.html 의 + 메뉴(파일 첨부)에서 사용됩니다.
   - 파일 선택 → (클라이언트) 5MB 제한 검사 → base64 변환 → Apps Script 업로드 → URL 반환.

   [서버(Apps Script) 요구]
   - SHEET_IMAGE_UPLOAD_URL(Web App)에서 mode=social_upload_file 요청을
     처리해야 합니다(Drive 저장 후 공개 URL을 응답).

   [제거 시 함께 삭제할 요소]
   1) js/chat-file.js
   2) games/social-messenger.html 의 <script src="../js/chat-file.js"></script>
   3) (선택) apps_script/ADDON_social_upload_file.gs (예시)
   ============================================================ */

(function () {
  if (window.ChatFile) return;

  var DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5MB
  var inputEl = null;

  function ensureInput() {
    if (inputEl) return inputEl;
    inputEl = document.createElement("input");
    inputEl.type = "file";
    inputEl.accept = "*/*";
    inputEl.style.position = "fixed";
    inputEl.style.left = "-9999px";
    inputEl.style.top = "-9999px";
    document.body.appendChild(inputEl);
    return inputEl;
  }

  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(new Error("file read failed")); };
      reader.readAsDataURL(file);
    });
  }

  async function uploadToSheet(opts) {
    // opts: { base64, mime, filename, size, user_id, nickname, ts }
    if (typeof window.fetch !== "function") throw new Error("fetch not available");
    if (typeof window.SHEET_IMAGE_UPLOAD_URL === "undefined" || !window.SHEET_IMAGE_UPLOAD_URL) {
      throw new Error("SHEET_IMAGE_UPLOAD_URL not configured");
    }
    var body = new URLSearchParams();
    body.append("mode", "social_upload_file");
    body.append("mime", opts.mime || "application/octet-stream");
    body.append("filename", opts.filename || "file");
    body.append("size", String(opts.size || 0));
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
    var url = json.url || json.file_url || "";
    if (!url) throw new Error("no url returned");
    return { url: url };
  }

  // 사용자 액션: 파일 선택 → size 검사 → 업로드
  function pickAndUpload(params) {
    params = params || {};
    var maxBytes = (params.maxBytes == null ? DEFAULT_MAX_BYTES : params.maxBytes);
    var user_id = params.user_id || "";
    var nickname = params.nickname || "";

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

          // (요구사항) 5MB 제한
          if (maxBytes && file.size > maxBytes) {
            reject(new Error("file too large"));
            return;
          }

          var dataUrl = await readFileAsDataURL(file);
          var base64 = dataUrl.split(",").slice(1).join(",");
          if (!base64) throw new Error("base64 empty");

          var result = await uploadToSheet({
            base64: base64,
            mime: file.type || "application/octet-stream",
            filename: file.name || "file",
            size: file.size || 0,
            user_id: user_id,
            nickname: nickname,
            ts: Date.now()
          });

          resolve({
            url: result.url,
            filename: file.name || "file",
            mime: file.type || "application/octet-stream",
            size: file.size || 0
          });
        } catch (e) {
          reject(e);
        }
      };
      input.addEventListener("change", onChange);
      try { input.click(); } catch (e) { reject(e); }
    });
  }

  window.ChatFile = {
    DEFAULT_MAX_BYTES: DEFAULT_MAX_BYTES,
    pickAndUpload: pickAndUpload
  };
})();
