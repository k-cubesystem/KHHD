-- Phase 25: Membership Overhaul & Schema Migration
-- Date: 2026-01-26
-- Description: Implement 3-Tier Membership System and Daily Limits

-- 1. Ensure table exists (Repair if missing)
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

-- 2. Add Unique Constraint on Name for Upsert
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'membership_plans_name_key') THEN
        ALTER TABLE public.membership_plans ADD CONSTRAINT membership_plans_name_key UNIQUE (name);
    END IF;
END $$;

-- 3. Add New Columns for 3-Tier System
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership_plans' AND column_name = 'tier') THEN
        ALTER TABLE public.membership_plans ADD COLUMN tier TEXT CHECK (tier IN ('SINGLE', 'FAMILY', 'BUSINESS'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership_plans' AND column_name = 'daily_talisman_limit') THEN
        ALTER TABLE public.membership_plans ADD COLUMN daily_talisman_limit INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership_plans' AND column_name = 'relationship_limit') THEN
        ALTER TABLE public.membership_plans ADD COLUMN relationship_limit INTEGER DEFAULT 3;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership_plans' AND column_name = 'storage_limit') THEN
        ALTER TABLE public.membership_plans ADD COLUMN storage_limit INTEGER DEFAULT 10;
    END IF;
END $$;

-- 4. Migrate Existing Plan ('해화 멤버십' -> '싱글 멤버십')
UPDATE public.membership_plans 
SET name = '싱글 멤버십' 
WHERE name = '해화 멤버십';

-- 5. Upsert Plans (Single / Family / Business)

-- SINGLE (싱글)
INSERT INTO public.membership_plans (name, tier, price, daily_talisman_limit, relationship_limit, storage_limit, talismans_per_period, description, sort_order)
VALUES ('싱글 멤버십', 'SINGLE', 9900, 10, 3, 10, 10, '나를 위한 데일리 운세 루틴', 1)
ON CONFLICT (name) DO UPDATE SET
tier = 'SINGLE', price = 9900, daily_talisman_limit = 10, relationship_limit = 3, storage_limit = 10, talismans_per_period = 10, sort_order = 1;

-- FAMILY (패밀리)
INSERT INTO public.membership_plans (name, tier, price, daily_talisman_limit, relationship_limit, storage_limit, talismans_per_period, description, sort_order)
VALUES ('패밀리 멤버십', 'FAMILY', 29900, 30, 10, 50, 50, '우리 가족 모두를 위한 프리미엄 혜택', 2)
ON CONFLICT (name) DO UPDATE SET
tier = 'FAMILY', price = 29900, daily_talisman_limit = 30, relationship_limit = 10, storage_limit = 50, talismans_per_period = 50, sort_order = 2;

-- BUSINESS (비즈니스)
INSERT INTO public.membership_plans (name, tier, price, daily_talisman_limit, relationship_limit, storage_limit, talismans_per_period, description, sort_order)
VALUES ('비즈니스 멤버십', 'BUSINESS', 99000, 100, 50, 99999, 200, '전문가를 위한 무제한 분석 솔루션', 3)
ON CONFLICT (name) DO UPDATE SET
tier = 'BUSINESS', price = 99000, daily_talisman_limit = 100, relationship_limit = 50, storage_limit = 99999, talismans_per_period = 200, sort_order = 3;

-- 6. Create Daily Usage Logs Table
CREATE TABLE IF NOT EXISTS public.daily_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    usage_date DATE DEFAULT CURRENT_DATE,
    talismans_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, usage_date)
);

-- RLS
ALTER TABLE public.daily_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own logs" ON public.daily_usage_logs;
CREATE POLICY "Users can view own logs" ON public.daily_usage_logs FOR SELECT USING (auth.uid() = user_id);

-- 7. Grant Permissions (Assuming authenticated role needs access)
GRANT ALL ON TABLE public.membership_plans TO authenticated;
GRANT ALL ON TABLE public.membership_plans TO service_role;
GRANT ALL ON TABLE public.daily_usage_logs TO authenticated;
GRANT ALL ON TABLE public.daily_usage_logs TO service_role;

SELECT 'Migration Phase 25 Completed' as result;
