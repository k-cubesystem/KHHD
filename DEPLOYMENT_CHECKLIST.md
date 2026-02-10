# 해화당 배포 체크리스트

> 빠른 참조용 배포 체크리스트
> 상세 내용은 DEPLOYMENT_GUIDE.md 참조

---

## 배포 전 체크 (필수)

### 자동 체크
```bash
npm run predeploy
```

### 수동 체크
- [ ] `.env.local` 파일 존재 및 값 설정
- [ ] TypeScript 컴파일 성공 (`npx tsc --noEmit`)
- [ ] 프로덕션 빌드 성공 (`npm run build`)
- [ ] Supabase 프로젝트 생성 및 URL/Key 확보

---

## 환경변수 체크 (필수)

### Supabase (3개)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### AI 서비스 (2개)
- [ ] `GOOGLE_GENERATIVE_AI_API_KEY`
- [ ] `GEMINI_API_KEY`

### 결제 (2개)
- [ ] `NEXT_PUBLIC_TOSS_CLIENT_KEY`
- [ ] `TOSS_SECRET_KEY`

### 앱 (1개)
- [ ] `NEXT_PUBLIC_APP_URL`

---

## Vercel 배포 단계

### 1. Vercel CLI 설치
```bash
npm install -g vercel
```

### 2. Vercel 로그인
```bash
vercel login
```

### 3. 환경변수 등록
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add GOOGLE_GENERATIVE_AI_API_KEY production
vercel env add GEMINI_API_KEY production
vercel env add NEXT_PUBLIC_TOSS_CLIENT_KEY production
vercel env add TOSS_SECRET_KEY production
vercel env add NEXT_PUBLIC_APP_URL production
```

### 4. 프로덕션 배포
```bash
npm run deploy
```

또는

```bash
vercel --prod
```

---

## Supabase 프로덕션 설정

### 1. 마이그레이션 적용
```bash
# Supabase CLI 설치 (최초 1회)
npm install -g supabase

# 로그인
npx supabase login

# 프로젝트 연결
npx supabase link --project-ref <your-project-ref>

# 마이그레이션 적용
npx supabase db push
```

### 2. RLS 정책 확인
- [ ] Supabase Dashboard > Authentication > Policies
- [ ] 모든 테이블에 RLS 활성화 확인
- [ ] 사용자별 데이터 접근 제한 확인

---

## 배포 후 확인 (필수)

### 즉시 (5분 이내)
- [ ] 배포 URL 접속 가능
- [ ] 메인 페이지 정상 로딩
- [ ] 브라우저 콘솔 에러 없음
- [ ] 환경변수 로딩 확인 (개발자 도구)

### 기능 테스트 (30분 이내)
- [ ] 회원가입/로그인
- [ ] 사주 분석 (음력/양력)
- [ ] AI 스튜디오 (관상/손금/풍수)
- [ ] 결제 플로우 (테스트 카드)
- [ ] 가족 구성원 관리
- [ ] 관리자 대시보드 (관리자 계정)

### 로그 모니터링
```bash
vercel logs --follow
```

---

## 롤백 계획

### Vercel 롤백
```bash
# 이전 배포로 롤백
vercel rollback

# 또는 Dashboard에서 이전 배포 Promote
```

### 데이터베이스 롤백
- Supabase Dashboard > Database > Backups
- 복원할 백업 선택 > Restore

---

## 유용한 명령어

```bash
# 환경변수 검증
npm run env:check

# 배포 전 체크
npm run predeploy

# 프로덕션 배포
npm run deploy

# 미리보기 배포
npm run deploy:preview

# 로그 확인
vercel logs --follow

# 배포 목록
vercel list

# 환경변수 목록
vercel env ls
```

---

## 문제 해결

### 빌드 실패
1. `npm run build` 로컬에서 재현
2. TypeScript 에러 확인: `npx tsc --noEmit`
3. ESLint 에러 확인: `npm run lint`

### 환경변수 오류
1. `vercel env ls` 로 환경변수 확인
2. 누락된 변수 추가: `vercel env add <key> production`
3. 재배포: `vercel --prod`

### 데이터베이스 연결 실패
1. Supabase 프로젝트 상태 확인
2. URL/Key 정확성 확인
3. RLS 정책 확인

### API 타임아웃
- Vercel Hobby: 10초 제한
- Vercel Pro: 60초 제한
- 긴 작업은 백그라운드 처리 권장

---

## 연락처

- 상세 가이드: `DEPLOYMENT_GUIDE.md`
- 배포 상태 보고서: `DEPLOYMENT_REPORT.md`
- 프로젝트 개요: `README.md`
- 데이터베이스: `DATABASE.md`
- 코딩 규칙: `PROJECT_RULES.md`

---

**배포 준비 완료 상태: ✅**
**최종 업데이트: 2026-02-10**
