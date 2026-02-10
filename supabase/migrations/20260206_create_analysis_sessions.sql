-- Studio Multimodal Analysis Sessions Table
-- Stores analysis history for family members (guests are not saved to DB)

CREATE TABLE IF NOT EXISTS public.analysis_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_member_id uuid REFERENCES public.family_members(id) ON DELETE CASCADE,
    -- NULL for guest analyses (not stored in DB, just for type compatibility)
  
  -- Analysis category
  category text NOT NULL CHECK (category IN (
    'SAJU', 'FACE', 'HAND', 'FENGSHUI', 
    'COMPATIBILITY', 'TODAY', 'WEALTH', 'NEW_YEAR'
  )),
  
  -- Input data (JSON)
  -- Face: { goal: 'wealth'|'love'|'authority', imageUrl: string }
  -- Palm: { imageUrl: string }
  -- Fengshui: { theme: 'wealth'|'romance'|'health', roomType: string, imageUrl: string }
  input_data jsonb NOT NULL DEFAULT '{}',
  
  -- Result data (JSON)
  -- Common: { score?: number, analysis: string, recommendations?: string[] }
  -- Face-specific: { facialFeatures: {...}, currentScore: number, confidence: number }
  -- Fengshui-specific: { problems: string[], shoppingList: string[], beforeImageUrl: string, afterImageUrl?: string }
  result_data jsonb NOT NULL DEFAULT '{}',
  
  -- Credits deducted for this analysis
  credits_used integer NOT NULL DEFAULT 0,
  
  -- Share tracking
  shared boolean DEFAULT false,
  share_card_url text, -- URL of generated share card image
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON public.analysis_sessions(user_id);
CREATE INDEX idx_sessions_target ON public.analysis_sessions(target_member_id);
CREATE INDEX idx_sessions_category ON public.analysis_sessions(category);
CREATE INDEX idx_sessions_created ON public.analysis_sessions(created_at DESC);

-- Composite index for family member mission tracking
CREATE INDEX idx_sessions_target_category ON public.analysis_sessions(target_member_id, category)
  WHERE target_member_id IS NOT NULL;

-- Row Level Security
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own analysis sessions" 
  ON public.analysis_sessions
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own analysis sessions" 
  ON public.analysis_sessions
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions (for share tracking)
CREATE POLICY "Users can update own analysis sessions" 
  ON public.analysis_sessions
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_analysis_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_analysis_session_updated_at
  BEFORE UPDATE ON public.analysis_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_analysis_session_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.analysis_sessions IS 'Stores multimodal AI analysis results for family members';
COMMENT ON COLUMN public.analysis_sessions.target_member_id IS 'NULL for guest analyses';
COMMENT ON COLUMN public.analysis_sessions.input_data IS 'JSON containing analysis inputs (goal, theme, imageUrl, etc.)';
COMMENT ON COLUMN public.analysis_sessions.result_data IS 'JSON containing AI analysis results';
COMMENT ON COLUMN public.analysis_sessions.share_card_url IS 'URL of generated OG share card image';
