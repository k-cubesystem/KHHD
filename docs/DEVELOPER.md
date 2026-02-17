# 개발자 가이드 — 해화당

---

## 1. 환경 설정

### 요구사항

- Node.js 18+
- npm 9+

### 설치

```bash
git clone https://github.com/pdkno1-cube/HHD.git
cd HHD
npm install
```

### 환경 변수 (`.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key

# Toss Payments
TOSS_CLIENT_KEY=your-client-key
TOSS_SECRET_KEY=your-secret-key
```

### 개발 서버 실행

```bash
npm run dev
```

---

## 2. 코드 규칙

### 레이어 구조

```
UI 컴포넌트 (components/)
    ↓ props/events
Server Actions (app/actions/)
    ↓ 비즈니스 로직
Domain (lib/domain/)   +   Services (lib/services/)
    ↓
Database (Supabase)
```

**금지사항**:

- 컴포넌트에서 직접 DB 쿼리
- Server Action에 UI 로직 혼재
- `any` 타입 사용

### Server Action 패턴

```typescript
'use server'

export async function myAction(data: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인 필요' }

  const { error } = await supabase.from('table').insert({ ... })
  if (error) return { success: false, error: error.message }

  return { success: true }
}
```

### 컴포넌트 패턴

```typescript
// Client Component
'use client'

export function MyComponent({ data }: { data: SomeType }) {
  const [state, setState] = useState<SomeType | null>(null)
  // ...
}
```

---

## 3. 주요 API

### 사주 분석

```typescript
import { analyzeSajuDetail } from '@/app/actions/ai-saju'

const result = await analyzeSajuDetail({
  name,
  gender,
  birthDate,
  birthTime,
  calendarType,
})
// 반환: { success, coreCharacter, fiveElements, detailedAnalysis, error }
```

### 복채 처리

```typescript
import { getWalletBalance, deductWallet } from '@/app/actions/wallet-actions'

const balance = await getWalletBalance(userId)
const result = await deductWallet(userId, amount, description)
```

### 분석 기록 저장

```typescript
import { saveAnalysisHistory } from '@/app/actions/analysis-history'

await saveAnalysisHistory({
  userId,
  targetName,
  category: 'SAJU',
  resultJson: analysisResult,
  talismanCost: 1,
})
```

---

## 4. 컴포넌트 레퍼런스

### 핵심 UI 컴포넌트 (`components/ui/`)

| 컴포넌트   | 용도                                  |
| ---------- | ------------------------------------- |
| `Card`     | 카드 레이아웃                         |
| `Button`   | 버튼 (variant: default/outline/ghost) |
| `Sheet`    | 모바일 하단 시트                      |
| `Dialog`   | 모달 다이얼로그                       |
| `Skeleton` | 로딩 스켈레톤                         |
| `Sonner`   | 토스트 알림                           |

### 분석 컴포넌트 (`components/analysis/`)

| 컴포넌트                                   | 용도                            |
| ------------------------------------------ | ------------------------------- |
| `AnalysisDashboard`                        | 분석 결과 대시보드              |
| `CheonjiinSummary`                         | 천지인 요약 (compact 모드 지원) |
| `CheonSection` / `JiSection` / `InSection` | 천지인 세부 섹션                |

---

## 5. 클린 코드 규칙

### 금지

- 사용하지 않는 import
- 하드코딩된 문자열 (상수로 추출)
- 500줄 이상의 컴포넌트 파일
- `console.log` (디버깅 후 반드시 제거)

### 권장

- 컴포넌트당 단일 책임
- 재사용 가능한 로직은 `lib/utils/`로 추출
- 에러 바운더리 적용
- Suspense + 스켈레톤 로딩

---

## 6. 테스트 & 배포

```bash
# 타입 체크
npm run type-check

# 린트
npm run lint

# 빌드
npm run build

# Supabase 마이그레이션 적용
# → Supabase Dashboard > SQL Editor에서 직접 실행
```

**배포**: main 브랜치 push 시 Vercel 자동 배포
