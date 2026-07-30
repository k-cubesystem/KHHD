-- 신당 의식 R-1 「액막이 — 부적 태우기」 (PRD-shrine-rituals-v1 §1 / ARCH §3)
--
-- ⚠️ 이 테이블에는 **액운 원문을 담을 컬럼이 없다 — 의도다.**
--    "태우면 정말 사라진다"가 이 기능의 약속이고, 지키는 방법은 저장하지 않는 것이 아니라
--    저장할 자리를 만들지 않는 것이다. 컬럼 집합은 테스트가 고정한다
--    (lib/domain/ritual/__tests__/aekmak.test.ts — 원문 컬럼이 생기면 즉시 실패).
--    서버 액션도 태그 하나만 받는다(원문은 클라이언트를 떠나지 않는다).
--
-- 남기는 것: 감정 태그 + 태운 시각. 월간 회고("이달 N개의 액을 태우셨습니다")와 일 3회 판정의 재료.

-- ── 태운 기록 ────────────────────────────────────────────────
create table if not exists public.shrine_aekmak_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  tag       text not null check (tag in ('anxiety', 'regret', 'anger', 'worry', 'resentment', 'misfortune')),
  burned_at timestamptz not null default now()
);

-- 조회는 언제나 "내 기록을 최근순으로" — 오늘 카운트·이달 카운트 둘 다 이 인덱스로 끝난다.
create index if not exists shrine_aekmak_logs_user_burned_idx
  on public.shrine_aekmak_logs (user_id, burned_at desc);

alter table public.shrine_aekmak_logs enable row level security;

-- 본인 조회만. 쓰기는 서버(service_role) RPC 전용 → INSERT/UPDATE/DELETE 정책 미부여.
-- (정책을 주면 클라이언트가 일 3회 상한을 우회해 직접 INSERT 할 수 있다 — S1a/S1b 교훈)
drop policy if exists shrine_aekmak_logs_select_own on public.shrine_aekmak_logs;
create policy shrine_aekmak_logs_select_own on public.shrine_aekmak_logs
  for select using (auth.uid() = user_id);

-- ── 태우기 RPC — 하루(KST) 상한 판정과 기록을 한 문장에서 ─────
-- allowed=false 면 상한 초과(기록 없음). today_count 는 판정 후의 오늘 누계다.
--
-- 상한 검사와 INSERT 를 INSERT ... SELECT ... WHERE (count) < p_limit 한 문장으로 묶는다.
-- READ COMMITTED 에서 동시 호출이 겹치면 이론상 1건 초과가 가능하지만, 무료 기능이고
-- 초과분의 이득이 없다 — 잠금을 걸어 쓰기를 직렬화하는 비용이 더 크다는 판단이다.
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

-- 클라이언트가 직접 기록하지 못하도록 service_role 전용 (서버 액션에서 admin 으로만 호출).
revoke all on function public.burn_shrine_aekmak(uuid, text, date, int) from public, anon, authenticated;
grant execute on function public.burn_shrine_aekmak(uuid, text, date, int) to service_role;
