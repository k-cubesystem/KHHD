-- 고정 살림 조절 — 신위 무대·가족 선반장·의식각의 자리를 신당마다 미세 조정한 값을 보관한다
-- 근거: CEO 지시 "선반과 신, 간판이 중간에 붕 떠 있어 / 이걸 꾸미기에서 조절할 수 있게 하자.
--       그림마다 맞추기가 힘들 것 같으니"
--
-- ── 왜 정본 좌표를 고치지 않고 오프셋인가 ────────────────────────────────────
-- 표준 기하(TEAM_G_DESIGN theme-stage-geometry.json → 시드)는 **16테마 공용 단일 출처**다.
-- 그런데 테마 뮤럴은 저마다 벽선·마루선·툇마루 높이가 달라서 한 벌의 좌표가 전부에 맞지 않는다.
-- 정본을 테마별로 쪼개면 뮤럴을 다시 그릴 때마다 표가 낡고(재제작 전례), 사람이 손으로 맞춰야 할
-- 자리가 16배로 늘어난다. 그래서 정본은 **손대지 않고**(json·시드 무접촉) 신당 행에 가산값만 얹는다.
--
-- 형태: { "deityStage": {"dx": -1.5, "dy": 2}, "familyShelf": {...}, "ritualHall": {...} }
--   · 키 = lib/domain/shrine/fixture-offsets.ts 의 FixtureKey 3종. 그 밖의 키는 파서가 버린다.
--   · 값 = 무대 %(대청 로컬) 가산 이동량. 범위 dx ±12 · dy ±14 로 클램프된다.
--   · 파싱·클램프는 parseFixtureOffsets 단일 관문 — 서버 액션이 저장 직전에 **다시** 클램프한다.
--   · 영(0,0)은 저장하지 않는다(정규화) → 「초기화」·「제자리로 되돌림」·「한 번도 안 건드림」이 같은 값.
--   · 그래서 기본값 '{}' 만으로 기존 신당 화면이 종전과 100% 같다(데이터 마이그레이션 없음 — hall_seats 전례).
--
-- ── 보안 ────────────────────────────────────────────────────────────────────
-- shrines 는 이미 RLS 가 걸려 있고 이 컬럼도 그 정책을 그대로 탄다(새 정책 0):
--   shrines_update_own  USING (auth.uid() = user_id)
--   shrines_public_read USING (visibility='public' OR auth.uid() = user_id)
-- ⚠️ 다만 20260731_shrines_write_column_grants.sql 이 UPDATE 를 **컬럼 화이트리스트**로 좁혀 놓았다 —
--    새 컬럼은 grant 를 주지 않으면 42501 로 조용히 저장이 실패한다. 아래 grant 한 줄이 그 몫이다.
--    담기는 값은 좌표 두 개뿐이라 공개 신당에서 함께 읽혀도 새는 정보가 없다(오히려 방문자 뷰가
--    같은 그림을 그리려면 읽혀야 한다).
-- 쓰기 경로의 소유자 검증은 app/actions/shrine/scene.ts(saveFixtureOffsets)가
-- user_id = auth.uid() + 가족 스코프(family_member_id)로 한 번 더 한다.
--
-- ⚠️ 배포 순서: **코드 먼저 배포해도 안전하다.** 읽기 경로가 select('*') 라 컬럼이 없으면 {} 로
--    폴백해 종전 화면이 그대로 나온다(저장만 실패). 반대로 이 마이그레이션을 먼저 적용해도 무해하다.

ALTER TABLE public.shrines
  ADD COLUMN IF NOT EXISTS fixture_offsets jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 객체(맵)만 허용한다. 배열·스칼라가 들어오면 파서가 통째로 버려 조정이 조용히 사라지므로
-- 애초에 DB 에서 막는다. 세부 형태(dx/dy 범위)는 애플리케이션 단일 관문에서 본다.
ALTER TABLE public.shrines
  DROP CONSTRAINT IF EXISTS shrines_fixture_offsets_is_object;
ALTER TABLE public.shrines
  ADD CONSTRAINT shrines_fixture_offsets_is_object CHECK (jsonb_typeof(fixture_offsets) = 'object');

-- 컬럼 화이트리스트에 추가 (20260731 grant 승계 — 다른 컬럼 권한은 건드리지 않는다)
GRANT UPDATE (fixture_offsets) ON public.shrines TO authenticated;

COMMENT ON COLUMN public.shrines.fixture_offsets IS
  '고정 살림(신위 무대·가족 선반장·의식각) 자리 미세 조정 맵. 키=deityStage|familyShelf|ritualHall, 값={dx,dy}(무대 % 가산). 빈 객체=정본 좌표 그대로.';
