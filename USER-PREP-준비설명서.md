# 준비 설명서 — 남은 작업 완료를 위해 사용자가 해줘야 할 것

> 작성: 2026-07-12 (Fable) | 대상: pdkno | 근거: `WORKLOG-OPUS-20260711.md`, `TEAM_I_REVIEW/REVIEW-20260711-opus-security-shrine.md`
> 지금까지 **코드로 완결·검증 가능한 건 전부 완료**(브랜치 `claude/determined-yonath`에 push됨). 남은 건 아래처럼 **사용자 준비물/결정/권한**이 있어야 풀린다.

## 한눈에 (우선순위)

| #   | 항목                  | 왜 막혀있나                                 | 사용자가 준비할 것         | 그러면 풀리는 것                                                     |
| --- | --------------------- | ------------------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| 1   | 🔴 **보안 S1b 적용**  | 배포 권한 필요                              | 배포 실행(또는 배포 승인)  | 로그인 유저 자가발행(재화·멤버십·테마·한도) 완전 차단 = 실질 P0 종료 |
| 2   | 🔑 **로컬 env**       | 워크트리에 `.env.local` 없음 → dev 서버 500 | `vercel env pull`          | Track C(대화)·D-UI(강신)·F잔여 e2e 진행 가능                         |
| 3   | 🖼 **Track A 이미지** | 참조시안·API키 없음                         | style-refs 3장 + GEMINI 키 | 신위 이모지 → 실제 그림                                              |
| 4   | 💰 **통화 결정**      | 제품 결정 사항                              | 복채/복전 중 택1           | 유료 신위/테마 구매 활성화                                           |
| 5   | 🌐 **인프라/도메인**  | 콘솔 전용(코드 불가)                        | DNS·메일·WAF·2FA           | 인프라 보안(S3 잔여)                                                 |

---

## 1. 🔴 [최우선] 보안 S1b 적용 — 실질 P0 마무리

**현재 라이브 상태:** 비로그인(anon) 재화발행·타인 개인정보 열람은 **막혔음**(S1a 적용됨). 그러나 **로그인한 유저가 자기 계정에 재화/유료멤버십/유료테마를 스스로 발급하거나 일일한도를 리셋하는 구멍이 아직 열려 있음**(S1b 미적용).

**왜 지금 못 넣나:** S1b 마이그레이션은 재화 쓰기를 service_role 전용으로 잠근다. 이게 동작하려면 **재화 쓰기를 admin 클라이언트로 바꾼 코드가 먼저 배포**돼야 한다(코드는 브랜치에 있으나 미배포). 순서가 바뀌면 프로덕션 보상/충전/구매가 즉시 장애.

**사용자가 할 일 — 순서 엄수:**

1. **코드 배포**: 워크트리에서 (CLAUDE.md 절차)
   ```
   # 메인의 .vercel/project.json 을 워크트리 .vercel/ 로 복사 후
   vercel deploy --prod --yes
   ```
   → 또는 나에게 "배포해도 된다"고 승인해주면 내가 실행.
2. **프로덕션 회귀 확인**(배포 직후): 출석체크·룰렛·복채충전·신당아이템 구매·신위 좌정이 정상인지 눈으로 확인.
3. **S1b 마이그레이션 적용**(회귀 정상 확인 후): `supabase/migrations/20260711_security_s1b_wallet_integrity.sql`
   → 내가 `mcp__supabase__apply_migration` 으로 적용하면 됨(사용자는 "적용해" 한마디).

> ⚠️ 1→2→3 순서 절대 엄수. 3을 1보다 먼저 하면 프로덕션 장애.

---

## 2. 🔑 [해방키] 로컬 env 준비 — 이거 하나로 여러 트랙이 풀림

**문제:** 이 워크트리에 `.env.local`이 없어서 `npm run dev`가 미들웨어에서 500(Supabase 미초기화). 그래서 **UI·스트리밍·이미지분석을 로컬에서 띄워 검증할 수가 없음** → Track C(대화 SSE), Track D UI(강신/제단렌더), Track F 잔여(관상결과 저장)를 블라인드로 짜는 건 위험해서 보류 중.

**사용자가 할 일:**

```
cd D:/anti/haehwadang/.claude/worktrees/determined-yonath
vercel link          # 프로젝트 hhd 선택
vercel env pull .env.local
```

(또는 메인 체크아웃 `D:/anti/haehwadang/.env.local` 을 이 워크트리로 복사)

> 규칙상 나는 `.env*`를 읽거나 편집하지 않는다. **파일만 있으면** dev 서버가 뜨고, 그때부터 나는 브라우저로 실제 화면을 열어 검증하며 UI/스트리밍/분석을 완성할 수 있다.

**풀리는 것:** Track C 신과의 대화(SSE 스트리밍·감정→표정), Track D UI(무료 좌정 화면·제단 신위 렌더·강신 15초 시퀀스), Track F 잔여(관상 결과 saveAnalysisHistory 축적 e2e 확인).

---

## 3. 🖼 Track A — 신위 이미지 에셋

**문제:** 이미지 생성 파이프라인(`scripts/shrine-assets/`)은 준비돼 있으나, ①스타일 참조 시안과 ②이미지 생성 API 키가 없다.

**사용자가 준비할 것:**

- **스타일 참조 3장**: `assets-src/shrine/style-refs/ref1.png`, `ref2.png`, `ref3.png`
  - 「설빛 온기」 톤의 시안 이미지(따뜻한 수채 K-애니, 큰 갈색 눈망울·볼홍조·골드 역광). PRD-shrine-3.0 §1 기준.
- **GEMINI_API_KEY**: 위 2번 env 에 포함돼 있으면 됨(같은 키). 이미지 모델(`gemini-3.1-flash-image`)의 실사용 가능 여부는 실행 시점에 확인 필요.

**실행(준비 후):**

```
node scripts/shrine-assets/generate.mjs base        # 17신위 base 생성(녹색배경)
node scripts/shrine-assets/generate.mjs emotions <code>
node scripts/shrine-assets/chroma.mjs raw/<code>/base.png public/shrine/deities/<code>/base.webp
```

결과물을 `public/shrine/deities/{code}/`에 두면 **코드 변경 0**으로 이모지 → 그림 교체(DB `shrine_deities.sprite_url`만 채움).

> 최소 게이트: 수호신 6신위 base+표정. 나머지는 순차.

---

## 4. 💰 통화 결정 — 유료 신위/테마를 무엇으로 파나

**문제:** PRD는 신위(₩6,900~)·테마를 "복전(유료)"으로 규정했는데, 현재 코드는 안전을 위해 **유료 구매를 잠가둠**(`PREMIUM_CURRENCY_READY=false`). 무료 통화(복=bok_points)로 프리미엄을 팔면 매출 누수라 함부로 못 켠다.

**사용자가 결정할 것 (택1):**

- **(a) 복채(wallets/만냥)로 차감** — 이미 Toss로 충전하는 유료성 통화. 가장 단순. → `purchaseDeity` 통화 1곳 스위치 + 가격 재설정.
- **(b) 복전 신규 통화 도입** — 진짜 별도 유료 화폐(2통화 UI). 별도 스프린트.
- **(c) 실 ₩ 결제(Toss)** — confirmPayment 경로 연동.

결정만 주면 `PREMIUM_CURRENCY_READY=true` + 시드 가격(`shrine_deities.price_*`)을 통화에 맞게 세팅하고 구매를 연다.

---

## 5. 🌐 인프라/도메인 (콘솔 전용 — 내가 코드로 못 하는 것)

배포 후, 콘솔/레지스트라에서 직접:

- **DNS**: 레지스트라 잠금(Registrar Lock) + 가능 시 DNSSEC
- **메일**: SPF·DKIM·DMARC 레코드(알림/발신 도메인)
- **WAF**: Cloudflare 등 앞단 프록시로 봇/DDoS 완화(선택)
- **관리자 2FA**: admin 계정 2단계 인증
- **헤더 검증**: 배포 후 `securityheaders.com`에 k-haehwadang.com 넣어 HSTS/CSP 확인(코드는 이미 반영됨)

---

## 6. 참고 문서

- `WORKLOG-OPUS-20260711.md` — 전체 진행상황·게이트
- `TEAM_I_REVIEW/REVIEW-20260711-opus-security-shrine.md` — 보안 검토·개선(R1~R10)
- `TEAM_G_DESIGN/prd/PRD-shrine-3.0-deities-v1.md` — 17신위 명세(이미지 발주 기준)

---

### 가장 빠른 길

**2번(env pull) 먼저** 해주면 내가 로컬로 화면을 띄워 Track C/D-UI/F를 실제 검증하며 완성할 수 있고,
**1번(배포+S1b)**은 보안 P0를 실제로 닫는다. 이 둘이 가장 임팩트가 크다.
