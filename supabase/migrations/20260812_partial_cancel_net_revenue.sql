-- 부분 취소 매출 보정 — 어드민 매출이 취소분만큼 과대 계상되던 것을 순매출로 바꾼다.
--
-- 결함: 전액 취소는 clawback RPC 가 status 를 'refunded' 로 내려 `status='completed'` 필터에서
--       저절로 빠지지만, **부분 취소는 status 가 'completed' 로 남는다**(취소액은 cancelled_amount 에 누적).
--       그래서 SUM(amount) 로 잡는 모든 집계가 취소된 돈까지 매출로 세고 있었다.
--
-- 순매출 정의는 앱과 DB 가 한 문장이어야 한다(화면마다 숫자가 다르면 매출을 못 믿는다):
--       GREATEST(amount - COALESCE(cancelled_amount, 0), 0)
--       ↔ lib/domain/payment/cancel-clawback.ts 의 netRevenue()
--
-- 적용 범위: 매출 «금액»만 보정한다. 결제 «건수»는 결제가 일어난 사실 그대로 둔다.

-- ── 1. 대시보드 카드(총/오늘/이달 매출) ──
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today timestamptz := date_trunc('day', now());
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: admin only';
  END IF;

  SELECT jsonb_build_object(
    'totalUsers', (SELECT count(*) FROM public.profiles),
    'todaySignups', (SELECT count(*) FROM public.profiles WHERE created_at >= v_today),
    'totalRevenue', (SELECT COALESCE(SUM(GREATEST(amount - COALESCE(cancelled_amount, 0), 0)), 0)
                       FROM public.payments WHERE status = 'completed'),
    'todayRevenue', (SELECT COALESCE(SUM(GREATEST(amount - COALESCE(cancelled_amount, 0), 0)), 0)
                       FROM public.payments WHERE status = 'completed' AND created_at >= v_today),
    'monthRevenue', (SELECT COALESCE(SUM(GREATEST(amount - COALESCE(cancelled_amount, 0), 0)), 0)
                       FROM public.payments WHERE status = 'completed' AND created_at >= date_trunc('month', now())),
    'activeSubscriptions', (SELECT count(*) FROM public.subscriptions WHERE status = 'ACTIVE'),
    'mrr', (SELECT COALESCE(SUM(mp.price), 0) FROM public.subscriptions s JOIN public.membership_plans mp ON mp.id = s.plan_id WHERE s.status = 'ACTIVE'),
    'totalAnalyses', (SELECT count(*) FROM public.analysis_history)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_admin_dashboard_stats IS
  '관리자 대시보드 집계. 매출은 부분 취소분(cancelled_amount)을 뺀 순매출. admin 전용.';

-- ── 2. 시간대별 트래픽 RPC — traffic_hourly 가 비었을 때의 실시간 집계 경로 ──
CREATE OR REPLACE FUNCTION public.get_hourly_traffic(p_hours integer DEFAULT 24)
RETURNS TABLE(hour_timestamp timestamp with time zone, total_visits integer, unique_users integer, new_signups integer, total_revenue numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM traffic_hourly th
    WHERE th.hour_timestamp >= NOW() - (p_hours || ' hours')::INTERVAL
  ) THEN
    RETURN QUERY
    SELECT th.hour_timestamp, th.total_visits, th.unique_users, th.new_signups, th.total_revenue::numeric
    FROM traffic_hourly th
    WHERE th.hour_timestamp >= NOW() - (p_hours || ' hours')::INTERVAL
    ORDER BY 1 ASC;
  ELSE
    RETURN QUERY
    SELECT
      date_trunc('hour', al.created_at)                                          AS hour_timestamp,
      COUNT(*)::INT                                                              AS total_visits,
      COUNT(DISTINCT al.user_id)::INT                                            AS unique_users,
      COUNT(*) FILTER (WHERE al.activity_type = 'signup')::INT                   AS new_signups,
      COALESCE(SUM(GREATEST(p.amount - COALESCE(p.cancelled_amount, 0), 0))
                 FILTER (WHERE p.status = 'completed'), 0)::numeric              AS total_revenue
    FROM activity_logs al
    LEFT JOIN payments p
      ON p.user_id = al.user_id
      AND date_trunc('hour', p.created_at) = date_trunc('hour', al.created_at)
    WHERE al.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY date_trunc('hour', al.created_at)
    ORDER BY 1 ASC;
  END IF;
END;
$$;

-- ── 3. traffic_hourly 재집계(backfill) ──
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
      (SELECT COUNT(*) FROM public.payments WHERE status = 'completed' AND date_trunc('hour', updated_at) = curr_hour),
      COALESCE((SELECT SUM(GREATEST(amount - COALESCE(cancelled_amount, 0), 0))
                  FROM public.payments
                 WHERE status = 'completed' AND date_trunc('hour', updated_at) = curr_hour), 0),
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

-- ── 4. 누적 집계 트리거 — 취소분을 같은 시간 버킷에서 되돌린다 ──
-- traffic_hourly 는 «더하기»로만 자라는 누적 표라, 결제가 취소돼도 스스로 줄지 않는다.
-- 취소 증분만큼 음수로 한 번 더 올려 순매출로 맞춘다.
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

  -- 🔴 증분만 뺀다. cancelled_amount 는 clawback RPC 가 GREATEST 로만 올리는 단조 증가값이라
  --    웹훅이 재전송돼도 delta 가 0 이 되어 이중 차감이 생기지 않는다.
  IF TG_OP = 'UPDATE' THEN
    v_cancel_delta := GREATEST(COALESCE(NEW.cancelled_amount, 0) - COALESCE(OLD.cancelled_amount, 0), 0);
    IF v_cancel_delta > 0 THEN
      PERFORM upsert_traffic_hourly(
        p_hour    := NEW.created_at,
        p_revenue := -v_cancel_delta
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_payment_to_traffic IS
  'traffic_hourly 결제 집계. completed 전이 시 가산, cancelled_amount 증분만큼 차감(순매출).';
