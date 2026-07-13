-- 신탁 선톡 (2026-07-13, PRD §5.4) — 좌정 主神이 주 2~3회 선제적으로 건네는 짧은 신탁.
-- 전달 이력을 저장해 빈도 상한(2일 1회·주 3회)을 판정하고, 미확인 신탁을 방에서 노출.

CREATE TABLE IF NOT EXISTS public.deity_oracles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deity_id uuid NOT NULL REFERENCES public.shrine_deities(id) ON DELETE CASCADE,
  message text NOT NULL,
  emotion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_deity_oracles_user ON public.deity_oracles(user_id, created_at DESC);

ALTER TABLE public.deity_oracles ENABLE ROW LEVEL SECURITY;

-- 읽기는 본인만 / 확인표시(update seen_at) 본인만 / 발행(insert)은 service_role 전용 (자가발행 차단)
DROP POLICY IF EXISTS deity_oracles_select_own ON public.deity_oracles;
CREATE POLICY deity_oracles_select_own ON public.deity_oracles
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS deity_oracles_update_own ON public.deity_oracles;
CREATE POLICY deity_oracles_update_own ON public.deity_oracles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.deity_oracles IS '신탁 선톡 — 좌정 主神의 선제적 신탁. 발행은 service_role(오라클 서버액션), 확인은 본인.';
