# 📜 작업 지시서: 운세 분석 및 이벤트 페이지 구축

**수신**: Claude (Development Team)
**발신**: Gemini (Lead Architect)
**날짜**: 2026-02-12
**우선순위**: 높음 (High)

---

## 1. 개요 (Overview)

현재 `/protected/analysis` (분석 허브) 페이지에 존재하는 진입점들을 실제 기능을 갖춘 상세 페이지로 연결하고, **2026년 병오년(Red Horse) 특별 운세 이벤트**를 신설합니다.

## 2. 작업 대상 목록

1.  **운세 캘린더** (`/protected/analysis/fortune`) - 기능 고도화
2.  **2026년 병오년 운세 이벤트** (`/protected/events/2026-byeong-o`) - **신규 생성**
3.  **테마별 운세** (재물/애정/직장 등) - 동적 페이지 라우팅 구현

---

## 3. 상세 기획 및 설계 (Detailed Specifications)

### A. 운세 캘린더 (Fortune Calendar)

- **경로**: `/protected/analysis/fortune`
- **목적**: 사용자가 월별/일별 운세의 흐름을 달력 형태로 한눈에 파악하고 관리.
- **주요 기능**:
  - **Tab UI**: [오늘] / [주간] / [월간] 3단계 뷰 제공.
  - **Calendar View**:
    - 월간 뷰: 달력 그리드에 매일의 운세 점수(Five Elements Color or Icon) 표시.
    - 길일(Lucky Day) 하이라이트 효과 (Gold Glow).
  - **Detailed Modal/Sheet**: 날짜 클릭 시 해당 일의 상세 운세 (시간대별 운세, 행운의 색/방향) 표시.
- **데이터 연동**:
  - `lunar-javascript` 라이브러리를 활용한 만세력 산출.
  - Supabase DB에 사용자 일주(Day Pillar) 정보 연동.

### B. 2026년 병오년 운세 이벤트 (Byeong-O Year Special)

- **경로**: `/protected/events/2026-byeong-o`
- **컨셉**: **"붉은 말의 역동적인 에너지"**
  - Primary Color: Red (`#E53935`) & Gold (`#D4AF37`)
  - Mood: 강렬함, 속도감, 변화, 기회.
- **UI 구성**:
  1.  **Intro Section**:
      - "2026년 병오년, 당신의 질주가 시작됩니다." 타이틀.
      - 역동적인 붉은 말 배경/애니메이션 (Canvas/Video).
  2.  **Saju Matching**:
      - 사용자의 사주(일간)와 병오년(병화+오화)의 오행 관계 분석.
      - 예: "당신은 '큰 물(임수)'이라 뜨거운 병오년과 만나 [수화기제]의 대박 운세입니다!"
  3.  **Keywords**:
      - #재물폭발 #이직성공 #연애주의 등 핵심 키워드 3개 추출.
  4.  **Action**:
      - "지금 상세 분석장 구매하기" (또는 무료 체험).

### C. 테마별 트렌드 (Themes)

- **경로**: `/protected/analysis/theme/[type]` (Dynamic Route)
- **Types**: `wealth` (재물), `love` (애정), `career` (직장), `exam` (학업), `estate` (부동산)
- **기능**:
  - 각 트렌드 카드 클릭 시 해당 타입의 상세 운세 페이지로 이동.
  - 단순 운세 텍스트가 아닌, **구체적 지표** 제공 (예: 재물운 -> 금전 흐름 그래프).

---

## 4. Claude 작업 지시 (Work Order)

**To Claude:**
위 설계를 바탕으로 다음 순서대로 작업을 진행해 주십시오.

1.  **`2026-byeong-o` 이벤트 페이지 생성**
    - `app/protected/events/2026-byeong-o/page.tsx` 생성.
    - 강렬한 Red/Gold 테마의 UI 구현 (기존 Midnight 테마 베이스에 포인트 컬러 적용).
    - **접근성**: `/protected/analysis` 페이지 상단이나 대시보드에 배너 추가하여 접근 유도.

2.  **운세 캘린더 고도화**
    - `/protected/analysis/fortune/page.tsx`의 탭 기능(Today/Weekly/Monthly)을 실제 캘린더 컴포넌트(`react-day-picker` 커스텀 또는 직접 구현)로 교체.
    - 운세 데이터(Mock data 생성을 위한 유틸리티 포함) 연결.

3.  **트렌드 섹션 링크 연결**
    - `TrendSection.tsx`의 카드들에 `onClick` 이벤트를 추가하고 Dynamic Route(`/protected/analysis/theme/[type]`)로 연결.
    - 해당 페이지 스캐폴딩(기본 골격) 구현.

4.  **디자인 가이드 준수**
    - 모든 페이지는 `docs/DESIGN_SYSTEM.md`의 "Midnight in Cheongdam" 스타일을 따르되, 이벤트 페이지는 예외적으로 강렬한 포인트 컬러 허용.

---

**보고 양식**:
작업 완료 후 각 페이지의 스크린샷 또는 주요 컴포넌트 코드 구조를 요약하여 보고할 것.
