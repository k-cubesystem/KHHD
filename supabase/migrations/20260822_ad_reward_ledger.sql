-- 속풀이 P1-A — 광고 리워드(쿠팡 방문형) 원장 + 원자 RPC (2026-08-22, ARCH-counsel-sokpuri-v1 §6-1)
-- 원칙: 발급·지급·소비·환급 전부 service_role 전용 원자 RPC (wallets 자가발행 사고 교훈).
-- 위조를 100% 막기보다 «위조해도 상한에 막히는» 구조 — 일일 세트·시작 한도·최소 체류·만료·예산 브레이커.
-- 일일 상한의 KST 날짜 판정은 **이 파일(SQL) 한 곳**이 정본 — JS 쪽에서 재구현하지 말 것
-- (배경화면 하우스 광고와 상한 규칙이 갈라지는 사고 방지, get_ad_reward_today 로 조회만).
--
-- ⚠️ 적용 상태: 라이브 DB 적용 완료 (2026-08-22, Supabase MCP). 이 리포엔 마이그레이션 자동
--    적용 파이프라인이 없다 — 적용은 사람이 MCP/SQL 로 거는 것 하나뿐. 재실행은 무해(IF NOT EXISTS/
--    CREATE OR REPLACE)하나 적용 여부 판단은 DB 실측으로.

CREATE TABLE IF NOT EXISTS public.ad_reward_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('coupang_visit', 'gam_rewarded')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted')),
  qty int NOT NULL DEFAULT 0,
  remaining int NOT NULL DEFAULT 0 CHECK (remaining >= 0),
  proof jsonb NOT NULL DEFAULT '{}'::jsonb,
  proof_key text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  granted_at timestamptz,
  expires_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ad_reward_ledger_proof_key ON public.ad_reward_ledger (proof_key);
CREATE INDEX IF NOT EXISTS ad_reward_ledger_user_live
  ON public.ad_reward_ledger (user_id, expires_at) WHERE remaining > 0;

ALTER TABLE public.ad_reward_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ad_reward_ledger_select_own ON public.ad_reward_ledger;
CREATE POLICY ad_reward_ledger_select_own ON public.ad_reward_ledger
  FOR SELECT USING (auth.uid() = user_id);
-- INSERT/UPDATE/DELETE 정책 없음 — 쓰기는 service_role RPC 전용.

-- ① 시작: pending 발급. KST 기준 일일 «지급 세트»·«시작 시도» 한도를 함수 안에서 강제.
CREATE OR REPLACE FUNCTION public.start_ad_reward(
  p_user_id uuid, p_provider text, p_nonce text, p_daily_sets int, p_daily_starts int
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
BEGIN
  IF (SELECT count(*) FROM ad_reward_ledger
      WHERE user_id = p_user_id AND provider = p_provider AND status = 'granted'
        AND (granted_at AT TIME ZONE 'Asia/Seoul')::date = v_today) >= p_daily_sets THEN
    RETURN 'DAILY_LIMIT';
  END IF;
  IF (SELECT count(*) FROM ad_reward_ledger
      WHERE user_id = p_user_id
        AND (started_at AT TIME ZONE 'Asia/Seoul')::date = v_today) >= p_daily_starts THEN
    RETURN 'START_LIMIT';
  END IF;
  INSERT INTO ad_reward_ledger (user_id, provider, proof_key, proof)
  VALUES (p_user_id, p_provider, p_nonce, jsonb_build_object('nonce', p_nonce));
  RETURN 'OK';
END $$;

-- ② 지급: pending → granted 전이(멱등 — WHERE status='pending'). 최소 체류 미달은 거절.
CREATE OR REPLACE FUNCTION public.grant_ad_reward(
  p_user_id uuid, p_nonce text, p_qty int, p_min_dwell_seconds int, p_expire_hours int
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row ad_reward_ledger%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM ad_reward_ledger WHERE proof_key = p_nonce AND user_id = p_user_id;
  IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
  IF v_row.status = 'granted' THEN RETURN 'ALREADY'; END IF;
  IF now() - v_row.started_at < make_interval(secs => p_min_dwell_seconds) THEN RETURN 'TOO_FAST'; END IF;
  UPDATE ad_reward_ledger
  SET status = 'granted', qty = p_qty, remaining = p_qty,
      granted_at = now(), expires_at = now() + make_interval(hours => p_expire_hours),
      proof = proof || jsonb_build_object('claimed_at', now())
  WHERE id = v_row.id AND status = 'pending';
  IF NOT FOUND THEN RETURN 'ALREADY'; END IF;
  RETURN 'GRANTED';
END $$;

-- ③ 소비: 만료 임박 순 1장. 잔량 반환, 없으면 -1.
CREATE OR REPLACE FUNCTION public.consume_ad_credit(p_user_id uuid) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_new int;
BEGIN
  UPDATE ad_reward_ledger SET remaining = remaining - 1
  WHERE id = (
    SELECT id FROM ad_reward_ledger
    WHERE user_id = p_user_id AND status = 'granted' AND remaining > 0 AND expires_at > now()
    ORDER BY expires_at ASC LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING remaining INTO v_new;
  IF v_new IS NULL THEN RETURN -1; END IF;
  RETURN v_new;
END $$;

-- ④ 환급(AI 실패 보상): 가장 늦게 만료되는 유효 행 +1. 유효 행이 없으면 -1(호출측이 구매권 +1 폴백).
CREATE OR REPLACE FUNCTION public.refund_ad_credit(p_user_id uuid) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_new int;
BEGIN
  UPDATE ad_reward_ledger SET remaining = remaining + 1
  WHERE id = (
    SELECT id FROM ad_reward_ledger
    WHERE user_id = p_user_id AND status = 'granted' AND expires_at > now()
    ORDER BY expires_at DESC LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING remaining INTO v_new;
  IF v_new IS NULL THEN RETURN -1; END IF;
  RETURN v_new;
END $$;

-- ⑤ 오늘 지급 수 조회 — KST 날짜 규칙을 SQL 한 곳에 두기 위한 읽기 전용 RPC (가용성 표시용)
CREATE OR REPLACE FUNCTION public.get_ad_reward_today(p_user_id uuid, p_provider text) RETURNS int
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(*)::int FROM ad_reward_ledger
  WHERE user_id = p_user_id AND provider = p_provider AND status = 'granted'
    AND (granted_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date;
$$;

REVOKE ALL ON FUNCTION public.get_ad_reward_today(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ad_reward_today(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.start_ad_reward(uuid, text, text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_ad_reward(uuid, text, int, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_ad_credit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_ad_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_ad_reward(uuid, text, text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_ad_reward(uuid, text, int, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_ad_credit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_ad_credit(uuid) TO service_role;

-- ⑤ 운영 스위치·수치 (어드민이 무배포 조정)
INSERT INTO public.system_settings (key, value, description) VALUES
  ('chat_ad_reward_enabled', 'true', '속풀이 광고 리워드 마스터 스위치 (false=버튼 숨김·지급 중단)'),
  ('chat_ad_daily_sets', '1', '유저당 하루 지급 세트 수 (쿠팡 방문형)'),
  ('chat_ad_daily_starts', '5', '유저당 하루 시작 시도 한도 (논스 남발 방지)'),
  ('chat_ad_visit_reward', '2', '쿠팡 방문 1회당 지급 질문권 수'),
  ('chat_ad_min_dwell_seconds', '15', '방문 최소 체류 초 (미달 지급 거절)'),
  ('chat_ad_credit_expire_hours', '48', '광고 질문권 유효 시간')
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.system_settings (key, value, description) VALUES
  ('ai_daily_budget_usd', '30', 'AI 일일 예산(USD). 도달 시 광고 리워드 발급 자동 중단 — 유료 경로는 계속'),
  ('coupang_partners_url', '', '쿠팡 파트너스 수동 폴백 링크 (오픈API 키 미설정 시 사용, 비면 기능 숨김)')
ON CONFLICT (key) DO NOTHING;
