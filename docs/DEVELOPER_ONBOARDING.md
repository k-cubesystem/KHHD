# Developer Onboarding

해화당 프로젝트 개발 환경 설정 및 온보딩 가이드

**최종 업데이트**: 2026-02-03
**프로젝트**: 해화당 (Haehwadang) - AI 사주 플랫폼

---

## 목차

- [시스템 요구사항](#시스템-요구사항)
- [로컬 환경 설정](#로컬-환경-설정)
- [Supabase 설정](#supabase-설정)
- [개발 서버 실행](#개발-서버-실행)
- [프로젝트 구조](#프로젝트-구조)
- [코딩 스타일](#코딩-스타일)
- [배포 프로세스](#배포-프로세스)
- [트러블슈팅](#트러블슈팅)

---

## 시스템 요구사항

### 필수 요구사항

- **Node.js**: 18.17.0 이상
- **npm**: 9.0.0 이상
- **Git**: 최신 버전
- **운영체제**: Windows 10+, macOS 10.15+, Linux

### 권장 개발 환경

- **IDE**: VS Code (권장) 또는 WebStorm
- **브라우저**: Chrome 또는 Edge (개발자 도구 사용)
- **터미널**: PowerShell (Windows) 또는 zsh (macOS/Linux)

### VS Code 확장 프로그램

필수:
- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense

권장:
- TypeScript Importer
- Auto Rename Tag
- GitLens
- Error Lens

---

## 로컬 환경 설정

### 1. 저장소 클론

```bash
git clone https://github.com/your-org/haehwadang.git
cd haehwadang
```

### 2. 의존성 설치

```bash
npm install
```

**예상 소요 시간**: 2-3분

**설치되는 주요 패키지**:
- Next.js 16.1.4 (Turbopack)
- React 19
- Tailwind CSS 4
- Framer Motion
- Supabase Client
- Recharts
- Lucide React (아이콘)

### 3. 환경 변수 설정

#### 3-1. 환경 변수 파일 생성

```bash
cp .env.example .env.local
```

#### 3-2. 필수 환경 변수

`.env.local` 파일을 열고 다음 값을 입력하세요:

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini AI (필수)
GEMINI_API_KEY=your-gemini-api-key

# Toss Payments (필수)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_xxxxxxxxxx
TOSS_SECRET_KEY=test_sk_xxxxxxxxxx

# 기타
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
```

#### 3-3. 환경 변수 발급 방법

**Supabase**:
1. https://supabase.com 로그인
2. 프로젝트 생성 또는 선택
3. Settings → API
4. URL 및 Keys 복사

**Gemini API**:
1. https://aistudio.google.com 로그인
2. "Get API Key" 클릭
3. API Key 생성 및 복사

**Toss Payments**:
1. https://developers.tosspayments.com 가입
2. 테스트 키 발급 (개발용)
3. 운영 키는 실제 배포 시 별도 발급

---

## Supabase 설정

### 1. Supabase 프로젝트 생성

1. https://supabase.com 접속
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: haehwadang
   - Database Password: 강력한 비밀번호 설정
   - Region: Northeast Asia (Seoul)

4. 프로젝트 생성 완료 (약 2분 소요)

### 2. 데이터베이스 스키마 설정

#### 방법 1: SQL Editor 사용 (권장)

1. Supabase 대시보드 → SQL Editor
2. `supabase/migrations/` 폴더의 SQL 파일들을 순서대로 실행

**주요 마이그레이션 파일**:
```bash
supabase/migrations/
├── 001_initial_schema.sql          # 기본 테이블 생성
├── 002_family_members.sql          # 가족 구성원 테이블
├── 003_analysis_results.sql        # 분석 결과 테이블
├── 004_wallet.sql                  # 지갑/부적 시스템
├── 005_membership.sql              # 멤버십 시스템
└── 006_rpc_functions.sql           # RPC 함수
```

#### 방법 2: Supabase CLI 사용

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
npx supabase login

# 프로젝트 연결
npx supabase link --project-ref your-project-ref

# 마이그레이션 실행
npx supabase db push
```

### 3. Row Level Security (RLS) 활성화

모든 테이블에 RLS가 활성화되어 있는지 확인:

```sql
-- 예시: family_members 테이블
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 정책 생성
CREATE POLICY "Users can only see their own family members"
  ON family_members
  FOR SELECT
  USING (auth.uid() = user_id);
```

### 4. Storage Buckets 생성

이미지 저장용 버킷 생성:

1. Supabase 대시보드 → Storage
2. "New Bucket" 클릭
3. Bucket 생성:
   - `face-images` (관상 사진)
   - `hand-images` (손금 사진)
   - `interior-images` (풍수 사진)

4. 각 버킷에 Public 접근 정책 설정

---

## 개발 서버 실행

### 1. 개발 서버 시작

```bash
npm run dev
```

서버가 시작되면:
```
▲ Next.js 16.1.4 (Turbopack)
- Local:   http://localhost:3000
- Network: http://192.168.x.x:3000

✓ Ready in 1.8s
```

### 2. 브라우저에서 확인

http://localhost:3000 접속

**확인할 페이지**:
- `/` - 랜딩 페이지
- `/auth/sign-up` - 회원가입
- `/protected` - 대시보드 (로그인 필요)
- `/protected/analysis` - 분석 허브

### 3. Hot Reload 확인

코드 수정 시 자동으로 브라우저가 새로고침됩니다.

```tsx
// components/ui/button.tsx 수정 예시
<Button>테스트</Button>
// 저장하면 즉시 반영됨
```

---

## 프로젝트 구조

```
haehwadang/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # 인증 관련 페이지
│   │   └── auth/
│   ├── (marketing)/             # 마케팅 페이지 (랜딩)
│   ├── protected/               # 인증 필요 페이지
│   │   ├── analysis/           # 사주 분석
│   │   ├── family/             # 가족 관리
│   │   ├── membership/         # 멤버십
│   │   └── profile/            # 프로필
│   ├── actions/                 # Server Actions
│   ├── api/                     # API Routes
│   ├── globals.css             # 전역 스타일
│   └── layout.tsx              # 루트 레이아웃
│
├── components/                   # React 컴포넌트
│   ├── ui/                      # 기본 UI 컴포넌트
│   ├── analysis/                # 분석 관련
│   ├── dashboard/               # 대시보드
│   └── ...
│
├── lib/                          # 유틸리티
│   ├── supabase/               # Supabase 클라이언트
│   ├── gemini.ts               # Gemini AI
│   ├── saju/                   # 사주 계산 로직
│   └── utils.ts                # 공통 유틸
│
├── public/                       # 정적 파일
│   ├── images/
│   └── fonts/
│
├── docs/                         # 문서
│   ├── API_REFERENCE.md
│   ├── COMPONENT_GUIDE.md
│   ├── USER_GUIDE.md
│   └── DEVELOPER_ONBOARDING.md
│
├── supabase/                     # Supabase 설정
│   ├── migrations/              # 데이터베이스 마이그레이션
│   └── config.toml
│
├── .env.local                    # 환경 변수 (gitignore)
├── next.config.ts               # Next.js 설정
├── tailwind.config.ts           # Tailwind 설정
├── tsconfig.json                # TypeScript 설정
└── package.json                 # 의존성
```

---

## 코딩 스타일

### TypeScript

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

export async function getUser(id: string): Promise<User | null> {
  // ...
}

// ❌ Bad
export async function getUser(id) {  // 타입 없음
  // ...
}
```

### Tailwind CSS

```tsx
// ✅ Good - UX Pro Max 패턴
<Card className="bg-surface/50 backdrop-blur-md border border-primary/20 hover:border-primary/50 transition-all">
  <CardContent>내용</CardContent>
</Card>

// ❌ Bad - 기본 스타일
<div className="bg-white p-4">
  내용
</div>
```

### Framer Motion

```tsx
// ✅ Good - 애니메이션 적용
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";

<motion.div variants={fadeInUp}>
  <h1>제목</h1>
</motion.div>

// ❌ Bad - 애니메이션 없음
<div>
  <h1>제목</h1>
</div>
```

### 파일 명명 규칙

- 컴포넌트: `PascalCase.tsx` (예: `Button.tsx`)
- 유틸리티: `kebab-case.ts` (예: `date-utils.ts`)
- Server Actions: `*-actions.ts` (예: `family-actions.ts`)
- 페이지: `page.tsx` (Next.js App Router)

---

## 배포 프로세스

### Vercel 배포 (권장)

#### 1. Vercel 프로젝트 생성

1. https://vercel.com 로그인
2. "New Project" 클릭
3. GitHub 저장소 연결
4. Import

#### 2. 환경 변수 설정

Vercel 대시보드 → Settings → Environment Variables

**필수 환경 변수**:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `GEMINI_API_KEY`
- [ ] `NEXT_PUBLIC_TOSS_CLIENT_KEY`
- [ ] `TOSS_SECRET_KEY`
- [ ] `NEXT_PUBLIC_SITE_URL`

**환경별 설정**:
- Production: 운영 환경 키
- Preview: 테스트 환경 키
- Development: 로컬과 동일

#### 3. 자동 배포 설정

**main 브랜치**:
- 푸시 시 자동으로 Production 배포
- 배포 URL: https://haehwadang.vercel.app

**feature 브랜치**:
- PR 생성 시 자동으로 Preview 배포
- 배포 URL: https://haehwadang-git-feature-xxx.vercel.app

#### 4. 커스텀 도메인 설정

Vercel 대시보드 → Settings → Domains

1. "Add" 클릭
2. 도메인 입력 (예: haehwadang.com)
3. DNS 설정:
   ```
   A     @       76.76.21.21
   CNAME www     cname.vercel-dns.com
   ```

### 수동 배포

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 확인
npm run start
```

---

## 트러블슈팅

### 문제: npm install 실패

**해결 방법**:
```bash
# 캐시 삭제
npm cache clean --force

# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

---

### 문제: Supabase 연결 오류

**증상**:
```
Error: Invalid API key
```

**해결 방법**:
1. `.env.local` 파일 확인
2. Supabase URL 및 Key 재확인
3. `NEXT_PUBLIC_` 접두사 확인 (클라이언트용)

---

### 문제: 빌드 에러

**증상**:
```
Type error: Property 'xxx' does not exist
```

**해결 방법**:
```bash
# TypeScript 타입 체크
npm run type-check

# ESLint 실행
npm run lint

# 자동 수정
npm run lint -- --fix
```

---

### 문제: Tailwind 스타일 미적용

**해결 방법**:
1. 개발 서버 재시작
   ```bash
   npm run dev
   ```

2. `.next` 캐시 삭제
   ```bash
   rm -rf .next
   npm run dev
   ```

3. `tailwind.config.ts`의 content 경로 확인
   ```typescript
   content: [
     "./app/**/*.{ts,tsx}",
     "./components/**/*.{ts,tsx}",
   ]
   ```

---

### 문제: 이미지 업로드 실패

**해결 방법**:
1. Supabase Storage 버킷 확인
2. Public 정책 설정 확인
3. 파일 크기 제한 (10MB) 확인

---

## 개발 워크플로우

### 1. 기능 개발

```bash
# feature 브랜치 생성
git checkout -b feature/new-analysis

# 코드 작성
# ...

# 커밋
git add .
git commit -m "feat: add new analysis feature"

# 푸시
git push origin feature/new-analysis
```

### 2. Pull Request

1. GitHub에서 PR 생성
2. Vercel Preview 배포 확인
3. 코드 리뷰 요청
4. 승인 후 main 브랜치로 머지

### 3. 배포

- main 브랜치 머지 시 자동으로 Production 배포
- 배포 완료 시 Slack 알림 (설정 시)

---

## 유용한 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# TypeScript 타입 체크
npm run type-check

# ESLint 실행
npm run lint

# Prettier 포맷팅
npm run format

# 테스트 (설정 시)
npm run test
```

---

## 추가 리소스

### 공식 문서

- **Next.js**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Supabase**: https://supabase.com/docs
- **Framer Motion**: https://www.framer.com/motion
- **Lucide Icons**: https://lucide.dev

### 프로젝트 문서

- [API Reference](./API_REFERENCE.md)
- [Component Guide](./COMPONENT_GUIDE.md)
- [User Guide](./USER_GUIDE.md)
- [Design System](./DESIGN_SYSTEM.md)

### 커뮤니티

- **GitHub Issues**: 버그 리포트 및 기능 제안
- **GitHub Discussions**: 질문 및 토론
- **Slack**: 팀 커뮤니케이션 (초대 필요)

---

## 체크리스트

### 초기 설정 완료

- [ ] Node.js 18+ 설치
- [ ] 저장소 클론
- [ ] npm install 완료
- [ ] .env.local 설정
- [ ] Supabase 프로젝트 생성
- [ ] 데이터베이스 마이그레이션
- [ ] 개발 서버 실행 확인
- [ ] localhost:3000 접속 성공

### 개발 환경 설정

- [ ] VS Code 확장 프로그램 설치
- [ ] ESLint 설정 확인
- [ ] Prettier 설정 확인
- [ ] Git hook 설정 (선택)

### 배포 준비

- [ ] Vercel 계정 생성
- [ ] GitHub 저장소 연결
- [ ] 환경 변수 설정
- [ ] 커스텀 도메인 연결 (선택)
- [ ] 첫 배포 성공

---

**최종 업데이트**: 2026-02-03
**문서 버전**: 1.0.0
**작성자**: Claude Sonnet 4.5

**환영합니다!** 🎉

해화당 프로젝트에 오신 것을 환영합니다. 궁금한 점이 있으면 언제든지 팀에 문의하세요!
