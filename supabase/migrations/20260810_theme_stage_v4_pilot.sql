-- ============================================================================
-- 무대 기하 v4.1 「틀(壇)」 — 시범 3테마 (PLAN-stage-harmony-v1 추기 4~6)
--
-- CEO 지시(4차): "각각 멋있는 틀을 만들어 액자 있는 부분에 신위를 배치, 마루바닥은 줄이고,
-- 제단은 더 크고 웅장하게, 그 상 위에 아이템을 많이 놓을 수 있게."
-- CEO 지시(5차): "틀 사이즈를 더 크게 웅장하게 만들어주고 마루를 좀 줄여도 될 것 같아."
-- 단상(platform)+상판(altar-top) 2종 → 닫집·감실·제단이 한 장으로 붙은 **틀 1종**으로 교체한다.
--
-- 불변: 신위 접지 = stage.ts PODIUM_TOP_Y 45.3. 틀은 위(닫집 y≈3.5)·옆(w 44→60)·아래(접지 y≈73.5)로만
-- 커진다. 접지가 마루선(73)에 앉는다 — v4(접지 68 · 마루선 70)는 2%p 벽 속에 박혀 있었다.
--
-- 앵커는 v3 한 줄 3점(45/50/55 · y53.5) → **깊이 2열 5점**이다 (2026-08-10 정렬 패스 · 합성판 실측):
--   · 뒷줄 3점  x 45.7 / 50 / 54.3   · y 52.4   (id 는 v3 그대로 승계)
--   · 앞줄 2점  x 47.85 / 52.15      · y 55     (altar-front-left / altar-front-right)
-- 한 줄 5점을 그대로 구웠더니 틀 상판 실폭 밖으로 바깥 두 점이 떨어졌고, 안쪽에 다섯을 세우면
-- 아이템이 절반씩 겹쳤다. x 는 그 라운드 스프라이트의 **상판 실측 폭**에서 파생한다(v4.1: 세 테마
-- 최솟값 상판 70% × 틀 폭 60% → 세계 x43.4~56.6). 전부 ZONES.altar(x24~76 · y48~58) 안이다.
--
-- ⚠️ «저장된 배치 이동 0» 의 근거는 앵커 좌표가 아니라 **배치가 절대 좌표라는 것**이다 —
--    앵커는 «다음에 놓을 자리»만 정한다. 이미 놓인 신물은 앵커가 옮겨도 어제 자리에 그대로 있다.
--
-- ⚠️ 제단층 아이템 배율(0.88 → 0.54)과 신위 머리 여백(테마별 감실 윗턱)은 **렌더 상수**라
--    이 시드에 실리지 않는다 — lib/domain/shrine/stage.ts(depthScale · deityHeadRoomY)가 정본이다.
--
-- ⚠️ 이 파일은 **생성물**이다. 손으로 고치지 말 것:
--      node scripts/shrine-assets/build-theme-stage-seed.mjs
--    기하 정본  lib/domain/shrine/theme-stage-geometry.json (grandAltar 블록)
--    대조 게이트 lib/domain/shrine/__tests__/theme-stage.test.ts
--
-- ⚠️ 적용 전제 — 시범 테마마다 틀 스프라이트가 public/ 에 있어야 한다:
--      public/shrine/stage/<code>/grand-altar.webp
--    없으면 404 를 StageLayers onError 가 **조용히 숨겨** 살림 없는 빈 방이 된다(예외도 로그도 없다).
--    그래서 배포 순서는 «코드 → 틀 스프라이트 → 이 시드» 다.
--
-- ⚠️ 마루선 이동(벽 75% · 바닥 27% → 마루선 y73)은 **렌더 상수**라 이 시드에 실리지 않는다 —
--    StageLayers 가 theme-stage.ts STAGE_BANDS 를 읽는다. 시드만 적용하고 코드를 배포하지 않으면
--    틀만 커지고 마루는 그대로다(그 반대도 성립한다 — 두 배포는 서로를 기다리지 않는다).
--
-- 최상위 structures 는 건드리지 않는다 — 그 자리가 `stage - 'zones'` 원복 레버의 착지점이다.
--
-- 원복 — 한 테마를 v3(단상+상판)로 되돌리기: 20260807 시드의 그 테마 update 문을
--   `(stage -> 'zones') is null` 조건을 지운 채 한 번 실행한다(반가는 20260806b 를 다시 실행).
-- ============================================================================

-- banga — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-banga",
    "assetUrl": "/shrine/stage/banga/grand-altar.webp",
    "x": 50,
    "y": 38.5,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 52.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 52.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 52.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 55,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 55,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/banga/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/banga/room-floor-mural-v3.webp'::text))
where code = 'banga'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- daljip — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-daljip",
    "assetUrl": "/shrine/stage/daljip/grand-altar.webp",
    "x": 50,
    "y": 38.5,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 52.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 52.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 52.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 55,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 55,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/daljip/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/daljip/room-floor-mural-v3.webp'::text))
where code = 'daljip'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- seolbit — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-seolbit",
    "assetUrl": "/shrine/stage/seolbit/grand-altar.webp",
    "x": 50,
    "y": 38.5,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 52.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 52.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 52.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 55,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 55,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/seolbit/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/seolbit/room-floor-mural-v3.webp'::text))
where code = 'seolbit'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- 확인 쿼리
--   SELECT code,
--          jsonb_array_length(stage->'zones'->0->'structures')                  AS zone_structures,
--          stage->'zones'->0->'structures'->0->>'code'                          AS first_code,
--          stage->'zones'->0->'structures'->0->>'assetUrl'                      AS frame_asset,
--          jsonb_array_length(stage->'zones'->0->'structures'->0->'anchors')    AS anchors
--     FROM public.shrine_theme_packs WHERE code IN ('banga','daljip','seolbit') ORDER BY sort_order;
