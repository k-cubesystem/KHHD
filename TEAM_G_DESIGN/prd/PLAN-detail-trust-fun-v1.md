# 디테일 기획 v1 — 탄탄함(신뢰) · 재미 (2026-07-22)

> 작성: Fable(기획·조사 2건 통합) → 실행: Opus. 전 항목 코드 실측 근거(파일:라인) 보유 — 라인은 어긋날 수 있으니 실행 전 grep 재특정.
> 목표: 큰 그림(기능)은 완성됐다. 이제 사용자가 **"탄탄하고 믿을만하다"**(R축) · **"재미있다"**(F축)를 체감하게 만드는 세부.
> 대원칙: **가격 인상 금지**(표시를 현실에 맞출 뿐, 무료→유료 전환은 사용자 결정 영역) · **기존 파서/태그 계약 보존** · 배선(이미 있는 것 연결) 우선.

---

## R축 — 탄탄함·신뢰 (조사 A 결과)

### R-P0-1. 복채 표시 5중 불일치 해소 — "표시 = 실차감" 강제

**실측**: 같은 기능의 가격이 5곳(MISSION_CATEGORIES · 스튜디오 하드코딩 · TALISMAN_COSTS_DISPLAY · ai_prompts · 실차감)에서 다르다. 관상은 목록 5만냥/버튼 2만냥/실차감 2만냥. 사주·궁합·신년은 1~2만냥으로 **표시되지만 실제론 무료**.
**결정**:

- 방향은 **표시를 실차감(현실)에 맞춘다**. 실차감 현실: 사주(cheonjiin)·궁합·신년·오늘 = 0(무료) / 관상·손금·풍수 = 2 / 재물 = 5 / 이미지생성 = 5.
- `lib/domain/payment/feature-costs.ts` **신설 — 단일 소스**: `FEATURE_COST: Record<featureKey, { display: number; note?: '무료' }>`. `lib/constants.ts`의 MISSION_CATEGORIES·FORTUNE_MISSIONS cost, TALISMAN_COSTS_DISPLAY, 스튜디오 `FACE_COST` 등 하드코딩 전부 이 모듈 참조로 교체.
- 무료 기능은 "무료" 배지로 표기(0을 숨기지 말 것 — 무료임을 자랑하는 게 신뢰).
- `ai_prompts.talisman_cost` 를 실차감 기준으로 UPDATE 하는 시드 마이그레이션(face_reading 5→2, palm_reading 3→2, fengshui_analysis 7→2) + 부재 행 추가(wealth=5, image_generation=5, 무료군은 0) → 어드민 원가 vs 복채 표의 '—' 제거(기존 P2 잔여 흡수).
- **단위·용어 통일(조사 B #11 흡수)**: 화폐 표기는 "복채 N만냥" 한 형태로 통일("N복채" 표기 제거 — DeityPantheon "봉안·N복채" → "봉안 · 복채 N만냥"). 신당·상점의 "구매" → "봉헌"(결제 실패 토스트는 "봉헌이 이루어지지 않았습니다" 등 세계관 언어). 멤버십/충전 결제 화면은 법적 명확성을 위해 "결제" 유지.
- 테스트: FEATURE_COST 와 각 액션 실차감 값의 일치 단언(기능별), "N복채" 문자열 grep 0건.

### R-P0-2. AI 실패 시 복채 환불 — 돈 떼임 제거

**실측**: 차감→AI 실패 경로에 환불이 없다. `saju.ts:137→393`, `wealth.ts:65→134→157`(JSON.parse 원문이라 코드펜스만 있어도 throw), 스튜디오 3종(face/palm/fengshui page — 클라 차감 후 실패 시 복귀만). 올바른 선례: `shaman-chat.ts:343` `refundBokchae`.
**결정**:

- 각 차감-분석 액션의 실패·예외 경로에 `refundBokchae(userId, amount, '{기능} 분석 실패 환불')` 적용. 스튜디오는 차감이 클라에서 일어나므로 **차감을 서버 분석 액션 안으로 이동**이 정석이나 리스크 큼 → 최소수술: 실패 시 클라가 호출할 `refundStudioCost(featureKey)` 서버 액션 신설(직전 차감 검증: 최근 5분 내 동일 featureKey 차감 트랜잭션 존재 확인 후 환불 — 무차감 환불 어뷰즈 방지).
- `wealth.ts` JSON 파싱을 saju 와 동일한 `/\{[\s\S]*\}/` 추출 방식으로 보강(파싱 실패 자체를 줄임).
- 사용자 문구: "복채는 돌려드렸습니다. 잠시 후 다시 시도해주세요."
- 테스트: 파싱 보강 단위 + 환불 액션 가드(무차감 시 거부).

### R-P0-3. 음력 윤달 지원 — 사주 오계산 제거

**실측**: `lib/domain/saju/saju.ts:125` 가 윤달 플래그 없이 양(+)월만 전달 → lunar-javascript 는 윤달을 음(-)월로 받아야 함 → **윤달 출생자는 월주가 틀린다**.
**결정**:

- `profiles`·`family_members` 에 `is_leap_month boolean DEFAULT false` 컬럼(멱등 마이그레이션).
- 입력 폼(프로필 편집·가족 등록) 음력 선택 시에만 「윤달」 체크박스 노출.
- `getSajuData` 시그니처에 isLeapMonth 전파(기본 false — 기존 호출부 무수정 호환) → `Lunar.fromYmdHms(y, -m, d, ...)` 음월 전달. 라이브러리 윤달 규약은 구현 시 lunar-javascript 문서/소스로 확정.
- **골든 테스트**: 알려진 윤달 사례 1건 이상(예: 윤달 날짜의 월주가 평달과 달라짐을 단언 + 신뢰할 만한 만세력과 대조해 기대값 고정 — 대조 근거를 테스트 주석에 남길 것).

### R-P1-4. 출생시간 모름 UX

**실측**: "모름" 옵션이 없고 기본 12:00 조용히 강제, 서버 기본값도 '00:00'/'12:00' 혼재.
**결정**: 시주 제외 만세력은 대수술이라 이번엔 **정직한 표시** 전략:

- 생시 셀렉트에 「시간 모름」 옵션 추가(값 null). null 이면 계산은 12:00 유지하되 ①결과 상단에 "출생 시간 미상 — 시주(時柱) 풀이는 참고만 하세요" 고지 ②프롬프트에 "출생 시간 미상. 시주 의존 해석은 보류적으로, 연·월·일주 중심으로" 지시 한 줄.
- 서버 기본값 '12:00' 로 통일(`'00:00'` 산재 제거 — cheonjiin.ts:170,188 · wealth.ts:90 · core/analysis.ts:37).

### R-P1-5. 결과 화면 근거 제시 — 명식(팔자표) 노출

**실측**: 원국 팔자표가 만세력 페이지에만 있고 AI 풀이 결과엔 없다 → "지어낸 말" 인상.
**결정**: `components/analysis/PillarsStrip.tsx` 신설 — 4주(연/월/일/시) 천간·지지 + 오행 색상만 담은 **한 줄 컴팩트 스트립**(만세력 풀버전 재사용은 과함). 사주(cheonjiin) 결과 최상단 + 오늘의 운세 상단에 "당신의 명식 기준" 으로 배치. 데이터는 기존 getSajuData 산출물 재사용. 시간 미상이면 시주 칸에 "미상" 표기(R-P1-4 연동).

### R-P1-6. 면책 고지 공통화

**실측**: 스튜디오에만 있고 사주·오늘·재물·신년 결과엔 없다.
**결정**: `components/shared/ServiceDisclaimer.tsx` 신설(한 줄, ink-light/40 소형): "본 풀이는 전통 명리학을 바탕으로 한 AI 해석으로, 참고용입니다. 중요한 결정은 신중히 내리세요." — 전 분석 결과 하단 공통 배치(cheonjiin·saju-result·today·wealth·new-year·compatibility).

### R-P1-7. 잔여 정합 (묶음)

- 스튜디오 가족 분석의 이력 귀속: `image.ts` `persistImageAnalysisHistory` 에 targetId/targetName/relation 파라미터화 — 스튜디오 페이지가 넘기는 실제 대상 기록(기본값은 현행 본인 유지 = 호환).
- `gemini-rate-limiter.ts:40,51` console.error → logger 교체.
- `destiny-utils.ts:68` calendar_type null → "음력" 오표기 → `isSolarCalendar()` 로 교체.
- 오펀 삭제(참조 0 재확인 후): `saju.ts` analyzeSajuDetail·generateDestinyImage, `image.ts:1203` checkAndDeductCredits(존재하지 않는 컬럼 참조), `components/onboarding/onboarding-tour{,-wrapper}.tsx`(조사 B 확인 — 타깃 클래스도 부재).
- `e2e/prod/compatibility.spec.ts:46` 의 #418 마스킹 필터: 필터 제거 후 실 e2e 로 통과 확인되면 제거 확정, 재발하면 원인(궁합 화면 날짜 렌더) 수정.

---

## F축 — 재미·몰입 (조사 B 결과. [배선]=이미 있는 코드 연결)

### F-1. [배선] 신탁 도착 알림 — 재방문 루프의 구멍

**실측**: 신탁(oracle) 생성 시 알림 0건 — 신당에 안 가면 영영 모름. 개인알림 파이프(GlobalGuide personalNotice + 알림센터)는 이미 있다.
**결정**: `oracle.ts` 신탁 생성 직후 `notifications` 1건 삽입(type `deity_oracle`, 제목 "「{신위명}」이 신탁을 내렸습니다", CTA → `/protected/shrine`). oracle 당 1회 멱등(oracle id 를 메타에 저장해 중복 방지). `NOTICE_CTA` 맵(guide.ts)에 `deity_oracle` 추가.

### F-2. [배선] 오너 신당에 소원·방명록 노출

**실측**: `ShrineWishForm/Log` 가 공개 신당 페이지에만 렌더. 오너는 자기 신당의 소원·방명록·wishCount 를 못 본다.
**결정**: 본인 신당(`protected/shrine`)에 소원 빌기 버튼 + 방명록 열람 패널 배선, `wishCount` 를 방문자수 옆에 표시. 기존 컴포넌트 재사용 — 신규 UI 최소.

### F-3. [배선] 강신 의식에 Veo 영상 연결 (한 줄)

**실측**: `GangshinOverlay` 가 `backgroundVideoId` 를 지원하는데 `DeityPantheon.tsx:247-257` 이 안 넘긴다 — 세션27 에서 만든 summon-ritual 영상이 유휴.
**결정**: `backgroundVideoId="summon-ritual"` 전달. 끝.

### F-4. [배선] 보상 순간 사운드·연출 3종

**실측**: 출석 보상(시각 풍부·무음), 복채 충전 완료(연출 전무), 인연 레벨업(채팅 발광·무음), 분석 완료(무음). confetti·useShrineAudio 이미 존재.
**결정**:

- 출석 도장 순간: `chime` 1회(전역 음소거 존중).
- 복채 충전 success 화면: 컨페티(멤버십 success 의 기존 패턴 재사용) + "복채 N만냥이 들어왔습니다" 강조.
- 인연 레벨업(채팅): `bara` 1회.
- 분석 로딩 '合' 전환 순간: sparkle 파티클 버스트 + `bell` 1회.
- 공통: 사용자 제스처 이전 자동재생 금지(브라우저 정책), 음소거 설정(`hhd_shrine_muted`) 존중.

### F-5. [배선] 미사용 파티클 3종 연결

**실측**: petals/ripple/resonance 정의만 있고 emit 0.
**결정**: 공물 헌납 성공 → petals, 오행 공명 → resonance(기존 sparkle 대체 아님, 추가), 소원 빌기 성공 → ripple.

### F-6. [신규·中] 대시보드 「오늘 할 일」 허브 — 데일리 루프 완성

**실측**: 출석(프로필)·오늘의 운세(대시보드 카드)·신탁(신당) 이 3화면에 흩어짐. 신당 안에만 슬림 할일바 존재.
**결정**: `components/analysis/dashboard/DailyRitualCard.tsx` 신설 — 대시보드 최상단(사주 유도 카드 아래)에 3칩: ①출석 도장(오늘 안 찍었으면 붉은 점) ②오늘의 운세(오늘 미열람 시 강조) ③신탁(미확인 있으면 "신탁이 와 있습니다"). 서버 액션 `getDailyRitualStatus()` 하나로 3상태 반환(attendance 오늘 여부 · daily_fortunes 오늘 조회 여부 · 미확인 oracle 수). 완료 시 도장 찍힌 상태(회색 체크)로 남겨 "오늘 다 했다" 만족감. 이름은 "오늘의 정성".

### F-7. [신규·中] 오늘의 운세 구조화 — "어제와 다름" 체감

**실측**: 로그인 오늘운세가 AI 텍스트 한 덩어리. 게스트 프리뷰가 오히려 구조적(별점). fortune-analysis 의 FortuneResult 에 lucky{} 구조 이미 존재.
**결정**: `daily-fortune-view` 를 구조화 렌더로: 상단 별점(총운) + 행운 카드 3칩(색·숫자·시간 — 초롱 unlock effect 의 '행운의 시간'과 연동, 기존 값 재사용) + 본문. **프롬프트 계약 변경 최소화**: daily.ts 산출물이 `{content}` 텍스트라면, 구조 요소는 결정적 파생(일진 기반 오행→색 매핑 등 순수함수)으로 생성 — AI 재호출·태그 추가 없이 매일 바뀌는 구조 요소 확보. 파생 로직은 `lib/domain/fortune/daily-lucky.ts` 순수함수 + 단위 테스트(같은 날짜·사주 = 같은 결과, 날짜 바뀌면 변화).

### F-8. [신규·小] 테마 수집 진행 표시

**실측**: 테마가 가로 칩뿐, 수집 개념 없음.
**결정**: 신당 테마칩 행 옆에 "N/8" 뱃지 + 미보유 칩에 자물쇠·반투명 처리(신위 도감 문법 재사용). 상점 테마 탭에도 "N/8 수집" 헤더.

---

## 실행 순서 (Opus — 전부 자동, 단계별 게이트)

| 단계     | 내용                                                                   | 게이트                       |
| -------- | ---------------------------------------------------------------------- | ---------------------------- |
| **R1**   | R-P0-1 비용 단일소스+표시통일+시드 + R-P0-2 환불                       | tsc·jest·build → 커밋 → 배포 |
| **R2**   | R-P0-3 윤달(스키마+폼+계산+골든) + R-P1-4 시간모름                     | tsc·jest·build → 커밋 → 배포 |
| **R3**   | R-P1-5 팔자표 + R-P1-6 면책 + R-P1-7 정합 묶음                         | tsc·jest·build → 커밋 → 배포 |
| **F1**   | F-1~F-5 배선 5종 (신탁알림·소원방명록·강신영상·보상연출·파티클)        | tsc·build → 커밋 → 배포      |
| **F2**   | F-6 오늘의 정성 허브 + F-7 운세 구조화 + F-8 테마 수집                 | tsc·jest·build → 커밋 → 배포 |
| **마감** | 로드맵·MEMORY 갱신 + 전체 prod 회귀(기존+신설 스펙 직렬) + 최종 보고서 | 회귀 0 실패                  |

e2e 신설: R1(비용 표시 무료 배지·관상 2만냥 표기), F1(신탁 알림 행 생성 — DB 확인으로 대체 가능), F2(오늘의 정성 카드 렌더·운세 구조 요소). 기존 스펙 회귀 필수.

## 금지·주의

- **가격 인상 금지** — 실차감 값 변경은 이 기획의 범위 밖. 표시·시드 정정만.
- 이미지 파서 태그 계약([[...]]) 불변. daily 프롬프트도 이번엔 불변(구조 요소는 결정적 파생).
- `.gitignore` 에 `assets-src/video/` 추가(Veo 원본 11MB — 재생성 가능하므로 리포 제외).
- 타 세션 미커밋 5파일(membership.ts·family.ts·04*membership_tiers.sql·family-limit.test.ts·20260720_drop*\*) add·수정 금지.

## 사용자 결정 대기 (구현과 무관)

1. 무료 기능(사주·궁합·신년)의 유료 전환 시점 — 현재는 "무료" 정직 표기로 감.
2. F-6 카드 명칭 "오늘의 정성" — 다른 이름 원하면 상수 1곳.
