-- Fix infinite recursion in RLS policies
-- Replace inline subqueries with is_admin() SECURITY DEFINER function

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all usage" ON ai_chat_usage;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can view utm tracking" ON utm_tracking;
DROP POLICY IF EXISTS "Admins can view funnel events" ON funnel_events;
DROP POLICY IF EXISTS "Admins can view traffic stats" ON traffic_hourly;
DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can view notification logs" ON notification_logs;

-- 2. Recreate policies with is_admin() function
-- Phase 2: ai_chat_usage
CREATE POLICY "Admins can view all usage"
  ON ai_chat_usage FOR SELECT
  USING (is_admin());

-- Phase 3: activity_logs
CREATE POLICY "Admins can view all activity logs"
  ON activity_logs FOR SELECT
  USING (is_admin());

-- Phase 3: utm_tracking
CREATE POLICY "Admins can view utm tracking"
  ON utm_tracking FOR SELECT
  USING (is_admin());

-- Phase 3: funnel_events
CREATE POLICY "Admins can view funnel events"
  ON funnel_events FOR SELECT
  USING (is_admin());

-- Phase 3: traffic_hourly
CREATE POLICY "Admins can view traffic stats"
  ON traffic_hourly FOR SELECT
  USING (is_admin());

-- system_settings
CREATE POLICY "Admins can manage system settings"
  ON system_settings FOR ALL
  USING (is_admin());

-- notification_logs
CREATE POLICY "Admins can view notification logs"
  ON notification_logs FOR SELECT
  USING (is_admin());

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE 'RLS 무한 재귀 수정 완료: 모든 관리자 정책이 is_admin() 함수를 사용하도록 변경됨';
END $$;
