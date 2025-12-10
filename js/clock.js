// clock.js - 독립 시계 모듈
// 다른 시스템(core, dialog 등)과 연결되지 않고
// #clockWidget 요소에 HH:MM 형식의 시계를 표시한다.

(function () {
  function initClockWidget() {
    var clockEl = document.getElementById("clockWidget");
    if (!clockEl) return;

    function updateClock() {
      var now = new Date();
      var hours = String(now.getHours()).padStart(2, "0");
      var minutes = String(now.getMinutes()).padStart(2, "0");
      clockEl.textContent = hours + ":" + minutes;
    }

    // 최초 1회 즉시 갱신
    updateClock();
    // 분 단위로만 바뀌므로 30초 간격으로 갱신
    setInterval(updateClock, 30000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initClockWidget);
  } else {
    initClockWidget();
  }
})();
