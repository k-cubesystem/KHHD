# ARCH-energy-circle: 기운 무리(群) — 시스템 아키텍처

버전: v1.0 | 작성: TEAM_G ARCHITECT | 날짜: 2026-09-04
쌍둥이 문서: `TEAM_G_DESIGN/prd/PRD-energy-circle-v1.md`
상태: DRAFT — PRD 결정 큐 회신과 TEAM_H Gate 1 뒤 확정

> 원칙 셋. ① **새 인프라 0** — 기존 스택(Next.js App Router · Supabase RLS · 서버 액션 · 순수 도메인)만 쓴다.
> ② **결정론이 먼저** — 판정·문장은 순수 함수가 내고, 화면은 그 값을 그린다(AI 는 P3 옵션).
> ③ **재사용이 신설보다 먼저** — remedy·energy-map·compatibility-engine·카탈로그·시렁·초대·웹푸시를 꺼내 쓴다.

---

## 1. 아키텍처 개요

```
                    ┌─────────────────────────── 화면 (components/) ───────────────────────────┐
                    │  허브 배너(28차)   무리 목록/만들기   무리 지도   처방전 시트   선물 카드   │
                    └────────┬───────────────┬───────────────┬─────────────┬─────────────┬────┘
                             │ 자가 조회       │               │             │             │
                    ┌────────▼───────────────▼───────────────▼─────────────▼─────────────▼────┐
                    │  서버 액션 (app/actions/)                                                 │
                    │  shrine/energy-map.ts  getFamilyEnergySummary (2질의, 그대로)              │
                    │  circle/circles.ts     list · create · addMember · removeMember · remove   │
                    │  circle/energy.ts      getCircleEnergy(circleId) · getPrescription(memberId)│
                    │  circle/gift.ts        giftItem · giftCard                                 │
                    └────────┬───────────────────────────────────────────────────────────┬─────┘
                             │ 순수 입력만 넘긴다                                            │
                    ┌────────▼───────────────────────────────────────────────────────────▼─────┐
                    │  도메인 (lib/domain/) — 순수 · DB/시각 무관 · 단위 테스트                    │
                    │  circle/element-lore.ts   오행 결 사전(+금지어 테스트)                        │
                    │  circle/prescription.ts   buildPrescription()  ← remedy.ts 표 import        │
                    │  circle/team-energy.ts    buildCircleEnergy()  ← energy-map.ts 일반화        │
                    │  circle/pair.ts           pairRelation()       ← compatibility-engine 판정  │
                    │  circle/circle.ts         kind 메타·상한·렌더 모드(work=밴드)                 │
                    │  circle/gift.ts           giftable()·멱등 키                                  │
                    └────────┬───────────────────────────────────────────────────────────┬─────┘
                             │                                                             │
                    ┌────────▼──────────────┐                                   ┌──────────▼────────┐
                    │ 기존 엔진/데이터        │                                   │ Supabase (RLS)     │
                    │ saju-engine(context)   │                                   │ family_members(既) │
                    │ remedy.ts · energy.ts  │                                   │ circles(新)        │
                    │ shrine_item_catalog    │                                   │ circle_members(新) │
                    └───────────────────────┘                                   │ energy_gifts(新)   │
                                                                                 └───────────────────┘
```

경계 규율(허브 28차와 같다): **화면 ↔ 액션은 자가 조회**(상위 컨테이너가 서버 액션을 import 하지 않는다 —
회귀 테스트 `hub-theme-section.test.tsx` 가 대시보드에 대해 이미 강제). **액션 ↔ 도메인은 순수 입력**
(액션이 DB 를 읽어 값으로 바꾸고, 도메인은 값만 본다).

---

## 2. 기술 스택 선정

| 레이어      | 기술                                              | 선정 이유                                                                     |
| ----------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| 화면        | Next.js 16 App Router · Tailwind · framer-motion  | 현행. 새 화면은 기존 `FamilyEnergyMapView`·`JourneyCard` 문법을 잇는다          |
| 데이터 접근 | 서버 액션 + Supabase RLS                          | 현행. 새 테이블 3 은 처음부터 RLS + 컬럼 화이트리스트(shrines 전례)           |
| 판정        | 순수 TS 도메인(`lib/domain/circle/`)              | 결정론·테스트 가능·AI 비용 0                                                  |
| 명식        | `lib/saju-engine/context-builder.ts` `buildSajuContext(person)` | 십성 분포·용신·희신·기신을 이미 돌려준다(remedy 가 쓰는 그 값)               |
| 캐시        | `unstable_cache` 태그 `circle:{id}`               | 무리 지도(10명 명식 계산)만 캐시. 허브 배너는 2질의라 캐시 불필요            |
| 알림        | 기존 웹푸시(R-1)                                  | 연결 사용자에게 선물 알림                                                     |
| 이미지      | 기존 OG 이미지 경로                               | 선물 카드 공유 이미지                                                         |
| 계측        | GA4 `trackEvent`                                  | 현행                                                                          |

새로 들이는 라이브러리: **없음.**

---

## 3. 컴포넌트 설계

### 3-1. 도메인 모듈 (신설 — 전부 순수)

```
lib/domain/circle/
  circle.ts          CircleKind = 'family' | 'work' | 'friends' | 'custom'
                     CIRCLE_KIND_META: { label, notice?, scoreMode: 'bands'|'full', consentRequired }
                     circleLimits(planFeatures) → { maxCircles, maxMembers }
  element-lore.ts    ELEMENT_LORE: Record<Element, { lacking, gains, mother, deskItem, homeItem, gifts[3], excess }>
                     GENERATES: 水→木→火→土→金→水 (상생 고정표)  · BANNED_WORDS(효능·채용 합본)
  prescription.ts    buildPrescription(input) → Prescription
                       input: { name, energyNow, energyBorn, yongsin, huisin?, gisin?, catalog: CatalogLite[],
                                circleMates?: EnergyHolder[] }
                       output: { lacking, lore, fillers: Filler[3], items: { shrine[3], real[3], life[3] }, avoid }
                       ← remedy.ts 의 COLOR/DIRECTION/HOUR_BAND/SPACE/BODY/AVOID_HINT 를 **import**
                         (remedy.ts 가 export 를 열어 준다 — 표 복제 금지, 그 파일 머리말 규율)
  team-energy.ts     buildCircleEnergy(entries, contexts?) → { average, lowest, holders: Record<Element, Holder[]>,
                       pairs: PairRelation[], roles: { thick: SipseongGroupKey, thin: SipseongGroupKey } | null }
                       ← energy-map.ts 의 averageEnergy/lowestElement/findComplements 재사용
  pair.ts            pairRelation(a, b) → 'complement' | 'lift' | 'distance' | 'independent'
                       ← compatibility-engine 의 scoreElementBalance·scoreYongsinSynergy **판정만** 옮긴다
                         (점수는 버리고 details 의 조건만) — 직장 무리에서 숫자가 생길 여지를 구조적으로 없앤다
  gift.ts            giftable(item) (보상 전용 제외 · 오행 있음) · giftIdempotencyKey(giver, recipient, item, minute)
```

테스트(`lib/domain/circle/__tests__/`): 사전 금지어 전수 · 상생표 5쌍 · 처방 결정론(같은 입력 → 같은 출력) ·
직장 무리에 숫자 없음(렌더 문자열에 `\d+점|\d+%` 부재) · 페어 라벨 4종 분기 · 멱등 키.

### 3-2. 서버 액션 (신설)

| 액션                                      | 입력 → 출력                                          | 권한·검증                                                                                   |
| ----------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `listCircles()`                           | → { family: VirtualCircle, circles: Circle[] }       | auth. 가족은 `member_category='family'` 로 **파생**(행 없음)                                 |
| `createCircle({ name, kind })`            | → Circle                                             | auth · 티어 상한(`membership_plans.features`) · 이름 1~20자 · kind 화이트리스트 · 일 5회 상한 |
| `addCircleMember({ circleId, memberId, consent })` | → ok                                        | circle.user_id = uid **그리고** family_members.user_id = uid(IDOR 이중 검증) · work 면 consent 필수 · 구성원 상한 |
| `removeCircleMember` / `deleteCircle`     | → ok                                                 | 소유자만. 삭제는 cascade                                                                     |
| `getCircleEnergy(circleId | 'family')`    | → CircleEnergy(§3-1 team-energy 출력 + entries)      | `getFamilyEnergyMap` 의 계산 경로 재사용(대상 집합만 무리로) · `unstable_cache(tag circle:{id})` |
| `getPrescription(memberId | 'self')`      | → Prescription                                       | 소유자 검증 · `buildSajuContext` 로 용신·희신·기신·십성 · 카탈로그 오행 상위 3                |
| `giftItem({ recipientMemberId, catalogItemId, message? })` | → { delivery: 'shelf'|'inventory' } | server-only · `deductBokPoints` 단일 경로 · 멱등 키 · 일 상한 · 받는 쪽 재화 0 · 시렁 칸 또는 보관함 |
| `giftCard(memberId)`                      | → { imageUrl, items[3], reasons[3] }                 | 공유 보상은 기존 `claimShareReward`(별도 호출)                                               |

허브 배너의 `getFamilyEnergySummary` 는 **그대로**(2질의). 무리가 여럿이면 `listCircles` 를 **배너가 부르지 않고**
요약 액션이 `circles` 수만 한 줄 더 세어 돌려준다(질의 +1 = 3, 여전히 지도 7질의와 자릿수가 다르다).

### 3-3. 화면 (신설·변경)

| 화면                        | 파일                                                       | 비고                                                                 |
| --------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| 인연·무리 (탭)              | `app/protected/family/family-page-client.tsx` 상단에 탭    | 사람 탭 = 현행 목록 그대로                                            |
| 무리 만들기 시트            | `components/family/circle-create-sheet.tsx`                | kind 고르기 · 직장이면 동의 문구 미리보기                             |
| 무리 지도                   | `components/family/FamilyEnergyMap.tsx` → `CircleEnergyMapView` 로 일반화(props: circle) | 가족 지도는 circle='family' 호출. 직장은 scoreMode='bands'     |
| 처방전 시트                 | `components/family/prescription-sheet.tsx`                 | §3-1 5블록. 무료는 ②만 + 「N가지 더」(remedyTeaser 규율)             |
| 선물 카드                   | `components/family/gift-card.tsx` + `app/api/og/gift/route.tsx` | 실물 셋·이유·오행 색. 링크는 결정 후                              |
| 허브 배너                   | `components/analysis/family-map-card.tsx`                  | 무리 칩 한 줄 추가. 요약 액션 계약 유지                              |

---

## 4. 데이터 모델 (ERD)

```
auth.users ─1───n─ family_members(既)  ──n───n─ circle_members(新) ─n───1─ circles(新)
   │                    │  linked_user_id → auth.users (연결 사용자)
   │                    └──1───n─ energy_gifts(新).recipient_member_id
   └──1───n─ energy_gifts.giver_user_id
   └──1───n─ circles.user_id
```

```sql
-- 무리. 가족 무리는 행이 없다(갈래 family 에서 파생) — §12-7 기본안.
create table circles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 20),
  kind        text not null check (kind in ('work','friends','custom')),   -- 'family' 는 가상
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create table circle_members (
  circle_id   uuid not null references circles(id) on delete cascade,
  member_id   uuid not null references family_members(id) on delete cascade,
  role        text check (char_length(role) <= 20),            -- «팀장·디자인» 같은 자유 표기(선택)
  consent_at  timestamptz,                                       -- work 는 not null 을 액션이 강제
  added_at    timestamptz not null default now(),
  primary key (circle_id, member_id)
);
-- 기운 선물 — 재화 지급 경로가 아니다(받는 쪽은 아무것도 얻지 않는다). 감사·중복 차단 기록.
create table energy_gifts (
  id                  uuid primary key default gen_random_uuid(),
  giver_user_id       uuid not null references auth.users(id) on delete cascade,
  recipient_member_id uuid not null references family_members(id) on delete cascade,
  circle_id           uuid references circles(id) on delete set null,
  catalog_item_id     uuid not null references shrine_item_catalog(id),
  element             text not null check (element in ('wood','fire','earth','metal','water')),
  delivery            text not null check (delivery in ('shelf','inventory')),
  message             text check (char_length(message) <= 60),
  idempotency_key     text not null unique,                      -- giver|recipient|item|분 단위
  created_at          timestamptz not null default now()
);
create index on energy_gifts (giver_user_id, created_at desc);
```

**RLS(전부 처음부터)**

| 테이블         | select                                                                 | insert/update/delete                                             |
| -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| circles        | `user_id = auth.uid()`                                                 | 동일. 컬럼 화이트리스트: name·kind·updated_at 만 authenticated    |
| circle_members | `exists(select 1 from circles c where c.id = circle_id and c.user_id = auth.uid())` | 동일 + `exists(select 1 from family_members f where f.id = member_id and f.user_id = auth.uid())` |
| energy_gifts   | `giver_user_id = auth.uid()` **또는** `exists(family_members f where f.id = recipient_member_id and f.linked_user_id = auth.uid())` | insert 는 **service_role 전용**(서버 액션이 차감과 한 트랜잭션) — 자가발행 차단 |

마이그레이션 규율: 백필 없음. `has_table_privilege` 가 오해를 준 전례(shrines) → 적용 뒤 authenticated 로 실제 insert 시도해 0행 확인.

---

## 5. API 설계 원칙

1. **화면은 값만 받는다.** 액션 응답에 «점수»가 없다 — 직장 무리에서 숫자를 그릴 재료 자체를 주지 않는다(`pairRelation` 라벨만).
2. **소유 검증은 두 번.** 무리 소유(circles.user_id)와 사람 소유(family_members.user_id)를 각각 확인한다 — 남의 인연 id 를 내 무리에 꽂는 IDOR 차단.
3. **차감은 단일 경로.** `deductBokPoints`(메모리 project_bok_deduct_path) 외 새 경로 금지. 실패하면 선물 행도 쓰지 않는다(트랜잭션).
4. **멱등.** `energy_gifts.idempotency_key` unique — 같은 분 안 재요청은 200 + 기존 행.
5. **상한은 서버.** 무리 수·구성원 수·선물 일 상한 전부 서버가 판정(UI 우회 불가 — Track F 교훈).
6. **실패는 조용히.** 배너·시트는 오류 문구 대신 빈 상태(허브 규율).

---

## 6. 데이터 흐름 (주요 유스케이스)

**6-1. 처방전 열기** (P0)

```
탭 [처방전 펼치기]
 → getPrescription(memberId)
    ├ family_members(소유 검증) · profiles(self)
    ├ buildSajuContext(person)  → yongsin·huisin·gisin·sipseong.distribution
    ├ energy: getFamilyEnergyMap 경로의 base+modifiers+placements(지금) · baseFromBirth(타고난)
    ├ shrine_item_catalog(element = yongsin, is_active, 보상 전용 제외) 상위 3 (energy_power desc)
    └ buildPrescription(...)  ← 순수
 → 시트 렌더(①~⑤) · GA prescription_open
```

**6-2. 무리 지도** (P1)

```
/family/map?circle=X
 → getCircleEnergy(X)  [unstable_cache tag circle:X]
    ├ X='family' → members where category='family' ; else circle_members join
    ├ 구성원마다 energy(지금) + buildSajuContext(십성)  — 10명 상한
    ├ buildCircleEnergy(entries, contexts) → average·lowest·holders·pairs·roles
    └ kind='work' → scoreMode 'bands' 를 응답 메타로
 → 뷰: 고지(work) → 균형 → 든 사람 → 관계 라벨 → 역할 결 → 처방전 목록
캐시 무효화: add/removeCircleMember · giftItem(shelf) · family_members 갱신 → revalidateTag('circle:X')
```

**6-3. 기운 선물** (P2)

```
처방전 ④ [신당에 놓기 → 선물하기]
 → giftItem({ recipient, item })
    ├ 소유·오행 일치·giftable · 멱등 키 조회(있으면 반환)
    ├ 일 상한(예: 20) 확인
    ├ 트랜잭션: deductBokPoints(price) → energy_gifts insert
    │           delivery = recipient.linked_user_id ? 'inventory' : 'shelf'
    │           shelf: 내 신당 가족 시렁 그 사람 칸(family-shelf 슬롯) 에 배치 행
    │           inventory: 상대 사용자 보관함 + 웹푸시
    └ revalidateTag(circle)
 → 토스트 「{이름}님 칸에 {신물}을 모셨습니다」 · GA gift_send
```

---

## 7. 확장성 & 보안 고려사항 (TEAM_H Gate 1 입력)

**위협 모델**

| 위협                                   | 경로                                  | 대응                                                                                   |
| -------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------- |
| IDOR — 남의 인연을 내 무리에 넣기      | addCircleMember(memberId 위조)        | family_members.user_id = uid 재검증 + RLS 정책 exists                                  |
| 남의 무리 열람                         | getCircleEnergy(circleId 위조)        | circles.user_id = uid · RLS                                                            |
| 선물 자가발행·이중 차감                | giftItem 재전송·경합                  | service_role insert 전용 · 멱등 키 unique · 차감과 한 트랜잭션 · 받는 쪽 재화 0        |
| 선물 파밍(연결 사용자 둘이 주고받기)   | inventory 전달 반복                   | 받는 쪽은 «보관함 아이템»만 얻고 복채는 0 · 일 상한 · 같은 짝 반복은 로그 감시           |
| 제3자 PII(팀원 생년월일)               | 직장 무리 등록                        | 동의 필수·목적 고지·삭제 cascade·수집 항목 최소(이름·생년월일시·관계)                    |
| 채용법 방조                            | 직장 무리 화면                        | 지원자 입력 부재·점수 부재(응답에도 없음)·고지·금지어 테스트                             |
| 무리 폭주(대량 생성)                   | createCircle 반복                     | 티어 상한 + 일 5회 + Sentry 경보                                                       |
| 캐시로 남의 데이터 노출                | unstable_cache 키 충돌                | 키에 uid + circleId 둘 다                                                              |

**확장성**

- 무리 지도 계산은 구성원 수에 선형(명식 계산 ~수 ms/인). 상한 30(BUSINESS)이면 p95 < 800ms 안에 든다 — 넘기면 명식 결과를 `user_energy_profile` 에 캐시하는 P3 옵션.
- 사전·처방은 순수라 SSR·클라이언트 어디서든 같다.
- AI 서술을 붙이더라도 `remedyPromptBlock` 규율(엔진 값을 «풀어 쓰기»만)로 결정론을 보존한다.

**표시광고법**

- 사전 모듈 테스트가 효능·채용 금지어를 전수 검사. 혜택 문구는 `membership-benefits.ts` 에서만.
- 「타고난/지금」 라벨 유지 — 두 값의 차이를 화면이 설명한다(28차 규율).

---

## 8. 기술 부채 & 향후 개선

| 항목                                                    | 처리                                                    |
| ------------------------------------------------------- | ------------------------------------------------------- |
| 궁합 매트릭스 가짜 점수(`compatibility-matrix/page.tsx`) | P3 에서 무리 페어 화면으로 대체·삭제(§12-6)              |
| 오행 표 중복 3곳(remedy·woon-calculator·yongsin-advanced) | 이번에 remedy 만 export 를 열고, 나머지 통합은 별도 부채 |
| 가족별 신당 DB 행(25차에 화면만 내림)                    | 선물 delivery 'shelf' 는 시렁 칸을 쓴다 — 그 행을 다시 쓰지 않는다 |
| BUSINESS 티어 features JSON 비어 있음                    | 무리 상한을 여기 넣는 것이 첫 사용처 — 스키마 문서화     |
| 웹푸시 수신자 ≥5 기준 미달(초하루 의례 게이트)            | 선물 알림은 «있으면 보내고 없으면 조용히»                 |

---

*다음 단계: TEAM_H Gate 1(위협 모델 확인) → TEAM_A 티켓(P0 ½~1세션) → TEAM_B/C 구현 → Gate 3 → 배포*
