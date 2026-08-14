-- 기록 보관 한도 조정 — 무료 5개 / 멤버십 20개 (CEO 지시 2026-08-15)
--
-- 왜 마이그레이션으로 남기나: 이 값은 어드민 화면이 아니라 DB 행에 있다. 7/4 재구축 때
-- 어드민이 손으로 넣은 데이터가 통째로 사라진 전례가 있어(project_db_rebuild_gaps),
-- DB 에만 손대고 파일을 안 남기면 다음 재구축에서 옛 값(10/50/999)으로 되돌아간다.
--
-- 🔴 상위 티어가 내려간다: FAMILY 50 → 20, BUSINESS 999 → 20.
--    적용 시점의 활성 구독은 SINGLE 2건뿐이라 실사용자 영향은 없음을 확인하고 적용했다.
--    티어별 차등을 다시 두려면 이 파일이 아니라 새 마이그레이션으로 올린다.
--
-- 무료(비회원) 한도 5 는 DB 가 아니라 코드 상수다 —
-- `lib/domain/payment/membership-benefits.ts` FREE_TIER_LIMITS.storageLimit.

update membership_plans
set storage_limit = 20,
    updated_at = now()
where tier in ('SINGLE', 'FAMILY', 'BUSINESS');
