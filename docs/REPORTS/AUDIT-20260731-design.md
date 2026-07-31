# AUDIT-20260731 — 신당 디자인 품질 감사 + 상향 기획

- 트랙: A4 (읽기 전용 감사 · 스크래치 합성 렌더 검증 포함)
- 기준: `DESIGN.md` v2 (2026-07-05 토큰 규칙 포함) — 위반 적발이 아니라 **DESIGN.md를 지키면서 "형식적" 느낌을 벗는 방법**이 과제
- 점검 범위: 신당 룸 크롬 · 창방 팻말 · 의식 페이지 2종(오방기/백일) · 모아보기 · 액막이 시트 · 하단 네비 · 토큰 위생
- 검증 방법: 코드 정독 + `node scripts/check-design-tokens.mjs` + 빌드 산출 CSS 청크 grep(읽기) + Playwright 합성 렌더 2종(스크래치패드 `compare.png`, `plaque-compare.png`)

---

## 0. 요약 — "형식적으로 보이는" 다섯 가지 물리적 원인

| #   | 원인                                                                                                                                                                                                         | 증거(정량)                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **골드 위계가 실제로 죽어 있다** — `text-gold-200`(40+곳)·`text-gold-dim`(2곳)이 tailwind.config에 없는 색이라 클래스 미생성. 라벨이 전부 상속색(흰색 계열)으로 렌더                                         | 빌드 CSS 청크 6개 전수 grep 0건 (`.next/static/chunks/*.css`, 2026-07-31 01:42 빌드)                                                                    |
| 2   | **같은 해부학의 "시스템 알림 행"이 5곳 반복** — 20px 원 아이콘 + 11px serif 이름 + 한자 첨자 + 10px 설명 + 9.5px 카운트. 방 위(백일)·방 아래(액막이·오방기)·모아보기(기원)·마무리 카드(게이지)로 흩어짐      | BaekilStrip · AekmakStrip · 오방기 Link · DevotionStrip · SettleCard 게이지 — 전부 `rounded-[10px] border-gold-500/20 bg-surface/60 px-2.5 py-1.5` 동형 |
| 3   | **도장 CTA 규약 실종** — DESIGN.md "buttons: 3px for 도장 feel"(2026-04-03 브랜드 결정)인데 오늘 붙은 의식 CTA 전부 `rounded-xl`(12px)                                                                       | `rounded-[3px]` 사용처는 신당 전체에서 FamilyHall 1곳 + 액막이 인장 장식 1곳뿐                                                                          |
| 4   | **단청 리듬 부재** — DESIGN.md Layout "Section rhythm: dancheong-divider"가 분석·랜딩·프로필·멤버십에는 있는데 **신당 계열 0건**                                                                             | grep: `dancheong-divider\|dancheong-border-top` — components/shrine, app/protected/shrine 0건                                                           |
| 5   | **마이크로 타이포 스프롤 + 회색 안개** — 임의 px 크기 173건, 그중 12px 미만 86건(최저 7.5px). 9~11px 대역에 6단계(8.5/9/9.5/10/10.5/11) 난립. 저투명 라벨(`/45` 이하) 61건으로 WCAG 규칙(라벨 /55 이상) 미달 | `text-\[N px\]` 집계, `/45~/20` 집계 — 본문 §7                                                                                                          |

장식이 모자란 것이 아니다. **위계(1)·그룹핑(2)·브랜드 문법(3)·리듬(4)·스케일(5)**이 무너져 있어서, 어떤 에셋을 얹어도 "형식적"으로 읽힌다. 아래 기획은 전부 이 다섯을 겨눈다.

---

## 1. 현행 진단 — 화면별

### 1-1. 신당 룸 크롬 (`components/shrine/scene/ShrineRoomClient.tsx` 1360~1810)

현행 세로 스택(소유자 기준):

```
가족 탭
BaekilStrip            ← 방 위 (32px 행)
[룸 min(72vh,620px)]
AekmakStrip            ← 방 아래 (32px 행)
오방기 Link            ← 방 아래 (32px 행)
ShrineWishForm         ← hanji-card (mt-5)
ShrineWishLog
ShrineGuideBar         ← fixed bottom-[68px] 부유 필
BottomNav              ← fixed h-[60px]
```

문제:

- **정보 위계**: 같은 급의 의식 3종이 방을 사이에 두고 위 1 + 아래 2로 갈라져 있다. 백일기도만 방 위에 있는 이유(게이지라서)는 코드 주석에는 있지만 화면에서는 읽히지 않는다 — 사용자에게는 "왜 하나만 위에 있지"다.
- **밀도·반복**: 스트립 3개가 픽셀 단위까지 같은 해부학이라(§0-2) 목록으로 읽힌다. 의식(儀式)이라는 콘텐츠의 무게 대비 겉모습이 "설정 화면 행"이다. 합성 렌더(A안)에서 이 인상이 그대로 재현됐다.
- **터치 타깃**: 스트립 실높이 약 32px — 44px 접근성 기준 미달.
- **중복**: 백일기도 잔여 표기가 게이지(방 위)와 소원 폼 "오늘 첫 기도" 뉘앙스에 분산. 오방기 잔여 `오늘 N/3`과 액막이 `오늘 N/3`은 같은 문법이라 묶이면 자연히 한 곳이 된다.
- **헤더 행**(1363~1411): 좌 타이틀 + 우측 버튼 4개(모아보기·공개·음소거·설정)가 한 줄 — 밀도는 수용 범위. 다만 `text-gold-dim`(1365 "나 의 신 당" 라벨, 1695 보관함 라벨)이 죽은 클래스라 명조 세리프의 금색 오버라인이 흰 글자로 나온다.

### 1-2. 창방 팻말 (`WindowPlaques.tsx` + `lib/domain/shrine/plaque.ts`)

기하(무라 cover 배율 추종)는 잘 설계됐고 검증 이미지(`assets-src/shrine/ritual-plaque-check.webp`)에서도 창방 안착이 확인된다. 문제는 **글자의 물성**:

- 한글 `#F2DEA8` 단색 + weight 700 + 그림자 없음 → 나무 널 "위에 뜬 스티커". 널 스프라이트(몰딩·놋쇠 못)는 물성이 있는데 글자만 UI 레이어다.
- 한자 첨자 `text-gold-500/70` 12×s — 실기기 널 폭(약 96~120px)에서 약 7~8px. 읽히지도 장식되지도 않는 어중간.
- 합성 렌더 검증(`plaque-compare.png`): **각자(刻字) 처리**(금박 그라디언트 + 위쪽 홈 그림자 + weight 900)가 실기기 축소 크기에서도 명확히 우수. 주칠 낙관점 추가안(C)은 축소 시 노이즈가 되어 기각.

### 1-3. 의식 페이지 2종 (`app/protected/shrine/{obangki,baekil}/`)

잘된 것: 페이지 골격(한자 오버라인 → 제목 → 본문 → 면책)이 두 페이지 동형. 실패 상태(조회 null)가 상태를 지어내지 않고 같은 문법의 카드로 되돌린다 — 품격 있음. `hanji-card` + `#16140F` 지정도 일관.

문제:

- **CTA 반경 혼용**: 주 CTA(부적에 새기기 / 기 세우고 방울 울리기 / 첫 촛불 올리기 / 갈무리하기)가 전부 `rounded-xl`(12px) — 도장 규약(3px) 위반이자, 보조 버튼(공유·한 번 더·신당으로)도 똑같이 `rounded-xl`이라 **주/보조가 반경으로 구분되지 않는다**. 색 농도로만 구분 중.
- **여백 리듬**: 오방기 compose의 섹션 간격 `space-y-4`(16px) vs 백일 카드 내부 `mt-5/mt-4/mt-2.5` 혼재 vs 액막이 `space-y-4` — 8px 그리드는 지키지만 페이지 간 리듬이 다르다.
- **숫자 서체**: `오늘 무료 2/3회`, `37/100일` 등 카운트가 `font-serif tabular-nums`. DESIGN.md Data 규약은 JetBrains Mono(tabular-nums) — 회색지대(사주 수치가 아님)이나 통일 여지.
- 백일 완주패 선반: 이미지+텍스트 중앙 정렬 3열 — 결 무난. `text-[9.5px]` 날짜는 §7 타이포 정규화 대상.

### 1-4. 모아보기 (`app/protected/shrine/collection/page.tsx`)

세 그리드가 "서로 다른 시대의 물건"인 이유가 구체적으로 셋:

|           | 테마(ThemeShopGrid)      | 아이템(ShrineShopClient)                      | 신위(DeityPantheon)                                     |
| --------- | ------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| 카드 구조 | 프리뷰 헤더(h-24) + 본문 | 좌 아이콘 + 우 배지 2열                       | 중앙 정렬 메달리온                                      |
| 배지 문법 | 원소 원(18px, 우상)      | rarity 필 + 보유 필 + 원소 원(15px) + 존 사각 | 자물쇠 원 + tier 텍스트                                 |
| CTA       | `rounded-lg` 사각        | `rounded-lg` 사각                             | **`rounded-full` 필**(좌정/봉안)                        |
| 헤더      | 힌트 좌 + 수집 카운트 우 | 복채 잔액 좌 + "신당으로 →" 우                | **자체 대형 헤더 "神 位 / 신위전(神位殿)" + 제단 섹션** |

- **이중 헤더**: 모아보기 페이지 헤더("神 堂 一 覽 / 모아보기") 아래 신위 탭이 또 페이지급 헤더를 그린다. `hideBackLink`로 뒤로가기만 숨겼고 헤더는 남았다.
- **이중 이탈 동선**: 아이템 탭 안의 "신당으로 →" 버튼이 페이지 좌상단 "신당으로"와 중복.
- 탭 전환이 서버 네비게이션(`<Link href=...tab=>` + force-dynamic)이라 전환마다 풀 리로드 체감 — 결 문제는 아니나 물성을 깎는다.
- `border-white/8`(탭 비활성, 119행) — Tailwind 표준 스텝에 8이 없어 **클래스 미생성**(빌드 CSS 0건 확인).
- DeityPantheon 267~269행: 인라인 `<style>` 태그로 keyframes 선언 — 연출 CSS는 정적 파일 규율(`app/shrine-scene.css`) 위반(styled-jsx는 아니라 동작은 하지만 규율 어긋남).

### 1-5. 액막이 시트 (`AekmakSheet.tsx`)

연소 연출 자체(BURN_CURVE·마스크·잉걸불)는 6차 검수 통과분 — 판단하지 않는다. UI 요소와의 조화 관점:

- **국면 점프**: compose(태그+텍스트 폼) → talisman(부적 무대)이 시트 내용 전체 교체다. 전환 애니메이션이 없어(`.ritual-sheet`는 시트 입장 1회) 폼이 사라지고 무대가 "툭" 나타난다. 시트 높이도 국면마다 출렁인다(compose 약 380px ↔ talisman 279px 무대 + 여백).
- **연소 텍스처와 UI의 층위**: 부적지·인장·발원 문구는 물성이 좋다(한지색·기울인 인장·표시광고법 문구까지). 대비로 그 아래 붙는 버튼들(`rounded-xl` 12px)이 더 "앱스럽게" 보인다 — §1-3과 같은 원인.
- 마무리 카드의 "오늘의 액막이" 게이지가 스트립 문법을 또 반복(§0-2 다섯째 사례).

### 1-6. 하단 네비 (`components/layout/bottom-nav.tsx`)

신당이 가운데(3/5)로 왔지만 다섯 칸이 완전 균등 — 가운데 슬롯의 특별 취급이 없다. 초롱 아이콘도 26px 동일. 비활성 처리(`opacity-55 grayscale-[35%]`)는 좋으나, "매일 들르는 집"이라는 재배치 의도가 시각으로 이어지지 않았다. 합성 렌더 B안에서 가운데 초롱을 44px 원판+글로우로 키웠을 때 앵커가 서는 것을 확인했다.

### 1-7. 토큰 위생 (`scripts/check-design-tokens.mjs` 실행 결과)

- 신당 계열 하드코딩 브랜드 rgba **21건** (AekmakSheet 230, BaekilStrip 41, DevotionStrip 92·183·185, FamilyHall 5건, ShrineRoomClient 7건, StageLayers 199, DeityTurn 238 등).
- 오늘 의식 컴포넌트의 하드코딩 hex 상위: `#f2dcdc`(4) `#C9A84C`(4) `#16140F`(4) `#9E2B2B`(3) `#5C564C`(2) `#E8D5A0`(1) 등 — `#C9A84C`=gold-500, `#9E2B2B`=seal, `#16140F`=surface, `#E8D5A0`=primary로 토큰이 이미 있다.
- 구조적 공백: DESIGN.md의 Text Muted `#8C8478` / Text Dim `#5C564C`가 **Tailwind 토큰으로 존재하지 않아** 저마다 `text-ink-primary/45`, `text-ink-light/40`, hex 직접 지정으로 흩어진다(§0-5의 뿌리).

---

## 2. 디자인 상향 기획 — 실행 항목

> 표기 규약: 모든 항목은 구현 에이전트가 취향 판단 없이 실행 가능한 수준으로 클래스/수치를 명시한다.
> [코드만] = 오늘 밤 실행 가능. [에셋] = AI 이미지 생성 필요 → 아침 승인 후(§3).

### P1-0. 죽은 클래스 소생 (버그 수리 — 최우선) [코드만]

1. `tailwind.config.ts` `colors.gold`에 두 줄 추가:
   ```ts
   gold: {
     200: '#E8D5A0', // Gold Light (DESIGN.md) — text-gold-200 40+곳 소생
     ...
   ```
   `#E8D5A0`는 DESIGN.md "Gold Light — 하이라이트 텍스트" 그대로이며 config `primary.DEFAULT`와 동일값 — 새 색 추가가 아니라 기존 정의색의 슬롯 등록이다.
2. `text-gold-dim` 사용처 2곳을 `text-gold-600`으로 치환 (`ShrineRoomClient.tsx` 1365, 1695). gold-600 = `#A8903F` = DESIGN.md Gold Dim.
3. `app/protected/shrine/collection/page.tsx` 119행 `border-white/8` → `border-white/[0.08]`.
4. 검증 게이트(필수): 수정 후 prod 빌드 산출물에서 `grep -c "gold-200" .next/static/chunks/*.css` ≥ 1 확인 (feedback_styled_jsx_dead_css.md와 같은 규율 — 죽은 CSS는 무증상).

### P1-1. 의식 독(儀式 dock) — 스트립 3개를 카드 하나로 [코드만]

합성 렌더 B안으로 검증 완료(`scratchpad/compare.png`). 대상: `ShrineRoomClient.tsx` 1413~1419(BaekilStrip 슬롯 제거) + 1647~1684(의식 스트립 래퍼 → 독으로 교체).

구조(신규 `components/shrine/scene/RitualDock.tsx` 권장 — 룸 파일 2,041줄 비대 완화):

```
<section class="hanji-card rounded-xl border border-gold-500/[0.18] overflow-hidden mt-3">   ← 카드 반경 12px = DESIGN.md
  <header class="flex items-baseline gap-2 px-4 pt-2.5 pb-2">
    <span class="font-serif text-body-sm font-bold tracking-[0.14em] text-gold-200">오늘의 의식</span>
    <span class="font-serif text-overline text-gold-500/60">儀 式</span>
  </header>
  <div class="dancheong-divider" />                                  ← 신당 최초의 단청 리듬
  <행 × 3 : divide-y divide-white/[0.04]>
</section>
```

행 공통 스펙 (Link 또는 button — 액막이만 button):

- 컨테이너: `flex items-center gap-2.5 px-4 min-h-[44px]` (터치 타깃 44px 충족, 현행 32px에서 승급)
- 아이콘 플레이트: `grid h-[26px] w-[26px] flex-shrink-0 place-items-center rounded-[3px]` — **도장 반경 3px**(원형 20px 폐기). 배경/보더:
  - 액막이: `bg-seal/[0.16] border border-seal/35` + `<Flame class="h-3.5 w-3.5 text-[#E8A07A]">` (불꽃색은 현행 유지)
  - 오방기: `bg-obangsaek-blue/[0.16] border border-obangsaek-blue/40` + `<Flag class="h-3.5 w-3.5 text-[#9FBEDD]">` (현행 rgba(62,95,134) 하드코딩을 obangsaek-blue 토큰으로)
  - 백일기도: `bg-gold-500/[0.14] border border-gold-500/40` + `<Flame class="h-3.5 w-3.5 text-gold-200" fill="#C9A84C">` (연소 중 조건은 BaekilStrip의 burning 로직 그대로)
- 이름: `font-serif text-body-sm font-bold text-ink-primary whitespace-nowrap` (13px — 현행 11px에서 승급). **한자 첨자(厄/旗/禱)는 행에서 제거** — 한자 장식은 헤더 "儀 式" 하나로 승격(행마다 반복하면 노이즈, §0-2).
- 설명: `flex-1 truncate font-sans text-[11px] text-ink-primary/55` (10px/45 → 11px/55 — WCAG 라벨 기준 충족). 문구 축약: "마음에 걸린 것을 태웁니다" / "깃발을 뽑아 방위를 봅니다" / (백일은 설명 대신 게이지)
- 우측 상태: `whitespace-nowrap font-sans text-[11px] tabular-nums text-ink-primary/55` + 앞에 상태점 `inline-block h-[5px] w-[5px] rounded-full` (액막이 `bg-red-light`, 오방기 `bg-obangsaek-blue`, 백일 `bg-gold-500`; 소진/휴면 시 점 제거하고 `text-ink-primary/40`)
  - 액막이: `오늘 N회 남음` (0이면 `오늘 몫을 다 했습니다`)
  - 오방기: `무료 N회 남음` (0이면 `복채 1만냥`)
  - 백일: 진행 시 인라인 바 `h-1 w-[72px] rounded-full bg-ink-primary/15` + 채움 `bg-gold-500` + `N/100일`; 미서약 시 `시작하기`; ready 시 기존 갈무리 배지(`bg-seal` 필) 유지
- 배선 보존(필수):
  - 액막이 행은 기존 `AekmakStrip`을 그대로 품는다 — 겉 클래스만 위 행 스펙으로 바꾸고, `data-aekmak-open` 속성·`aekmakRef` 래퍼·시트 로직은 무변경 (창방 팻말 `openAekmakSheet`가 이 버튼을 대신 누른다).
  - `BaekilStrip` 컴포넌트는 독의 행 렌더로 흡수하고 방 위 슬롯(1419행)은 삭제 — 방이 헤더 바로 아래로 올라온다.
  - null 가드 유지: `aekmak`/`obangki`/`baekil`이 null인 행은 그리지 않는다(잔여 오표시 금지 규율). 셋 다 null이면 독 자체를 그리지 않는다.
- GA4: 기존 이벤트 라벨 무변경.

### P1-2. 도장 CTA 규약 복원 — 버튼 반경 3단 문법 [코드만]

신당 의식 계열의 버튼을 세 단으로 고정한다 (DESIGN.md "cards 12px, buttons 3px" 준수):

| 단                              | 반경               | 그림자          | 대상                                                                                                    |
| ------------------------------- | ------------------ | --------------- | ------------------------------------------------------------------------------------------------------- |
| 주 CTA (의식을 성립시키는 버튼) | `rounded-[3px]`    | `shadow-dojang` | 부적에 새기기 · 기 세우고 방울 울리기(+복채 회차) · N회차 첫 촛불 올리기 · 백일 발원 갈무리하기         |
| 보조 CTA                        | `rounded-lg` (8px) | 없음            | 액막이 카드/한 장 더 · 깃발 카드/한 번 더/신당(으로) · 신당에서 기도 올리기 · 복채 채우기 · 다시 여쭙기 |
| 칩/필터                         | `rounded-full`     | 없음            | 태그 선택 · 질문유형 · 소원 카테고리 (현행 유지)                                                        |

구체 치환 (색·패딩·타이포는 현행 유지, 반경+그림자만):

- `AekmakSheet.tsx` 427행(부적에 새기기): `rounded-xl` → `rounded-[3px] shadow-dojang`
- `ObangkiSheet.tsx` 446행(기 세우기): `rounded-xl` → `rounded-[3px] shadow-dojang`
- `baekil-client.tsx` 107행(첫 촛불)·159행(갈무리): `rounded-xl` → `rounded-[3px] shadow-dojang`
- 보조 CTA 전부: `rounded-xl` → `rounded-lg` — `AekmakSheet.tsx` 690·699·707행, `ObangkiSheet.tsx` 313·324·332·673·681·687행, `baekil-client.tsx` 173행, `obangki/page.tsx` 34행, `baekil/page.tsx` 36행
- 예외: 바텀시트 컨테이너 `rounded-t-2xl`, 다이얼로그 `rounded-2xl`, 룸 `rounded-[18px]`는 버튼이 아니므로 불변.

### P1-3. 창방 팻말 각자(刻字) 처리 [코드만]

합성 렌더 검증안 B (`scratchpad/plaque-compare.png`). `WindowPlaques.tsx` `PlaqueFace`만 수정 — 기하(plaque.ts·CSS cover 문법)는 불변:

- 한자 줄: `text-gold-500/70` → `text-gold-500/50`, fontSize `calc(12 * var(--plq-s))` → `calc(10 * var(--plq-s))`, letterSpacing `calc(0.5 * var(--plq-s))` → `calc(3 * var(--plq-s))`, style에 `textShadow: '0 -1px 0 rgba(0,0,0,0.7)'` 추가
- 한글 줄: `font-bold text-[#F2DEA8]` → weight 900 + 금박 그라디언트 + 홈 그림자:
  ```tsx
  className="font-serif font-black"
  style={{
    fontSize: 'calc(22 * var(--plq-s))', marginTop: 'calc(2 * var(--plq-s))',
    background: 'linear-gradient(180deg,#F0DCA4 0%,#D9BC72 55%,#B3903E 100%)',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
    filter: 'drop-shadow(0 -1px 0 rgba(20,10,2,0.85)) drop-shadow(0 1px 0 rgba(255,238,190,0.18))',
  }}
  ```
  (그림자 1px 고정 — 실기기 축소에서도 1px가 각자 홈으로 정확히 읽힘을 축소 렌더로 확인. 그라디언트·다중 drop-shadow는 DESIGN.md 토큰 예외 조항 해당)
- 주칠 낙관점(C안)은 기각 — 실기기 크기에서 노이즈.

### P1-4. 모아보기 결 통일 [코드만]

1. **이중 헤더 해소**: `DeityPantheon.tsx`에 `hideHeader?: boolean` prop 추가 — true면 124~130행 헤더(神 位 / 신위전 / 부제)를 건너뛴다. `collection/page.tsx` `DeityTab`에서 `hideHeader` 전달. 제단 섹션(主神)부터 시작.
2. **이탈 동선 단일화**: `ShrineShopClient.tsx` 50~55행 "신당으로 →" 버튼을 모아보기에서 숨긴다 — `hideShrineLink?: boolean` prop 추가, `collection/page.tsx` `ItemTab`에서 전달 (통합 상점 쪽은 현행 유지).
3. **CTA 문법 통일**: `DeityPantheon.tsx` 카드 내 좌정(229행)·봉안(239행) 버튼 `rounded-full` → `rounded-lg`, 패딩 `px-2.5 py-1` → `py-1.5 w-full` — 테마/아이템 카드의 `rounded-lg py-1.5` CTA와 동형이 된다. (제단의 "수호신 좌정하기" 대형 버튼은 주 행위이므로 P1-2 문법으로 `rounded-[3px] shadow-dojang bg-seal`.)
4. **탭 활성 표기에 단청**: 탭 Link(116행)의 활성 클래스에 `dancheong-border-top` 추가, 비활성은 현행 유지. 활성 반경은 `rounded-xl` 유지(border-image와 radius는 공존하지 않으므로 활성 탭만 `rounded-none rounded-b-xl`로).
5. 원소 배지 크기 통일: ThemeShopGrid 18px vs ShrineShopClient 15px → 둘 다 `w-[15px] h-[15px] text-[9px]`.

### P1-5. 하단 네비 — 가운데 신당 슬롯 특별 취급 (온건판) [코드만]

`bottom-nav.tsx`: 신당 항목만 아이콘 래퍼를 키운다. 판별은 `item.href === '/protected/shrine'`.

- 아이콘 래퍼: `p-1 rounded-xl` → 신당만 `grid h-[42px] w-[42px] place-items-center rounded-[14px] -mt-3 border border-gold-500/35 bg-gradient-to-b from-gold-500/[0.16] to-gold-500/[0.04] shadow-[0_0_14px_rgba(212,175,55,0.18)]` (비활성에도 상시 — "가운데가 집"의 앵커. 활성 시 기존 글로우 `shadow-[0_0_15px_rgba(212,175,55,0.2)]` 유지)
- 신당 Image 크기: `26px` → `30px`
- 신당 비활성 아이콘의 `grayscale-[35%]` 제거, `opacity-55` → `opacity-80` (가운데 초롱만은 늘 색을 띤다)
- 라벨·나머지 4칸 불변. `-mt-3` 부상이 과하면 `-mt-1.5`로 줄이는 것까지 허용(둘 중 택1은 실기기 확인, 그 외 수치 변경 금지).

### P2 (다음 회차)

- **P2-1. 신당 마이크로 타이포 정규화**: 신당 스코프 임의 px를 5단으로 맵핑 — `text-[13px]`→`text-body-sm`, `12/12.5`→`text-caption`, `11/11.5`→`text-overline`(자간 조정 필요 시 `tracking-normal` 병기), `10/10.5`→11px 승급, `9.5 이하`→10px 하한(장식 한자 오버라인만 예외). 총 173건 — 일괄 기계 치환이 아니라 화면 단위 검수 동반.
- **P2-2. 저투명 승급**: 정보 라벨의 `/45` 미만을 `/55`로(61건 중 장식 제외 선별). DESIGN.md WCAG 조항 준수.
- **P2-3. 토큰 치환 21건**: §1-7의 check-design-tokens 검출분 — `rgba(201,168,76,A)`→`gold-500/[A]` 등. 그라디언트·box-shadow 내부는 예외 조항대로 유지.
- **P2-4. 텍스트 계층 토큰 신설**: config에 `ink.muted: '#8C8478'`, `ink.dim: '#5C564C'` 등록(DESIGN.md 정의색) 후 신당부터 적용 — `/45` 난립의 구조적 해소.
- **P2-5. 액막이 국면 크로스페이드**: `app/shrine-scene.css`에 `.ritual-phase-enter { animation: ritualPhaseIn 240ms ease-out }` (opacity 0→1 + translateY 6px→0) 추가, compose/talisman/settled 루트에 부착. 시트 본문 최소 높이 `min-h-[340px]`로 출렁임 완화. reduced-motion 분기 필수. (연소 애니메이션 자체는 불가침 — §4)
- **P2-6. 카운트 서체**: `tabular-nums` 카운트류를 `font-mono`(JetBrains Mono) 소형 사이즈로 시험 — 사주 수치 규약의 확장 여부는 실기기 비교 후 결정.
- **P2-7. DeityPantheon 인라인 `<style>` keyframes를 `shrine-scene.css`로 이관.**
- **P2-8. 모아보기 탭 클라이언트 전환**(선택): 세 탭 데이터를 한 번에 내리거나 라우트 그룹 layout으로 탭 껍데기 유지 — 전환 깜빡임 제거. 공수 대비 효과는 중간.

---

## 3. 에셋 필요 항목 (아침 승인 후 — 야간 실행 금지)

| 항목 | 내용                                                                                                             | 대체 가능 여부                                |
| ---- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| A-1  | 의식 독 행 아이콘 3종 — lucide 선화 대신 「설빛온기」 결의 도장풍 미니 스프라이트(부적·오방기·백일초, 26px 규격) | P1-1은 lucide로 먼저 출하 가능. 에셋은 교체만 |
| A-2  | 하단 네비 신당 슬롯 전용 초롱 강조 프레임(발광 상태 별도)                                                        | P1-5는 CSS 글로우로 먼저 출하 가능            |
| A-3  | 모아보기 빈 상태 일러스트(보유 0 테마/신물)                                                                      | 현행 텍스트 빈 상태로 충분 — 후순위           |

이번 야간 트랙에서는 A-1~3 없이 P1 전 항목이 성립한다(전부 코드만으로 완결).

---

## 4. 하지 말 것 — CEO 검수 통과분 불가침

아래는 이미 검수를 통과했거나 별도 규율이 걸린 요소다. 이번 기획의 어떤 항목도 이들을 건드리지 않으며, 구현 중 충돌이 생기면 **이 목록이 이긴다**:

1. **연소 연출** — 부적 BURN_CURVE·텍스처 마스크·잉걸불/투과광 구조(`.ritual-burn` 계열), animationend 국면 전동. P2-5는 국면 "사이"의 페이드만 얹지 연소 자체는 불변.
2. **오방기 실물 형태** — 1:1 기폭 비율, 스프라이트 왼변=깃대 정렬, 말린 기 동형 원칙(색 사전 노출 금지), 복채 회차 비낙관 규율.
3. **신위 회전**(DeityTurn 프레임·탭 잠금·대화 확인 다이얼로그) 및 **무라 좌표계**(팻말 cover 배율 문법, `PLAQUE_BOX` 기하, z-2 층위).
4. **방 물리** — 방 높이 `min(72vh,620px)`, overflow 미사용(고DPR 흰화면 전례), 시차층·문틀 그림자, 사랑방 배치.
5. **걷어낸 것 되살리기 금지** — 테마 칩 줄(SHOW_THEME_COLLECTION)·기운 게이지(SHOW_ENERGY_BALANCE)·방 위 인연/기원 스트립은 CEO 6차 지시로 꺼진 상태 그대로.
6. **styled-jsx 금지·연출 CSS는 정적 파일** 규율, EffectsCanvas 표면적 증가 금지.

---

## 부록 — 검증 산출물(스크래치패드, 저장소 밖)

- `scratchpad/shrine-chrome-compare.html` → `compare.png`: 현행 스택(A) vs 의식 독(B) 390px 폰 목업 — B에서 방이 최상단으로 오르고 의식 3종이 한 카드로 서는 효과 확인
- `scratchpad/plaque-typo-compare.html` → `plaque-compare.png`: 팻말 글자 현행(A)/각자(B)/낙관점(C) — 실제 `plaque.webp` 위 렌더 + 실기기 축소(0.52배) 검증, B 채택·C 기각
- 빌드 CSS 검증: `.next/static/chunks/*.css`(2026-07-31 01:42) — `gold-200`·`gold-dim`·`white/8` 0건, 대조군 `gold-300` 정상 생성
