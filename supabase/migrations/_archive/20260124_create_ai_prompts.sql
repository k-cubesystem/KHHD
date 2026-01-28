-- AI 프롬프트 관리 테이블 생성
CREATE TABLE IF NOT EXISTS public.ai_prompts (
    key text PRIMARY KEY, -- 예: 'saju', 'daily', 'compatibility'
    label text NOT NULL, -- 예: '사주 풀이', '오늘의 운세'
    category text NOT NULL, -- 예: 'basic', 'premium', 'special'
    template text NOT NULL, -- 실제 프롬프트 내용
    description text, -- 설명
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS 정책 설정
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회/수정 가능
CREATE POLICY "Admins can view prompts" ON public.ai_prompts
    FOR SELECT TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update prompts" ON public.ai_prompts
    FOR UPDATE TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 초기 데이터 삽입 (기본 템플릿)
INSERT INTO public.ai_prompts (key, label, category, template, description) VALUES
('saju_analysis', '사주 풀이', 'basic', 
'당신은 정통 명리학에 기반한 사주 분석가입니다. 
사용자의 사주 팔자를 분석하여 성격, 재물운, 직업운을 상세히 설명해주세요.
말투는 정중하고 신뢰감 있게, "청담해화당"의 톤앤매너를 유지하세요.', 
'기본 사주 정밀 분석 프롬프트'),

('daily_fortune', '오늘의 운세', 'basic', 
'오늘은 {{date}}입니다. 사용자의 일주(日柱)와 오늘의 날짜를 대조하여 
오늘의 종합 운세, 금전운, 애정운을 3줄 요약으로 알려주세요.
희망적이고 긍정적인 메시지를 담아주세요.', 
'매일 제공되는 운세 프롬프트'),

('compatibility', '궁합 분석', 'premium', 
'두 사람의 사주 오행 분포와 일간(日干)의 상생상극을 분석하여 궁합 점수와 조언을 제공하세요.
서로에게 도움이 되는 부분과 조심해야 할 부분을 구체적으로 짚어주세요.', 
'연인/부부/동료 궁합 분석'),

('palm_reading', '손금 분석', 'premium', 
'사용자가 업로드한 손바닥 이미지를 바탕으로 생명선, 두뇌선, 감정선을 분석하세요.
각 선의 굵기, 길이, 잔주름 여부를 통해 건강, 지능, 성향을 유추하고 미래 조언을 해주세요.', 
'AI 비전 기반 손금 풀이'),

('face_reading', '관상 분석', 'premium', 
'사용자의 얼굴 이미지를 분석하여 오관(눈, 코, 입, 귀, 눈썹)의 형태와 조화를 봅니다.
초년운(상정), 중년운(중정), 말년운(하정)을 중심으로 인생의 흐름을 예측해주세요.', 
'AI 비전 기반 관상 풀이'),

('universal_analysis', '천지인 종합 분석', 'special', 
'사주(天), 관상(人), 손금(地) 분석 결과를 종합하여 궁극적인 인생의 해답을 제시합니다.
각 분석 결과의 공통점을 찾아 강조하고, 모순되는 점이 있다면 조화롭게 해석하여 결론을 내려주세요.', 
'플래그십 종합 운세 서비스')
ON CONFLICT (key) DO NOTHING;
