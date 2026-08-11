-- 신탁 웹푸시(Web Push) 구독 저장소 — R-1 재방문 트리거
-- 멱등 설계: 재적용해도 안전하다.
--
-- 설계 메모
--  * 구독 row 의 존재 자체가 «신탁 알림 받기» ON 상태다. 별도 boolean 을 두지 않는다.
--  * endpoint 는 «브라우저 설치 1개»에 1:1 로 대응하는 값이라 전역 UNIQUE 로 잠근다.
--    (user_id, endpoint) 복합 유니크로 두면 같은 기기에서 계정을 갈아탔을 때 이전
--    사용자의 구독이 그대로 남아 «남의 신탁이 내 기기로 배달되는» 사고가 난다.
--    전역 UNIQUE 는 (user_id, endpoint) 유일성을 포함하면서 그 사고를 막는다.
--  * 컬럼명은 auth 가 아니라 auth_key 다. auth 라는 컬럼이 있으면 RLS 정책 안의
--    auth.uid() 가 «컬럼 auth 의 필드 uid» 로 해석될 수 있어 정책이 깨진다.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);

create unique index if not exists push_subscriptions_endpoint_key
  on public.push_subscriptions (endpoint);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- ── RLS: 본인 것만 CRUD ──────────────────────────────────────────────────────
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- 발송기(service_role)는 남의 구독을 읽고, 만료(410/404) 구독을 지워야 한다.
drop policy if exists "push_subscriptions_service_role_all" on public.push_subscriptions;
create policy "push_subscriptions_service_role_all"
  on public.push_subscriptions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.push_subscriptions is
  '신탁 웹푸시 구독. row 존재 = 알림 ON. endpoint 전역 유니크(계정 전환 시 구독 이관).';
