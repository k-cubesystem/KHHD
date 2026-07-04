-- ============================================================
-- AI 메모리 + 비용 최적화 시스템 (Sprint 1)
-- 2026-07-04
-- context-cache(사주 컨텍스트 캐시) + user_ai_memory(장기 기억) + 세션 요약
-- ============================================================

-- 1. 사주 컨텍스트 캐시
--    사주 계산은 결정론적이지만 컨텍스트 텍스트에 "현재 날짜/대운 태그"가 포함됨.
--    → cache_key(생년월일시+성별+프로필)당 1행 유지 + context_date로 일 1회 갱신.
CREATE TABLE IF NOT EXISTS public.saju_context_cache (
  cache_key      TEXT PRIMARY KEY,           -- sha256(birth|time|calendar|gender|name|job|focus|marital|philosophy)
  context_text   TEXT NOT NULL,              -- buildSajuContext().promptContext 전문
  context_date   DATE NOT NULL,              -- 텍스트가 계산된 KST 날짜 (일 단위 무효화)
  engine_version TEXT NOT NULL DEFAULT 'v1', -- 사주 엔진 로직 변경 시 bump → 자연 무효화
  hit_count      INTEGER NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- service_role 전용 (RLS 활성 + 정책 없음 = anon/authenticated 거부, service_role은 bypass)
ALTER TABLE public.saju_context_cache ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_saju_context_cache_updated ON public.saju_context_cache(updated_at);

-- 캐시 히트 카운터 (원자적, 비차단 호출용) — 캐시 효과 관측용
CREATE OR REPLACE FUNCTION public.increment_saju_cache_hit(p_cache_key TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE saju_context_cache SET hit_count = hit_count + 1 WHERE cache_key = p_cache_key;
$$;
REVOKE ALL ON FUNCTION public.increment_saju_cache_hit(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_saju_cache_hit(TEXT) TO service_role;

-- 2. 유저별 AI 장기 기억
CREATE TABLE IF NOT EXISTS public.user_ai_memory (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id   UUID REFERENCES public.family_members(id) ON DELETE CASCADE, -- NULL = 본인
  memory_type        TEXT NOT NULL CHECK (memory_type IN ('profile_fact','concern','consultation_summary')),
  content            TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 300),
  importance         INTEGER NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  source_session_id  UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  last_referenced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_ai_memory ENABLE ROW LEVEL SECURITY;
-- 본인만 조회/삭제 가능 (개인정보 통제권). INSERT/UPDATE는 service_role(서버 파이프라인) 전용.
CREATE POLICY "user_ai_memory_select_own" ON public.user_ai_memory
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_ai_memory_delete_own" ON public.user_ai_memory
  FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_memory_recall
  ON public.user_ai_memory(user_id, family_member_id, importance DESC, last_referenced_at DESC);

-- 3. chat_sessions 요약 컬럼 (증분 요약)
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS summarized_message_count INTEGER NOT NULL DEFAULT 0;
