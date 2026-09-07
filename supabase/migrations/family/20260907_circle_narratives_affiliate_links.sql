-- ============================================================
-- (1) circle_narratives — 처방전·그룹 지도의 AI 풀이 캐시  (CEO 2026-09-07 「가족·인연 관리에도 AI 풀이」)
-- (2) affiliate_links  — 실물 항목 → 쿠팡 파트너스 딥링크 캐시 (키워드별, 전역)
-- 2026-09-07
--
-- 둘 다 쓰기는 service_role 전용(서버 액션). narratives 는 본인 것만 읽고, links 는 공개 URL 이라 읽기 자유.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_narratives (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('prescription', 'circle')),
  -- 'self' | family_members.id | 'family' | circles.id — 화면 하나를 가리키는 키
  target_key  text NOT NULL CHECK (char_length(target_key) BETWEEN 1 AND 64),
  -- 입력 지문(sha256) — 같으면 다시 사지 않는다
  input_hash  text NOT NULL CHECK (char_length(input_hash) = 64),
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  model       text NOT NULL,
  talisman_cost integer NOT NULL DEFAULT 0 CHECK (talisman_cost >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circle_narratives_lookup
  ON public.circle_narratives (user_id, kind, target_key, created_at DESC);

ALTER TABLE public.circle_narratives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS circle_narratives_select_own ON public.circle_narratives;
CREATE POLICY circle_narratives_select_own ON public.circle_narratives
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.circle_narratives FROM anon, authenticated;
GRANT SELECT ON public.circle_narratives TO authenticated;

-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.affiliate_links (
  keyword     text PRIMARY KEY CHECK (char_length(keyword) BETWEEN 1 AND 40),
  url         text NOT NULL CHECK (url LIKE 'https://%'),
  provider    text NOT NULL DEFAULT 'coupang',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS affiliate_links_select_all ON public.affiliate_links;
CREATE POLICY affiliate_links_select_all ON public.affiliate_links
  FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.affiliate_links FROM anon, authenticated;
GRANT SELECT ON public.affiliate_links TO authenticated;
