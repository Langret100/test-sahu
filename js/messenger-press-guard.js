/**
 * Messenger Long-Press Guard
 * - 목적: 실시간 톡 보기 내 입력창 주변 버튼(😊, +, 첨부 메뉴, 이모티콘 패널 등)을
 *         꾹 눌렀을 때 파란 하이라이트/컨텍스트 메뉴(우클릭 메뉴)가 뜨는 현상을 방지
 * - 클릭/탭 동작은 유지 (contextmenu/selectstart만 차단)
 *
 * 제거 시 함께 삭제할 요소:
 * - games/social-messenger.html 의 <script src="../js/messenger-press-guard.js"></script> 포함 라인
 * - games/social-messenger.html 의 [버튼 꾹 누름(롱프레스) 방지] CSS 블록
 */
(() => {
  const matchesGuardScope = (target) => {
    if (!target || !target.closest) return false;
    return Boolean(
      target.closest(
        ".messenger-input-bar button, .msg-attach-menu button, .msg-emoji-panel button"
      )
    );
  };

  // 모바일 롱프레스 / 데스크톱 우클릭 시 뜨는 기본 컨텍스트 메뉴 방지
  document.addEventListener(
    "contextmenu",
    (e) => {
      if (matchesGuardScope(e.target)) e.preventDefault();
    },
    { capture: true }
  );

  // 일부 브라우저에서 롱프레스가 텍스트 선택을 유발하는 경우 방지
  document.addEventListener(
    "selectstart",
    (e) => {
      if (matchesGuardScope(e.target)) e.preventDefault();
    },
    { capture: true }
  );
})();
