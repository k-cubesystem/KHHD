# ARCH-shrine-living-background: 「살아있는 신당」 배경 생동 — 시스템 아키텍처

버전: v1.0 | 작성: TEAM_G (ARCHITECT) | 날짜: 2026-08-09
대응 PRD: `TEAM_G_DESIGN/prd/PRD-shrine-living-background-v1.md` (L1~L5 / P1~P5)
전제 문서: ARCH-shrine-gamefeel-v1(렌더 스택·컴포지터 원칙) · PLAN-theme-stage-common-v2(살림/장소 2층 원칙)

---

## 1. 아키텍처 개요 — 결정 3줄

1. **렌더는 현행 스택 그대로** — DOM+정적 CSS+EffectsCanvas 1장. 신규 엔진·신규
   캔버스·신규 블렌드모드 0. 모든 상시 애니는 transform/opacity만(기존 규율 승계).
2. **앰비언트 스펙은 DB가 아니라 코드 상수** — `lib/domain/shrine/theme-ambient.ts`
   테마 16종 표 1벌. 근거: ①순수 연출·게임플레이 무영향이라 시드/마이그레이션이
   과설계 ②반려 시 **배포만으로 수정**(앰비언트 v1~v5 반려 전례 — 시드 재적용
   루프를 없앤다) ③stage jsonb(기하 계약)와 관심사 분리. 기하가 아니므로
   theme-stage-geometry.json 단일 출처 원칙과 충돌하지 않는다.
3. **시간의 진실은 계층별로** — 연출용 시각(L1 틴트·L2 달)은 클라 KST(SceneClock
   승계), **보상이 걸리는 판정(L4)은 전부 서버**. 클라 시계는 연출만 움직일 수
   있고 재화는 못 만든다.

## 2. 레이어 삽입 설계 — stageContent 페인트 순서 (정본: ShrineRoomClient :1380~)

현행 순서에 **형제 노드로만** 삽입한다(래퍼 금지 — Sprite 드래그가 parentElement
기준이라 중간 래퍼는 좌표 환산을 깬다, :1376-1378 주석).

```
 1  StageLayers ground (벽 62% + 바닥 40% 뮤럴)          ← 불변
 2  ★AmbientBackdrop  — 원경광·달·절기 소품·CSS 파티클    ← 신설 (z auto, 팻말 2 아래)
 2' AmbientVideo                                          ← 동결. ambient 스펙 보유 테마는 미렌더(은퇴 경로)
 3~12  암전 그라디언트 · 팻말 · 신위 · 구조물 · 선반장 ·
       EffectsCanvas(z11) · 신수(z12) · 아이템(z10~29)     ← 전부 불변
13  ★TimeTint — 기존 조명 오버레이(z29) 확장              ← soft-light 1장 유지 + 알파 틴트 2장 추가
14~ 앵커 링 · UI(z30) · 시네마틱(z40)                     ← 불변
```

- **AmbientBackdrop(원경층)**: 뮤럴 바로 위·모든 살림 아래. 눈·불티처럼 "방 안을
  떠다니는" 밀도 파티클은 여기가 아니라 **기존 EffectsCanvas(z11)** 에 그린다
  (아이템 16~28보다 뒤 = 현행 꽃잎과 동일 문법, z 재설계 불필요).
- **TimeTint(전면층)**: 조명 오버레이가 이미 "아래 전부를 물들이는" 자리(z29)다.
  같은 자리에 위상 틴트 2장(algebra: 이전 위상·다음 위상)을 **일반 알파**로 겹치고
  opacity 크로스페이드. 신규 mix-blend-mode 금지(대면적 블렌드 실측 사고 사례).
  밤에 더 빛나야 하는 점등 아이템 글로우는 z29 **위**(z30 미만) 소면적 스프라이트로
  스태킹 — filter 애니 금지 규율 유지(뒤에 깐 span opacity 문법, shrine-scene.css
  :1750 주석 방식).
- 모든 신설 층은 `pointer-events: none`(복 조각 수집물만 예외 — 편집 모드에선
  비활성, touchAction 게이트 :1621 준수). 존·앵커·배치 계약 무접촉.

## 3. 컴포넌트 설계 (신규 4 + 확장 3)

| 컴포넌트/모듈                        | 책임 (SRP)                                                                                                                                                                                           | Phase |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `AmbientBackdrop`                    | 테마 ambient 스펙 → 원경광 그라디언트 div·CSS 파티클 div(≤티어 상한)·절기 소품 `<img>`·달 렌더. 표시만, 상태 없음                                                                                    | P1~3  |
| `TimeTint`                           | SceneClock 위상 → 틴트 2장 opacity 산출·전환(60s tick 승계). `tintProfile` 반영(밤 원판 테마 진폭 0)                                                                                                 | P1    |
| `lib/domain/shrine/theme-ambient.ts` | **순수 상수+함수**: 16테마 스펙 표(원경광·파티클·글로우·tintProfile·moonVisible), `ambientForTier(spec, tier)` 클램프, `tintOpacities(phase, profile)`                                               | P1~2  |
| `lib/domain/shrine/lunar.ts`         | 음력 일→달 위상(0~1)·보름 판정. **기존 만세력 도메인 재사용**(음력 변환 실재 확인 후 어댑터만; 부재 시 합삭 주기 29.530588일 근사 — 표시용 정밀도 충분). Date 주입식(결정론, `Date.now()` 금지 규율) | P3    |
| `lib/domain/shrine/seasonal.ts`      | 5대 절기 달력(설·대보름·단오·추석·동지, KST 시작/종료) → 활성 절기·소품 세트 키                                                                                                                      | P3    |
| `EffectsCanvas` 확장                 | `EffectKind`에 `snow`·`ember`·`bubble`·`leaf` 추가 — `COLORS`(:77-86)와 `spawn()` 물리 분기(:150-195) 두 곳만. 캔버스 규격·DPR 클램프·풀 160·z11 불변                                                | P2    |
| `GuardianWalkers` 확장               | 배치물 근접 시 멈춤·응시(`animation-play-state` + 방향 고정) — 신수×신물 전용 반응 소수                                                                                                              | P4    |

CSS: `app/shrine-scene.css`에 신규 구역 1개(앰비언트 — 파티클 keyframes·글로우
맥동·틴트 전환). **상시 클래스 3곳 등록 규율 준수**: ①shrine-scene.css
②`scripts/check-animation-css.mjs` REQUIRED_CLASSES/KEYFRAMES ③`anim-audit.ts`
SHRINE_ANIM_CLASSES. 파티클 위상차는 좌표 파생 결정론(`Math.random` 금지, 하이드레이션 방어 승계).

## 4. 데이터 모델

### 클라 (DB 변경 0 — P1~P3)

```ts
// lib/domain/shrine/theme-ambient.ts (발췌 스키마)
type ThemeAmbient = {
  backdrop?: { kind: 'rays' | 'haze' | 'glow-band'; hue: string; area: Rect }[]
  particles?: {
    kind: 'mote' | 'firefly' | 'snow' | 'ember' | 'bubble' | 'leaf' | 'petal' | 'drip' | 'steam-sprite'
    engine: 'css' | 'canvas' | 'sprite'
    count: [low, mid, high]
    area: Rect
  }[]
  glows?: { x: number; y: number; r: number; hue: string; pulseMs: number }[]
  tintProfile: { base: 'day' | 'dusk' | 'night' | null; amp: number } // 달집·별밭 = night, amp 축소
  moon?: { x: number; y: number; w: number } | null // 달 보이는 테마만
  seasonalSlots?: { x: number; y: number; w: number }[] // 절기 소품 자리(배치 존과 비겹침 상수)
}
```

### 서버 (P4만 — 전부 추가, 기존 행 무영향)

| 대상                          | 변경                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `shrine_night_events`         | 신설: `{event_date(KST), kind('full_moon'\|'lucky'), seed}` — 영험한 밤 여부의 **서버 정본**(cron 또는 date-hash 결정론 함수)      |
| `shrine_night_wishes`         | 신설: `{user_id, event_date, wish_count, harvested_at}` — UNIQUE(user_id, event_date) 멱등                                         |
| RPC `make_night_wish()`       | SECURITY DEFINER. 서버가 ①오늘이 영험한 밤인지 ②현재 KST 21~04시인지 ③상한(N회) 판정 후 기록                                       |
| RPC `harvest_bok_fragments()` | SECURITY DEFINER. 익일 06시 이후 1회(멱등), 보상 지급은 **기존 지갑/복점 RPC 경유**(자가발행 금지 — wallets 규율, WITH CHECK 교훈) |
| 신위 서신                     | 테이블 신설 대신 기존 기억함/선문안 저장 규약 연장 검토(구현 시 확정). 생성은 결정론 템플릿+당일 1통, **무차감**                   |

배포 순서: 마이그레이션 → 코드(읽기 폴백 有) — 가족 좌석(hall_seats) 전례 승계.

## 5. 데이터 흐름 (유스케이스 2건)

```
[진입~상시]  SceneClock(60s) ─ phase ─→ TimeTint(opacity 2값)      ← 리플로우 0, 페인트는 위상 전환 시만
             theme-ambient.ts ─ spec×tier ─→ AmbientBackdrop(정적 DOM+CSS 애니) / EffectsCanvas(이미터 등록)
             lunar.ts(자정 1회) ─→ 달 위상 마스크·보름 조명 부스트
[영험한 밤]  진입 → 서버 조회(오늘 밤 여부) → 연출 발화 → 탭 소원 → make_night_wish
             익일 진입 → harvest 가능 여부 조회 → 복 조각 렌더(바닥, 비배치 층) → 탭 → harvest_bok_fragments → 지갑 반영 + GA4
```

## 6. 성능 예산 & 가드 (조사 실측 근거 반영)

| 가드           | 기준                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 성능 티어      | `perf-gate.ts` 확장: `low`(deviceMemory<4 ∨ hwConcurrency≤4 ∨ 실측<45fps) / `mid` / `high`. 기존 `lite`는 low로 흡수                      |
| CSS 파티클     | low ≤10 · mid ≤30 · high ≤50 (근거: CSS 100개부터 저하 — J.Imaging 2026-01, 실무 30~50 안전선)                                            |
| 캔버스 파티클  | low ≤30 · mid ≤100 · high ≤160(풀 상한). 이미터 동시 수 상한 유지(연기 3)                                                                 |
| 전면 오버레이  | 상시 승격 레이어 **최대 2장**(틴트 2) — @DPR3 전면 1장 ≈12MB 레이어 메모리 근거. 위상 전환 완료 후 비활성 장 opacity 0 + will-change 해제 |
| blur / blend   | 신규 blur 상시 금지(소면적 10px 이하만) · 신규 blend-mode 금지 · box-shadow 직접 애니 금지(사전 렌더+opacity)                             |
| 스프라이트시트 | steps() ≤12fps · WebP 시트 한 변 ≤2048px · 테마당 앰비언트 자산 ≤150KB                                                                    |
| 백그라운드     | Page Visibility hidden → 루트 클래스로 `animation-play-state: paused` 일괄 + 캔버스 rAF 중단(기존 auto-stop 활용) + BGM 정지              |
| reduced-motion | 파티클·시차·flicker·달무리 맥동 전부 정지, 틴트는 **현재 위상 정적 유지**(끄지 않는다 — "완성된 그림" 원칙)                               |
| 검증           | 프로덕션 빌드(3001)+실기기 DPR3 + `check-animation-css.mjs` + anim-audit 배지 + Lighthouse non-composited 0건                             |

## 7. 보안 (P4 — TEAM_H 게이트 대상 요약)

- **시간을 믿지 않는다**: 영험한 밤 여부·밤 시간대·수확 가능 시각 전부 서버 판정.
  클라는 연출만 담당(연출이 어긋나도 재화 영향 0).
- **멱등·상한**: UNIQUE(user_id, event_date) + wish_count 상한 + harvested_at 단일
  기록. 재호출은 no-op 반환.
- **지급 경로 단일화**: 보상은 기존 지갑/복점 RPC 경유(SECURITY DEFINER 내부 검증).
  `shrines`/클라 쓰기 권한 신설 0 — guardians grant 금지 교훈 승계.
- 서신·발자국은 무보상 연출이라 위협면 없음(서버 생성·본인 스코프 RLS만).

## 8. 회귀 0 매트릭스 & 원복 레버

| 기존 계약                         | 이번 회차 영향                                                     |
| --------------------------------- | ------------------------------------------------------------------ |
| 뮤럴·시드·기하(45/50/55·y53.5)    | **무접촉**(파일·시드·좌표 변경 0)                                  |
| 배치·앵커·존·seat:·진열 스냅      | 무접촉 — 신설 층 전부 비배치·pointer-events:none                   |
| 기존 idle·신수 배회·의례 전환     | 무접촉(클래스 추가만). 3곳 등록 게이트가 누락을 잡음               |
| EffectsCanvas 규격·DPR 클램프     | 불변(EffectKind 추가만) — 흰화면 방어 계약 유지                    |
| 방문자 뷰·레거시 테마(stage NULL) | ambient 스펙 없는 테마 = 현행 그대로(스펙 옵셔널)                  |
| 낮 시간 화면                      | **픽셀 동일**(낮 틴트 amp 0) — 원화 검수 자산 보호를 테스트로 고정 |

원복 레버: `lib/config/gamefeel.ts`에 `AMBIENT_V1`(전체) · `NIGHT_EVENTS_V1`(P4)
플래그. 코드 상수 스펙이라 테마 단위 원복 = 표에서 해당 테마 스펙 제거 1줄.

## 9. 테스트 계획

- jest(도메인 순수): `tintOpacities` 위상 경계 보간 · `ambientForTier` 클램프 ·
  `lunar` 만세력 대조(알려진 보름 날짜 표본) · `seasonal` 절기 경계(KST 자정) ·
  낮 틴트 0 계약 · 스펙 표 16테마 완전성(테마 코드 모집단 대조 — themeElements와 diff 0)
- 게이트: check-animation-css 신규 클래스/keyframes · anim-audit 등록 · 자산 실재
  및 용량(≤150KB/테마) 스크립트
- e2e: reduced-motion 경로 · 밤 위상 스모크(시각 주입) · P4 멱등(중복 수확 시 no-op)
- 수동(프로덕션 실기기): 시범 3테마 낮/석양/밤 3컷 × 원화 대비 비교판(뮤럴 QA
  비교판 규율 승계) → CEO 검수

## 10. 구현 로드맵 ↔ 게이트 (PRD §5 매핑)

| Phase | 모듈                                                              | 게이트                                                |
| ----- | ----------------------------------------------------------------- | ----------------------------------------------------- |
| P1    | TimeTint + theme-ambient(tintProfile만) + 글로우 승격             | jest·CSS 게이트·prod 실기기 55fps·낮 픽셀 동일        |
| P2    | AmbientBackdrop + EffectsCanvas 4종 + 스펙 표 16 — **시범 3테마** | 시범 CEO 검수 GO → 확산. 티어 상한 동작 확인          |
| P3    | lunar + seasonal + 달·절기 렌더 + 절기 자산                       | 만세력 대조·절기 경계 테스트·추석(2026-09-25) 전 출하 |
| P4    | 서버 2테이블+2RPC + 연출 + 서신                                   | **TEAM_H 보안 게이트** + 멱등/시간위조 테스트         |
| P5    | 음원 파일 투입(코드 0)                                            | 용량·라이선스 검수(CREDITS.md 규약)                   |

## 11. 기술 부채 & 향후

- AmbientVideo 은퇴: P2 확산 후 ambient 스펙 보유 테마에서 미렌더 → 전 테마 확산
  시 컴포넌트 제거(원복 레버 보존 1릴리즈).
- BGM_ROOT 16테마 등록(P5와 동시 — 현 4종 외 12종은 choga 폴백 중).
- 신수 3좌+·실시간 날씨 연동·시차 자이로(iOS 권한 UX)는 본 회차 제외 — 후속 검토.
- 무대 뮤럴 preload 부재(두루마리 lazy로 첫 벽 지연 가능) — 본 회차와 별건이나
  P1 착수 시 `fetchpriority` 힌트 1줄 동반 검토(코드 탐색 §5 미가드 지점).
