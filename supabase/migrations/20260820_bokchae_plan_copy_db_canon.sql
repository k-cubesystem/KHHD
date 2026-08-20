-- 복채 팩 카드 문구 repo 정본화 (2026-08-20)
--
-- 배경: 00864a3 «복채 카드 문구의 정본은 DB 였다» 가 라이브 4행을 직접 고쳤지만
-- SQL 파일을 남기지 않았다. 구시드(20260713)에는 카드사 심사가 지적한 «영구 지급»
-- («영구»는 소멸시효·이용약관과 충돌)이 그대로 남아, DB 재구축 시 부활한다.
-- 아래는 2026-08-20 라이브 price_plans.features 를 그대로 채록한 것.
--
-- 🔴 화면 문구의 정본은 price_plans(DB)다 — 코드만 고치면 화면이 안 바뀐다.
--    문구를 바꿀 땐 라이브 UPDATE + 이 계열의 채록 마이그레이션을 함께 남길 것.

UPDATE price_plans SET
  features = ARRAY['복채 5만냥', '테마운세 5회', '관상·손금·풍수 2회', '만료 없이 사용'],
  updated_at = now()
WHERE credits = 5;

UPDATE price_plans SET
  features = ARRAY['복채 10만냥 + 보너스 1만냥', '천지인사주 2회', '관상·손금·풍수 5회', '만료 없이 사용'],
  updated_at = now()
WHERE credits = 10;

UPDATE price_plans SET
  features = ARRAY['복채 20만냥 + 보너스 3만냥', '천지인사주 4회', '모든 풀이에 사용 가능', '만료 없이 사용'],
  updated_at = now()
WHERE credits = 20;

UPDATE price_plans SET
  features = ARRAY['복채 30만냥 + 보너스 6만냥', '천지인사주 7회', '모든 풀이에 사용 가능', '만료 없이 사용'],
  updated_at = now()
WHERE credits = 30;
