-- ============================================
-- Phase 2.5: Destiny Images Storage Buckets
-- 관상 및 풍수 이미지 저장을 위한 버킷 정책
-- ============================================

-- ==========================================
-- 1. Destiny Images Bucket 생성
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('destiny-images', 'destiny-images', false)
ON CONFLICT (id) DO NOTHING;

-- (COMMENT ON COLUMN removed to avoid permission errors)

-- ==========================================
-- 2. Storage Policies (RLS)
-- ==========================================

-- 사용자는 자신의 폴더만 조회 가능
DROP POLICY IF EXISTS "Users can view own destiny images" ON storage.objects;
CREATE POLICY "Users can view own destiny images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'destiny-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 사용자는 자신의 폴더에만 업로드 가능
DROP POLICY IF EXISTS "Users can upload own destiny images" ON storage.objects;
CREATE POLICY "Users can upload own destiny images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'destiny-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 사용자는 자신의 이미지만 업데이트 가능
DROP POLICY IF EXISTS "Users can update own destiny images" ON storage.objects;
CREATE POLICY "Users can update own destiny images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'destiny-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 사용자는 자신의 이미지만 삭제 가능
DROP POLICY IF EXISTS "Users can delete own destiny images" ON storage.objects;
CREATE POLICY "Users can delete own destiny images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'destiny-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ==========================================
-- 3. 폴더 구조 규칙 (주석으로만 남김)
-- ==========================================
-- /destiny-images/{userId}/{targetId}/face-{timestamp}.jpg
-- /destiny-images/{userId}/{targetId}/hand-{timestamp}.jpg
-- /destiny-images/{userId}/{targetId}/fengshui-{timestamp}.jpg
