-- Fix roulette_history check constraint to allow 'bokchae' and 'miss' types
-- The constraint currently only allows 'talisman', 'premium', 'discount'
-- but the actual code uses 'bokchae' and 'miss'

DO $$
BEGIN
    -- Drop the old constraint
    ALTER TABLE roulette_history DROP CONSTRAINT IF EXISTS roulette_history_reward_type_check;
    
    -- Add new constraint with correct reward types
    ALTER TABLE roulette_history 
    ADD CONSTRAINT roulette_history_reward_type_check 
    CHECK (reward_type IN ('bokchae', 'miss', 'talisman', 'premium', 'discount'));
    
    RAISE NOTICE 'roulette_history constraint updated to allow bokchae and miss types';
END $$;
