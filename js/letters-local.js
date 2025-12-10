
// letters-local.js (reworked) - 다른 사용자에게 보내는 편지 (구글 시트 연동)
// - 서버(Apps Script)와 통신해서 편지를 저장 / 조회
// - 시트 구조는 mail.js 가 사용하던 `mode=mail_list`, `mode=mail_send` 를 그대로 사용

(function (window, document) {
  function ensureLogin(overlay) {
    if (!window.currentUser || !window.currentUser.user_id) {
      if (overlay) {
        const status = overlay.querySelector("#letterStatus");
        if (status) {
          status.textContent = "먼저 로그인을 해 주세요.";
        }
      }
      if (typeof openLoginPanel === "function") {
        openLoginPanel();
      }
      return false;
    }
    return true;
  }

  function buildDomIfNeeded() {
    let overlay = document.getElementById("letterOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "letterOverlay";
    overlay.className = "letter-overlay";

    overlay.innerHTML = [
      '<div class="letter-backdrop"></div>',
      '<div class="letter-wrapper">',
      '  <div class="letter-header">',
      '    <div class="letter-title">✉️ 편지 보내기</div>',
      '    <button type="button" class="letter-close">✕</button>',
      '  </div>',
      '  <div class="letter-body">',
      '    <div class="letter-left hidden" id="letterComposePanel">',
      '      <div class="letter-subtitle">다른 사용자에게 조용히 편지를 전해요.</div>',
      '      <div class="letter-desc">편지는 구글 시트에 기록되고,\n받는 사람이 같은 고스트를 사용할 때 자신의 이름(또는 ID)으로 받은 편지를 확인할 수 있어요.</div>',
      '      <div class="letter-form">',
      '        <label class="letter-label">받는 사람 이름</label>',
      '        <input type="text" id="letterToName" class="letter-input" placeholder="로그인할 때 쓰는 이름이나 별명을 적어 주세요.">',
      '        <label class="letter-label">제목</label>',
      '        <input type="text" id="letterTitle" class="letter-input" placeholder="편지 제목을 적어 주세요.">',
      '        <label class="letter-label">내용</label>',
      '        <textarea id="letterContent" class="letter-textarea" rows="4" placeholder="전하고 싶은 말을 적어 볼까요?"></textarea>',
      '        <button type="button" id="letterSendBtn" class="letter-save-btn">편지 보내기</button>',
      '      </div>',
      '    </div>',
      '    <div class="letter-right">',
      '      <div class="letter-right-top">',
      '        <div class="letter-list-title">📬 받은 편지함</div>',
      '        <div class="letter-actions">',
      '          <button type="button" id="letterReloadBtn" class="letter-action-btn">새로고침</button>',
      '          <button type="button" id="letterWriteToggleBtn" class="letter-action-btn">편지 쓰기</button>',
      '        </div>',
      '      </div>',
      '      <div id="letterList" class="letter-list board-list"></div>',
      '      <div id="letterEmpty" class="letter-empty">아직 받은 편지가 없어요.</div>',
      '      <div id="letterPreview" class="letter-preview hidden">',
      '        <div class="letter-preview-title"></div>',
      '        <div class="letter-preview-date"></div>',
      '        <div class="letter-preview-content"></div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div id="letterStatus" class="letter-status"></div>',
      '</div>'
    ].join("");

    document.body.appendChild(overlay);

    const backdrop = overlay.querySelector(".letter-backdrop");
    const closeBtn = overlay.querySelector(".letter-close");

    function close() {
      overlay.classList.remove("open");
      setTimeout(function () {
        overlay.style.display = "none";
      }, 180);
    }

    if (backdrop) backdrop.addEventListener("click", close);
    if (closeBtn) closeBtn.addEventListener("click", close);


    const writeToggleBtn = overlay.querySelector("#letterWriteToggleBtn");
    const reloadBtn = overlay.querySelector("#letterReloadBtn");
    const composePanel = overlay.querySelector("#letterComposePanel");

    if (writeToggleBtn && composePanel) {
      writeToggleBtn.addEventListener("click", function () {
        const isHidden = composePanel.classList.contains("hidden");
        if (isHidden) {
          composePanel.classList.remove("hidden");
        } else {
          composePanel.classList.add("hidden");
        }
      });
    }

    if (reloadBtn) {
      reloadBtn.addEventListener("click", function () {
        loadLetters(overlay);
      });
    }


    overlay._closeLetterOverlay = close;
    return overlay;
  }

  function renderList(overlay, list) {
    const listEl = overlay.querySelector("#letterList");
    const emptyEl = overlay.querySelector("#letterEmpty");
    const preview = overlay.querySelector("#letterPreview");
    const previewTitle = overlay.querySelector(".letter-preview-title");
    const previewDate = overlay.querySelector(".letter-preview-date");
    const previewContent = overlay.querySelector(".letter-preview-content");

    if (!listEl) return;

    listEl.innerHTML = "";
    if (!list || list.length === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      if (preview) preview.classList.add("hidden");
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";

    list.forEach(function (m) {
      const item = document.createElement("div");
      item.className = "board-item letter-item";

      const titleEl = document.createElement("div");
      titleEl.className = "board-item-title letter-item-title";
      const fromName = m.from_name || "알 수 없음";
      titleEl.textContent = (m.title ? m.title + " " : "") + "(From. " + fromName + ")";

      const dateEl = document.createElement("div");
      dateEl.className = "board-item-meta letter-item-date";
      dateEl.textContent = m.sent_at || "";

      item.appendChild(titleEl);
      item.appendChild(dateEl);

      item.addEventListener("click", function () {
        if (!preview || !previewTitle || !previewContent || !previewDate) return;
        previewTitle.textContent = m.title || "(제목 없음)";
        previewDate.textContent = dateEl.textContent;
        previewContent.textContent = m.content || "";
        preview.classList.remove("hidden");
      });

      listEl.appendChild(item);
    });
  }

  function setStatus(overlay, msg) {
    const statusEl = overlay.querySelector("#letterStatus");
    if (statusEl) statusEl.textContent = msg || "";
  }

  async function loadLetters(overlay) {
    if (!ensureLogin(overlay)) return;
    if (!window.fetch || typeof SHEET_CSV_URL === "undefined" || !SHEET_CSV_URL) {
      setStatus(overlay, "시트 주소가 설정되지 않았어요.");
      return;
    }
    try {
      setStatus(overlay, "편지를 불러오는 중이에요...");
      const sep = SHEET_CSV_URL.indexOf("?") >= 0 ? "&" : "?";
      const url =
        SHEET_CSV_URL +
        sep +
        "mode=mail_list&user_id=" +
        encodeURIComponent(window.currentUser.user_id) +
        "&t=" +
        Date.now();
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      let list = [];
      if (Array.isArray(json.list)) {
        list = json.list;
      } else if (Array.isArray(json.data)) {
        list = json.data;
      } else if (Array.isArray(json.rows)) {
        list = json.rows;
      }
      renderList(overlay, list);
      // 리스트가 비어 있을 때는 오른쪽 패널의 안내 문구만 사용합니다.
      setStatus(overlay, "");
    } catch (e) {
      console.error("편지 목록 불러오기 실패:", e);
      setStatus(overlay, "편지를 불러오지 못했어요.");
    }
  }

  
  // [옵션] 새 편지 도착 여부를 간단히 확인하는 헬퍼
  // - 마지막으로 확인한 시각 이후에 도착한 편지가 있으면 true를 반환하도록 설계할 수 있습니다.
  // - 지금은 리스트를 한 번 불러와서, 개수만 비교하는 형태의 최소 구현입니다.
  let _lastKnownLetterCount = 0;

  async function checkNewLettersSimple() {
    if (!ensureLogin()) return false;
    if (typeof postToSheet !== "function") return false;
    try {
      const raw = await postToSheet({ mode: "mail_list", to_name: window.currentUser.nickname || "" });
      const rows = (raw && raw.values) || [];
      const count = rows.length;
      const hasNew = count > _lastKnownLetterCount;
      _lastKnownLetterCount = count;
      return hasNew;
    } catch (e) {
      console.error("새 편지 확인 실패:", e);
      return false;
    }
  }
async function sendLetter(overlay) {
    if (!ensureLogin(overlay)) return;
    if (typeof postToSheet !== "function") {
      setStatus(overlay, "시트 저장 헬퍼(postToSheet)가 준비되지 않았어요.");
      return;
    }

    const toNameInput = overlay.querySelector("#letterToName");
    const titleInput = overlay.querySelector("#letterTitle");
    const contentInput = overlay.querySelector("#letterContent");

    const toName = (toNameInput && toNameInput.value.trim()) || "";
    const title = (titleInput && titleInput.value.trim()) || "";
    const content = (contentInput && contentInput.value.trim()) || "";

    // 이제는 받는 사람 이름, 제목, 내용이 필수입니다.
    if (!toName || !title || !content) {
      setStatus(overlay, "받는 사람 이름, 제목, 내용을 모두 적어 주세요.");
      return;
    }

    try {
      setStatus(overlay, "편지를 보내는 중이에요...");
      await postToSheet({
        mode: "mail_send",
        from_user_id: window.currentUser.user_id,
        from_name: window.currentUser.nickname || window.currentUser.username,
        to_user_id: "",
        to_name: toName,
        title: title,
        content: content
      });

      setStatus(overlay, "편지를 보냈어요!");
      if (titleInput) titleInput.value = "";
      if (contentInput) contentInput.value = "";
      if (toNameInput) toNameInput.value = "";
      // 받는 사람 ID는 그대로 두면 연속 발송 시 편리
      await loadLetters(overlay);
    } catch (e) {
      console.error("편지 보내기 실패:", e);
      setStatus(overlay, "편지 보내기 중 오류가 발생했어요.");
    }
  }

  const LettersLocal = {
    
    openFromMenu: function () {
      // 편지함을 열 때 고스트가 편지 작성과 읽기에 대한 멘트를 무작위로 안내
      if (window.showBubble) {
        try {
          const phrases = [
            "편지는 읽는 사람 마음을 따뜻하게 만들어 줘요.",
            "전하고 싶은 말을 천천히 생각해 보면서 써 볼까요?",
            "받는 사람 이름을 한 번 더 확인하는 것도 잊지 마세요!",
            "너무 길지 않아도 괜찮아요. 진심이 가장 중요하니까요."
          ];
          const msg = phrases[Math.floor(Math.random() * phrases.length)];
          window.showBubble(msg);
        } catch (e) {}
      }

      const overlay = buildDomIfNeeded();

      // 매번 창을 열 때마다 초기 상태로 리셋
      const composePanel = overlay.querySelector("#letterComposePanel");
      if (composePanel && !composePanel.classList.contains("hidden")) {
        composePanel.classList.add("hidden");
      }
      const toNameInput = overlay.querySelector("#letterToName");
      const titleInput = overlay.querySelector("#letterTitle");
      const contentInput = overlay.querySelector("#letterContent");
      if (toNameInput) toNameInput.value = "";
      if (titleInput) titleInput.value = "";
      if (contentInput) contentInput.value = "";

      const preview = overlay.querySelector("#letterPreview");
      if (preview) preview.classList.add("hidden");

      overlay.style.display = "flex";
      window.requestAnimationFrame(function () {
        overlay.classList.add("open");
      });
      setStatus(overlay, "");
      loadLetters(overlay);

      const sendBtn = overlay.querySelector("#letterSendBtn");
      if (sendBtn) {
        sendBtn.onclick = function () {
          sendLetter(overlay);
        };
      }
    }
  };

  window.LettersLocal = LettersLocal;
})(window, document);
