# 🔧 Troubleshooting Guide - Destiny System

**작성일**: 2026-02-04
**작성자**: Claude Sonnet 4.5

---

## 체크리스트 문제 해결

### ❌ "본인" 배지가 표시되지 않음

**원인**: `target_type` 필드가 제대로 전달되지 않음

**확인 방법**:
```typescript
// 브라우저 Console에서 실행
const { getDestinyTargets } = await import('/app/actions/destiny-targets');
const targets = await getDestinyTargets();
console.log(targets);
// target_type이 "self"인 항목이 있는지 확인
```

**해결 1: DB 마이그레이션 확인**
```sql
-- Supabase Dashboard → SQL Editor
SELECT * FROM v_destiny_targets WHERE target_type = 'self';

-- 결과가 없다면 View가 제대로 생성되지 않음
-- 20260204_create_destiny_targets_view.sql 재실행
```

**해결 2: profiles 테이블 확인**
```sql
-- profiles 테이블에 데이터가 있는지 확인
SELECT id, full_name, email FROM profiles LIMIT 5;

-- 데이터가 없다면 회원가입이 제대로 되지 않음
```

---

### ❌ Avatar 이미지가 표시되지 않음

**원인**: `avatar_url`이 null이거나 Storage 권한 문제

**확인 방법**:
```sql
-- Supabase Dashboard → Table Editor
SELECT id, full_name, avatar_url FROM profiles WHERE avatar_url IS NOT NULL;
```

**해결 1: 기본 아바타 표시 확인**
```tsx
// SajuProfileSelector에서 AvatarFallback이 작동하는지 확인
<Avatar>
  <AvatarImage src={imageUrl || undefined} />
  <AvatarFallback className="bg-primary/20 text-primary font-bold">
    {target.name.charAt(0)}  {/* 첫 글자는 표시되어야 함 */}
  </AvatarFallback>
</Avatar>
```

**해결 2: Storage 권한 확인**
```sql
-- Supabase Dashboard → Storage → avatars 버킷
-- Public 설정 확인
SELECT * FROM storage.buckets WHERE id = 'avatars';
```

---

### ❌ 관계 아이콘이 표시되지 않음

**원인**: `getRelationIcon()` 함수가 실행되지 않거나 아이콘 import 누락

**확인 방법**:
```typescript
// components/analysis/saju-profile-selector.tsx 열기
// getRelationIcon 함수가 정의되어 있는지 확인
```

**해결**: 함수가 누락되었다면 추가
```tsx
const getRelationIcon = (relationType: string, targetType: string) => {
  if (targetType === "self") return User;
  if (relationType.includes("가족") || relationType.includes("부모") || relationType.includes("자녀"))
    return Users;
  if (relationType.includes("연인") || relationType.includes("배우자"))
    return Heart;
  if (relationType.includes("직장") || relationType.includes("동료") || relationType.includes("상사"))
    return Briefcase;
  return User;
};
```

---

### ❌ Target 선택 후 페이지 이동이 안됨

**원인**: `handleTargetSelect()` 함수나 router 문제

**확인 방법**:
```tsx
// SajuProfileSelector에서 handleTargetSelect 확인
const handleTargetSelect = (targetId: string) => {
  console.log("Selected targetId:", targetId);  // 디버그 로그 추가
  setSelectedId(targetId);
  router.push(`${targetRoute}?targetId=${targetId}`);
  onClose();
};
```

**해결**: 디버그 로그 추가 후 브라우저 Console 확인
- targetId가 제대로 전달되는지
- targetRoute가 올바른 경로인지
- router.push가 실행되는지

---

## 빠른 진단 스크립트

### 브라우저 Console에서 실행

```javascript
// 1. Destiny Targets 조회
const { getDestinyTargets } = await import('/app/actions/destiny-targets');
const targets = await getDestinyTargets();
console.log("Targets:", targets);

// 2. 각 Target 정보 확인
targets.forEach(t => {
  console.log({
    name: t.name,
    target_type: t.target_type,
    relation_type: t.relation_type,
    avatar_url: t.avatar_url,
    face_image_url: t.face_image_url
  });
});

// 3. 본인 데이터 확인
const self = targets.find(t => t.target_type === 'self');
console.log("Self:", self);

// 4. 가족 데이터 확인
const family = targets.filter(t => t.target_type === 'family');
console.log("Family:", family);
```

---

## 데이터베이스 직접 확인

### Supabase Dashboard → SQL Editor

```sql
-- 1. View 존재 확인
SELECT COUNT(*) FROM v_destiny_targets;

-- 2. 본인 데이터 확인
SELECT * FROM v_destiny_targets WHERE target_type = 'self';

-- 3. 가족 데이터 확인
SELECT * FROM v_destiny_targets WHERE target_type = 'family';

-- 4. 특정 사용자의 모든 Targets
SELECT * FROM get_user_destiny_targets('your-user-id-here');

-- 5. RLS 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles' OR tablename = 'family_members';
```

---

## 컴포넌트 수동 테스트

### /test-destiny 페이지 생성됨

브라우저에서 접속:
```
http://localhost:3000/test-destiny
```

이 페이지에서 확인할 수 있는 정보:
1. User Info (로그인 정보)
2. Direct View Query (v_destiny_targets)
3. RPC Function (get_user_destiny_targets)
4. Server Action (getDestinyTargets)

**모든 테스트가 동일한 데이터를 반환해야 합니다.**

---

## 일반적인 문제들

### 1. "캐시 문제"
```typescript
// app/actions/destiny-targets.ts에서 캐시 시간 확인
revalidate: 60, // 1분 캐시

// 즉시 반영하려면:
import { revalidatePath } from "next/cache";
revalidatePath("/protected/analysis");
```

### 2. "RLS 정책 문제"
```sql
-- profiles 테이블 RLS 확인
SELECT * FROM profiles WHERE id = auth.uid();

-- 위 쿼리가 결과를 반환하지 않으면 RLS 정책 문제
```

### 3. "Session 만료"
```bash
# 로그아웃 후 다시 로그인
# 또는 브라우저 개발자 도구 → Application → Cookies 삭제
```

### 4. "마이그레이션 순서 문제"
```sql
-- 순서대로 재실행:
-- 1. 20260204_create_destiny_targets_view.sql
-- 2. 20260204_destiny_storage_buckets.sql
-- 3. 20260204_analysis_history.sql
```

---

## 문제가 계속되면

### 로그 확인
```bash
# 터미널에서 dev 서버 로그 확인
npm run dev

# 에러 메시지 확인
```

### 브라우저 Network 탭
1. F12 → Network 탭
2. SajuProfileSelector 열기
3. `getDestinyTargets` 요청 확인
4. Response 데이터 확인

---

## 긴급 복구

모든 것이 작동하지 않으면:

```sql
-- 1. View 삭제 후 재생성
DROP VIEW IF EXISTS v_destiny_targets;

-- 2. Function 삭제 후 재생성
DROP FUNCTION IF EXISTS get_user_destiny_targets;

-- 3. 마이그레이션 파일 재실행
-- 20260204_create_destiny_targets_view.sql 전체 재실행
```

---

**도움말**: 문제가 해결되지 않으면 `/test-destiny` 페이지의 JSON 결과를 캡처해서 공유해주세요.
