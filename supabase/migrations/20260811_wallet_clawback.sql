-- 결제 취소 시 지급 복채 회수 (P1 금전 손실 수복)
--
-- 결함: 토스 취소 웹훅이 payments.status 만 건드리고(그마저 CHECK 제약에 막혀 실패)
--       충전으로 지급된 복채를 회수하지 않아, 취소 후에도 지갑 복채가 남아 사용됐다.
--
-- 설계
--  * 원장(ledger) = payments.credits_purchased(지급 총량) ↔ credits_remaining(미회수 지급분).
--    회수는 "누적 취소 비율로 잡은 목표 − 이미 회수분" 의 **증분**만 적용 → 재전송·부분취소 다중 발생에 수렴.
--  * 멱등 2중: (1) 취소 거래 단위 고유 feature_key 유니크 인덱스, (2) 원장 증분 계산(delta<=0 이면 무동작).
--  * 잔액 부족 시 음수 금지 — 가능한 만큼만 회수하고 부족분(shortfall)을 반환한다(호출자가 Sentry 경보).
--  * wallets 직접 UPDATE 는 이 SECURITY DEFINER 함수 안에서만 일어난다(RPC 경유 규율).

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cancelled_amount integer NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

COMMENT ON COLUMN public.payments.cancelled_amount IS '누적 취소 금액(원). 부분 취소 합계.';
COMMENT ON COLUMN public.payments.cancelled_at IS '최초 취소 감지 시각(웹훅).';

-- 멱등 1: 취소 거래(transactionKey) 당 회수 트랜잭션 1건.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_clawback_key_uidx
  ON public.wallet_transactions (feature_key)
  WHERE feature_key LIKE 'PAYMENT_CANCEL:%';

CREATE OR REPLACE FUNCTION public.clawback_payment_credits(
  p_payment_id uuid,
  p_target_clawed integer,
  p_idempotency_key text,
  p_cancelled_amount integer,
  p_fully_cancelled boolean,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_granted integer;
  v_remaining integer;
  v_already integer;
  v_delta integer;
  v_balance integer;
  v_clawed integer;
  v_shortfall integer;
BEGIN
  IF p_idempotency_key IS NULL OR p_idempotency_key NOT LIKE 'PAYMENT_CANCEL:%' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'INVALID_KEY', 'clawed', 0, 'shortfall', 0);
  END IF;

  SELECT user_id, credits_purchased, credits_remaining
    INTO v_user_id, v_granted, v_remaining
    FROM public.payments
   WHERE id = p_payment_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'NO_PAYMENT', 'clawed', 0, 'shortfall', 0);
  END IF;

  -- 멱등 1: 같은 취소 거래를 이미 처리했으면 원장도 건드리지 않는다.
  IF EXISTS (SELECT 1 FROM public.wallet_transactions WHERE feature_key = p_idempotency_key) THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'ALREADY_PROCESSED', 'clawed', 0, 'shortfall', 0);
  END IF;

  -- 멱등 2: 원장 기준 증분만 회수.
  v_already := GREATEST(0, COALESCE(v_granted, 0) - COALESCE(v_remaining, 0));
  v_delta := LEAST(
    GREATEST(COALESCE(p_target_clawed, 0) - v_already, 0),
    GREATEST(COALESCE(v_remaining, 0), 0)
  );

  -- 취소 사실은 회수량과 무관하게 기록한다(전액 취소면 status 도 refunded 로).
  UPDATE public.payments
     SET credits_remaining = credits_remaining - v_delta,
         cancelled_amount = GREATEST(cancelled_amount, GREATEST(COALESCE(p_cancelled_amount, 0), 0)),
         cancelled_at = COALESCE(cancelled_at, now()),
         status = CASE WHEN p_fully_cancelled THEN 'refunded' ELSE status END,
         updated_at = now()
   WHERE id = p_payment_id;

  IF v_delta <= 0 THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'NOTHING_TO_CLAW', 'clawed', 0, 'shortfall', 0);
  END IF;

  -- 잔액 부족 시 음수 금지 — 가능한 만큼만.
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    v_balance := 0;
  END IF;

  v_clawed := LEAST(v_delta, GREATEST(COALESCE(v_balance, 0), 0));
  v_shortfall := v_delta - v_clawed;

  INSERT INTO public.wallet_transactions (user_id, amount, type, feature_key, description)
  VALUES (
    v_user_id,
    -v_clawed,
    'REFUND',
    p_idempotency_key,
    COALESCE(p_description, format('결제 취소 복채 회수 %s만냥', v_clawed))
  );

  IF v_clawed > 0 THEN
    UPDATE public.wallets
       SET balance = balance - v_clawed,
           updated_at = now()
     WHERE user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'applied', true,
    'reason', 'OK',
    'clawed', v_clawed,
    'shortfall', v_shortfall,
    'delta', v_delta,
    'balance', GREATEST(COALESCE(v_balance, 0), 0) - v_clawed,
    'user_id', v_user_id
  );
EXCEPTION
  -- 동시 재전송이 유니크 인덱스에 걸리면 블록 전체(원장 UPDATE 포함)가 롤백되어 완전 무동작이 된다.
  WHEN unique_violation THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'ALREADY_PROCESSED', 'clawed', 0, 'shortfall', 0);
END;
$$;

-- 발행·회수 계열은 service_role 전용. 로그인 유저가 직접 부르면 임의 결제의 원장을 조작할 수 있다.
REVOKE ALL ON FUNCTION public.clawback_payment_credits(uuid, integer, text, integer, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clawback_payment_credits(uuid, integer, text, integer, boolean, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clawback_payment_credits(uuid, integer, text, integer, boolean, text) TO service_role;

COMMENT ON FUNCTION public.clawback_payment_credits IS
  '결제 취소 지급 복채 회수(멱등·음수 잔액 금지). service_role 전용. 반환 jsonb: applied/reason/clawed/shortfall.';
