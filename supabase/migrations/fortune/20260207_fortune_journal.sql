-- Fortune Journal System: Track monthly and yearly fortune progress
-- This table records fortune energy accumulated through analysis completion

-- Main fortune journal table
CREATE TABLE IF NOT EXISTS public.fortune_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE CASCADE,

  -- Time dimensions (월운/년운)
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),

  -- Analysis context
  category text NOT NULL CHECK (category IN ('SAJU', 'FACE', 'HAND', 'FENGSHUI', 'COMPATIBILITY', 'TODAY', 'WEALTH', 'NEW_YEAR')),
  analysis_id uuid REFERENCES public.analysis_history(id) ON DELETE SET NULL,

  -- Fortune contribution (운기 포인트)
  fortune_points integer DEFAULT 100, -- Each mission = 100 points = 12.5%

  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Constraint: One entry per category per member per month
  UNIQUE(family_member_id, year, month, category)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fortune_journal_user_year_month
  ON public.fortune_journal(user_id, year, month);

CREATE INDEX IF NOT EXISTS idx_fortune_journal_member
  ON public.fortune_journal(family_member_id);

CREATE INDEX IF NOT EXISTS idx_fortune_journal_category
  ON public.fortune_journal(category);

-- RLS Policies
ALTER TABLE public.fortune_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fortune journal"
  ON public.fortune_journal
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fortune journal"
  ON public.fortune_journal
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fortune journal"
  ON public.fortune_journal
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RPC: Calculate monthly fortune for a single member
CREATE OR REPLACE FUNCTION public.calculate_monthly_fortune(
  member_id_param uuid,
  year_param integer,
  month_param integer
)
RETURNS TABLE (
  total_possible integer,
  current_fortune integer,
  percentage numeric,
  completed_categories text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    800 as total_possible, -- 8 missions × 100 points
    COALESCE(SUM(fj.fortune_points), 0)::integer as current_fortune,
    ROUND(COALESCE(SUM(fj.fortune_points), 0)::numeric / 800 * 100, 1) as percentage,
    ARRAY_AGG(fj.category) FILTER (WHERE fj.category IS NOT NULL) as completed_categories
  FROM public.fortune_journal fj
  WHERE fj.family_member_id = member_id_param
    AND fj.year = year_param
    AND fj.month = month_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Calculate yearly fortune trend (12 months)
CREATE OR REPLACE FUNCTION public.calculate_yearly_fortune(
  user_id_param uuid,
  year_param integer
)
RETURNS TABLE (
  month integer,
  fortune integer,
  member_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fj.month,
    SUM(fj.fortune_points)::integer as fortune,
    COUNT(DISTINCT fj.family_member_id)::integer as member_count
  FROM public.fortune_journal fj
  WHERE fj.user_id = user_id_param
    AND fj.year = year_param
  GROUP BY fj.month
  ORDER BY fj.month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Calculate family collective fortune (current month)
CREATE OR REPLACE FUNCTION public.calculate_family_fortune(
  user_id_param uuid,
  year_param integer,
  month_param integer
)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  relationship text,
  fortune integer,
  missions_completed integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fm.id as member_id,
    fm.name as member_name,
    fm.relationship,
    COALESCE(SUM(fj.fortune_points), 0)::integer as fortune,
    COUNT(DISTINCT fj.category)::integer as missions_completed
  FROM public.family_members fm
  LEFT JOIN public.fortune_journal fj
    ON fm.id = fj.family_member_id
    AND fj.year = year_param
    AND fj.month = month_param
  WHERE fm.user_id = user_id_param
  GROUP BY fm.id, fm.name, fm.relationship
  ORDER BY fortune DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_fortune_journal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fortune_journal_updated_at
  BEFORE UPDATE ON public.fortune_journal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fortune_journal_updated_at();
