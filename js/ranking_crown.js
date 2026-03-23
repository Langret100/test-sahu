// 랭킹 왕관 모듈 (ranking_crown.js)
// - 로그인한 사용자의 전체 게임 중 최고 랭킹을 캐릭터 머리 위 왕관으로 표시합니다.
// - 이 파일을 삭제하면 왕관 표시 기능이 사라집니다.

(function(){
  const GAS_URL = "https://script.google.com/macros/s/AKfycbz6PjWqKuoTmTalX7ieq3NuhJr-6DPwFQI3c7sDCu9cSCFDt90DP4Ju0yIjfjOgyNoI6w/exec";

  document.addEventListener("DOMContentLoaded", () => {
    injectCrownStyle();
    // 로그인 시점이 페이지 로드보다 늦을 수 있으므로,
    // 일정 간격으로 user_id를 확인하다가 발견되면 한 번만 왕관을 갱신합니다.
    let tried = 0;
    const maxTries = 24; // 최대 약 2분 (5초 간격)
    const timer = setInterval(() => {
      const uid = getCurrentUserId();
      tried++;
      if (!uid) {
        if (tried >= maxTries) {
          clearInterval(timer);
        }
        return;
      }
      clearInterval(timer);
      checkBestStatus();
    }, 5000);
    // 초기 1회는 약간의 지연 후 바로 시도
    setTimeout(() => {
      const uid = getCurrentUserId();
      if (uid) {
        checkBestStatus();
      }
    }, 3000);
  });

  function getCurrentUserId(){
    // 왕관은 "현재 로그인한 계정" 기준으로만 표시합니다.
    if (window.currentUser && window.currentUser.user_id) {
      return window.currentUser.user_id;
    }
    return null;
  }

  function injectCrownStyle(){
    if (document.getElementById("crown-style")) return;

    const style = document.createElement("style");
    style.id = "crown-style";
    style.textContent = `
      @keyframes rk-crown-float-spin {
        0%   { transform: translateY(0) rotate(-4deg); }
        50%  { transform: translateY(-10px) rotate(4deg); }
        100% { transform: translateY(0) rotate(-4deg); }
      }
      @keyframes rk-crown-sparkle {
        0%   { opacity: 0; transform: scale(0.6) rotate(0deg); }
        50%  { opacity: 1; transform: scale(1) rotate(15deg); }
        100% { opacity: 0; transform: scale(0.6) rotate(0deg); }
      }

      .rk-crown-box {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        top: -40px;
        pointer-events: none;
        text-align: center;
        z-index: 10;
      }

      .rk-crown-main {
        position: relative;
        width: 60px;
        height: 34px;
        margin: 0 auto 0;
        animation: rk-crown-float-spin 3s ease-in-out infinite;
        transform-origin: 50% 100%;
        clip-path: polygon(0 100%, 12% 70%, 25% 80%, 50% 20%, 75% 80%, 88% 70%, 100% 100%);
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      }
      .rk-crown-main.gold {
        background: linear-gradient(90deg, #ffe26a, #f5b625);
      }
      .rk-crown-main.silver {
        background: linear-gradient(90deg, #e8edf2, #b4bdc6);
      }
      .rk-crown-main.bronze {
        background: linear-gradient(90deg, #f0c39b, #b87333);
      }

      .rk-crown-text {
        font-size: 12px;
        font-weight: 600;
        margin-top: 0;
        text-shadow: 0 0 4px rgba(0,0,0,0.5);
        color: #fff;
      }

      .rk-crown-sparkle {
        position: absolute;
        width: 22px;
        height: 22px;
        border-radius: 4px;
        border: 2px solid rgba(255,255,255,0.95);
        transform: rotate(45deg);
        opacity: 0;
        animation: rk-crown-sparkle 1.8s ease-in-out infinite;
        box-shadow: 0 0 12px rgba(255,255,255,0.9);
        background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 60%);
      }
      .rk-crown-sparkle-left {
        left: -32px;
        top: 4px;
        animation-delay: 0.1s;
      }
      .rk-crown-sparkle-right {
        right: -32px;
        top: -2px;
        animation-delay: 0.9s;
      }

      @media (max-width: 700px) {
        #ghost .rk-crown-box,
        #character .rk-crown-box {
          top: -32px;
          left: 50%;
          transform: translateX(-50%);
        }
        #ghost .rk-crown-main,
        #character .rk-crown-main {
          width: 30px;
          height: 17px;
        }
        #ghost .rk-crown-text,
        #character .rk-crown-text {
          font-size: 6px;
        }
        #ghost .rk-crown-sparkle,
        #character .rk-crown-sparkle {
          width: 9px;
          height: 9px;
          border-width: 1px;
        }
        #ghost .rk-crown-sparkle-left,
        #character .rk-crown-sparkle-left {
          left: -16px;
          top: 2px;
        }
        #ghost .rk-crown-sparkle-right,
        #character .rk-crown-sparkle-right {
          right: -16px;
          top: -1px;
        }
      }
    `;
    document.head.appendChild(style);
  }

async function checkBestStatus(){
    const userId = getCurrentUserId();
    if (!userId) return;

    try{
      const res = await fetch(
        GAS_URL + "?mode=game_best_status&user_id=" + encodeURIComponent(userId)
      );
      const json = await res.json();
      if (!json || json.ok === false || !json.best) return;

      placeCrown(json.best);
    }catch(e){
      console.error("[ranking_crown] checkBestStatus error", e);
    }
  }

  function placeCrown(bestInfo){
    const ghost = document.getElementById("ghost") || document.getElementById("character");
    if (!ghost) return;

    const rank = Number(bestInfo.rank || 0);

    // ⚠️ 4등 이하일 땐 왕관/반짝이/텍스트 모두 표시하지 않고, 기존 왕관만 제거합니다.
    if (!rank || rank > 3) {
      const oldCrown = ghost.querySelector(".rk-crown-box");
      if (oldCrown) oldCrown.remove();
      return;
    }

    // 기존 왕관 제거 후 새로 추가
    const old = ghost.querySelector(".rk-crown-box");
    if (old) old.remove();

    const box = document.createElement("div");
    box.className = "rk-crown-box";

    let color = "bronze";
    let suffix = "th";
    if (rank === 1) { color = "gold"; suffix = "st"; }
    else if (rank === 2) { color = "silver"; suffix = "nd"; }
    else if (rank === 3) { color = "bronze"; suffix = "rd"; }

    // CSS로 그린 왕관 본체
    const crown = document.createElement("div");
    crown.className = "rk-crown-main " + color;

    // 주변 반짝임 이펙트
    const spLeft = document.createElement("div");
    spLeft.className = "rk-crown-sparkle rk-crown-sparkle-left";

    const spRight = document.createElement("div");
    spRight.className = "rk-crown-sparkle rk-crown-sparkle-right";

    const text = document.createElement("div");
    text.className = "rk-crown-text";
    if (rank > 0) {
      text.textContent = `${bestInfo.game_name} — ${rank}${suffix}`;
    } else {
      text.textContent = `${bestInfo.game_name}`;
    }

    box.appendChild(crown);
    box.appendChild(spLeft);
    box.appendChild(spRight);
    box.appendChild(text);

    const prevPos = window.getComputedStyle(ghost).position;
    if (prevPos === "static" || !prevPos) {
      ghost.style.position = "relative";
    }

    ghost.appendChild(box);
  }


})();
