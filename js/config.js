/* ============================================================
   [config.js] 메신저 전용 설정
   ------------------------------------------------------------
   - 로그인/회원가입/텍스트 기록/이미지 업로드: SHEET_WRITE_URL (Apps Script)
   - Firebase: 메시지 실시간 저장/로딩 (빠름), 구글 시트는 백업 전용
   ============================================================ */

/* ── 1. Apps Script 엔드포인트 ── */
var SHEET_WRITE_URL = "https://script.google.com/macros/s/AKfycbz6PjWqKuoTmTalX7ieq3NuhJr-6DPwFQI3c7sDCu9cSCFDt90DP4Ju0yIjfjOgyNoI6w/exec";
var SHEET_IMAGE_UPLOAD_URL = SHEET_WRITE_URL;

try {
  window.SHEET_WRITE_URL        = SHEET_WRITE_URL;
  window.SHEET_IMAGE_UPLOAD_URL = SHEET_IMAGE_UPLOAD_URL;
} catch (e) {}

/* ── 2. Firebase 설정 ──────────────────────────────────────
   apiKey 는 GitHub Actions secrets(FIREBASE_API_KEY)로 주입됩니다.
   배포 시 __FIREBASE_API_KEY__ 가 실제 키로 자동 치환됩니다.
   ────────────────────────────────────────────────────────── */
var FIREBASE_CONFIG = {
  apiKey:            "__FIREBASE_API_KEY__",
  authDomain:        "web-ghost-c447b.firebaseapp.com",
  databaseURL:       "https://web-ghost-c447b-default-rtdb.firebaseio.com",
  projectId:         "web-ghost-c447b",
  storageBucket:     "web-ghost-c447b.firebasestorage.app",
  messagingSenderId: "198377381878",
  appId:             "1:198377381878:web:83b56b1b4d63138d27b1d7"
};

/* ── 3. Firebase 초기화 (중복 방지) ── */
(function () {
  try {
    if (typeof firebase === "undefined") return;
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
  } catch (e) {
    console.warn("[config.js] Firebase 초기화 실패:", e.message || e);
  }
})();

/* ── 4. postToSheet fallback ──────────────────────────────
   ui.js 가 로드되기 전 환경에서도 동작하도록 기본 구현 제공.
   ui.js 가 이미 window.postToSheet 를 정의했으면 스킵.
   ────────────────────────────────────────────────────────── */
(function () {
  if (typeof window.postToSheet === "function") return;

  window.postToSheet = function (payload) {
    var url = window.SHEET_WRITE_URL || SHEET_WRITE_URL;
    if (!url) return Promise.reject(new Error("SHEET_WRITE_URL not set"));
    var parts = [];
    Object.keys(payload || {}).forEach(function (k) {
      var v = payload[k];
      if (v === undefined || v === null) return;
      parts.push(encodeURIComponent(String(k)) + "=" + encodeURIComponent(String(v)));
    });
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: parts.join("&")
    });
  };
})();
