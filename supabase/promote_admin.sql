-- pdkshno1@gmail.com 계정을 관리자로 승격시키는 쿼리

UPDATE public.profiles
SET role = 'admin'
FROM auth.users
WHERE public.profiles.id = auth.users.id
AND auth.users.email = 'pdkshno1@gmail.com';

-- 확인용: 변경된 결과 조회
SELECT 
    p.id, 
    u.email, 
    p.role 
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'pdkshno1@gmail.com';
