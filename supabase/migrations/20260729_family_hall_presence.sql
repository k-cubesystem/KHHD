-- 가족 사랑방(FamilyHall) presence — 신당 게임필 3차 1파
-- 근거: TEAM_G_DESIGN/prd/PRD-shrine-gamefeel-v1.md §안3 · architecture/ARCH-shrine-gamefeel-v1.md §3·§7
--
-- 무엇을 주는가: 호출자(로그인 사용자)의 사랑방 좌석 목록 = 본인 1석 + 가족 N석.
--   좌석마다 "오늘(KST) 그 대상을 위해 기도했는가"와 "마지막으로 기도한 시각".
--
-- ── prayed_today 판정 근거 (실측) ─────────────────────────────────────────────
-- shrine_devotion 은 PK 가 user_id 하나뿐인 **계정 단위** 누적 카운터다(20260724_shrine_devotion.sql).
-- 즉 "오늘 어딘가에 한 번 기도했다"만 알 뿐, 어느 가족의 신당이었는지 구분하지 못한다.
-- 가족별 기도 기록 테이블은 존재하지 않는다.
--
-- 실재하는 유일한 가족 단위 기도 흔적은 `shrine_wishes` 다:
--   · 신당은 (user_id, family_member_id) 로 갈라진다 — NULL = 본인 신당 (20260717_family_shrines.sql)
--   · 소원은 그 신당(shrine_id)에 달리고, 소유자 소원에만 is_owner_wish=true 가 찍힌다
--   · 기원(devotion) 적립도 **소유자 소원일 때만** 일어난다 (app/actions/shrine/shrine-wishes.ts)
-- 따라서 "그 가족의 신당에 오늘 소유자가 남긴 소원" = **오늘 그 가족을 위해 기도했다** 로 정의한다.
-- (shrine_wishes.family_member_id 컬럼은 표기 보강용이고 정본 스코프는 shrine_id 다 — 20260722 주석 참조.
--  그래서 대상 판정은 컬럼이 아니라 shrines 조인으로 한다.)
--
-- ── 보안 (ARCH §7) ───────────────────────────────────────────────────────────
-- · 인자 없음. 스코프는 auth.uid() 로만 정해진다 — 남의 family_id 를 넣을 수 있는 형태 자체를 없앴다.
-- · SECURITY DEFINER + search_path 고정. 비로그인(anon)·service_role 호출은 auth.uid() 가 NULL 이라 0행.
-- · EXECUTE 는 authenticated·service_role 만(anon/PUBLIC 회수).
-- · 개인정보 최소: 생년월일·시·성별·사진·이메일·user_id 는 반환하지 않는다. 이름·관계·아바타만.
--
-- ⚠️ 배포 체크리스트: 이 마이그레이션 적용 후 app/api/cron/health/route.ts 의 REQUIRED_RPCS 에
--    'get_family_hall_presence' 를 추가한다(7/4 RPC 소실 무음 실패 재발 방지). 적용 전에 넣으면
--    헬스체크가 매일 없는 함수로 Sentry 경보를 울리므로 **적용과 같은 배포에서** 함께 넣을 것.

-- 반환 타입이 바뀌면 CREATE OR REPLACE 가 실패하므로 먼저 떨군다(재실행 멱등).
DROP FUNCTION IF EXISTS public.get_family_hall_presence();

CREATE FUNCTION public.get_family_hall_presence()
RETURNS TABLE(
  member_id uuid,          -- NULL = 본인 좌석 (family_members 행이 아니다)
  name text,
  relationship text,
  avatar_id text,          -- lib/domain/family/avatars.ts 카탈로그 id. 본인·미설정은 NULL
  prayed_today boolean,
  last_wish_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_day_start timestamptz;
BEGIN
  -- 비로그인·service_role: 좌석 없음. (예외 대신 0행 — 사랑방은 "닫힌 문"으로 렌더된다)
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- KST 자정을 timestamptz 경계로 환산한다. created_at 에 함수를 씌우지 않아
  -- idx_wishes_shrine(shrine_id, created_at DESC) 를 그대로 탄다.
  v_day_start := date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';

  -- CTE 컬럼명에 seat_ 접두를 붙인 이유: RETURNS TABLE 의 name/relationship/... 은 plpgsql 변수라
  -- 같은 이름의 컬럼을 쓰면 "column reference is ambiguous" 로 죽는다. 이름 자체를 겹치지 않게 한다.
  RETURN QUERY
  WITH seats AS (
    -- 본인 좌석 — profiles 가 정본. 행이 없어도 좌석은 항상 1개 나오도록 스칼라 서브쿼리로 만든다.
    SELECT
      NULL::uuid AS seat_member_id,
      COALESCE(NULLIF(btrim((SELECT p.full_name FROM public.profiles p WHERE p.id = v_uid)), ''), '나') AS seat_name,
      '본인'::text AS seat_relationship,
      NULL::text AS seat_avatar_id,
      0 AS seat_order,
      NULL::timestamptz AS seated_at
    UNION ALL
    -- 가족 좌석. relationship='본인' 자동 레코드는 위 본인 좌석과 이중 계상되므로 제외
    -- (app/actions/shrine/energy-map.ts·app/protected/shrine/page.tsx 와 동일 규약).
    SELECT
      fm.id,
      COALESCE(NULLIF(btrim(fm.name), ''), '이름 없음'),
      COALESCE(NULLIF(btrim(fm.relationship), ''), '가족'),
      fm.avatar_id,
      1,
      fm.created_at
    FROM public.family_members fm
    WHERE fm.user_id = v_uid
      AND COALESCE(fm.relationship, '') <> '본인'
  )
  SELECT
    s.seat_member_id,
    s.seat_name,
    s.seat_relationship,
    s.seat_avatar_id,
    (w.today_at IS NOT NULL),
    w.last_at
  FROM seats s
  LEFT JOIN LATERAL (
    SELECT
      max(sw.created_at) AS last_at,
      max(sw.created_at) FILTER (WHERE sw.created_at >= v_day_start) AS today_at
    FROM public.shrine_wishes sw
    JOIN public.shrines sh ON sh.id = sw.shrine_id
    WHERE sh.user_id = v_uid
      -- 본인 좌석(NULL) ↔ 본인 신당(family_member_id NULL) 을 NULL 안전 비교로 맞춘다
      AND sh.family_member_id IS NOT DISTINCT FROM s.seat_member_id
      -- 소유자가 남긴 소원만 기도로 센다. 방문자 기원은 제외(기원 적립 규약과 동일).
      -- is_owner_wish 는 nullable 이라 coalesce 하고, 레거시 행 대비로 작성자 동일성도 함께 본다.
      AND (COALESCE(sw.is_owner_wish, false) OR sw.wisher_user_id = v_uid)
  ) w ON TRUE
  ORDER BY s.seat_order, s.seated_at NULLS FIRST, s.seat_name;
END;
$$;

COMMENT ON FUNCTION public.get_family_hall_presence() IS
  '가족 사랑방 좌석 presence(본인+가족). 스코프=auth.uid() 고정, 인자 없음. prayed_today=오늘(KST) 그 대상 신당에 소유자 소원이 있었는가.';

REVOKE ALL ON FUNCTION public.get_family_hall_presence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_family_hall_presence() TO authenticated, service_role;
