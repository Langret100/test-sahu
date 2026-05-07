// [옵션 모듈] 실시간 톡(메신저) 닫기 브릿지 - messenger-close-bridge.js
// - iframe 내부 X 버튼으로 부모(메인) 오버레이를 안정적으로 닫습니다.
// - 제거하려면 games/social-messenger.html 에서 본 스크립트 include를 제거하세요.

(function(){
  function requestClose(){
    // 1) 같은 출처에서 가능한 경우: 부모의 exitGame 직접 호출
    try{
      if (window.parent && typeof window.parent.exitGame === "function"){
        window.parent.exitGame();
        return;
      }
    }catch(e){}

    // 2) postMessage 방식 (file://, null origin 등 환경에서도 동작하도록)
    try{
      if (window.parent && window.parent.postMessage){
        window.parent.postMessage({ type: "WG_EXIT_GAME" }, "*");
        return;
      }
    }catch(e){}

    // 3) 마지막 fallback: top으로도 시도
    try{
      if (window.top && window.top.postMessage){
        window.top.postMessage({ type: "WG_EXIT_GAME" }, "*");
      }
    }catch(e){}
  }

  function bind(){
    const btn = document.getElementById("topCloseBtn");
    if (!btn) return;
    btn.addEventListener("click", function(ev){
      ev.preventDefault();
      requestClose();
    });
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

  // 필요 시 다른 스크립트에서도 호출할 수 있도록 노출
  window.requestMessengerClose = requestClose;
})();
