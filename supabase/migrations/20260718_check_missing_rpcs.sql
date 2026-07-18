-- 코드가 기대하는 RPC가 DB에 실재하는지 점검 (P0-1 헬스체크용)
-- 배경: 7/4 DB 재구축 때 RPC 8종이 소실됐고, 호출부가 에러를 무시해 **무음 실패**로 몇 달을 흘렀다.
--       (add_bokchae·추천 2종·운세저널 3종·분석통계 — 세션20에 수복)
-- 이 함수로 매일 대조하면 같은 사고를 24시간 안에 잡는다.

CREATE OR REPLACE FUNCTION public.check_missing_rpcs(p_names text[])
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(n), '{}')
  FROM unnest(p_names) AS n
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public' AND p.proname = n
  );
$$;

REVOKE EXECUTE ON FUNCTION public.check_missing_rpcs(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_missing_rpcs(text[]) TO service_role;
