/* ============================================================
   [js/mypai-adbar-gdrive.js] (독립 모듈)
   ------------------------------------------------------------
   목적
   - 기본화면(캐릭터 화면)과 실시간 톡 화면에 Google Drive 폴더 기반 광고바를 표시합니다.
   - 기능은 이 파일 하나로 분리되어 있어, 언제든 삭제/수정하기 쉽습니다.

   표시 위치
   1) 기본화면(index.html)
      - 화면 최상단 fixed(겹침) 높이 50px 광고바
      - 광고가 '실제로 표시되고' 보이는 동안만:
        * 시계(#clockWidget)
        * 퀘스트/코인 바(#questStatusBar)
        를 50px 아래로 내림
      - 광고가 없거나, X로 닫거나, iframe(gameFrame)으로 다른 화면을 열면 원위치 복원

   2) 실시간 톡(games/social-messenger.html)
      - 상단바(.messenger-topbar) 바로 아래 높이 50px 광고바 삽입
      - 광고가 없으면 해당 영역은 없는 것처럼 제거

   광고 소스(Drive)
   - Apps Script WebApp(doGet)에서 mode=ad_list_images로 이미지 목록을 받아옵니다.
   - 폴더(WebGhost_Advertisement_Uploads) ID: 1__kQpi9LkghrcZMB7qLVdhGnyFnps3z_

   이미지 표시 규칙
   - 광고칸보다 이미지가 작으면: ✅ 확대하지 않고 중앙 정렬, 빈 공간 투명
   - 모바일(폭 < 768): cover처럼 채우되 ✅ 업스케일 최대 2배까지만
   - PC(폭 >= 768): ✅ 업스케일(확대) 금지 (축소만 허용)

   닫기(X)
   - 우측 상단에 'x'만 표시
   - ✅ 닫아도 저장하지 않음 → 새로고침/재접속 시 다시 표시

   광고 클릭(링크 규칙)
   - 파일명에 link=... 로 링크를 지정할 수 있습니다.
   - Windows 파일명 호환을 위해 토큰 치환을 지원합니다:
     * __   -> /
     * __q__  -> ?
     * __a__  -> &
     * __eq__ -> =
   - 예) 내부 실시간톡 특정 방으로(권장: github.io 전체 URL 불필요)
     놀이는여기에서_link=room__eq__r_9e0b92b2f868.png
     => room=r_9e0b92b2f868  (클릭 시 내부 iframe로 /games/social-messenger.html?room=... 오픈)

   - 예) 기존 방식(절대/상대 링크 모두 지원)
     놀이는여기에서_link=games__social-messenger.html__q__room__eq__r_9e0b92b2f868.png
     => /games/social-messenger.html?room=r_9e0b92b2f868

   앱 내부로 실시간 톡 열기
   - 링크가 /games/social-messenger.html 로 향하면(또는 room= 단축 표기면)
     새 탭이 아니라 앱 내부 iframe(#gameFrame)로 "지금처럼" 엽니다.
     (가능하면 window.launchMessenger() 호출)

   삭제 방법
   - index.html / games/social-messenger.html 에서
     <script src="js/mypai-adbar-gdrive.js"></script> 라인을 제거하면 끝.
   ============================================================ */

(function () {
  "use strict";

  // =========================
  // 설정(필요시 여기만 수정)
  // =========================
  var CONFIG = {
    SLOT_HEIGHT_PX: 50,

    // ✅ Apps Script Web App exec URL (기본화면에서 config.js를 로드하지 않아도 동작하도록 고정값 포함)
    EXEC_URL: "https://script.google.com/macros/s/AKfycbz6PjWqKuoTmTalX7ieq3NuhJr-6DPwFQI3c7sDCu9cSCFDt90DP4Ju0yIjfjOgyNoI6w/exec",

    // 광고 이미지 Drive 폴더 ID
    AD_FOLDER_ID: "1__kQpi9LkghrcZMB7qLVdhGnyFnps3z_",

    // 서버 모드
    MODE_LIST: "ad_list_images",

    // DOM id
    BASE_BAR_ID: "mypai-adbar-base",
    CHAT_BAR_ID: "mypai-adbar-chat",

    // PC 판별 폭 (원하면 조정)
    DESKTOP_MIN_WIDTH: 768,

    // ✅ 광고 자동 순환(10초)
    ROTATE_MS: 10000
  };

  // =========================
  // 유틸
  // =========================
  function getExecUrl_() {
    // config.js에서 SHEET_WRITE_URL이 있다면 우선 사용 (실시간톡 페이지 등)
    try {
      if (typeof SHEET_WRITE_URL === "string" && SHEET_WRITE_URL.indexOf("script.google.com") >= 0) {
        return SHEET_WRITE_URL;
      }
    } catch (e) {}
    return CONFIG.EXEC_URL;
  }

  function buildListUrl_() {
    var execUrl = getExecUrl_();
    if (!execUrl) return "";
    var sep = execUrl.indexOf("?") >= 0 ? "&" : "?";
    return execUrl + sep +
      "mode=" + encodeURIComponent(CONFIG.MODE_LIST) +
      "&folderId=" + encodeURIComponent(CONFIG.AD_FOLDER_ID);
  }

  function safeJsonFetch_(url) {
    return fetch(url, { method: "GET" })
      .then(function (r) { return r.json(); })
      .catch(function () { return null; });
  }

  function pickRandom_(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function isDesktop_() {
    return (window.innerWidth || 0) >= CONFIG.DESKTOP_MIN_WIDTH;
  }

  function buildDrivePreviewUrl_(fileId) {
    return "https://drive.google.com/file/d/" + encodeURIComponent(String(fileId)) + "/view";
  }

  // JPG/PNG는 thumbnail이 안정적, GIF는 thumbnail이 첫 프레임일 수 있어 direct view 우선
  function buildThumbUrl_(fileId) {
    return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(String(fileId)) + "&sz=w1600";
  }
  function buildDirectViewUrl_(fileId) {
    return "https://drive.google.com/uc?export=view&id=" + encodeURIComponent(String(fileId));
  }


// =========================
// 프로젝트 루트 경로 계산 (GitHub Pages 서브폴더/로컬 file:// 모두 대응)
// =========================
function getProjectRoot_() {
  // 가장 안정적인 방법: 이 스크립트(js/mypai-adbar-gdrive.js)가 로드된 경로에서 프로젝트 루트를 역산
  try {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i] && scripts[i].src ? String(scripts[i].src) : "";
      if (!src) continue;
      if (src.indexOf("mypai-adbar-gdrive.js") < 0) continue;

      try {
        var su = new URL(src, window.location.href);
        var sp = su.pathname || "";
        // .../<repo>/js/mypai-adbar-gdrive.js  -> .../<repo>/
        var jidx = sp.lastIndexOf("/js/");
        if (jidx >= 0) return sp.slice(0, jidx + 1);
        // 혹시 js 폴더가 다르면 파일명 기준으로 폴더를 잘라냄
        return sp.replace(/\/[^\/]*$/, "/");
      } catch (e1) {
        // ignore and continue
      }
    }
  } catch (e0) {
    // ignore
  }

  // fallback: 현재 페이지 경로에서 추정(과거 방식)
  try {
    var p = window.location.pathname || "/";
    if (p.endsWith("/")) return p;
    var idx = p.indexOf("/games/");
    if (idx >= 0) return p.slice(0, idx + 1); // .../ (games 앞까지)
    return p.replace(/\/[^\/]*$/, "/"); // 파일명 제거
  } catch (e2) {
    return "/";
  }
}



  // =========================
  // link= 파일명 파싱
  // =========================
  function extractUrlFromName_(name) {
    if (!name) return "";
    var s = String(name);

    // link=.... 토큰 지원 (__ / __q__ / __a__ / __eq__)
    var m0 = s.match(/link=([^\s\)\]]+)/i);
    if (m0 && m0[1]) {
      var raw = m0[1];

      // query 토큰 먼저
      raw = raw.replace(/__q__/g, "?");
      raw = raw.replace(/__a__/g, "&");
      raw = raw.replace(/__eq__/g, "=");

      // path 토큰
      raw = raw.replace(/__/g, "/");

      // 확장자 꼬리 제거
      raw = raw.replace(/\.(png|jpg|jpeg|gif|webp)$/i, "");

      // ✅ 내부 딥링크용 "room=ROOM_ID" 단축 표기 지원 (github.io 전체 URL 불필요)
      // 예) link=room__eq__r_9e0b92b2f868.png  ->  room=r_9e0b92b2f868
      if (/^room\s*=\s*[a-z0-9_\-]+$/i.test(raw)) return raw;

      // /games/social-messenger.html 상대/절대 경로 지원
      if (/^games\/social-messenger\.html/i.test(raw)) raw = "/" + raw;
      if (/^\/games\/social-messenger\.html/i.test(raw)) return raw;

      // https://, // 로 시작하면 그대로
      if (/^https?:\/\//i.test(raw)) return raw;
      if (/^\/\//.test(raw)) return (window.location.protocol || "https:") + raw;

      // host로 시작하는 경우에만 https:// 자동 추가
      if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|\?|#|$)/i.test(raw)) return "https://" + raw;

      // 그 외는 상대경로/토큰 그대로 반환
      return raw;
    }

    // (https://...) 형태
    var m1 = s.match(/\((https?:\/\/[^\)]+)\)/i);
    if (m1 && m1[1]) return m1[1];

    return "";
  }

  // =========================
  // UI 오프셋(기본화면) - 원본 저장/복원
  // =========================
  // ✅ 닫기(X) 상태는 '새로고침 전까지'만 유지해야 하므로(저장 X)
  //    전역(window) 메모리에만 보관합니다.
  var GLOBAL_STATE = (function(){
    try {
      if (window.__mypaiAdbarState && typeof window.__mypaiAdbarState === "object") {
        return window.__mypaiAdbarState;
      }
      window.__mypaiAdbarState = { baseClosed: false, chatClosed: false };
      return window.__mypaiAdbarState;
    } catch (e) {
      return { baseClosed: false, chatClosed: false };
    }
  })();

  function storeOrig_(el) {
    if (!el) return;
    if (el.dataset.mypaiAdOrig) return;
    // ✅ "누적" 방지: 처음 한 번만 '원본 기준값'을 저장하고,
    //    이후 토글 시에는 기준값+50px로 항상 재계산합니다.
    var cs = null;
    try { cs = window.getComputedStyle(el); } catch (e) {}
    var topPx = cs ? cs.top : "";
    var pos = cs ? cs.position : "";
    var baseTop = (topPx && topPx.endsWith("px") && !isNaN(parseFloat(topPx))) ? parseFloat(topPx) : null;
    el.dataset.mypaiAdOrig = JSON.stringify({
      inlineTop: el.style.top || "",
      inlineTransform: el.style.transform || "",
      baseTopPx: (typeof baseTop === "number" ? baseTop : null),
      position: pos || ""
    });
  }

  function restoreOrig_(el) {
    if (!el) return;
    if (!el.dataset.mypaiAdOrig) {
      el.style.top = "";
      el.style.transform = "";
      return;
    }
    try {
      var o = JSON.parse(el.dataset.mypaiAdOrig || "{}");
      el.style.top = o.inlineTop || "";
      el.style.transform = o.inlineTransform || "";
    } catch (e) {
      el.style.top = "";
      el.style.transform = "";
    }
  }

  function applyOffset_(el, enabled) {
    if (!el) return;
    storeOrig_(el);
    if (!enabled) {
      restoreOrig_(el);
      return;
    }

    var o = null;
    try { o = JSON.parse(el.dataset.mypaiAdOrig || "{}"); } catch (e) { o = {}; }

    var pos = (o.position || "");
    var baseTopPx = (typeof o.baseTopPx === "number") ? o.baseTopPx : null;
    var canTop = (baseTopPx !== null) && (pos === "fixed" || pos === "absolute" || pos === "relative");

    if (canTop) {
      el.style.top = (baseTopPx + CONFIG.SLOT_HEIGHT_PX) + "px";
      return;
    }

    // transform은 "원본 inline transform" 기준으로만 붙여서 누적 방지
    var baseTf = (o.inlineTransform || "");
    var add = "translateY(" + CONFIG.SLOT_HEIGHT_PX + "px)";
    if (baseTf.indexOf(add) >= 0) {
      el.style.transform = baseTf;
      return;
    }
    el.style.transform = (baseTf ? (baseTf + " ") : "") + add;
  }

  function setBaseOffsets_(enabled) {
    applyOffset_(document.getElementById("clockWidget"), enabled);
    applyOffset_(document.getElementById("questStatusBar"), enabled);
  }

  // =========================
  // 광고바 생성
  // =========================
  function createCloseButton_() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "x";
    btn.setAttribute("aria-label", "Close advertisement");
    btn.style.position = "absolute";
    btn.style.top = "2px";
    btn.style.right = "6px";
    btn.style.border = "none";
    btn.style.background = "transparent";
    btn.style.color = "rgba(255,255,255,0.95)";
    btn.style.cursor = "pointer";
    btn.style.padding = "0";
    btn.style.fontSize = "16px";
    btn.style.lineHeight = "1";
    btn.style.zIndex = "2";
    btn.style.pointerEvents = "auto";
    return btn;
  }

  function createBar_(id, mode) {
    if (document.getElementById(id)) return null;

    var bar = document.createElement("div");
    bar.id = id;
    bar.dataset.mypaiAdbar = mode;

    bar.style.height = CONFIG.SLOT_HEIGHT_PX + "px";
    bar.style.width = "100%";
    bar.style.overflow = "hidden";
    bar.style.display = "flex";
    bar.style.alignItems = "center";
    bar.style.justifyContent = "center";
    bar.style.background = "transparent";
    bar.style.boxSizing = "border-box";

    // ✅ 기본 화면 클릭을 막지 않게: bar 자체는 클릭 불가
    bar.style.pointerEvents = "none";

    if (mode === "base") {
      bar.style.position = "fixed";
      bar.style.left = "0";
      bar.style.top = "0";
      bar.style.zIndex = "9999";
    } else {
      bar.style.position = "relative";
      bar.style.zIndex = "10";
    }

    var img = document.createElement("img");
    img.alt = "";
    img.style.display = "block";
    img.style.cursor = "pointer";
    img.style.transformOrigin = "center center";
    img.style.pointerEvents = "auto";

    var closeBtn = createCloseButton_();

    bar.appendChild(img);
    bar.appendChild(closeBtn);

    return { bar: bar, img: img, closeBtn: closeBtn };
  }

  // =========================
  // 이미지 사이징(모바일/PC 규칙)
  // =========================
  function applySizing_(imgEl, slotW, slotH) {
    var nw = imgEl.naturalWidth || 1;
    var nh = imgEl.naturalHeight || 1;

    // PC: 업스케일 금지 (<=1)
    if (isDesktop_()) {
      var scaleFit = Math.min(slotW / nw, slotH / nh, 1);
      imgEl.style.width = Math.round(nw * scaleFit) + "px";
      imgEl.style.height = Math.round(nh * scaleFit) + "px";
      return;
    }

    // 모바일: 이미지가 광고칸보다 완전히 작으면 확대 금지
    if (nw <= slotW && nh <= slotH) {
      imgEl.style.width = nw + "px";
      imgEl.style.height = nh + "px";
      return;
    }

    // 모바일 cover 필요 시 업스케일 최대 2x
    var scaleCover = Math.max(slotW / nw, slotH / nh);
    if (scaleCover <= 1) {
      imgEl.style.width = "100%";
      imgEl.style.height = "100%";
      imgEl.style.objectFit = "cover";
      imgEl.style.objectPosition = "center";
      return;
    }

    var scale = Math.min(scaleCover, 2);
    imgEl.style.width = Math.round(nw * scale) + "px";
    imgEl.style.height = Math.round(nh * scale) + "px";
  }

  function attachResizeReflow_(target) {
    if (!target || !target.img || !target.bar) return;
    function reflow() {
      if (!target.img || !target.img.naturalWidth) return;
      var slotW = target.bar.clientWidth || window.innerWidth || 1;
      var slotH = CONFIG.SLOT_HEIGHT_PX;
      applySizing_(target.img, slotW, slotH);
    }
    window.addEventListener("resize", reflow);
    target._mypaiReflow = reflow;
  }

  // =========================
  // 기본화면 표시/숨김 감지 (iframe 전환 시 광고 숨김)
  // =========================
  function attachBaseVisibilityWatcher_(barEl, onVisibilityChange) {
    if (!barEl) return;

    function computeShouldShow_() {
      // ✅ 사용자가 X로 닫았으면(새로고침 전까지) 어떤 상황에서도 다시 나타나지 않게
      if (isClosedForBar_(barEl)) return false;

      var isGameMode = document.body && document.body.classList &&
        document.body.classList.contains("is-game-mode");

      var overlay = document.getElementById("gameOverlay");
      var overlayOpen = false;
      if (overlay) overlayOpen = !overlay.classList.contains("hidden");

      var frame = document.getElementById("gameFrame");
      var frameHasSrc = false;
      if (frame) {
        var src = (frame.getAttribute("src") || "").trim();
        frameHasSrc = !!src;
      }

      return !(isGameMode || overlayOpen || frameHasSrc);
    }

    function apply_() {
      var show = computeShouldShow_();
      barEl.style.display = show ? "flex" : "none";
      if (typeof onVisibilityChange === "function") onVisibilityChange(show);
    }

    apply_();

    try {
      var obsBody = new MutationObserver(function () { apply_(); });
      obsBody.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    } catch (e) {}

    var overlay = document.getElementById("gameOverlay");
    if (overlay) {
      try {
        var obsOv = new MutationObserver(function () { apply_(); });
        obsOv.observe(overlay, { attributes: true, attributeFilter: ["class", "style"] });
      } catch (e) {}
    }

    var frame = document.getElementById("gameFrame");
    if (frame) {
      try {
        var obsFr = new MutationObserver(function () { apply_(); });
        obsFr.observe(frame, { attributes: true, attributeFilter: ["src"] });
      } catch (e) {}
    }

    window.addEventListener("focus", apply_);
    document.addEventListener("visibilitychange", apply_);
  }

  // =========================
  // 광고 로드 + 렌더
  // =========================
  function normalizeTargetUrl_(raw) {
    // ✅ 파일명에서 추출한 URL이 "example.github.io/..." 처럼
    //    scheme 없이 시작하면 new URL()이 상대경로로 해석해버려
    //    내부 링크 판별이 실패할 수 있습니다.
    //    -> hostname 형태면 https:// 를 자동으로 붙입니다.
    try {
      var s = String(raw || "").trim();
      if (!s) return "";
      if (/^https?:\/\//i.test(s)) return s;
      if (/^\/\//.test(s)) return (window.location.protocol || "https:") + s;
      // host로 시작하는 경우
      if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|\?|#|$)/i.test(s)) return "https://" + s;
      return s;
    } catch (e) {
      return raw;
    }
  }

  function isClosedForBar_(barEl) {
    try {
      if (!barEl) return false;
      if (barEl.id === CONFIG.BASE_BAR_ID) return !!GLOBAL_STATE.baseClosed;
      if (barEl.id === CONFIG.CHAT_BAR_ID) return !!GLOBAL_STATE.chatClosed;
    } catch (e) {}
    return false;
  }

  function openInsideIfMessenger_(targetUrl) {
    // ✅ 내부(앱)에서 실시간톡 열기
    // - /games/social-messenger.html (또는 room=ROOM_ID 단축 표기)는 새 탭이 아니라
    //   index.html 내부 오버레이 iframe(#gameFrame)로 엽니다.
    // - github.io hostname 특례는 두지 않습니다. "메신저 링크인지"만으로 판단합니다.
    try {
      var raw = String(targetUrl || "").trim();
      if (!raw) return false;

            // 파일명 토큰이 넘어오는 경우를 대비해 여기서도 동일 토큰을 복원합니다.
      // (__q__/? , __a__/& , __eq__/= , __/ )
      raw = raw.replace(/__q__/g, "?")
               .replace(/__a__/g, "&")
               .replace(/__eq__/g, "=")
               .replace(/__/g, "/")
               .replace(/\.(png|jpg|jpeg|gif|webp)$/i, "");

      // 0) 단축 표기/보강: "room=..." 만 넘어와도 내부 메신저로 강제합니다.
      //    또는 social-messenger 링크에 room 파라미터가 포함되어 있으면 그 값을 사용합니다.
      var roomMatch = raw.match(/\broom\s*=\s*([^&#\s]+)/i);
      if (roomMatch && roomMatch[1]) {
        var roomVal = String(roomMatch[1]).trim();
        // room= 만 있고 경로가 없으면 경로를 만들어줍니다.
        if (!/social-messenger\.html/i.test(raw)) {
          raw = "/games/social-messenger.html?room=" + encodeURIComponent(roomVal);
        }
      }
// 0) 단축 표기: "room=r_xxx"
      if (/^room\s*=\s*[a-z0-9_\-]+$/i.test(raw)) {
        raw = "/games/social-messenger.html?" + raw.replace(/\s+/g, "");
      }

      var normalized = normalizeTargetUrl_(raw);
      var u = new URL(normalized, window.location.href);
      var path = (u.pathname || "");
      var rawStr = String(normalized || raw || "");

      var isMessenger = (path.indexOf("/games/social-messenger.html") >= 0) || /social-messenger\.html/i.test(rawStr);
      if (!isMessenger) return false;

      // ✅ 항상 동일-origin 상대경로로 오픈 (외부 origin/절대 URL이 들어와도 내부로 통일)
      var finalPath = getProjectRoot_() + "games/social-messenger.html";
      var finalSearch = (u.search || "");

      // room 파라미터가 없고, 원본 문자열에 room=이 있으면 보강(방어)
      if (!/\broom=/.test(finalSearch) && /\broom=/.test(rawStr)) {
        var mRoom = rawStr.match(/\broom=([a-z0-9_\-]+)/i);
        if (mRoom && mRoom[1]) finalSearch = "?room=" + encodeURIComponent(mRoom[1]);
      }

      // 1) 가능하면 기존 로직으로 오버레이를 엽니다.
      if (typeof window.launchMessenger === "function") {
        try { window.launchMessenger(); } catch (e0) {}
      }

      var overlay = document.getElementById("gameOverlay");
      if (overlay) overlay.classList.remove("hidden");

      var frame = document.getElementById("gameFrame");
      if (frame) {
        frame.src = (finalPath + finalSearch);
        return true;
      }

      // 2) iframe이 없으면 현재 탭에서 이동(새 탭 사용 안 함)
      window.location.href = (finalPath + finalSearch + (u.hash || ""));
      return true;
    } catch (e) {
      return false;
    }
  }

  
function stopRotate_(target) {
  try {
    if (target && target._rotateTimer) {
      clearInterval(target._rotateTimer);
      target._rotateTimer = null;
    }
  } catch (e) {}
}

function loadAndRender_(target, opts) {
  var listUrl = buildListUrl_();
  if (!listUrl) {
    if (opts && typeof opts.onNoAd === "function") opts.onNoAd();
    return;
  }

  // 클릭 핸들러는 한 번만 설정하고, 현재 대상 URL은 매번 갱신합니다.
  if (target && target.img && !target._clickBound) {
    target._clickBound = true;
    target.img.onclick = function () {
      var targetUrl = (target && target._currentTargetUrl) ? String(target._currentTargetUrl) : "";
      if (!targetUrl) return;

      // ✅ 내부 메신저 딥링크는 절대 새 탭으로 열지 않습니다.
      try {
        if (openInsideIfMessenger_(targetUrl)) return;
      } catch (e0) {}

      var finalUrl = normalizeTargetUrl_(targetUrl);
      if (!finalUrl) return;

      if (openInsideIfMessenger_(finalUrl)) return;
      window.open(finalUrl, "_blank");
    };
  }

  function renderFile_(f) {
    if (!f || !f.id) return;

    var name = f.name || "";
    var mime = (f.mimeType || "").toLowerCase();
    var isGif = mime.indexOf("gif") >= 0 || /\.gif$/i.test(name);

    var src = isGif ? buildDirectViewUrl_(f.id) : buildThumbUrl_(f.id);
    var targetUrl = extractUrlFromName_(name) || buildDrivePreviewUrl_(f.id);

    // 현재 클릭 대상 URL 갱신
    target._currentTargetUrl = targetUrl;

    var img = target.img;

    img.onload = function () {
      img.style.objectFit = "fill";
      img.style.objectPosition = "center";

      var slotW = target.bar.clientWidth || window.innerWidth || 1;
      var slotH = CONFIG.SLOT_HEIGHT_PX;
      applySizing_(img, slotW, slotH);

      if (isClosedForBar_(target.bar)) {
        try { target.bar.style.display = "none"; } catch (e) {}
        return;
      }

      // 최초 1회만 onHasAd 콜백
      if (!target._hasShown) {
        target._hasShown = true;
        if (opts && typeof opts.onHasAd === "function") opts.onHasAd();
      }
    };

    img.onerror = function () {
      // 실패 시에는 그대로 두고 다음 순환에서 다른 광고를 시도합니다.
    };

    img.src = src;
  }

  function startRotate_() {
    if (!CONFIG.ROTATE_MS || CONFIG.ROTATE_MS < 1000) return;
    if (target._rotateTimer) return;

    target._rotateTimer = setInterval(function () {
      try {
        if (!target || !target.bar || isClosedForBar_(target.bar)) return;

        // 숨김 상태면(iframe 열림 등) 순환도 잠시 멈춤
        var disp = (target.bar.style && target.bar.style.display) ? target.bar.style.display : "";
        if (disp === "none") return;

        var files = target._adFiles || [];
        if (!files.length) return;

        var next = null;
        for (var i = 0; i < 5; i++) {
          var cand = pickRandom_(files);
          if (!cand) continue;
          if (!target._currentFileId || cand.id !== target._currentFileId) {
            next = cand;
            break;
          }
        }
        next = next || pickRandom_(files);
        if (!next) return;

        target._currentFileId = next.id;
        renderFile_(next);
      } catch (e) {}
    }, CONFIG.ROTATE_MS);
  }

  safeJsonFetch_(listUrl).then(function (data) {
    if (!data || data.ok !== true) {
      if (opts && typeof opts.onNoAd === "function") opts.onNoAd();
      return;
    }

    var files = data.files || [];
    if (!files.length) {
      if (opts && typeof opts.onNoAd === "function") opts.onNoAd();
      return;
    }

    target._adFiles = files;

    var first = pickRandom_(files);
    if (!first || !first.id) {
      if (opts && typeof opts.onNoAd === "function") opts.onNoAd();
      return;
    }

    target._currentFileId = first.id;
    renderFile_(first);
    startRotate_();
  });
}

// =========================
// 초기화 (페이지별)
  // =========================
  function initBase_() {
    // 기본화면 판별: canvasWrapper 존재 & 실시간톡 topbar 없음
    var canvas = document.getElementById("canvasWrapper");
    if (!canvas) return;
    if (document.querySelector(".messenger-topbar")) return;

    var t = createBar_(CONFIG.BASE_BAR_ID, "base");
    if (!t) return;

    // X 버튼: 저장 없이 숨김 + 원복
    t.closeBtn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      try { GLOBAL_STATE.baseClosed = true; } catch (e) {}
      stopRotate_(t);
      t.bar.style.display = "none";
      setBaseOffsets_(false);
    };

    document.body.appendChild(t.bar);
    attachResizeReflow_(t);

    // 기본은 원복 상태
    setBaseOffsets_(false);

    loadAndRender_(t, {
      onHasAd: function () {
        // 실제 로드된 뒤, 보이는 상태에서만 내림(visibility watcher가 토글)
        setBaseOffsets_(true);
      },
      onNoAd: function () {
        stopRotate_(t);
        if (t.bar && t.bar.parentNode) t.bar.parentNode.removeChild(t.bar);
        setBaseOffsets_(false);
      }
    });

    // iframe 전환 감지: 숨김이면 원복
    attachBaseVisibilityWatcher_(t.bar, function (visible) {
      // 광고가 로드되었고 보이는 상태일 때만 오프셋
      var hasImg = !!(t.img && t.img.src);
      setBaseOffsets_(!!(visible && hasImg));
      if (visible && t._mypaiReflow) {
        try { t._mypaiReflow(); } catch (e) {}
      }
    });
  }

  function initChat_() {
    var topbar = document.querySelector(".messenger-topbar");
    if (!topbar) return;

    var t = createBar_(CONFIG.CHAT_BAR_ID, "chat");
    if (!t) return;

    t.closeBtn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      try { GLOBAL_STATE.chatClosed = true; } catch (e) {}
      stopRotate_(t);
      t.bar.style.display = "none";
    };

    // 실시간톡은 topbar 아래
    topbar.insertAdjacentElement("afterend", t.bar);
    attachResizeReflow_(t);

    loadAndRender_(t, {
      onNoAd: function () {
        stopRotate_(t);
        if (t.bar && t.bar.parentNode) t.bar.parentNode.removeChild(t.bar);
      }
    });
  }

  function init() {
    initChat_();
    initBase_();
  }

  window.addEventListener("load", init);
})();
