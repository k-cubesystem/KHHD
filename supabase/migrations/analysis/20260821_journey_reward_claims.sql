-- 종합운수 여정 완주 보상 수령 기록 (계정당 1회 · 택1)
-- PK(user_id) 선점이 중복 지급 방어선. 쓰기는 service_role 전용(클라 INSERT 정책 없음 — 자가발행 차단).
--
-- ⚠️ 적용 상태: 라이브 DB 적용 완료 (2026-08-21, Supabase MCP apply_migration, 이름 journey_reward_claims).
--    이 리포에는 마이그레이션 자동 적용 파이프라인이 없다(CI = prod-smoke 뿐) — 적용 경로는
--    사람이 MCP/SQL 로 거는 것 하나뿐이다. 파일만 보고 미적용으로 판단해 중복 적용하지 말 것
--    (if not exists / drop policy if exists 라 재실행은 무해하지만, 판단 근거는 DB 실측으로).

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
