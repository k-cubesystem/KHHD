-- 복(bok_points) 원자적 차감 RPC (Fable 검토 R5)
-- 기존 addBokPoints(-x)는 balance>=amount 가드가 없어 동시요청 시 음수/이중차감 가능(TOCTOU).
-- deduct_wallet_balance 패턴 미러: 성공 시 새 잔액, 부족/미존재 시 -2.
-- service_role 전용(서버 액션이 admin으로 호출). anon/authenticated/PUBLIC 실행 불가.

CREATE OR REPLACE FUNCTION public.deduct_bok_points(p_user_id uuid, p_amount integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE v_new_balance integer;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: amount must be positive, got %', p_amount;
  END IF;
  UPDATE public.bok_points
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id AND balance >= p_amount
  RETURNING balance INTO v_new_balance;
  IF NOT FOUND THEN
    RETURN -2;  -- 지갑 없음 또는 잔액 부족
  END IF;
  RETURN v_new_balance;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.deduct_bok_points(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_bok_points(uuid, integer) TO service_role;
