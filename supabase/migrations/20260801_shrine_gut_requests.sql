-- 「기원굿(祈願굿)」 신청 — 백일기도 완주자에게 굿 영상을 만들어 드리는 서비스 (PLAN-gut-video-v1).
-- 상세는 기획서 참조. 이 마이그레이션은 **영상 제작 직전까지**의 접수 경로만 연다.
create table if not exists public.shrine_gut_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  vow_round    integer,
  kind         text not null check (kind in ('completion', 'petition')),
  status       text not null default 'requested'
                 check (status in ('requested','script_ready','queued','rendering','review','delivered','failed','canceled')),
  video_url    text,
  requested_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists shrine_gut_requests_user_idx
  on public.shrine_gut_requests (user_id, requested_at desc);

create unique index if not exists shrine_gut_requests_completion_round_uniq
  on public.shrine_gut_requests (user_id, vow_round)
  where kind = 'completion' and status <> 'canceled';

alter table public.shrine_gut_requests enable row level security;

drop policy if exists shrine_gut_requests_select_own on public.shrine_gut_requests;
create policy shrine_gut_requests_select_own on public.shrine_gut_requests
  for select using (auth.uid() = user_id);

create or replace function public.request_shrine_gut(
  p_user_id uuid,
  p_kind    text,
  p_round   integer
)
returns table (allowed boolean, request_id uuid, reason text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_completed integer;
  v_used      integer;
  v_id        uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('gut:' || p_user_id::text, 0));

  if p_kind = 'completion' then
    select count(*) into v_completed
    from public.shrine_vows
    where user_id = p_user_id and completed_at is not null;

    select count(*) into v_used
    from public.shrine_gut_requests
    where user_id = p_user_id and kind = 'completion' and status <> 'canceled';

    if v_completed <= v_used then
      return query select false, null::uuid, 'NO_QUOTA'::text;
      return;
    end if;
  end if;

  insert into public.shrine_gut_requests (user_id, kind, vow_round)
  values (p_user_id, p_kind, p_round)
  returning id into v_id;

  return query select true, v_id, null::text;
end;
$$;

revoke all on function public.request_shrine_gut(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.request_shrine_gut(uuid, text, integer) to service_role;
