# 해화당 — 사주/궁합/관상/풍수 AI SaaS

## 세션 재개 — 먼저 읽을 것

**`docs/HANDOFF.md`** 를 읽고 시작한다. 지금 어디까지 왔는지, 이 기기에서 뭘 할 수 있고 뭘 못
하는지(모바일에서는 프로덕션 배포가 안 된다), 손대기 전에 알아야 할 함정이 거기 있다.

⚠️ 세션 체크포인트 훅은 `~/.claude/hhd-session-checkpoint.md` — **그 컴퓨터에만** 있다. 다른
기기·모바일 앱에서는 없으므로 `docs/HANDOFF.md` 가 유일한 인수인계다. 기기를 옮기기 전이나 큰
작업을 마쳤을 때 그 파일을 갱신하고 커밋한다.

## 스택

Next.js 16 + TypeScript strict + Tailwind + Shadcn/ui + Supabase (RLS) + Gemini AI + Toss Payments + Sentry + GA4
AI 모델: 텍스트 PRO/FLASH 모두 gemini-3.5-flash (통일, 2026-07-12) / 이미지 gemini-3.1-flash-image-preview

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

## 복채 시스템

**두 숫자는 다른 개념이다.** 값이 우연히 같아 오래 뒤섞여 있었다(2026-08-12 정정).

| 등급     | 주기 지급 `talismans_per_period` | 하루 사용 상한 `daily_talisman_limit` |
| -------- | -------------------------------- | ------------------------------------- |
| SINGLE   | 결제 주기(월)마다 10만냥         | 10만냥/일                             |
| FAMILY   | 결제 주기(월)마다 30만냥         | 30만냥/일                             |
| BUSINESS | 결제 주기(월)마다 100만냥        | 100만냥/일                            |

- **주기 지급**: 결제 주기당 **1회**. 지급 경로는 첫 결제(`app/actions/payment/subscription.ts`)와
  갱신(`app/api/cron/billing`) **두 곳뿐** — «매일 지급»이 아니다.
- **하루 사용 상한**: 지급받은 복채를 하루에 얼마나 쓸 수 있는지의 한도(`wallet.ts` `computeSpendPlan`).
  **충전한 복채는 이 상한을 받지 않는다.** 혜택이 아니라 한도이므로 «지급»으로 표기 금지.

### 문구 규율 (표시광고법)

혜택 문구는 `lib/domain/payment/membership-benefits.ts`에서만 만든다. 화면에 숫자·주기를 직접 쓰지 말 것.

- 멤버십은 **문을 열 뿐**이다 — 회원도 풀이마다 복채를 낸다(`deductTalisman`에 구독 우회 없음, 마스터 role만 면제).
- 속풀이 질문: 무료 일일분 **폐지(0)** · 멤버십 **주 10문** · 명식 완료 시 **평생 1문** · 광고 1문/방문 · 질문권 1만냥=10문(30일). 정본 `lib/domain/chat/entitlements.ts`
  멤버십·1일 이용권이 여는 것은 **입장**뿐 → «상담 무제한» 금지.
- 기록은 개수 상한(`storage_limit`)을 넘기면 즐겨찾기 아닌 오래된 것부터 **자동 삭제**된다 → «평생 보관» 금지.
- 금지어: 매일 / 무제한 / 평생 / 모두 이용 / 정액 (회귀 테스트가 막는다 —
  `lib/domain/payment/__tests__/membership-benefits.test.ts`)

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
