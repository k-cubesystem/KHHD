-- 가족 초대 링크 (로드맵 R-2 「멀티 계정 가족」)
--
-- 가족 관리자가 만든 링크로 상대가 들어와 수락하면, **이미 있는 family_members 슬롯에 실계정이 붙는다**.
-- 데이터는 한 톨도 옮기지 않는다 — 가족 레코드는 초대자 소유 그대로고, linked_user_id 만 채워진다.
--
-- 설계 규율
-- 1) 토큰 원문은 DB 에 없다 — sha256 해시만 저장한다. 테이블이 통째로 새도 링크는 복원되지 않는다.
-- 2) 쓰기 경로는 전부 SECURITY DEFINER RPC(service_role 전용)다. 테이블에는 **조회 정책만** 준다 —
--    shrine_devotion·shrines 와 같은 규율로, INSERT/UPDATE 정책을 여는 순간 그것이 곧 위조 경로가 된다.
-- 3) 한도·자기수락·1회용 판정은 전부 RPC 안(어드바이저리 락 아래)에서 원자적으로 끝낸다.
--    서버 액션의 사전 검사는 UX 용이고, **최종 방어선은 여기**다.
-- 4) 재실행 무해 — 전 구문 idempotent.

-- ── 1. 연결 컬럼 — 가족 슬롯 ↔ 실계정 ────────────────────────────────
alter table public.family_members
  add column if not exists linked_user_id uuid references auth.users(id) on delete set null;

comment on column public.family_members.linked_user_id is
  '이 가족 슬롯에 연결된 실계정(가족 초대 수락 결과). null=미연결. 쓰기는 accept_family_invite RPC 전용.';

-- 자기 가족 슬롯에 자기 계정을 붙일 수 없다 — 「자기 자신 초대 수락 금지」의 DB 최종 방어선.
alter table public.family_members drop constraint if exists family_members_linked_not_self;
alter table public.family_members add constraint family_members_linked_not_self
  check (linked_user_id is null or linked_user_id <> user_id);

-- 한 계정은 한 가족에 한 슬롯만 — 같은 초대자의 두 슬롯에 겹쳐 붙는 것을 막는다.
create unique index if not exists family_members_linked_user_uniq
  on public.family_members (user_id, linked_user_id)
  where linked_user_id is not null;

create index if not exists family_members_linked_user_idx
  on public.family_members (linked_user_id)
  where linked_user_id is not null;

-- ── 2. 초대장 ────────────────────────────────────────────────────────
create table if not exists public.family_invites (
  id               uuid primary key default gen_random_uuid(),
  inviter_id       uuid not null references auth.users(id) on delete cascade,
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  -- sha256(hex) — 원문 토큰은 생성 순간 딱 한 번 초대자 화면에만 존재한다.
  token_hash       text not null,
  status           text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at       timestamptz not null,
  accepted_by      uuid references auth.users(id) on delete set null,
  accepted_at      timestamptz,
  created_at       timestamptz not null default now()
);

comment on table public.family_invites is
  '가족 초대 링크. 토큰은 해시만 보관(72시간·1회용). 쓰기는 create/revoke/accept_family_invite RPC 전용.';

create unique index if not exists family_invites_token_hash_uniq
  on public.family_invites (token_hash);

create index if not exists family_invites_inviter_idx
  on public.family_invites (inviter_id, created_at desc);

-- 슬롯당 살아있는 초대는 하나 — 재발급하면 구토큰이 그 자리에서 죽는다(RPC 가 revoke 후 insert).
create unique index if not exists family_invites_member_pending_uniq
  on public.family_invites (family_member_id)
  where status = 'pending';

alter table public.family_invites enable row level security;

-- 생성자만 자기 초대를 본다. 취소·수락은 RPC — INSERT/UPDATE/DELETE 정책을 일부러 주지 않는다.
drop policy if exists family_invites_select_own on public.family_invites;
create policy family_invites_select_own on public.family_invites
  for select using (auth.uid() = inviter_id);

-- ── 3. 연결된 계정의 읽기 폭(v1 최소) ────────────────────────────────
-- 초대받은 이는 자기가 붙은 슬롯과 그 슬롯의 신당·미션까지만 본다. 전부 **추가 SELECT 정책**이라
-- 기존 소유자 정책(ALL own)은 그대로다 — 연결 계정에 쓰기는 열리지 않는다.
drop policy if exists family_members_select_linked on public.family_members;
create policy family_members_select_linked on public.family_members
  for select using (auth.uid() = linked_user_id);

drop policy if exists shrines_select_family_linked on public.shrines;
create policy shrines_select_family_linked on public.shrines
  for select using (
    shrines.family_member_id is not null
    and exists (
      select 1 from public.family_members fm
      where fm.id = shrines.family_member_id
        and fm.linked_user_id = auth.uid()
    )
  );

drop policy if exists bok_missions_select_family_linked on public.bok_missions;
create policy bok_missions_select_family_linked on public.bok_missions
  for select using (
    bok_missions.family_member_id is not null
    and exists (
      select 1 from public.family_members fm
      where fm.id = bok_missions.family_member_id
        and fm.linked_user_id = auth.uid()
    )
  );

-- ── 4. 발급 RPC ──────────────────────────────────────────────────────
-- p_max_linked: 초대자 등급의 인연 한도(TS 가 계산해 넘긴다). 여기서 원자적으로 재확인한다.
drop function if exists public.create_family_invite(uuid, uuid, text, timestamptz, int);
create function public.create_family_invite(
  p_inviter     uuid,
  p_member_id   uuid,
  p_token_hash  text,
  p_expires_at  timestamptz,
  p_max_linked  int
)
returns table (ok boolean, reason text, invite_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_owner  uuid;
  v_linked uuid;
  v_count  int;
  v_id     uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('family-invite:' || p_inviter::text, 0));

  select fm.user_id, fm.linked_user_id into v_owner, v_linked
  from public.family_members fm where fm.id = p_member_id;

  if v_owner is null then
    return query select false, 'NOT_FOUND'::text, null::uuid;
    return;
  end if;

  if v_owner <> p_inviter then
    return query select false, 'FORBIDDEN'::text, null::uuid;
    return;
  end if;

  if v_linked is not null then
    return query select false, 'ALREADY_LINKED'::text, null::uuid;
    return;
  end if;

  -- 연결 정원 = 등급 인연 한도. 이미 정원을 채웠으면 새 링크를 내주지 않는다.
  select count(*) into v_count
  from public.family_members fm
  where fm.user_id = p_inviter and fm.linked_user_id is not null;

  if v_count >= p_max_linked then
    return query select false, 'LIMIT'::text, null::uuid;
    return;
  end if;

  update public.family_invites fi set status = 'revoked'
  where fi.family_member_id = p_member_id and fi.status = 'pending';

  insert into public.family_invites (inviter_id, family_member_id, token_hash, expires_at)
  values (p_inviter, p_member_id, p_token_hash, p_expires_at)
  returning id into v_id;

  return query select true, null::text, v_id;
end;
$$;

-- ── 5. 취소 RPC ──────────────────────────────────────────────────────
drop function if exists public.revoke_family_invite(uuid, uuid);
create function public.revoke_family_invite(p_inviter uuid, p_invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_rows int;
begin
  update public.family_invites fi set status = 'revoked'
  where fi.id = p_invite_id and fi.inviter_id = p_inviter and fi.status = 'pending';
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

-- ── 6. 수락 RPC ──────────────────────────────────────────────────────
-- 1회용의 실체가 여기다: 행을 FOR UPDATE 로 잠그고 status 를 accepted 로 넘긴다.
-- 같은 토큰이 동시에 두 번 들어와도 두 번째는 status='accepted' 를 보고 USED 로 떨어진다.
drop function if exists public.accept_family_invite(text, uuid, int);
create function public.accept_family_invite(
  p_token_hash text,
  p_accepter   uuid,
  p_max_linked int
)
returns table (ok boolean, reason text, inviter uuid, member_id uuid, member_name text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_inv    public.family_invites%rowtype;
  v_owner  uuid;
  v_linked uuid;
  v_name   text;
  v_count  int;
begin
  perform pg_advisory_xact_lock(hashtextextended('family-invite-accept:' || p_token_hash, 0));

  select * into v_inv from public.family_invites fi where fi.token_hash = p_token_hash for update;

  if not found then
    return query select false, 'NOT_FOUND'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  if v_inv.status = 'accepted' then
    return query select false, 'USED'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  if v_inv.status = 'revoked' then
    return query select false, 'REVOKED'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  if v_inv.expires_at <= now() then
    return query select false, 'EXPIRED'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  if v_inv.inviter_id = p_accepter then
    return query select false, 'SELF'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  select fm.user_id, fm.linked_user_id, fm.name into v_owner, v_linked, v_name
  from public.family_members fm where fm.id = v_inv.family_member_id;

  if v_owner is null then
    return query select false, 'MEMBER_GONE'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  if v_linked is not null then
    return query select false, 'ALREADY_LINKED'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  -- 이미 이 가족의 다른 슬롯에 붙어 있는 계정이면 거절(부분 유니크 인덱스와 같은 규칙).
  select count(*) into v_count
  from public.family_members fm
  where fm.user_id = v_inv.inviter_id and fm.linked_user_id = p_accepter;

  if v_count > 0 then
    return query select false, 'ALREADY_MEMBER'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  select count(*) into v_count
  from public.family_members fm
  where fm.user_id = v_inv.inviter_id and fm.linked_user_id is not null;

  if v_count >= p_max_linked then
    return query select false, 'LIMIT'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  update public.family_members fm
  set linked_user_id = p_accepter, updated_at = now()
  where fm.id = v_inv.family_member_id and fm.linked_user_id is null;

  if not found then
    return query select false, 'ALREADY_LINKED'::text, null::uuid, null::uuid, null::text;
    return;
  end if;

  update public.family_invites fi
  set status = 'accepted', accepted_by = p_accepter, accepted_at = now()
  where fi.id = v_inv.id;

  return query select true, null::text, v_inv.inviter_id, v_inv.family_member_id, v_name;
end;
$$;

-- ── 7. 실행 권한 — 전부 service_role 전용 ────────────────────────────
-- 클라이언트가 직접 부르면 p_inviter/p_max_linked 를 마음대로 실어 보낼 수 있다.
revoke all on function public.create_family_invite(uuid, uuid, text, timestamptz, int) from public, anon, authenticated;
grant execute on function public.create_family_invite(uuid, uuid, text, timestamptz, int) to service_role;

revoke all on function public.revoke_family_invite(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoke_family_invite(uuid, uuid) to service_role;

revoke all on function public.accept_family_invite(text, uuid, int) from public, anon, authenticated;
grant execute on function public.accept_family_invite(text, uuid, int) to service_role;
