-- destiny-images 버킷 수동 생성 스크립트
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- 1. 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('destiny-images', 'destiny-images', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS 정책 생성
DROP POLICY IF EXISTS "Users can view own destiny images" ON storage.objects;
CREATE POLICY "Users can view own destiny images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'destiny-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can upload own destiny images" ON storage.objects;
CREATE POLICY "Users can upload own destiny images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'destiny-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own destiny images" ON storage.objects;
CREATE POLICY "Users can update own destiny images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'destiny-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own destiny images" ON storage.objects;
CREATE POLICY "Users can delete own destiny images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'destiny-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 완료 메시지
SELECT 'destiny-images 버킷 생성 완료!' as message;
