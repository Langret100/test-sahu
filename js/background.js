// background.js - 배경 / 지도 / 배경 선택 패널 관리

function initBackgroundSystem() {
  const isMobileBg = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const canvasWrapper = document.getElementById("canvasWrapper");
  const bgContainer = document.getElementById("bg-container");
  const mapMini = document.getElementById("mapMini");
  const mapModal = document.getElementById("mapModal");
  const bgSelectPanel = document.getElementById("bgSelectPanel");
  const customBgInput = document.getElementById("customBgInput");
  const bgPanelConfirmBtn = document.getElementById("bgPanelConfirm");
  const bgOptionButtons = bgSelectPanel ? bgSelectPanel.querySelectorAll(".bg-option") : [];
  const plusMenuEl = document.getElementById("plusMenu");
  const plusBtn = document.getElementById("ghostPlus");

  let currentBgMode = "default";
  let customBgUrl = null;

  function applyBgButtonActive(mode) {
    if (!bgOptionButtons) return;
    bgOptionButtons.forEach(btn => {
      if (btn.dataset.bg === mode) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  function hideAllBackgrounds() {
    const waveBackground = document.getElementById("waveBackground");

    if (canvasWrapper) {
      canvasWrapper.style.background = "transparent";
    }
    if (bgContainer) {
      bgContainer.style.display = "none";
    }
    if (waveBackground) {
      waveBackground.style.opacity = 0;
      waveBackground.style.zIndex = "-20";
    }
    if (mapMini) {
      mapMini.style.display = "none";
    }
    if (mapModal) {
      mapModal.classList.remove("active");
    }
    document.body.style.backgroundImage = "";
  }

  function setBackgroundMode(mode) {
    const waveBackground = document.getElementById("waveBackground");
    currentBgMode = mode;
    hideAllBackgrounds();

    // 눈 배경이 켜져 있었다면 먼저 정리
    if (window.SnowEffect && typeof SnowEffect.stop === "function") {
      try { SnowEffect.stop(); } catch (e) {}
    }


    if (mode === "default") {
      if (canvasWrapper) {
        canvasWrapper.style.background = "radial-gradient(circle at 10% 20%, #d7f3ff 0, #95d4ff 18%, #5b9dff 38%, #1b2d4f 68%, #050915 100%)";
      }
      if (waveBackground) {
        waveBackground.style.opacity = 1;
        waveBackground.style.zIndex = "0";
      }

    } else if (mode === "snow") {
      // 눈 내리는 겨울 배경
      if (canvasWrapper) {
        canvasWrapper.style.background = "linear-gradient(180deg, #0b1b33 0%, #1f3b65 40%, #102542 100%)";
      }
      if (window.SnowEffect && typeof SnowEffect.start === "function") {
        try { SnowEffect.start(); } catch (e) {}
      }

        } else if (mode === "train") {
      if (bgContainer) {
        bgContainer.style.display = "block";
      }
      if (mapMini) {
        mapMini.style.display = isMobileBg ? "none" : "block";
      }
    } else if (mode === "custom") {
      if (customBgInput) {
        customBgInput.click();
      }
    }

    applyBgButtonActive(mode);
  }

  // custom 배경 파일 선택 처리
  if (customBgInput) {
    customBgInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (customBgUrl) {
        URL.revokeObjectURL(customBgUrl);
      }
      customBgUrl = URL.createObjectURL(file);

      hideAllBackgrounds();

      document.body.style.backgroundImage = `url('${customBgUrl}')`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center center";
      document.body.style.backgroundRepeat = "no-repeat";

      currentBgMode = "custom";
      applyBgButtonActive("custom");
    });
  }

  // 지도 팝업 (train 모드 & PC 전용)
  if (mapMini && mapModal) {
    mapMini.addEventListener("click", (e) => {
      if (isMobileBg) return; // 모바일에서는 지도 팝업 사용 안 함
      e.stopPropagation();
      if (currentBgMode === "train") {
        mapModal.classList.add("active");
      }
    });
    mapModal.addEventListener("click", () => {
      mapModal.classList.remove("active");
    });
  }

  // 플러스(+) 메뉴 안 "배경 선택" 버튼으로 패널 열기/닫기
  if (plusMenuEl && plusBtn && bgSelectPanel) {
    plusMenuEl.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.getAttribute("data-action");
      if (action === "bgselect") {
        e.stopPropagation();
        const isOpen = bgSelectPanel.classList.contains("open");
        if (isOpen) {
          bgSelectPanel.classList.remove("open");
          if (window.showFullscreenButton) {
            try { window.showFullscreenButton(); } catch (e) {}
          }
        } else {
          bgSelectPanel.classList.add("open");
          if (window.hideFullscreenButton) {
            try { window.hideFullscreenButton(); } catch (e) {}
          }
        }
      }
    });
  }

  // 배경 옵션 선택
  if (bgOptionButtons && bgOptionButtons.length) {
    bgOptionButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.bg;
        if (!mode) return;
        setBackgroundMode(mode);
      });
    });
  }

  // 배경 선택 패널 확인 버튼: 창 닫기
  if (bgPanelConfirmBtn && bgSelectPanel) {
    bgPanelConfirmBtn.addEventListener("click", () => {
      bgSelectPanel.classList.remove("open");
      if (window.showFullscreenButton) {
        try { window.showFullscreenButton(); } catch (e) {}
      }
    });
  }

  // 초기 배경 모드: 맵 1~3 중 무작위 선택 (사용자 지정 맵은 수동 선택 시에만 유지)
  (function(){
    const modes = ["default", "snow", "train"];
    const idx = Math.floor(Math.random() * modes.length);
    const initialMode = modes[idx] || "default";
    setBackgroundMode(initialMode);
  })();
}
