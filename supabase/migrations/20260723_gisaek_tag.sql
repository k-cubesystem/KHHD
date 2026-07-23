-- 관상 기색(氣色) 전용 태그 [[GISAEK]] 추가 (A-2)
-- 배경: gisaekReading 은 원문에서 기색/안색/혈색/광택 키워드 라인을 휴리스틱 매칭했다.
--       전용 태그로 "한줄평 + 관리 조언"을 구조화해 안정적으로 추출한다.
-- 방식: 기존 태그는 손대지 않고 [[GISAEK: ...]] 지시 1블록만 append (20260719_element_form_tag 패턴, 후방호환).
--       파서(lib/domain/analysis/gisaek-parse.ts)는 태그 우선, 없으면 기존 키워드 라인 휴리스틱으로 폴백.
--       → 구프롬프트 응답에도 계속 동작(하위호환).
-- ⚠️ 프롬프트는 시드로만 관리한다(어드민 UI 폐지) — 여기서만 변경할 것.
-- 기색은 관상 고유 개념이므로 face_reading 에만 추가한다(palm 제외).

UPDATE public.ai_prompts
SET template = template || E'\n[[GISAEK: 현재 기색 한줄평, 관리 조언]]\n'
  || E'※ GISAEK 은 오늘의 기색(氣色) 요약입니다. 얼굴의 광택·혈색·기운 상태를 한 줄로 총평하고(첫 값), 쉼표 뒤에 오늘부터 실천할 관리 조언 한 가지를 적으세요(둘째 값). 기색은 날마다 변하니 단정적 예언은 피하세요.',
  updated_at = now()
WHERE key = 'face_reading' AND template NOT LIKE '%GISAEK%';
