-- 1. 유저 프로필 테이블 확장 (Supabase Auth 연동)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  credits integer DEFAULT 0,
  is_subscribed boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS 설정
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. 가족 및 지인 테이블 (멀티 프로필)
CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  relationship text,
  birth_date date NOT NULL,
  birth_time time,
  calendar_type text CHECK (calendar_type IN ('solar', 'lunar')),
  gender text CHECK (gender IN ('male', 'female')),
  home_address text,
  face_image_url text,
  hand_image_url text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own family members" ON public.family_members
  FOR ALL USING (auth.uid() = user_id);

-- 3. 운명 분석 기록 테이블
CREATE TABLE IF NOT EXISTS public.saju_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.family_members(id) ON DELETE CASCADE NOT NULL,
  luck_score integer,
  success_probability integer,
  happiness_index integer,
  full_report_html text,
  analysis_data jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.saju_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view records of their family members" ON public.saju_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE public.family_members.id = saju_records.member_id
      AND public.family_members.user_id = auth.uid()
    )
  );

-- 4. 결제 정보 테이블
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  order_id text UNIQUE NOT NULL,
  amount integer NOT NULL,
  status text CHECK (status IN ('completed', 'pending', 'failed')),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Profile 생성을 위한 트리거 (Auth 가입 시 자동 생성)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
