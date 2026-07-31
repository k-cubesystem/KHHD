-- 보안 수복 2/2 (감사 A3 S-P0-1, 2026-07-31 야간) — ⚠️ **코드 배포 후에만 적용**.
--
-- ── 무엇이 뚫려 있었나 ──────────────────────────────────────────
-- shrines_update_own(USING auth.uid()=user_id)은 행만 가를 뿐 **컬럼을 가리지 않는다**.
-- PostgREST 로 `PATCH /rest/v1/shrines {main_deity_id, active_pack_id}` 한 방이면
-- 봉안(유료 신위 39,900원)·테마(19,900원) 검증을 전부 우회해 무료 착용이 됐다.
-- DELETE 후 유료 컬럼을 박아 재INSERT 하는 우회로도 같았다(INSERT 도 전 컬럼 허용).
-- visitor_count·wish_count 도 스스로 조작 가능했다.
--
-- ── 처방: 행은 RLS, 컬럼은 권한 ────────────────────────────────
-- RLS 정책은 그대로 두고(행 스코프), 테이블 권한을 컬럼 화이트리스트로 좁힌다.
-- 화이트리스트는 코드의 사용자-클라이언트 쓰기 경로 전수조사 결과다:
--   UPDATE: updateShrine(name·description·theme·visibility·updated_at, shrine.ts:127)
--           · setShrineVisibility(visibility, scene.ts:669) · saveFamilyHallSeats(hall_seats)
--   INSERT: createShrine(user_id·name·description·theme·visibility, shrine.ts:94)
--           · 가족 신당 자동생성(+family_member_id, scene.ts:361)
-- 유료 컬럼 쓰기는 전부 admin 경유다: 봉안(deities.ts) · 테마 착용(scene.ts:706 — 이번에 전환).
--
-- ⚠️ 적용 순서: scene.ts 테마 착용의 admin 전환이 **배포된 뒤** 적용한다.
--    먼저 적용하면 배포 전 코드의 테마 착용(사용자 클라이언트 쓰기)이 42501 로 죽는다(S1b 교훈).
-- 원복: grant update on public.shrines to authenticated; (전 컬럼 복귀)

revoke insert, update on table public.shrines from anon, authenticated;

grant insert (user_id, family_member_id, name, description, theme, visibility)
  on public.shrines to authenticated;

grant update (name, description, theme, visibility, hall_seats, updated_at)
  on public.shrines to authenticated;
