# AI 가이드 — 해화당

---

## 1. Gemini API

### 설정

| 항목     | 값                             |
| -------- | ------------------------------ |
| 모델     | `gemini-2.0-flash` (기본)      |
| 환경변수 | `GOOGLE_GENERATIVE_AI_API_KEY` |
| SDK      | `@google/generative-ai`        |

### Rate Limiter (Token Bucket)

파일: `lib/services/gemini-rate-limiter.ts`

```typescript
// DB 기반 토큰 버킷 (gemini_token_bucket 테이블)
// 기본: 15 req/min
// acquire_gemini_token() RPC → 허용/거부
// log_gemini_usage() RPC → 사용량 기록
```

**중요**: 모든 Gemini 호출 전 `acquireGeminiToken()` 체크 필수.

### 사용 패턴

```typescript
import { generateContent } from '@/lib/services/gemini'

const result = await generateContent({
  model: 'gemini-2.0-flash',
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  systemInstruction: systemPrompt,
})
```

### 이미지 분석 (멀티모달)

```typescript
// Base64 이미지를 parts에 추가
parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }]
```

---

## 2. AI 프롬프트 관리

**저장 위치**: Supabase `ai_prompts` 테이블 (관리자 편집 가능)

**주요 프롬프트 키**:
| key | 용도 | 비용 |
|-----|------|------|
| `shaman_chat` | AI 신당 채팅 | 1복채 |
| `saju_analysis` | 사주 정밀 분석 | 1복채 |
| `cheonjiin_analysis` | 천지인 분석 | 5복채 |
| `compatibility` | 궁합 분석 | 1복채 |
| `face_analysis` | 관상 분석 | 2복채 |
| `palm_analysis` | 손금 분석 | 2복채 |
| `fengshui_analysis` | 풍수 분석 | 2복채 |

**프롬프트 변수 치환**: `lib/utils/prompt-variables.ts`

```typescript
// {{name}}, {{birth_date}}, {{gender}}, {{context}} 등 변수 지원
const filled = fillPromptVariables(template, { name: "홍길동", ... })
```

---

## 3. Claude 작업 가이드

### 역할

Claude는 해화당의 **UI/UX 및 프론트엔드 전문 AI**.

### 작업 원칙

1. **읽기 우선**: 코드 수정 전 반드시 파일 읽기
2. **최소 변경**: 요청된 것만 수정, 불필요한 리팩토링 금지
3. **디자인 준수**: `docs/DESIGN.md` 기준 엄수
4. **한국어**: 모든 소통 및 주석은 한국어

### 프로젝트 규칙 (`PROJECT_RULES.md` 요약)

- **레이어 분리**: UI 컴포넌트에 비즈니스 로직 넣지 말 것
- **Server Actions**: `'use server'` 파일에서만 DB/AI 호출
- **에러 처리**: `{ success, error }` 패턴 사용
- **타입 안전성**: `any` 사용 금지, 명시적 타입 정의

### 주요 파일 위치

| 목적                     | 경로                           |
| ------------------------ | ------------------------------ |
| 사주 도메인 로직         | `lib/domain/saju/`             |
| 궁합 도메인 로직         | `lib/domain/compatibility/`    |
| Gemini 서비스            | `lib/services/gemini.ts`       |
| TossPayments             | `lib/services/tosspayments.ts` |
| Supabase 서버 클라이언트 | `lib/supabase/server.ts`       |
| 관리자 클라이언트        | `lib/supabase/admin.ts`        |
