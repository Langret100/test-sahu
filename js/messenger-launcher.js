// messenger-launcher.js v1
// 패들렛 버튼 바로 아래에 실시간톡(소셜메신저) 아이콘 버튼을 추가.
// 클릭 시 기존 +메뉴 > "실시간 톡 보기"와 동일한 window.launchMessenger() 를 그대로 호출.
// 새 오버레이를 만들지 않고 기존 game-manager.js 흐름(로그인 체크 포함)을 재사용.

(function () {
  if (window.MessengerLauncher) return;

  var BTID = "messengerBtn";

  function injectStyle() {
    if (document.getElementById("ml-s")) return;
    var s = document.createElement("style");
    s.id = "ml-s";
    s.textContent =
      "#" + BTID + "{" +
      "position:absolute;top:62px;right:14px;width:42px;height:42px;" +
      "background:none!important;border:none!important;outline:none;" +
      "box-shadow:none!important;backdrop-filter:none!important;" +
      "cursor:pointer;z-index:15;padding:0;" +
      "display:flex;align-items:center;justify-content:center;" +
      "opacity:.82;transition:transform .2s,opacity .2s;}" +
      "#" + BTID + ":hover{transform:scale(1.12);opacity:1;}" +
      "#" + BTID + " svg{filter:drop-shadow(0 0 7px rgba(120,200,255,.7));}";
    document.head.appendChild(s);
  }

  function openMessenger() {
    // 기존 로그인 체크 + 게임오버레이 진입 로직을 그대로 재사용
    if (!window.currentUser || !window.currentUser.user_id) {
      if (typeof window.openLoginPanel === "function") {
        window.openLoginPanel();
      }
      return;
    }
    if (typeof window.launchMessenger === "function") {
      window.launchMessenger();
    }
  }

  function init() {
    injectStyle();
    var cw = document.getElementById("canvasWrapper");
    if (!cw || document.getElementById(BTID)) return;

    var btn = document.createElement("button");
    btn.id    = BTID;
    btn.title = "실시간 톡";
    btn.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" ' +
              'fill="rgba(120,200,255,0.18)" stroke="rgba(120,200,255,0.8)" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<circle cx="8"  cy="11" r="1.1" fill="rgba(150,215,255,0.9)"/>' +
        '<circle cx="12" cy="11" r="1.1" fill="rgba(150,215,255,0.9)"/>' +
        '<circle cx="16" cy="11" r="1.1" fill="rgba(150,215,255,0.9)"/>' +
      '</svg>';
    btn.addEventListener("click", openMessenger);
    cw.appendChild(btn);
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", function(){ setTimeout(init, 150); });
  } else {
    setTimeout(init, 150);
  }

  window.MessengerLauncher = { open: openMessenger };
})();
