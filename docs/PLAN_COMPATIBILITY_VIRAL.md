# 💖 운명적 궁합 & 바이럴 초대 시스템 기획안

## 1. 핵심 컨셉: "우리의 인연은 몇 도(℃)일까?"
단순한 점수가 아닌, 관계의 **[온도]**와 **[색깔]**로 궁합을 표현합니다. 사용자가 친구에게 공유하고 싶게 만드는 것이 핵심입니다.

## 2. 기능 명세

### A. AI 궁합 분석 (Compatibility)
- **입력**: 본인(로그인 유저) + 상대방(이름/생년월일태시/성별)
- **분석 엔진**: Gemini 2.5 Flash-Lite (Saju Logic)
- **출력 데이터**:
  - **케미 점수**: 0~100점 (온도로 표현, 예: 98℃ 끓어오르는 사랑)
  - **관계 키워드**: #상호보완 #돈버는파트너 #영혼의단짝
  - **오행 분석**: 서로에게 부족한 기운을 채워주는지 시각화
  - **오늘의 데이트 추천**: 두 사람에게 좋은 시간, 장소, 음식

### B. 미스터리 초대장 (Viral Invite)
- **Trigger**: "나와 찰떡궁합인 친구 찾기" 버튼 클릭
- **Action**: 고유 링크 생성 (`/match/[code]`)
- **KaKao Share Message**:
  > "📜 **[이도현]**님이 귀인을 찾고 있습니다."
  > "나에게 부족한 **[불(Fire)]** 기운을 가진 친구라면 클릭해보세요!"
  > (궁합 확인하고 부적 3개 받기)

## 3. UI/UX 디자인 (The Red String)

### 메인 화면 (`/protected/saju/compatibility`)
- **Hero Section**: 두 개의 원(User & Partner)이 궤도를 돌고 있는 몽환적인 애니메이션.
- **Form**: 상대방 정보 입력 폼 (카드 형태).
- **History**: 최근 본 궁합 리스트 ("김철수님과의 궁합 85점").

### 결과 화면
- **Score Visual**: 두 개의 원이 합쳐지며 색상이 변함 (파랑+빨강 = 보라 등).
- **Share Card**: 캡쳐해서 인스타에 올리기 좋은 1:1 비율의 예쁜 결과 카드.

## 4. 데이터베이스 및 API 설계

### Table: `relationship_matches`
- `id`: UUID
- `inviter_id`: UUID (초대자)
- `invitee_name`: String (상대방 이름, 비회원 가능)
- `invitee_birth`: Date
- `compatibility_score`: Integer
- `share_code`: String (Unique Invite Code)
- `marketing_consent`: Boolean (친구 초대 시 중요)

## 5. 구현 단계
1. **DB 마이그레이션**: `relationship_matches` 테이블 생성.
2. **UI 리뉴얼**: `compatibility/page.tsx` 디자인 업그레이드.
3. **공유 로직**: `navigator.share` 및 카카오 공유하기 연동 준비.
4. **AI 로직**: Gemini에 두 사람의 사주 데이터를 넣고 관계성 분석 프롬프트 작성.
