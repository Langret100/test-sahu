// 랭킹 모듈 (ranking.js)
// - 수첩(노트북) 안에 "게임 랭킹" 메모 버튼과 랭킹 팝업 UI를 담당합니다.
// - 이 파일을 삭제하면 "게임 랭킹" 버튼과 랭킹 팝업 기능이 모두 사라집니다.

(function(){
  const GAS_URL = "https://script.google.com/macros/s/AKfycbz6PjWqKuoTmTalX7ieq3NuhJr-6DPwFQI3c7sDCu9cSCFDt90DP4Ju0yIjfjOgyNoI6w/exec";
  // 마지막으로 탭에서 요청한 게임 이름 (비동기 응답 순서 뒤집힘 방지)
  let lastRankingGameName = null;

  document.addEventListener("DOMContentLoaded", () => {
    try {
      injectRankingMemoCard();
    } catch(e) {
      console.error("[ranking] memo-card inject error", e);
    }
  });

  // 현재 로그인한 사용자 ID 얻기
  // - 2025-12-08 변경: localStorage("ghostUser")에 남아 있는 이전 로그인 정보는 사용하지 않고,
  //   현재 페이지에서 실제로 로그인해 설정한 window.currentUser.user_id만 기준으로 사용합니다.
  function getCurrentUserId(){
    if (window.currentUser && window.currentUser.user_id) {
      return window.currentUser.user_id;
    }
    return null;
  }

  function injectRankingMemoCard(){
    const grid = document.querySelector(".notebook-right .memo-grid") || document.querySelector(".memo-grid");
    if(!grid) return;

    // 이미 존재하면 중복 생성 방지
    if (grid.querySelector(".memo-card[data-page='ranking']")) return;

    const card = document.createElement("button");
    card.className = "memo-card";
    card.dataset.page = "ranking";

    const label = document.createElement("div");
    label.className = "memo-label";
    label.innerHTML = "게임<br>랭킹";

    card.appendChild(label);
    grid.appendChild(card);

    card.addEventListener("click", (ev)=>{
      ev.preventDefault();
      openRankingPopup();
    });
  }

  
function openRankingPopup(){
    // 랭킹 창을 열 때 고스트가 랭킹에 대해 한마디 합니다.
    if (window.showBubble) {
      try {
        const phrases = [
          "이번엔 어떤 기록들이 나왔을까요? 상위권에 있을지도 몰라요!",
          "게임 랭킹을 같이 확인해 볼까요? 친구들 기록도 함께 볼 수 있어요.",
          "오늘은 누가 1등일지 궁금하지 않나요?",
          "내 기록이 조금씩 올라가는지 같이 체크해 볼까요?"
        ];
        const msg = phrases[Math.floor(Math.random() * phrases.length)];
        window.showBubble(msg);
      } catch (e) {}
    }

    let overlay = document.getElementById("ranking-overlay");
    if(!overlay){
      overlay = document.createElement("div");
      overlay.id = "ranking-overlay";
      overlay.style.position = "fixed";
      overlay.style.left = "0";
      overlay.style.top = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.background = "rgba(0,0,0,0.45)";
      overlay.style.zIndex = "9999";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";

      const box = document.createElement("div");
      box.id = "ranking-box";
      box.style.width = "min(520px, 92%)";
      box.style.maxWidth = "520px";
      box.style.height = "70%";
      box.style.background = "#fdfaf4"; // notebook 배경과 비슷한 톤
      box.style.borderRadius = "16px";
      box.style.display = "flex";
      box.style.flexDirection = "column";
      box.style.overflow = "hidden";
      box.style.boxShadow = "0 18px 40px rgba(0,0,0,0.35)";

      // 헤더
      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.justifyContent = "space-between";
      header.style.padding = "10px 14px";
      header.style.background = "#f2f2f2";

      const title = document.createElement("div");
      title.textContent = "게임 랭킹";
      title.style.fontSize = "18px";
      title.style.fontWeight = "600";

      const closeBtn = document.createElement("button");
      closeBtn.id = "rk-close-btn";
      closeBtn.textContent = "✕";
      closeBtn.style.fontSize = "18px";
      closeBtn.style.border = "none";
      closeBtn.style.background = "transparent";
      closeBtn.style.cursor = "pointer";

      header.appendChild(title);
      header.appendChild(closeBtn);

      // 탭 영역
      const tabs = document.createElement("div");
      tabs.id = "rk-tabs";
      tabs.style.display = "flex";
      tabs.style.borderBottom = "1px solid rgba(0,0,0,0.06)";
      tabs.style.background = "#f9f3e7";

      const games = [
        { key: "구구단게임", label: "구구단" },
        { key: "덧셈주사위", label: "덧셈" },
        { key: "꿈틀이도형추적자", label: "도형" }
      ];

      games.forEach((g, idx)=>{
        const tab = document.createElement("button");
        tab.className = "rk-tab";
        tab.dataset.game = g.key;
        tab.textContent = g.label;
        tab.style.flex = "1";
        tab.style.padding = "9px 4px";
        tab.style.border = "none";
        tab.style.background = idx === 0 ? "#ffffff" : "transparent";
        tab.style.borderRight = "1px solid rgba(0,0,0,0.03)";
        tab.style.cursor = "pointer";
        tab.style.fontSize = "13px";
        tab.style.fontWeight = idx === 0 ? "700" : "500";
        tab.addEventListener("click", ()=>{
          switchTabGame(g.key, tab);
        });
        tabs.appendChild(tab);
      });

      // 랭킹 리스트
      const listWrap = document.createElement("div");
      listWrap.id = "rk-list-wrap";
      listWrap.style.flex = "1";
      listWrap.style.overflowY = "auto";
      listWrap.style.padding = "10px 16px 12px";
      listWrap.style.fontSize = "14px";
      listWrap.style.background = "#fffaf2";

      const list = document.createElement("div");
      list.id = "rk-list";
      listWrap.appendChild(list);

      // 내 최고 기록 표시
      const myBox = document.createElement("div");
      myBox.id = "rk-my-best";
      myBox.style.padding = "9px 16px 11px";
      myBox.style.borderTop = "1px solid rgba(0,0,0,0.08)";
      myBox.style.fontSize = "13px";
      myBox.style.background = "#f7efe1";
      myBox.textContent = "";

      box.appendChild(header);
      box.appendChild(tabs);
      box.appendChild(listWrap);
      box.appendChild(myBox);

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      closeBtn.addEventListener("click", ()=>{
        overlay.style.display = "none";
      });
    }

    overlay.style.display = "flex";

    // 첫 탭(구구단게임) 로딩
    const firstTab = overlay.querySelector(".rk-tab");
    if (firstTab) {
      switchTabGame(firstTab.dataset.game, firstTab);
    }
  }

  function switchTabGame(gameName, activeTabBtn){
    const overlay = document.getElementById("ranking-overlay");
    if (!overlay) return;
    const tabs = overlay.querySelectorAll(".rk-tab");
    tabs.forEach(btn=>{
      btn.style.background = "#f7f7f7";
      btn.style.fontWeight = "500";
    });
    if (activeTabBtn){
      activeTabBtn.style.background = "#ffffff";
      activeTabBtn.style.fontWeight = "700";
    }
    // 마지막으로 선택한 게임 이름을 저장해, 비동기 응답이 뒤늦게 와도 이전 탭의 데이터로 덮어쓰지 않도록 합니다.
    lastRankingGameName = gameName;
    loadRankingList(gameName);
    loadMyBest(gameName);
  }

  async function loadRankingList(gameName){
    const listEl = document.getElementById("rk-list");
    if(!listEl) return;
    listEl.innerHTML = "랭킹을 불러오는 중이에요...";

    // 이 호출 시점의 게임 이름을 따로 저장해 두고,
    // 응답이 왔을 때 현재 마지막 탭 선택과 다르면 화면을 갱신하지 않습니다.
    const requestGameName = gameName;

    try{
      const res = await fetch(
        GAS_URL + "?mode=game_ranking&game_name=" + encodeURIComponent(gameName)
      );
      const json = await res.json();

      // 탭을 빠르게 전환했을 때, 뒤늦게 도착한 이전 게임 랭킹 응답은 버립니다.
      if (requestGameName !== lastRankingGameName) {
        return;
      }

      listEl.innerHTML = "";

      if (!json.ok || !json.list || json.list.length === 0){
        const empty = document.createElement("div");
        empty.textContent = "아직 랭킹 기록이 없어요.";
        listEl.appendChild(empty);
        return;
      }

      const currentUserId = getCurrentUserId();
      let isFirstMine = false;

      json.list.forEach(item=>{
        const row = document.createElement("div");
        row.className = "rk-row";
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.padding = "6px 0";
        row.style.borderBottom = "1px dashed rgba(0,0,0,0.04)";

        const rankBox = document.createElement("div");
        rankBox.style.width = "42px";
        rankBox.style.display = "flex";
        rankBox.style.alignItems = "center";
        rankBox.style.justifyContent = "center";

        const rankNum = Number(item.rank || 0);

        // 랭킹 1위 보상(게임별 1회) 체크
        try {
          if (!isFirstMine && rankNum === 1 && currentUserId) {
            if (item.user_id === currentUserId || item.username === currentUserId) {
              isFirstMine = true;
            }
          }
        } catch (e) {}
        if (rankNum === 1 || rankNum === 2 || rankNum === 3){
          const color = rankNum === 1 ? "gold" : rankNum === 2 ? "silver" : "bronze";

          const crownMini = document.createElement("div");
          crownMini.style.position = "relative";
          crownMini.style.width = "26px";
          crownMini.style.height = "16px";
          crownMini.style.clipPath = "polygon(0 100%, 12% 70%, 25% 80%, 50% 20%, 75% 80%, 88% 70%, 100% 100%)";
          crownMini.style.boxShadow = "0 2px 5px rgba(0,0,0,0.35)";

          if (color === "gold") {
            crownMini.style.background = "linear-gradient(90deg, #ffe26a, #f5b625)";
          } else if (color === "silver") {
            crownMini.style.background = "linear-gradient(90deg, #e8edf2, #b4bdc6)";
          } else {
            crownMini.style.background = "linear-gradient(90deg, #f0c39b, #b87333)";
          }

          rankBox.appendChild(crownMini);
        } else {
          rankBox.textContent = rankNum ? (rankNum + ".") : "-";
        }

        const nameBox = document.createElement("div");
        nameBox.style.flex = "1";
        nameBox.style.paddingRight = "8px";
        nameBox.textContent = item.username || item.user_id || "(이름 없음)";

        const scoreBox = document.createElement("div");
        scoreBox.style.minWidth = "60px";
        scoreBox.style.textAlign = "right";
        scoreBox.style.fontWeight = "600";
        scoreBox.textContent = (item.score || 0) + "점";

        row.appendChild(rankBox);
        row.appendChild(nameBox);
        row.appendChild(scoreBox);

        listEl.appendChild(row);
      });

      // 랭킹 1위 달성 시 코인 보상 요청 (옵션)
      try {
        if (window.__ghostCoinReward && typeof window.__ghostCoinReward.rankingIfFirst === "function") {
          window.__ghostCoinReward.rankingIfFirst(gameName, (json && json.list) || []);
        }
      } catch (e) {}
    }catch(e){
      console.error("[ranking] loadRankingList error", e);
      listEl.innerHTML = "랭킹을 불러오는 중 오류가 발생했어요.";
    }
  }

  async function loadMyBest(currentGameName){
    const box = document.getElementById("rk-my-best");
    if(!box) return;

    const userId = getCurrentUserId();
    if (!userId){
      box.textContent = "로그인하면 내 최고 기록이 여기에 표시돼요.";
      return;
    }

    try{
      const res = await fetch(
        GAS_URL + "?mode=game_best_status&user_id=" + encodeURIComponent(userId)
      );
      const json = await res.json();

      if (!json.ok || !json.best){
        box.textContent = "아직 저장된 게임 기록이 없어요.";
        return;
      }

      const best = json.best;

      if (best.game_name === currentGameName){
        box.textContent = `내 최고 기록: ${best.game_name} ${best.rank}위 (${best.score}점)`;
      } else {
        box.textContent = `전체 게임 중 최고 기록: ${best.game_name} ${best.rank}위 (${best.score}점)`;
      }
    }catch(e){
      console.error("[ranking] loadMyBest error", e);
      box.textContent = "내 기록 정보를 불러오지 못했어요.";
    }
  }


  // 전역에서 메뉴 등에서 사용할 수 있도록 노출
  if (typeof window !== "undefined") {
    window.openRankingPopup = openRankingPopup;
  }

})();