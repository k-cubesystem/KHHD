# 해화당 — 사주/궁합/관상/풍수 AI SaaS

## 세션 재개 — 먼저 읽을 것

**`docs/HANDOFF.md`** 를 읽고 시작한다. 지금 어디까지 왔는지, 이 기기에서 뭘 할 수 있고 뭘 못
하는지(모바일에서는 프로덕션 배포가 안 된다), 손대기 전에 알아야 할 함정이 거기 있다.

⚠️ 세션 체크포인트 훅은 `~/.claude/hhd-session-checkpoint.md` — **그 컴퓨터에만** 있다. 다른
기기·모바일 앱에서는 없으므로 `docs/HANDOFF.md` 가 유일한 인수인계다. 기기를 옮기기 전이나 큰
작업을 마쳤을 때 그 파일을 갱신하고 커밋한다.

## 스택

Next.js 16 + TypeScript strict + Tailwind + Shadcn/ui + Supabase (RLS) + Gemini AI + Toss Payments + Sentry + GA4
AI 모델: 텍스트 PRO/FLASH 모두 gemini-3.8-flash (통일, 2026-09-14 — 정본 `lib/config/ai-models.ts`) / 이미지 gemini-3.1-flash-image-preview

## 명령어

```
npm run dev | build | test | e2e | lint
```

## 인프라 · 배포 (Deploy)

- **프로덕션**: k-haehwadang.com (Vercel 프로젝트 `hhd` / cubesystems-projects). CLI 로그인 지속(pdkno1-cube).
- **⚠️ 배포 브랜치**: 프로덕션은 `claude/determined-yonath` 브랜치에서 나감 — **main엔 신당 2.0이 없음**(브랜치가 main보다 12커밋 앞섬). 메인 체크아웃(main)에서 배포하면 신당 2.0 소실 주의.
  - 배포법: 워크트리에서 메인의 `.vercel/project.json`을 `.vercel/`로 복사 후 `vercel deploy --prod --yes` (원격 빌드, 실패해도 프로덕션 무영향)
- **Supabase**: 프로젝트 `plzvanxcxjkaazcfrtls`. DB·마이그레이션은 MCP(`mcp__supabase__*`). **인증/URL/provider 설정은 MCP에 없음 → Management API** 사용: 토큰은 사용자 환경변수 `SUPABASE_ACCESS_TOKEN`에 상주. 예) `curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" https://api.supabase.com/v1/projects/plzvanxcxjkaazcfrtls/config/auth`
- **OAuth**: Google·Kakao provider 활성화됨. Site URL=`https://k-haehwadang.com`, Redirect URLs=`https://k-haehwadang.com/**`,`http://localhost:3000/**`. (OAuth 앱 최초 생성만 콘솔 전용, 이후 설정 변경은 API로 자동화)
- **로컬 dev**: `.claude/launch.json`의 `dev`(npm run dev, 포트 3000). 로그인 등 로컬 확인 시 필요. 상시 확인은 프로덕션 권장.

## 슬래시 명령어

/design /build /review /security /data /docs /status

**/pipeline** — 기반확인 → 게이트(병렬) → 리뷰(에이전트 4기 병렬) → QA → 디버깅 → 수정 루프 → 배포.
단계는 순서대로, 단계 안은 병렬로. 이 저장소에서 실제로 터진 함정 목록과 배포 규율이 박혀 있다.

## 4중 프로토콜 (모든 코드에 자동 적용)

1. **ZERO-LATENCY**: Optimistic UI, Upload First, Background Submit, Client Compress
2. **COMMERCIALIZATION**: Sentry 에러 추적, GA4 이벤트, 캐싱 필수
3. **SECURITY**: 설계→보안검토→개발→리뷰→보안게이트→배포
4. **CODE QUALITY**: SRP, DRY, any 금지, console.log 단독 금지

## 절대 원칙

- any 타입 금지 → unknown + 타입 가드
- console.log 단독 에러 처리 금지 → logger 사용
- 작업 완료 시 MEMORY/MEMORY.md 업데이트

## 이용권 시스템 (2026-09-18 복채 폐지)

🔴 **복채(냥·만냥, `wallets.balance`)는 폐지됐다.** 토스가 «구독이 잔액형 재화를 지급하는 구조»를 이유로 빌링을
거절했고, 잔액이 남아 있으면 단건결제도 충전업종(보증보험·1회 10만원·1년 기한)에 묶인다. 설계 원문은
`TEAM_G_DESIGN/prd/PRD-voucher-system-v1.md` · `architecture/ARCH-voucher-system-v1.md` (main 체크아웃).

| 상품 | 결제 | 내용 |
| --- | --- | --- |
| 멤버십 싱글/패밀리/비즈니스 | 정기결제(빌링) 12,800 / 29,900 / 99,000원 | 매달 이용권 5 / 15 / 50장(**이월 없음**) + 등급별 기능·한도 |
| 이용권 1 / 5 / 10장 | 일반결제 4,800 / 19,800 / 39,800원 | 유효기간 결제일로부터 90일 · 양도 불가 · 미사용분 환불 |

- **풀이 1회 = 1장**, 재물 심층·종합사주풀이·함께 보기 = 2장. 정본 `lib/domain/payment/feature-costs.ts`(`display` = 장 수).
- **설계의 두 축 — 되돌리지 말 것**: ①잔액 칸이 없다(발급 1건 = `entitlement_grants` 행 1개) ②주머니(멤버십 이번 달 몫 ·
  보유 이용권)를 한 숫자로 합치지 않는다. 정본 `lib/domain/entitlement/pass.ts`.
- **사용은 서버 한 곳**: `chargeFeature`(`lib/services/feature-charge.ts`) → `consumePass` → RPC `ent_consume`(만료 가까운 순,
  모자라면 무동작). 캐시 확인 «뒤», 엣지/AI 호출 «앞». 실패 시 `refundOnFailure`(만료 연장 없음). 관리자·검수는 역할로 통과(`hasPassBypass`).
- **멤버십 결제·갱신은 아무것도 지급하지 않는다** — 월 몫은 `subscription_usage`(구독 시작일 앵커 월 창)로만 센다.
- 등급 차등(회차·한도·기능)의 정본 `lib/domain/payment/membership-tiers.ts` + DB `membership_plans`.
  가족 기운 지도·처방전 = 패밀리부터 · 함께 보기 = 비즈니스 · 신위·테마 = `required_tier`.
- 쓰기는 전부 service_role RPC(`ent_grant`·`ent_consume`·`ent_refund`·`ent_revoke_for_payment`·`ent_admin_adjust`).
  발급·사용 함수를 `'use server'` 파일에서 export 하지 말 것(공개 엔드포인트가 된다).

### 문구 규율 (표시광고법 · 토스 심사)

- 금지어(화면 문구): 복채 · 만냥 · 충전 · 포인트 · 잔액 · 적립 · 환전 · 영구 · 만료 없이 · 무제한 · 평생 보관 · 단일 통화 ·
  Token · 매일(지급) · 모두 이용 · 정액. 정본 `BANNED_PASS_TERMS` — 회귀 테스트가 막는다.
- 🔴 상품 카드 문구의 정본은 DB(`price_plans.features`)다 — 코드만 고치면 화면이 안 바뀐다.
- 속풀이 질문: 멤버십 **주 10문** · 명식 완료 시 1문 · 광고 1문/방문 · 이용권 1장 = 10문(30일). 정본 `lib/domain/chat/entitlements.ts`
- 기록은 개수 상한(`storage_limit`)을 넘기면 오래된 것부터 **자동 삭제**된다 → «평생 보관» 금지.

## 에이전트 (필요 시에만 참조)

상세 → PRIME.md (프로토콜) / AGENTS.md (팀 구조)

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:

- Product ideas, "is this worth building", brainstorming → invoke gstack-office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke gstack-investigate
- Ship, deploy, push, create PR → invoke gstack-ship
- QA, test the site, find bugs → invoke gstack-qa
- Code review, check my diff → invoke gstack-review
- Update docs after shipping → invoke gstack-document-release
- Weekly retro → invoke gstack-retro
- Design system, brand → invoke gstack-design-consultation
- Visual audit, design polish → invoke gstack-design-review
- Architecture review → invoke gstack-plan-eng-review

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that does not match DESIGN.md.
