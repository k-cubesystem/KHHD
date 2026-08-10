-- ============================================================================
-- 무대 기하 v5 「틀(壇) · 마루 1/3 접지」 — **16테마 전량** (PLAN-stage-harmony-v1 추기 4~8)
--
-- ⚠️ 파일명이 `_v4_pilot` 인 것은 이력 때문이다(시범 3테마로 태어났다). 내용은 이제 확산 전량이다 —
--    아직 어디에도 적용되지 않은 파일이라 이름을 바꾸는 대신 여기 적어 둔다. 열여섯 문장이 모두
--    같은 모양이고, 테마마다 갈리는 것은 **틀 스프라이트 경로와 뮤럴 두 장**뿐이다.
--
-- CEO 지시(4차): "각각 멋있는 틀을 만들어 액자 있는 부분에 신위를 배치, 마루바닥은 줄이고,
-- 제단은 더 크고 웅장하게, 그 상 위에 아이템을 많이 놓을 수 있게."
-- CEO 지시(5차): "틀 사이즈를 더 크게 웅장하게 만들어주고 마루를 좀 줄여도 될 것 같아."
-- CEO 지시(6차): "선반과 틀 같은 건 마루 3/1은 자리를 잡아야 해. 틀, 선반 위치는 이미지에 넣었어."
-- 단상(platform)+상판(altar-top) 2종 → 닫집·감실·제단이 한 장으로 붙은 **틀 1종**으로 교체한다.
--
-- ── 마루 1/3 접지 (v5 · 이 회차) ─────────────────────────────────────────────
-- v4.1 은 살림의 발끝을 **마루선 그 자체**(y73)에 앉혔다. 접지는 맞았지만 가구가 마루에 발끝만
-- 걸친 채 «벽에 기댄» 그림이 됐다 — 방바닥 위에 서 있으려면 발이 마루 안쪽으로 들어와야 한다.
-- 그 깊이를 마루 밴드의 **1/3** 로 못 박는다(코드에서 파생 · 상수로 굽지 않는다):
--     접지선 = 마루선 + 바닥밴드/3 = 73 + 9 = **82**   (lib/domain/shrine/theme-stage.ts)
-- 이 시드가 지는 몫은 **틀 한 장의 평행이동 +9** 가 전부다:
--     시드 y 37.22 → **46.22**  (상자 1.44~73 → **10.44~82** · 세로 71.56 불변 = 크기 변화 0)
--     앵커 2열     52.4/55 → **61.4/64**   (x 는 불변 — 상판 실폭이 안 변했다)
-- 따라 움직이는 **코드 상수**(시드 아님): 감실 바닥=신위 접지 45.3 → 54.3(stage.deityPodiumTopY) ·
-- 감실 윗턱 24.9/23.2/25.6 → 33.9/32.2/34.6 · 사방탁자 밑동 73 → 82(family-shelf.ts).
-- 마루선(73)·밴드(75/27)·신수 배회(72)는 **불변**이다 — 내려간 것은 «가구의 발»뿐이다.
--
-- ── 접지 수복 (2026-08-10 낮 · 승계) ────────────────────────────────────────
-- "틀과 선반들이 공중에 떠 있어. 마루 라인에 맞춰서 내려와야 해."
-- v4.1 은 «상자»가 마루선을 덮었을 뿐, **그려진 받침**은 스프라이트 하단 투명 여백 때문에 마루선보다
-- banga 3.22%p · daljip 1.79%p 위에서 끝나고 있었다(seolbit 만 맞아 있었다). 좌표로는 못 고친다 —
-- 세 줄(감실 바닥 · 제물 밑변 · 접지)의 «픽셀 거리비»가 그림에 박혀 있기 때문이다.
-- 그래서 스프라이트를 세로 3구간(닫집~감실 / 감실~상판 / 상판~접지)으로 끊어 상판 아래 구간만 늘렸다:
--   node scripts/shrine-assets/stage-grand-altar-ground.mjs --compose   (API 0회 · 픽셀 수술)
-- 산출이 **grand-altar-v2.webp** 다. v5 는 그 그림을 **다시 굽지 않는다** — 세 줄의 픽셀 거리비가
-- 그대로 유효하고 상자 세로도 같아서, 상자를 통째로 9%p 내리면 세 줄이 함께 9%p 내려간다.
--   검증: node scripts/shrine-assets/stage-grand-altar-ground.mjs --verify   (파일 쓰기 = 눈금판만)
--
-- 앵커는 v3 한 줄 3점(45/50/55 · y53.5) → **깊이 2열 5점**이다 (2026-08-10 정렬 패스 · 합성판 실측):
--   · 뒷줄 3점  x 45.7 / 50 / 54.3   · y **61.4**   (id 는 v3 그대로 승계)
--   · 앞줄 2점  x 47.85 / 52.15      · y **64**     (altar-front-left / altar-front-right)
-- 한 줄 5점을 그대로 구웠더니 틀 상판 실폭 밖으로 바깥 두 점이 떨어졌고, 안쪽에 다섯을 세우면
-- 아이템이 절반씩 겹쳤다. x 는 그 라운드 스프라이트의 **상판 실측 폭**에서 파생한다(v4.1: 세 테마
-- 최솟값 상판 70% × 틀 폭 60% → 세계 x43.4~56.6). 전부 ZONES.altar(x24~76 · y48~**67**) 안이다.
--
-- ⚠️ 앵커는 «다음에 놓을 자리»만 정한다 — **저장된 배치는 절대 좌표**라 이 시드만으로는 어제 놓아 둔
--    제물이 옛 자리(52.4/55)에 남아 상 밑에 뜬다. 그 한 번을 메우는 것이 같은 회차의
--    `20260810c_stage_ground_v5_shift.sql` 이다(앵커 id + 옛 좌표 정확일치 · +9).
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
--      public/shrine/stage/<code>/grand-altar-v2.webp
--    없으면 404 를 StageLayers onError 가 **조용히 숨겨** 살림 없는 빈 방이 된다(예외도 로그도 없다).
--    그래서 배포 순서는 «코드 → 틀 스프라이트 → 이 시드» 다.
--    ⚠️ 파일명이 -v2 인 것은 캐시 때문이다 — 같은 이름 덮어쓰기는 폰·엣지가 옛 그림을 재사용한다
--       (2026-08-10 뮤럴에서 실증). 구본 grand-altar.webp 는 원복 레버로 public/ 에 그대로 둔다.
--
-- ⚠️ 마루선(벽 75% · 바닥 27% → y73)과 **접지선**(y82 = 마루선 + 바닥밴드/3)은 **렌더 상수**라
--    이 시드에 실리지 않는다 — StageLayers·family-shelf 가 theme-stage.ts 를 읽는다. 시드만 적용하고
--    코드를 배포하지 않으면 틀만 내려가고 선반·신위는 옛 자리에 남는다(그 반대도 성립한다 —
--    두 배포는 서로를 기다리지 않지만, **같은 회차에 나가야** 그림이 한 세계로 읽힌다).
--
-- 최상위 structures 는 건드리지 않는다 — 그 자리가 `stage - 'zones'` 원복 레버의 착지점이다.
--
-- 원복 — 한 테마를 v3(단상+상판)로 되돌리기: 20260807 시드의 그 테마 update 문을
--   `(stage -> 'zones') is null` 조건을 지운 채 한 번 실행한다(반가는 20260806b 를 다시 실행).
--
-- ── 확산 (2026-08-10 · 오퍼스 P) ─────────────────────────────────────────────
-- 13테마가 v3(단상+상판)로 남아 있던 「혼재가 정상 상태」가 여기서 끝난다. 확산이 바꾼 것은
-- 이 파일의 문장 수(3 → 16)와 기하 JSON 두 줄(grandAltar.themes · deityHeadRoomY)뿐이다 —
-- 상자(시드 y46.22 · 세로 71.56)·앵커 2열 5점·배율·밴드는 **한 숫자도 안 움직였다**. 열세 장의
-- 스프라이트가 그 고정 상자에 맞춰 구워졌기 때문이고(고정 AR 1.42204 · 좌우 여백으로 맞춤),
-- 그래서 이미 나간 세 테마는 바이트 하나 안 바뀐다.
--
-- ⚠️ **저장된 제단 배치**: v3 앵커(45/50/55 · y53.5)에 놓아 둔 제물은 절대 좌표라 그 자리에 남는다.
--    틀의 상판은 y69.98 이므로 확산 뒤 그 제물들은 상 위가 아니라 **감실 앞 허공**에 뜬다.
--    이 시드는 그것을 옮기지 않는다 — 동반 이동은 20260810c 와 같은 별도 SQL 의 몫이고,
--    옮길지(=상으로 데려갈지) 둘지(=사용자가 다시 놓게 할지)는 사람이 정할 일이다.
-- ============================================================================

-- banga — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-banga",
    "assetUrl": "/shrine/stage/banga/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/banga/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/banga/room-floor-mural-v3.webp'::text))
where code = 'banga'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- choga — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-choga",
    "assetUrl": "/shrine/stage/choga/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/choga/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/choga/room-floor-mural-v3.webp'::text))
where code = 'choga'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- yonggung — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-yonggung",
    "assetUrl": "/shrine/stage/yonggung/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/yonggung/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/yonggung/room-floor-mural-v3.webp'::text))
where code = 'yonggung'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- dokkaebi — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-dokkaebi",
    "assetUrl": "/shrine/stage/dokkaebi/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/dokkaebi/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/dokkaebi/room-floor-mural-v3.webp'::text))
where code = 'dokkaebi'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- seolbit — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-seolbit",
    "assetUrl": "/shrine/stage/seolbit/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/seolbit/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/seolbit/room-floor-mural-v3.webp'::text))
where code = 'seolbit'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- daljip — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-daljip",
    "assetUrl": "/shrine/stage/daljip/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/daljip/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/daljip/room-floor-mural-v3.webp'::text))
where code = 'daljip'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- hongsal — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-hongsal",
    "assetUrl": "/shrine/stage/hongsal/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/hongsal/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/hongsal/room-floor-mural-v3.webp'::text))
where code = 'hongsal'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- byeolbat — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-byeolbat",
    "assetUrl": "/shrine/stage/byeolbat/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/byeolbat/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/byeolbat/room-floor-mural-v3.webp'::text))
where code = 'byeolbat'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- dangsan — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-dangsan",
    "assetUrl": "/shrine/stage/dangsan/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/dangsan/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/dangsan/room-floor-mural-v3.webp'::text))
where code = 'dangsan'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- yeondeung — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-yeondeung",
    "assetUrl": "/shrine/stage/yeondeung/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/yeondeung/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/yeondeung/room-floor-mural-v3.webp'::text))
where code = 'yeondeung'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- seonang — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-seonang",
    "assetUrl": "/shrine/stage/seonang/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/seonang/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/seonang/room-floor-mural-v3.webp'::text))
where code = 'seonang'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- jangdok — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-jangdok",
    "assetUrl": "/shrine/stage/jangdok/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/jangdok/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/jangdok/room-floor-mural-v3.webp'::text))
where code = 'jangdok'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- daejanggan — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-daejanggan",
    "assetUrl": "/shrine/stage/daejanggan/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/daejanggan/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/daejanggan/room-floor-mural-v3.webp'::text))
where code = 'daejanggan'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- jonggak — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-jonggak",
    "assetUrl": "/shrine/stage/jonggak/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/jonggak/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/jonggak/room-floor-mural-v3.webp'::text))
where code = 'jonggak'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- saemgut — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-saemgut",
    "assetUrl": "/shrine/stage/saemgut/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/saemgut/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/saemgut/room-floor-mural-v3.webp'::text))
where code = 'saemgut'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- naru — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)
update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,structures}', $grandaltar$[
  {
    "code": "grand-altar-naru",
    "assetUrl": "/shrine/stage/naru/grand-altar-v2.webp",
    "x": 50,
    "y": 46.22,
    "w": 60,
    "anchors": [
      {
        "id": "altar-left",
        "layer": "altar",
        "x": 45.7,
        "y": 61.4,
        "label": "제단 왼편"
      },
      {
        "id": "altar-center",
        "layer": "altar",
        "x": 50,
        "y": 61.4,
        "label": "제단 가운데"
      },
      {
        "id": "altar-right",
        "layer": "altar",
        "x": 54.3,
        "y": 61.4,
        "label": "제단 오른편"
      },
      {
        "id": "altar-front-left",
        "layer": "altar",
        "x": 47.85,
        "y": 64,
        "label": "제단 앞줄 왼편"
      },
      {
        "id": "altar-front-right",
        "layer": "altar",
        "x": 52.15,
        "y": 64,
        "label": "제단 앞줄 오른편"
      }
    ]
  }
]$grandaltar$::jsonb),
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/naru/room-wall-mural-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/naru/room-floor-mural-v3.webp'::text))
where code = 'naru'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;

-- 확인 쿼리
--   SELECT code,
--          jsonb_array_length(stage->'zones'->0->'structures')                  AS zone_structures,
--          stage->'zones'->0->'structures'->0->>'code'                          AS first_code,
--          stage->'zones'->0->'structures'->0->>'assetUrl'                      AS frame_asset,
--          jsonb_array_length(stage->'zones'->0->'structures'->0->'anchors')    AS anchors
--     FROM public.shrine_theme_packs ORDER BY sort_order;
--   (frame_asset 가 16행 모두 /shrine/stage/<code>/grand-altar-v2.webp 여야 확산이 끝난 것이다)
