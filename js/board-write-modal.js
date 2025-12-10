/* ===========================================================
   [옵션 기능] 게시판 글쓰기 중앙 모달 컨트롤러
   - index.html에 모달 HTML이 존재해야 합니다.
   - 이 기능을 제거하려면:
        1) 이 파일(js/board-write-modal.js) 삭제
        2) index.html의 모달 HTML 블록 삭제
        3) index.html의 <script src="js/board-write-modal.js"> 삭제
   =========================================================== */

(function() {
  const writeBtn = document.getElementById("boardWriteToggleBtn");
  const modal = document.getElementById("boardWriteModal");
  const closeBtn = document.getElementById("boardWriteCloseBtn");
  const bg = modal ? modal.querySelector(".board-write-modal-bg") : null;

  if (!writeBtn || !modal) {
    console.warn("[board-write-modal.js] 필수 요소가 없어 모듈 동작을 중단합니다.");
    return;
  }

  function openModal() {
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  writeBtn.addEventListener("click", () => {
    openModal();
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }
  if (bg) {
    bg.addEventListener("click", closeModal);
  }

  // 저장 로직은 js/ui.js의 initBoardUI()에 있는 handleSavePost에서 담당합니다.
  // 이 모듈은 오직 모달 열기/닫기 UI만 담당합니다.
})();
