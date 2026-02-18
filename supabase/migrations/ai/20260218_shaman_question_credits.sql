-- 신당 질문권 테이블
-- 유저별 구매한 누적 질문권을 저장 (영구 보관, 날짜 리셋 없음)
CREATE TABLE IF NOT EXISTS public.shaman_question_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  purchased_credits INT DEFAULT 0 NOT NULL CHECK (purchased_credits >= 0),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shaman_question_credits ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성 (idempotent)
DROP POLICY IF EXISTS "Users can read own shaman credits" ON public.shaman_question_credits;
DROP POLICY IF EXISTS "Users can insert own shaman credits" ON public.shaman_question_credits;
DROP POLICY IF EXISTS "Users can update own shaman credits" ON public.shaman_question_credits;
DROP POLICY IF EXISTS "Service role full access" ON public.shaman_question_credits;

CREATE POLICY "Users can read own shaman credits"
  ON public.shaman_question_credits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shaman credits"
  ON public.shaman_question_credits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shaman credits"
  ON public.shaman_question_credits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- service_role 전체 접근 허용 (admin operations)
CREATE POLICY "Service role full access"
  ON public.shaman_question_credits FOR ALL
  TO service_role
  USING (true);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION public.update_shaman_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_shaman_credits_updated_at ON public.shaman_question_credits;

CREATE TRIGGER update_shaman_credits_updated_at
  BEFORE UPDATE ON public.shaman_question_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shaman_credits_updated_at();

-- total_turns: 하루 질문 사용 횟수 (날짜별 자동 리셋, ai_chat_usage 재활용)
