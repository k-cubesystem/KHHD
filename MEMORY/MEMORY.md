# 🧠 MEMORY — 프로젝트 컨텍스트 기억 시스템

> **이 파일은 세션이 바뀌어도 프로젝트의 맥락이 유지되도록 합니다.**
> 에이전트는 작업 전 이 파일을 읽고, 작업 후 내용을 업데이트합니다.
> 버전: v4.1 | 관리: 전체 팀 (TEAM_E 총괄)

---

## 🎯 프로젝트 정보

```yaml
프로젝트명: [프로젝트명 기입]
서비스 설명: [한 줄 설명]
타겟 사용자: [누구를 위한 서비스인가]
현재 단계: [아이디어 / 설계 / 개발 / 테스트 / 런치 / 운영]
런치 목표일: [YYYY-MM-DD]
```

---

## 📌 확정된 기술 스택

```yaml
프론트엔드: []
백엔드: []
데이터베이스: []
인증: []
스토리지: []
배포: []
모니터링: []
분석: []
```

> 확정 전: SHARED/STACK.md 초안 참고

---

## ✅ 완료된 주요 작업

| 날짜       | 팀          | 완료 내용                                                                                                                                                                                             | 산출물                                                                                                                                                                                  |
| ---------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-13 | 세션16      | 상담포맷 조사(4분야)→풀이 프롬프트 v2 8종 재작성·DB 적용 (파서 정합 수복 포함)                                                                                                                        | docs/REPORTS/RESEARCH-counseling-formats-20260713.md, supabase/migrations/ai/20260713_prompts_v2_counseling.sql                                                                         |
| 2026-07-13 | 세션16      | 오행 수호 정령 5인 아바타 (가족 선택기 교체 + 프로필 직접선택 3모드)                                                                                                                                  | components/family/five-avatar-selector.tsx, public/avatars/five/                                                                                                                        |
| 2026-07-13 | 세션16      | 어드민 내부용 3종 제거(prompts·saju-engine·ai-models), getPromptByKey→lib/ai/prompt-loader                                                                                                            | lib/ai/prompt-loader.ts                                                                                                                                                                 |
| 2026-07-17 | 세션19      | 가족별 신당 P1 (대상 탭·가족 자동좌정 강신·인연 신당별 스코프·고민상담 가족 페르소나)                                                                                                                 | supabase/migrations/20260717_family_shrines.sql, components/shrine/ShrineTargetTabs.tsx·FamilySummonGate.tsx                                                                            |
| 2026-07-17 | 세션19      | 채팅 보존 정책 (무료30/S90/F180/B365, 원문만 삭제·요약/기억 영구, 일일 cron)                                                                                                                          | supabase/migrations/20260717_chat_retention.sql, app/api/cron/chat-retention/route.ts                                                                                                   |
| 2026-07-17 | 세션19      | 통합 상점 4탭(충전·멤버십·테마·신물) + 테마 8종 + 테마칩 즉시구매 + 프로필 멤버십→상점                                                                                                                | app/protected/store/page.tsx, components/store/ThemeShopGrid.tsx, supabase/migrations/20260717_theme_packs_8.sql                                                                        |
| 2026-07-17 | 세션19      | 기억의 함(unlock_effect 1호, 배치당 보존+90일 max2) + 고민상담 지난 대화 열람 패널                                                                                                                    | supabase/migrations/20260717_memory_chest_unlock.sql, components/ai/shaman-chat-interface.tsx                                                                                           |
| 2026-07-18 | 세션20      | 어드민 콘솔 전수 분석(12메뉴) — 룰렛·기능별복채 삭제, 알림 status 버그 수정, 로드맵 v1.1                                                                                                              | TEAM_G_DESIGN/prd/PLAN-improvement-roadmap-v1.md §A                                                                                                                                     |
| 2026-07-18 | 세션20      | 어드민 A2/A3/A6 — 대시보드 집계 RPC·잔액 증감+사유+감사·admin_audit_log 뷰어 + 회원상세 404 수정                                                                                                      | app/admin/page.tsx, app/admin/audit/, lib/admin/audit.ts, supabase/migrations/20260718*admin*\*.sql                                                                                     |
| 2026-07-18 | 세션21      | P1-7 만료 D-7 예고→기억함 업셀 + 알림 센터(구 404 링크 수복) + P2-9 테마 방 이미지 4종                                                                                                                | supabase/migrations/20260718_chat_expiry_notice.sql, app/protected/notifications/, scripts/shrine-assets/generate-themes.mjs                                                            |
| 2026-07-18 | 세션21      | 어드민 A4·A5·A7 — 회원상세 복채내역·신당 탭, 공지→전회원 알림 발송, 룰렛 죽은코드 3종 삭제                                                                                                            | app/admin/users/, app/actions/guide.ts, app/admin/announcements/                                                                                                                        |
| 2026-07-18 | 세션21      | P2-10 가이드 진행률 서버저장·온보딩 + P2-11 배치효험 4종(향로·초롱·놋방울·복부적)                                                                                                                     | lib/services/shrine-effects.ts, supabase/migrations/20260718_guide_progress.sql·unlock_effects_2to4.sql                                                                                 |
| 2026-07-18 | 세션21      | P0-1 헬스체크 Sentry 경보(필수 RPC 22종 대조) + P0-2 프로덕션 스모크 자동화(GitHub Actions)                                                                                                           | app/api/cron/health/route.ts, .github/workflows/prod-smoke.yml, supabase/migrations/20260718_check_missing_rpcs.sql                                                                     |
| 2026-07-19 | 세션22      | 로드맵 7·8 일괄 — 세션검색·기운보정배선·무료신패키지·가족신당공개·결제퍼널·언어전환배선                                                                                                               | lib/services/membership-deity.ts, lib/domain/chat/constants.ts, supabase/migrations/20260719\_\*.sql                                                                                    |
| 2026-07-19 | 세션23      | P2-13 완결 — 관상·손금 오행형 태그 → 기운 보정 저장·적용 + i18n 상점 화면 완결(22키 ko/en)                                                                                                            | lib/domain/shrine/element-form.ts, lib/services/element-profile.ts, supabase/migrations/20260719_element_form_tag.sql                                                                   |
| 2026-07-19 | 세션23      | 마스터 무제한 권한 통합(privileges.ts) + 깨진 RPC 3종 수복 + 헬스체크 실호출 스모크 11종 추가                                                                                                         | lib/auth/privileges.ts, supabase/migrations/20260719_fix_family_missions_types.sql·fix_admin_dashboard_rpcs.sql                                                                         |
| 2026-07-20 | 세션24      | 가이드 우하단 아바타 → 하단 공지 바(채팅 입력창 겹침 해소) + 우리 가족 기운 지도(로드맵 13 완결)                                                                                                      | components/guide/GlobalGuide.tsx, app/protected/family/map/, lib/domain/shrine/energy-map.ts                                                                                            |
| 2026-07-21 | 세션25      | 궁합 관계별 개편(8 FocusGroup·focusAnswers·8대 쉬운풀이·siblings 가중치·v3 캐시) + 분석기록 신뢰성(관상·손금·풍수·사업궁합 저장 배선·관측화·공용 뷰·재분석 404 교정·카카오 배선·죽은시드/레거시 정리) | lib/domain/compatibility/focus-groups.ts, lib/ai/prompts/compatibility.ts, components/analysis/CategoryResultBody.tsx, app/actions/ai/image.ts, lib/domain/analysis/reanalyze-routes.ts |
| 2026-07-21 | 세션25 후속 | 히스토리 날짜 KST 고정 포맷(formatKstDateTime, UTC+9 결정적) — 하이드레이션 #418 해소 + 프로드 스펙 #418 필터 제거(pageerror 0 게이팅 복원) + 프로덕션 배포·e2e 그린 검증                             | lib/utils.ts, components/history/analysis-card.tsx·detail-modal.tsx, e2e/prod/history.spec.ts, lib/\_\_tests\_\_/utils.test.ts                                                          |

---

## 🚧 현재 진행 중

| 팀  | 작업 내용 | 예상 완료 | 블로커 |
| --- | --------- | --------- | ------ |
| —   | —         | —         | —      |

---

## 🧩 핵심 설계 결정 사항 (ADR)

> ADR = Architecture Decision Record
> "왜 이 기술/구조를 선택했는가"를 기록합니다.

| #   | 결정 | 이유 | 날짜 | 재검토 시점 |
| --- | ---- | ---- | ---- | ----------- |
| 001 | —    | —    | —    | —           |

---

## 🐛 알려진 이슈 & 기술 부채

| #   | 유형 | 내용 | 영향도 | 담당팀 | 상태   |
| --- | ---- | ---- | ------ | ------ | ------ |
| —   | —    | —    | —      | —      | 미착수 |

---

## 📋 반복되는 패턴 & 관례

> 이 프로젝트에서 자주 쓰이는 패턴을 기록합니다.
> 새 에이전트가 빠르게 컨텍스트를 잡는 데 사용합니다.

```
[예: API 응답 형식]
{ success: boolean, data: T | null, error: string | null }

[예: 에러 코드 체계]
AUTH_001: 토큰 만료
AUTH_002: 권한 없음
...

[예: 브랜치 전략]
main → 프로덕션
dev  → 통합 개발
feat/[기능명] → 기능 개발
```

---

## 💬 CEO 주요 결정 이력

> CEO가 내린 중요한 의사결정을 기록합니다.
> "왜 이렇게 됐는지"를 나중에 추적하기 위해.

| 날짜 | 결정 내용 | 배경 |
| ---- | --------- | ---- |
| —    | —         | —    |

---

## 📚 참고 문서 인덱스

| 문서            | 경로                          | 최종 수정 |
| --------------- | ----------------------------- | --------- |
| 시스템 아키텍처 | TEAM_G_DESIGN/architecture/   | —         |
| PRD             | TEAM_G_DESIGN/prd/            | —         |
| API 명세        | SHARED/                       | —         |
| 보안 아키텍처   | TEAM_H_SECURITY/architecture/ | —         |
| 스킬 레지스트리 | TEAM_F_SKILLS/registry/       | —         |

---

## 🔄 업데이트 규칙

```
언제 업데이트하는가:
✅ 기술 스택 확정 시 → "확정된 기술 스택" 섹션
✅ 주요 기능 완료 시 → "완료된 주요 작업" 섹션
✅ 설계 결정 시      → "핵심 설계 결정 사항(ADR)" 섹션
✅ 버그 발견 시      → "알려진 이슈 & 기술 부채" 섹션
✅ CEO 결정 시       → "CEO 주요 결정 이력" 섹션

누가 업데이트하는가:
- 각 팀: 자신의 작업 결과를 완료 섹션에 추가
- TEAM_E: 전체 현황 취합 및 관리
```

---

_파일: MEMORY.md | 관리: TEAM_E(총괄) + 각팀(자신 영역) | 버전: v4.1_
