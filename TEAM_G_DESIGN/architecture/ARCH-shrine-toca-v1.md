# ARCH — 신당 2.0 "토카 스타일" 인터랙션 설계도

> 작성: 2026-07-08 (Fable) | **구현: Opus 4.8** | 상위 문서: [PRD-shrine-2.0-v1](../prd/PRD-shrine-2.0-v1.md)
> 이 문서는 구현 지시서다. 파일 경로·타입·수용 기준까지 그대로 따라 코딩한다.

## 구현 현황 (2026-07-09, Opus 4.8) — Step 1~4 코어 배포 완료

**완료 (커밋 방금, 프로덕션 배포):**

- Step 1 — 마이그레이션 `20260712_shrine_toca.sql` 적용(plzvanxcxjkaazcfrtls): shrine_placements/user_shrine_inventory/shrine_theme_packs/user_theme_packs/user_energy_profile + 카탈로그 12종(오행/energy_power/layer/behavior JSONB) + 테마팩 4종
- 도메인: `lib/domain/shrine/{types,energy,zones}.ts` — 기운 엔진(base+아이템+공명) 순수함수 + 단위테스트 11개 통과
- 서버 액션: `app/actions/shrine/scene.ts` — getSceneData(사주 base 유도+스타터킷), saveShrineLayout(보유량 검증), activateThemePack
- 클라이언트: `components/shrine/scene/{ShrineRoomClient,useShrineAudio,keeper-lines}.ts(x)` — 드래그 배치·존 클램프·탭 반응(toggleLit/swing)·신당지기 건네기·5연타 이스터에그·공명 링·Web Audio 합성 국악·테마 전환·보관함
- `app/protected/shrine/page.tsx` → 새 룸으로 교체
- 검증: 타입 0, 빌드 통과, jest 11 통과

## 야간 2차 (2026-07-09, Opus 4.8) — Step 5·6 + 상점·방문자 완료

**추가 완료·배포:**

- Step 5 EffectsCanvas: 촛불 지속 불꽃·향연·꽃잎·반짝임 파티클(단일 canvas rAF, 오브젝트 풀, reduced-motion 대응). 점화/향로/공명/건네기 연동
- Step 6: 신당지기 idle 루프(75s 무활동 혼잣말) + 공물 건네기 → 장기 기억 기록(recordKeeperGift) → shrine-chat 회상
- **상점 재배선 완료**: `purchaseToInventory`(복 차감→보관함) + `grant_shrine_item` RPC. 구매가 방 보관함에 반영. 잔액 소스 버그(user_profiles.bok_points→bok_points.balance) 수정. 룸 보관함에 "신물 구하기" 링크
- **방문자 뷰 완료**: `getPublicSceneData` + `/shrine/[userId]` 새 미니룸(읽기전용, 탭 반응 O, 편집/테마/게이지 비노출). 소원폼/로그 유지
- shrine-chat: 새 placements + 기운 게이지·용신 주입 (방 상태 아는 대화)
- 폴리시: 보기모드 점화 즉시 저장(setPlacementLit), 방문 카운트 새로고침 인플레 제거
- 검증: 타입 0, 빌드 통과, jest 11 통과. 4회 배포 완료

**여전히 미완 (사용자 검토/에셋 필요):**

- 스프라이트 에셋: 이모지 폴백 사용 중 (sprite_url null) — 일러스트 발주 대기
- PRD Phase 0 분석 P0 버그(관상/손금 파서·저장, 결제 SKU): 무인 배포 위험으로 보류 → 아침 보고서에 file:line 기록, 사용자 승인 후 진행 권장
- PRD Phase 2 상점 고도화(/shop 탭·복전/복 2통화 UI·스타터팩): 미착수
- Gemini cachedContent(Sprint 1.5): 미착수

---

## 1. Toca Boca World 리서치 → 신당 번역

Toca Life World의 정체성은 "게임이 아니라 **디지털 장난감**"이다. 점수·타이머·미션·승패가 없고, 끌고 놓고 두드리는 **직접 조작**만으로 아이가 스스로 이야기를 만든다. 신당 2.0에 이식할 6원칙:

| #   | Toca 원칙                                                            | 신당 번역                                                                                               |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| T1  | **모든 것이 반응한다** — 탭하면 소리+애니메이션, 무엇이든 끌 수 있다 | 촛불 탭=점화/소등, 풍경 탭=댕그렁+흔들림, 향로 탭=연기, 족자 탭=펼침. 정적 오브젝트 금지                |
| T2  | **규칙 없음, 목표 없음**                                             | 꾸미기에 정답·점수 없음. 기운 게이지는 "상태"이지 "퀘스트"가 아님 — 채우라고 강요하는 UI 금지           |
| T3  | **조합 서프라이즈** — 아이템을 겹치면 숨은 반응                      | 향+촛불 근접=연기 소용돌이, 수반+꽃=꽃잎 띄움, 같은 오행 3개 인접=공명 글로우. 문서화 안 된 발견의 기쁨 |
| T4  | **캐릭터는 살아있다** — 아이템을 캐릭터에게 건넬 수 있다             | 신당지기에게 공물을 드래그하면 받고 반응(애니메이션+한마디). 탭하면 인사, 오래 방치하면 졸음            |
| T5  | **사운드가 절반이다** — 모든 터치에 오디오 피드백                    | 국악 사운드 팔레트: 목탁·풍경·종·바라·낙수. 테마별 앰비언트 루프                                        |
| T6  | **약간의 엉뚱함** — 완벽하지 않은 유쾌함                             | 두드리면 가끔 재채기하는 신당지기, 10번 연타하면 삐지는 촛불 등 이스터에그 3개 이상                     |

수익 구조도 Toca와 동형: 위치 팩(=테마 팩) 판매 + 무료 기본 공간. **광고 없음** 유지.

---

## 2. 기술 스택 결정 (확정)

### 2.1 렌더러: DOM 스프라이트 + Canvas 이펙트 오버레이 (PixiJS 채택 안 함)

| 후보                                      | 판정 | 근거                                                                                                                                                    |
| ----------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PixiJS(WebGL)                             | ❌   | +450KB 번들, SSR 우회 필요, 기존 스택과 이질적. 아이템 ≤25개 씬에 과잉                                                                                  |
| **DOM + Framer Motion + Canvas 오버레이** | ✅   | 이미 78개 파일에서 framer-motion 사용 중. 스프라이트는 `<img>`/`<div>` + transform(GPU 합성), 파티클·연기만 단일 `<canvas>`. 25개 스프라이트 60fps 충분 |

**규칙**: 스프라이트 이동은 반드시 `transform: translate()` (top/left 애니메이션 금지 — 리플로 방지). 드래그는 Pointer Events + `setPointerCapture`. 씬 루트에 `touch-action: none`.

### 2.2 사운드: Web Audio API 단일 컨텍스트 + 오디오 스프라이트

- `AudioContext` 1개, 첫 사용자 제스처에서 `resume()` (모바일 autoplay 정책)
- 효과음은 **단일 오디오 스프라이트**(1파일 + JSON 타임맵) — HTTP 요청 1회, 지연 0
- 앰비언트는 테마별 별도 파일, 크로스페이드 2s 루프, 기본 OFF(토글 저장)
- `prefers-reduced-motion` 사용자는 파티클 감소, 사운드는 독립 토글

### 2.3 물리: 물리엔진 없음 — "손맛 스프링"만

matter.js 불필요. Toca 손맛의 실체는 (a) 드래그 중 `scale(1.06)`+그림자 확대, (b) 놓을 때 스프링 정착(framer-motion `type:'spring', stiffness:400, damping:26`), (c) 매달림 아이템의 진자 흔들림(CSS `rotate` 감쇠 keyframes)이다. 이 3개면 충분.

---

## 3. 씬 아키텍처

### 3.1 컴포넌트 트리 (신규 파일)

```
components/shrine/scene/
├── ShrineScene.tsx        # 씬 루트. 좌표계·테마 CSS 변수·모드(view|edit) 컨텍스트 제공
├── SceneLayers.tsx        # wall/floor/altar 배경 레이어 (테마 assets 렌더)
├── SpriteItem.tsx         # 아이템 1개: 상태 렌더 + 탭/드래그 핸들러 + 스프링
├── KeeperSprite.tsx       # 신당지기: idle 루프, 탭/수신 반응, 말풍선 앵커
├── EffectsCanvas.tsx      # 단일 canvas: 파티클·연기·꽃잎·공명 글로우 (rAF 루프)
├── InventoryTray.tsx      # 꾸미기 모드 보관함 (기존 목업 스펙)
├── useSceneAudio.ts       # AudioContext 싱글턴 + play(spriteKey) + 앰비언트 크로스페이드
├── useDragPlace.ts        # 드래그 로직: 존 클램프 + 스냅 + 낙하 스프링 + 콤보 판정 호출
└── interactions.ts        # ★ 인터랙션 엔진 (아래 §4) — 순수 함수, 단위테스트 대상
```

### 3.2 좌표계 (PRD §3 계승)

- 씬 내 위치는 **무대 % (x: 0-100, y: 0-100)**. 렌더 시 px 변환
- 존: `hanging(y 2-20)` `wall(y 21-44)` `altar(x 20-80, y 40-56)` `floor(y 62-92)`
- floor는 `z-index = 10 + round(y)` 자동 (앞 물건이 가림)
- 씬 크기: 부모 폭 100%, 종횡비 `--scene-ratio: 375/300` 고정 — 좌표 재현성 보장

---

## 4. 인터랙션 엔진 (핵심 — `interactions.ts`)

### 4.1 아이템 행동 정의: 카탈로그 JSONB

아이템 행동은 코드 하드코딩이 아니라 **카탈로그 데이터**다. 아이템 추가 = DB INSERT.

```sql
ALTER TABLE shrine_item_catalog ADD COLUMN behavior JSONB NOT NULL DEFAULT '{}';
```

```typescript
// lib/domain/shrine/behavior.ts — 타입 정의 (zod 스키마 병행)
export interface ItemBehavior {
  /** 탭 시 상태 순환: states 배열을 순서대로 토글 */
  states?: ItemState[] // 예: [{key:'unlit'},{key:'lit', effect:'flame', loopSound:'crackle'}]
  /** 탭 반응 (상태 없는 아이템): 1회성 효과 */
  onTap?: { effect?: EffectKey; sound?: SoundKey; animation?: 'swing' | 'bounce' | 'shake' | 'unroll' }
  /** 신당지기에게 드래그 시 */
  giveToKeeper?: { keeperReaction: 'eat' | 'bow' | 'bless' | 'sniff'; consumed?: boolean; sound?: SoundKey }
  /** 근접 콤보 (§4.3) */
  combos?: Array<{ withType: string; radiusPct: number; effect: EffectKey; sound?: SoundKey; once?: boolean }>
}
export interface ItemState {
  key: string
  spriteSuffix?: string
  effect?: EffectKey
  loopSound?: SoundKey
}
export type EffectKey = 'flame' | 'smoke' | 'petals' | 'ripple' | 'sparkle' | 'resonance'
export type SoundKey = 'moktak' | 'pungyeong' | 'bell' | 'bara' | 'water' | 'crackle' | 'chime' | 'whoosh'
```

### 4.2 상태 저장

```sql
ALTER TABLE shrine_placements ADD COLUMN state JSONB NOT NULL DEFAULT '{}';
-- 예: {"stateKey":"lit"} — 방문자도 켜진 촛불을 본다 (연출 일관성)
```

- 탭 토글은 Optimistic UI → `updatePlacementState` 서버 액션 debounce 500ms 저장
- 방문자(비소유자)도 탭 반응은 **로컬로** 즐길 수 있으나 저장은 소유자만 (RLS)

### 4.3 콤보(서프라이즈) 판정 — 순수 함수

```typescript
// interactions.ts
export function detectCombos(placements: PlacedItem[], catalog: Map<string, ItemBehavior>): ComboHit[]
// 규칙: 아이템 배치/이동 완료 시 1회 호출. 거리 = % 좌표 유클리드.
// 같은 콤보는 세션당 1회만 발화(once) → localStorage 키 `combo_seen_{comboId}`
```

런칭 콤보 5종 (카탈로그 시드에 포함):

| 조합                        | 반응                                                                |
| --------------------------- | ------------------------------------------------------------------- |
| 향로 옆 촛불(lit)           | 연기가 소용돌이로 변함 + `whoosh`                                   |
| 수반 옆 꽃                  | 수면에 꽃잎 3장 낙하 루프                                           |
| 같은 오행 3개가 반경 25% 내 | **오행 공명**: 해당 색 글로우 링 + `bara` — 기운 게이지에 +5 보너스 |
| 풍경 2개 인접               | 화음 `chime` (단음이 화음으로)                                      |
| 등불(lit) + 밤 테마         | 벽에 그림자 일렁임 이펙트                                           |

### 4.4 신당지기 반응 (T4)

```typescript
// KeeperSprite 수신 판정: 드래그 종료 좌표가 keeper 반경 12% 내 && behavior.giveToKeeper 존재
// → 키퍼 반응 애니메이션 + 로컬 대사 1줄 (사전 정의 풀에서 아이템 타입별 랜덤)
// → 백그라운드로 shrine-chat 파이프라인에 이벤트 기록 (다음 대화에서 "아까 주신 청주는 잘 받았소" 회상)
```

- **AI 호출 금지 지점**: 즉각 반응 대사는 **사전 정의 문자열 풀**(타입×3개, `keeper-lines.ts`)에서. AI(FLASH)는 백그라운드 기억 기록만 — 반응 지연 0ms 유지 (ZERO-LATENCY)
- idle 행동 루프: 45~90s 랜덤 간격으로 눈 깜빡임/목탁 1회/졸기 (setTimeout 체인, 탭 시 리셋)
- 이스터에그(T6): 키퍼 5연타 → 재채기 + "어허, 간지럽소". 촛불 10연타 → 스스로 꺼지고 3s 파업

---

## 5. 사운드 설계 (T5)

### 5.1 에셋 스펙 (발주 목록)

| 키              | 소리             | 길이           | 용도                                                          |
| --------------- | ---------------- | -------------- | ------------------------------------------------------------- |
| moktak          | 목탁 단타        | 0.4s           | 기본 탭                                                       |
| pungyeong       | 풍경 댕그렁      | 1.2s           | 풍경류                                                        |
| bell / bara     | 종 / 바라        | 1.5s           | 공명·축복                                                     |
| water / crackle | 낙수 / 촛불 지직 | 0.8s / loop 2s | 수반 / 점화                                                   |
| chime / whoosh  | 화음 / 바람      | 1.0s / 0.6s    | 콤보                                                          |
| ambient\_{pack} | 테마 앰비언트    | 40s loop       | 팩별 1개 (초가=풀벌레, 반가=가야금, 용궁=물속, 도깨비=밤바람) |

- 포맷: 효과음 = 오디오 스프라이트 1개 (`/sounds/shrine-fx.webm` + `shrine-fx.json` 타임맵, 총 ≤120KB)
- 앰비언트: webm/opus 64kbps, 팩당 ≤300KB, **lazy load** (팩 활성화 시)

### 5.2 재생 규칙

```typescript
// useSceneAudio.ts
// - 싱글턴 AudioContext. 첫 pointerdown에서 resume()
// - 동일 사운드 동시 재생 상한 2 (연타 방어), 전체 게인 -6dB
// - 음소거 토글: localStorage 'shrine_muted' + 헤더 아이콘. 기본: 효과음 ON, 앰비언트 OFF
```

---

## 6. 이펙트 캔버스 (`EffectsCanvas.tsx`)

- 단일 `<canvas>`가 씬 위에 절대배치 (pointer-events: none), DPR 대응
- 파티클 시스템: 오브젝트 풀 200개 고정 (GC 방지), rAF 루프는 **활성 파티클 있을 때만** 구동
- 이펙트 구현: `flame`(4-6 입자 상승), `smoke`(베지어 상승+확산), `petals`(낙하+좌우 흔들), `ripple`(원형 확산), `sparkle`(방사), `resonance`(글로우 링 1.2s)
- `prefers-reduced-motion`: 입자 수 30%로 감소, 루프 이펙트는 정적 글로우로 대체

---

## 7. DB 마이그레이션 (통합 — `20260712_shrine_toca.sql`)

```sql
-- PRD §3 스키마 + 본 문서 추가분을 하나로
CREATE TABLE shrine_theme_packs (...);            -- PRD 3b.1 그대로
CREATE TABLE user_theme_packs (...);
CREATE TABLE user_shrine_inventory (...);          -- PRD 3.2 그대로
CREATE TABLE shrine_placements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shrine_id UUID REFERENCES shrines(id) ON DELETE CASCADE NOT NULL,
  catalog_item_id UUID REFERENCES shrine_item_catalog(id) NOT NULL,
  layer TEXT NOT NULL CHECK (layer IN ('wall','hanging','altar','floor')),
  x NUMERIC(5,2) NOT NULL CHECK (x BETWEEN 0 AND 100),
  y NUMERIC(5,2) NOT NULL CHECK (y BETWEEN 0 AND 100),
  flip BOOLEAN DEFAULT FALSE,
  state JSONB NOT NULL DEFAULT '{}',
  placed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE shrine_item_catalog
  ADD COLUMN element TEXT CHECK (element IN ('wood','fire','earth','metal','water') OR element IS NULL),
  ADD COLUMN energy_power INT DEFAULT 10,
  ADD COLUMN placement_layer TEXT NOT NULL DEFAULT 'floor',
  ADD COLUMN sprite_url TEXT,
  ADD COLUMN size_grade TEXT DEFAULT 'md',
  ADD COLUMN behavior JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN pack_id UUID;
-- 기존 shrine_items → placements 1회 마이그레이션 (slot_index → 존 기본좌표 매핑 함수 포함)
-- RLS: placements SELECT=신당 visibility 따름 / CUD=소유자. inventory/theme=본인만
```

카탈로그 시드 20종: 오행×4레이어 커버리지 + behavior/콤보 포함 (마이그레이션에 INSERT 동봉).

---

## 8. 서버 액션 (신규/수정)

```
app/actions/shrine/
├── placements.ts   # savePlacements(일괄 upsert+delete), updatePlacementState(debounced)
├── inventory.ts    # getInventory, purchaseToInventory(복전/복 차감→qty+1, §PRD 6 상점 연동)
├── theme-packs.ts  # listPacks, purchasePack, activatePack
└── shrine.ts       # (기존) getMyShrine 확장: placements+inventory+pack 병렬 로드 1 RTT
```

- `savePlacements`: 트랜잭션 — 인벤토리 수량 검증(배치 수 ≤ 보유 qty) 후 반영. 실패 시 전체 롤백
- 기운 재계산: placements 변경 시 서버에서 `user_energy_profile.item_bonus` 갱신 (콤보 공명 +5 포함)

---

## 9. 성능 예산 (수용 기준)

| 항목                            | 예산                                      |
| ------------------------------- | ----------------------------------------- |
| 씬 최초 페인트 (에셋 캐시 후)   | < 400ms                                   |
| 드래그 프레임                   | 60fps (mid-range Android 기준 55fps+)     |
| 스프라이트 에셋                 | WebP, 개당 ≤ 12KB, 전체 초기 로드 ≤ 250KB |
| 효과음 스프라이트               | ≤ 120KB, 최초 탭 지연 < 50ms              |
| 번들 증가                       | 신규 라이브러리 0 (framer-motion 재사용)  |
| Lighthouse 모바일 (신당 페이지) | Performance ≥ 80 유지                     |

---

## 10. 구현 순서 (Opus 4.8 지시)

```
Step 1. 마이그레이션 20260712_shrine_toca.sql (MCP apply_migration, project plzvanxcxjkaazcfrtls)
        + behavior.ts 타입/zod + keeper-lines.ts 대사 풀
Step 2. ShrineScene/SceneLayers/SpriteItem — 정적 렌더 (placements 표시, 테마 CSS 변수)
Step 3. useDragPlace + InventoryTray + savePlacements — 꾸미기 모드 완성
Step 4. interactions.ts (탭 상태머신 + 콤보 판정, 단위테스트 필수: detectCombos 6케이스)
Step 5. useSceneAudio + EffectsCanvas — 사운드/파티클 (에셋 없으면 무음·단색 폴백으로 먼저)
Step 6. KeeperSprite — idle 루프 + 수신 반응 + 이스터에그 + 기억 기록 연동
Step 7. 기운 게이지 연동 (energy_profile 재계산) + GA4 이벤트
        (shrine_tap, shrine_combo, keeper_give, pack_activate, placement_save)
Step 8. E2E: 꾸미기 저장/복원, 방문자 뷰, 음소거 영속성
```

**공통 제약**: any 금지(unknown+가드), logger, RLS, Optimistic UI, 이모지 폴백(스프라이트 미도착 시 `sprite_url` null → 이모지 렌더 — 에셋과 개발 병행 가능).

## 11. 리스크

1. **에셋 지연** → 이모지 폴백으로 전 기능 개발 가능하게 설계했으므로 런칭만 에셋에 종속
2. **iOS 오디오 정책** → 첫 제스처 resume 패턴 필수, Safari 실기기 테스트 항목에 포함
3. **저사양 60fps** → 파티클 풀 상한+rAF 조건부 구동으로 방어, Moto G급 실측 1회

---

### 참고 자료 (Toca 리서치)

- [Toca Boca World — App Store](https://apps.apple.com/us/app/toca-boca-world-game-play/id1208138685)
- [The design process behind Toca Boca's apps — Motionographer](https://motionographer.com/2016/04/27/the-design-process-behind-toca-bocas-infectious-apps/)
- [Toca Boca's playful philosophy](https://www.oreateai.com/blog/beyond-the-screen-the-playful-philosophy-behind-toca-bocas-digital-worlds/b2eaded0f82f60589f6b8df09450a5ce)
- [Toca Life World gameplay guide](https://tocaapk.com/toca-life-world-gameplay/)
