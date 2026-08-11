# 마케팅 · 영상 작업 기준 — 청담해화당

이 문서는 **마케팅 소재와 영상**의 단일 기준이다. 시각 디자인 시스템(색·서체·간격의 원본)은
`DESIGN.md`이고, 여기서는 그것을 **영상·광고 규격으로 번역한 값**과 **법적 가드레일**만 다룬다.
값이 어긋나면 `DESIGN.md`가 이긴다.

---

## 1. 작업 환경

작업 위치는 **`claude/marketing-video` 워크트리**다.

```
D:/anti/haehwadang/.claude/worktrees/marketing-video
```

브랜치는 `claude/determined-yonath`에서 분기했다. `main`이 아닌 이유: 미디어 파이프라인 전체
(`scripts/media-assets/`, `scripts/shrine-assets/`, `ffmpeg-static`, `public/videos/*`)가
determined-yonath에만 있고 프로덕션 배포도 그 브랜치다. `main`은 그 부분집합이라
거기서 만든 영상은 배포 경로가 없다.

**워크트리를 분리한 이유**: determined-yonath에서는 다른 세션이 신당 기능을 계속 작업한다.
같은 워크트리를 공유하면 `package.json`이 충돌한다. 앱에 들어가는 영상(앰비언트·히어로)은
여기서 만들어 determined-yonath로 머지한다.

검증된 도구 (2026-07-30 실행 확인):

| 도구                | 버전 / 경로                                     | 비고                                           |
| ------------------- | ----------------------------------------------- | ---------------------------------------------- |
| ffmpeg              | 6.1.1 · `node_modules/ffmpeg-static/ffmpeg.exe` | **PATH에 없다.** 반드시 `ffmpeg-static` 경유   |
| ffprobe             | 없음                                            | `post.mjs probe`가 ffmpeg stderr를 파싱해 대체 |
| sharp               | 0.34.5                                          | Veo 이미지-투-비디오 입력 PNG 변환에 필요      |
| Playwright Chromium | 설치됨                                          | 기능 설명 영상의 실화면 녹화용                 |
| 자막 서체           | `C:/Windows/Fonts/NotoSerifCJKkr-Regular.otf`   | `DESIGN.md`의 Noto Serif KR과 동일 계열        |

ffmpeg 빌드에 `libass`·`freetype`·`harfbuzz`·`x264`·`vpx`·`aac`가 모두 포함돼 있어
한글 자막 번인이 가능하다. 가변폰트(`NotoSerifKR-VF.ttf`)는 libass에서 굵기 선택이 불안정하므로
정적 OTF를 쓴다.

---

## 2. 표시·광고법 가드레일 (최우선)

상업 서비스이므로 **표시·광고의 공정화에 관한 법률**이 적용된다. 소재 제작 단계에서 걸러라.

### 금지

- **수치 주장** — 적중률·만족도·평균 별점·이용자 수. 실집계 근거가 없다.
- **효험 단정** — "용하다", "맞춘다", "해결된다", "바뀐다". 결과를 약속하는 표현 전부.
- **후기 인용** — 현재 랜딩 후기 10건은 전부 **예시 소재**다(실이용자 후기 아님).
  광고에 옮기는 순간 「예시」 고지가 떨어져 나가므로 인용 자체를 하지 않는다.
- **의료·법률·투자 대체 암시** — 건강·소송·재테크 판단을 대신한다는 뉘앙스.

### 허용 — 검증 가능한 사실만

`components/landing/social-proof.tsx`의 `TRUST_FACTS`가 이미 이 원칙으로 짜여 있다. 같은 기준을 쓴다.

- 만세력으로 세운 명식 (`lib/domain/saju/manse.ts`, 골든 테스트 보유 — 해석이 아닌 계산)
- 다루는 영역: 사주·궁합·관상·손금·풍수 (`app/protected/analysis/*`)
- 리포트는 계정에 저장·재열람 (`app/protected/history`)

### 가격 표기

금액을 노출하면 `formatFeatureCost()` 실값과 일치해야 한다. 소재에 금액을 하드코딩하지 말고
제작 시점에 실값을 조회해 넣는다.

### 현재 상태

- ✅ 가짜 실시간 회원수 카운터 — **제거됨**
- ✅ 예시 후기 — 섹션 헤더 고지 + 카드별 「예시」 배지 유지 중
- ⏳ **후기 실데이터 교체 — 미완**. 실이용자 후기 수집 경로를 만들고 교체해야 한다.
  교체 전까지 집계 수치(평균 별점 등)를 파생해 노출하지 않는다.

---

## 3. 브랜드 영상 킷

톤: **조선 시대 반가의 서재.** 玄(깊은 흑) 배경에 액체 골드. 차분하고 무게감 있게.
서양 점성술의 보라·우주 팔레트는 쓰지 않는다 — 그게 유일한 차별 포지션이다.

값은 `scripts/media-assets/marketing-spec.mjs`의 `BRAND`가 코드상 단일 출처다.

| 용도        | HEX       |
| ----------- | --------- |
| 배경 玄     | `#0A0A08` |
| 서피스      | `#16140F` |
| 골드        | `#C9A84C` |
| 골드 라이트 | `#E8D5A0` |
| 도장 레드   | `#9E2B2B` |
| 본문 텍스트 | `#E8E4DC` |

ASS 자막은 `&HAABBGGRR`(BGR 역순, `AA=00`이 불투명)이라 HEX를 그대로 못 쓴다 — `BRAND.ass`를 쓴다.

### 세로 소재 세이프에어리어 (1080×1920)

플랫폼 UI가 덮는 영역. **자막과 로고는 이 밖에 둔다.** 3사 중 가장 보수적인 값이므로
개별 플랫폼에 맞춰 줄이지 말 것 — 한 소재를 3곳에 돌린다.

```
top 250 · bottom 420 · left 60 · right 60  (px)
```

### 플랫폼 규격

| 키       | 플랫폼          | 해상도           | fps | 운영 상한 | 코덱           |
| -------- | --------------- | ---------------- | --- | --------- | -------------- |
| `reels`  | Instagram Reels | 1080×1920 (9:16) | 30  | 90s       | H.264 / AAC    |
| `shorts` | YouTube Shorts  | 1080×1920 (9:16) | 30  | 180s      | H.264 / AAC    |
| `tiktok` | TikTok          | 1080×1920 (9:16) | 30  | 60s       | H.264 / AAC    |
| `hero`   | 랜딩 히어로     | 1080×1350 (4:5)  | 24  | 8s        | VP9 / **무음** |

⚠️ 길이·용량 상한은 요약값이다. 플랫폼 정책은 수시로 바뀌므로 **캠페인 업로드 직전에 재확인**할 것.
해상도·코덱은 안정적이다.

`hero`가 무음인 이유: 브라우저 자동재생 정책. 오디오 트랙 자체를 넣지 않는다(`-an`).
랜딩이 480px 단일 컬럼이라 4:5 세로가 맞다.

---

## 4. 파이프라인

두 계보를 섞지 않는다.

- **앱 내 앰비언트** (`video-spec.mjs`) — 무음 · 4초 · 720p · 무이음 루프 · 검정 위 요소만 · `public/videos` 배포
- **마케팅 소재** (`marketing-spec.mjs`) — 유음 · 15~30초 · 1080×1920 · 자막 번인 · 앱에 배포 안 함

### 생성 (비용 발생) — 두 경로

**A. kie.ai** (`kie.mjs`) — 이미지·영상 통합. SNS 소재의 기본 경로.

```bash
npm run kie -- presets                                    # 프리셋 목록(무과금)
npm run kie -- credit                                     # 잔액 + 참고 단가
npm run kie -- gen sns-video --prompt "..."               # dry-run(기본, 무과금)
npm run kie -- gen sns-video --prompt "..." --run --fetch # 생성 + D: 로 다운로드
```

`kling-3.0/video` 의 `mode=pro` + `9:16` 이 **1080×1920 네이티브**라 Reels/Shorts/TikTok 규격을
리프레임 없이 그대로 만족한다. duration 도 **3~15초**라 Veo 의 8초 상한보다 길어 컷 이어붙이기가 줄어든다.
이 두 가지가 kie.ai 를 SNS 기본으로 두는 이유다.

**B. Veo 직결** (`generate-videos.mjs`) — 앱 내 앰비언트 계보. 기존 프롬프트·레시피가 여기 묶여 있다.

```bash
npm run video                    # dry-run(기본) — 프롬프트 + 예상 비용만
npm run video -- --run <id>      # 실제 생성. 사용자 승인 후에만
```

둘 다 기본이 dry-run이고, `--run` 은 비용을 보고한 뒤 승인을 받아 실행한다.
`generate-videos.mjs` 는 멱등 — 출력이 이미 있으면 건너뛴다.

### kie.ai 계약 (출처 docs.kie.ai, 확인일 2026-08-05)

- 베이스 `https://api.kie.ai/api/v1` · 인증 `Authorization: Bearer <KIE_API_KEY>`
- 생성 `POST /jobs/createTask` → `{model, input}` → `data.taskId`
- 폴링 `GET /jobs/recordInfo?taskId=` → `data.state` (`waiting|queuing|generating|success|fail`)
- 잔액 `GET /chat/credit` → `data` 가 곧 크레딧 수
- ⚠️ `data.resultJson` 은 객체가 아니라 **JSON 문자열**이다 → 파싱해서 `resultUrls[]` 를 꺼낸다
- 레이트리밋 10초당 20건(429) · **실패한 작업은 과금되지 않는다**
- 크레딧 1개 = $0.005. 모델별 단가표는 공표돼 있지 않아 **추정치를 쓰지 않는다** —
  실비용은 성공 후 `creditsConsumed` 로 확정된다. 확인된 기준값: Veo 3 Fast 8초 = 80크레딧($0.40),
  Veo 3 Quality 8초 = 400크레딧($2.00)

**공식 first-party 패키지는 없다.** npm 의 kie CLI·MCP 는 전부 개인 메인테이너의 커뮤니티 패키지라,
과금이 붙은 키를 넘기지 않도록 REST 를 직접 호출한다(`kie.mjs`).

### 🔴 Windows `npm run` 따옴표 함정

`npm run x -- --prompt "여러 낱말"` 은 Windows 에서 **따옴표가 벗겨진 채** 넘어온다.
`--prompt="여러 낱말"` 같은 `=` 형도 마찬가지로 깨진다. 조각난 나머지가 파일 인자로 흘러들어
엉뚱한 오류를 낸다. `kie.mjs` 의 `--prompt` 와 `post.mjs` 의 `--text` 는 다음 플래그 전까지
조각을 이어붙이도록 되어 있어 세 형태 모두 동작한다(검증됨). 새 자유텍스트 플래그를 추가하면
같은 처리를 해줘야 한다.

### 후처리 (무료 · 로컬)

```bash
npm run video:post -- fetch    <url> [out]        # 결과 URL → D:/anti/media/downloads/
npm run video:post -- probe    in.mp4 [--platform=reels]
npm run video:post -- concat   c1.mp4 c2.mp4 out.mp4 --platform=reels [--xfade=0.4]
npm run video:post -- vertical in.mp4 out.mp4 --platform=reels
npm run video:post -- caption  in.mp4 out.mp4 --text="첫 줄|둘째 줄" --at=0:4 [--style=sans]
npm run video:post -- audio    in.mp4 bgm.mp3 out.mp4 --platform=reels [--volume=0.8]
npm run video:post -- encode   in.mp4 out.mp4 --platform=shorts
npm run video:post -- loop     in.mp4 out.mp4 [--fade=0.6]
npm run video:post -- crush    in.mp4 out.mp4
```

**SNS 광고 표준 흐름** (Veo는 1회 최대 8초라 컷을 나눠 생성한다):

```
생성(9:16 컷 N개) → concat → caption → audio → probe --platform=reels
```

**앰비언트 오버레이 흐름**:

```
생성(검정 위 요소만) → crush → loop → public/videos/
```

`|`는 자막 줄바꿈이다. 한글 어절이 깨지지 않게 자동 줄바꿈을 끄고 직접 지정한다.

### 출력 경로 — 🔴 저장은 D:

C: 는 232G 중 **27G 만 남았고(89% 사용)** D: 는 871G 가 비어 있다. 영상은 편당 수십~수백 MB라
기본 임시 경로(`C:\Users\...\AppData\Local\Temp`)에 흘리면 금세 C: 를 막는다.
`post.mjs` 는 출력이 C: 로 향하면 경고한다.

리포는 `D:\anti\haehwadang` 이므로 `assets-src/` · `public/videos/` 는 **이미 D:** 다 — 그대로 써도 된다.
리포에 남기지 않을 중간물·다운로드만 미디어 루트를 쓴다.

| 용도                   | 경로                          | git        |
| ---------------------- | ----------------------------- | ---------- |
| 생성 결과 다운로드     | `D:/anti/media/downloads/`    | 리포 밖    |
| 중간 산출물(버려도 됨) | `D:/anti/media/scratch/`      | 리포 밖    |
| 납품 후보              | `D:/anti/media/out/`          | 리포 밖    |
| 생성 원본(raw)         | `assets-src/video/raw/`       | 무시됨     |
| SNS 납품물             | `assets-src/video/marketing/` | 무시됨     |
| 앱 배포 영상           | `public/videos/`              | **커밋됨** |

미디어 루트는 `marketing-spec.mjs` 의 `MEDIA_ROOT` 가 단일 출처다.
환경변수 `HAEHWADANG_MEDIA_ROOT` 로 덮어쓸 수 있다.

### 생성물 받아오기

Higgsfield CLI 에는 **다운로드 명령이 없다** — `generate create --wait` 는 결과 URL 만 출력한다.
받는 건 `fetch` 가 한다(기본 저장 위치가 D: 라 C: 로 샐 일이 없다).

```bash
higgsfield generate create veo3_1_lite --prompt "..." --wait   # → 결과 URL
npm run video:post -- fetch "<결과 URL>"                        # → D:/anti/media/downloads/
```

`assets-src/video/`는 `.gitignore` 51행에 이미 등록돼 있다. ⚠️ **SNS 납품물은 git에 남지 않는다** —
업로드 후에도 원본이 필요하면 외부에 별도 보관할 것. 앱에 들어가는 영상(앰비언트·히어로)만
`public/videos/`로 커밋하고 determined-yonath에 머지한다.

`.env.local`은 메인 체크아웃(`D:/anti/haehwadang/.env.local`)을 절대경로로 참조한다 —
워크트리의 것은 구키다. 어느 워크트리에서 실행해도 동작한다.

### 확정된 레시피 — 다시 유도하지 말 것

| 명령       | 근거                                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crush`    | 검정 대비를 올려 `mixBlendMode: lighten` 오버레이용으로 만든다. `screen`은 방 전체를 물들여 실패했다. `lighten`(픽셀별 max)이라야 배경이 정지 상태로 남는다          |
| `loop`     | Veo 출력은 루프 재시작 지점이 하드컷이라 깜빡인다. 앞/뒤 절반을 스왑해 이음새를 중앙으로 옮기고 거기서만 크로스페이드한다(경계 프레임은 연속 원본이 된다). 4s → 3.4s |
| `caption`  | `drawtext`는 Windows 경로의 콜론과 한글 줄바꿈에서 깨진다 → ASS + libass로 태운다                                                                                    |
| `vertical` | 16:9를 9:16에 넣을 때 여백을 검정으로 두면 죽은 화면이 된다 → 같은 소재를 꽉 채워 크롭+강블러한 배경 위에 올린다                                                     |
| `concat`   | 규격이 다른 클립이 섞이면 concat demuxer가 깨진다 → 전부 정규화 후 filter concat                                                                                     |

### Veo 제약

- 길이는 **4 / 6 / 8초만** 지원 (5초 불가)
- 종횡비는 16:9 / 9:16
- 이미지-투-비디오는 `bytesBase64Encoded`. `inlineData`(generateContent 형식)는 400 거부됨
- 이미지-투-비디오로 방 전체를 시네마그래프화하는 접근은 반려됐다 — 배경이 통째로 움직인다

---

## 5. 비용

Veo 3.1 단가 (USD/초, audio 포함) — 출처 `ai.google.dev/gemini-api/docs/pricing`, 확인일 2026-07-21:

| 모델            | 720p      | 1080p | 4k    |
| --------------- | --------- | ----- | ----- |
| Standard        | $0.40     | $0.40 | $0.60 |
| **Fast** (기본) | **$0.10** | $0.12 | $0.30 |
| Lite            | $0.05     | $0.08 | —     |

기준선: **30초 SNS 광고 1편 = 8초 컷 4개 = 32초 × $0.10 = 약 $3.2**(Fast 720p). A/B 3안이면 약 $9.6.
후처리는 전부 로컬이라 무료다.

원칙: **런타임 생성 금지.** 1회 생성해 에셋으로 굳힌다. 트래픽과 비용을 분리한다.

---

## 6. 트랙 현황

### 영상

| 트랙                              | 상태                                                 |
| --------------------------------- | ---------------------------------------------------- |
| SNS 홍보·광고 (9:16, 자막·오디오) | 파이프라인 준비 완료 · 크리에이티브 스펙 미작성      |
| 랜딩·스토어 히어로 (무음 루프)    | 파이프라인 준비 완료 · 기존 玄/골드 계보 재사용 가능 |
| 앱 내 앰비언트 잔여 7종           | 기획안 승인 대기 · 생성비 $2.80 · 파이프라인 완성됨  |
| 기능 설명·튜토리얼                | Playwright 화면 녹화 합성 경로 미구축                |

앰비언트 잔여 7종의 테마별 고유 요소: 초가=반딧불·불티 · 용궁=기포·진주 · 도깨비=도깨비불 ·
설빛=눈발 · 달집=모닥불 불티 · 홍살=붉은 부적·향연 · 별밭=별·유성.

### 마케팅

| 트랙                     | 상태                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| 퍼널·GA4 데이터 분석     | `lib/analytics/ga4.ts`에 결제 퍼널 4단계 이벤트 이미 구현됨 → 여기서 시작 |
| 광고 크리에이티브 + 카피 | 데이터 확인 후 착수 권장                                                  |
| 랜딩 전환율 개선         | 1차 개선 배포됨(진입점·CTA·후기 섹션)                                     |
| SEO·콘텐츠               | `/story` 상세페이지 존재 · 확장 여지                                      |

타깃 (`DESIGN.md` Product Context): 1차 = 40-50대 가족 사주 관리 여성 / 2차 = 20-30대 커플 궁합.

권장 순서: **GA4 퍼널로 이탈 지점을 먼저 본다 → 그 지점을 겨냥한 크리에이티브를 만든다.**
근거 없이 소재를 뽑으면 A/B 3안 $9.6이 방향 없이 소모된다.

---

## 7. 결정 대기

1. **후기 실데이터 교체** — 실이용자 후기 수집 경로 설계 필요 (사용자 방침: 실데이터로 교체)
2. **앰비언트 7종 착수 여부** — 기획안 승인 + $2.80 승인
3. **광고 채널 우선순위** — Reels / Shorts / TikTok 중 어디부터
4. **BGM 라이선스** — 상업 이용 가능 음원 확보 경로 미정 (`audio` 명령은 준비됨)
