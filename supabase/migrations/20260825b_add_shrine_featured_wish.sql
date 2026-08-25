-- 액자에 걸어 둔 기도 — 100일기도 v3 (CEO 2026-08-25 «이전 기도를 골라 액자에 걸 수 있게»).
-- 라이브 적용 완료 2026-08-25.
--
-- NULL = 최신 기도를 건다(기본). 값이 있으면 그 기도를 건다.
-- 기도가 지워지면 자동으로 NULL 로 돌아가 최신 기도가 다시 걸린다(ON DELETE SET NULL) —
-- 100개 상한을 넘겨 오래된 기도가 정리될 때 액자가 빈 채로 남지 않는다.
ALTER TABLE public.shrines
  ADD COLUMN IF NOT EXISTS featured_wish_id uuid
  REFERENCES public.shrine_wishes(id) ON DELETE SET NULL;

-- 🔴 컬럼 단위 그랜트가 이 표의 규율이다(2026-08-25 실측):
--    사용자가 «자기 표시 상태»로 바꾸는 칸만 열려 있고(name·description·theme·visibility·
--    hall_seats·fixture_offsets·updated_at), 경제·카운터 칸(wish_count·main_deity_id·
--    guardians·active_pack_id)은 닫혀 있어 자가 지급이 막힌다.
--    featured_wish_id 는 앞의 갈래(표시 상태)라 같은 규율로 연다.
--    행 범위는 RLS(shrines_update_own: auth.uid() = user_id)가 계속 진다.
--    ⚠️ 남의 기도 id 를 넣는 것은 FK 로 막히지 않으므로 **서버 액션이 소유를 확인**한다.
GRANT UPDATE (featured_wish_id) ON public.shrines TO authenticated;
