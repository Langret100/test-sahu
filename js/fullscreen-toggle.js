/* ============================================================
   /* ============================================================
   [fullscreen-toggle.js] 마이파이 로고 '전체화면 전환'
   ------------------------------------------------------------
   - games/social-messenger.html 상단의 로고(#topLogoBtn)를 누르면
     Fullscreen API로 전체화면을 토글합니다.
   - Fullscreen API가 불가한 환경(일부 모바일/iframe 제한)에서는 안내만 표시합니다.

   [제거 시 함께 삭제/정리할 요소]
   1) games/social-messenger.html
      - #topLogoBtn(로고 버튼) id / 클릭용 스타일
   2) games/social-messenger.html 에서 본 스크립트 include 제거
      - <script src="../js/fullscreen-toggle.js"></script>
   ============================================================ */

(function () {
  function toast(text) {
    try {
      var el = document.getElementById("msgStatus");
      if (!el) return;
      el.textContent = text || "";
      el.classList.add("show");
      clearTimeout(el.__toastTimer);
      el.__toastTimer = setTimeout(function () {
        el.classList.remove("show");
      }, 1200);
    } catch (e) {}
  }

  function supportsFullscreen() {
    var d = document;
    return !!(
      d.fullscreenEnabled ||
      d.webkitFullscreenEnabled ||
      d.mozFullScreenEnabled ||
      d.msFullscreenEnabled
    );
  }

  function isFullscreen() {
    var d = document;
    return !!(
      d.fullscreenElement ||
      d.webkitFullscreenElement ||
      d.mozFullScreenElement ||
      d.msFullscreenElement
    );
  }

  function requestFs() {
    var el = document.documentElement;
    var fn =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;
    if (fn) return fn.call(el);
    return Promise.reject(new Error("no requestFullscreen"));
  }

  function exitFs() {
    var d = document;
    var fn =
      d.exitFullscreen ||
      d.webkitExitFullscreen ||
      d.mozCancelFullScreen ||
      d.msExitFullscreen;
    if (fn) return fn.call(d);
    return Promise.reject(new Error("no exitFullscreen"));
  }

  function bind() {
    var logoBtn = document.getElementById("topLogoBtn");
    if (!logoBtn) return;

    logoBtn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      if (!supportsFullscreen()) {
        toast("이 환경에서는 전체화면 전환이 지원되지 않아요.");
        return;
      }

      var p;
      if (isFullscreen()) p = exitFs();
      else p = requestFs();

      if (p && typeof p.catch === "function") {
        p.catch(function () {
          toast("전체화면 전환을 할 수 없어요.");
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();