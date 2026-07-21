-- 복채 표시 정합(R-P0-1): ai_prompts.talisman_cost 를 실차감에 맞춘다.
-- 어드민 "원가 vs 복채" 표의 복채값 = 실차감(getGeminiCostVsPrice 가 이 컬럼을 조인).
-- ⚠️ 가격 인상 금지 — 값을 올리지 않고, 현실(실차감)에 맞춰 내리거나 정정만 한다.
-- 이 시드는 표시/계측 전용이며 실차감 로직(deductTalisman customAmount)과 무관하다.
-- 멱등: 반복 실행해도 안전.

-- 관상·손금·풍수: 실차감 2만냥 (기존 5·3·7 → 2)
UPDATE ai_prompts SET talisman_cost = 2, updated_at = now() WHERE key = 'face_reading' AND talisman_cost <> 2;
UPDATE ai_prompts SET talisman_cost = 2, updated_at = now() WHERE key = 'palm_reading' AND talisman_cost <> 2;
UPDATE ai_prompts SET talisman_cost = 2, updated_at = now() WHERE key = 'fengshui_analysis' AND talisman_cost <> 2;

-- 무료 기능군(사주·궁합·신년): 실차감 0 — "무료"를 정직하게 표기(표시 = 실차감)
UPDATE ai_prompts SET talisman_cost = 0, updated_at = now()
  WHERE key IN ('cheonjiin_analysis', 'saju_analysis_v2', 'haehwajigi_compatibility', 'year2026_analysis')
    AND talisman_cost <> 0;

-- 부재 행 추가: 재물·이미지생성 (원가 vs 복채 표의 '—' 제거). 실차감 5만냥.
-- 실제 프롬프트는 코드 내장 — 이 행은 비용 계측/표시용 플레이스홀더.
INSERT INTO ai_prompts (key, label, category, template, description, talisman_cost)
VALUES
  ('wealth', '재물운', 'analysis', '(비용 계측용 — 실제 프롬프트는 wealth.ts 내장)', '원가 vs 복채 표 노출용. 실차감 5만냥.', 5),
  ('image_generation', '이미지 생성', 'image', '(비용 계측용 — 실제 프롬프트는 image.ts 내장)', '원가 vs 복채 표 노출용. 실차감 5만냥.', 5)
ON CONFLICT (key) DO UPDATE SET talisman_cost = EXCLUDED.talisman_cost, updated_at = now();
