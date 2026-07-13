-- 복채 벌크 보너스 팩 + 보너스 컬럼 (2026-07-13)
-- 근거: TEAM_G_DESIGN/prd/PLAN-payment-strategy-v1.md (웹 Toss, 벌크 보너스, 첫구매 2배)
-- 변경: price_plans에 bonus_credits 추가(구매 시 추가 지급되는 복채) + 4단 팩 재시드(라운드 가격 + 보너스).
-- confirmPayment가 price_plans를 단일 소스로 읽어 가격 검증 + 보너스 지급 (하드코딩 BOKCHAE_PRICE_MAP 폐지).

ALTER TABLE price_plans ADD COLUMN IF NOT EXISTS bonus_credits int NOT NULL DEFAULT 0;
COMMENT ON COLUMN price_plans.bonus_credits IS '구매 시 추가 지급되는 보너스 복채(만냥). 첫 구매 2배는 서버(confirmPayment)에서 별도 적용.';

-- 소복 씨앗 (5만냥, 보너스 0 — 입문)
UPDATE price_plans SET
  price = 50000, bonus_credits = 0, badge_text = NULL, sort_order = 1,
  description = '가볍게 시작하는 입문 복채',
  features = ARRAY['복채 5만냥', '테마운세 5회', '관상·손금·풍수 2회', '영구 지급'],
  updated_at = now()
WHERE credits = 5;

-- 행운 꾸러미 (10만냥 + 보너스 1 = 11만냥, 인기)
UPDATE price_plans SET
  price = 100000, bonus_credits = 1, badge_text = '가장 인기', sort_order = 2,
  description = '가장 많이 선택하는 실속 복채',
  features = ARRAY['복채 10만냥 + 보너스 1만냥', '천지인사주 2회', '관상·손금·풍수 5회', '영구 지급'],
  updated_at = now()
WHERE credits = 10;

-- 대복 창고 (30만냥 + 보너스 6 = 36만냥, 최대 혜택)
UPDATE price_plans SET
  price = 300000, bonus_credits = 6, badge_text = '최대 혜택', sort_order = 4,
  description = '넉넉하게 채우는 최고 혜택 복채',
  features = ARRAY['복채 30만냥 + 보너스 6만냥', '천지인사주 7회', '모든 서비스 자유 이용', '영구 지급'],
  updated_at = now()
WHERE credits = 30;

-- 대복 상자 (20만냥 + 보너스 3 = 23만냥) — 신규 티어
INSERT INTO price_plans (name, description, credits, price, bonus_credits, badge_text, features, is_active, sort_order)
SELECT '대복 상자', '든든하게 채우는 고급 복채', 20, 200000, 3, NULL,
       ARRAY['복채 20만냥 + 보너스 3만냥', '천지인사주 4회', '모든 서비스 자유 이용', '영구 지급'], true, 3
WHERE NOT EXISTS (SELECT 1 FROM price_plans WHERE credits = 20);
