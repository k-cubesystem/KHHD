-- Create system_settings table for admin configurations
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default notification settings
INSERT INTO public.system_settings (key, value, description) VALUES
    ('daily_fortune_enabled', 'false', '오늘의 운세 자동 발송 활성화'),
    ('daily_fortune_time', '08:00', '운세 발송 시간 (KST)'),
    ('kakao_template_id', '', '카카오 알림톡 템플릿 ID')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view/edit
CREATE POLICY "Admins can manage system settings"
    ON public.system_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create notification_logs table if not exists
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED', 'PENDING')),
    error_message TEXT,
    template_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view notification logs
CREATE POLICY "Admins can view notification logs"
    ON public.notification_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: System can insert notification logs
CREATE POLICY "System can insert notification logs"
    ON public.notification_logs
    FOR INSERT
    WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
