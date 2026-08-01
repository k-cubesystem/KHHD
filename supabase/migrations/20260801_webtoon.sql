-- 웹툰 연재 — 회차 · 댓글 · 「내 이야기」 접수 (PLAN-webtoon-story-v1).
--
-- ⚠️ 세 표의 공개 범위가 **전부 다르다**. 한 곳이라도 헷갈리면 사람의 사연과 연락처가 새는 표다.
--    · 회차   : 공개된 것만 누구나 읽는다
--    · 댓글   : 지워지지 않은 것만 누구나 읽는다 · 쓰는 것은 본인 이름으로만
--    · 이야기 : **오직 본인만** 읽는다(관리자는 service_role 경유). 공개 정책이 아예 없다

create table if not exists public.webtoon_episodes (
  id           uuid primary key default gen_random_uuid(),
  no           integer not null unique check (no > 0),
  title        text not null,
  summary      text,
  thumb_url    text,
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.webtoon_episodes enable row level security;

drop policy if exists webtoon_episodes_select_published on public.webtoon_episodes;
create policy webtoon_episodes_select_published on public.webtoon_episodes
  for select using (published_at is not null and published_at <= now());

create table if not exists public.webtoon_comments (
  id         uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.webtoon_episodes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 500),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists webtoon_comments_episode_idx
  on public.webtoon_comments (episode_id, created_at desc);

alter table public.webtoon_comments enable row level security;

drop policy if exists webtoon_comments_select_alive on public.webtoon_comments;
create policy webtoon_comments_select_alive on public.webtoon_comments
  for select using (deleted_at is null);

-- ⚠️ with check 에 auth.uid() = user_id 가 **반드시** 있어야 한다.
--    없으면 남의 이름으로 댓글을 쓸 수 있다(2026-07-31 소원 사칭 삽입 P0 와 같은 구멍).
drop policy if exists webtoon_comments_insert_own on public.webtoon_comments;
create policy webtoon_comments_insert_own on public.webtoon_comments
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.webtoon_episodes e
      where e.id = episode_id and e.published_at is not null and e.published_at <= now()
    )
  );

drop policy if exists webtoon_comments_update_own on public.webtoon_comments;
create policy webtoon_comments_update_own on public.webtoon_comments
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ⚠️ 사연 원문과 **연락처(성함·전화·카카오)** 가 함께 있는 표다. 공개 정책을 만들지 않는다.
create table if not exists public.webtoon_story_submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 2 and 60),
  body          text not null check (char_length(btrim(body)) between 50 and 4000),
  contact_name  text not null check (char_length(btrim(contact_name)) between 1 and 40),
  contact_phone text not null check (char_length(btrim(contact_phone)) between 6 and 30),
  contact_kakao text check (char_length(btrim(contact_kakao)) <= 60),
  status        text not null default 'received'
                  check (status in ('received', 'reviewing', 'selected', 'declined')),
  notified_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists webtoon_story_submissions_user_idx
  on public.webtoon_story_submissions (user_id, created_at desc);

alter table public.webtoon_story_submissions enable row level security;

drop policy if exists webtoon_story_select_own on public.webtoon_story_submissions;
create policy webtoon_story_select_own on public.webtoon_story_submissions
  for select using (auth.uid() = user_id);

create or replace function public.submit_webtoon_story(
  p_user_id       uuid,
  p_title         text,
  p_body          text,
  p_contact_name  text,
  p_contact_phone text,
  p_contact_kakao text,
  p_today         text,
  p_daily_limit   integer
)
returns table (allowed boolean, submission_id uuid, today_count integer)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count integer;
  v_id    uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('webtoon-story:' || p_user_id::text || ':' || p_today, 0));

  select count(*) into v_count
  from public.webtoon_story_submissions
  where user_id = p_user_id
    and (created_at at time zone 'Asia/Seoul')::date = p_today::date;

  if v_count >= p_daily_limit then
    return query select false, null::uuid, v_count;
    return;
  end if;

  insert into public.webtoon_story_submissions
    (user_id, title, body, contact_name, contact_phone, contact_kakao)
  values
    (p_user_id, btrim(p_title), btrim(p_body), btrim(p_contact_name), btrim(p_contact_phone),
     nullif(btrim(coalesce(p_contact_kakao, '')), ''))
  returning id into v_id;

  return query select true, v_id, v_count + 1;
end;
$$;

revoke all on function public.submit_webtoon_story(uuid, text, text, text, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.submit_webtoon_story(uuid, text, text, text, text, text, text, integer)
  to service_role;
