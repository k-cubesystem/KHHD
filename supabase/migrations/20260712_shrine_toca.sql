-- ============================================================
-- 신당 2.0 "토카 스타일" — 미니룸 배치 + 기운 + 테마 팩
-- 2026-07-12
-- 적용 대상: plzvanxcxjkaazcfrtls (MCP apply_migration 완료)
-- ============================================================

-- type CHECK 확장 (신규 아이템 타입 허용)
ALTER TABLE public.shrine_item_catalog DROP CONSTRAINT IF EXISTS shrine_item_catalog_type_check;
ALTER TABLE public.shrine_item_catalog ADD CONSTRAINT shrine_item_catalog_type_check
  CHECK (type IN ('candle','talisman','flower','incense','spirit','statue','bell','chime','lantern','offering','plant','vessel','cushion'));

-- 1. 카탈로그 확장 (오행/기운/레이어/behavior)
ALTER TABLE public.shrine_item_catalog
  ADD COLUMN IF NOT EXISTS element TEXT CHECK (element IN ('wood','fire','earth','metal','water') OR element IS NULL),
  ADD COLUMN IF NOT EXISTS energy_power INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS placement_layer TEXT NOT NULL DEFAULT 'floor' CHECK (placement_layer IN ('wall','hanging','altar','floor')),
  ADD COLUMN IF NOT EXISTS sprite_url TEXT,
  ADD COLUMN IF NOT EXISTS size_grade TEXT NOT NULL DEFAULT 'md' CHECK (size_grade IN ('sm','md','lg')),
  ADD COLUMN IF NOT EXISTS behavior JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pack_id UUID;

-- 기존 5개 아이템 속성 부여
UPDATE public.shrine_item_catalog SET element='fire',  energy_power=10, placement_layer='altar', size_grade='sm', behavior='{"tap":"toggleLit","sound":"crackle","litEffect":"flame"}'::jsonb WHERE name='기본 촛불';
UPDATE public.shrine_item_catalog SET element='fire',  energy_power=10, placement_layer='altar', size_grade='sm', behavior='{"tap":"smoke","sound":"crackle"}'::jsonb                       WHERE name='향로';
UPDATE public.shrine_item_catalog SET element='earth', energy_power=10, placement_layer='wall',  size_grade='md', behavior='{"tap":"swing","sound":"moktak"}'::jsonb                        WHERE name='복 부적';
UPDATE public.shrine_item_catalog SET element='wood',  energy_power=10, placement_layer='altar', size_grade='sm', behavior='{"tap":"swing","sound":"moktak","give":true}'::jsonb           WHERE name='공물 꽃';
UPDATE public.shrine_item_catalog SET element='metal', energy_power=20, placement_layer='altar', size_grade='sm', behavior='{"tap":"toggleLit","sound":"bell","litEffect":"flame"}'::jsonb WHERE name='황금 등불';

-- 신규 7종
INSERT INTO public.shrine_item_catalog (name, description, type, rarity, price_bok_points, price_krw, emoji, element, energy_power, placement_layer, size_grade, behavior, sort_order) VALUES
  ('은풍경',   '바람이 불면 댕그렁 — 금(金) 기운을 부르는 은빛 풍경.', 'chime',    'rare',      800, 3000, '🎐', 'metal', 15, 'hanging', 'sm', '{"tap":"swing","sound":"chime"}',                          6),
  ('초롱',     '처마 끝에 매다는 붉은 초롱. 화(火) 기운을 밝힙니다.',  'lantern',  'common',    150, 0,    '🏮', 'fire',  10, 'hanging', 'md', '{"tap":"toggleLit","sound":"crackle","litEffect":"flame"}', 7),
  ('놋방울',   '맑게 울리는 놋쇠 방울. 잡기를 물리칩니다.',            'bell',     'common',    200, 0,    '🔔', 'metal', 10, 'altar',   'sm', '{"tap":"swing","sound":"bell"}',                           8),
  ('청주',     '신령께 올리는 맑은 청주 한 잔.',                       'offering', 'common',    120, 0,    '🍶', 'water', 10, 'altar',   'sm', '{"tap":"swing","sound":"water","give":true}',              9),
  ('청죽',     '사시사철 푸른 대나무. 목(木) 기운의 상징.',            'plant',    'common',    250, 0,    '🎍', 'wood',  15, 'floor',   'md', '{"tap":"swing","sound":"moktak"}',                        10),
  ('물항아리', '맑은 물을 담은 옹기. 수(水) 기운을 채웁니다.',         'vessel',   'rare',      300, 3000, '🏺', 'water', 15, 'floor',   'lg', '{"tap":"swing","sound":"water"}',                         11),
  ('연화방석', '연꽃 문양 방석. 마음을 가라앉힙니다.',                 'cushion',  'common',    180, 0,    '🪷', 'wood',  10, 'floor',   'md', '{"tap":"swing","sound":"moktak"}',                        12)
ON CONFLICT DO NOTHING;

-- 2. 테마 팩
CREATE TABLE IF NOT EXISTS public.shrine_theme_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_bok INT NOT NULL DEFAULT 0,
  price_krw INT NOT NULL DEFAULT 0,
  element_affinity TEXT CHECK (element_affinity IN ('wood','fire','earth','metal','water') OR element_affinity IS NULL),
  season TEXT CHECK (season IN ('suneung','seollal','chuseok','birthday') OR season IS NULL),
  assets JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.shrine_theme_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "theme_packs_public_read" ON public.shrine_theme_packs;
CREATE POLICY "theme_packs_public_read" ON public.shrine_theme_packs FOR SELECT USING (is_active = TRUE);

INSERT INTO public.shrine_theme_packs (code, name, description, price_bok, price_krw, element_affinity, assets, sort_order) VALUES
  ('choga',    '초가 신당', '소박한 초가집, 기본 팔레트.', 0, 0, NULL,
    '{"wall":"linear-gradient(180deg,#2b2214,#1d1810)","floor":"linear-gradient(180deg,#1a1308,#0f0b05)","accent":"#c9a84c","particle":"#c9a84c","glow":"rgba(201,168,76,0.14)"}', 1),
  ('banga',    '조선 반가', '반가의 서재, 단청 보더.', 50000, 5900, 'wood',
    '{"wall":"linear-gradient(180deg,#211913,#171009)","floor":"linear-gradient(180deg,#1c130a,#0e0906)","accent":"#e8d5a0","particle":"#e8d5a0","glow":"rgba(201,168,76,0.2)","top":"linear-gradient(90deg,#9e2b2b,#c9a84c,#2d5f8a,#c9a84c,#9e2b2b)"}', 2),
  ('yonggung', '용궁', '심해 청록과 진주 파티클.', 0, 9900, 'water',
    '{"wall":"linear-gradient(180deg,#0d2327,#081418)","floor":"linear-gradient(180deg,#0a1a1e,#050b0d)","accent":"#7fd4c1","particle":"#a8e6d5","glow":"rgba(95,179,179,0.18)"}', 3),
  ('dokkaebi', '도깨비 불', '밤 숲과 도깨비불 파티클.', 0, 9900, 'fire',
    '{"wall":"linear-gradient(180deg,#1d1122,#110a15)","floor":"linear-gradient(180deg,#160e19,#0a060c)","accent":"#c84040","particle":"#86efac","glow":"rgba(134,239,172,0.13)"}', 4)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_theme_packs (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pack_id UUID REFERENCES public.shrine_theme_packs(id) ON DELETE CASCADE NOT NULL,
  acquired_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, pack_id)
);
ALTER TABLE public.user_theme_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_theme_packs_own" ON public.user_theme_packs;
CREATE POLICY "user_theme_packs_own" ON public.user_theme_packs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.shrines ADD COLUMN IF NOT EXISTS active_pack_id UUID REFERENCES public.shrine_theme_packs(id);

-- 3. 인벤토리 (구매 → 보관, 배치와 분리)
CREATE TABLE IF NOT EXISTS public.user_shrine_inventory (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  catalog_item_id UUID REFERENCES public.shrine_item_catalog(id) ON DELETE CASCADE NOT NULL,
  qty INT NOT NULL DEFAULT 1 CHECK (qty >= 0),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, catalog_item_id)
);
ALTER TABLE public.user_shrine_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_own" ON public.user_shrine_inventory;
CREATE POLICY "inventory_own" ON public.user_shrine_inventory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. 배치 (자유 좌표)
CREATE TABLE IF NOT EXISTS public.shrine_placements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shrine_id UUID REFERENCES public.shrines(id) ON DELETE CASCADE NOT NULL,
  catalog_item_id UUID REFERENCES public.shrine_item_catalog(id) NOT NULL,
  layer TEXT NOT NULL CHECK (layer IN ('wall','hanging','altar','floor')),
  x NUMERIC(5,2) NOT NULL CHECK (x BETWEEN 0 AND 100),
  y NUMERIC(5,2) NOT NULL CHECK (y BETWEEN 0 AND 100),
  flip BOOLEAN NOT NULL DEFAULT FALSE,
  state JSONB NOT NULL DEFAULT '{}',
  placed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shrine_placements_shrine ON public.shrine_placements(shrine_id);
ALTER TABLE public.shrine_placements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "placements_read" ON public.shrine_placements;
CREATE POLICY "placements_read" ON public.shrine_placements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.shrines s WHERE s.id = shrine_placements.shrine_id AND (s.visibility = 'public' OR auth.uid() = s.user_id))
);
DROP POLICY IF EXISTS "placements_write_owner" ON public.shrine_placements;
CREATE POLICY "placements_write_owner" ON public.shrine_placements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.shrines s WHERE s.id = shrine_placements.shrine_id AND auth.uid() = s.user_id)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.shrines s WHERE s.id = shrine_placements.shrine_id AND auth.uid() = s.user_id)
);

-- 5. 기운 프로필 (사주+관상+손금 융합, 아이템 보너스는 런타임 계산)
CREATE TABLE IF NOT EXISTS public.user_energy_profile (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  base_wood INT NOT NULL DEFAULT 40, base_fire INT NOT NULL DEFAULT 40, base_earth INT NOT NULL DEFAULT 40,
  base_metal INT NOT NULL DEFAULT 40, base_water INT NOT NULL DEFAULT 40,
  yongsin_element TEXT CHECK (yongsin_element IN ('wood','fire','earth','metal','water') OR yongsin_element IS NULL),
  face_modifier JSONB NOT NULL DEFAULT '{}',
  palm_modifier JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_energy_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "energy_profile_select_own" ON public.user_energy_profile;
CREATE POLICY "energy_profile_select_own" ON public.user_energy_profile FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "energy_profile_upsert_own" ON public.user_energy_profile;
CREATE POLICY "energy_profile_upsert_own" ON public.user_energy_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "energy_profile_update_own" ON public.user_energy_profile;
CREATE POLICY "energy_profile_update_own" ON public.user_energy_profile FOR UPDATE USING (auth.uid() = user_id);
