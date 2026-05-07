/* ============================================================
   [profile-manager.js] 유저 프로필 관리
   ------------------------------------------------------------
   프로필 이미지
   - 업로드: 120×120px JPEG(q0.82)로 압축 후 base64를
             Firebase /profiles/{nickname}/imgBase64 에 직접 저장
             (Drive CORS 문제 없음 / Apps Script 불필요)
   - 불러오기: Firebase에서 imgBase64 직접 읽기 → localStorage 캐시(1시간)
   - 구버전 호환: imgBase64 없으면 imgUrl(Drive URL)로 폴백
   배경 이미지: 로컬 기기에만 저장
   기어(⚙) 버튼: topbar 우측
   ============================================================ */

(function () {
  if (window.ProfileManager) return;

  var LS_PROFILES = "ghostProfiles_v3";
  var LS_MY_BG    = "ghostMyBg_v1";
  var FB_PROFILES = "profiles";

  var DEFAULT_AVATAR = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
    '<circle cx="20" cy="20" r="20" fill="#c7d2fe"/>' +
    '<circle cx="20" cy="15" r="7" fill="#818cf8"/>' +
    '<ellipse cx="20" cy="34" rx="12" ry="9" fill="#818cf8"/></svg>'
  );

  function loadProfiles() {
    try { return JSON.parse(localStorage.getItem(LS_PROFILES) || "{}"); } catch (e) { return {}; }
  }
  function saveProfiles(map) {
    try { localStorage.setItem(LS_PROFILES, JSON.stringify(map || {})); } catch (e) {}
  }

  function fbProfileRef(nickname) {
    try {
      if (typeof firebase === "undefined") return null;
      var db = firebase.database();
      var safe = String(nickname || "").replace(/[.#$\[\]\/]/g, "_");
      return db.ref(FB_PROFILES + "/" + safe);
    } catch (e) { return null; }
  }

  function getAvatarUrl(nickname) {
    if (!nickname) return DEFAULT_AVATAR;
    var p = loadProfiles()[nickname];
    return (p && (p.imgLocal || p.imgUrl)) ? (p.imgLocal || p.imgUrl) : DEFAULT_AVATAR;
  }

  // 캐시 유효기간: 24시간 (변경 감지 시엔 즉시 갱신)
  var CACHE_TTL = 24 * 60 * 60 * 1000;

  function fetchAndCacheProfile(nickname) {
    if (!nickname) return;
    var profs  = loadProfiles();
    var cached = profs[nickname];

    // ── 로컬 캐시가 있으면 일단 즉시 DOM에 표시 (화면 빠르게) ──
    if (cached && cached.imgLocal) {
      applyProfileToDOM(nickname, cached.imgLocal);
    }

    // ── 24시간 이내면 Firebase 조회 자체를 건너뜀 (서버 요청 없음) ──
    if (cached && cached.imgLocal &&
        (Date.now() - (cached.ts || 0)) < CACHE_TTL) return;

    var ref = fbProfileRef(nickname);
    if (!ref) return;

    // ── ts 필드만 먼저 확인 → 변경 없으면 base64 재다운로드 안 함 ──
    ref.child("ts").once("value").then(function (tsSnap) {
      var remotTs = Number(tsSnap.val() || 0);
      var localTs = Number((cached && cached.profileTs) || 0);

      if (remotTs && localTs && remotTs === localTs && cached.imgLocal) {
        // 서버 ts 와 로컬 ts 동일 → 변경 없음, 로컬 캐시 유효기간만 갱신
        var cc = loadProfiles();
        if (cc[nickname]) { cc[nickname].ts = Date.now(); saveProfiles(cc); }
        return;
      }

      // ts 다르거나 캐시 없음 → base64 풀 다운로드
      ref.once("value").then(function (snap) {
        var val = snap.val();
        if (!val) return;

        var imgData = val.imgBase64 || val.imgUrl || "";
        if (!imgData) return;

        var cc = loadProfiles();
        if (!cc[nickname]) cc[nickname] = {};
        cc[nickname].imgLocal   = imgData;
        cc[nickname].imgUrl     = val.imgUrl || "";
        // statusMsg는 별도 fetchStatusMsg로만 가져옴 (클릭 시에만)
        cc[nickname].profileTs  = Number(val.ts || 0);
        cc[nickname].ts         = Date.now();
        saveProfiles(cc);

        applyProfileToDOM(nickname, imgData);
      }).catch(function () {});
    }).catch(function () {
      ref.once("value").then(function (snap) {
        var val = snap.val();
        if (!val) return;
        var imgData = val.imgBase64 || val.imgUrl || "";
        if (!imgData) return;
        var cc = loadProfiles();
        if (!cc[nickname]) cc[nickname] = {};
        cc[nickname].imgLocal  = imgData;
        cc[nickname].profileTs = Number(val.ts || 0);
        cc[nickname].ts        = Date.now();
        saveProfiles(cc);
        applyProfileToDOM(nickname, imgData);
      }).catch(function () {});
    });
  }

  // DOM의 data-profile-nick 요소 + gear 버튼 일괄 갱신
  function applyProfileToDOM(nickname, imgData) {
    if (!nickname || !imgData) return;
    document.querySelectorAll('[data-profile-nick="' + nickname + '"]').forEach(function (el) {
      el.src = imgData;
    });
    var myNick = safeMyNickname();
    if (myNick && myNick === nickname) {
      var gearImg = document.getElementById("profileGearImg");
      if (gearImg) gearImg.src = imgData;
    }
  }

  /* ── 프로필 이미지 저장: Firebase에 base64 직접 저장 (CORS 문제 없음) ──
     - 모달에서 선택된 이미지는 이미 120×120px canvas로 압축된 dataUrl
     - Drive 업로드 없이 Firebase /profiles/{nickname}/imgBase64 에 직접 저장
     - 다른 유저가 fetchAndCacheProfile() 호출 시 Firebase에서 바로 읽어감
     - 용량: 120×120 JPEG q0.82 ≈ 8~15KB → Firebase 무료 플랜(1GB) 여유 충분
  ── */
  function uploadProfileImage(nickname, dataUrl) {
    return new Promise(function (resolve, reject) {
      if (!nickname || !dataUrl) return reject(new Error("no data"));

      try {
        if (typeof firebase === "undefined") throw new Error("Firebase not loaded");
        var db = firebase.database();
        var safe = String(nickname).replace(/[.#$\[\]\/]/g, "_");

        // 120×120 재압축 보장 (모달에서 이미 했지만 혹시 모를 경우 대비)
        var finalDataUrl = dataUrl;
        try {
          var img = new Image();
          img.src = dataUrl;
          // 이미 canvas로 압축된 dataUrl이면 그대로 사용 (img.width 확인 불필요)
        } catch (eImg) {}

        var statusMsg = window.__pendingStatusMsg !== undefined
          ? String(window.__pendingStatusMsg || "")
          : "";
        var payload = {
          imgBase64: finalDataUrl,
          nickname:  nickname,
          statusMsg: statusMsg,
          ts:        Date.now(),
          lastSeen:  Date.now()
        };

        db.ref("profiles/" + safe).set(payload)
          .then(function () {
            // 로컬 캐시 저장 (profileTs = 서버 저장 시각, ts = 로컬 캐시 시각)
            var savedTs = payload.ts;
            var profs = loadProfiles();
            if (!profs[nickname]) profs[nickname] = {};
            profs[nickname].imgLocal  = finalDataUrl;
            profs[nickname].statusMsg = payload.statusMsg || "";
            profs[nickname].profileTs = savedTs; // 서버 ts 와 동기화
            profs[nickname].ts        = Date.now();
            saveProfiles(profs);
            applyProfileToDOM(nickname, finalDataUrl);
            resolve(finalDataUrl);
          })
          .catch(reject);

      } catch (e) {
        reject(e);
      }
    });
  }

  function getMyBg(nickname) {
    try {
      var obj = JSON.parse(localStorage.getItem(LS_MY_BG) || "{}");
      return (nickname && obj[nickname]) ? obj[nickname] : null;
    } catch (e) { return null; }
  }
  function setMyBg(nickname, dataUrl) {
    try {
      var obj = {};
      try { obj = JSON.parse(localStorage.getItem(LS_MY_BG) || "{}"); } catch (e) {}
      if (dataUrl) obj[nickname] = dataUrl; else delete obj[nickname];
      localStorage.setItem(LS_MY_BG, JSON.stringify(obj));
    } catch (e) {}
  }

  function applyBackground(nickname) {
    try {
      var target = document.getElementById("messengerBody") ||
                   document.querySelector(".messenger-body");
      if (!target) return;
      var old = target.querySelector(".bg-overlay-layer");
      if (old) old.remove();
      var bg = getMyBg(nickname);
      if (bg) {
        target.style.backgroundImage    = "url(" + bg + ")";
        target.style.backgroundSize     = "cover";
        target.style.backgroundPosition = "center";
        target.style.position           = "relative";
        var layer = document.createElement("div");
        layer.className = "bg-overlay-layer";
        layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:0;background:rgba(244,246,251,0.72);";
        target.insertBefore(layer, target.firstChild);
      } else {
        target.style.backgroundImage = "";
        target.style.backgroundSize  = "";
      }
    } catch (e) {}
  }

  function refreshAllAvatars() {
    try {
      document.querySelectorAll("[data-profile-nick]").forEach(function (el) {
        el.src = getAvatarUrl(el.getAttribute("data-profile-nick"));
      });
    } catch (e) {}
  }

  function safeMyNickname() {
    try {
      if (window.currentUser && window.currentUser.nickname) return String(window.currentUser.nickname);
      var raw = localStorage.getItem("ghostUser");
      if (raw) { var u = JSON.parse(raw); if (u && u.nickname) return String(u.nickname); }
    } catch (e) {}
    return "";
  }

  /* ── 프로필 설정 모달 ── */
  function openProfileModal() {
    var me = safeMyNickname();
    if (!me) { alert("먼저 로그인해 주세요."); return; }

    var existing = document.getElementById("profileModal");
    if (existing) { existing.style.display = "flex"; return; }

    var overlay = document.createElement("div");
    overlay.id = "profileModal";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.55);";

    var box = document.createElement("div");
    box.style.cssText = "width:min(360px,94vw);background:#fff;border-radius:20px;padding:22px 18px 18px;box-shadow:0 20px 50px rgba(15,23,42,.25);display:flex;flex-direction:column;gap:14px;";
    box.innerHTML = [
      "<div style='display:flex;align-items:center;justify-content:space-between;'>",
      "<span style='font-size:15px;font-weight:800;color:#111827;'>프로필 설정</span>",
      "<button id='pmClose' style='border:0;background:transparent;font-size:20px;cursor:pointer;color:#6b7280;'>✕</button></div>",
      "<div style='display:flex;flex-direction:column;align-items:center;gap:10px;'>",
      "<img id='pmPreview' src='" + getAvatarUrl(me) + "' style='width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid #c7d2fe;background:#e0e7ff;'>",
      "<div style='text-align:center;'>",
      "<div style='font-size:14px;font-weight:800;color:#111827;'>" + me + "</div>",
      "<div style='font-size:11px;color:#6b7280;margin-top:2px;'>아이디: " + ((window.currentUser && window.currentUser.user_id) ? String(window.currentUser.user_id) : (function(){ try{ var u=JSON.parse(localStorage.getItem('ghostUser')||'{}'); return u.user_id||'-'; }catch(e){return '-';} })()) + "</div>",
      "<div id='pmCoinDisplay' style='display:inline-flex;align-items:center;gap:5px;margin-top:5px;padding:3px 10px;background:#fef9ee;border:1px solid #f0d070;border-radius:20px;font-size:12px;font-weight:700;color:#b07800;'>🪙 <span id='pmCoinText'>불러오는 중...</span></div>",
      "</div>",
      "<button id='pmImgBtn' type='button' style='border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:10px;padding:6px 14px;font-size:13px;cursor:pointer;'>프로필 이미지 변경</button>",
      "<input id='pmImgInput' type='file' accept='image/*' style='display:none'></div>",
      "<div style='display:flex;flex-direction:column;gap:6px;'>",
      "<span style='font-size:13px;font-weight:700;color:#374151;'>상태메시지</span>",
      "<textarea id='pmStatusInput' maxlength='100' placeholder='상태메시지를 입력하세요 (100자 이내)' style='width:100%;height:64px;border:1px solid #d1d5db;border-radius:10px;padding:8px 10px;font-size:13px;resize:none;box-sizing:border-box;font-family:inherit;color:#374151;'>" + (getStatusMsg(me) || "") + "</textarea></div>",
      "<div style='display:flex;flex-direction:column;gap:6px;'>",
      "<span style='font-size:13px;font-weight:700;color:#374151;'>채팅 배경</span>",
      "<div style='display:flex;gap:8px;'>",
      "<button id='pmBgBtn' type='button' style='border:1px solid #d1d5db;background:#f9fafb;color:#374151;border-radius:10px;padding:6px 14px;font-size:13px;cursor:pointer;'>배경 선택</button>",
      "<button id='pmBgClear' type='button' style='border:1px solid #fca5a5;background:#fff1f2;color:#dc2626;border-radius:10px;padding:6px 10px;font-size:13px;cursor:pointer;'>초기화</button></div>",
      "<div id='pmBgPreview' style='height:50px;border-radius:10px;background:#f3f4f6;border:1px solid #e5e7eb;background-size:cover;background-position:center;'></div>",
      "<input id='pmBgInput' type='file' accept='image/*' style='display:none'></div>",
      "<button id='pmSave' type='button' style='border:0;background:#2563eb;color:#fff;border-radius:12px;height:40px;font-size:14px;font-weight:800;cursor:pointer;'>저장</button>",
      "<div id='pmStatus' style='font-size:12px;color:#6b7280;text-align:center;min-height:16px;'></div>",
      /* 알림 통합 버튼 (앱 내 소리 + FCM 푸시 알림 한번에) */
      "<button id='pmNotifyBtn' type='button' style='width:100%;border:1px solid #f59e0b;background:#fffbeb;color:#b45309;border-radius:12px;height:38px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:6px;'>🔔 알림 허용</button>",
      /* 하단 버튼 행: 웹앱 추가 + 로그아웃 */
      "<div style='display:flex;gap:8px;'>",
      "  <button id='pwaInstallBtn' type='button' style='flex:1;border:1px solid #16a34a;background:#f0fdf4;color:#16a34a;border-radius:12px;height:38px;font-size:13px;font-weight:700;cursor:pointer;'>📱 바탕화면에 추가</button>",
      "  <button id='pmLogoutBtn' type='button' style='flex:0 0 auto;border:1px solid #fca5a5;background:#fff1f2;color:#dc2626;border-radius:12px;height:38px;padding:0 14px;font-size:13px;font-weight:700;cursor:pointer;'>로그아웃</button>",
      "</div>"
    ].join("");
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var close = function () { overlay.style.display = "none"; };
    document.getElementById("pmClose").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });

    // 모달 열릴 때 서버에서 최신 statusMsg 가져와 반영
    fetchStatusMsg(me, function (msg) {
      var ta = document.getElementById("pmStatusInput");
      if (ta && !ta.dataset.edited) ta.value = msg || "";
    });
    // 사용자가 직접 수정하면 서버값으로 덮어쓰지 않음
    setTimeout(function () {
      var ta = document.getElementById("pmStatusInput");
      if (ta) ta.addEventListener("input", function () { ta.dataset.edited = "1"; });
    }, 100);

    // 코인 표시 로드
    (function () {
      var coinEl = document.getElementById("pmCoinText");
      if (!coinEl) return;

      // user_id를 여러 경로로 확인 (safeMyNickname과 동일한 방식)
      var userId = "";
      try {
        if (window.currentUser && window.currentUser.user_id) {
          userId = String(window.currentUser.user_id);
        } else {
          var raw = localStorage.getItem("ghostUser");
          if (raw) {
            var u = JSON.parse(raw);
            if (u && u.user_id) userId = String(u.user_id);
          }
        }
      } catch (e) {}

      if (!userId) { coinEl.textContent = "0"; return; }

      var apiUrl = window.SHEET_WRITE_URL || window.SHEET_IMAGE_UPLOAD_URL || "";
      if (!apiUrl) { coinEl.textContent = "0"; return; }
      var sep = apiUrl.indexOf("?") >= 0 ? "&" : "?";
      fetch(apiUrl + sep + "mode=coin_status&user_id=" + encodeURIComponent(userId) + "&t=" + Date.now())
        .then(function (r) { return r.json(); })
        .then(function (json) {
          if (!json) { coinEl.textContent = "0"; return; }
          // ok 필드 없어도 coin 필드가 있으면 표시
          var coin = Math.max(0, parseInt(json.coin, 10) || 0);
          var limit = parseInt(json.limit, 10) || 100;
          coinEl.textContent = (coin >= limit ? "MAX" : String(coin)) + " / " + limit;
        })
        .catch(function () { coinEl.textContent = "0"; });
    })();

    var pendingImg = null;
    document.getElementById("pmImgBtn").addEventListener("click", function () {
      document.getElementById("pmImgInput").click();
    });
    document.getElementById("pmImgInput").addEventListener("change", function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var c = document.createElement("canvas");
          c.width = 120; c.height = 120;
          var ctx = c.getContext("2d");
          var s = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width-s)/2, (img.height-s)/2, s, s, 0, 0, 120, 120);
          pendingImg = c.toDataURL("image/jpeg", 0.85);
          document.getElementById("pmPreview").src = pendingImg;
        };
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });

    var pendingBg = getMyBg(me) || null;
    var bgPrev = document.getElementById("pmBgPreview");
    if (pendingBg) bgPrev.style.backgroundImage = "url(" + pendingBg + ")";

    document.getElementById("pmBgBtn").addEventListener("click", function () {
      document.getElementById("pmBgInput").click();
    });
    document.getElementById("pmBgInput").addEventListener("change", function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var ratio = Math.min(800/img.width, 600/img.height, 1);
          var c = document.createElement("canvas");
          c.width = Math.round(img.width*ratio); c.height = Math.round(img.height*ratio);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          pendingBg = c.toDataURL("image/jpeg", 0.78);
          bgPrev.style.backgroundImage = "url(" + pendingBg + ")";
        };
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
    document.getElementById("pmBgClear").addEventListener("click", function () {
      pendingBg = null; bgPrev.style.backgroundImage = "";
    });

    document.getElementById("pmSave").addEventListener("click", function () {
      var st = document.getElementById("pmStatus");
      var statusInputEl = document.getElementById("pmStatusInput");
      var newStatusMsg = statusInputEl ? statusInputEl.value.slice(0, 100) : "";
      st.textContent = "저장 중...";
      setMyBg(me, pendingBg);
      applyBackground(me);
      // 상태메시지 저장 (이미지 변경 여부 무관)
      window.__pendingStatusMsg = newStatusMsg;
      if (pendingImg) {
        uploadProfileImage(me, pendingImg)
          .then(function () {
            // 이미지 저장 시 statusMsg도 함께 저장됨(payload에 포함)
            window.__pendingStatusMsg = undefined;
            st.textContent = "✅ 저장 완료!"; refreshAllAvatars(); refreshGearButton(me); setTimeout(close, 900);
          })
          .catch(function (err) {
            window.__pendingStatusMsg = undefined;
            st.textContent = "⚠️ 업로드 실패: " + (err && err.message || "오류"); refreshAllAvatars();
          });
      } else {
        // 이미지 변경 없이 상태메시지만 저장
        saveStatusMsg(me, newStatusMsg)
          .then(function () {
            window.__pendingStatusMsg = undefined;
            st.textContent = "✅ 저장 완료!"; setTimeout(close, 700);
          })
          .catch(function () {
            window.__pendingStatusMsg = undefined;
            st.textContent = "✅ 저장 완료!"; setTimeout(close, 700);
          });
      }
    });

    /* PWA 설치 버튼 ─ 모달 열릴 때 실시간 상태 반영 */
    var pwaBtn = document.getElementById("pwaInstallBtn");
    if (pwaBtn) {
      // 현재 상태 즉시 반영하는 함수
      function refreshPwaBtn() {
        var isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
                           window.navigator.standalone === true;
        if (isStandalone) {
          pwaBtn.textContent = "✅ 이미 설치됨";
          pwaBtn.disabled = true;
          pwaBtn.style.opacity = "0.6";
          pwaBtn.style.cursor = "default";
          return;
        }
        // beforeinstallprompt 이미 캐치됨 → 바로 설치 가능
        if (window.PwaManager && window.PwaManager.canInstall()) {
          pwaBtn.textContent = "📲 지금 바로 설치";
          pwaBtn.disabled = false;
          pwaBtn.style.opacity = "1";
          pwaBtn.style.background = "#16a34a";
          pwaBtn.style.color = "#fff";
          pwaBtn.style.border = "1px solid #15803d";
          return;
        }
        // iOS
        if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
          pwaBtn.textContent = "📱 홈화면 추가 방법";
          pwaBtn.disabled = false;
          pwaBtn.style.opacity = "1";
          return;
        }
        // HTTPS + SW 조건 갖춰진 경우 → Chrome 주소창 안내
        var isHttps = location.protocol === "https:";
        if (isHttps) {
          pwaBtn.textContent = "📱 바탕화면에 추가";
        } else {
          pwaBtn.textContent = "⚠️ HTTPS에서만 설치 가능";
          pwaBtn.disabled = true;
          pwaBtn.style.opacity = "0.5";
          return;
        }
        pwaBtn.disabled = false;
        pwaBtn.style.opacity = "1";
      }

      refreshPwaBtn();

      // beforeinstallprompt가 나중에 발화할 경우 버튼 갱신
      window.addEventListener("beforeinstallprompt", function () {
        refreshPwaBtn();
      });

      pwaBtn.addEventListener("click", function () {
        if (!window.PwaManager) return;
        window.PwaManager.install().then(function (result) {
          if (result === "accepted") {
            pwaBtn.textContent = "✅ 설치 완료!";
            pwaBtn.disabled = true;
            pwaBtn.style.opacity = "0.6";
          } else if (result === "dismissed") {
            refreshPwaBtn(); // 거절 시 원래 상태로
          }
          // ios_guide / guide_shown 은 PwaManager 내부 팝업이 뜸
        });
      });
    }

    /* 알림 통합 버튼 — localStorage 직접 제어 (NotifySetting은 iframe 안이라 접근 불가) */
    var notifyBtn = document.getElementById("pmNotifyBtn");
    if (notifyBtn) {
      var NOTIFY_KEY = "mypai_notify_enabled";

      function isNotifyOn() {
        try { return localStorage.getItem(NOTIFY_KEY) !== "0"; } catch(e) { return true; }
      }
      function setNotifyOn(v) {
        try { localStorage.setItem(NOTIFY_KEY, v ? "1" : "0"); } catch(e) {}
      }

      function refreshNotifyBtn() {
        if (!("Notification" in window)) {
          notifyBtn.textContent = "🔕 알림 미지원 브라우저";
          notifyBtn.disabled = true; notifyBtn.style.opacity = "0.5"; return;
        }
        var perm = Notification.permission;
        var on = isNotifyOn();
        notifyBtn.disabled = false; notifyBtn.style.opacity = "1";

        if (perm === "denied") {
          notifyBtn.textContent = "🔕 알림 차단됨 — 브라우저 설정에서 허용";
          notifyBtn.disabled = true; notifyBtn.style.opacity = "0.6";
        } else if (perm === "granted" && on) {
          notifyBtn.textContent = "🔔 알림 켜짐 (탭하면 끄기)";
          notifyBtn.style.background = "#f0fdf4";
          notifyBtn.style.borderColor = "#16a34a";
          notifyBtn.style.color = "#16a34a";
        } else if (perm === "granted" && !on) {
          notifyBtn.textContent = "🔕 알림 꺼짐 (탭하면 켜기)";
          notifyBtn.style.background = "#f1f5f9";
          notifyBtn.style.borderColor = "#94a3b8";
          notifyBtn.style.color = "#64748b";
        } else {
          notifyBtn.textContent = "🔔 알림 허용";
          notifyBtn.style.background = "#fffbeb";
          notifyBtn.style.borderColor = "#f59e0b";
          notifyBtn.style.color = "#b45309";
        }
      }
      refreshNotifyBtn();

      notifyBtn.addEventListener("click", function () {
        var perm = ("Notification" in window) ? Notification.permission : "unsupported";

        if (perm === "granted") {
          // 켜짐/꺼짐 토글
          var next = !isNotifyOn();
          setNotifyOn(next);
          if (next && window.FcmPush && typeof window.FcmPush.init === "function") {
            window.FcmPush.init();
          }
          refreshNotifyBtn();
          return;
        }

        if (perm === "default") {
          Notification.requestPermission().then(function (result) {
            if (result === "granted") {
              setNotifyOn(true);
              if (window.FcmPush && typeof window.FcmPush.init === "function") {
                window.FcmPush.init();
              }
            }
            refreshNotifyBtn();
          });
        }
      });
    }

    /* 로그아웃 버튼 */
    var logoutBtn = document.getElementById("pmLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        if (confirm("로그아웃 하시겠어요?")) {
          try {
            // login.js의 logoutGhostUser 사용
            if (typeof window.logoutGhostUser === "function") {
              window.logoutGhostUser();
            } else {
              localStorage.removeItem("ghostUser");
              window.currentUser = null;
              window.__loginConfirmed = false;
            }
          } catch (e) {}
          close();
          // 로그인 패널 열기
          setTimeout(function () {
            if (typeof window.openLoginPanel === "function") window.openLoginPanel();
          }, 200);
        }
      });
    }
  }

  function injectGearButton() {
    var topbar = document.querySelector(".messenger-topbar");
    if (!topbar || document.getElementById("profileGearBtn")) return;
    var btn = document.createElement("button");
    btn.id = "profileGearBtn"; btn.type = "button"; btn.title = "프로필/배경 설정";
    btn.style.cssText = "position:absolute;right:52px;top:50%;transform:translateY(-50%);border:0;background:transparent;padding:0;cursor:pointer;line-height:0;";

    var img = document.createElement("img");
    img.id = "profileGearImg";
    img.style.cssText = "width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.7);background:#e0e7ff;display:block;";
    img.src = DEFAULT_AVATAR;
    img.alt = "내 프로필";
    img.onerror = function () { this.src = DEFAULT_AVATAR; };
    btn.appendChild(img);

    btn.addEventListener("click", function (e) { e.stopPropagation(); openProfileModal(); });
    topbar.appendChild(btn);
  }

  /* 내 프로필 이미지로 버튼 갱신 */
  function refreshGearButton(nickname) {
    var img = document.getElementById("profileGearImg");
    if (!img) return;
    var url = getAvatarUrl(nickname);
    if (url) img.src = url;
  }

  function init() {
    injectGearButton();
    var me = safeMyNickname();
    if (me) { applyBackground(me); refreshGearButton(me); }
    window.addEventListener("ghost:login-complete", function (ev) {
      try {
        var nick = (ev.detail && ev.detail.nickname) ? ev.detail.nickname : safeMyNickname();
        if (!nick) return;
        applyBackground(nick);
        fetchAndCacheProfile(nick);
        injectGearButton();
        setTimeout(function () { refreshGearButton(nick); }, 300);
        // lastSeen 갱신 — 30일 미접속 프로필 정리용
        updateLastSeen(nick);
        // 30일 지난 미접속 프로필 정리 (로그인 시 1회)
        setTimeout(pruneInactiveProfiles, 5000);
      } catch (e) {}
    });
  }



  /* ── 접속 시각 갱신 ── */
  function updateLastSeen(nickname) {
    if (!nickname) return;
    try {
      var db = firebase.database();
      var safe = nickname.replace(/[.#$\[\]]/g, "_");
      db.ref("profiles/" + safe).update({ lastSeen: Date.now() });
    } catch (e) {}
  }

  /* ── 30일 미접속 프로필 삭제 ── */
  function pruneInactiveProfiles() {
    try {
      var db = firebase.database();
      var cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
      db.ref("profiles").once("value").then(function (snap) {
        if (!snap.exists()) return;
        var updates = {};
        snap.forEach(function (child) {
          var v = child.val() || {};
          // lastSeen 없으면 ts(저장 시각) 사용, 그것도 없으면 삭제 안 함
          var lastActive = v.lastSeen || v.ts || null;
          if (lastActive && lastActive < cutoff) {
            updates[child.key] = null;
          }
        });
        if (Object.keys(updates).length > 0) {
          db.ref("profiles").update(updates).catch(function(){});
        }
      }).catch(function(){});
    } catch (e) {}
  }

  function saveStatusMsg(nickname, statusMsg) {
    return new Promise(function (resolve, reject) {
      if (!nickname) return reject(new Error("no nickname"));
      try {
        var db = firebase.database();
        var safe = String(nickname).replace(/[.#$\[\]\/]/g, "_");
        var newTs = Date.now();
        db.ref("profiles/" + safe).update({ statusMsg: String(statusMsg || ""), ts: newTs })
          .then(function () {
            var profs = loadProfiles();
            if (!profs[nickname]) profs[nickname] = {};
            profs[nickname].statusMsg = String(statusMsg || "");
            profs[nickname].profileTs = newTs;
            profs[nickname].ts = Date.now();
            saveProfiles(profs);
            resolve();
          }).catch(reject);
      } catch (e) { reject(e); }
    });
  }

  var STATUS_CACHE_TTL = 60 * 60 * 1000; // 1시간

  // 프로필 클릭 시에만 호출 - statusMsg만 가져옴
  function fetchStatusMsg(nickname, callback) {
    if (!nickname) { callback && callback(""); return; }
    var profs = loadProfiles();
    var cached = profs[nickname];
    // 1시간 이내 캐시 있으면 바로 반환
    if (cached && cached.statusMsgTs &&
        (Date.now() - cached.statusMsgTs) < STATUS_CACHE_TTL) {
      callback && callback(cached.statusMsg || "");
      return;
    }
    var ref = fbProfileRef(nickname);
    if (!ref) { callback && callback(""); return; }
    ref.child("statusMsg").once("value").then(function (snap) {
      var msg = snap.val() || "";
      var cc = loadProfiles();
      if (!cc[nickname]) cc[nickname] = {};
      cc[nickname].statusMsg   = String(msg);
      cc[nickname].statusMsgTs = Date.now();
      saveProfiles(cc);
      callback && callback(String(msg));
    }).catch(function () {
      callback && callback("");
    });
  }

  function getStatusMsg(nickname) {
    if (!nickname) return "";
    var p = loadProfiles()[nickname];
    return (p && p.statusMsg) ? String(p.statusMsg) : "";
  }

  window.ProfileManager = {
    getAvatarUrl:         getAvatarUrl,
    getStatusMsg:         getStatusMsg,
    fetchStatusMsg:       fetchStatusMsg,
    saveStatusMsg:        saveStatusMsg,
    fetchAndCacheProfile: fetchAndCacheProfile,
    refreshAllAvatars:    refreshAllAvatars,
    uploadProfileImage:   uploadProfileImage,
    openProfileModal:     openProfileModal,
    applyBackground:      applyBackground,
    refreshGearButton:    refreshGearButton,
    DEFAULT_AVATAR:       DEFAULT_AVATAR
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 0);
  }
})();
