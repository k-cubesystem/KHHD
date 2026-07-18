-- 배치 효험 2~4호 (P2-11) — 향로·초롱·놋방울·복 부적
-- 근거: TEAM_G_DESIGN/prd/PLAN-family-shrine-chat-v1.md §3, 로드맵 P2-11
-- 원칙(기억의 함에서 검증됨): 효과는 카탈로그 JSONB 선언, 서버가 배치 여부를 검증.
--   type            효과
--   oracle_freq     신탁 선톡 간격 완화 (2일 1회 → 1일 1회) + 주간 상한 +N
--   lucky_hour      오늘의 운세에 '행운의 시간' 한 줄 추가
--   deity_greeting  신당 입장 시 主神이 이름을 불러 인사
--   attendance_bonus 출석 보상 +N% (반올림)

UPDATE public.shrine_item_catalog
SET unlock_effect = '{"type":"oracle_freq","min_gap_hours":24,"weekly_cap_bonus":2,"max_stack":1}'::jsonb
WHERE name = '향로';

UPDATE public.shrine_item_catalog
SET unlock_effect = '{"type":"lucky_hour","max_stack":1}'::jsonb
WHERE name = '초롱';

UPDATE public.shrine_item_catalog
SET unlock_effect = '{"type":"deity_greeting","max_stack":1}'::jsonb
WHERE name = '놋방울';

UPDATE public.shrine_item_catalog
SET unlock_effect = '{"type":"attendance_bonus","percent":10,"max_stack":1}'::jsonb
WHERE name = '복 부적';
