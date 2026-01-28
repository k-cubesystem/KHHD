-- Phase 29: Daily Fortune Expansion

-- 1. Add target_id to daily_fortunes to support multi-profile fortunes
ALTER TABLE daily_fortunes 
ADD COLUMN IF NOT EXISTS target_id UUID;

-- Update existing records to match user_id if target_id is null (migration fix)
UPDATE daily_fortunes SET target_id = user_id WHERE target_id IS NULL;

-- 2. Create daily_subscriptions table
CREATE TABLE IF NOT EXISTS daily_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'KAKAO', -- 'KAKAO', 'EMAIL', etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, channel)
);

COMMENT ON TABLE daily_subscriptions IS 'Users subscribed to daily fortune notifications';
