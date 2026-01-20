-- 1. 유저 프로필
CREATE TABLE profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  full_name text,
  credits integer DEFAULT 0,
  is_subscribed boolean DEFAULT false,
  updated_at timestamp DEFAULT now()
);

-- 2. 가족 및 지인 (멀티 프로필)
CREATE TABLE family_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id),
  name text NOT NULL,
  relationship text,
  birth_date date NOT NULL,
  birth_time time,
  calendar_type text, -- 'solar', 'lunar'
  gender text,
  home_address text,  -- 풍수용 주소
  face_image_url text, -- 관상용 사진
  hand_image_url text, -- 손금용 사진
  created_at timestamp DEFAULT now()
);

-- 3. 운명 분석 기록
CREATE TABLE saju_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id uuid REFERENCES family_members(id),
  luck_score integer,
  success_probability integer,
  happiness_index integer,
  full_report_html text, -- 5000자 리포트
  analysis_data jsonb,   -- 상세 수치 데이터
  created_at timestamp DEFAULT now()
);

-- 4. 결제 정보
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id),
  order_id text UNIQUE,
  amount integer,
  status text, -- 'completed', 'pending'
  created_at timestamp DEFAULT now()
);