-- ============================================================
-- 신당 꾸미기 v2 「조립식 무대(舞臺)」 — 데이터 계층
-- 근거: TEAM_G_DESIGN/prd/PLAN-shrine-miniroom-v2.md §4
-- 2026-07-29
--
-- 원칙: **추가만 한다.** 기존 사용자 배치(shrine_placements)는 단 한 줄도 깨지 않는다.
--   · 좌표 체계(%, layer)는 그대로. 신규 컬럼은 전부 NULL 허용(kind 만 DEFAULT 'prop').
--   · 렌더는 asset_url·stage 유무로 분기 — 값이 없으면 기존(이모지 + room.webp) 렌더 그대로.
--
-- ⚠️ 실제 테이블명 주의: 기획서의 `shrine_catalog` 는 실재하지 않는다.
--    카탈로그 = public.shrine_item_catalog · 테마 팩 = public.shrine_theme_packs
-- ============================================================

-- 1. 카탈로그 — 품목 종류 / 스프라이트 / 구조물 앵커
ALTER TABLE public.shrine_item_catalog
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'prop',
  ADD COLUMN IF NOT EXISTS asset_url TEXT,
  ADD COLUMN IF NOT EXISTS anchor_spec JSONB;

-- CHECK 은 별도로 (재실행 시 컬럼이 이미 있어도 제약은 항상 최신 정의로 맞춘다)
ALTER TABLE public.shrine_item_catalog DROP CONSTRAINT IF EXISTS shrine_item_catalog_kind_check;
ALTER TABLE public.shrine_item_catalog ADD CONSTRAINT shrine_item_catalog_kind_check
  CHECK (kind IN ('wallpaper','flooring','structure','prop'));

COMMENT ON COLUMN public.shrine_item_catalog.kind IS
  '무대 조립 품목 종류: wallpaper(벽지)/flooring(바닥재)/structure(제단·선반 등 구조물)/prop(자유 배치 소품). 기존 아이템은 전부 prop.';
COMMENT ON COLUMN public.shrine_item_catalog.asset_url IS
  '「설빛온기」 스프라이트(투명 webp 512², 접지선 하단중앙·광원 좌상단). NULL 이면 emoji 폴백 렌더.';
COMMENT ON COLUMN public.shrine_item_catalog.anchor_spec IS
  '구조물이 노출하는 스냅 앵커 배열 [{id,layer,x,y,label}] (무대 % 좌표). kind=structure 외에는 NULL.';

-- 2. 배치 — 스냅된 앵커 식별자
ALTER TABLE public.shrine_placements
  ADD COLUMN IF NOT EXISTS anchor_id TEXT;

ALTER TABLE public.shrine_placements DROP CONSTRAINT IF EXISTS shrine_placements_anchor_id_len;
ALTER TABLE public.shrine_placements ADD CONSTRAINT shrine_placements_anchor_id_len
  CHECK (anchor_id IS NULL OR length(anchor_id) <= 62);

COMMENT ON COLUMN public.shrine_placements.anchor_id IS
  '스냅된 앵커 id (구조물 anchor_spec 또는 DEFAULT_ANCHORS 의 id). NULL = 자유 배치. 앵커 효험 보너스 판정 기준.';

-- 3. 테마 팩 — 조립식 무대 스펙
ALTER TABLE public.shrine_theme_packs
  ADD COLUMN IF NOT EXISTS stage JSONB;

COMMENT ON COLUMN public.shrine_theme_packs.stage IS
  '조립식 무대 스펙 {wallpaper,flooring,structures[],light:{color,intensity,origin}}. NULL = 레거시(room.webp) 렌더 — 테마 단위 세대교체용.';
