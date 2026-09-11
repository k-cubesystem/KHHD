-- 함께 보기 «최근 본 조합» — 어떤 사람들의 조합이었는지(ids·names)를 남긴다 (2026-09-12)
-- target_key 는 정렬한 조합의 해시(≤64자)라 사람을 되짚을 수 없어, 화면이 보여 줄 이름을 따로 둔다.
ALTER TABLE public.circle_narratives ADD COLUMN IF NOT EXISTS meta jsonb;
COMMENT ON COLUMN public.circle_narratives.meta IS '함께 보기(kind=together)의 {ids, names} — 지도의 «최근 본 조합» 목록용';
