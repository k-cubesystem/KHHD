-- ============================================
-- 06. 데일리 운세 시스템
-- ============================================

-- ==========================================
-- 1. Daily Fortune Records 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS public.daily_fortune_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
    fortune_date date NOT NULL DEFAULT CURRENT_DATE,
    content text NOT NULL,
    lucky_color text,
    lucky_number integer,
    lucky_direction text,
    caution text,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unique_user_fortune_date UNIQUE (user_id, fortune_date)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_daily_fortune_user_date ON public.daily_fortune_records(user_id, fortune_date);
CREATE INDEX IF NOT EXISTS idx_daily_fortune_date ON public.daily_fortune_records(fortune_date);

-- RLS
ALTER TABLE public.daily_fortune_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own fortune" ON public.daily_fortune_records;
CREATE POLICY "Users can view own fortune"
ON public.daily_fortune_records FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own fortune" ON public.daily_fortune_records;
CREATE POLICY "Users can insert own fortune"
ON public.daily_fortune_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 2. 헬퍼 함수
-- ==========================================

-- 오늘의 운세 조회
CREATE OR REPLACE FUNCTION get_today_fortune(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    content text,
    lucky_color text,
    lucky_number integer,
    lucky_direction text,
    caution text,
    fortune_date date
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dfr.id,
        dfr.content,
        dfr.lucky_color,
        dfr.lucky_number,
        dfr.lucky_direction,
        dfr.caution,
        dfr.fortune_date
    FROM public.daily_fortune_records dfr
    WHERE dfr.user_id = p_user_id
        AND dfr.fortune_date = CURRENT_DATE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 30일 지난 운세 자동 정리
CREATE OR REPLACE FUNCTION cleanup_old_fortune_records()
RETURNS void AS $$
BEGIN
    DELETE FROM public.daily_fortune_records
    WHERE fortune_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
