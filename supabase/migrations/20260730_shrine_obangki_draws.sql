-- 신당 의식 R-2 「오방기 점괘」 (PRD-shrine-rituals-v1 §2 / ARCH §3)
--
-- ⚠️ 이 테이블에는 **질문 원문·선택지를 담을 컬럼이 없다 — 의도다.**
--    액막이(20260730_shrine_aekmak_logs.sql)와 같은 원칙: 저장하지 않겠다는 약속을 지키는 방법은
--    "안 넣는 것"이 아니라 "넣을 자리를 만들지 않는 것"이다. 컬럼 집합은 테스트가 고정한다
--    (lib/domain/ritual/__tests__/obangki.test.ts — 텍스트 컬럼이 생기면 즉시 실패).
--    깃발 배정도 전부 화면에서 계산된다 — 서버는 색·질문유형만 받는다.
--
-- 남기는 것: 뽑힌 색 + 질문유형 + 뽑은 시각. 하루 무료 3회 판정과 GA 대조의 재료.
-- 복채로 뽑은 것도 같은 표에 남는다(무료/유료를 구분해 봐야 할 지표가 아직 없다 —
-- 필요해지면 컬럼이 아니라 wallet_transactions.feature_key='OBANGKI' 로 맞춘다).

-- ── 뽑기 기록 ────────────────────────────────────────────────
create table if not exists public.obangki_draws (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  color    text not null check (color in ('red', 'white', 'yellow', 'blue', 'green')),
  qtype    text not null check (qtype in ('choice', 'timing', 'money')),
  drawn_at timestamptz not null default now()
);

-- 조회는 언제나 "내 기록을 최근순으로" — 오늘 카운트가 이 인덱스로 끝난다.
create index if not exists obangki_draws_user_drawn_idx
  on public.obangki_draws (user_id, drawn_at desc);

alter table public.obangki_draws enable row level security;

-- 본인 조회만. 쓰기는 서버(service_role) RPC 전용 → INSERT/UPDATE/DELETE 정책 미부여.
-- (정책을 주면 클라이언트가 직접 INSERT 해서 무료 3회를 무한히 늘릴 수 있다 — S1a/S1b 교훈)
drop policy if exists obangki_draws_select_own on public.obangki_draws;
create policy obangki_draws_select_own on public.obangki_draws
  for select using (auth.uid() = user_id);

-- ── 뽑기 RPC — 무료 판정과 기록을 한 문장에서 ────────────────
-- p_paid=false : 오늘 무료 상한 미만일 때만 기록한다(allowed=false 면 무료 소진 — 기록 없음).
-- p_paid=true  : 서버가 이미 복채를 차감한 뒤라 무조건 기록한다.
--
-- 무료 경로의 상한 검사와 INSERT 를 INSERT ... SELECT ... WHERE (count) < p_free_limit 한 문장으로
-- 묶는 이유는 액막이와 같다: 클라이언트가 판정과 기록 사이를 비집고 들어올 틈을 없앤다.
-- READ COMMITTED 에서 동시 호출이 겹치면 이론상 무료 1건 초과가 가능하지만, 초과분의 이득이
-- 1만냥 한 번 덜 무는 것뿐이라 쓰기를 직렬화하는 비용이 더 크다는 판단이다.
--
-- ⚠️ 과금 순서는 서버 액션이 지킨다: **무료 시도(p_paid=false) 를 먼저 하고 거절된 뒤에만** 차감한다.
--    그래야 무료가 남은 사용자에게 실수로 복채를 물릴 길이 원천적으로 없다.
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

-- 클라이언트가 직접 기록하지 못하도록 service_role 전용 (서버 액션에서 admin 으로만 호출).
revoke all on function public.draw_shrine_obangki(uuid, text, text, date, int, boolean) from public, anon, authenticated;
grant execute on function public.draw_shrine_obangki(uuid, text, text, date, int, boolean) to service_role;
