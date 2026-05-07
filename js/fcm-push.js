/* ============================================================
   [fcm-push.js] FCM 웹 푸시 알림 모듈
   ------------------------------------------------------------
   역할:
     1) 로그인 후 Firebase Messaging SDK로 FCM 토큰 발급
     2) 발급된 토큰을 Firebase DB /fcm_tokens/{userId} 에 저장
        (내가 방문한 방 목록, 닉네임도 함께 저장)
     3) Apps Script(server)에서 해당 방 구독자에게 FCM 푸시 발송
     4) 만료된 토큰(Apps Script 응답 404/410) 감지 시 자동 갱신

   핵심 버그 수정 내역:
     [이전] 캐시 토큰(ghostFcmToken_v1)이 있으면 return으로 종료
            → 토큰이 만료되어도 새 토큰 발급 시도 없이 만료 토큰을 계속 DB에 재저장
            → Apps Script에서 FCM 발송 시 매번 404가 반환됨
     [수정] 캐시 토큰으로 DB 우선 갱신 + 동시에 백그라운드에서 최신 토큰 재발급 시도
            새 토큰이 다르면 캐시와 DB 모두 교체
            social-messenger.js 응답에서 404 감지 시 ghost:fcm-token-stale 이벤트로
            refreshToken() 강제 호출 → 캐시 삭제 후 새 토큰 발급

   [제거 시 함께 삭제]
     1) index.html 의 <script src="js/fcm-push.js"> 태그
     2) sw.js 의 FCM 관련 push/notificationclick 이벤트 블록
     3) Firebase DB /fcm_tokens 경로 전체
   ============================================================ */

(function () {
  'use strict';

  /* ── VAPID 공개 키 ──────────────────────────────────────────
     Firebase 콘솔 → 프로젝트 설정 → 클라우드 메시징
     → 웹 푸시 인증서 항목에서 확인
     GitHub Actions 배포 시 Secrets(VAPID_KEY)으로 자동 치환됩니다.
  ─────────────────────────────────────────────────────────── */
  var VAPID_KEY = 'BDqiw7D__zWr5JzQ-RSZjbgowJv_9A752te_4OINq8s-EMyHr9oUgPbcCrImmKcorq_4p239To9XUsRMdiFyOQc';

  /* ── localStorage 키 상수 ───────────────────────────────────
     LS_VISITED   : 내가 방문한 방 목록 (방별 구독 판단에 사용)
     LS_FCM_TOKEN : 발급된 FCM 토큰 캐시 (앱 재시작 시 재사용)
     DB_TOKENS    : Firebase DB 경로 (/fcm_tokens)
  ─────────────────────────────────────────────────────────── */
  var LS_VISITED   = 'ghostRoomVisited_v1';
  var LS_FCM_TOKEN = 'ghostFcmToken_v1';
  var DB_TOKENS    = 'fcm_tokens';

  /* ── 내부 상태 변수 ─────────────────────────────────────────
     _token       : 현재 유효한 FCM 토큰 (null이면 미발급 상태)
     _userId      : 현재 로그인된 유저 ID
     _initialized : 토큰 발급 완료 여부 (중복 init 방지 플래그)
  ─────────────────────────────────────────────────────────── */
  var _token       = null;
  var _userId      = null;
  var _initialized = false;

  /* ── Firebase DB 인스턴스 반환 ──────────────────────────────
     firebase SDK가 초기화되지 않은 환경(앱 로드 전 등)에서는 null 반환.
     에러가 나도 앱 전체에 영향 없도록 try-catch로 감싸서 반환.
  ─────────────────────────────────────────────────────────── */
  function getDb() {
    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        return firebase.database();
      }
    } catch (e) {}
    return null;
  }

  /* ── 현재 로그인 유저 ID 가져오기 ───────────────────────────
     우선순위: window.currentUser → localStorage ghostUser
     로그인 정보 없으면 빈 문자열 반환.
  ─────────────────────────────────────────────────────────── */
  function getMyUserId() {
    try {
      if (window.currentUser && window.currentUser.user_id) return String(window.currentUser.user_id);
      var raw = localStorage.getItem('ghostUser');
      if (raw) {
        var u = JSON.parse(raw);
        if (u && u.user_id) return String(u.user_id);
      }
    } catch (e) {}
    return '';
  }

  /* ── 현재 로그인 닉네임 가져오기 ────────────────────────────
     DB 저장 시 수신자 식별용으로만 사용.
     nickname 없으면 username으로 대체.
  ─────────────────────────────────────────────────────────── */
  function getMyNickname() {
    try {
      if (window.currentUser && window.currentUser.nickname) return String(window.currentUser.nickname);
      var raw = localStorage.getItem('ghostUser');
      if (raw) {
        var u = JSON.parse(raw);
        if (u && u.nickname) return String(u.nickname);
        if (u && u.username) return String(u.username);
      }
    } catch (e) {}
    return '';
  }

  /* ── 내가 방문한 방 ID 목록 반환 ────────────────────────────
     'global' 은 항상 포함 (전체 대화방 기본 구독).
     ghostRoomVisited_v1 에 저장된 방 목록을 추가로 병합.
     Apps Script에서 이 목록 기준으로 알림 대상 여부를 판단함.
  ─────────────────────────────────────────────────────────── */
  function getVisitedRoomIds() {
    var ids = ['global']; // 전체 대화방은 항상 구독
    try {
      var raw = localStorage.getItem(LS_VISITED);
      if (raw) {
        var map = JSON.parse(raw) || {};
        Object.keys(map).forEach(function (rid) {
          if (ids.indexOf(rid) < 0) ids.push(rid);
        });
      }
    } catch (e) {}
    return ids;
  }

  /* ── Firebase Messaging SDK로 FCM 토큰 발급 ─────────────────
     반환값: Promise<string> (토큰 문자열)
     성공 시 _token 갱신 + localStorage 캐시 저장.
     실패 케이스:
       - serviceWorker/PushManager 미지원 브라우저
       - VAPID 키 미설정
       - 알림 권한 없음 (rejected by 브라우저)
  ─────────────────────────────────────────────────────────── */
  function requestToken() {
    return new Promise(function (resolve, reject) {
      // 브라우저 지원 여부 체크
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return reject(new Error('Push 미지원 환경'));
      }
      if (!VAPID_KEY) {
        return reject(new Error('VAPID 키 미설정'));
      }

      // Service Worker가 준비된 뒤 토큰 요청
      navigator.serviceWorker.ready.then(function (reg) {
        try {
          var messaging = firebase.messaging();
          messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
            .then(function (token) {
              if (token) {
                _token = token;
                localStorage.setItem(LS_FCM_TOKEN, token); // 캐시 저장 (다음 앱 실행 시 재사용)
                resolve(token);
              } else {
                reject(new Error('토큰 없음')); // 알림 권한이 없거나 SDK 오류
              }
            })
            .catch(reject);
        } catch (e) { reject(e); }
      }).catch(reject);
    });
  }

  /* ── 만료 토큰 강제 갱신 ─────────────────────────────────────
     [호출 시점]
       - social-messenger.js 에서 Apps Script 응답의 results 배열에
         status === 404 또는 410 이 있을 때 ghost:fcm-token-stale 이벤트를 dispatch
       - 이 이벤트를 수신하면 아래 refreshToken 이 실행됨

     [처리 과정]
       1) localStorage 캐시(ghostFcmToken_v1) 삭제
       2) 내부 상태(_token, _initialized) 초기화
       3) requestToken()으로 Firebase SDK에서 새 토큰 발급
       4) 새 토큰을 Firebase DB /fcm_tokens/{userId} 에 저장

     주의: 알림 권한(Notification.permission)이 'granted' 상태여야 발급 가능.
           권한이 없으면 갱신 불가 안내만 출력하고 종료.
  ─────────────────────────────────────────────────────────── */
  function refreshToken(userId) {
    console.log('[FCM] 만료 토큰 감지 → 캐시 삭제 후 새 토큰 발급');

    // 1) 기존 캐시 및 상태 초기화
    localStorage.removeItem(LS_FCM_TOKEN);
    _token       = null;
    _initialized = false;

    // 2) 알림 권한 확인
    if (Notification.permission !== 'granted') {
      console.warn('[FCM] 알림 권한 없음 — 토큰 갱신 불가');
      return;
    }

    // 3) 새 토큰 발급 → DB 저장
    requestToken()
      .then(function (token) {
        _initialized = true;
        console.log('[FCM] 새 토큰 발급 완료 → DB 저장');
        saveTokenToDb(token, userId || _userId);
      })
      .catch(function (e) {
        console.warn('[FCM] 새 토큰 발급 실패:', e.message || e);
      });
  }

  /* ── Firebase DB에 토큰 저장 ─────────────────────────────────
     저장 경로: /fcm_tokens/{safe_userId}
     저장 내용:
       token    : FCM 토큰 (Apps Script에서 발송 대상 식별)
       user_id  : 유저 ID (발신자 본인 제외 판단)
       nickname : 닉네임 (디버그/로그용)
       rooms    : 방문한 방 목록 쉼표 구분 (방별 구독 필터링)
       ts       : 저장 시각 타임스탬프 (만료 판단용)

     safe userId: Firebase 키에 허용되지 않는 문자(. # $ [ ])를 _ 로 치환
  ─────────────────────────────────────────────────────────── */
  function saveTokenToDb(token, userId) {
    var db = getDb();
    if (!db || !token || !userId) {
      console.warn('[FCM] saveTokenToDb 스킵 - db:', !!db, 'token:', !!token, 'userId:', userId);
      return;
    }

    var rooms    = getVisitedRoomIds();
    var nickname = getMyNickname();
    // Firebase 키 규칙: . # $ [ ] / 사용 불가 → _ 로 치환
    var safe     = userId.replace(/[.#$\[\]]/g, '_');

    // 알림 모드를 DB에 함께 저장 → Apps Script가 push payload에 포함시켜 SW에 전달
    var notifyMode = "sound";
    try {
      var _m = localStorage.getItem("mypai_notify_mode_v2");
      if (_m === "vibrate" || _m === "mute" || _m === "sound") notifyMode = _m;
    } catch (em) {}

    // 캐릭터 정보: window.CHARACTERS(core.js) 기반 동적 조회
    // → 새 캐릭터 추가 시 이 코드 수정 불필요
    var charName = "미나";
    var charIcon = "images/emotions/기본대기1.png";
    try {
      var _ck = localStorage.getItem("ghostCurrentCharacter") || "mina";
      if (window.CHARACTERS && window.CHARACTERS[_ck]) {
        // core.js의 CHARACTERS 직접 참조 (가장 정확)
        var _ch = window.CHARACTERS[_ck];
        charName = _ch.name || charName;
        if (_ch.basePath) charIcon = _ch.basePath + "기본대기1.png";
      } else {
        // core.js 로드 전이거나 CHARACTERS 없는 경우 → 직접 접근 시도
        if (window.currentCharacterName) charName = String(window.currentCharacterName);
        // basePath fallback: mina→emotions/, 그 외→emotions_<key>/
        var _bp = (_ck === "mina") ? "images/emotions/" : ("images/emotions_" + _ck + "/");
        charIcon = _bp + "기본대기1.png";
      }
    } catch (_ce) {}

    var payload = {
      token:       token,
      user_id:     userId,           // 발신자 본인 제외 판단용
      nickname:    nickname || userId,
      rooms:       rooms.join(','),  // 방 구독 목록 (쉼표 구분 문자열)
      notify_mode: notifyMode,       // 알림 모드 (sound/vibrate/mute) — SW 진동/무음 제어용
      char_name:   charName,         // SW 백그라운드 알림 title용 (캐릭터 이름)
      char_icon:   charIcon,         // SW 백그라운드 알림 icon용 (캐릭터 얼굴)
      ts:          Date.now()        // 마지막 갱신 시각
    };

    console.log('[FCM] 토큰 저장 시도 → fcm_tokens/' + safe, payload);
    db.ref(DB_TOKENS + '/' + safe).set(payload)
      .then(function () { console.log('[FCM] 토큰 저장 완료'); })
      .catch(function (e) { console.warn('[FCM] 토큰 저장 실패:', e.message || e, e.code); });
  }

  /* ── FCM 초기화 진입점 ───────────────────────────────────────
     [호출 시점]
       - ghost:login-complete 이벤트 수신 시 (로그인 완료 후 자동)
       - 외부에서 window.FcmPush.init(userId) 수동 호출 시

     [처리 흐름]
       1) userId 없으면 localStorage에서 복원 시도
       2) 유저가 바뀌면(재로그인) 상태 초기화
       3) 이미 토큰 발급 완료 상태면 DB 갱신만 하고 종료
       4) 캐시 토큰 있으면:
            - 우선 캐시 토큰으로 DB 갱신 (빠른 갱신)
            - 백그라운드에서 최신 토큰 재발급 시도
            - 새 토큰이 캐시와 다르면 교체 저장

          ★ 핵심 버그 수정 포인트:
            이전 코드는 캐시가 있으면 return으로 종료했음.
            → 만료 토큰이 계속 DB에 남아 Apps Script에서 매번 404 발생.
            수정 후: 캐시 토큰 저장 후에도 requestToken()으로 최신 토큰 확인.

       5) 캐시 없으면: 알림 권한 확인 → 권한 있으면 즉시 발급
                                    → 권한 없으면 사용자 첫 클릭/터치 대기 후 발급
  ─────────────────────────────────────────────────────────── */
  function init(userId) {
    var newUserId = userId || getMyUserId();
    if (!newUserId) return; // 비로그인 상태면 아무것도 안 함

    // 재로그인(userId 변경) 감지 → 상태 리셋
    if (_userId && newUserId !== _userId) {
      _initialized = false;
      _token       = null;
    }
    _userId = newUserId;

    // 이미 초기화 완료 상태: DB 갱신만 (중복 requestToken 방지)
    if (_initialized && _token) {
      saveTokenToDb(_token, _userId);
      return;
    }

    // 캐시 토큰 존재 여부 확인
    var cached = localStorage.getItem(LS_FCM_TOKEN);
    if (cached) {
      // 캐시 토큰으로 즉시 DB 갱신 (네트워크 레이턴시 없이 빠르게)
      _token       = cached;
      _initialized = true;
      saveTokenToDb(cached, _userId);

      /* ── [핵심 수정] 백그라운드 토큰 갱신 ──────────────────
         캐시 토큰이 만료됐을 수 있으므로 Firebase SDK에서 최신 토큰 재확인.
         새 토큰이 발급되면(캐시와 다르면) 캐시와 DB를 모두 교체.

         이전 코드: 이 블록 없이 바로 return → 만료 토큰 무한 재사용
         수정 후: return 전에 requestToken()으로 최신 상태 확인
      ─────────────────────────────────────────────────────── */
      if (Notification.permission === 'granted') {
        requestToken()
          .then(function (newToken) {
            if (newToken && newToken !== cached) {
              // 토큰이 바뀐 경우에만 DB 업데이트 (불필요한 write 방지)
              console.log('[FCM] 토큰 갱신 감지 → DB 업데이트');
              saveTokenToDb(newToken, _userId);
            }
          })
          .catch(function (e) {
            // 갱신 실패해도 기존 캐시 토큰으로 계속 동작 (무중단)
            console.warn('[FCM] 백그라운드 토큰 갱신 실패:', e.message || e);
          });
      }
      return; // 캐시 토큰 처리 완료 → 이하 권한 요청 로직 생략
    }

    // 캐시 없음: 브라우저 알림 API 지원 여부 체크
    if (!('Notification' in window)) {
      console.warn('[FCM] Notification API 미지원');
      return;
    }
    if (Notification.permission === 'denied') {
      console.warn('[FCM] 알림 권한 차단됨 (브라우저 설정에서 허용 필요)');
      return;
    }

    console.log('[FCM] 알림 권한 상태:', Notification.permission, '| userId:', _userId);

    if (Notification.permission === 'granted') {
      // 권한 이미 있음 → 즉시 토큰 발급
      requestToken()
        .then(function (token) {
          _initialized = true;
          saveTokenToDb(token, _userId);
        })
        .catch(function (e) { console.warn('[FCM] 토큰 발급 실패:', e.message || e); });

    } else {
      /* ── 권한 미결정 상태 (default) ─────────────────────────
         브라우저 정책: 사용자 제스처(클릭/터치) 없이 권한 팝업 금지.
         → 첫 클릭/터치 이벤트 발생 시 권한 요청 → 허용되면 토큰 발급.
         ghost:fcm-request-permission 이벤트로도 수동 트리거 가능.
      ─────────────────────────────────────────────────────── */
      function _askPermission() {
        // 한 번만 실행되도록 이벤트 즉시 제거
        document.removeEventListener('click', _askPermission);
        document.removeEventListener('touchstart', _askPermission);

        Notification.requestPermission().then(function (perm) {
          if (perm === 'granted') {
            requestToken()
              .then(function (token) {
                _initialized = true;
                saveTokenToDb(token, _userId);
              })
              .catch(function (e) { console.warn('[FCM] 토큰 발급 실패:', e.message || e); });
          }
        });
      }

      // 첫 제스처 대기 (passive: 스크롤 성능 영향 없음)
      document.addEventListener('click',      _askPermission, { once: true, passive: true });
      document.addEventListener('touchstart', _askPermission, { once: true, passive: true });

      // 외부에서 ghost:fcm-request-permission 이벤트로도 권한 요청 가능 (하위 호환)
      window.addEventListener('ghost:fcm-request-permission', function handler() {
        window.removeEventListener('ghost:fcm-request-permission', handler);
        _askPermission();
      });
    }
  }

  /* ── 방 방문 목록 변경 시 DB의 rooms 필드 갱신 ──────────────
     새 방에 입장하면 ghost:visited-rooms-updated 이벤트가 발생.
     토큰은 그대로이지만 rooms 목록이 바뀌므로 DB를 다시 저장.
  ─────────────────────────────────────────────────────────── */
  window.addEventListener('ghost:visited-rooms-updated', function () {
    if (_token && _userId) saveTokenToDb(_token, _userId);
  });

  /* ── 캐릭터 변경 시 DB의 char_name/char_icon 갱신 ───────────
     캐릭터가 바뀌면 localStorage의 ghostCurrentCharacter가 업데이트되고
     ghost:character-changed 이벤트가 발생함. (core.js의 setCurrentCharacter 참조)
     토큰은 그대로이지만 char_name/char_icon이 바뀌므로 DB 재저장.
  ─────────────────────────────────────────────────────────── */
  window.addEventListener('ghost:character-changed', function () {
    if (_token && _userId) saveTokenToDb(_token, _userId);
  });

  /* ── 만료 토큰 감지 이벤트 수신 ─────────────────────────────
     social-messenger.js 에서 Apps Script 응답의 results 배열에
     status === 404 또는 410 이 있을 때 아래 이벤트를 dispatch:
       window.dispatchEvent(new CustomEvent('ghost:fcm-token-stale'));

     이 이벤트를 받으면 refreshToken()으로 강제 갱신 실행.
     (발신자 기기의 토큰도 오래됐을 가능성이 있으므로 함께 갱신)
  ─────────────────────────────────────────────────────────── */
  window.addEventListener('ghost:fcm-token-stale', function () {
    if (_userId) refreshToken(_userId);
  });

  /* ── 로그인 완료 시 자동 초기화 ─────────────────────────────
     ghost:login-complete 이벤트: login.js 에서 로그인 성공 후 dispatch.
     1초 딜레이: Firebase SDK 초기화 완료 대기.
  ─────────────────────────────────────────────────────────── */
  window.addEventListener('ghost:login-complete', function (ev) {
    try {
      var uid = ev.detail && ev.detail.user_id ? ev.detail.user_id : getMyUserId();
      setTimeout(function () { init(uid); }, 1000);
    } catch (e) {}
  });

  /* ── 외부 API 노출 (window.FcmPush) ─────────────────────────
     init(userId)     : 수동 초기화 (로그인 직후 또는 앱 시작 시 호출)
     getToken()       : 현재 토큰 반환 (디버그/확인용)
     refreshToken(id) : 강제 토큰 갱신 (만료 감지 시 외부 호출 가능)
     refreshRooms()   : 방 목록만 갱신 (토큰 변경 없이 rooms 필드 업데이트)
  ─────────────────────────────────────────────────────────── */
  window.FcmPush = {
    init: init,
    getToken: function () { return _token; },
    refreshToken: refreshToken,
    refreshRooms: function () {
      if (_token && _userId) saveTokenToDb(_token, _userId);
    }
  };

})();
