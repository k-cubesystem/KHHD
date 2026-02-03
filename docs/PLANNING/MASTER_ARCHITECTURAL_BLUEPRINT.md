# 해화당(海花堂) 마스터 아키텍처 블루프린트: 운명 관리 통합 플랫폼

## 1. 프로젝트 비전 및 철학
*   **Vision**: 단순한 점술 도구(Tool)를 넘어, 개인의 운명을 기록, 분석, 처방하는 **"Life Destiny Management Platform"**으로 진화.
*   **Core Value**: **연결(Connection)**. 사주(시간), 관상(인물), 풍수(공간)는 별개의 미신이 아니라, 사용자의 삶을 구성하는 유기적인 데이터셋이다.

---

## 2. 데이터 아키텍처 (Data Architecture) - 가장 중요!
현재의 파편화된 구조(`users`, `family_members`, 개별 로그)를 통합하여 확장성을 확보합니다. 추후 작명, 타로 등이 추가되어도 DB를 뜯어고치지 않도록 설계합니다.

### 2.1. 통합 운명 객체 (Universal Destiny Entity)
모든 분석의 대상은 `users`가 아닙니다. **`destiny_targets`**입니다.
*   **`destiny_targets` Table**:
    *   `id` (UUID): 고유 식별자
    *   `owner_id` (FK): 관리자(실제 앱 가입자)
    *   `relation_type`: 본인, 가족, 연인, 친구, 비즈니스 파트너
    *   `name`, `gender`
    *   `birth_data`: { date, time, calendar_type, is_leap } (사주용 Core)
    *   `face_data_id` (FK): 관상 분석 결과 링크 (최신)
    *   `space_data_id` (FK): 거주지 풍수 분석 결과 링크
    *   `tags`: ["결혼적령기", "사업가", "수험생"] (AI가 분석 후 자동 태깅 -> 마케팅 타겟팅용)

### 2.2. 분석 아카이브 (Analysis Archive)
사용자가 확인한 모든 결과는 휘발되지 않고 기록되어야 합니다. "저번 주에 본 궁합 다시 보여줘"가 가능해야 합니다.
*   **`analysis_history` Table**:
    *   `target_id` (FK): 누구의 운세인가?
    *   `category`: 'SAJU', 'FACE', 'FENGSHUI', 'COMPATIBILITY'
    *   `context_mode`: 'WEALTH'(재물), 'LOVE'(연애), 'HEALTH'(건강)
    *   `result_json`: AI 분석 결과 원본 (Version 관리)
    *   `user_memo`: 사용자가 결과에 대해 남긴 메모 (일기장 기능)

---

## 3. 서비스 기능 고도화 (Service Evolution)

### 3.1. 동적 인과관계 분석 (Dynamic Causality)
사주 하나만 보는 게 아니라, 다른 데이터가 있으면 **가산점/감점** 로직을 적용합니다.
*   **시나리오**: 사주에 '물(水)'이 부족함 -> (시스템 체크) -> 풍수 데이터에 '어항' 정보 없음 -> **"경고: 사주 보완이 시급합니다"** 리포트 발행.
*   **구현**: 각 분석 엔진이 `DestinyTarget`의 모든 메타데이터를 참조하도록 로직 개선.

### 3.2. 생애주기 기반 알림 (Lifecycle Notification)
단순한 "오늘의 운세" 푸시가 아닙니다. DB에 저장된 사주를 서버가 매일 배치(Batch)로 돌려서 **트리거**를 찾습니다.
*   **예**: 사용자의 사주에서 '도화살'이 들어오는 날 -> 전날 밤 푸시 알림: **"내일 매력지수가 폭발합니다. 중요한 약속을 잡으세요."**
*   **설계**: `system_scheduler`가 매일 00시에 `active_targets`의 일운(日運)을 계산하여 `notification_queue`에 적재.

### 3.3. 쇼핑몰 연동 (E-commerce Integration)
분석은 결국 **'처방'**으로 이어져야 돈이 됩니다.
*   **풍수**: "서쪽 벽이 허전하네요" -> **"해화당 특제 액막이 그림 (구매 링크)"** 추천.
*   **관상**: "눈썹 사이가 좁습니다" -> **"미간 트임 제모/화장법 가이드 (콘텐츠 결제)"**.
*   **구조**: `products` 테이블과 `analysis_results`를 매핑하는 `recommendation_rules` 테이블 필요.

---

## 4. 관리자 시스템 (The Control Tower)
개발자 개입 없이 운영진이 서비스를 쥐락펴락할 수 있어야 합니다.

### 4.1. CMS (Content Management System)
*   운세 텍스트 템플릿, AI 프롬프트, 추천 상품 링크 등을 관리자가 웹에서 직접 수정.
*   **Version Control**: 프롬프트 수정 전/후의 버전을 기록하여, 어떤 프롬프트가 사용자 반응(좋아요/결제)이 좋았는지 A/B 테스트 지원.

### 4.2. 블랙리스트 및 악성 유저 관리
*   과도한 API 호출이나 매크로 의심 유저 자동 차단.
*   특정 유저 CS 대응을 위한 **"관리자 모드 접속"** (해당 유저의 뷰를 그대로 보는 기능).

---

## 5. 단계별 로드맵 (Execution Phases)

### Phase 1: 기반 통합 (The Foundation)
*   [ ] **DB 마이그레이션**: `users` + `family` -> `destiny_targets` 구조로 개념적 통합 (뷰 생성부터 시작).
*   [ ] **API 게이트웨이화**: 모든 분석 요청을 `AnalyzeController` 하나로 통합 (Input: TargetID + Mode).
*   [ ] **어드민 기초**: `Feature Flag` (기능 On/Off), `Pricing Config` (가격 설정) 껍데기 구현.

### Phase 2: 연결과 확장 (Connection)
*   [ ] **Cross-Analysis 엔진**: 사주+관상, 사주+풍수 결합 분석 로직 구현.
*   [ ] **인명부 UI**: 프로필 페이지를 '운명 대시보드'로 전면 개편.
*   [ ] **알림 엔진**: 사주 알고리즘 기반 자동 푸시 알림 시스템 구축.

### Phase 3: 수익화 및 생태계 (Monetization)
*   [ ] **Teaser 결제 모델**: "결론은 무료, 이유는 유료" UI/UX 전면 적용.
*   [ ] **커머스 연동**: 분석 결과 내 상품 추천 슬롯 활성화.
*   [ ] **글로벌 지원**: 다국어(i18n) DB 필드 확장 및 타임존(Timezone) 로직 정교화.

---

## 6. 결론
이 블루프린트는 해화당을 단순 앱에서 **플랫폼**으로 격상시키는 설계입니다. 개발량이 적지 않지만, Phase 1 단계에서 데이터 구조(`DestinyTarget`)만 확실히 잡아두면 Phase 2, 3는 블록 쌓기처럼 안정적으로 진행될 것입니다.

**Action Item**:
1. 위 로드맵에 동의하신다면, **Phase 1의 DB 스키마 설계**부터 착수하겠습니다.
2. 현재 운영 중인 서비스에 영향을 최소화하기 위해, 신규 테이블을 만들고 데이터를 미러링(Mirroring)하는 전략을 제안합니다.
