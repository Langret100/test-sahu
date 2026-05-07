/**
 * parallax-3d.js
 * ─────────────────────────────────────────────────────
 * CSS 변수 주입 방식 패럴랙스
 *
 * 원본 요소의 transform을 직접 덮어쓰지 않는다.
 * 대신 CSS에서 각 요소의 transform에 var(--plx-x), var(--plx-y)를
 * translate()로 합산하도록 ghost.css를 수정하고,
 * JS는 그 변수값만 업데이트한다.
 *
 * 레이어 (깊이 순):
 *   L1 배경     #bg-container, #waveBackground      tx:-8  ty:-5
 *   L2 캐릭터   #ghostContainer, #bubbleWrapper      tx:+16 ty:+10
 *   L3 채팅창   #chatDock                            tx:+5  ty:+3
 *   L4 패널     #notebook-menu-overlay 등            tx:+7  ty:+5
 *
 * 중단: #gameOverlay visible 시 모든 변수 → 0
 * ─────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── 레이어 정의 ── */
  var _isMob = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
               (navigator.maxTouchPoints > 1 && window.innerWidth < 900);

  var LAYERS = [
    { ids: ['bg-container', 'waveBackground', 'snowLayer'],
      tx: -8, ty: -5 },
    { ids: ['ghostContainer', 'bubbleWrapper'],
      tx: _isMob ? 6 : 16, ty: 0 },  /* 모바일: 16→6 축소, Y 고정 */
    { ids: ['chatDock'],
      tx: _isMob ? 3 :  5, ty: _isMob ? 2 : 3 },
    { ids: ['clockWidget', 'questStatusBar'],
      tx:  6, ty:  4 },
    { ids: ['notebook-menu-overlay', 'boardPanel', 'manualPanel',
             'teachModal', 'bgSelectPanel', 'boardWriteModal'],
      tx:  7, ty:  5 },
  ];

  /* ── 상태 ── */
  var cur    = { x: 0, y: 0 };
  var tgt    = { x: 0, y: 0 };
  var rafId  = null;
  var isMobile  = false;
  var gyroAvail = false;
  var LERP      = 0.07;

  /* ── 요소별 CSS 변수 적용 ── */
  function applyLayers(nx, ny) {
    LAYERS.forEach(function (layer) {
      var dx = (nx * layer.tx).toFixed(2);
      var dy = (ny * layer.ty).toFixed(2);
      layer.ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.style.setProperty('--plx-x', dx + 'px');
        el.style.setProperty('--plx-y', dy + 'px');
      });
    });
  }

  function resetLayers() {
    LAYERS.forEach(function (layer) {
      layer.ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.style.setProperty('--plx-x', '0px');
        el.style.setProperty('--plx-y', '0px');
      });
    });
  }

  /* ── 게임 오버레이 열림 여부 ── */
  function isGameOpen() {
    var ov = document.getElementById('gameOverlay');
    return !!(ov && !ov.classList.contains('hidden'));
  }

  /* ── PC 마우스 ── */
  function initMouse() {
    document.addEventListener('mousemove', function (e) {
      tgt.x = (e.clientX - window.innerWidth  / 2) / (window.innerWidth  / 2);
      tgt.y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    }, { passive: true });
  }

  /* ── 모바일 자이로 ── */
  function startGyro() {
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma === null && e.beta === null) return;
      gyroAvail = true;
      tgt.x = Math.max(-1, Math.min(1, (e.gamma || 0) / 30));
      tgt.y = Math.max(-1, Math.min(1, ((e.beta  || 0) - 15) / 20));
    }, { passive: true });
  }

  function requestGyro() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      document.addEventListener('touchstart', function h() {
        document.removeEventListener('touchstart', h);
        DeviceOrientationEvent.requestPermission()
          .then(function (s) { if (s === 'granted') startGyro(); })
          .catch(function () {});
      }, { once: true, passive: true });
    } else {
      startGyro();
    }
  }

  /* 자이로 없을 때 자율 float */
  function floatStep(ts) {
    if (!gyroAvail) {
      var t = ts * 0.001;
      tgt.x = Math.sin(t * 0.38) * 0.15 + Math.sin(t * 0.15) * 0.06;
      tgt.y = Math.cos(t * 0.27) * 0.10 + Math.cos(t * 0.21) * 0.04;
    }
  }

  /* ── RAF 루프 ── */
  function loop(ts) {
    rafId = requestAnimationFrame(loop);

    if (isGameOpen()) {
      resetLayers();
      return;
    }

    if (isMobile) floatStep(ts);

    cur.x += (tgt.x - cur.x) * LERP;
    cur.y += (tgt.y - cur.y) * LERP;

    applyLayers(cur.x, cur.y);
  }

  /* ── 초기화 ── */
  function init() {
    isMobile = _isMob;

    if (isMobile) { requestGyro(); } else { initMouse(); }
    rafId = requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
