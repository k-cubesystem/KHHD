# 클로드코드 프리뷰 — 배포 없이 화면을 그림으로 먼저 보기

## 왜 있나

지금까지는 «코드 → 프로덕션 배포 → CEO가 폰으로 확인 → 반려 → 재작업» 으로 돌았다.
2026-08-22 하루에만 프로덕션 배포가 10회를 넘겼고, 그 중 상당수는 배포 뒤에야 알게 된
**눈으로 보면 5초에 잡히는** 문제였다 — 「글씨가 안 보인다」, 「위치가 너무 하단이다」,
「두 버튼이 헷갈린다」.

이 도구는 그 확인을 **배포 앞으로** 당긴다. 감독 세션이 로컬에서 화면을 찍어 CEO에게 이미지로
보내고, 승인된 다음에 배포한다. 그날그날 임시 `app/dev-*-preview/page.tsx` 를 만들었다
지우던 방식(HANDOFF 21차d·21차e 「임시 페이지 삭제」)을 상설 도구로 굳힌 것이다.

## 쓰는 법

```bash
npm run preview:shots          # 서버 없으면 띄우고 → 전부 찍고 → 내린다 (한 방)
npm run preview:serve          # 서버만 띄운다 (브라우저로 눈으로 볼 때)
```

찍은 그림은 `preview-shots/{장면}-{mobile|desktop}.png` 로 떨어진다.
이 폴더는 `.gitignore` 에 있다 — 재촬영 가능한 산출물이라 리포에 넣지 않는다.

### 일부만 찍기

```bash
npm run preview:shots -- journey-complete-unclaimed          # 장면 지정
npm run preview:shots -- journey-empty journey-progress      # 여러 개
npm run preview:shots -- --viewport=mobile                   # 모바일만
npm run preview:shots -- --base=http://localhost:3000        # 다른 주소의 서버로
```

지정 촬영일 때는 기존 그림을 지우지 않는다. 전체 촬영일 때만 폴더를 비우고 새로 찍는다.

### 브라우저로 직접 보기

`npm run preview:serve` 후 `http://localhost:3020/dev-preview` — 등록된 장면이 전부 목록으로 뜬다.

> 🔴 **포트**: 미리보기는 **3020** 을 쓴다(3000·3001 은 다른 세션이 쓴다). 3020 마저 남이 잡고
> 있으면 **남의 서버를 죽이지 않고 3021, 3022… 로 비킨다** — 기동 로그가 실제 주소를 알려준다.

## 장면 추가하기 — 표 한 줄

`lib/domain/dev-preview/scenes.ts` 의 `PREVIEW_SCENES` 에 한 줄 더한다.

```ts
{ id: 'wallpaper-free', label: '배경화면 — 자격 없음', group: '복 배경화면', note: '무료 1장만 열림' },
```

그러면 `app/dev-preview/scene-views.tsx` 가 **컴파일 에러로** 그 id 의 렌더를 요구한다
(표 두 개가 조용히 어긋나지 않게 타입으로 묶어 뒀다). 거기에 컴포넌트 + 목 데이터를 적으면 끝이다.

```tsx
'wallpaper-free': () => <WallpaperGrid status={WALLPAPER_BASE} />,
```

목록 페이지·촬영 스크립트는 따로 손댈 곳이 없다. 촬영 스크립트는 장면 표를
`/dev-preview/manifest` 로 **돌고 있는 앱 자신에게** 물으므로 목록이 두 벌 생기지 않는다.

### 목 데이터를 넣을 수 있게 컴포넌트를 가르는 규율

조회(서버 액션)와 표현을 가른 컴포넌트만 목으로 세울 수 있다. 이 리포의 계보는 이렇다.

| 조회부          | 표현부(목 주입 가능)                |
| --------------- | ----------------------------------- |
| `WallpaperCard` | `WallpaperCardView` `WallpaperGrid` |
| `JourneyCard`   | `JourneyFull`                       |
| —               | `SamhapIntroCard` (값 없음)         |

새 화면을 만들 때 표현부를 따로 두면 미리보기가 공짜로 따라온다.
🔴 표현부를 화면에서 **직접** 쓰지 말 것 — 자격 판정을 건너뛰게 된다. 조회부만 쓴다.

## 프로덕션 안전 가드

`/dev-preview` 세 입구(목록·장면·장면표 API)는 `NODE_ENV === 'production'` 이면 전부
`notFound()` 한다. 실수로 배포돼도 고객 노출은 0이다.

회귀 테스트 두 겹으로 잡는다.

- `lib/domain/dev-preview/__tests__/scenes.test.ts` — 판정 자체(`isPreviewEnabled`)와 장면 표 규칙
- `app/dev-preview/__tests__/guard.test.tsx` — 세 입구가 그 판정을 **실제로 물어보고 닫는지**

> 🔴 가드 테스트에서 `process.env.NODE_ENV` 를 바꿔치기해도 안 먹는다 — Next 변환기가 그 표현을
> 빌드 시점에 문자열로 인라인한다(그래서 실제 프로덕션 빌드에서는 확실히 먹는다). 판정 함수를
> 목으로 세워 배선을 잡는 방식이 그래서 쓰였다.

## 한계 — 이걸로는 못 보는 것

- **폰 실기기 감각**: 실제 터치 반응·스크롤 관성·기기별 폰트 렌더링·노치/홈바 안전영역은 못 본다.
  뷰포트 375×812 는 화면 «크기» 흉내일 뿐이다. 최종 확인은 여전히 CEO 실기기다.
- **실제 결제**: 토스 결제창·카드 승인 흐름은 뜨지 않는다.
- **크론·백그라운드 작업**: 월간 갱신·빌링 갱신 등은 배포 후 감독자 몫이다.
- **AI 실풀이**: 장면은 목 데이터라 실제 Gemini 출력의 길이·말투는 반영되지 않는다.
- **애니메이션·전환**: 정지 이미지라 모션은 안 보인다. `preview:serve` 로 직접 열어 봐야 한다.
- **실계정 로그인 층은 아직 없다** — 아래 참조.

## 실계정 로그인 촬영 (미구현)

로그인이 필요한 화면(허브 전체·마이페이지·결제 이력)은 아직 못 찍는다.
Playwright storageState 파일 `e2e/.auth/user.json` 이 **이 워크트리에 없고**(gitignore 대상이라
애초에 커밋되지 않는다), 그걸 만드는 `e2e/auth.setup.ts` 는 `E2E_USER_EMAIL` /
`E2E_USER_PASSWORD` 를 요구한다.

붙이는 법(자격증명이 생겼을 때):

1. `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` 를 환경변수로 주고 `npx playwright test --project=setup`
   → `e2e/.auth/user.json` 생성
2. `shoot.mjs` 의 `--auth` 분기에서 그 파일을 `browser.newContext({ storageState })` 로 물린다
   (지금은 파일이 없다는 안내만 하고 종료한다)

🔴 자격증명을 새로 만들거나 `.env*` 파일을 읽지 말 것. CEO가 값을 줄 때까지 미구현으로 둔다.

## 로컬 서버 안정화 — 무엇을 막고 있나

`scripts/preview/server.mjs` 가 2026-08-22에 실제로 죽은 세 자리를 감싼다.

| 증상                               | 처방                                               |
| ---------------------------------- | -------------------------------------------------- |
| `next dev` 가 **exit 134** 로 죽음 | `NODE_OPTIONS=--max-old-space-size=4096` 기본 적용 |
| «Unable to acquire lock»           | 기동 전 `.next/dev/lock` 자동 정리                 |
| 포트 충돌                          | 3020 고정 + 막혔으면 다음 빈 포트로 비킴           |

> 🔴 포트 탐침은 `listen({ exclusive: true })` 라야 한다. Windows 에서는 Node 가 기본으로 켜는
> SO_REUSEADDR 때문에 **이미 듣고 있는 포트에도 탐침이 통과**해 「비었다」는 거짓 판정이 나온다
> (실측: 남이 3020 을 쓰는데 탐침은 통과 → next 가 그제서야 EADDRINUSE 로 죽음).

## 함정 기록 — 증상 → 원인 → 처방

이 도구를 만들며 실제로 시간을 태운 자리다. 같은 데서 또 태우지 말라고 남긴다.

### ① 「HTTP 200 인데 본문이 비어 있고, 촬영이 전부 셀렉터 타임아웃」

**증상**: 페이지가 200 을 주고 응답 크기도 150KB 로 멀쩡한데, HTML 본문에 `<main>` 이 아예 없다.
브라우저에서도 하이드레이션이 안 붙어 `[data-preview-ready]` 가 끝내 나타나지 않고 9장면 × 2뷰포트
18건이 모두 30초 타임아웃. 응답 안에는 RSC 플라이트 페이로드만 들어 있다.

**원인**: **서버 컴포넌트가 `'use client'` 모듈에서 export 한 «객체»를 색인**했다.

```tsx
// scene-views.tsx ('use client')
export const PREVIEW_SCENE_VIEWS = { 'journey-empty': () => <JourneyFull … />, … }

// [scene]/page.tsx (서버 컴포넌트)
const View = PREVIEW_SCENE_VIEWS[scene.id] // 💥 여기서 트리가 죽는다
```

클라이언트 모듈의 export 는 RSC 경계를 넘을 때 **이름별 «클라이언트 참조»** 로 바뀐다.
서버가 받은 것은 실제 객체가 아니라 프록시라, 등록되지 않은 임의의 키로 뒤지면 참조가 깨진다.
그런데 이 실패는 **터미널에 빨간 오류로 안 뜬다** — 스트리밍 중 서스펜스 경계가 조용히 비워지고
응답 코드는 200 이라, 겉보기엔 「서버가 느린가?」 로 읽힌다. 그래서 원인을 서버 불안정으로
오해하기 쉽다.

**처방**: **고르는 일을 클라이언트 쪽에서 끝낸다.** 표는 모듈 안에 숨기고, 서버는 «컴포넌트 하나»만
이름으로 가져다 쓴다.

```tsx
// scene-views.tsx
const PREVIEW_SCENE_VIEWS = { … }                 // export 하지 않는다
export function PreviewSceneView({ sceneId }) {   // 서버가 쓰는 유일한 입구
  const View = PREVIEW_SCENE_VIEWS[sceneId]
  return <View />
}
```

**일반화**: 서버 컴포넌트가 클라이언트 모듈에서 가져와도 되는 것은 **이름으로 직접 쓰는 컴포넌트**
뿐이다. 객체·맵·배열을 받아 서버에서 뒤지지 말 것. 진단할 때는 코드를 더 읽기 전에
`curl <url> | grep '<main'` 으로 **본문이 실제로 있는지부터** 본다.

### ② 「서버는 Ready 라는데 페이지마다 Turbopack 패닉」

**증상**: `✓ Ready in 3.9s` 를 찍고도 페이지를 컴파일할 때마다
`range start index … out of range for slice of length …` 패닉이 수백 줄 쏟아지고 촬영이 전부 실패.

**원인**: `.next/dev/cache`(Turbopack 영속 캐시) 손상. 서버를 **강제 종료**(`taskkill /F`)하면
캐시가 깨진 채 남는다 — 촬영 도구는 서버를 자주 강제 종료하므로 구조적으로 잘 걸린다.

**처방**: `.next/dev/cache` 삭제(지워도 재생성된다). `preview:shots` 는 **내가 띄운 서버에서
촬영이 실패하면 캐시를 지우고 한 번 자동 재시도**한다. 손으로 고칠 땐 `rm -rf .next`.

> 🔴 «기동 성공 = 정상» 이 아니다. Next dev 는 요청이 와야 그 라우트를 짓기 때문에, 캐시 손상은
> Ready 이후에야 드러난다.

## 파일 지도

| 파일                                    | 역할                                     |
| --------------------------------------- | ---------------------------------------- |
| `lib/domain/dev-preview/scenes.ts`      | 장면 표(단일 출처) · 순수 모듈           |
| `app/dev-preview/page.tsx`              | 장면 목록                                |
| `app/dev-preview/[scene]/page.tsx`      | 장면 한 컷                               |
| `app/dev-preview/scene-views.tsx`       | 컴포넌트 + 목 데이터                     |
| `app/dev-preview/manifest/route.ts`     | 장면 표를 촬영 스크립트에 내주는 입구    |
| `scripts/preview/shoot.mjs`             | 촬영                                     |
| `scripts/preview/server.mjs`            | 서버 기동·대기·종료 공용부               |
| `scripts/preview/serve.mjs` `shots.mjs` | `preview:serve` · `preview:shots` 진입점 |
