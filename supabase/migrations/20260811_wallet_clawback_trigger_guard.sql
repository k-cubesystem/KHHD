-- payments 트리거 정리 — 취소 회수(clawback) UPDATE 를 가로막는 지뢰 제거
--
-- 발견 경위: 취소 복채 회수 RPC 가 payments 를 UPDATE 하는데,
--            payments 의 AFTER INSERT OR UPDATE 트리거 3개가 `NEW.status='completed'` 만 보고 매번 다시 발화한다.
--
-- 지뢰 1) log_payment_completed() 가 payments 에 없는 컬럼(product_name/product_id)을 참조 →
--         status='completed' 인 행을 INSERT/UPDATE 할 때마다 42703 으로 실패.
--         → **실결제 첫 건이 DB 기록 단계에서 통째로 실패하는 상태**였다(라이브 payments 에 completed 0건, test_charge 17건).
-- 지뢰 2) 트리거 2개(trigger_traffic_payment / trigger_payments_to_traffic)가 같은 traffic_hourly 집계를 이중으로 올린다.
--         게다가 update_traffic_payment() 는 SECURITY DEFINER 가 아니라 traffic_hourly RLS(INSERT 정책 없음)에 막히고,
--         부분 취소로 payments 를 UPDATE 할 때마다 매출을 또 더한다.
--
-- 조치: (1) log_payment_completed 를 실제 컬럼 기준으로 고치고 **completed 로 전이할 때만** 발화시킨다.
--       (2) 중복·RLS 파손·재집계 3중 결함인 trigger_traffic_payment 를 내린다.
--           집계는 SECURITY DEFINER + 전이 가드가 이미 있는 trigger_payments_to_traffic 이 단독으로 맡는다.

CREATE OR REPLACE FUNCTION public.log_payment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- completed 로 **전이**하는 순간만 기록한다. 취소 회수처럼 completed 행을 다시 UPDATE 해도 중복 로그가 생기지 않는다.
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
      format('결제 완료: 복채 %s만냥', COALESCE(NEW.credits_purchased, 0)),
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
$$;

COMMENT ON FUNCTION public.log_payment_completed IS
  '결제 완료 활동 로그. completed 로 전이할 때만 1회 기록(취소 회수 UPDATE 에 재발화하지 않음).';

DROP TRIGGER IF EXISTS trigger_traffic_payment ON public.payments;

COMMENT ON FUNCTION public.update_traffic_payment IS
  '[미사용] trigger_payments_to_traffic(SECURITY DEFINER + 전이 가드)로 일원화되어 트리거에서 분리됨. 이중 집계·RLS 파손 이력 있음.';
