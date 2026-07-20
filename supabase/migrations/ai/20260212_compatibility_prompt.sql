-- [DEPRECATED 2026-07-21 · 세션25] 죽은 시드 — 비활성화됨.
--
-- 이 시드가 등록하던 'compatibility_analysis' 프롬프트는 현재 코드가 전혀 읽지 않는다.
-- 궁합 프롬프트의 정본은 코드 빌더다: lib/ai/prompts/compatibility.ts + lib/domain/compatibility/focus-groups.ts (§9).
-- 이 INSERT 가 DB 재구축(예: 2026-07-04) 때 구 프롬프트를 되살려 혼선을 줬다.
-- → INSERT 를 제거하여 재구축 시 부활을 막는다. 라이브 삭제는 20260721_drop_dead_compatibility_prompt.sql 참조.
--
-- (원본 INSERT 는 git 히스토리에 보존됨. 의도적으로 실행하지 않는다 — no-op.)
SELECT 1 WHERE FALSE;
