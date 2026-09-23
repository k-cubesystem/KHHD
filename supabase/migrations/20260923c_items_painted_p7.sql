-- 신물 ⑦ 「캐릭터 화풍 시네마틱」 — 신물 스프라이트를 ⑦ 붓으로(2026-09-23, 대표 «풀로 진행»)
--
-- 방(벽·바닥·틀)을 신위와 같은 붓으로 다시 그린 뒤, 신물만 옛 수채 + 종이 얼룩 받침이라 방 위에서 스티커처럼 떴다.
-- scripts/shrine-assets/stage-painted.mjs prop 이 같은 물건을 ⑦ 붓으로 다시 그리고(받침 제거), 원본 실루엣 안에
-- 윗변·가로 중심을 맞춰 가장 크게 들어가는 배율로 앉힌다 — 캔버스 치수·물건 자리가 같아 배치 좌표·크기 규격이 그대로다.
--
-- 바꾸는 것: shrine_item_catalog 의 sprite_url(과 그 값을 그대로 쓰던 image_url) → 같은 이름 -p7.webp,
--           기본 촛불·향로의 무대 소품 asset_url(stage/banga/prop-*.webp) → -p7.webp.
-- 그대로인 것: 표시 크기 규칙 — asset_url 이 비면 sprite_url 로 폴백하므로(app/actions/shrine/scene.ts) 레거시·v2 판정이
--           바뀌지 않는다 · 배치(shrine_placements)·보유(shrine_items)는 catalog id 로 묶여 무손이다.
-- 수호신은 바꾸지 않는다 — 신위와 같은 수채 치비라 이미 ⑦ 과 한 붓이다(숯불 스프라이트 결함만 파일 제자리 수복).
--
-- ⚠️ 코드(자산) 배포가 먼저다 — -p7 파일이 나가기 전에 적용하면 신물이 사라진다.
-- 재실행 안전: 적용 뒤에는 sprite_url 이 -p7 이라 목록에 안 걸린다.
--
-- 되돌리기:
--   update public.shrine_item_catalog
--   set sprite_url = replace(sprite_url, '-p7.webp', '.webp'),
--       image_url = case when image_url = sprite_url then replace(image_url, '-p7.webp', '.webp') else image_url end
--   where sprite_url like '/shrine/items/%-p7.webp';
--   update public.shrine_item_catalog
--   set asset_url = replace(asset_url, '-p7.webp', '.webp')
--   where asset_url in ('/shrine/stage/banga/prop-candle-p7.webp', '/shrine/stage/banga/prop-incense-p7.webp');

update public.shrine_item_catalog
set sprite_url = replace(sprite_url, '.webp', '-p7.webp'),
    image_url = case when image_url = sprite_url then replace(image_url, '.webp', '-p7.webp') else image_url end
where sprite_url in (
    '/shrine/items/bamboo-green.webp',
    '/shrine/items/bell-brass.webp',
    '/shrine/items/bell-yoryeong.webp',
    '/shrine/items/blade-samjichang.webp',
    '/shrine/items/blade-sinkal.webp',
    '/shrine/items/bowl-jeonghwasu.webp',
    '/shrine/items/brazier-hwaro.webp',
    '/shrine/items/candle-basic.webp',
    '/shrine/items/candle-pair.webp',
    '/shrine/items/chest-bandaji.webp',
    '/shrine/items/chest-mungap.webp',
    '/shrine/items/chime-silver.webp',
    '/shrine/items/cord-baekil.webp',
    '/shrine/items/cushion-boryo.webp',
    '/shrine/items/cushion-lotus.webp',
    '/shrine/items/cymbal-jegeum.webp',
    '/shrine/items/fan-museon.webp',
    '/shrine/items/flower-offering.webp',
    '/shrine/items/gong-jing.webp',
    '/shrine/items/gong-kkwaenggwari.webp',
    '/shrine/items/incense-burner.webp',
    '/shrine/items/jar-samsin.webp',
    '/shrine/items/jar-seongju.webp',
    '/shrine/items/jar-water.webp',
    '/shrine/items/jar-yongwang.webp',
    '/shrine/items/lantern-gold.webp',
    '/shrine/items/lantern-indeung.webp',
    '/shrine/items/lantern-red.webp',
    '/shrine/items/liquor-clear.webp',
    '/shrine/items/liquor-jora.webp',
    '/shrine/items/mirror-myeongdu.webp',
    '/shrine/items/offering-baekseolgi.webp',
    '/shrine/items/offering-bugeo.webp',
    '/shrine/items/offering-jujube.webp',
    '/shrine/items/offering-miyeok.webp',
    '/shrine/items/offering-patsirutteok.webp',
    '/shrine/items/offering-redbean.webp',
    '/shrine/items/offering-rice.webp',
    '/shrine/items/offering-samsaek.webp',
    '/shrine/items/offering-sogeum.webp',
    '/shrine/items/paper-jijeon.webp',
    '/shrine/items/paper-neokjeon.webp',
    '/shrine/items/plant-solgaji.webp',
    '/shrine/items/pole-sindae.webp',
    '/shrine/items/screen-byeongpung.webp',
    '/shrine/items/shelf-sireong.webp',
    '/shrine/items/table-jesang.webp',
    '/shrine/items/table-soban.webp',
    '/shrine/items/talisman-bok.webp',
    '/shrine/items/thread-red.webp',
    '/shrine/items/vessel-siru.webp'
);

update public.shrine_item_catalog
set asset_url = replace(asset_url, '.webp', '-p7.webp')
where asset_url in ('/shrine/stage/banga/prop-candle.webp', '/shrine/stage/banga/prop-incense.webp');
