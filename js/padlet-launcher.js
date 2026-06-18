// padlet-launcher.js v21
// PC 와 모바일을 완전히 독립된 상수/스타일로 분리 — 한쪽 수정이 다른 쪽에 영향 없음

(function () {
  if (window.PadletLauncher) return;

  var URL    = "https://zrr.kr/svrHqA";
  var BTID   = "padletBtn";
  var CLIP   = 0;
  var BAR_H  = 44;

  /* ── PC 전용 ── */
  var PC_CONTENT_W = 410;  // 패들렛에게 줄 iframe 폭
  var PC_OVERHANG  = 16;   // 스크롤바 숨김용 오버행

  /* ── 모바일 전용 (PC와 완전 독립) ── */
  var MO_CONTENT_W = 390;  // 모바일은 패들렛 기본 모바일 폭에 가깝게
  var MO_OVERHANG  = 16;   // 모바일도 스크롤바 숨김 동일 적용
  var MO_HEIGHT_PCT = 92;  // 화면 높이의 92%만 사용, 위아래 중앙 정렬

  function addStyle() {
    if (document.getElementById("pl-s")) return;
    var el = document.createElement("style");
    el.id = "pl-s";
    el.textContent =
      "#padletBtn{position:absolute;top:14px;right:14px;width:42px;height:42px;" +
      "background:none!important;border:none!important;outline:none;" +
      "box-shadow:none!important;backdrop-filter:none!important;" +
      "cursor:pointer;z-index:15;padding:0;" +
      "display:flex;align-items:center;justify-content:center;" +
      "opacity:.82;transition:transform .2s,opacity .2s;}" +
      "#padletBtn:hover{transform:scale(1.12);opacity:1;}" +
      "#padletBtn svg{filter:drop-shadow(0 0 7px rgba(255,200,120,.7));}" +

      "#pl-dim{display:none;position:fixed;inset:0;z-index:9100;" +
      "background:rgba(0,0,0,.6);align-items:center;justify-content:center;" +
      "overflow:hidden;}" +
      "#pl-dim.open{display:flex;}" +

      /* ===== PC 기본값 ===== */
      "#pl-panel{position:relative;" +
      "width:" + (PC_CONTENT_W - PC_OVERHANG) + "px;height:88vh;" +
      "max-height:960px;min-height:400px;" +
      "border-radius:14px;overflow:hidden;" +
      "box-shadow:0 8px 48px rgba(0,0,0,.55);}" +

      "#pl-clip{position:absolute;" +
      "top:" + BAR_H + "px;left:0;right:0;bottom:0;" +
      "overflow:hidden;}" +

      "#pl-frame{position:absolute;" +
      "top:-" + CLIP + "px;left:0;" +
      "width:" + PC_CONTENT_W + "px;height:calc(100% + " + CLIP + "px);" +
      "border:none;display:block;}" +

      "#pl-bar{position:absolute;top:0;left:0;right:0;" +
      "height:" + BAR_H + "px;z-index:10;" +
      "display:none;align-items:center;justify-content:space-between;" +
      "padding:0 10px;box-sizing:border-box;" +
      "background:rgba(18,20,30,.80);backdrop-filter:blur(8px);}" +
      "#pl-bar.open{display:flex;}" +

      ".pl-btn{width:30px;height:30px;border-radius:50%;border:none;cursor:pointer;" +
      "background:rgba(255,255,255,.12);color:#fff;" +
      "display:flex;align-items:center;justify-content:center;flex-shrink:0;" +
      "-webkit-tap-highlight-color:transparent;" +
      "transition:background .15s,transform .15s;}" +
      ".pl-btn:hover{background:rgba(255,255,255,.22);}" +
      ".pl-btn:active{transform:scale(.9);}" +

      /* ===== 모바일 전용 — PC 값과 완전히 무관한 별도 수치 ===== */
      "@media(max-width:640px){" +
      "#pl-panel{width:min(" + MO_CONTENT_W + "px,96vw);" +
      "height:" + MO_HEIGHT_PCT + "%;" +
      "min-height:0;max-height:none;border-radius:14px;}" +
      "}" +
      "@supports (height:100dvh){" +
      "@media(max-width:640px){" +
      "#pl-panel{height:" + MO_HEIGHT_PCT + "dvh;}" +
      "}" +
      "}";
    document.head.appendChild(el);
  }

  var _dim, _panel, _clip, _frame, _bar;

  function buildDOM() {
    if (document.getElementById("pl-dim")) return;

    _dim = document.createElement("div");
    _dim.id = "pl-dim";
    _dim.addEventListener("click", close);

    _panel = document.createElement("div");
    _panel.id = "pl-panel";
    _panel.addEventListener("click", function(e){ e.stopPropagation(); });

    _clip = document.createElement("div");
    _clip.id = "pl-clip";

    _frame = document.createElement("iframe");
    _frame.id = "pl-frame";
    _frame.allow = "camera;microphone;clipboard-read;clipboard-write;fullscreen;encrypted-media";
    _frame.setAttribute("sandbox",
      "allow-scripts allow-forms allow-same-origin allow-popups allow-modals");

    _bar = document.createElement("div");
    _bar.id = "pl-bar";

    var backBtn = document.createElement("button");
    backBtn.className = "pl-btn";
    backBtn.setAttribute("aria-label", "뒤로가기");
    backBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
        '<path d="M10 3L5 8L10 13" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
    backBtn.addEventListener("click", goBack);

    var xBtn = document.createElement("button");
    xBtn.className = "pl-btn";
    xBtn.setAttribute("aria-label", "닫기");
    xBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
        '<path d="M1 1L13 13M13 1L1 13" stroke="white" stroke-width="2.2" stroke-linecap="round"/>' +
      '</svg>';
    xBtn.addEventListener("click", close);

    _bar.appendChild(backBtn);
    _bar.appendChild(xBtn);
    _clip.appendChild(_frame);
    _panel.appendChild(_clip);
    _panel.appendChild(_bar);
    _dim.appendChild(_panel);
    document.body.appendChild(_dim);
  }

  function goBack() {
    try { _frame.contentWindow.history.back(); }
    catch(e) { _frame.src = URL; }
  }

  function syncMobileScale() {
    if (window.innerWidth > 640) {
      _frame.style.transform = "none";
      _frame.style.width = PC_CONTENT_W + "px";
      _frame.style.left = "0";
      return;
    }
    var panelW = _panel.getBoundingClientRect().width;
    if (!panelW || panelW < 50) {
      requestAnimationFrame(syncMobileScale);
      return;
    }
    var frameW = MO_CONTENT_W + MO_OVERHANG; // 스크롤바 숨김용 오버행 포함 실제 iframe 폭
    // 경계값 근처(예: 388~392px) 라운딩 오차로 오버행이 충분히 가려지지 않는 걸 방지하기 위해
    // 콘텐츠 기준 폭에 미세 여유(2%)를 둬서 항상 패널 안에 확실히 들어가게 스케일
    var safeContentW = MO_CONTENT_W * 1.05;
    if (panelW >= safeContentW - 0.5) {
      // 화면이 충분히 넓음: 스케일 없이, 오버행만큼 패널 밖으로 자연스럽게 넘침(클립됨)
      _frame.style.transform = "none";
      _frame.style.width = frameW + "px";
      _frame.style.left = "0";
      _frame.style.top = "0";
      _frame.style.height = "100%";
    } else {
      // 화면이 좁음: 여유를 둔 기준(safeContentW)으로 비율 계산해 축소
      var scale = panelW / safeContentW;
      _frame.style.width = frameW + "px";
      _frame.style.transform = "scale(" + scale + ")";
      _frame.style.transformOrigin = "top left";
      // scale로 줄어든 후 실제 보이는 폭(frameW*scale)이 panelW보다 작으면
      // 그 차이의 절반만큼 좌측으로 밀어서 좌우 중앙 정렬
      var shownW = frameW * scale;
      var offsetX = (panelW - shownW) / 2;
      _frame.style.left = offsetX + "px";
      // 세로: scale로 줄어든 만큼 height를 미리 키워서 보상
      // (클립 영역 높이를 scale로 나누면, 줄어든 후 정확히 클립 영역만큼 차게 됨)
      var clipH = _clip.getBoundingClientRect().height;
      _frame.style.height = (clipH / scale) + "px";
      _frame.style.top = "0";
    }
  }

  function open() {
    buildDOM();
    _frame.src = URL;
    _dim.classList.add("open");
    _bar.classList.add("open");
    // display:none → flex 전환 직후 한 프레임만으로는 레이아웃이 아직
    // 반영되지 않아 panelW가 부정확할 수 있어 두 프레임 뒤에 측정
    requestAnimationFrame(function(){
      requestAnimationFrame(syncMobileScale);
    });
  }

  function close() {
    if (_frame) _frame.src = "about:blank";
    if (_dim)   _dim.classList.remove("open");
    if (_bar)   _bar.classList.remove("open");
  }

  document.addEventListener("keydown", function(e){
    if (e.key === "Escape") close();
  });

  window.addEventListener("resize", function(){
    if (_dim && _dim.classList.contains("open")) syncMobileScale();
  });

  function init() {
    addStyle();
    var cw = document.getElementById("canvasWrapper");
    if (!cw || document.getElementById(BTID)) return;

    var btn = document.createElement("button");
    btn.id    = BTID;
    btn.title = "패들렛";
    btn.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="3" width="16" height="18" rx="3" fill="rgba(255,210,120,0.18)" stroke="rgba(255,210,120,0.75)" stroke-width="1.4"/>' +
        '<line x1="8" y1="8"  x2="16" y2="8"  stroke="rgba(255,220,140,0.85)" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="8" y1="12" x2="16" y2="12" stroke="rgba(255,220,140,0.85)" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="8" y1="16" x2="13" y2="16" stroke="rgba(255,220,140,0.85)" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>';
    btn.addEventListener("click", open);
    cw.appendChild(btn);
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 150); });
  } else {
    setTimeout(init, 150);
  }

  window.PadletLauncher = { open: open, close: close };
})();
