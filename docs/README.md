# 📚 Haehwadang Documentation

**프로젝트**: 청담 해화당 - AI 기반 사주명리 플랫폼
**최종 업데이트**: 2026-02-03
**정리 담당**: Claude Sonnet 4.5

---

## 🗂️ 문서 구조

```
docs/
├── README.md                       ← 이 파일
├── COMPLETED_WORK.md              ✨ 완료된 작업 종합 정리 (필독!)
├── API_REFERENCE.md               📖 서버 액션 API 문서 (50+ functions)
├── COMPONENT_GUIDE.md             🎨 컴포넌트 가이드 (33 examples)
├── USER_GUIDE.md                  👤 사용자 가이드 (30 FAQ)
├── DEVELOPER_ONBOARDING.md        🚀 개발자 온보딩
├── TASKS/
│   ├── LANDING_PAGE_REFRESH.md    📋 현재 작업 대기 중
│   └── COMPLETED/                 ✅ 완료된 작업 아카이브 (12 files)
├── AI_GUIDES/
├── PLANNING/
├── ARCHITECTURE/
├── REPORTS/
└── USER_GUIDES/
```

---

## ⭐ 핵심 문서 (필독)

### 1. 📄 COMPLETED_WORK.md
**완료된 작업 종합 정리 - 반드시 먼저 읽으세요!**

**포함 내용**:
- ✅ Phase 14: UX Pro Max 리팩토링 (4개 기능 + 4개 문서)
- ✅ Saju Hub Restructure: The Destiny Library 컨셉
- ✅ Mobile-Only Design Enforcement (480px 고정폭)
- 📊 빌드 상태 및 기술 스택
- 🎯 다음 단계 제안

**읽어야 할 사람**: 모든 팀원

---

### 2. 📖 API_REFERENCE.md
**서버 액션 API 레퍼런스 (15 pages)**

**포함 내용**:
- 50+ Server Action 함수 문서
- 파라미터 타입, 반환값, 예시 코드
- Supabase RPC 함수 목록
- 카테고리: 사주 분석, 가족 관리, 궁합, AI, 결제, 멤버십, 지갑

**읽어야 할 사람**: 백엔드 개발자, 프론트엔드 개발자

---

### 3. 🎨 COMPONENT_GUIDE.md
**컴포넌트 사용 가이드 (20 pages)**

**포함 내용**:
- 33개 컴포넌트 예시
- UX Pro Max 디자인 패턴
- Before/After 비교
- 애니메이션 가이드 (Framer Motion)

**읽어야 할 사람**: 프론트엔드 개발자, UI/UX 디자이너

---

### 4. 👤 USER_GUIDE.md
**사용자 가이드 (12 pages)**

**포함 내용**:
- 멤버십 플랜 설명 (싱글/패밀리)
- 부적 크레딧 시스템
- 사주 용어 해석 (천간, 지지, 오행)
- 30개 FAQ
- 전체 기능 설명

**읽어야 할 사람**: CS 팀, 마케팅 팀, QA, PM

---

### 5. 🚀 DEVELOPER_ONBOARDING.md
**개발자 온보딩 가이드 (15 pages)**

**포함 내용**:
- 로컬 환경 설정 (Node.js, npm, Git)
- 환경 변수 목록
- Supabase 마이그레이션 가이드
- Vercel 배포 프로세스
- Troubleshooting FAQ

**읽어야 할 사람**: 신규 개발자, DevOps

---

## 📋 작업 현황

### ✅ 최근 완료 작업 (2026-02-03)

| 작업 | 내용 | 파일 위치 |
|------|------|----------|
| **Phase 14 완료** | 관상 분석, 대운 그래프, 궁합 매트릭스, lunar-javascript 강화 | `TASKS/COMPLETED/PHASE14_*` |
| **Saju Hub** | The Destiny Library 컨셉, 4개 스토리 카드 | `TASKS/COMPLETED/SAJU_HUB_*` |
| **Mobile-Only** | 480px 고정폭, lg: 프리픽스 제거 | `TASKS/COMPLETED/MOBILE_ONLY_*` |
| **Documentation** | API, Component, User, Developer 문서 작성 | 루트 디렉토리 |

### 🔄 진행 대기 중

| 파일 | 내용 | 상태 |
|------|------|------|
| `TASKS/LANDING_PAGE_REFRESH.md` | 랜딩 페이지 리프레시 | 대기 중 |

---

## 🛠️ 기술 스택

### Frontend
- Next.js 16.1.4 (Turbopack, App Router)
- TypeScript (strict mode)
- Tailwind CSS (UX Pro Max)
- Framer Motion
- Recharts

### Backend
- Supabase (PostgreSQL, Auth, Storage)

### AI & Services
- Gemini Vision API
- lunar-javascript
- Toss Payments

---

## 🚀 Quick Start

### 새로운 개발자
1. 📖 [`COMPLETED_WORK.md`](./COMPLETED_WORK.md) 읽기
2. 🚀 [`DEVELOPER_ONBOARDING.md`](./DEVELOPER_ONBOARDING.md) 따라하기
3. 📖 [`API_REFERENCE.md`](./API_REFERENCE.md) 숙지
4. 🎨 [`COMPONENT_GUIDE.md`](./COMPONENT_GUIDE.md) 참고

### 로컬 개발
```bash
npm install
npm run dev
# http://localhost:3000
```

### 프로덕션 빌드
```bash
npm run build
npm run start
```

---

## 📂 주요 디렉토리

### 🤖 AI_GUIDES
AI 협업 가이드 (Claude, Gemini)

### 📋 PLANNING
프로젝트 기획 및 전략

### 🏗️ ARCHITECTURE
시스템 설계 및 아키텍처

### 📊 REPORTS
프로젝트 진행 보고서 및 로그

### 📖 USER_GUIDES
사용자 및 테스트 가이드

---

## 🔄 최근 업데이트

- **2026-02-03**: Phase 14 완료, Saju Hub 재구성, Mobile-Only 적용 (Claude)
- **2026-02-03**: 문서 4종 작성 (API, Component, User, Developer)
- **2026-01-24**: 문서 구조 카테고리별 재정리 (Claude)
- **2026-01-23**: Phase 14 UX Pro Max & AI 고도화 완료 (Gemini + Claude)

---

## 📞 문의

**프로젝트 관리**: GitHub Issues
**문서 피드백**: docs@haehwadang.com

---

**문서 관리자**: Claude Sonnet 4.5
**버전**: 1.0.0
