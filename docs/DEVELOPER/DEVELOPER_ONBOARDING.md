# Developer Onboarding

해화당(Haehwadang) 개발 환경 설정 및 온보딩 가이드입니다.

---

## 1. 시스템 요구사항

### 필수 요구사항

- **Node.js**: 18.x 이상
- **npm**: 9.x 이상 (또는 pnpm/yarn)
- **Git**: 2.x 이상

### 권장 도구

- **IDE**: VS Code + Prettier, ESLint 확장
- **터미널**: Windows Terminal / iTerm2
- **Git GUI**: GitKraken / SourceTree (선택)

---

## 2. 프로젝트 클론

```bash
# 저장소 클론
git clone https://github.com/your-org/haehwadang.git

# 디렉토리 이동
cd haehwadang

# 의존성 설치
npm install
```

---

## 3. 환경 변수 설정

### .env.local 파일 생성

```bash
cp .env.example .env.local
```

### 필수 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# Toss Payments
TOSS_CLIENT_KEY=your-client-key
TOSS_SECRET_KEY=your-secret-key

# App URL (배포 시 변경)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 환경 변수 획득 방법

#### Supabase

1. [Supabase Console](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 → Settings → API
3. `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
4. `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

#### Google Gemini AI

1. [Google AI Studio](https://aistudio.google.com/) 접속
2. Get API Key → Create API Key
3. 생성된 키 → `GOOGLE_GENERATIVE_AI_API_KEY`

#### Toss Payments

1. [Toss Payments 개발자센터](https://developers.tosspayments.com/) 접속
2. 내 개발정보 → API 키
3. 테스트 클라이언트 키 → `TOSS_CLIENT_KEY`
4. 테스트 시크릿 키 → `TOSS_SECRET_KEY`

---

## 4. 데이터베이스 설정

### Supabase 마이그레이션

```bash
# Supabase CLI 설치 (처음 한 번만)
npm install -g supabase

# 로그인
supabase login

# 프로젝트 링크
supabase link --project-ref your-project-ref

# 마이그레이션 적용
supabase db push
```

### 주요 테이블 구조

```
profiles          - 사용자 프로필
family_members    - 가족 구성원
wallets           - 부적 잔액
wallet_transactions - 지갑 거래 내역
analysis_history  - 분석 이력
subscriptions     - 구독 정보
subscription_payments - 구독 결제 내역
membership_plans  - 멤버십 상품
feature_costs     - 기능별 비용
```

### 초기 데이터 (Seeds)

```sql
-- 멤버십 플랜 생성
INSERT INTO membership_plans (name, price, interval, talismans_per_period, features)
VALUES (
  '해화 멤버십',
  9900,
  'MONTH',
  10,
  '{"daily_fortune": true, "pdf_archive": true}'::jsonb
);

-- 기능별 비용 설정
INSERT INTO feature_costs (feature_key, cost, description) VALUES
('SAJU_BASIC', 1, '기본 사주 분석'),
('FACE_AI', 2, '관상 분석'),
('PALM_AI', 2, '손금 분석'),
('FENGSHUI_AI', 2, '풍수 분석'),
('IMAGE_GEN', 3, '이미지 생성');
```

---

## 5. 개발 서버 실행

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 접속
# http://localhost:3000
```

### 유용한 스크립트

```bash
# 빌드
npm run build

# 프로덕션 모드 실행
npm run start

# 린트 검사
npm run lint

# 타입 검사
npm run type-check
```

---

## 6. 프로젝트 구조

```
haehwadang/
├── app/                    # Next.js App Router
│   ├── (root)/            # 루트 레이아웃
│   ├── auth/              # 인증 페이지
│   ├── protected/         # 인증 필요 페이지
│   │   ├── analysis/      # 분석 페이지
│   │   ├── billing/       # 결제 페이지
│   │   ├── family/        # 가족 관리
│   │   ├── membership/    # 멤버십
│   │   └── saju/          # 사주 관련
│   ├── admin/             # 관리자 페이지
│   ├── api/               # API 라우트
│   │   └── webhooks/      # 웹훅 엔드포인트
│   └── actions/           # Server Actions
│
├── components/             # React 컴포넌트
│   ├── ui/                # shadcn/ui 기본 컴포넌트
│   ├── saju/              # 사주 관련 컴포넌트
│   ├── membership/        # 멤버십 컴포넌트
│   ├── payment/           # 결제 컴포넌트
│   └── analysis/          # 분석 컴포넌트
│
├── lib/                    # 유틸리티
│   ├── supabase/          # Supabase 클라이언트
│   ├── saju.ts            # 사주 계산 로직
│   ├── gemini.ts          # Gemini AI 설정
│   ├── tosspayments.ts    # Toss Payments 설정
│   ├── animations.ts      # Framer Motion 설정
│   └── utils.ts           # 공통 유틸리티
│
├── docs/                   # 문서
│   ├── API_REFERENCE.md
│   ├── COMPONENT_GUIDE.md
│   ├── USER_GUIDE.md
│   └── DEVELOPER_ONBOARDING.md
│
├── supabase/              # Supabase 설정
│   └── migrations/        # DB 마이그레이션
│
├── public/                # 정적 파일
│   └── manifest.json      # PWA 매니페스트
│
└── tailwind.config.ts     # Tailwind 설정
```

---

## 7. 주요 기술 스택

| 분류 | 기술 |
|------|------|
| **프레임워크** | Next.js 15 (App Router) |
| **언어** | TypeScript |
| **스타일** | Tailwind CSS |
| **UI 컴포넌트** | shadcn/ui, Radix UI |
| **애니메이션** | Framer Motion |
| **차트** | Recharts |
| **데이터베이스** | Supabase (PostgreSQL) |
| **인증** | Supabase Auth |
| **AI** | Google Gemini 2.5 Flash |
| **결제** | Toss Payments |
| **사주 계산** | lunar-javascript |

---

## 8. 코딩 스타일

### TypeScript

- Strict 모드 사용
- 명시적 타입 선언 권장
- `any` 사용 최소화

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// Bad
function getUser(id: any): any {
  // ...
}
```

### 컴포넌트

- 함수형 컴포넌트 사용
- Props 인터페이스 정의
- `"use client"` 명시적 선언

```tsx
"use client";

interface Props {
  title: string;
  onClose: () => void;
}

export function MyComponent({ title, onClose }: Props) {
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onClose}>닫기</button>
    </div>
  );
}
```

### Server Actions

```typescript
"use server";

export async function myAction(formData: FormData) {
  // 인증 확인
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 로직 수행
  // ...

  // 리다이렉트 또는 결과 반환
  revalidatePath("/protected");
}
```

### CSS/Tailwind

- Tailwind 클래스 사용
- `cn()` 유틸리티로 조건부 클래스
- 커스텀 클래스는 `globals.css`에 정의

```tsx
import { cn } from "@/lib/utils";

<div className={cn(
  "p-4 rounded-sm",
  isActive && "bg-zen-gold text-white",
  disabled && "opacity-50 cursor-not-allowed"
)}>
  내용
</div>
```

---

## 9. Git 워크플로우

### 브랜치 전략

- `main`: 프로덕션
- `develop`: 개발 통합
- `feature/*`: 기능 개발
- `fix/*`: 버그 수정
- `hotfix/*`: 긴급 수정

### 커밋 컨벤션

```
type(scope): description

types:
- feat: 새로운 기능
- fix: 버그 수정
- docs: 문서 변경
- style: 코드 포맷팅
- refactor: 리팩토링
- test: 테스트 추가
- chore: 기타 변경

예시:
feat(saju): 대운 그래프 컴포넌트 추가
fix(payment): 결제 금액 검증 오류 수정
docs(api): API 문서 업데이트
```

### PR 가이드

1. 기능 브랜치 생성
2. 작업 완료 후 PR 생성
3. 코드 리뷰 요청
4. 승인 후 Merge

---

## 10. 배포 프로세스

### Vercel 배포

1. **GitHub 연동**
   - Vercel 대시보드에서 GitHub 저장소 연결
   - `main` 브랜치를 프로덕션으로 설정

2. **환경 변수 설정**
   - Vercel 대시보드 → Settings → Environment Variables
   - 모든 `.env.local` 변수 추가

3. **자동 배포**
   - `main` 브랜치에 푸시 → 자동 배포
   - PR 생성 → 프리뷰 배포

### 환경 변수 체크리스트

```
[ ] NEXT_PUBLIC_SUPABASE_URL
[ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
[ ] SUPABASE_SERVICE_ROLE_KEY
[ ] GOOGLE_GENERATIVE_AI_API_KEY
[ ] TOSS_CLIENT_KEY
[ ] TOSS_SECRET_KEY
[ ] NEXT_PUBLIC_APP_URL (프로덕션 URL)
```

### 배포 전 체크리스트

- [ ] 모든 테스트 통과
- [ ] `npm run build` 성공
- [ ] 환경 변수 설정 완료
- [ ] 데이터베이스 마이그레이션 완료
- [ ] API 키 프로덕션용으로 교체

---

## 11. 문제 해결

### 자주 발생하는 오류

#### "Module not found"

```bash
# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
```

#### "Supabase connection error"

- 환경 변수 확인
- Supabase 대시보드에서 프로젝트 상태 확인
- IP 허용 목록 확인

#### "Toss Payments error"

- 클라이언트/시크릿 키 일치 여부 확인
- 테스트/라이브 환경 구분
- 콜백 URL 설정 확인

#### "Build failed"

```bash
# 타입 오류 확인
npm run type-check

# 린트 오류 확인
npm run lint
```

---

## 12. 유용한 리소스

### 공식 문서

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Framer Motion](https://www.framer.com/motion)
- [Toss Payments](https://docs.tosspayments.com)

### 프로젝트 문서

- [API Reference](./API_REFERENCE.md)
- [Component Guide](./COMPONENT_GUIDE.md)
- [User Guide](./USER_GUIDE.md)
- [Design System](./DESIGN.md)

---

## 13. 연락처

질문이나 이슈가 있으면 연락해주세요:

- **기술 리드**: tech@haehwadang.com
- **Slack**: #haehwadang-dev
- **GitHub Issues**: 버그 리포트 및 기능 요청

---

**Welcome aboard!** 🎉
