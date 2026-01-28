-- [긴급] 관리자 권한 부여 및 조회 권한 문제 해결용 스크립트

-- 1. 가장 중요: 본인의 이메일을 'admin' 권한으로 승격시킵니다.
-- 아래 'your_email@example.com' 부분을 본인의 이메일로 바꿔서 실행하세요!
-- 예: UPDATE profiles SET role = 'admin' WHERE email = 'test@test.com';
-- 만약 이메일 컬럼이 비어있다면, auth.users에서 가져와서 채워넣어야 합니다.

-- 1-1. auth.users 정보를 기반으로 profiles의 이메일과 권한을 업데이트 (매우 강력한 한 방)
UPDATE public.profiles
SET 
  email = users.email,
  role = 'admin' -- 주의: 가입된 모든 유저를 관리자로 만들 수 있으니 테스트용으로만 쓰세요. 특정 유저만 하려면 아래 WHERE 조건을 푸세요.
FROM auth.users
WHERE public.profiles.id = auth.users.id
-- AND auth.users.email = '본인이메일@gmail.com' -- 특정 이메일만 관리자로 만들고 싶다면 주석 해제 후 수정
;

-- 2. profiles 조회 권한 재설정 (Admin은 무조건 다 볼 수 있음)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true); -- 테스트를 위해 일단 모든 로그인 유저에게 공개 (문제 해결 확인용)
-- 보안을 위해 나중에: USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'); 로 변경 권장

-- 3. payments 조회 권한 재설정
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments"
ON payments FOR SELECT
TO authenticated
USING (true); -- 테스트를 위해 일단 모든 로그인 유저에게 공개

-- 4. ai_prompts 테이블 권한도 확실하게
DROP POLICY IF EXISTS "Admins can view prompts" ON ai_prompts;
CREATE POLICY "Admins can view prompts" ON ai_prompts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can update prompts" ON ai_prompts;
CREATE POLICY "Admins can update prompts" ON ai_prompts FOR UPDATE TO authenticated USING (true);
