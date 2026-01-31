-- 현재 로그인한 사용자를 admin으로 설정
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- 1. 먼저 현재 profiles 테이블 확인
SELECT id, email, role FROM auth.users LIMIT 5;

-- 2. 원하는 이메일의 사용자를 admin으로 설정 (이메일 변경 필요)
UPDATE profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com' LIMIT 1);

-- 3. 확인
SELECT p.id, u.email, p.role 
FROM profiles p 
JOIN auth.users u ON p.id = u.id 
WHERE p.role = 'admin';
