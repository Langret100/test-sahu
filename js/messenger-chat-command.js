/* ============================================================
   [messenger-chat-command.js] 캐릭터-톡에서 "실시간 톡" 열기 명령어
   ------------------------------------------------------------
   - 사용자가 채팅 입력창에 아래 키워드를 입력하면 실시간 톡(메신저)을 엽니다.
     "톡톡", "마이파", "메신저"
   - 로그인되어 있지 않으면 로그인 패널만 열고 종료합니다.

   [제거 시 함께 삭제할 요소]
   1) js/messenger-chat-command.js
   2) core.js 안의 handleMessengerCommand 연결 블록
   3) index.html 안의 <script src="js/messenger-chat-command.js"></script>
   ============================================================ */
(function () {
  if (typeof window.handleMessengerCommand === "function") return;

  function needsLogin() {
    try {
      return !(window.currentUser && window.currentUser.user_id);
    } catch (e) {
      return true;
    }
  }

  function openLogin() {
    try {
      if (typeof window.openLoginPanel === "function") {
        window.openLoginPanel();
      }
    } catch (e) {}
  }

  function openMessenger() {
    try {
      if (typeof window.launchMessenger === "function") {
        window.launchMessenger();
        return true;
      }
    } catch (e) {}
    return false;
  }

  // text: 원문, compact: 공백 제거 문자열
  window.handleMessengerCommand = function (text, compact) {
    if (!compact) return false;

    // 사용자가 요청한 트리거(정확 매칭)
    var hit =
      compact === "톡톡" ||
      compact === "마이파" ||
      compact === "메신저" ||
      compact === "실시간톡" ||
      compact === "실시간톡보기" ||
      compact === "실시간톡열어줘";

    if (!hit) return false;

    if (needsLogin()) {
      if (typeof showBubble === "function") {
        try {
          showBubble("실시간 톡을 열려면 먼저 로그인해 주세요.");
        } catch (e) {}
      }
      openLogin();
      return true;
    }

    var ok = openMessenger();
    if (!ok) {
      if (typeof showBubble === "function") {
        try {
          showBubble("실시간 톡을 여는 기능이 준비되지 않았어요.");
        } catch (e) {}
      }
    }
    return true;
  };
})();
