/* ============================================================
   [room-panel-toggle.js] 대화방 목록 패널 토글
   ------------------------------------------------------------
   - PC/모바일 모두 오버레이 방식 (버튼 눌러야 열림)
   - 모바일: 전체화면으로 열림
   - PC: 300px 사이드 오버레이
   - topbar 버튼 라벨 = 현재 방 이름
   ============================================================ */

(function () {
  var btn      = null;
  var panel    = null;
  var backdrop = null;
  var listEl   = null;
  var titleEl  = null;

  function getTitleText() {
    try {
      var t = titleEl && titleEl.textContent ? String(titleEl.textContent).trim() : "";
      return t || "대화방";
    } catch (e) { return "대화방"; }
  }

  function syncButtonLabel() {
    if (!btn) return;
    try { btn.textContent = getTitleText(); } catch (e) {}
  }

  function openPanel() {
    if (panel)    panel.classList.add("open");
    if (backdrop) backdrop.classList.add("open");
    if (btn)      btn.setAttribute("aria-expanded", "true");
    // 패널 열 때 방 목록 갱신
    try {
      if (window.ChatRooms && typeof window.ChatRooms.reload === "function") {
        window.ChatRooms.reload();
      }
    } catch (e) {}
  }

  function closePanel() {
    if (panel)    panel.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    if (btn)      btn.setAttribute("aria-expanded", "false");
  }

  function togglePanel() {
    if (!panel) return;
    panel.classList.contains("open") ? closePanel() : openPanel();
  }

  function bindAutoCloseOnRoomPick() {
    if (!listEl) return;
    listEl.addEventListener("click", function (ev) {
      var node = ev && ev.target ? ev.target : null;
      while (node && node !== listEl) {
        if (node.classList && node.classList.contains("room-item")) {
          closePanel();
          return;
        }
        node = node.parentNode;
      }
    });
  }

  function bindTitleObserver() {
    if (!titleEl || typeof MutationObserver === "undefined") return;
    try {
      new MutationObserver(function () { syncButtonLabel(); })
        .observe(titleEl, { childList: true, characterData: true, subtree: true });
    } catch (e) {}
  }

  function init() {
    btn      = document.getElementById("topRoomBtn");
    panel    = document.getElementById("roomPanel");
    backdrop = document.getElementById("roomBackdrop");
    listEl   = document.getElementById("roomList");
    titleEl  = document.getElementById("roomTitle");

    if (!panel) return;

    closePanel(); // 기본 닫힘
    syncButtonLabel();

    if (btn)      btn.addEventListener("click", togglePanel);
    if (backdrop) backdrop.addEventListener("click", closePanel);

    document.addEventListener("keydown", function (e) {
      if (e && e.key === "Escape") closePanel();
    });

    bindAutoCloseOnRoomPick();
    bindTitleObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 0);
  }
})();
