-- 신당 소원 카운터 트리거를 SECURITY DEFINER 로 (라이브 적용 완료 2026-08-25).
--
-- 증상: 「기도 올리기」가 전원 실패 — 화면에는 "기도를 올리지 못했습니다"만 떴다.
-- 원인: sync_shrine_wish_count() 가 SECURITY INVOKER 라 호출자(authenticated) 권한으로
--       public.shrines 를 UPDATE 하는데, authenticated 에는 shrines 의 UPDATE 그랜트가 없다
--       (SELECT·DELETE·REFERENCES·TRIGGER·TRUNCATE 만 있다). 그래서 shrine_wishes INSERT 가
--       트리거 단계에서 42501(permission denied for table shrines)로 통째로 롤백됐다.
--       🔴 마지막으로 저장된 소원이 2026-07-30 인 것이 이 사고의 경계선이다 — 소원·기도 저장이
--          한 달 가까이 조용히 죽어 있었고, 화면 어디에도 원인이 드러나지 않았다.
-- 처방: wish_count 는 사용자 데이터가 아니라 시스템이 유지하는 비정규화 카운터이므로 DEFINER 로 올린다.
--       대안(authenticated 에 shrines UPDATE 그랜트)은 임의 컬럼 직접 쓰기를 열어 주므로 반려했다.
-- 안전: 본문에 사용자 입력이 섞이지 않고(NEW.shrine_id 로 한 행만), search_path 를 못박고,
--       함수 EXECUTE 를 anon·authenticated 에서 회수한다(트리거는 소유자 권한으로 돈다).
CREATE OR REPLACE FUNCTION public.sync_shrine_wish_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.shrines SET wish_count = wish_count + 1, updated_at = now() WHERE id = NEW.shrine_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.shrines SET wish_count = GREATEST(0, wish_count - 1), updated_at = now() WHERE id = OLD.shrine_id;
  END IF;
  RETURN NULL;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sync_shrine_wish_count() FROM PUBLIC, anon, authenticated;
