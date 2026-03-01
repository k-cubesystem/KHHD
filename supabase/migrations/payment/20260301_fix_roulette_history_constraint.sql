-- roulette_history reward_type 체크 제약 수정
-- 기존 제약이 'bokchae', 'miss'를 허용하지 않는 문제 수정

DO $$
BEGIN
  -- 기존 제약 조건 제거 (이름이 다를 수 있으므로 여러 이름 시도)
  ALTER TABLE roulette_history DROP CONSTRAINT IF EXISTS roulette_history_reward_type_check;
  ALTER TABLE roulette_history DROP CONSTRAINT IF EXISTS roulette_history_type_check;
  ALTER TABLE roulette_history DROP CONSTRAINT IF EXISTS reward_type_check;

  -- 올바른 제약 조건 추가
  ALTER TABLE roulette_history
    ADD CONSTRAINT roulette_history_reward_type_check
    CHECK (reward_type IN ('bokchae', 'miss', 'talisman', 'premium', 'discount'));

  RAISE NOTICE 'roulette_history 제약 조건 수정 완료 (bokchae, miss 허용)';
END $$;
