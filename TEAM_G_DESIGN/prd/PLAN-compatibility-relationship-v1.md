# 궁합 관계별 맞춤 분석 + 분석 기록 신뢰성 개편 기획 v1.1 (2026-07-21)

> 작성: Fable(기획) → 실행: Opus. 코드 실측 기반 — 모든 경로·라인은 2026-07-21 현재 기준.
> 발주 배경(사용자 요구): ①관계(부부/소개팅/연인/직장/부모자식/형제)마다 궁금한 점이 다르니 분석 내용이 달라야 한다 ②각 관계에서 사람들이 실제 궁금해하는 점을 반영하라 ③"8대 궁합 분석"이 어려우니 쉽게 풀어라 ④(v1.1 추가) **사주 기록이 제대로 남지 않고, 오류가 나며 재분석을 요구한다 — 기록이 잘 남아 재확인·공유가 편하게.**
>
> **실행 순서: Part B(기록 신뢰성, §14~)가 먼저다** — 지금 터지고 있는 사용자 체감 버그. Part A(궁합)는 그다음.

---

## 0. 현재 상태 실측 (개편의 출발점)

**이미 있는 것 — 새로 만들 필요 없음:**

- 관계 선택 UI 19종(5개 대분류): `lib/constants/relationship-types.ts:12-155`, 입력 폼 셀렉트 `app/protected/analysis/compatibility/compatibility-client.tsx:274-295` (기본값 `'lover'`)
- 관계별 엔진 가중치 5타입: `lib/saju-engine/compatibility-engine.ts:90-97` (`CATEGORY_WEIGHTS`), 19→5 정규화 `:100-123` (`normalizeRelationType`)
- 관계별 프롬프트 "포커스 힌트" 19종: `app/actions/ai/compatibility.ts:270-388` (`getRelationshipGuide`)

**진짜 문제 3가지:**

1. **출력 스키마가 관계 불문 동일 + 연애 편향.** 프롬프트(`app/actions/ai/compatibility.ts:173-252`, 하드코딩)가 모든 관계에 같은 JSON을 요구하고, 「과거 역추산」 블록은 도화살·이별 위기 역산을 강제(`## 과거 역추산` 절) — 직장 상사와의 궁합에도 "먼저 끌림·이별 위기"를 찾는다. `recommendedPlaces`도 데이트 장소 프레임.
2. **"8대 궁합"이 전문용어 그대로.** 8개는 프롬프트가 아니라 **엔진 산출물**(`compatibility-engine.ts:528-537`): 일간/일지/오행보완/용신시너지/십성관계/원진·귀문/신살호환/대운동기화. 라벨·details 문장 모두 명리 용어라 일반 유저가 못 알아듣는다. UI 제목 "8대 궁합 분석"은 `compatibility-result.tsx:155`.
3. **조사 중 발견된 결함 4건** (§8에서 수복):
   - 히스토리에서 궁합 기록 재조회 시 **raw JSON 덤프** — `components/history/analysis-result-view.tsx:15-44`가 SAJU만 전용 렌더, 나머지는 `<pre>{JSON.stringify}` (`:47-67`)
   - 재분석 링크 404 — `components/history/detail-modal.tsx:137` `COMPATIBILITY: '/protected/compatibility'` (실제 라우트는 `/protected/analysis/compatibility`)
   - 죽은 DB 시드 — `supabase/migrations/ai/20260212_compatibility_prompt.sql`의 `compatibility_analysis` 키는 현재 코드가 전혀 안 읽음(구 스키마)
   - 레거시 중복 화면 — `app/protected/studio/saju/compatibility/page.tsx` (AI 없는 단순 점수판, "추후 업데이트 예정" 플레이스홀더)

**과금 실측:** 궁합은 지갑 실차감 없음. 무료 3회 공용 카운터(`app/actions/user/free-quota.ts:8`)만 게이팅. `talisman_cost: 2`는 표시용 메타데이터(`compatibility.ts:103`). → 본 개편은 과금을 건드리지 않는다(§10).

---

## 1. 목표 / 비목표

**목표**

- G1. 관계군별로 **"그 관계에서 실제 궁금한 질문"에 직접 답하는 섹션** 신설 (`focusAnswers`)
- G2. 관계군별로 **어울리지 않는 소재 차단** (직장 궁합에 이별 위기·데이트 장소 금지)
- G3. 8대 궁합을 **쉬운 라벨 + "이게 뭐냐/우리는/그래서" 3줄 구조**로 리뉴얼
- G4. 조사에서 발견된 결함 4건 수복

**비목표 (이번에 안 함)**

- 과금 변경(관계별 심화 유료화) — 결정 대기(§13)
- 엔진 점수 산식 자체 변경 — 가중치 1타입 추가만(§6)
- i18n — 궁합 화면 문자열 추출은 별도 트랙(로드맵 i18n 순서 유지)

---

## 2. 관계군(FocusGroup) 설계 — 분기 단위

19종 관계마다 프롬프트를 만들면 유지보수 불가. **"궁금한 것이 실제로 갈리는 단위"로 8군**을 정의하고, 19종 UI 값을 매핑한다.

> ⚠️ 구분 주의: **엔진 가중치 타입**(현 5종, §6에서 6종)과 **프롬프트 FocusGroup**(8종)은 별개 축이다. 전자는 점수 계산, 후자는 질문·문체·섹션 분기.

| FocusGroup                   | 포함 UI 관계 (19종 매핑)                                   | 엔진 타입          |
| ---------------------------- | ---------------------------------------------------------- | ------------------ |
| `MEETING` 만남 전            | `dating`(소개팅), `crush`(짝사랑)                          | lover              |
| `COUPLE` 연인                | `lover`(애인), `marriage`(결혼 예정)                       | lover              |
| `MARRIAGE` 부부              | `spouse`(부부)                                             | spouse             |
| `PARENT_CHILD` 부모자식·어른 | `parent_child`, `in_laws`(시댁/처가)                       | parent_child       |
| `SIBLINGS` 형제자매          | `siblings`                                                 | **siblings(신설)** |
| `FRIEND` 친구·동거           | `friend`, `best_friend`, `roommate`                        | friend             |
| `WORK` 직장                  | `boss_employee`, `coworker`, `mentor_mentee`, `part_timer` | business           |
| `BUSINESS` 사업·거래         | `business_partner`, `investor`, `client`, `team_project`   | business           |

구현: `lib/domain/compatibility/focus-groups.ts` **신설** (순수 상수 + 매핑 함수, 단위 테스트 대상). 19종 전부가 정확히 한 군에 속하는지 테스트로 강제(누락 시 컴파일/테스트 실패).

---

## 3. 관계군별 "사람들이 실제 궁금해하는 것" — focusQuestions

각 군의 단골 질문 5개. 프롬프트가 이 질문 각각에 `focusAnswers[]`로 답하게 한다. **질문 문구는 아래를 그대로 상수로 사용** (사주 상담 현장의 실제 단골 질문 기준으로 선정).

### MEETING (소개팅·짝사랑) — "시작해도 되나"

1. 이 사람과 잘 될 가능성이 있는 인연인가요?
2. 상대는 나를 어떤 사람으로 느낄까요? (첫인상)
3. 어떻게 다가가야 호감을 얻을까요? (연락 빈도·속도)
4. 마음을 표현하기 좋은 시기는 언제인가요?
5. 오래갈 인연인가요, 스쳐갈 인연인가요?

- 특화 지시: 아직 시작 전 관계 — **과거 역추산 금지**(만난 적이 없다), 미래 가능성·접근법 중심. 확신 없는 단정 금지("반드시 이어진다" 금지).

### COUPLE (연인·결혼 예정) — "이 사람과 계속 가도 되나"

1. 우리는 성격이 어디서 잘 맞고 어디서 부딪히나요?
2. 결혼까지 갈 수 있는 상대인가요?
3. 싸웠을 때 어떻게 화해하는 게 좋을까요?
4. 상대의 애정 표현 방식은 무엇인가요? (내가 오해하기 쉬운 부분)
5. 결혼(또는 다음 단계)에 좋은 시기는 언제인가요?

- 특화 지시: 과거 역추산 허용(끌림·다툼 시점), 데이트 장소 추천 유지.

### MARRIAGE (부부) — "어떻게 잘 살아가나"

1. 반복되는 갈등의 진짜 뿌리는 무엇인가요?
2. 돈 관리는 누가 어떻게 하는 게 우리에게 맞나요? (재물 합)
3. 자녀와의 합, 자녀 계획에 좋은 흐름은 언제인가요?
4. 권태기·위기가 온다면 언제, 어떻게 넘기나요?
5. 중년 이후 우리는 어떤 부부가 되나요?

- 특화 지시: 과거 역추산 허용(신혼 갈등·고비 시점), "이별 권유" 문구 금지 — 위기여도 극복법 중심.

### PARENT_CHILD (부모-자식·시댁/처가) — "어떻게 대해야 하나"

1. 아이(상대)의 타고난 기질은 나와 어디가 다른가요?
2. 내 방식(훈육·조언)이 상대에게 통하나요? 어떻게 말해야 들리나요?
3. 크게 부딪히기 쉬운 시기는 언제인가요? (사춘기·독립·명절)
4. 상대의 재능·장점을 어떻게 밀어주면 좋을까요?
5. 사이가 틀어졌을 때 회복하는 방법은 무엇인가요?

- 특화 지시: **연애 소재 전면 금지**(도화살·애정 표현 등). 세대 차·소통법·존중 중심. in_laws 는 "어른-며느리/사위" 프레임(호칭·경계·명절)으로.

### SIBLINGS (형제자매) — "우애와 경쟁 사이"

1. 우리는 왜 이렇게 다른가요? (같은 집에서 자랐는데)
2. 경쟁심·비교 의식의 뿌리는 무엇인가요?
3. 돈 문제(부모 부양·상속·빌려주기)에서 주의할 점은요?
4. 서로에게 어떤 귀인이 될 수 있나요?
5. 멀어진 사이라면 어떻게 회복하나요?

- 특화 지시: 연애 소재 금지. 비견·겁재(형제 별)를 쉬운 말로 활용. 재물 갈등은 겁주지 말고 예방법 중심.

### FRIEND (친구·동거) — "이 우정은 어떤 인연인가"

1. 우리는 왜 잘 맞나요(또는 왜 자꾸 어긋나나요)?
2. 돈 거래를 해도 되는 사이인가요?
3. 여행·동거를 해도 괜찮은 합인가요?
4. 서로에게 어떤 귀인이 되나요?
5. 다퉜을 때 누가 어떻게 풀어야 하나요?

### WORK (직장) — "같이 일해도 되는 사람인가"

1. 이 사람과 일하면 시너지가 나나요, 소모가 되나요?
2. 소통 방식이 어떻게 다른가요? (보고·지시·피드백 스타일)
3. 갈등이 생기면 주로 어떤 지점에서, 어떻게 대처해야 하나요?
4. 믿고 맡겨도 되는 부분과 조심할 부분은 무엇인가요?
5. 오래 함께 갈 인연인가요? (이직·부서 이동 흐름 포함)

- 특화 지시: **연애 소재 전면 금지**. 데이트 장소 대신 "합이 트이는 협업 방식"(회의 방식·업무 분담·소통 채널). 존댓말 관계 전제.

### BUSINESS (사업·거래) — "돈을 같이 만져도 되나"

1. 동업(거래)해도 되는 상대인가요? 깨질 위험은 어디에 있나요?
2. 금전 신뢰도는 어떤가요? (돈 앞에서 어떻게 변하는가)
3. 역할은 어떻게 나누는 게 맞나요? (안살림/바깥일)
4. 위기가 온다면 언제, 무엇으로 오나요? 대비는요?
5. 계약·확장·투자에 좋은 시기는 언제인가요?

- 특화 지시: 연애 소재 금지. 리스크를 솔직하게(기존 「솔직한 분석」 원칙 유지 — 엔진 40점 이하 경고 규칙은 이 군에서 특히 중요).

---

## 4. 출력 스키마 변경 — additive 원칙

기존 필드는 **전부 유지**(구 기록 호환 + 기존 뷰어 무수정 렌더). 신설·재정의만:

```jsonc
{
  // ── 신설 ──
  "focusGroup": "WORK", // 액션이 주입 (AI 생성 아님)
  "focusAnswers": [
    // AI 생성 — 군별 질문 5개에 1:1
    {
      "question": "이 사람과 일하면 시너지가 나나요, 소모가 되나요?",
      "answer": "…(2~4문장, 쉬운 말)",
      "basis": "…(근거 한 줄: 사주 용어는 괄호 설명)",
    },
  ],
  // ── 의미 재정의 (필드명 유지) ──
  "recommendedPlaces": [], // MEETING/COUPLE/MARRIAGE=장소, PARENT_CHILD=함께할 활동,
  // SIBLINGS/FRIEND=함께하기 좋은 자리, WORK/BUSINESS=합이 트이는 협업 방식
  "pastRetrograde": {}, // COUPLE/MARRIAGE 만 생성. MEETING(만난 적 없음)·비연애군은 생성 생략
  // ── 기존 유지 ──
  "overallAssessment": "…",
  "summary": "…",
  "honestVerdict": "…",
  "person1Weakness": "…",
  "person2Weakness": "…",
  "conflictScenario": "…",
  "strengths": [],
  "warnings": [],
  "advice": "…",
  "monthlyAdvice": [],
  "categoryBreakdown": [],
  "mulsangNarrative": "…",
  "luckyActions": [],
  "engineVersion": "v2",
}
```

- `conflictScenario`는 전 군 유효(직장·부모자식도 갈등 시나리오가 핵심 가치) — 군별 소재만 프롬프트에서 통제.
- 파서는 현행 그대로 `JSON.parse`(`compatibility.ts:260-264`). `focusAnswers` 검증: 배열이 아니거나 5개 미만이어도 **실패 처리하지 않고 있는 만큼 렌더**(부가 섹션 원칙 — 오행형 태그와 동일 철학).
- `engineVersion`을 `'v3'`로 올려 **7일 캐시**(`compatibility.ts:42-45`, `getRecentCompatibilityAnalysis`가 engineVersion 대조)가 구 결과를 재사용하지 않게 한다. 단 캐시 키에 `relationship`이 없던 기존 문제(같은 두 사람을 다른 관계로 다시 보면 캐시가 잘못 재사용)도 이번에 함께 수정 — **캐시 대조에 focusGroup 포함**.

---

## 5. 8대 궁합 쉬운 풀이 스펙

### 5-1. 라벨 이중화 (쉬운 제목 主 + 원어 부제)

`lib/saju-engine/compatibility-engine.ts`의 category label과 결과 카드에 적용. **아래 문구 그대로 사용:**

| category         | 현재 라벨   | 쉬운 라벨(主)        | 한 줄 정의("이게 뭐냐" — UI 고정 상수)              |
| ---------------- | ----------- | -------------------- | --------------------------------------------------- |
| dayMaster        | 일간 궁합   | **겉성격 합**        | 처음 만나 대화할 때 통하는 정도예요                 |
| dayBranch        | 일지 궁합   | **속마음 합**        | 오래 같이 있어도 편안한지를 봐요                    |
| elementBalance   | 오행 보완   | **서로 채움**        | 내게 부족한 기운을 상대가 채워주는지 봐요           |
| yongsinSynergy   | 용신 시너지 | **행운 상생**        | 만날수록 서로 운이 트이는지 봐요                    |
| sipseongRelation | 십성 관계   | **관계 속 역할**     | 서로에게 어떤 존재(돕는 이·이끄는 이)가 되는지 봐요 |
| wonjinGwimun     | 원진·귀문   | **까닭 없는 거슬림** | 이유 없이 밉고 예민해지는 기운이 있는지 봐요        |
| sinsalCompat     | 신살 호환   | **끌림과 귀인**      | 강한 끌림, 귀인이 되어주는 특별한 기운을 봐요       |
| daeunSync        | 대운 동기화 | **시기 합**          | 지금 두 사람의 인생 흐름이 맞물리는지 봐요          |

부제 표기: `겉성격 합 (일간)` 형태 — 전통 권위는 부제로 유지, 이해는 쉬운 제목이 담당.

### 5-2. 카드 3줄 구조 (결과 UI)

각 카드: ① 한 줄 정의(위 표, 고정 상수 — AI 아님) ② 우리 둘은 어떤가(엔진 assessment + details[0]) ③ **그래서 어떻게** — details 마지막 요소 또는 액션 문장.

### 5-3. 엔진 details 문장 리라이트 (결정적 — AI 토큰 0)

`compatibility-engine.ts`의 details 생성 문자열들을 쉬운 말로 교체하고 전문용어는 괄호로. 패턴:

- (전) `천간합(天干合)이 있어 서로 끌립니다` → (후) `겉성격이 자석처럼 끌리는 조합이에요 (천간합)`
- (전) `일지 육합 — 생활 리듬이 잘 맞습니다` → (후) `한 공간에 있어도 부딪히지 않는, 생활 합이 좋은 짝이에요 (육합)`
- (전) `원진살이 있어 주의` → (후) `가끔 이유 없이 서로 거슬릴 수 있는 기운이 있어요. 알고 있으면 절반은 피해 가요 (원진)`
- 규칙: **문장 주어는 "두 사람/우리"**, 용어는 문장 끝 괄호, 겁주는 단정("흉하다") 대신 "알고 대비하면" 프레임. 8개 카테고리 전체 details 문자열에 일괄 적용(개수는 구현 시 전수 — 카테고리당 3~8개 분기 문장).

UI 제목도 변경: `compatibility-result.tsx:155` "8대 궁합 분석" → **"여덟 가지로 본 우리 궁합"** + 부제 "어려운 말은 괄호에 담았어요".

---

## 6. 엔진 변경 (최소)

1. **`siblings` 가중치 타입 신설** — 현재 `siblings→friend`로 뭉개짐(`:100-123`). 형제는 십성(비견·겁재=형제 별)과 재물 축이 중요:
   `siblings: [0.15, 0.12, 0.15, 0.08, 0.22, 0.10, 0.08, 0.10]` (순서: 일간·일지·오행·용신·십성·원진·신살·대운, 합=1.00 — 단위 테스트로 강제)
2. `normalizeRelationType`에 `siblings→siblings` 반영. `in_laws`는 `parent_child` 유지.
3. 점수 산식·8개 카테고리 자체는 불변.

---

## 7. UI 변경

### 입력 화면 (`compatibility-client.tsx`)

- **질문 미리보기 칩**: 관계 선택 시 해당 군의 focusQuestions 중 3개를 "이런 게 궁금하시죠?" 칩으로 노출 — 기대 설정 + 관계를 대충 고르지 않게 유도.
- **관계 자동 프리셋**: 두 대상이 정해졌을 때 `DestinyTarget.relation_type`(가족 등록값: 배우자/자녀/형제 등 — `v_destiny_targets` 뷰의 한글값)으로 관계 셀렉트 초기값 추정. 예: 한쪽이 '배우자'면 `spouse`, '자녀'/'부'/'모'면 `parent_child`, '형제'/'자매'면 `siblings`, '연인'이면 `lover`, '동료'면 `coworker`. 매핑 불가 시 현행 기본값 `lover` 유지. **수동 변경 항상 가능.**

### 결과 화면 (`compatibility-result.tsx`)

- **신설 섹션 「이 관계에서 가장 궁금한 것들」**: `focusAnswers` 렌더 — 질문(굵게) → 답 → 근거(작게). 위치: 헤더(총평) 바로 아래, 8대 궁합 위. **이 섹션이 개편의 얼굴.**
- 8대 카드 리뉴얼(§5-2), 섹션 제목 군별 상수화: `recommendedPlaces` 제목을 focusGroup 에 따라 "함께 가면 좋은 곳"/"함께하면 좋은 활동"/"합이 트이는 협업 방식" 등으로.
- `pastRetrograde` 렌더 신설(COUPLE/MARRIAGE 만, 데이터 있을 때) — "지난 시간 돌아보기" 섹션. 기존에 생성만 되고 버려지던 필드의 활용.
- 구 기록(focusAnswers 없음) 열람 시: 신설 섹션들 조건부 숨김 — 기존 필드만으로 현행대로 렌더.

---

## 8. 결함 수복 (이번 개편에 포함)

| #   | 결함                                                                     | 수복                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | 히스토리 궁합 재조회가 raw JSON 덤프 (`analysis-result-view.tsx:47-67`)  | `record.category === 'COMPATIBILITY'` 분기 신설 → `compatibility-result.tsx`를 읽기전용 모드로 재사용(result_json 에 person1/person2 원본 포함이라 완전 복원 가능). 리셋/재분석 버튼은 숨김 |
| R2  | 재분석 링크 404 (`detail-modal.tsx:137`)                                 | `'/protected/analysis/compatibility'`로 수정 + `?targetId=` 프리셋                                                                                                                          |
| R3  | 죽은 시드 `compatibility_analysis` (`20260212_compatibility_prompt.sql`) | 삭제 마이그레이션(`is_active=false` 또는 DELETE) + 시드 파일에 사유 주석. 7/4 재구축 시 구 프롬프트가 되살아나 혼선 주는 패턴 예방                                                          |
| R4  | 레거시 `app/protected/studio/saju/compatibility/` (미완성 점수판)        | 페이지 삭제, 진입 링크는 `/protected/analysis/compatibility?targetId=`로 교체(가족 페이지 등 참조처 grep 후 일괄)                                                                           |

---

## 9. 프롬프트 관리 방식 — 코드 유지 결정 (근거 명시)

원칙("프롬프트는 시드로만 관리")의 예외로 **궁합은 코드 유지**를 명시적으로 결정한다:

1. 궁합 출력은 태그가 아니라 **JSON 스키마 계약**이고 파서·타입(`CompatibilityResultData`)이 코드에 있다 — 스키마와 프롬프트가 한 곳(코드)에 있어야 어긋나지 않는다.
2. 관계군 8종 분기는 "템플릿 1장"이 아니라 **조립 로직**이다. DB 템플릿화하면 8장을 시드로 관리하며 7/4 재구축 소실 리스크만 커진다.
3. 대신 구조화: `app/actions/ai/compatibility.ts`의 인라인 문자열을 `lib/ai/prompts/compatibility.ts`(빌더) + `lib/domain/compatibility/focus-groups.ts`(군 상수)로 분리 — 문구(데이터)와 조립(로직)을 나눠 유지보수.
4. 죽은 DB 시드는 R3 로 정리해 "정본이 어디인가" 혼선 제거.

---

## 10. 과금 — 현행 유지 (변경 없음)

무료 3회 공용 카운터 + 실차감 없음 현행 유지. 관계별 심화를 유료 상품화(예: focusAnswers 는 복채 N만냥)할지는 **사용자 결정 대기**(§13). 이번 구현은 과금 코드를 건드리지 않아야 한다 — `deductTalisman`/`spendBokchae` 배선 금지.

---

## 11. 작업 순서 (Opus 실행 지시)

**Phase 1 — 코어 분기 (핵심 가치)**

1. `lib/domain/compatibility/focus-groups.ts` 신설: FocusGroup 8종, 19종 매핑, focusQuestions(§3 문구 그대로), 군별 특화지시·금지소재·recommendedPlaces 의미·pastRetrograde 생성여부 플래그. 단위 테스트: 19종 완전 매핑, 각 군 질문 5개.
2. `lib/ai/prompts/compatibility.ts` 신설: 기존 인라인 프롬프트(`compatibility.ts:173-252`)를 이관하고 FocusGroup 주입 지점 추가 — [관계 유형] 블록을 군별 질문·특화지시·금지소재로 교체, 출력 스키마에 focusAnswers 추가, pastRetrograde 는 플래그에 따라 요구/생략.
3. `app/actions/ai/compatibility.ts`: 빌더 호출로 교체, `focusGroup` 주입, `engineVersion:'v3'`, 캐시 대조에 focusGroup 포함.
4. `compatibility-result.tsx`: focusAnswers 섹션 + 군별 섹션 제목. 타입에 신설 필드(옵셔널).

**Phase 2 — 8대 쉬운 풀이** 5. `compatibility-engine.ts`: 라벨 이중화(§5-1 표), details 문장 리라이트(§5-3 규칙), `siblings` 가중치(§6, 합=1 테스트). 6. 결과 카드 3줄 구조 + "이게 뭐냐" 정의 상수(§5-1 표의 4열).

**Phase 3 — 결함 수복** — R1→R2→R4→R3 순(사용자 체감 큰 것부터).

**Phase 4 — 입력 UX** — 질문 미리보기 칩, 관계 자동 프리셋(§7).

각 Phase 마다: `npx tsc --noEmit` + `npx jest` + 빌드. Phase 1·3 후 배포·프로덕션 검증.

---

## 12. 검증 게이트

- **단위**: focus-groups 매핑 전수(19/19)·질문 5개·가중치 합 1.00 ±0.001 / 프롬프트 빌더가 군별 질문·금지소재를 포함하는지(8군 스냅샷) / MEETING 프롬프트에 "과거 역추산" 부재.
- **통합(수동 1회)**: WORK 군으로 실분석 1건 — 결과에 연애 소재(도화·이별·데이트) 부재 확인, focusAnswers 5개 렌더.
- **e2e prod 신설** `e2e/prod/compatibility.spec.ts`: 입력화면 관계 셀렉트·질문 칩 → (분석은 토큰 소모라 스킵 가능) → 히스토리에서 기존 궁합 기록 열어 **JSON 덤프가 아닌 전용 뷰** 확인(R1) + 재분석 버튼 href 검증(R2).
- **호환**: focusAnswers 없는 구 기록 렌더 무결(조건부 숨김).

---

## 13. 사용자 결정 대기

1. **관계별 심화 유료화 여부** — focusAnswers 를 무료 포함할지, 복채 상품(예: 2만냥)으로 뗄지. 이번 구현은 무료 포함으로 진행하고 결정 시 게이트만 추가.
2. **관계군 문구 톤** — §3 질문 문구는 확정안이나, 서비스 톤에 맞춰 사용자가 수정 원하면 상수 파일 한 곳만 고치면 됨.
3. (참고) 8군이 부담이면 MEETING+COUPLE 통합으로 7군 축소 가능 — 단, "소개팅"을 명시 요구했으므로 8군 권장.

---

---

# Part B — 분석 기록 신뢰성 · 재확인 · 공유 (v1.1 추가, 2026-07-21)

> 사용자 신고: "사주기록에 제대로 된 기록이 남지 않아, 오류가 생기고 재분석하라고 하며, 버그가 있는 것 같아."
> 조사 결과 신고 전부가 실재하는 결함이다. **프로덕션 DB 실측: analysis_history 전체에 TODAY 21·SAJU 5·COMPATIBILITY 2건뿐 — FACE/HAND/FENGSHUI/WEALTH/NEW_YEAR 는 0건.** 관상·손금·풍수는 저장 경로 자체가 없다.

## 14. 근본 원인 3개 (실측)

**원인 A — 관상·손금·풍수·사업궁합은 저장 코드가 아예 안 탄다.**
실제 스튜디오 UI(`app/protected/studio/{face,palm,fengshui}/page.tsx:90/82/111`)는 `app/actions/ai/image.ts`의 분석 함수(`analyzeFaceForDestiny:252`, `analyzePalmReading:842`, `analyzeInteriorForFengshui:551`)를 호출하는데, **image.ts 전체에 `saveAnalysisHistory` 호출이 0건**이다. 저장하는 버전은 `app/actions/ai/saju.ts:406/508/601`에 중복 정의돼 있으나 그 호출자인 `app/actions/core/studio.ts`를 **어떤 파일도 import 하지 않는다**(고아 코드). 사업 궁합(`app/actions/ai/celebrity-compatibility.ts:64`)도 저장 호출 없음.
→ 결과: 관상·손금·풍수를 아무리 분석해도 기록 0건 + 캐시 미스 → **재방문마다 재분석(재과금)**.

**원인 B — 저장 실패가 전면 무음(fire-and-forget).**
`saveAnalysisHistory`(`app/actions/user/history.ts:68-163`)는 insert 실패를 `{success:false}` 반환으로만 알리는데, 라이브 호출부 9곳 전부(`cheonjiin.ts:337`, `fortune-analysis.ts:161`, `wealth.ts:138`, `year2026.ts:131`, `trend.ts:193`, `daily.ts:192`, `compatibility.ts:91`, `compatibility-search.ts:132`, `saju.ts:380`)가 반환값을 무시하거나 try/catch 로 삼킨다. 유일한 확인처는 레거시 `core/analysis.ts:77-97`.
→ 결과: 저장이 실패해도 사용자는 결과를 정상으로 보고, 기록·캐시만 조용히 빈다.

**원인 C — 재조회·재분석 경로가 깨져 있다.**

- 히스토리 상세의 "재분석하기" 라우트 테이블(`components/history/detail-modal.tsx:132-141`) 8개 중 **5개가 404**: FACE→`/protected/saju/face`, HAND→`/protected/saju/hand`, FENGSHUI→`/protected/saju/fengshui`, TODAY→`/protected/saju/today`, COMPATIBILITY→`/protected/compatibility`. `app/protected/saju/` 디렉터리는 존재하지 않는다.
- 비-SAJU 기록 재조회는 전부 **raw JSON 덤프**(`components/history/analysis-result-view.tsx:46-67` — `<pre>{JSON.stringify}`). TODAY 는 `{content: 마크다운}`이 통째로 노출된다.
- `app/protected/analysis/result/page.tsx`는 정적 가짜 데이터 하드코딩 목업이며 "다시 분석하기"가 `/protected/saju/new`(404)로 간다.

**공유 실측:** 공유 화면(`/share/[token]` → `share-page-client.tsx:153-367`)은 카테고리 8종 리치 렌더를 **이미 갖췄다** — 히스토리 상세보다 낫다. 카카오 SDK(`lib/kakao-sdk.ts` + `components/shared/kakao-share-button.tsx`)도 구현돼 있으나 **어디서도 import 되지 않는다**. 공유 버튼은 히스토리 상세에만 있고 결과 직후엔 SAJU 전용(`/share/saju/`)뿐. `get_shared_analysis_record` RPC 정상, 단 조회수 증가 없음.

## 15. 수복 스펙

### B1. 저장 커버리지 (원인 A)

- `image.ts`의 관상·손금·풍수 3함수 끝(성공 반환 직전)에 `saveAnalysisHistory` 배선 — category FACE/HAND/FENGSHUI, `result_json`은 파싱된 구조체(파서 태그 계약 불변), `target_id`·`target_name`은 기존 함수가 받는 대상 정보 사용. **부가 저장 원칙**: 저장 실패해도 분석 결과 반환은 성공(오행형 태그와 동일 철학) — 단 B2 관측은 남긴다.
- `celebrity-compatibility.ts`(사업 궁합)에도 동일 배선(category COMPATIBILITY).
- 고아 코드 정리: `app/actions/core/engine.ts`(배선 시 context_mode CHECK 위반 잠재버그), `app/actions/core/studio.ts`, `saju.ts`의 중복 3함수(`:406/508/601`) — **삭제 전 각각 grep 으로 참조 0 재확인** 후 삭제. engine.ts 는 로드맵 P0-4 죽은코드 원칙과 합치.

### B2. 저장 실패 관측화 (원인 B)

- `saveAnalysisHistory` 실패 시 `logger.error(new Error('analysis_history 저장 실패'), {...})` — **Error 첫 인자**(Sentry captureException 규약, 헬스체크에서 확립).
- 라이브 호출부 9곳: 반환 `success` 확인해 실패 시 위 로깅 경유(사용자 흐름은 막지 않음). 새 헬퍼 `saveAnalysisHistoryObserved()` 하나로 감싸 9곳 중복 제거.

### B3. 재조회 품질 (원인 C)

- **공용 결과 뷰 추출**: `share-page-client.tsx`의 카테고리 렌더(`CATEGORY_CONFIG`+`ResultBody`)를 `components/analysis/CategoryResultBody.tsx`(가칭)로 추출 → **히스토리 상세(`analysis-result-view.tsx`)와 공유 화면이 같은 컴포넌트를 쓴다**(직후/기록/공유 삼단 단절 해소의 핵심). TODAY 의 `{content}` 마크다운 렌더 포함. COMPATIBILITY 는 Part A §8 R1(compatibility-result 재사용)과 합류.
- **재분석 라우트 테이블 교정**(`detail-modal.tsx:132-141`): FACE→`/protected/studio/face`, HAND→`/protected/studio/palm`, FENGSHUI→`/protected/studio/fengshui`, TODAY→`/protected/analysis/today`, COMPATIBILITY→`/protected/analysis/compatibility`(+`?targetId=` 프리셋 가능한 곳은 프리셋).
- 목업 페이지 `app/protected/analysis/result/page.tsx` 삭제(참조 grep 후) — 가짜 데이터 화면이 실화면으로 오인될 여지 제거.

### B4. 공유 편의

- **결과 직후 공유**: 범용 `createShareLink` 기반 공유 버튼을 결과 직후 화면에도 노출(현재 SAJU 전용 → 전 카테고리). 기존 `ShareSaveButtons` 확장 또는 공용 버튼.
- **카카오 공유 배선**: 이미 구현된 `KakaoShareButton`을 공유 UI(결과 직후 + 히스토리 상세)에 연결. `NEXT_PUBLIC_KAKAO_JS_KEY` 미설정 시 버튼 자동 숨김(런타임 가드) — 키 설정 여부는 코드에서 확인하고, 미설정이면 "사용자 설정 대기"로 보고만.
- (경미·선택) 공유 조회수 증가를 RPC 에 추가.

## 16. Part B 검증 게이트

- 단위: `saveAnalysisHistoryObserved` 실패 경로 로깅 / 재분석 라우트 테이블의 모든 href 가 실존 라우트(파일 존재) — 테이블 → 라우트 존재를 검사하는 테스트.
- 수동 1회: 스튜디오 관상 분석 → **DB 에 FACE 행 생성 확인**(프로덕션 execute_sql) → 히스토리에서 열어 리치 렌더 확인.
- e2e prod 확장(`e2e/prod/history.spec.ts` 신설): 히스토리 목록 → 상세 모달 → ①JSON 덤프 부재(`<pre>` 원문 노출 없음) ②재분석 버튼 href 실존 검증 ③공유 버튼 노출. 기존 계정의 TODAY 기록으로 검증 가능(분석 실행 불필요).
- 회귀: 기존 SAJU 천지인 렌더 불변, `/share/[token]` 기존 공유 링크 렌더 불변.

## 17. 통합 실행 순서 (Opus — 이 순서대로 전부 자동 진행)

| 단계     | 내용                                                                     | 게이트                                                                |
| -------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| **B-1**  | B1 저장 배선(image.ts 3종 + 사업궁합) + B2 관측화                        | tsc·jest·build → 커밋                                                 |
| **B-2**  | B3 공용 뷰 추출 + 재분석 라우트 교정 + 목업 삭제 + 고아 코드 삭제        | tsc·jest·build → 커밋 → **배포 → 수동 FACE 저장 확인 + e2e(history)** |
| **B-3**  | B4 공유(직후 공유 + 카카오 배선)                                         | tsc·build → 커밋 → 배포 → e2e                                         |
| **A-1**  | Part A Phase 1 (focus-groups + 프롬프트 빌더 + focusAnswers + 결과 섹션) | 단위·스냅샷 → 커밋                                                    |
| **A-2**  | Part A Phase 2 (8대 쉬운 풀이 + siblings 가중치)                         | 단위(가중치 합=1) → 커밋                                              |
| **A-3**  | Part A Phase 3 (궁합 잔여 결함 R3·R4 — R1·R2 는 B 단계에서 선반영)       | tsc·build → 커밋 → **배포 → e2e(compatibility)**                      |
| **A-4**  | Part A Phase 4 (질문 미리보기 칩 + 관계 자동 프리셋)                     | tsc·build → 커밋 → 배포 → e2e                                         |
| **마감** | 로드맵·MEMORY 갱신, 전체 prod 회귀(기존 스펙 + 신설 스펙 직렬)           | `--workers=1` 필수                                                    |

**공통 규율**: 각 단계 실패 시 원인 수정 후 재시도(다음 단계로 건너뛰지 않음). 커밋은 단계별 분리, `git add` 는 **명시 파일만**.
