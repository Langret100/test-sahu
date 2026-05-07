// mail-notify.js - [옵션 모듈] 새 편지 도착 간단 안내
// - 주기적으로 LettersLocal.checkNewLettersSimple()를 호출해서
//   새 편지가 감지되면 고스트 말풍선을 한 번 띄워줍니다.

(function(window, document){
  if (!window || !window.addEventListener) return;

  var CHECK_INTERVAL_MS = 60 * 1000; // 1분마다 확인 (필요하면 조정)
  var _mailNotifyTimer = null;

  function startMailWatcher(){
    if (_mailNotifyTimer) return;
    if (!window.LettersLocal || typeof window.checkNewLettersSimple !== "function") return;

    _mailNotifyTimer = setInterval(async function(){
      try {
        var hasNew = await window.checkNewLettersSimple();
        if (hasNew && typeof window.showBubble === "function") {
          window.showBubble("✉️ 편지가 왔어요! 수첩에서 편지를 확인해 볼래?");
        }
      } catch(e){
        console.error("mail watcher error:", e);
      }
    }, CHECK_INTERVAL_MS);
  }

  window.addEventListener("load", function(){
    // 로그인 이후에만 의미가 있으므로, 간단히 딜레이 후 시작
    setTimeout(startMailWatcher, 5000);
  });
})(window, document);
