-- ============================================
-- Phase 3: Analysis History Table
-- 분석 기록 아카이빙 시스템
-- ============================================

-- ==========================================
-- 1. Analysis History Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.analysis_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  target_id uuid,  -- Destiny Target ID (nullable for backward compatibility)
  target_name text NOT NULL,  -- 분석 대상 이름 (비정규화)
  target_relation text,  -- 관계 (본인, 가족, 친구 등)

  -- 분석 유형 및 컨텍스트
  category text NOT NULL CHECK (category IN ('SAJU', 'FACE', 'HAND', 'FENGSHUI', 'COMPATIBILITY', 'TODAY', 'WEALTH', 'NEW_YEAR')),
  context_mode text CHECK (context_mode IN ('WEALTH', 'LOVE', 'HEALTH', 'CAREER', 'GENERAL')),

  -- 분석 결과 데이터
  result_json jsonb NOT NULL,  -- AI 분석 결과 원본
  summary text,  -- 한 줄 요약
  score integer,  -- 점수 (있는 경우)

  -- 메타데이터
  prompt_version text,  -- 사용된 프롬프트 버전 (A/B 테스트용)
  model_used text,  -- 사용된 AI 모델
  talisman_cost integer DEFAULT 0,  -- 소비된 부적 개수

  -- 사용자 메모
  user_memo text,  -- 사용자가 작성한 메모
  is_favorite boolean DEFAULT false,  -- 즐겨찾기

  -- 타임스탬프
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON public.analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_target_id ON public.analysis_history(target_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_category ON public.analysis_history(category);
CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at ON public.analysis_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_history_is_favorite ON public.analysis_history(is_favorite) WHERE is_favorite = true;

-- ==========================================
-- 2. RLS (Row Level Security)
-- ==========================================
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 분석 기록만 조회 가능
DROP POLICY IF EXISTS "Users can view own analysis history" ON public.analysis_history;
CREATE POLICY "Users can view own analysis history" ON public.analysis_history
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 분석 기록만 생성 가능
DROP POLICY IF EXISTS "Users can insert own analysis history" ON public.analysis_history;
CREATE POLICY "Users can insert own analysis history" ON public.analysis_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 분석 기록만 업데이트 가능 (메모, 즐겨찾기)
DROP POLICY IF EXISTS "Users can update own analysis history" ON public.analysis_history;
CREATE POLICY "Users can update own analysis history" ON public.analysis_history
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 분석 기록만 삭제 가능
DROP POLICY IF EXISTS "Users can delete own analysis history" ON public.analysis_history;
CREATE POLICY "Users can delete own analysis history" ON public.analysis_history
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 3. Triggers
-- ==========================================

-- updated_at 자동 갱신
DROP TRIGGER IF EXISTS update_analysis_history_updated_at ON public.analysis_history;
CREATE TRIGGER update_analysis_history_updated_at
  BEFORE UPDATE ON public.analysis_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 4. Helper Functions
-- ==========================================

-- 사용자의 분석 기록 통계
CREATE OR REPLACE FUNCTION public.get_analysis_stats(user_id_param uuid)
RETURNS TABLE (
  category text,
  count bigint,
  total_cost integer,
  last_analyzed timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ah.category,
    COUNT(*) as count,
    SUM(ah.talisman_cost)::integer as total_cost,
    MAX(ah.created_at) as last_analyzed
  FROM public.analysis_history ah
  WHERE ah.user_id = user_id_param
  GROUP BY ah.category
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 최근 분석 기록 조회 (with Destiny Target info)
CREATE OR REPLACE FUNCTION public.get_recent_analysis(
  user_id_param uuid,
  limit_param integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  target_name text,
  target_relation text,
  category text,
  summary text,
  score integer,
  is_favorite boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ah.id,
    ah.target_name,
    ah.target_relation,
    ah.category,
    ah.summary,
    ah.score,
    ah.is_favorite,
    ah.created_at
  FROM public.analysis_history ah
  WHERE ah.user_id = user_id_param
  ORDER BY ah.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. Comments
-- ==========================================
COMMENT ON TABLE public.analysis_history IS '분석 기록 아카이빙 테이블. 모든 AI 분석 결과를 저장하여 사용자가 다시 확인 가능.';
COMMENT ON COLUMN public.analysis_history.target_id IS 'Destiny Target ID (v_destiny_targets 참조). Nullable for backward compatibility.';
COMMENT ON COLUMN public.analysis_history.result_json IS 'AI 분석 결과 원본 JSON. 버전 관리 및 재분석에 활용.';
COMMENT ON COLUMN public.analysis_history.prompt_version IS '사용된 프롬프트 버전. A/B 테스트 및 성능 추적용.';

-- ==========================================
-- 6. Grant Permissions
-- ==========================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analysis_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_analysis TO authenticated;
