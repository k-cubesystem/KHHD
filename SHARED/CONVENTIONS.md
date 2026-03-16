# 📏 SHARED — 공통 코딩 규약 v4.1

> 모든 팀 에이전트가 반드시 준수하는 실전 코딩 표준입니다.
> 관리: TEAM_I_REVIEW | 최종 수정: 2026.02.25

---

## 1. 네이밍 규칙

```
변수/함수:      camelCase          getUserData, handleSubmit
클래스/컴포넌트: PascalCase         UserProfile, AuthService
상수:           UPPER_SNAKE_CASE   MAX_RETRY_COUNT, API_BASE_URL
파일(일반):     kebab-case         user-service.ts, auth-utils.ts
파일(컴포넌트): PascalCase.tsx     UserCard.tsx, LoginForm.tsx
훅(Hook):       use + PascalCase   useUserData, useAuthState
타입/인터페이스: PascalCase        UserType, ApiResponse<T>
Enum:           PascalCase         UserRole.ADMIN, Status.ACTIVE
```

### 좋은 이름 vs 나쁜 이름
```ts
// ❌ 나쁜 이름
const d = new Date()
const arr = users.filter(u => u.a === true)
function fn(x: any) { ... }

// ✅ 좋은 이름
const currentDate = new Date()
const activeUsers = users.filter(user => user.isActive === true)
function validateEmail(email: string): boolean { ... }
```

---

## 2. 타입스크립트 규칙

```ts
// ❌ 금지
const data: any = fetchUser()
function getUser(id): any { ... }

// ✅ 필수
const data: UserType = fetchUser()
function getUser(id: string): Promise<UserType | null> { ... }

// ✅ API 응답 표준 형식
type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: string | null
  code?: string       // 에러 코드 (예: "AUTH_001")
}

// ✅ 환경변수 타입 안전 접근
const apiKey = process.env.NEXT_PUBLIC_API_KEY
if (!apiKey) throw new Error('NEXT_PUBLIC_API_KEY is not defined')
```

---

## 3. 에러 처리 규칙 (PRIME 프로토콜)

```ts
// ❌ 절대 금지 — console.log 단독 처리
try {
  await fetchData()
} catch (error) {
  console.log(error)  // 사라지는 로그, 추적 불가
}

// ❌ 금지 — 에러 삼키기
try {
  await fetchData()
} catch { /* 무시 */ }

// ✅ 올바른 에러 처리
import * as Sentry from '@sentry/nextjs'

try {
  await fetchData()
} catch (error) {
  // 1. 구조화된 로깅
  console.error('[fetchData]', { error, context: { userId, action } })
  // 2. 모니터링 도구 전송
  Sentry.captureException(error, { extra: { userId, action } })
  // 3. 사용자 피드백
  toast.error('데이터를 불러오지 못했습니다. 다시 시도해주세요.')
  // 4. 필요 시 재시도 또는 fallback
  return null
}
```

---

## 4. 비동기 처리 규칙

```ts
// ❌ 금지 — Promise 체인 (가독성 저하)
fetchUser().then(user => {
  return fetchPosts(user.id)
}).then(posts => {
  setPosts(posts)
}).catch(err => console.log(err))

// ✅ async/await 사용
const loadUserPosts = async (userId: string) => {
  try {
    const user = await fetchUser(userId)
    const posts = await fetchPosts(user.id)
    setPosts(posts)
  } catch (error) {
    Sentry.captureException(error)
    toast.error('게시물을 불러오지 못했습니다.')
  }
}

// ✅ 병렬 처리 (순서 의존성 없을 때)
const [user, settings] = await Promise.all([
  fetchUser(userId),
  fetchUserSettings(userId)
])
```

---

## 5. React 컴포넌트 규칙

```tsx
// ✅ 컴포넌트 구조 표준
interface UserCardProps {
  userId: string
  onDelete?: (id: string) => void
  className?: string
}

export function UserCard({ userId, onDelete, className }: UserCardProps) {
  // 1. 훅 (최상단)
  const { data: user, isLoading } = useUser(userId)
  const { mutate: deleteUser } = useDeleteUser()

  // 2. 파생 상태
  const displayName = user?.name ?? '이름 없음'

  // 3. 이벤트 핸들러
  const handleDelete = useCallback(() => {
    deleteUser(userId, {
      onSuccess: () => onDelete?.(userId)
    })
  }, [userId, deleteUser, onDelete])

  // 4. 조기 반환 (Early Return)
  if (isLoading) return <UserCardSkeleton />
  if (!user) return null

  // 5. 렌더
  return (
    <div className={cn('p-4 rounded-lg', className)}>
      <p>{displayName}</p>
      {onDelete && (
        <button onClick={handleDelete}>삭제</button>
      )}
    </div>
  )
}
```

---

## 6. API 라우트 규칙 (Next.js)

```ts
// ✅ API 라우트 표준 구조
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 입력값 스키마 (항상 검증)
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(50),
})

export async function POST(req: NextRequest) {
  try {
    // 1. 인증 확인
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, data: null, error: '인증이 필요합니다', code: 'AUTH_001' },
        { status: 401 }
      )
    }

    // 2. 입력값 검증
    const body = await req.json()
    const parsed = CreateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: '잘못된 요청입니다', code: 'VALID_001' },
        { status: 400 }
      )
    }

    // 3. 비즈니스 로직
    const user = await createUser(parsed.data)

    // 4. 성공 응답
    return NextResponse.json({ success: true, data: user, error: null }, { status: 201 })

  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json(
      { success: false, data: null, error: '서버 오류가 발생했습니다', code: 'SERVER_001' },
      { status: 500 }
    )
  }
}
```

---

## 7. 커밋 메시지 규칙

```
형식: [타입]([팀코드]): [내용]

타입:
  feat     새 기능 추가
  fix      버그 수정
  refactor 리팩토링 (기능 변경 없음)
  style    코드 스타일 변경 (포맷, 세미콜론 등)
  test     테스트 추가/수정
  docs     문서 변경
  perf     성능 개선
  security 보안 수정
  chore    빌드, 설정 변경

예시:
  feat(TEAM_B): 로그인 페이지 Google 소셜 로그인 추가
  fix(TEAM_C): 사용자 조회 API null 포인터 예외 처리
  security(TEAM_H): JWT 토큰 만료 시간 15분으로 단축
  refactor(TEAM_I): UserService 단일 책임 원칙 적용
  perf(TEAM_B): ProductList 가상 스크롤 적용 (10,000개 렌더 최적화)
```

---

## 8. 테스트 규칙

```ts
// 파일 위치: [대상파일].test.ts 또는 __tests__/[대상파일].test.ts

// ✅ 테스트 구조 (AAA 패턴)
describe('UserService', () => {
  describe('createUser', () => {
    it('유효한 데이터로 사용자를 생성한다', async () => {
      // Arrange (준비)
      const userData = { email: 'test@example.com', name: '테스트' }

      // Act (실행)
      const result = await UserService.createUser(userData)

      // Assert (검증)
      expect(result.success).toBe(true)
      expect(result.data?.email).toBe(userData.email)
    })

    it('중복 이메일로 생성 시 에러를 반환한다', async () => {
      // ...
    })
  })
})

// ✅ 커버리지 목표
// 비즈니스 로직(services/): 80% 이상
// API 라우트: 70% 이상
// 유틸함수(utils/): 90% 이상
// UI 컴포넌트: 50% 이상 (중요 컴포넌트 우선)
```

---

## 9. 환경변수 & 보안 규칙

```bash
# .env.example (커밋 O — 실제 값 없이 키만)
DATABASE_URL=
NEXTAUTH_SECRET=
NEXT_PUBLIC_GA_ID=

# .env.local (커밋 X — 실제 값)
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=실제값

# ❌ 절대 금지
const API_KEY = "sk-abc123..."  # 코드에 하드코딩

# ✅ 올바른 방법
const API_KEY = process.env.API_KEY
if (!API_KEY) throw new Error('API_KEY env var is required')
```

---

## 10. 폴더 구조 규칙

```
src/
├── app/                 ← Next.js App Router 페이지
│   ├── (auth)/         ← Route Group (인증 필요)
│   ├── api/            ← API Routes
│   └── layout.tsx
│
├── components/
│   ├── ui/             ← 재사용 가능한 기본 UI (Button, Input 등)
│   ├── features/       ← 기능별 컴포넌트 (UserCard, ProductList 등)
│   └── layouts/        ← 레이아웃 컴포넌트
│
├── hooks/              ← Custom React Hooks
├── services/           ← 비즈니스 로직 (API 호출 추상화)
├── store/              ← Zustand 상태 관리
├── types/              ← TypeScript 타입 정의
├── utils/              ← 순수 유틸리티 함수
├── lib/                ← 외부 라이브러리 설정 (auth, db 등)
└── constants/          ← 상수 정의
```

---

*버전: v4.1 | 관리: TEAM_I_REVIEW | 최종 수정: 2026.02.25*
