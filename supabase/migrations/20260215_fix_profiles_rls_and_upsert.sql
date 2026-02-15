-- ============================================================
-- profiles 테이블 RLS 정책 추가
-- 문제: INSERT 정책이 없어서 신규 유저 프로필 생성 불가
-- ============================================================

-- 인증된 유저가 본인 프로필을 직접 생성할 수 있도록 INSERT 정책 추가
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- UPDATE 정책에 email 컬럼도 포함 (기존 정책 유지)
-- 이미 존재하므로 재확인만
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
