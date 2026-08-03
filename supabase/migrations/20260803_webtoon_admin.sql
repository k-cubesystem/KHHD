-- 웹툰 운영 화면 — 회차 등록·본문 업로드·댓글 가림 해제.
--
-- ⚠️ 권한의 최종 방어는 **RLS 다**. 액션의 role 검사는 화면을 위한 것이고, 그 검사를 빠뜨려도
--    여기가 막는다(공지사항이 쓰는 방식과 같다). 코드 한 곳만 관문이면 그 한 곳이 무너진다.
-- ⚠️ 본문 경로 표에 **일반 회원용 정책은 여전히 없다.** 아래 정책은 전부 is_admin() 을 건다 —
--    회원이 본문 경로를 읽는 길은 지금도 없고, 게이트는 getEpisodePages 한 곳 그대로다.
-- ⚠️ **사연 표는 건드리지 않는다.** 사연 원문과 연락처가 함께 있는 유일한 자리라, 운영자도
--    service_role 로만 본다(브라우저 세션으로 전체 조회가 되는 길을 만들지 않는다).

-- 회차 — 운영자는 미공개도 보고 쓴다(공개 정책은 published 만 통과시키므로 초안이 안 보인다)
drop policy if exists webtoon_episodes_admin_all on public.webtoon_episodes;
create policy webtoon_episodes_admin_all on public.webtoon_episodes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 본문 페이지
drop policy if exists webtoon_pages_admin_all on public.webtoon_episode_pages;
create policy webtoon_pages_admin_all on public.webtoon_episode_pages
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 댓글 — 신고 3건이 자동으로 가린 것을 **되돌릴 수 있어야 한다**. 가림은 지움이 아니다.
drop policy if exists webtoon_comments_admin_update on public.webtoon_comments;
create policy webtoon_comments_admin_update on public.webtoon_comments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 스토리지 — 본문 이미지는 **브라우저가 직접 올린다**. 서버 액션으로 중계하면 컷 여러 장이
-- Vercel 페이로드 한도(4.5MB)에 걸려 한 화를 한 번에 못 올린다.
-- 읽기도 **운영자에게만** 연다. 무엇을 올렸는지 못 보면 눈 감고 올리는 셈이 된다.
-- 일반 회원에게는 여전히 닫혀 있으므로, 멤버십 컷을 받는 길은 서명 URL 하나 그대로다.
drop policy if exists webtoon_storage_admin_select on storage.objects;
create policy webtoon_storage_admin_select on storage.objects
  for select to authenticated
  using (bucket_id in ('webtoon', 'webtoon-locked') and public.is_admin());

drop policy if exists webtoon_storage_admin_write on storage.objects;
create policy webtoon_storage_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id in ('webtoon', 'webtoon-locked') and public.is_admin());

drop policy if exists webtoon_storage_admin_update on storage.objects;
create policy webtoon_storage_admin_update on storage.objects
  for update to authenticated
  using (bucket_id in ('webtoon', 'webtoon-locked') and public.is_admin())
  with check (bucket_id in ('webtoon', 'webtoon-locked') and public.is_admin());

drop policy if exists webtoon_storage_admin_delete on storage.objects;
create policy webtoon_storage_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('webtoon', 'webtoon-locked') and public.is_admin());
