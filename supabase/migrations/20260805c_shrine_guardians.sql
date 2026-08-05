-- 신수(神獸) 32종 — 신이 자리를 비울 때 신당을 지키는 영물.
--
-- 종전에는 좌정 主神 초상 오브가 방을 거닐었다. 신은 제단에 좌정해 있는데 같은 신이 바닥을
-- 뛰어다니는 것은 세계가 어긋난다 — 거니는 일은 신수의 몫이 된다.
--
-- ⚠️ 신수는 카탈로그로 **판다**(구매 경로 재사용). 그러나 **배치 아이템이 아니다** —
--    트레이·배치 저장 양쪽에서 type='guardian' 을 거른다(코드+테스트).
-- ⚠️ 착좌(shrines.guardians)는 admin 경유만이다. shrines 는 컬럼 화이트리스트(감사 A3)라
--    사용자 클라이언트 update 가 원래 막혀 있고, **grant 를 추가하지 않는 것이 곧 방어다**
--    (열면 구매 검증을 우회한 무료 착좌가 된다 — 테마 active_pack_id 와 같은 규율).

alter table public.shrine_item_catalog drop constraint if exists shrine_item_catalog_type_check;
alter table public.shrine_item_catalog add constraint shrine_item_catalog_type_check check (type in (
  'candle', 'talisman', 'flower', 'incense', 'spirit', 'statue', 'bell', 'chime',
  'lantern', 'offering', 'plant', 'vessel', 'cushion',
  'blade', 'mirror', 'fan', 'pole', 'drum', 'paper', 'cloth', 'screen',
  'shelf', 'guardian'
));

-- 한 신당에 둘까지 — 셋부터는 방이 마당이 된다 (도메인 MAX_GUARDIANS 와 같은 값)
alter table public.shrines add column if not exists guardians text[] not null default '{}';
alter table public.shrines drop constraint if exists shrines_guardians_max2;
alter table public.shrines add constraint shrines_guardians_max2 check (cardinality(guardians) <= 2);

-- 32신수 카탈로그 — 이름·오행·값·전거·역할은 lib/domain/shrine/guardians.ts 와 **한 벌**이다
-- (대조는 lib/domain/shrine/__tests__/guardians.test.ts). description=역할, origin_note=전승.
insert into public.shrine_item_catalog
  (name, description, origin_note, type, element, energy_power, placement_layer, size_grade,
   rarity, price_bokchae, emoji, sprite_url, matters, sort_order, is_active)
values
('청룡', '동쪽에서 드는 기운을 다스리고, 터의 큰 흐름을 지킵니다.', '사신(四神)의 동방 수호신 — 고구려 고분 벽화 동벽에 그려졌다', 'guardian', 'wood', 0, 'floor', 'md', 'legendary', 5, '🐉', '/shrine/guardians/cheongryong.webp', '{teo,sinsu}', 201, true),
('백호', '삿된 것이 문턱을 넘지 못하게 서쪽을 막아섭니다.', '사신의 서방 수호신 — 산군(山君)이라 불리며 산신을 곁에서 모신다', 'guardian', 'metal', 0, 'floor', 'md', 'legendary', 5, '🐯', '/shrine/guardians/baekho.webp', '{gwanjae}', 202, true),
('주작', '남쪽의 볕을 부르고, 식은 인연에 온기를 되돌립니다.', '사신의 남방 수호신 — 붉은 날개의 신조(神鳥)', 'guardian', 'fire', 0, 'floor', 'md', 'legendary', 5, '🐦‍🔥', '/shrine/guardians/jujak.webp', '{honsa,sinsu}', 203, true),
('현무', '북쪽의 찬 기운을 눌러 앉히고, 오래 가는 것을 지킵니다.', '사신의 북방 수호신 — 거북과 뱀이 얽힌 모습', 'guardian', 'water', 0, 'floor', 'md', 'legendary', 5, '🐢', '/shrine/guardians/hyeonmu.webp', '{mom,teo}', 204, true),
('해태', '옳고 그름이 얽힌 일을 가려 주고, 불같은 화를 삭입니다.', '시비를 가리는 법수(法獸) — 경복궁 앞에 세워 화기를 눌렀다', 'guardian', 'earth', 0, 'floor', 'md', 'rare', 3, '🦁', '/shrine/guardians/haetae.webp', '{gwanjae}', 205, true),
('기린', '어질고 바른 기운을 방에 들이고, 자라나는 것을 돌봅니다.', '어진 임금의 치세에만 나타난다는 인수(仁獸)', 'guardian', 'wood', 0, 'floor', 'md', 'rare', 3, '🦌', '/shrine/guardians/girin.webp', '{jason,sinsu}', 206, true),
('삼족오', '해의 정기를 물어 나르며, 벌이의 길을 밝힙니다.', '해 속에 산다는 세 발 까마귀 — 고구려의 상징', 'guardian', 'fire', 0, 'floor', 'md', 'rare', 3, '🐦‍⬛', '/shrine/guardians/samjogo.webp', '{jaesu}', 207, true),
('봉황', '다섯 덕을 갖춘 상서로움으로 집안의 격을 세웁니다.', '오동나무에만 깃들고 대나무 열매만 먹는다는 서조(瑞鳥)', 'guardian', 'earth', 0, 'floor', 'md', 'rare', 3, '🦚', '/shrine/guardians/bonghwang.webp', '{sinsu,honsa}', 208, true),
('이무기', '오래 견디는 법을 알기에, 더딘 일의 끝을 지켜봅니다.', '천 년을 물에서 견디면 용이 된다는 큰 뱀', 'guardian', 'water', 0, 'floor', 'md', 'common', 2, '🐍', '/shrine/guardians/imugi.webp', '{jaesu,sinsu}', 209, true),
('천마', '길 떠나는 일과 돌아오는 일, 오가는 걸음을 지킵니다.', '하늘을 달리는 백마 — 천마총 장니에 그려졌다', 'guardian', 'metal', 0, 'floor', 'md', 'rare', 3, '🐎', '/shrine/guardians/cheonma.webp', '{teo,sinsu}', 210, true),
('현학', '느리고 길게 숨쉬는 법으로 몸의 기운을 고릅니다.', '천 년을 산 학은 검게 변한다 했다 — 장수의 영물', 'guardian', 'wood', 0, 'floor', 'md', 'common', 2, '🦢', '/shrine/guardians/hyeonhak.webp', '{mom}', 211, true),
('옥토끼', '밤마다 약을 찧어 몸이 축나지 않게 돌봅니다.', '달에서 불사약을 찧는다는 토끼', 'guardian', 'earth', 0, 'floor', 'md', 'common', 2, '🐇', '/shrine/guardians/okto.webp', '{mom,jason}', 212, true),
('강림차사', '어지러운 일의 매듭을 짓고, 끊을 것을 끊어 줍니다.', '차사본풀이의 우두머리 차사 — 염라대왕도 그 강단을 아꼈다', 'guardian', 'metal', 0, 'floor', 'md', 'legendary', 4, '⚖️', '/shrine/guardians/gangnim.webp', '{gwanjae}', 213, true),
('일직차사', '해가 떠 있는 동안의 신당을 지킵니다.', '낮의 일을 맡아 보는 차사', 'guardian', 'fire', 0, 'floor', 'md', 'common', 2, '📜', '/shrine/guardians/iljik.webp', '{sinsu}', 214, true),
('월직차사', '달이 떠 있는 동안의 신당을 지킵니다.', '밤의 일을 맡아 보는 차사', 'guardian', 'water', 0, 'floor', 'md', 'common', 2, '🏮', '/shrine/guardians/woljik.webp', '{sinsu}', 215, true),
('저승사자', '무거운 것을 데려가는 이가 곁에 있으면, 잡스러운 것은 얼씬도 못 합니다.', '갓에 검은 도포 — 문 앞의 사잣밥은 이들을 대접하는 상이다', 'guardian', 'water', 0, 'floor', 'md', 'rare', 3, '🎩', '/shrine/guardians/saja.webp', '{gwanjae,mom}', 216, true),
('씨름도깨비', '힘겨루기를 좋아해, 방에 드는 궂은 기운과 밤새 씨름합니다.', '밤길에 씨름을 걸어온다 — 왼다리를 걸면 넘어간다', 'guardian', 'earth', 0, 'floor', 'md', 'common', 2, '🤼', '/shrine/guardians/ssireum.webp', '{gwanjae}', 217, true),
('방망이도깨비', '방망이를 두드려 벌이의 길을 두들겨 엽니다.', '「금 나와라 뚝딱」 — 도깨비방망이의 임자', 'guardian', 'wood', 0, 'floor', 'md', 'rare', 3, '🏏', '/shrine/guardians/bangmangi.webp', '{jaesu}', 218, true),
('갓도깨비', '예를 갖춘 손님만 문을 넘게 가려 세웁니다.', '의관을 갖춰 입은 점잖은 도깨비 — 사람과 겨루기보다 어울리기를 즐긴다', 'guardian', 'metal', 0, 'floor', 'md', 'common', 2, '🎓', '/shrine/guardians/gat.webp', '{sinsu}', 219, true),
('독각귀', '한 다리로도 지치지 않고 밤새 방을 돕니다.', '외다리 도깨비 — 비 오는 밤 빗자루가 변해 된다 했다', 'guardian', 'wood', 0, 'floor', 'md', 'common', 2, '🦵', '/shrine/guardians/dokgak.webp', '{teo}', 220, true),
('먹보도깨비', '올린 공물을 맛보고, 그 답례로 살림을 지킵니다.', '메밀묵과 막걸리를 좋아한다 — 상을 차려 주면 은혜를 갚는다', 'guardian', 'earth', 0, 'floor', 'md', 'common', 2, '🍚', '/shrine/guardians/meokbo.webp', '{jaesu}', 221, true),
('김서방도깨비', '집안 사람의 이름을 다 외워, 낯선 것이 오면 먼저 압니다.', '사람을 「김서방」이라 부르며 따르는 붙임성 좋은 도깨비', 'guardian', 'earth', 0, 'floor', 'md', 'common', 2, '🤝', '/shrine/guardians/gimseobang.webp', '{teo}', 222, true),
('낮도깨비', '해가 떠 있어도 물러가지 않고 자리를 지킵니다.', '대낮에 나타나는 별난 도깨비 — 밤 도깨비보다 겁이 없다', 'guardian', 'fire', 0, 'floor', 'md', 'common', 2, '🌞', '/shrine/guardians/natdokkaebi.webp', '{sinsu}', 223, true),
('물도깨비', '물길의 재수를 몰아다 방에 부립니다.', '물가에 사는 도깨비 — 어부의 그물에 고기를 몰아 주기도 한다', 'guardian', 'water', 0, 'floor', 'md', 'common', 2, '🐟', '/shrine/guardians/muldokkaebi.webp', '{jaesu}', 224, true),
('청도깨비불', '푸른 불빛으로 방구석의 어둠을 살핍니다.', '비 오는 밤 물가를 떠도는 푸른 불 — 도깨비불의 본색이다', 'guardian', 'water', 0, 'floor', 'sm', 'common', 2, '🔵', '/shrine/guardians/cheongbul.webp', '{sinsu}', 225, true),
('홍도깨비불', '붉은 온기로 식은 자리를 데웁니다.', '산등성이를 넘어 다니는 붉은 불덩이', 'guardian', 'fire', 0, 'floor', 'sm', 'common', 2, '🔴', '/shrine/guardians/hongbul.webp', '{honsa}', 226, true),
('혼불', '흔들리는 마음의 심지를 곧게 세웁니다.', '사람의 넋이 담긴 푸른 불 — 최명희의 『혼불』로 남은 말', 'guardian', 'water', 0, 'floor', 'sm', 'rare', 3, '🕯️', '/shrine/guardians/honbul.webp', '{mom}', 227, true),
('달빛정령', '달빛처럼 은은하게, 잠든 신당을 비춥니다.', '보름달빛이 오래 고인 자리에 맺힌다는 정령', 'guardian', 'metal', 0, 'floor', 'sm', 'common', 2, '🌙', '/shrine/guardians/dalbit.webp', '{sinsu,mom}', 228, true),
('별똥정령', '빌어 둔 소원을 물고 하늘과 방 사이를 오갑니다.', '떨어지는 별똥을 보고 빌면 소원이 이뤄진다 했다', 'guardian', 'fire', 0, 'floor', 'sm', 'common', 2, '🌠', '/shrine/guardians/byeolbit.webp', '{sinsu}', 229, true),
('바람정령', '고인 공기를 흔들어 방의 기운을 돌립니다.', '영등할미가 부리는 바람 — 이월 영등바람에 실려 온다', 'guardian', 'wood', 0, 'floor', 'sm', 'common', 2, '🍃', '/shrine/guardians/barampung.webp', '{teo}', 230, true),
('안개정령', '안개로 방을 감싸 바깥의 눈을 가립니다.', '새벽 강안개가 걷히지 않고 남은 자락', 'guardian', 'water', 0, 'floor', 'sm', 'common', 2, '🌫️', '/shrine/guardians/angae.webp', '{teo}', 231, true),
('숯불정령', '꺼지지 않는 불씨로 집의 복을 붙듭니다.', '화로 깊이 밤새 살아남은 불씨 — 불씨를 꺼뜨리면 복이 나간다 했다', 'guardian', 'fire', 0, 'floor', 'sm', 'common', 2, '🔥', '/shrine/guardians/sutbul.webp', '{jaesu,mom}', 232, true)
on conflict (name) do update set
  description = excluded.description, origin_note = excluded.origin_note, type = excluded.type,
  element = excluded.element, energy_power = excluded.energy_power,
  placement_layer = excluded.placement_layer, size_grade = excluded.size_grade,
  rarity = excluded.rarity, price_bokchae = excluded.price_bokchae, emoji = excluded.emoji,
  sprite_url = excluded.sprite_url, matters = excluded.matters, sort_order = excluded.sort_order,
  is_active = excluded.is_active;
