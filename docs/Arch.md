# 시스템 아키텍처 (Tech Stack)

## 1. Stack
- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Shadcn UI, Framer Motion.
- **Backend:** Next.js Server Actions, Supabase Edge Functions.
- **Database:** Supabase (PostgreSQL).
- **Auth:** Supabase Auth (Kakao, Google).
- **AI:** Gemini 1.5 Pro + Antigravity Skills.
- **Payments:** Toss Payments SDK.
- **Deployment:** Vercel (Auto CD).

## 2. 데이터 흐름
1. `lunar-javascript`를 통해 생년월일을 사주 간지로 변환.
2. 유저 입력 데이터(텍스트+이미지)를 MCP 서버를 거쳐 Gemini API로 전달.
3. Gemini는 `FateEngineerSkill`을 호출하여 DB 컨텍스트 확인 후 리포트 생성.
4. 결과값을 DB에 저장하고 대시보드 및 리포트 페이지에 렌더링.