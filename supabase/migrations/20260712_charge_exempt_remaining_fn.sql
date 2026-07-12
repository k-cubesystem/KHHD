-- 충전(CHARGE) 잔여 복채 회계 함수 (라이브 적용됨).
--
-- 정책(사용자 확정 2026-07-12): AI 기능 일일 복채 한도는 무료분에만 적용, 충전분은 캡 무관.
-- 충전 잔여 = 충전총액 − 총사용액(충전분 우선소진 가정 → 비누수 하한).
-- 한도 초과 소비(computeSpendPlan.overCap)는 이 값 범위에서만 허용된다.
--
-- read-only(STABLE) + service_role 전용. anon/authenticated 직접 호출 차단.

CREATE OR REPLACE FUNCTION public.get_charge_exempt_remaining(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT GREATEST(0,
    COALESCE((SELECT SUM(amount) FROM wallet_transactions
              WHERE user_id = p_user_id AND type = 'CHARGE' AND amount > 0), 0)
    - COALESCE((SELECT SUM(-amount) FROM wallet_transactions
                WHERE user_id = p_user_id AND amount < 0), 0)
  )::bigint;
$$;

REVOKE ALL ON FUNCTION public.get_charge_exempt_remaining(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_charge_exempt_remaining(uuid) FROM anon, authenticated;
