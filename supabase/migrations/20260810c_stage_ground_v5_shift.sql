-- ============================================================================
-- 무대 기하 v5 「마루 1/3 접지」 — 스냅해 둔 배치 동반 이동 (+9%p)
--
-- CEO 지시(2026-08-10 밤 · 실기기 + 스크린샷 주석):
--   "선반과 틀 같은 건 마루 3/1은 자리를 잡아야 해. 틀, 선반 위치는 이미지에 넣었어."
--
-- v4.1 은 살림의 발끝을 **마루선 그 자체**(y73)에 앉혔다. 접지는 맞았지만 가구가 마루에 발끝만
-- 걸친 채 «벽에 기댄» 그림이었다. v5 는 발을 마루 안쪽 1/3 까지 들여놓는다:
--     접지선 = 마루선 + 바닥밴드/3 = 73 + 9 = **82**   (lib/domain/shrine/theme-stage.ts)
--
-- 코드 쪽 처방(같은 회차):
--   theme-stage-geometry.json  틀 시드 y 37.22 → **46.22** · 제단 앵커 2열 52.4/55 → **61.4/64**
--                              감실 윗턱 24.9/23.2/25.6 → **33.9/32.2/34.6**
--   family-shelf.ts            FSHELF_UNIT  top 31 → 40 · bottom 73 → **82**(= 접지선 파생)
--   stage.ts                   deityPodiumTopY  틀 테마 45.3 → **54.3**(13테마는 45.3 그대로)
--   RitualHall.tsx             FSHELF_UNIT 을 그대로 승계 — 파일 무수정
-- 전부 **평행이동 +9** 다(상자 높이·틀 세로·앵커 x·아이템 배율·신위 키 전부 불변).
--
-- ⚠️ 그런데 **배치는 절대 좌표**다 — 앵커가 내려가도 이미 놓아 둔 신물은 어제 자리에 남아
--    널·상판에서 9%p 떠 버린다. 그 한 번을 메우는 것이 이 마이그레이션이고, 이 회차 한정이다.
--
-- ── 판정: 「앵커 id + 옛 좌표 정확일치」 (20260810b 규율 승계) ────────────────
-- 스냅은 좌표를 **앵커 값 그대로 복사**하고 `anchor_id` 까지 함께 저장한다. 스냅이 풀리면
-- anchor_id 가 null 로 지워진다. 그래서 「스냅해 둔 것」의 정의가 좌표 근사가 아니라 **정확한
-- 등식**으로 존재한다. 박스·근사 판정을 쓰지 않는 이유는 안전 때문이다:
--   · 정확일치는 신·구 값의 교집합이 공집합이라 **재실행이 무해**하다(두 번째 실행은 0행).
--       제단  옛 {52.40, 55.00} → 새 {61.40, 64.00}
--       선반  옛 {40.52, 50.60, 59.42} → 새 {49.52, 59.60, 68.42}
--   · 자유 배치(anchor_id IS NULL)는 사용자가 «거기»에 둔 물건이라 **건드리지 않는다**(무손실 계약).
--     제단권(y48~58)에 손으로 놓아 둔 공물도 여기 포함이다 — 어차피 재배치가 이 신당의 문화다.
--
-- ── 옛 좌표의 출처(코드 상수에서 파생해 여기 상수로 굽는다) ──────────────────
--   제단  theme-stage-geometry.json grandAltar.structures[0].anchors (v4.1)
--         뒷줄 3점 y **52.40** (altar-left / altar-center / altar-right)
--         앞줄 2점 y **55.00** (altar-front-left / altar-front-right)
--         ⚠️ 13테마(v3)의 같은 이름 앵커는 y **53.50** 이라 이 집합에 걸리지 않는다 — 틀을 쓰지
--            않는 신당의 제단 배치는 한 건도 움직이지 않는다(v3 무대는 이번에 안 내려갔다).
--   선반  FSHELF_UNIT(v4.1) top 31 · bottom 73 → 높이 42
--         FSHELF_TIERS.boards [0.31, 0.55, 0.76] · itemLift 3.5   (lib/domain/shrine/family-shelf.ts)
--         앵커 y = top + boards[i]·높이 − itemLift = **40.52 / 50.60 / 59.42**
--   x 는 판정에 쓰지 않는다 — 그 좌표가 앵커에서 왔다는 사실은 anchor_id 가 이미 증명한다
--   (x 를 걸면 「고정 살림 조절」로 dx 를 준 신당만 조용히 빠진다).
--
-- ── 「고정 살림 조절」을 쓴 신당 ─────────────────────────────────────────────
-- shrines.fixture_offsets 의 dy 가 있으면 그 신당의 앵커는 정본에서 dy 만큼 내려가 있다. 그래서
-- 정확일치는 **dy 를 뺀 값**으로 판정한다(제단=deityStage · 선반=familyShelf). 이동량은 정본과
-- 같은 +9 다. 그 dy 가 «떠 있는 것을 사용자가 손으로 내린 값»이면 이번 이동과 겹쳐 이중 하향이
-- 된다 — 자동 초기화는 하지 않는다(다른 이유로 옮겼을 수 있다). 아래 ②로 세고 사람이 판단한다.
--
-- ⚠️ **선행 조건** — `20260810b_family_shelf_ground_shift.sql`(+11)이 먼저 적용돼 있어야 한다.
--    b 를 건너뛴 DB 의 선반 아이템은 아직 {29.52, 39.60, 48.42} 라 이 문장에 걸리지 않는다
--    (조용히 0행). ① 의 `b_미적용` 이 0 인지 반드시 먼저 본다.
--
-- ⚠️ **적용 전 반드시 대상 행수를 세어 보고**, 코드 배포와 같은 회차에 적용한다
--    (코드만 배포 = 신물이 9%p 뜬 채 남음 · 이 SQL 만 적용 = 신물이 살림 없는 자리로 내려감).
-- ============================================================================

-- ── ① 적용 전 확인 — 대상 행수 (읽기 전용) ──────────────────────────────────
--   with dy as (
--     select s.id,
--            case when jsonb_typeof(s.fixture_offsets -> 'deityStage' -> 'dy') = 'number'
--                 then (s.fixture_offsets -> 'deityStage' ->> 'dy')::numeric else 0 end as altar_dy,
--            case when jsonb_typeof(s.fixture_offsets -> 'familyShelf' -> 'dy') = 'number'
--                 then (s.fixture_offsets -> 'familyShelf' ->> 'dy')::numeric else 0 end as shelf_dy
--       from public.shrines s
--   )
--   select
--     count(*) filter (
--       where p.anchor_id in ('altar-left','altar-center','altar-right','altar-front-left','altar-front-right')
--         and round(p.y - d.altar_dy, 2) in (52.40, 55.00))                     as 제단_이동대상,
--     count(*) filter (
--       where p.anchor_id in ('altar-left','altar-center','altar-right','altar-front-left','altar-front-right')
--         and round(p.y - d.altar_dy, 2) in (61.40, 64.00))                     as 제단_이미이동,
--     count(*) filter (
--       where p.anchor_id in ('altar-left','altar-center','altar-right')
--         and round(p.y - d.altar_dy, 2) = 53.50)                               as 제단_v3_무접촉,
--     count(*) filter (
--       where p.anchor_id like 'seat:fshelf:%'
--         and round(p.y - d.shelf_dy, 2) in (40.52, 50.60, 59.42))              as 선반_이동대상,
--     count(*) filter (
--       where p.anchor_id like 'seat:fshelf:%'
--         and round(p.y - d.shelf_dy, 2) in (49.52, 59.60, 68.42))              as 선반_이미이동,
--     count(*) filter (
--       where p.anchor_id like 'seat:fshelf:%'
--         and round(p.y - d.shelf_dy, 2) in (29.52, 39.60, 48.42))              as b_미적용,
--     count(*) filter (where p.anchor_id is null)                               as 자유배치_무접촉
--     from public.shrine_placements p
--     join dy d on d.id = p.shrine_id;

-- ── ② 「고정 살림 조절」 보유 신당 — 이중 하향 후보 (읽기 전용 · 자동 초기화 금지) ──
--   select count(*) filter (where jsonb_typeof(fixture_offsets -> 'deityStage'  -> 'dy') = 'number') as 신위무대_dy,
--          count(*) filter (where jsonb_typeof(fixture_offsets -> 'familyShelf' -> 'dy') = 'number') as 선반장_dy,
--          count(*) filter (where jsonb_typeof(fixture_offsets -> 'ritualHall'  -> 'dy') = 'number') as 의식각_dy,
--          count(*)                                                                                  as 조절_보유_신당
--     from public.shrines
--    where fixture_offsets <> '{}'::jsonb;

-- ── ③-a 제단 동반 이동 — 틀(壇) 앵커 2열 (52.40 / 55.00 → 61.40 / 64.00) ────────
with altar_dy as (
  select s.id,
         case
           when jsonb_typeof(s.fixture_offsets -> 'deityStage' -> 'dy') = 'number'
             then (s.fixture_offsets -> 'deityStage' ->> 'dy')::numeric
           else 0
         end as dy
    from public.shrines s
)
update public.shrine_placements p
   set y = round(least(100, greatest(0, p.y + 9)), 2)
  from altar_dy d
 where d.id = p.shrine_id
   and p.anchor_id in ('altar-left', 'altar-center', 'altar-right', 'altar-front-left', 'altar-front-right')
   -- v4.1 틀 앵커 2열만 — v3(53.50)과 새 값(61.40/64.00) 어느 쪽과도 겹치지 않아 재실행이 무해하다
   and round(p.y - d.dy, 2) in (52.40, 55.00);

-- ── ③-b 선반 동반 이동 — 진열 칸 3단 (40.52 / 50.60 / 59.42 → 49.52 / 59.60 / 68.42) ──
with shelf_dy as (
  select s.id,
         case
           when jsonb_typeof(s.fixture_offsets -> 'familyShelf' -> 'dy') = 'number'
             then (s.fixture_offsets -> 'familyShelf' ->> 'dy')::numeric
           else 0
         end as dy
    from public.shrines s
)
update public.shrine_placements p
   set y = round(least(100, greatest(0, p.y + 9)), 2)
  from shelf_dy d
 where d.id = p.shrine_id
   and p.anchor_id like 'seat:fshelf:%'
   and round(p.y - d.dy, 2) in (40.52, 50.60, 59.42);

-- ── ④ 적용 후 확인 ──────────────────────────────────────────────────────────
--   위 ① 을 다시 실행한다. 「*_이동대상 = 0」 · 「*_이미이동 = 직전 이동대상」 이면 성공이다.

-- ── 원복 (같은 회차에 코드도 되돌릴 때만) ────────────────────────────────────
--   with dy as (
--     select s.id,
--            case when jsonb_typeof(s.fixture_offsets -> 'deityStage' -> 'dy') = 'number'
--                 then (s.fixture_offsets -> 'deityStage' ->> 'dy')::numeric else 0 end as altar_dy,
--            case when jsonb_typeof(s.fixture_offsets -> 'familyShelf' -> 'dy') = 'number'
--                 then (s.fixture_offsets -> 'familyShelf' ->> 'dy')::numeric else 0 end as shelf_dy
--       from public.shrines s
--   )
--   update public.shrine_placements p
--      set y = round(least(100, greatest(0, p.y - 9)), 2)
--     from dy d
--    where d.id = p.shrine_id
--      and ((p.anchor_id in ('altar-left','altar-center','altar-right','altar-front-left','altar-front-right')
--            and round(p.y - d.altar_dy, 2) in (61.40, 64.00))
--        or (p.anchor_id like 'seat:fshelf:%'
--            and round(p.y - d.shelf_dy, 2) in (49.52, 59.60, 68.42)));
