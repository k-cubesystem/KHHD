-- 가족 사랑방 좌석 재배치 — 사용자가 식구 자리를 끌어 옮긴 좌표를 보관한다
-- 근거: CEO 4차 검수 "가족들도 위치를 바꿀 수 있게 설정해줘"
--
-- ── 왜 새 테이블이 아니라 컬럼 하나인가 ─────────────────────────────────────
-- 사랑방은 **본인 신당 탭에서만** 열린다(app/protected/shrine/page.tsx — 가족 탭은 familyHall=null).
-- 즉 좌석 배치는 (사용자 1명 : 배치 1벌) 관계라 본인 신당 행 하나에 그대로 얹힌다.
-- 별도 테이블이면 행마다 RLS·조인·수명주기(가족 삭제 시 정리)를 새로 떠안는데, 얻는 것이 없다.
--
-- 형태: { "self": {"x": 50, "y": 63}, "<family_members.id>": {"x": 32.5, "y": 71.2} }
--   · 키 'self' = 본인 좌석(family_members 행이 아니라 id 가 없다)
--   · 값 = 사랑방 박스 기준 % 좌표. 클램프 범위·파싱은 lib/domain/shrine/family-hall-layout.ts 단일 관문
--     (parseHallSeats / HALL_SEAT_ZONE) — 서버 액션이 저장 직전에 **다시** 클램프한다.
--   · 키가 없는 좌석 = 자동 반원 배치. 그래서 기본값 '{}' 만으로 기존 신당 화면이 종전과 100% 같다
--     (데이터 마이그레이션 없음).
--
-- ── 보안 ────────────────────────────────────────────────────────────────────
-- shrines 는 이미 RLS 가 걸려 있고 이 컬럼도 그 정책을 그대로 탄다:
--   shrines_update_own  USING (auth.uid() = user_id)   ← 쓰기는 본인 행만
--   shrines_public_read USING (visibility='public' OR auth.uid() = user_id)
-- 새 정책을 만들지 않는 이유 = 정책 표면을 늘리지 않기 위해서다. 다만 공개 신당이면
-- 이 컬럼도 함께 읽힌다는 사실은 짚어 둔다 — 담기는 값은 **좌표와 family_members.id(uuid)** 뿐이고
-- 이름·생년월일·관계 같은 식별 정보는 들어가지 않는다(family_member_id 자체는 shrines 에 이미 공개돼 있다).
-- 쓰기 경로의 소유자 검증은 app/actions/shrine/family-hall.ts(saveFamilyHallSeats)가
-- user_id = auth.uid() + family_member_id IS NULL 로 한 번 더 한다.
--
-- ⚠️ 배포 순서: **이 마이그레이션 적용 → 코드 배포.**
--    읽기 경로는 select('*') 라 미적용 DB에서도 죽지 않지만(좌석이 자동 배치로 보일 뿐),
--    저장은 "알 수 없는 컬럼"으로 실패한다.

ALTER TABLE public.shrines
  ADD COLUMN IF NOT EXISTS hall_seats jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 객체(맵)만 허용한다. 배열·스칼라가 들어오면 파서가 통째로 버려 배치가 조용히 사라지므로
-- 애초에 DB 에서 막는다. 세부 형태(x/y 범위)는 애플리케이션 단일 관문에서 본다.
ALTER TABLE public.shrines
  DROP CONSTRAINT IF EXISTS shrines_hall_seats_is_object;
ALTER TABLE public.shrines
  ADD CONSTRAINT shrines_hall_seats_is_object CHECK (jsonb_typeof(hall_seats) = 'object');

COMMENT ON COLUMN public.shrines.hall_seats IS
  '가족 사랑방 좌석 재배치 좌표 맵. 키=self|family_members.id, 값={x,y}(사랑방 박스 %). 빈 객체=자동 반원 배치.';
