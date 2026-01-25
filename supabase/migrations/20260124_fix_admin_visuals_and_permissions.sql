-- [관리자 권한 및 이메일 컬럼 복구 스크립트]
-- 관리자 페이지(User/Payment)가 500 에러 없이 작동하려면 이 스크립트가 필수입니다.

-- 1. profiles 테이블에 'email' 컬럼이 없으면 500 에러가 납니다. 추가합니다.
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email text;

-- 2. 관리자(role='admin')가 모든 유저 리스트를 볼 수 있도록 RLS 정책을 추가합니다.
-- 기존 정책 충돌 방지를 위해 DROP 후 CREATE
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  OR 
  auth.uid() = id -- 본인은 본인거 볼 수 있음
);

-- 3. 관리자가 모든 결제 내역을 볼 수 있도록 RLS 정책 추가
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments"
ON payments FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  OR
  auth.uid() = user_id -- 본인 결제 내역 볼 수 있음
);

-- 4. 관리자 권한 부여 (현재 로그인한 유저를 관리자로 만드세요)
-- 아래 UUID를 실제 본인의 User ID로 바꿔서 실행하면 관리자가 됩니다.
-- UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_UUID_HERE';
