-- 단일 통화(복채) 전환: 아이템/테마/신위에 복채 가격 컬럼 추가 (라이브 적용됨).
-- 복(bok_points)·복전 구매통화 폐지 → 모든 구매는 복채. 1 복채(만냥) = ₩10,000 (충전플랜 기준).
-- 초기값은 튜닝 가능. (복 시스템은 미션 적립·티어용으로 잔존, 구매엔 미사용)

ALTER TABLE public.shrine_deities ADD COLUMN IF NOT EXISTS price_bokchae integer NOT NULL DEFAULT 0;
UPDATE public.shrine_deities SET price_bokchae = CEIL(price_krw / 10000.0)::int WHERE price_krw > 0;

ALTER TABLE public.shrine_theme_packs ADD COLUMN IF NOT EXISTS price_bokchae integer NOT NULL DEFAULT 0;
UPDATE public.shrine_theme_packs SET price_bokchae = CEIL(price_krw / 10000.0)::int WHERE price_krw > 0;

ALTER TABLE public.shrine_item_catalog ADD COLUMN IF NOT EXISTS price_bokchae integer NOT NULL DEFAULT 0;
UPDATE public.shrine_item_catalog SET price_bokchae = CASE
  WHEN price_bok_points >= 500 THEN 2
  WHEN price_bok_points >= 200 THEN 1
  ELSE 0 END;
