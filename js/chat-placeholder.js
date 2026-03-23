// chat-placeholder.js
// [모듈] 채팅 입력창 placeholder를 현재 캐릭터 이름으로 교체하는 전용 모듈입니다.
// 이 파일을 제거하면, index.html에 적힌 기본 placeholder 문구만 사용하게 됩니다.

(function(){
  const INPUT_ID = "userInput";
  const ROTATE_MS = 8000; // 입력이 비어 있고 포커스가 없을 때만 힌트 문구를 느리게 교체

  // {name} 치환 가능
  const HINTS = [
    "{name}에게 뭐든 물어보거나 말을 걸어보세요. (예: 가위바위보, ~가 궁금해)",
    "‘톡톡’ 또는 ‘마이파’라고 말해보세요. 실시간 톡을 열어줄게요.",
    "‘메신저’라고 말해보면 실시간 톡을 열어줄게요.",
    "‘가위바위보’ 한 판 할까요? 라고 말해보세요.",
    "배경 선택을 눌러서 분위기를 바꿔보세요.",
  ];

  function pickRandomHint(){
    try {
      const idx = Math.floor(Math.random() * HINTS.length);
      return HINTS[idx] || HINTS[0];
    } catch(e){
      return HINTS[0];
    }
  }

  function applyPlaceholder(){
    var input = document.getElementById(INPUT_ID);
    if (!input) return;

    var base = "웹 고스트";
    if (typeof currentCharacterName === "string" && currentCharacterName.trim()){
      base = currentCharacterName.trim();
    }

	    const hint = pickRandomHint().replace(/\{name\}/g, base);
    input.placeholder = hint;
  }

  function isInputBusy(input){
    if (!input) return true;
    if (document.activeElement === input) return true;
    if ((input.value || "").trim().length > 0) return true;
    return false;
  }

  // 전역에서 재사용할 수 있도록 노출
  window.updateChatPlaceholder = applyPlaceholder;

  // DOM 준비 후 한 번 실행
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      try {
        applyPlaceholder();

        // 입력창이 비어 있고 포커스가 없을 때만, 안내 문구를 무작위로 가끔 바꿔줌
        const input = document.getElementById(INPUT_ID);
        if (input){
          input.addEventListener("blur", function(){
            try { if (!isInputBusy(input)) applyPlaceholder(); } catch(e){}
          });
          setInterval(function(){
            try { if (!isInputBusy(input)) applyPlaceholder(); } catch(e){}
          }, ROTATE_MS);
        }
      } catch(e){}
    });
  } else {
    try {
      applyPlaceholder();
      const input = document.getElementById(INPUT_ID);
      if (input){
        input.addEventListener("blur", function(){
          try { if (!isInputBusy(input)) applyPlaceholder(); } catch(e){}
        });
        setInterval(function(){
          try { if (!isInputBusy(input)) applyPlaceholder(); } catch(e){}
        }, ROTATE_MS);
      }
    } catch(e){}
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
