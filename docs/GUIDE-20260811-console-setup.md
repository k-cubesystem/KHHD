# 콘솔 작업 가이드 — 사장님 직접 작업 (2026-08-12 갱신)

> **여기 남은 건 전부 «사장님 계정으로 로그인해야만» 되는 것들입니다.**
> API로 처리 가능했던 것은 제가 이미 끝냈습니다(맨 아래 «에이전트가 처리 완료» 참고).
> 위에서부터 순서대로 하시면 되고, 하나 끝날 때마다 채팅에 "N번 했어"만 주시면
> 제가 이어받아 검증·배선합니다.

---

## 1. 🔴 이메일 회원가입 살리기 — 메일 서버(SMTP) 연결

**왜**: 이메일 가입은 확인 메일이 필수인데 메일 서버가 없어, Supabase 내장 발송(**서비스 전체 시간당 2통**)에 의존합니다. 지금 이메일 가입은 사실상 막혀 있고 카카오·구글만 작동합니다. 이걸 풀어야 발송 한도 상향도 가능해집니다(한도는 커스텀 SMTP가 있어야 올릴 수 있어 제가 못 올립니다).

**소요**: 15분 (DNS 전파 대기 별도)

1. https://resend.com 가입 → 왼쪽 **Domains** → `k-haehwadang.com` 추가
2. Resend가 보여주는 **DNS 레코드 3~4개**(SPF·DKIM)를 도메인 DNS 관리 화면에 그대로 추가
   → 몇 분 뒤 Resend에서 "Verified" 초록불 확인
3. Resend 왼쪽 **SMTP** → 접속 정보 확인 (호스트 `smtp.resend.com`, 포트 465, 사용자 `resend`, 비밀번호 = API 키)
4. https://supabase.com/dashboard → 프로젝트(plzvanxcxjkaazcfrtls) → **Authentication → Emails(또는 SMTP Settings)** → "Custom SMTP" 켜고 3번 정보 입력
   - 발신자 이메일 `no-reply@k-haehwadang.com`, 발신자 이름 `해화당`

**보너스**: 2번에서 SPF·DKIM이 해결됩니다. **DMARC 한 줄**만 추가하면 이메일 보안 3종 완성:

```
종류: TXT | 이름: _dmarc | 값: v=DMARC1; p=quarantine; rua=mailto:pdkshno1@gmail.com
```

✅ **완료 알림 주시면** → 제가 발송 한도를 2 → 30/시간으로 올리고(API 가능), 가입 흐름 실동작을 확인합니다. **비밀번호 변경 시 재인증 강제**도 이때 함께 켭니다(지금 켜면 메일이 안 나가 계정이 잠길 수 있어 보류 중).

---

## 2. 토스 웹훅 이벤트 확인 — 복채 자동 회수의 작동 조건

**왜**: 결제 취소 시 복채를 회수하는 코드가 어제 들어갔는데, 토스가 `PAYMENT_STATUS_CHANGED` 이벤트를 보내줘야 작동합니다. 예전 코드가 엉뚱한 이벤트 이름을 기다리고 있어서 **취소 처리가 한 번도 실행된 적이 없었습니다.**

**소요**: 5분

1. https://developers.tosspayments.com → 로그인 → 내 개발정보 → **웹훅**
2. 등록된 주소가 `https://k-haehwadang.com/api/webhooks/toss` 인지 확인
3. 구독 이벤트에 **`PAYMENT_STATUS_CHANGED`** 체크 — 없으면 추가

---

## 3. 웹푸시 켜기 — 키 2개

**왜**: 신탁 알림 기능이 완성돼 있지만 서버 키가 없어 잠들어 있습니다("준비 중" 표시). 키를 넣고 재배포되면 **코드 변경 없이** 켜집니다.

**소요**: 10분

터미널에서 한 줄:

```bash
npx web-push generate-vapid-keys
```

나온 Public/Private Key를 https://vercel.com → `hhd` → **Settings → Environment Variables** 에:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = Public Key (Production)
- `VAPID_PRIVATE_KEY` = Private Key (Production, **Sensitive 체크**)

✅ 넣으셨다고 알려주시면 제가 재배포하고 실동작을 확인합니다.

---

## 4. 자동 감시 가동 — GitHub 시크릿 2개 + Sentry 알림

**왜**: 프로덕션 자동 점검이 로그인 정보가 없어 반쪽으로 돌고, 장애가 나도 알림이 안 옵니다.

**소요**: 10분

**GitHub** — https://github.com/k-cubesystem/KHHD → **Settings → Secrets and variables → Actions** → New repository secret 두 번:

- `E2E_USER_EMAIL` = e2e 테스트 계정 이메일 (test@example.com)
- `E2E_USER_PASSWORD` = 그 계정 비밀번호

**Sentry** — https://sentry.io → 해화당 프로젝트 → **Alerts → Create Alert** → "Issues" → 조건 "A new issue is created" → 알림 대상 사장님 이메일 → 저장

---

## 5. 카카오톡 공유 버튼 살리기 — JS 키 1개

**소요**: 5분

1. https://developers.kakao.com → 내 애플리케이션 → 해화당 앱 → **앱 키 → JavaScript 키** 복사
2. 같은 화면 **플랫폼 → Web**에 `https://k-haehwadang.com` 등록 확인(없으면 추가)
3. Vercel → `hhd` → **Settings → Environment Variables** → `NEXT_PUBLIC_KAKAO_JS_KEY` = 복사한 키 (Production)

---

## 6. 로컬 옛 AI 키 교체 — 파일 한 줄

**왜**: 제 로컬 테스트 환경에 폐기된 옛 Gemini 키가 남아 있습니다(저는 `.env` 파일 접근이 금지돼 있습니다). 프로덕션은 정상이고 로컬 테스트만 걸립니다.

1. https://aistudio.google.com → **Get API key** → 유효한 키 복사(프로덕션에 넣은 그 키)
2. 메모장으로 `D:\anti\haehwadang\.claude\worktrees\determined-yonath\.env.local` 열기
3. `GOOGLE_GENERATIVE_AI_API_KEY=` 줄의 값 교체 → 저장

---

## 7. 보안 스위치들 (각 5분, 급하지 않음)

| 항목              | 어디서                                               | 뭘                                         |
| ----------------- | ---------------------------------------------------- | ------------------------------------------ |
| Vercel 방화벽     | vercel.com → hhd → **Firewall**                      | Attack Challenge Mode ON                   |
| 관리자 2단계 인증 | GitHub·Vercel·Supabase·카카오 각 Settings → Security | 2FA(OTP 앱) 등록 — 4곳                     |
| 도메인 잠금       | 도메인 구입처 관리 화면                              | Registrar Lock ON                          |
| DNSSEC            | 같은 곳                                              | 지원하면 ON (Vercel DNS면 미지원 — 건너뜀) |

---

## 8. (결정하시면) 로그인 CAPTCHA — Turnstile 키

**왜**: 비밀번호 무차별 대입 방어가 없습니다. 키 발급(사장님) + 로그인·가입·재설정 3개 화면 배선(제가) 세트입니다. **하시겠다고 하시면**:

1. https://dash.cloudflare.com → **Turnstile** → Add site → `k-haehwadang.com`
2. Site Key / Secret Key 발급 → Secret Key는 Supabase → Authentication → **Bot and Abuse Protection**에 입력
3. Site Key는 Vercel 환경변수 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

---

## 체크리스트

- [ ] 1. SMTP 연결(Resend) + DMARC ← **최우선**
- [ ] 2. 토스 웹훅 `PAYMENT_STATUS_CHANGED` 확인 ← **5분, 금전 관련**
- [ ] 3. VAPID 키 2개 → 웹푸시 활성
- [ ] 4. GitHub 시크릿 + Sentry 알림
- [ ] 5. 카카오 JS 키
- [ ] 6. 로컬 Gemini 키 교체
- [ ] 7. 보안 스위치 4종
- [ ] 8. (결정 시) Turnstile

---

## 에이전트가 이미 처리 완료 (사장님 작업 아님)

| 항목                 | 처리                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 비밀번호 최소 길이   | 6자 → **8자** (Management API 적용 완료). 가입·재설정 폼에 안내 문구·검증 함께 배선, 상수는 `lib/auth/password.ts` 단일 출처 |
| 비밀번호 재설정 화면 | 영어 스캐폴드 → 한국어화 + 길이 검증 추가                                                                                    |

**보류 중(조건부)**: 이메일 발송 한도 상향(2→30/h)과 비밀번호 변경 시 재인증 강제는 **1번 SMTP 연결 후에** 제가 켭니다 — 지금 켜면 메일이 못 나가 계정 잠금 위험이 있습니다.
