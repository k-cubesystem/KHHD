-- ============================================
-- Phase 8: Admin System Migration
-- 작성일: 2026-01-22
-- ============================================

-- 1. Profiles 테이블에 Role 컬럼 추가
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles 
        ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
        
        -- Check constraint 추가 (user, admin, tester)
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'tester'));
    END IF;
END $$;

-- 2. Price Plans 테이블 생성
CREATE TABLE IF NOT EXISTS public.price_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    badge_text TEXT,
    features TEXT[], -- 배열 형태로 저장
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.1 기존 테이블에 UNIQUE 제약조건 추가 (없는 경우에만)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'price_plans_name_key'
    ) THEN
        ALTER TABLE public.price_plans ADD CONSTRAINT price_plans_name_key UNIQUE (name);
    END IF;
END $$;

-- 3. 초기 가격 데이터 시딩 (Seeding) - 데이터가 없을 때만
INSERT INTO public.price_plans (name, credits, price, description, badge_text, features)
SELECT '운명 분석 1회', 1, 9900, '가장 기본적인 분석 패키지', NULL, ARRAY['프리미엄 AI 리포트', '천지인 통합 분석', '영구 소장 가능']
WHERE NOT EXISTS (SELECT 1 FROM public.price_plans WHERE name = '운명 분석 1회');

INSERT INTO public.price_plans (name, credits, price, description, badge_text, features)
SELECT '운명 분석 3회', 3, 24900, '인연들과 함께 나누는 실속형', '가장 인기', ARRAY['1회당 8,300원 (16% 할인)', '프리미엄 AI 리포트', '가족/친구 분석 최적화', '영구 소장 가능']
WHERE NOT EXISTS (SELECT 1 FROM public.price_plans WHERE name = '운명 분석 3회');

INSERT INTO public.price_plans (name, credits, price, description, badge_text, features)
SELECT '운명 분석 5회', 5, 39900, '가장 합리적인 대용량 패키지', '최저가', ARRAY['1회당 7,980원 (20% 할인)', '프리미엄 AI 리포트', '무제한 인연 분석', '영구 소장 가능', '분석 비록 우선 생성']
WHERE NOT EXISTS (SELECT 1 FROM public.price_plans WHERE name = '운명 분석 5회');

-- 4. RLS 정책 업데이트 (관리자는 모든 권한 가짐)

-- 4.1 Profiles 정책
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users and Admins can view profiles" ON public.profiles;
CREATE POLICY "Users and Admins can view profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id -- 본인
  OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' -- 또는 관리자
);

-- 4.2 Payments 정책
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users and Admins can view payments" ON public.payments;
CREATE POLICY "Users and Admins can view payments"
ON public.payments FOR SELECT
USING (
  user_id = auth.uid()
  OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 4.3 Price Plans 정책 (누구나 조회, 관리자만 수정)
ALTER TABLE public.price_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active plans" ON public.price_plans;
CREATE POLICY "Anyone can view active plans"
ON public.price_plans FOR SELECT
USING (true); -- 누구나 볼 수 있음 (가격표니까)

DROP POLICY IF EXISTS "Admins can manage plans" ON public.price_plans;
CREATE POLICY "Admins can manage plans"
ON public.price_plans FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 5. User Role 업데이트 함수 (관리자용)
-- 보안상 Admin만 호출 가능하도록 RLS로 제어되지만, 함수 내부에서도 체크 권장
CREATE OR REPLACE FUNCTION update_user_role(target_user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
  -- 호출자가 admin인지 확인
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can change roles';
  END IF;

  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 완료 확인 쿼리
-- ============================================
SELECT * FROM public.price_plans;
