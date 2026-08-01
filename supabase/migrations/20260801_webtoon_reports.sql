-- 댓글 신고 + 사연 회신 (CEO 2026-08-01).

-- ── 1. 댓글 신고 ────────────────────────────────────────────
--
-- ⚠️ 신고자는 **본인 신고만** 본다. 남이 무엇을 신고했는지 보이면 신고가 공격 수단이 된다.
-- ⚠️ 한 사람이 같은 댓글을 여러 번 신고해 수를 부풀리지 못하게 유니크를 건다.
create table if not exists public.webtoon_comment_reports (
  id          uuid primary key default gen_random_uuid(),
  comment_id  uuid not null references public.webtoon_comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason      text not null check (reason in ('abuse', 'spam', 'privacy', 'sexual', 'other')),
  note        text check (char_length(btrim(note)) <= 200),
  created_at  timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

create index if not exists webtoon_comment_reports_comment_idx
  on public.webtoon_comment_reports (comment_id, created_at desc);

alter table public.webtoon_comment_reports enable row level security;

drop policy if exists webtoon_reports_select_own on public.webtoon_comment_reports;
create policy webtoon_reports_select_own on public.webtoon_comment_reports
  for select using (auth.uid() = reporter_id);

-- ⚠️ with check 에 auth.uid() = reporter_id 가 반드시 있어야 한다 — 없으면 남의 이름으로 신고할 수 있다.
drop policy if exists webtoon_reports_insert_own on public.webtoon_comment_reports;
create policy webtoon_reports_insert_own on public.webtoon_comment_reports
  for insert to authenticated
  with check (auth.uid() = reporter_id);

-- 신고가 쌓이면 자동으로 가린다 — 사람이 볼 때까지 그대로 두면 그 사이 계속 읽힌다.
-- ⚠️ 판정은 **트리거 한 곳**에서만 한다. 액션이 세면 클라이언트 경로마다 셈이 갈리고,
--    동시에 들어온 신고 두 건이 둘 다 "아직 2건"으로 읽는다.
alter table public.webtoon_comments
  add column if not exists hidden_at timestamptz,
  add column if not exists report_count integer not null default 0;

create or replace function public.bump_webtoon_comment_report()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.webtoon_comment_reports where comment_id = new.comment_id;

  update public.webtoon_comments
  set report_count = v_count,
      -- 3건이면 가린다. **지운 것이 아니라 가린 것**이라 운영자가 되돌릴 수 있다.
      hidden_at = case when v_count >= 3 and hidden_at is null then now() else hidden_at end
  where id = new.comment_id;

  return new;
end;
$$;

drop trigger if exists webtoon_comment_report_bump on public.webtoon_comment_reports;
create trigger webtoon_comment_report_bump
  after insert on public.webtoon_comment_reports
  for each row execute function public.bump_webtoon_comment_report();

drop policy if exists webtoon_comments_select_alive on public.webtoon_comments;
create policy webtoon_comments_select_alive on public.webtoon_comments
  for select using (deleted_at is null and hidden_at is null);

-- ── 2. 사연 회신 ────────────────────────────────────────────
--
-- 값을 받든 안 받든 **읽었으면 답한다**가 이 프로그램의 약속이다. 운영자가 남긴 한마디가
-- 본인에게만 보인다(관리자는 service_role 로 쓴다 — 쓰기 정책은 여전히 없다).
alter table public.webtoon_story_submissions
  add column if not exists reply_note text check (char_length(btrim(reply_note)) <= 1000),
  add column if not exists replied_at timestamptz;
