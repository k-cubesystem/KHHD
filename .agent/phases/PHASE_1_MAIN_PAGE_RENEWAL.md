# PHASE 1: 메인 페이지 리뉴얼

## 🎯 목표
메인 페이지를 마케팅 중심으로 재설계하여 사용자 전환율 및 참여도 극대화

## ✅ 완료 조건 (Definition of Done)
- [ ] 이벤트 배너 3종 구현 및 작동 확인
- [ ] 일일 출석 체크 시스템 작동 (DB 연동)
- [ ] 행운의 룰렛 구현 및 부적 지급 확인
- [ ] 퀵 액션 버튼 8개 모두 실제 페이지 연결
- [ ] CTA 문구 개선 및 클릭률 측정 코드 삽입
- [ ] 온보딩 툴팁 시스템 구현 (신규 사용자 대상)
- [ ] Progress Indicator 애니메이션 강화
- [ ] 모바일/데스크톱 반응형 확인
- [ ] 라이트하우스 성능 점수 90점 이상
- [ ] 크로스 브라우저 테스트 통과 (Chrome, Safari, Firefox)
- [ ] QA 테스트 시나리오 전체 통과
- [ ] 코드 리뷰 완료 (AUDITOR)

---

## 👥 에이전트 임무 할당

### 🎨 FE_VISUAL (Visual Director)
**책임**: UI 디자인, 시각적 매력, 애니메이션

#### 임무 1: 이벤트 배너 섹션 디자인
- **위치**: Hero2026 바로 아래
- **디자인 컨셉**:
  - 파스텔 골드 그라데이션 배경 (#ECB613 → #D4AF37)
  - 부드러운 블러 효과 (backdrop-blur-md)
  - Framer Motion의 stagger 애니메이션
- **배너 3종**:
  1. **신규 가입 혜택**: "🎁 첫 운세 무료 + 부적 1,000장"
  2. **친구 초대**: "👥 친구 1명당 부적 500장 + 친구도 500장"
  3. **이달의 할인**: "⚡ 프리미엄 패키지 30% OFF (D-7)"
- **구현 파일**: `components/events/event-banners.tsx`
- **Figma 참고**: Dark Luxury 컬러 팔레트 준수

#### 임무 2: Progress Indicator 애니메이션 강화
- **현재 문제**: FortuneEnergyGauge의 진행바가 정적임
- **개선안**:
  - 채워지는 애니메이션 (0% → 현재% 1초간)
  - 펄스 효과 (완료 시 금빛 펄스)
  - 숫자 카운터 애니메이션 (0 → 현재값 스무스 증가)
- **적용 파일**: `components/fortune/fortune-energy-gauge.tsx`

#### 임무 3: 온보딩 툴팁 시스템 디자인
- **라이브러리**: React Joyride 또는 커스텀 구현
- **스텝**:
  1. "여기서 부적을 충전하세요"
  2. "8가지 운세를 모두 채우면 대운이 옵니다"
  3. "AI 무당에게 고민을 상담하세요"
- **스타일**: 골드 테두리, 반투명 배경, 화살표 인디케이터

---

### ⚙️ FE_LOGIC (Client Architect)
**책임**: React 로직, 상태 관리, 컴포넌트 구조

#### 임무 1: 일일 출석 체크 시스템 구현
**컴포넌트**: `components/events/daily-check-in.tsx`

```typescript
// 상태 관리
- isCheckedToday: boolean (로컬 스토리지 + DB 조회)
- consecutiveDays: number (연속 출석 일수)
- rewards: { day: number, talisman: number }[] (보상 테이블)

// 로직
1. 페이지 로드 시 오늘 출석 여부 확인 (checkDailyAttendance 액션)
2. "출석하기" 버튼 클릭 → recordDailyAttendance 액션
3. 부적 지급 (기본 50장 + 연속 보너스)
4. 애니메이션 효과 (confetti + toast)
5. 7일 연속 시 특별 보너스 (500장)
```

**Server Action**: `app/actions/daily-check-actions.ts`
- `checkDailyAttendance()` → { checked: boolean, consecutiveDays: number }
- `recordDailyAttendance()` → { success: boolean, reward: number }

**DB 테이블**: `daily_attendance`
```sql
CREATE TABLE daily_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  checked_at DATE NOT NULL DEFAULT CURRENT_DATE,
  consecutive_days INT DEFAULT 1,
  reward_talisman INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, checked_at)
);
```

#### 임무 2: 행운의 룰렛 시스템 구현
**컴포넌트**: `components/events/lucky-roulette.tsx`

```typescript
// 상태
- isSpinning: boolean
- canSpin: boolean (1일 1회 제한)
- result: { type: string, value: number } | null

// 보상 테이블 (확률)
[
  { label: "부적 50장", value: 50, probability: 40 },
  { label: "부적 100장", value: 100, probability: 30 },
  { label: "부적 300장", value: 300, probability: 20 },
  { label: "부적 1000장", value: 1000, probability: 9 },
  { label: "프리미엄 1개월", value: 0, probability: 1 }
]

// 로직
1. 룰렛 회전 애니메이션 (360deg × 5 + 랜덤 각도)
2. 서버에서 확률 계산 (클라이언트 조작 방지)
3. 결과 모달 표시 + 부적 지급
4. 로컬 스토리지에 마지막 스핀 시간 저장
```

**Server Action**: `app/actions/roulette-actions.ts`
- `checkRouletteAvailability()` → { canSpin: boolean, nextAvailableTime: Date }
- `spinRoulette()` → { success: boolean, reward: { type, value }, nextAvailableTime }

**DB 테이블**: `roulette_history`
```sql
CREATE TABLE roulette_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  reward_type VARCHAR(50) NOT NULL,
  reward_value INT NOT NULL,
  spun_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 1일 1회 제한을 위한 인덱스
CREATE INDEX idx_roulette_user_date ON roulette_history(user_id, DATE(spun_at));
```

#### 임무 3: 퀵 액션 버튼 연결 확인
**파일**: `app/protected/page.tsx` (line 193-235)

**체크리스트**:
- [ ] `/protected/ai-shaman` ✅ 구현됨
- [ ] `/protected/saju/today` ⚠️ FeatureGuard로 보호됨 → 확인 필요
- [ ] `/protected/fortune/weekly` ❌ 미구현 → PHASE 4에서 생성
- [ ] `/protected/fortune/monthly` ❌ 미구현 → PHASE 4에서 생성

**조치**:
1. 미구현 페이지는 임시로 "준비 중" 모달 표시
2. PHASE 4 완료 후 실제 페이지로 교체

---

### 🛡️ BE_SYSTEM (System Core)
**책임**: 서버 액션, 비즈니스 로직, 보안

#### 임무 1: 일일 출석 액션 구현
**파일**: `app/actions/daily-check-actions.ts`

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { addTalisman } from "./wallet-actions";

const ATTENDANCE_REWARDS = {
  base: 50,
  consecutive_bonus: {
    3: 100,  // 3일 연속 시 +100
    7: 500,  // 7일 연속 시 +500
    30: 2000 // 30일 연속 시 +2000
  }
};

export async function checkDailyAttendance() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인 필요" };

  const today = new Date().toISOString().split('T')[0];

  // 오늘 출석 여부 확인
  const { data: todayRecord } = await supabase
    .from('daily_attendance')
    .select('*')
    .eq('user_id', user.id)
    .eq('checked_at', today)
    .single();

  if (todayRecord) {
    return {
      success: true,
      checked: true,
      consecutiveDays: todayRecord.consecutive_days
    };
  }

  // 어제 출석 여부로 연속 일수 계산
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const { data: yesterdayRecord } = await supabase
    .from('daily_attendance')
    .select('consecutive_days')
    .eq('user_id', user.id)
    .eq('checked_at', yesterdayStr)
    .single();

  const consecutiveDays = yesterdayRecord ? yesterdayRecord.consecutive_days : 0;

  return {
    success: true,
    checked: false,
    consecutiveDays
  };
}

export async function recordDailyAttendance() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인 필요" };

  const today = new Date().toISOString().split('T')[0];

  // 중복 체크
  const { data: existing } = await supabase
    .from('daily_attendance')
    .select('*')
    .eq('user_id', user.id)
    .eq('checked_at', today)
    .single();

  if (existing) {
    return { success: false, error: "이미 출석하셨습니다." };
  }

  // 연속 일수 계산
  const checkResult = await checkDailyAttendance();
  const newConsecutiveDays = checkResult.consecutiveDays + 1;

  // 보상 계산
  let reward = ATTENDANCE_REWARDS.base;
  if (ATTENDANCE_REWARDS.consecutive_bonus[newConsecutiveDays]) {
    reward += ATTENDANCE_REWARDS.consecutive_bonus[newConsecutiveDays];
  }

  // DB 기록
  const { error: insertError } = await supabase
    .from('daily_attendance')
    .insert({
      user_id: user.id,
      checked_at: today,
      consecutive_days: newConsecutiveDays,
      reward_talisman: reward
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // 부적 지급
  await addTalisman(reward, `일일 출석 보상 (${newConsecutiveDays}일 연속)`);

  return {
    success: true,
    reward,
    consecutiveDays: newConsecutiveDays
  };
}
```

#### 임무 2: 룰렛 액션 구현
**파일**: `app/actions/roulette-actions.ts`

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { addTalisman } from "./wallet-actions";

const ROULETTE_REWARDS = [
  { type: "talisman", value: 50, probability: 40 },
  { type: "talisman", value: 100, probability: 30 },
  { type: "talisman", value: 300, probability: 20 },
  { type: "talisman", value: 1000, probability: 9 },
  { type: "premium", value: 30, probability: 1 } // 30일 프리미엄
];

export async function checkRouletteAvailability() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인 필요" };

  const today = new Date().toISOString().split('T')[0];

  const { data: todayRecord } = await supabase
    .from('roulette_history')
    .select('*')
    .eq('user_id', user.id)
    .gte('spun_at', `${today}T00:00:00`)
    .single();

  if (todayRecord) {
    const nextAvailable = new Date(todayRecord.spun_at);
    nextAvailable.setDate(nextAvailable.getDate() + 1);
    return {
      success: true,
      canSpin: false,
      nextAvailableTime: nextAvailable
    };
  }

  return { success: true, canSpin: true };
}

export async function spinRoulette() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인 필요" };

  // 사용 가능 여부 확인
  const availCheck = await checkRouletteAvailability();
  if (!availCheck.canSpin) {
    return { success: false, error: "오늘은 이미 룰렛을 돌렸습니다." };
  }

  // 확률 계산 (서버 사이드)
  const rand = Math.random() * 100;
  let cumulative = 0;
  let selectedReward = ROULETTE_REWARDS[0];

  for (const reward of ROULETTE_REWARDS) {
    cumulative += reward.probability;
    if (rand <= cumulative) {
      selectedReward = reward;
      break;
    }
  }

  // 기록 저장
  const { error: insertError } = await supabase
    .from('roulette_history')
    .insert({
      user_id: user.id,
      reward_type: selectedReward.type,
      reward_value: selectedReward.value
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // 보상 지급
  if (selectedReward.type === "talisman") {
    await addTalisman(selectedReward.value, "행운의 룰렛 보상");
  } else if (selectedReward.type === "premium") {
    // TODO: 프리미엄 멤버십 지급 로직 (PHASE 2에서 구현)
  }

  const nextAvailable = new Date();
  nextAvailable.setDate(nextAvailable.getDate() + 1);

  return {
    success: true,
    reward: selectedReward,
    nextAvailableTime: nextAvailable
  };
}
```

---

### 🗄️ DB_MASTER (Data Keeper)
**책임**: 스키마 설계, 마이그레이션, 인덱스 최적화

#### 임무 1: 마이그레이션 파일 생성
**파일**: `supabase/migrations/20260211_phase1_events.sql`

```sql
-- =============================================
-- PHASE 1: 메인 페이지 리뉴얼 - 이벤트 테이블
-- =============================================

-- 1. 일일 출석 테이블
CREATE TABLE IF NOT EXISTS daily_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  checked_at DATE NOT NULL DEFAULT CURRENT_DATE,
  consecutive_days INT DEFAULT 1 CHECK (consecutive_days >= 1),
  reward_talisman INT NOT NULL CHECK (reward_talisman >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, checked_at)
);

-- 인덱스
CREATE INDEX idx_daily_attendance_user ON daily_attendance(user_id);
CREATE INDEX idx_daily_attendance_date ON daily_attendance(checked_at DESC);

-- RLS 정책
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance"
  ON daily_attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attendance"
  ON daily_attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. 행운의 룰렛 기록 테이블
CREATE TABLE IF NOT EXISTS roulette_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('talisman', 'premium', 'discount')),
  reward_value INT NOT NULL CHECK (reward_value >= 0),
  spun_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_roulette_user ON roulette_history(user_id);
CREATE INDEX idx_roulette_date ON roulette_history(user_id, DATE(spun_at));

-- RLS 정책
ALTER TABLE roulette_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roulette history"
  ON roulette_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roulette history"
  ON roulette_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. 이벤트 배너 관리 테이블 (관리자 전용)
CREATE TABLE IF NOT EXISTS event_banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  cta_text VARCHAR(50) NOT NULL,
  cta_link VARCHAR(200) NOT NULL,
  icon VARCHAR(50), -- 이모지 또는 아이콘 이름
  background_color VARCHAR(50) DEFAULT '#ECB613',
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0, -- 높을수록 먼저 표시
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_event_banners_active ON event_banners(is_active, priority DESC);

-- RLS 정책 (모든 사용자 읽기 가능, 관리자만 수정)
ALTER TABLE event_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active banners"
  ON event_banners FOR SELECT
  USING (is_active = true);

-- 관리자 정책은 나중에 추가

-- 4. 기본 이벤트 배너 데이터 삽입
INSERT INTO event_banners (title, description, cta_text, cta_link, icon, priority, is_active) VALUES
('신규 가입 혜택', '첫 운세 무료 + 부적 1,000장 증정', '지금 받기', '/protected/membership', '🎁', 3, true),
('친구 초대 이벤트', '친구 1명당 부적 500장 + 친구도 500장', '초대하기', '/protected/referral', '👥', 2, true),
('이달의 특가', '프리미엄 패키지 30% 할인 (7일 남음)', '구매하기', '/protected/membership', '⚡', 1, true);

-- 5. 온보딩 상태 추가 (profiles 테이블 확장)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT 0;
```

#### 임무 2: 데이터 무결성 검증
- 모든 테이블에 적절한 제약조건 추가 (CHECK, UNIQUE, NOT NULL)
- 외래 키 ON DELETE CASCADE 설정 (사용자 삭제 시 관련 데이터 자동 삭제)
- 인덱스 성능 테스트 (EXPLAIN ANALYZE)

---

### 📢 VIRAL (Growth Hacker)
**책임**: SEO, 마케팅 문구, 성장 전략

#### 임무 1: 이벤트 배너 카피라이팅
**원칙**:
- FOMO (Fear Of Missing Out) 유발
- 숫자로 명확한 혜택 제시
- 긴급성 표현 (D-7, 오늘만 등)

**최종 카피**:
1. **신규 가입 혜택**
   - 제목: "🎁 첫 운세 무료 + 부적 1,000장"
   - 설명: "지금 가입하면 모든 운세를 무료로 체험하세요"
   - CTA: "1분 만에 시작하기"

2. **친구 초대**
   - 제목: "👥 친구 초대당 부적 500장"
   - 설명: "친구도 500장 받으니 Win-Win! 최대 10,000장까지"
   - CTA: "초대 링크 복사"

3. **이달의 할인**
   - 제목: "⚡ 프리미엄 30% 할인 (D-7)"
   - 설명: "연간 결제 시 추가 10% 할인 (총 40% OFF)"
   - CTA: "지금 구매하고 절약하기"

#### 임무 2: 메인 페이지 SEO 최적화
**파일**: `app/protected/page.tsx`

```typescript
export const metadata = {
  title: "청담해화당 | AI 사주, 타로, 풍수 - 오늘의 운세 무료",
  description: "국내 최고의 AI 운세 플랫폼. 사주, 타로, 관상, 손금을 무료로 분석받고 매일 부적을 모아보세요. 신규 가입 시 1,000장 증정!",
  keywords: "AI 사주, 무료 운세, 타로, 오늘의 운세, 관상, 손금, 풍수, 부적, 청담해화당",
  openGraph: {
    title: "청담해화당 - AI가 풀어주는 당신의 운명",
    description: "첫 운세 무료 + 부적 1,000장 증정! 지금 바로 시작하세요.",
    images: ["/og-image-main.png"],
    type: "website"
  }
};
```

---

### ✍️ POET (Emotional Writer)
**책임**: UX 라이팅, 감성적 문구

#### 임무 1: CTA 버튼 문구 개선
**Before → After**:
- "충전하기" → "부적 받기 (첫 충전 20% 보너스)"
- "확인" → "나의 운명 확인하기"
- "저장" → "내 운세 기록하기"
- "다음" → "다음 단계로 →"

#### 임무 2: 온보딩 툴팁 스크립트
**Step 1: 부적 지갑**
> "👋 어서오세요! 여기가 당신의 부적 지갑입니다.
> 매일 출석만 해도 부적이 쌓여요. 지금 바로 받으러 가볼까요?"

**Step 2: 8가지 운세**
> "🌟 8가지 운세를 모두 채우면 대운(大運)이 옵니다!
> 하나씩 완료할 때마다 금빛 기운이 채워지는 걸 느껴보세요."

**Step 3: AI 무당**
> "💬 고민이 있으신가요? AI 신당의 무당님께 물어보세요.
> 천지인의 지혜로 당신만의 해답을 찾아드립니다."

**Step 4: 마무리**
> "✨ 이제 준비됐습니다!
> 오늘부터 당신의 운세를 직접 관리해보세요.
> 행운이 함께하길 바랍니다."

---

### 🕵️ SHERLOCK (Quality Lead)
**책임**: QA, 버그 추적, 엣지 케이스 테스트

#### 임무 1: QA 테스트 시나리오 작성
**파일**: `.agent/phases/PHASE_1_QA_SCENARIOS.md`

**테스트 케이스**:

**1. 일일 출석 체크**
- [ ] TC-001: 첫 출석 시 50장 지급 확인
- [ ] TC-002: 연속 3일 시 150장 (50+100) 지급 확인
- [ ] TC-003: 연속 7일 시 550장 (50+500) 지급 확인
- [ ] TC-004: 중간에 하루 빠지면 연속 일수 초기화 확인
- [ ] TC-005: 같은 날 중복 출석 시도 시 에러 메시지 확인
- [ ] TC-006: 자정을 넘기면 새로운 출석 가능 확인
- [ ] TC-007: 타임존 이슈 테스트 (서버 시간 vs 사용자 시간)

**2. 행운의 룰렛**
- [ ] TC-101: 1일 1회 제한 작동 확인
- [ ] TC-102: 확률 분포 검증 (1000회 시뮬레이션)
- [ ] TC-103: 부적 지급 확인 (50, 100, 300, 1000장)
- [ ] TC-104: 프리미엄 당첨 시 멤버십 연장 확인
- [ ] TC-105: 룰렛 회전 애니메이션 정상 작동 확인
- [ ] TC-106: 네트워크 끊김 시 중복 지급 방지 확인

**3. 이벤트 배너**
- [ ] TC-201: 3개 배너 모두 표시 확인
- [ ] TC-202: 클릭 시 올바른 페이지 이동 확인
- [ ] TC-203: 관리자가 배너 비활성화 시 숨김 확인
- [ ] TC-204: 우선순위 순서대로 표시 확인
- [ ] TC-205: 모바일에서 반응형 레이아웃 확인

**4. 퀵 액션 버튼**
- [ ] TC-301: 4개 버튼 모두 클릭 가능 확인
- [ ] TC-302: 미구현 페이지 클릭 시 "준비 중" 모달 표시
- [ ] TC-303: FeatureGuard 작동 확인 (feat_saju_today)

**5. 온보딩 툴팁**
- [ ] TC-401: 신규 사용자에게만 표시 확인
- [ ] TC-402: 4단계 순차 진행 확인
- [ ] TC-403: "건너뛰기" 버튼 작동 확인
- [ ] TC-404: 완료 후 다시 표시 안 됨 확인

#### 임무 2: 크로스 브라우저 테스트
- Chrome 최신 버전
- Safari (iOS 포함)
- Firefox
- Edge

#### 임무 3: 성능 테스트
- Lighthouse 점수 90점 이상
- First Contentful Paint (FCP) < 1.5초
- Largest Contentful Paint (LCP) < 2.5초
- Cumulative Layout Shift (CLS) < 0.1

---

### ⚖️ AUDITOR (Guardian)
**책임**: 코드 리뷰, 리팩토링 제안

#### 임무 1: 코드 리뷰 체크리스트
**파일**: `.agent/phases/PHASE_1_CODE_REVIEW.md`

**체크 항목**:
- [ ] TypeScript 타입 안전성 (any 사용 금지)
- [ ] 에러 핸들링 누락 없음
- [ ] 불필요한 useEffect 제거
- [ ] 메모이제이션 적용 (useMemo, useCallback)
- [ ] 서버 액션에 try-catch 적용
- [ ] RLS 정책 누락 없음
- [ ] SQL 인젝션 방지
- [ ] 민감 정보 로깅 금지
- [ ] 접근성 (a11y) 준수 (버튼에 aria-label 등)
- [ ] 모바일 반응형 확인

#### 임무 2: 리팩토링 제안
**DRY 원칙**:
- 반복되는 스타일 → Tailwind 유틸리티 클래스로 추출
- 중복 로직 → Custom Hook으로 분리

**예시**:
```typescript
// Before
const [isLoading, setIsLoading] = useState(false);
const handleClick = async () => {
  setIsLoading(true);
  await someAction();
  setIsLoading(false);
};

// After (Custom Hook)
const { execute, isLoading } = useAsyncAction(someAction);
```

---

### 📚 LIBRARIAN (Historian)
**책임**: 문서화, 변경 이력 관리

#### 임무 1: 개발 문서 작성
**파일**: `docs/PHASE_1_DEVELOPMENT.md`

**내용**:
- 컴포넌트 트리 다이어그램
- 데이터 플로우 (Server Action → DB → UI)
- 새로운 API 엔드포인트 목록
- 환경 변수 추가 사항

#### 임무 2: CHANGELOG 업데이트
**파일**: `CHANGELOG.md`

```markdown
## [v1.2.0] - 2026-02-11

### Added
- 이벤트 배너 시스템 (3종 배너)
- 일일 출석 체크 기능 (연속 보너스)
- 행운의 룰렛 (1일 1회 무료)
- 온보딩 툴팁 시스템
- Progress Indicator 애니메이션 강화

### Changed
- 메인 페이지 레이아웃 개선
- CTA 버튼 문구 개선
- SEO 메타데이터 최적화

### Fixed
- 퀵 액션 버튼 미연결 이슈
```

---

## 🔧 구현 순서

### Week 1 (Day 1-3): 백엔드 & DB 준비
1. **DB_MASTER**: 마이그레이션 실행
2. **BE_SYSTEM**: Server Actions 구현
3. **SHERLOCK**: DB 무결성 테스트

### Week 1 (Day 4-5): 프론트엔드 구현
1. **FE_VISUAL**: 컴포넌트 디자인
2. **FE_LOGIC**: 로직 구현
3. **POET**: 문구 적용

### Week 2 (Day 1-2): 통합 & 테스트
1. **FE_LOGIC**: 전체 통합
2. **SHERLOCK**: QA 테스트 전체 수행
3. **AUDITOR**: 코드 리뷰

### Week 2 (Day 3): 디버깅 & 최적화
1. 버그 수정
2. 성능 최적화
3. **LIBRARIAN**: 문서화 완료

---

## 🐛 디버깅 가이드

### 일일 출석 이슈
**문제**: 타임존 차이로 오늘/어제 판단 오류
**해결**: 서버 시간 기준으로 통일 (UTC → KST 변환)

### 룰렛 확률 조작 방지
**문제**: 클라이언트에서 확률 계산 시 조작 가능
**해결**: 서버에서 확률 계산 후 결과만 전달

### RLS 정책 누락
**문제**: 테이블 생성 후 RLS 미설정 시 보안 취약
**해결**: 모든 신규 테이블에 자동으로 RLS ENABLE

---

## ✅ Phase 1 완료 승인 기준

### 기능 완료
- [ ] 모든 서브 태스크 완료 (이벤트 배너, 출석, 룰렛, 온보딩)
- [ ] QA 테스트 100% 통과
- [ ] 코드 리뷰 승인 (AUDITOR)

### 성능
- [ ] Lighthouse 점수 90점 이상
- [ ] LCP < 2.5초

### 문서화
- [ ] 개발 문서 작성 완료
- [ ] CHANGELOG 업데이트

### 승인자
👑 **CLAUDE (Project Lead)** 최종 승인

---

**다음 단계**: PHASE 2 - AI 채팅 무료화
