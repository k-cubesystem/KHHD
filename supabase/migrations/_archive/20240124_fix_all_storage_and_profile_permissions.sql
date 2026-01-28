-- [종합 해결/All-in-One Fix]
-- 이 스크립트는 프로필 이미지 저장과 관련된 모든 권한과 테이블 설정을 한 번에 해결합니다.
-- 에러가 계속된다면 이 전체 쿼리를 다시 실행해주세요.

-- 1. profiles 테이블에 avatar_url 컬럼 확정 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Storage Bucket 생성 (profile-images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage 정책 초기화 (기존 정책 삭제 후 재생성)
DROP POLICY IF EXISTS "Public View" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner Update" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;

-- 3-1. 누구나 조회 가능 (프로필 사진이니까)
CREATE POLICY "Public View"
ON storage.objects FOR SELECT TO public USING (bucket_id = 'profile-images');

-- 3-2. 로그인한 유저는 업로드 가능
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-images');

-- 3-3. 자기 파일 수정 (owner)
CREATE POLICY "Owner Update"
ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profile-images');

-- 3-4. 자기 파일 삭제
CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile-images');

-- 4. Profiles 테이블 업데이트 권한 확인 (RLS)
-- 사용자가 자신의 'profiles' 정보를 수정할 수 있어야 합니다.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Profiles 테이블 조회 권한
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);
