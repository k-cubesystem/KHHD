# 해화당 코딩 컨벤션

## TypeScript

- `strict: true` 필수 — `any` 사용 금지
- 타입은 `interface` 우선, 복합 유니온은 `type` 사용
- 서버 액션 반환 타입 명시: `Promise<{ success: boolean; data?: T; error?: string }>`

## 파일 구조

- **서버 액션**: `app/actions/{도메인}/{기능}.ts`
- **컴포넌트**: `components/{도메인}/{ComponentName}.tsx`
- **훅**: `hooks/use-{기능}.ts`
- **유틸**: `lib/utils/{기능}.ts`
- **타입**: `types/{도메인}.ts`

## UI / 스타일

- **기본 UI**: Shadcn/ui + Tailwind CSS transitions
- **분석 페이지 전용**: Framer Motion (`motion.div` 등)
- 다른 페이지에서 Framer Motion 신규 추가 금지
- 색상/간격은 Tailwind 클래스 사용, 인라인 style 최소화

## 주석

- **비즈니스 로직**: 한국어 주석 필수
- **함수 시그니처**: JSDoc 생략 가능하나 복잡한 경우 작성
- `// TODO:` 형식으로 미완성 항목 표시

## 에러 처리

- `try/catch` 블록에서 Sentry 캡처: `captureException(error)`
- `console.log` 단독 사용 금지 — Sentry 연동 또는 제거
- 사용자 노출 에러 메시지는 한국어

## AI 모델

- 모델명은 `lib/config/ai-models.ts` 상수에서 import
- 하드코딩 금지: `"gemini-3.1-pro-preview"` 직접 사용 금지

## 기타

- `console.log` 프로덕션 커밋 금지
- 환경변수는 `.env.local`에만 — 코드에 시크릿 하드코딩 금지
- Supabase 클라이언트: 서버는 `createServerClient`, 클라이언트는 `createBrowserClient`
