-- ============================================
-- 데이터 확인 스크립트
-- Supabase Dashboard → SQL Editor에서 실행
-- ============================================

-- 1. 내 프로필 확인
SELECT
  id,
  full_name,
  email,
  birth_date,
  birth_time,
  calendar_type,
  gender
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE';  -- 이메일을 당신의 이메일로 변경
-- 예: WHERE email = 'test@example.com';

-- 2. View 확인 (본인 데이터)
SELECT * FROM v_destiny_targets WHERE target_type = 'self';

-- 3. RPC 함수 테스트 (YOUR_USER_ID 교체)
SELECT * FROM get_user_destiny_targets('YOUR_USER_ID_HERE');

-- 4. 가족 데이터 확인
SELECT
  id,
  name,
  relationship,
  birth_date
FROM family_members;
