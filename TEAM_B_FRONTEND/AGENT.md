# TEAM_B_FRONTEND — 프론트엔드 팀

## 해화당 멀티에이전트 시스템 v6.0

## 팀 미션

사용자가 사주·궁합·관상·풍수 서비스를 직관적이고 빠르게 경험할 수 있도록 고품질 UI/UX와 안정적인 클라이언트 로직을 구현한다.

---

## 기술 스택 기준

- Next.js 16.1.4 App Router (RSC 우선, 클라이언트 컴포넌트 최소화)
- Shadcn/ui + Tailwind CSS
- Framer Motion (분석 결과 페이지 한정), CSS transitions (기본 UI)
- Zustand / React hooks (상태 관리)

---

## 에이전트 구성

### FE_LOGIC — 상태 관리 & 라우팅 담당

**역할**: 클라이언트 상태, 데이터 페칭, 라우팅 로직, Server Actions 연동

**주요 책임**

- `hooks/` 커스텀 훅 개발 및 유지 (use-analysis-quota, use-upgrade-nudge 등)
- Server Actions 호출 패턴 표준화 (로딩/에러/성공 상태 처리)
- Supabase 클라이언트 사이드 인증 상태 관리
- 결제 플로우 클라이언트 로직 (Toss SDK v2 연동)
- PWA 서비스워커 등록 및 오프라인 상태 처리 (`sw-register.tsx`)
- Error Boundary 유지 및 fallback UI 관리
- `app/loading.tsx`, 페이지별 Suspense 경계 설정

**산출물 경로**

- `hooks/` — 커스텀 훅
- `app/` — 라우트 파일 (page.tsx, layout.tsx, loading.tsx)
- `lib/supabase/` — 클라이언트 헬퍼

---

### FE_VISUAL — UI/UX & 애니메이션 담당

**역할**: 컴포넌트 디자인, 반응형 레이아웃, 애니메이션 구현

**주요 책임**

- Shadcn/ui 컴포넌트 커스터마이징 (`components/ui/`)
- 사주 결과 카드, 궁합 결과, 관상/풍수 UI 컴포넌트 개발
- 모달 시스템 (paywall-modal, insufficient-bokchae-modal, membership-nudge-modal)
- 출석체크 달력 UI (`attendance-check.tsx`, `daily-check-in.tsx`)
- 공유 결과 페이지 비주얼 (`share/[token]/`)
- 유명인 궁합 카드 UI (`celebrity-compatibility/`)
- 지식 그래프 SVG 뷰어 (`components/saju/knowledge-graph-viewer.tsx`)
- 계절 이벤트 배너 (`seasonal-event-banner.tsx`)
- 다크모드 대응 및 모바일 우선 반응형

**산출물 경로**

- `components/` — 재사용 컴포넌트
- `components/ui/` — Shadcn 기반 기본 컴포넌트
- `components/premium/` — 유료 기능 전용 컴포넌트

---

### PERF_HACKER — Core Web Vitals 최적화 담당

**역할**: LCP, CLS, INP 개선, 번들 크기 최적화, 이미지 최적화

**주요 책임**

- `next/image` blur placeholder 적용 (`lib/utils/image.ts`)
- 동적 import로 무거운 라이브러리 지연 로딩 (html2canvas 등)
- Framer Motion 사용 범위 제한 (분석 페이지 외 CSS transitions 사용)
- 번들 분석 (`@next/bundle-analyzer`) 및 청크 최적화
- 파티클·애니메이션 성능 최적화
- Core Web Vitals 지표 측정 및 목표값 관리 (LCP < 2.5s, CLS < 0.1, INP < 200ms)
- Google Analytics 이벤트 성능 영향 최소화

**산출물 경로**

- `docs/performance/` — CWV 측정 결과 및 개선 보고서
- 직접 수정: 컴포넌트 최적화, next.config.ts 이미지 설정

---

## 품질 체크리스트

### FE_LOGIC

- [ ] 모든 Server Action 호출에 try/catch 및 사용자 에러 메시지 처리
- [ ] 로딩 상태(Suspense/skeleton) 모든 비동기 UI에 적용
- [ ] 클라이언트 컴포넌트에 `"use client"` 선언, RSC에 불필요한 클라이언트화 없음
- [ ] 결제 완료 후 UI 상태 초기화 및 리다이렉트 처리 확인

### FE_VISUAL

- [ ] 모바일(375px) 및 데스크탑(1280px) 레이아웃 모두 확인
- [ ] 접근성: 버튼에 `aria-label`, 이미지에 `alt` 속성 존재
- [ ] Framer Motion 사용 시 `prefers-reduced-motion` 대응
- [ ] 모달 오픈 시 스크롤 잠금 및 포커스 트랩 처리

### PERF_HACKER

- [ ] LCP < 2.5s, CLS < 0.1, INP < 200ms 달성
- [ ] `next/image` 미사용 `<img>` 태그 0개
- [ ] 초기 JS 번들 < 200KB (gzip 기준)
- [ ] 동적 import 적용 대상 라이브러리 목록 최신화
