/* ============================================================
   [messenger-press-guard.js] 메신저 버튼 롱프레스(길게 누름) 보호
   ------------------------------------------------------------
   - 메신저 창 안의 버튼(😊 / ＋ / 보내기 / 팝업 메뉴 버튼 등)을
     '꾹 누를 때' 발생하는
       1) 파란 하이라이트(탭 하이라이트/active)
       2) 컨텍스트(우클릭) 메뉴
     를 차단합니다.
   - 일반 탭/클릭 동작은 그대로 유지합니다.

   [제거 시 함께 삭제/정리할 요소]
   1) games/social-messenger.html 에서 본 스크립트 include 제거
      - <script src="../js/messenger-press-guard.js"></script>
   ============================================================ */

(function () {
  function inMessenger(el) {
    try { return !!(el && el.closest && el.closest(".messenger-shell")); } catch (e) {}
    return false;
  }

  function isButtonish(el) {
    try {
      if (!el || !el.closest) return false;
      return !!el.closest("button, [role='button'], .emoji-item");
    } catch (e) {}
    return false;
  }

  function bind() {
    // CSS로 탭 하이라이트/콜아웃/선택 방지(버튼에만)
    try {
      var style = document.createElement("style");
      style.id = "messengerPressGuardStyle";
      style.textContent =
        ".messenger-shell button, .messenger-shell [role='button'], .messenger-shell .emoji-item{" +
        "-webkit-tap-highlight-color: transparent;" +
        "-webkit-touch-callout: none;" +
        "-webkit-user-select: none;" +
        "user-select: none;" +
        "}";
      document.head.appendChild(style);
    } catch (e) {}

    // 컨텍스트 메뉴 차단(버튼에만)
    document.addEventListener(
      "contextmenu",
      function (e) {
        try {
          if (!e || !e.target) return;
          if (!inMessenger(e.target)) return;
          if (!isButtonish(e.target)) return;
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        } catch (err) {}
      },
      true
    );

    // 선택/드래그 시작 차단(버튼에만)
    ["selectstart", "dragstart"].forEach(function (evt) {
      document.addEventListener(
        evt,
        function (e) {
          try {
            if (!e || !e.target) return;
            if (!inMessenger(e.target)) return;
            if (!isButtonish(e.target)) return;
            e.preventDefault();
          } catch (err) {}
        },
        true
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
