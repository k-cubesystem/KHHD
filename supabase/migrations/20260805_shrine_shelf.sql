-- 시렁(선반) — 가족 한 사람에게 바치는 자리 + 이모지 정정.
--
-- 가족이 사랑방 바닥에 앉아만 있던 것에서, 각자 **자기 자리(시렁)** 가 생긴다:
-- 시렁 하나에 가족 한 명을 지정하고, 그 사람의 수호 정령 오행에 맞는 신물을 얹으면 깨어난다.
--
-- ⚠️ 얹힘은 부모-자식 표가 아니라 **거리 판정**이다(lib/domain/shrine/shelf.ts SHELF_RADIUS).
--    배치 자유도 v2 의 자유 배치를 그대로 쓰므로 스키마는 지정 한 칸이면 된다.
-- ⚠️ on delete set null — 가족을 지우면 시렁은 빈 시렁으로 남는다(배치까지 지우지 않는다).

alter table public.shrine_placements
  add column if not exists family_member_id uuid references public.family_members(id) on delete set null;

-- 카탈로그 type 에 'shelf' 추가
alter table public.shrine_item_catalog drop constraint if exists shrine_item_catalog_type_check;
alter table public.shrine_item_catalog add constraint shrine_item_catalog_type_check check (type in (
  'candle', 'talisman', 'flower', 'incense', 'spirit', 'statue', 'bell', 'chime',
  'lantern', 'offering', 'plant', 'vessel', 'cushion',
  'blade', 'mirror', 'fan', 'pole', 'drum', 'paper', 'cloth', 'screen',
  'shelf'
));

-- 시렁 3종 — 널 길이가 다르다(얹을 수 있는 수: 소2 · 중3 · 대4, 도메인 SHELF_CAPACITY 와 일치).
-- element null: 시렁은 제물이 아니라 가구다 — 오행을 주면 공명 계산에 끼어든다.
insert into public.shrine_item_catalog
  (name, description, origin_note, type, element, energy_power, placement_layer, size_grade,
   rarity, price_bokchae, emoji, sprite_url, matters, sort_order, is_active)
values
('소나무 시렁', '벽에 매는 짧은 널. 가족 한 사람을 지정하고 그이의 정령 오행에 맞는 신물을 두 점까지 얹습니다.',
 '시렁 — 벽에 매어 그릇·기물을 얹는 전통 선반. 방마다 시렁을 매고 살림을 얹었다',
 'shelf', null, 0, 'wall', 'sm', 'common', 2, '🪵', '/shrine/items/shelf-sireong.webp', '{}', 95, true),
('오동나무 시렁', '가운데 길이의 널. 가족 한 사람을 지정하고 신물을 세 점까지 얹습니다.',
 '오동나무는 가볍고 뒤틀리지 않아 가구목의 으뜸으로 쳤다',
 'shelf', null, 0, 'wall', 'md', 'rare', 3, '🪵', '/shrine/items/shelf-sireong.webp', '{}', 96, true),
('느티나무 시렁', '긴 널. 가족 한 사람을 지정하고 신물을 네 점까지 얹습니다.',
 '느티나무는 단단하고 결이 고와 마루·기둥·가구에 두루 쓰인 나무다',
 'shelf', null, 0, 'wall', 'lg', 'legendary', 5, '🪵', '/shrine/items/shelf-sireong.webp', '{}', 97, true)
on conflict (name) do update set
  description = excluded.description, origin_note = excluded.origin_note, type = excluded.type,
  element = excluded.element, energy_power = excluded.energy_power,
  placement_layer = excluded.placement_layer, size_grade = excluded.size_grade,
  rarity = excluded.rarity, price_bokchae = excluded.price_bokchae, emoji = excluded.emoji,
  sprite_url = excluded.sprite_url, matters = excluded.matters, sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- 이모지 정정 — 이름과 그림이 다르던 것들 (스프라이트가 없을 때의 폴백이라도 바로 보이게)
update public.shrine_item_catalog set emoji = '🪘' where name = '꽹과리';  -- 🔨(망치) → 손 타악기
update public.shrine_item_catalog set emoji = '🍯' where name = '삼신단지'; -- ⚱️(유골함) → 뚜껑 있는 단지
update public.shrine_item_catalog set emoji = '🌿' where name = '미역';    -- 🌊(파도) → 마른 나물
update public.shrine_item_catalog set emoji = '🍒' where name = '대추 세 알'; -- 🫘(콩) → 붉은 열매
update public.shrine_item_catalog set emoji = '🫘' where name = '팥 한 되';  -- 🔴(추상 원) → 콩
update public.shrine_item_catalog set emoji = '♨️' where name = '화로';    -- 🔥(향로와 중복) → 온기

-- ── 확장 32종 스프라이트 연결 (2026-08-05 생성·육안 검수 완료) ──────────────
-- 「이름과 그림이 다르다」의 근본 해결 — 이모지 폴백 대신 설빛온기 화풍 실그림.
update public.shrine_item_catalog set sprite_url = m.url
from (values
  ('신칼',        '/shrine/items/blade-sinkal.webp'),
  ('삼지창',      '/shrine/items/blade-samjichang.webp'),
  ('명두',        '/shrine/items/mirror-myeongdu.webp'),
  ('징',          '/shrine/items/gong-jing.webp'),
  ('꽹과리',      '/shrine/items/gong-kkwaenggwari.webp'),
  ('제금',        '/shrine/items/cymbal-jegeum.webp'),
  ('요령',        '/shrine/items/bell-yoryeong.webp'),
  ('촛대 한 쌍',  '/shrine/items/candle-pair.webp'),
  ('화로',        '/shrine/items/brazier-hwaro.webp'),
  ('대추 세 알',  '/shrine/items/offering-jujube.webp'),
  ('팥 한 되',    '/shrine/items/offering-redbean.webp'),
  ('홍실 타래',   '/shrine/items/thread-red.webp'),
  ('인등',        '/shrine/items/lantern-indeung.webp'),
  ('신대',        '/shrine/items/pole-sindae.webp'),
  ('무선',        '/shrine/items/fan-museon.webp'),
  ('지전',        '/shrine/items/paper-jijeon.webp'),
  ('넋전',        '/shrine/items/paper-neokjeon.webp'),
  ('솔가지',      '/shrine/items/plant-solgaji.webp'),
  ('삼색나물',    '/shrine/items/offering-samsaek.webp'),
  ('병풍',        '/shrine/items/screen-byeongpung.webp'),
  ('백설기',      '/shrine/items/offering-baekseolgi.webp'),
  ('팥시루떡',    '/shrine/items/offering-patsirutteok.webp'),
  ('시루',        '/shrine/items/vessel-siru.webp'),
  ('성주단지',    '/shrine/items/jar-seongju.webp'),
  ('삼신단지',    '/shrine/items/jar-samsin.webp'),
  ('쌀 한 되',    '/shrine/items/offering-rice.webp'),
  ('정화수',      '/shrine/items/bowl-jeonghwasu.webp'),
  ('북어',        '/shrine/items/offering-bugeo.webp'),
  ('미역',        '/shrine/items/offering-miyeok.webp'),
  ('소금',        '/shrine/items/offering-sogeum.webp'),
  ('용왕단지',    '/shrine/items/jar-yongwang.webp'),
  ('조라술',      '/shrine/items/liquor-jora.webp')
) as m(name, url)
where shrine_item_catalog.name = m.name;
