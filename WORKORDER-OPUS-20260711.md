# 작업지시서 — OPUS 종일 작업 (2026-07-11 발행 / Fable)

> **너는 Opus다.** 이 문서 하나로 하루 종일 자율 작업한다. 완료 후 Fable(페이블)이 검토→개선 지시한다.
> 브랜치 `claude/determined-yonath` (프로덕션 배포 브랜치 — main 아님). 배포는 사용자 승인 후에만.
> 참조 설계도(먼저 읽어라): `TEAM_G_DESIGN/prd/PRD-shrine-2.0-v1.md`, `PRD-shrine-3.0-deities-v1.md`, `TEAM_H_SECURITY/SECURITY-DESIGN-v2.md`, `HANDOFF.md`, `CLAUDE.md`, `DESIGN.md`

---

## 0. 절대 규칙 (위반 시 중단)

- **any 금지** → unknown+가드. **console.log 단독 금지** → logger. TypeScript strict. RLS 필수. ZERO-LATENCY. GA4/Sentry.
- **파괴적 작업 금지**: DROP TABLE, 데이터 삭제, force-push, `.env*` 편집, 프로덕션 배포는 **하지 마라**(사용자 승인 필요). 마이그레이션은 **새 파일 추가만**.
- **되돌릴 수 있게**: 각 Track 끝에 커밋(원자적). 커밋 메시지 `type: 한국어 설명` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **검증 우선**: 타입체크·테스트를 각 Track 완료 게이트로. 통과 못하면 다음 Track 금지.
- 막히면: 추측 말고 해당 파일 grep→확인. 외부 승인 필요한 건(도메인/DNS/결제 실거래) **하지 말고 목록화**.
- Supabase: MCP(`mcp__supabase__*`)로 마이그레이션·SQL. 인증/URL/provider 설정은 Management API(`SUPABASE_ACCESS_TOKEN` 환경변수 상주됨).

## 0.1 검증 루틴

- 타입: `node --max-old-space-size=4096 /d/anti/haehwadang/node_modules/typescript/bin/tsc --noEmit`
- 테스트: `node /d/anti/haehwadang/node_modules/jest/bin/jest.js <경로>`
- 보안 재점검: `mcp__supabase__get_advisors(security)` → ERROR 0 확인
- (node_modules·tsc·jest는 상위 `/d/anti/haehwadang`에 있음)

---

## Track S — 보안 하드닝 ★최우선 (SECURITY-DESIGN-v2.md 실행)

**지금 실제로 뚫려 있다. 신규 기능보다 먼저 막아라.**

### S1. DB 권한 (P0) — 새 마이그레이션 파일로

1. `kg_nodes/kg_edges/kg_rules` RLS 활성화 + 정책 (S1-1). **실제 컬럼·용도 먼저 확인**(`list_tables`).
2. 뷰 `user_profiles`, `v_destiny_targets` → `security_invoker = true` (S1-2). 전환 후 앱에서 해당 뷰 쓰는 경로 회귀 확인.
3. anon 노출 SECURITY DEFINER 함수 33개 (S1-3): 서버전용은 `REVOKE EXECUTE FROM anon, authenticated`, 본인데이터형은 함수 본문에서 `auth.uid()` 사용 + anon revoke. **재화 함수(`add_wallet_balance` 등)와 개인정보 함수(`get_family_*`, `get_today_fortune`) 최우선.** 각 함수의 앱 호출 경로(서버 액션이 service_role로 부르는지) grep 확인 후 회귀 테스트.
4. `function_search_path_mutable` 34개 → `SET search_path = ''` (S1-4).
5. 무제한 INSERT 정책 4건 (S1-5), Auth 유출비번차단 활성화 (S1-6, Management API).

- **게이트**: `get_advisors(security)` ERROR 0 + anon curl로 재화/개인정보 RPC 호출 거부 확인 스크립트(`scripts/security/verify-rls.mjs` 작성).

### S2. 앱 보안

- 서버 액션 신뢰경계 점검: 신위/테마 결제 가격 서버검증, AI 입력 길이제한+프롬프트 인젝션 방어.
- PII: `analysis_history`/`user_energy_profile`/`user_ai_memory`/공개신당/OG의 RLS·노출필드 화이트리스트 점검.
- service_role 키가 클라 번들에 없는지, `.env*` gitignore 확인(읽지 말고 `git check-ignore`).

### S3. 인프라 (코드로 가능한 것만; 도메인/DNS는 목록화)

- 보안 헤더(CSP/HSTS/X-Frame-Options 등) middleware 또는 next.config.
- rate limit: AI·결제·로그인·가입에 `check_rate_limit` 확장 적용.
- 업로드(관상) MIME·크기·매직바이트 검증.
- **사용자 승인 필요 목록**(하지 말고 문서에): DNS 잠금·DNSSEC, SPF/DKIM/DMARC, WAF/Cloudflare, 관리자 2FA.

---

## Track A — 이미지 에셋 (파이프라인 `scripts/shrine-assets/`)

1. `generate.mjs` 모델 ID 검증·확정(README 경고 참조). 소량 1신위로 파이프 e2e 검증(생성→chroma→webp).
2. **스타일 참조 없음 주의**: `assets-src/shrine/style-refs/ref1~3.png`는 사용자가 첨부본을 넣어야 함. 없으면 base 생성은 텍스트 프롬프트로 진행하되 **일관성 편차를 로그로 남기고**, style-refs 대기 항목으로 표시(사용자 확인).
3. 17신위 base + 표정7 + 초상 배치 생성 → chroma 키잉 → `public/shrine/deities/`.
4. 테마 배경(17종 §2 각 신당테마) wall/floor, 파티클 시트(§3.3 키) 생성.
5. `shrine_deities.sprite_url` 등 DB 경로를 생성 에셋으로 채움(코드 변경 0 원칙).

- **게이트**: 최소 수호신 6신위 base+표정 완성 & 룸에서 이모지→이미지 교체 확인. 나머지는 진행률 로그.
- 외부 발주분은 PRD §4 기준 — 도착 시 같은 경로에 덮어쓰면 됨.

---

## Track D — 신위 시스템 구현 (PRD-shrine-3.0)

1. 마이그레이션: `shrine_deities`, `user_shrine_deities`, `shrines.main_deity_id` (PRD-shrine-2.0 §신 스키마 + 3.0 명세). 17신위 시드(코드/오행/domains/가격/aura JSONB).
2. 배정 로직(결정론, AI 0): `user_energy_profile.yongsin_element` + `profiles.focus_areas` → 수호신 자동 좌정. 순수함수 + 단위테스트.
3. 좌정 의식(무료) + 제단 신위 렌더(스탠딩+표정) + 강신 의식 15초 시퀀스(PRD §3.4, 기존 EffectsCanvas/Web Audio 재사용).
4. 결제: `purchaseDeity` + **미구현 `purchasePack`(테마팩)** 동시 구현. 서버 가격검증, 영구 소장, GA4 이벤트.
5. 인연(緣) 4단계: `user_deity_bonds` + 해금(표정·호칭·주제). 단위테스트.

- **게이트**: 타입0, 배정 로직 테스트 통과, 무료 좌정 e2e(Playwright, 프로덕션 아님 로컬 `npm run dev`).

---

## Track C — 신과의 대화 (Zeta 접목, shrine-zeta 기획)

1. **SSE 스트리밍**: `app/api/shrine/chat/route.ts` 신설 — Gemini `generateContentStream` → SSE. 첫 청크에 `emotion` 선행.
2. 감정→표정: 응답 스키마 `emotion`(7종) → 클라 emotionMap → 표정 크로스페이드 300ms.
3. 어시스트(답변추천 2개), 지문 서사(_별표_), 신위 페르소나 카드(17종 말투) 주입.
4. shrine-chat → shaman-chat 파이프라인 통합(중복 제거) + 主神 컨텍스트.
5. 신탁 선톡(주2~3회 상한, 캐시), 사연첩(`consult_threads`)·적중 회고.

- **게이트**: 스트리밍 동작 + 표정 전환 확인. 의존유도 금지·엔터테인먼트 고지 유지.

---

## Track F — 분석 고도화 (PRD-shrine-2.0 §5 P0, 신 시스템 입력)

- 관상/손금 태그 파서↔DB 프롬프트 스키마 일치(`image.ts` ↔ 마이그레이션). 결과 `saveAnalysisHistory` 추가(FACE/HAND 축적) → 기운 face/palm 보정 활성화.
- 오행 보정치 스키마 + 3막(hook/now/act) 구조. 죽은 파이프라인(`saju.ts:406-699`, `studio.ts`) 정리.
- **게이트**: 관상 결과 저장·기운 반영 확인.

---

## 실행 순서 & 산출

**권장 순서**: S1(P0) → A(파이프 검증+수호신6) → D(신위 코어) → F(분석 P0) → C(대화) → S2/S3 → A(나머지 에셋).
병렬 가능한 건 병렬로. 각 Track 완료마다 커밋.

**진행 로그**: `WORKLOG-OPUS-20260711.md`에 Track별 상태/결정/막힌점/사용자확인필요 항목을 계속 append. Fable이 이걸 보고 검토한다.

**절대 하지 마라**: 프로덕션 배포, DNS/도메인 변경, 실결제, 데이터 삭제, `.env` 편집, main 브랜치 조작.

**완료 정의**: 각 Track 게이트 통과 + 타입0 + 관련 테스트 통과 + WORKLOG 갱신 + `get_advisors` ERROR 0.

Fable에게 넘길 때: WORKLOG 요약 + 스크린샷(신당/신위/대화) + 남은 항목 + 사용자 승인 대기 목록.
