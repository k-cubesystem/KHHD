# 팀 구조 (11팀) — 필요 시에만 참조

| 팀 | 역할 | 에이전트 | 시점 |
|---|---|---|---|
| G 설계 | PRD + 아키텍처 | ARCHITECT, PRD_MASTER | 제일 먼저 |
| H 보안 | OWASP + 위협 모델링 | SEC_ARCHITECT, PENTESTER, COMPLIANCE | 설계 후 / 배포 전 |
| A 기획 | 티켓, SEO, 카피 | POET, VIRAL | 설계 후 |
| B 프론트 | UI, 상태, 성능 | FE_LOGIC, FE_VISUAL, PERF_HACKER | 개발 |
| C 백엔드 | API, DB, 비용 | BE_SYSTEM, DB_MASTER, DATA_OPS, FIN_OPS | 개발 |
| D QA | 테스트, 배포, 인프라 | SRE_MASTER, SHERLOCK | 개발 후 |
| E 관리 | 전체 조율 | — | 상시 |
| F AI | LLM, 프롬프트, RAG | ALCHEMIST | 상시 |
| I 리뷰 | PR 리뷰, 기술 부채 | CODE_REVIEWER, DEBT_HUNTER, REFACTOR_LEAD | PR 전 |
| J 데이터 | KPI, A/B, 파이프라인 | PIPELINE, BI_ANALYST, AB_SCIENTIST | 런치 후 |
| K DX | 문서, CI/CD, 온보딩 | DOC_WRITER, AUTOMATION, ONBOARDING | 상시 |

## 파일 규칙
| 유형 | 경로 |
|---|---|
| PRD | `TEAM_G_DESIGN/prd/PRD-[이름]-v1.md` |
| 아키텍처 | `TEAM_G_DESIGN/architecture/ARCH-[이름]-v1.md` |
| 보안 취약점 | `TEAM_H_SECURITY/reports/VULN-NNN.md` |
| 코드 리뷰 | `TEAM_I_REVIEW/reviews/REVIEW-NNN.md` |
| 기술 부채 | `TEAM_I_REVIEW/debt/DEBT-REGISTER.md` |
| 데이터 리포트 | `TEAM_J_DATA/reports/DATA-REPORT-YYYYMMDD.md` |
