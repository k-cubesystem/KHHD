-- Set pdkshno1@gmail.com as admin
UPDATE public.profiles
SET role = 'admin'
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'pdkshno1@gmail.com'
);
