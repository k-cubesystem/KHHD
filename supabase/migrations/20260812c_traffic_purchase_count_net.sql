-- traffic_hourly 구매 «건수»도 취소를 반영한다 — 어제 보정한 «금액»의 짝을 맞춘다.
--
-- 어제(20260812_partial_cancel_net_revenue) 매출은 순매출로 바꿨지만 건수는 그대로 뒀다.
-- 그 결과 전액 취소된 결제가 «매출 0원 · 구매 1건» 으로 남는다.
--
-- 「구매 건수」는 이 스키마에서 이미 «성사된 거래 수» 다 — 시도 수가 아니다. 근거 둘:
--   1) 적재 트리거가 status 가 'completed' 로 **전이**할 때만 +1 한다.
--      pending·failed 는 애초에 세지 않으므로 "결제 시도" 를 세는 열이 아니다.
--   2) 같은 열의 재집계(정본 복구) 경로인 backfill_traffic_hourly 가
--      `COUNT(*) WHERE status='completed'` 로 센다. 전액 취소는 clawback RPC 가 status 를
--      'refunded' 로 내리므로 backfill 은 그 건을 **뺀다**.
--      → 고치지 않으면 트리거(안 뺌)와 backfill(뺌)이 서로 다른 숫자를 만들고,
--        backfill 을 한 번 돌리는 순간 과거 건수가 조용히 바뀐다.
-- 덧붙여 같은 행의 total_revenue 가 이미 순매출이라, 건수만 총계로 두면 객단가(매출÷건수)가 틀린다.
--
-- 부분 취소는 **차감하지 않는다**. 거래는 성사됐고 금액만 줄었다(status 도 'completed' 로 남아
-- backfill 이 1건으로 센다). 금액 보정은 어제 만든 cancelled_amount 증분 경로가 이미 한다.
--
-- 🔴 멱등: 어제의 «단조 증가값 델타» 설계를 건드리지 않는다.
--    건수 차감은 금액과 무관한 **상태 전이 가드**(completed → refunded)로만 발화한다.
--    clawback RPC 는 전액 취소일 때 status 를 refunded 로 한 번 내리고, 웹훅이 재전송되면
--    OLD.status 가 이미 'refunded' 라 조건이 거짓이 된다 → 이중 차감 없음.
--    (혹시 재결제로 refunded → completed 로 되돌아가면 가산 가드가 +1 하므로 짝이 계속 맞는다.)

CREATE OR REPLACE FUNCTION public.trigger_payment_to_traffic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cancel_delta integer;
BEGIN
  -- completed 로 **전이**할 때만 가산(취소 회수 UPDATE 에 재발화하지 않는다).
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM upsert_traffic_hourly(
      p_hour      := NEW.created_at,
      p_purchases := 1,
      p_revenue   := COALESCE(NEW.amount, 0)
    );
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- 🔴 금액: 증분만 뺀다. cancelled_amount 는 clawback RPC 가 GREATEST 로만 올리는 단조 증가값이라
    --    웹훅이 재전송돼도 delta 가 0 이 되어 이중 차감이 생기지 않는다.
    v_cancel_delta := GREATEST(COALESCE(NEW.cancelled_amount, 0) - COALESCE(OLD.cancelled_amount, 0), 0);
    IF v_cancel_delta > 0 THEN
      PERFORM upsert_traffic_hourly(
        p_hour    := NEW.created_at,
        p_revenue := -v_cancel_delta
      );
    END IF;

    -- 🔴 건수: 전액 취소(completed → refunded)로 **전이**하는 1회만 −1.
    --    가산과 같은 버킷(date_trunc(created_at))으로 되돌리므로 음수가 되지 않는다.
    IF OLD.status = 'completed' AND NEW.status = 'refunded' THEN
      PERFORM upsert_traffic_hourly(
        p_hour      := NEW.created_at,
        p_purchases := -1
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_payment_to_traffic IS
  'traffic_hourly 결제 집계. completed 전이 시 건수+금액 가산, cancelled_amount 증분만큼 금액 차감, completed→refunded 전이 시 건수 −1(성사된 거래 수 정의).';

-- ── backfill 정합 — 트리거와 «같은 시간 버킷» 을 써야 재집계가 숫자를 옮기지 않는다 ──
-- 종전에는 updated_at 으로 버킷을 잡았는데, 취소가 일어나면 updated_at 이 취소 시각으로 바뀌어
-- 원래 결제 건이 통째로 «취소한 시각» 버킷으로 이사한다(트리거는 created_at 에 적재했는데).
-- 결제 시각 기준(created_at)으로 통일한다 — 취소는 건수·금액을 줄일 뿐 시점을 옮기지 않는다.
CREATE OR REPLACE FUNCTION public.backfill_traffic_hourly(p_start_date timestamp with time zone, p_end_date timestamp with time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  curr_hour TIMESTAMP WITH TIME ZONE;
BEGIN
  curr_hour := date_trunc('hour', p_start_date);

  WHILE curr_hour <= p_end_date LOOP
    INSERT INTO traffic_hourly (
      hour_timestamp,
      new_signups,
      total_purchases,
      total_revenue,
      total_visits
    )
    SELECT
      curr_hour,
      (SELECT COUNT(*) FROM auth.users WHERE date_trunc('hour', created_at) = curr_hour),
      (SELECT COUNT(*) FROM public.payments WHERE status = 'completed' AND date_trunc('hour', created_at) = curr_hour),
      COALESCE((SELECT SUM(GREATEST(amount - COALESCE(cancelled_amount, 0), 0))
                  FROM public.payments
                 WHERE status = 'completed' AND date_trunc('hour', created_at) = curr_hour), 0),
      (SELECT COUNT(*) FROM public.activity_logs WHERE date_trunc('hour', created_at) = curr_hour)
    ON CONFLICT (hour_timestamp)
    DO UPDATE SET
      new_signups = EXCLUDED.new_signups,
      total_purchases = EXCLUDED.total_purchases,
      total_revenue = EXCLUDED.total_revenue,
      total_visits = EXCLUDED.total_visits;

    curr_hour := curr_hour + interval '1 hour';
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.backfill_traffic_hourly IS
  'traffic_hourly 재집계. 결제는 created_at 버킷·status=completed 기준(전액 취소분 제외)·금액은 순매출 — 실시간 트리거와 같은 정의.';
