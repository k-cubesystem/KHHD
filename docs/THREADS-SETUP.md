# Threads 연결 절차 (S1) — 계정 소유자가 직접

코드(S2~S3)는 준비돼 있다(커밋 c2599ab). 이 문서의 절차만 끝나면 `/admin/threads` 상태바가 «연결됨»으로 바뀐다.
전부 브라우저 로그인·OAuth 승인이 필요해 **계정 소유자만** 할 수 있다(에이전트가 대신 못 함).

## 0. 준비물

- 스레드 공식 계정(신규 개설 결정됨 — 「청담해화당」). 인스타 연동 **불필요**(2025-09~).
- Facebook 계정(Meta 개발자 등록용). Threads 계정과 달라도 된다.

## 1. Meta 개발자 앱 만들기 (10분)

1. developers.facebook.com → 로그인 → 「내 앱」 → 「앱 만들기」
2. 사용 사례에서 **「Threads API 액세스」(Threads use case)** 선택 → 앱 이름 «청담해화당 스레드» 등
3. 만들어지면 좌측 「Threads use case」 설정 → 권한 추가:
   `threads_basic` · `threads_content_publish` · `threads_read_replies` · `threads_manage_replies` · `threads_manage_insights`
4. 같은 화면의 **Threads App ID / Threads App Secret** 을 복사(Facebook 앱 ID·시크릿과 다르다 — Threads 것을 쓴다)
5. 「Redirect Callback URLs」에 `https://k-haehwadang.com/api/threads/callback` 추가 (아래 3단계에서 쓴다)
6. `.env.local`(Vercel 환경변수에도) `THREADS_APP_ID=<Threads App ID>` · `THREADS_APP_SECRET=<Threads App Secret>` 추가 → 재배포

## 2. Threads Tester 등록 (App Review 회피 — 자기 계정만 쓰므로 불필요)

1. 앱 대시보드 → 「앱 역할」 → 「역할」 → 「사람 추가」 → **Threads Tester** → 스레드 계정 아이디 입력
2. **스레드 앱**에서 설정 → 계정 → **웹사이트 권한** → 초대 수락

## 3. 토큰 발급 (OAuth)

브라우저에서 아래 URL(값 치환)을 연다:

```
https://threads.net/oauth/authorize?client_id=<THREADS_APP_ID>&redirect_uri=https://k-haehwadang.com/api/threads/callback&scope=threads_basic,threads_content_publish,threads_read_replies,threads_manage_replies,threads_manage_insights&response_type=code
```

승인하면 `k-haehwadang.com/api/threads/callback?code=…` 로 돌아온다. **그 code 는 1시간·1회용**이다.
콜백 라우트(`app/api/threads/callback`, **관리자 로그인 상태에서만 동작**)가 code → 단기 토큰 → 장기 토큰(60일) 교환 후
`threads_tokens`에 저장하고 «연결 완료» 화면을 띄운다.

⚠️ 콜백은 **관리자로 로그인된 브라우저**에서 열어야 한다(아니면 로그인 화면으로 보낸다) — 남이 자기 계정을 우리 앱에 붙이는 걸 막기 위해서다.

## 4. 확인

- `/admin/threads` 상태바: «● 연결됨 @계정명 · 토큰 만료 (60일 후)»
- 「글」 탭에서 텍스트 글 1건 즉시 발행 → 스레드 앱에서 보이면 끝
- 킬스위치 「켜기」 → 크론 3종 가동(댓글 수집 10분·예약 발행 30분·추첨 30분)

## 운영 규칙 (요약 — 상세 PLAN §1.4·§2.5)

- 응모 조건에 좋아요·팔로우·리포스트 **강제 금지**(Meta 스팸 규정)
- 신청 안내 답글은 **큐에서 사람이 승인** — 라운드당 30건 이하, 문안 5종 로테이션
- 결과 풀이는 **초안 검토 후 발표** — 효험 단정·개인 속성 단정·공포 소구 문장은 고쳐서 승인
- 토큰은 60일 — 크론이 만료 7일 전 자동 갱신하지만, 갱신 실패 알림이 오면 3단계를 다시 한다
