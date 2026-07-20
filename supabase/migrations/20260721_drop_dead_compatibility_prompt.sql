-- R3: 죽은 궁합 프롬프트 시드 정리 (2026-07-21, 세션25)
--
-- 'compatibility_analysis' 키는 현재 코드가 전혀 읽지 않는 구(舊) 스키마 잔재다.
-- 궁합 프롬프트의 정본(正本)은 코드 빌더(lib/ai/prompts/compatibility.ts + focus-groups.ts, §9 결정)이며,
-- 이 DB 시드가 남아 있으면 "정본이 어디인가" 혼선을 준다.
-- 과거 2026-07-04 DB 재구축 때 구 시드가 되살아나 혼선을 준 패턴이 실재했다 → 삭제로 예방.
--
-- 멱등: 키가 없어도 오류 없이 통과.
DELETE FROM ai_prompts WHERE key = 'compatibility_analysis';
