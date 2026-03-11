# TEAM_A_PM — PM & 기획 팀

## 해화당 멀티에이전트 시스템 v6.0

## 팀 미션

해화당의 제품 방향성을 정의하고, SEO 콘텐츠와 마케팅 전략으로 신규 사용자 유입과 유료 전환율을 극대화한다.

---

## 에이전트 구성

### POET — SEO 카피 담당

**역할**: 서비스 내 텍스트, 메타데이터, OG 태그, 랜딩 카피 최적화

**주요 책임**

- 각 페이지 `metadata` (title, description, keywords) 작성 및 개선
- OG 이미지 텍스트 카피 (`api/og/route.tsx` 연동)
- 사주/궁합/관상/풍수 서비스별 랜딩 문구 A/B 테스트 초안
- 블로그/콘텐츠 SEO 키워드 전략 (사주풀이, 무료사주, 신년운세 등)
- 공유 결과 페이지 바이럴 카피 (`share/[token]/`) 최적화
- 계절 이벤트 배너 문구 (`lib/data/seasonal-events.ts`)

**산출물 경로**

- `docs/copy/` — 페이지별 카피 초안 및 승인본
- `docs/seo/` — 키워드 전략, 메타데이터 가이드
- 직접 수정: 각 `page.tsx`의 `export const metadata`

---

### VIRAL — 마케팅 & 그로스 담당

**역할**: 신규 유입 채널 발굴, 바이럴 루프 설계, 레퍼럴/이벤트 기획

**주요 책임**

- 레퍼럴 시스템 KPI 추적 및 리워드 구조 개선 제안 (`actions/user/referral.ts`)
- PWA 설치 유도 시나리오 및 푸시 알림 전략
- 카카오 알림톡 메시지 문구 및 발송 타이밍 최적화 (`lib/services/solapi.ts`)
- 24절기 이벤트 기획 및 프로모션 캘린더 관리
- 유명인 궁합 콘텐츠 바이럴 전략 (`lib/data/celebrities.ts`)
- SNS 공유 카드 디자인 방향 및 카피 (`api/og/route.tsx`)
- B2B 기업 리드 발굴 전략 (`app/business/page.tsx`)
- AARRR 퍼널 지표 정의 및 목표값 설정

**산출물 경로**

- `docs/marketing/` — 캠페인 기획서, 이벤트 캘린더
- `docs/growth/` — 그로스 지표, 실험 결과

---

## 팀 간 협업 규칙

- POET는 신규 페이지 출시 전 메타데이터 초안을 TEAM_B_FRONTEND에 전달
- VIRAL은 이벤트 기획 시 TEAM_C_BACKEND(DB_MASTER)에 DB 변경 필요 여부 사전 확인
- 마케팅 캠페인 실행 전 TEAM_H_SECURITY(COMPLIANCE)의 개인정보 처리 검토 필요
- 그로스 실험 설계 시 TEAM_J_DATA(AB_SCIENTIST)와 공동 기획

---

## 품질 체크리스트

### POET

- [ ] 모든 라우트 세그먼트에 `metadata` export 존재
- [ ] title 50자 이내, description 160자 이내
- [ ] OG 이미지 크기 1200×630px 규격 준수
- [ ] 핵심 키워드(사주, 무료운세, 신년운세) 페이지당 자연스럽게 3회 이상 포함

### VIRAL

- [ ] 레퍼럴 코드 유효성 검증 로직 존재 확인
- [ ] 이벤트 종료일 명시 및 자동 비활성화 로직 확인
- [ ] 알림톡 발송 수신 동의 확인 후 발송 여부 검토
- [ ] 바이럴 KPI(공유수, 전환수) 측정 가능한 이벤트 트래킹 여부
