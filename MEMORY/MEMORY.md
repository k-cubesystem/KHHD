# 해화당 프로젝트 메모리 v6.0

## 서비스 개요

- **해화당**: 사주/궁합/관상/풍수 AI SaaS
- **배포**: Vercel (Next.js App Router)
- **DB**: Supabase PostgreSQL + RLS

## 기술 스택

- **프레임워크**: Next.js 16.1.4 App Router
- **백엔드**: Supabase (Auth + DB + Edge Functions)
- **AI**: Gemini PRO (`gemini-3.1-pro-preview`) / FLASH (`gemini-3-flash-preview`)
  - PRO: saju, cheonjiin, image, compatibility
  - FLASH: shaman-chat, fortune-analysis, trend, wealth, year2026, daily, invite, engine
- **결제**: Toss Payments (SDK v2)
- **UI**: Shadcn/ui + Tailwind + Framer Motion (분석 페이지만)
- **모니터링**: Sentry + Google Analytics

## 복채(포인트) 시스템

| 플랜     | 일일 한도 |
| -------- | --------- |
| SINGLE   | 10만      |
| FAMILY   | 30만      |
| BUSINESS | 100만     |

## 주요 경로

```
app/actions/
  ai/        # saju, cheonjiin, compatibility, fortune-analysis, image, shaman-chat 등
  admin/     # dashboard, monitoring
  payment/   # wallet, subscription, attendance, products
  user/      # destiny, family, history, referral, free-quota
  fortune/   # fortune
  core/      # notification, business-inquiry
lib/saju-engine/   # 사주 엔진, 궁합 엔진, 운 계산기
lib/config/        # ai-models.ts (AI 모델 상수)
components/        # Shadcn 기반 UI 컴포넌트
supabase/functions/ # Edge Functions (11개)
```

## 환경변수 (핵심)

- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini API (통일)
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_GA_ID`

## 완료된 Phase

- **A** 안정화 (웹훅 서명, RLS, 환경변수 통일, Stitches 제거)
- **B** 리텐션 (카카오 알림톡, OG 이미지, 레퍼럴, PWA)
- **C** AI 고도화 (유명인 궁합, 샤먼 채팅 DB, 세운/월운, 관상/풍수 확장)
- **D** 수익 최적화 (페이월, 복채 유도 모달, 멤버십 넛지, B2B 페이지)
- **E** 스케일링 일부 (Gemini 캐싱, 이미지 최적화, 모니터링 대시보드, DB 인덱스 23개, E2E 테스트, Edge Functions)

## 남은 작업

- **E6**: 다국어 i18n (영어/일본어)
