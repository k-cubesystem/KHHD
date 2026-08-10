-- ============================================================================
-- 사방탁자 접지 수복 — 진열해 둔 아이템 동반 이동 (+11%p)
--
-- CEO 실기기 검수(2026-08-10): "배경 적용 확인했어. 하지만 틀과 선반들이 공중에 떠 있어.
--   마루 라인에 맞춰서 내려와야 해."
--
-- 코드 쪽 처방(같은 회차):
--   lib/domain/shrine/family-shelf.ts  FSHELF_UNIT   top 20 → 31 · bottom 62 → **73**(= 마루선 파생)
--   components/shrine/scene/RitualHall.tsx  RITUAL_HALL_UNIT 이 그 값을 그대로 승계
-- 상자 «높이»는 42 그대로다(objectFit:'fill' 이라 높이를 바꾸면 가구가 늘어난다) — 순수 평행이동
-- **delta = +11%p** 이고, 진열 칸 앵커(`seat:fshelf:…`)가 그 상자에서 파생되므로 함께 +11 내려간다.
--
-- ⚠️ 그런데 **배치는 절대 좌표**다 — 앵커가 내려가도 이미 진열해 둔 신물은 어제 자리에 남아
--    널에서 11%p 떠 버린다. 그 한 번을 메우는 것이 이 마이그레이션이고, 이 회차 한정이다.
--
-- ── 판정: 「박스」가 아니라 「앵커 id + 옛 칸 좌표 정확일치」 ──────────────────
-- 스냅은 좌표를 **앵커 값 그대로 복사**하고(ShrineRoomClient: `x = snap.x` / `y = snap.y`)
-- `anchor_id` 까지 함께 저장한다. 스냅이 풀리면 anchor_id 가 null 로 지워진다. 그래서
-- 「선반에 진열된 것」의 정의가 좌표 근사가 아니라 **정확한 등식**으로 존재한다.
-- 박스 판정을 쓰지 않는 이유는 안전 때문이다:
--   · delta(11) > 단 간격(10.08 / 8.82) 이라 옛 칸 상자와 새 칸 상자가 **겹친다** → 박스 판정은
--     재실행 시 같은 행을 두 번 밀 수 있다(이중 이동).
--   · 정확일치는 겹치지 않는다: 옛 칸 y {29.52, 39.60, 48.42} 와 새 칸 y {40.52, 50.60, 59.42} 는
--     교집합이 공집합이라 **재실행이 무해**하다(두 번째 실행은 0행).
--   · 자유 배치(anchor_id IS NULL)는 사용자가 «거기»에 둔 물건이라 건드리지 않는다 — 무손실 계약.
--
-- ── 옛 칸 y 의 출처(코드 상수에서 파생해 여기 상수로 굽는다) ──────────────────
--   FSHELF_UNIT(옛) top 20 · bottom 62 → 높이 42
--   FSHELF_TIERS.boards  [0.31, 0.55, 0.76] · itemLift 3.5   (lib/domain/shrine/family-shelf.ts)
--   앵커 y = top + boards[i]·높이 − itemLift
--          = 20 + 13.02 − 3.5 = 29.52 / 20 + 23.10 − 3.5 = 39.60 / 20 + 31.92 − 3.5 = 48.42
--   (새 값은 전부 +11: 40.52 / 50.60 / 59.42)
--   x 는 판정에 쓰지 않는다 — 유닛 x 6곳 × 칸 3곳 = 18개 값이고, 그 전부가 `seat:fshelf:` 앵커에서
--   왔다는 사실은 anchor_id 가 이미 증명한다(x 를 걸면 조절 dx 를 쓴 신당만 조용히 빠진다).
--
-- ── 「고정 살림 조절」을 쓴 신당 ─────────────────────────────────────────────
-- shrines.fixture_offsets.familyShelf.dy 가 있으면 그 신당의 앵커는 정본에서 dy 만큼 내려가 있다.
-- 그래서 정확일치는 **dy 를 뺀 값**으로 판정한다(아래 shelf_dy). 이동량 자체는 정본과 같은 +11 이다.
--
-- ⚠️ 그 dy 가 «떠 있는 것을 사용자가 손으로 내린 값»이면 이번 수복과 **겹쳐 이중 하향**이 된다.
--    자동 초기화는 하지 않는다(사용자가 다른 이유로 옮겼을 수 있다). 아래 확인 쿼리로 개수를 세고,
--    있으면 사람이 판단한다.
--
-- ⚠️ **적용 전 반드시 대상 행수를 세어 보고**, 코드 배포와 같은 회차에 적용한다
--    (코드만 배포 = 아이템이 11%p 뜬 채 남음 · 이 SQL 만 적용 = 아이템이 11%p 내려가 널 아래로 감).
-- ============================================================================

-- ── ① 적용 전 확인 — 대상 행수 (읽기 전용) ──────────────────────────────────
--   with shelf_dy as (
--     select s.id,
--            case when jsonb_typeof(s.fixture_offsets -> 'familyShelf' -> 'dy') = 'number'
--                 then (s.fixture_offsets -> 'familyShelf' ->> 'dy')::numeric else 0 end as dy
--       from public.shrines s
--   )
--   select count(*)                                                   as 진열_전체,
--          count(*) filter (where round(p.y - d.dy, 2) in (29.52, 39.60, 48.42)) as 이동_대상,
--          count(*) filter (where round(p.y - d.dy, 2) in (40.52, 50.60, 59.42)) as 이미_이동됨
--     from public.shrine_placements p
--     join shelf_dy d on d.id = p.shrine_id
--    where p.anchor_id like 'seat:fshelf:%';

-- ── ② 「고정 살림 조절」 보유 신당 — 이중 하향 후보 (읽기 전용 · 자동 초기화 금지) ──
--   select count(*) filter (where jsonb_typeof(fixture_offsets -> 'familyShelf' -> 'dy') = 'number') as 선반장_dy,
--          count(*) filter (where jsonb_typeof(fixture_offsets -> 'ritualHall'  -> 'dy') = 'number') as 의식각_dy,
--          count(*) filter (where jsonb_typeof(fixture_offsets -> 'deityStage'  -> 'dy') = 'number') as 신위무대_dy,
--          count(*)                                                                                  as 조절_보유_신당
--     from public.shrines
--    where fixture_offsets <> '{}'::jsonb;
--   -- 세부 열람(있을 때만):
--   --   select id, user_id, fixture_offsets from public.shrines where fixture_offsets <> '{}'::jsonb;

-- ── ③ 동반 이동 ──────────────────────────────────────────────────────────────
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
   set y = round(least(100, greatest(0, p.y + 11)), 2)
  from shelf_dy d
 where d.id = p.shrine_id
   and p.anchor_id like 'seat:fshelf:%'
   -- 옛 칸 3단만 — 새 칸 값과 교집합이 없어 재실행이 무해하다(두 번째 실행은 0행)
   and round(p.y - d.dy, 2) in (29.52, 39.60, 48.42);

-- ── ④ 적용 후 확인 ──────────────────────────────────────────────────────────
--   위 ① 을 다시 실행한다. 「이동_대상 = 0」 · 「이미_이동됨 = 직전 이동_대상」 이면 성공이다.

-- ── 원복 (같은 회차에 코드도 되돌릴 때만) ────────────────────────────────────
--   with shelf_dy as (
--     select s.id,
--            case when jsonb_typeof(s.fixture_offsets -> 'familyShelf' -> 'dy') = 'number'
--                 then (s.fixture_offsets -> 'familyShelf' ->> 'dy')::numeric else 0 end as dy
--       from public.shrines s
--   )
--   update public.shrine_placements p
--      set y = round(least(100, greatest(0, p.y - 11)), 2)
--     from shelf_dy d
--    where d.id = p.shrine_id
--      and p.anchor_id like 'seat:fshelf:%'
--      and round(p.y - d.dy, 2) in (40.52, 50.60, 59.42);
