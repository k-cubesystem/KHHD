# 해화당 — 사주/궁합/관상/풍수 AI SaaS

## 스택
Next.js 16 + TypeScript strict + Tailwind + Shadcn/ui + Supabase (RLS) + Gemini AI + Toss Payments + Sentry + GA4
AI 모델: PRO(gemini-3.1-pro-preview) / FLASH(gemini-3-flash-preview)

## 명령어
```
npm run dev | build | test | e2e | lint
```

## 슬래시 명령어
/design /build /review /security /data /docs /status

## 4중 프로토콜 (모든 코드에 자동 적용)
1. **ZERO-LATENCY**: Optimistic UI, Upload First, Background Submit, Client Compress
2. **COMMERCIALIZATION**: Sentry 에러 추적, GA4 이벤트, 캐싱 필수
3. **SECURITY**: 설계→보안검토→개발→리뷰→보안게이트→배포
4. **CODE QUALITY**: SRP, DRY, any 금지, console.log 단독 금지

## 절대 원칙
- any 타입 금지 → unknown + 타입 가드
- console.log 단독 에러 처리 금지 → logger 사용
- 작업 완료 시 MEMORY/MEMORY.md 업데이트

## 복채 시스템
SINGLE 10만/일 | FAMILY 30만/일 | BUSINESS 100만/일

## 에이전트 (필요 시에만 참조)
상세 → PRIME.md (프로토콜) / AGENTS.md (팀 구조)
