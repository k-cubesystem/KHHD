-- Feature Flags Initialization
-- 기존 system_settings 테이블을 활용하여 기능 제어 플래그를 관리합니다.
-- value 컬럼에 JSON 형태의 설정을 저장합니다.

-- 1. 주요 기능 제어 플래그 초기화
INSERT INTO public.system_settings (key, value, description) VALUES
    ('feat_saju_today', '{"isActive": true, "accessLevel": "all"}', '오늘의 운세 기능 활성화 여부'),
    ('feat_saju_compat', '{"isActive": true, "accessLevel": "all"}', '궁합 분석 기능 활성화 여부'),
    ('feat_face_analysis', '{"isActive": true, "accessLevel": "all"}', '관상 분석 기능 활성화 여부'),
    ('feat_fengshui', '{"isActive": true, "accessLevel": "all"}', '풍수 인테리어 기능 활성화 여부'),
    ('feat_payment_pg', '{"isActive": true, "accessLevel": "tester"}', 'PG 결제 연동 (테스트 모드)'),
    ('global_maintenance', '{"isActive": false, "message": "시스템 점검 중입니다."}', '전체 서비스 점검 모드')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description;

-- 2. 관리자 전용 뷰 권한 재확인 (혹시 모를 RLS 누락 방지)
-- (이미 create_system_settings.sql에 정책이 있지만, 안전을 위해 확실히 명시)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_settings' 
        AND policyname = 'Admins can manage system settings'
    ) THEN
        CREATE POLICY "Admins can manage system settings"
            ON public.system_settings
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'admin'
                )
            );
    END IF;
END
$$;
