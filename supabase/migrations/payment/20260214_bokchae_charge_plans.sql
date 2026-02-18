-- ============================================================
-- 복채 충전 상품 업데이트
-- 기존 부적 상품(price_plans) → 복채 상품으로 전환
-- 기본 단위: 1 복채 = 10,000원 (1만냥)
-- ============================================================

-- price_plans 테이블에 is_active 컬럼 없으면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_plans' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.price_plans ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- price_plans 테이블에 sort_order 컬럼 없으면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_plans' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.price_plans ADD COLUMN sort_order INT DEFAULT 0;
  END IF;
END $$;

-- 기존 부적 상품 비활성화
UPDATE public.price_plans SET is_active = false WHERE TRUE;

-- 복채 충전 상품 3종 삽입 (중복 시 업데이트)
INSERT INTO public.price_plans (name, description, credits, price, is_active, badge_text, features, sort_order)
VALUES
  (
    '소복 씨앗',
    '가볍게 시작하는 입문 복채 패키지',
    5,
    50000,
    true,
    NULL,
    ARRAY['복채 5만냥', '테마운세 5회', '관상/손금/풍수 2회', '영구 지급'],
    1
  ),
  (
    '행운 꾸러미',
    '가장 많이 선택하는 실속 복채 패키지',
    10,
    99000,
    true,
    '가장 인기',
    ARRAY['복채 10만냥', '테마운세 10회', '관상/손금/풍수 5회', '천지인사주 2회', '영구 지급'],
    2
  ),
  (
    '대복 창고',
    '넉넉하게 채우는 고급 복채 패키지',
    30,
    290000,
    true,
    '최대 할인',
    ARRAY['복채 30만냥', '모든 서비스 자유 이용', '천지인사주 6회', '고민상담 300문', '영구 지급'],
    3
  )
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  credits = EXCLUDED.credits,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  badge_text = EXCLUDED.badge_text,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;

-- payments 테이블에 bokchae_type 컬럼 추가 (복채 구분용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'bokchae_type'
  ) THEN
    ALTER TABLE payments ADD COLUMN bokchae_type TEXT DEFAULT 'charge';
  END IF;
END $$;
