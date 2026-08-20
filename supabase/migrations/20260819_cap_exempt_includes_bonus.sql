-- 한도 면제 풀에 BONUS 포함 (라이브 적용됨 — schema_migrations 20260819150323).
--
-- 배경: 20260712_charge_exempt_remaining_fn.sql 은 CHARGE 만 셌다. 환불·이벤트로 받은
-- BONUS 복채는 일일 한도 면제 풀에 안 들어가 «보너스 복채를 한 푼도 못 쓰는» P0 가 됐다
-- (2026-08-19 수복, 커밋 39beb6b 의 서버 코드와 짝). 멤버십 주기 지급은 type='SUBSCRIPTION'
-- 이라 여전히 면제 풀 밖 — «하루 상한 대상은 멤버십 지급분뿐» 규칙 유지.
--
-- 🔴 이 파일은 라이브에 이미 적용된 함수의 repo 정본이다. DB 재구축 시 이 파일이 빠지면
--    20260712 구버전이 복원되어 위 P0 가 부활한다(2026-07-04 재구축 소실 전례).

CREATE OR REPLACE FUNCTION public.get_charge_exempt_remaining(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT GREATEST(0,
    COALESCE((SELECT SUM(amount) FROM wallet_transactions
              WHERE user_id = p_user_id AND type IN ('CHARGE', 'BONUS') AND amount > 0), 0)
    - COALESCE((SELECT SUM(-amount) FROM wallet_transactions
                WHERE user_id = p_user_id AND amount < 0), 0)
  )::bigint;
$$;

REVOKE ALL ON FUNCTION public.get_charge_exempt_remaining(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_charge_exempt_remaining(uuid) FROM anon, authenticated;
