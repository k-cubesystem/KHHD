-- Check if membership_plans table exists and has data
SELECT to_regclass('public.membership_plans');

-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'membership_plans';

-- Check RLS
SELECT enabled, qual 
FROM pg_policies 
WHERE tablename = 'membership_plans';

-- Check data count
SELECT count(*) FROM public.membership_plans;
