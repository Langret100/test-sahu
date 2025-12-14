/* ============================================================
   [config.js] 메신저 전용 설정(Apps Script 엔드포인트)
   ------------------------------------------------------------
   - 로그인/회원가입/텍스트 기록: SHEET_WRITE_URL
   - (선택) 사진 업로드: SHEET_IMAGE_UPLOAD_URL
   - iframe 내부(games/social-messenger.html)에서도 동일하게 쓰기 위해
     window 전역으로 함께 노출합니다.

   [제거 시 함께 삭제/수정할 요소]
   1) index.html, games/social-messenger.html 에서 config.js include 제거
   2) js/ui.js / js/login.js / js/chat-photo.js 등에서 참조하는
      SHEET_WRITE_URL / SHEET_IMAGE_UPLOAD_URL 사용부 정리
   ============================================================ */

var SHEET_WRITE_URL = "https://script.google.com/macros/s/AKfycbz6PjWqKuoTmTalX7ieq3NuhJr-6DPwFQI3c7sDCu9cSCFDt90DP4Ju0yIjfjOgyNoI6w/exec";

// 동일 Apps Script에 사진 업로드(mode=social_upload_image)를 추가했다면 기본값 그대로 사용
var SHEET_IMAGE_UPLOAD_URL = SHEET_WRITE_URL;

try {
  window.SHEET_WRITE_URL = SHEET_WRITE_URL;
  window.SHEET_IMAGE_UPLOAD_URL = SHEET_IMAGE_UPLOAD_URL;
} catch (e) {}
