# PHASE 2: AI 채팅 무료화

## 🎯 목표
AI 채팅을 무료 사용자도 이용 가능하게 하되, PRO 회원과 차등 혜택 제공으로 업그레이드 유도

## ✅ 완료 조건 (Definition of Done)
- [ ] 무료 사용자 1일 1회 (3턴) 사용 가능
- [ ] PRO 사용자 무제한 사용
- [ ] 일일 사용 횟수 추적 시스템 작동
- [ ] 부적 차감 차등 적용 (무료 100장, PRO 50장)
- [ ] UI에 무료/PRO 차이 명확히 표시
- [ ] 업그레이드 유도 배너 구현
- [ ] 대기 시간 차등 적용 (무료 3초 지연)
- [ ] DB 마이그레이션 완료
- [ ] 모든 엣지 케이스 테스트 통과
- [ ] 코드 리뷰 완료

---

## 👥 에이전트 임무 할당

### 🛡️ BE_SYSTEM (System Core)
**책임**: 무료화 로직 재설계, 서버 액션 수정

#### 임무 1: `ai-shaman-chat.ts` 액션 수정
**파일**: `app/actions/ai-shaman-chat.ts`

**현재 문제점** (line 58-59):
```typescript
const { isSubscribed } = await getSubscriptionStatus();
if (!isSubscribed) return { success: false, error: "Pro 멤버십 전용 서비스입니다." };
```

**수정 후**:
```typescript
"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deductTalisman } from "./wallet-actions";
import { getSubscriptionStatus } from "./subscription-actions";

// --- 새로운 제한 로직 ---
const FREE_USER_LIMITS = {
  dailySessions: 1,
  turnsPerSession: 3,
  talismanCost: 100,
  responseDelay: 3000 // 3초
};

const PRO_USER_LIMITS = {
  dailySessions: Infinity,
  turnsPerSession: 3,
  talismanCost: 50,
  responseDelay: 0
};

// --- 일일 사용 횟수 체크 ---
async function checkDailyUsage(userId: string) {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ai_chat_usage')
    .select('session_count')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error(error);
    return { count: 0 };
  }

  return { count: data?.session_count || 0 };
}

async function incrementDailyUsage(userId: string) {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase.rpc('increment_ai_chat_usage', {
    p_user_id: userId,
    p_date: today
  });

  if (error) console.error(error);
}

// --- 수정된 sendShamanChatMessage ---
export async function sendShamanChatMessage(
  message: string,
  conversationHistory: ShamanChatMessage[],
  turnCount: number
): Promise<ShamanChatResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "로그인 필요" };

    // 1. 구독 상태 확인
    const { isSubscribed } = await getSubscriptionStatus();
    const limits = isSubscribed ? PRO_USER_LIMITS : FREE_USER_LIMITS;

    // 2. 무료 사용자는 일일 사용 횟수 체크
    if (!isSubscribed) {
      const usage = await checkDailyUsage(user.id);
      if (usage.count >= limits.dailySessions) {
        return {
          success: false,
          error: "오늘의 무료 사용 횟수를 모두 사용했습니다. 프리미엄으로 업그레이드하시면 무제한 이용하실 수 있습니다.",
          upgradeRequired: true
        };
      }

      // 첫 메시지인 경우 세션 카운트 증가
      if (turnCount === 0) {
        await incrementDailyUsage(user.id);
      }
    }

    // 3. 턴 수 제한 체크
    if (turnCount >= limits.turnsPerSession) {
      return { success: false, error: "대화 횟수 초과" };
    }

    // 4. 부적 차감 (차등 적용)
    const deductResult = await deductTalisman("SHAMAN_CHAT", limits.talismanCost);
    if (!deductResult.success) {
      return {
        success: false,
        error: deductResult.error,
        insufficientTalisman: true
      };
    }

    // 5. 무료 사용자는 응답 지연 (남용 방지 + PRO 유도)
    if (!isSubscribed && limits.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, limits.responseDelay));
    }

    // 6. 기존 AI 생성 로직 (동일)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    const { data: history } = await supabase
      .from('analysis_history')
      .select('category, result_json, summary, score')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const sajuRecord = history?.find(h => h.category === 'SAJU' || h.category === 'TODAY');
    const faceRecord = history?.find(h => h.category === 'FACE');
    const handRecord = history?.find(h => h.category === 'HAND');

    const contextParts = [`## 기본 정보\n- 이름: ${profile?.name}\n- 직업: ${profile?.job}`];
    if (sajuRecord) contextParts.push(`## 사주 분석\n- ${sajuRecord.summary}`);
    if (faceRecord) contextParts.push(`## 관상 분석\n- ${faceRecord.summary}`);
    if (handRecord) contextParts.push(`## 손금 분석\n- ${handRecord.summary}`);

    const userContext = contextParts.join("\n\n");

    const systemPrompt = await getSystemPrompt('shaman_chat', { name: profile?.name || "내담자", context: userContext })
      || "당신은 해화당의 AI 신당을 지키는 멘토입니다.";

    const model = getGeminiModel();
    const chat = model.startChat({
      history: conversationHistory.map(msg => ({ role: msg.role === "user" ? "user" : "model", parts: [{ text: msg.content }] })),
    });

    const result = await chat.sendMessage(`${systemPrompt}\n\n[Context]\n${userContext}\n\n[User Question]\n${message}`);
    const responseText = result.response.text();

    const questions = [];
    if (sajuRecord) questions.push("제 사주에 맞는 재물 관리법은?");
    if (faceRecord) questions.push("관상학적으로 부족한 부분을 보완하려면?");
    questions.push("올해 가장 조심해야 할 것은?");

    return {
      success: true,
      response: responseText,
      turnsRemaining: limits.turnsPerSession - turnCount - 1,
      suggestedQuestions: questions.slice(0, 3),
      isProUser: isSubscribed,
      talismanUsed: limits.talismanCost
    };

  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

// --- 새로운 함수: 일일 사용 가능 횟수 조회 ---
export async function getAIChatUsageStatus() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "로그인 필요" };

    const { isSubscribed } = await getSubscriptionStatus();
    const limits = isSubscribed ? PRO_USER_LIMITS : FREE_USER_LIMITS;

    if (isSubscribed) {
      return {
        success: true,
        isPro: true,
        remaining: "무제한",
        total: "무제한"
      };
    }

    const usage = await checkDailyUsage(user.id);

    return {
      success: true,
      isPro: false,
      remaining: limits.dailySessions - usage.count,
      total: limits.dailySessions,
      used: usage.count
    };

  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
```

#### 임무 2: `wallet-actions.ts` 수정
**파일**: `app/actions/wallet-actions.ts`

**변경 사항**: `deductTalisman` 함수에 `customAmount` 파라미터 추가

```typescript
export async function deductTalisman(category: string, customAmount?: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인 필요" };

  // 기존 카테고리별 고정 비용
  const COST_MAP: Record<string, number> = {
    SAJU: 100,
    TODAY: 50,
    TAROT: 80,
    SHAMAN_CHAT: 100, // 기본값 (무료)
    // ... 기타
  };

  const cost = customAmount || COST_MAP[category] || 0;

  // ... 기존 로직
}
```

---

### 🗄️ DB_MASTER (Data Keeper)
**책임**: 사용 횟수 추적 테이블 설계

#### 임무 1: 마이그레이션 파일 생성
**파일**: `supabase/migrations/20260212_phase2_ai_chat_free.sql`

```sql
-- =============================================
-- PHASE 2: AI 채팅 무료화 - 사용 추적 테이블
-- =============================================

-- 1. AI 채팅 일일 사용 추적 테이블
CREATE TABLE IF NOT EXISTS ai_chat_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_count INT DEFAULT 0 CHECK (session_count >= 0),
  total_turns INT DEFAULT 0 CHECK (total_turns >= 0),
  total_talisman_used INT DEFAULT 0 CHECK (total_talisman_used >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

-- 인덱스
CREATE INDEX idx_ai_chat_usage_user ON ai_chat_usage(user_id);
CREATE INDEX idx_ai_chat_usage_date ON ai_chat_usage(usage_date DESC);

-- RLS 정책
ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON ai_chat_usage FOR SELECT
  USING (auth.uid() = user_id);

-- 관리자는 모든 사용 기록 조회 가능
CREATE POLICY "Admins can view all usage"
  ON ai_chat_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 2. RPC 함수: 사용 횟수 증가
CREATE OR REPLACE FUNCTION increment_ai_chat_usage(
  p_user_id UUID,
  p_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_chat_usage (user_id, usage_date, session_count, total_turns)
  VALUES (p_user_id, p_date, 1, 0)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    session_count = ai_chat_usage.session_count + 1,
    updated_at = NOW();
END;
$$;

-- 3. RPC 함수: 턴 수 기록
CREATE OR REPLACE FUNCTION record_ai_chat_turn(
  p_user_id UUID,
  p_date DATE,
  p_talisman_used INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_chat_usage
  SET
    total_turns = total_turns + 1,
    total_talisman_used = total_talisman_used + p_talisman_used,
    updated_at = NOW()
  WHERE user_id = p_user_id AND usage_date = p_date;

  IF NOT FOUND THEN
    INSERT INTO ai_chat_usage (user_id, usage_date, session_count, total_turns, total_talisman_used)
    VALUES (p_user_id, p_date, 0, 1, p_talisman_used);
  END IF;
END;
$$;

-- 4. 자동 삭제 트리거 (30일 이상 된 기록)
CREATE OR REPLACE FUNCTION cleanup_old_ai_chat_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM ai_chat_usage
  WHERE usage_date < CURRENT_DATE - INTERVAL '30 days';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_cleanup_ai_chat_usage
  AFTER INSERT ON ai_chat_usage
  EXECUTE FUNCTION cleanup_old_ai_chat_usage();
```

---

### ⚙️ FE_LOGIC (Client Architect)
**책임**: UI 로직, 상태 관리

#### 임무 1: `shaman-chat-interface.tsx` 수정
**파일**: `components/ai/shaman-chat-interface.tsx`

**변경 사항**:

1. **사용 횟수 표시 추가** (line 186-205 사이):
```typescript
export function ShamanChatInterface() {
  const [messages, setMessages] = useState<ShamanChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [starterQuestions, setStarterQuestions] = useState<string[]>([]);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // 새로 추가
  const [usageStatus, setUsageStatus] = useState<{
    isPro: boolean;
    remaining: number | string;
    total: number | string;
    used?: number;
  } | null>(null);

  // ... existing code

  // Load usage status
  useEffect(() => {
    const loadUsageStatus = async () => {
      const result = await getAIChatUsageStatus();
      if (result.success) {
        setUsageStatus({
          isPro: result.isPro,
          remaining: result.remaining,
          total: result.total,
          used: result.used
        });
      }
    };
    loadUsageStatus();
  }, []);

  // ... existing code (line 170 이후)
```

2. **헤더 부분 수정** (line 188-218):
```typescript
<div className="flex items-center justify-center gap-3">
  {/* Pro Badge 또는 Free Badge */}
  {usageStatus?.isPro ? (
    <Badge className="bg-gold-500/20 text-gold-300 border-gold-500/30 px-3 py-1">
      <Crown className="w-3 h-3 mr-1" />
      Pro 무제한
    </Badge>
  ) : (
    <Badge className="bg-seal-500/20 text-seal-300 border-seal-500/30 px-3 py-1">
      무료 {usageStatus?.remaining}/{usageStatus?.total}
    </Badge>
  )}

  <Badge
    variant={turnCount >= 3 ? "destructive" : "default"}
    className={cn(
      "px-3 py-1",
      turnCount >= 3
        ? "bg-seal-500/20 text-seal-500 border-seal-500/30"
        : "bg-ink-700 text-gold-300 border-gold-500/30"
    )}
  >
    대화 {turnCount}/3
  </Badge>

  <Button
    variant="ghost"
    size="sm"
    onClick={toggleSound}
    className="text-gold-300 hover:text-gold-400 hover:bg-gold-500/10"
  >
    {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
  </Button>
</div>
```

3. **업그레이드 배너 추가** (CardContent 안, line 230 이후):
```typescript
<CardContent className="p-6">
  {/* 무료 사용자에게 업그레이드 유도 배너 */}
  {!usageStatus?.isPro && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 p-4 bg-gradient-to-r from-gold-500/10 to-gold-600/10 border border-gold-500/30 rounded-lg"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-gold-400" />
          <div>
            <p className="text-sm font-bold text-gold-300">프리미엄으로 업그레이드하세요</p>
            <p className="text-xs text-gold-100/70">무제한 대화 + 부적 50% 할인</p>
          </div>
        </div>
        <Link href="/protected/membership">
          <Button size="sm" className="bg-gold-500 hover:bg-gold-600 text-ink-900">
            업그레이드
          </Button>
        </Link>
      </div>
    </motion.div>
  )}

  {/* Messages Area */}
  <div className="h-[500px] overflow-y-auto mb-6 space-y-4 pr-2 custom-scrollbar">
    {/* ... existing messages */}
  </div>
```

4. **에러 처리 개선** (handleSendMessage 함수):
```typescript
const handleSendMessage = async (messageText?: string) => {
  // ... existing validation

  setIsLoading(true);
  setHasStarted(true);

  const userMessage: ShamanChatMessage = {
    role: "user",
    content: textToSend,
    timestamp: new Date().toISOString(),
  };

  setMessages(prev => [...prev, userMessage]);
  setInputMessage("");

  try {
    const result = await sendShamanChatMessage(textToSend, messages, turnCount);

    if (result.success && result.response) {
      // ... existing success logic

      // 사용 횟수 업데이트
      if (turnCount === 0) {
        const newUsageStatus = await getAIChatUsageStatus();
        if (newUsageStatus.success) {
          setUsageStatus({
            isPro: newUsageStatus.isPro,
            remaining: newUsageStatus.remaining,
            total: newUsageStatus.total,
            used: newUsageStatus.used
          });
        }
      }

      toast.success(`응답 완료 (남은 대화: ${result.turnsRemaining}회)`);
    } else {
      // 업그레이드 필요 에러
      if (result.upgradeRequired) {
        toast.error(result.error || "무료 사용 횟수 초과", {
          action: {
            label: "업그레이드",
            onClick: () => window.location.href = "/protected/membership"
          },
          duration: 5000
        });
      }
      // 부적 부족 에러
      else if (result.insufficientTalisman) {
        toast.error(result.error || "부적이 부족합니다", {
          action: {
            label: "충전하기",
            onClick: () => window.location.href = "/protected/membership"
          },
          duration: 5000
        });
      }
      // 일반 에러
      else {
        toast.error(result.error || "메시지 전송 실패");
      }
    }
  } catch (error) {
    console.error("Chat error:", error);
    toast.error("예기치 않은 오류가 발생했습니다.");
  } finally {
    setIsLoading(false);
  }
};
```

---

### 🎨 FE_VISUAL (Visual Director)
**책임**: 업그레이드 유도 UI 디자인

#### 임무 1: 프리미엄 비교 테이블 모달
**컴포넌트**: `components/ai/premium-comparison-modal.tsx`

```typescript
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, X } from "lucide-react";
import Link from "next/link";

interface PremiumComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PremiumComparisonModal({ isOpen, onClose }: PremiumComparisonModalProps) {
  const features = [
    { name: "일일 대화 횟수", free: "1회 (3턴)", pro: "무제한" },
    { name: "부적 사용", free: "100장/세션", pro: "50장/세션 (50% 할인)" },
    { name: "응답 속도", free: "3초 지연", pro: "즉시 응답" },
    { name: "컨텍스트 길이", free: "기본", pro: "확장 (3배)" },
    { name: "우선 지원", free: false, pro: true },
    { name: "독점 프롬프트", free: false, pro: true },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-ink-800 border-gold-500/20 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-gold-300 text-center">
            프리미엄 플랜 비교
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold-500/20">
                <th className="py-3 text-left text-gold-100/60">기능</th>
                <th className="py-3 text-center text-gold-100/60">무료</th>
                <th className="py-3 text-center text-gold-300">
                  <Crown className="w-5 h-5 inline mr-1" />
                  프리미엄
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, idx) => (
                <tr key={idx} className="border-b border-gold-500/10">
                  <td className="py-3 text-gold-100/80">{feature.name}</td>
                  <td className="py-3 text-center text-gold-100/60">
                    {typeof feature.free === 'boolean' ? (
                      feature.free ? <Check className="w-5 h-5 mx-auto text-green-400" /> : <X className="w-5 h-5 mx-auto text-seal-500" />
                    ) : (
                      feature.free
                    )}
                  </td>
                  <td className="py-3 text-center text-gold-300 font-semibold">
                    {typeof feature.pro === 'boolean' ? (
                      feature.pro ? <Check className="w-5 h-5 mx-auto text-gold-400" /> : <X className="w-5 h-5 mx-auto text-seal-500" />
                    ) : (
                      feature.pro
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1 border-gold-500/30 text-gold-300">
            나중에
          </Button>
          <Link href="/protected/membership" className="flex-1">
            <Button className="w-full bg-gold-500 hover:bg-gold-600 text-ink-900 font-bold">
              지금 업그레이드
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 임무 2: "준비 중" 메시지 개선
무료 사용자가 일일 횟수를 다 쓴 경우:

```typescript
{/* Info Notice - 무료 사용자 횟수 초과 시 */}
{!usageStatus?.isPro && usageStatus?.remaining === 0 && (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-4 text-center p-6 bg-ink-700/30 border border-gold-500/20 rounded-lg"
  >
    <Crown className="w-12 h-12 mx-auto mb-3 text-gold-400" />
    <p className="text-lg font-serif text-gold-300 mb-2">
      오늘의 무료 대화를 모두 사용했습니다
    </p>
    <p className="text-sm text-gold-100/70 mb-4">
      프리미엄으로 업그레이드하면 무제한으로 대화할 수 있습니다
    </p>
    <Link href="/protected/membership">
      <Button className="bg-gold-500 hover:bg-gold-600 text-ink-900">
        프리미엄 알아보기
      </Button>
    </Link>
  </motion.div>
)}
```

---

### 📢 VIRAL (Growth Hacker)
**책임**: 업그레이드 전환 최적화

#### 임무 1: A/B 테스트 문구
**버전 A (FOMO 강조)**:
> "❌ 오늘의 무료 대화 종료
> ⏰ 내일 다시 오시거나, 지금 업그레이드하고 무제한 상담받기"

**버전 B (혜택 강조)**:
> "🎁 프리미엄 혜택
> ✅ 무제한 대화 ✅ 부적 50% 할인 ✅ 우선 응답
> 첫 달 30% 할인 중!"

#### 임무 2: 전환 깔때기 추적
**이벤트 로깅**:
- `ai_chat_free_limit_reached` - 무료 횟수 도달
- `ai_chat_upgrade_clicked` - 업그레이드 버튼 클릭
- `ai_chat_upgraded` - 실제 결제 완료

**목표 전환율**: 무료 횟수 도달자의 10% 업그레이드

---

### 🕵️ SHERLOCK (Quality Lead)
**책임**: QA 테스트

#### 임무 1: 테스트 시나리오
**파일**: `.agent/phases/PHASE_2_QA_SCENARIOS.md`

**무료 사용자 시나리오**:
- [ ] TC-001: 첫 대화 시작 시 세션 카운트 증가 확인
- [ ] TC-002: 3턴 완료 후 종료 확인
- [ ] TC-003: 같은 날 두 번째 대화 시도 시 에러 메시지
- [ ] TC-004: 자정 이후 리셋 확인
- [ ] TC-005: 부적 100장 차감 확인
- [ ] TC-006: 응답 3초 지연 확인
- [ ] TC-007: 업그레이드 배너 표시 확인

**PRO 사용자 시나리오**:
- [ ] TC-101: 무제한 세션 확인
- [ ] TC-102: 부적 50장 차감 확인
- [ ] TC-103: 즉시 응답 확인
- [ ] TC-104: "Pro 무제한" 배지 표시 확인

**엣지 케이스**:
- [ ] TC-201: 대화 중 자정 넘김 (세션 유지 여부)
- [ ] TC-202: 무료 → PRO 업그레이드 직후 즉시 사용 가능 확인
- [ ] TC-203: 부적 부족 시 적절한 에러 메시지
- [ ] TC-204: 네트워크 끊김 시 중복 차감 방지

---

### ⚖️ AUDITOR (Guardian)
**책임**: 보안 검증

#### 임무 1: 보안 체크리스트
- [ ] 클라이언트에서 횟수 조작 불가능 확인
- [ ] RLS 정책으로 타인의 사용 기록 조회 불가 확인
- [ ] RPC 함수 SECURITY DEFINER 적용 확인
- [ ] 부적 차감 중복 방지 (트랜잭션)
- [ ] SQL 인젝션 방지 (파라미터 바인딩)

#### 임무 2: 남용 방지
- [ ] Rate Limiting (1분에 10회 이상 요청 시 차단)
- [ ] 봇 탐지 (비정상적 패턴 로깅)

---

### 📚 LIBRARIAN (Historian)
**책임**: 문서화

#### 임무 1: API 문서 업데이트
**파일**: `docs/API.md`

**새로운 함수**:
- `getAIChatUsageStatus()` - 일일 사용 현황 조회
- `increment_ai_chat_usage()` - RPC 함수
- `record_ai_chat_turn()` - RPC 함수

#### 임무 2: CHANGELOG
```markdown
## [v1.3.0] - 2026-02-12

### Changed
- AI 채팅을 무료 사용자도 이용 가능 (1일 1회)
- PRO 사용자는 무제한 + 부적 50% 할인

### Added
- ai_chat_usage 테이블 (일일 사용 추적)
- 업그레이드 유도 배너
- 무료/PRO 비교 모달

### Fixed
- AI 채팅 부적 차감 중복 방지
```

---

## 🔧 구현 순서

### Day 1: 백엔드
1. DB_MASTER: 마이그레이션 실행
2. BE_SYSTEM: Server Actions 수정

### Day 2: 프론트엔드
1. FE_LOGIC: UI 로직 수정
2. FE_VISUAL: 업그레이드 배너/모달 구현

### Day 3: 테스트 & 디버깅
1. SHERLOCK: QA 전체 수행
2. AUDITOR: 보안 검증
3. 버그 수정

### Day 4: 문서화 & 승인
1. LIBRARIAN: 문서 업데이트
2. CLAUDE: 최종 승인

---

## ✅ Phase 2 완료 승인 기준

- [ ] 무료 사용자 1일 1회 제한 작동
- [ ] PRO 사용자 무제한 작동
- [ ] 부적 차등 차감 확인
- [ ] 업그레이드 배너 표시
- [ ] QA 테스트 100% 통과
- [ ] 보안 검증 완료
- [ ] 문서화 완료

**승인자**: 👑 CLAUDE (Project Lead)

---

**다음 단계**: PHASE 3 - 관리자 대시보드 고도화
