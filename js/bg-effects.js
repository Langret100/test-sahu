// snow-effect.js - 눈 내리는 겨울 배경 효과 모듈
// 이 파일을 삭제하면 눈 내리는 겨울 배경 효과는 깨끗하게 사라집니다.
// background.js의 snow 모드에서 window.SnowEffect.start()/stop()을 호출합니다.

(function(){
  if (window.SnowEffect) return;

  let layer = null;
  let timerId = null;

  function ensureLayer() {
    if (layer && layer.parentNode) return layer;
    const wrap = document.getElementById("canvasWrapper") || document.body;
    layer = document.createElement("div");
    layer.id = "snowLayer";
    wrap.appendChild(layer);
    return layer;
  }

  function removeLayer() {
    if (layer && layer.parentNode) {
      layer.parentNode.removeChild(layer);
    }
    layer = null;
  }

  function createSnowflake() {
    const root = ensureLayer();
    const flake = document.createElement("div");
    flake.className = "snowflake";

    const size = 4 + Math.random() * 4;
    flake.style.width = size + "px";
    flake.style.height = size + "px";

    const startX = Math.random() * 100;
    flake.style.left = startX + "vw";

    const duration = 10 + Math.random() * 8;
    flake.style.animationDuration = duration + "s";
    flake.style.pointerEvents = "none";
    flake.style.pointerEvents = "none";

    flake.addEventListener("animationend", function(){
      if (flake.parentNode) flake.parentNode.removeChild(flake);
    });
root.appendChild(flake);
  }

  function start() {
    if (timerId) return;
    ensureLayer();
    // 처음에 몇 개 미리 생성
    for (let i = 0; i < 10; i++) {
      setTimeout(createSnowflake, i * 300);
    }
    timerId = setInterval(function(){
      createSnowflake();
    }, 700);
  }

  function stop() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    if (layer) {
      const children = Array.from(layer.querySelectorAll(".snowflake"));
      children.forEach(function(el){
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    }
  }

  window.SnowEffect = {
    start: start,
    stop: stop
  };
})();
