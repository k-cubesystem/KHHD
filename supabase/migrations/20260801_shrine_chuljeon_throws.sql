-- 의식 R-4 「척전(擲錢) — 엽전 세 닢」: 갈림길을 정하는 도구.
--
-- 전거: 태종실록 4년(1404) 10월 6일. 새 도읍을 두고 송도·무악·한양으로 신하들이 갈려 결정이
-- 나지 않자, 태종이 종묘에서 향을 올리고 꿇어앉아 이천우에게 쟁반 위에 동전을 던지게 했다.
-- 한양 2길1흉, 송도 1길2흉, 무악 1길2흉 — 그래서 한양으로 정했다.
-- 곧 **길마다 엽전 세 닢을 던져 길(吉)의 수가 많은 쪽을 고르는 것**이 갈림길의 전통 해법이다.
--
-- ⚠️ 오방기(문복)와 전혀 다른 도구다. 오방기는 한 가지 일에 신이 답하는 자리이고,
--    척전은 사람이 정하지 못한 갈림길을 하늘에 맡기는 자리다.
--
-- ⚠️ 갈림길 **원문을 담을 자리가 없다**. 남는 것은 갈래 수·고른 자리·시각 셋뿐이다
--    (액막이·오방기와 같은 프라이버시 규율).
create table if not exists public.shrine_chuljeon_throws (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  ways       smallint not null check (ways between 2 and 4),
  picked     smallint not null check (picked >= 0 and picked < 4),
  thrown_at  timestamptz not null default now()
);

create index if not exists shrine_chuljeon_throws_user_day_idx
  on public.shrine_chuljeon_throws (user_id, thrown_at desc);

alter table public.shrine_chuljeon_throws enable row level security;

-- 읽기는 본인만. 쓰기 정책은 주지 않는다 — 주면 클라이언트가 직접 INSERT 해 일 상한을 우회한다.
drop policy if exists shrine_chuljeon_select_own on public.shrine_chuljeon_throws;
create policy shrine_chuljeon_select_own on public.shrine_chuljeon_throws
  for select using (auth.uid() = user_id);

-- 상한 검사와 INSERT 를 한 문장으로. 어드바이저리 잠금으로 동시요청 우회를 막는다
-- (감사 A3 P0-2 에서 오방기가 50병렬로 상한을 뚫었던 것과 같은 구멍을 처음부터 닫는다).
create or replace function public.throw_shrine_chuljeon(
  p_user_id uuid,
  p_ways    smallint,
  p_picked  smallint,
  p_today   text,
  p_limit   integer
)
returns table (allowed boolean, today_count integer)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('chuljeon:' || p_user_id::text || ':' || p_today, 0));

  select count(*) into v_count
  from public.shrine_chuljeon_throws
  where user_id = p_user_id
    and (thrown_at at time zone 'Asia/Seoul')::date = p_today::date;

  if v_count >= p_limit then
    return query select false, v_count;
    return;
  end if;

  insert into public.shrine_chuljeon_throws (user_id, ways, picked)
  values (p_user_id, p_ways, p_picked);

  return query select true, v_count + 1;
end;
$$;

revoke all on function public.throw_shrine_chuljeon(uuid, smallint, smallint, text, integer)
  from public, anon, authenticated;
grant execute on function public.throw_shrine_chuljeon(uuid, smallint, smallint, text, integer)
  to service_role;
