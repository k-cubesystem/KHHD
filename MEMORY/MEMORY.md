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

| 날짜       | 팀          | 완료 내용                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 산출물                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-13 | 세션16      | 상담포맷 조사(4분야)→풀이 프롬프트 v2 8종 재작성·DB 적용 (파서 정합 수복 포함)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | docs/REPORTS/RESEARCH-counseling-formats-20260713.md, supabase/migrations/ai/20260713_prompts_v2_counseling.sql                                                                                                                                                                                                                         |
| 2026-07-13 | 세션16      | 오행 수호 정령 5인 아바타 (가족 선택기 교체 + 프로필 직접선택 3모드)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | components/family/five-avatar-selector.tsx, public/avatars/five/                                                                                                                                                                                                                                                                        |
| 2026-07-13 | 세션16      | 어드민 내부용 3종 제거(prompts·saju-engine·ai-models), getPromptByKey→lib/ai/prompt-loader                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | lib/ai/prompt-loader.ts                                                                                                                                                                                                                                                                                                                 |
| 2026-07-17 | 세션19      | 가족별 신당 P1 (대상 탭·가족 자동좌정 강신·인연 신당별 스코프·고민상담 가족 페르소나)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | supabase/migrations/20260717_family_shrines.sql, components/shrine/ShrineTargetTabs.tsx·FamilySummonGate.tsx                                                                                                                                                                                                                            |
| 2026-07-17 | 세션19      | 채팅 보존 정책 (무료30/S90/F180/B365, 원문만 삭제·요약/기억 영구, 일일 cron)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | supabase/migrations/20260717_chat_retention.sql, app/api/cron/chat-retention/route.ts                                                                                                                                                                                                                                                   |
| 2026-07-17 | 세션19      | 통합 상점 4탭(충전·멤버십·테마·신물) + 테마 8종 + 테마칩 즉시구매 + 프로필 멤버십→상점                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | app/protected/store/page.tsx, components/store/ThemeShopGrid.tsx, supabase/migrations/20260717_theme_packs_8.sql                                                                                                                                                                                                                        |
| 2026-07-17 | 세션19      | 기억의 함(unlock_effect 1호, 배치당 보존+90일 max2) + 고민상담 지난 대화 열람 패널                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | supabase/migrations/20260717_memory_chest_unlock.sql, components/ai/shaman-chat-interface.tsx                                                                                                                                                                                                                                           |
| 2026-07-18 | 세션20      | 어드민 콘솔 전수 분석(12메뉴) — 룰렛·기능별복채 삭제, 알림 status 버그 수정, 로드맵 v1.1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | TEAM_G_DESIGN/prd/PLAN-improvement-roadmap-v1.md §A                                                                                                                                                                                                                                                                                     |
| 2026-07-18 | 세션20      | 어드민 A2/A3/A6 — 대시보드 집계 RPC·잔액 증감+사유+감사·admin_audit_log 뷰어 + 회원상세 404 수정                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | app/admin/page.tsx, app/admin/audit/, lib/admin/audit.ts, supabase/migrations/20260718*admin*\*.sql                                                                                                                                                                                                                                     |
| 2026-07-18 | 세션21      | P1-7 만료 D-7 예고→기억함 업셀 + 알림 센터(구 404 링크 수복) + P2-9 테마 방 이미지 4종                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | supabase/migrations/20260718_chat_expiry_notice.sql, app/protected/notifications/, scripts/shrine-assets/generate-themes.mjs                                                                                                                                                                                                            |
| 2026-07-18 | 세션21      | 어드민 A4·A5·A7 — 회원상세 복채내역·신당 탭, 공지→전회원 알림 발송, 룰렛 죽은코드 3종 삭제                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | app/admin/users/, app/actions/guide.ts, app/admin/announcements/                                                                                                                                                                                                                                                                        |
| 2026-07-18 | 세션21      | P2-10 가이드 진행률 서버저장·온보딩 + P2-11 배치효험 4종(향로·초롱·놋방울·복부적)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | lib/services/shrine-effects.ts, supabase/migrations/20260718_guide_progress.sql·unlock_effects_2to4.sql                                                                                                                                                                                                                                 |
| 2026-07-18 | 세션21      | P0-1 헬스체크 Sentry 경보(필수 RPC 22종 대조) + P0-2 프로덕션 스모크 자동화(GitHub Actions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | app/api/cron/health/route.ts, .github/workflows/prod-smoke.yml, supabase/migrations/20260718_check_missing_rpcs.sql                                                                                                                                                                                                                     |
| 2026-07-19 | 세션22      | 로드맵 7·8 일괄 — 세션검색·기운보정배선·무료신패키지·가족신당공개·결제퍼널·언어전환배선                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | lib/services/membership-deity.ts, lib/domain/chat/constants.ts, supabase/migrations/20260719\_\*.sql                                                                                                                                                                                                                                    |
| 2026-07-19 | 세션23      | P2-13 완결 — 관상·손금 오행형 태그 → 기운 보정 저장·적용 + i18n 상점 화면 완결(22키 ko/en)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | lib/domain/shrine/element-form.ts, lib/services/element-profile.ts, supabase/migrations/20260719_element_form_tag.sql                                                                                                                                                                                                                   |
| 2026-07-19 | 세션23      | 마스터 무제한 권한 통합(privileges.ts) + 깨진 RPC 3종 수복 + 헬스체크 실호출 스모크 11종 추가                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | lib/auth/privileges.ts, supabase/migrations/20260719_fix_family_missions_types.sql·fix_admin_dashboard_rpcs.sql                                                                                                                                                                                                                         |
| 2026-07-20 | 세션24      | 가이드 우하단 아바타 → 하단 공지 바(채팅 입력창 겹침 해소) + 우리 가족 기운 지도(로드맵 13 완결)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | components/guide/GlobalGuide.tsx, app/protected/family/map/, lib/domain/shrine/energy-map.ts                                                                                                                                                                                                                                            |
| 2026-07-21 | 세션25      | 궁합 관계별 개편(8 FocusGroup·focusAnswers·8대 쉬운풀이·siblings 가중치·v3 캐시) + 분석기록 신뢰성(관상·손금·풍수·사업궁합 저장 배선·관측화·공용 뷰·재분석 404 교정·카카오 배선·죽은시드/레거시 정리)                                                                                                                                                                                                                                                                                                                                                                                    | lib/domain/compatibility/focus-groups.ts, lib/ai/prompts/compatibility.ts, components/analysis/CategoryResultBody.tsx, app/actions/ai/image.ts, lib/domain/analysis/reanalyze-routes.ts                                                                                                                                                 |
| 2026-07-21 | 세션25 후속 | 히스토리 날짜 KST 고정 포맷(formatKstDateTime, UTC+9 결정적) — 하이드레이션 #418 해소 + 프로드 스펙 #418 필터 제거(pageerror 0 게이팅 복원) + 프로덕션 배포·e2e 그린 검증                                                                                                                                                                                                                                                                                                                                                                                                                | lib/utils.ts, components/history/analysis-card.tsx·detail-modal.tsx, e2e/prod/history.spec.ts, lib/\_\_tests\_\_/utils.test.ts                                                                                                                                                                                                          |
| 2026-07-21 | 세션26      | 미디어·TTS·비용계측 — Gemini 비용계측 P0 수복(logUsage→createAdminClient, RLS 위반 해소, gemini_api_logs **14→15** 신규 shaman_chat 행 실증) + 전기능 중앙계측(generateAIContent·직접호출 3곳)·actionType 표준화 + 이미지 장당 단가($0.067 Google 공식)·estimateCostUsd 이미지 분기 + 어드민 기능별 비용 차트·원가vs복채 테이블 / 신위별 TTS 5원형 프로파일(Web Speech 무료) / 실음원 레이어(합성 폴백)+전역음소거+효과음 2곳 / AmbientVideo(폴백)+Veo 파이프라인(dry-run 예상 $1.00, higgsfield 스텁)                                                                                   | lib/domain/gemini/{actions,pricing}.ts, lib/services/gemini-rate-limiter.ts·ai-client.ts, components/admin/gemini-usage-dashboard.tsx, lib/domain/shrine/voice-profiles.ts, components/shrine/scene/useShrineAudio.ts, components/shared/AmbientVideo.tsx, scripts/media-assets/                                                        |
| 2026-07-21 | 세션27      | Veo 영상 2편 생성·배치($0.80, webm 800KB) + edge-tts 뉴럴 TTS(/api/tts, 신위별 실보이스) + 텍스트 단가 20배 보정                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | public/videos/, app/api/tts/route.ts, lib/domain/gemini/pricing.ts, e2e/prod/tts-media.spec.ts                                                                                                                                                                                                                                          |
| 2026-07-22 | 세션28      | 디테일 신뢰·재미(PLAN-detail-trust-fun, R1→F2 배포·회귀0실패) — R1 복채 단일소스(feature-costs.ts, 표시=실차감)·AI실패 환불(refundBokchae/refundStudioCost)·"구매"→"봉헌"·ai_prompts 시드정정 / R2 음력 윤달(is_leap_month·Lunar 음(-)월·골든테스트 만세력검증)·출생시간모름·서버기본값 12:00 / R3 명식스트립·면책고지·오펀삭제·#418필터제거 / F 신탁알림·오너소원·강신영상·보상연출·파티클3종·오늘의정성 허브·운세 결정적파생(daily-lucky.ts)·테마 N/8. ⚠️가족 윤달저장은 family.ts 보호로 보류                                                                                         | lib/domain/payment/feature-costs.ts, lib/domain/fortune/daily-lucky.ts, components/analysis/{PillarsStrip,dashboard/DailyRitualCard}.tsx, app/actions/{fortune/daily-ritual,payment/wallet}.ts, supabase/migrations/20260722\_\*.sql                                                                                                    |
| 2026-07-22 | 세션29      | 디테일 v2(PLAN-detail-v2-manse-family-knowledge, V1→V4 배포) — V1 가족관리(본인 목록·지도 숨김, "가족·인연 관리" 라벨, avatars.ts 정령5+신위17 통합·2구획 선택, 지도 오행 접이식·한글병기) / V2 지식팁(knowledge-tips.ts 44개·날짜결정적, GlobalGuide 'knowledge' Bubble 전페이지 바 유지·회전) / V3 사주영상(analysis-ambient 로딩배경·天→地 디바이더·크로스페이드, $0) / V4 명식(13엔진 useMemo, AdvancedManseDisplay 제거로 중복5종 일소·개운법 색방위직업·신살 중복제거, 지장간 신설·설명보강, 죽은코드 삭제, golden 253/253 불변). ⚠️membership.ts 관계한도 count는 보호파일로 보류 | lib/domain/family/avatars.ts, lib/domain/guide/knowledge-tips.ts, components/{family/five-avatar-selector,family/FamilyEnergyMap,guide/GlobalGuide}.tsx, app/protected/{family/family-page-client,profile/manse/manse-client,analysis/saju-result/saju-result-client}.tsx, app/actions/shrine/energy-map.ts                             |
| 2026-07-22 | 세션30      | 디테일 v3(PLAN-detail-v3, W-A→W-E 배포·회귀0실패, 세션한도 중단분 Fable 이어받아 완주) — W-A 가족 아바타 직접클릭→편집·신당 탭 '본인' 중복제거(.neq relationship 본인) / W-B 프로필 오늘의운세 제거·바로가기 상향·축소 / W-C 접힘 가이드바 흐르는 상식 마퀴(guide-marquee, 자동노출 접힘 기본) / W-D 소원 shrine_wishes.family_member_id 가족별 분리 / W-E analysis-ambient 재사용 studio공용·신년·재물 배경($0). ⚠️덤: notifications 시각 KST 미고정 #418 하이드레이션(세션28 history 자매버그, F-1 알림데이터로 발현) → formatKstShort 로 수정                                         | app/protected/{profile/page,notifications/notifications-client,shrine/page,analysis/{new-year/page,wealth/wealth-analysis-content}}.tsx, components/{guide/GlobalGuide,family/member-mission-card,studio/analyzing-animation,shrine/scene/ShrineWishForm}.tsx, lib/utils.ts, supabase/migrations/20260722_shrine_wish_family_member.sql |

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
