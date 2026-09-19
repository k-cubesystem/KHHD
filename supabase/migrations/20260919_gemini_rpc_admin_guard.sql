-- Gemini 사용량 RPC — 관리자 확인 추가 (2026-09-19)
--
-- 어드민 Gemini 사용량 화면(app/actions/admin/gemini-usage.ts)은 관리자 세션으로,
-- 헬스체크 크론(app/api/cron/health/route.ts)은 service_role 로 부른다. 둘 다 그대로 동작한다.

CREATE OR REPLACE FUNCTION public.update_gemini_rpm(new_rpm integer, new_model text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF new_rpm < 1 OR new_rpm > 10000 THEN
    RAISE EXCEPTION 'RPM must be between 1 and 10000';
  END IF;

  UPDATE gemini_token_bucket
  SET max_tokens = new_rpm,
      tokens     = new_rpm,
      model      = COALESCE(new_model, model),
      refill_at  = now(),
      updated_at = now()
  WHERE id = 1;

  RETURN (SELECT row_to_json(t)::jsonb FROM gemini_token_bucket t WHERE id = 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_gemini_daily_stats(days_back integer DEFAULT 30)
 RETURNS TABLE(stat_date date, model text, call_count bigint, success_count bigint, error_count bigint, cached_count bigint, total_tokens bigint, total_cost_usd numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    DATE(created_at AT TIME ZONE 'Asia/Seoul') AS stat_date,
    model::text                                           AS model,
    COUNT(*)                                              AS call_count,
    COUNT(*) FILTER (WHERE status = 'success')            AS success_count,
    COUNT(*) FILTER (WHERE status != 'success')           AS error_count,
    COUNT(*) FILTER (WHERE cached = true)                 AS cached_count,
    COALESCE(SUM(total_tokens), 0)                        AS total_tokens,
    COALESCE(SUM(estimated_cost_usd), 0)                  AS total_cost_usd
  FROM gemini_api_logs
  WHERE created_at >= now() - (days_back || ' days')::interval
  GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul'), model
  ORDER BY stat_date DESC, model;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_gemini_action_stats(days_back integer DEFAULT 30)
 RETURNS TABLE(action_type text, call_count bigint, success_count bigint, avg_tokens numeric, total_tokens bigint, total_cost_usd numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    action_type::text                                                     AS action_type,
    COUNT(*)                                                              AS call_count,
    COUNT(*) FILTER (WHERE status = 'success')                            AS success_count,
    COALESCE(AVG(total_tokens) FILTER (WHERE status = 'success'), 0)      AS avg_tokens,
    COALESCE(SUM(total_tokens), 0)                                        AS total_tokens,
    COALESCE(SUM(estimated_cost_usd), 0)                                  AS total_cost_usd
  FROM gemini_api_logs
  WHERE created_at >= now() - (days_back || ' days')::interval
  GROUP BY action_type
  ORDER BY call_count DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_gemini_today_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total_calls',         COUNT(*),
      'success_calls',       COUNT(*) FILTER (WHERE status = 'success'),
      'error_calls',         COUNT(*) FILTER (WHERE status != 'success'),
      'rate_limited_calls',  COUNT(*) FILTER (WHERE status = 'rate_limited'),
      'cached_calls',        COUNT(*) FILTER (WHERE cached = true),
      'total_tokens',        COALESCE(SUM(total_tokens), 0),
      'total_input_tokens',  COALESCE(SUM(input_tokens), 0),
      'total_output_tokens', COALESCE(SUM(output_tokens), 0),
      'total_cost_usd',      COALESCE(SUM(estimated_cost_usd), 0),
      'avg_latency_ms',      COALESCE(AVG(latency_ms) FILTER (WHERE status = 'success'), 0)
    )
    FROM gemini_api_logs
    WHERE created_at >= (now() AT TIME ZONE 'Asia/Seoul')::date
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_gemini_recent_logs(log_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, user_id uuid, model text, action_type text, input_tokens integer, output_tokens integer, total_tokens integer, estimated_cost_usd numeric, latency_ms integer, status text, error_code text, cached boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    id, user_id, model::text, action_type::text,
    input_tokens, output_tokens, total_tokens,
    estimated_cost_usd, latency_ms,
    status::text, error_code::text, cached, created_at
  FROM gemini_api_logs
  ORDER BY created_at DESC
  LIMIT log_limit;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.update_gemini_rpm(integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_gemini_daily_stats(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_gemini_action_stats(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_gemini_today_summary() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_gemini_recent_logs(integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.update_gemini_rpm(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_gemini_daily_stats(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_gemini_action_stats(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_gemini_today_summary() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_gemini_recent_logs(integer) TO authenticated, service_role;
