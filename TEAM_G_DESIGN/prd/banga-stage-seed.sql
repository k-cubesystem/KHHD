-- ============================================================================
-- 【제안 시드 — 적용 금지】 신당 「조립식 무대」 P2 시범: 반가(banga) 테마 stage 세트
--   근거: TEAM_G_DESIGN/prd/PLAN-shrine-miniroom-v2.md §3-A·B, §4, §5(P2)
--   작성: 2026-07-29 (WP-B 이미지 파이프라인)
--
-- ⚠️ 이 파일은 supabase/migrations/ 가 아니다. 마이그레이션 작성은 다른 작업자 담당이며,
--    이 시드는 **사용자 검수 게이트 통과 후** 그쪽 마이그레이션에 편입할 것.
--    반가 1종 시범 — 나머지 테마 7종은 검수 전까지 확산 금지(앰비언트 영상 반가 v1~v5 반려 전례).
--
-- 전제 (다른 작업자의 마이그레이션이 먼저 추가해야 하는 컬럼):
--   ALTER TABLE public.shrine_theme_packs  ADD COLUMN stage     jsonb;
--   ALTER TABLE public.shrine_item_catalog ADD COLUMN asset_url text;
--
-- ============================================================================
-- ⚠️ 스키마 충돌 경보 (마이그레이션 담당자 확인 요망)
--   public.shrine_item_catalog 에는 이미 `sprite_url text` 가 존재하고,
--   전 12품목에 값이 채워져 있다 (예: 기본 촛불 → '/shrine/items/candle-basic.webp').
--   PLAN §4 가 제안한 `asset_url` 은 사실상 이 컬럼과 중복이다. 셋 중 하나를 택할 것:
--     (a) `sprite_url` 을 그대로 재사용하고 `asset_url` 은 신설하지 않는다  ← 권장(컬럼 증식 방지)
--     (b) `asset_url` 신설 후 sprite_url 값을 백필하고 sprite_url 을 폐기(2단계 마이그레이션)
--     (c) 의미 분리: sprite_url = 카드/상점용 아이콘, asset_url = 무대 배치용 스프라이트
--   아래 §2 는 PLAN 문구 그대로 `asset_url` 을 쓰지만, (a) 로 결정되면 asset_url → sprite_url 로
--   치환만 하면 된다.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- §1. 반가 테마 stage 세트
--     - 좌표계는 기존 배치와 동일한 % (컨테이너 대비). placements 는 한 줄도 건드리지 않는다.
--     - light.origin 은 §3-C 조명 오버레이(radial-gradient)의 발광 중심 = 제단 위 촛불 웅덩이.
--       에셋 회화 광원(좌상단 고정)과는 별개 개념이니 혼동 금지.
--     - anchors 의 y=46 은 altar.webp 상판 면(에셋 픽셀 y 6~205 / 400)의 앞쪽에 해당한다.
--       structure(y 47, w 62) 와 함께 정사각 컨테이너에서 조립 검증 완료 →
--       public/shrine/stage/banga/preview-stage.webp 참조.
-- ────────────────────────────────────────────────────────────────────────────
UPDATE public.shrine_theme_packs
SET stage = jsonb_build_object(
  'wallpaperUrl', '/shrine/stage/banga/wallpaper.webp',
  'flooringUrl',  '/shrine/stage/banga/flooring.webp',
  'structures', jsonb_build_array(
    jsonb_build_object(
      'code',     'altar-banga',
      'assetUrl', '/shrine/stage/banga/altar.webp',
      'x', 50,
      'y', 47,
      'w', 62,
      -- id·label 은 lib/domain/shrine/stage.ts 의 DEFAULT_ANCHORS 와 동일 문자열을 쓴다.
      -- shrine_placements.anchor_id 에 그대로 저장되므로, 레거시 테마↔무대 테마를 오갈 때
      -- id 가 다르면 이미 스냅된 배치가 앵커를 잃는다.
      'anchors', jsonb_build_array(
        jsonb_build_object('id', 'altar-left',   'layer', 'altar', 'x', 34, 'y', 46, 'label', '제단 왼편'),
        jsonb_build_object('id', 'altar-center', 'layer', 'altar', 'x', 50, 'y', 46, 'label', '제단 가운데'),
        jsonb_build_object('id', 'altar-right',  'layer', 'altar', 'x', 66, 'y', 46, 'label', '제단 오른편')
      )
    )
  ),
  'light', jsonb_build_object(
    'color',     '#C9A84C',
    'intensity', 0.5,
    'origin',    jsonb_build_object('x', 50, 'y', 52)
  )
)
WHERE code = 'banga';


-- ────────────────────────────────────────────────────────────────────────────
-- §2. 카탈로그 스프라이트 — 촛대·향로 2품목
--     name 매칭. 2026-07-29 프로덕션(plzvanxcxjkaazcfrtls) 실조회로 확인한 정확한 값:
--       '기본 촛불'  type=candle,  placement_layer=altar   → prop-candle.webp  (놋촛대 + 불 꺼진 초)
--       '향로'      type=incense, placement_layer=altar   → prop-incense.webp (놋향로)
--     ⚠️ 이 2장은 반가 무대 톤에 맞춘 시범 에셋이다. 카탈로그는 전 테마 공용이므로
--        검수 통과 후 톤을 확정하고 나서 반영할 것. 경로를 테마 중립 위치
--        (/shrine/items/*)로 옮길지는 마이그레이션 담당자와 협의 — 아래는 생성 위치 그대로.
--     ⚠️ 시드 재실행 시 태그 소실 이력 → INSERT 금지, UPDATE 만 사용(PLAN §3-B).
-- ────────────────────────────────────────────────────────────────────────────
UPDATE public.shrine_item_catalog
SET asset_url = '/shrine/stage/banga/prop-candle.webp'
WHERE name = '기본 촛불';

UPDATE public.shrine_item_catalog
SET asset_url = '/shrine/stage/banga/prop-incense.webp'
WHERE name = '향로';

-- 아직 스프라이트가 없는 나머지 품목 (참고 — 이번 범위 아님, 확산 게이트 통과 후 제작)
--   놋방울 · 초롱 · 은풍경 · 청주 · 청죽 · 물항아리 · 연화방석 · 복 부적 · 공물 꽃 · 황금 등불 · 기억의 함


-- ────────────────────────────────────────────────────────────────────────────
-- §3. 검증 쿼리 (적용 후 확인용)
-- ────────────────────────────────────────────────────────────────────────────
-- SELECT code, stage->>'wallpaperUrl', jsonb_array_length(stage->'structures')
--   FROM public.shrine_theme_packs WHERE code = 'banga';
-- SELECT name, asset_url FROM public.shrine_item_catalog WHERE name IN ('기본 촛불','향로');
