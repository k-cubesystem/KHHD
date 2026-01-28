-- Consolidated Schema Cleanup & Fix (2026-01-25)
-- Description: Unifies recent Admin, Payment, and Profile fixes into a single reliable source of truth.
-- This file is idempotent (safe to run multiple times).

-- ==========================================
-- 1. Security & Admin Functions
-- ==========================================

-- Function to check admin status safely (Bypasses RLS recursion using SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- ==========================================
-- 2. Profiles Table Enhancements
-- ==========================================

-- Ensure 'email' column exists (Critical for Admin Dashboard)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
    END IF;
END $$;

-- Ensure 'role' column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user';
    END IF;
END $$;

-- Ensure 'avatar_url' column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url text;
    END IF;
END $$;

-- Profiles RLS Policies (Fixing Recursion with is_admin())
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  is_admin() OR auth.uid() = id
);

DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles"
ON profiles FOR UPDATE
TO authenticated
USING ( is_admin() );

-- ==========================================
-- 3. Payments Table (Re-definition/Fix)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_key TEXT NOT NULL,
    order_id TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL,
    credits_purchased INTEGER NOT NULL DEFAULT 1,
    credits_remaining INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

-- Payments RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments"
ON payments FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments"
ON payments FOR SELECT
TO authenticated
USING (
  is_admin() OR auth.uid() = user_id
);

-- ==========================================
-- 4. AI Prompts Table (For Dynamic Personas)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.ai_prompts (
    key text PRIMARY KEY,
    label text NOT NULL,
    category text NOT NULL,
    template text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- AI Prompts RLS
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view prompts" ON ai_prompts;
CREATE POLICY "Admins can view prompts" ON public.ai_prompts
    FOR SELECT TO authenticated
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can update prompts" ON ai_prompts;
CREATE POLICY "Admins can update prompts" ON public.ai_prompts
    FOR UPDATE TO authenticated
    USING (is_admin());

-- ==========================================
-- 5. Triggers
-- ==========================================

-- Trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. Schema Reload Notifier
-- ==========================================
NOTIFY pgrst, 'reload schema';
