-- ============================================================
-- 기운 선물 — energy_gifts   (PRD-energy-circle-v1 P2, ARCH §4)
-- 2026-09-04
--
-- 재화 지급 경로가 **아니다** — 받는 쪽은 살림 한 점을 보관함에 받을 뿐 복채는 0 이다.
-- 감사·중복 차단(멱등 키)·「보낸 선물」 표시용 기록.
--
-- 🔴 쓰기는 service_role 전용: 서버 액션이 복채 차감(단일 경로)과 함께 쓴다. authenticated 는 읽기만 —
--    보낸 이 본인, 또는 받는 이가 실사용자로 연결된 경우 그 사람.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.energy_gifts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giver_user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  -- 보낼 당시 연결돼 있던 실사용자(없으면 NULL). 나중에 연결이 끊겨도 기록은 남는다.
  recipient_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  circle_id           uuid REFERENCES public.circles(id) ON DELETE SET NULL,
  catalog_item_id     uuid NOT NULL REFERENCES public.shrine_item_catalog(id),
  element             text NOT NULL CHECK (element IN ('wood', 'fire', 'earth', 'metal', 'water')),
  delivery            text NOT NULL CHECK (delivery IN ('inventory_recipient', 'inventory_giver')),
  price_bokchae       integer NOT NULL DEFAULT 0 CHECK (price_bokchae >= 0),
  message             text CHECK (message IS NULL OR char_length(message) <= 60),
  idempotency_key     text NOT NULL UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_energy_gifts_giver_created ON public.energy_gifts (giver_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_energy_gifts_recipient_member ON public.energy_gifts (recipient_member_id, created_at DESC);

ALTER TABLE public.energy_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS energy_gifts_select_giver ON public.energy_gifts;
DROP POLICY IF EXISTS energy_gifts_select_recipient ON public.energy_gifts;

CREATE POLICY energy_gifts_select_giver ON public.energy_gifts
  FOR SELECT TO authenticated USING (auth.uid() = giver_user_id);

CREATE POLICY energy_gifts_select_recipient ON public.energy_gifts
  FOR SELECT TO authenticated USING (auth.uid() = recipient_user_id);

-- 쓰기는 service_role 만 (정책 없음 + 권한 회수). 자가발행 차단.
REVOKE ALL ON public.energy_gifts FROM anon, authenticated;
GRANT SELECT ON public.energy_gifts TO authenticated;
