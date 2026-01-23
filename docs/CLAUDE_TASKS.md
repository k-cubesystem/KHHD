# 🤖 Claude Collaboration Tasks

> **목적**: Gemini가 백엔드 로직 및 데이터 구조를 완성하면, Claude는 이를 바탕으로 **고수준의 UI/UX, 애니메이션, 시각화**를 담당합니다.

## ✅ Task 1: 프리미엄 만세력 카드 디자인 고도화 (Premium Manse Card)
- **현재 상태**: 기본적인 표(Grid) 형태의 텍스트 출력.
- **요구 사항**:
  - 오행(목, 화, 토, 금, 수)에 따른 **배경 텍스처 또는 미세 애니메이션** 적용. (예: 화(Fire)일 경우 은은하게 타오르는 입자 효과, 수(Water)일 경우 물결 효과).
  - 글자(甲, 子 등)에 **붓글씨(Calligraphy) 느낌의 SVG 애니메이션** 효과 (Stroke Animation).
  - 카드 클릭/호버 시 상세 정보(십신, 12운성 등 심화 정보)가 부드럽게 펼쳐지는 **Expandable UI**.

## ✅ Task 2: 오행 분석 차트 (Five Elements Visualization)
- **위치**: 천지인 분석 페이지 (`/protected/analysis` 예정)
- **요구 사항**:
  - 사용자의 사주에서 오행(Wood, Fire, Earth, Metal, Water)의 분포를 시각화하는 **인터랙티브 레이더 차트 (Radar Chart)** 또는 **도넛 차트**.
  - `Recharts`를 사용하되, 디자인 시스템(Zen Style)에 맞게 커스터마이징 (기본 색상 대신 먹물색, 금색 등 사용).
  - 부족한 기운(용신/희신)을 강조하는 시각적 장치.

## ✅ Task 3: 대운(10년 운) 타임라인 (Daewoon Timeline)
- **위치**: 사주 풀이 상세
- **요구 사항**:
  - 10년 단위의 대운 흐름을 **가로 스크롤 타임라인**으로 구현.
  - 현재 대운에 Highlight 효과 및 "지금 나는 어디에 있는가?"를 직관적으로 표현.
  - Framer Motion을 활용한 부드러운 스크롤 인터랙션.

## ✅ Task 4: 디지털 부적 (Digital Talisman) 효과
- **위치**: `/protected/talisman` 또는 결제 완료 후
- **요구 사항**:
  - 부적이 발급될 때 화면에 **도장(낙관)**이 찍히는 애니메이션 (`canvas-confetti` 활용).
  - 부적이 금빛으로 빛나는 **Shimmer Effect**.
  - 실제 종이 질감(Paper Texture) 위에 그려지는 듯한 렌더링.

## 📝 작업 가이드
- **Claude 역할**: 위 프론트엔드 컴포넌트(`Client Component`)들을 제작하고, Gemini가 만든 데이터(`Server Component`)와 연결합니다.
- **디자인 원칙**: "화려하되 경박하지 않게 (Luxurious but not tacky)."
