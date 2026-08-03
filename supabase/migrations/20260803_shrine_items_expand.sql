-- 신물 확장 — 실제 신당·굿에 쓰이는 물건으로 32종 추가 (기존 14 → 46), 카테고리 13 → 21.
--
-- 조사 근거: 무구(巫具)는 크게 **타악기(장구·징·제금) · 도검류(신칼·작두) · 점구(엽전·산판) ·
-- 소도구(방울·지전·부채·오색기)** 로 나뉜다(한국민족문화대백과). 카테고리 축을 그 분류에 맞췄다.
--   · 신칼: 놋쇠 날 20~30cm 한 쌍에 한지 술 40cm. 축귀·무무(巫舞)·점구를 겸한다
--   · 삼지창: 나무 자루 80cm + 쇠 삼지 30cm. 신장(神將)의 무기
--   · 요령(巫鈴): 신화를 구송하거나 신께 아뢸 때 흔들어 소리를 낸다
--   · 무선(巫扇): 오른손에 부채, 왼손에 방울을 들고 여닫으며 춤춘다
--   · 신대: 잡은 사람의 손이 떨리는 것이 강신(降神)의 증표다
--   · 고사상: 팥시루떡 위에 정화수 사발, 그 위에 북어 — **북어는 반드시 홀수**로 쓴다
--   · 백설기: 흰떡은 깨끗하고 신성한 음식이라 산신제·용왕제에 올린다
--
-- ⚠️ 이것은 **게임 안의 설정**이다. 전승을 옮겨 적을 뿐 효험을 주장하지 않는다.
-- ⚠️ 오행 배속은 물건의 재질·빛깔·방위를 따랐다(쇠=金, 불·붉은빛=火, 흙·곡식=土,
--    나무·종이·풀=木, 물·검은빛=水). 배속이 갈리는 물건은 **재질을 우선**했다.

-- ── 스키마 ────────────────────────────────────────────────────────────────

-- 이름이 열쇠다(기원 보상이 name 으로 신물을 찾는다). 중복이 생기면 그 조회가 아무거나 집는다.
create unique index if not exists shrine_item_catalog_name_key on public.shrine_item_catalog (name);

-- 카테고리 확장 — 무구 분류를 축으로 8종 추가
alter table public.shrine_item_catalog drop constraint if exists shrine_item_catalog_type_check;
alter table public.shrine_item_catalog add constraint shrine_item_catalog_type_check check (type in (
  -- 기존
  'candle', 'talisman', 'flower', 'incense', 'spirit', 'statue', 'bell', 'chime',
  'lantern', 'offering', 'plant', 'vessel', 'cushion',
  -- 무구(巫具)
  'blade',   -- 도검류 — 신칼·삼지창
  'mirror',  -- 명경류 — 명두
  'fan',     -- 무선
  'pole',    -- 신대
  'drum',    -- 무악기 — 징·꽹과리·제금
  'paper',   -- 지물 — 지전·넋전
  'cloth',   -- 천·실
  'screen'   -- 병풍
));

-- 어느 기도(문복 갈래)에 좋은가. 값은 lib/domain/ritual/obangki.ts 의 ObangkiMatter 와 **같아야 한다**.
-- 빈 배열 = 갈래를 가리지 않는 물건(두루 쓴다).
alter table public.shrine_item_catalog
  add column if not exists matters text[] not null default '{}';
alter table public.shrine_item_catalog drop constraint if exists shrine_item_catalog_matters_check;
alter table public.shrine_item_catalog add constraint shrine_item_catalog_matters_check
  check (matters <@ array['sinsu','jaesu','gwanjae','honsa','teo','mom','jason']::text[]);

-- 실제로 어디에 쓰는 물건인가 — 한 줄. 설명(description)이 "효과"라면 이것은 "출처"다.
alter table public.shrine_item_catalog
  add column if not exists origin_note text;

-- ── 기존 14종 보강 ────────────────────────────────────────────────────────
update public.shrine_item_catalog set matters = m.matters, origin_note = m.note
from (values
  ('기본 촛불',    array['sinsu']::text[],                 '신당을 여는 첫 불. 촛대는 신단 좌우 한 쌍으로 세운다'),
  ('황금 등불',    array['jaesu','sinsu']::text[],         '재수굿에서 밝히는 등. 불빛이 밝을수록 벌이가 트인다고 보았다'),
  ('은풍경',       array['gwanjae']::text[],               '처마 끝 쇳소리가 잡기를 흩는다 — 쇠붙이 소리를 액막이로 쓰는 오랜 관행'),
  ('연화방석',     array['mom']::text[],                   '신 앞에 앉는 자리. 무릎을 상하지 않게 하는 실용에서 왔다'),
  ('공물 꽃',      array['honsa','sinsu']::text[],         '신께 올리는 생화. 굿상 좌우에 꽂는다'),
  ('향로',         array['sinsu','mom']::text[],           '향 연기가 신께 말을 올리는 길이다 — 모든 의례가 분향으로 연다'),
  ('초롱',         array['sinsu']::text[],                 '신당 처마에 매다는 붉은 등. 밤에도 신당의 자리를 알린다'),
  ('청주',         array['sinsu']::text[],                 '본향상에 술 석 잔을 올린다 — 굿상의 기본 삼헌(三獻)'),
  ('청죽',         array['teo','mom']::text[],             '사시사철 푸른 대. 신대를 깎는 나무이기도 하다'),
  ('물항아리',     array['teo','mom']::text[],             '정화수를 담아 두는 옹기. 물은 부정을 씻는 첫 수단이다'),
  ('놋방울',       array['sinsu','gwanjae']::text[],       '무령(巫鈴) — 신께 아뢸 때 흔들어 소리를 낸다'),
  ('복 부적',      array['jaesu','teo']::text[],           '황지에 주사로 쓴 부적. 문설주·벽에 붙여 복을 부른다'),
  ('백일 소원끈',  array['sinsu','mom']::text[],           '백일기도를 마친 이가 처마에 매다는 오색 끈'),
  ('기억의 함',    array[]::text[],                        '신당에 모셔 두는 함. 지난 문답을 담아 둔다')
) as m(name, matters, note)
where shrine_item_catalog.name = m.name;

-- ── 신규 32종 (金7 · 火6 · 木7 · 土6 · 水6) ────────────────────────────────
insert into public.shrine_item_catalog
  (name, description, origin_note, type, element, energy_power, placement_layer, size_grade,
   rarity, price_bokchae, emoji, matters, sort_order, is_active)
values
-- 金(금) — 쇠붙이. 끊고 물리치고 밝히는 기운
('신칼', '놋쇠 날 한 쌍에 한지 술을 단 무구. 금(金) 기운을 크게 채우고, 얽힌 시비를 끊어 냅니다.',
 '날 20~30cm 놋쇠 두 자루에 40cm 한지 술. 축귀·무무(巫舞)에 쓰고 던져서 점을 치기도 한다',
 'blade', 'metal', 28, 'altar', 'md', 'legendary', 5, '🗡️', array['gwanjae','mom'], 101, true),

('삼지창', '세 갈래 쇠창. 금(金) 기운을 크게 채우고, 터에 든 살(煞)을 눌러 앉힙니다.',
 '나무 자루 80cm에 쇠 삼지 30cm. 신장(神將)이 드는 무기라 굿청 앞에 세운다',
 'blade', 'metal', 28, 'floor', 'lg', 'legendary', 5, '🔱', array['gwanjae','teo'], 102, true),

('명두', '신의 얼굴을 비추는 놋쇠 거울. 금(金) 기운을 채우고, 한 해의 운수를 또렷하게 합니다.',
 '제주에서는 신칼·요령과 함께 「삼멩두」로 묶어 무당의 근본 무구로 친다',
 'mirror', 'metal', 18, 'altar', 'sm', 'rare', 3, '🪞', array['sinsu'], 103, true),

('징', '굿의 큰 숨을 놓는 놋쇠 악기. 금(金) 기운을 채우고, 신을 부르는 자리를 넓힙니다.',
 '장구·징·제금이 굿 반주의 기본 세 가지다',
 'drum', 'metal', 18, 'floor', 'md', 'rare', 2, '🥁', array['sinsu','jaesu'], 104, true),

('꽹과리', '날카롭게 깨지는 쇳소리. 금(金) 기운을 채우고, 달라붙은 구설을 흩습니다.',
 '굿의 장단을 모는 쇠. 소리가 날카로워 잡기를 쫓는 데 쓴다',
 'drum', 'metal', 10, 'wall', 'sm', 'common', 1, '🔨', array['gwanjae'], 105, true),

('제금', '놋쇠 두 짝을 마주쳐 울리는 바라. 금(金) 기운을 채우고, 몸에 든 탁한 기운을 떨칩니다.',
 '바라라고도 한다. 두 짝을 부딪쳐 맑은 소리를 낸다',
 'drum', 'metal', 10, 'altar', 'sm', 'common', 1, '🎶', array['mom'], 106, true),

('요령', '무당이 흔드는 손방울. 금(金) 기운을 채우고, 아뢰는 말이 신께 닿게 합니다.',
 '무령(巫鈴). 신화를 구송하거나 점친 것을 신께 아뢸 때 흔든다',
 'bell', 'metal', 18, 'altar', 'sm', 'rare', 2, '🛎️', array['sinsu'], 107, true),

-- 火(화) — 불과 붉은빛. 데우고 밝히고 물리치는 기운
('촛대 한 쌍', '신단 좌우에 세우는 놋 촛대. 화(火) 기운을 채우고, 신당의 자리를 바로 세웁니다.',
 '초는 반드시 한 쌍으로 세운다 — 좌우가 어긋나면 상이 어긋난 것으로 본다',
 'candle', 'fire', 10, 'altar', 'sm', 'common', 1, '🕯️', array['sinsu'], 108, true),

('화로', '숯불을 담아 신당을 데우는 그릇. 화(火) 기운을 채우고, 찬 기운에 상한 몸을 돌봅니다.',
 '겨울 굿청의 실용 기물이자, 불씨를 꺼뜨리지 않는다는 상징이다',
 'vessel', 'fire', 10, 'floor', 'md', 'common', 1, '🔥', array['mom'], 109, true),

('대추 세 알', '붉고 씨가 하나뿐인 열매. 화(火) 기운을 채우고, 자손과 인연의 자리를 돕습니다.',
 '씨가 하나라 자손을 뜻한다. 밤·대추는 굿상·제사상의 붙박이다',
 'offering', 'fire', 10, 'altar', 'sm', 'common', 0, '🫘', array['jason','honsa'], 110, true),

('팥 한 되', '붉은 곡식. 화(火) 기운을 채우고, 집으로 드는 잡기를 문턱에서 막습니다.',
 '동지 팥죽·팥시루떡처럼 붉은 것으로 액을 물리는 오랜 관행',
 'offering', 'fire', 10, 'altar', 'sm', 'common', 0, '🔴', array['teo','gwanjae'], 111, true),

('홍실 타래', '붉은 실 한 타래. 화(火) 기운을 채우고, 맺으려는 인연을 묶습니다.',
 '청실홍실 — 혼례와 인연을 다루는 자리에 쓰는 실',
 'cloth', 'fire', 10, 'hanging', 'sm', 'common', 1, '🧵', array['honsa'], 112, true),

('인등', '이름을 걸고 밝히는 등. 화(火) 기운을 채우고, 한 해의 길을 환하게 합니다.',
 '절·신당에 이름을 올리고 한 해 내내 켜 두는 등',
 'lantern', 'fire', 18, 'hanging', 'md', 'rare', 2, '🪔', array['sinsu'], 113, true),

-- 木(목) — 나무·종이·풀. 자라고 뻗고 전하는 기운
('신대', '신이 내리면 잡은 손이 떨리는 대. 목(木) 기운을 크게 채우고, 한 해의 운수를 묻는 자리를 엽니다.',
 '신대를 잡은 사람의 손과 팔이 떨리는 것이 강신(降神)의 중요한 증표다',
 'pole', 'wood', 28, 'floor', 'lg', 'legendary', 5, '🎋', array['sinsu'], 114, true),

('무선', '신의 얼굴이 그려진 부채. 목(木) 기운을 채우고, 부르는 복이 넓게 퍼지게 합니다.',
 '오른손에 부채, 왼손에 방울을 들고 여닫으며 춤춘다',
 'fan', 'wood', 18, 'altar', 'sm', 'rare', 3, '🪭', array['sinsu','jaesu'], 115, true),

('지전', '한지를 오려 만든 종이돈. 목(木) 기운을 채우고, 조상 가는 길의 노자가 됩니다.',
 '저승 노자로 올리는 종이돈. 굿청에 걸거나 태워 보낸다',
 'paper', 'wood', 10, 'hanging', 'md', 'common', 1, '🧧', array['jason','mom'], 116, true),

('넋전', '사람 모양으로 오린 한지. 목(木) 기운을 채우고, 흩어진 넋을 불러 앉힙니다.',
 '넋을 받아 앉히는 종이 인형. 넋굿에서 쓴다',
 'paper', 'wood', 18, 'wall', 'sm', 'rare', 2, '📃', array['mom'], 117, true),

('솔가지', '푸른 솔 한 묶음. 목(木) 기운을 채우고, 자리에 앉은 부정을 쓸어 냅니다.',
 '솔가지에 물을 적셔 뿌리는 것이 부정풀이의 기본 동작이다',
 'plant', 'wood', 10, 'floor', 'sm', 'common', 0, '🌲', array['teo','mom'], 118, true),

('삼색나물', '도라지·고사리·시금치 세 접시. 목(木) 기운을 채우고, 한 해의 흐름을 고르게 합니다.',
 '흰·검·푸른 세 빛을 갖춰 올린다 — 삼색을 맞추는 것이 상차림의 법이다',
 'offering', 'wood', 10, 'altar', 'sm', 'common', 0, '🥬', array['sinsu'], 119, true),

('병풍', '신단 뒤를 감싸는 여섯 폭. 목(木) 기운을 채우고, 신당 전체의 자리를 단정하게 합니다.',
 '굿청 뒤에 둘러 신의 자리와 사람의 자리를 가른다',
 'screen', 'wood', 18, 'wall', 'lg', 'rare', 3, '🖼️', array[]::text[], 120, true),

-- 土(토) — 흙과 곡식. 담고 앉히고 기르는 기운
('백설기', '켜 없이 찐 흰 시루떡. 토(土) 기운을 채우고, 한 해와 자리를 정갈하게 엽니다.',
 '흰떡은 깨끗하고 신성한 음식이라 산신제·용왕제에 올린다',
 'offering', 'earth', 10, 'altar', 'md', 'common', 0, '🍚', array['sinsu','teo'], 121, true),

('팥시루떡', '붉은 팥을 켜켜이 안친 시루떡. 토(土) 기운을 채우고, 집과 벌이의 바닥을 다집니다.',
 '고사의 떡. 팥시루떡 위에 정화수 사발을 얹고, 그 위에 북어를 올린다',
 'offering', 'earth', 10, 'altar', 'md', 'common', 1, '🍡', array['teo','jaesu'], 122, true),

('시루', '떡을 안치는 옹기. 토(土) 기운을 채우고, 터에 든 기운을 눌러 앉힙니다.',
 '터줏가리·성주고사에 시루째 올린다 — 시루 자체가 제기다',
 'vessel', 'earth', 10, 'floor', 'md', 'common', 1, '🍲', array['teo'], 123, true),

('성주단지', '집의 신 성주를 모시는 단지. 토(土) 기운을 채우고, 집과 벌이의 뿌리를 지킵니다.',
 '대청 기둥 위에 쌀을 담아 모신다. 집안의 으뜸 가신(家神)이다',
 'vessel', 'earth', 18, 'floor', 'md', 'rare', 2, '🏺', array['teo','jaesu'], 124, true),

('삼신단지', '삼신할미를 모시는 단지. 토(土) 기운을 채우고, 자손의 자리를 돌봅니다.',
 '안방 윗목에 쌀을 담아 모신다. 아이를 점지하고 기르는 신이다',
 'vessel', 'earth', 18, 'floor', 'md', 'rare', 2, '⚱️', array['jason'], 125, true),

('쌀 한 되', '흰 쌀 한 되. 토(土) 기운을 채우고, 벌이와 한 해의 운수를 봅니다.',
 '산미(散米) — 쌀을 뿌려 떨어진 낱을 세어 점을 친다',
 'offering', 'earth', 10, 'altar', 'sm', 'common', 0, '🌾', array['jaesu','sinsu'], 126, true),

-- 水(수) — 물과 검은빛. 씻고 가라앉히고 잇는 기운
('정화수', '새벽에 처음 길은 물 한 사발. 수(水) 기운을 채우고, 모든 기도의 첫 자리를 엽니다.',
 '가장 오래되고 가장 단출한 제물. 물 한 그릇으로 여는 기도가 정화수 기도다',
 'vessel', 'water', 10, 'altar', 'sm', 'common', 0, '💧', array['mom','sinsu'], 127, true),

('북어', '마른 명태 한 마리. 수(水) 기운을 채우고, 집과 몸에 올 액을 대신 집니다.',
 '고사상에서 정화수 위에 얹는다 — **반드시 홀수**로 쓴다',
 'offering', 'water', 10, 'altar', 'sm', 'common', 0, '🐟', array['teo','mom'], 128, true),

('미역', '물에서 나는 검은 나물. 수(水) 기운을 채우고, 산모와 자손의 자리를 돌봅니다.',
 '삼신상에 올리는 것. 아이를 낳은 자리의 음식이다',
 'offering', 'water', 10, 'altar', 'sm', 'common', 0, '🌊', array['jason'], 129, true),

('소금', '굵은 소금 한 줌. 수(水) 기운을 채우고, 문 앞에 뿌려 부정을 씻습니다.',
 '뿌려서 부정을 가시는 가장 흔한 수단. 문간·모퉁이에 놓는다',
 'offering', 'water', 10, 'altar', 'sm', 'common', 0, '🧂', array['teo','gwanjae'], 130, true),

('용왕단지', '물의 신을 모시는 단지. 수(水) 기운을 채우고, 물길과 바깥일의 벌이를 돕습니다.',
 '용왕제에 쓰는 단지. 뱃길과 물에 기대어 사는 이들의 신이다',
 'vessel', 'water', 18, 'floor', 'md', 'rare', 2, '🫙', array['jaesu'], 131, true),

('조라술', '굿에만 담그는 술. 수(水) 기운을 채우고, 신을 청하는 잔이 됩니다.',
 '굿을 앞두고 따로 담가 굿청에만 올리는 술',
 'offering', 'water', 10, 'altar', 'sm', 'common', 1, '🍶', array['sinsu'], 132, true)

on conflict (name) do update set
  description      = excluded.description,
  origin_note      = excluded.origin_note,
  type             = excluded.type,
  element          = excluded.element,
  energy_power     = excluded.energy_power,
  placement_layer  = excluded.placement_layer,
  size_grade       = excluded.size_grade,
  rarity           = excluded.rarity,
  price_bokchae    = excluded.price_bokchae,
  emoji            = excluded.emoji,
  matters          = excluded.matters,
  sort_order       = excluded.sort_order,
  is_active        = excluded.is_active;
