# PLAN — Threads 무료 사주 이벤트 자동화 v1

작성 2026-08-17 · 발주: CEO "스레드로 무료 사주 이벤트를 계속 돌리며 회원수를 늘린다. 자동 글쓰기 · 댓글 관리 ·
당첨자만 진행 · 보고서 — 시스템으로 구축"
근거: Threads API 공식 문서 직접 열람(2026-08-17) + 앱 자산 감사 + `MARKETING-PLAN-v1.md`(모계획, 필라 5 UGC 트랙)

---

## 0. 조사가 바꾼 것 — 원안 그대로는 못 간다

원안 «스레드 글 → 댓글로 응모 → 자동 답글로 사주 결과 → 당첨자 진행»은 **세 지점에서 정책·API 벽에 부딪힌다**:

| #   | 사실 (출처: 문서 §5)                                                                                                    | 설계 귀결                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| ①   | **DM API 없음.** 당첨자 안내 = 공개 답글(`reply_to_id`)뿐. 비공개 계정 댓글은 `username`조차 안 옴                      | 생년월일시(개인정보)를 스레드 댓글로 받게 하면 안 된다 → **응모는 우리 사이트의 신청 폼**. 스레드는 유입·발표 채널 |
| ②   | **"참여 대가 경품"은 Meta 스팸 규정 명시 금지** ("좋아요하면 추첨")                                                     | «댓글 달면 추첨»이 아니라 **«관심 표명 → 사이트에서 신청 → 선정»**. 좋아요·팔로우를 조건으로 걸지 않는다           |
| ③   | **반복 템플릿 자동 답글 = 스팸 지표** (한도 이내라도 "posting repetitive content" 계정 제한 사유) + 답글 한도 1,000/24h | 답글은 **소량·변주·사람 승인 후 발송**. 무제한 자동 응대 봇 금지                                                   |

또 하나 — **App Review 없이 쓰려면 «자기 계정·자기 글» 범위만** 가능(Threads Tester 등록). 남의 글 댓글, 웹훅은
비즈니스 인증·리뷰가 전제. 우리 용도(자기 계정 운영)는 리뷰 없이 전부 커버된다. **웹훅은 못 쓰니 폴링.**

이 셋을 반영한 이벤트 흐름:

```
[스레드 게시]  자동 — 이벤트 안내 글 + 사주 콘텐츠 글(매일)
     ↓
[댓글 수집]    자동 — 폴링(10분) → DB 적재 → 분류(신청 의사 / 질문 / 잡담 / 스팸)
     ↓
[안내 답글]    반자동 — 신청 의사 댓글에 «신청 링크» 답글 (승인 큐 → 사람 1클릭 → 발송, 변주 문안)
     ↓
[사이트 신청]  사용자 — /event/[slug] 폼: 스레드 아이디 + 생년월일시 + 성별 + 궁금한 주제 + 개인정보 동의
     ↓
[선정]         자동 — 마감 시 결정론 추첨(seed 공개) 또는 운영자 선택. 중복·봇 배제
     ↓
[결과 제작]    자동 — calculateManse(순수) + generateAIContent → 풀이 초안 + 결과 카드(OG)
     ↓
[결과 발송]    반자동 — 초안을 운영자가 검토 → 승인 → 스레드 게시(당첨자 @멘션 + 카드 + 사이트 링크)
     ↓
[보고]         자동 — 주간: 게시·댓글·신청·선정·전환(가입·결제)·인사이트(views/likes) → 어드민 + Artifact
```

**«당첨자만 진행»의 실체** = 신청자 중 선정된 사람만 결과 제작·발송 단계로 넘어간다. 나머지는 사이트 가입 유도(무료 오늘의 운세).

---

## 1. 이벤트 상품 설계 (마케팅 관점)

### 1.1 왜 «무료 사주 풀이»가 이 채널에서 먹히나

- 포스텔러의 검증된 엔진 = 결과 공유 바이럴(일 방문자 35%). 스레드는 텍스트+이미지 카드가 리포스트로 도는 구조라 **결과 카드 자체가 광고**가 된다
- 스레드는 인스타 계정 없이도 API 가능(2025-09~) — 별도 계정 개설 부담 0
- 40-50 여성(1차 타깃)의 스레드 침투율은 미확인이나, 20-30(2차, 궁합)은 확실히 서식 → **초기엔 궁합·연애·직장운 주제가 반응이 빠를 것**(추측 — 2주 실측으로 확정)

### 1.2 시즌 라운드 구조 (주 1라운드)

| 요일  | 게시                                                                                | 목적                                                |
| ----- | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| 월    | **라운드 오픈** — "이번 주 주제: 궁합 5명" + 신청 링크                              | 신청 접수 시작                                      |
| 화~금 | **콘텐츠 글** — 오늘의 간지 한 줄 · 사주 상식 · 신당 세계관 이미지(필라 1·2 재사용) | 팔로우 축적, 계정이 «봇»이 아니라 «편집자»로 읽히게 |
| 토    | **마감 + 선정 발표** — 당첨자 @멘션 + 다음 라운드 예고                              | 참여 보상 가시화                                    |
| 일    | **결과 공개** — 당첨자 결과 카드(본인 동의분만)                                     | 결과 카드 = 다음 라운드 광고                        |

주제 로테이션: 궁합 → 재물운 → 직장·이직 → 연애 → 가족(부모님 사주) → 신년(12월~). **매 라운드 주제가 다르면 «반복 콘텐츠» 지표를 피하고 관심층이 넓어진다.**

### 1.3 선정 인원·비용

- 라운드당 5명 → 월 20명. AI 해석 비용은 사실상 0(gemini-3.5-flash), 카드 이미지 장당 $0.04
- 결과는 «간이 풀이»(핵심 3~4문단) — 정식 풀이(2만냥)와 차별화. 결과 카드에 "정식 풀이 보기" CTA
- 선정 우선순위: 신청 시 «궁금한 점»을 구체적으로 쓴 사람(콘텐츠 품질 ↑) → 그 안에서 결정론 추첨

### 1.4 가드레일 (MARKETING.md §2 + 정책 조사)

- 결과 문안: 효험 단정 금지 · 2인칭 개인 속성 단정 금지("당신은 지금 불행" ❌) · 공포 소구 금지 — **AI 초안을 사람이 검토하는 이유**
- 응모 조건에 좋아요·팔로우·리포스트 **강제 금지**(스팸 규정). "팔로우하면 다음 라운드 소식을 받을 수 있어요"는 권유로만
- 개인정보: 생년월일시는 **사이트 폼에서만**, 수집 목적·보관 기간 고지·동의 체크. 결과 공개는 **본인 동의 체크한 사람만**, 공개 시 성명 마스킹·생년 미노출
- 스레드 자동 답글: 하루 소량(라운드당 신청 유도 답글 ≤ 30건), 문안 5종 이상 로테이션 + 댓글 내용 반영 한 줄 → «반복 콘텐츠» 회피

---

## 2. 시스템 설계

### 2.1 구성

```
┌─ Threads API ─────────────────┐     ┌─ 우리 앱 (Next.js + Supabase) ──────────────────────┐
│ POST /me/threads (게시)        │ ←── │ cron/threads-publish   (예약 글 발행, 30분)          │
│ GET /{media}/replies (댓글)    │ ──→ │ cron/threads-sync      (댓글 폴링·분류·인사이트, 10분)│
│ POST /me/threads reply_to_id  │ ←── │ admin action: 승인 큐에서 «발송» 클릭                 │
│ GET /{media}/insights         │ ──→ │ cron/threads-sync                                    │
└───────────────────────────────┘     │                                                      │
                                      │ /event/[slug]  신청 폼(비로그인 가능)                 │
                                      │ cron/event-draw        (마감 시 선정 + 초안 생성)     │
                                      │ /api/og/event/[token]  결과 카드 이미지               │
                                      │ /admin/threads         큐·라운드·신청자·보고           │
                                      │ cron/threads-report    (주간 보고서, 월 09:00 KST)    │
                                      └──────────────────────────────────────────────────────┘
```

**폴링인 이유**: 웹훅은 Live Mode + 비즈니스 인증(+일부 App Review)이 전제라 당장 못 쓴다. 폴링 예산은
읽기 4,800×impressions/24h(최소 48,000) — 10분 간격 × 활성 글 20개 = 2,880/일로 여유.

### 2.2 데이터 (신규 마이그레이션 1건)

```
threads_posts        내가 발행한 글 (media_id, kind: campaign|content|announce|result, body, media_url,
                      round_id?, scheduled_at, published_at, status, insights jsonb, insights_at)
threads_replies      수집한 댓글 (reply_id, post_id→threads_posts, username?, text, ts,
                      classification: apply|question|chat|spam|other, classified_by: rule|ai,
                      hide_status, our_reply_id?, handled_at)
threads_reply_queue  발송 대기 답글 (reply_to→threads_replies, draft_text, variant_key,
                      status: pending|approved|sent|rejected|failed, approved_by, sent_reply_id, error)
event_rounds         라운드 (slug, topic, opens_at, closes_at, winner_count, status: draft|open|closed|
                      drawn|published, draw_seed, threads_post_id?)
event_entries        신청 (round_id, threads_username, contact(email|phone, 선택), birth_date, birth_time?,
                      gender, question text, consent_public bool, consent_privacy_at,
                      ip_hash, ua_hash, utm jsonb, dedupe_key = round_id+lower(username))
event_winners        선정 (entry_id, rank, draft_reading text, draft_status: generating|ready|approved|rejected,
                      card_token, published_post_id?, published_at, converted_user_id?)
threads_tokens       장기 토큰 (user_id, access_token(암호화), expires_at, refreshed_at) — 1행
```

- RLS: 전 테이블 `is_admin()` 정책 필수(리포 관례상 서버 액션이 role 검사를 안 함) + `event_entries`만 **anon INSERT 허용·SELECT 금지**(응모 폼) — 이 리포에 anon write 전례가 없어 신설 정책은 보안 검토 대상
- 왜 `analysis_history` 재사용 안 하나: user_id 기반이라 비로그인 응모자를 못 담는다. 이벤트 결과는 `event_winners.draft_reading`에 두고, 당첨자가 가입하면 `converted_user_id`로 연결(전환 계측)

### 2.3 서버 모듈

| 모듈               | 위치                                                      | 재사용                                                                                        | 신규                                                                                                                         |
| ------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Threads 클라이언트 | `lib/services/threads/client.ts`                          | —                                                                                             | 2단계 게시(컨테이너→30초→publish), 상태 폴링, replies 페이지네이션, insights, 토큰 갱신(24h 경과·만료 전), 레이트리밋 카운터 |
| 댓글 분류기        | `lib/domain/threads/classify.ts`                          | `generateAIContent`(jsonMode)                                                                 | 규칙 1차(키워드: 신청/궁합/사주/저요/@멘션) → 애매한 것만 AI. 결정론·테스트 가능                                             |
| 답글 문안          | `lib/domain/threads/reply-variants.ts`                    | —                                                                                             | 문안 5종+ 로테이션 · 댓글 한 구절 반영 · 500자 · 링크 1개(UTM 부착)                                                          |
| 이벤트 사주        | `app/actions/event/reading.ts`                            | **`calculateManse()`**(순수) + `generateAIContent` + `lib/ai/input-guard`                     | 비로그인용 간이 풀이(주제별 프롬프트) — `analyzeCheonjiinAction`은 targetId·로그인·차감에 묶여 재사용 불가                   |
| 신청 폼 액션       | `app/actions/event/apply.ts`                              | `rate_limit_entries` 테이블                                                                   | IP·username 스로틀, 봇 방어(허니팟+시간), 동의 기록                                                                          |
| 추첨               | `lib/domain/event/draw.ts`                                | —                                                                                             | 결정론(seed 공개·재현), 중복 배제, «질문 구체성» 가중 → 테스트 필수                                                          |
| 결과 카드 OG       | `app/api/og/event/[token]/route.tsx`                      | `app/api/og/shrine/[userId]`(DB 조회형 전례)                                                  | 1080×1080(스레드 정방형) — 기존 OG는 1200×630 고정                                                                           |
| 크론 4종           | `app/api/cron/threads-{publish,sync,report}` `event-draw` | `daily-fortune/route.ts` 골격(CRON_SECRET·system_settings 토글·admin client)                  | `vercel.json` crons 추가. **킬스위치**: `system_settings.threads_automation_enabled`                                         |
| 어드민             | `app/admin/threads/`                                      | announcements 구조 + `runManualAutomation` 수동 트리거 전례 + 사이드바 «이벤트 & 마케팅» 섹션 | 라운드 CRUD · 승인 큐(답글·결과 초안) · 신청자 목록 · 보고서 뷰                                                              |
| 콘텐츠 글 생성     | `scripts/media-assets/threads-content.mjs`                | `kie.mjs sns-image` + `sharp` 카드 합성(`ritual-plaque.mjs` SVG-text 전례)                    | 화~금 콘텐츠 이미지 배치 생성 → 공개 URL(Supabase Storage 공개 버킷)                                                         |

### 2.4 미디어 전달

Threads는 **공개 URL만** 받는다(업로드 API 없음). Supabase Storage 공개 버킷 `threads-media/`에 올리고 URL 전달.
이미지 ≤8MB·폭 320~1440 · 영상 ≤5분·1GB·moov atom 앞(`post.mjs encode`의 `+faststart`가 이미 처리).

### 2.5 자동/반자동 경계 (확정)

| 단계                    | 모드                                    | 이유                                                                     |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| 콘텐츠·라운드 글 발행   | **자동**(예약)                          | 내 계정·내 글, 한도 250/일 대비 하루 1~2건                               |
| 댓글 수집·분류·인사이트 | **자동**                                | 읽기 전용                                                                |
| 신청 유도 답글          | **반자동** — 큐 승인                    | 반복 콘텐츠 지표 회피 + 엉뚱한 댓글에 답하는 사고 방지. 라운드당 ≤30건   |
| 선정                    | **자동**(마감 크론)                     | 결정론·seed 공개로 공정성 입증                                           |
| 결과 풀이 발송          | **반자동** — 초안 검토 승인             | 가드레일(효험 단정·개인 속성 단정)은 공개 지면에서 터지면 되돌릴 수 없다 |
| 스팸·악성 댓글 숨김     | **반자동** — 분류 spam은 큐, 1클릭 hide | 오탐이 사용자를 가린다                                                   |
| 보고서                  | **자동**                                | —                                                                        |

운영자 하루 소요 추정: 답글 승인 5분 + 주 1회 결과 초안 검토 20분.

### 2.6 보고서 (주간, `cron/threads-report` → 어드민 + Artifact 발행)

- 발행 글 수·유형별 views/likes/replies/reposts (인사이트 API)
- 댓글 수·분류 분포·답글 발송 수·응답 지연
- 신청 수·중복/봇 배제 수·선정 수·결과 발송 수
- **전환**: 신청 링크 클릭(UTM `utm_source=threads&utm_campaign=round-{n}`) → 가입 → 첫 결제 — _Track A-1(UTM 귀속)이 선행돼야 이 줄이 참이 된다_
- 팔로워 증감(`followers_count`), 라운드별 주제 반응 비교 → 다음 주제 추천

### 2.7 보안·운영

- 토큰: 60일 장기 토큰, **24시간 경과 후~만료 전 갱신** 조건 — 크론(`threads-sync`)이 만료 7일 전 자동 갱신, 실패 시 Sentry 경보. 60일 놓치면 재인증(브라우저)이라 알림 필수
- 권한 부여 90일 별도 만료 — 갱신 시 연장, 어드민에 만료일 표시
- 킬스위치 `threads_automation_enabled` + 라운드별 `status` — 사고 시 1분 내 정지
- 신청 폼: 스로틀(IP 10/시·username 1/라운드), 허니팟, 제출 시간 검사, `input-guard`. anon INSERT라 **RLS WITH CHECK로 컬럼 범위 제한**
- 개인정보: 응모 데이터 보관 90일 후 생년월일시 파기(크론), 공개 결과는 동의분만·마스킹
- 로그: 모든 API 호출 결과 `threads_api_logs`(레이트리밋 카운트 포함), `console.log` 단독 금지 → logger

---

## 3. 착수 순서 (5단계 · 실측 게이트)

| 단계                      | 산출                                                                                                                              | 게이트                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **S1 계정·인증**          | Meta 개발자 앱(Threads use case) · Threads Tester 등록·수락 · 장기 토큰 발급 · `threads_tokens` 저장 · 클라이언트 `whoami` 실호출 | 내 프로필 JSON이 돌아온다                                           |
| **S2 게시·수집**          | 마이그레이션 · 클라이언트(게시·replies·insights) · `cron/threads-sync` · 어드민 최소 화면(글 목록·댓글 목록)                      | 테스트 글 1건 발행 → 댓글 수집 확인 → 컨테이너 상태·레이트리밋 로그 |
| **S3 이벤트 파이프**      | `event_rounds/entries/winners` · `/event/[slug]` 폼 · 추첨 · 간이 풀이 · OG 카드 · 승인 큐                                        | 내부 라운드 1회 완주(신청→선정→초안→승인→발송)                      |
| **S4 반자동 답글·콘텐츠** | 분류기 · 문안 변주 · 답글 큐 · `threads-content.mjs` 배치 · `cron/threads-publish`                                                | 첫 공개 라운드(5명)                                                 |
| **S5 보고·운영**          | `cron/threads-report` · Artifact · 토큰 갱신·파기 크론 · 킬스위치                                                                 | 2주 운영 후 회고 → 주제·빈도 조정                                   |

S1은 **CEO 계정 소유자만 가능**(브라우저 OAuth 승인 — Higgsfield 때와 동일). S2부터 코드.

---

## 4. 결정 대기 (CEO)

1. **이벤트 구조 변경 동의** — «댓글로 응모» → «스레드 안내 + 사이트 신청 폼»(정책·개인정보 사유, §0). 이게 핵심 분기
2. **결과 발송 반자동** 동의 — 풀이 본문은 사람 승인 후 발송(가드레일). 완전 자동을 원하면 리스크 수용 명시 필요
3. **스레드 계정** — 기존 계정 사용 vs 신규(«청담해화당» 공식). API 연결할 계정 확정 → S1 OAuth 승인 필요
4. **라운드 규모** — 주 1라운드·5명 시작안 승인 여부
5. **개인정보 처리방침 갱신** — 이벤트 응모 항목(생년월일시 수집·90일 보관) 추가 필요(법정 고지, Track A-9와 합류)

---

## 5. 출처 (Threads API — 2026-08-17 공식 문서 직접 열람)

- 게시: developers.facebook.com/documentation/threads/posts · reference/publishing — 2단계, 공개 URL만, 텍스트 500자, 이미지 8MB·폭 1440, 영상 5분·1GB
- 댓글: …/retrieve-and-manage-replies — 내 글 replies/conversation, `username`은 공개 계정만, 답글 `reply_to_id`, hide는 내 글 최상위만
- 한도: …/overview — 게시 250·답글 1,000·삭제 100 (24h 이동창), 읽기 4,800×impressions
- 인증: …/get-started · long-lived-tokens — 단기 1h → 장기 60일(24h 후 갱신), 권한 90일, **Tester면 App Review 불필요**
- 웹훅: …/webhooks — Live Mode+비즈니스 인증 전제(문서 간 표현 상충 → 실측 전 «불가» 가정)
- 인사이트: …/insights — 게시물 views/likes/replies/reposts/quotes/shares, 계정 followers_count·demographics
- DM: reference 전 목록·changelog에 부재 → **불가 확정**
- 정책: transparency.meta.com/policies/community-standards/spam — 고빈도·반복 콘텐츠·참여 대가 경품 금지 / developers.facebook.com/devpolicy
- 앱 자산: `calculateManse`(lib/domain/saju/manse.ts:286) · `generateAIContent`(lib/services/ai-client.ts:36) · 크론 골격(app/api/cron/daily-fortune) · OG DB조회형(app/api/og/shrine) · sharp 카드(scripts/shrine-assets/ritual-plaque.mjs:334) · 어드민 «이벤트 & 마케팅»(app/admin/layout.tsx:35)
