-- 이 쿼리를 Supabase SQL Editor에서 실행하세요
-- 방금 결제한 내역이 저장되었는지 확인합니다

SELECT 
    id,
    user_id,
    order_id,
    amount,
    credits_purchased,
    credits_remaining,
    status,
    created_at
FROM public.payments
WHERE order_id = 'HHD_1769047583812_7925'
ORDER BY created_at DESC;

-- 만약 결과가 없다면, payments 테이블 자체가 없거나
-- 결제 승인 후 DB 저장 로직에 문제가 있는 것입니다.
