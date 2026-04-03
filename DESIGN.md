# Design System — 청담해화당 (Haehwadang)

## Product Context

- **What this is:** AI 기반 프리미엄 사주/운세/궁합/관상/풍수 분석 + 복 생태계 SaaS
- **Who it's for:** 40-50대 가족 사주 관리 여성 (1차), 20-30대 커플 궁합 (2차)
- **Space/industry:** Korean fortune telling, AI astrology
- **Project type:** Mobile-first web app (480px max)

## Aesthetic Direction

- **Direction:** Luxury/Refined + Art Deco hybrid
- **Decoration level:** Intentional (한지 질감 + 단청 보더 + 전통 격자)
- **Mood:** 조선 시대 반가의 서재. 고급스럽고 무게감 있지만 접근 가능. 전통 미학을 현대 모바일 UI에 자연스럽게 녹인 유일한 사주 앱.
- **Reference sites:** SAJUME (sajume.com), Saju.com, Co-Star (costarastrology.com)
- **Differentiator:** 시장에서 한국 전통 미학을 진지하게 구현한 프리미엄 사주 앱은 없음. 이것이 유일한 포지션.

## Typography

- **Display/Hero (EN):** Playfair Display 700 — 고전적 세리프. 영문 헤드라인에 위엄감 부여.
- **한글 제목:** Noto Serif KR 700/900 — 무게감 있는 명조로 전통 권위 표현.
- **Body:** Pretendard Variable 300/400 — 현대적 산세리프. 가독성 우선.
- **UI/Labels:** Pretendard Variable 400/600 — body와 통일.
- **Data/Tables:** JetBrains Mono — 사주 팔자 수치, 오행 점수. tabular-nums 지원.
- **Loading:** Pretendard CDN (jsdelivr), Google Fonts (Noto Serif KR, Playfair Display)
- **Scale:**
  - display: 28px / 1.2 / -0.03em / 600
  - heading-1: 24px / 1.2 / -0.02em / 700
  - heading-2: 20px / 1.25 / -0.02em / 700
  - heading-3: 18px / 1.3 / -0.01em / 600
  - heading-4: 16px / 1.4 / -0.01em / 600
  - body-lg: 16px / 1.7 / -0.02em / 300
  - body: 14px / 1.6 / -0.02em / 300
  - body-sm: 13px / 1.5 / -0.01em / 300
  - caption: 12px / 1.5 / 0em / 400
  - overline: 11px / 1.4 / 0.08em / 600

## Color

- **Approach:** Restrained + culturally intentional (오방색 기반)
- **Background:** #0A0A08 (玄, 먹 흐림) — 깊은 어둠으로 콘텐츠 부각
- **Surface:** #16140F (warm dark brown) — 카드, 모달 배경
- **Surface Raised:** #1E1B15 — 호버, 활성 상태
- **Primary (Gold):** #C9A84C (黃, 액체 골드) — 프리미엄 액센트, 진행 바
- **Gold Dim:** #A8903F — 보조 골드, 호버
- **Gold Light:** #E8D5A0 — 하이라이트 텍스트
- **Accent Red:** #9E2B2B (朱, 도장 레드) — CTA 버튼, 강조, 복 포인트
- **Red Light:** #C84040 — 배지, 알림
- **Blue:** #2D5F8A (靑) — 정보, 링크, 단청 중간색
- **Text Primary:** #E8E4DC (白, 따뜻한 아이보리) — 메인 텍스트
- **Text Muted:** #8C8478 (황토색) — 보조 텍스트
- **Text Dim:** #5C564C — 비활성 텍스트
- **Semantic:** success #22C55E, warning #F59E0B, error #EF4444, info #2D5F8A
- **Dark mode:** 기본이 다크. 라이트 모드 미지원 (의도적).

## Spacing

- **Base unit:** 8px
- **Density:** Comfortable
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout

- **Approach:** Grid-disciplined (mobile-first)
- **Grid:** Single column, 480px max-width
- **Max content width:** 480px
- **Padding:** 16px horizontal
- **Border radius:** sm:4px md:8px lg:12px full:9999px (cards: 12px, buttons: 3px for 도장 feel)
- **Section rhythm:** 단청 구분선(dancheong-divider)으로 시각적 리듬

## Motion

- **Approach:** Intentional
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)
- **Key animations:** fade-in-up (입장), fortune-glow (골드 펄스), core-pulse (분석 로딩)
- **Reduced motion:** prefers-reduced-motion 완전 지원 (globals.css)

## Traditional Korean Design Elements

### 한지 (Hanji Paper) Texture

- CSS class: `.hanji-card`
- SVG fractal noise overlay, opacity 0.03
- 카드 배경에 종이 질감 부여

### 단청 (Dancheong Temple Painting) Borders

- CSS class: `.dancheong-border-top`, `.dancheong-divider`
- Gradient: red(#9E2B2B) → gold(#C9A84C) → blue(#2D5F8A) → gold → red
- 섹션 구분선과 카드 상단 보더에 사용

### 도장 (Dojang Seal) Style

- CSS class: `.bok-badge`
- CTA 버튼: border-radius 3px, box-shadow offset
- 배지: 적색 배경 + 도장 그림자

### 전통 격자 (Traditional Grid)

- CSS class: `.traditional-grid-bg`
- 24px 격자 패턴, 골드 opacity 0.03

## Bok Tier Colors

- SEED: #8C7B50 (dark gold)
- SPROUT: #22C55E (green)
- FLOWER: #F472B6 (pink)
- TREE: #10B981 (emerald)
- FOREST: #6EE7B7 (light emerald)

## Decisions Log

| Date       | Decision                      | Rationale                                                                                            |
| ---------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| 2026-04-03 | Initial design system created | /design-consultation 리서치 기반. 경쟁사(SAJUME, 척척포춘) 분석 후 한국 전통 프리미엄 포지셔닝 확정. |
| 2026-04-03 | 오방색 팔레트 채택            | 서양 점성술 앱 컬러(보라/우주)를 피하고 한국 고유 색채 시스템으로 차별화                             |
| 2026-04-03 | 도장 CTA 버튼                 | 둥근 버튼 대신 각진 도장 스타일로 브랜드 정체성 확보                                                 |
| 2026-04-03 | 배경 #0A0A08 (더 깊은 먹색)   | 기존 #0D0D0D보다 깊은 톤으로 고급 인쇄물 느낌 강화                                                   |
| 2026-04-03 | JetBrains Mono for data       | 사주 팔자 수치(天干地支, 五行 점수)에 tabular-nums 필요                                              |
