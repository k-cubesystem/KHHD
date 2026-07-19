-- 어드민 대시보드 RPC 2종 수복 (get_family_with_missions 와 같은 7/4 재구축 잔재).
--
-- 1) get_recent_activities: activity_type 을 varchar 로 선언했으나 activity_logs.activity_type 은 text,
--    user_email 은 text 로 선언했으나 auth.users.email 은 varchar(255) → 42804 로 항상 실패.
-- 2) get_hourly_traffic: fallback 분기의 ORDER BY hour_timestamp 가 OUT 파라미터와 SELECT 별칭 사이에서
--    모호(ambiguous)해 traffic_hourly 가 비어 있을 때마다 실패.

DROP FUNCTION IF EXISTS public.get_recent_activities(integer);

CREATE FUNCTION public.get_recent_activities(p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid, user_name text, user_email text,
  activity_type text, description text, metadata jsonb, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    p.full_name::text     AS user_name,
    u.email::text         AS user_email,
    al.activity_type::text,
    al.description::text,
    al.metadata,
    al.created_at
  FROM activity_logs al
  LEFT JOIN auth.users u ON al.user_id = u.id
  LEFT JOIN profiles p ON al.user_id = p.id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_recent_activities(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recent_activities(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_hourly_traffic(p_hours integer DEFAULT 24)
RETURNS TABLE(
  hour_timestamp timestamptz, total_visits integer, unique_users integer,
  new_signups integer, total_revenue numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM traffic_hourly th
    WHERE th.hour_timestamp >= NOW() - (p_hours || ' hours')::INTERVAL
  ) THEN
    RETURN QUERY
    SELECT th.hour_timestamp, th.total_visits, th.unique_users, th.new_signups, th.total_revenue
    FROM traffic_hourly th
    WHERE th.hour_timestamp >= NOW() - (p_hours || ' hours')::INTERVAL
    ORDER BY 1 ASC;
  ELSE
    -- traffic_hourly 가 비어 있을 때 activity_logs 실시간 집계.
    -- ORDER BY 는 반드시 서수(1) — 별칭 hour_timestamp 는 OUT 파라미터와 충돌한다.
    RETURN QUERY
    SELECT
      date_trunc('hour', al.created_at)                                AS hour_timestamp,
      COUNT(*)::INT                                                    AS total_visits,
      COUNT(DISTINCT al.user_id)::INT                                  AS unique_users,
      COUNT(*) FILTER (WHERE al.activity_type = 'signup')::INT         AS new_signups,
      -- payments.amount 는 integer → SUM 은 bigint. numeric 반환 선언과 맞추려면 캐스트 필수.
      COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0)::numeric AS total_revenue
    FROM activity_logs al
    LEFT JOIN payments p
      ON p.user_id = al.user_id
      AND date_trunc('hour', p.created_at) = date_trunc('hour', al.created_at)
    WHERE al.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY date_trunc('hour', al.created_at)
    ORDER BY 1 ASC;
  END IF;
END;
$function$;
