-- 룰렛 라벨 만냥 단위로 업데이트
UPDATE roulette_config SET label = '1만냥'  WHERE reward_type = 'bokchae' AND reward_value = 1;
UPDATE roulette_config SET label = '3만냥'  WHERE reward_type = 'bokchae' AND reward_value = 3;
UPDATE roulette_config SET label = '5만냥'  WHERE reward_type = 'bokchae' AND reward_value = 5;
UPDATE roulette_config SET label = '10만냥' WHERE reward_type = 'bokchae' AND reward_value = 10;

-- price_plans features 만냥 업데이트
UPDATE price_plans SET features = ARRAY['복채 5만냥', '테마운세 5회', '관상/손금/풍수 2회', '영구 지급'] WHERE name = '소복 씨앗';
UPDATE price_plans SET features = ARRAY['복채 10만냥', '테마운세 10회', '관상/손금/풍수 5회', '천지인사주 2회', '영구 지급'] WHERE name = '행운 꾸러미';
UPDATE price_plans SET features = ARRAY['복채 30만냥', '모든 서비스 자유 이용', '천지인사주 6회', '고민상담 300문', '영구 지급'] WHERE name = '대복 창고';
