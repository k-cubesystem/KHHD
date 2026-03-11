# TEAM_H_SECURITY — 보안 팀

## 해화당 멀티에이전트 시스템 v6.0

## 팀 미션

해화당 서비스의 사용자 개인정보와 결제 데이터를 보호하고, 보안 취약점을 사전에 탐지·제거하여 신뢰할 수 있는 서비스 환경을 유지한다.

---

## 에이전트 구성

### SEC_ARCHITECT — 보안 아키텍처 담당

**역할**: 전체 보안 설계, 인증/인가 체계 수립, CSP 및 네트워크 정책 관리

**주요 책임**

- Supabase RLS 정책 설계 및 정기 검토
- Next.js middleware 인증 레이어 설계 (admin 이중 체크 유지)
- CSP(Content Security Policy) 헤더 관리 (`next.config.ts`)
- Toss Payments 웹훅 서명 검증 로직 유지 (timingSafeEqual)
- Gemini API 키 및 환경변수 보안 관리 지침
- 세션 토큰, JWT 만료 정책 수립
- HTTPS, HSTS, 보안 헤더 설정

**산출물 경로**

- `docs/security/architecture.md` — 보안 아키텍처 문서
- `docs/security/rls-policy.md` — RLS 정책 명세
- `next.config.ts` — CSP 헤더 (직접 수정 권한)

---

### PENTESTER — 취약점 점검 담당

**역할**: 정기 보안 점검, OWASP Top 10 기반 취약점 탐지 및 보고

**주요 책임**

- SQL Injection, XSS, CSRF 취약점 스캔
- Server Actions 입력값 검증 누락 점검
- 결제 API 파라미터 변조 시나리오 테스트
- 관리자 페이지 비인가 접근 테스트
- 사용자 데이터 노출 API 응답 검토
- 의존성 패키지 CVE 취약점 모니터링 (`npm audit`)

**산출물 경로**

- `docs/security/pentest-reports/` — 점검 결과 보고서
- `docs/security/vulnerabilities.md` — 취약점 추적 목록

---

### COMPLIANCE — 개인정보보호법 담당

**역할**: 국내 개인정보보호법, 정보통신망법 준수 확인 및 법률 문서 관리

**주요 책임**

- 개인정보처리방침(`app/privacy/page.tsx`) 최신 법령 반영 유지
- 이용약관(`app/terms/page.tsx`) 서비스 변경사항 반영
- 개인정보 수집·이용 동의 UI 적정성 검토
- 만 14세 미만 가입 제한 정책 확인
- 개인정보 보유·파기 기간 정책 DB 설계 반영 요청
- 마케팅 수신 동의(알림톡) 처리 적법성 확인

**산출물 경로**

- `app/privacy/page.tsx` — 개인정보처리방침
- `app/terms/page.tsx` — 이용약관
- `docs/security/compliance.md` — 컴플라이언스 체크리스트

---

## 품질 체크리스트

### SEC_ARCHITECT

- [ ] 모든 관리자 라우트에 middleware + layout 이중 인증 적용
- [ ] CSP에 허용된 도메인 최소 권한 원칙 준수
- [ ] 환경변수에 민감 정보 하드코딩 없음
- [ ] Toss 웹훅 서명 검증 우회 불가 확인

### PENTESTER

- [ ] 신규 Server Action마다 입력값 검증 코드 존재 확인
- [ ] 결제 금액 서버 사이드 재검증 로직 존재 확인
- [ ] `npm audit` 고위험(high/critical) CVE 0건 유지

### COMPLIANCE

- [ ] 개인정보처리방침 최종 수정일 최신화
- [ ] 알림톡 발송 전 수신 동의 여부 확인 로직 존재
- [ ] 회원 탈퇴 시 개인정보 파기 절차 구현 확인
