# 🤖 AI Skills

> **최종 업데이트**: 2026-01-27
> **상태**: 6개 스킬 구현 및 문서화 완료 ✅

이 폴더는 AI 에이전트용 고급 워크플로우와 프로토콜 스킬을 정의합니다.

---

## 📂 신규 구현 스킬 (2026-01-27)

### 0️⃣ 프로젝트 관리 & 프로토콜
**파일**: `project_management.skill.json`

Gemini(총괄)와 Claude(UI/UX)의 역할 분담 및 협업 규약을 정의합니다. 기존 `GEMINI.md`, `CLAUDE.md`의 긴 컨텍스트를 대체합니다.

- **Gemini**: 아키텍처, 백엔드 로직, 자율적 의사결정 (Lead)
- **Claude**: UI/UX 디자인, 프론트엔드 최적화 (Specialist)
- **프로토콜**: 한국어 소통, `MISSION_LOG.md` 주기적 업데이트

---

### 🎨 디자인 시스템 & UX 프로토콜
**파일**: `design_system.skill.json`

"Oriental Luxury" (동양적 럭셔리) 미학을 구현하기 위한 가이드라인입니다.

- **테마**: 신비롭고 고급스러운 반응형 디자인
- **원칙**: 첫눈에 반하는 "Wow Factor", 부드러운 Glassmorphism
- **도구**: Stitches, Framer Motion

---

### 🧵 Stitches 디자인 헬퍼
**파일**: `stitch_design.skill.json`

CSS-in-JS 라이브러리인 `@stitches/react` 사용을 위한 실무 가이드입니다.

- **구성**: `design-system/stitches.config.ts` (테마 토큰 정의)
- **사용법**: 스타일을 컴포넌트와 함께 배치 (`styled` API)
- **스니펫**: Box, Flex, Grid 등 레이아웃 유틸리티 제공

---

## 📂 기존 워크플로우 스킬

### 1️⃣ 자동 사주 분석 워크플로우
**파일**: `saju-workflow.skill.json`

생년월일시 입력부터 AI 풀이(만세력 계산, 오행 분석)까지 전체 프로세스를 자동화합니다.

### 2️⃣ 고급 관상 분석 파이프라인
**파일**: `face-analysis-pipeline.skill.json`

얼굴 이미지 업로드 → AI 비전 분석(오관, 삼정) → 개운 이미지 생성 파이프라인.

### 3️⃣ 멀티모달 비전 분석 스킬
**파일**: `multimodal-vision.skill.json`

사주(天) + 관상(地) + 수상(人) 통합 3차원 운명 분석.

---

## 📂 Phase 19 스킬 (2026-01-24 추가)

### 4️⃣ 가족 궁합 매트릭스 (`family-compatibility-matrix.skill.json`)
가족 간 사주 궁합(천간합/지지충)을 히트맵으로 시각화.

### 5️⃣ AI 코칭 스킬 (`ai-coaching.skill.json`)
실시간 대화형 운세 상담 (멀티턴, 음성 지원).

### 6️⃣ 풍수 인테리어 스킬 (`fengshui-3d.skill.json`)
Three.js 기반 3D 룸 플래너 및 사주 맞춤 가구 배치.

### 7️⃣ 궁합 바이럴 스킬 (`viral-sharing.skill.json`)
OG 이미지 생성 및 공유 확산 루프 설계.

### 8️⃣ 실시간 웹캠 관상 (`webcam-face-analysis.skill.json`)
웹캠 안면 인식 및 실시간 가이드.

### 9️⃣ AR 손금 가이드 (`ar-palm-guide.skill.json`)
MediaPipe Hands 기반 손금 AR 오버레이.

---

## 🚀 사용 가이드

### 스킬 로드
세션 시작 시, 작업 목적에 맞는 스킬을 로드하여 숙지합니다.

```markdown
<!-- 예시 -->
project_management.skill.json (필수)
design_system.skill.json (UI 작업 시)
stitch_design.skill.json (코딩 시)
```

### JSON 구조
모든 스킬은 다음 JSON 스키마를 따릅니다.
```json
{
  "id": "unique_id",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "description": "...",
  "instructions": { ... }
}
```

---

## 📝 관리자
**Lead Architect**: Gemini
**Main Maintainer**: Claude
