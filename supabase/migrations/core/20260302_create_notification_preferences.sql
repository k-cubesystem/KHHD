-- 알림 설정 테이블
-- 카카오 알림톡 수신 동의 및 전화번호 관리

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- 연락처
    phone_number TEXT,                          -- 정규화된 전화번호 (01012345678)

    -- 알림톡 수신 동의
    alimtalk_enabled BOOLEAN NOT NULL DEFAULT FALSE,         -- 카카오 알림톡 전체 수신 동의
    daily_fortune_enabled BOOLEAN NOT NULL DEFAULT FALSE,    -- 오늘의 운세 매일 수신
    attendance_reward_enabled BOOLEAN NOT NULL DEFAULT FALSE, -- 출석 보상 알림
    payment_enabled BOOLEAN NOT NULL DEFAULT FALSE,          -- 복채 결제/충전 알림

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id),
    CONSTRAINT phone_number_format CHECK (
        phone_number IS NULL OR phone_number ~ '^01[0-9]{8,9}$'
    )
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER set_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notification_preferences_updated_at();

-- RLS 활성화
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 사용자 본인만 조회/수정 가능
CREATE POLICY "Users can view own notification preferences"
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
    ON public.notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
    ON public.notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- 어드민은 모든 레코드 접근 가능 (알림톡 일괄 발송용)
CREATE POLICY "Service role can manage all notification preferences"
    ON public.notification_preferences
    USING (auth.role() = 'service_role');

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
    ON public.notification_preferences (user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_alimtalk_daily
    ON public.notification_preferences (alimtalk_enabled, daily_fortune_enabled)
    WHERE alimtalk_enabled = TRUE AND daily_fortune_enabled = TRUE;

COMMENT ON TABLE public.notification_preferences IS '카카오 알림톡 수신 설정 및 전화번호';
COMMENT ON COLUMN public.notification_preferences.phone_number IS '정규화된 전화번호 (하이픈 없이, 01012345678 형식)';
COMMENT ON COLUMN public.notification_preferences.alimtalk_enabled IS '카카오 알림톡 전체 수신 동의 마스터 스위치';
