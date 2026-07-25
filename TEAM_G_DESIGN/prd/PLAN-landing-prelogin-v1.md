# PLAN — 로그인 전 초기화면 개선 v1

- 작성일: 2026-07-25
- 대상: `app/page.tsx` (비로그인 랜딩) + 신규 상세페이지 `/story`
- 기준 문서: `DESIGN.md` (이탈 금지), `CLAUDE.md`

---

## 1. 현황 진단 (프로덕션 k-haehwadang.com 실측)

측정은 브라우저에서 `getComputedStyle` / `getBoundingClientRect`로 직접 수행.

### P0 — 후기 글씨가 물리적으로 안 보임

`components/landing/review-marquee.tsx:129` 의 `ReviewCard`:

| 항목      | 클래스          | 실측값             | 대비     |
| --------- | --------------- | ------------------ | -------- |
| 카드 배경 | `bg-white`      | `rgb(255,255,255)` | —        |
| 본문 인용 | `text-zen-text` | `rgb(255,255,255)` | **1:1**  |
| 이름      | `text-zen-text` | `rgb(255,255,255)` | **1:1**  |
| 별점      | `text-zen-gold` | `rgb(226,213,181)` | 약 1.5:1 |

원인: `tailwind.config.ts:41` 에서 `zen.text = '#FFFFFF'` 로 매핑됨. 다크 테마 전환 과정에서
`zen.text`가 흑 → 백으로 뒤집혔는데 카드 배경 `bg-white`는 그대로 남아 발생한 회귀.

### P1 — 미정의 토큰으로 레이아웃 장치가 무효

`bg-zen-bg`, `from-zen-bg`, `to-zen-bg` 사용 중이나 `tailwind.config.ts`의 `zen`에는
`wood / text / gold / muted / border` 만 존재. `zen.bg`는 **없음**.
→ 래퍼 배경 실측 `rgba(0,0,0,0)`, 좌우 페이드 그라디언트도 전부 무효.

### P1 — 과밀

후기 카드 40장(20장 × 2줄 마퀴), 카드 폭 320px. 앱 셸은 `max-w-[480px]`, 모바일 375px.
사용자 표현 그대로 "복잡해 보임".

### P1 — 문맥 없는 숫자

`components/landing/live-member-counter.tsx:26` 이 라벨 없이 `<span>12,403</span>` 만 렌더.
화면에 숫자만 덩그러니 노출됨.

### P0 — 로그인 진입점 부재

랜딩 DOM의 앵커는 `/protected`(히어로 버튼), `/auth/sign-up`(하단 CTA) 둘뿐.
`hasLoginLink: false`. **기존 회원이 로그인할 방법이 화면에 없음.**
게다가 `/protected`는 `lib/supabase/middleware.ts:46`에서 비로그인 시 아무 안내 없이
`/auth/login`으로 리다이렉트 → 사용자는 튕긴 이유를 모름.

### P2 — 첫인상 불안정

- 슬라이드마다 subhead가 `<br/>` 하드 개행 4~5줄 → 375px에서 텍스트 벽
- `HeroCarousel.tsx:90` 랜덤 시작 슬라이드 → 방문마다 첫인상이 다름 + 마운트 후 교체로 깜빡임
- `pt-[22vh]` 고정 → 낮은 화면에서 압박

### P2 — 코드 품질

`review-marquee.tsx:127` `{ review: any }` — 프로젝트 `any` 금지 위반.

### 설득 구간 부재

전체 문서 높이 1706px. 히어로 → 간편운세 → 후기 → CTA 로 끝. 제품이 무엇을 주는지
설명하는 구간이 사실상 없음.

> 참고: 헤드리스 창에서 페이지가 로딩 스피너에 멈추는 현상을 관측했으나, 창이 compositing을
> 하지 않아 `requestAnimationFrame`이 실행되지 않고 React 19의 suspense reveal(`$RV`)이
> 대기한 것. 강제 reveal 시 정상 렌더 확인. **프로덕션 장애 아님.**

---

## 2. 개선 방향

### WP-A. 소셜 프루프 재설계

- 흰 카드 폐기 → 다크 서피스 카드. 본문 명암비 **4.5:1 이상** 강제
- `zen-bg` 등 미정의 토큰 → 실제 토큰으로 교체, 페이드 엣지 복구
- 2줄 마퀴 → **1줄**, 노출 8~10장, 카드 폭 260~280px (다음 카드가 살짝 보여 스와이프 유도)
- 카드 요소를 별점·인용 1줄·이름/나이 **3개로 제한**, 인용문이 주인공
- 회원수 카운터에 문맥 부여 (예: "지금 12,403명이 해화당과 함께합니다")
- 섹션 헤더 신설 (평균 별점/후기 수 요약)
- `prefers-reduced-motion: reduce` 시 마퀴 정지
- `any` 제거

### WP-B. 히어로 + 로그인 진입점

- **`components/landing/landing-auth-bar.tsx` 신설** — "로그인"(`/auth/login`) 상시 노출.
  주 CTA는 무료 시작(`/auth/sign-up`), 로그인은 톤 낮춘 보조 링크
- 히어로 슬라이드 버튼 `link` 를 `/protected` → **`/auth/sign-up`** 으로 변경
  (맥락 없는 리다이렉트 제거)
- 카피 다이어트: headline 1~2줄, subhead **2줄 이내**. 감정 축(공허 / 자녀·재물 / 인연)은
  유지하고 압축만. 과장·허위 효능 표현 금지
- 랜덤 시작 제거 → 항상 슬라이드 0. reduced-motion 시 자동 전환 정지
- `pt-[22vh]` → flex 정렬 + 안전 여백. 높이 640px에서 CTA 안 잘리게
- 헤드라인 명암비 4.5:1 확보 (필요 시 오버레이 강화). LCP 위해 슬라이드 0만 `priority`

### WP-C. 몰입형 상세페이지 `/story`

모바일 세로 스크롤 상세페이지 (앱 셸 480px 고정 전제). 섹션별 컴포넌트 분리.

1. 오프닝 — 감정 후킹 한 문장
2. 문제 제기 — "왜 지금 사주인가"
3. 해화당의 방식 — 전통 명리학 + AI 교차분석이 철학관/가벼운 운세앱과 다른 점
4. 무엇을 받는가 — **코드베이스 실기능만** (사주·궁합·관상·손금·풍수, 오늘의 운세,
   신당/기원, 가족 등록, 리포트)
5. 리포트 미리보기 — 밀도를 보여주되 유료 구간 블러로 궁금증 유지
6. 신뢰 — 데이터 보호/보관·환불 정책 등 `app/privacy`·`app/terms` 기반 사실만
7. 마무리 CTA + 스크롤 sticky CTA 바

제약:

- 다크 고정, 흰 배경 카드 금지 (P0 재발 방지)
- **실존 이미지 7개만 사용**, 없는 경로 창작 금지 →
  `hanok-night-hero.jpg`, `intro-wealth-v2.jpg`, `intro-relationship-v2.jpg`,
  `intro-wealth.jpg`, `intro-relationship.jpg`, `red-horse-hero.png`, `landing-section-2.jpg`
  부족분은 CSS 그라디언트·인라인 SVG·`hanji-overlay`/`dancheong-divider`로 충당
- **허위·과장 광고 금지.** 없는 언론보도·수상·자격증 창작 금지
- framer-motion 스크롤 애니메이션 시 reduced-motion 존중
- `metadata` + openGraph 설정 (유입 랜딩 대비)

### WP-D. 통합 (오케스트레이터 직접 수행)

`app/page.tsx` 단일 소유. WP-A/B/C 산출물 배선 + `/story` 링크 배치 + 최종 검증.

---

## 3. 파일 소유권 (병렬 충돌 방지)

| WP  | 소유 파일                                                                                    |
| --- | -------------------------------------------------------------------------------------------- |
| A   | `components/landing/review-marquee.tsx`, `live-member-counter.tsx`, `social-proof.tsx`(신규) |
| B   | `components/HeroCarousel.tsx`, `components/landing/landing-auth-bar.tsx`(신규)               |
| C   | `app/story/**`, `components/landing/story/**`                                                |
| D   | `app/page.tsx`                                                                               |

`messages/ko.json` 은 **추가만** 허용 (키 삭제·변경 금지).

---

## 4. 완료 기준

- [ ] 후기 본문/이름/별점 명암비 4.5:1 이상 (실측 보고)
- [ ] 미정의 Tailwind 토큰 0개
- [ ] 랜딩에서 로그인 진입 가능
- [ ] `/story` 라우트 정상 빌드 + 실존 이미지만 참조
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run lint` 신규 에러 0
- [ ] `any` 0개
