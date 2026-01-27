-- Phase 27: Daily Fortune Automation Tables

-- 1. Daily Fortunes Table (Store generated content)
CREATE TABLE IF NOT EXISTS daily_fortunes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    content TEXT NOT NULL,
    full_json JSONB, -- For storing detailed structured data if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 2. Notification Logs (Track delivery)
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'KAKAO',
    status VARCHAR(50) NOT NULL CHECK (status IN ('SENT', 'FAILED', 'PENDING')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. System Settings (Global Config)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Toggle RLS
ALTER TABLE daily_fortunes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policies

-- Daily Fortunes: Users can read their own
CREATE POLICY "Users can read own daily fortunes" ON daily_fortunes
    FOR SELECT USING (auth.uid() = user_id);

-- System Settings: Public read (or admin only?), Admin write
CREATE POLICY "Everyone can read system settings" ON system_settings
    FOR SELECT USING (true); -- Front-end needs to check enabled status? Or maybe secure it.
    -- Actually, public shouldn't know internal settings. Let's restrict to authenticated or make helper functions.
    -- For now, allow authenticated read.
    
DROP POLICY IF EXISTS "Auth users can read settings" ON system_settings;
CREATE POLICY "Auth users can read settings" ON system_settings
    FOR SELECT TO authenticated USING (true);

-- Admin policies (assuming admin role check exists via profiles or custom claim, but for now using service_role or admin check function in app)
-- Simple Admin Check Policy (relying on app logic mostly, but good to have DB level)
-- (Skipping complex admin policy for brevity, relying on Service Role for Cron Jobs)

-- Index
CREATE INDEX IF NOT EXISTS idx_daily_fortunes_user_date ON daily_fortunes(user_id, date);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- Initial Settings
INSERT INTO system_settings (key, value, description) 
VALUES 
    ('daily_fortune_time', '08:00', 'Daily fortune sending time (KST)'),
    ('daily_fortune_enabled', 'false', 'Enable/Disable daily fortune automation'),
    ('kakao_template_id', '', 'Kakao AlimTalk Template ID')
ON CONFLICT (key) DO NOTHING;
