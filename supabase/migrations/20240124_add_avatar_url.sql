-- Add avatar_url column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add comment
COMMENT ON COLUMN profiles.avatar_url IS 'URL of the user profile picture';
