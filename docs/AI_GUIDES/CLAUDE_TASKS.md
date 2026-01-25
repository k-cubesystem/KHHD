# 🤖 Claude Collaboration Tasks

> **목적**: Gemini가 백엔드 로직 및 데이터 구조를 완성하면, Claude는 이를 바탕으로 **고수준의 UI/UX, 애니메이션, 시각화**를 담당합니다.

## ✅ Task 1: 프리미엄 만세력 카드 디자인 고도화 (Premium Manse Card)
(완료됨 - Gemini/Claude 협업)

## ✅ Task 2: 오행 분석 차트 (Five Elements Visualization)
(완료됨 - Gemini/Claude 협업)

## ✅ Task 3: 대운(10년 운) 타임라인 (Daewoon Timeline)
(완료됨 - Gemini/Claude 협업)

## ✅ Task 4: 디지털 부적 (Digital Talisman) 효과
(완료됨 - Gemini/Claude 협업)

## ✅ Task 5: 확장 프로필 정보를 활용한 AI 분석 고도화
- **배경**: `profiles` 테이블에 **직업, 취미, 특기, 인생관, 종교, 결혼여부** 등 상세 정보가 추가되었습니다.
- **백엔드 현황**: `analyzeSajuDetail` 함수가 사용자 컨텍스트를 반영하도록 개선되었습니다.
- **UI/UX 구현 (완료됨 - 2026-01-24)**:
  - **프로필 이미지 업로드 시스템**: Supabase Storage 연동 및 아바타 UI 구현.
  - **통합 프로필 UI**: 사주 원국표와 프로필 수정 폼을 Accordion으로 깔끔하게 통합.
  - **가독성 개선**: Global CSS 수정으로 입력 폼 및 만세력 카드의 텍스트 시인성(Contrast) 대폭 강화.
  - **반응형 모션**: Input 컴포넌트에 Framer Motion 적용 (사용자 기여).

## 📝 작업 가이드
- **Claude 역할**: 위 프론트엔드 컴포넌트(`Client Component`)들을 제작하고, Gemini가 만든 데이터(`Server Component`)와 연결합니다.
- **디자인 원칙**: "화려하되 경박하지 않게 (Luxurious but not tacky)."
