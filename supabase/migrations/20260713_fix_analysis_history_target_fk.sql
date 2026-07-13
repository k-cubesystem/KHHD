-- 분석 기록 저장 P0 수복 (2026-07-13)
-- 증상: 본인 대상 분석(천지인/오늘의운세 등)의 analysis_history 저장이 전부 무음 실패
--       → 분석 내역 미축적 + 결과 캐시 부재로 재방문마다 재분석(재과금) 발생.
-- 원인: analysis_history.target_id FK가 family_members(id)만 허용하는데,
--       코드 계약(destiny target)은 본인=profiles.id / 가족=family_members.id 다형 ID.
--       본인 분석 insert가 FK 위반으로 실패(에러는 로그만 남고 무음).
-- 조치: 다형 ID 계약에 맞게 FK 제거. (참조 무결성은 앱 레이어 + ON DELETE는
--       profiles/family_members 삭제 시 user_id CASCADE로 간접 정리됨)

ALTER TABLE public.analysis_history DROP CONSTRAINT IF EXISTS analysis_history_target_id_fkey;

CREATE INDEX IF NOT EXISTS idx_analysis_history_target ON public.analysis_history(target_id);

COMMENT ON COLUMN public.analysis_history.target_id IS
  'destiny target id (다형: 본인=profiles.id, 가족=family_members.id) — FK 없음, v_destiny_targets 참조';
