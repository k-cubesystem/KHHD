-- 결제 취소 「손실 처리」 계정 단위 상한 (반복 악용 차단)
--
-- 배경
--  복채를 이미 써버린 뒤에도 2차 동의만 하면 취소가 되고, 회수 못 한 몫은 회사 손실로 처리한다
--  (CEO 결정 — 사용자에게 청구하지 않는다). 기존 방어는 «결제 1건당 REQUESTED 1개»(부분 유니크
--  인덱스)뿐이라 계정 단위로는 「충전 → 전부 사용 → 전액 환불」을 무한 반복할 수 있었다.
--
-- 정책 (근거는 lib/domain/payment/loss-cap.ts 머리주석)
--  * 최근 365일 이동창 기준, 계정당 손실 처리 취소 **2회** 그리고 누적 손실 **10만원**.
--  * 판정은 «이미 쌓인 누적»만 본다 — 이번 요청분을 더해서 넘는지 보지 않는다.
--    (사전 합산으로 막으면 30만원 팩 사용자가 첫 요청부터 거절당해 구제 자체가 사라진다.)
--  * 손실 0인 취소(복채 미사용)는 상한과 무관하다.
--  * 마스터(admin)는 호출자가 p_exempt 로 면제시킨다 — 판정 기준은 lib/auth/privileges.ts 단일 출처.
--
-- 🔴 동시성
--  상한은 «개수/합계» 조건이라 행 잠금(FOR UPDATE)으로는 팬텀 INSERT 를 막지 못한다.
--  → 사용자 단위 **advisory xact lock** 아래에서 «집계 → 판정 → INSERT» 를 한 트랜잭션으로 묶는다.
--  기존 부분 유니크 인덱스(결제 1건당 REQUESTED 1개)는 그대로 두 번째 방어선으로 남는다.
--
-- 🔴 지갑 규율
--  이 함수는 wallets 를 건드리지 않는다. 회수는 여전히 clawback_payment_credits 단일 경로.

-- ── 1. 상한 집계 인덱스 ──
-- 이동창 안의 «손실이 난 살아있는 요청»만 훑는다. FAILED 는 환불이 안 나갔으므로 세지 않는다.
CREATE INDEX IF NOT EXISTS payment_cancel_requests_loss_window_idx
  ON public.payment_cancel_requests (user_id, created_at DESC)
  WHERE loss_credits > 0 AND status IN ('REQUESTED', 'SUCCEEDED');

COMMENT ON INDEX public.payment_cancel_requests_loss_window_idx IS
  '손실 처리 취소 상한(최근 365일 · 계정당 횟수/금액) 집계용.';

-- ── 2. 접수 게이트 RPC ──
-- 충전 취소 요청의 «유일한 생성 경로». 상한 검사와 요청 생성이 같은 트랜잭션·같은 잠금 아래 일어난다.
CREATE OR REPLACE FUNCTION public.open_charge_cancel_request(
  p_user_id uuid,
  p_payment_id uuid,
  p_idempotency_key text,
  p_reason_code text,
  p_reason_memo text,
  p_verdict text,
  p_accepted_loss boolean,
  p_granted_credits integer,
  p_ledger_remaining integer,
  p_recoverable_credits integer,
  p_loss_credits integer,
  p_loss_amount integer,
  p_gross_amount integer,
  p_fee_amount integer,
  p_refund_amount integer,
  p_within_withdrawal_period boolean,
  p_elapsed_days integer,
  p_exempt boolean DEFAULT false,
  p_stale_after_minutes integer DEFAULT 10,
  p_max_count integer DEFAULT 2,
  p_max_amount integer DEFAULT 100000,
  p_window_days integer DEFAULT 365
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- 🔴 호출자가 넘긴 값은 «완화 방향»으로 쓰지 못하게 하드 천장에서 자른다.
  --    상한을 실제로 늘리려면 이 마이그레이션을 고쳐야 한다(코드 버그나 잘못된 인자로 열리지 않게).
  v_max_count integer := LEAST(GREATEST(COALESCE(p_max_count, 2), 0), 5);
  v_max_amount integer := LEAST(GREATEST(COALESCE(p_max_amount, 100000), 0), 300000);
  v_window_days integer := GREATEST(COALESCE(p_window_days, 365), 365);
  v_stale_minutes integer := LEAST(GREATEST(COALESCE(p_stale_after_minutes, 10), 5), 60);
  v_loss_credits integer := GREATEST(COALESCE(p_loss_credits, 0), 0);
  v_window_start timestamptz;
  v_used_count integer := 0;
  v_used_amount integer := 0;
  v_oldest timestamptz;
  v_blocked text;
  v_next timestamptz;
  v_request_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_payment_id IS NULL OR p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'blocked_reason', 'INVALID_INPUT');
  END IF;

  -- 사용자 단위 직렬화. 같은 사람이 여러 결제를 동시에 취소해도 집계→판정→INSERT 가 겹치지 않는다.
  PERFORM pg_advisory_xact_lock(hashtext('charge_cancel_loss_cap'), hashtext(p_user_id::text));

  -- 응답을 못 받고 굳은 REQUESTED 는 실패로 확정한다. 두 가지를 동시에 푼다.
  --  (1) 결제 1건당 부분 유니크 인덱스의 영구 잠금
  --  (2) 죽은 요청이 상한 자리를 계속 차지하는 문제
  UPDATE public.payment_cancel_requests
     SET status = 'FAILED',
         toss_error_code = COALESCE(toss_error_code, 'STALE_REQUEST'),
         processed_at = COALESCE(processed_at, now())
   WHERE user_id = p_user_id
     AND status = 'REQUESTED'
     AND created_at < now() - make_interval(mins => v_stale_minutes);

  v_window_start := now() - make_interval(days => v_window_days);

  SELECT COUNT(*), COALESCE(SUM(GREATEST(loss_amount, 0)), 0), MIN(created_at)
    INTO v_used_count, v_used_amount, v_oldest
    FROM public.payment_cancel_requests
   WHERE user_id = p_user_id
     AND kind = 'CHARGE'
     AND loss_credits > 0
     AND status IN ('REQUESTED', 'SUCCEEDED')
     AND created_at >= v_window_start;

  IF v_loss_credits > 0 AND NOT COALESCE(p_exempt, false) THEN
    IF v_used_count >= v_max_count THEN
      v_blocked := 'COUNT_EXCEEDED';
    ELSIF v_used_amount >= v_max_amount THEN
      v_blocked := 'AMOUNT_EXCEEDED';
    END IF;
  END IF;

  IF v_blocked IS NOT NULL THEN
    -- 가장 오래된 손실 건이 창을 벗어나면 자리가 하나 돌아온다.
    v_next := v_oldest + make_interval(days => v_window_days);

    -- 어드민 가시성 — 「막힌 요청」도 원장에 남긴다. status='FAILED' 라 상한 집계에는 들지 않는다.
    -- 같은 결제로 하루에 여러 번 두드려도 기록은 하나만(로그 폭주 방지).
    IF NOT EXISTS (
      SELECT 1 FROM public.payment_cancel_requests
       WHERE user_id = p_user_id
         AND payment_id = p_payment_id
         AND toss_error_code LIKE 'LOSS_CAP_%'
         AND created_at >= now() - interval '24 hours'
    ) THEN
      INSERT INTO public.payment_cancel_requests (
        user_id, kind, payment_id, reason_code, reason_memo, verdict, accepted_loss,
        granted_credits, ledger_remaining, recoverable_credits, loss_credits, loss_amount,
        gross_amount, fee_amount, refund_amount, within_withdrawal_period, elapsed_days,
        status, idempotency_key, toss_error_code, toss_error_message, processed_at
      ) VALUES (
        p_user_id, 'CHARGE', p_payment_id, p_reason_code, p_reason_memo, p_verdict, COALESCE(p_accepted_loss, false),
        GREATEST(COALESCE(p_granted_credits, 0), 0), GREATEST(COALESCE(p_ledger_remaining, 0), 0),
        GREATEST(COALESCE(p_recoverable_credits, 0), 0), v_loss_credits, GREATEST(COALESCE(p_loss_amount, 0), 0),
        GREATEST(COALESCE(p_gross_amount, 0), 0), GREATEST(COALESCE(p_fee_amount, 0), 0),
        0, p_within_withdrawal_period, p_elapsed_days,
        'FAILED', p_idempotency_key, 'LOSS_CAP_' || v_blocked,
        format('손실 처리 상한 초과 — 최근 %s일 %s건 / %s원', v_window_days, v_used_count, v_used_amount),
        now()
      );
    END IF;

    RETURN jsonb_build_object(
      'ok', false,
      'blocked_reason', v_blocked,
      'used_count', v_used_count,
      'used_amount', v_used_amount,
      'max_count', v_max_count,
      'max_amount', v_max_amount,
      'next_available_at', v_next
    );
  END IF;

  INSERT INTO public.payment_cancel_requests (
    user_id, kind, payment_id, reason_code, reason_memo, verdict, accepted_loss,
    granted_credits, ledger_remaining, recoverable_credits, loss_credits, loss_amount,
    gross_amount, fee_amount, refund_amount, within_withdrawal_period, elapsed_days,
    status, idempotency_key
  ) VALUES (
    p_user_id, 'CHARGE', p_payment_id, p_reason_code, p_reason_memo, p_verdict, COALESCE(p_accepted_loss, false),
    GREATEST(COALESCE(p_granted_credits, 0), 0), GREATEST(COALESCE(p_ledger_remaining, 0), 0),
    GREATEST(COALESCE(p_recoverable_credits, 0), 0), v_loss_credits, GREATEST(COALESCE(p_loss_amount, 0), 0),
    GREATEST(COALESCE(p_gross_amount, 0), 0), GREATEST(COALESCE(p_fee_amount, 0), 0),
    GREATEST(COALESCE(p_refund_amount, 0), 0), p_within_withdrawal_period, p_elapsed_days,
    'REQUESTED', p_idempotency_key
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'used_count', v_used_count,
    'used_amount', v_used_amount,
    'exempt', COALESCE(p_exempt, false) AND v_loss_credits > 0
  );
EXCEPTION
  -- 결제 1건당 REQUESTED 부분 유니크 인덱스(두 번째 방어선) 또는 멱등키 충돌.
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'blocked_reason', 'DUPLICATE_OPEN_REQUEST');
END;
$$;

-- 이 함수는 요청 원장에 직접 INSERT 한다 — 로그인 유저가 부르면 상한 인자를 마음대로 넘길 수 있다.
REVOKE ALL ON FUNCTION public.open_charge_cancel_request(
  uuid, uuid, text, text, text, text, boolean, integer, integer, integer, integer, integer,
  integer, integer, integer, boolean, integer, boolean, integer, integer, integer, integer
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.open_charge_cancel_request(
  uuid, uuid, text, text, text, text, boolean, integer, integer, integer, integer, integer,
  integer, integer, integer, boolean, integer, boolean, integer, integer, integer, integer
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_charge_cancel_request(
  uuid, uuid, text, text, text, text, boolean, integer, integer, integer, integer, integer,
  integer, integer, integer, boolean, integer, boolean, integer, integer, integer, integer
) TO service_role;

COMMENT ON FUNCTION public.open_charge_cancel_request IS
  '복채 충전 취소 요청 접수 게이트. advisory lock 아래에서 손실 처리 상한(최근 365일 · 계정당 2회 / 10만원)을 '
  '검사하고 통과 시에만 요청 행을 만든다. service_role 전용. 반환 jsonb: ok/request_id/blocked_reason/next_available_at.';
