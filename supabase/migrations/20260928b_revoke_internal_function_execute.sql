-- 내부 전용 함수 10종의 실행 권한을 service_role 로 좁힌다 (2026-09-28 라이브 적용 완료).
--
-- 왜: 통계 적재·정리·캐시·속도제한 함수가 SECURITY DEFINER 인데 authenticated·anon 도 실행할 수 있었다.
--     앱 호출부는 전부 createAdminClient()(service_role)와 헬스 크론이라 회수해도 동작은 그대로다
--     (app/actions/admin/dashboard.ts · lib/utils/rate-limit.ts · lib/saju-engine/context-cache.ts · app/api/cron/health).
-- 재적용 안전: 권한만 다루고 여러 번 실행해도 결과가 같다. DB 재구축 때 이 파일이 없으면 권한이 되살아난다.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'backfill_traffic_hourly', 'upsert_traffic_hourly',
        'cleanup_old_fortune_records', 'cleanup_rate_limit_entries',
        'check_rate_limit', 'increment_saju_cache_hit',
        'get_funnel_analysis', 'get_utm_performance',
        'get_hourly_traffic', 'get_recent_activities'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;
