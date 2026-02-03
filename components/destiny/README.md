# Destiny Targets System

## 개요
해화당의 통합 운명 객체 시스템입니다. 본인(profiles)과 가족/친구(family_members)를 하나의 `destiny_targets` 개념으로 통합하여 관리합니다.

## 구조

### 1. Database View (`v_destiny_targets`)
```sql
-- 본인 + 가족/친구를 UNION으로 통합한 View
SELECT * FROM public.v_destiny_targets;

-- RPC 함수로 사용자별 조회
SELECT * FROM public.get_user_destiny_targets('user-uuid');
```

### 2. Server Actions (`app/actions/destiny-targets.ts`)
```typescript
import { getDestinyTargets, type DestinyTarget } from "@/app/actions/destiny-targets";

// 모든 Destiny Targets 조회 (본인 + 가족/친구)
const targets = await getDestinyTargets();

// 특정 Target 조회
const target = await getDestinyTarget(targetId);

// 개수 조회 (멤버십 제한 체크용)
const count = await getDestinyTargetsCount(); // { total: 5, family: 4 }

// Helper 함수
hasValidBirthData(target); // 사주 분석 가능 여부
getTargetImageUrl(target); // 이미지 URL (본인/가족 분기)
```

### 3. UI Component (`components/destiny/target-selector.tsx`)

#### 기본 사용법
```tsx
"use client";

import { useState } from "react";
import { TargetSelector } from "@/components/destiny/target-selector";
import { type DestinyTarget } from "@/app/actions/destiny-targets";

export default function MyPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<DestinyTarget | null>(null);

  const handleSelect = (target: DestinyTarget) => {
    setSelectedTarget(target);
    console.log("Selected target:", target.name);
    // 여기서 분석 시작 등의 로직 실행
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        운명 대상 선택
      </button>

      <TargetSelector
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={handleSelect}
        selectedTargetId={selectedTarget?.id}
      />
    </div>
  );
}
```

## 데이터 구조

### DestinyTarget 인터페이스
```typescript
interface DestinyTarget {
  id: string;                          // UUID
  owner_id: string;                    // 관리자 ID
  name: string;                        // 이름
  relation_type: string;               // 관계 ("본인", "가족", "친구" 등)
  birth_date: string | null;           // 생년월일 (YYYY-MM-DD)
  birth_time: string | null;           // 생시 (HH:MM:SS)
  calendar_type: "solar" | "lunar" | null; // 양력/음력
  gender: "male" | "female" | null;    // 성별
  avatar_url: string | null;           // 아바타 (본인만)
  face_image_url: string | null;       // 관상 이미지 (가족/친구)
  hand_image_url: string | null;       // 손금 이미지
  home_address: string | null;         // 주소 (풍수용)
  target_type: "self" | "family";      // 타입 구분
  created_at: string;
  updated_at: string;
}
```

## 사용 시나리오

### 1. 사주 분석 페이지
```tsx
// app/protected/analysis/page.tsx
import { TargetSelector } from "@/components/destiny/target-selector";

const handleAnalyze = async (target: DestinyTarget) => {
  if (!hasValidBirthData(target)) {
    alert("생년월일 정보가 필요합니다.");
    return;
  }

  // 사주 분석 시작
  await analyzeSaju({
    birth_date: target.birth_date,
    birth_time: target.birth_time,
    calendar_type: target.calendar_type,
    gender: target.gender,
  });
};
```

### 2. 관상 분석 페이지
```tsx
// app/protected/saju/face/page.tsx
const handleFaceAnalysis = async (target: DestinyTarget) => {
  const imageUrl = getTargetImageUrl(target);

  if (!imageUrl) {
    alert("이미지를 먼저 업로드해주세요.");
    return;
  }

  await analyzeFace(imageUrl);
};
```

### 3. 궁합 분석
```tsx
// app/protected/family/compatibility-matrix/page.tsx
const [target1, setTarget1] = useState<DestinyTarget | null>(null);
const [target2, setTarget2] = useState<DestinyTarget | null>(null);

const handleCompatibilityCheck = async () => {
  if (!target1 || !target2) return;

  await analyzeCompatibility(target1.id, target2.id);
};
```

## 향후 확장 계획

### Phase 32: 기존 페이지 통합
- [ ] `/protected/analysis` - TargetSelector 추가
- [ ] `/protected/saju/face` - TargetSelector 추가
- [ ] `/protected/saju/hand` - TargetSelector 추가

### Phase 33: Analysis History
- [ ] `analysis_history` 테이블에 `target_id` FK 추가
- [ ] 분석 기록을 Destiny Target별로 아카이빙

### Phase 34: Cross-Analysis
- [ ] 사주 + 관상 교차 분석 엔진
- [ ] 사주 + 풍수 교차 분석
- [ ] Destiny Target 기반 통합 리포트

## 디자인 가이드라인

### Midnight in Cheongdam 준수
- **배경**: `bg-surface` (다크 테마)
- **텍스트**: `text-ink-light` (밝은 잉크)
- **액센트**: `text-primary` (골드), `border-primary`
- **애니메이션**: Framer Motion
- **형태**: Sharp corners (border-radius: 0)

### 접근성
- 키보드 네비게이션 지원
- 스크린 리더 호환
- Touch-friendly 버튼 크기 (최소 44x44px)

## 문의
- 기술 문의: `docs/ARCHITECTURE/MASTER_ARCHITECTURAL_BLUEPRINT.md` 참조
- 구현 가이드: `docs/PLANNING/PHASED_IMPLEMENTATION_PLAN.md` Phase 2 섹션
