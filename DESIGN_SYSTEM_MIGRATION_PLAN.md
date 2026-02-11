# 디자인 시스템 전체 페이지 적용 계획

> **작성일**: 2026-02-11
> **기준**: DESIGN_SYSTEM.md (만세력 페이지 기반)

---

## ✅ 완료된 페이지 (Completed Pages)

### 1. `/protected` - 메인 페이지 ✅
- **파일**: `app/protected/page.tsx`
- **완료일**: 2026-02-11 (이전)
- **주요 변경사항**:
  - Hero2026, InsightSlideshow 제거 (460px 절약)
  - 모든 `font-bold` → `font-light/font-normal`
  - 아이콘 `strokeWidth={1}` 적용
  - Roulette 분리 → 플로팅 버튼
  - 레이아웃 우선순위 재배치

### 2. `/protected/profile/manse` - 만세력 페이지 ✅
- **파일**: `app/protected/profile/manse/manse-client.tsx`
- **상태**: 디자인 시스템 기준 페이지
- **특징**:
  - 완벽한 타이포그래피 시스템
  - 프리미엄 카드 패턴
  - 용어 버튼 시스템
  - 섹션 헤더 패턴

### 3. `/protected/analysis` - 분석 센터 ✅
- **파일**:
  - `components/analysis/AnalysisDashboard.tsx`
  - `components/analysis/dashboard/*.tsx` (5개 섹션)
- **완료일**: 2026-02-11 (오늘)
- **주요 변경사항**:
  - Hero 섹션: `font-bold` → `font-light`
  - MasterpieceSection: `font-bold` → `font-normal/font-medium`
  - 모든 아이콘: `strokeWidth={1.5}` → `strokeWidth={1}`
  - RelationshipSection, PeriodSection: `font-bold` → `font-light`
  - Year2026Section: `font-bold` → `font-light`
  - TrendSection: `font-bold` → `font-light`

---

## 🔄 적용 대기 중인 페이지 (Pending Pages)

### Priority 1 - 핵심 페이지 (Core Pages)

#### `/protected/family` - 가족 관리
- **예상 작업**:
  - [ ] 가족 카드: `font-bold` → `font-light`
  - [ ] 아이콘: `strokeWidth={1}` 적용
  - [ ] 버튼: `font-bold` → `font-medium`
- **예상 소요**: 30분

#### `/protected/studio` - 관상/풍수/손금
- **예상 작업**:
  - [ ] 섹션 헤더: uppercase + tracking-wider 패턴 적용
  - [ ] 카드: `bg-white/5 border-white/10` 패턴
  - [ ] 타이포그래피: `font-light` 전환
- **예상 소요**: 45분

#### `/protected/ai-shaman` - AI 고민상담
- **예상 작업**:
  - [ ] 채팅 UI: 폰트 무게 조정
  - [ ] 아이콘: `strokeWidth={1}` 적용
  - [ ] 버튼: 디자인 시스템 패턴 적용
- **예상 소요**: 30분

#### `/protected/profile` - 프로필 페이지
- **예상 작업**:
  - [ ] 설정 카드: `bg-white/5 border-white/10`
  - [ ] 타이포그래피: `font-light` 전환
  - [ ] 아이콘: `strokeWidth={1}` 적용
- **예상 소요**: 20분

### Priority 2 - 세부 기능 페이지 (Feature Pages)

#### `/protected/saju/*` - 사주 상세 페이지들
- **파일**:
  - `app/protected/saju/today/page.tsx`
  - `app/protected/saju/basic/page.tsx`
  - 등
- **예상 작업**:
  - [ ] 섹션 헤더 패턴 통일
  - [ ] 카드 스타일 통일
  - [ ] 타이포그래피 전환
- **예상 소요**: 1시간

#### `/protected/fortune/*` - 운세 페이지들
- **파일**:
  - `app/protected/fortune/weekly/page.tsx`
  - `app/protected/fortune/monthly/page.tsx`
- **예상 작업**:
  - [ ] FortuneTimeline 컴포넌트 스타일 정리
  - [ ] 타이포그래피 전환
- **예상 소요**: 30분

#### `/protected/analysis/cheonjiin` - 천지인 분석
- **예상 작업**:
  - [ ] 분석 결과 카드 스타일 통일
  - [ ] 타이포그래피: `font-light` 전환
  - [ ] 아이콘: `strokeWidth={1}` 적용
- **예상 소요**: 45분

### Priority 3 - 시스템 페이지 (System Pages)

#### `/protected/membership` - 멤버십 페이지
- **예상 작업**:
  - [ ] 가격 카드: 프리미엄 카드 패턴 적용
  - [ ] 타이포그래피 전환
  - [ ] CTA 버튼 통일
- **예상 소요**: 30분

#### `/protected/settings` - 설정 페이지
- **예상 작업**:
  - [ ] 설정 항목 카드 통일
  - [ ] 타이포그래피 전환
  - [ ] 토글/스위치 스타일 정리
- **예상 소요**: 20분

---

## 📋 작업 체크리스트 (Work Checklist)

각 페이지 작업 시 반드시 확인:

### 1. 타이포그래피 (Typography)
- [ ] `font-bold` → `font-light` (본문, 설명)
- [ ] `font-bold` → `font-normal` (일반 텍스트)
- [ ] `font-bold` → `font-medium` (버튼)
- [ ] 섹션 헤더만 `font-bold` 유지 (with `uppercase tracking-wider`)
- [ ] 페이지 타이틀만 `font-black` 유지 (with gradient)

### 2. 아이콘 (Icons)
- [ ] 모든 lucide-react 아이콘에 `strokeWidth={1}` 추가
- [ ] 크기: `w-4 h-4` (섹션), `w-5 h-5` (페이지), `w-3 h-3` (작은 것)

### 3. 카드 (Cards)
- [ ] 기본 카드: `p-8 bg-white/5 border-white/10`
- [ ] 작은 카드: `p-4 bg-white/5 border-white/10`
- [ ] 인포 카드: `bg-surface/30 border border-primary/20 p-4 rounded-xl`
- [ ] 프리미엄 카드: blur + 오버레이 패턴

### 4. 색상 (Colors)
- [ ] Primary: `#D4AF37` (Gold)
- [ ] Hover: `#F4E4BA` (Light Gold)
- [ ] Background: `bg-white/5`, `bg-white/10`
- [ ] Border: `border-white/10`, `border-primary/20`
- [ ] Text: `text-muted-foreground` (본문), `text-primary` (강조)

### 5. 간격 (Spacing)
- [ ] 섹션: `space-y-10` (큰), `space-y-6` (작은)
- [ ] 카드 패딩: `p-8` (큰), `p-4` (작은)
- [ ] 마진: `mb-6` (헤더), `mb-4` (표준)

### 6. 효과 (Effects)
- [ ] 호버: `transition-colors` 또는 `transition-all`
- [ ] 그라데이션: 페이지 타이틀에만 사용
- [ ] 글로우 배경: `bg-[#D4AF37]/3 blur-[200px]` 패턴

---

## 🛠️ 작업 프로세스 (Work Process)

### 각 페이지 작업 순서:

1. **파일 읽기** (Read)
   ```bash
   Read: app/protected/[page]/page.tsx
   Read: components/[related-components]/*.tsx
   ```

2. **패턴 분석** (Analyze)
   - `font-bold` 사용처 찾기
   - 아이콘 `strokeWidth` 확인
   - 카드 스타일 확인
   - 색상 사용 확인

3. **변경 적용** (Apply)
   - 타이포그래피 전환
   - 아이콘 `strokeWidth={1}` 추가
   - 카드 스타일 통일
   - 색상 패턴 적용

4. **검증** (Verify)
   - 체크리스트 확인
   - 빌드 테스트
   - 시각적 검토

5. **커밋** (Commit)
   ```bash
   git add [files]
   git commit -m "refactor([page]): apply minimalist premium design system"
   ```

---

## 📊 예상 총 소요 시간

| Priority | 페이지 수 | 예상 시간 | 누적 시간 |
|----------|-----------|-----------|-----------|
| Priority 1 | 4개 | 2시간 5분 | 2시간 5분 |
| Priority 2 | 3개 | 2시간 15분 | 4시간 20분 |
| Priority 3 | 2개 | 50분 | 5시간 10분 |
| **합계** | **9개** | **5시간 10분** | - |

---

## 🎯 다음 단계 (Next Steps)

### 즉시 시작 가능한 페이지 (Ready to Start):
1. `/protected/family` - 가족 관리 (30분)
2. `/protected/profile` - 프로필 (20분)
3. `/protected/settings` - 설정 (20분)

### 권장 작업 순서:
1. **Day 1**: Priority 1 전체 (2시간 5분)
2. **Day 2**: Priority 2 전체 (2시간 15분)
3. **Day 3**: Priority 3 + 최종 검토 (1시간 30분)

---

## 📝 참고 자료

- **디자인 시스템**: `DESIGN_SYSTEM.md`
- **기준 페이지**: `app/protected/profile/manse/manse-client.tsx`
- **최근 작업**: `app/protected/page.tsx`, `components/analysis/AnalysisDashboard.tsx`
- **글로벌 스타일**: `app/globals.css`

---

**작성자**: Claude Code (Sonnet 4.5)
**최종 업데이트**: 2026-02-11
**상태**: 3/12 페이지 완료 (25%)
