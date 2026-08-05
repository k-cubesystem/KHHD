-- 신당 테마 16종 — 스토리·기운·궁합 신위·사주·기도 로어 + 신규 8종.
--
-- 테마가 "예쁜 벽지"에서 **자리(터)의 이야기**가 된다. 각 테마에:
--   · story        이 자리가 어떤 곳인가 (두 문장)
--   · saju_note    어떤 사주에 맞는 자리인가 (한 문장)
--   · deity_codes  이 자리와 궁합이 맞는 신위 (shrine_deities.code, 최대 2)
--   · matters      이 자리에서 올리기 좋은 기도 — **오방기 문복 갈래와 같은 말**을 쓴다
--                  (신물 matters 와 동일 규율: 두 화면이 한 세계로 읽히게)
-- 기운(오행)은 기존 element_affinity 그대로다.
--
-- 오행 분포(16): 木2 火3 土3 金3 水3 무속성2 — 어느 기운이 마른 사주든 갈 자리가 있다.

alter table public.shrine_theme_packs add column if not exists story text;
alter table public.shrine_theme_packs add column if not exists saju_note text;
alter table public.shrine_theme_packs add column if not exists deity_codes text[] not null default '{}';
alter table public.shrine_theme_packs add column if not exists matters text[] not null default '{}';

alter table public.shrine_theme_packs drop constraint if exists shrine_theme_packs_matters_check;
alter table public.shrine_theme_packs add constraint shrine_theme_packs_matters_check
  check (matters <@ array['sinsu','jaesu','gwanjae','honsa','teo','mom','jason']::text[]);

-- ── 기존 8종 로어 소급 ────────────────────────────────────────────────────
update public.shrine_theme_packs set (story, saju_note, deity_codes, matters) = (m.story, m.saju, m.deities, m.matters)
from (values
  ('choga',
   '볏짚 내음 나는 흙벽 한 칸. 화려할 것 없어도, 모든 신당은 처음 이 자리에서 선다.',
   '가리는 명식이 없다 — 어떤 사주에나 무던히 맞는 바탕자리다.',
   array['jowang','teoju']::text[], array['sinsu']::text[]),
  ('banga',
   '대들보 검은 조선 반가의 안채. 민화 병풍 앞에서 가문의 격이 소리 없이 선다.',
   '목(木)이 마른 명식 — 뻗어 나갈 기둥이 필요한 사주에 맞다.',
   array['seongju','daegam']::text[], array['teo','jaesu']::text[]),
  ('yonggung',
   '진주빛이 흐르는 물속 궁궐. 산호 사이로 용왕의 숨이 물결이 되어 지나간다.',
   '수(水)가 마른 명식 — 말라붙은 흐름에 물길을 내야 하는 사주에 맞다.',
   array['yongwang','bari']::text[], array['jaesu','mom']::text[]),
  ('dokkaebi',
   '보랏빛 어둠에 도깨비불이 초록으로 떠도는 자리. 짓궂지만, 제 사람에게는 재물을 몰아다 준다.',
   '화(火)가 옅어 판을 뒤집을 불씨가 필요한 사주에 맞다.',
   array['dokkaebi']::text[], array['jaesu','gwanjae']::text[]),
  ('seolbit',
   '눈빛이 스며드는 새벽 서고. 서리 낀 창살 아래 한지 두루마리가 고요히 쌓여 있다.',
   '금(金)이 옅은 명식 — 맺고 끊음이 무른 사주를 벼려 준다.',
   array['gwanseong','dongja']::text[], array['sinsu','gwanjae']::text[]),
  ('daljip',
   '보름달이 황토 담을 데우는 마당. 달집 타는 냄새에 한 해의 액이 실려 간다.',
   '토(土)가 옅어 자리를 못 잡는 사주 — 뿌리 내릴 흙을 준다.',
   array['samsin','teoju']::text[], array['teo','jason']::text[]),
  ('hongsal',
   '홍살문 붉은 살 너머의 안뜰. 삿된 것은 문턱을 넘지 못한다.',
   '관재·구설이 잦은 명식 — 벽사(辟邪)의 위엄이 필요한 사주에 맞다.',
   array['choiyoung','gwanseong']::text[], array['gwanjae']::text[]),
  ('byeolbat',
   '별지도가 쏟아지는 천문각 누각. 칠성이 명(命)의 실을 여기서 잣는다.',
   '명의 큰 흐름을 보려는 이 — 수명과 자손을 비는 사주에 맞다.',
   array['chilseong','okhwang']::text[], array['sinsu','jason']::text[])
) as m(code, story, saju, deities, matters)
where shrine_theme_packs.code = m.code;

-- ── 신규 8종 ──────────────────────────────────────────────────────────────
insert into public.shrine_theme_packs
  (code, name, element_affinity, price_bok, price_krw, price_bokchae, sort_order, is_active,
   assets, story, saju_note, deity_codes, matters)
values
('dangsan', '당산나무 그늘', 'wood', 0, 0, 1, 11, true,
 '{"wall":"linear-gradient(180deg,#1c2416,#12170d)","floor":"linear-gradient(180deg,#1a2012,#0d1108)","glow":"rgba(127,176,105,0.17)","accent":"#7fb069","particle":"#a8cf94"}'::jsonb,
 '금줄 두른 천년 신목의 그늘. 마을의 기도가 나이테마다 감겨 있다.',
 '목(木)이 말라 시작이 번번이 꺾이는 사주 — 곁에 큰 나무를 세워 준다.',
 array['sansin','seongju']::text[], array['teo','jason']::text[]),
('yeondeung', '연등 골짜기', 'fire', 0, 0, 1, 12, true,
 '{"wall":"linear-gradient(180deg,#2a1a14,#170e0b)","floor":"linear-gradient(180deg,#241410,#110a07)","glow":"rgba(224,138,78,0.18)","accent":"#e08a4e","particle":"#f2b98a"}'::jsonb,
 '골짜기 물길을 따라 연등 수백이 떠 있는 저녁. 등 하나마다 이름 하나, 소원 하나다.',
 '아궁이가 식은 냉한 명식 — 화(火)의 온기로 인연과 축원을 데운다.',
 array['jowang','dongja']::text[], array['sinsu','honsa']::text[]),
('seonang', '서낭 고갯길', 'earth', 0, 0, 1, 13, true,
 '{"wall":"linear-gradient(180deg,#241e14,#15110b)","floor":"linear-gradient(180deg,#1f1a10,#100d07)","glow":"rgba(184,155,106,0.17)","accent":"#b89b6a","particle":"#d4bc90"}'::jsonb,
 '고갯마루 돌무더기에 지나는 이마다 돌 하나를 얹는다. 오색 천이 낡을수록 영험은 깊어진다.',
 '토(土)가 옅어 오가는 길이 불안한 사주 — 길 위의 자리를 지켜 준다.',
 array['teoju','eopsin']::text[], array['teo','gwanjae']::text[]),
('jangdok', '장독대 새벽', 'earth', 0, 0, 1, 14, true,
 '{"wall":"linear-gradient(180deg,#262017,#16120c)","floor":"linear-gradient(180deg,#211b12,#110e08)","glow":"rgba(202,168,124,0.17)","accent":"#caa87c","particle":"#e2c9a2"}'::jsonb,
 '첫 빛이 닿는 장독대, 제일 큰 독 위에 정화수 한 사발. 어머니의 비손이 대를 이어 온 자리다.',
 '살림이 붕 뜬 명식 — 토(土)의 참을성으로 자손과 몸을 돌본다.',
 array['samsin','jowang']::text[], array['jason','mom']::text[]),
('daejanggan', '무쇠 대장간', 'metal', 0, 0, 1, 15, true,
 '{"wall":"linear-gradient(180deg,#1a1e24,#0f1116)","floor":"linear-gradient(180deg,#171a20,#0c0e12)","glow":"rgba(159,179,200,0.16)","accent":"#9fb3c8","particle":"#c2d1e0"}'::jsonb,
 '모루 위에서 신칼이 벼려지는 곳. 무딘 것은 여기서 날이 되고, 얽힌 것은 여기서 끊긴다.',
 '금(金)이 모자라 끊어야 할 것을 못 끊는 사주 — 결단의 날을 세워 준다.',
 array['choiyoung','baekma']::text[], array['gwanjae','jaesu']::text[]),
('jonggak', '새벽 종각', 'metal', 0, 0, 1, 16, true,
 '{"wall":"linear-gradient(180deg,#1e2228,#121519)","floor":"linear-gradient(180deg,#1a1d22,#0e1013)","glow":"rgba(207,216,227,0.15)","accent":"#cfd8e3","particle":"#e4ebf2"}'::jsonb,
 '첫 쇠북 소리가 어둠을 가르는 종각. 서른세 번의 울림이 하루의 맺고 끊음을 연다.',
 '결심이 서지 않는 명식 — 금(金)의 맑은 소리로 몸과 마음을 깨운다.',
 array['okhwang','gwanseong']::text[], array['sinsu','mom']::text[]),
('saemgut', '옹달샘 굿터', 'water', 0, 0, 1, 17, true,
 '{"wall":"linear-gradient(180deg,#14211f,#0c1413)","floor":"linear-gradient(180deg,#111d1b,#0a100f)","glow":"rgba(111,195,201,0.17)","accent":"#6fc3c9","particle":"#9adde2"}'::jsonb,
 '이끼 낀 돌이 두른 숲속 옹달샘. 마르지 않는 물에 해마다 용왕제가 오른다.',
 '수(水)가 말라붙은 명식 — 샘의 생기로 몸과 자손을 적신다.',
 array['yongwang','samsin']::text[], array['mom','jason']::text[]),
('naru', '안개 나루터', 'water', 0, 0, 1, 18, true,
 '{"wall":"linear-gradient(180deg,#1a1f26,#0f1216)","floor":"linear-gradient(180deg,#161b21,#0c0f13)","glow":"rgba(143,168,200,0.16)","accent":"#8fa8c8","particle":"#b6c8e0"}'::jsonb,
 '새벽 강안개 속의 나루. 바리공주가 떠나는 배를 여기서 배웅했다 전한다.',
 '흐름이 막힌 명식 — 수(水)의 길을 열어 떠남과 돌아옴을 지킨다.',
 array['bari','baekma']::text[], array['mom','sinsu']::text[])
on conflict (code) do update set
  name = excluded.name, element_affinity = excluded.element_affinity,
  price_bokchae = excluded.price_bokchae, sort_order = excluded.sort_order,
  is_active = excluded.is_active, assets = excluded.assets, story = excluded.story,
  saju_note = excluded.saju_note, deity_codes = excluded.deity_codes, matters = excluded.matters;
