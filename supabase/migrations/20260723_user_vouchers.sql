-- 이용권(user_vouchers) v1 — 선물·1회용 기반 구조 (태스크 E)
-- v1 상품: 고민상담 1일권(CHAT_DAY_PASS) — 복채 1만냥, 구매 즉시 24시간 유효.
-- 보안: insert 는 서버(service_role) 전용 — 결제 없이 클라이언트가 직접 발급하는 것을 RLS로 차단한다.
--       본인은 조회(select)·사용(update: status/used_at)만 가능. 선물하기는 v2(source='gift' 확장).

create table if not exists public.user_vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  voucher_type text not null,
  status text not null default 'active',
  expires_at timestamptz,
  used_at timestamptz,
  source text not null default 'purchase',
  created_at timestamptz not null default now()
);

create index if not exists idx_user_vouchers_user_type_status
  on public.user_vouchers (user_id, voucher_type, status);

alter table public.user_vouchers enable row level security;

-- 본인 조회
drop policy if exists "user_vouchers_select_own" on public.user_vouchers;
create policy "user_vouchers_select_own" on public.user_vouchers
  for select using (auth.uid() = user_id);

-- 본인 사용(상태 갱신). insert 정책은 두지 않아 클라이언트 직접 발급을 차단(서버 service_role 전용).
drop policy if exists "user_vouchers_update_own" on public.user_vouchers;
create policy "user_vouchers_update_own" on public.user_vouchers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
