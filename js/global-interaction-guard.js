// global-interaction-guard.js
// ------------------------------------------------------
// 화면 전체에서 우클릭/길게 누르기 시 뜨는 기본 컨텍스트 메뉴만 막습니다.
// (텍스트 선택/파란 하이라이트는 css/ghost.css 의 user-select 설정으로 처리합니다.)
// 일반 클릭/터치는 그대로 동작하도록 최대한 간섭을 줄인 최소 모듈입니다.
//
// [제거 시 같이 지울 것]
// 1) index.html 맨 아래의 <script src="js/global-interaction-guard.js"></script> 태그
// 2) 필요하다면 css/ghost.css 상단의 전역 user-select 방지 스타일 정리
// ------------------------------------------------------
(function () {
  try {
    function isEditableTarget(target) {
      if (!target) return false;
      var tag = (target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return true;
      if (target.isContentEditable) return true;
      return false;
    }

    // 우클릭 / 길게 눌렀을 때 뜨는 컨텍스트 메뉴만 막기 (입력창 제외)
    document.addEventListener(
      "contextmenu",
      function (e) {
        try {
          if (isEditableTarget(e.target)) return;
          e.preventDefault();
        } catch (err) {}
      },
      { capture: true }
    );
  } catch (e) {
    console.error("[global-interaction-guard] 초기화 중 오류:", e);
  }
})();