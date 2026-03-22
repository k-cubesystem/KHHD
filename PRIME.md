# PRIME — 4중 프로토콜

## 1. ZERO-LATENCY (TEAM_B, TEAM_C)
- Optimistic UI: 상태 변경 즉시 클라이언트 선반영
- Upload First: 파일 선택 즉시 백그라운드 업로드
- Background Submit: 오래 걸리는 작업 Toast/Progress 처리
- Presigned URL: 대용량 파일 직행
- Client Compress: 이미지 WebP/AVIF 압축 후 전송

## 2. COMMERCIALIZATION (TEAM_C, TEAM_D)
- Observability: 모든 에러 Sentry 추적 (console.log 단독 금지)
- Actionable Data: 주요 이벤트 GA4 트래킹
- Cost Efficiency: 캐싱 필수 (unstable_cache, React Query)

## 3. SECURITY BY DESIGN (TEAM_H)
- Gate 1 설계: 위협 모델링 + 보안 NFR
- Gate 2 개발: 보안 코드 리뷰
- Gate 3 배포 전: OWASP Top 10 점검
- Gate 4 프로덕션: TEAM_H 최종 승인

## 4. CODE QUALITY (TEAM_I)
- SRP: 함수/컴포넌트 단일 책임
- DRY: 중복 코드 제거
- Type Safety: any 금지
- Test: 비즈니스 로직 80% 커버리지
- Debt Tracking: 기술 부채 등록 및 상환

## 흐름
```
요청 → 설계(G) → 보안검토(H) → 개발(B+C) → 리뷰(I) → 보안게이트(H) → 배포(D)
```
