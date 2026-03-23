/* ============================================================
   [room-guard.js] 방 선택 전(입장 전) 상태 안내 + '대화방 열기' 힌트
   ------------------------------------------------------------
   - 방이 선택되지 않았을 때 채팅창이 '먹통'처럼 느껴지는 문제를 막기 위해
     화면에 안내문/버튼을 띄웁니다.
   - 전송(텍스트/이모티콘) 시에도 동일 안내를 보여주도록 social-messenger.js에서 호출합니다.

   [제거 시 함께 삭제/정리할 요소]
   1) games/social-messenger.html 의 room-guard.js include
   2) js/social-messenger.js 에서 RoomGuard.renderNoRoomHint 호출부
   ============================================================ */

(function () {
  function openRoomPanel() {
    try {
      var btn = document.getElementById("topRoomBtn");
      if (btn) {
        btn.click();
        return;
      }
    } catch (e) {}

    // fallback: 직접 목록 갱신
    try {
      if (window.ChatRooms && typeof window.ChatRooms.reload === "function") {
        window.ChatRooms.reload();
      }
    } catch (e2) {}
  }

  function renderNoRoomHint(container) {
    try {
      if (!container) return;
      // 이미 있으면 중복 생성하지 않음
      if (container.querySelector && container.querySelector(".room-empty-hint")) return;

      container.innerHTML = "";

      var wrap = document.createElement("div");
      wrap.className = "room-empty-hint";
      wrap.style.padding = "18px 14px";
      wrap.style.margin = "18px 14px";
      wrap.style.borderRadius = "14px";
      wrap.style.background = "rgba(148,163,184,0.12)";
      wrap.style.color = "#0f172a";
      wrap.style.fontSize = "14px";
      wrap.style.lineHeight = "1.45";

      var p = document.createElement("div");
      p.textContent = "대화방을 먼저 선택해야 대화를 보낼 수 있어요.";
      wrap.appendChild(p);

      var p2 = document.createElement("div");
      p2.style.marginTop = "6px";
      p2.textContent = "상단 왼쪽 '대화방' 버튼을 눌러 방을 선택해 주세요.";
      wrap.appendChild(p2);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "대화방 열기";
      btn.style.marginTop = "12px";
      btn.style.height = "36px";
      btn.style.padding = "0 14px";
      btn.style.border = "0";
      btn.style.borderRadius = "999px";
      btn.style.background = "#2563eb";
      btn.style.color = "#ffffff";
      btn.style.fontWeight = "800";
      btn.style.cursor = "pointer";
      btn.addEventListener("click", function (e) {
        try { e.preventDefault(); e.stopPropagation(); } catch (e0) {}
        openRoomPanel();
      });
      wrap.appendChild(btn);

      container.appendChild(wrap);
    } catch (e) {}
  }

  function init() {
    // 로그인 완료 후에도 방이 없으면 안내만 띄움(강제 자동입장/자동로딩 X)
    try {
      var rid = "";
      try { rid = String(localStorage.getItem("ghostActiveRoomId") || "").trim(); } catch (e0) {}
      if (rid && rid !== "global") return;

      var body = document.getElementById("messengerBody");
      if (!body) return;

      renderNoRoomHint(body);
    } catch (e) {}
  }

  window.RoomGuard = {
    renderNoRoomHint: renderNoRoomHint,
    openRoomPanel: openRoomPanel
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 0);
  }
})();
