# ✅ 카카오맵 주소 검색 & 위치 설명 추가

**날짜**: 2026-02-03
**상태**: 🎉 완료

---

## 🎯 요청사항

1. **카카오맵 주소 검색 기능**
   - 천지인 사주 마지막 단계(Step 3) 풍수 입력창
   - 거주지 주소, 회사 주소 등을 검색할 수 있게

2. **위치 입력 이유 설명**
   - 출장, 행사 등으로 위치가 수시로 바뀜
   - 위치에 따라 천지인 사주가 달라짐
   - 스토리텔링 방식으로 간략하게

---

## 🔧 적용된 수정

### 1. 카카오맵 주소 검색 추가

**파일**: `components/analysis/analysis-form.tsx`

#### 1-1. 패키지 확인
```json
✅ "react-daum-postcode": "^3.2.0" (이미 설치됨)
```

#### 1-2. Import 추가
```typescript
import { MapPin, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DaumPostcode from "react-daum-postcode";
```

#### 1-3. State 추가
```typescript
const [showAddressSearch, setShowAddressSearch] = useState(false);
const [address, setAddress] = useState("");
```

#### 1-4. 주소 검색 완료 핸들러
```typescript
const handleAddressComplete = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = "";

    if (data.addressType === "R") {
        if (data.bname !== "") {
            extraAddress += data.bname;
        }
        if (data.buildingName !== "") {
            extraAddress += extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
        }
        fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
    }

    setAddress(fullAddress);
    setShowAddressSearch(false);
    toast.success("주소가 입력되었습니다.");
};
```

### 2. 스토리텔링 설명 추가

**Step 3 상단에 설명 카드 추가**:

```typescript
<div className="glass-panel p-6 rounded-xl bg-gold-500/5 border border-gold-500/20 mb-6">
    <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gold-400" />
            </div>
        </div>
        <div className="flex-1 space-y-2">
            <h3 className="text-sm font-bold text-gold-400 tracking-wide">
                왜 위치 정보가 필요한가요?
            </h3>
            <p className="text-sm text-stone-300 leading-relaxed">
                천지인(天地人) 분석에서 地(땅)는 당신이 머무는 공간의 기운을 의미합니다.
                집, 사무실, 출장지, 행사장... 장소가 바뀔 때마다 땅의 기운도 함께 변합니다.
            </p>
            <p className="text-sm text-stone-400 leading-relaxed">
                지금 이 순간, 당신이 서 있는 곳이 운명의 흐름에 영향을 줍니다.
                현재 위치를 입력하시면 더욱 정밀한 분석이 가능합니다.
            </p>
        </div>
    </div>
</div>
```

### 3. UI 개선

#### Before (기존)
```typescript
<Input
    id="address"
    name="homeAddress"
    placeholder="예: 서울시 강남구 청담동..."
    className="..."
/>
```

#### After (수정)
```typescript
<Label className="... flex items-center gap-2">
    <MapPin className="w-4 h-4" />
    현재 위치 / 거주지 / 사무실 주소 (선택)
</Label>

<div className="relative">
    <Input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="출장지, 행사장, 집, 사무실 등 현재 머무는 곳을 입력하세요"
        className="... pr-32"
    />
    <Button
        onClick={() => setShowAddressSearch(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 ..."
    >
        <Search className="w-4 h-4 mr-2" />
        주소 찾기
    </Button>
</div>

<p className="text-xs text-stone-500 flex items-center gap-1">
    <Sparkles className="w-3 h-3" />
    출장, 행사 등으로 위치가 바뀌면 다시 분석해보세요
</p>
```

### 4. 주소 검색 모달

```typescript
<Dialog open={showAddressSearch} onOpenChange={setShowAddressSearch}>
    <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-white/10">
            <DialogTitle className="text-xl font-serif flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gold-500" />
                주소 검색
            </DialogTitle>
        </DialogHeader>
        <div className="p-2">
            <DaumPostcode
                onComplete={handleAddressComplete}
                autoClose={false}
                style={{ height: "500px" }}
            />
        </div>
    </DialogContent>
</Dialog>
```

---

## 🎨 디자인 특징

### 1. 스토리텔링 설명 카드
- **배경**: 골드 그라데이션 (bg-gold-500/5)
- **테두리**: 골드 (border-gold-500/20)
- **아이콘**: MapPin 아이콘 (골드)
- **제목**: "왜 위치 정보가 필요한가요?"
- **내용**: 천지인(天地人) 개념 설명

### 2. 주소 입력 필드
- **레이블**: MapPin 아이콘 + "현재 위치 / 거주지 / 사무실 주소"
- **플레이스홀더**: "출장지, 행사장, 집, 사무실 등 현재 머무는 곳을 입력하세요"
- **버튼**: 우측에 "주소 찾기" 버튼 (골드 스타일)
- **힌트**: "출장, 행사 등으로 위치가 바뀌면 다시 분석해보세요"

### 3. 주소 검색 모달
- **크기**: max-w-2xl (넉넉한 크기)
- **높이**: 500px (DaumPostcode)
- **헤더**: MapPin 아이콘 + "주소 검색"
- **스타일**: 깔끔한 Dialog UI

---

## 🧪 테스트 방법

### 1. 브라우저 새로고침 (필수!)
```
Ctrl + Shift + R
```

### 2. 분석 페이지 접속
```
http://localhost:3000/protected/analysis
→ "천지인 원명 분석" 클릭
→ Target 선택 (생년월일 있는 대상)
→ Step 2 (관상/손금) - 선택 사항
→ Step 3 (지기 보정)
```

### 3. 주소 검색 테스트

#### 3-1. 설명 카드 확인
- [ ] "왜 위치 정보가 필요한가요?" 표시
- [ ] 천지인(天地人) 설명 표시
- [ ] 골드 스타일 적용

#### 3-2. 주소 입력 확인
- [ ] "주소 찾기" 버튼 표시
- [ ] 플레이스홀더 텍스트 표시
- [ ] 힌트 메시지 표시

#### 3-3. 주소 검색 기능
1. "주소 찾기" 버튼 클릭
2. 주소 검색 모달 열림
3. 주소 검색 (예: "청담동")
4. 주소 선택
5. Input에 주소 자동 입력
6. Toast 알림: "주소가 입력되었습니다."

#### 3-4. 직접 입력
- [ ] Input에 직접 주소 입력 가능
- [ ] 수정 가능

### 4. 분석 완료
- [ ] "천기 누설 시작하기" 클릭
- [ ] 주소가 분석에 포함됨
- [ ] 결과 페이지로 이동

---

## 📱 주소 예시

### 거주지
```
서울특별시 강남구 청담동 123
경기도 성남시 분당구 정자동 456
부산광역시 해운대구 우동 789
```

### 사무실
```
서울특별시 강남구 테헤란로 123 (역삼동, ABC빌딩)
서울특별시 중구 세종대로 100 (태평로1가)
```

### 출장지/행사장
```
제주특별자치도 제주시 애월읍 123
서울특별시 종로구 세종로 1 (세종로)
```

---

## 🔍 스토리텔링 설명 분석

### 천지인(天地人) 개념

**天 (하늘)**:
- 타고난 사주 팔자
- 변하지 않는 운명의 토대

**地 (땅)**:
- 현재 머무는 공간의 기운
- 위치에 따라 변하는 에너지
- 출장, 행사 등으로 수시로 변화

**人 (사람)**:
- 관상, 손금
- 관계와 상호작용

### 설명 포인트

1. **문제 제기**: "왜 위치 정보가 필요한가요?"
2. **개념 설명**: 地(땅)의 의미
3. **실생활 연결**: 집, 사무실, 출장지, 행사장
4. **변화 강조**: 장소가 바뀔 때마다 기운도 변함
5. **현재성 강조**: "지금 이 순간, 당신이 서 있는 곳"
6. **가치 제안**: "더욱 정밀한 분석"

---

## 🎯 사용자 시나리오

### 시나리오 1: 재택근무자
```
월요일: 집 (서울 강남)
화요일: 사무실 (판교)
수요일: 카페 (홍대)
→ 매일 다른 위치에서 분석 가능
```

### 시나리오 2: 출장이 잦은 직장인
```
평소: 서울 본사
이번 주: 부산 지점 출장
다음 주: 제주 행사
→ 출장지에서 분석하여 현지 기운 반영
```

### 시나리오 3: 이사 준비 중
```
현재 거주지: A 아파트
예정 거주지: B 아파트
→ 두 곳을 비교 분석 가능
```

---

## ✅ 완료 체크리스트

### Backend
- [x] State 관리 (address, showAddressSearch)
- [x] 주소 검색 완료 핸들러
- [x] FormData에 address 전달

### Frontend
- [x] 스토리텔링 설명 카드
- [x] 주소 입력 필드 개선
- [x] "주소 찾기" 버튼
- [x] 주소 검색 모달
- [x] DaumPostcode 통합
- [x] Toast 알림

### UX
- [x] 골드 테마 일관성
- [x] 아이콘 (MapPin, Search, Sparkles)
- [x] 플레이스홀더 텍스트
- [x] 힌트 메시지
- [x] 직접 입력 가능

---

## 📝 수정된 파일

1. ✅ `components/analysis/analysis-form.tsx`
   - Import 추가 (DaumPostcode, Dialog, 아이콘)
   - State 추가 (address, showAddressSearch)
   - handleAddressComplete 핸들러
   - 스토리텔링 설명 카드
   - 주소 입력 UI 개선
   - 주소 검색 모달

---

## 🚀 다음 단계

### 즉시 할 일
1. ✅ 브라우저 새로고침
2. ✅ Step 3까지 진행
3. ✅ 주소 검색 테스트
4. ✅ 분석 완료 확인

### 선택사항
1. 최근 검색 주소 저장 기능
2. 즐겨찾기 주소 관리
3. GPS 현재 위치 가져오기

---

## ⚠️ 주의사항

1. **Daum Postcode API**
   - 무료 사용 가능
   - 별도 API 키 불필요
   - 인터넷 연결 필요

2. **주소 형식**
   - 도로명 주소, 지번 주소 모두 지원
   - 건물명 자동 추가
   - 상세 주소는 수동 입력 가능

3. **개인정보**
   - 주소는 선택사항
   - 분석에만 사용
   - 저장되지만 공개되지 않음

---

**🎉 완료!**

**기능**: ✅ 카카오맵 주소 검색
**설명**: ✅ 스토리텔링 방식
**디자인**: ✅ 골드 테마 일관성
**UX**: ✅ 직관적 사용

**테스트**: `http://localhost:3000/protected/analysis` → Step 3 확인
