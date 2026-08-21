-- 종합운수 여정 완주 보상 수령 기록 (계정당 1회 · 택1)
-- PK(user_id) 선점이 중복 지급 방어선. 쓰기는 service_role 전용(클라 INSERT 정책 없음 — 자가발행 차단).

create table if not exists public.journey_reward_claims (
  user_id     uuid not null references auth.users(id) on delete cascade,
  reward_kind text not null check (reward_kind in ('deity', 'theme')),
  reward_code text not null,
  claimed_at  timestamptz not null default now(),
  primary key (user_id)
);

alter table public.journey_reward_claims enable row level security;

drop policy if exists journey_reward_claims_select_own on public.journey_reward_claims;
create policy journey_reward_claims_select_own on public.journey_reward_claims
  for select using (auth.uid() = user_id);
