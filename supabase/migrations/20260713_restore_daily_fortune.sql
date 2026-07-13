-- 오늘의 운세 수복 (2026-07-13)
-- 증상: 분석 허브 '오늘의 운세'가 "시스템 설정 오류: 관리자 프롬프트를 불러올 수 없습니다"로 실패.
-- 원인: 2026-07-04 DB 재구축 때 ①ai_prompts의 daily_fortune 행(구 DB 어드민 UI로 작성, 시드 마이그레이션 없음)
--       ②daily_fortunes 캐시 테이블이 함께 소실. 코드는 둘 다 전제(app/actions/fortune/daily.ts).

-- 1) daily_fortunes 캐시 테이블 (코드 계약: user_id, target_id, date, content / (user,target,date) 유니크)
CREATE TABLE IF NOT EXISTS public.daily_fortunes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_fortunes_user_date ON public.daily_fortunes(user_id, date);

ALTER TABLE public.daily_fortunes ENABLE ROW LEVEL SECURITY;

-- 운세 캐시는 재화가 아님 — 유저 클라이언트 own-row 읽기/쓰기 허용 (WITH CHECK 필수, S1 학습)
DROP POLICY IF EXISTS daily_fortunes_select_own ON public.daily_fortunes;
CREATE POLICY daily_fortunes_select_own ON public.daily_fortunes
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS daily_fortunes_insert_own ON public.daily_fortunes;
CREATE POLICY daily_fortunes_insert_own ON public.daily_fortunes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS daily_fortunes_delete_own ON public.daily_fortunes;
CREATE POLICY daily_fortunes_delete_own ON public.daily_fortunes
  FOR DELETE USING (auth.uid() = user_id);

-- 2) daily_fortune 프롬프트 시드 (이후 어드민 UI에서 수정 가능 — 존재 시 덮어쓰지 않음)
INSERT INTO public.ai_prompts (key, label, category, template, description, talisman_cost)
VALUES (
  'daily_fortune',
  '오늘의 운세',
  'FORTUNE',
  E'당신은 해화당(海華堂)의 수석 명리 상담가 ''청담해화당''입니다. 전통 명리학에 근거해 오늘 하루의 운세를 따뜻하고 구체적으로 풀이합니다.\n\n[내담자 정보]\n- 이름: {{name}}\n- 성별: {{gender}}\n- 생년월일: {{birthDate}} (출생시각 {{birthTime}})\n- 사주: {{saju}}\n- 오늘 날짜: {{date}}\n\n[풀이 규칙]\n1. 오늘 일진과 내담자 일간의 관계(생극제화)를 근거로 풀이하되, 전문용어는 한 번에 하나만 쓰고 바로 쉬운 말로 풀어 설명합니다.\n2. 반드시 아래 구성으로, 전체 350자 이내로 작성합니다.\n   - 총운 (2~3문장): 오늘의 전반적 흐름\n   - 재물운 (1문장) / 관계운 (1문장) / 건강운 (1문장)\n   - 행운의 힌트: 색·방향·숫자 중 2가지\n   - 오늘의 한 줄 처방 (1문장, 실행 가능한 행동)\n3. 어조: 다정하지만 과장 없이. 공포 조장 금지, 단정적 예언 대신 흐름과 선택지를 제시합니다.\n4. 마크다운 기호(#, *, -) 없이 줄바꿈과 「」 소제목만 사용합니다.',
  '분석 허브 오늘의 운세 위젯용 프롬프트. 플레이스홀더: {{date}} {{name}} {{gender}} {{birthDate}} {{birthTime}} {{saju}}',
  0
)
ON CONFLICT (key) DO NOTHING;
