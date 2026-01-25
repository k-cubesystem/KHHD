-- Repair Membership Plans
-- Run this in Supabase SQL Editor if 'membership_plans' table is missing or empty

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    interval TEXT DEFAULT 'MONTH' CHECK (interval IN ('MONTH', 'YEAR')),
    talismans_per_period INTEGER NOT NULL DEFAULT 10,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert Default Data (Idempotent)
INSERT INTO public.membership_plans (name, description, price, interval, talismans_per_period, features, sort_order)
SELECT
    '해화 멤버십',
    '매월 부적 10장 + 오늘의 운세 무제한',
    9900,
    'MONTH',
    10,
    '{
        "daily_fortune": true,
        "pdf_archive": true,
        "kakao_daily": true,
        "bonus_rate": 10
    }'::jsonb,
    1
WHERE NOT EXISTS (
    SELECT 1 FROM public.membership_plans WHERE name = '해화 멤버십'
);

-- 3. Enable RLS
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Drop first to avoid errors)
DROP POLICY IF EXISTS "membership_plans_select_all" ON public.membership_plans;
CREATE POLICY "membership_plans_select_all" ON public.membership_plans
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "membership_plans_admin_all" ON public.membership_plans;
CREATE POLICY "membership_plans_admin_all" ON public.membership_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
