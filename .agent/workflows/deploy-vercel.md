---
description: Vercel 자동 배포 및 환경 변수 설정 워크플로우
---

1. 로컬 프로젝트 폴더(`d:\anti\haehwadang`)에서 GitHub 원격 저장소를 연결합니다.
   ```bash
   git remote add origin [GITHUB_REPO_URL]
   git push -u origin main
   ```

2. [Vercel 대시보드](https://vercel.com/new)에서 해당 저장소를 임포트합니다.

3. Vercel 프로젝트 설정의 **Environment Variables** 메뉴에서 다음 항목을 필수 등록합니다:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase 익명 키
   - `GOOGLE_GENERATIVE_AI_API_KEY`: Gemini API 키

4. `git push` 명령어를 실행할 때마다 Vercel이 자동으로 빌드 및 배포를 수행하는지 확인합니다.
