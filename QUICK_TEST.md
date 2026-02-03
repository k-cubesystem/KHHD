# ⚡ Quick Test Guide - 5분 체크리스트

**목표**: Phase 2-4 완료 후 즉시 테스트

---

## 🚀 Step 1: 데이터베이스 마이그레이션 (필수!)

### Supabase Dashboard → SQL Editor

```sql
-- ✅ 1단계: Destiny Targets View 생성
-- 파일 내용 복사: supabase/migrations/20260204_create_destiny_targets_view.sql
-- 전체 복사해서 SQL Editor에 붙여넣기 → Run

-- ✅ 2단계: Storage Buckets 생성
-- 파일 내용 복사: supabase/migrations/20260204_destiny_storage_buckets.sql
-- 전체 복사해서 SQL Editor에 붙여넣기 → Run

-- ✅ 3단계: Analysis History 테이블 생성
-- 파일 내용 복사: supabase/migrations/20260204_analysis_history.sql
-- 전체 복사해서 SQL Editor에 붙여넣기 → Run
```

---

## 🧪 Step 2: 디버그 페이지 접속

```bash
# 1. Dev 서버 실행 (이미 실행 중이면 Skip)
npm run dev

# 2. 브라우저 접속
http://localhost:3000/test-destiny

# 3. 로그인 필요 시
http://localhost:3000/auth/login
```

### 예상 결과
- **User Info**: 로그인된 사용자 정보 표시
- **Test 1 (View)**: 본인 + 가족 데이터 표시
- **Test 2 (RPC)**: Test 1과 동일한 데이터
- **Test 3 (Action)**: Test 1과 동일한 데이터

### 문제 발생 시
- **에러 메시지가 보인다**: 마이그레이션 재실행
- **빈 배열 `[]`**: profiles 테이블에 데이터 없음 → 회원가입 다시
- **본인만 표시**: family_members 테이블에 데이터 없음 → `/protected/family`에서 가족 추가

---

## 🎯 Step 3: 실제 페이지 테스트

### 3-1. 사주 분석 허브 접속
```
http://localhost:3000/protected/analysis
```

**체크리스트**:
- [ ] 4개 스토리 카드 표시됨
- [ ] "천지인 원명 분석" 카드 클릭
- [ ] SajuProfileSelector 모달 열림
- [ ] 본인 + 가족 목록 표시

### 3-2. Target 정보 확인
**본인 카드**:
- [ ] 이름 표시
- [ ] "본인" 배지 (작은 골드 박스)
- [ ] Avatar 또는 이름 첫 글자
- [ ] User 아이콘

**가족 카드**:
- [ ] 이름 + 관계 표시
- [ ] Avatar 또는 이름 첫 글자
- [ ] 관계 아이콘 (Users, Heart, Briefcase 등)
- [ ] 생년월일 표시

### 3-3. 선택 및 이동
- [ ] Target 클릭 시 체크 아이콘 표시
- [ ] URL 변경: `?targetId=xxx`
- [ ] 페이지 이동 완료

---

## 📊 Step 4: 데이터베이스 직접 확인 (선택)

### Supabase Dashboard → SQL Editor

```sql
-- 본인 데이터 확인
SELECT * FROM v_destiny_targets WHERE target_type = 'self';

-- 가족 데이터 확인
SELECT * FROM v_destiny_targets WHERE target_type = 'family';

-- RPC 함수 테스트 (your-user-id 교체)
SELECT * FROM get_user_destiny_targets('your-user-id');
```

---

## 🐛 Step 5: 브라우저 Console 테스트

### F12 → Console 탭

```javascript
// Destiny Targets 조회
const { getDestinyTargets } = await import('/app/actions/destiny-targets');
const targets = await getDestinyTargets();
console.table(targets);

// 결과 확인
// - target_type: 'self' 또는 'family'
// - name: 이름
// - relation_type: '본인', '가족' 등
```

---

## ✅ 성공 기준

### 최소 요구사항
1. ✅ `/test-destiny` 페이지에서 데이터 표시
2. ✅ `/protected/analysis`에서 SajuProfileSelector 열림
3. ✅ 본인 데이터 표시 (최소 1개)
4. ✅ Target 선택 시 페이지 이동

### 완전 성공
1. ✅ 본인 + 가족 모두 표시
2. ✅ "본인" 배지 표시
3. ✅ Avatar/첫 글자 표시
4. ✅ 관계 아이콘 표시
5. ✅ 생년월일 표시 (있는 경우)

---

## 🚨 문제 해결 빠른 가이드

### 문제 1: 마이그레이션 에러
```
"relation v_destiny_targets does not exist"
```
**해결**: Step 1 재실행

### 문제 2: 빈 데이터
```
Test 1/2/3 모두 [] 빈 배열
```
**해결**:
1. 로그인 확인
2. `/protected/family`에서 가족 추가
3. profiles 테이블 확인

### 문제 3: 본인만 표시
```
Test 결과에 target_type: 'self'만 있음
```
**정상**: family_members에 데이터가 없는 것
**해결**: `/protected/family`에서 가족 추가

### 문제 4: UI 표시 안됨
```
데이터는 있는데 UI가 깨짐
```
**해결**:
1. 브라우저 새로고침 (Ctrl+Shift+R)
2. 캐시 삭제
3. 페이지 재접속

---

## 📞 도움 요청 시 필요한 정보

1. `/test-destiny` 페이지 스크린샷
2. 브라우저 Console 에러 메시지
3. Supabase SQL Editor 쿼리 결과

---

**예상 소요 시간**: 5-10분
**난이도**: ⭐⭐☆☆☆ (중간)
