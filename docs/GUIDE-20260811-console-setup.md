# 콘솔 작업 가이드 — 사장님 직접 작업 목록 (2026-08-11)

> 에이전트가 대신 못 하는 것들입니다(각 서비스 관리 화면 로그인 필요).
> **위에서부터 순서대로** 하시면 됩니다 — 1번이 가장 급하고, 아래로 갈수록 여유 있습니다.
> 각 항목 끝의 ✅ 표시는 "완료 후 저에게 알려주시면 코드 쪽 마무리를 제가 한다"는 뜻입니다.

---

## 1. 🔴 이메일 회원가입 살리기 — Supabase에 메일 서버(SMTP) 연결

**왜**: 지금 이메일 가입은 확인 메일이 필수인데, 메일 서버가 없어 Supabase 내장 발송(전체 서비스 합쳐 **시간당 2통**)에 의존합니다. 사실상 카카오·구글 가입만 작동 중입니다.

**방법 (Resend 추천 — 무료 월 3,000통, 설정이 제일 쉬움)**:

1. https://resend.com 가입 → 왼쪽 메뉴 **Domains** → `k-haehwadang.com` 추가
2. Resend가 보여주는 **DNS 레코드 3~4개**(SPF·DKIM)를 도메인 DNS 관리 화면에 그대로 추가
   → 몇 분 뒤 Resend에서 "Verified" 초록불 확인
3. Resend 왼쪽 메뉴 **SMTP** → 접속 정보 확인 (호스트 `smtp.resend.com`, 포트 465, 사용자 `resend`, 비밀번호=API 키)
4. https://supabase.com/dashboard → 프로젝트(plzvanxcxjkaazcfrtls) → **Authentication → Emails(또는 SMTP Settings)** → "Custom SMTP" 켜고 3번 정보 입력
   - 발신자 이메일: `no-reply@k-haehwadang.com`, 발신자 이름: `해화당`
5. 같은 Authentication 메뉴의 **Rate Limits** → "Email sent" 한도를 2 → **30/시간** 이상으로 상향

**보너스**: 2번에서 SPF·DKIM이 자동으로 해결됩니다. **DMARC 레코드 1개만 추가**하면 이메일 보안 3종 세트 완성:

```
종류: TXT | 이름: _dmarc | 값: v=DMARC1; p=quarantine; rua=mailto:pdkshno1@gmail.com
```

✅ 완료 알림 주시면 → 가입 흐름 실동작 확인을 제가 돌립니다.

---

## 2. GitHub 시크릿 2개 + Sentry 알림 규칙 — 자동 감시 가동

**왜**: 프로덕션 자동 점검(스모크 테스트)이 로그인 정보가 없어 반쪽으로 돌고, 장애가 나도 알림 메일이 안 옵니다.

**GitHub**:

1. https://github.com/k-cubesystem/KHHD → **Settings → Secrets and variables → Actions**
2. **New repository secret** 두 번:
   - 이름 `E2E_USER_EMAIL` / 값: e2e 테스트 계정 이메일 (test@example.com)
   - 이름 `E2E_USER_PASSWORD` / 값: 그 계정 비밀번호 (사장님 보관분)

**Sentry**:

1. https://sentry.io → 해화당 프로젝트 → **Alerts → Create Alert**
2. "Issues" 유형 선택 → 조건 "A new issue is created" → 알림 대상: 사장님 이메일 → 저장

✅ 완료 알림 주시면 → 스모크 액션 수동 1회 돌려 초록불 확인해 드립니다.

---

## 3. 카카오톡 공유 버튼 살리기 — JS 키 1개

1. https://developers.kakao.com → 내 애플리케이션 → 해화당 앱 → **앱 키** → **JavaScript 키** 복사
2. 같은 화면 **플랫폼 → Web**에 `https://k-haehwadang.com` 등록돼 있는지 확인(없으면 추가)
3. https://vercel.com → `hhd` 프로젝트 → **Settings → Environment Variables** → 추가:
   - 이름 `NEXT_PUBLIC_KAKAO_JS_KEY` / 값: 복사한 JS 키 / 환경: Production 체크
4. 환경변수는 **재배포해야 반영**됩니다 — 저장만 해두시면 다음 배포 때 자동 반영.

✅ 완료 알림 주시면 → 다음 배포에 포함시키고 공유 버튼 실동작 확인.

---

## 4. 로컬 옛 AI 키 교체 — 파일 한 줄

**왜**: 제 로컬 테스트 환경(.env.local)에 폐기된 옛 Gemini 키가 남아 있습니다(저는 .env 파일 접근 금지 규칙). 프로덕션은 정상이고, 로컬 AI 테스트만 걸립니다.

1. https://aistudio.google.com → **Get API key** → 현재 유효한 키 복사 (프로덕션에 넣은 그 키)
2. 메모장으로 이 파일 열기:
   `D:\anti\haehwadang\.claude\worktrees\determined-yonath\.env.local`
3. `GOOGLE_GENERATIVE_AI_API_KEY=` 줄의 값을 새 키로 교체 → 저장

---

## 5. 보안 하드닝 스위치들 (각 5분)

| 항목              | 어디서                                                    | 뭘 켜나                                                                    |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Vercel 방화벽     | vercel.com → hhd → **Firewall** 탭                        | Attack Challenge Mode ON                                                   |
| 관리자 2단계 인증 | GitHub·Vercel·Supabase·카카오 각 계정 Settings → Security | 2FA(OTP 앱) 등록 — 4곳 전부                                                |
| 도메인 잠금       | 도메인 구입처(등록기관) 관리 화면                         | Registrar Lock(도메인 잠금) ON                                             |
| DNSSEC            | 같은 곳                                                   | 지원하면 ON. ⚠️ Vercel DNS 사용 중이면 미지원이라 건너뜀 — 잠금만으로 충분 |

---

## 6. (결정 후) 로그인 CAPTCHA — Cloudflare Turnstile 키 발급

**왜**: 비밀번호 로그인에 무차별 대입 방어가 없습니다. 다만 이건 키 발급(사장님) + 로그인 화면 코드 개편(저) 세트라, **하시겠다고 결정되면**:

1. https://dash.cloudflare.com → **Turnstile** → Add site → `k-haehwadang.com` 등록
2. **Site Key / Secret Key** 두 개가 나옴 → 저에게 "발급했다"고 알려주시고, Secret Key는 Supabase → Authentication → **Bot and Abuse Protection**에 입력
3. Site Key는 Vercel 환경변수 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`로 추가

✅ 발급 알림 주시면 → 로그인·가입·비번재설정 3개 화면에 CAPTCHA 위젯 배선을 제가 합니다.

---

## 7. (곧 필요) 웹푸시 알림 키 — 신탁 선톡 푸시용

지금 만들고 있는 **신탁 푸시 알림** 기능은 서버 키 한 쌍(VAPID)이 있어야 켜집니다. 터미널에서 한 줄:

```bash
npx web-push generate-vapid-keys
```

나온 **Public Key / Private Key**를 Vercel(hhd → Settings → Environment Variables)에:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = Public Key (Production)
- `VAPID_PRIVATE_KEY` = Private Key (Production, **Sensitive 체크**)

키가 없어도 앱은 정상 작동합니다(푸시 메뉴만 비활성). 넣고 재배포되면 자동으로 켜집니다.

---

## 8. 토스 웹훅 이벤트 등록 확인 — 결제 취소 감지용

**왜**: 결제 취소 시 복채를 자동 회수하는 수복이 들어갔는데, 이 코드는 토스가 보내는 `PAYMENT_STATUS_CHANGED` 이벤트를 받아야 작동합니다.

1. https://developers.tosspayments.com → 로그인 → 내 개발정보 → **웹훅**
2. 등록된 웹훅 주소가 `https://k-haehwadang.com/api/webhooks/toss` 인지 확인
3. 구독 이벤트에 **`PAYMENT_STATUS_CHANGED`** 가 체크돼 있는지 확인 — 없으면 체크 추가

---

## 완료 체크리스트

- [ ] 1. Resend 가입·도메인 인증·Supabase SMTP 연결·발송 한도 상향 ← **최우선**
- [ ] 1b. DMARC 레코드 추가
- [ ] 2. GitHub 시크릿 2개 + Sentry 알림 규칙
- [ ] 3. 카카오 JS 키 → Vercel 환경변수
- [ ] 4. .env.local Gemini 키 교체
- [ ] 5. WAF·2FA×4·도메인 잠금
- [ ] 6. (결정 시) Turnstile 키 발급
- [ ] 7. VAPID 키 생성 → Vercel 환경변수 2개
- [ ] 8. 토스 웹훅 `PAYMENT_STATUS_CHANGED` 등록 확인

하나 끝날 때마다 채팅에 "1번 했어" 정도로만 알려주시면, 제가 이어받아 검증·배선합니다.
