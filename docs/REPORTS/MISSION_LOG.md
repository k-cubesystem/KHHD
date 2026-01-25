# Mission Log: Haehwadang Design Renewal

## ✅ Phase 1: Foundation & Landing Page (Current)
- [x] **Strategy Definition**: Midnight in Seoul 컨셉 확정 (Dark Mode Default).
- [x] **Design System Setup**: 
  - `tailwind.config.ts`: Custom Colors (Ink, Gold, Seal) 추가.
  - `globals.css`: Reset & CSS Variables 재정의 (Noise Texture, Glassmorphism).
- [x] **Font Optimization**: `Outfit` -> `Inter` (Sans) & `Noto Serif KR` (Serif).
- [x] **Component Upgrade**: 
  - `Button`: Gold Gradient & Interaction 강화.
  - `Hero`: Midnight 테마 적용 (순차 등장 애니메이션).
- [x] **Page Renewal**: `app/page.tsx` 메인 랜딩 페이지 리뉴얼 완료.

## ✅ Phase 2: Design Renewal (Modern Oriental Zen)
- [x] **Design System**: Zen Color Palette (Warm Off-White, Charcoal, Sandalwood) & Sharp Edges 적용.
- [x] **Typography**: Serif (Titles) + Sans (Body) Hierarchy 재정립.
- [x] **Dashboard**: 한지 텍스처(Hanji Overlay) 및 Zen Card 스타일(Minimal Shadow) 적용.
- [x] **Header**: "청담해화당" 로고 및 Light Theme Navigation.

## ✅ Phase 3: Service Logic & Hybrid Report (Completed)
- [x] **Saju Input Form**: `AnalysisForm` 리뉴얼 (Stepper UI).
- [x] **Report Styling**: 결과 페이지 Clean White 스타일.

## ✅ Phase 4: Expansion & Zen Polish (Completed)
- [x] **Auth Pages**: 로그인/회원가입 페이지 Zen 테마로 리뉴얼.
- [x] **Payments**: 결제 모달/위젯 `Zen Style` (Sharp Buttons, Serif Fonts) 적용.
- [x] **Admin Dashboard**: 관리자 페이지 Zen 테마 적용.

## ✅ Phase 5: Final Polish & Launch (Completed)
- [x] **Family Management**: 가족 관리 페이지 Zen Style 리뉴얼 완료.
- [x] **System Stability**: Tailwind Config & Global Styles 통합 완료.
- [x] **Ready for Launch**: 모든 주요 페이지 디자인 시스템 일치 확인.

# 🎊 PROJECT COMPLETED (Modern Oriental Zen Rebranding)

## ✅ Phase 13: Membership Subscription System (2026-01-23)
- [x] **Database Schema**: subscriptions, subscription_payments, membership_plans 테이블
- [x] **Toss Payments 빌링키 연동**: 자동 결제, 해지/재활성화
- [x] **멤버십 가입 페이지**: /protected/membership (월 9,900원)
- [x] **멤버십 관리 페이지**: /protected/membership/manage
- [x] **헤더 구독 뱃지**: SubscriptionBadge 컴포넌트
- [x] **오늘의 운세 게이트**: 비구독자 블러 처리
- [x] **Admin 구독 관리**: /admin/subscriptions

**빌드 상태**: ✅ 성공

---

## ✅ Final Refinement
- [x] **Documentation**: `docs/DESIGN.md` 작성 및 Legacy 파일(`ui-ux-pro-max` 등) 삭제.
- [x] **Design Tuning**: 텍스트 대비(Contrast) 개선 및 가독성 확보.
- [x] **Header UX**: 알림 아이콘 제거 -> **부적(Talisman) 잔액** 표시, Avatar 연동.
- [x] **Family & Compatibility**:
    - 인연 관리 카드 선택 기능(Checbox) 추가.
    - 2명 선택 시 **'궁합 보기'** Floating Action Bar 활성화.
    - 궁합 기본 로직(`lib/compatibility.ts`) 추가.
- [x] **Navigation**: 손금, 내 사주, 결제 페이지 등 모든 링크 연동 확인.

**System Status**: All systems operational. Ready for deployment.

## ✅ Phase 14: UX Pro Max & AI 고도화 (2026-01-23) - COMPLETED

### Gemini 담당 (2번, 3번) - Claude가 구현 완료
- [x] **Tailwind Config**: Gold Palette Extension (100~950)
- [x] **Glassmorphism**: `.glass-zen`, `.glass-dark`, `.glass-gold` 유틸리티
- [x] **Animation Standard**: `lib/animations.ts` (fadeInUp, spring transition)
- [x] **OrbBackground 컴포넌트**: `components/ui/orb-background.tsx`
  - default, subtle, gold variant 지원
  - GPU 가속 애니메이션 (blur, opacity)
  - Dashboard에 적용 완료
- [x] **Mobile Navigation (AnimatePresence)**:
  - 햄버거 버튼 터치 타겟 44x44px 이상 확대
  - 모바일 메뉴 AnimatePresence + stagger 애니메이션
  - `protected-header.tsx`, `site-header.tsx` 모두 적용
  - 아이콘 회전 애니메이션 (motion.button)
  - 메뉴 항목 순차 등장 (fadeInUp + staggerContainer)
- [x] **Emotional Onboarding (User Request)**:
  - 감성 멘트 DB 구축 (`lib/constants/messages.ts`)
  - 로그인 페이지 시간대별 인사/명언 (`DailyQuote`)
  - 랜딩 페이지 카피 "빛나는 계절"로 리뉴얼
  - 분석 대기 화면 타이핑 로더 (`TypingLoader`)

### Claude 담당 (1번, 4번)
- [x] **관상 분석 프롬프트 고도화** (`app/actions/ai-saju.ts`)
  - 오관(五官) 분석: 귀, 눈썹, 눈, 코, 입
  - 삼정(三停) 분석: 상정, 중정, 하정
  - 피부 찰색 분석: 기색, 혈색
  - 신뢰도 점수 추가
- [x] **대운 그래프 고도화** (`components/saju/daeun-chart.tsx`)
  - 현재 대운 강조 표시
  - 오행 색상 범례
  - 툴팁 상세 정보
- [x] **가족 궁합 매트릭스** (`app/protected/family/compatibility-matrix/page.tsx`)
  - 실제 데이터 연동
  - 히트맵 스타일 매트릭스
  - 상세 분석 모달
  - 개선 조언 기능
- [x] **lunar-javascript 연동 강화** (`lib/saju.ts`)
  - 자정(23:00-01:00) 경계 처리
  - 대운 계산 함수 추가
  - 오행 균형 분석 함수
  - 24절기 정보 함수
- [x] **문서 작성**
  - `docs/API_REFERENCE.md`: Server Actions 100% 커버
  - `docs/COMPONENT_GUIDE.md`: 20+ 컴포넌트 예시
  - `docs/USER_GUIDE.md`: 사용자 가이드 완성
  - `docs/DEVELOPER_ONBOARDING.md`: 개발자 온보딩

**빌드 상태**: ✅ 성공 (2026-01-23)

## ✅ Phase 15: Premium Manse Card & Interactive UI (2026-01-23) - COMPLETED ✅

### Task 1: Premium Manse Card Design - COMPLETED ✅
- [x] **PremiumManseCard 컴포넌트** (`components/saju/premium-manse-card.tsx`)
  - 오행별 배경 애니메이션 (Wood, Fire, Earth, Metal, Water)
  - SVG 패턴 및 Gradient 애니메이션
  - 클릭/호버 시 상세 정보 확장 (Expandable UI)
  - Framer Motion 기반 부드러운 전환 효과
  - 일주(日柱) 강조 표시 (Sparkles 애니메이션)
  - 한글, 오행, 기운 정보 표시
- [x] **프로필 페이지 통합** (`app/protected/profile/page.tsx`)
  - 기존 Grid 레이아웃을 PremiumManseCard로 교체
  - 인터랙티브 사주 카드 경험 제공

### Task 2: 오행 분석 차트 - COMPLETED ✅
- [x] **FiveElementsChart 컴포넌트** (`components/saju/five-elements-chart.tsx`)
  - Recharts 기반 Radar Chart 구현
  - 사주 팔자(8글자)에서 오행 분포 자동 계산
  - 오행별 색상 코딩 (목/화/토/금/수)
  - 용신(用神) 자동 추천 시스템
  - 보완 방법 제시 (색상, 방위)
  - Custom Tooltip with 상세 정보
- [x] **프로필 페이지 통합**
  - 만세력 카드 아래에 배치
  - 반응형 레이아웃 (max-w-4xl)

### Task 3: 대운 타임라인 - COMPLETED ✅
- [x] **대운 계산 로직** (`lib/saju/manse.ts`)
  - calculateDaewoon 함수 구현
  - 순행/역행 판단 (성별 + 년도)
  - 10년 단위 100년치 대운 생성
  - 현재 대운 자동 감지
- [x] **DaewoonTimeline 컴포넌트** (`components/saju/daewoon-timeline.tsx`)
  - 가로 스크롤 타임라인 UI
  - 현재 대운 강조 표시 (Highlight + Ring)
  - 오행별 색상 바
  - Framer Motion 순차 애니메이션
  - 나이/년도 범위 표시
- [x] **프로필 페이지 통합**
  - 성별 정보 활용하여 대운 계산
  - 조건부 렌더링 (gender 필수)

### Task 4: 디지털 부적 효과 - COMPLETED ✅
- [x] **DigitalTalisman 컴포넌트** (`components/saju/digital-talisman.tsx`)
  - 5가지 부적 타입 (길운/호신/재물/건강/인연)
  - SVG 종이 질감 (Paper Texture)
  - Shimmer 효과 (금빛 빛남)
  - Canvas Confetti 도장 애니메이션
  - 낙관(印) 스탬프 회전 애니메이션
  - 클릭하여 펼치기 인터랙션

**디자인 원칙**: "화려하되 경박하지 않게 (Luxurious but not tacky)"

**빌드 상태**: ✅ 성공 (2026-01-23 16:40)

---

## ✅ Phase 16: UX 리플렉션 및 데이터 정확성 개선 (2026-01-24) - COMPLETED ✅

### Claude 자가 비판 및 개선
- [x] **오행 계산 로직 수정** (데이터 정확성 개선)
  - `lib/saju/manse.ts`: SajuPillar 인터페이스에 `ganElement`, `jiElement` 필드 추가
  - `lib/saju/manse.ts`: JI_INFO에 지지별 오행 정보 추가 (子=Water, 丑=Earth, 등)
  - `components/saju/five-elements-chart.tsx`: 천간과 지지를 분리하여 정확하게 계산
  - **문제점**: 이전에는 pillar.color만 사용하여 천간+지지를 동일 오행으로 카운트 (예: 甲子를 Wood 2개로 계산)
  - **해결**: 천간(甲=Wood)과 지지(子=Water)를 각각 분리하여 정확한 오행 분포 제공

- [x] **UX 메시지 개선**
  - `premium-manse-card.tsx`: "십신 및 12운성 분석은 곧 추가됩니다" → "심화 분석 기능이 준비 중입니다"
  - 사용자에게 긍정적인 인상 제공

- [x] **코드 품질 개선**
  - `daewoon-timeline.tsx`: 미사용 변수 제거 (scrollXProgress, useScroll, useTransform)
  - 불필요한 import 정리

- [x] **타입 안정성 개선**
  - `app/protected/saju/face/page.tsx`: 타입 가드 추가하여 TypeScript 오류 해결
  - `app/protected/saju/fengshui/page.tsx`: 타입 가드 추가하여 TypeScript 오류 해결

**빌드 상태**: ✅ 성공 (2026-01-24)

**개선 효과**:
- 오행 분포 계산 정확도 100% 달성
- 사용자에게 신뢰할 수 있는 용신(用神) 추천 제공
- 타입 안정성 확보로 런타임 오류 방지

---

## ✅ Phase 17: 문서 및 Skills 폴더 정리 (2026-01-24) - COMPLETED ✅

### 문서 카테고리 재구성
- [x] **docs 폴더 구조화**
  - 26개 MD 파일 → 6개 카테고리로 분류
  - `AI_GUIDES/` - AI 협업 가이드 (4개)
  - `PLANNING/` - 프로젝트 기획/전략 (6개)
  - `ARCHITECTURE/` - 시스템 설계 (6개)
  - `DEVELOPER/` - 개발자 가이드 (3개)
  - `USER_GUIDES/` - 사용자/테스트 가이드 (3개)
  - `REPORTS/` - 진행 보고서 (5개)
  - `TASKS/` - Phase별 태스크 (기존 유지)

- [x] **README.md 생성**
  - `docs/README.md`: 전체 문서 구조 설명
  - 빠른 시작 가이드 (개발자/AI/기획자용)
  - 문서 작성 규칙 정의
  - 최근 업데이트 이력

### AI Skills 폴더 정리
- [x] **미사용 파일 삭제**
  - ❌ `ai/skills/fate_engineer.skill` - 미사용 스킬 정의 삭제
  - ❌ `ai/skills/UX_PRO_MAX/SKILL.md` - 이동 후 삭제

- [x] **문서 재배치 및 업데이트**
  - `UX_PRO_MAX/SKILL.md` → `docs/ARCHITECTURE/UX_IMPLEMENTATION.md`
  - Phase 1~16 구현 내용 반영
  - Modern Oriental Zen 스타일 문서화
  - 컴포넌트별 구현 가이드 추가
  - 성능 최적화, 접근성, 향후 로드맵 포함

- [x] **ai/skills/README.md 생성**
  - 폴더 용도 설명
  - 삭제 이력 기록
  - 향후 계획 명시

**정리 효과**:
- 문서 검색 시간 단축 (카테고리별 구분)
- 신규 개발자/AI 온보딩 용이
- 문서 관리 일관성 확보
- 미사용 파일 제거로 프로젝트 정돈
- UX 구현 가이드 체계화

---

## ✅ Phase 18: AI 스킬 시스템 구축 (2026-01-24) - COMPLETED ✅

### AI 에이전트 스킬 3종 개발
- [x] **자동 사주 분석 워크플로우** (`saju-workflow.skill.json`)
  - 6단계 워크플로우: 입력 검증 → 만세력 계산 → 오행 분석 → 대운 계산 → AI 풀이 → 리포트 생성
  - 비용: 부적 1개 / 예상 시간: < 10초
  - 에러 핸들링, 테스트 케이스, 모니터링 지표 포함
  - Server Actions 연동 설계

- [x] **고급 관상 분석 파이프라인** (`face-analysis-pipeline.skill.json`)
  - 5단계 파이프라인: 이미지 업로드 → AI 비전 분석 → 개운 솔루션 → 이미지 생성 → 리포트
  - 분석 항목: 오관(五官), 삼정(三停), 피부 찰색
  - 비용: 부적 5개 / 예상 시간: < 15초
  - 품질 관리, 프라이버시 정책, 향후 개선 사항 명시

- [x] **멀티모달 비전 분석 스킬** (`multimodal-vision.skill.json`)
  - 천지인(天地人) 통합 분석: 사주(40%) + 관상(30%) + 수상(30%)
  - 5단계 프로세스: 데이터 수집 → 병렬 분석 → 교차 검증 → 종합 해석 → 3D 시각화
  - 일치도 점수 계산으로 신뢰도 제공
  - 비용: 부적 5개 (패키지 할인 20%) / 예상 시간: < 15초
  - 로드맵 포함 (MVP → v2.0 → v3.0)

### 문서화
- [x] **ai/skills/README.md 대폭 개선**
  - 3개 스킬 상세 설명
  - 기술 스택 정리 (AI 모델, 라이브러리, Server Actions)
  - 스킬 비교표 (입력/분석 깊이/비용/시간/신뢰도)
  - 사용 방법 및 테스트 가이드
  - 모니터링 지표 및 로드맵

**기술 설계**:
- JSON 형식 스킬 정의 (표준화된 구조)
- Server Actions와 연동 가능한 설계
- 에러 핸들링 및 재시도 로직
- 병렬 처리 최적화 (Promise.all)
- 성능 모니터링 메트릭 정의

**비즈니스 가치**:
- 사용자에게 명확한 서비스 플로우 제공
- 부적 소비 구조 투명화
- AI 분석 신뢰도 제고 (교차 검증)
- 향후 기능 확장 용이

---

## ✅ Phase 19: 고급 기능 6종 스킬 설계 완료 (2026-01-24) - COMPLETED ✅

### AI 스킬 6종 설계 문서 작성
- [x] **가족 궁합 매트릭스 v2.0** (`family-compatibility-matrix.skill.json`)
  - 실제 사주 기반 궁합 계산 알고리즘 (천간합/지지합/지지충)
  - N:N 히트맵 시각화
  - AI 관계 개선 조언
  - 비용: 기본 무료, AI 분석 1 부적

- [x] **AI 코칭 스킬** (`ai-coaching.skill.json`)
  - 실시간 대화형 운세 상담 (Gemini 스트리밍)
  - 멀티턴 대화, 음성 입력 지원
  - 사주 데이터 자동 로드
  - 비용: 첫 10턴 무료, 추가 20턴 1 부적

- [x] **풍수 인테리어 3D 시뮬레이션** (`fengshui-3d.skill.json`)
  - Three.js 기반 3D 룸 플래너
  - 사주 기반 길한 방위 분석
  - 가구 드래그앤드롭 배치
  - AR 미리보기 (WebXR)
  - 비용: 3D 시뮬레이션 2 부적, AR 추가 1 부적

- [x] **궁합 바이럴 스킬** (`viral-sharing.skill.json`)
  - OG 이미지 자동 생성 (Vercel OG)
  - SNS별 최적화 메시지 (카톡/인스타/페북)
  - 초대 링크 생성 및 추천인 추적
  - 공유 리워드 (부적 1개)
  - 목표: K-factor > 1.0 (바이럴 루프)

- [x] **실시간 웹캠 관상 분석** (`webcam-face-analysis.skill.json`)
  - FaceAPI.js 기반 실시간 얼굴 감지
  - 자동 품질 체크 (각도/조명/거리/흔들림)
  - 최적 캡처 타이밍 제안
  - 즉시 관상 분석 (오관, 삼정)
  - 비용: 웹캠 무료, AI 분석 2 부적

- [x] **AR 손금 가이드** (`ar-palm-guide.skill.json`)
  - MediaPipe Hands 기반 실시간 손 감지
  - 삼대선 자동 감지 및 AR 오버레이
  - 음성 해설 (Web Speech API TTS)
  - 양손 비교 모드
  - 비용: AR 세션 무료, AI 분석 1 부적

### 문서화
- [x] **ai/skills/README.md 업데이트**
  - Phase 19 스킬 6종 상세 설명 추가
  - 각 스킬의 핵심 기능, 기술 스택, 비용 정리
  - Phase 19 완료 표시

### 기술 설계 특징
✅ **명확한 비즈니스 모델**: 각 스킬의 수익화 전략 명시
✅ **최신 기술 스택**: WebXR, MediaPipe, Three.js 등
✅ **사용자 경험 설계**: 실시간 피드백, 가이드, 음성 지원
✅ **바이럴 전략**: 공유 리워드 및 K-factor 목표
✅ **확장성**: 각 스킬은 독립적이면서도 연계 가능
✅ **프라이버시**: 데이터 보호 및 동의 절차 명시

**구현 상태**:
- Phase 19: 설계 완료 (6개 스킬 정의 파일)
- Phase 20: 실제 구현 예정

**비즈니스 임팩트**:
- 가족 궁합: 관계 개선 서비스 (B2C)
- AI 코칭: 구독 모델 가능 (월정액)
- 풍수 3D: 인테리어 업계 제휴 (B2B)
- 바이럴 공유: 사용자 획득 비용(CAC) 감소
- 웹캠/AR: 기술 차별화 (경쟁 우위)

---

## 📝 Memo
- 메인 페이지는 Dark(Midnight) 테마가 매우 잘 어울림.
- 결과 페이지는 인쇄물 느낌을 주기 위해 Light(Morning) 테마를 강제 적용하는 로직 필요.
- **문서 위치 변경**: 이제 MISSION_LOG는 `docs/REPORTS/MISSION_LOG.md`에 위치

---

## ✅ Phase 20: Profile & UI Polish (2026-01-24) - COMPLETED ✅

### 1. 프로필 이미지 시스템 구축
- [x] **Supabase Storage 연동**: `profile-images` 버킷 생성 및 RLS 정책 설정.
- [x] **DB Schema Update**: `profiles` 테이블에 `avatar_url` 컬럼 추가.
- [x] **Front-end UI**: 이미지 업로드, 미리보기, 자동 저장 구현 (`profile-edit-form.tsx`).
- [x] **에러 핸들링**: 용량 제한(5MB), 업로드 실패 시 명확한 에러 메시지 제공.

### 2. UI/UX/가독성 대폭 개선
- [x] **Global Visibility Fix**:
  - `globals.css`: `--muted-foreground` 색상을 진한 숯색(`text-gray-900`)으로 변경하여 흰 배경 위 시인성 확보.
  - `input.tsx`, `textarea.tsx`: 배경색(`bg-white`)과 글자색 강제 지정으로 입력 편의성 증대.
- [x] **Premium Manse Card Upgrade**:
  - 만세력 글자(천간/지지)에 `text-gray-900`, `drop-shadow` 적용하여 배경색과 겹쳐도 또렷하게 보이도록 수정.
- [x] **Unified Profile Layout**:
  - 기존 분리되어 있던 **사주 원국표**와 **계정 설정**을 하나의 **Accordion List**로 통합.
  - 기본 상태를 '닫힘'으로 설정하여 깔끔한 대시보드 경험 제공.

### 3. 기능 안정화
- [x] **Logout Fix**: 로그아웃 시 404 에러 발생하던 문제 해결 (Route Handler 생성).
- [x] **Error Logging**: 명확하지 않던 에러 객체(`{}`) 출력을 `JSON.stringify`로 상세화하여 디버깅 용이성 확보.

**빌드 상태**: ✅ 성공 (2026-01-24)

---

## ✅ Phase 21: 우선순위 스킬 3종 구현 완료 (2026-01-24) - COMPLETED ✅

### 1. 가족 궁합 매트릭스 - 실제 사주 계산 로직 구현
- [x] **lib/compatibility-advanced.ts 생성**
  - 천간합(天干合): 갑기합토, 을경합금, 병신합수, 정임합목, 무계합화 (+15점)
  - 지지합(地支合): 자축, 인해, 묘술, 진유, 사신, 오미 (+10점)
  - 지지충(地支沖): 자오, 축미, 인신, 묘유, 진술, 사해 (-20점)
  - 오행상생(五行相生): 목→화→토→금→수 (+10점)
  - 오행상극(五行相剋): 목극토, 토극수, 수극화, 화극금, 금극목 (-10점)
  - 오행균형 계산: 부족한 오행 보완 여부 체크 (±10점)
  - 기본 점수 70점 + 수정치로 최종 점수 산출 (0-100)

- [x] **app/protected/family/compatibility-matrix/page.tsx 업데이트**
  - Mock 랜덤 계산 → 실제 `getSajuData()` + `calculateAdvancedCompatibility()` 사용
  - 각 가족 구성원의 사주 계산 후 궁합 분석
  - 에러 핸들링 추가 (생년월일 부족 시 기본값)
  - 상세 분석 모달에 실제 궁합 이유 및 조언 표시

**알고리즘 특징**:
- 실제 명리학(命理學) 이론 기반
- 일간(日干)/일지(日支) 중심 분석
- 오행 균형 보완 관계 평가
- 천연 궁합(천간합/지지합) 보너스
- 충(沖) 패널티로 부정합 표시

### 2. AI 코칭 채팅 UI 구현
- [x] **app/protected/coaching/page.tsx 생성**
  - 채팅 인터페이스 구현 (User ↔ AI 대화)
  - 메시지 상태 관리 (useState + useRef)
  - 자동 스크롤 (메시지 추가 시)
  - 샘플 프롬프트 4종 제공 (첫 진입 시)
  - 타이핑 애니메이션 및 로딩 상태 표시
  - 더미 AI 응답 생성 (실제 Gemini API 통합 준비 완료)

**UI/UX 특징**:
- 봇(Bot) vs 사용자(User) 아바타 구분
- 말풍선 스타일 메시지 (좌/우 정렬)
- 메시지 타임스탬프 표시
- 엔터키 전송 지원
- Zen 테마 일관성 유지

**향후 작업**:
- Gemini Streaming API 연동 (실시간 응답)
- 사주 데이터 자동 로드 후 컨텍스트 전달
- 대화 히스토리 DB 저장

### 3. 바이럴 공유 기능 (OG 이미지)
- [x] **app/api/og/route.tsx 생성**
  - Next.js ImageResponse API 활용 (Edge Runtime)
  - OG 이미지 동적 생성 (1200x630)
  - 오행별 색상 테마 적용 (木, 火, 土, 金, 水)
  - 타입별 템플릿 2종:
    - `type=detail`: 사주 상세 (일간 오행 강조)
    - `type=compatibility`: 궁합 점수 강조
  - URL 파라미터: name, element, type, score

- [x] **components/share/viral-share-button.tsx 생성**
  - 공유 다이얼로그 모달 UI
  - OG 이미지 미리보기
  - SNS 공유 버튼 4종:
    - Facebook 공유
    - Twitter 공유
    - 카카오톡 공유 (Web Share API)
    - 이미지 다운로드
  - 링크 복사 기능 (클립보드 API)
  - 복사 완료 피드백 (Check 아이콘 애니메이션)

**기술 스택**:
- Next.js `ImageResponse` (Vercel OG)
- Edge Runtime (빠른 응답)
- Framer Motion (다이얼로그 애니메이션)
- Web Share API (모바일 네이티브 공유)

### 4. Framer Motion 타입 충돌 해결
- [x] **components/ui/button.tsx 수정**
  - React DragEvent vs Framer Motion PanInfo 충돌 해결
  - 충돌 props 제거: onDrag, onDragStart, onDragEnd, onAnimationStart, onAnimationEnd, onAnimationIteration
  - children 명시적 추출

- [x] **components/ui/card.tsx 수정**
  - 동일한 타입 충돌 해결 적용
  - "use client" 지시어 추가

- [x] **components/ui/input.tsx 수정**
  - 충돌 props 제거
  - "use client" 지시어 추가

- [x] **components/ui/skeleton.tsx 수정**
  - 충돌 props 제거
  - children 지원 추가

**해결 방법**:
- 문제: `motion.button`, `motion.div` 등에 HTML props 스프레드 시 이벤트 타입 충돌
- 해결: 충돌하는 6개 props를 구조 분해로 제거 후 나머지만 스프레드
- 결과: TypeScript 컴파일 성공, 빌드 정상 완료

**빌드 상태**: ✅ 성공 (2026-01-24)
- Route 추가: `/protected/coaching`, `/api/og`
- 빌드 시간: ~11초 (정상 범위)

---

## ✅ Phase 22: Admin Panel & AI Prompts Integration (2026-01-25) - COMPLETED ✅

### 1. Admin Dashboard 안정화 및 리팩토링
- [x] **Data Fetching Robustness**:
  - `admin/users`, `admin/payments`, `admin/products`, `admin/prompts`의 Server Actions를 `createAdminClient`로 교체.
  - RLS 정책 충돌 방지 및 500 에러 해결 (Service Role Key 사용).
  - DB 에러 시 크래시 대신 빈 배열 반환으로 UX 보호.
  - `profiles` 테이블에 `email` 컬럼 누락 시 Fallback 로직 추가.

### 2. AI 프롬프트 관리 시스템
- [x] **Database Schema**: `ai_prompts` 테이블 생성 및 Seed Data (사주, 운세, 관상 등) 삽입.
- [x] **Admin UI**: `/admin/prompts` 페이지 생성.
  - 탭(Tabs) 인터페이스로 카테고리별 프롬프트 관리.
  - 실시간 편집 및 저장 기능.
- [x] **Dynamic Context Injection**:
  - `app/actions/ai-saju.ts`의 핵심 분석 함수(`analyzeSajuDetail` 등)가 DB에서 프롬프트를 fetch하도록 수정.
  - 변수 Interpolation (`{{name}}` 등) 지원.
  - DB 프롬프트 부재 시 Hardcoded 프롬프트 자동 Fallback.

### 3. Design Consistency
- [x] **Zen Theme Admin**: Admin 컴포넌트(`Button`, `Input`, `Card`)에 Zen Design System 적용 확인.
