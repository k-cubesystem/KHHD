# 🏗️ Haehwadang Design Renewal Strategy

## 1. 프로젝트 개요
- **목표**: 혜화당(Haehwadang) 앱을 '동양적 신비로움'과 '현대적 고급스러움'이 공존하는 프리미엄 사주/운세 플랫폼으로 리뉴얼.
- **핵심 가치**: 신뢰감(Trust), 신비로움(Mystical), 편안함(Comfort).
- **타겟 유저**: 삶의 방향을 찾고자 하는 2040 현대인, 프리미엄 상담을 원하는 VIP 고객.

## 2. 현황 분석
- **현재 상태**: Next.js + Tailwind CSS 기반. 기본적인 골격은 갖춰져 있으나, 디자인 통일성과 브랜드 아이덴티티가 부족함.
- **개선점**:
  - `globals.css`에 정의된 'Hanji Glassmorphism'이 컴포넌트 레벨까지 일관되게 적용되지 않음.
  - 폰트와 컬러 시스템이 명확하지 않아 시각적 위계가 약함.
  - 반응형 및 모바일 최적화 필요.

## 3. 디자인 리뉴얼 전략 (The "Modern Oriental" Approach)

### A. 디자인 시스템 구축 (Design System)
- **컬러 팔레트**: 
  - **Primary**: Deep Ink (먹물색, #1C1C1E) & Yugi Gold (유기 그릇 금색, #D4AF37).
  - **Secondary**: Hanji White (한지색, #F5F5F0) & Jade Green (비취색, 포인트).
  - **Background**: Noise Texture가 은은하게 깔린 Dark Paper 질감.
- **타이포그래피**: 
  - **국문**: Noto Serif KR (명조, 진지함/신뢰) - 제목용.
  - **영문/UI**: Inter or Pretendard (고딕, 가독성) - 본문/UI용.
- **질감(Texture)**: CSS Filter를 활용한 '디지털 한지' 질감 구현.

### B. UX/UI 핵심 개선
1.  **몰입형 사주 분석 경험**:
    - 사주 결과를 단순히 텍스트로 나열하지 않고, 인터랙티브한 카드와 차트로 시각화.
    - 스크롤에 따라 운세가 풀리는 스토리텔링형 UI.
2.  **직관적인 네비게이션**:
    - 복잡한 명리 용어를 아이콘화하여 진입 장벽 낮춤.
    - 하단 탭바(Mobile) 및 미니멀 사이드바(Desktop) 적용.
3.  **감성적 마이크로 인터랙션**:
    - 버튼 클릭 시 묵직한 타격감(Haptic/Visual).
    - 로딩 시 붓글씨가 써지는 듯한 애니메이션.

## 4. 기술적 실행 계획 (Technical Plan)
- **Framework**: Next.js App Router 유지.
- **Styling**: Tailwind CSS + CSS Variables (Theme Switching 용이성 확보).
- **Animation**: Framer Motion (복잡한 인터랙션), Tailwind Animate (기본 효과).
- **Assets**: SVG 아이콘 (Lucide React), AI 생성 이미지 (동양화 스타일).

## 5. 단계별 로드맵
1.  **Phase 1: Foundation** - `globals.css` 재정비, 폰트/컬러 변수 확정, 기본 UI 컴포넌트(Button, Card, Input) 제작. ✅
2.  **Phase 2: Core Layout** - 메인 레이아웃, 네비게이션, GNB/Footer 구현. ✅
3.  **Phase 3: Key Pages** - 메인 홈, 사주 입력 폼, 결과 페이지 리뉴얼. ✅
4.  **Phase 4: Polish** - 애니메이션 추가, 반응형 디테일 수정, 성능 최적화. ✅
5.  **Phase 5-10**: Auth, Payments, Admin, AI Integration. ✅
6.  **Phase 11**: AI 개운 솔루션 (관상/풍수 이미지 생성). ✅
7.  **Phase 12**: Wallet & Dynamic Pricing System. ✅
8.  **Phase 13**: 멤버십 구독 시스템 (Toss Payments 빌링키). ✅
9.  **Phase 14**: UX Pro Max 리팩토링 & 디자인 시스템 확장. 🔄 진행 중

---

## 6. Phase 14: UX Pro Max 리팩토링 (Current)

### 목표
- UX Pro Max Skill 적용으로 프리미엄 사용자 경험 구현
- TUI(Tangible User Interface) 철학 적용
- 모바일 네비게이션 완전 개선

### 주요 작업
1. **디자인 시스템 확장**: Gold Palette 확장 (100~900), Glassmorphism 유틸리티
2. **애니메이션 표준화**: Framer Motion 표준 정의 (`lib/animations.ts`)
3. **컴포넌트 리팩토링**: Button Shimmer, Card Depth, Input Focus Ring
4. **모바일 UX**: 햄버거 메뉴 44x44px, AnimatePresence 적용
5. **배경 효과**: "The Orb Pattern" 구현

### 협업 구조
- **Gemini**: 디자인 시스템, 컴포넌트 리팩토링, 모바일 UX (Task 1-20)
- **Claude**: AI 기능 고도화, 문서 작성 (별도 작업)

### 상세 문서
→ `/docs/TASKS/PHASE14_UX_REFACTORING.md`
