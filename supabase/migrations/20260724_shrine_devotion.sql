-- 신당 정성(精誠) 레벨 시스템 — 기도(소원) 누적으로 단 상승 → 테마·신물 무료 해금
-- 발주서 5차. 기도 1일 1회(KST) 멱등 적립 + 수령(claim) 기록.
-- 지급/차감 없는 순수 카운터·클레임 테이블 + 원자 조건부 UPSERT RPC.

-- ── 정성 누적(유저 1행) ──────────────────────────────────────
create table if not exists public.shrine_devotion (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  total_days      int  not null default 0 check (total_days >= 0),
  last_prayer_date date,
  updated_at      timestamptz not null default now()
);

alter table public.shrine_devotion enable row level security;

-- 본인 조회만 허용. 갱신은 서버(service_role) 전용 RPC로만 → INSERT/UPDATE 정책 미부여.
drop policy if exists shrine_devotion_select_own on public.shrine_devotion;
create policy shrine_devotion_select_own on public.shrine_devotion
  for select using (auth.uid() = user_id);

-- ── 수령 기록(중복 방어용 멱등 잠금) ─────────────────────────
create table if not exists public.shrine_devotion_claims (
  user_id      uuid not null references auth.users(id) on delete cascade,
  reward_level int  not null check (reward_level >= 1),
  claimed_at   timestamptz not null default now(),
  primary key (user_id, reward_level)
);

alter table public.shrine_devotion_claims enable row level security;

drop policy if exists shrine_devotion_claims_select_own on public.shrine_devotion_claims;
create policy shrine_devotion_claims_select_own on public.shrine_devotion_claims
  for select using (auth.uid() = user_id);

-- ── 기도 적립 RPC — 하루(KST) 1회 멱등 · 동시성 안전 ─────────
-- 새로 적립되면 gained=true, 이미 오늘 적립했으면 gained=false. 누적 총일수 반환.
-- 원자성: INSERT ... ON CONFLICT DO UPDATE ... WHERE last_prayer_date IS DISTINCT FROM today.
--   같은 날 동시 호출이 겹쳐도 WHERE 가 거짓이라 두 번째 이후는 no-op → 중복 증가 없음.
create or replace function public.record_shrine_devotion(p_user_id uuid, p_today date)
returns table(gained boolean, total_days int)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_total int;
begin
  insert into public.shrine_devotion as sd (user_id, total_days, last_prayer_date, updated_at)
  values (p_user_id, 1, p_today, now())
  on conflict (user_id) do update
    set total_days = sd.total_days + 1,
        last_prayer_date = p_today,
        updated_at = now()
    where sd.last_prayer_date is distinct from p_today
  returning sd.total_days into v_total;

  if found then
    -- INSERT 또는 조건부 UPDATE 성립 = 오늘 첫 적립
    return query select true, v_total;
  else
    -- 충돌 + WHERE 거짓(이미 오늘 적립) — 현재 누적치만 반환
    select sd.total_days into v_total from public.shrine_devotion sd where sd.user_id = p_user_id;
    return query select false, coalesce(v_total, 0);
  end if;
end;
$$;

-- 클라이언트가 직접 적립하지 못하도록 service_role 전용 (소원 저장 서버액션에서 admin 으로만 호출).
revoke all on function public.record_shrine_devotion(uuid, date) from public, anon, authenticated;
grant execute on function public.record_shrine_devotion(uuid, date) to service_role;
