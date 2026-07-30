-- ============================================================================
-- 신당 안2.3 「제단·단상 정립」 — 반가(banga) 단일 구역 structures 재구성
-- (PRD-shrine-gamefeel-v1 부록 C ③) 2026-07-30
--
-- CEO 3차 검수 ③ "신이 있고 아래 단상이 있어야 하는데 어색하다" 를 데이터 층에서 끝낸다.
--
--   현행: 구역 structures = [제단(altar.webp) x50/y47/w62, 문간]. 제단 한 장뿐이라
--         신위(`bottom:50%`)의 발이 제단 **몸통 안쪽**에 박힌다 — 서 있을 면이 없어 떠 보인다.
--   개선: **제단 2단 세트**로 위계를 만든다.
--         ① 단상(platform.webp)   — 뒤·위·좁다. 신위가 **올라서는** 계단형 대.
--         ② 제단 상판(altar-top.webp) — 앞·아래·넓다. 공물·촛대를 놓는 긴 상(흰 수보 드리움).
--         ③ 문간(room-door.webp)  — 안2.2 그대로 승계(입장 시작점 랜드마크).
--         배열 순서 = 그리는 순서 = **뒤→앞**. 단상이 먼저라 제단 상판이 단상 밑동을 가린다
--         (달집 마당 legacy 제단의 "층이 뒤로 갈수록 높고 좁다"를 그대로 옮긴 것).
--
-- 선행: 20260730_shrine_banga_mural_320.sql (폭 320 · 무라 2장 · 제단+문간). 이 파일은 그
--       zones[0].structures **만** 갈아끼운다. width·무라 URL·최상위 무대는 손대지 않는다.
--
-- 에셋: scripts/shrine-assets/stage-banga-altar.mjs 산출 (API 3회 — 단상 2회·상판 1회)
--         public/shrine/stage/banga/platform.webp   640×299 투명 16.4KB (fringe 0.000% / edge 0.04%)
--           (1차 산출은 꿀색 오크로 나와 벽 기둥·상판과 톤이 갈렸다 → "DEEP DARK WALNUT, NOT honey oak"
--            문구를 넣어 2차에서 교체. 붓·빛이 갈리면 "오려붙인 제단"이 된다.)
--         public/shrine/stage/banga/altar-top.webp  768×270 투명 29.4KB (fringe 0.002% / edge 0.44%)
--       두 장 모두 **캔버스 = 내용물**(트림 후 폭만 맞춤, 레터박스 0). 투명 여백이 있으면
--       시드 y 와 실제 접지선이 어긋나고, 그 오차가 바로 "떠 보임"의 원인이었다.
--       검수 조립 = assets-src/shrine/room-mural-check.webp 3행 (신위 실제 스프라이트로 접지 검증)
--
-- ⚠️ 기존 altar.webp 는 **삭제하지 않는다** — §3(a)·(b) 원복 경로가 그 한 장을 다시 가리킨다.
--
-- ────────────────────────────────────────────────────────────────────────────
-- ⚠️⚠️ 배선 담당(병행 에이전트)에게 넘기는 계약 — 반드시 읽을 것
--
--  [계약 1] **좌표 규약**(변경 없음, 안2.2 승계). 구조물 `x`/`y` = 스프라이트 **중심** %(구역
--           컨테이너 기준), `w` = 구역 폭 대비 % 에 zoneWidthScale(100/320 = 0.3125)이 곱해진다
--           → 시드에 적는 w 는 결과적으로 **"뷰포트 폭의 w%"**.
--
--  [계약 2] **기준 방 = 520 × 620px** (컨테이너 `max-w-[520px]` · 높이 `min(72vh, 620px)`).
--           w 는 뷰포트 폭 %, y 는 방 높이 % 라서 **겉보기 세로 비율은 방의 종횡비에 딸린다** —
--           같은 시드가 좁은 폰에서는 더 납작해 보인다(좌표계의 성질이지 시드의 오류가 아니다).
--
--             단상   x50 y51 w44 → 229×107px · 방 y 42.4% ~ 59.6%
--                    상면 앞턱 = 스프라이트 20.27% 지점 → 방 y 45.9%
--             상판   x50 y58 w58 → 302×106px · 방 y 49.4% ~ 66.6%
--                    상판 면(앞턱) = 스프라이트 45.56% 지점 → 방 y 57.2%
--             문간   x10 y37 w36 → 187×281px · 방 y 14.4% ~ 59.6% (안2.2 그대로)
--
--  [계약 3] ★ **신위 접지 = 방 y 44.70% ~ 45.87% 안의 아무 값** (권장 = 가운데 **45.3**).
--           `lib/domain/shrine/stage.ts` 의 `PODIUM_TOP_Y` 가 이 밴드 안에 있으면 계약 충족이다.
--           한 상수로 모든 기기를 맞출 수 없으므로(계약 2) 두 극단의 **상면 밴드 교집합**을 쓴다.
--           scripts/shrine-assets/stage-banga-altar.mjs 실측(단상 640×299 · 앞턱 20.27%):
--             · 방 520×620 상면 밴드 y 42.38% ~ 45.87%
--             · 방 380×620 상면 밴드 y 44.70% ~ 47.25%   (세로 긴 폰)
--             ★ 교집합 y **44.70% ~ 45.87%** → 가운데 45.29 ≈ **45.3**
--           → 이 구간 안이면 어느 기기에서도 발이 상면 **안**에 놓인다(오차는 "상면 뒤쪽으로
--             조금 들어감" = 정상, "허공에 뜸"이 아니다). 45.1 · 45.3 · 45.8 전부 유효하다 —
--             단상 y 를 51 로 고른 이유가 이 폭(1.17%p)을 확보해 에셋↔배선의 반올림 차이를
--             흡수하려는 것이다.
--           종전 `bottom:'50%'`(발끝 y50)은 상면보다 4%p 넘게 아래 = 상판 앞 허공이었고, 방을
--             72vh 로 늘리면 그 간격이 더 벌어진다 — 그게 CEO ③ "어색하다"의 기하적 원인이다.
--           ⚠️ 신위는 z-[3] 로 구조물보다 **위**에 그려진다. 발끝(≈45)과 상판 top 49.4% 사이에
--              4%p 남짓 여유가 있어 신위가 상판을 덮지 않는다 — 이 여유를 줄이면 발이 상 위에 겹친다.
--           ⚠️ 단상 y/w 나 platform.webp 를 다시 굽으면 **밴드가 이동한다** → stage-banga-altar.mjs 를
--              다시 돌려 새 교집합을 확인할 것. 정합 테스트가 PODIUM_TOP_Y 의 밴드 포함을 검사하므로
--              한쪽만 바꾸면 `npx jest lib/domain/shrine` 이 잡는다.
--
--  [계약 4] **앵커는 상판(altar-top)에만** 3점. id 는 기존 altar-left/center/right 를 승계하고
--           y 만 새 상판 면으로 옮겼다(46 → **53.5**).
--             · 상판 면이 y 57.2% 이고 배치 아이템은 앵커에 **중심**이 맞는다(translate(-50%,-50%)).
--               아이템 높이 ≈ 3.2em × altar 스케일 0.88 ≈ 45px ≈ 방 높이 7.3% → 반높이 3.6%p.
--               57.2 − 3.6 = 53.6 ≈ **53.5** 에서 아이템 밑동이 상판 면에 앉는다.
--             · ZONES.altar.y = [42, 54] (lib/domain/shrine/zones.ts) 안이라 드래그·스냅이 닿는다.
--               ⚠️ 54 를 넘기면 클램프에 걸려 **앵커에 도달할 수 없다** — 53.5 는 그 상한 때문이다.
--               상판을 더 내리려면(y58 초과) zones.ts 를 먼저 넓혀야 한다. 이 시드의 책임 밖.
--             · 단상에는 앵커를 두지 않는다 — 신위가 서는 면이지 배치면이 아니다.
--
--  [계약 5] 기존 altar 레이어 배치 14건은 y 48~54 구간에 있다(2026-07-30 조회, anchor_id 전부 NULL).
--           새 상판 면(57.2)보다 최대 9%p 높으므로 **강제 이관은 필요 없다**(작은 것은 상판 위,
--           큰 것은 상판 뒤 공중에 조금 뜬다). 신경 쓰이면 §3(c) 의 선택 UPDATE 로 한 번에 앉힌다.
--
-- ⚠️ parseWorld(lib/domain/shrine/world.ts)·parseStageSpec 검증 체크리스트
--    [1] zones 1개 · code 'daecheong' · x0 0 · x1 320 · width 320  ← 안2.2 값 그대로 유지  ✔
--    [2] 구조물 code 는 비어있지 않은 ≤62자                                              ✔
--    [3] x·y 는 0~100 클램프, w 는 1~200 클램프 (전부 범위 안)                            ✔
--    [4] assetUrl 없는 구조물은 **조용히 버려진다** → public 실재 확인 필수(테스트가 담당)  ✔
--    [5] `tile` 키를 되살리지 않는다 — repeat-x = 세로선 복귀(안2.2 계약 1)                ✔
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- §0. 전제 가드 — 순서를 어기면 조용히 0건이 되는 사고를 막는다
--     (`NULL || jsonb = NULL` 이라 stage 가 NULL 이면 UPDATE 가 성립해도 아무 일이 안 일어난다)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  z jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.shrine_theme_packs WHERE code = 'banga') THEN
    RAISE EXCEPTION '반가 테마 팩이 없다 — shrine_theme_packs 시드를 먼저 적용할 것';
  END IF;

  SELECT stage->'zones'->0 INTO z FROM public.shrine_theme_packs WHERE code = 'banga';

  -- 선행 시드(무라 320) 미적용 가드. 이 파일은 zones[0].structures 를 **덮어쓰기만** 하므로
  -- 구역·무라가 아직 없으면 붙일 자리가 없다.
  IF z IS NULL OR z->>'code' IS DISTINCT FROM 'daecheong' THEN
    RAISE EXCEPTION
      '반가 단일 구역(daecheong)이 없다 — 20260730_shrine_banga_mural_320.sql 을 먼저 적용할 것. '
      '현재 zones[0] = %', COALESCE(z::text, 'NULL');
  END IF;
  IF z->>'wallpaperUrl' IS DISTINCT FROM '/shrine/stage/banga/room-wall-mural.webp' THEN
    RAISE EXCEPTION
      '구역이 와이드 무라를 들고 있지 않다(벽=%) — 선행 시드 확인 필요', z->>'wallpaperUrl';
  END IF;

  -- 최상위 제단 보존 가드 — §3(a) 원복(zones 제거)이 최상위 단일 무대 위에서 성립해야 한다.
  IF NOT EXISTS (
    SELECT 1
      FROM public.shrine_theme_packs t,
           jsonb_array_elements(t.stage->'structures') e
     WHERE t.code = 'banga'
       AND e->>'code' = 'altar-banga'
       AND e->>'assetUrl' = '/shrine/stage/banga/altar.webp'
  ) THEN
    RAISE EXCEPTION
      '최상위 structures 에 레거시 제단(altar-banga · altar.webp)이 없다 — '
      '§3(a) 원복 경로가 끊긴다. 최상위를 먼저 복구할 것';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- §1. zones[0].structures → 단상 + 제단 상판 + 문간 (뒤→앞 순서)
--
--   · `jsonb_set` 으로 **structures 만** 갈아끼운다. width·zones[0] 의 나머지 키
--     (code/x0/x1/wallpaperUrl/flooringUrl)와 최상위 무대는 한 글자도 건드리지 않는다.
--   · `tile` 키는 여기서도 만들지 않는다(안2.2 계약 1 — repeat-x = 세로선 복귀).
--
--   ⬇︎ 아래 달러 인용 블록 안은 **순수 JSON** 이다. 정합 테스트
--     (lib/domain/shrine/__tests__/banga-wide-seed.test.ts)가 구분자 두 개 사이를 그대로
--     JSON.parse 한다. 그래서 두 가지 금기가 있다:
--       · 블록 안에 JSON 밖 문법(주석·SQL 함수·트레일링 콤마)을 넣지 말 것.
--       · 이 파일 어디에도 같은 달러 태그를 **세 번째로** 적지 말 것(주석 포함).
--         (§3 원복이 다른 태그를 쓰는 이유가 이것이다.)
-- ────────────────────────────────────────────────────────────────────────────
UPDATE public.shrine_theme_packs
SET stage = jsonb_set(stage, '{zones,0,structures}', $structures$
[
  {
    "code": "platform-banga",
    "assetUrl": "/shrine/stage/banga/platform.webp",
    "x": 50,
    "y": 51,
    "w": 44
  },
  {
    "code": "altar-banga",
    "assetUrl": "/shrine/stage/banga/altar-top.webp",
    "x": 50,
    "y": 58,
    "w": 58,
    "anchors": [
      { "id": "altar-left", "layer": "altar", "x": 34, "y": 53.5, "label": "제단 왼편" },
      { "id": "altar-center", "layer": "altar", "x": 50, "y": 53.5, "label": "제단 가운데" },
      { "id": "altar-right", "layer": "altar", "x": 66, "y": 53.5, "label": "제단 오른편" }
    ]
  },
  {
    "code": "door-banga",
    "assetUrl": "/shrine/stage/banga/room-door.webp",
    "x": 10,
    "y": 37,
    "w": 36
  }
]
$structures$::jsonb)
WHERE code = 'banga';


-- ────────────────────────────────────────────────────────────────────────────
-- §2. 사후 검증 — 병합이 실제로 성립했는지 확인 (실패하면 트랜잭션째 되돌린다)
--     parseWorld·parseStageSpec 재현은 하지 않는다. 그건 §1 의 JSON 을 그대로 읽는
--     banga-wide-seed.test.ts 가 DB 없이 담당한다.
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  s jsonb;
  z jsonb;
  st jsonb;
BEGIN
  SELECT stage INTO s FROM public.shrine_theme_packs WHERE code = 'banga';
  z := s->'zones'->0;
  st := z->'structures';

  -- ① 구조물 3종 · 코드 대조
  IF jsonb_array_length(st) <> 3 THEN
    RAISE EXCEPTION '구역 구조물이 3개(단상·상판·문간)가 아니다: %', jsonb_array_length(st);
  END IF;
  IF (SELECT string_agg(e->>'code', ',' ORDER BY e->>'code') FROM jsonb_array_elements(st) e)
     IS DISTINCT FROM 'altar-banga,door-banga,platform-banga' THEN
    RAISE EXCEPTION 'structures 코드 집합이 다르다: %',
      (SELECT string_agg(e->>'code', ',' ORDER BY e->>'code') FROM jsonb_array_elements(st) e);
  END IF;

  -- ② 그리는 순서 = 뒤→앞. 단상이 상판보다 **먼저** 와야 상판이 단상 밑동을 가린다.
  IF st->0->>'code' IS DISTINCT FROM 'platform-banga' THEN
    RAISE EXCEPTION '단상이 첫 번째가 아니다(뒤→앞 순서 위반): %', st->0->>'code';
  END IF;

  -- ③ 에셋 URL 대조 — 코드와 그림이 어긋나면 위계가 반대로 그려진다
  IF st->0->>'assetUrl' IS DISTINCT FROM '/shrine/stage/banga/platform.webp'
     OR st->1->>'assetUrl' IS DISTINCT FROM '/shrine/stage/banga/altar-top.webp'
     OR st->2->>'assetUrl' IS DISTINCT FROM '/shrine/stage/banga/room-door.webp' THEN
    RAISE EXCEPTION '구조물 에셋이 계약과 다르다: % / % / %',
      st->0->>'assetUrl', st->1->>'assetUrl', st->2->>'assetUrl';
  END IF;

  -- ④ 좌표 대조 (기준 방 520×620 환산의 근거값. 하나만 틀려도 접지선이 어긋난다)
  IF (st->0->>'x')::numeric <> 50 OR (st->0->>'y')::numeric <> 51 OR (st->0->>'w')::numeric <> 44 THEN
    RAISE EXCEPTION '단상 좌표가 계약(x50/y51/w44)과 다르다: %', st->0;
  END IF;
  IF (st->1->>'x')::numeric <> 50 OR (st->1->>'y')::numeric <> 58 OR (st->1->>'w')::numeric <> 58 THEN
    RAISE EXCEPTION '상판 좌표가 계약(x50/y58/w58)과 다르다: %', st->1;
  END IF;

  -- ⑤ 앵커 3점이 상판에만 · y 는 상판 면 · altar 존 상한(54) 안
  IF jsonb_array_length(st->1->'anchors') <> 3 THEN
    RAISE EXCEPTION '상판 앵커가 3점이 아니다: %', jsonb_array_length(st->1->'anchors');
  END IF;
  IF jsonb_exists(st->0, 'anchors') OR jsonb_exists(st->2, 'anchors') THEN
    RAISE EXCEPTION '단상·문간에 앵커가 붙었다 — 배치면이 아니다(신위가 서는 면 / 랜드마크)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(st->1->'anchors') a
     WHERE (a->>'y')::numeric > 54 OR (a->>'y')::numeric < 42
  ) THEN
    RAISE EXCEPTION '앵커 y 가 ZONES.altar.y=[42,54] 밖이다 — 드래그 클램프에 막혀 도달 불가';
  END IF;
  IF (SELECT string_agg(a->>'id', ',' ORDER BY a->>'id') FROM jsonb_array_elements(st->1->'anchors') a)
     IS DISTINCT FROM 'altar-center,altar-left,altar-right' THEN
    RAISE EXCEPTION '앵커 id 가 기존 3점을 승계하지 않았다: %',
      (SELECT string_agg(a->>'id', ',' ORDER BY a->>'id') FROM jsonb_array_elements(st->1->'anchors') a);
  END IF;

  -- ⑥ 선행 시드 무손실 — 구역·무라·폭·최상위가 그대로 남아 있어야 원복이 성립한다
  IF (s->>'width')::numeric IS DISTINCT FROM 320 OR jsonb_array_length(s->'zones') <> 1 THEN
    RAISE EXCEPTION '선행 시드 손상: width=% zones=%', s->>'width', jsonb_array_length(s->'zones');
  END IF;
  IF jsonb_exists(z, 'tile') THEN
    RAISE EXCEPTION 'tile 키가 되살아났다 — 무라는 반복 에셋이 아니다(repeat-x = 세로선 복귀)';
  END IF;
  IF z->>'wallpaperUrl' IS DISTINCT FROM '/shrine/stage/banga/room-wall-mural.webp'
     OR z->>'flooringUrl' IS DISTINCT FROM '/shrine/stage/banga/room-floor-mural.webp' THEN
    RAISE EXCEPTION '구역 무라가 바뀌었다: 벽=% 바닥=%', z->>'wallpaperUrl', z->>'flooringUrl';
  END IF;
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
--       (최상위 벽지·바닥·제단(altar.webp)·광원이 그대로 남아 있으므로 이 한 줄로 안2.1 이전 화면)
--
--   (b) 직전 안2.2 structures(제단 altar.webp + 문간 2종)로 되돌리기 —
--       2026-07-30 20260730_shrine_banga_mural_320.sql 적용 직후 실값 전문이다.
--       단상·상판 webp 는 public/ 에 그대로 두므로 이 UPDATE 하나면 왕복한다.
--
--   UPDATE public.shrine_theme_packs
--   SET stage = jsonb_set(stage, '{zones,0,structures}', $prev$
--   [
--     {
--       "code": "altar-banga",
--       "assetUrl": "/shrine/stage/banga/altar.webp",
--       "x": 50,
--       "y": 47,
--       "w": 62,
--       "anchors": [
--         { "id": "altar-left", "layer": "altar", "x": 34, "y": 46, "label": "제단 왼편" },
--         { "id": "altar-center", "layer": "altar", "x": 50, "y": 46, "label": "제단 가운데" },
--         { "id": "altar-right", "layer": "altar", "x": 66, "y": 46, "label": "제단 오른편" }
--       ]
--     },
--     {
--       "code": "door-banga",
--       "assetUrl": "/shrine/stage/banga/room-door.webp",
--       "x": 10,
--       "y": 37,
--       "w": 36
--     }
--   ]
--   $prev$::jsonb)
--   WHERE code = 'banga';
--
--   (c) 선택 · **미적용** — 기존 altar 레이어 배치를 새 상판 면에 한 번에 앉히기(계약 5).
--       상판 면 57.2% − 아이템 반높이 3.6%p = 53.5. 반가 신당의 altar 레이어만 건드린다.
--
--   UPDATE public.shrine_placements p
--   SET y = 53.5, anchor_id = COALESCE(p.anchor_id, 'altar-center')
--   WHERE p.layer = 'altar'
--     AND p.shrine_id IN (
--       SELECT s.id FROM public.shrines s
--        LEFT JOIN public.shrine_theme_packs t ON t.id = s.active_pack_id
--        WHERE COALESCE(t.code, s.theme) = 'banga'
--     )
--     AND p.y < 55;
--   ⚠️ 테마 판정을 두 컬럼으로 한다 — 활성 팩(active_pack_id → shrine_theme_packs.code)이 우선이고
--      팩 미지정 신당은 레거시 텍스트 컬럼 shrines.theme 으로 떨어진다(2026-07-30 실 스키마 확인).
-- ────────────────────────────────────────────────────────────────────────────


-- ────────────────────────────────────────────────────────────────────────────
-- §4. 확인 쿼리
-- ────────────────────────────────────────────────────────────────────────────
--   SELECT code,
--          stage->>'width'                                       AS width,
--          jsonb_array_length(stage->'zones'->0->'structures')    AS zone_structures,
--          (SELECT string_agg(e->>'code' || '@' || (e->>'x') || '/' || (e->>'y') || '/' || (e->>'w'), '  ')
--             FROM jsonb_array_elements(stage->'zones'->0->'structures') e) AS structures,
--          stage->'zones'->0->'structures'->1->'anchors'          AS altar_anchors,
--          jsonb_exists(stage->'zones'->0, 'tile')                AS still_tiled
--     FROM public.shrine_theme_packs WHERE code = 'banga';
--
--   -- 접지 계약 재확인용: 단상 상면 교집합 = y 44.70%~45.87% (PODIUM_TOP_Y 가 이 안이면 OK)
