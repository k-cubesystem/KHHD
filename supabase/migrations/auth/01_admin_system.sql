-- ============================================
-- 01. 관리자 시스템 (Admin System)
-- ============================================

-- ==========================================
-- 1. Admin 권한 체크 함수 (RLS 재귀 방지)
-- ==========================================
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
-- 2. Profiles 테이블 - 관리자 RLS 정책
-- ==========================================

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (is_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (is_admin());

-- ==========================================
-- 3. Payments 테이블 - 관리자 RLS 정책
-- ==========================================

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT
TO authenticated
USING (is_admin() OR auth.uid() = user_id);

-- ==========================================
-- 4. AI Prompts 테이블 (관리자 전용)
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

-- RLS
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view prompts" ON public.ai_prompts;
CREATE POLICY "Admins can view prompts"
ON public.ai_prompts
FOR SELECT TO authenticated
USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage prompts" ON public.ai_prompts;
CREATE POLICY "Admins can manage prompts"
ON public.ai_prompts
FOR ALL TO authenticated
USING (is_admin());

-- 트리거
DROP TRIGGER IF EXISTS update_ai_prompts_updated_at ON public.ai_prompts;
CREATE TRIGGER update_ai_prompts_updated_at
  BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
