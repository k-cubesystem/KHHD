-- Allow authenticated users to insert their own profile
-- This is necessary as a fallback when the handle_new_user trigger fails
-- or for users created before the trigger existed/worked correctly

DO $$
BEGIN
    -- Check if policy exists before creating to avoid errors
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile" 
        ON public.profiles 
        FOR INSERT 
        WITH CHECK (auth.uid() = id);
    END IF;

    -- Ensure UPDATE policy also exists (common issue)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" 
        ON public.profiles 
        FOR UPDATE 
        USING (auth.uid() = id);
    END IF;

    -- Ensure SELECT policy also exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" 
        ON public.profiles 
        FOR SELECT 
        USING (auth.uid() = id);
    END IF;

    -- Also consider public read access if needed (e.g. usernames), but for now stick to owner.
END $$;

-- Grant permissions explicitly just in case
GRANT INSERT, UPDATE, SELECT ON TABLE public.profiles TO authenticated;
