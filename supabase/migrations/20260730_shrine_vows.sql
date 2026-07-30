-- 신당 의식 R-3 「백일기도(百日祈禱)」 (PRD-shrine-rituals-v1 §3 / ARCH §3)
--
-- ⚠️ 이 테이블에는 **소원 원문을 담을 컬럼이 없다 — 의도다.**
--    액막이·오방기와 같은 원칙(저장하지 않겠다는 약속은 "넣을 자리를 만들지 않는 것"으로 지킨다).
--    PRD §3 은 실물 굿 제작용으로 `wish_text` 를 열어 두었으나 **실물 굿 O2O 가 보류(CEO 확정)** 되어
--    수집 사유 자체가 사라졌다 — 완주 보상은 디지털 축원 영상만으로 완결하고, 개인화는
--    프로필 이름·회차·완주일만 쓴다. 컬럼 집합은 테스트가 고정한다
--    (lib/domain/ritual/__tests__/baekil.test.ts — 원문 컬럼이 생기면 즉시 실패).
--
-- ⚠️ 진행도용 일별 기록 테이블을 만들지 않는다. 백일기도는 기존 기원(shrine_devotion) 위에 얹는
--    「서약 회차 뷰」다 — 서약 시점의 누적일을 스냅샷으로 떠 두고 `현재 누적 − 스냅샷` 으로 판정한다.
--    하루 중복 적립 방지는 record_shrine_devotion 의 KST 멱등이 이미 하고 있어 여기서 다시 세지 않는다.
--
-- 트로피는 별도 테이블이 아니다. **완주 처리된 이 표의 행 하나가 곧 트로피 하나**다
--    (회차 = round, 언제 것인가 = completed_at). 행이 곧 트로피라서 이중 지급이 구조적으로 불가능하다.

-- ── 서약(誓約) 회차 ──────────────────────────────────────────
create table if not exists public.shrine_vows (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  round             int not null check (round >= 1),
  devotion_snapshot int not null default 0 check (devotion_snapshot >= 0),
  target_days       int not null default 100 check (target_days >= 1),
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  video_status      text not null default 'none'
                      check (video_status in ('none', 'queued', 'rendering', 'ready', 'failed')),
  video_url         text,
  unique (user_id, round)
);

-- 활성 서약은 사용자당 1건 — 회차를 병렬로 굴려 트로피를 늘리는 길을 DB 가 막는다.
-- (도메인 규칙 ④: 완주해야 다음 회차가 열린다)
create unique index if not exists shrine_vows_one_active_idx
  on public.shrine_vows (user_id) where completed_at is null;

-- 조회는 언제나 "내 회차를 최신순으로" — 트로피 목록·다음 회차 번호가 이 인덱스로 끝난다.
create index if not exists shrine_vows_user_round_idx
  on public.shrine_vows (user_id, round desc);

alter table public.shrine_vows enable row level security;

-- 본인 조회만. 쓰기는 서버(service_role) RPC 전용 → INSERT/UPDATE/DELETE 정책 미부여.
-- (정책을 주면 클라이언트가 completed_at 을 스스로 찍어 트로피와 아이템을 무한히 발행할 수 있다 — S1a/S1b 교훈)
drop policy if exists shrine_vows_select_own on public.shrine_vows;
create policy shrine_vows_select_own on public.shrine_vows
  for select using (auth.uid() = user_id);

-- ── 완주 보상 아이템 시드 — 신당에 거는 「백일 소원끈」 ──────
--
-- 구조는 기존 12품목과 완전히 같다(shrine_item_catalog + user_shrine_inventory).
-- placement_layer='hanging' : "걸 수 있는" 층. 기존 hanging 품목은 은풍경·초롱이다.
--
-- ⚠️ 가격을 0 으로 두지 않는다. is_active=false 로 숨기면 카탈로그 조회(scene/shop 모두
--    is_active=true 필터)에서 사라져 **배치 렌더가 깨진다** → 활성으로 둘 수밖에 없는데,
--    활성 + 가격 0 이면 purchaseToInventory 가 무료로 지급해 완주 보상이 무의미해진다.
--    그래서 기원 보상과 같은 구조를 쓴다: **정가는 비싸게, 완주하면 무료.**
--    5만냥은 현재 카탈로그 최고가(기억의 함 3만)를 넘는 값 — 백 일을 걷는 편이 낫도록.
-- ⚠️ 시드 재실행 시 태그 소실 이력이 있어 UPDATE 로 덮지 않는다. 이름이 없을 때만 INSERT.
insert into public.shrine_item_catalog
  (name, description, type, rarity, price_bok_points, price_krw, price_bokchae,
   emoji, element, energy_power, placement_layer, size_grade, sprite_url, behavior, sort_order)
select
  '백일 소원끈',
  '백일기도를 마친 이가 처마에 매다는 오색 끈. 백 날의 걸음이 매듭마다 맺혀 있습니다.',
  'talisman', 'legendary', 0, 0, 5,
  '🎏', 'earth', 25, 'hanging', 'md', '/shrine/items/cord-baekil.webp',
  '{"tap":"swing","sound":"chime"}'::jsonb, 13
where not exists (
  select 1 from public.shrine_item_catalog c where c.name = '백일 소원끈'
);

-- ── 서약 시작 RPC ────────────────────────────────────────────
-- 스냅샷을 **서버가 직접 읽는다**(클라이언트가 보낸 값을 믿으면 0 을 보내 즉시 완주할 수 있다).
-- 활성 서약이 있으면 started=false — 부분 UNIQUE 인덱스가 최후의 방어선이라 동시 호출도 1건만 남는다.
create or replace function public.start_shrine_vow(p_user_id uuid, p_target int)
returns table(started boolean, vow_id uuid, round int, devotion_snapshot int)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id       uuid;
  v_round    int;
  v_snapshot int;
begin
  -- 대상 테이블에 별칭을 준다(record_shrine_devotion 과 같은 규약). returns table 의 OUT 이름
  -- round·devotion_snapshot 이 컬럼명과 같아, 별칭 없이 쓰면 RETURNING 이 모호해진다.
  insert into public.shrine_vows as sv (user_id, round, devotion_snapshot, target_days)
  select
    p_user_id,
    coalesce((select max(v.round) from public.shrine_vows v where v.user_id = p_user_id), 0) + 1,
    coalesce((select d.total_days from public.shrine_devotion d where d.user_id = p_user_id), 0),
    greatest(1, p_target)
  where not exists (
    select 1 from public.shrine_vows v where v.user_id = p_user_id and v.completed_at is null
  )
  returning sv.id, sv.round, sv.devotion_snapshot
  into v_id, v_round, v_snapshot;

  if v_id is null then
    -- 이미 활성 서약이 있다 — 그 회차를 그대로 돌려준다(화면이 현황을 다시 묻지 않아도 되게)
    select v.id, v.round, v.devotion_snapshot into v_id, v_round, v_snapshot
    from public.shrine_vows v
    where v.user_id = p_user_id and v.completed_at is null
    limit 1;
    return query select false, v_id, coalesce(v_round, 0), coalesce(v_snapshot, 0);
  else
    return query select true, v_id, v_round, v_snapshot;
  end if;
end;
$$;

revoke all on function public.start_shrine_vow(uuid, int) from public, anon, authenticated;
grant execute on function public.start_shrine_vow(uuid, int) to service_role;

-- ── 완주 판정 + 보상 지급 RPC — 한 트랜잭션에서 ──────────────
--
-- 이 함수의 핵심은 **판정과 지급이 갈라지지 않는 것**이다(오방기 RPC 의 "한 문장" 규율).
--   ① 완주 UPDATE 가 `completed_at is null` 을 조건으로 건다 → 두 번째 호출은 0 행.
--   ② 0 행이면 아이템 지급 블록에 아예 들어가지 않는다 → 두 번 눌러도 트로피·아이템이 하나씩.
--   ③ 진행도(누적 − 스냅샷)도 같은 문장이 서버 데이터로 재판정한다 → 클라이언트 값 미신뢰.
-- 완주와 동시에 축원 영상 자리를 'queued' 로 연다(렌더 파이프라인은 다음 차수).
create or replace function public.complete_shrine_vow(p_user_id uuid, p_item_name text)
returns table(completed boolean, vow_id uuid, round int, total_completed int, item_qty int)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id      uuid;
  v_round   int;
  v_item_id uuid;
  v_qty     int;
  v_total   int;
begin
  update public.shrine_vows as v
     set completed_at = now(),
         video_status = 'queued'
   where v.user_id = p_user_id
     and v.completed_at is null
     and coalesce((select d.total_days from public.shrine_devotion d where d.user_id = p_user_id), 0)
         - v.devotion_snapshot >= v.target_days
  returning v.id, v.round into v_id, v_round;

  select count(*) into v_total
  from public.shrine_vows v
  where v.user_id = p_user_id and v.completed_at is not null;

  if v_id is null then
    -- 미달이거나 이미 완주 — 아무것도 지급하지 않는다
    return query select false, null::uuid, 0, v_total, 0;
    return;
  end if;

  -- 신당 걸이 아이템 1개 지급. 이름으로 찾는 이유는 카탈로그에 code 컬럼이 없어서다
  -- (devotion.ts 의 보상 트랙과 같은 규약). 시드가 없으면 지급만 건너뛰고 완주는 유지한다 —
  -- 백 일을 걸은 사실이 아이템 시드 누락 때문에 사라지는 편이 더 나쁘다.
  select c.id into v_item_id from public.shrine_item_catalog c where c.name = p_item_name limit 1;

  if v_item_id is not null then
    insert into public.user_shrine_inventory (user_id, catalog_item_id, qty)
    values (p_user_id, v_item_id, 1)
    on conflict (user_id, catalog_item_id) do update
      set qty = user_shrine_inventory.qty + 1, updated_at = now()
    returning user_shrine_inventory.qty into v_qty;
  end if;

  return query select true, v_id, v_round, v_total, coalesce(v_qty, 0);
end;
$$;

revoke all on function public.complete_shrine_vow(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_shrine_vow(uuid, text) to service_role;

-- ── 축원 영상 상태 갱신 RPC — 다음 차수 파이프라인이 쓸 자리 ─
-- 이번 범위는 "발급되는 자리"까지다. 렌더러가 붙으면 queued → rendering → ready 로 이 함수를 부른다.
-- 사용자·클라이언트는 절대 부를 수 없다(service_role 전용) — URL 을 스스로 심으면 서명 URL 게이트가 무의미해진다.
create or replace function public.set_shrine_vow_video(p_vow_id uuid, p_status text, p_url text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_updated int;
begin
  update public.shrine_vows as v
     set video_status = p_status,
         video_url    = p_url
   where v.id = p_vow_id
     and v.completed_at is not null;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.set_shrine_vow_video(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_shrine_vow_video(uuid, text, text) to service_role;
