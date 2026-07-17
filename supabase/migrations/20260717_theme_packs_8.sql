-- 신당 테마팩 8종 확충 — 기존 4종(초가·반가·용궁·도깨비불) + 신규 4종
-- CSS 그라디언트 에셋만 사용 (room.webp 없으면 클라이언트가 그라디언트 폴백 — 설계상 안전).
-- 가격은 단일 통화 복채(price_bokchae). price_krw 는 참고 원가 표기용.

INSERT INTO public.shrine_theme_packs (code, name, description, price_bok, price_krw, element_affinity, assets, sort_order) VALUES
  ('seolbit', '설빛 서고', '눈빛 어린 새벽 서고, 은백의 고요.', 0, 9900, 'metal',
    '{"wall":"linear-gradient(180deg,#1e2228,#14171c)","floor":"linear-gradient(180deg,#181c22,#0b0d11)","accent":"#c8d4dc","particle":"#dce6ec","glow":"rgba(200,212,220,0.16)","top":"linear-gradient(90deg,transparent,rgba(200,212,220,0.55),transparent)"}', 5),
  ('daljip', '달집 마당', '보름달 아래 황토 마당, 달빛의 온기.', 0, 9900, 'earth',
    '{"wall":"linear-gradient(180deg,#2a2016,#1b1410)","floor":"linear-gradient(180deg,#241a10,#120c07)","accent":"#e6c37a","particle":"#f0d9a0","glow":"rgba(230,195,122,0.17)"}', 6),
  ('hongsal', '홍살문 안뜰', '단청 붉은 홍살문의 위엄과 액막이.', 0, 9900, 'fire',
    '{"wall":"linear-gradient(180deg,#2a1214,#1a0c0d)","floor":"linear-gradient(180deg,#220f10,#100708)","accent":"#d96c5f","particle":"#e8938a","glow":"rgba(217,108,95,0.15)","top":"linear-gradient(90deg,#9e2b2b,#e8d5a0,#9e2b2b)"}', 7),
  ('byeolbat', '별밭 천문각', '밤하늘 별빛이 쏟아지는 천문각.', 0, 19900, NULL,
    '{"wall":"linear-gradient(180deg,#141a2e,#0c101e)","floor":"linear-gradient(180deg,#10152a,#080a14)","accent":"#8fa8e8","particle":"#b8c8f0","glow":"rgba(143,168,232,0.16)","top":"linear-gradient(90deg,transparent,rgba(143,168,232,0.5),transparent)"}', 8)
ON CONFLICT (code) DO NOTHING;

-- 복채 가격: 일반 유료 테마 1복채, 프리미엄(별밭) 2복채
UPDATE public.shrine_theme_packs SET price_bokchae = 1 WHERE code IN ('seolbit','daljip','hongsal') AND price_bokchae = 0;
UPDATE public.shrine_theme_packs SET price_bokchae = 2 WHERE code = 'byeolbat' AND price_bokchae = 0;
