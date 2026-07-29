-- ============================================================================
-- 신당 안2.1 「큰 방 하나」 — 반가(banga) 단일 구역 시드 (PRD-shrine-gamefeel-v1 부록 A)
-- 2026-07-29
--
-- CEO 실기기 검수에서 구역 3개(마당·대청·후원)가 반려됐다 — "방 두 장을 이어붙인 슬라이드"로 읽히고
-- 실내↔실외 문법이 끊긴다는 이유. 확정안은 **같은 벽지·마루가 끝까지 이어지는 큰 실내 방 하나**다.
--
--   구역 3개 → **1개**(대청 0~240). 경계가 아예 없으니 이음새도 없다.
--   벽지·바닥은 한 장을 늘리는 게 아니라 **가로 타일을 repeat-x** 로 반복한다(아래 §1 `tile` 계약).
--
-- 선행: 20260729_shrine_banga_wide_zones.sql (3구역). 이 파일이 그 zones 를 **통째로 대체**한다.
--       두 파일이 순서대로 적용돼도 결과는 같다 — 여기서 `- 'zones'` 로 먼저 지우고 새로 얹기 때문.
--
-- 에셋: scripts/shrine-assets/stage-banga-room.mjs 산출
--         public/shrine/stage/banga/room-wall-tile.webp   1024×640 (이음새 검증 완료)
--         public/shrine/stage/banga/room-floor-tile.webp  1024×420
--       조립 목업 = assets-src/shrine/room-preview.webp (2.4화면 폭 「큰 방 하나」)
--
-- ⚠️ 마당 실외 에셋 4장(gate·seokdeung·madang-wall·madang-floor)과 후원 2장(huwon-*)은
--    **삭제하지 않는다.** 후속 「앞마당 씬」 재론용으로 public/ 에 그대로 보관하고, 시드에서만 뺀다.
--
-- ────────────────────────────────────────────────────────────────────────────
-- ⚠️⚠️ 전폭 재해석 — **이 마이그레이션의 가장 큰 부작용. 배선 담당은 반드시 읽을 것.**
--
--    대청 구역이 0~240(전폭)이 되면서 렌더의 대청 컨테이너(ShrineRoomClient `daecheongBox`)가
--    뷰포트 1장이 아니라 **2.4장** 폭이 된다. 그 안의 % 좌표는 전부 이 컨테이너 기준이므로:
--
--    · 최상위 stage.structures 의 `w` = **구역 폭 대비 %** → 제단 w 62 가 62%×2.4화면 = 1.49화면.
--      겉보기 크기를 지키려면 배선 시 **w × 100/240** (62 → 25.83) 로 환산해야 한다.
--      이 시드는 structures 를 건드리지 않는다 — 좌표 환산은 렌더 계약이지 데이터가 아니기 때문.
--    · shrine_placements 의 x(0~100) → world.ts `toWorldX` 로 worldX = x × 2.4.
--      **이건 의도한 동작이다**(PRD 부록 A "방 전폭 꾸미기"). 아이템 크기는 px 고정이라 안 커진다.
--    · 신위 스탠드는 height % + width auto 라 크기는 그대로, 위치만 방 한가운데로 간다.
--    · ShrineRoomClient 의 CSS 글로우(width 64%·86%)도 같은 이유로 2.4배 퍼진다 → 같이 환산 필요.
--
-- ⚠️ parseWorld(lib/domain/shrine/world.ts) 검증 체크리스트 — 하나라도 어긋나면 **부분 채택 없이
--    항등 폴백**(폭 100·구역 1)으로 되돌아간다. 두루마리가 예외도 로그도 없이 사라진다.
--    [1] zones 배열 길이 1~8                → 1개                                        ✔
--    [2] code 비어있지 않은 ≤62자·중복 금지 → daecheong                                  ✔
--    [3] x0·x1 은 JSON **숫자**(문자열 "240" 반려)                                        ✔
--    [4] x0 ≥ 0 · x1 ≤ 1000 · (x1-x0) ≥ 1   → 0 / 240                                     ✔
--    [5] 정렬·비중첩 (구역 1개라 자동 성립)                                               ✔
--    [6] width 는 숫자이며 마지막 x1 이상 & ≤1000 → 240 = 240                             ✔
--    [7] 두루마리 발동 조건은 `world.width > 100` (ShrineRoomClient). 240 이라 발동한다.   ✔
--
--    ⚠️ 구역이 1개여도 폭이 240 이면 두루마리는 **켜진다**. 「자유 팬」(스냅·페이징 제거)은
--       구역 수가 아니라 CameraRig 쪽에서 끄는 것이다 — 이 시드의 책임이 아니다.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- §0. 전제 가드 — 순서를 어기면 조용히 0건이 되는 사고를 막는다
--     (`NULL || jsonb = NULL` 이라 stage 가 NULL 이면 UPDATE 가 성립해도 아무 일이 안 일어난다)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.shrine_theme_packs WHERE code = 'banga') THEN
    RAISE EXCEPTION '반가 테마 팩이 없다 — shrine_theme_packs 시드를 먼저 적용할 것';
  END IF;
  IF EXISTS (SELECT 1 FROM public.shrine_theme_packs WHERE code = 'banga' AND stage IS NULL) THEN
    RAISE EXCEPTION
      '반가 stage 가 NULL 이다 — 단일 무대 세트(wallpaperUrl/flooringUrl/structures/light)를 먼저 넣을 것. '
      'NULL || jsonb = NULL 이라 이 마이그레이션이 조용히 0건이 된다.';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- §1. 단일 구역으로 교체 — 최상위 필드는 무손실
--
--   · `stage - 'zones'` 로 3구역을 먼저 걷어낸 뒤 `||` 로 새 zones·width 를 얹는다.
--     (`||` 만 써도 최상위 키 단위로 덮이지만, "3개를 1개로 바꾼다"는 의도를 SQL 에 남긴다.)
--   · 최상위 wallpaperUrl/flooringUrl/structures/light 는 한 개도 지워지지 않는다.
--     대청 구역이 제 벽지·바닥을 **직접 들고** 있으므로 화면에 나가는 건 타일 2장이고,
--     최상위 벽지/바닥은 zones 를 걷어냈을 때의 폴백으로 남는다(§3 원복이 그 위에서 성립한다).
--   · label 은 넣지 않는다 — '대청' 문구의 단일 출처는 world.ts ZONE_LABEL_BY_CODE 다.
--
--   ⬇︎ **`"tile": true` = 렌더 계약** (후속 배선 에이전트에게 넘기는 신호)
--     "이 구역의 벽지·바닥은 늘리지 말고 **가로로 반복**하라(repeat-x)". 지금 렌더
--     (StageLayers.tsx)는 `<img class="w-full object-cover">` 라 구역 폭만큼 **늘려** 그린다 —
--     2.4화면으로 늘리면 벽 리듬이 2.4배로 뭉개진다. 배선 시 그 <img> 를 background-repeat:repeat-x
--     div 로 바꾸는 것이 이 필드의 용도다.
--     parseWorld/parseStageSpec 은 **모르는 키를 조용히 버리므로**(실측 확인) 배선 전에 넣어도 무해하다.
--     다만 그래서 WorldZone 에는 이 값이 안 실린다 — 배선 시 world.ts 에 `tile` 파싱을 추가하거나
--     StageThemePack.stageRaw 에서 직접 읽어야 한다.
--
--   ⬇︎ 아래 달러 인용 블록 안은 **순수 JSON** 이다. 정합 테스트
--     (lib/domain/shrine/__tests__/banga-wide-seed.test.ts)가 구분자 두 개 사이를 그대로
--     JSON.parse 해 parseWorld 에 먹인다. 그래서 두 가지 금기가 있다:
--       · 블록 안에 JSON 밖 문법(주석·SQL 함수·트레일링 콤마)을 넣지 말 것.
--       · 이 파일 어디에도 같은 달러 태그를 **세 번째로** 적지 말 것(주석 포함) — 잘라내기가 어긋난다.
--         (§3 원복이 다른 태그를 쓰는 이유가 이것이다.)
-- ────────────────────────────────────────────────────────────────────────────
UPDATE public.shrine_theme_packs
SET stage = (stage - 'zones') || $world$
{
  "width": 240,
  "zones": [
    {
      "code": "daecheong",
      "x0": 0,
      "x1": 240,
      "wallpaperUrl": "/shrine/stage/banga/room-wall-tile.webp",
      "flooringUrl": "/shrine/stage/banga/room-floor-tile.webp",
      "tile": true
    }
  ]
}
$world$::jsonb
WHERE code = 'banga';


-- ────────────────────────────────────────────────────────────────────────────
-- §2. 사후 검증 — 병합이 실제로 성립했는지 확인 (실패하면 트랜잭션째 되돌린다)
--     parseWorld 검증까지 재현하지는 않는다. 그건 §1 의 JSON 을 그대로 읽는
--     banga-wide-seed.test.ts 가 DB 없이 담당한다.
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  s jsonb;
BEGIN
  SELECT stage INTO s FROM public.shrine_theme_packs WHERE code = 'banga';

  IF (s->>'width')::numeric IS DISTINCT FROM 240 THEN
    RAISE EXCEPTION '병합 실패: width = %', s->>'width';
  END IF;
  IF jsonb_array_length(s->'zones') <> 1 THEN
    RAISE EXCEPTION '단일 구역이 아니다: zones 개수 = %', jsonb_array_length(s->'zones');
  END IF;
  IF s->'zones'->0->>'code' IS DISTINCT FROM 'daecheong' THEN
    RAISE EXCEPTION '유일 구역의 code 가 daecheong 이 아니다: %', s->'zones'->0->>'code';
  END IF;
  IF (s->'zones'->0->>'tile')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'tile 렌더 신호가 없다 — repeat-x 배선이 무력화된다';
  END IF;
  -- 최상위 무손실 확인 — 하나라도 날아가면 zones 를 걷어냈을 때 방이 백지가 된다
  IF s->>'wallpaperUrl' IS NULL OR s->>'flooringUrl' IS NULL
     OR s->'structures' IS NULL OR s->'light' IS NULL THEN
    RAISE EXCEPTION '기존 최상위 필드 손실: %', s;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- §3. 원복
--
--   (a) 두루마리를 통째로 걷어내고 v2 단일 무대(폭 100·항등 폴백)로:
--       UPDATE public.shrine_theme_packs SET stage = stage - 'zones' - 'width' WHERE code = 'banga';
--
--   (b) 직전 3구역 시드(20260729_shrine_banga_wide_zones.sql)로 되돌리기 —
--       그 파일의 JSON 전문이다. 에셋 6장은 public/ 에 그대로 있으므로 이 UPDATE 하나면 복구된다.
--
--   UPDATE public.shrine_theme_packs
--   SET stage = (stage - 'zones') || $prev$
--   {
--     "width": 240,
--     "zones": [
--       {
--         "code": "madang",
--         "x0": 0,
--         "x1": 70,
--         "wallpaperUrl": "/shrine/stage/banga/madang-wall.webp",
--         "flooringUrl": "/shrine/stage/banga/madang-floor.webp",
--         "structures": [
--           {
--             "code": "gate-banga",
--             "assetUrl": "/shrine/stage/banga/gate.webp",
--             "x": 24,
--             "y": 52,
--             "w": 52
--           },
--           {
--             "code": "seokdeung-banga",
--             "assetUrl": "/shrine/stage/banga/seokdeung.webp",
--             "x": 72,
--             "y": 66,
--             "w": 14
--           }
--         ]
--       },
--       {
--         "code": "daecheong",
--         "x0": 70,
--         "x1": 170
--       },
--       {
--         "code": "huwon",
--         "x0": 170,
--         "x1": 240,
--         "wallpaperUrl": "/shrine/stage/banga/huwon-wall.webp",
--         "flooringUrl": "/shrine/stage/banga/huwon-floor.webp"
--       }
--     ]
--   }
--   $prev$::jsonb
--   WHERE code = 'banga';
-- ────────────────────────────────────────────────────────────────────────────


-- ────────────────────────────────────────────────────────────────────────────
-- §4. 확인 쿼리
-- ────────────────────────────────────────────────────────────────────────────
--   SELECT code,
--          stage->>'width'                        AS width,
--          jsonb_array_length(stage->'zones')     AS zones,
--          stage->'zones'->0->>'wallpaperUrl'     AS room_wall,
--          stage->'zones'->0->>'tile'             AS tiled
--     FROM public.shrine_theme_packs WHERE code = 'banga';
