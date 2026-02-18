-- =============================================
-- FIX: traffic_hourly 테이블 자동 집계 및 백필
-- Created: 2026-02-14
-- Author: SYSTEM
-- Updated: 2026-02-14 (Fix created_at column issue)
-- =============================================

-- 1. 트래픽 데이터 백필 함수 (특정 기간)
CREATE OR REPLACE FUNCTION backfill_traffic_hourly(p_start_date TIMESTAMP WITH TIME ZONE, p_end_date TIMESTAMP WITH TIME ZONE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- auth.users 접근을 위해 필요
AS $$
DECLARE
  curr_hour TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 시간 단위로 잘라서 루프
  curr_hour := date_trunc('hour', p_start_date);

  WHILE curr_hour <= p_end_date LOOP
    INSERT INTO traffic_hourly (
      hour_timestamp, 
      new_signups, 
      total_purchases, 
      total_revenue,
      total_visits -- activity_logs 기반 단순 집계
    )
    SELECT
      curr_hour,
      -- profiles 대신 auth.users 사용 (가입일이 확실함)
      (SELECT COUNT(*) FROM auth.users WHERE date_trunc('hour', created_at) = curr_hour),
      -- payments 테이블 명시
      (SELECT COUNT(*) FROM public.payments WHERE status = 'completed' AND date_trunc('hour', updated_at) = curr_hour),
      COALESCE((SELECT SUM(amount) FROM public.payments WHERE status = 'completed' AND date_trunc('hour', updated_at) = curr_hour), 0),
      -- activity_logs 테이블 명시
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

-- 2. 사용자 가입 시 traffic_hourly 자동 업데이트 트리거
-- profiles 테이블에 created_at이 없을 수 있으므로 NOW() 사용
CREATE OR REPLACE FUNCTION update_traffic_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO traffic_hourly (hour_timestamp, new_signups)
  VALUES (date_trunc('hour', NOW()), 1)
  ON CONFLICT (hour_timestamp)
  DO UPDATE SET new_signups = traffic_hourly.new_signups + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_traffic_signup ON profiles;
CREATE TRIGGER trigger_traffic_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_traffic_signup();

-- 3. 결제 완료 시 traffic_hourly 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_traffic_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.status = 'completed' THEN
    INSERT INTO traffic_hourly (hour_timestamp, total_purchases, total_revenue)
    VALUES (date_trunc('hour', NOW()), 1, NEW.amount)
    ON CONFLICT (hour_timestamp)
    DO UPDATE SET 
      total_purchases = traffic_hourly.total_purchases + 1,
      total_revenue = traffic_hourly.total_revenue + NEW.amount;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_traffic_payment ON payments;
CREATE TRIGGER trigger_traffic_payment
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_traffic_payment();

-- 4. 활동 로그(방문) 시 traffic_hourly 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_traffic_visit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO traffic_hourly (hour_timestamp, total_visits)
  VALUES (date_trunc('hour', NEW.created_at), 1)
  ON CONFLICT (hour_timestamp)
  DO UPDATE SET total_visits = traffic_hourly.total_visits + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_traffic_visit ON activity_logs;
CREATE TRIGGER trigger_traffic_visit
  AFTER INSERT ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_traffic_visit();

-- 5. 백필 실행 (최근 7일)
SELECT backfill_traffic_hourly(NOW() - interval '7 days', NOW());
