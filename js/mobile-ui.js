
// [옵션 모듈] 모바일 UI 보정 - mobile-ui.js
// - 모바일 주소창 최소화 유도
// - 가상 키보드 등장 시 로그인 패널 위치 보정

(function(){
  const ua = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  if (!isMobile) return;

  function hideAddressBarOnce(){
    setTimeout(function(){
      try { window.scrollTo(0,1); } catch(e){}
    }, 200);
  }

  window.addEventListener("load", hideAddressBarOnce);
  window.addEventListener("orientationchange", hideAddressBarOnce);

  // 로그인 패널 키보드 연동(위치 조정)은 더 이상 사용하지 않습니다.
// 화면 크기와 관계없이 로그인 창은 항상 중앙에 고정되도록 CSS로만 처리합니다.
})();
