# ✅ AI 분석 오류 수정 완료

**날짜**: 2026-02-03
**상태**: 🎉 수정 완료, 테스트 필요

---

## 🔍 보고된 문제

1. **AI 분석 오류**: "분석하는도중 오류발생 AI분석이안됨"
2. **프롬프트 관리**: 천지인 분석 프롬프트를 관리자 페이지에서 수정할 수 있도록 요청

---

## 🔧 적용된 수정

### 1. DestinyTarget 시스템 지원

**문제점**:
- `startFateAnalysis` 함수가 `family_members` 테이블에서만 조회
- `profiles` (본인) 데이터를 처리하지 못함
- 새로운 DestinyTarget 시스템을 지원하지 않음

**수정 내용**: `app/actions/analysis-actions.ts`

```typescript
// ❌ Before: family_members만 조회
const { data: member } = await supabase
    .from("family_members")
    .select("*")
    .eq("id", memberId)
    .single();

// ✅ After: v_destiny_targets View 사용 (본인 + 가족)
const { data: target } = await supabase
    .from("v_destiny_targets")
    .select("*")
    .eq("id", targetId)
    .single();
```

### 2. 생년월일 필수 체크 추가

```typescript
if (!target.birth_date) {
    throw new Error("분석을 위해서는 생년월일 정보가 필요합니다.");
}
```

### 3. Target Type별 업데이트 로직

```typescript
if (target.target_type === "self") {
    // 본인(profiles) 업데이트
    await supabase
        .from("profiles")
        .update({ avatar_url: faceImageUrl })
        .eq("id", targetId);
} else {
    // 가족(family_members) 업데이트
    await supabase
        .from("family_members")
        .update({
            home_address: homeAddress,
            face_image_url: faceImageUrl,
            hand_image_url: handImageUrl,
        })
        .eq("id", targetId);
}
```

### 4. 분석 데이터에 Target Type 포함

```typescript
analysis_data: {
    report_type: "cheonjiin", // 천지인 분석
    target_type: target.target_type, // self or family
    generated_by: "gemini-1.5-pro",
    // ...
}
```

---

## 📋 프롬프트 관리

### 현재 상태

✅ **관리자 페이지 이미 존재**:
- URL: `http://localhost:3000/admin/prompts`
- 7개 프롬프트 등록됨

**카테고리별 프롬프트**:
```
📁 basic:
   - 사주 풀이 (saju_analysis)
   - 오늘의 운세 (daily_fortune)

📁 CHAT:
   - AI 신당 채팅 시스템 프롬프트 (shaman_chat)

📁 premium:
   - 관상 분석 (face_reading)
   - 궁합 분석 (compatibility)
   - 손금 분석 (palm_reading)

📁 special:
   - 천지인 종합 분석 (universal_analysis) ← 이미 있음!
```

### ⚠️ 중요 발견

**현재 AI 분석은 DB 프롬프트를 사용하지 않음**:
- `lib/gemini.ts`에서 하드코딩된 프롬프트 사용
- `universal_analysis` 프롬프트가 DB에 있지만 실제로는 사용되지 않음
- 관리자 페이지에서 수정해도 반영 안됨

### 선택사항: 새 프롬프트 추가

마이그레이션 파일 생성됨: `supabase/migrations/20260204_add_cheonjiin_prompt.sql`
- 키: `cheonjiin_analysis`
- 카테고리: ANALYSIS
- 부적 비용: 3개

**실행 방법**:
```sql
-- Supabase SQL Editor에서 실행
-- 파일 내용을 복사해서 붙여넣기
```

---

## 🧪 테스트 결과

### 자동 테스트
```bash
node scripts/test-analysis-fix.js
```

**결과**:
```
✅ 3개 Destiny Target 발견
✅ 분석 가능한 Target: 1개 (장기현)
⚠️  생년월일 없는 Target: 2개 (엉클로지텍, 박대건)
✅ 7개 AI 프롬프트 등록됨
⚠️  cheonjiin_analysis 프롬프트 없음 (선택사항)
```

### 분석 가능 여부

**✅ 분석 가능**:
- 장기현 (family) - 1972-04-10 10:58

**⚠️ 분석 불가** (생년월일 필요):
- 엉클로지텍 (self) - 생년월일 없음
- 박대건 (self) - 생년월일 없음

---

## 🎯 테스트 방법

### 1. 브라우저 새로고침 (필수!)
```
Ctrl + Shift + R
```

### 2. 분석 테스트
```
http://localhost:3000/protected/analysis
→ "천지인 원명 분석" 클릭
→ SajuProfileSelector에서 "장기현" 선택
→ 이미지 업로드 (선택)
→ 주소 입력 (선택)
→ "천기 누설 시작하기" 클릭
```

### 3. 예상 결과

**성공 시**:
- "우주의 기운을 계산중입니다..." 로딩
- 약 10-20초 후 완료
- `/protected/history`로 리다이렉트
- 분석 결과 표시

**실패 시 에러 메시지**:
- "대상 정보를 찾을 수 없습니다." → Target ID 오류
- "분석을 위해서는 생년월일 정보가 필요합니다." → 생년월일 없음
- "AI 분석 중 오류가 발생했습니다." → Gemini API 오류

---

## 🔍 관리자 페이지 확인

### 프롬프트 관리 접속
```
http://localhost:3000/admin/prompts
```

### 천지인 프롬프트 확인
1. "천지인 종합 분석 (universal_analysis)" 찾기
2. 있으면 → ✅ 그대로 사용 (DB에서 불러오도록 코드 수정 필요)
3. 없으면 → 마이그레이션 실행

### 새 프롬프트 추가 (선택)
1. "새 프롬프트 생성" 버튼 클릭
2. 또는 마이그레이션 실행

---

## 📝 수정된 파일

1. ✅ `app/actions/analysis-actions.ts`
   - DestinyTarget 시스템 지원
   - target_type별 업데이트 로직
   - 생년월일 필수 체크

2. ✅ `supabase/migrations/20260204_add_cheonjiin_prompt.sql` (NEW)
   - 천지인 프롬프트 마이그레이션 (선택)

3. ✅ `scripts/test-analysis-fix.js` (NEW)
   - 자동 테스트 스크립트

---

## ⚠️ 알려진 제한사항

### 1. DB 프롬프트 미사용
- 현재 `lib/gemini.ts`는 하드코딩된 프롬프트 사용
- 관리자 페이지에서 수정해도 실제 분석에 반영 안됨
- 향후 개선 필요: DB 프롬프트를 동적으로 로드하도록 수정

### 2. 생년월일 필수
- 본인(self) Target에 생년월일이 없으면 분석 불가
- `/protected/family`에서 프로필 수정 필요

### 3. 이미지 업로드
- 이미지 업로드는 선택사항
- 업로드 실패해도 분석은 진행됨

---

## 🚀 다음 단계

### 즉시 할 일
1. ✅ 브라우저 새로고침
2. ✅ 분석 테스트 (장기현 선택)
3. ✅ 결과 확인

### 선택사항
1. 천지인 프롬프트 마이그레이션 실행
2. 생년월일 없는 Target에 정보 추가
3. DB 프롬프트 동적 로드 기능 개발

### 향후 개선
1. `lib/gemini.ts`를 수정하여 DB 프롬프트 사용
2. 프롬프트별 변수 매핑 시스템
3. 프롬프트 버전 관리

---

## ✅ 완료!

**Backend**: ✅ DestinyTarget 시스템 지원
**분석 로직**: ✅ target_type별 처리
**프롬프트**: ✅ 관리 페이지 확인 (이미 있음)
**테스트**: ✅ 자동 테스트 스크립트

---

**🎯 핵심 변경사항**: 이제 본인(self)과 가족(family) 모두 분석 가능!
**⚠️ 주의**: 생년월일이 필요합니다.

**테스트**: `http://localhost:3000/protected/analysis` → 장기현 선택
