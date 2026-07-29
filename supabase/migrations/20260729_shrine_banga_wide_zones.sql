-- ============================================================================
-- 신당 「두루마리 신당」 — 반가(banga) 테마 와이드 구역 시드 (ARCH-shrine-gamefeel-v1 §1·§3, PRD 안2)
-- 2026-07-29
--
-- 기존 단일 무대(v2 조립식 무대)를 **가로 2.4화면 두루마리**로 펼친다.
--   마당 0~70 · 대청 70~170 · 후원 170~240 (논리 폭 240 = WORLD_DEFAULT_WIDTH)
--
-- 원칙: **더하기만 한다.**
--   · `||` 병합이라 기존 최상위 필드(wallpaperUrl/flooringUrl/structures/light)는 한 개도 지워지지 않는다.
--   · 대청 구역은 **필드를 비워** 최상위(=지금 화면)를 그대로 승계한다 → 대청 화면 회귀 0.
--   · shrine_placements 는 한 줄도 건드리지 않는다. 배치 x(0~100)는 대청 **구역 로컬 %** 로 재해석될 뿐이다
--     (world.ts `toWorldX`: worldX = zone.x0 + x × (x1-x0)/100 — 대청 폭이 100 이라 항등).
--
-- 전제: supabase/migrations/20260729_shrine_stage_v2.sql (stage jsonb 컬럼) +
--       반가 stage 세트(wallpaperUrl/flooringUrl/structures/light)가 이미 적용돼 있을 것.
--       아래 §0 가드가 이를 강제한다 — stage 가 NULL 이면 `NULL || x = NULL` 이라 **조용히 0건**이 되기 때문.
--
-- 에셋: scripts/shrine-assets/stage-banga-wide.mjs 산출 (public/shrine/stage/banga/)
--       조립 목업 = public/shrine/stage/banga/preview-world.webp (이 파일과 같은 숫자로 조립돼 있다)
--
-- ────────────────────────────────────────────────────────────────────────────
-- ⚠️ parseWorld(lib/domain/shrine/world.ts) 검증 체크리스트 — **하나라도 어긋나면 부분 채택 없이
--    항등 폴백**(폭 100 · 대청 하나)으로 되돌아간다. 즉 두루마리가 예외 없이, 로그 없이 사라진다.
--    아래 값을 고칠 때는 매 항목을 다시 확인할 것.
--
--    [1] zones 는 배열이고 길이 1~8      → 지금 3개                                   ✔
--    [2] code 는 비어있지 않은 ≤62자 문자열이고 **서로 중복 금지**
--                                        → madang / daecheong / huwon                  ✔
--    [3] x0·x1 은 JSON **숫자**. 문자열 "70" 은 반려된다(스키마 흔들림을 조기에 드러내는 규칙)  ✔
--    [4] x0 ≥ 0 · x1 ≤ 1000 · (x1 - x0) ≥ 1                                            ✔
--    [5] **정렬·겹침**: 각 zone.x0 ≥ 직전 zone.x1 (오름차순·비중첩). 자동 교정은 없다
--                                        → 0≤70 · 70≤170 · 170≤240                     ✔
--    [6] **폭 정합**: width 는 숫자이며 마지막 x1 이상 & ≤1000
--                                        → width 240 = 마지막 x1 240                    ✔
--    [7] 구조물은 code + assetUrl 이 모두 있어야 살아남는다(둘 중 하나만 있으면 조용히 버려짐).
--        x·y 는 0~100, w 는 1~200 으로 클램프된다.                                      ✔
--
--    ⚠️ 두루마리 발동 조건은 `world.width > 100` 이다(ShrineRoomClient). width 를 100 이하로 두거나
--       위 검증에 걸리면 zones 를 넣어도 화면은 단일 무대 그대로다 — 실패가 눈에 안 띄니 주의.
--
-- ⚠️ 좌표 규약: 구역 안의 x/y/w 는 **구역 로컬 %** 다(구조물 컨테이너 = 구역 박스, StageLayers.tsx).
--    x/y 는 스프라이트 **중심**, w 는 **구역 폭** 대비 %. 방 전체 폭 기준이 아니다.
--
-- ⚠️ 대청 밖 구역은 렌더가 `zoneStage(z, null)` 로 base 를 안 물려준다(ShrineRoomClient).
--    즉 마당·후원은 제 벽지·바닥을 직접 들고 있어야 하고, 없으면 CSS 폴백(--th-wall/--th-floor)이 깔린다.
--    덕분에 에셋 한 장이 빠져도 구멍이 나지 않는다 — 해당 필드만 빼면 그 층이 CSS 로 대체된다.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- §0. 전제 가드 — 순서를 어기면 조용히 0건이 되는 사고를 막는다
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
-- §1. 두루마리 구역 — 최상위 필드 무손실 병합
--
--   · `||` 는 **최상위 키 단위 덮어쓰기**다. width·zones 만 얹히고 나머지는 그대로 남는다.
--   · 대청(daecheong)은 code·x0·x1 만 둔다 — 벽지/바닥/구조물 키가 하나도 없으면 parseStageSpec 이
--     null 을 돌려주고, 렌더가 최상위 stage 를 승계한다(world-render.ts `zoneStage`).
--     여기에 빈 배열("structures": [])조차 넣지 말 것 — 의도는 통해도 계약을 흐린다.
--   · label 은 일부러 넣지 않는다. 표준 코드 3종의 한국어 라벨(마당/대청/후원)은 world.ts
--     ZONE_LABEL_BY_CODE 가 단일 출처다 — 여기 복제하면 문구가 양쪽에서 갈린다.
--
--   ⬇︎ 아래 달러 인용 블록 안은 **순수 JSON** 이다. 정합 테스트
--     (lib/domain/shrine/__tests__/banga-wide-seed.test.ts)가 구분자 두 개 사이를 그대로
--     JSON.parse 해 parseWorld 에 먹인다. 그래서 두 가지 금기가 있다:
--       · 블록 안에 JSON 밖 문법(주석·SQL 함수·트레일링 콤마)을 넣지 말 것.
--       · 이 파일 어디에도 같은 달러 태그를 **세 번째로** 적지 말 것(주석 포함) — 잘라내기가 어긋난다.
-- ────────────────────────────────────────────────────────────────────────────
UPDATE public.shrine_theme_packs
SET stage = stage || $world$
{
  "width": 240,
  "zones": [
    {
      "code": "madang",
      "x0": 0,
      "x1": 70,
      "wallpaperUrl": "/shrine/stage/banga/madang-wall.webp",
      "flooringUrl": "/shrine/stage/banga/madang-floor.webp",
      "structures": [
        {
          "code": "gate-banga",
          "assetUrl": "/shrine/stage/banga/gate.webp",
          "x": 24,
          "y": 52,
          "w": 52
        },
        {
          "code": "seokdeung-banga",
          "assetUrl": "/shrine/stage/banga/seokdeung.webp",
          "x": 72,
          "y": 66,
          "w": 14
        }
      ]
    },
    {
      "code": "daecheong",
      "x0": 70,
      "x1": 170
    },
    {
      "code": "huwon",
      "x0": 170,
      "x1": 240,
      "wallpaperUrl": "/shrine/stage/banga/huwon-wall.webp",
      "flooringUrl": "/shrine/stage/banga/huwon-floor.webp"
    }
  ]
}
$world$::jsonb
WHERE code = 'banga';


-- ────────────────────────────────────────────────────────────────────────────
-- §2. 사후 검증 — 병합이 실제로 성립했는지 확인 (실패하면 트랜잭션째 되돌린다)
--     parseWorld 의 검증까지 재현하지는 않는다. 그건 §1 의 JSON 을 그대로 읽는
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
  IF jsonb_array_length(s->'zones') <> 3 THEN
    RAISE EXCEPTION '병합 실패: zones 개수 = %', jsonb_array_length(s->'zones');
  END IF;
  -- 최상위 무손실 확인 — 하나라도 날아가면 대청이 백지가 된다
  IF s->>'wallpaperUrl' IS NULL OR s->>'flooringUrl' IS NULL
     OR s->'structures' IS NULL OR s->'light' IS NULL THEN
    RAISE EXCEPTION '기존 최상위 필드 손실: %', s;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- §3. 원복 (두루마리만 걷어내고 v2 단일 무대로 되돌린다 — 최상위 필드는 그대로)
-- ────────────────────────────────────────────────────────────────────────────
--   UPDATE public.shrine_theme_packs SET stage = stage - 'zones' - 'width' WHERE code = 'banga';


-- ────────────────────────────────────────────────────────────────────────────
-- §4. 확인 쿼리
-- ────────────────────────────────────────────────────────────────────────────
--   SELECT code,
--          stage->>'width' AS width,
--          jsonb_array_length(stage->'zones') AS zones,
--          stage->>'wallpaperUrl' AS daecheong_wall
--     FROM public.shrine_theme_packs WHERE code = 'banga';
