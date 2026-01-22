# Phase 10: AI 기능 연동 및 사용자 편의성 증대

**To**: Claude 3.5 Sonnet  
**From**: Gemini (Planner)  
**Priority**: Critical (Service Core Value)

사용자의 요청에 따라 각 기능별 특화된 AI 분석 로직을 연결하고, 카카오톡 알림 및 플로팅 메뉴 등 편의 기능을 추가합니다.

---

## 🤖 1. 해화사주 AI 엔진 구현 (`app/actions/ai-saju.ts`)

각 서비스별로 특화된 Server Action을 구현하세요.

### A. 사주 풀이 (`/saju/detail`)
- **Action**: `analyzeSajuDetail(birthData, concern)`
- **Prompt**: 정통 명리학 기반의 심층 풀이. 용신, 격국을 포함하여 사용자의 고민(concern)에 대한 구체적 멘토링 제공.

### B. 관상/손금/풍수 (Vision AI)
- **Actions**: 
  - `analyzeFace(imageBase64)`
  - `analyzePalm(imageBase64)`
  - `analyzeFengshui(imageBase64)`
- **Tech**: Gemini 1.5 Pro (Vision) 활용.
- **Process**:
  1. 클라이언트에서 이미지 업로드 -> Base64 변환.
  2. 서버 액션으로 전송.
  3. AI가 이미지 분석 후 운세적 관점에서 해석 결과 반환.
  4. **풍수**: 인테리어 조언 및 가구 배치 추천 포함.

### C. 오늘의 운세 (`/saju/today`)
- **Action**: `getTodayFortune(birthData)`
- **Cache**: 동일 사용자가 하루에 여러 번 요청해도 같은 결과가 나오도록 `Next.js Cache` 또는 DB에 `daily_fortunes` 테이블 생성하여 저장.
- **Format**: 총운(Score), 연애운, 금전운, 직업운, 행운의 컬러/아이템.

---

## 💬 2. 카카오톡 연동 및 알림 설정

### A. UI Components
- **Kakao Channel Button**: 메인 페이지, 푸터 등에 "카카오톡 채널 추가" 버튼 배치. (링크: `https://pf.kakao.com/_xxxx` - placeholder 사용).
- **Notification Toggle**: `오늘의 운세` 페이지 또는 설정 페이지에 **[매일 아침 알림 받기]** 토글 스위치 추가.

### B. DB Schema Update
- `profiles` 테이블에 `kakao_notification` (boolean) 및 `kakao_id` (string) 컬럼 추가 필요 시 마이그레이션 스크립트 작성.

---

## 🧭 3. Floating Menu (플로팅 메뉴)

### A. Design
- 화면 우측 하단 또는 하단 중앙에 고정된(fixed) 메뉴 바.
- 모바일 친화적 디자인 (Glassmorphism 적용).

### B. Items
1.  **Home**: `/protected` (대시보드 메인)
2.  **My Page**: `/protected/profile`

---

## 📝 작업 순서 (Workflow)

1.  **AI Server Actions**: `app/actions/ai-saju.ts` 생성 및 Gemini API 연동.
2.  **Saju Sub-pages Update**: 각 페이지(`today`, `detail`, `face`...)에 실제 AI 호출 로직 & 결과 뷰어 연결.
3.  **Floating Menu**: `components/floating-action-menu.tsx` 생성 후 `app/protected/layout.tsx`에 삽입.
4.  **Kakao Actions**: 채널 링크 및 알림 설정 UI 구현.

**주의사항**:
- Gemini API Key는 `process.env.GOOGLE_GENERATIVE_AI_API_KEY` 사용.
- 이미지 분석 시 토큰 제한 고려 (이미지 사이즈 최적화 권장).
