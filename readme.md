# MyPai 광고바 + 특정 채팅방 딥링크 (Google Drive)

이 레포는 **기본화면(캐릭터 화면)** 과 **실시간 톡 화면**에 광고바를 표시하도록 확장되었습니다.  
광고 이미지는 **Google Drive 공개 폴더(WebGhost_Advertisement_Uploads)** 에 올려두면 랜덤으로 표시됩니다.

---

## 적용 파일

### 1) 웹(프론트)
- `js/mypai-adbar-gdrive.js`  ✅ 독립 모듈(삭제/수정 쉬움)
- `index.html`  
  - `<script src="js/mypai-adbar-gdrive.js"></script>` 추가
- `games/social-messenger.html`  
  - `<script src="../js/mypai-adbar-gdrive.js"></script>` 추가
- `js/social-messenger.js`  
  - `?room=ROOM_ID` 파라미터로 특정 방 자동 입장 지원

### 2) Apps Script(서버)
- 기존 Apps Script WebApp에서 `mode=ad_list_images` 가 동작해야 합니다.
- exec URL: `https://script.google.com/macros/s/AKfycbz6PjWqKuoTmTalX7ieq3NuhJr-6DPwFQI3c7sDCu9cSCFDt90DP4Ju0yIjfjOgyNoI6w/exec`
- 광고 폴더 ID: `1__kQpi9LkghrcZMB7qLVdhGnyFnps3z_`

---

## 광고바 동작 요약

### 위치/크기
- 높이: **50px**
- 기본화면(index.html): 화면 최상단 fixed(겹침)
- 실시간톡(social-messenger.html): `.messenger-topbar` 바로 아래 삽입

### 광고가 없으면
- Drive 폴더에 파일이 없으면 광고바는 DOM에서 제거되어 **없는 것처럼** 동작합니다.

### 닫기(X)
- 우측 상단 `x` 클릭 시 현재 화면에서만 숨김
- ✅ 저장하지 않음 → 새로고침/재접속하면 다시 표시

### 기본화면 UI 내려가기/복원
- 광고가 실제로 표시되고 **보이는 상태**일 때만
  - `#clockWidget`
  - `#questStatusBar`
  를 50px 아래로 이동
- 광고 없거나/닫기/iframe 이동으로 광고가 숨겨지면 원위치

### 기본화면 클릭/채팅 방해 방지
- 광고바 컨테이너는 `pointer-events: none`
- 이미지와 X만 `pointer-events: auto`  
  → 기본화면 입력/클릭/채팅을 막지 않도록 설계

---

## 광고 클릭 링크 규칙 (파일명 link=)

Windows 파일명 제한 때문에 `: / ?` 등을 직접 넣기 어려워 토큰 치환을 지원합니다.

### 토큰 규칙
- `__` → `/`
- `__q__` → `?`
- `__a__` → `&`
- `__eq__` → `=`

### 예시(특정 채팅방으로 이동)
파일명:
`놀이는여기에서_link=langret100.github.io__games__social-messenger.html__q__room__eq__r_9e0b92b2f868.png`

해석되는 링크:
`https://langret100.github.io/games/social-messenger.html?room=r_9e0b92b2f868`

### 앱 내부로 열기
링크가 같은 도메인의 `/games/social-messenger.html` 이면
- 새 탭이 아니라 **앱 내부 iframe(#gameFrame)** 로 열립니다.
- 가능하면 `window.launchMessenger()`를 호출해 기존과 동일한 방식으로 오버레이를 엽니다.

---

## 특정 방 딥링크 (?room=ROOM_ID)
`games/social-messenger.html?room=ROOM_ID` 로 열면 해당 방으로 자동 진입합니다.

- ROOM_ID는 “방 이름”이 아니라 DB의 **고유 키**입니다.
- 예: `r_9e0b92b2f868`

---

## 삭제 방법
- `index.html` / `games/social-messenger.html` 에서
  `mypai-adbar-gdrive.js` script include 라인을 제거하면 끝입니다.
