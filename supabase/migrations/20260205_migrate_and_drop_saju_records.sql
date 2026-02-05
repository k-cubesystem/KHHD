-- =========================================================
-- 마이그레이션: saju_records → analysis_history
-- 1. saju_records 테이블의 데이터를 analysis_history로 이동
-- 2. saju_records 테이블 백업 및 Drop (Deprecated)
-- =========================================================

-- 안전을 위해 트랜잭션 시작
BEGIN;

-- 1. 데이터 마이그레이션
-- analysis_history에 없는 saju_records 데이터만 삽입
INSERT INTO public.analysis_history (
    id,
    user_id,
    target_id,
    target_name,
    target_relation,
    category,
    context_mode,
    result_json,
    summary,
    score,
    talisman_cost,
    created_at,
    updated_at
)
SELECT
    sr.id,
    -- user_id는 family_members를 통해 가져옵니다
    fm.user_id,
    sr.member_id as target_id,
    fm.name as target_name,
    fm.relationship as target_relation,
    'SAJU' as category, -- 기존 saju_records는 기본적으로 SAJU 카테고리
    'GENERAL' as context_mode, -- 기본 모드
    -- full_report_html이 텍스트라면 JSON으로 래핑, analysis_data가 있으면 우선 사용
    COALESCE(sr.analysis_data, jsonb_build_object('html_content', sr.full_report_html)) as result_json,
    '이전 사주 분석 기록' as summary, -- 요약이 없으므로 기본값
    sr.luck_score as score,
    0 as talisman_cost, -- 과거 기록은 비용 0으로 처리
    sr.created_at,
    NOW() as updated_at
FROM public.saju_records sr
JOIN public.family_members fm ON sr.member_id = fm.id
-- 이미 이관된 데이터(ID 충돌 등) 방지
WHERE NOT EXISTS (
    SELECT 1 FROM public.analysis_history ah WHERE ah.id = sr.id
);

-- 2. saju_records 테이블 백업 (이름 변경)
ALTER TABLE public.saju_records RENAME TO saju_records_backup_deprecated;

-- 3. 기존 RLS 정책 삭제 (백업 테이블)
DROP POLICY IF EXISTS "Users can view own saju records" ON public.saju_records_backup_deprecated;

-- 4. 백업 테이블에 대한 접근 권한 회수 (선택적)
-- REVOKE ALL ON public.saju_records_backup_deprecated FROM authenticated;
-- REVOKE ALL ON public.saju_records_backup_deprecated FROM anon;

-- 5. 알림 (실제 실행 시 주석 처리 필요 없음, SQL Editor용)
-- SELECT 'Migration Completed. Old table renamed to saju_records_backup_deprecated.';

COMMIT;
