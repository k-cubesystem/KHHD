-- ============================================================================
-- 신당 안2.2 「큰 방 v2」 — 반가(banga) **와이드 무라 + 문간** 단일 구역 시드
-- (PRD-shrine-gamefeel-v1 부록 B) 2026-07-30
--
-- CEO 2차 검수 두 건을 데이터 층에서 끝낸다.
--
--   ② "오른쪽에 세로줄"  →  **반복 폐지.** 벽지·바닥을 타일 2장 + `tile: true`(repeat-x)에서
--      **미리 이어붙여 구운 와이드 무라 1장**으로 바꾸고 `tile` 필드를 **제거**한다.
--      tile 이 없으면 StageLayers 는 `<img class="h-[62%] w-full object-cover">` 단일 이미지
--      경로로 그린다(실측) — 반복이 없으니 반복 경계도 없고, 세로선의 원인이 사라진다.
--      ⚠️ 크로스페이드로 픽셀을 맞춰도 선이 남았던 이유가 반복 렌더 단계의 서브픽셀 재샘플링이라
--         이 마이그레이션의 본질은 "이미지 교체"가 아니라 **렌더 경로 교체**다.
--
--   ① "입장이 안 보인다"  →  좌측 **문간(분합문)** 구조물 신설. 균일 반복 무늬만 있는 방에서는
--      카메라가 70%p 를 움직여도 랜드마크가 없어 이동으로 지각되지 않는다.
--
--   ④ 방 확장  →  논리 폭 240 → **320**(3.2화면).
--
-- 선행: 20260729_shrine_banga_one_room.sql (240 + tile). 이 파일이 그 zones·width 를 통째로 대체한다.
--       두 파일이 순서대로 적용돼도 결과는 같다 — 여기서 `- 'zones'` 로 먼저 지우고 새로 얹기 때문.
--
-- 에셋: scripts/shrine-assets/stage-banga-mural.mjs 산출 (무라는 API 0회 — 기존 타일 재사용)
--         public/shrine/stage/banga/room-wall-mural.webp   4096×640 123.4KB
--         public/shrine/stage/banga/room-floor-mural.webp  4096×420 119.5KB
--         public/shrine/stage/banga/room-door.webp          512×768  69.7KB (투명, fringe 0.000%)
--       미러 경계 실측: 인코딩 전 4곳 전부 **0.000** / webp 후 최대 1.883
--         (내부 이웃 열 차이 중앙값 1.107~1.737 · p95 2.5~22.1 → 경계가 내부 분포 안 = 육안 불가시)
--       검수 조립 = assets-src/shrine/room-mural-check.webp (무라 전폭 2장 + 320% 방 전체 조립)
--
-- ⚠️ 타일 2장(room-wall-tile.webp / room-floor-tile.webp)은 **삭제하지 않는다.** 무라의 입력이고
--    §3(b) 원복 경로가 그 두 장을 다시 가리킨다.
--
-- ────────────────────────────────────────────────────────────────────────────
-- ⚠️⚠️ 배선 담당(병행 에이전트)에게 넘기는 계약 — 반드시 읽을 것
--
--  [계약 1] **무라는 반복 에셋이 아니다.** zones[0] 에 `tile` 이 없다 = repeat-x 를 쓰지 말라는 뜻.
--           StageLayers 의 tile 분기를 이 구역에 켜면 세로선이 그대로 돌아온다.
--           (그렇다고 tile 분기 코드를 지우지는 말 것 — 다른 테마·원복 경로가 쓴다.)
--
--  [계약 2] **구역 structures 는 최상위를 승계하지 않고 대체한다.** world-render.ts `zoneStage` 실측:
--             structures = zone.structures.length > 0 ? zone.structures : (base.structures ?? [])
--           그래서 문만 구역에 넣으면 **제단이 사라진다.** 이 시드는 구역 배열에 제단 + 문을
--           **둘 다** 넣어 제단을 살린다(제단은 프로덕션 실값 SELECT 복제 — x50/y47/w62 + 앵커 3점).
--           최상위 structures 는 지우지 않으므로 §3(a) 원복 시 다시 살아난다.
--
--  [계약 3] 좌표 규약(StageLayers 실측): 구조물 `x`/`y` 는 스프라이트 **중심** %(구역 컨테이너 기준,
--           스케일 없음), `w` 는 구역 폭 대비 % 에 **zoneWidthScale = 100/320 = 0.3125** 가 곱해진다.
--           따라서 시드에 적는 w 값은 결과적으로 **"뷰포트 폭의 w%"** 가 된다(겉보기 보존).
--             제단 w 62 → 62 × 100/320 = 19.375 (구역폭 대비) = 화면 폭의 62%  ← 지금 화면과 동일
--             문   w 14 → 14 × 100/320 =  4.375 (구역폭 대비) = 화면 폭의 14%
--           x 에는 스케일을 곱하지 않는다 — 곱하면 제단이 방 한가운데(x50)를 떠나 왼쪽으로 몰린다.
--
--  [계약 4] EffectsCanvas 폭 클램프(현 1400px). 320% × 520 = 1664px 로 초과한다 →
--           클램프 상향 + 버퍼 픽셀 예산(≤8Mpx) 검증 필수(PRD 부록 B 리스크). 이 시드의 책임 밖.
--
--  [결정 대기 — 문간 크기] 계약 3 대로 w 14 는 **화면 폭의 14%** 이고, 문 원본 종횡비(512×768)와
--           기준 방(640×800)에서 높이는 방 높이의 약 16.8% 다(= w × 1.5 × 640/800). 조립 검수
--           (room-mural-check.webp 3행 좌측)에서 문이 **작은 등롱처럼** 읽혀 ①의 "시작점이 보인다"에
--           미달한다. 문설주가 벽·바닥 경계(y≈62)에 서고 방 높이의 절반쯤 차지하려면:
--             "w": 40, "y": 38   ← 높이 48% · 밑동 y 62 (w × 1.2 = 방 높이 %, 중심 y = 62 − 높이/2)
--           PRD 가 준 수치를 임의로 바꾸지 않으려 **활성 시드는 w 14 · y 56 그대로** 두었다.
--           확대안을 쓰려면 §3(c) 의 한 줄 UPDATE 로 전환한다(에셋 재생성 불필요).
--
-- ⚠️ parseWorld(lib/domain/shrine/world.ts) 검증 체크리스트 — 하나라도 어긋나면 **부분 채택 없이
--    항등 폴백**(폭 100·구역 1)으로 되돌아간다. 두루마리가 예외도 로그도 없이 사라진다.
--    [1] zones 배열 길이 1~8                  → 1개                                     ✔
--    [2] code 비어있지 않은 ≤62자·중복 금지   → daecheong                               ✔
--    [3] x0·x1 은 JSON **숫자**(문자열 반려)                                             ✔
--    [4] x0 ≥ 0 · x1 ≤ 1000 · (x1−x0) ≥ 1     → 0 / 320                                 ✔
--    [5] 정렬·비중첩 (구역 1개라 자동 성립)                                             ✔
--    [6] width 는 숫자이며 마지막 x1 이상 & ≤1000 → 320 = 320                            ✔
--    [7] 두루마리 발동 조건 `world.width > 100` (ShrineRoomClient) → 320 이라 발동        ✔
--    ⚠️ 320 은 world.ts 의 WORLD_DEFAULT_WIDTH(240)와 다르다. 상수는 **기본값일 뿐** 상한이 아니며
--       상한은 MAX_WORLD_WIDTH(1000)다 — world.ts 를 고칠 필요가 없다(1파 산출물 무수정 원칙).
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

  -- 제단 복제 드리프트 가드 — 아래 §1 은 최상위 제단을 **손으로 복제**한다(계약 2).
  -- 프로덕션 제단이 그동안 바뀌었다면 복제본이 낡은 것이므로 여기서 멈춰야 한다.
  IF NOT EXISTS (
    SELECT 1
      FROM public.shrine_theme_packs t,
           jsonb_array_elements(t.stage->'structures') e
     WHERE t.code = 'banga'
       AND e->>'code' = 'altar-banga'
       AND (e->>'x')::numeric = 50
       AND (e->>'y')::numeric = 47
       AND (e->>'w')::numeric = 62
       AND jsonb_array_length(e->'anchors') = 3
  ) THEN
    RAISE EXCEPTION
      '최상위 제단이 복제 기준(altar-banga · x50 · y47 · w62 · 앵커 3점)과 다르다. '
      '§1 의 구역 structures 안 제단 정의를 현행 실값으로 다시 복제한 뒤 적용할 것 — '
      '그러지 않으면 구역 structures 가 최상위를 대체하면서 제단이 옛 좌표로 되돌아간다.';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- §1. 폭 320 · 단일 구역 · 무라 2장 · 구조물 2개(제단 + 문간)로 교체
--
--   · `stage - 'zones'` 로 직전 240 구역을 걷어낸 뒤 `||` 로 새 zones·width 를 얹는다.
--   · 최상위 wallpaperUrl/flooringUrl/structures/light 는 한 개도 지워지지 않는다 —
--     §3(a) 원복(zones·width 제거 → 단일 무대)이 그 위에서 성립한다.
--   · **`tile` 키가 없는 것이 이 시드의 핵심이다.** 있으면 repeat-x = 세로선 복귀(계약 1).
--   · label 은 넣지 않는다 — '대청' 문구의 단일 출처는 world.ts ZONE_LABEL_BY_CODE 다.
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
  "width": 320,
  "zones": [
    {
      "code": "daecheong",
      "x0": 0,
      "x1": 320,
      "wallpaperUrl": "/shrine/stage/banga/room-wall-mural.webp",
      "flooringUrl": "/shrine/stage/banga/room-floor-mural.webp",
      "structures": [
        {
          "code": "altar-banga",
          "assetUrl": "/shrine/stage/banga/altar.webp",
          "x": 50,
          "y": 47,
          "w": 62,
          "anchors": [
            { "id": "altar-left", "layer": "altar", "x": 34, "y": 46, "label": "제단 왼편" },
            { "id": "altar-center", "layer": "altar", "x": 50, "y": 46, "label": "제단 가운데" },
            { "id": "altar-right", "layer": "altar", "x": 66, "y": 46, "label": "제단 오른편" }
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
  z jsonb;
BEGIN
  SELECT stage INTO s FROM public.shrine_theme_packs WHERE code = 'banga';
  z := s->'zones'->0;

  IF (s->>'width')::numeric IS DISTINCT FROM 320 THEN
    RAISE EXCEPTION '병합 실패: width = %', s->>'width';
  END IF;
  IF jsonb_array_length(s->'zones') <> 1 THEN
    RAISE EXCEPTION '단일 구역이 아니다: zones 개수 = %', jsonb_array_length(s->'zones');
  END IF;
  IF z->>'code' IS DISTINCT FROM 'daecheong'
     OR (z->>'x0')::numeric IS DISTINCT FROM 0
     OR (z->>'x1')::numeric IS DISTINCT FROM 320 THEN
    RAISE EXCEPTION '유일 구역이 세계 전체를 덮지 않는다: %', z;
  END IF;

  -- ★ 세로선 회귀 방지 — tile 키가 살아 있으면 repeat-x 로 그려져 서브픽셀 이음선이 돌아온다
  --   (`?` 연산자 대신 jsonb_exists 를 쓴다 — 물음표를 바인드 자리표시자로 해석하는 드라이버가 있다)
  IF jsonb_exists(z, 'tile') THEN
    RAISE EXCEPTION 'tile 키가 남아 있다 — 무라는 반복 에셋이 아니다(repeat-x = 세로선 복귀)';
  END IF;

  IF z->>'wallpaperUrl' IS DISTINCT FROM '/shrine/stage/banga/room-wall-mural.webp'
     OR z->>'flooringUrl' IS DISTINCT FROM '/shrine/stage/banga/room-floor-mural.webp' THEN
    RAISE EXCEPTION '구역이 무라를 들고 있지 않다: 벽=% 바닥=%', z->>'wallpaperUrl', z->>'flooringUrl';
  END IF;

  -- 구역 structures 는 최상위를 **대체**하므로(zoneStage) 제단이 이 배열에 없으면 제단이 사라진다
  IF jsonb_array_length(z->'structures') <> 2 THEN
    RAISE EXCEPTION '구역 구조물이 2개(제단·문)가 아니다: %', jsonb_array_length(z->'structures');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(z->'structures') e WHERE e->>'code' = 'altar-banga'
  ) THEN
    RAISE EXCEPTION '구역 구조물에 제단이 없다 — zoneStage 가 최상위를 대체하므로 제단이 증발한다';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(z->'structures') e WHERE e->>'code' = 'door-banga'
  ) THEN
    RAISE EXCEPTION '구역 구조물에 문간이 없다 — 입장 시작점 랜드마크가 없다';
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
--       (최상위 벽지·바닥·제단·광원이 그대로 남아 있으므로 이 한 줄로 지금 화면 이전으로 돌아간다)
--
--   (b) 직전 240% 타일 시드(20260729_shrine_banga_one_room.sql)로 되돌리기 —
--       2026-07-30 프로덕션 실값 전문이다. 타일 2장은 public/ 에 그대로 있으므로 이 UPDATE 하나면 복구된다.
--
--   UPDATE public.shrine_theme_packs
--   SET stage = (stage - 'zones') || $prev$
--   {
--     "width": 240,
--     "zones": [
--       {
--         "code": "daecheong",
--         "x0": 0,
--         "x1": 240,
--         "wallpaperUrl": "/shrine/stage/banga/room-wall-tile.webp",
--         "flooringUrl": "/shrine/stage/banga/room-floor-tile.webp",
--         "tile": true
--       }
--     ]
--   }
--   $prev$::jsonb
--   WHERE code = 'banga';
--
--   (c) 문간 확대안(위 「결정 대기」 참조) — 에셋 교체 없이 좌표만 바꾼다.
--       밑동을 벽·바닥 경계(y≈62)에 두고 방 높이의 약 48% 를 차지한다.
--
--   UPDATE public.shrine_theme_packs t
--   SET stage = jsonb_set(
--         t.stage,
--         '{zones,0,structures,1}',
--         (t.stage->'zones'->0->'structures'->1) || '{"w": 40, "y": 38}'::jsonb
--       )
--   WHERE t.code = 'banga'
--     AND t.stage->'zones'->0->'structures'->1->>'code' = 'door-banga';
-- ────────────────────────────────────────────────────────────────────────────


-- ────────────────────────────────────────────────────────────────────────────
-- §4. 확인 쿼리
-- ────────────────────────────────────────────────────────────────────────────
--   SELECT code,
--          stage->>'width'                                      AS width,
--          jsonb_array_length(stage->'zones')                   AS zones,
--          stage->'zones'->0->>'wallpaperUrl'                   AS room_wall,
--          stage->'zones'->0->>'flooringUrl'                    AS room_floor,
--          jsonb_exists(stage->'zones'->0, 'tile')              AS still_tiled,
--          jsonb_array_length(stage->'zones'->0->'structures')  AS zone_structures,
--          (SELECT string_agg(e->>'code', ',' ORDER BY e->>'code')
--             FROM jsonb_array_elements(stage->'zones'->0->'structures') e) AS structure_codes
--     FROM public.shrine_theme_packs WHERE code = 'banga';
