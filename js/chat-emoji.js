// chat-emoji.js
// ------------------------------------------------------
// 채팅창에서 사용할 이모티콘 선택 패널 모듈입니다.
// - images/emotion/e1.png ~ e12.png 을 프론트에서 직접 읽어와 표시합니다.
// - 서버/시트에는 실제 이미지 대신 :e1: ~ :e12: 형태의 코드만 전송됩니다.
// - 제거 시 함께 정리할 것:
//   1) index.html 의 #emojiBtn / #emojiPanel 관련 HTML
//   2) css/ghost.css 의 #emojiBtn, .emoji-wrapper, #emojiPanel, .emoji-grid 등 스타일
//   3) core.js, social-chat-firebase.js 의 renderTextWithEmojis 호출 부분
//   4) startup.js 의 initChatEmoji() 호출
// ------------------------------------------------------
(function () {
  var EMOJI_COUNT = 12;

  function buildEmojiList() {
    var list = [];
    for (var i = 1; i <= EMOJI_COUNT; i++) {
      list.push({
        code: "e" + i,
        src: "images/emoticon/e" + i + ".png"
      });
    }
    return list;
  }

  function insertTokenToInput(input, token) {
    if (!input) return;
    try {
      var start = input.selectionStart;
      var end = input.selectionEnd;
      if (typeof start === "number" && typeof end === "number") {
        var value = input.value || "";
        input.value = value.slice(0, start) + token + value.slice(end);
        var pos = start + token.length;
        input.selectionStart = pos;
        input.selectionEnd = pos;
      } else {
        input.value = (input.value || "") + token;
      }
      input.focus();
    } catch (e) {
      // selection API 사용 불가한 경우에는 그냥 뒤에 붙임
      input.value = (input.value || "") + token;
      try { input.focus(); } catch (err) {}
    }
  }

  function initChatEmoji() {
    var emojiBtn = document.getElementById("emojiBtn");
    var emojiPanel = document.getElementById("emojiPanel");
    var userInput = document.getElementById("userInput");
    if (!emojiBtn || !emojiPanel || !userInput) return;

    // 패널 안에 4x3 그리드 버튼 구성
    if (!emojiPanel.dataset.__built) {
      emojiPanel.dataset.__built = "1";
      var grid = document.createElement("div");
      grid.className = "emoji-grid";

      var list = buildEmojiList();
      for (var i = 0; i < list.length; i++) {
        var info = list[i];
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "emoji-item";
        btn.setAttribute("data-code", info.code);

        var img = document.createElement("img");
        img.className = "chat-emoji";
        img.src = info.src;
        img.alt = info.code;
        img.width = 72;
        img.height = 72;

        btn.appendChild(img);
        grid.appendChild(btn);
      }

      emojiPanel.appendChild(grid);
    }

    function closePanel() {
      emojiPanel.classList.remove("open");
    }

    emojiBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (emojiPanel.classList.contains("open")) {
        emojiPanel.classList.remove("open");
      } else {
        emojiPanel.classList.add("open");
      }
    });

    emojiPanel.addEventListener("click", function (e) {
      var btn = e.target.closest(".emoji-item");
      if (!btn) return;
      var code = btn.getAttribute("data-code");
      if (!code) return;
      var token = ":" + code + ":";

      // 이모티콘 선택 시 바로 보내기 (마이파-톡용)
      if (userInput) {
        try {
          userInput.value = token;
        } catch (err) {}
      }

      if (typeof window.handleUserSubmit === "function") {
        try {
          window.handleUserSubmit();
        } catch (err) {
          // 실패 시에는 기존 방식대로 입력창에만 토큰을 넣어 둔다.
          insertTokenToInput(userInput, token);
        }
      } else {
        insertTokenToInput(userInput, token);
      }

      closePanel();
    });

    // 패널 바깥 클릭 시 닫기
    document.addEventListener("click", function (e) {
      if (!emojiPanel.classList.contains("open")) return;
      if (e.target === emojiBtn || emojiBtn.contains(e.target)) return;
      if (emojiPanel.contains(e.target)) return;
      closePanel();
    });

    // 외부에서 토큰을 넣고 싶을 때를 위한 헬퍼 (선택 사항)
    window.insertChatEmojiToken = function (code) {
      if (!code) return;
      insertTokenToInput(userInput, ":" + code + ":");
    };
  }

  // 메시지 텍스트 안의 :e1: ~ :e12: 를 이모티콘 이미지로 치환해서 채워 넣는 함수
  function renderTextWithEmojis(text, container) {
    if (!container) return;
    var frag = document.createDocumentFragment();
    if (!text) {
      container.textContent = "";
      return;
    }

    var regex = /:e(0?[1-9]|1[0-2]):/g;
    var lastIndex = 0;
    var match;

    while ((match = regex.exec(text)) !== null) {
      var idx = match.index;
      if (idx > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, idx)));
      }
      var num = parseInt(match[1], 10);
      if (!isNaN(num) && num >= 1 && num <= EMOJI_COUNT) {
        var img = document.createElement("img");
        img.className = "chat-emoji";
        img.src = "images/emoticon/e" + num + ".png";
        img.alt = "e" + num;
        img.width = 72;
        img.height = 72;
        frag.appendChild(img);
      } else {
        // 인식 불가한 코드는 원문 그대로 출력
        frag.appendChild(document.createTextNode(match[0]));
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    container.innerHTML = "";
    container.appendChild(frag);
  }

  // 전역에서 사용할 수 있도록 노출
  window.initChatEmoji = initChatEmoji;
  window.renderTextWithEmojis = renderTextWithEmojis;
})();
