// web-launcher.js - 외부 사이트(구글/유튜브/네이버 등) 새 창 열기 모듈
// 이 파일을 삭제하면 '구글/유튜브/네이버 열어줘' 같은 기능은 깨끗하게 사라집니다.
// core.js 안의 [옵션 기능] 인터넷 사이트 열기 블록도 함께 삭제해 주세요.

(function () {
  if (window.WebLauncher) return;

  const SITES = [
    {
      key: "google",
      labels: ["구글", "google"],
      url: "https://www.google.com/",
      displayName: "구글"
    },
    {
      key: "youtube",
      labels: ["유튜브", "youtube", "yt"],
      url: "https://www.youtube.com/",
      displayName: "유튜브"
    },
    {
      key: "naver",
      labels: ["네이버", "naver"],
      url: "https://www.naver.com/",
      displayName: "네이버"
    }
  ];

  function normalize(text) {
    if (!text) return "";
    return String(text).toLowerCase().replace(/\s+/g, "");
  }

  function detectSite(text) {
    const norm = normalize(text);
    for (const site of SITES) {
      for (const label of site.labels) {
        if (norm.includes(label.toLowerCase().replace(/\s+/g, ""))) {
          return site;
        }
      }
    }
    return null;
  }

  function buildOpenLine(site) {
    const name = site.displayName || "사이트";
    const templates = [
      `${name}를 새 창에서 열어볼게요. 다녀오셔도 저는 여기서 기다리고 있을게요.`,
      `${name} 창 열어둘게요. 다 보고 돌아와서 다시 이야기 이어가요!`,
      `${name}로 잠깐 다녀오는 동안, 저는 여기서 조용히 대기하고 있을게요.`
    ];
    const idx = Math.floor(Math.random() * templates.length);
    return templates[idx] || templates[0];
  }

  window.WebLauncher = {
    handleRequest: function (rawText) {
      const site = detectSite(rawText || "");
      if (!site) {
        if (typeof showBubble === "function") {
          showBubble("어느 사이트를 열어야 할지 잘 모르겠어요. 구글이나 유튜브, 네이버처럼 말해 줄래요?");
        }
        return;
      }

      const line = buildOpenLine(site);
      if (typeof setEmotion === "function") {
        try { setEmotion("기본대기"); } catch (e) {}
      }
      if (typeof showBubble === "function") {
        showBubble(line);
      }
      if (typeof logMessage === "function") {
        logMessage("ghost", line);
      }

      // 짧은 안내 후 새 창 열기
      setTimeout(function () {
        try {
          window.open(site.url, "_blank", "noopener,noreferrer");
        } catch (e) {
          console.error("WebLauncher window.open error:", e);
        }
      }, 1200);
    }
  };
})();
