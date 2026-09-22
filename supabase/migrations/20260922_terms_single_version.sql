-- 2026-09-22 — 이용약관을 단일 현행본(2026-09-22 시행)으로 게시하면서, 20260918b §7·§8 이 넣은 경과 흔적을 정리한다.
-- 재구축 때 20260918b 가 다시 적용되더라도 이 파일이 뒤따라 같은 최종 상태로 되돌린다.

-- 1) 전역 공지 «이용약관 개정 안내» — 비활성(행은 남긴다). 가이드 말풍선은 is_active 만 보므로 ends_at 으로는 안 숨는다.
UPDATE public.announcements
   SET is_active = false
 WHERE title = '이용약관 개정 안내 (2026년 9월 26일 시행)';

-- 2) 같은 제목의 개인 알림 — 알림 목록은 읽은 것도 보여 주므로 읽음 처리로는 안 사라진다. 원문은 20260918b §8 에 있다.
DELETE FROM public.notifications
 WHERE type = 'admin_announcement'
   AND title = '이용약관 개정 안내 (2026년 9월 26일 시행)';

-- 3) 이관 이용권 — 현행 약관에 없는 «기한 없음»을 없애고 운영 지급(결제일 기준 90일과 같은 기한)으로 맞춘다.
UPDATE public.entitlement_grants
   SET source = 'admin',
       note = '운영 지급',
       expires_at = issued_at + interval '90 days'
 WHERE source = 'migration';

UPDATE public.entitlement_ledger
   SET note = '운영 지급'
 WHERE note = '이전 보유분 전환';
