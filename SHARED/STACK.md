# 해화당 기술 스택 상세

## 프론트엔드

| 항목          | 버전/상세                   |
| ------------- | --------------------------- |
| Next.js       | 16.1.4 (App Router)         |
| React         | 18.x                        |
| TypeScript    | strict mode                 |
| Tailwind CSS  | v3                          |
| Shadcn/ui     | 컴포넌트 라이브러리         |
| Framer Motion | 분석 페이지 애니메이션 전용 |
| Recharts      | 모니터링 대시보드 차트      |

## 백엔드 / 인프라

| 항목                    | 상세                                     |
| ----------------------- | ---------------------------------------- |
| Supabase                | PostgreSQL + Auth + RLS + Edge Functions |
| Vercel                  | 배포 (Edge Runtime 지원)                 |
| Supabase Edge Functions | 11개 (Deno 런타임)                       |

## AI

| 모델 상수         | 실제 모델                | 용도                           |
| ----------------- | ------------------------ | ------------------------------ |
| `AI_MODELS.PRO`   | `gemini-3.1-pro-preview` | 사주, 천지인, 이미지, 궁합     |
| `AI_MODELS.FLASH` | `gemini-3-flash-preview` | 채팅, 운세, 트렌드, 재물, 일일 |

## 결제

- **Toss Payments SDK v2**: 카드사 선택 화면 + 간편결제
- 웹훅 서명 검증: `timingSafeEqual`
- 복채(포인트): SINGLE 10만 / FAMILY 30만 / BUSINESS 100만 (일일 한도)

## 외부 서비스

| 서비스           | 용도          | 환경변수                                      |
| ---------------- | ------------- | --------------------------------------------- |
| Solapi           | 카카오 알림톡 | `SOLAPI_*`                                    |
| Sentry           | 에러 모니터링 | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |
| Google Analytics | 사용자 분석   | `NEXT_PUBLIC_GA_ID`                           |

## 테스트

- **E2E**: Playwright (15개 스펙)
- 스크립트: `npm run e2e`, `npm run e2e:ui`, `npm run e2e:headed`

## PWA

- `public/sw.js`: 서비스워커
- `public/offline.html`: 오프라인 페이지
