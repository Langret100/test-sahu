// ghost-hide.js - 캐릭터 숨기기 / 다시 나오기 독립 모듈
// 이 파일을 삭제하면 '숨어 / 사라져 / 나와 / 이리 와' 대화 명령 기능은 깔끔하게 사라집니다.
// core.js 의 handleUserSubmit 안에 있는
//   handleGhostHideCommand(...) 호출 블록도 함께 삭제해 주면 완전 제거됩니다.

(function(){
  // 내부 전용 랜덤 선택 유틸 (다른 파일에 영향 X)
  function pickOneLocal(arr) {
    if (!arr || !arr.length) return "";
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // 숨김 상태를 추적하는 플래그 (window 전역에 저장)
  if (typeof window.__ghostHidden === "undefined") {
    window.__ghostHidden = false;
  }

  // 캐릭터 숨기기/나오기 실제 처리 함수
  // - core.js 의 handleUserSubmit() 에서 (옵션)으로 호출됩니다.
  window.handleGhostHideCommand = function(text, compact){
    try {
      const ghostEl = document.getElementById("ghost");
      if (!ghostEl) return false;

      const raw = (text || "").trim();

      // 공백 제거 + 소문자 변환 (한글 명령 중심이라 주로 공백 제거만 의미 있음)
      const normalized = raw.replace(/\\s+/g, "").toLowerCase();

      // 숨기기/나오기 키워드
      const hideKeywords = ["숨어", "사라져"];
      const showKeywords = ["나와", "이리와", "이리와줘", "이리와라"];

      const wantsHide = hideKeywords.some(function(k){ return normalized.indexOf(k) !== -1; });
      const wantsShow = showKeywords.some(function(k){ return normalized.indexOf(k) !== -1; });

      // 둘 다 아닌 경우에는 처리하지 않음
      if (!wantsHide && !wantsShow) {
        return false;
      }

      // 수면 타이머가 있다면, 여기서도 한 번 깨워 준다.
      if (typeof resetSleepTimer === "function") {
        try { resetSleepTimer(); } catch (e) {}
      }

      // 숨기기 명령 처리
      if (wantsHide) {
        window.__ghostHidden = true;
        // 투명화: 보이지 않지만, 여전히 클릭/터치는 가능하도록 opacity만 0으로 처리
        ghostEl.style.opacity = "0";

        if (typeof setEmotion === "function") {
          const lines = [
            "쉿, 잠깐 숨바꼭질 모드로 들어갈게요. 그래도 옆에서 얘기 계속 듣는 중이에요.",
            "투명화 완료! 제 모습만 안 보일 뿐, 여기에서 조용히 지켜보고 있어요.",
            "살짝 숨을게요. 필요하면 언제든지 \"나와\"라고 불러줘요!",
            "안 보이지만, 바로 옆에서 귓속말 듣는 중이에요. 계속 이야기해 줄래요?",
            "미션! 잠깐 숨어 있으라는 지령 받았어요. 그래도 당신 말은 하나도 안 놓치고 있어요."
          ];
          const line = pickOneLocal(lines);
          setEmotion("경청", line);
        }

        const inputEl = document.getElementById("userInput");
        if (inputEl) inputEl.value = "";
        return true;
      }

      // 나오기 명령 처리
      if (wantsShow) {
        window.__ghostHidden = false;
        // 다시 보이게: opacity 원래대로
        ghostEl.style.opacity = "";

        if (typeof setEmotion === "function") {
          const lines = [
            "짠! 다시 등장했어요. 기다렸죠?",
            "숨바꼭질 끝! 여기 여기, 나 여기 있어요.",
            "찾았다! 이제 다시 편하게 수다 떨어볼까?",
            "다시 나타났어요. 이번엔 어디까지 이야기해 볼까요?",
            "호출 완료! 제가 없으면 많이 심심했죠?"
          ];
          const line = pickOneLocal(lines);
          setEmotion("기쁨", line);
        }

        const inputEl = document.getElementById("userInput");
        if (inputEl) inputEl.value = "";
        return true;
      }

      return false;
    } catch (e) {
      console.warn("handleGhostHideCommand error", e);
      return false;
    }
  };
})();
