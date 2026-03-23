
// [옵션 모듈] 메뉴 게임 런처 브리지 - menu-games.js
// - 수첩(메뉴)에서 선택한 게임을 실제 게임 모듈(game-manager.js)로 연결해 줍니다.
// - notebook-menu.js 는 openMenuGame1/2/3 만 알고 있고,
//   실제 오버레이/고스트 축소/iframe 로딩 등은 js/game-manager.js 가 담당합니다.

(function(){
  function safeLaunch(fnName, fallbackMessage){
    if (typeof window[fnName] === "function") {
      window[fnName]();
    } else if (typeof showBubble === "function" && fallbackMessage) {
      try { showBubble(fallbackMessage); } catch(e){}
    }
  }

  window.openMenuGame1 = function(){ safeLaunch("launchGame1","구구단 게임이 아직 준비 중이에요."); };
  window.openMenuGame2 = function(){ safeLaunch("launchGame2","덧셈주사위 게임이 아직 준비 중이에요."); };
  window.openMenuGame3 = function(){ safeLaunch("launchGame3","꿈틀도형 게임이 아직 준비 중이에요."); };
  window.openMenuGame4 = function(){ safeLaunch("launchGame4","수학 탐험대 게임이 아직 준비 중이에요."); };
})();
