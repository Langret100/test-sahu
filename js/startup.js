// startup.js - 앱 초기화 및 모듈 초기화 오케스트레이션
// ------------------------------------------------------
// - 페이지 로드 후 각 기능 모듈의 init 함수를 한 번씩 호출해 주는 허브 스크립트입니다.
// - 개별 모듈은 없어도 동작하도록 typeof 체크 후 호출합니다.
//
// [제거 시 함께 정리할 것]
// 1) index.html 맨 아래의 <script src="js/startup.js"></script> 태그
// 2) 이 파일에서 호출하던 init 함수들이 더 이상 필요 없다면,
//    각 모듈(js/*.js)도 함께 제거하세요.
// ------------------------------------------------------

window.addEventListener("load", () => {
  // core 초기화 (캐릭터 기본 동작, 수면 타이머 등)
  if (typeof init === "function") {
    init();
  }

  // 기본 UI / 입력 관련 액션 바인딩 (고스트 클릭, 플러스 메뉴 등)
  if (typeof initActions === "function") {
    initActions();
  }

  // 가르치기(학습) UI 바인딩
  if (typeof initTeachUI === "function") {
    initTeachUI();
  }

  // 게시판 / 글쓰기 모달 초기화
  if (typeof initBoardUI === "function") {
    initBoardUI();
  }

  // 수첩(메뉴) UI 초기화
  if (typeof initNotebookMenu === "function") {
    initNotebookMenu();
  }

  // 사용 설명서 패널 초기화
  if (typeof initManualPanel === "function") {
    initManualPanel();
  }

  // 로그인 / 편지함 모듈 초기화
  if (typeof initLoginModule === "function") {
    initLoginModule();
  }

  // 시계 위젯
  if (typeof initClockWidget === "function") {
    initClockWidget();
  }

  // 전체 화면 토글 버튼
  if (typeof initFullscreenButton === "function") {
    initFullscreenButton();
  }


  // 채팅 이모티콘 패널 초기화
  if (typeof initChatEmoji === "function") {
    initChatEmoji();
  }
  // 배경 / 지도 / 배경 선택 패널 초기화
  if (typeof initBackgroundSystem === "function") {
    initBackgroundSystem();
  }
});
