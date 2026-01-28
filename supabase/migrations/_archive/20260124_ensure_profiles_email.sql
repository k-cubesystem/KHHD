-- Ensure profiles table has email column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Create a function to handle new user signup including email
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger update (if needed, dropping old one to Ensure correct one)
-- This part depends on if the trigger already exists. 
-- For safety, we just add the column. 
-- Syncing existing emails might require a separate one-time script:
-- UPDATE profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id AND p.email IS NULL;
