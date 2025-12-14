/* ============================================================
 * chat-linkify.js
 * - 채팅 메시지 텍스트에서 URL을 자동 링크로 변환
 * - 유튜브 링크가 포함되면 썸네일 미리보기(카톡 스타일 간단 카드) 표시
 *
 * 제거 시 함께 지울 것:
 * - games/social-messenger.html 의 script include (chat-linkify.js)
 * - (선택) 유튜브 미리보기/링크 스타일 CSS(.msg-link, .yt-preview 등)
 * ============================================================ */
(function () {
  "use strict";

  function isTextNode(n) { return n && n.nodeType === Node.TEXT_NODE; }
  function isElement(n) { return n && n.nodeType === Node.ELEMENT_NODE; }

  // URL 후보 매칭( http(s):// 또는 www. 로 시작 )
  var URL_RE = /((https?:\/\/|www\.)[^\s<]+?)(?=(\s|$))/gi;
  // URL 끝에서 제거할 수 있는 흔한 구두점
  var TRAIL_PUNCT_RE = /[)\]\}\>\"\'\.\,\!\?\:\;]+$/;

  function normalizeUrl(raw) {
    if (!raw) return "";
    var u = raw.trim();
    u = u.replace(TRAIL_PUNCT_RE, function (m) { return ""; });
    if (/^www\./i.test(u)) return "https://" + u;
    return u;
  }

  function safeText(str) {
    return (str == null) ? "" : String(str);
  }

  function getYouTubeId(url) {
    try {
      var u = new URL(url);
      var host = (u.hostname || "").toLowerCase();
      if (host === "youtu.be") {
        var id = (u.pathname || "").replace("/", "").trim();
        return id || null;
      }
      if (host.endsWith("youtube.com")) {
        if (u.searchParams && u.searchParams.get("v")) return u.searchParams.get("v");
        var p = (u.pathname || "");
        // /shorts/ID , /embed/ID
        var m = p.match(/\/(shorts|embed)\/([a-zA-Z0-9_-]{6,})/);
        if (m && m[2]) return m[2];
      }
    } catch (e) {}
    return null;
  }

  function linkifyTextNode(textNode) {
    if (!textNode || !isTextNode(textNode)) return false;
    var parent = textNode.parentNode;
    if (!parent) return false;

    // 이미 링크 내부면 스킵
    if (isElement(parent) && parent.closest && parent.closest("a")) return false;

    var txt = safeText(textNode.nodeValue);
    if (!txt || txt.search(URL_RE) === -1) return false;

    var frag = document.createDocumentFragment();
    var lastIndex = 0;
    URL_RE.lastIndex = 0;

    var m;
    while ((m = URL_RE.exec(txt)) !== null) {
      var rawUrl = m[1];
      var start = m.index;
      var end = start + rawUrl.length;

      if (start > lastIndex) frag.appendChild(document.createTextNode(txt.slice(lastIndex, start)));

      var cleaned = normalizeUrl(rawUrl);
      var display = rawUrl.replace(TRAIL_PUNCT_RE, function () { return ""; });

      // 링크 생성
      var a = document.createElement("a");
      a.className = "msg-link";
      a.href = cleaned;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = display;
      frag.appendChild(a);

      // 원문에 붙어있던 구두점은 링크 바깥에 남김
      var tail = rawUrl.match(TRAIL_PUNCT_RE);
      if (tail && tail[0]) frag.appendChild(document.createTextNode(tail[0]));

      lastIndex = end;
    }
    if (lastIndex < txt.length) frag.appendChild(document.createTextNode(txt.slice(lastIndex)));

    parent.replaceChild(frag, textNode);
    return true;
  }

  function linkifyContainer(containerEl) {
    if (!containerEl) return;
    var walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (var i = 0; i < nodes.length; i++) {
      try { linkifyTextNode(nodes[i]); } catch (e) {}
    }
  }

  function extractFirstUrl(text) {
    if (!text) return null;
    URL_RE.lastIndex = 0;
    var m = URL_RE.exec(text);
    if (!m) return null;
    return normalizeUrl(m[1]);
  }

  function extractFirstYouTubeUrl(text) {
    if (!text) return null;
    URL_RE.lastIndex = 0;
    var m;
    while ((m = URL_RE.exec(text)) !== null) {
      var u = normalizeUrl(m[1]);
      if (getYouTubeId(u)) return u;
    }
    return null;
  }

  function buildYouTubePreview(url) {
    var vid = getYouTubeId(url);
    if (!vid) return null;

    var wrap = document.createElement("a");
    wrap.className = "yt-preview";
    wrap.href = url;
    wrap.target = "_blank";
    wrap.rel = "noopener";

    var img = document.createElement("img");
    img.className = "yt-thumb";
    img.alt = "YouTube";
    img.src = "https://i.ytimg.com/vi/" + encodeURIComponent(vid) + "/hqdefault.jpg";

    var info = document.createElement("div");
    info.className = "yt-info";

    var title = document.createElement("div");
    title.className = "yt-title";
    title.textContent = "YouTube 링크";

    var host = document.createElement("div");
    host.className = "yt-host";
    try {
      host.textContent = (new URL(url)).hostname;
    } catch (e) {
      host.textContent = "youtube.com";
    }

    info.appendChild(title);
    info.appendChild(host);

    wrap.appendChild(img);
    wrap.appendChild(info);

    // oEmbed로 제목 가져오기(실패해도 미리보기는 유지)
    try {
      fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(url))
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (j) {
          if (j && j.title) title.textContent = j.title;
        })
        .catch(function () {});
    } catch (e) {}

    return wrap;
  }

  function enhanceBubble(bubbleEl, rawText) {
    if (!bubbleEl) return;

    // 1) URL 자동 링크
    try { linkifyContainer(bubbleEl); } catch (e) {}

    // 2) 유튜브 미리보기(이미지/파일 메시지는 제외: 호출 측에서 텍스트일 때만 사용)
    try {
      if (bubbleEl.querySelector && bubbleEl.querySelector(".yt-preview")) return;
      var yt = extractFirstYouTubeUrl(rawText);
      if (!yt) return;
      var card = buildYouTubePreview(yt);
      if (!card) return;
      bubbleEl.appendChild(card);
    } catch (e) {}
  }

  window.ChatLinkify = {
    enhanceBubble: enhanceBubble,
    linkifyContainer: linkifyContainer,
    getYouTubeId: getYouTubeId
  };
})();
