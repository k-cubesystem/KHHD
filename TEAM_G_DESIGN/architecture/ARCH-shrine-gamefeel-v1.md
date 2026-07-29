# ARCH-shrine-gamefeel: 신당 게임필 개선 — 시스템 아키텍처

버전: v1.0 | 작성: TEAM_G (ARCHITECT) | 날짜: 2026-07-29
대응 PRD: `TEAM_G_DESIGN/prd/PRD-shrine-gamefeel-v1.md` (안1~5, 차수별 테스트)

---

## 1. 아키텍처 개요 — 렌더 스택 결정

### 결정: DOM+CSS transform 확장 (안1~4 공통) · 신규 엔진 도입 반려

| 후보                                | 판정     | 근거                                                                                                                                                               |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **DOM+CSS+기존 EffectsCanvas 확장** | **채택** | 회귀 0 원칙. v2 무대 물리(`lib/domain/shrine/stage.ts` 순수 함수군)·촛불 저장·앵커가 전부 이 스택 위에 있음. 카메라·시차·idle은 transform/opacity만으로 60fps 가능 |
| PixiJS 캔버스 통합 렌더             | 반려     | 전면 재작성 = 배치·편집·저장·효험 전부 재검증. **고DPR 캔버스 흰화면 사고 전례**(EffectsCanvas 2^25px 폭주) — 캔버스 표면적을 늘리는 방향 자체가 리스크            |
| react-three-fiber (3D)              | 보류     | 안5 전용. 번들 +150KB↑, 중저가 GPU, 2D 좌표계 비호환. 안1~3 검수 후 별도 스파이크로만                                                                              |

### 새 렌더 스택 (뒤→앞) — v2 스택에 카메라·시간·주민 층을 삽입

```
<room>  (뷰포트 100%, overflow-x: clip ← hidden 금지·흰화면 전례와 무관한 X축만)
 └─ <CameraRig>  world 폭 W%(단일 100 / 두루마리 240) · translate3d(-camX·factor)
     ├─ [원경 0.3x]   하늘·담장 실루엣 (안2 신규, 시차 최소층)
     ├─ [무대 1.0x]   L0 벽지 → L1 바닥재 → L2 구조물   ← 기존 StageLayers 그대로
     │                 L3 신위 스탠드(+호흡 idle) · 가족 좌석(안3)
     │                 L4 소품(기존 depthScale/depthZ/groundShadow 유지 + idle 클래스)
     ├─ [전경 1.15x]  전경 소품·문틀 실루엣 (안2 신규)
     ├─ L5 조명       lightingOverlayStyle(SceneClock 보간 결과) ← 기존 함수 재사용
     └─ L6 EffectsCanvas (파티클·불꽃, DPR 클램프 유지 — 캔버스는 이 1장뿐 불변)
 └─ <CinematicPlayer>  입장·기도 연출 타임라인 (UI 페이드·카메라 명령 발행)
 └─ HUD (헤더·스트립·가이드바 — 카메라 밖 고정)
```

핵심: **카메라는 wrapper 1개 + CSS 변수(`--cam-x`) 전파.** 레이어별 시차는
`transform: translate3d(calc(var(--cam-x) * -0.3), 0, 0)` 식 — JS는 변수 1개만
갱신하므로 리플로우 0, 컴포지터 전용.

## 2. 컴포넌트 설계 (신규 4 + 확장 3)

| 컴포넌트                | 책임 (SRP)                                                                                                                      | 안   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `CameraRig`             | world 좌표계·팬 상태·관성·구역 스냅·`--cam-x` 발행. 명령 API: `panTo(zone)`, `pushIn(x,y,scale,ms)`, `shake(px)`                | 1·2  |
| `SceneClock`            | KST 시각 → 광원 프리셋 보간(`StageLight` 산출), idle 페이즈 시드 발행. 순수 도메인 `lib/domain/shrine/scene-clock.ts` + 얇은 훅 | 1    |
| `CinematicPlayer`       | 선언적 타임라인 `[{at, do}]` 재생(입장·기도·합동기도). 스킵 탭·reduced-motion 생략 경로 내장                                    | 1·3  |
| `FamilyHall`            | 가족 presence → 방석·등불·착석 아바타 렌더, 입장 큐 재생, 아바타 탭 말풍선                                                      | 3    |
| `StageLayers` 확장      | zones[] 렌더(구역별 벽지/바닥/구조물), 기존 단일·레거시 분기 유지                                                               | 2    |
| `ShrineRoomClient` 확장 | 위 컴포넌트 조립·기존 상태 유지. **비대 방지**: 연출·카메라 로직은 전부 신규 컴포넌트/훅으로, 여긴 배선만                       | 공통 |
| `EffectsCanvas` 확장    | 상시 이미터(향 연기 loop) 등록 API 1개 추가. 캔버스 규격·DPR 클램프 불변                                                        | 1    |

idle 모션은 **JS 아닌 CSS keyframes**가 기본(`@keyframes sway/flicker/breathe` +
아이템 behavior별 클래스 부여). `prefers-reduced-motion`에서 CSS가 통째로 꺼진다.
rAF 상주 루프는 CameraRig 관성 중에만 한시 가동.

## 3. 데이터 모델 (전부 추가만 — 기존 행 무영향, v2 원칙 승계)

| 대상                       | 변경                                                                                                                                                                                        | 안  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `shrine_theme_packs.stage` | jsonb 확장: `width?`(기본 100), `zones?: [{code, x0, x1, wallpaperUrl, flooringUrl, structures[]}]`, `lightByHour?: {dawn,day,dusk,night: StageLight}`                                      | 1·2 |
| `shrine_placements`        | `zone text NULL` (NULL = 'daecheong' 해석)                                                                                                                                                  | 2   |
| `shrine_catalog`           | (안4만) `art_line text NOT NULL DEFAULT 'seolbit'` — 'seolbit' \| 'dot'. 도트 라인 품목 분리                                                                                                | 4   |
| 가족 presence              | 신규 RPC `get_family_hall_presence(family_id)` — 멤버별 {member_id, avatar_key, prayed_today(KST), last_seen}. **SECURITY DEFINER + 가족 스코프 검증** (wallets RPC 교훈: 직접 select 금지) | 3   |

- **좌표 무손실 원칙**: 기존 x(0~100)는 "대청 구역 로컬 %"로 재해석.
  `worldX = zone.x0 + x × (zone.x1 - zone.x0) / 100`. zones 없는 테마는 항등 변환.
  마이그레이션 UPDATE 0건 — 렌더 해석만 바뀐다.
- `lightByHour` 없는 테마는 기존 `light` 단일값 그대로 (SceneClock이 항등 통과).

## 4. 제스처 설계 — 팬 · 페이지 스크롤 · 편집 드래그의 3자 충돌 해소

현행: 보기 `touchAction: pan-y`(세로 스크롤 허용) / 편집 `none`(드래그 전용).

| 모드 | 가로 제스처                            | 세로 제스처      | 아이템             |
| ---- | -------------------------------------- | ---------------- | ------------------ |
| 보기 | **카메라 팬** (CameraRig)              | 페이지 스크롤    | 탭만 (기존)        |
| 편집 | 빈 곳 시작 → 팬 / 아이템 시작 → 드래그 | 차단 (기존 유지) | 드래그 배치 (기존) |

- 판정: pointerdown 후 8px 이동 시 각도 1회 판정 — `|dx| > |dy| × 1.2` → 팬 캡처
  (`touchAction: pan-y` 유지 상태에서 X만 JS 처리, 세로는 브라우저 네이티브).
- 편집 중 아이템 위 pointerdown은 즉시 드래그(기존 로직 우선) — 팬은 빈 무대에서만.
- 구역 스냅: 팬 종료 시 최근접 구역 중심으로 관성 감속 스냅(자유 정지 허용 오차 ±12%).
- 시네마틱 재생 중 입력은 "스킵 탭" 1종만 수신.

## 5. 성능 예산 & 저사양 폴백

- **컴포지터 전용 원칙**: 카메라·시차·idle 전부 transform/opacity만. layout 속성
  애니 금지 (lint 리뷰 게이트).
- `will-change: transform`은 CameraRig 직계 시차 레이어 3개에만. 남발 금지.
- 파티클 상한 유지 + 상시 이미터(연기)는 동시 3개 상한.
- 폴백 게이트 (`lib/domain/shrine/perf-gate.ts` 신설): `deviceMemory < 4` 또는
  최근 2초 프레임 평균 < 45fps → 시차 끔·파티클 반감·시네마틱 축약. Sentry breadcrumb.
- 이미지: 구역별 벽지 512w 유지, 뷰포트 밖 구역 `loading="lazy"` + `content-visibility: auto`.
- **검증은 프로덕션 빌드(3001)+실기기 DPR3** — dev CSS 불일치·헤드리스 rAF 사망 전례.

## 6. 마이그레이션 · 호환 (회귀 0 매트릭스)

| 기존 자산                     | 안1 이후                      | 안2 이후                           | 안3 이후            |
| ----------------------------- | ----------------------------- | ---------------------------------- | ------------------- |
| 레거시 테마(stage NULL) 7종   | 연출층만 얹힘(코드 공통층)    | 단일 화면 유지(zones 없음 → W=100) | 영향 없음           |
| 반가 stage 테마               | 동일                          | zones 부여 시 두루마리 개방        | 후원에 사랑방 슬롯  |
| 기존 배치 34건+               | 무변경                        | zone NULL=대청 해석, UPDATE 0건    | 무변경              |
| 촛불 lit·앵커·효험·편집 저장  | 계약 불변(도메인 함수 재사용) | 좌표 해석층만 통과                 | 불변                |
| 방문자 뷰 banga 폴백(bc852c7) | 유지                          | 유지(zones 없는 banga → 단일 화면) | 사랑방은 소유가족만 |

배포 전략도 v2와 동일: 테마 단위 세대교체, 원복 = stage jsonb 필드 NULL 한 줄.

## 7. 보안 · 프라이버시

- 사랑방 presence RPC: 호출자가 해당 가족 구성원인지 서버 검증(SECURITY DEFINER 내
  membership check). 방문자(비가족)에게는 사랑방 데이터 자체를 내리지 않는다.
- 가족 이름·아바타 노출은 기존 가족 신당 공개 confirm 플로우 연장 — 공개 신당이어도
  사랑방 구역은 가족 전용(방문자에겐 "닫힌 문" 연출).
- 신규 서버 액션 없음(안1·2) / 안3 RPC 1개 — 기존 rate-limit·Sentry 패턴 준수.
- 멤버십 게이팅: 사랑방 = FAMILY 전용(`lib/domain/subscription.ts` 단일 기준),
  마스터 무제한은 `lib/auth/privileges.ts` 경유 (신규 role 검사 금지).

## 8. 구현 로드맵 ↔ 검증 게이트 (PRD §4 차수 매핑)

| 차수 | 모듈                                                                   | 게이트(사용자 검수 전 자동 검증)                                |
| ---- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1차  | SceneClock + idle CSS + CinematicPlayer + 주스(스쿼시·햅틱·shake)      | jest(도메인 순수 함수)·tsc·build + prod 실기기 55fps + 회귀 e2e |
| 2차  | CameraRig + GestureRouter + stage.zones + 반가 두루마리 세트           | 기존 배치 좌표 스냅샷 diff 0 + 제스처 e2e + 55fps               |
| 3차  | presence RPC + FamilyHall + 합동 기도 연출                             | RLS 침투 테스트(비가족 접근 0) + SINGLE 업셀 씬 + e2e           |
| 병행 | 도트 파이프라인(`scripts/shrine-assets/pixelate.mjs`) + 반가 도트 시범 | 시범 1종 사용자 검수 통과 전 품목 확산 금지                     |

각 차수는 독립 배포 가능 단위 — NO-GO 시 해당 차수만 되돌린다(안1은 코드만이라
플래그 오프로 즉시 원복 가능하도록 연출 진입점을 단일 상수로 게이트).

## 9. 기술 부채 & 향후

- 안5(R3F) 진행 조건: 안1~3 KPI 달성 + 별도 성능 스파이크(중급 기기 1씬 55fps 실증) 통과 시에만.
- ZONES 상수 → stage 파생 이관(v2 계획 승계)은 2차에서 zones 도입과 함께 정리.
- 도트 라인 채택 시 아트 라인별 카탈로그 노출 필터(상점 UI) 후속.
