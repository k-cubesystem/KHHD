-- 토큰 버킷의 모델 표시값을 현행으로 (2026-09-28)
--
-- gemini_token_bucket.model 은 어드민 RPM 패널에 보이는 표시값이다. 실제 호출 모델은
-- lib/config/ai-models.ts 가 정하고(텍스트는 2026-09-14 부터 gemini-3.8-flash),
-- 사용량 기록·원가도 호출부가 넘긴 모델로 남는다. 표시값만 3.7 에 머물러 있었다.

UPDATE gemini_token_bucket
SET model      = 'gemini-3.8-flash',
    updated_at = now()
WHERE id = 1
  AND model <> 'gemini-3.8-flash';
