-- 가이드 투어 진행률 서버 저장 (P2-10)
-- 기존엔 localStorage 라 기기가 바뀌면 초기화됐다. profiles JSONB 로 승격 —
-- RLS(본인 select/update)가 이미 걸려 있어 별도 정책 불필요.
-- 형태: { "/protected/analysis": 3, "/protected/store": 1, "_notice": "<announcement-id>" }

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS guide_progress jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.profiles.guide_progress IS '신 가이드 투어 진행률(경로→완료 스텝 수) + _notice(확인한 공지 id).';
