-- 인연 한도를 갈래별로 (CEO 지시 2026-08-16). 라이브 적용 완료, 재적용 무해.
--
-- `relationship_limit` 은 이제 **갈래마다 각각** 적용된다 — 가족 10명 · 지인 10명.
-- 판정은 코드가 한다(`canAddRelationship(category)` 가 같은 갈래만 센다). DB 는 숫자만 든다.
--
-- 🔴 합산으로 세던 옛 동작으로 되돌리지 말 것. 가족은 지울 수 없는 사람들이고 지인은 늘었다
--    줄었다 하는 목록이라, 한 통에 담으면 늘 가족 자리가 밀린다.
-- 무료(비회원)는 코드 상수 — FREE_TIER_LIMITS.relationshipLimit(3), 역시 갈래마다 3.

update membership_plans
set relationship_limit = 10,
    updated_at = now()
where tier in ('SINGLE', 'FAMILY', 'BUSINESS');
