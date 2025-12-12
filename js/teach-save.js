/* ============================================================
   [teach-save.js] 가르치기(학습) 내용 시트 저장 모듈
   - 사용자가 가르친 트리거/대사를 Google Apps Script 웹앱으로 전송합니다.
   - 이 파일을 삭제하면 "가르치기 내용 구글 시트 저장" 기능은 완전히 사라집니다.
   - 연동되는 요소:
       1) teach.js : saveTeachDialog(trigger, message, motion) 를 호출합니다.
       2) ui.js 의 postToSheet(payload) 헬퍼 함수를 사용합니다.
       3) Apps Script doPost() 의 기본 분기(!mode) → saveDialogData_(data) 와 연결됩니다.
============================================================ */

(function() {
  /**
   * 가르친 대사를 시트에 저장하는 전역 함수
   * - trigger: 사용자가 입력한 트리거 문장
   * - message: 사용자가 가르친 대사
   * - motion : 감정 키(이미지/표정), 없으면 백엔드 기본값 사용
   */
  window.saveTeachDialog = async function(trigger, message, motion) {
    // postToSheet 또는 입력값이 준비되지 않은 경우 방어 코드
    if (!trigger || !message) {
      if (typeof setTeachStatus === "function") {
        setTeachStatus("트리거 문장과 대사는 꼭 입력해야 해요.");
      }
      return;
    }

    if (typeof postToSheet !== "function") {
      if (typeof setTeachStatus === "function") {
        setTeachStatus("시트로 저장하는 함수(postToSheet)가 아직 준비되지 않았어요.");
      }
      return;
    }

    try {
      const payload = {
        // Apps Script 쪽에서 mode 가 비어 있으면 saveDialogData_() 를 호출하도록 되어 있습니다.
        // (doPost(e) 내부의: if (!mode) { return saveDialogData_(data); } 와 연결)
        mode: "",
        word: trigger,
        message: message,
        motion: motion || ""
      };

      await postToSheet(payload);

      console.log("[teach-save.js] 대화 저장 성공:", payload);
      if (typeof setTeachStatus === "function") {
        setTeachStatus("가르친 대사가 구글 시트에 저장되었어요!");
      }
    } catch (err) {
      console.error("[teach-save.js] 대화 저장 실패:", err);
      if (typeof setTeachStatus === "function") {
        setTeachStatus("저장 중 문제가 생겼어요. 나중에 다시 시도해 주세요.");
      }
    }
  };
})();
