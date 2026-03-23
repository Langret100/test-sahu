/* js/clock-display.js - 시계 표시 전용 모듈
   - 화면 좌측 상단에 현재 시간을 HH:MM 형식으로 표시합니다.
   - 이 파일을 삭제할 경우, index.html의 #clockWidget 요소와
     <script src="js/clock-display.js"></script> 태그도 함께 제거하면 됩니다.
*/
(function (window, document) {
  if (!window || !document) return;

  function formatTime(date) {
    var h = date.getHours();
    var m = date.getMinutes();
    var hh = h < 10 ? "0" + h : String(h);
    var mm = m < 10 ? "0" + m : String(m);
    return hh + ":" + mm;
  }

  function updateClock() {
    var el = document.getElementById("clockWidget");
    if (!el) return;
    try {
      el.textContent = formatTime(new Date());
    } catch (e) {}
  }

  // 처음 한 번 즉시 갱신하고, 이후 20초마다 한 번씩 갱신합니다.
  function start() {
    updateClock();
    try {
      setInterval(updateClock, 20000);
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(window, document);
