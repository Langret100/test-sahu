// chat-placeholder.js
// [모듈] 채팅 입력창 placeholder를 현재 캐릭터 이름으로 교체하는 전용 모듈입니다.
// 이 파일을 제거하면, index.html에 적힌 기본 placeholder 문구만 사용하게 됩니다.

(function(){
  const INPUT_ID = "userInput";

  function applyPlaceholder(){
    var input = document.getElementById(INPUT_ID);
    if (!input) return;

    var base = "웹 고스트";
    if (typeof currentCharacterName === "string" && currentCharacterName.trim()){
      base = currentCharacterName.trim();
    }

    input.placeholder = base + "에게 뭐든 물어보거나 말을 걸어보세요. (예: 가위바위보, ~가 궁금해)";
  }

  // 전역에서 재사용할 수 있도록 노출
  window.updateChatPlaceholder = applyPlaceholder;

  // DOM 준비 후 한 번 실행
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      try { applyPlaceholder(); } catch(e){}
    });
  } else {
    try { applyPlaceholder(); } catch(e){}
  }

  // setCurrentCharacter가 정의되어 있으면, 캐릭터 변경 후 placeholder를 다시 적용
  if (typeof window.setCurrentCharacter === "function"){
    var originalSet = window.setCurrentCharacter;
    window.setCurrentCharacter = function(key){
      originalSet(key);
      try { applyPlaceholder(); } catch(e){}
    };
  }
})();
