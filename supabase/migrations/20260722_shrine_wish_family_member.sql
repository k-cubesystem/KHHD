-- W2-b: 소원 대상(신당 소유 가족) 식별 컬럼 — 로그에 대상명 표기용.
-- shrineId 로 이미 분리되므로 필터가 아닌 표기·명시성 강화 목적. 멱등.
-- 기존 행은 NULL = 본인 소원(호환). 가족 삭제 시 소원 행은 보존하고 참조만 NULL(행 삭제 금지).
ALTER TABLE shrine_wishes
  ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL;

COMMENT ON COLUMN shrine_wishes.family_member_id IS '소원이 향한 가족 신당 대상(NULL=본인). shrineId 스코프의 표기 보강(2026-07-22 세션30).';

-- 대상별 소원 조회 보조 인덱스(멱등). shrineId 스코프가 정본이므로 부분 인덱스로 최소화.
CREATE INDEX IF NOT EXISTS idx_shrine_wishes_family_member
  ON shrine_wishes (family_member_id)
  WHERE family_member_id IS NOT NULL;
