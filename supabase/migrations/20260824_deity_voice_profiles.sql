-- 신위 음성 프로파일 — 어드민에서 목소리·속도·음높이를 직접 조절한다 (2026-08-24, CEO 지시)
--
-- 종전에는 lib/domain/shrine/voice-profiles.ts 코드 상수가 유일한 정본이라 값 하나 바꾸려면
-- 코드 수정 → 빌드 → 배포가 필요했다. 이 표가 있으면 어드민 화면에서 즉시 바뀐다.
--
-- 🔴 코드 상수는 «폴백»으로 남는다 — 이 표에 행이 없으면 종전 값 그대로다.
--    그래서 배포와 무관하게 안전하고, 표를 비우면 원상복구된다.
-- 🔴 쓰기는 service_role 전용(어드민 서버액션 경유). 음성 파라미터 자체는 비밀이 아니지만,
--    브라우저에서 직접 쓰게 두면 감사 로그가 남지 않는다(service-control 과 같은 규율).
--
-- ⚠️ 적용 상태: 라이브 DB 적용 완료 (2026-08-24, Supabase MCP). 이 리포엔 자동 적용 파이프라인 없음.

CREATE TABLE IF NOT EXISTS public.deity_voice_profiles (
  deity_code    text PRIMARY KEY,
  -- edge-tts 보이스 ShortName (예: ko-KR-InJoonNeural, en-US-AndrewMultilingualNeural)
  edge_voice    text NOT NULL,
  -- SSML prosody pitch 오프셋 (예: '+28Hz', '-22Hz')
  edge_pitch    text NOT NULL DEFAULT '+0Hz',
  -- 발화 속도 0.5~2.0 (edge·브라우저 공용)
  rate          numeric NOT NULL DEFAULT 1.0 CHECK (rate >= 0.5 AND rate <= 2.0),
  -- 브라우저 Web Speech 폴백용 음높이 0~2
  browser_pitch numeric NOT NULL DEFAULT 1.0 CHECK (browser_pitch >= 0 AND browser_pitch <= 2),
  -- 브라우저 보이스 성별 힌트 (male/female/null)
  voice_hint    text CHECK (voice_hint IN ('male', 'female')),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid
);

ALTER TABLE public.deity_voice_profiles ENABLE ROW LEVEL SECURITY;

-- 읽기: 로그인 사용자 전체(발화 파라미터라 비밀이 아니다). 쓰기 정책 없음 = service_role 전용.
DROP POLICY IF EXISTS deity_voice_profiles_read ON public.deity_voice_profiles;
CREATE POLICY deity_voice_profiles_read ON public.deity_voice_profiles
  FOR SELECT TO authenticated USING (true);
