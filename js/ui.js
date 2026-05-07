/* ============================================================
   [ui.js] 공용 네트워크 유틸 (Apps Script POST)
   ------------------------------------------------------------
   - 로그인/회원가입/메시지 저장에서 공통으로 쓰는 postToSheet()만 제공합니다.
   - 현재 패키지에서 동작에 관여하지 않는(미사용) 보드/게시판 UI 관련 코드는 제거했습니다.

   [제거 시 함께 삭제/수정할 요소]
   1) index.html, games/social-messenger.html 에서 ui.js include 제거
   2) js/login.js / js/social-messenger.js 등에서 postToSheet() 사용부 정리
   ============================================================ */

(function () {
  /**
   * Apps Script에 POST로 보내는 헬퍼
   * - form-urlencoded로 보내 CORS preflight를 피합니다.
   * - fetch 기반(Promise 반환)
   */
  function postToSheet(payload) {
    try {
      if (!window.fetch || !window.SHEET_WRITE_URL) {
        return Promise.reject(new Error("SHEET_WRITE_URL not configured or fetch not available"));
      }

      var parts = [];
      payload = payload || {};
      Object.keys(payload).forEach(function (key) {
        var v = payload[key];
        if (v === undefined || v === null) return;
        parts.push(encodeURIComponent(String(key)) + "=" + encodeURIComponent(String(v)));
      });
      var body = parts.join("&");

      return fetch(window.SHEET_WRITE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: body
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  // 전역 노출(기존 코드 호환)
  try {
    window.postToSheet = postToSheet;
  } catch (e) {}
})();
