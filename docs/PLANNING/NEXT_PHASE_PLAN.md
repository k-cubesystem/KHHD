# 다음 단계 계획 (Phase 7 이후)

**작성 일시**: 2026-02-04
**담당**: Claude Sonnet 4.5
**기반**: Phase 5-6 완료, MISSION_LOG Phase 32 완료

---

## 📊 현재 완료 상태

### ✅ 최근 완료된 Phase

#### Phase 5: History 페이지 UI 개선 (완료)
- Target 필터 컴포넌트
- 카테고리 탭 (8개 카테고리)
- 분석 카드 컴포넌트
- 상세 뷰 모달 (메모, 즐겨찾기, 공유, 삭제)

#### Phase 6: 분석 페이지 연동 (완료)
- 6개 분석 함수에 자동 저장 추가
  - 사주 (`analysis-actions.ts`)
  - 관상, 손금, 풍수, 오늘의운세 (`ai-saju.ts`)
  - 궁합 (`compatibility-actions.ts`)
- 재분석 기능 (Detail Modal)
- 일관된 데이터 구조 (`analysis_history`)

#### MISSION_LOG Phase 31-32 (완료)
- Destiny Targets 시스템 구축
- TargetSelector 실전 통합
- Helper 함수 분리

---

## 🎯 Phase 7: 통계 및 인사이트 대시보드

**목표**: 분석 히스토리 데이터를 활용한 통계 및 인사이트 제공

### Task 1: 분석 통계 대시보드 페이지
**파일**: `app/protected/history/stats/page.tsx` (신규)

**기능**:
1. **전체 통계 요약**:
   - 총 분석 횟수
   - 카테고리별 분석 비율 (차트)
   - 최다 분석 대상 (Target)
   - 평균 점수

2. **시간별 추세**:
   - 월별/주별 분석 횟수 그래프
   - 카테고리별 시간 추이
   - 점수 변화 추세

3. **Target별 통계**:
   - Target별 분석 횟수
   - Target별 평균 점수
   - 관계 유형별 분석 비율

**UI**:
- Grid 레이아웃 (2x2 or 3x2)
- Chart.js or Recharts 사용
- Midnight in Cheongdam 디자인 시스템

---

### Task 2: 통계 데이터 Server Actions
**파일**: `app/actions/analysis-stats.ts` (신규)

**함수 목록**:
```typescript
// 1. 전체 통계 조회
export async function getAnalysisStats(): Promise<{
  totalCount: number;
  categoryBreakdown: Record<AnalysisCategory, number>;
  averageScore: number;
  topTarget: { id: string; name: string; count: number };
}>

// 2. 월별 추세 데이터
export async function getMonthlyTrend(months: number = 6): Promise<{
  month: string;
  count: number;
  averageScore: number;
}[]>

// 3. Target별 통계
export async function getTargetStats(): Promise<{
  targetId: string;
  targetName: string;
  count: number;
  averageScore: number;
  categories: Record<AnalysisCategory, number>;
}[]>

// 4. 카테고리별 시간 추이
export async function getCategoryTrend(
  category: AnalysisCategory,
  days: number = 30
): Promise<{
  date: string;
  count: number;
  averageScore: number;
}[]>
```

**최적화**:
- `unstable_cache` 사용 (5분 캐싱)
- SQL View 또는 RPC 함수 활용
- 집계 쿼리 성능 최적화

---

### Task 3: 차트 컴포넌트
**파일**: `components/history/stats/` (신규 디렉토리)

**컴포넌트 목록**:
1. **`category-pie-chart.tsx`**: 카테고리별 비율 (파이 차트)
2. **`monthly-trend-chart.tsx`**: 월별 추세 (선 그래프)
3. **`target-bar-chart.tsx`**: Target별 분석 횟수 (바 차트)
4. **`score-history-chart.tsx`**: 점수 변화 추이 (영역 차트)

**라이브러리**: Recharts (React + D3.js)
- 반응형 차트
- Gold 색상 테마
- 애니메이션 효과

---

### Task 4: 인사이트 카드
**파일**: `components/history/stats/insight-card.tsx` (신규)

**기능**:
- AI 기반 인사이트 텍스트 생성
- 예시:
  - "이번 달은 관상 분석을 3번 받으셨어요. 지난 달보다 2배 증가했어요!"
  - "김철수님에 대한 분석이 가장 많아요. 평균 점수는 85점입니다."
  - "최근 30일간 점수가 5점 상승했어요! 좋은 기운이 흐르고 있어요."

**UI**:
- 아이콘 + 텍스트
- Gold 강조색
- 애니메이션 (순차 등장)

---

## 🚀 Phase 8: 알림 및 리텐션 시스템

**목표**: 사용자 참여도 향상 및 재방문 유도

### Task 1: 오늘의 운세 알림
**파일**: `app/api/cron/daily-fortune-notification/route.ts` (신규)

**기능**:
- 매일 아침 8시 오늘의 운세 푸시 알림
- Supabase Edge Functions + FCM 연동
- 구독자만 수신

---

### Task 2: 분석 리마인더
**파일**: `app/actions/reminder-actions.ts` (신규)

**기능**:
- 마지막 분석 후 7일 경과 시 알림
- "오래간만이에요! 최근 운세를 확인해보세요"
- 이메일 또는 푸시 알림

---

### Task 3: 즐겨찾기 분석 업데이트 알림
**기능**:
- 즐겨찾기한 분석의 재분석 제안
- "지난 달 저장하신 사주 분석을 다시 보시겠어요?"

---

## 🎨 Phase 9: UX 고도화

### Task 1: 분석 비교 기능
**파일**: `app/protected/history/compare/page.tsx` (신규)

**기능**:
- 2개 이상의 분석 결과 나란히 비교
- 점수 차이 시각화
- 변화 하이라이트

---

### Task 2: 분석 결과 PDF 다운로드
**파일**: `app/actions/export-pdf.ts` (신규)

**기능**:
- Analysis History → PDF 변환
- 예쁜 템플릿 (Midnight in Cheongdam 디자인)
- QR 코드 포함 (공유용)

---

### Task 3: 검색 기능
**파일**: `components/history/search-bar.tsx` (신규)

**기능**:
- Target 이름으로 검색
- 메모 내용으로 검색
- 날짜 범위 필터

---

## 📱 Phase 10: 소셜 기능

### Task 1: 분석 결과 공유 페이지
**파일**: `app/share/[analysisId]/page.tsx` (신규)

**기능**:
- 공개 링크로 분석 결과 공유
- OG 이미지 자동 생성
- 조회수 추적

---

### Task 2: 궁합 분석 초대 시스템
**파일**: `app/invite/compatibility/[code]/page.tsx` (신규)

**기능**:
- 초대 코드 생성
- 상대방 정보 입력
- 자동 궁합 분석

---

## 🔧 Phase 11: 시스템 최적화

### Task 1: 이미지 최적화
- Next.js Image 컴포넌트 전면 적용
- WebP 포맷 변환
- Lazy Loading

---

### Task 2: 성능 모니터링
- Vercel Analytics 연동
- 주요 페이지 로딩 시간 추적
- Lighthouse 점수 90+ 달성

---

### Task 3: 에러 모니터링
- Sentry 연동
- 에러 자동 리포팅
- 사용자 피드백 수집

---

## 📊 우선순위 매트릭스

### 높음 (즉시 착수)
1. **Phase 7: 통계 대시보드** - 사용자 인게이지먼트 핵심
2. **Phase 9 Task 3: 검색 기능** - History 페이지 필수 기능

### 중간 (2주 내)
3. **Phase 8: 알림 시스템** - 리텐션 향상
4. **Phase 9 Task 1: 분석 비교** - Premium 기능

### 낮음 (1개월 내)
5. **Phase 10: 소셜 기능** - 바이럴 마케팅
6. **Phase 11: 시스템 최적화** - 안정화

---

## 🎯 추천 다음 단계

### 즉시 시작 (Phase 7)
**통계 및 인사이트 대시보드**를 먼저 구현하는 것을 추천합니다.

**이유**:
1. 기존 `analysis_history` 데이터를 즉시 활용 가능
2. 사용자에게 가시적인 가치 제공 (분석 패턴 확인)
3. Premium 기능으로 차별화 가능
4. 구현 난이도 중간 (2-3일 작업)

**기대 효과**:
- 사용자 재방문율 증가
- 분석 결과의 지속적 관심 유도
- 데이터 기반 인사이트 제공

---

## 📝 Phase 7 상세 작업 계획

### Sprint 1: 데이터 레이어 (1일)
- [ ] `analysis-stats.ts` Server Actions 구현
- [ ] SQL 집계 쿼리 최적화
- [ ] 캐싱 전략 수립

### Sprint 2: UI 컴포넌트 (1일)
- [ ] 차트 컴포넌트 4개 구현
- [ ] 통계 카드 컴포넌트
- [ ] 인사이트 카드

### Sprint 3: 페이지 통합 (0.5일)
- [ ] Stats 페이지 레이아웃
- [ ] History 페이지에 "통계 보기" 버튼 추가
- [ ] 빌드 및 테스트

---

**총 예상 소요 시간**: 2.5일
**예상 코드 라인**: ~600 lines
**신규 파일**: 8개
**수정 파일**: 2개

---

## 🤔 사용자 확인 필요 사항

1. **Phase 7 (통계 대시보드)부터 시작**할까요?
2. 다른 우선순위가 있나요?
3. 특정 기능에 대한 요구사항이 있나요?

---

**문서 버전**: v1.0
**다음 업데이트**: Phase 7 완료 후
