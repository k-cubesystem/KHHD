# 🛠️ SHARED — 기술 스택 정의 v3.0

> 관리: TEAM_A_PM (확정) | TEAM_E_MGMT (버전 관리)
> PRIME 시스템 기본 스택 — 프로젝트별 수정 가능

---

## 프론트엔드 (TEAM_B)

| 구분 | 기술 | 담당 에이전트 |
|---|---|---|
| 프레임워크 | Next.js 14 (App Router) | FE_LOGIC |
| 언어 | TypeScript | FE_LOGIC |
| 상태관리 | Zustand | FE_LOGIC |
| 서버 상태 | React Query (TanStack) | FE_LOGIC |
| 스타일링 | Tailwind CSS | FE_VISUAL |
| 애니메이션 | Framer Motion | FE_VISUAL |
| 이미지 최적화 | next/image + WebP/AVIF | PERF_HACKER |
| 번들 분석 | @next/bundle-analyzer | PERF_HACKER |

## 백엔드 (TEAM_C)

| 구분 | 기술 | 담당 에이전트 |
|---|---|---|
| 프레임워크 | Next.js API Routes / Node.js | BE_SYSTEM |
| 언어 | TypeScript | BE_SYSTEM |
| 인증 | NextAuth.js / Supabase Auth | BE_SYSTEM |
| 데이터베이스 | Supabase (PostgreSQL) | DB_MASTER |
| ORM | Prisma | DB_MASTER |
| 캐싱 | Redis (Upstash) | DB_MASTER + FIN_OPS |
| 파일 스토리지 | Cloudflare R2 / AWS S3 | BE_SYSTEM |
| 트래킹 | Mixpanel + GA4 | DATA_OPS |

## 인프라 & 배포 (TEAM_D)

| 구분 | 기술 | 담당 에이전트 |
|---|---|---|
| 호스팅 | Vercel | SRE_MASTER |
| CDN | Cloudflare | SRE_MASTER |
| 모니터링 | Sentry | SHERLOCK |
| CI/CD | GitHub Actions | SRE_MASTER |
| 비밀 관리 | Vercel Env / Doppler | SRE_MASTER |

## AI / LLM (TEAM_F)

| 구분 | 기술 | 담당 에이전트 |
|---|---|---|
| LLM API | Anthropic Claude / OpenAI | ALCHEMIST |
| 벡터 DB | Supabase pgvector | ALCHEMIST |
| 스트리밍 | Vercel AI SDK | ALCHEMIST |
| 임베딩 | OpenAI text-embedding-3 | ALCHEMIST |

---

> 📌 프로젝트별 스택이 다를 경우 이 파일을 수정하고 TEAM_E에 변경 사항을 보고하세요.

*버전: v3.0 | 관리: TEAM_A_PM*
