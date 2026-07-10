# HANDOFF — 세션 인수인계 (새 세션/다른 PC용)

> 최종 갱신: 2026-07-09 | 브랜치: `claude/determined-yonath` (origin에 푸시됨)
> **새 세션이면 이 문서를 먼저 읽으세요.** 프로젝트 맥락·현황·다음 할 일이 여기 다 있습니다.

## 0. 지금 상태 한 줄

**신당 2.0 "미니룸"(토카 스타일 꾸미기)이 프로덕션 라이브** (k-haehwadang.com/protected/shrine). 코어~폴리시까지 배포 완료, 타입0·빌드·테스트 통과. 남은 건 분석 P0 버그(위험해서 보류)·스프라이트 에셋·상점 2통화 UI.

## 1. 프로젝트 기본

- **해화당** — AI 사주/관상/손금/풍수 + 복 생태계 SaaS. Next.js 16 + TS strict + Tailwind + Supabase(RLS) + Gemini + Toss.
- **Supabase**: 프로젝트 `plzvanxcxjkaazcfrtls` (org cubesystem, region ap-northeast-2). MCP 연결됨 → `mcp__supabase__*`로 마이그레이션 직접 적용 가능.
- **배포**: Vercel 프로젝트 `hhd` (cubesystems-projects) → `k-haehwadang.com`. 배포 = `cd /d/anti/haehwadang && vercel deploy --prod` (git push 아님, 직접 업로드).
- **환경변수**: `.env.local`은 git 제외. 다른 PC/새 환경이면 `vercel link`(hhd 선택) → `vercel env pull .env.local`로 전부 내려받기.
- **검증 루틴**: 타입 `node --max-old-space-size=4096 /d/anti/haehwadang/node_modules/typescript/bin/tsc --noEmit` / 테스트 `node /d/anti/haehwadang/node_modules/jest/bin/jest.js <경로>` (node_modules는 상위 `/d/anti/haehwadang`에 있음).
- **규칙(CLAUDE.md)**: any 금지(unknown+가드), console.log 단독 금지(logger), RLS 필수, ZERO-LATENCY, GA4/Sentry, 한국어 응답.

## 2. 이번에 한 일 (전부 배포됨)

### AI 메모리 + 비용 최적화 (Sprint 1)

`lib/saju-engine/context-cache.ts`(사주 컨텍스트 person·날짜 캐시), `lib/ai/memory.ts`(장기 기억), `lib/ai/summarizer.ts`(세션 요약), shaman-chat 슬라이딩 윈도우(8)+기억 주입+`after()` 백그라운드. 마이그레이션 `20260704_ai_memory_system.sql`.

### 디자인 시스템 v2

motion-tokens, Tailwind 토큰(gold-tint/gold-antique/ink-primary), 하드코딩 rgba→토큰 스윕, WCAG 대비 개선, 커밋 가드 `scripts/check-design-tokens.mjs`. 참조: `DESIGN.md`.

### 신당 2.0 미니룸 ★ (핵심, 방금 작업)

- **마이그레이션**: `20260712_shrine_toca.sql`(placements/inventory/theme_packs/energy_profile + 카탈로그 12종 오행·behavior), `20260712b_shrine_inventory_rpc.sql`(grant_shrine_item)
- **도메인**: `lib/domain/shrine/{types,energy,zones}.ts` — 기운 엔진 순수함수 + 단위테스트 11개(`__tests__/energy.test.ts`)
- **서버**: `app/actions/shrine/{scene,inventory,keeper}.ts` — 씬 로드·레이아웃 저장·테마·구매→보관함·선물 기억
- **클라이언트**: `components/shrine/scene/{ShrineRoomClient,EffectsCanvas,useShrineAudio,keeper-lines}` — 드래그 배치·탭 반응·파티클·Web Audio 합성 국악·신당지기(idle/건네기/이스터에그)·테마 전환·보관함
- **연동**: `app/protected/shrine/page.tsx`(새 룸), `app/shrine/[userId]/page.tsx`(방문자 읽기전용), `shrine-chat.ts`(방 기운 인식)
- 상세 설계·현황: `TEAM_G_DESIGN/architecture/ARCH-shrine-toca-v1.md`, 기획: `TEAM_G_DESIGN/prd/PRD-shrine-2.0-v1.md`

## 3. 다음 할 일 (우선순위)

1. **스프라이트 에셋 발주** — 현재 이모지 폴백. 카탈로그 `sprite_url` 채우면 코드 변경 0. 레이어별 5종 + 테마 벽지/바닥. (크리티컬 패스)
2. **분석 P0 버그 수정** (⚠️ 무인 배포 보류 중 — 사용자 승인 후):
   - 관상/손금 태그 파서↔DB 프롬프트 스키마 불일치 → 데이터 폐기: `app/actions/ai/image.ts:389,931` ↔ `supabase/migrations/ai/20260213_image_analysis_prompts.sql`. 파서를 숫자+등급 양쪽 허용으로.
   - 관상/손금 결과 미저장: `image.ts`의 analyzeFace/Palm/Interior에 `saveAnalysisHistory` 추가 (score/summary 매핑 신중히). → 신당지기 관상 회상·기운 face/palm 보정 활성화.
   - 결제 불가 SKU(위젯 폴백 3크레딧) + 가입보너스 1 vs 50만냥 충돌: `components/payment/payment-widget.tsx:105`, `supabase/migrations/payment/02_wallet_system.sql:137`.
3. **신당 2.0 Phase 2** — /shop 탭 구조 + 복전(유료)/복(무료) 2통화 UI + 스타터팩 ₩4,900 + 인라인 원터치 충전(빌링키 재활용).
4. **로그인 OAuth** (사용자 대시보드 작업): 새 Supabase 프로젝트에 Google/Kakao 미설정 → `Unsupported provider` 에러. 이메일 로그인은 작동. 콘솔 리디렉션 URI: `https://plzvanxcxjkaazcfrtls.supabase.co/auth/v1/callback`.
5. Gemini cachedContent(Sprint 1.5) — 추가 비용 절감.

## 4. 주의/함정

- node_modules·tsc·jest는 상위 `/d/anti/haehwadang/node_modules`에 있음 (worktree엔 없음).
- 대량 커밋 시 lint-staged OOM 주의 (`feedback_lint_oom`).
- 배포 명령 `| tail -6`이 URL 라인 자를 수 있음 — exit 0이면 alias 성공(k-haehwadang.com).
- 신당 첫 방문 시 `ensureStarterKit`가 스타터 인벤토리+기본 배치 1회 지급.
- 구 shrine 코드(ShrineCanvas, shrine-items.ts placeItem)는 미사용이나 잔존(삭제 안 함, 무해).

## 5. 산출물 링크

- 동작 프로토타입: https://claude.ai/code/artifact/fb35127e-f462-4187-b5c3-e2602690ccd0
- 야간 보고서: https://claude.ai/code/artifact/401efc67-df27-4076-81ba-752661da467c
- 로컬 메모리(이 PC): `~/.claude/projects/D--anti-haehwadang*/memory/` (다른 PC로 옮기려면 이 폴더 복사)
