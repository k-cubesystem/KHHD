-- Sync emails from auth.users to public.profiles
-- This allows us to query emails directly from profiles without needing Service Role Key for auth.admin.listUsers()

UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE public.profiles.id = auth.users.id
AND public.profiles.email IS NULL;

-- Confirm sync
SELECT count(*) as "Profiles with Email" FROM public.profiles WHERE email IS NOT NULL;
