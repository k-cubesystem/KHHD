-- Supabase에서 payments 테이블 확인 쿼리
-- SQL Editor에서 실행하세요

-- 1. payments 테이블이 존재하는지 확인
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'payments'
) AS payments_table_exists;

-- 2. payments 테이블 구조 확인 (테이블이 있다면)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;

-- 3. 현재 저장된 결제 내역 확인
SELECT * FROM public.payments ORDER BY created_at DESC LIMIT 10;
