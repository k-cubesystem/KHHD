-- ============================================================
-- Tester 권한 조정 정책 (Tester Refinement)
-- 기존 관리자급 권한(전체 조회/설정 등) 제거
-- 오직 '서비스 테스트' 목적의 PG 사용 및 자동 충전 기능만 유지
-- ============================================================

-- 1. 기존 Tester의 관리자 접근 권한 제거 (RLS 재정의)
-- [attendance_logs] 전체 접근 권한 제거 -> 본인 것만 가능하도록 기존 정책 유지
-- Admin용 정책에서 tester 제외
DROP POLICY IF EXISTS "Admin full access attendance" ON attendance_logs;
CREATE POLICY "Admin full access attendance" ON attendance_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' -- tester 제거
    )
  );

-- [roulette_config] 관리 권한 제거 -> 조회는 누구나 가능
-- Admin용 정책에서 tester 제외
DROP POLICY IF EXISTS "Admin can manage roulette config" ON roulette_config;
CREATE POLICY "Admin can manage roulette config" ON roulette_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' -- tester 제거
    )
  );

-- [system_settings] (feature flags) 관리 권한 확인 및 조정
-- 기존 정책 "Admins can manage system settings"는 이미 role='admin'만 허용하고 있음 (20260203_init_feature_flags.sql)
-- 그러나 혹시 모를 누락 방지를 위해 명시적으로 정책 확인
-- (참고: feature_flags의 'feat_payment_pg' 접근 제어는 DB row 레벨의 JSON에 'accessLevel': 'tester'로 되어있음. 이건 유지해야 PG 테스트 가능)


-- 2. Tester에게 매일 복채 50만냥 자동 충전 트리거
-- Tester가 로그인할 때(혹은 활동할 때) 체크하여 당일 충전 안했으면 50만냥 지급

CREATE OR REPLACE FUNCTION auto_recharge_tester_bokchae()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_today DATE := CURRENT_DATE;
  v_last_charged DATE;
  v_charge_amount INT := 500000; -- 50만냥
BEGIN
  -- 1. 사용자 역할 확인
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  
  -- Tester가 아니면 종료
  IF v_role IS DISTINCT FROM 'tester' THEN
    RETURN OLD; -- UPDATE 트리거이므로 OLD/NEW 반환 주의 (여기서는 AFTER UPDATE/INSERT on auth table? No logs logic)
  END IF;

  -- 2. 오늘 이미 충전했는지 확인 (transaction logs 이용)
  -- 'TESTER_DAILY_BONUS' 라는 타입이나 설명으로 확인
  PERFORM 1 FROM wallet_transactions 
  WHERE user_id = auth.uid() 
    AND description = '테스터 일일 지원금'
    AND created_at::DATE = v_today;
    
  IF FOUND THEN
    RETURN NEW;
  END IF;

  -- 3. 복채 지급 (add_bokchae 함수 활용)
  -- 기존 add_bokchae가 존재하는지 확인 후 호출
  PERFORM add_bokchae(auth.uid(), v_charge_amount, '테스터 일일 지원금');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 위 함수를 어디에 트리거할 것인가?
-- 가장 확실한 건 'auth.sessions'이 없으므로, 'profiles'나 'attendance_logs' 등이 업데이트될 때?
-- 혹은 사용자가 '출석 일기' 등을 쓸 때?
-- 가장 좋은 건 '로그인 시점'인데 Supabase는 로그인 트리거가 제한적임.
-- 대안: 사용자가 '접속'하여 활동할 때 (예: activity_logs insert) 혹은 별도 Cron.
-- 여기서는 'attendance_logs' (출석) 시점에 지급하거나, 
-- 간단하게 'daily_attendance' 체크 시점에 지급하도록 함.
-- 또는, tester가 '페이지 로드' 시 호출하는 RPC를 하나 만드는 게 나을 수도 있음. 
-- 하지만 DB단에서 자동화를 원하므로, 'profiles'의 updated_at이 갱신될 때(로그인 시 갱신된다면) 처리.
-- 그러나 profiles 업데이트는 자주는 안 일어남.

-- 확실한 트리거: attendance_logs (출석체크) 테이블에 INSERT 될 때 (매일 최초 접속/활동 시 보통 출석체크가 됨)
-- 만약 출석체크를 안하면? -> 룰렛 돌릴 때 or 채팅할 때 등등.
-- 가장 범용적인 'profiles' update 되는 시점 (Last sign in) -> Supabase auth.users가 업데이트 되면 profiles도 업데이트 하는 트리거가 있다면 좋음.
-- 일단 'daily_attendance' (메인페이지 접속시 체크) 와 'attendance_logs'에 트리거 부착.

DROP TRIGGER IF EXISTS trigger_tester_recharge_on_attendance ON attendance_logs;
CREATE TRIGGER trigger_tester_recharge_on_attendance
  AFTER INSERT ON attendance_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_recharge_tester_bokchae();

-- 추가로 daily_attendance 테이블에도 부착 (기존 레거시/신규 혼용 대비)
DROP TRIGGER IF EXISTS trigger_tester_recharge_on_daily_attendance ON daily_attendance;
CREATE TRIGGER trigger_tester_recharge_on_daily_attendance
  AFTER INSERT ON daily_attendance
  FOR EACH ROW
  EXECUTE FUNCTION auto_recharge_tester_bokchae();

