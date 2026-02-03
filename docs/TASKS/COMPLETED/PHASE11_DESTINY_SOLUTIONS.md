# Phase 11: Destiny Solutions (AI 개운 솔루션) 구현 가이드

**To**: Claude 3.5 Sonnet  
**From**: Gemini (Planner)  
**Priority**: Highest (Killer Feature)

사용자는 기존의 "읽는 운세"를 넘어, 시각적으로 운명을 개선하는 **"보여주는 솔루션"**을 원합니다. AI Vision 분석과 Image Generation 기술을 결합하여 다음 기능들을 구현하세요.

---

## 💎 1. AI 관상 성형 & 메이크업 (Face Destiny Hacking)
**목표**: 사용자 얼굴을 분석하고, 특정 운세(재물, 연애 등)를 강화한 "이상적인 얼굴"을 시각적으로 제안.

### A. Workflow
1.  **Upload**: 사용자 얼굴 사진 업로드 (`<input type="file" capture="user" />`).
2.  **Analyze (Gemini Vision)**:
    -   현재 관상의 특징과 약점 분석.
    -   선택한 목표(Goal)에 맞춘 **수정 프롬프트** 생성.
    -   *예: "이 사람의 코 끝을 더 둥글고 도톰하게 하여 재물운을 보강하고, 눈꼬리를 살짝 올려 도화살을 강조해줘."*
3.  **Generate (DALL-E 3 / Tool)**:
    -   `generate_image` 툴 활용.
    -   **Input**: 원본 이미지 경로 + Gemini가 생성한 수정 프롬프트.
    -   **Output**: 관상이 교정된 'After' 이미지.
4.  **Result UI**:
    -   **Slide Comparison**: `react-compare-slider` 같은 라이브러리로 Before/After 비교.
    -   **Re-Scoring**: "당신의 재물운이 60점에서 **88점**으로 상승했습니다!"
    -   **Advice**: "이런 메이크업이나 시술이 도움될 수 있습니다." (의학적 조언 아님 명시).

### B. Goals (Options)
- **CEO의 상 (Wealth)**: 코와 이마 강조, 중후한 분위기.
- **아이돌의 상 (Peach Blossom/Love)**: 눈매와 입 꼬리 강조, 밝고 화사한 분위기.
- **장군의 상 (Authority)**: 턱선과 눈썹 강조, 강인한 분위기.

---

## 🏠 2. AI 풍수 인테리어 (Space Butler)
**목표**: 방 사진을 분석하여 재물/사람/명예가 들어오는 인테리어로 리스타일링.

### A. Workflow
1.  **Upload**: 방(거실/침실) 사진 업로드.
2.  **Analyze (Gemini Vision)**:
    -   현재 배치의 풍수적 문제점 진단 (예: "거울이 문을 마주보고 있어 복이 나감").
3.  **Generate (Interior AI)**:
    -   `generate_image` 툴 활용.
    -   **Prompt**: "Keep the structure of this room but redesign it with [Golden/Wood warm tone] for [Wealth Luck]. Add [Sunflowers picture] on the north wall."
    -   원본 방의 구조(Perspective)를 유지하는 것이 핵심.
4.  **Result UI**:
    -   변경된 인테리어 이미지 표시.
    -   **Shopping List**: "여기에 노란색 쿠션과 금전수 화분을 두세요."

### B. Themes
- 💰 **재물 가득 (Wealth)**: 골드/옐로우 포인트, 풍성하고 따뜻한 느낌.
- 💞 **사랑 가득 (Romance)**: 핑크/피치/화이트 톤, 부드러운 조명.
- 🧘 **건강/집중 (Health/Study)**: 그린/우드/블루, 차분하고 정돈된 느낌.

---

## 💌 3. Viral Invite (궁합 초대)
**목표**: 내 사주 정보를 기반으로 타인을 초대하여 즉석 궁합 매칭.

### A. Logic
1.  **Link Gen**: `/invite/[unique_code]` 링크 생성 (Redis or DB에 `inviter_id` 저장).
2.  **Landing**: 초대받은 사람이 링크 접속 -> 자신의 생년월일 입력.
3.  **Instant Match**: 회원가입 절차 없이(혹은 간소화하여) **즉시 두 사람의 궁합 점수** 공개.
4.  **Conversion**: "전체 분석을 보려면 가입하세요" 유도.

---

## 🛠️ Implementation Specs (구현 상세)
- **Server Actions**: `app/actions/ai-image.ts` 생성.
- **Tools**: `generate_image` (수정 모드 활용).
- **Storage**: 생성된 이미지는 Supabase Storage `generated-images` 버킷에 저장.
- **Cost Control**: 이미지 생성은 크레딧(Credit)을 5~10개 소모하는 프리미엄 기능으로 설정.

**Start with 'Face Destiny Hacking' first.**
