<h1 align="center">해화당 (海華堂) - AI 사주 명리 플랫폼</h1>

<p align="center">
 Next.js 16 + Supabase + AI 기반 사주 운세 서비스
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#demo"><strong>Demo</strong></a> ·
  <a href="#deploy-to-vercel"><strong>Deploy to Vercel</strong></a> ·
  <a href="#clone-and-run-locally"><strong>Clone and run locally</strong></a> ·
  <a href="#feedback-and-issues"><strong>Feedback and issues</strong></a>
  <a href="#more-supabase-examples"><strong>More Examples</strong></a>
</p>
<br/>

## Features

- Works across the entire [Next.js](https://nextjs.org) stack
  - App Router
  - Pages Router
  - Proxy
  - Client
  - Server
  - It just works!
- supabase-ssr. A package to configure Supabase Auth to use cookies
- Password-based authentication block installed via the [Supabase UI Library](https://supabase.com/ui/docs/nextjs/password-based-auth)
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Components with [shadcn/ui](https://ui.shadcn.com/)
- Optional deployment with [Supabase Vercel Integration and Vercel deploy](#deploy-your-own)
  - Environment variables automatically assigned to Vercel project

## Demo

You can view a fully working demo at [demo-nextjs-with-supabase.vercel.app](https://demo-nextjs-with-supabase.vercel.app/).

## Deploy to Vercel

Vercel deployment will guide you through creating a Supabase account and project.

After installation of the Supabase integration, all relevant environment variables will be assigned to the project so the deployment is fully functioning.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&project-name=nextjs-with-supabase&repository-name=nextjs-with-supabase&demo-title=nextjs-with-supabase&demo-description=This+starter+configures+Supabase+Auth+to+use+cookies%2C+making+the+user%27s+session+available+throughout+the+entire+Next.js+app+-+Client+Components%2C+Server+Components%2C+Route+Handlers%2C+Server+Actions+and+Middleware.&demo-url=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2F&external-id=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&demo-image=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2Fopengraph-image.png)

The above will also clone the Starter kit to your GitHub, you can clone that locally and develop locally.

If you wish to just develop locally and not deploy to Vercel, [follow the steps below](#clone-and-run-locally).

## 환경변수 설정

### 1. 환경변수 파일 생성

`.env.example` 파일을 `.env.local`로 복사합니다:

```bash
cp .env.example .env.local
```

### 2. 필수 환경변수 설정

#### Supabase 설정
1. [Supabase 대시보드](https://database.new)에서 새 프로젝트 생성
2. Settings > API에서 다음 정보 확인:
   - `NEXT_PUBLIC_SUPABASE_URL`: 프로젝트 URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Anon 키
   - `SUPABASE_SERVICE_ROLE_KEY`: Service Role 키 (절대 클라이언트에 노출하지 마세요)

#### AI 서비스
1. **Gemini API** (필수)
   - [Google AI Studio](https://ai.google.dev/)에서 API 키 발급
   - `GOOGLE_GENERATIVE_AI_API_KEY` 및 `GEMINI_API_KEY`에 설정

2. **OpenAI API** (선택사항)
   - [OpenAI Platform](https://platform.openai.com/api-keys)에서 API 키 발급
   - GPT-4 Vision API 사용 시 필요
   - `OPENAI_API_KEY`에 설정

#### Toss Payments (결제 기능 사용 시)
1. [Toss Payments 개발자 센터](https://developers.tosspayments.com/)에서 가입
2. 테스트/프로덕션 키 발급:
   - `NEXT_PUBLIC_TOSS_CLIENT_KEY`: 클라이언트 키
   - `TOSS_SECRET_KEY`: Secret 키 (서버 전용)

### 3. 개발 서버 실행

```bash
npm install
npm run dev
```

애플리케이션이 [localhost:3000](http://localhost:3000/)에서 실행됩니다.

## 프로젝트 구조

```
app/
├── actions/          # Server Actions (도메인별 비즈니스 로직)
├── protected/        # 인증 필요 페이지
└── (auth)/           # 인증 관련 페이지

lib/
├── domain/           # 도메인 로직 (사주, 궁합, 운명 등)
│   ├── saju/        # 사주 계산 및 분석
│   ├── compatibility/  # 궁합 분석
│   └── destiny/     # 운명 분석
├── services/         # 외부 서비스 (Gemini, Toss Payments 등)
└── utils/            # 유틸리티 함수 (logger 등)

components/           # UI 컴포넌트 (Shadcn/ui 기반)
supabase/
└── migrations/       # 데이터베이스 마이그레이션
```

## 주요 기능

- 사주팔자 계산 및 분석 (음력/양력 지원)
- AI 기반 운세 분석 (Gemini API)
- 가족 구성원 관리 및 인연 분석
- 궁합 분석 (사주 기반)
- 관상, 손금, 풍수 분석 (이미지 AI)
- 멤버십 및 결제 시스템 (Toss Payments)
- 부적(크레딧) 시스템

## 개발 가이드

### 로깅
프로덕션 환경에서 불필요한 로그 출력을 방지하기 위해 `logger` 유틸리티를 사용합니다:

```typescript
import { logger } from "@/lib/utils/logger";

// 개발 환경에서만 출력
logger.log("디버그 정보");
logger.info("정보 메시지");
logger.warn("경고 메시지");

// 프로덕션에서도 출력 (에러만)
logger.error("에러 발생", error);
```

### 데이터베이스
자세한 스키마 정보는 `Database.md` 파일을 참고하세요.

### 코딩 규칙
프로젝트 코딩 규칙은 `PROJECT_RULES.md` 파일을 참고하세요.

## Clone and run locally

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Clone this repository:

   ```bash
   git clone <repository-url>
   cd haehwadang
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Set up environment variables (see "환경변수 설정" section above)

5. Run database migrations:

   ```bash
   npx supabase db reset
   ```

6. Run the development server:

   ```bash
   npm run dev
   ```

   The application should now be running on [localhost:3000](http://localhost:3000/).

> Check out [the docs for Local Development](https://supabase.com/docs/guides/getting-started/local-development) to also run Supabase locally.

## Feedback and issues

Please file feedback and issues over on the [Supabase GitHub org](https://github.com/supabase/supabase/issues/new/choose).

## 배포 (Deployment)

### 빠른 배포

```bash
# 1. 배포 전 자동 체크
npm run predeploy

# 2. Vercel 프로덕션 배포
npm run deploy

# 3. 미리보기 배포 (선택사항)
npm run deploy:preview
```

### 상세 배포 가이드

자세한 배포 절차는 다음 문서를 참고하세요:

- **DEPLOYMENT_GUIDE.md** - 단계별 배포 가이드 (환경변수, Vercel 설정, 보안)
- **DEPLOYMENT_REPORT.md** - 배포 준비 상태 보고서 (빌드 결과, 체크리스트)

### 환경변수 설정 (프로덕션)

Vercel Dashboard 또는 CLI를 통해 다음 환경변수를 설정하세요:

```bash
# Vercel CLI를 통한 환경변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add GOOGLE_GENERATIVE_AI_API_KEY production
vercel env add NEXT_PUBLIC_TOSS_CLIENT_KEY production
vercel env add TOSS_SECRET_KEY production
vercel env add NEXT_PUBLIC_APP_URL production
```

### 배포 후 확인

```bash
# 실시간 로그 모니터링
vercel logs --follow

# 배포 목록 확인
vercel list

# 환경변수 확인
vercel env ls
```

## More Supabase examples

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Cookie-based Auth and the Next.js 13 App Router (free course)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth and the Next.js App Router](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)
