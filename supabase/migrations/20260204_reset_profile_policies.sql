-- ==========================================
-- RESET ALL PROFILES POLICIES
-- 무한 재귀 문제를 해결하기 위해 프로필 테이블의 모든 정책을 초기화합니다.
-- ==========================================

-- 1. 기존 정책 모두 삭제 (이름을 몰라도 되도록 DO 블록 사용은 복잡하니, 일반적인 이름들 삭제 시도)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles; -- 이름 변형 대비
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- 2. is_admin() 함수 안전하게 재정의 (SECURITY DEFINER 필수)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- RLS를 우회하여 실행됨 (무한 루프 방지 핵심)
SET search_path = public
AS $$
BEGIN
  -- 관리자 역할 확인
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- 3. 필수 정책 재생성

-- A. 조회 (SELECT)
-- 누구나 자신의 프로필은 볼 수 있음 (이미 공개 프로필 컨셉이라면 누구나 볼 수 있게 해도 됨)
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING ( true );

-- B. 입력 (INSERT)
-- 인증된 사용자는 자신의 프로필을 생성 가능
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() = id );

-- C. 수정 (UPDATE) - 여기가 문제였음
-- 1) 본인은 본인 것만 수정 (is_admin 체크 안함 -> 루프 방지)
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );

-- 2) 관리자는 모든 프로필 수정 (is_admin 함수 사용)
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING ( is_admin() );

-- D. 삭제 (DELETE)
-- 본인은 본인 것만 삭제 가능 (선택 사항)
CREATE POLICY "Users can delete own profile"
ON public.profiles FOR DELETE
USING ( auth.uid() = id );
