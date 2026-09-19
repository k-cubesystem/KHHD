-- =====================================================================
-- 이용권 전환 — 배포 전 리뷰 결함 수정분 (2026-09-19)
--
-- 🔴 이 파일도 «옛 코드가 그대로 돌아도 안전한 것»만 담는다 — 20260918_voucher_system.sql 과 같은 단계(코드 배포 전).
--    옛 코드는 ent_* 를 부르지 않고, 취소 접수 RPC 의 새 검사는 이용권 결제(bokchae_type='pass')에만 걸린다.
-- =====================================================================


-- ── 1. 취소 접수 중인 결제의 이용권은 쓰지 못한다 ─────────────────────
-- 셀프 취소는 «판정 → 토스 호출 → 회수» 순서다. 토스를 기다리는 사이에 이용권이 쓰이면
-- 접수 때 계산한 환불액과 실제 미사용분이 어긋난다. 접수 행(REQUESTED)이 살아 있는 동안 소비를 막는다.
-- 굳은 요청(응답 없이 죽은 것)은 10분 뒤 자동으로 풀린다 — open_charge_cancel_request 의 정리 기준과 같다.

CREATE OR REPLACE FUNCTION public.ent_consume(
  p_user_id uuid,
  p_feature_key text,
  p_units integer,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_quota integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer := 0;
  v_member_avail integer := 0;
  v_pass_avail integer := 0;
  v_need integer;
  v_take integer;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_from_member integer := 0;
  v_from_pass integer := 0;
  v_hold_since timestamptz := now() - interval '10 minutes';
  r record;
BEGIN
  IF p_user_id IS NULL OR p_feature_key IS NULL OR p_units IS NULL OR p_units <= 0 OR p_units > 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_INPUT');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('entitlement:' || p_user_id::text));

  IF COALESCE(p_quota, 0) > 0 AND p_window_start IS NOT NULL AND p_window_end IS NOT NULL
     AND p_window_end > now() AND p_window_start <= now()
     AND NOT EXISTS (
       SELECT 1 FROM public.payment_cancel_requests c
        WHERE c.user_id = p_user_id AND c.kind = 'MEMBERSHIP' AND c.verdict = 'IMMEDIATE_REFUND'
          AND c.status = 'REQUESTED' AND c.created_at > v_hold_since
     ) THEN
    SELECT used INTO v_used FROM public.subscription_usage
     WHERE user_id = p_user_id AND period_start = p_window_start AND scope = 'reading';
    v_member_avail := GREATEST(p_quota - COALESCE(v_used, 0), 0);
  END IF;

  SELECT COALESCE(SUM(g.quantity - g.consumed - g.revoked), 0) INTO v_pass_avail
    FROM public.entitlement_grants g
   WHERE g.user_id = p_user_id AND g.scope = 'reading'
     AND g.consumed + g.revoked < g.quantity
     AND (g.expires_at IS NULL OR g.expires_at > now())
     AND NOT EXISTS (
       SELECT 1 FROM public.payment_cancel_requests c
        WHERE c.payment_id = g.payment_id AND c.kind = 'CHARGE'
          AND c.status = 'REQUESTED' AND c.created_at > v_hold_since
     );

  IF v_member_avail + v_pass_avail < p_units THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'INSUFFICIENT',
      'member_available', v_member_avail, 'pass_available', v_pass_avail
    );
  END IF;

  v_need := p_units;

  FOR r IN
    SELECT q.grant_id, q.avail, q.pocket
      FROM (
        SELECT g.id AS grant_id, (g.quantity - g.consumed - g.revoked) AS avail, g.expires_at AS ends_at,
               'pass'::text AS pocket, g.issued_at AS tie
          FROM public.entitlement_grants g
         WHERE g.user_id = p_user_id AND g.scope = 'reading'
           AND g.consumed + g.revoked < g.quantity
           AND (g.expires_at IS NULL OR g.expires_at > now())
           AND NOT EXISTS (
             SELECT 1 FROM public.payment_cancel_requests c
              WHERE c.payment_id = g.payment_id AND c.kind = 'CHARGE'
                AND c.status = 'REQUESTED' AND c.created_at > v_hold_since
           )
        UNION ALL
        SELECT NULL::uuid, v_member_avail, p_window_end, 'membership'::text, '-infinity'::timestamptz
         WHERE v_member_avail > 0
      ) q
     ORDER BY q.ends_at ASC NULLS LAST, (q.pocket = 'membership') DESC, q.tie ASC
  LOOP
    EXIT WHEN v_need <= 0;
    v_take := LEAST(v_need, r.avail);
    CONTINUE WHEN v_take <= 0;

    IF r.pocket = 'membership' THEN
      INSERT INTO public.subscription_usage (user_id, period_start, scope, used)
      VALUES (p_user_id, p_window_start, 'reading', v_take)
      ON CONFLICT (user_id, period_start, scope)
      DO UPDATE SET used = public.subscription_usage.used + EXCLUDED.used, updated_at = now();

      INSERT INTO public.entitlement_ledger (user_id, kind, pocket, window_start, units, feature_key)
      VALUES (p_user_id, 'consume', 'membership', p_window_start, v_take, p_feature_key)
      RETURNING id INTO v_id;
      v_from_member := v_from_member + v_take;
    ELSE
      UPDATE public.entitlement_grants SET consumed = consumed + v_take WHERE id = r.grant_id;

      INSERT INTO public.entitlement_ledger (user_id, kind, pocket, grant_id, units, feature_key)
      VALUES (p_user_id, 'consume', 'pass', r.grant_id, v_take, p_feature_key)
      RETURNING id INTO v_id;
      v_from_pass := v_from_pass + v_take;
    END IF;

    v_ids := v_ids || v_id;
    v_need := v_need - v_take;
  END LOOP;

  IF v_need > 0 THEN
    RAISE EXCEPTION 'ENTITLEMENT_ALLOCATION_FAILED';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_ids', to_jsonb(v_ids),
    'from_membership', v_from_member,
    'from_pass', v_from_pass
  );
END;
$$;


-- ── 2. 되돌림 — 전액 취소된 결제의 이용권은 되살리지 않는다 ──────────
-- 풀이가 도는 중에 그 결제가 전액 취소되면, 풀이 실패 되돌림이 «환불받은 결제의 이용권»을 쓸 수 있는 장으로 되살린다.
-- 그 장은 쓴 것에서 회수한 것으로 옮긴다(consumed → revoked). 부분 취소(미사용분 환불)는 status 가 completed 라 그대로 되돌린다.

CREATE OR REPLACE FUNCTION public.ent_refund(p_user_id uuid, p_ledger_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_total integer := 0;
  v_payment_refunded boolean;
BEGIN
  IF p_user_id IS NULL OR p_ledger_ids IS NULL OR cardinality(p_ledger_ids) = 0 THEN
    RETURN 0;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('entitlement:' || p_user_id::text));

  FOR r IN
    SELECT * FROM public.entitlement_ledger
     WHERE id = ANY (p_ledger_ids) AND user_id = p_user_id
       AND kind = 'consume' AND refunded_at IS NULL
     FOR UPDATE
  LOOP
    IF r.pocket = 'membership' THEN
      UPDATE public.subscription_usage
         SET used = GREATEST(used - r.units, 0), updated_at = now()
       WHERE user_id = p_user_id AND period_start = r.window_start AND scope = 'reading';
    ELSE
      SELECT (p.status = 'refunded') INTO v_payment_refunded
        FROM public.entitlement_grants g
        JOIN public.payments p ON p.id = g.payment_id
       WHERE g.id = r.grant_id;

      IF COALESCE(v_payment_refunded, false) THEN
        UPDATE public.entitlement_grants
           SET consumed = GREATEST(consumed - r.units, 0),
               revoked = revoked + LEAST(r.units, consumed)
         WHERE id = r.grant_id;

        UPDATE public.entitlement_ledger SET refunded_at = now() WHERE id = r.id;

        INSERT INTO public.entitlement_ledger (user_id, kind, pocket, grant_id, units, feature_key, refund_of, note)
        VALUES (p_user_id, 'revoke', 'pass', r.grant_id, r.units, r.feature_key, r.id, '취소된 결제의 이용권 — 되돌리지 않고 회수');
        CONTINUE;
      END IF;

      UPDATE public.entitlement_grants
         SET consumed = GREATEST(consumed - r.units, 0)
       WHERE id = r.grant_id;
    END IF;

    UPDATE public.entitlement_ledger SET refunded_at = now() WHERE id = r.id;

    INSERT INTO public.entitlement_ledger (user_id, kind, pocket, grant_id, window_start, units, feature_key, refund_of)
    VALUES (p_user_id, 'refund', r.pocket, r.grant_id, r.window_start, r.units, r.feature_key, r.id);

    v_total := v_total + r.units;
  END LOOP;

  RETURN v_total;
END;
$$;


-- ── 3. 이용권 구매 취소 접수 — 미사용분을 잠금 아래에서 다시 센다 ─────
-- 호출자가 넘긴 회수 가능 장 수는 «잠금 밖에서» 읽은 값이다. 접수 직전에 이용권이 쓰였으면 접수를 거절하고
-- 호출자가 판정을 다시 하게 한다(STATE_CHANGED). 접수된 뒤에는 ent_consume 이 이 결제의 이용권을 건너뛴다.
-- 옛 복채 충전(charge) 결제는 발급 이용권이 없으므로 이 검사를 하지 않는다.

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
  v_kind text;
  v_ledger_remaining integer;
  v_unused integer;
BEGIN
  IF p_user_id IS NULL OR p_payment_id IS NULL OR p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'blocked_reason', 'INVALID_INPUT');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('charge_cancel_loss_cap'), hashtext(p_user_id::text));
  PERFORM pg_advisory_xact_lock(hashtext('entitlement:' || p_user_id::text));

  UPDATE public.payment_cancel_requests
     SET status = 'FAILED',
         toss_error_code = COALESCE(toss_error_code, 'STALE_REQUEST'),
         processed_at = COALESCE(processed_at, now())
   WHERE user_id = p_user_id
     AND status = 'REQUESTED'
     AND created_at < now() - make_interval(mins => v_stale_minutes);

  SELECT bokchae_type, credits_remaining INTO v_kind, v_ledger_remaining
    FROM public.payments WHERE id = p_payment_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'blocked_reason', 'INVALID_INPUT');
  END IF;

  IF v_kind = 'pass' THEN
    SELECT COALESCE(SUM(GREATEST(quantity - consumed - revoked, 0)), 0) INTO v_unused
      FROM public.entitlement_grants WHERE payment_id = p_payment_id;
    IF LEAST(COALESCE(v_ledger_remaining, 0), v_unused) <> GREATEST(COALESCE(p_recoverable_credits, 0), 0) THEN
      RETURN jsonb_build_object('ok', false, 'blocked_reason', 'STATE_CHANGED');
    END IF;
  END IF;

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
    v_next := v_oldest + make_interval(days => v_window_days);

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
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'blocked_reason', 'DUPLICATE_OPEN_REQUEST');
END;
$$;

COMMENT ON FUNCTION public.open_charge_cancel_request IS
  '이용권 구매 취소 요청 접수 게이트. advisory lock 아래에서 미사용 장 수를 다시 세고(어긋나면 STATE_CHANGED) '
  '손실 처리 상한(최근 365일 · 계정당 2회 / 10만원)을 검사한 뒤 통과 시에만 요청 행을 만든다. service_role 전용.';


-- ── 4. 멤버십 즉시 해지 접수 — 이번 창 사용량을 잠금 아래에서 확정한다 ──
-- 환불액은 «이번 창에서 쓴 장 수»로 정해진다. 접수 행이 REQUESTED 인 동안 ent_consume 은 멤버십 몫을 열지 않으므로,
-- 여기서 돌려준 used 가 토스 환불이 끝날 때까지 그대로다.

CREATE OR REPLACE FUNCTION public.open_membership_cancel_request(
  p_user_id uuid,
  p_subscription_id uuid,
  p_subscription_payment_id uuid,
  p_idempotency_key text,
  p_reason_code text,
  p_reason_memo text,
  p_granted_credits integer,
  p_gross_amount integer,
  p_window_start timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer := 0;
  v_request_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_subscription_id IS NULL OR p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'blocked_reason', 'INVALID_INPUT');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('entitlement:' || p_user_id::text));

  UPDATE public.payment_cancel_requests
     SET status = 'FAILED',
         toss_error_code = COALESCE(toss_error_code, 'STALE_REQUEST'),
         processed_at = COALESCE(processed_at, now())
   WHERE user_id = p_user_id AND kind = 'MEMBERSHIP'
     AND status = 'REQUESTED'
     AND created_at < now() - interval '10 minutes';

  IF EXISTS (
    SELECT 1 FROM public.payment_cancel_requests
     WHERE user_id = p_user_id AND kind = 'MEMBERSHIP' AND status = 'REQUESTED'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'blocked_reason', 'DUPLICATE_OPEN_REQUEST');
  END IF;

  IF p_window_start IS NOT NULL THEN
    SELECT used INTO v_used FROM public.subscription_usage
     WHERE user_id = p_user_id AND period_start = p_window_start AND scope = 'reading';
  END IF;

  INSERT INTO public.payment_cancel_requests (
    user_id, kind, subscription_id, subscription_payment_id, reason_code, reason_memo, verdict,
    granted_credits, recoverable_credits, gross_amount, refund_amount, status, idempotency_key
  ) VALUES (
    p_user_id, 'MEMBERSHIP', p_subscription_id, p_subscription_payment_id, p_reason_code, p_reason_memo, 'IMMEDIATE_REFUND',
    GREATEST(COALESCE(p_granted_credits, 0), 0), 0, GREATEST(COALESCE(p_gross_amount, 0), 0), 0,
    'REQUESTED', p_idempotency_key
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object('ok', true, 'request_id', v_request_id, 'used', COALESCE(v_used, 0));
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'blocked_reason', 'DUPLICATE_OPEN_REQUEST');
END;
$$;

REVOKE ALL ON FUNCTION public.open_membership_cancel_request(uuid, uuid, uuid, text, text, text, integer, integer, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_membership_cancel_request(uuid, uuid, uuid, text, text, text, integer, integer, timestamptz)
  TO service_role;


-- ── 5. 유료 구독은 한 사람에 하나 ─────────────────────────────────────
-- 갱신 재시도 중인 구독을 둔 채 새 구독을 결제하면 두 빌링키가 매달 청구된다. 코드가 청구 전에 막고, DB 가 구조로 막는다.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_paid_active_uidx
  ON public.subscriptions (user_id) WHERE status = 'ACTIVE' AND billing_key IS NOT NULL;


-- ── 5-2. 10장 팩 가격 — 큰 묶음이 장당 더 비싸던 역전 해소 (CEO 결정 2026-09-19) ──
-- 5장 19,800원(장당 3,960) 인데 10장이 39,800원(장당 3,980)이었다 → 38,800원(장당 3,880).
UPDATE public.price_plans SET price = 38800, updated_at = now()
 WHERE product_kind = 'pass' AND credits = 10 AND price = 39800;


-- ── 6. 이용권 팩 — 1회 결제 상한 ──────────────────────────────────────
-- 옛 복채 팩 행(20만·30만원)은 보존용이라 조건에서 뺀다.
ALTER TABLE public.price_plans DROP CONSTRAINT IF EXISTS price_plans_pass_price_cap_check;
ALTER TABLE public.price_plans ADD CONSTRAINT price_plans_pass_price_cap_check
  CHECK (product_kind <> 'pass' OR (price > 0 AND price <= 100000));


-- ── 7. 결제 완료 활동 기록 — 이용권 구매는 장 수로 적는다 ─────────────
CREATE OR REPLACE FUNCTION public.log_payment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO activity_logs (
      user_id,
      activity_type,
      activity_category,
      description,
      metadata
    )
    VALUES (
      NEW.user_id,
      'purchase',
      'payment',
      CASE WHEN NEW.bokchae_type = 'pass'
        THEN format('결제 완료: 이용권 %s장', COALESCE(NEW.credits_purchased, 0))
        ELSE format('결제 완료: 복채 %s만냥', COALESCE(NEW.credits_purchased, 0))
      END,
      jsonb_build_object(
        'amount', NEW.amount,
        'order_id', NEW.order_id,
        'credits', NEW.credits_purchased,
        'bokchae_type', NEW.bokchae_type
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;
