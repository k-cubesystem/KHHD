-- Grant Admin Role to Specific User
-- Replace 'pdkshno1@gmail.com' with the target email if needed.

UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = 'pdkshno1@gmail.com'
);

-- Verify the change
SELECT email, role 
FROM profiles 
JOIN auth.users ON profiles.id = auth.users.id
WHERE email = 'pdkshno1@gmail.com';
