// actions.js - 사용자 입력 및 주요 인터랙션 바인딩

function initActions() {
  const ghostEl = document.getElementById("ghost");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const plusBtn = document.getElementById("ghostPlus");
  const plusMenu = document.getElementById("plusMenu");

  // 고스트 클릭 -> 수첩 / 연타 시 터치 반응
  if (ghostEl && typeof handleTouch === "function") {
    let lastGhostClickTime = 0;

    ghostEl.addEventListener("click", () => {
      if (typeof shutdown !== "undefined" && shutdown) return;

      const now = Date.now();
      const delta = now - lastGhostClickTime;
      lastGhostClickTime = now;

      // 아주 빠르게 연달아 누르면 기존 터치(부끄러움 등) 반응을 한 번 보여 줍니다.
      // 이때는 수첩을 열지 않고, 캐릭터가 "한 번만 눌러도 수첩을 볼 수 있다"고 경고합니다.
      if (delta > 0 && delta < 450) {
        if (typeof showBubble === "function") {
          try {
            showBubble("잠깐! 한 번만 눌러도 수첩 볼 수 있어.");
          } catch (e) {}
        }
        handleTouch();
        return;
      }

      // 여기부터는 일반적인 "한 번 클릭" 처리입니다.
      const notebookOverlay = document.getElementById("notebook-menu-overlay");
      const isNotebookOpen =
        notebookOverlay && notebookOverlay.classList.contains("active");

      // 이미 수첩이 열려 있다면, 한 번 클릭으로 수첩을 닫아 줍니다.
      if (isNotebookOpen) {
        if (typeof closeNotebookMenu === "function") {
          try {
            closeNotebookMenu();
          } catch (e) {}
        }

        // 수첩을 닫을 때는 기쁨 표정과 함께 2~4개의 멘트 중 하나를 무작위로 사용합니다.
        const closePhrases = [
          "다 봤으면 수첩은 내가 다시 챙겨둘게.",
          "수첩은 여기까지! 필요하면 언제든 다시 열어달라고 해.",
          "기록은 안전하게 보관해둘게. 이제 다시 이야기할까?",
          "다 봤으면 수첩은 잠시 내가 가지고 있을게."
        ];
        const closePhrase =
          closePhrases[Math.floor(Math.random() * closePhrases.length)];

        if (typeof setEmotion === "function") {
          try {
            setEmotion("기쁨", closePhrase, { linePool: closePhrases, source: "builtin" });
          } catch (e) {
            try { if (typeof showBubble === "function") showBubble(closePhrase); } catch (e2) {}
          }
        } else if (typeof showBubble === "function") {
          try {
            showBubble(closePhrase);
          } catch (e) {}
        }
        return;
      }

      // 수첩이 닫혀 있을 때 한 번 클릭하면:
      // 1) 수첩을 보여준다는 멘트를 여러 가지 중에서 무작위로 선택해서 말하고
      // 2) 기본적으로 '화면보기' 감정으로 화면을 바라보게 하며
      // 3) 낮은 확률로 '부끄러움' 감정과 함께 "메모장만 보세요?" 느낌의 멘트를 출력합니다.
      const openPhrases = [
        "수첩 여기 있어.",
        "수첩 여기 보여줄게.",
        "오늘 기록들 한 번 같이 볼까?",
        "오늘 메모를 차근차근 정리해볼까?",
        "수첩 펼쳐서 같이 확인해볼게."
      ];
      const phrase =
        openPhrases[Math.floor(Math.random() * openPhrases.length)];
if (typeof setEmotion === "function") {
        const useShy = Math.random() < 0.1; // 약 10% 확률로만 부끄러움 연출
        if (useShy) {
          try {
            setEmotion(
              "부끄러움",
              "어… 메모장만 살짝 볼까? 조금 부끄럽네.",
              { shake: true }
            );
          } catch (e) {
            try { if (typeof showBubble === "function") showBubble("어… 메모장만 살짝 볼까? 조금 부끄럽네."); } catch (e2) {}
          }
        } else {
          try {
            const guideEmotions = ["인사", "경청", "화면보기"];
            const chosen = guideEmotions[Math.floor(Math.random() * guideEmotions.length)];
            setEmotion(chosen, phrase, { linePool: openPhrases, source: "builtin" });
          } catch (e) {
            try { if (typeof showBubble === "function") showBubble(phrase); } catch (e2) {}
          }
        }
      } else if (typeof showBubble === "function") {
        try {
          showBubble(phrase);
        } catch (e) {}
      }

      if (typeof openNotebookMenu === "function") {
        try {
          openNotebookMenu();
        } catch (e) {}
      }
    });
  }

// 전송 버튼 클릭
  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      // 음성 입력(long press)으로 이미 처리된 클릭은 무시
      if (window.__voiceInputLastWasLongPress) {
        window.__voiceInputLastWasLongPress = false;
        return;
      }
      // window.handleUserSubmit 참조 — social-chat-firebase.js 패치 적용됨
      if (typeof window.handleUserSubmit === "function") window.handleUserSubmit();
    });
  }

  // Enter 키로 전송
  if (userInput) {
    userInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) {
        if (typeof window.handleUserSubmit === "function") window.handleUserSubmit();
      }
    });
  }

  // 플러스(+) 메뉴 토글 및 액션 처리
  if (plusBtn && plusMenu) {
    plusBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (plusMenu.classList.contains("open")) {
        plusMenu.classList.remove("open");
      } else {
        plusMenu.classList.add("open");
      }
    });

    plusMenu.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === "social") {
        // 마이파-톡: 로그인하지 않았으면 먼저 로그인 창만 띄우고 종료
        if (!window.currentUser || !window.currentUser.user_id) {
          if (typeof window.openLoginPanel === "function") {
            window.openLoginPanel();
          }
          return;
        }
        if (typeof window.toggleSocialChatMode === "function") {
          window.toggleSocialChatMode();
        } else if (typeof toggleSocialChatMode === "function") {
          toggleSocialChatMode();
        }
      } else if (action === "social-messenger") {
        // 로그인하지 않았다면 먼저 로그인 패널만 열고, 실시간 톡 화면은 띄우지 않음
        if (!window.currentUser || !window.currentUser.user_id) {
          if (typeof window.openLoginPanel === "function") {
            window.openLoginPanel();
          }
          return;
        }
        if (typeof window.launchMessenger === "function") {
          window.launchMessenger();
        }
      } else if (action === "teach") {
        if (typeof setEmotion === "function") {
          setEmotion("경청","좋아! 새로 배워볼게.\n아래 창에 문장하고 대사를 입력해줘.", { linePool: ["좋아! 새로 배워볼게.\n아래 창에 문장하고 대사를 입력해줘.", "좋아, 새로 배워볼게.\n아래 칸에 문장하고 대사를 적어줘.", "알겠어. 새로 익혀볼게.\n아래 창에 문장하고 대사를 넣어줘."], source: "builtin" });
        }
        if (typeof openTeachModal === "function") {
          openTeachModal();
          setTimeout(openTeachModal, 30);
        }
      } else if (action === "char") {
        // 캐릭터 전환 (미나 <-> 민수)
        const ghostElLocal = document.getElementById("ghost");
        if (typeof currentCharacterKey !== "undefined") {
          if (currentCharacterKey === "mina") {
            if (typeof setCurrentCharacter === "function") {
              setCurrentCharacter("minsu");
            } else {
              currentCharacterKey = "minsu";
              if (typeof currentCharacterName !== "undefined") {
                currentCharacterName = "민수";
              }
            }
            if (ghostElLocal) {
              ghostElLocal.classList.add("char-minsu");
            }
            if (typeof setEmotion === "function") {
              setEmotion("기쁨", "이제 난 민수야! 잘 부탁해.");
            }
          } else {
            if (typeof setCurrentCharacter === "function") {
              setCurrentCharacter("mina");
            } else {
              currentCharacterKey = "mina";
              if (typeof currentCharacterName !== "undefined") {
                currentCharacterName = "미나";
              }
            }
            if (ghostElLocal) {
              ghostElLocal.classList.remove("char-minsu");
            }
            if (typeof setEmotion === "function") {
              setEmotion("기쁨", "다시 미나 모드로 돌아왔어!");
            }
          }
        }
      } else if (action === "help") {
        if (typeof openManualPanel === "function") {
          openManualPanel();
        } else if (typeof showUsageGuide === "function") {
          showUsageGuide();
        }
      } else if (action === "login") {
        if (window.currentUser && window.currentUser.user_id) {
          if (typeof window.logoutGhostUser === "function") {
            window.logoutGhostUser();
          }
        } else {
          if (typeof window.openLoginPanel === "function") {
            window.openLoginPanel();
          }
        }
      } else if (action === "menu") {
        // [옵션 기능] 수첩(메뉴) 열기 기능 시작
        // 이 코드는 js/notebook-menu.js 모듈이 있을 때만 의미가 있습니다.
        // 만약 js/notebook-menu.js를 삭제했다면,
        // 아래 블록 전체를 함께 삭제해도 됩니다.
        if (typeof openNotebookMenu === "function") {
          openNotebookMenu();
        }
        // [옵션 기능] 수첩(메뉴) 열기 기능 끝
      } else if (action === "settings") {
        // 읽어주기(TTS) 설정 패널 열기
        if (window.ttsVoice && typeof window.ttsVoice.openSettings === "function") {
          window.ttsVoice.openSettings();
        } else if (typeof showBubble === "function") {
          showBubble("이 브라우저에서는 아직 음성 읽어주기를 쓸 수 없어.");
        }
      } else if (action === "barobaro") {
        if (window.AlwaysListen && typeof window.AlwaysListen.toggle === "function") {
          try {
            window.AlwaysListen.toggle();
          } catch (err) {
            console.error("AlwaysListen toggle error:", err);
            if (typeof showBubble === "function") {
              showBubble("바로바로! 기능을 켜는 중 문제가 생겼어.");
            }
          }
        } else if (typeof showBubble === "function") {
          showBubble("바로바로! 기능이 아직 준비되지 않았어.");
        }
      }

      plusMenu.classList.remove("open");
    });

    // 메뉴 바깥을 클릭하면 플러스 메뉴 닫기
    document.addEventListener("click", (e) => {
      if (!plusMenu.contains(e.target) && e.target !== plusBtn) {
        plusMenu.classList.remove("open");
      }
    });
  }

  // ──────────────────────────────────────────
  // 로그인 버튼 텍스트 동적 업데이트
  // ──────────────────────────────────────────
  function updateLoginBtn() {
    var btn = document.getElementById("plusLoginBtn");
    if (!btn) return;
    if (window.currentUser && window.currentUser.user_id) {
      btn.textContent = "🔓 로그아웃";
    } else {
      btn.textContent = "🔑 로그인";
    }
  }

  // 초기 상태 반영 (login.js가 먼저 currentUser 복원할 수 있도록 load 이후 실행됨)
  updateLoginBtn();

  // 로그인 완료 → 버튼 "로그아웃"으로 변경
  window.addEventListener("ghost:login-complete", function () {
    updateLoginBtn();
  });

  // 로그아웃 완료 → 버튼 "로그인"으로 변경
  window.addEventListener("ghost:logout", function () {
    updateLoginBtn();
  });
}