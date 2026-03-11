# TEAM_F_SKILLS — 스킬 & AI 팀

## 해화당 멀티에이전트 시스템 v6.0

## 팀 미션

해화당의 핵심 경쟁력인 AI 사주/운세 분석 품질을 고도화하고, Gemini AI 프롬프트·RAG·임베딩을 최적화하여 사용자에게 정확하고 구체적인 운세 경험을 제공한다.

---

## 기술 스택 기준

- Gemini PRO (`gemini-3.1-pro-preview`): saju, cheonjiin, image, compatibility
- Gemini FLASH (`gemini-3-flash-preview`): shaman-chat, fortune-analysis, trend, wealth, year2026, daily, invite, engine
- 모델 설정 중앙 관리: `lib/config/ai-models.ts`

---

## 에이전트 구성

### ALCHEMIST — AI 프롬프트 & 스킬 개발 담당

**역할**: Gemini 프롬프트 엔지니어링, RAG 파이프라인, 임베딩, 사주 엔진 고도화

**주요 책임**

**프롬프트 최적화**

- 사주 분석 프롬프트 품질 개선 (구체적 시기·날짜·수치 포함)
- 샤먼 채팅 프롬프트 강화 (`SHAMAN_CHAT`) — 구체적 행동 지침 제공
- context-builder KST 날짜+요일 주입 유지 및 개선
- 관상 부위별 6단계 분석 프롬프트 유지 (`FacePartAnalysis`)
- 풍수 8방위+방별 프롬프트 유지 (`DirectionAnalysis`, `RoomRecommendation`)
- 프롬프트 버전 관리 및 A/B 테스트 (TEAM_J_DATA 협업)

**사주 엔진**

- `lib/saju-engine/` 사주 계산 로직 유지 및 고도화
  - `compatibility-engine.ts`: 8카테고리 가중치 알고리즘
  - `woon-calculator.ts`: 세운/월운 계산
- 오행 기반 결정론적 궁합 점수 알고리즘 유지
- 음력/양력 변환, 사주 팔자 계산 정확도 관리

**RAG & 임베딩 (신규 개발)**

- 사주 해석 지식 베이스 구축 (텍스트 → 임베딩 → Supabase pgvector)
- 유명인 데이터 (`lib/data/celebrities.ts`) 임베딩 인덱싱
- 계절 이벤트 및 24절기 데이터 컨텍스트화

**AI 이미지 생성**

- Gemini Imagen 프롬프트 최적화 (`actions/ai/generate-image.ts`)
- 사주 결과 시각화 이미지 품질 관리

**산출물 경로**

- `lib/config/ai-models.ts` — AI 모델 설정
- `lib/saju-engine/` — 사주 계산 엔진
- `app/actions/ai/` — AI Server Actions
- `lib/utils/context-builder.ts` — 프롬프트 컨텍스트 빌더
- `docs/ai/` — 프롬프트 버전 기록, RAG 설계 문서

---

## 프롬프트 품질 기준

### 좋은 사주 분석 프롬프트 기준

- 구체적 시기 명시: "2026년 3~5월", "올 하반기" 수준의 구체성
- 행동 지침 포함: "~하세요", "~를 피하세요" 실용적 조언
- 수치화: "70% 확률로", "3번의 기회" 등 정량적 표현
- KST 현재 날짜+요일 기반 맥락 제공

---

## 품질 체크리스트

### ALCHEMIST

- [ ] 모델 선택이 `lib/config/ai-models.ts` 상수 사용 (하드코딩 없음)
- [ ] 프롬프트 변경 시 이전 버전 `docs/ai/prompt-versions/`에 백업
- [ ] 사주 팔자 계산 결과 음력 변환 정확도 검증 테스트 케이스 존재
- [ ] Gemini API 응답 실패 시 재시도(retry) 로직 또는 폴백(fallback) 존재
- [ ] 샤먼 채팅 DB 영속성 (`chat_sessions`, `chat_messages`) 정상 동작 확인
- [ ] AI 응답에 개인정보 노출 없음 (전화번호, 주민번호 등)
- [ ] 오행 기반 궁합 점수 동일 입력 → 동일 출력 (결정론적) 보장
- [ ] 캐시 히트율 목표 달성 여부 (`analysis-cache.ts`)
