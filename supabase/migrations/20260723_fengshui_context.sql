-- 풍수 분석 대상·맥락(subjectType·facing·address) 프롬프트 주입 지원 (태스크 A-2)
-- 배경: 업로드 화면에서 분석 대상(집 안/외관/사무실)·집의 향·주소(시·구)를 선택 입력받아
--       8방위·관점 분석의 기준으로 삼는다. 값이 있으면 code(analyzeInteriorForFengshui)가
--       [분석 맥락] 블록을 조립해 {{subject_context}} 자리에 주입한다.
-- 방식: 기존 태그는 손대지 않고 지시 1블록 + {{subject_context}} 플레이스홀더만 append
--       (20260723_gisaek_tag 의 NOT LIKE 멱등 UPDATE 패턴, 후방호환).
--       값이 없으면 {{subject_context}} → '' 로 치환되어 기존 동작과 동일(하위호환).
-- ⚠️ 프롬프트는 시드로만 관리한다(어드민 UI 폐지) — 여기서만 변경할 것.

UPDATE public.ai_prompts
SET template = template || E'\n\n[대상 맥락 반영 지시]\n아래 [분석 맥락]이 제공되면 8방위·관점·배치 분석에 최우선으로 반영하고(실측 향이 있으면 방위 분석의 기준으로 삼되 추측하지 말 것), 제공되지 않으면 기존 방식대로 분석하세요.\n{{subject_context}}',
  updated_at = now()
WHERE key = 'fengshui_analysis' AND template NOT LIKE '%subject_context%';
