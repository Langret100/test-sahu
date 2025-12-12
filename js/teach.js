// teach.js - 가르치기(학습) UI 바인딩

function initTeachUI() {
  const teachSaveBtn = document.getElementById("teachSaveBtn");
  const teachCloseBtn = document.getElementById("teachCloseBtn");

  if (teachSaveBtn) {
    teachSaveBtn.addEventListener("click", () => {
      const trigger = (document.getElementById("teachTrigger")?.value || "").trim();
      const message = (document.getElementById("teachMessage")?.value || "").trim();
      const emoInput = (document.getElementById("teachEmotion")?.value || "").trim();

      if (!trigger || !message) {
        if (typeof setTeachStatus === "function") {
          setTeachStatus("트리거 문장과 대사는 꼭 입력해야 해요.");
        }
        return;
      }

      const motion = (typeof EMO !== "undefined" && emoInput && EMO[emoInput]) ? emoInput : "경청";

      // [teach-save.js 연동용 코드]
      // 이 프로젝트에서 가르치기 내용을 구글 시트에 저장하는 기능은
      // js/teach-save.js 파일에 들어 있습니다.
      // 만약 js/teach-save.js 파일을 삭제했다면,
      // 아래 saveTeachDialog 호출 부분도 함께 삭제해도 됩니다.
      if (typeof saveTeachDialog === "function") {
        saveTeachDialog(trigger, message, motion);
      }

      if (typeof saveLearnedReaction === "function") {
        saveLearnedReaction(trigger, message, motion);
      }
      if (typeof setTeachStatus === "function") {
        setTeachStatus("배웠어요! 이제 해당 문장을 말하면 방금 알려준 대사로 반응할게요.");
      }

      if (typeof closeTeachModal === "function") {
        closeTeachModal();
      }
      if (typeof setEmotion === "function") {
        setEmotion("기쁨", `"${trigger}"라고 말하면 이렇게 대답할게요:\n${message}`);
      }
    });
  }

  if (teachCloseBtn) {
    teachCloseBtn.addEventListener("click", () => {
      if (typeof closeTeachModal === "function") {
        closeTeachModal();
      }
      if (typeof resetSleepTimer === "function") {
        try { resetSleepTimer(); } catch (e) {}
      }
    });
  }
}
