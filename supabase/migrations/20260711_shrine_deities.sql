-- Track D — 신당 3.0 신위(神位) 시스템 스키마 + 17신위 시드
-- 근거: TEAM_G_DESIGN/prd/PRD-shrine-3.0-deities-v1.md
-- RLS 원칙(S1 학습 반영): 카탈로그=공개읽기/service_role쓰기, 유저소유=본인SELECT/service_role쓰기.
-- 추가만(신규 테이블/컬럼) — 기존 기능 무영향.

-- ============================================================
-- 0. profiles.focus_areas (배정 로직 입력 — 새 프로젝트에 누락되어 재추가)
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS focus_areas text;
COMMENT ON COLUMN public.profiles.focus_areas IS '중점 관심사·현재 고민 (콤마 구분, 예: 취업,건강,재물운,승진운). 수호신 자동 배정 입력.';

-- ============================================================
-- 1. shrine_deities — 17신위 카탈로그 (공개 읽기)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shrine_deities (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,
  name              text NOT NULL,
  name_hanja        text,
  tier              integer NOT NULL CHECK (tier BETWEEN 1 AND 4),
  tier_name         text NOT NULL,                         -- 수호신/명신/장군신/천신
  element           text NOT NULL,                         -- wood|fire|earth|metal|water|all
  domains           text[] NOT NULL DEFAULT '{}',          -- 관장 영역
  concern_key       text,                                  -- 배정 키(수호신만): 자녀·가정 등
  personality       text,
  tone              text,
  appearance        text,                                  -- 발주 명세(외형)
  aura              jsonb NOT NULL DEFAULT '{}'::jsonb,     -- {accent, particle, sound}
  price_krw         integer NOT NULL DEFAULT 0,
  price_bok         integer NOT NULL DEFAULT 0,             -- 복전(유료 통화)
  is_season_limited boolean NOT NULL DEFAULT false,
  sprite_url        text,
  portrait_url      text,
  sort_order        integer NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shrine_deities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shrine_deities_read ON public.shrine_deities;
CREATE POLICY shrine_deities_read ON public.shrine_deities
  FOR SELECT TO anon, authenticated USING (is_active = true);
-- 쓰기 정책 없음 → service_role 전용

-- ============================================================
-- 2. user_shrine_deities — 유저 보유 신위 (좌정 포함)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_shrine_deities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deity_id    uuid NOT NULL REFERENCES public.shrine_deities(id) ON DELETE CASCADE,
  source      text NOT NULL DEFAULT 'purchase',            -- free_guardian|purchase|gift|season
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, deity_id)
);
CREATE INDEX IF NOT EXISTS idx_user_shrine_deities_user ON public.user_shrine_deities(user_id);

ALTER TABLE public.user_shrine_deities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_shrine_deities_select_own ON public.user_shrine_deities;
CREATE POLICY user_shrine_deities_select_own ON public.user_shrine_deities
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- 쓰기(취득/좌정)는 service_role 전용(서버 액션에서 가격·인증 검증 후 admin으로 지급)

-- ============================================================
-- 3. user_deity_bonds — 인연(緣) 4단계
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_deity_bonds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deity_id    uuid NOT NULL REFERENCES public.shrine_deities(id) ON DELETE CASCADE,
  bond_level  integer NOT NULL DEFAULT 1 CHECK (bond_level BETWEEN 1 AND 4),
  bond_points integer NOT NULL DEFAULT 0 CHECK (bond_points >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, deity_id)
);
CREATE INDEX IF NOT EXISTS idx_user_deity_bonds_user ON public.user_deity_bonds(user_id);

ALTER TABLE public.user_deity_bonds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_deity_bonds_select_own ON public.user_deity_bonds;
CREATE POLICY user_deity_bonds_select_own ON public.user_deity_bonds
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- 쓰기(인연 적립/해금)는 service_role 전용

-- ============================================================
-- 4. shrines.main_deity_id — 제단 주신(主神)
-- ============================================================
ALTER TABLE public.shrines
  ADD COLUMN IF NOT EXISTS main_deity_id uuid REFERENCES public.shrine_deities(id) ON DELETE SET NULL;

-- ============================================================
-- 5. 17신위 시드 (재적용 안전: code 기준 upsert)
-- ============================================================
INSERT INTO public.shrine_deities
  (code, name, name_hanja, tier, tier_name, element, domains, concern_key, personality, tone, aura, price_krw, price_bok, is_season_limited, sort_order)
VALUES
  -- 수호신 (tier1, 무료 자동 좌정)
  ('samsin','삼신할매','三神',1,'수호신','earth', ARRAY['자녀','출산','가정 화목'],'자녀·가정','손주 대하듯 다정','반말+하오체 혼용',
    '{"accent":"#E8A0A0","particle":"seed_bloom","sound":"moktak"}'::jsonb,0,0,false,1),
  ('jowang','조왕신','竈王',1,'수호신','fire', ARRAY['건강','식복','집안 평안'],'건강','씩씩하고 밝은 부엌의 여신','활기찬 반말',
    '{"accent":"#D96C3F","particle":"ember","sound":"crackle"}'::jsonb,0,0,false,2),
  ('seongju','성주신','城主',1,'수호신','wood', ARRAY['새 출발','이사','가장운'],'직장·변화','곧고 믿음직한 선비형','단정한 하오체',
    '{"accent":"#4A7C59","particle":"leaf","sound":"moktak"}'::jsonb,0,0,false,3),
  ('teoju','터주대감','基主',1,'수호신','earth', ARRAY['재물 안정','집터','부동산'],'재물','배불뚝이 유쾌한 대감','너털웃음 반말',
    '{"accent":"#D4A017","particle":"coin_glint","sound":"chime"}'::jsonb,0,0,false,4),
  ('dongja','동자신','童子',1,'수호신','wood', ARRAY['인연','소통','시험운'],'학업·인연','쌍상투 개구쟁이','발랄한 반말',
    '{"accent":"#6FA8DC","particle":"paper_crane","sound":"bell"}'::jsonb,0,0,false,5),
  ('seonnyeo','선녀신','仙女',1,'수호신','water', ARRAY['애정','아름다움','예술'],'애정','잔잔하고 서정적','고운 존댓말',
    '{"accent":"#5B8DBE","particle":"firefly","sound":"water"}'::jsonb,0,0,false,6),
  -- 명신 (tier2, ₩6,900 / 6만 복전)
  ('daegam','대감신','大監',2,'명신','metal', ARRAY['재물 증식','사업 번창'],NULL,'호탕, 통 큰 조언','호방한 반말',
    '{"accent":"#C9A84C","particle":"coin_rain","sound":"bara"}'::jsonb,6900,60000,false,7),
  ('dokkaebi','도깨비 대장','',2,'명신','fire', ARRAY['횡재','역전운','승부'],NULL,'장난기+의리','짓궂은 반말',
    '{"accent":"#3FBF9F","particle":"dokkaebi_fire","sound":"crackle"}'::jsonb,6900,60000,false,8),
  ('bari','바리공주','',2,'명신','water', ARRAY['치유','회복','마음 위로'],NULL,'담담하고 깊은 공감','다정한 존댓말',
    '{"accent":"#B8A8D9","particle":"heal_drop","sound":"water"}'::jsonb,6900,60000,false,9),
  ('eopsin','업신','業神',2,'명신','earth', ARRAY['재물 지킴','저축'],NULL,'낯가리지만 제 사람에겐 극진','과묵한 반말',
    '{"accent":"#8C8478","particle":"scale_glint","sound":"chime"}'::jsonb,6900,60000,false,10),
  -- 장군신 (tier3, ₩12,900 / 12만 복전)
  ('choiyoung','최영 장군','',3,'장군신','metal', ARRAY['관재','소송','승진 경쟁'],NULL,'강직, 단호','절도 있는 하오체',
    '{"accent":"#C0C8D0","particle":"slash_light","sound":"bara"}'::jsonb,12900,120000,false,11),
  ('gwanseong','관성제군','關聖',3,'장군신','fire', ARRAY['사업','계약','의리'],NULL,'묵직한 신의','근엄한 하오체',
    '{"accent":"#9E2B2B","particle":"dragon_aura","sound":"bara"}'::jsonb,12900,120000,false,12),
  ('baekma','백마신장','白馬',3,'장군신','metal', ARRAY['액막이','삼재 방어'],NULL,'과묵한 방패','짧고 단호',
    '{"accent":"#E8E4DC","particle":"talisman_shield","sound":"bell"}'::jsonb,12900,120000,false,13),
  -- 천신 (tier4, ₩24,900 / 24만 복전)
  ('chilseong','칠성신','七星',4,'천신','water', ARRAY['수명','소원 성취','자녀 대운'],NULL,'별처럼 아득한 자애','아득한 존댓말',
    '{"accent":"#2D5F8A","particle":"star_trail","sound":"chime"}'::jsonb,24900,240000,false,14),
  ('yongwang','용왕신','龍王',4,'천신','water', ARRAY['큰 재물 흐름','해외운'],NULL,'대양 같은 호방함','웅장한 하오체',
    '{"accent":"#3F8FA8","particle":"pearl_bubble","sound":"water"}'::jsonb,24900,240000,false,15),
  ('sansin','산신령','山神',4,'천신','earth', ARRAY['건강 대운','학업 대성'],NULL,'유장한 지혜','유장한 하오체',
    '{"accent":"#7C9A6E","particle":"mist","sound":"moktak"}'::jsonb,24900,240000,false,16),
  ('okhwang','옥황상제','玉皇',4,'천신','all', ARRAY['전 영역 가호'],NULL,'하늘의 위엄, 말수 적음','극존칭 최소 발화',
    '{"accent":"#E8D5A0","particle":"gold_rain","sound":"bara"}'::jsonb,39900,390000,true,17)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, name_hanja=EXCLUDED.name_hanja, tier=EXCLUDED.tier, tier_name=EXCLUDED.tier_name,
  element=EXCLUDED.element, domains=EXCLUDED.domains, concern_key=EXCLUDED.concern_key,
  personality=EXCLUDED.personality, tone=EXCLUDED.tone, aura=EXCLUDED.aura,
  price_krw=EXCLUDED.price_krw, price_bok=EXCLUDED.price_bok,
  is_season_limited=EXCLUDED.is_season_limited, sort_order=EXCLUDED.sort_order;
