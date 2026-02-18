-- ============================================
-- 99. 초기 데이터 및 관리자 설정
-- ============================================

-- ==========================================
-- 1. 관리자 권한 부여
-- ==========================================
-- 주의: 실제 운영 환경에서는 이 파일을 수정하여
-- 실제 관리자 이메일로 변경하세요.

-- 특정 이메일에 관리자 권한 부여
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
    SELECT id
    FROM auth.users
    WHERE email = 'pdkshno1@gmail.com'
);

-- ==========================================
-- 2. 이메일 동기화 (기존 유저)
-- ==========================================
-- auth.users의 email을 profiles.email로 동기화
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE public.profiles.id = auth.users.id
AND public.profiles.email IS NULL;

-- ==========================================
-- 3. 기존 결제 데이터를 월렛으로 마이그레이션
-- ==========================================
-- payments 테이블의 credits_remaining을 wallets.balance로 이관
INSERT INTO public.wallets (user_id, balance)
SELECT
    user_id,
    COALESCE(SUM(credits_remaining), 0) as balance
FROM public.payments
WHERE status IN ('completed', 'test_charge')
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE
SET balance = wallets.balance + EXCLUDED.balance;

-- ==========================================
-- 4. 스키마 리로드 알림
-- ==========================================
NOTIFY pgrst, 'reload schema';
