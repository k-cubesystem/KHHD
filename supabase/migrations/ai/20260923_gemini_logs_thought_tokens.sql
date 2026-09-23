-- ============================================================
-- Gemini 사용량 로그 — 생각(thinking) 토큰 칸 + AI 지출 합계 RPC
-- 2026-09-23
--
-- 🔴 왜: 생각 토큰은 **출력 단가로 과금**된다("Response pricing is the sum of output tokens and
--    thinking tokens" — https://ai.google.dev/gemini-api/docs/pricing, 확인일 2026-09-23).
--    그런데 `usageMetadata.candidatesTokenCount` 에는 생각이 없다. 그 값만 출력으로 세고 있었으니
--    원가가 통째로 과소계상됐다(실측: 유료 테마 풀이 한 건 = 생각 2,851 + 본문 1,781).
--
-- 🔴 적용 순서: **이 마이그레이션이 코드 배포보다 먼저**. 칸이 없는 채로 새 코드가 뜨면
--    insert 가 통째로 실패하고(로깅은 예외를 삼킨다) 사용량 기록이 무음으로 멈춘다 —
--    그러면 아래 예산 브레이커까지 「오늘 쓴 돈 0」으로 본다. 반대로 이 마이그레이션만 먼저
--    도는 것은 무해하다(구 코드는 칸을 안 쓴다).
--
-- 과거 행은 thought_tokens = NULL 로 남는다. **「집계 기준이 바뀐 날」을 그 NULL 로 가른다** —
-- NULL 구간의 estimated_cost_usd 는 옛 기준(생각 제외)이라 뒤 구간과 그대로 비교하면 안 된다.
-- ============================================================

ALTER TABLE public.gemini_api_logs
  ADD COLUMN IF NOT EXISTS thought_tokens INTEGER;

COMMENT ON COLUMN public.gemini_api_logs.thought_tokens IS
  '생각(thinking) 토큰 — 출력 단가로 과금된다. NULL = 2026-09-23 계측 이전(원가 과소계상 구간)';

-- ============================================================
-- get_ai_spend_usd_since: 기준 시각 이후 AI 지출 합계(USD)
--
-- 🔴 광고 리워드 일일 예산 브레이커는 그 날 행을 **전부 끌어와 JS 에서** 더하고 있었다.
--    PostgREST 는 한 번에 주는 행 수에 상한(`db-max-rows`)이 있어서, 호출이 그만큼 쌓이는 날엔
--    합계가 조용히 낮게 나오고 「예산에 닿았다」가 영영 오지 않는다. 합계는 DB 에서 낸다.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ai_spend_usd_since(p_since TIMESTAMPTZ)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(estimated_cost_usd), 0)::numeric
  FROM public.gemini_api_logs
  WHERE created_at >= p_since;
$$;

REVOKE ALL ON FUNCTION public.get_ai_spend_usd_since(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_spend_usd_since(TIMESTAMPTZ) TO service_role;
