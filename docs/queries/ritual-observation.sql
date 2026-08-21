-- =====================================================================
-- 초하루 의례 관찰 쿼리 (2026-08-21)
--
-- 상태: 의례 루프는 프로덕션 라이브(87bf5f4 배포, ritual_enabled=true).
--       첫 실제 의례는 다음 음력 초하루 — 그 전까지 [3][5][6][7] 은 0 행이 정상이다.
--       [1][4] 는 배너·장부 진입만으로도 값이 생긴다(창 밖에서도 구독 CTA 노출).
--
-- 목적: 2단계 게이트 판정에 필요한 지표를 한 곳에서 본다.
--   · 게이트 전제조건 — 푸시 구독자 ≥ 5명
--   · 완주율 ≥ 40% / 완주자의 다음 초하루 재방문율 ≥ 50%
--   · 관찰 지표 — 「+식구 모시기」 탭률
--
-- 🔴 완주율·재방문율의 정본은 GA4 가 아니라 `ritual_records` DB 다(Eng 결정 4A).
--    GA4·activity_logs 는 클라이언트 발화라 이탈·광고차단으로 샌다 — UX 퍼널 보조로만 쓴다.
--    「어디서 새는가」는 [2], 「몇 %가 완주했나」는 [3] 을 볼 것. 둘을 섞지 말 것.
--
-- 이벤트 경로: trackEvent() → collectEvent() → track_activity RPC → activity_logs
--   activity_type = 이벤트명 · activity_category = 'ritual' · user_id = auth.uid()
--   (비로그인은 user_id NULL, visitor_id 만 남는다)
-- 이벤트명 단일 출처: lib/domain/ritual/lunar-window.ts 의 RITUAL_GA
--
-- 전부 읽기 전용. Supabase SQL Editor 또는 MCP execute_sql 로 실행.
--
-- 검증 (2026-08-21, 라이브 · BEGIN…ROLLBACK 합성 데이터 · 무흔적):
--   구문뿐 아니라 **로직도** 검증했다. 데이터가 0 일 때 도는 것만으로는 두 달 뒤
--   게이트 판정을 맡길 수 없어서다.
--   시나리오: A=1275완주→1276완주 / B=1275완주→1276진입만 / C=1275완주→다음달없음 /
--             D=1275진입만
--   [3] 완주율   기대 진입4·완주3·75.0  → 실측 일치 ✅
--   [5] 재방문율 기대 완주자3·다음진입2·다음완주1·66.7 → 실측 일치 ✅
--   [6] 식구지표 기대 식구카드있던완주1·평균0.67 → 실측 일치 ✅
--   잔존물 0 확인(ritual_records 0행, wallets 7행/합1135 무변).
-- =====================================================================


-- ---------------------------------------------------------------------
-- [1] 구독 퍼널 — CTA 탭 → 실제 구독. 게이트 전제조건 진척도.
--
-- 왜 두 단계인가: 웹푸시 구독이 없는 유저는 CTA 를 눌러도 바로 구독되지 않고
-- /protected/notifications 로 보내진다(브라우저 알림 권한이 먼저 필요). 그래서
-- 「탭했는데 구독 안 함」이 이탈 규모다. 이 값이 크면 2단계를 줄이는 게 다음 작업.
-- ---------------------------------------------------------------------
with tapped as (
  select distinct user_id
  from activity_logs
  where activity_type = 'ritual_push_optin' and user_id is not null
),
subscribed as (
  select distinct user_id
  from push_subscriptions
  where topics @> array['ritual']::text[]
)
select
  (select count(*) from tapped)                                     as "①CTA 탭한 유저",
  (select count(*) from subscribed)                                 as "②실제 구독 유저",
  (select count(*) from tapped t join subscribed s using (user_id)) as "①→② 완주",
  (select count(*) from tapped t where not exists
     (select 1 from subscribed s where s.user_id = t.user_id))      as "⚠️탭했는데 구독 안 함",
  case when (select count(*) from tapped) = 0 then null
       else round(100.0 * (select count(*) from tapped t join subscribed s using (user_id))
                        / (select count(*) from tapped), 1) end     as "전환율 %",
  greatest(0, 5 - (select count(*) from subscribed))                as "게이트까지 남은 구독자";


-- ---------------------------------------------------------------------
-- [2] 의례 퍼널 (UX 보조) — 어디서 새는가.
--     숫자 자체를 판정선으로 쓰지 말 것. 판정은 [3].
-- ---------------------------------------------------------------------
with ev as (
  select activity_type, user_id
  from activity_logs
  where activity_category = 'ritual' and user_id is not null
)
select s.step as "단계", s.label as "이벤트",
       (select count(distinct user_id) from ev where ev.activity_type = s.label) as "유저 수"
from (values
  (1,'ritual_enter'), (2,'member_card_view'), (3,'pray_tap'),
  (4,'ritual_complete'), (5,'ritual_push_optin'), (6,'family_invite_from_ritual')
) as s(step, label)
order by s.step;


-- ---------------------------------------------------------------------
-- [3] 완주율 — 정본(DB 기준). 게이트 판정선 ≥ 40%.
--     분모는 「의례 창 안에 진입한 달」이다 — 창 밖 진입은 행을 만들지 않으므로
--     여기 들어오지 않는다(분모 오염 방지 설계).
-- ---------------------------------------------------------------------
select
  r.ritual_month || case when r.is_leap_month then '(윤)' else '' end as "음력월",
  r.lunar_month_seq                                                    as "서수",
  count(*)                                                             as "진입(분모)",
  count(r.completed_at)                                                as "완주(분자)",
  round(100.0 * count(r.completed_at) / nullif(count(*),0), 1)         as "완주율 %"
from ritual_records r
group by 1, 2
order by 2 desc;


-- ---------------------------------------------------------------------
-- [4] ritual_push_optin 일별 추이 (KST).
--     「탭 수 ≫ 탭한 유저」면 같은 사람이 반복해 누르는 것 = 눌러도 안 되는 느낌.
-- ---------------------------------------------------------------------
select
  (created_at at time zone 'Asia/Seoul')::date as "날짜(KST)",
  count(*)                                     as "탭 수",
  count(distinct user_id)                      as "탭한 유저",
  count(distinct visitor_id)                   as "탭한 방문자"
from activity_logs
where activity_type = 'ritual_push_optin'
  and created_at >= now() - interval '60 days'
group by 1
order by 1 desc;


-- ---------------------------------------------------------------------
-- [5] 재방문율 — 게이트 판정선 ≥ 50%.
--     ⚠️ 2회 관찰로는 1차 초하루 완주 코호트만 측정 가능하다(2차 완주자의 「다음」은
--        관찰창 밖). 코호트 1개·표본 수 명 기준임을 전제로 읽을 것.
-- ---------------------------------------------------------------------
with done as (
  select user_id, lunar_month_seq
  from ritual_records
  where completed_at is not null
)
select
  d.lunar_month_seq                                                   as "코호트(서수)",
  count(*)                                                            as "완주자",
  count(*) filter (where exists (
    select 1 from ritual_records n
    where n.user_id = d.user_id and n.lunar_month_seq = d.lunar_month_seq + 1
  ))                                                                  as "다음 달 진입",
  count(*) filter (where exists (
    select 1 from ritual_records n
    where n.user_id = d.user_id and n.lunar_month_seq = d.lunar_month_seq + 1
      and n.completed_at is not null
  ))                                                                  as "다음 달 완주",
  round(100.0 * count(*) filter (where exists (
    select 1 from ritual_records n
    where n.user_id = d.user_id and n.lunar_month_seq = d.lunar_month_seq + 1
  )) / nullif(count(*), 0), 1)                                        as "재방문율 %"
from done d
group by 1
order by 1 desc;


-- ---------------------------------------------------------------------
-- [6] 가족 가설 관찰 지표 (판정선 아님 — 방향 신호).
--     members_viewed 는 서버가 파생한다(클라 uuid 미수신, Eng 결정 7A).
-- ---------------------------------------------------------------------
select
  count(*)                                                        as "완주 건수",
  count(*) filter (where cardinality(members_viewed) > 0)         as "식구 카드 있던 완주",
  round(avg(cardinality(members_viewed))::numeric, 2)             as "평균 식구 수",
  (select count(distinct user_id) from activity_logs
    where activity_type = 'family_invite_from_ritual')            as "＋식구 모시기 탭한 유저"
from ritual_records
where completed_at is not null;


-- ---------------------------------------------------------------------
-- [7] 소원 갈래 분포 — 어떤 소원으로 오는가.
--     원문은 저장하지 않는다(Eng 결정 9A). 갈래만 안다.
-- ---------------------------------------------------------------------
select coalesce(wish_category, '(미지정)') as "갈래", count(*) as "건수"
from ritual_records
where completed_at is not null
group by 1
order by 2 desc;
