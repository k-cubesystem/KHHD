-- ============================================
-- 신당(神堂) 시스템
-- 2026-06-21
-- ============================================

-- 1. 신당 아이템 카탈로그 (구매 가능 아이템 목록)
CREATE TABLE IF NOT EXISTS shrine_item_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('candle','talisman','flower','incense','spirit','statue','bell')),
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common','rare','legendary')),
  price_bok_points INTEGER DEFAULT 0,
  price_krw INTEGER DEFAULT 0,
  image_url TEXT,
  emoji TEXT NOT NULL DEFAULT '🕯️',
  season TEXT CHECK (season IN ('suneung','seollal','chuseok','birthday') OR season IS NULL),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE shrine_item_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_public_read" ON shrine_item_catalog FOR SELECT USING (is_active = TRUE);

-- 기본 아이템 시드 (5개)
INSERT INTO shrine_item_catalog (name, description, type, rarity, price_bok_points, price_krw, emoji, sort_order) VALUES
  ('기본 촛불',     '소망의 불꽃을 밝히는 작은 초. 신당을 여는 첫걸음.',    'candle',   'common',   0,     0,    '🕯️', 1),
  ('향로',          '향기로운 연기가 소원을 하늘로 전합니다.',                'incense',  'common',   100,   0,    '🔥', 2),
  ('복 부적',       '붉은 실로 엮은 황금 부적. 가족의 복을 부릅니다.',        'talisman', 'rare',     300,   3000, '📜', 3),
  ('공물 꽃',       '신령께 바치는 신선한 꽃. 소원을 전합니다.',              'flower',   'common',   150,   0,    '🌸', 4),
  ('황금 등불',     '천 년의 기원을 담은 황금 등불. 강한 기운을 부릅니다.',   'candle',   'legendary',800,   9900, '🪔', 5)
ON CONFLICT DO NOTHING;

-- 2. 신당 메인 테이블
CREATE TABLE IF NOT EXISTS shrines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 20),
  description TEXT CHECK (length(description) <= 100),
  theme TEXT DEFAULT 'traditional' CHECK (theme IN ('traditional','modern','premium')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public','private')),
  visitor_count INTEGER DEFAULT 0,
  wish_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE shrines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shrines_public_read" ON shrines
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);
CREATE POLICY "shrines_insert_own" ON shrines
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shrines_update_own" ON shrines
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "shrines_delete_own" ON shrines
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_shrines_user ON shrines(user_id);
CREATE INDEX idx_shrines_visibility ON shrines(visibility, created_at DESC);

-- 3. 신당 내 배치 아이템 (최대 12슬롯)
CREATE TABLE IF NOT EXISTS shrine_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shrine_id UUID REFERENCES shrines(id) ON DELETE CASCADE NOT NULL,
  catalog_item_id UUID REFERENCES shrine_item_catalog(id) NOT NULL,
  slot_index INTEGER NOT NULL CHECK (slot_index BETWEEN 1 AND 12),
  placed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shrine_id, slot_index)
);

ALTER TABLE shrine_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shrine_items_read" ON shrine_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shrines s
      WHERE s.id = shrine_items.shrine_id
        AND (s.visibility = 'public' OR auth.uid() = s.user_id)
    )
  );
CREATE POLICY "shrine_items_write_owner" ON shrine_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM shrines s
      WHERE s.id = shrine_items.shrine_id AND auth.uid() = s.user_id
    )
  );

CREATE INDEX idx_shrine_items_shrine ON shrine_items(shrine_id);

-- 슬롯 12개 초과 방지 트리거
CREATE OR REPLACE FUNCTION check_shrine_slot_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM shrine_items WHERE shrine_id = NEW.shrine_id) >= 12 THEN
    RAISE EXCEPTION 'SLOT_FULL' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shrine_slot_limit
  BEFORE INSERT ON shrine_items
  FOR EACH ROW EXECUTE FUNCTION check_shrine_slot_limit();

-- 4. 소원 로그 (로그인/비로그인 모두 가능)
CREATE TABLE IF NOT EXISTS shrine_wishes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shrine_id UUID REFERENCES shrines(id) ON DELETE CASCADE NOT NULL,
  wisher_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_name TEXT CHECK (length(visitor_name) <= 10),
  visitor_session_id TEXT,
  wish_text TEXT NOT NULL CHECK (length(wish_text) BETWEEN 5 AND 100),
  category TEXT CHECK (category IN ('health','exam','love','wealth','family','business','other')),
  is_owner_wish BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE shrine_wishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishes_read_public" ON shrine_wishes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shrines s
      WHERE s.id = shrine_wishes.shrine_id
        AND (s.visibility = 'public' OR auth.uid() = s.user_id)
    )
  );
CREATE POLICY "wishes_insert_any" ON shrine_wishes
  FOR INSERT WITH CHECK (true);
CREATE POLICY "wishes_delete_owner_or_wisher" ON shrine_wishes
  FOR DELETE USING (
    auth.uid() = wisher_user_id
    OR EXISTS (
      SELECT 1 FROM shrines s
      WHERE s.id = shrine_wishes.shrine_id AND auth.uid() = s.user_id
    )
  );

CREATE INDEX idx_wishes_shrine ON shrine_wishes(shrine_id, created_at DESC);
CREATE INDEX idx_wishes_user ON shrine_wishes(wisher_user_id) WHERE wisher_user_id IS NOT NULL;

-- 5. 신당 방문자 증가 함수 (RPC)
CREATE OR REPLACE FUNCTION increment_shrine_visitor(p_shrine_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE shrines SET visitor_count = visitor_count + 1 WHERE id = p_shrine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 소원 수 동기화 트리거
CREATE OR REPLACE FUNCTION sync_shrine_wish_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shrines SET wish_count = wish_count + 1, updated_at = now()
    WHERE id = NEW.shrine_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shrines SET wish_count = GREATEST(0, wish_count - 1), updated_at = now()
    WHERE id = OLD.shrine_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shrine_wish_count
  AFTER INSERT OR DELETE ON shrine_wishes
  FOR EACH ROW EXECUTE FUNCTION sync_shrine_wish_count();

-- 7. bok_transactions type 확장 (신당 관련 타입 추가)
ALTER TABLE bok_transactions
  DROP CONSTRAINT IF EXISTS bok_transactions_type_check;

ALTER TABLE bok_transactions
  ADD CONSTRAINT bok_transactions_type_check
  CHECK (type IN (
    'REGISTER','ANALYSIS','COMPATIBILITY','FORTUNE','SHARE',
    'CHECKIN','BONUS','REFERRAL','MISSION',
    'SHRINE_WISH_OWN','SHRINE_WISH_VISIT','SHRINE_ITEM_PURCHASE'
  ));
