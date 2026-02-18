-- FIX: Infinite recursion on profiles UPDATE
-- 문제: 프로필 업데이트 시 RLS 정책이 다시 profiles를 조회하며 무한 루프 발생 가능성

-- 1. 기존 UPDATE 정책 삭제 (이름이 확실하지 않으므로 가능한 이름 시도)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 2. 안전한 UPDATE 정책 생성
-- 2-1. 본인 프로필 수정 (가장 흔한 케이스, 관리자 체크 없이 ID만 확인)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING ( id = auth.uid() )
WITH CHECK ( id = auth.uid() );

-- 2-2. 관리자 전용 수정 (SECURITY DEFINER 함수인 is_admin 사용)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING ( is_admin() );

-- 3. INSERT 정책도 안전하게 확인
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK ( id = auth.uid() );
