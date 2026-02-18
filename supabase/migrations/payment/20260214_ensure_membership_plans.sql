-- 멤버십 플랜 데이터 보장 (프로덕션 누락 시 재삽입)
-- 이미 존재하면 ON CONFLICT DO UPDATE로 덮어씀

INSERT INTO public.membership_plans (
    name, tier, price, description,
    talismans_per_period, daily_talisman_limit,
    relationship_limit, storage_limit,
    features, is_active, sort_order
) VALUES
(
    '싱글 멤버십', 'SINGLE', 9900, '나를 위한 데일리 운세 루틴',
    10, 10, 3, 10,
    '{"daily_fortune": true, "pdf_archive": true, "kakao_daily": true, "ai_shaman": true, "bonus_rate": 10}'::jsonb,
    true, 1
),
(
    '패밀리 멤버십', 'FAMILY', 29900, '우리 가족 모두를 위한 프리미엄 혜택',
    30, 30, 10, 50,
    '{"daily_fortune": true, "pdf_archive": true, "kakao_daily": true, "ai_shaman": true, "family_compatibility": true, "network_visualization": true, "bonus_rate": 15}'::jsonb,
    true, 2
),
(
    '비즈니스 멤버십', 'BUSINESS', 99000, '전문가를 위한 무제한 분석 솔루션',
    100, 100, 50, 999,
    '{"daily_fortune": true, "pdf_archive": true, "kakao_daily": true, "ai_shaman": true, "family_compatibility": true, "network_visualization": true, "api_access": true, "priority_support": true, "custom_reports": true, "bonus_rate": 20}'::jsonb,
    true, 3
)
ON CONFLICT (name) DO UPDATE SET
    tier = EXCLUDED.tier,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    talismans_per_period = EXCLUDED.talismans_per_period,
    daily_talisman_limit = EXCLUDED.daily_talisman_limit,
    relationship_limit = EXCLUDED.relationship_limit,
    storage_limit = EXCLUDED.storage_limit,
    features = EXCLUDED.features,
    is_active = true,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();
