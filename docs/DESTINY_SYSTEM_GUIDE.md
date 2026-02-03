# 🌟 Destiny System 통합 가이드

**작성일**: 2026-02-04
**작성자**: Claude Sonnet 4.5
**버전**: 1.0.0

---

## 📚 목차

1. [시스템 개요](#시스템-개요)
2. [아키텍처](#아키텍처)
3. [설치 및 설정](#설치-및-설정)
4. [사용 가이드](#사용-가이드)
5. [테스트 체크리스트](#테스트-체크리스트)
6. [문제 해결](#문제-해결)

---

## 시스템 개요

### 핵심 목표
해화당을 **"단순한 점술 도구"**에서 **"Life Destiny Management Platform"**으로 진화시키기 위한 데이터 통합 시스템.

### 3대 핵심 시스템

#### 1. **Destiny Targets** (통합 운명 객체)
- 본인(profiles) + 가족/친구(family_members) 통합 조회
- View 기반 실시간 동기화
- 향후 확장 대비 (friend, business, pet 등)

#### 2. **Storage Buckets** (이미지 관리)
- 관상/손금/풍수 이미지 전용 버킷
- 사용자별 폴더 격리 (RLS)
- 타임스탬프 기반 버전 관리

#### 3. **Analysis History** (분석 아카이빙)
- 모든 AI 분석 결과 영구 보존
- 즐겨찾기, 메모, 재분석 기능
- Target별/카테고리별 필터링

---

## 아키텍처

### 데이터베이스 구조

```
┌─────────────────────────────────────────────────────────┐
│                  Destiny System                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐     ┌──────────────┐                 │
│  │   profiles   │     │family_members│                 │
│  │  (본인)      │     │ (가족/친구)  │                 │
│  └──────┬───────┘     └──────┬───────┘                 │
│         │                    │                          │
│         └────────┬───────────┘                          │
│                  │                                       │
│         ┌────────▼────────────┐                         │
│         │ v_destiny_targets   │ (SQL View)              │
│         │  - id               │                         │
│         │  - owner_id         │                         │
│         │  - name             │                         │
│         │  - relation_type    │                         │
│         │  - target_type      │ (self/family)           │
│         └────────┬────────────┘                         │
│                  │                                       │
│         ┌────────▼────────────┐                         │
│         │ analysis_history    │                         │
│         │  - target_id (FK)   │                         │
│         │  - category         │                         │
│         │  - result_json      │                         │
│         │  - is_favorite      │                         │
│         └─────────────────────┘                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 파일 구조

```
app/
├── actions/
│   ├── destiny-targets.ts       # Destiny Targets CRUD
│   └── analysis-history.ts      # 분석 기록 CRUD
components/
├── destiny/
│   ├── target-selector.tsx      # Bottom Sheet 선택기
│   └── README.md                # 사용 가이드
├── analysis/
│   └── saju-profile-selector.tsx # 업그레이드된 선택기
lib/
└── destiny-utils.ts             # Helper 함수
supabase/
└── migrations/
    ├── 20260204_create_destiny_targets_view.sql
    ├── 20260204_destiny_storage_buckets.sql
    └── 20260204_analysis_history.sql
```

---

## 설치 및 설정

### 1. 데이터베이스 마이그레이션

```bash
# 로컬 Supabase 사용 시
supabase db push

# 프로덕션 Supabase 사용 시
# Supabase Dashboard → SQL Editor에서 실행:
```

#### Step 1: Destiny Targets View
```sql
-- supabase/migrations/20260204_create_destiny_targets_view.sql 실행
```

#### Step 2: Storage Buckets
```sql
-- supabase/migrations/20260204_destiny_storage_buckets.sql 실행
```

#### Step 3: Analysis History
```sql
-- supabase/migrations/20260204_analysis_history.sql 실행
```

### 2. 환경 변수 확인

`.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. 빌드 및 실행

```bash
npm install
npm run build
npm run dev
```

---

## 사용 가이드

### 1. Destiny Targets 조회

```typescript
import { getDestinyTargets } from "@/app/actions/destiny-targets";

const targets = await getDestinyTargets();
// [
//   { id: "...", name: "홍길동", target_type: "self", relation_type: "본인" },
//   { id: "...", name: "김철수", target_type: "family", relation_type: "아들" },
// ]
```

### 2. Target Selector 사용

```tsx
import { TargetSelector } from "@/components/destiny/target-selector";

<TargetSelector
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSelect={(target) => {
    console.log("Selected:", target.name);
  }}
  selectedTargetId={selectedId}
/>
```

### 3. 분석 결과 저장

```typescript
import { saveAnalysisHistory } from "@/app/actions/analysis-history";

// 사주 분석 결과 저장
await saveAnalysisHistory({
  target_id: selectedTarget.id,
  target_name: selectedTarget.name,
  target_relation: selectedTarget.relation_type,
  category: "SAJU",
  result_json: {
    luck_score: 85,
    fortune_summary: "재물운이 강한 사주",
    pillars: { year: "甲子", month: "丙寅", ... }
  },
  summary: "85점 - 재물운이 강한 사주",
  score: 85,
  talisman_cost: 1,
  prompt_version: "v2.0",
  model_used: "gemini-2.0-flash-exp"
});
```

### 4. 분석 기록 조회

```typescript
import { getRecentAnalysis } from "@/app/actions/analysis-history";

const history = await getRecentAnalysis(10);
// [
//   {
//     id: "...",
//     target_name: "홍길동",
//     category: "SAJU",
//     summary: "85점 - 재물운이 강한 사주",
//     created_at: "2026-02-04T10:00:00Z"
//   },
//   ...
// ]
```

### 5. Helper 함수 활용

```typescript
import {
  hasValidBirthData,
  getTargetImageUrl,
  formatBirthData
} from "@/lib/destiny-utils";

// 사주 분석 가능 여부
if (hasValidBirthData(target)) {
  // 분석 진행
}

// 이미지 URL 가져오기 (본인/가족 분기)
const imageUrl = getTargetImageUrl(target);

// 출생 데이터 포맷팅
const birthInfo = formatBirthData(target);
// "1990-01-01 12:00:00 (양력)"
```

---

## 테스트 체크리스트

### 🗄️ 데이터베이스

- [ ] **View 생성 확인**
  ```sql
  SELECT * FROM v_destiny_targets LIMIT 5;
  ```
- [ ] **RLS 정책 확인**
  ```sql
  SELECT * FROM v_destiny_targets WHERE owner_id = 'your-user-id';
  ```
- [ ] **Storage 버킷 확인**
  - Supabase Dashboard → Storage → `destiny-images` 존재 여부

### 🎯 Destiny Targets

1. **기본 조회**:
   - [ ] `/protected/analysis` 페이지 접속
   - [ ] 스토리 카드 클릭 → SajuProfileSelector 열림
   - [ ] 본인 + 가족 목록 표시 확인
   - [ ] "본인" 배지 표시 확인

2. **이미지 표시**:
   - [ ] Avatar 이미지 정상 표시
   - [ ] 관계별 아이콘 정상 표시

3. **선택 기능**:
   - [ ] Target 선택 → `targetId` 쿼리 파라미터 전달
   - [ ] 선택된 항목 하이라이트 표시

### 📝 Analysis History

1. **저장 기능**:
   ```typescript
   // 개발자 도구 Console에서 테스트
   await saveAnalysisHistory({
     target_name: "테스트",
     category: "SAJU",
     result_json: { test: true },
     summary: "테스트 분석"
   });
   ```
   - [ ] `analysis_history` 테이블에 데이터 추가 확인

2. **조회 기능**:
   ```typescript
   const history = await getRecentAnalysis(5);
   console.log(history);
   ```
   - [ ] 최근 5개 기록 조회
   - [ ] 정렬 순서 확인 (최신 순)

3. **즐겨찾기/메모**:
   ```typescript
   await toggleFavorite("history-id", true);
   await updateAnalysisMemo("history-id", "좋은 결과");
   ```
   - [ ] 즐겨찾기 토글 작동
   - [ ] 메모 저장/수정 작동

### 🖼️ Storage

1. **업로드 테스트**:
   - [ ] `/protected/saju/face` 페이지에서 이미지 업로드
   - [ ] Storage에 파일 저장 확인
   - [ ] 경로: `/destiny-images/{userId}/{targetId}/face-*.jpg`

2. **권한 테스트**:
   - [ ] 자신의 이미지 조회 가능
   - [ ] 다른 사용자 이미지 조회 불가 (403 에러)

---

## 문제 해결

### 1. "Server Actions must be async" 에러

**원인**: `"use server"` 파일에서 sync 함수 export

**해결**:
```typescript
// ❌ 잘못된 예시
export function helper() { ... }

// ✅ 올바른 예시
// lib/utils.ts로 분리
export function helper() { ... }
```

### 2. Target 목록이 비어있음

**원인**:
- DB 마이그레이션 미실행
- RLS 정책 오류
- 인증 토큰 만료

**해결**:
```sql
-- 1. View 존재 확인
SELECT * FROM v_destiny_targets;

-- 2. RPC 함수 확인
SELECT * FROM get_user_destiny_targets('your-user-id');

-- 3. RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### 3. 이미지 업로드 실패 (403)

**원인**: Storage RLS 정책 미적용

**해결**:
```sql
-- 정책 확인
SELECT * FROM storage.objects WHERE bucket_id = 'destiny-images';

-- 정책 재적용
-- supabase/migrations/20260204_destiny_storage_buckets.sql 재실행
```

### 4. 캐시 문제

**원인**: `unstable_cache` 사용으로 오래된 데이터 표시

**해결**:
```typescript
import { revalidatePath } from "next/cache";

// 데이터 변경 후
revalidatePath("/protected/analysis");
```

---

## 📚 추가 문서

- [MISSION_LOG.md](./REPORTS/MISSION_LOG.md) - 전체 작업 이력
- [MASTER_ARCHITECTURAL_BLUEPRINT.md](./PLANNING/MASTER_ARCHITECTURAL_BLUEPRINT.md) - 아키텍처 설계
- [components/destiny/README.md](../components/destiny/README.md) - 컴포넌트 사용법

---

## 🤝 기여 가이드

### 새로운 분석 카테고리 추가

1. **AnalysisCategory 타입 확장**:
   ```typescript
   // app/actions/analysis-history.ts
   export type AnalysisCategory =
     | "SAJU"
     | "FACE"
     | "HAND"
     | "FENGSHUI"
     | "NEW_CATEGORY";  // 추가
   ```

2. **마이그레이션 수정**:
   ```sql
   ALTER TABLE analysis_history
   DROP CONSTRAINT analysis_history_category_check;

   ALTER TABLE analysis_history
   ADD CONSTRAINT analysis_history_category_check
   CHECK (category IN ('SAJU', 'FACE', ..., 'NEW_CATEGORY'));
   ```

### 새로운 Target 타입 추가

1. **View 수정**:
   ```sql
   -- 예: friend 타입 추가
   SELECT * FROM friends
   WHERE user_id = owner_id
   ```

2. **타입 정의 확장**:
   ```typescript
   export type DestinyTargetType = "self" | "family" | "friend";
   ```

---

**문서 버전**: 1.0.0
**최종 업데이트**: 2026-02-04
**문의**: docs@haehwadang.com
