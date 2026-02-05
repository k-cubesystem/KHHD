-- 프로필 테이블 확장: 초개인화 분석을 위한 컬럼 추가
-- 작성일: 2026-02-07
-- 목적: 사용자의 중점 관심사와 활동 성향을 저장하여 AI 분석 정확도 향상

-- 1. 컬럼 추가
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS focus_areas text,
ADD COLUMN IF NOT EXISTS activity_status text CHECK (activity_status IN ('active', 'moderate', 'passive'));

-- 2. 컬럼 설명 추가
COMMENT ON COLUMN profiles.focus_areas IS '중점 관심사 및 현재 고민 (콤마 구분, 예: 취업,건강,재물운,승진운)';
COMMENT ON COLUMN profiles.activity_status IS '활동 상태 (적극적/보통/소극적)';

-- 3. 인덱스 생성 (활동 상태별 필터링 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_activity_status ON public.profiles(activity_status);

-- 4. 기존 사용자 기본값 설정
UPDATE public.profiles SET activity_status = 'moderate' WHERE activity_status IS NULL;
