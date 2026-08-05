-- 가족 자리(세간) 확장 — 시렁뿐이던 가구를 제상·소반·반닫이·문갑·보료로 늘린다.
--
-- 사용자 요구: "선반·가구·제단 등 인테리어 소품을 꾸밀 수 있게 + 가족을 한 명씩 배정".
-- 배정은 시렁(type='shelf')에만 잠겨 있었다 — 도메인 FAMILY_SEAT_TYPES(lib/domain/shrine/shelf.ts)
-- 로 일반화하면서, 상점 「시렁·세간」 갈래 전부(shelf·screen·cushion·statue·table·chest)가
-- 가족 한 사람의 자리가 된다. 축복 문법은 시렁과 동일: 지정한 가족의 정령 오행 신물을
-- 곁(SHELF_RADIUS)에 두면 깨어난다. 크기별 상한도 동일(소2·중3·대4 — SHELF_CAPACITY).
--
-- ⚠️ element 는 전부 null — 세간은 제물이 아니라 가구다. 오행을 주면 공명 계산에 끼어든다
--    (시렁과 같은 규율, 20260805_shrine_shelf.sql).

-- 카탈로그 type 에 'table'(상 — 제상·소반) · 'chest'(장·궤 — 반닫이·문갑) 추가
alter table public.shrine_item_catalog drop constraint if exists shrine_item_catalog_type_check;
alter table public.shrine_item_catalog add constraint shrine_item_catalog_type_check check (type in (
  'candle', 'talisman', 'flower', 'incense', 'spirit', 'statue', 'bell', 'chime',
  'lantern', 'offering', 'plant', 'vessel', 'cushion',
  'blade', 'mirror', 'fan', 'pole', 'drum', 'paper', 'cloth', 'screen',
  'shelf', 'guardian',
  'table', 'chest'
));

-- 가구 5종 — sort_order 90~94 (시렁 95 앞). 설명의 「N 점까지」는 도메인 SHELF_CAPACITY 와
-- 일치해야 한다(소2·중3·대4 — 테스트 대조).
insert into public.shrine_item_catalog
  (name, description, origin_note, type, element, energy_power, placement_layer, size_grade,
   rarity, price_bokchae, emoji, sprite_url, matters, sort_order, is_active)
values
('제상', '제물을 차려 올리는 붉은 칠 굿상. 가족 한 사람을 지정하고 그이의 정령 오행에 맞는 신물을 네 점까지 올립니다.',
 '진설(陳設) — 굿에 앞서 상을 차리는 일. 상차림이 곧 신과 조상을 대접하는 첫 인사였다',
 'table', null, 0, 'floor', 'lg', 'legendary', 5, '🛐', '/shrine/items/table-jesang.webp', '{}', 90, true),
('개다리소반', '다리가 개 뒷다리처럼 굽은 1인용 소반. 가족 한 사람을 지정하고 신물을 두 점까지 올립니다.',
 '개다리소반(狗脚盤) — 한 사람 몫 상을 따로 차리던 살림. 귀한 손님과 어른에게는 늘 독상을 올렸다',
 'table', null, 0, 'floor', 'sm', 'common', 2, '🍚', '/shrine/items/table-soban.webp', '{}', 91, true),
('반닫이', '앞널 반이 아래로 열리는 궤. 가족 한 사람을 지정하고 신물을 세 점까지 위에 올립니다.',
 '반닫이(半-) — 앞면 위쪽 반만 문으로 여는 궤. 옷가지·문서·제기를 갈무리하던 안방 세간의 기본',
 'chest', null, 0, 'floor', 'md', 'rare', 3, '🧰', '/shrine/items/chest-bandaji.webp', '{}', 92, true),
('문갑', '문서와 귀한 것을 갈무리하는 낮은 장. 가족 한 사람을 지정하고 신물을 두 점까지 올립니다.',
 '문갑(文匣) — 사랑방·안방 벽 아래 낮게 두던 문서장. 창 아래 두어도 빛을 막지 않는 높이로 짰다',
 'chest', null, 0, 'floor', 'sm', 'rare', 3, '🗃️', '/shrine/items/chest-mungap.webp', '{}', 93, true),
('보료', '아랫목 최상석에 깔던 두툼한 요. 가족 한 사람을 지정하고 신물을 세 점까지 곁에 둡니다.',
 '보료 — 솜을 두툼히 두어 짠 깔개. 안방 아랫목 보료는 집안 어른의 자리였다',
 'cushion', null, 0, 'floor', 'md', 'rare', 3, '🛋️', '/shrine/items/cushion-boryo.webp', '{}', 94, true)
on conflict (name) do update set
  description = excluded.description, origin_note = excluded.origin_note, type = excluded.type,
  element = excluded.element, energy_power = excluded.energy_power,
  placement_layer = excluded.placement_layer, size_grade = excluded.size_grade,
  rarity = excluded.rarity, price_bokchae = excluded.price_bokchae, emoji = excluded.emoji,
  sprite_url = excluded.sprite_url, matters = excluded.matters, sort_order = excluded.sort_order,
  is_active = excluded.is_active;
