-- Phase 28: Credit-Based Access - Add Talisman Cost to Prompts

ALTER TABLE ai_prompts 
ADD COLUMN IF NOT EXISTS talisman_cost INTEGER DEFAULT 1;

-- Add comment
COMMENT ON COLUMN ai_prompts.talisman_cost IS 'Cost in Talismans to use this feature/prompt';

-- Update existing prompts to reasonable defaults (Optional)
-- UPDATE ai_prompts SET talisman_cost = 1 WHERE category = 'ANALYSIS';
-- UPDATE ai_prompts SET talisman_cost = 3 WHERE category = 'CHAT'; -- Shaman Chat is more expensive?
