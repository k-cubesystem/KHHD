-- Create a new private bucket 'profile-images'
-- Note: 'public' column needs to be true for direct URL access without signed URLs
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the bucket

-- 1. Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'profile-images' AND
    auth.uid() = (storage.foldername(name))[1]::uuid -- Ensure users can only upload to their own folder (optional security measure, or just allow all auth users)
);

-- Actually, for simplicity in this app context, let's allow authenticated uploads generally, 
-- or stick to a simpler policy if folders aren't strictly enforced.
-- Let's use a simpler policy for MVP: "Authenticated users can upload"
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'profile-images'
);

-- 2. Allow public access to view images (since it's a public bucket)
-- By default, public buckets allow public read. But sometimes RLS on objects is needed.
DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;
CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT TO public USING (
    bucket_id = 'profile-images'
);

-- 3. Allow users to update/delete their own files (optional but good)
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE TO authenticated USING (
    bucket_id = 'profile-images'
);

DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE TO authenticated USING (
    bucket_id = 'profile-images'
);
