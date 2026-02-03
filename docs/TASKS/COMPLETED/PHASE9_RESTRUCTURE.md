# Phase 9: 서비스 구조 개편 및 기능 고도화

**To**: Claude 3.5 Sonnet  
**From**: Gemini (Planner)  
**Status**: Ready to Start  
**Priority**: High (User Experience Rewrite)

사용자는 현재의 복잡한 UI를 직관적인 **개별 메뉴 하위 페이지 구조**로 변경하고, **만세력 및 궁합 분석** 기능을 전문가 수준으로 고도화하기를 원합니다.

---

## 🏗️ 1. IA & Navigation Restructuring (메뉴 구조 개편)

### A. 해화사주 (`/protected/saju/*`)
- **개요**: 사주와 관련된 개별 기능들을 독립된 페이지로 분리.
- **Sub-pages**:
  1.  `/protected/saju/today`: **오늘의 운세**
  2.  `/protected/saju/detail`: **사주 풀이**
  3.  `/protected/saju/face`: **관상**
  4.  `/protected/saju/hand`: **손금**
  5.  `/protected/saju/fengshui`: **풍수**
- **UI**: 각 페이지 진입 시 해당 기능에 집중할 수 있는 깔끔한 레이아웃.

### B. 천지인 분석 (`/protected/analysis`)
- **개요**: AI 기반 심층 분석 및 관계/궁합 분석.
- **기능 확장**:
  - **Single Mode**: 기존 1인 분석 유지.
  - **Compatibility Mode (New)**: 2~3명의 프로필을 입력/선택하여 **궁합, 파트너운, 관계 멘토링** 분석.

### C. 인연 관리 (`/protected/relationships`) & 사주 입력 폼 공통
- **Birth Time Input UX Improvement**:
  - 기존의 `HH:mm` 입력 방식 대신, **12간지 시간 선택 (Select Dropdown)** 방식을 기본으로 제공.
  - **Options**:
    - 자시 (子時, 23:30 ~ 01:29)
    - 축시 (丑時, 01:30 ~ 03:29)
    - 인시 (寅時, 03:30 ~ 05:29)
    - 묘시 (卯時, 05:30 ~ 07:29)
    - 진시 (辰時, 07:30 ~ 09:29)
    - 사시 (巳時, 09:30 ~ 11:29)
    - 오시 (午時, 11:30 ~ 13:29)
    - 미시 (未時, 13:30 ~ 15:29)
    - 신시 (申時, 15:30 ~ 17:29)
    - 유시 (酉時, 17:30 ~ 19:29)
    - 술시 (戌時, 19:30 ~ 21:29)
    - 해시 (亥時, 21:30 ~ 23:29)
    - 모름 (Unknown)
  - **Internal Logic**: 선택된 간지 시간의 **중간값** (예: 자시 -> 00:30, 축시 -> 02:30)을 DB에 저장하거나, 별도의 시간 보정 로직 적용.

---

## 🔮 2. 만세력 Pro (내 사주 관리)

### A. 위치 및 진입
- **Route**: `/protected/profile/manse`
- **Entry**: 우측 상단 프로필 드롭다운 메뉴 수정 ('새 분석 생성' 제거 -> '내 사주 관리' 추가).

### B. 상세 기능 (Expert Level Manse-ryok)
- **Data Display**: 다음 항목을 **모두** 출력해야 함.
  - 사주구성 (Four Pillars), 음양오행 (Yin-Yang & 5 Elements).
  - 천간과 지지, 궁성론.
  - 간지(Ganji), 육친(Ten Gods/Deities).
  - **Advanced**: 용신(Yongsin), 격국(Pattern), 신살(Shensha/Stars), 개운법(Remedy).
- **Interactive Dictionary**:
  - 전문 용어(예: '비견', '역마살') 클릭 시 **작고 고급스러운 팝업/모달**이 떠서 설명을 제공해야 함.
- **Design Concept**: 
  - **"차분하고 고급스럽게"**: 명리학 책을 보는 듯한 정갈한 Typography.
  - 흑백/골드/먹색 위주의 절제된 컬러 팔레트.
  - 어지러운 그래프보다는 잘 정돈된 표와 그리드 시스템 활용.

---

## 📝 Execution Plan (작업 순서)

1.  **Navigation Update**: `ProtectedHeader` 및 메뉴 구조 변경.
2.  **Page Skeletions**: 각 하위 페이지 라우트 생성.
3.  **Relationship & Compatibility**: 인연 관리 페이지와 분석 페이지 연동 로직 구현.
4.  **Manse-ryok Engine**: 만세력 계산 로직(라이브러리 활용 또는 유틸 함수 확장) 구현 및 UI 개발.

**주요 지침**:
- **복잡도 감소**: 사용자가 한 번에 너무 많은 선택지를 보지 않도록 하위 메뉴로 깊이를 나눌 것.
- **만세력 구현**: 계산 로직이 까다로우니, `lunisolar` 라이브러리 등을 적극 활용하거나 필요한 Helper 함수를 Gemini에게 요청하여 생성할 것. (일단 UI와 데이터 구조부터 잡을 것).

Start immediately.
