-- 신당 반가 ⑦ 「캐릭터 화풍 시네마틱」 무대 (2026-09-23 대표 결정)
--
-- 대표: 「그림 퀄리티와 구도가 옛날 스타일」. 파일럿에서 고른 결 — ⑦ 화풍(신위와 같은 붓) ·
-- 감실 뒤 빛나는 창호 · 제단 이동·크기 조절 유지(두 바닥 마스크).
-- 자산은 scripts/shrine-assets/stage-painted.mjs 가 굽는다(현행 v3 와 같은 치수 · 같은 수평선).
--
-- 바꾸는 것: banga 대청 구역(zones[0])의 자산 URL 네 자리뿐이다.
--   벽      room-wall-mural-v3.webp  → room-wall-mural-p7-v3.webp
--   바닥    room-floor-mural-v3.webp → room-floor-mural-p7-v3.webp
--   그늘 판 (없음)                   → room-floor-shade-p7-v3.webp   ← 두 바닥 마스크(StageSpec.floorShadeUrl)
--   틀      grand-altar-v2.webp      → grand-altar-p7.webp            ← 랜드마크 4줄(감실 윗턱·감실 바닥·상판 앞턱·접지)이 v2 와 같다
-- 그대로인 것: 틀 좌표·폭·앵커(저장된 배치가 한 칸도 안 움직인다) · 광원 · 최상위 stage(`stage - 'zones'` 원복 착지점).
--
-- ⚠️ 코드 배포가 먼저다 — 그늘 판을 읽는 코드가 나가기 전에 적용하면 틀 밑에 창살 빛무늬가 남는다(깨지지는 않는다).
--
-- 가드: 두루마리 1구역이고 그 틀이 grand-altar-banga 인 행에만 — 부분 적용·재실행이 안전하다.
--
-- 되돌리기:
--   update public.shrine_theme_packs
--   set stage = jsonb_set(jsonb_set(jsonb_set(stage #- '{zones,0,floorShadeUrl}',
--       '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/banga/room-wall-mural-v3.webp'::text)),
--       '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/banga/room-floor-mural-v3.webp'::text)),
--       '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/banga/grand-altar-v2.webp'::text))
--   where code = 'banga';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/banga/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/banga/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/banga/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/banga/grand-altar-p7.webp'::text))
where code = 'banga'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-banga';
