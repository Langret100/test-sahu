// ui.js - 공용 UI 유틸 (게시판 + 로그인/편지 패널 등)

/**
 * 게시판 UI 초기화
 */

/**
 * Apps Script에 POST로 보내는 헬퍼
 * - JSON이 아니라 form-urlencoded로 보내서 CORS preflight를 피함
 */
async function postToSheet(payload) {
  if (!window.fetch || !SHEET_WRITE_URL) {
    throw new Error("SHEET_WRITE_URL not configured or fetch not available");
  }
  const body = new URLSearchParams();
  Object.keys(payload || {}).forEach(function (key) {
    if (payload[key] !== undefined && payload[key] !== null) {
      body.append(key, String(payload[key]));
    }
  });
  const res = await fetch(SHEET_WRITE_URL, {
    method: "POST",
    body: body
    // Content-Type은 자동으로 application/x-www-form-urlencoded 로 설정됨 (simple request)
  });
  return res;
}

function initBoardUI() {
  const panel = document.getElementById("boardPanel");
  if (!panel) return;

  const closeBtn = document.getElementById("boardCloseBtn");
  const backdrop = panel.querySelector(".board-backdrop");
  const saveBtn = document.getElementById("boardSaveBtn");
  const reloadBtn = document.getElementById("boardReloadBtn");
  const writeToggleBtn = document.getElementById("boardWriteToggleBtn");
  const titleInput = document.getElementById("boardTitleInput");
  const authorInput = document.getElementById("boardAuthorInput");
  const contentInput = document.getElementById("boardContentInput");
  const statusEl = document.getElementById("boardStatus");
  const listContainer = document.getElementById("boardListContainer");
  const writeSection = panel.querySelector(".board-write-section");
  const editorSection = document.getElementById("boardEditorSection");
  const prevPageBtn = document.getElementById("boardPrevPageBtn");
  const nextPageBtn = document.getElementById("boardNextPageBtn");
  const pageInfoEl = document.getElementById("boardPageInfo");
  const hintEl = document.getElementById("boardHint");

  // 페이지네이션 상태: 한 페이지에 8개씩
  let allRows = [];
  const PAGE_SIZE = 8;
  let currentPage = 1;

  function setBoardStatus(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }

  
  function openBoard() {
    // 게시판을 열 때 고스트가 한마디 건네도록 처리
    if (window.showBubble) {
      try {
        const phrases = [
          "게시판에 오늘 있었던 일을 한번 남겨 볼까요?",
          "다른 친구들이 남긴 글도 천천히 읽어 보면 재밌을 거예요.",
          "글을 쓸 때는 서로를 배려하는 말로 적어 주기로 약속!",
          "좋은 생각이 떠오르면 언제든지 여기에서 기록해요."
        ];
        const msg = phrases[Math.floor(Math.random() * phrases.length)];
        window.showBubble(msg);
      } catch (e) {}
    }

    panel.classList.remove("hidden");
    panel.classList.add("open");
    if (window.hideFullscreenButton) {
      try { window.hideFullscreenButton(); } catch (e) {}
    }
    setBoardStatus("");
    if (hintEl) {
      // 처음 열 때는 안내 문구 숨김
      hintEl.classList.add("hidden");
    }
    loadBoardList();
  }

  function closeBoard() {
    panel.classList.remove("open");
    setTimeout(() => {
      if (!panel.classList.contains("open")) {
        panel.classList.add("hidden");
      }
    }, 160);
    if (window.showFullscreenButton) {
      try { window.showFullscreenButton(); } catch (e) {}
    }
  }

  if (closeBtn) closeBtn.addEventListener("click", closeBoard);
  if (backdrop) backdrop.addEventListener("click", closeBoard);


  async function loadBoardList() {
    if (!window.fetch || typeof SPREADSHEET_URL === "undefined" || !SPREADSHEET_URL) {
      setBoardStatus("시트 주소가 설정되지 않아 게시판을 사용할 수 없어요.");
      return;
    }
    try {
      // 안내 문구 위치에 '불러오는 중' 표시
      if (hintEl) {
        hintEl.textContent = "게시글을 불러오는 중이에요...";
        hintEl.classList.remove("hidden");
      }
      const sep = SPREADSHEET_URL.indexOf("?") >= 0 ? "&" : "?";
      const url = SPREADSHEET_URL + sep + "mode=board_list&t=" + Date.now();
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const rows = Array.isArray(json.data) ? json.data : [];
      /// 최신 글이 위에 오도록 역순으로 저장
      allRows = rows.slice().reverse();
      currentPage = 1;
      renderBoardList();
      if (rows.length === 0) {
        setBoardStatus("아직 올라온 글이 없어요. 첫 글을 남겨볼래요?");
        // 글이 없으면 안내 문구는 굳이 보여주지 않음
        if (hintEl) {
          hintEl.classList.add("hidden");
        }
      } else {
        // 별도 상태 메시지는 비우고, 안내 문구를 원래 내용으로 복구
        setBoardStatus("");
        if (hintEl) {
          hintEl.textContent = "아래에 제목을 누르면 내용을 확인할 수 있습니다.";
          hintEl.classList.remove("hidden");
        }
      }
    } catch (e) {
      console.error("게시판 불러오기 실패:", e);
      setBoardStatus("게시글을 불러오지 못했어요. 네트워크 상태나 Apps Script 설정을 확인해 주세요.");
    }
  }

  
  function formatBoardCreatedAt(ts) {
    if (!ts) return "";
    try {
      var s = (typeof ts === "string") ? ts.trim() : (ts + "");
      // ISO 형태(예: 2025-12-04T15:00:00.000Z)는 Date로 파싱해서 지역 시간 기준으로 시/분만 쓴다.
      if (s.indexOf("T") !== -1) {
        var d = new Date(s);
        if (!isNaN(d.getTime())) {
          var yy = d.getFullYear();
          var mm = d.getMonth() + 1;
          var dd = d.getDate();
          var h = d.getHours();
          var m = d.getMinutes();
          function pad2(n) { return (n < 10 ? "0" : "") + n; }
          return yy + "-" + pad2(mm) + "-" + pad2(dd) + " " + pad2(h) + ":" + pad2(m);
        }
        return s;
      }
      // "YYYY-MM-DD HH:mm:ss" 형식이면 초는 잘라내고 날짜+시:분만 사용
      if (s.length >= 16 && s[4] === "-" && s[7] === "-") {
        return s.substring(0, 16);
      }
      // "YYYY-MM-DD" 같은 경우는 그대로 사용
      return s;
    } catch (e) {
      return ts;
    }
  }

function renderBoardList() {
    if (!listContainer) return;
    listContainer.innerHTML = "";

    if (!allRows || allRows.length === 0) {
      const empty = document.createElement("div");
      empty.className = "board-item board-item-empty";
      empty.textContent = "등록된 글이 아직 없어요.";
      listContainer.appendChild(empty);
      if (pageInfoEl) pageInfoEl.textContent = "0 / 0";
      if (prevPageBtn) prevPageBtn.disabled = true;
      if (nextPageBtn) nextPageBtn.disabled = true;
      return;
    }

    const totalPages = Math.ceil(allRows.length / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageRows = allRows.slice(startIndex, startIndex + PAGE_SIZE);

    pageRows.forEach((row) => {
      const item = document.createElement("div");
      item.className = "board-item";

      const title = row.title || row.subject || "";
      const author = (row.author || row.writer || "").toString();
      const createdAtRaw = row.created_at || row.date || "";
      const createdAt = formatBoardCreatedAt(createdAtRaw);
      const fullContent = (row.content || row.body || "").toString();

      const headerEl = document.createElement("div");
      headerEl.className = "board-item-header";

      const titleEl = document.createElement("div");
      titleEl.className = "board-item-title";
      titleEl.textContent = title || "(제목 없음)";

      // 게임 자동 기록(예: 수학 탐험대) 글은 제목 스타일을 조금 더 강조합니다.
      const isGameAutoPost = author && author.indexOf("[게임자동기록]") !== -1;
      if (isGameAutoPost) {
        titleEl.classList.add("board-item-title-auto");
      }

      const bodyEl = document.createElement("div");
      bodyEl.className = "board-item-body";
      bodyEl.style.display = "none";

      const metaEl = document.createElement("div");
      metaEl.className = "board-item-meta";
      metaEl.textContent = (author ? author + " · " : "") + createdAt;

      const contentEl = document.createElement("div");
      contentEl.className = "board-item-content";
      contentEl.textContent = fullContent || "(내용 없음)";

      // 제목(헤더)를 클릭하면 글쓴이/날짜/내용이 펼쳐지는 토글
      headerEl.addEventListener("click", () => {
        const isHidden = bodyEl.style.display === "none";

        // 현재 페이지에서 열려 있는 다른 글 내용은 모두 닫고,
        // 이번에 클릭한 글만 펼치도록 합니다.
        const allBodies = listContainer.querySelectorAll(".board-item-body");
        allBodies.forEach((el) => {
          if (el !== bodyEl) {
            el.style.display = "none";
          }
        });

        bodyEl.style.display = isHidden ? "block" : "none";
      });

      headerEl.appendChild(titleEl);
      bodyEl.appendChild(metaEl);
      bodyEl.appendChild(contentEl);

      item.appendChild(headerEl);
      item.appendChild(bodyEl);

      listContainer.appendChild(item);
    });

    if (pageInfoEl) {
      pageInfoEl.textContent = currentPage + " / " + Math.ceil(allRows.length / PAGE_SIZE || 1);
    }
    if (prevPageBtn) {
      prevPageBtn.disabled = currentPage <= 1;
    }
    if (nextPageBtn) {
      nextPageBtn.disabled = currentPage >= Math.ceil(allRows.length / PAGE_SIZE || 1);
    }
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage -= 1;
        renderBoardList();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(allRows.length / PAGE_SIZE) || 1;
      if (currentPage < totalPages) {
        currentPage += 1;
        renderBoardList();
      }
    });
  }

  async function handleSavePost() {
    const title = (titleInput && titleInput.value.trim()) || "";
    const author = (authorInput && authorInput.value.trim()) || "";
    const content = (contentInput && contentInput.value.trim()) || "";

    if (!title || !content) {
      setBoardStatus("제목과 내용은 꼭 입력해야 해요.");
      return;
    }
    if (typeof SHEET_WRITE_URL === "undefined" || !SHEET_WRITE_URL) {
      setBoardStatus("글을 저장할 시트 주소가 설정되지 않았어요.");
      return;
    }

    try {
      setBoardStatus("글을 저장하는 중이에요...");
      await postToSheet({
        mode: "board_write",
        title: title,
        author: author,
        content: content
      });

      setBoardStatus("글이 등록되었어요!");
      if (titleInput) titleInput.value = "";
      if (authorInput) authorInput.value = "";
      if (contentInput) contentInput.value = "";
      // 글 저장 후 목록 갱신 + 모달 닫기
      setTimeout(() => {
        loadBoardList();
        const writeModal = document.getElementById("boardWriteModal");
        if (writeModal) {
          writeModal.classList.add("hidden");
        }
      }, 600);
    } catch (e) {
      console.error("게시판 글 저장 실패:", e);
      setBoardStatus("글 저장에 실패했어요. 네트워크 상태나 Apps Script 설정을 확인해 주세요.");
    }
  }

  if (saveBtn) saveBtn.addEventListener("click", handleSavePost);
  if (reloadBtn) reloadBtn.addEventListener("click", loadBoardList);

  window.openBoardPanel = openBoard;
  window.closeBoardPanel = closeBoard;
  window.reloadBoardList = loadBoardList;
}

/**
 * 로그인 UI 초기화
 */

// 로그인 패널이 HTML에 없으면 즉석에서 만들어주는 보조 함수

