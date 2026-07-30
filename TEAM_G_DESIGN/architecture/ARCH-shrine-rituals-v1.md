# ARCH-shrine-rituals: 의식 3종 시스템 아키텍처

버전: v1.0 | 작성: TEAM_G | 2026-07-30 | 대응 PRD: PRD-shrine-rituals-v1

## 1. 공통 결정 (이번 주 사고 3건의 교훈이 그대로 제약)

| 제약                                                                           | 근거 사고                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------ |
| 연출 CSS 는 `app/shrine-scene.css` 전용 + `check-animation-css.mjs` 목록 등록  | styled-jsx 빌드 미산출(P0, 2026-07-30)     |
| 재화·보상 지급 함수는 `lib/services/*`(server-only) — 'use server' export 금지 | addTalismans/addBokPoints 공개 노출(P0/P1) |
| 판정·문구는 순수 결정론 모듈 + 테스트 (Date.now 는 인자로)                     | stage.ts~keeper-walk 규율                  |
| 신규 테이블 RLS: 본인 SELECT · 쓰기 service_role, 처음부터                     | S1a/S1b                                    |
| 민감 텍스트(액운·고민 원문)는 **스키마에 컬럼을 만들지 않는다**                | 프라이버시 = 기획 가치                     |

## 2. 모듈 지도

```
lib/domain/ritual/
  aekmak.ts        태그 6종·일 3회 판정(KST)·연소 타임라인 상수          (순수)
  obangki.ts       결정론 셔플·옵션 배정·색 문구 풀 120                    (순수)
  vow.ts           진행률(total_days − snapshot)·완주 판정·회차            (순수)
lib/services/
  ritual-grant.ts  공유 보상·완주 보상 지급 (server-only, bok-grant 패턴)
app/actions/shrine/
  rituals.ts       burnAekmak(태그만 수신)·drawObangki·startVow·submitVowWish
components/shrine/scene/
  AekmakSheet.tsx  작성→부적→드래그 점화→연소(마스크 애니)→정화 카드
  ObangkiDraw.tsx  셔플→뽑기(drag-up)→펼침→말풍선 연계
  VowStrip.tsx     서약·진행(백일초)·완주 — DevotionStrip 아래
app/shrine-scene.css  ritual-* 키프레임 전량 (+게이트 목록 등록)
```

## 3. 데이터 (전부 추가만)

```sql
shrine_aekmak_logs (id, user_id, tag text CHECK (tag IN (...6종)), burned_at timestamptz)
  -- 원문 컬럼 없음(스키마로 강제). 일 3회 = KST count. 인덱스 (user_id, burned_at DESC)
obangki_draws (id, user_id, color text, qtype text, drawn_at)          -- 질문 원문 없음
shrine_vows (id, user_id, started_at, devotion_snapshot int, target_days int DEFAULT 100,
             completed_at, wish_text text NULL,        -- 완주 후 명시 동의 제출분만
             video_status text DEFAULT 'none', video_url text NULL)
  -- 활성 서약 1건 제약: UNIQUE (user_id) WHERE completed_at IS NULL
```

완주 훅: 기도 적립 경로(shrine-wishes → devotion 갱신) 직후 활성 서약의
`total_days − snapshot ≥ target_days` 검사 → completed_at 기록 + 알림(기존 notifications).

## 4. 연출 기술

- **연소**: 부적 컨테이너에 `mask-image: linear-gradient(0deg, transparent p%, black p+8%)`
  의 p 를 키프레임 진행(0→110%, 2.4s) + 탄 가장자리 레이어 1겹. transform/opacity/mask 만.
  재·불티는 EffectsCanvas `emit('smoke'|'flame')` 재사용(캔버스 무수정)
- **오방기 뽑기**: pointer drag-up 임계 40px → 뽑힘(translateY 스프링) → 펼침(scaleY+rotate).
  셔플은 5기 교차 이동 키프레임. 카메라 팬과 제스처 충돌: 시트 안에서만 동작(룸 팬 비활성 영역)
- **백일초**: 진행률 → 초 높이 % (CSS 변수 주입, 인라인) — 게임필 촛불 글로우 클래스 재사용
- reduced-motion: 연소·셔플 즉시 완료(콜백 순차 — useCinematics 계약과 동일 문법)

## 5. 과금·보상 경로

- 액막이: 무료(레이트리밋 일 3회, 서버 판정). 부적 스킨 판매 시 기존 카탈로그/복채 경로 재사용
- 오방기: 일 3회 무료 → 초과 시 `spendBokchae('obangki')`(feature-costs 단일 소스에 등록)
- 백일기도: 완주 보상 지급은 ritual-grant.ts(멱등 — vow id 기준 1회). 실물 굿 상품은 별도 SKU(보류)
- 공유 보상: 기존 `claimShareReward`(일 1회 20복) 재사용 — 신규 지급 경로 만들지 않음

## 6. 리스크

| 리스크                                  | 대응                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| 감정 텍스트가 로그·Sentry 로 새는 실수  | 액션 파라미터에 원문 자체를 받지 않음(클라에서만 렌더·소각) — 서버는 tag 만 수신 |
| 오방기 결과의 단정 어투(금전 조언 오인) | 문구 풀 린트: 금지 어휘 목록 테스트(사라/팔아라/투자 등)                         |
| 완주 판정 이중 지급                     | vow id 멱등 + service_role 단일 경로                                             |
| 영상 서명 URL 유출                      | 만료 24h + 재발급 UI, storage RLS                                                |
