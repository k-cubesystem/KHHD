-- 보안 수복 1/2 (감사 A3, 2026-07-31 야간) — 코드 배포와 무관하게 즉시 적용 가능한 것만.
-- (shrines 컬럼 권한 축소는 2/2 — 코드 배포 후 적용. S1b 교훈: 정책은 코드 뒤에.)
--
-- ── S-P0-2: 무료 상한 동시요청 우회 ─────────────────────────────
-- burn_shrine_aekmak / draw_shrine_obangki 는 잠금 없는 count-then-insert 라
-- READ COMMITTED 에서 동시 N 요청이 전부 "현재 3회 미만"을 보고 통과한다.
-- 원 주석은 "이론상 1건 초과"라 적었지만 실제 초과분은 **동시요청 수만큼**이다
-- (오방기는 회당 1만냥 회피가 걸려 있어 P0). 사용자 단위 어드바이저리 잠금으로
-- 같은 사용자의 기록을 직렬화한다 — 서로 다른 사용자는 잠금 키가 달라 병렬 그대로다.
-- 잠금은 트랜잭션 종료(=함수 종료) 시 자동 해제된다(pg_advisory_xact_lock).

create or replace function public.burn_shrine_aekmak(
  p_user_id uuid,
  p_tag     text,
  p_today   date,
  p_limit   int
)
returns table(allowed boolean, today_count int)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_inserted int;
  v_count    int;
begin
  -- 같은 사용자의 태우기를 직렬화 — 상한 검사와 INSERT 사이를 비집는 동시요청 차단(S-P0-2)
  perform pg_advisory_xact_lock(hashtext('ritual:aekmak'), hashtext(p_user_id::text));

  insert into public.shrine_aekmak_logs (user_id, tag)
  select p_user_id, p_tag
  where (
    select count(*)
    from public.shrine_aekmak_logs l
    where l.user_id = p_user_id
      and (l.burned_at at time zone 'Asia/Seoul')::date = p_today
  ) < p_limit;

  get diagnostics v_inserted = row_count;

  select count(*) into v_count
  from public.shrine_aekmak_logs l
  where l.user_id = p_user_id
    and (l.burned_at at time zone 'Asia/Seoul')::date = p_today;

  return query select v_inserted > 0, v_count;
end;
$$;

revoke all on function public.burn_shrine_aekmak(uuid, text, date, int) from public, anon, authenticated;
grant execute on function public.burn_shrine_aekmak(uuid, text, date, int) to service_role;

create or replace function public.draw_shrine_obangki(
  p_user_id    uuid,
  p_color      text,
  p_qtype      text,
  p_today      date,
  p_free_limit int,
  p_paid       boolean
)
returns table(allowed boolean, today_count int)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_inserted int;
  v_count    int;
begin
  -- 같은 사용자의 뽑기를 직렬화 — 무료 3회 상한의 동시요청 우회 차단(S-P0-2)
  perform pg_advisory_xact_lock(hashtext('ritual:obangki'), hashtext(p_user_id::text));

  insert into public.obangki_draws (user_id, color, qtype)
  select p_user_id, p_color, p_qtype
  where p_paid or (
    select count(*)
    from public.obangki_draws d
    where d.user_id = p_user_id
      and (d.drawn_at at time zone 'Asia/Seoul')::date = p_today
  ) < p_free_limit;

  get diagnostics v_inserted = row_count;

  select count(*) into v_count
  from public.obangki_draws d
  where d.user_id = p_user_id
    and (d.drawn_at at time zone 'Asia/Seoul')::date = p_today;

  return query select v_inserted > 0, v_count;
end;
$$;

revoke all on function public.draw_shrine_obangki(uuid, text, text, date, int, boolean) from public, anon, authenticated;
grant execute on function public.draw_shrine_obangki(uuid, text, text, date, int, boolean) to service_role;

-- ── S-P0-3: wishes_insert_any (WITH CHECK true) ────────────────
-- 종전 정책은 익명 포함 누구나 ①비공개 신당에도 ②남의 uid 를 wisher_user_id 로 사칭해
-- ③is_owner_wish=true 로 소원을 꽂을 수 있었다. 오늘 배포된 가족 좌석 presence 가
-- is_owner_wish 를 소비하면서(좌석 점등) 영향이 커졌다.
--
-- 유일한 앱 쓰기 경로(app/actions/shrine/shrine-wishes.ts)는 이미 이 규칙대로 쓰고 있어
-- 정당 흐름은 전부 통과한다: 익명 방문 소원(공개 신당·wisher null)·로그인 방문 소원·주인 소원.
drop policy if exists wishes_insert_any on public.shrine_wishes;
drop policy if exists wishes_insert_scoped on public.shrine_wishes;
create policy wishes_insert_scoped on public.shrine_wishes
  for insert with check (
    -- 대상 신당이 공개이거나 내 신당일 것 (비공개 신당에 남이 못 꽂는다)
    exists (
      select 1 from public.shrines s
      where s.id = shrine_id
        and (s.visibility = 'public' or s.user_id = auth.uid())
    )
    -- 남의 이름 사칭 금지 — wisher 는 본인 uid 또는 익명(null)뿐
    and (wisher_user_id is null or wisher_user_id = auth.uid())
    -- 주인 소원 표식(좌석 점등 신호)은 신당 주인만
    and (
      is_owner_wish = false
      or exists (select 1 from public.shrines s2 where s2.id = shrine_id and s2.user_id = auth.uid())
    )
  );
