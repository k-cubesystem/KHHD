-- Add extended profile fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS address_detail text,
ADD COLUMN IF NOT EXISTS zipcode text,
ADD COLUMN IF NOT EXISTS marital_status text,
ADD COLUMN IF NOT EXISTS religion text,
ADD COLUMN IF NOT EXISTS job text,
ADD COLUMN IF NOT EXISTS hobbies text,
ADD COLUMN IF NOT EXISTS specialties text,
ADD COLUMN IF NOT EXISTS life_philosophy text;

-- Add comment for documentation
COMMENT ON COLUMN profiles.phone IS 'User phone number';
COMMENT ON COLUMN profiles.address IS 'Basic address from Kakao Address API';
COMMENT ON COLUMN profiles.address_detail IS 'Detailed address input by user';
COMMENT ON COLUMN profiles.zipcode IS 'Postal code';
COMMENT ON COLUMN profiles.marital_status IS 'Marital status (미혼, 기혼, 기타)';
COMMENT ON COLUMN profiles.religion IS 'Religion';
COMMENT ON COLUMN profiles.job IS 'Occupation';
COMMENT ON COLUMN profiles.hobbies IS 'Hobbies';
COMMENT ON COLUMN profiles.specialties IS 'Special skills';
COMMENT ON COLUMN profiles.life_philosophy IS 'Life philosophy or motto';
