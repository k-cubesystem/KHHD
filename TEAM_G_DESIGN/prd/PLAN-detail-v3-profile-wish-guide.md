# 디테일 기획 v3 — 프로필·소원·아바타·가이드마퀴·영상확장 (2026-07-22)

> 작성: Fable(조사 2건 통합) → 실행: Opus. 코드 실측(파일:라인) 근거 — 라인은 실행 전 grep 재특정.
> 발주 6건: ①프로필 오늘의운세 제거 ②사주 결과 영상("삶의 터전") 다른 화면에도 ③하단 가이드바 = 접힘 마퀴(흐르는 글귀)+탭 펼침 ④프로필 바로가기 이름 아래로+나머지 축소 재디자인 ⑤신당 소원 가족별 분리+'나'만(박대건 중복 제거) ⑥가족 아바타 실제로 바꿀 수 있게(지금 누르면 8종 서비스 시트).
> 대원칙: DB 행 삭제 금지 · 기존 계약 보존 · **타 세션 보호파일 무수정** · 가격/실차감 불변.

---

## W1. 프로필 페이지 재구성 (발주 ①④)

**실측**: `app/protected/profile/page.tsx` 렌더 순서 = 히어로(234~329) → **오늘의운세 카드(331-337)** → 지표스트립(339-376) → 출석(378-387) → **바로가기 6버튼(389-439)** → 설정·지원(441-492) → 로그아웃. 바로가기가 한참 아래.

**결정**:

- **W1-a 오늘의 운세 제거**: `page.tsx:331-337` 섹션 + `page.tsx:33` `DailyFortuneCard` import 삭제. (오늘의 운세는 대시보드 「오늘의 정성」·`/analysis/today`에 이미 있어 프로필 중복.)
- **W1-b 바로가기 상향 + 재디자인 위계**: 바로가기 6버튼 그리드(389-439)를 **히어로 직후(≈329)로 이동**. 6버튼은 그대로(라벨·href 불변, 신당=골드 accent 유지). 그 아래로 밀리는 **지표스트립·출석·설정지원을 "작게" 재디자인** — 지표스트립은 이미 컴팩트(유지), 출석 카드는 높이 축소(핵심 수치만), 설정·지원은 현재도 리스트라 유지하되 섹션 간 여백 축소. **출석 기능/데이터는 불변**(카드 크기만). 히어로 아바타 클릭(→settings)도 불변.
- 검증: 프로필 e2e — 오늘의운세 카드 부재 + 바로가기 6버튼이 출석보다 위(DOM 순서) + console 0.

---

## W2. 신당 소원 — 가족별 분리 + '본인' 중복 제거 (발주 ⑤)

**실측**: `shrine_wishes` 스키마에 `family_member_id` 없음(20260621_shrine_system.sql:107-117) — 소원은 `shrine_id`로만 스코프. 가족마다 별도 신당(shrines.family_member_id)이라 **탭 전환 시 shrineId는 바뀌지만**, ①소원 레코드에 대상 식별자가 없어 로그 표기가 "신당 주인/익명"뿐(ShrineWishLog.tsx:81) → "공통"으로 체감 ②**'박대건' 중복의 진짜 원인**: `shrine/page.tsx:23-24` 가족 탭 쿼리가 `relationship='본인'` 미필터 → 탭이 `[나(id=null)] [박대건(본인레코드)] [가족…]`. family-page-client(:46)·energy-map(:162)은 이미 필터하는데 **신당만 빠짐**.

**결정**:

- **W2-a 박대건 중복 제거(핵심·한 줄)**: `app/protected/shrine/page.tsx` 가족 탭 쿼리에 `.neq('relationship', '본인')` 추가(family-page-client.tsx:46 동일 패턴). → 탭이 `[나] [실제 가족…]`만. self 신당 이중 생성도 방지.
- **W2-b 소원 가족별 분리**: `shrine_wishes`에 `family_member_id uuid NULL`(신당 소유 대상, NULL=본인) 컬럼 추가(멱등 마이그레이션, 기존 행 NULL=본인 소원). 배선: 본인 신당 페이지(`shrine/page.tsx`)가 현재 대상(`searchParams.member`)을 `ShrineWishForm`/`getWishes`에 전달 → `addWish`(shrine-wishes.ts:40)·`getWishes`(:82)에 `familyMemberId` 파라미터 추가. **shrineId 로도 이미 분리되므로** 이 컬럼은 표기·명시성 강화 목적(소원이 누구 것인지 로그에 대상 가족명 노출). RLS는 shrine 소유권 기존 정책 유지.
- **W2-c 소원 로그 표기**: `ShrineWishLog`가 대상 가족명(또는 "나")을 소원마다 표기 — 어느 가족 신당의 소원인지 명확히.
- ⚠️ shrine 관련 파일은 보호목록 아님(확인). 단 마이그레이션은 신규 파일로.
- 검증: shrine_wishes 컬럼 존재 SELECT + 본인/가족 신당에서 소원 작성→해당 대상에만 노출 e2e(또는 DB 확인) + 탭에 '본인' 미노출.

---

## W3. 하단 가이드 = 마퀴(흐르는 글귀) + 탭 펼침 (발주 ③)

**실측**: 접힌 바(GlobalGuide.tsx:401-420)는 `"{speaker}의 안내 보기"` 정적 1줄 — **글귀도 marquee도 없음**. 지식 글귀는 펼친 knowledge 말풍선(371-391)에만. 자동노출(138-139)이 투어 없는 페이지에선 knowledge를 **펼침**으로 연다. 프로젝트에 `animate-marquee` 정의 없음(ui/marquee.tsx는 keyframes 없는 죽은 컴포넌트), **동작하는 유일 레시피는 `review-marquee.tsx:188-203` 인라인 `infinite-scroll`**(콘텐츠 2배 복제 + translateX 0→-50% + linear infinite).

**결정**:

- **W3-a 접힘 바 = 흐르는 글귀**: 접힘 렌더(414-416)의 정적 span을 **오늘의 상식 글귀(KNOWLEDGE_TIPS[todayIdx].term + " — " + .plain)가 가로로 흐르는 마퀴**로 교체. 앞에 💡 아이콘 + speaker portrait 소형 유지, 끝에 ChevronUp. 마퀴 CSS는 review-marquee의 infinite-scroll 패턴을 이식(globals.css에 `@keyframes guide-marquee` 추가 또는 인라인) — reduced-motion 시 흐름 정지·전체 표시. 속도 ~25s linear(읽을 수 있게).
- **W3-b 기본은 접힘**: 자동노출(138-139)을 knowledge 펼침 → **접힘(`setBubble(null)`)**으로 변경. 개인알림·공지·온보딩·투어(미완)는 여전히 펼침 우선(그대로). 즉 알릴 게 없으면 조용히 흐르는 상식 마퀴가 기본.
- **W3-c 탭 → 펼침**: `onTapCollapsed`(202-220)가 이미 knowledge 말풍선을 열므로 **추가 작업 없음**. 마퀴 탭 시 전체 글귀(term+plain+category+"다른 상식 보기") 펼침 — 요구 충족.
- 높이 변화는 `--guide-bar-h` ResizeObserver 자동 대응.
- 검증: 투어 없는 페이지에서 접힘 마퀴 렌더(글귀 텍스트 존재) + 탭 시 펼침 말풍선 노출 e2e + reduced-motion 정지.

---

## W4. 사주 영상 다른 화면 확장 (발주 ②)

**실측**: `analysis-ambient`가 사주풀이 로딩배경(saju-result:1199)·天→地 디바이더(:734 "地 · 삶의 터전")에 배선됨(사용자가 좋다고 한 부분). `summon-ritual`은 강신(GangshinOverlay)에 이미 연결. AmbientVideo는 `id` 하나로 재사용, 파일 없어도 fallback 안전. 자산 2종(summon-ritual·analysis-ambient).

**결정 — 기존 analysis-ambient 재사용(신규 생성 0)으로 우선순위 상위 3곳 배선**:

- **W4-a 스튜디오 3화면(관상·손금·풍수)**: 공용 `components/studio/analyzing-animation.tsx`(스피너만)에 `<AmbientVideo id="analysis-ambient">` 배경 추가 — **1곳 수정 = 3화면 반영**. 결과 헤더(각 studio page의 `relative overflow-hidden` 그라디언트 박스)에도 은은한 배경 옵션.
- **W4-b 신년운세 결과**: `new-year/page.tsx` Summary 헤더(416-430, 이미 `relative overflow-hidden`)에 배경 영상 — 의식적 테마와 부합.
- **W4-c 재물운/오늘의운세**: 재물운 히어로 헤더에 은은히(중우선). 오늘의운세는 카드 임베드라 이번 제외(최하 우선).
- **궁합은 제외**: 헤더 슬롯은 좋으나 analysis-ambient(금색)가 로맨스 핑크 톤과 상충 → 신규 에셋 필요, 이번 범위 밖(사용자 결정 대기로 기록).
- 공통 규율: opacity 0.16~0.4 + `mixBlendMode:screen` + `pointer-events-none`, **화면당 1개**(디코드 부하), reduced-motion 자동 존중. 각 화면 fallback 유지(영상 없어도 무크래시).
- 검증: 스튜디오·신년 화면에 `<video>` 존재 또는 폴백 무크래시 + console 0.

---

## W5. 가족 아바타 진입점 수정 (발주 ⑥)

**실측**: 아바타 선택 UI는 **이미 완성**(FiveAvatarSelector가 정령5+신위17 렌더, add/update 저장 정상 — 세션29 배선 완료). 문제는 **진입점**: 가족 카드(member-mission-card)의 아바타에 독립 클릭 핸들러가 없어 Card onClick으로 버블링 → `MissionDetailSheet`(MISSION_CATEGORIES **8종 서비스**) 오픈. 아바타 변경은 **⋯ 드롭다운 → 수정하기**로만 도달(숨겨진 진입점). = 사용자가 "누르면 8가지 뜬다"고 한 정확한 증상.

**결정**:

- **W5-a 아바타 직접 클릭 → 편집**: `member-mission-card.tsx` 아바타 요소에 `onClick`(stopPropagation) 추가 → **편집 폼(startEditing)으로 직행** 또는 아바타 셀렉터 바텀시트 오픈. Card 본문(정보 영역) 클릭은 기존대로 미션 시트 유지(요구는 "아바타" 클릭 동작 교정). 아바타에 카메라/연필 오버레이 힌트로 "누르면 바꿀 수 있음" 시각화.
- **W5-b (선택) 미션 시트 분리 명확화**: 카드 탭이 8종 서비스 시트를 여는 것 자체는 기능이므로 유지하되, 아바타만 편집으로 분기. 혼동되면 카드에 "분석하기"/"수정" 버튼 위계 정리는 후속.
- 검증: 아바타 클릭 → 편집 진입(미션시트 아님) 단위/e2e + 신위 선택→저장→카드 반영.

---

## 실행 순서 (Opus 자동, 단계별 tsc·jest·build → 커밋 → 배포)

| 단계     | 내용                                                                      | 규모 |
| -------- | ------------------------------------------------------------------------- | ---- |
| **W-A**  | W5 아바타 진입점 + W2-a 박대건 중복 제거(한 줄) — 사용자 체감 즉효·저риск | 小   |
| **W-B**  | W1 프로필 재구성(운세 제거·바로가기 상향·축소 재디자인)                   | 中   |
| **W-C**  | W3 가이드 마퀴(접힘 흐르는 글귀 + 탭 펼침)                                | 中   |
| **W-D**  | W2-b/c 소원 가족별 분리(마이그레이션 + 배선 + 로그 표기)                  | 中   |
| **W-E**  | W4 영상 확장(스튜디오 공용·신년·재물)                                     | 中   |
| **마감** | 로드맵·MEMORY + 전체 prod 회귀(--workers=1) + 최종 보고서                 | —    |

## 금지·주의

- DB 행 삭제 금지(본인 레코드 표시만 숨김). shrine_wishes 컬럼 추가는 멱등·기존행 NULL 호환.
- **타 세션 보호파일 무수정**: `app/actions/payment/membership.ts`·`app/actions/user/family.ts`·`supabase/migrations/payment/04_membership_tiers.sql`·`app/actions/__tests__/family-limit.test.ts`·`supabase/migrations/20260720_drop_check_relationship_limit.sql`. W2-b 소원 배선이 `family.ts` 를 요구하지 않는지 확인(shrine-wishes.ts·shrine/page.tsx 로 처리 가능). W5 아바타는 이미 저장되므로 family.ts 무수정.
- 가격·실차감·이미지 파서 태그·daily 프롬프트 불변.
- git add 명시 파일만(-A 금지). 단계별 push(behind 시 pull --rebase).
- 영상 화면당 1개·저opacity·폴백 유지(성능).

## 사용자 결정 대기

1. 궁합 화면 영상 — 로맨스 톤 신규 에셋 생성 시 $0.40~0.50(Veo). 원하면 별도.
2. 신위 아바타 프로필(본인) 확장 — 이번엔 가족만.
