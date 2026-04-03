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

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:

- Product ideas, "is this worth building", brainstorming → invoke gstack-office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke gstack-investigate
- Ship, deploy, push, create PR → invoke gstack-ship
- QA, test the site, find bugs → invoke gstack-qa
- Code review, check my diff → invoke gstack-review
- Update docs after shipping → invoke gstack-document-release
- Weekly retro → invoke gstack-retro
- Design system, brand → invoke gstack-design-consultation
- Visual audit, design polish → invoke gstack-design-review
- Architecture review → invoke gstack-plan-eng-review

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that does not match DESIGN.md.
