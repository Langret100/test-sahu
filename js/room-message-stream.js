/* ============================================================
   [room-message-stream.js] 현재 방 1개만 Firebase 메시지 리스너 관리
   ------------------------------------------------------------
   - 방 이동 시 이전 방의 Firebase 메시지 리스너를 반드시 해제하여
     성능 저하/중복 수신을 방지합니다.
   - limitToLast(N) 쿼리(최근 N개) 기반으로만 구독합니다.

   [제거 시 함께 삭제/수정할 요소]
   1) games/social-messenger.html 의 room-message-stream.js include 제거
   2) js/social-messenger.js 의 RoomMessageStream 연동부 제거
   ============================================================ */

(function () {
  if (window.RoomMessageStream) return;

  var active = null; // { queryRef, handlers: { child_added: fn } }

  function stop() {
    if (!active) return;
    try {
      if (active.queryRef && active.handlers && active.handlers.child_added) {
        active.queryRef.off("child_added", active.handlers.child_added);
      }
    } catch (e1) {}
    try {
      if (active.queryRef && typeof active.queryRef.off === "function") active.queryRef.off();
    } catch (e2) {}
    active = null;
  }

  function start(ref, limit, onChildAdded) {
    stop();
    if (!ref || typeof ref.limitToLast !== "function" || typeof ref.on !== "function") return null;

    var q = ref.limitToLast(Math.max(1, Number(limit || 30)));
    var handler = function (snap) {
      try { onChildAdded && onChildAdded(snap); } catch (e) {}
    };

    q.on("child_added", handler);
    active = { queryRef: q, handlers: { child_added: handler } };
    return active;
  }

  window.RoomMessageStream = {
    start: start,
    stop: stop,
    isActive: function () { return !!active; }
  };
})();
