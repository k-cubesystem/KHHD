# 🎨 Haehwadang UI Design Concepts

혜화당의 브랜드 아이덴티티를 시각화하기 위한 두 가지 디자인 컨셉을 제안합니다. 사용자의 선택에 따라 하나의 방향으로 디벨롭하거나, 두 컨셉을 혼합(Hybrid)할 수 있습니다.

---

## **Concept A: "Midnight in Seoul (서울의 달밤)"**
> **Keywords:** Dark Mode, Mystic, Premium, Gold, Ink
> **분위기:** 깊은 밤, 촛불 하나 켜고 점을 치는 듯한 신비롭고 집중된 경험.

### 1. Visual Identity
- **Background:** Deep Charcoal (#121212) ~ Black Gradients. 
  - 미세한 '노이즈(Noise)' 텍스처를 추가하여 종이 질감 구현.
- **Accent Color:** **Burnished Gold (#C5A059)** - 은은하게 빛나는 유기 그릇 색상.
- **Typography:** 
  - 제목: **Noto Serif KR (명조)** - 붓글씨의 힘과 우아함.
  - 본문: **Pretendard (고딕)** - 가독성이 높은 현대적 서체.
  - *텍스트에 은은한 외곽선광(Text Shadow)을 주어 달빛 아래 글자를 읽는 느낌.*

### 2. UI Elements
- **Glassmorphism (Dark):** 검은 반투명 유리 재질. 뒤에 흐릿한 오방색(五方色) 빛이 번짐.
- **Borders:** 아주 얇은 1px Gold Border (Opactiy 20%).
- **Icons:** 얇은 라인 아이콘 (Thin Stroke). 활성화 시 금빛으로 채워짐.

### 3. User Experience
- **Focus:** 사용자가 자신의 운세 결과에 오롯이 집중할 수 있도록 주변 요소를 어둡게 처리.
- **Animation:** 연기가 피어오르거나 잉크가 번지는 듯한 느리고 부드러운 전환 효과.

---

## **Concept B: "Morning Hanji (아침의 한지)"**
> **Keywords:** Light Mode, Clean, Minimal, Wood, Ivory
> **분위기:** 맑은 아침, 정갈한 한옥 마루에서 차 한 잔 마시며 상담받는 편안함.

### 1. Visual Identity
- **Background:** Warm Ivory / Hanji White (#FAFAF6).
  - 실제 한지 섬유(닥나무 껍질) 패턴이 매우 옅게 깔림.
- **Accent Color:** **Dried Pine Green (#4A5D23)** & **Terracotta (#C07055)** - 자연에서 온 색채.
- **Typography:** 
  - 제목: **Gowun Batang (고운바탕)** - 정갈하고 단정한 명조.
  - 본문: **Pretendard** - 깔끔한 고딕.

### 2. UI Elements
- **Paper Shadows:** 그림자가 퍼지지 않고 종이가 겹쳐진 듯한 얇고 선명한 그림자.
- **Cards:** 둥근 모서리가 아닌, 약간의 곡선(한국적 처마 라인)을 가진 카드 형태.
- **Buttons:** 나무 도장(Seal)을 찍은 듯한 붉은색/초록색 포인트.

### 3. User Experience
- **Focus:** 밝고 긍정적인 에너지를 전달. 심리적 안정감 유도.
- **Animation:** 책장을 넘기거나 종이를 펼치는 듯한 물리적이고 경쾌한 효과.

---

## 💡 Recommendation
**Haehwadang(혜화당)**의 '사주/운세' 서비스 특성상, 사용자들은 **"나의 운명에 대한 진지한 조언"**을 기대합니다.
따라서 **Concept A (Midnight in Seoul)**를 베이스로 하되, 가독성을 위해 Concept B의 깔끔한 레이아웃 구조를 차용하는 **Hybrid 전략**을 추천합니다.

- **기본 모드:** Dark (Concept A) - 프리미엄 감성 극대화.
- **결과 리포트:** Light (Concept B) - 출력물처럼 편안하게 읽을 수 있도록 배경 반전 옵션 제공.

---

## **Concept C: "UX Pro Max - TUI Edition"**
> **Keywords:** Tangible, Premium, Micro-Interactions, Depth, Weight
> **분위기:** 화면 속 요소가 실제 물체처럼 느껴지는 살아있는 인터페이스.

### 1. Design Philosophy: "Tangible Nobility"

#### 🌌 TUI (Tangible/Tactile User Interface)
- **Weight (무게감)**: 중요한 요소는 묵직하게(느린 애니메이션), 가벼운 요소는 경쾌하게.
- **Material (물성)**: Glass(유리)와 Gold(금)의 질감을 `backdrop-filter`와 `gradient`로 표현.
- **Depth (깊이감)**: 다중 레이어 블러와 그림자로 공간감 형성.

### 2. Implementation Standards

#### A. Color Palette Extension
```
gold-100: #F9F5E3 (하이라이트)
gold-300: #F4E4BA (메인 텍스트)
gold-500: #D4AF37 (브랜드 컬러)
gold-900: #3E3210 (깊은 배경 그림자)
```

#### B. Animation Standards (Framer Motion)
- **Entrance**: `fadeInUp` (opacity: 0→1, y: 20→0)
- **Transition**: Spring (stiffness: 300, damping: 30)
- **Hover**: Scale 1.02 + Shimmer Effect

#### C. Component Structure
1. **Container**: 레이아웃 + `backdrop-blur`
2. **Highlight**: 그라데이션 발광 (`ring`, `shadow`)
3. **Content**: 명확한 대비
4. **Interaction Layer**: 호버/클릭 감지

### 3. Key Features

#### "The Orb Pattern"
배경에 은은하게 움직이는 빛의 구슬(Orb)로 신비로운 분위기 연출:
- Primary Orb: Gold (8초 주기, scale 1→1.2→1)
- Secondary Orb: Wood (10초 주기, 2초 delay)

#### Zero Layout Shift
- Skeleton 컴포넌트로 로딩 중에도 레이아웃 안정성 유지
- 모든 이미지에 width/height 명시

#### Micro-Interactions
- 버튼 호버: 빛이 지나가는 Shimmer 효과
- 카드 클릭: `scale(0.98)` 후 반동
- Input 포커스: `ring-2` + `scale(1.01)`

### 4. Mobile Optimization
- **터치 타겟**: 최소 44x44px (Apple HIG 준수)
- **햄버거 메뉴**: AnimatePresence로 부드러운 열림/닫힘
- **메뉴 항목**: 60px 높이로 여유 있는 터치 영역

---

## 💡 Final Recommendation (Updated)

**Phase 14**부터는 **Concept C (UX Pro Max TUI)**를 모든 컴포넌트에 적용합니다:
- **Concept A (Midnight)**: 다크 모드 베이스 유지
- **Concept B (Morning)**: 라이트 모드 베이스 유지
- **Concept C (TUI)**: 양쪽 모드에 공통 적용되는 인터랙션 레이어

→ 결과: **"보는 것"에서 "만지는 것"으로 진화한 프리미엄 경험**
