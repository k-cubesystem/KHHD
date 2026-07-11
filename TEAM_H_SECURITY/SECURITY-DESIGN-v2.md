# 보안 설계서 v2 — 신당 3.0 + 전면 보안 하드닝

> 작성: 2026-07-11 (Fable) | 근거: Supabase Security Advisor 실측 112건 전수 진단 (2026-07-11)
> 대상 프로젝트: `plzvanxcxjkaazcfrtls` | 실행: `WORKORDER-OPUS-20260711.md` Track S

## 0. 요약 — 지금 실제로 뚫려 있는 것

실측 진단 결과, **비로그인 상태에서 다음이 가능**하다 (전부 라이브):

- 💸 `add_wallet_balance(임의 user_id, 임의 금액)` → **복채 무한 충전** (매출 직결 치명)
- 🎁 `add_bok_points` / `add_talisman` / `grant_shrine_item` → 재화·아이템 임의 지급
- 🕵️ `get_family_with_analysis_summary(임의 UUID)` / `get_today_fortune(임의 UUID)` → **타인 개인정보(사주·가족·운세) 열람** (개인정보보호법 위반 소지)
- 🗄️ `kg_nodes/kg_edges/kg_rules` REST 직접 read/write → 지식그래프 변조
- 📊 `update_gemini_rpm` → AI 설정 변경으로 서비스 마비 가능

→ **이것이 신당 3.0보다 먼저다.** 신규 기능을 얹기 전에 밑장부터 막는다.

---

## 1. Track S1 — DB 권한 하드닝 (P0, 최우선)

### S1-1. RLS 미적용 테이블 (ERROR 3건)

`kg_nodes`, `kg_edges`, `kg_rules` — RLS 켜고 정책 정의.

```sql
ALTER TABLE public.kg_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_rules ENABLE ROW LEVEL SECURITY;
-- 읽기전용 공개 데이터면: authenticated SELECT만 허용, 쓰기는 service_role
CREATE POLICY kg_nodes_read ON public.kg_nodes FOR SELECT TO authenticated USING (true);
-- (edges/rules 동일). 쓰기 정책 없음 = service_role만 (RLS 우회)
```

※ 실제 컬럼·용도 확인 후 결정. 사용자별 데이터면 `user_id = auth.uid()`.

### S1-2. SECURITY DEFINER 뷰 (ERROR 2건)

`user_profiles`, `v_destiny_targets` → `security_invoker` 전환.

```sql
ALTER VIEW public.user_profiles SET (security_invoker = true);
ALTER VIEW public.v_destiny_targets SET (security_invoker = true);
```

전환 후 각 뷰가 참조하는 베이스 테이블 RLS로 접근이 막히지 않는지 회귀 확인.

### S1-3. anon 노출 SECURITY DEFINER 함수 33개 (실질 P0)

분류 후 권한 회수:

```sql
-- (a) 서버 전용(웹훅/크론/트리거/관리): anon+authenticated 모두 회수
REVOKE EXECUTE ON FUNCTION public.add_wallet_balance(uuid,numeric) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_wallet_balance(uuid,numeric) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_bok_points(uuid,integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_talisman(uuid,integer,text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_shrine_item(uuid,uuid,integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_gemini_rpm(integer,text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_traffic_hourly() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_traffic_hourly() FROM anon, authenticated;
-- ... (진단 목록 33개 전부 검토, 서버 전용은 위 패턴)

-- (b) 로그인 필요 + 본인만: anon 회수 + 함수 내부에서 auth.uid() 사용
REVOKE EXECUTE ON FUNCTION public.get_family_with_analysis_summary(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_family_with_missions(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_today_fortune(uuid) FROM anon;
```

**핵심 원칙**: 재화·개인정보 함수는 `p_user_id` 파라미터를 **신뢰하지 말고** 함수 본문에서 `auth.uid()`로 대체(또는 `IF p_user_id <> auth.uid() AND NOT is_admin() THEN RAISE`). 서버 액션에서 service_role로 호출하는 경로는 유지되므로 기능 영향 없음 — **호출 경로 회귀 테스트 필수**.

### S1-4. search_path 미고정 34개 (WARN, 권한상승 벡터)

```sql
ALTER FUNCTION public.add_bok_points(uuid,integer) SET search_path = '';
-- 34개 전부. SECURITY DEFINER와 결합 시 하이재킹 → 우선순위 높음
```

### S1-5. 무제한 INSERT 정책 (WARN 4건)

- `activity_logs`, `notification_logs`: `TO service_role`로 제한
- `business_inquiries`, `shrine_wishes`: 공개 INSERT 의도면 유지하되 **rate limit + 길이·XSS 검증** 추가

### S1-6. Auth 설정

- **유출 비밀번호 차단(HaveIBeenPwned)** 활성화 → Management API:
  `PATCH /v1/projects/{ref}/config/auth {"security_update_password_require_reauthentication":true, ...}` 또는 대시보드 토글 (`SUPABASE_ACCESS_TOKEN` 환경변수 사용)
- 검증 루틴: 작업 후 `mcp__supabase__get_advisors(security)` 재실행 → ERROR 0, P0 WARN 0 확인

---

## 2. Track S2 — 애플리케이션 보안

### S2-1. 서버 액션 신뢰 경계 (신당 3.0 신규 코드 포함)

- 모든 `p_user_id`/금액/가격은 **서버에서 재검증** (기존 `confirmPayment`의 `BOKCHAE_PRICE_MAP` 패턴을 신위·테마 결제에도 강제)
- 신위 구매/강신: 가격은 서버 `shrine_deities.price_krw` 조회값만 사용, 클라 전송값 무시
- AI 신탁/채팅: 사용자 입력을 프롬프트에 넣기 전 길이 제한 + 시스템 프롬프트 격리(프롬프트 인젝션 방어 — "너는 이제 ~" 류 무시 지침)

### S2-2. 개인정보 (PIPA 대응)

- 사주 = 생년월일시(민감). `analysis_history`, `user_energy_profile`, `user_ai_memory` **RLS `auth.uid()=user_id` 전수 점검**
- 공개 신당(`/shrine/[userId]`)·OG 이미지가 **생년월일·본명·전화 등 노출 금지** — 노출 필드 화이트리스트 점검
- 대화/기억 저장 시 PII 최소화. 신탁 카드 공유(share_token)에 개인정보 포함 여부 감사
- 데이터 보존·파기 정책 명문화(문서), 회원탈퇴 시 cascade 삭제 확인

### S2-3. 시크릿 관리

- `.env*` git 제외 확인, 노출 이력 스캔 (gitleaks 패턴)
- **service_role 키가 클라이언트 번들에 없는지** 확인 (NEXT*PUBLIC* 접두 오용 점검)
- Supabase PAT는 환경변수 상주(`SUPABASE_ACCESS_TOKEN`) — 커밋 금지

---

## 3. Track S3 — 인프라 · 도메인 · DDoS

### S3-1. 서버/앱 공격 방어 (Vercel + Next 16)

- **보안 헤더** (`next.config.js` 또는 middleware): CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy
- **Rate limiting**: AI·결제·로그인·회원가입 엔드포인트에 IP/유저 단위 제한 (기존 `check_rate_limit`/`rate_limit_entries` 활용 확장)
- **입력 검증**: 전 서버 액션 zod 스키마 (이미 zod 보유). 파일 업로드(관상 이미지) MIME·크기·매직바이트 검증
- 웹훅(Toss) 서명 검증 확인, `/api/cron/*` 시크릿 헤더 보호

### S3-2. 도메인 · 계정 탈취 방어

- DNS: 레지스트라 잠금(Registrar Lock), 가능 시 DNSSEC
- 이메일: SPF·DKIM·DMARC (알림톡/메일 발신 도메인)
- Cloudflare 등 프록시 앞단(있으면) WAF·봇 차단·DDoS 완화. 없으면 Vercel의 기본 보호 + rate limit로 최소선
- 관리자 계정 2FA, admin 라우트 `is_admin` 재검증(클라 신뢰 금지)

### S3-3. 모니터링

- Sentry 알림 임계치, 결제·인증 이상 징후 대시보드
- Supabase advisor **정기 재실행**(크론/세션 시작 시) → 회귀 감지

---

## 4. 실행 우선순위

1. **S1-1~S1-3 (P0)** — 오늘 당장. 재화 조작·개인정보 유출 경로 차단
2. S1-4~S1-6, S2 — 신당 3.0 코드와 병행
3. S3 — 헤더·rate limit는 즉시, 도메인·DNS는 사용자 확인 필요(§체크리스트로 사용자에게 전달)

## 5. 검증 게이트 (완료 정의)

- [ ] `get_advisors(security)` ERROR 0건
- [ ] anon으로 재화/개인정보 RPC 호출 시 거부 (수동 curl 테스트 스크립트)
- [ ] 기존 기능(결제·출석·신당·채팅) 회귀 테스트 통과
- [ ] 보안 헤더 관측(securityheaders.com 등가 체크)
- [ ] 시크릿 스캔 클린
