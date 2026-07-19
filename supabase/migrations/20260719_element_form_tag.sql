-- 관상·손금 오행형(五行形) 출력 추가 (P2-13 완결)
-- 배경: 신당 기운 프로필에 관상·손금을 반영하려면 오행 신호가 필요한데,
--       face_reading/palm_reading 프롬프트는 오행을 **전혀 출력하지 않았다**(생산자 부재).
-- 방식: 기존 태그는 손대지 않고 `[[ELEMENT_FORM: ...]]` **태그 1개만 추가**한다.
--       파서가 명명된 태그를 정규식으로 개별 추출하므로 미지 태그는 무시된다 = 후방호환.
-- 근거: 오행형(木形·火形·土形·金形·水形)은 관상학의 표준 분류이며, 손금도 손 모양을
--       오행으로 나누는 전통 분류가 있다. 임의 창작이 아니다.
-- ⚠️ 프롬프트는 시드로만 관리한다(어드민 UI 폐지) — 여기서만 변경할 것.

UPDATE public.ai_prompts
SET template = template || E'\n[[ELEMENT_FORM: 木/火/土/金/水 중 하나, 그렇게 본 근거 한 문장]]\n'
  || E'※ ELEMENT_FORM 은 관상 오행형(五行形) 분류입니다. 얼굴형·골격·기색을 보고 木形(길고 곧음)·火形(뾰족하고 활발)·土形(두텁고 안정)·金形(각지고 단단)·水形(둥글고 유연) 중 가장 가까운 하나를 고르세요. 확신이 없으면 이 태그는 생략하세요.',
  updated_at = now()
WHERE key = 'face_reading' AND template NOT LIKE '%ELEMENT_FORM%';

UPDATE public.ai_prompts
SET template = template || E'\n[[ELEMENT_FORM: 木/火/土/金/水 중 하나, 그렇게 본 근거 한 문장]]\n'
  || E'※ ELEMENT_FORM 은 손 모양의 오행형(五行形) 분류입니다. 손바닥·손가락 비율과 형태를 보고 木形(길고 마디가 뚜렷)·火形(끝이 뾰족하고 손금이 많음)·土形(네모지고 두터움)·金形(단단하고 각짐)·水形(부드럽고 둥긂) 중 가장 가까운 하나를 고르세요. 확신이 없으면 이 태그는 생략하세요.',
  updated_at = now()
WHERE key = 'palm_reading' AND template NOT LIKE '%ELEMENT_FORM%';
