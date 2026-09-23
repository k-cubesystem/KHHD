-- 신당 ⑦ 「캐릭터 화풍 시네마틱」 무대 — 반가(20260923_banga_painted_p7)에 이은 15테마 확산
--
-- 대표 결정(2026-09-23): ⑦ 화풍(신위와 같은 붓) · 감실 뒤 빛나는 창 · 제단 이동·크기 조절 유지(두 바닥 마스크).
-- 반가 라이브(52차) 뒤 «풀로 진행» 지시로 나머지 15테마를 같은 파이프라인으로 넓힌다.
-- 자산은 scripts/shrine-assets/stage-painted.mjs 가 굽는다 — 각 테마 현행 v3 와 같은 치수·같은 수평선,
-- 제단은 v2 와 같은 세로 배치(머리 여백 포함)라 감실 윗턱·감실 바닥·상판 앞턱·접지가 제자리다.
--
-- 바꾸는 것: 테마마다 대청 구역(zones[0])의 자산 URL 네 자리뿐이다(반가와 같은 모양).
--   벽 room-wall-mural-v3 → -p7-v3 · 바닥 room-floor-mural-v3 → -p7-v3 · 그늘 판 (없음) → room-floor-shade-p7-v3
--   틀 grand-altar-v2 → grand-altar-p7
-- 그대로인 것: 틀 좌표·폭·앵커(저장된 배치가 한 칸도 안 움직인다) · 광원 · 최상위 stage(원복 착지점).
--
-- ⚠️ 코드 배포가 먼저다 — 그늘 판(floorShadeUrl)은 52차 코드가 이미 읽지만, 자산 파일은 이번 배포로 나간다.
--
-- 가드: 테마마다 두루마리 1구역이고 그 틀이 grand-altar-{code} 인 행에만 — 부분 적용·재실행이 안전하다.
--
-- 되돌리기(15테마 한 번에):
--   update public.shrine_theme_packs
--   set stage = jsonb_set(jsonb_set(jsonb_set(stage #- '{zones,0,floorShadeUrl}',
--       '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/' || code || '/room-wall-mural-v3.webp')),
--       '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/' || code || '/room-floor-mural-v3.webp')),
--       '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/' || code || '/grand-altar-v2.webp'))
--   where code in ('byeolbat', 'choga', 'daejanggan', 'daljip', 'dangsan', 'dokkaebi', 'hongsal', 'jangdok', 'jonggak', 'naru', 'saemgut', 'seolbit', 'seonang', 'yeondeung', 'yonggung');

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/byeolbat/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/byeolbat/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/byeolbat/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/byeolbat/grand-altar-p7.webp'::text))
where code = 'byeolbat'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-byeolbat';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/choga/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/choga/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/choga/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/choga/grand-altar-p7.webp'::text))
where code = 'choga'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-choga';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/daejanggan/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/daejanggan/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/daejanggan/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/daejanggan/grand-altar-p7.webp'::text))
where code = 'daejanggan'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-daejanggan';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/daljip/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/daljip/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/daljip/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/daljip/grand-altar-p7.webp'::text))
where code = 'daljip'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-daljip';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/dangsan/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/dangsan/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/dangsan/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/dangsan/grand-altar-p7.webp'::text))
where code = 'dangsan'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-dangsan';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/dokkaebi/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/dokkaebi/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/dokkaebi/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/dokkaebi/grand-altar-p7.webp'::text))
where code = 'dokkaebi'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-dokkaebi';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/hongsal/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/hongsal/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/hongsal/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/hongsal/grand-altar-p7.webp'::text))
where code = 'hongsal'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-hongsal';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/jangdok/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/jangdok/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/jangdok/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/jangdok/grand-altar-p7.webp'::text))
where code = 'jangdok'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-jangdok';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/jonggak/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/jonggak/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/jonggak/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/jonggak/grand-altar-p7.webp'::text))
where code = 'jonggak'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-jonggak';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/naru/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/naru/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/naru/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/naru/grand-altar-p7.webp'::text))
where code = 'naru'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-naru';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/saemgut/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/saemgut/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/saemgut/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/saemgut/grand-altar-p7.webp'::text))
where code = 'saemgut'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-saemgut';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/seolbit/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/seolbit/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/seolbit/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/seolbit/grand-altar-p7.webp'::text))
where code = 'seolbit'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-seolbit';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/seonang/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/seonang/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/seonang/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/seonang/grand-altar-p7.webp'::text))
where code = 'seonang'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-seonang';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/yeondeung/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/yeondeung/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/yeondeung/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/yeondeung/grand-altar-p7.webp'::text))
where code = 'yeondeung'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-yeondeung';

update public.shrine_theme_packs
set stage = jsonb_set(jsonb_set(jsonb_set(jsonb_set(stage,
    '{zones,0,wallpaperUrl}', to_jsonb('/shrine/stage/yonggung/room-wall-mural-p7-v3.webp'::text)),
    '{zones,0,flooringUrl}', to_jsonb('/shrine/stage/yonggung/room-floor-mural-p7-v3.webp'::text)),
    '{zones,0,floorShadeUrl}', to_jsonb('/shrine/stage/yonggung/room-floor-shade-p7-v3.webp'::text)),
    '{zones,0,structures,0,assetUrl}', to_jsonb('/shrine/stage/yonggung/grand-altar-p7.webp'::text))
where code = 'yonggung'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1
  and stage #>> '{zones,0,structures,0,code}' = 'grand-altar-yonggung';
