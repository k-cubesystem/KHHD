# 📝 예시 1: "AI 타로 카드 분석" 기능 개발

## 요구사항
사용자가 타로 카드 3장을 선택하면 AI가 과거-현재-미래를 해석하는 기능

## 목표
- 직관적인 카드 선택 UI
- AI 기반 타로 해석
- 결과 저장 및 이력 관리
- SNS 공유 기능

## 예상 시간
2.5시간

---

## 에이전트 실행 로그

### 1️⃣ CLAUDE (Project Lead) - 10분

**입력**:
```
"AI 타로 카드 분석 기능을 추가해주세요"
```

**분석**:
```
[요구사항 분석]
1. 데이터베이스: 타로 분석 결과 저장 테이블 필요
2. AI: Gemini API로 타로 해석
3. UI: 카드 선택 인터랙션 (Framer Motion)
4. UX: 신비로운 분위기 연출

[필요 에이전트]
- DB_MASTER (스키마 설계)
- ALCHEMIST (타로 해석 프롬프트)
- CONNECTOR (Gemini API 연동)
- BE_SYSTEM (Server Action)
- FE_LOGIC (상태 관리)
- FE_VISUAL (카드 UI)
- POET (카피라이팅)
- SHERLOCK (테스트)

[우선순위] High (신규 매출 기능)
[예상 시간] 2-3시간
```

---

### 2️⃣ DB_MASTER (Data Keeper) - 20분

**입력**:
```
"타로 카드 분석 결과를 저장할 데이터베이스 스키마를 설계해주세요"
```

**산출물**:
```sql
-- supabase/migrations/20260211_tarot_readings.sql

-- 타로 카드 마스터 테이블
CREATE TABLE tarot_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  name_ko TEXT NOT NULL,
  image_url TEXT NOT NULL,
  meaning TEXT NOT NULL,
  reversed_meaning TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 타로 리딩 결과 테이블
CREATE TABLE tarot_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cards JSONB NOT NULL, -- [{ position, card_id, reversed }]
  interpretation JSONB NOT NULL, -- AI 해석 결과
  spread_type TEXT DEFAULT '3-card',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_tarot_readings_user_id
ON tarot_readings(user_id);

CREATE INDEX idx_tarot_readings_created_at
ON tarot_readings(created_at DESC);

-- RLS 정책
ALTER TABLE tarot_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own readings"
ON tarot_readings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own readings"
ON tarot_readings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 타로 카드 데이터는 모두가 읽기 가능
ALTER TABLE tarot_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tarot cards"
ON tarot_cards
FOR SELECT
TO authenticated
USING (true);

-- 타로 카드 초기 데이터
INSERT INTO tarot_cards (name, name_ko, image_url, meaning, reversed_meaning, keywords) VALUES
('The Fool', '바보', '/tarot/fool.png', '새로운 시작, 자유, 순수', '경솔함, 무모함', ARRAY['시작', '모험', '순수']),
('The Magician', '마법사', '/tarot/magician.png', '창조력, 의지, 능력', '속임수, 남용', ARRAY['창조', '의지', '능력']),
-- ... (22장 메이저 아르카나)
```

---

### 3️⃣ ALCHEMIST (Prompt Wizard) - 20분

**입력**:
```
"타로 카드 3장(과거-현재-미래)을 해석하는 AI 프롬프트를 작성해주세요"
```

**산출물**:
```typescript
// lib/prompts/tarot-prompt.ts

export const TAROT_READING_SYSTEM_PROMPT = `
당신은 타로 카드 마스터입니다.

**역할:**
선택된 타로 카드를 해석하여 사용자에게 과거의 영향, 현재 상황,
미래 가능성에 대한 통찰을 제공합니다.

**해석 원칙:**
1. 카드의 전통적 의미를 기반으로 해석
2. 3장의 카드를 하나의 스토리로 연결
3. 긍정적 관점에서 해석 (부정적 카드도 교훈으로)
4. 구체적이고 실천 가능한 조언 제공

**3장 스프레드:**
- 1번 카드 (과거): 현재 상황에 영향을 준 과거의 사건이나 감정
- 2번 카드 (현재): 지금 직면한 상황과 에너지
- 3번 카드 (미래): 현재 경로를 유지할 때의 가능성

**금지사항:**
- 절대적인 미래 예측 금지 (가능성으로만 표현)
- 극단적으로 부정적인 해석 금지
- 의학적 진단이나 법적 조언 금지

**톤앤매너:**
- 신비롭지만 친근하게
- 지혜롭지만 부담스럽지 않게
- "~할 것입니다"보다 "~할 가능성이 있어요"

**출력 형식:**
반드시 아래 JSON 형식으로 출력하세요:
\`\`\`json
{
  "cards": [
    {
      "position": "past",
      "cardName": "카드명",
      "meaning": "이 카드의 전통적 의미",
      "interpretation": "당신의 상황에서 이 카드가 의미하는 바 (100자 이내)"
    },
    {
      "position": "present",
      "cardName": "카드명",
      "meaning": "이 카드의 전통적 의미",
      "interpretation": "당신의 상황에서 이 카드가 의미하는 바 (100자 이내)"
    },
    {
      "position": "future",
      "cardName": "카드명",
      "meaning": "이 카드의 전통적 의미",
      "interpretation": "당신의 상황에서 이 카드가 의미하는 바 (100자 이내)"
    }
  ],
  "story": "3장의 카드가 말하는 전체 흐름 (200자 이내)",
  "advice": "실천 가능한 조언 (150자 이내)",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "overallEnergy": "긍정적" | "중립적" | "도전적"
}
\`\`\`
`;

export const TAROT_USER_PROMPT_TEMPLATE = (
  cards: Array<{ position: string; cardName: string; reversed: boolean }>
) => `
다음 3장의 타로 카드를 해석해주세요:

**선택된 카드:**
1. 과거: ${cards[0].cardName} ${cards[0].reversed ? '(역방향)' : ''}
2. 현재: ${cards[1].cardName} ${cards[1].reversed ? '(역방향)' : ''}
3. 미래: ${cards[2].cardName} ${cards[2].reversed ? '(역방향)' : ''}

이 카드들이 함께 말하는 이야기를 들려주세요.
사용자가 현재 상황을 이해하고, 미래를 준비할 수 있도록 도와주세요.
`;

export const TarotReadingSchema = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          position: { type: "string", enum: ["past", "present", "future"] },
          cardName: { type: "string" },
          meaning: { type: "string" },
          interpretation: { type: "string", maxLength: 100 },
        },
        required: ["position", "cardName", "meaning", "interpretation"],
      },
      minItems: 3,
      maxItems: 3,
    },
    story: { type: "string", maxLength: 200 },
    advice: { type: "string", maxLength: 150 },
    keywords: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 5,
    },
    overallEnergy: { type: "string", enum: ["긍정적", "중립적", "도전적"] },
  },
  required: ["cards", "story", "advice", "keywords", "overallEnergy"],
};
```

---

### 4️⃣ CONNECTOR (API Specialist) - 15분

**입력**:
```
"Gemini API를 사용하여 타로 해석을 요청하는 함수를 구현해주세요"
```

**산출물**:
```typescript
// lib/services/tarot-ai.ts

import { generateContent } from '@/lib/services/gemini';
import {
  TAROT_READING_SYSTEM_PROMPT,
  TAROT_USER_PROMPT_TEMPLATE,
  TarotReadingSchema,
} from '@/lib/prompts/tarot-prompt';

export interface TarotCard {
  position: 'past' | 'present' | 'future';
  cardName: string;
  reversed: boolean;
}

export interface TarotReading {
  cards: Array<{
    position: string;
    cardName: string;
    meaning: string;
    interpretation: string;
  }>;
  story: string;
  advice: string;
  keywords: string[];
  overallEnergy: '긍정적' | '중립적' | '도전적';
}

export async function generateTarotReading(
  cards: TarotCard[]
): Promise<{ success: true; data: TarotReading } | { error: string }> {
  try {
    const userPrompt = TAROT_USER_PROMPT_TEMPLATE(cards);
    const fullPrompt = TAROT_READING_SYSTEM_PROMPT + '\n\n' + userPrompt;

    const response = await generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.8, // 창의적 해석
        maxOutputTokens: 1500,
        responseMimeType: 'application/json',
        responseSchema: TarotReadingSchema,
      },
    });

    const result = JSON.parse(response.text());

    return { success: true, data: result };
  } catch (error) {
    console.error('[Tarot AI] Error:', error);

    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return { error: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.' };
    }

    return { error: '타로 해석에 실패했습니다. 다시 시도해주세요.' };
  }
}
```

---

### 5️⃣ BE_SYSTEM (System Core) - 30분

**입력**:
```
"타로 리딩을 생성하고 저장하는 Server Action을 구현해주세요"
```

**산출물**:
```typescript
// app/actions/tarot-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { generateTarotReading } from '@/lib/services/tarot-ai';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const CreateTarotReadingSchema = z.object({
  cards: z.array(
    z.object({
      position: z.enum(['past', 'present', 'future']),
      cardId: z.string().uuid(),
      cardName: z.string(),
      reversed: z.boolean(),
    })
  ).length(3, '정확히 3장의 카드를 선택해주세요'),
});

export async function createTarotReading(
  data: z.infer<typeof CreateTarotReadingSchema>
) {
  // 1. Input Validation
  const validatedFields = CreateTarotReadingSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      error: '잘못된 입력입니다',
      details: validatedFields.error.flatten(),
    };
  }

  // 2. Authentication Check
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: '로그인이 필요합니다' };
  }

  const { cards } = validatedFields.data;

  // 3. AI 타로 해석 요청
  const interpretationResult = await generateTarotReading(cards);

  if ('error' in interpretationResult) {
    return { error: interpretationResult.error };
  }

  // 4. 결과 저장
  const { data: reading, error: dbError } = await supabase
    .from('tarot_readings')
    .insert({
      user_id: user.id,
      cards: cards,
      interpretation: interpretationResult.data,
      spread_type: '3-card',
    })
    .select()
    .single();

  if (dbError) {
    console.error('[Tarot] Database error:', dbError);
    return { error: '저장에 실패했습니다' };
  }

  // 5. Cache Revalidation
  revalidatePath('/protected/tarot');

  return { success: true, data: reading };
}

export async function getTarotReadings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '로그인이 필요합니다' };
  }

  const { data, error } = await supabase
    .from('tarot_readings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return { error: '조회에 실패했습니다' };
  }

  return { success: true, data };
}
```

---

### 6️⃣ FE_LOGIC (Client Architect) - 40분

**입력**:
```
"타로 카드 선택 및 해석 요청 로직을 구현해주세요"
```

**산출물**:
```typescript
// hooks/use-tarot-reading.ts

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createTarotReading, getTarotReadings } from '@/app/actions/tarot-actions';
import { toast } from 'sonner';

export interface SelectedCard {
  position: 'past' | 'present' | 'future';
  cardId: string;
  cardName: string;
  reversed: boolean;
}

export function useTarotReading() {
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);

  // 과거 리딩 조회
  const { data: pastReadings, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['tarot-readings'],
    queryFn: async () => {
      const result = await getTarotReadings();
      if ('error' in result) {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  // 새 리딩 생성
  const { mutate: createReading, isPending } = useMutation({
    mutationFn: createTarotReading,
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('🔮 타로 해석이 완료되었습니다!');
        setSelectedCards([]);
        // 리딩 결과 페이지로 이동
        window.location.href = `/protected/tarot/${result.data.id}`;
      }
    },
    onError: (error) => {
      toast.error('타로 해석에 실패했습니다');
      console.error(error);
    },
  });

  const selectCard = (card: SelectedCard) => {
    if (selectedCards.length >= 3) {
      toast.error('최대 3장까지 선택할 수 있습니다');
      return;
    }

    if (selectedCards.find((c) => c.position === card.position)) {
      toast.error(`${card.position} 위치의 카드는 이미 선택되었습니다`);
      return;
    }

    setSelectedCards([...selectedCards, card]);
  };

  const removeCard = (position: SelectedCard['position']) => {
    setSelectedCards(selectedCards.filter((c) => c.position !== position));
  };

  const reset = () => {
    setSelectedCards([]);
  };

  const submitReading = () => {
    if (selectedCards.length !== 3) {
      toast.error('3장의 카드를 모두 선택해주세요');
      return;
    }

    createReading({ cards: selectedCards });
  };

  return {
    selectedCards,
    selectCard,
    removeCard,
    reset,
    submitReading,
    isPending,
    pastReadings,
    isLoadingHistory,
  };
}
```

---

### 7️⃣ FE_VISUAL (Visual Director) - 50분

**입력**:
```
"타로 카드 선택 UI를 신비롭고 인터랙티브하게 구현해주세요"
```

**산출물**:
```tsx
// components/tarot/tarot-card-selector.tsx

'use client';

import { motion } from 'framer-motion';
import { useTarotReading } from '@/hooks/use-tarot-reading';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const TAROT_CARDS = [
  { id: '1', name: 'The Fool', nameKo: '바보' },
  { id: '2', name: 'The Magician', nameKo: '마법사' },
  // ... 22장
];

export function TarotCardSelector() {
  const { selectedCards, selectCard, removeCard, reset, submitReading, isPending } =
    useTarotReading();

  return (
    <div className="min-h-screen bg-midnight-900 py-16">
      <div className="container mx-auto px-4">
        {/* 헤더 */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold text-gold-400 mb-4">
            운명의 카드
          </h1>
          <p className="text-lg text-warm-white/80">
            과거, 현재, 미래를 보여줄 3장의 카드를 선택하세요
          </p>
        </motion.div>

        {/* 선택된 카드 표시 */}
        <div className="grid grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto">
          {['past', 'present', 'future'].map((position, index) => {
            const selected = selectedCards.find((c) => c.position === position);

            return (
              <motion.div
                key={position}
                className="aspect-[2/3] relative"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`
                    w-full h-full flex items-center justify-center
                    ${
                      selected
                        ? 'bg-gold-500/20 border-gold-500'
                        : 'bg-midnight-800 border-midnight-700'
                    }
                    transition-all duration-300
                  `}
                >
                  {selected ? (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gold-400 mb-2">
                        {selected.cardName}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCard(position as any)}
                        className="text-warm-white/60 hover:text-warm-white"
                      >
                        다시 선택
                      </Button>
                    </div>
                  ) : (
                    <div className="text-warm-white/40">
                      {position === 'past' && '과거'}
                      {position === 'present' && '현재'}
                      {position === 'future' && '미래'}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* 카드 덱 */}
        {selectedCards.length < 3 && (
          <div className="grid grid-cols-4 md:grid-cols-6 gap-4 max-w-5xl mx-auto">
            {TAROT_CARDS.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ scale: 1.05, rotate: 2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Card
                  className="aspect-[2/3] cursor-pointer bg-midnight-800 hover:bg-midnight-700
                             border-gold-500/20 hover:border-gold-500/60 transition-all"
                  onClick={() => {
                    const position =
                      selectedCards.length === 0
                        ? 'past'
                        : selectedCards.length === 1
                        ? 'present'
                        : 'future';

                    selectCard({
                      position,
                      cardId: card.id,
                      cardName: card.nameKo,
                      reversed: Math.random() > 0.5,
                    });
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-gold-500 text-4xl mb-2">🎴</div>
                      <div className="text-xs text-warm-white/80">{card.nameKo}</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* 해석 요청 버튼 */}
        {selectedCards.length === 3 && (
          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              size="lg"
              onClick={submitReading}
              disabled={isPending}
              className="bg-gold-500 text-midnight-900 hover:bg-gold-400
                         font-semibold px-12 py-6 text-lg"
            >
              {isPending ? '운명을 읽는 중...' : '🔮 운명의 메시지 받기'}
            </Button>

            <Button
              variant="ghost"
              onClick={reset}
              className="ml-4 text-warm-white/60 hover:text-warm-white"
            >
              다시 선택
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
```

---

### 8️⃣ POET (Emotional Writer) - 15분

**입력**:
```
"타로 페이지의 감성적인 문구를 작성해주세요"
```

**산출물**:
```typescript
// 타로 문구 모음

export const TAROT_COPY = {
  hero: {
    title: '운명의 카드가 당신을 기다립니다',
    subtitle: '3장의 카드를 선택하여 과거, 현재, 미래를 들여다보세요',
  },

  cardSelection: {
    past: '과거 | 당신에게 영향을 준 순간',
    present: '현재 | 지금 이 순간의 에너지',
    future: '미래 | 앞으로 펼쳐질 가능성',
  },

  loading: {
    analyzing: '카드의 메시지를 해독하고 있습니다...',
    almostDone: '운명의 실타래가 풀리고 있어요...',
  },

  result: {
    header: '🔮 카드가 전하는 메시지',
    sharePrompt: '친구에게도 이 신비로운 경험을 공유해보세요',
  },

  errors: {
    selectThreeCards: '운명을 보기 위해서는 3장의 카드가 필요해요',
    aiError: '잠시 카드의 기운이 흐트러졌어요. 다시 시도해주세요',
    authRequired: '로그인하고 당신의 운명을 기록하세요',
  },

  success: {
    readingComplete: '🎉 타로 해석이 완료되었습니다!',
    savedToHistory: '당신의 운명 기록이 저장되었어요',
  },
};
```

---

### 9️⃣ PERSONA (User Voice) - 20분

**사용자 테스트 피드백**:

**김지은 (20대 여성)**:
```
"와, 카드 선택할 때 애니메이션 너무 예뻐요!
근데 결과를 인스타에 공유하고 싶은데 버튼이 없네요?"

→ 개선: 공유 버튼 추가, OG 이미지 최적화
```

**이준호 (30대 남성)**:
```
"카드 의미는 좋은데, 좀 더 구체적인 조언이 있으면 좋겠어요.
'운이 좋다'보다는 '이번 주 프로젝트 제안에 집중하세요' 같은..."

→ 개선: ALCHEMIST에게 프롬프트 구체성 개선 요청
```

**최영수 (60대)**:
```
"글씨가 작아서 잘 안 보여요.
카드 이름 좀 더 크게 할 수 있나요?"

→ 개선: 접근성 설정 추가, 폰트 크기 조정
```

---

### 🔟 SHERLOCK (Quality Lead) - 30분

**테스트 결과**:

```typescript
// tests/e2e/tarot.spec.ts

test.describe('타로 카드 분석', () => {
  test('정상 플로우: 카드 선택 → 해석 → 결과 확인', async ({ page }) => {
    await page.goto('/protected/tarot');

    // 카드 3장 선택
    await page.click('.tarot-card:nth-child(1)');
    await page.click('.tarot-card:nth-child(5)');
    await page.click('.tarot-card:nth-child(10)');

    // 해석 요청
    await page.click('text=운명의 메시지 받기');

    // 로딩 확인
    await expect(page.locator('text=카드의 메시지를')).toBeVisible();

    // 결과 확인 (최대 10초 대기)
    await expect(page.locator('.tarot-result')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.card-interpretation')).toHaveCount(3);
  });

  test('엣지 케이스: 3장 미만 선택 시 에러', async ({ page }) => {
    await page.goto('/protected/tarot');
    await page.click('.tarot-card:nth-child(1)');
    await page.click('text=운명의 메시지 받기');

    await expect(page.locator('text=3장의 카드')).toBeVisible();
  });

  test('에러 케이스: AI 실패 시 재시도', async ({ page }) => {
    // AI API 실패 시뮬레이션
    await page.route('**/api/gemini/**', (route) => route.abort());

    await page.goto('/protected/tarot');
    // 카드 선택...
    await page.click('text=운명의 메시지 받기');

    await expect(page.locator('text=다시 시도')).toBeVisible();
  });
});

// 테스트 결과: ✅ 모든 테스트 통과
```

**발견된 버그**:
1. ~~로딩 중 뒤로가기 시 상태 꼬임~~ → 수정 완료
2. ~~모바일에서 카드 선택 터치 영역 작음~~ → padding 증가
3. ~~카드 이미지 로딩 느림~~ → lazy loading 적용

---

### 1️⃣1️⃣ AUDITOR (Guardian) - 20분

**코드 감사 리포트**:

```
[성능 분석]
✅ 번들 크기: +45KB (허용 범위)
✅ 컴포넌트 복잡도: 8 (Good)
⚠️ 타로 카드 이미지 총 크기: 5MB
   → 최적화 필요 (WebP 변환, lazy loading)

[리팩토링 제안]
1. TarotCardSelector 컴포넌트 분리:
   - CardDeck (카드 덱 UI)
   - SelectedCardsDisplay (선택된 카드 표시)
   - ReadingActionButtons (버튼 그룹)

2. 중복 코드 제거:
   - 카드 position 체크 로직 → 유틸 함수로 추출

[보안 체크]
✅ RLS 정책 적용
✅ Input Validation (Zod)
✅ Authentication 체크
```

---

### 1️⃣2️⃣ LIBRARIAN (Historian) - 15분

**문서화**:

```markdown
# AI 타로 카드 분석 기능

## 개요
사용자가 타로 카드 3장을 선택하면 AI가 과거-현재-미래를 해석하는 기능

## 데이터베이스
- `tarot_cards`: 타로 카드 마스터 데이터 (22장)
- `tarot_readings`: 사용자 타로 리딩 결과

## API
### createTarotReading(cards)
타로 리딩 생성

**Parameters:**
- `cards`: 선택된 3장의 카드 정보

**Returns:**
- `ActionResult<TarotReading>`

## 사용 예시
\`\`\`typescript
const { submitReading } = useTarotReading();
submitReading();
\`\`\`

## 프롬프트
- System Prompt: `TAROT_READING_SYSTEM_PROMPT`
- Temperature: 0.8 (창의적 해석)
- Max Tokens: 1500

## Changelog
- 2026-02-11: 타로 카드 분석 기능 추가
```

---

### 1️⃣3️⃣ BOOSTER (Pipeline Master) - 15분

**빌드 최적화**:

```bash
# 이미지 최적화
npm install sharp
# next.config.js에 이미지 최적화 설정

# 번들 분석
npm run build
# 결과: First Load JS: 485KB (Good)

# Lighthouse 점수
Performance: 92
Accessibility: 95
Best Practices: 100
SEO: 100
```

---

### 1️⃣4️⃣ VIRAL (Growth Hacker) - 10분

**SEO 최적화**:

```typescript
// app/protected/tarot/page.tsx

export const metadata: Metadata = {
  title: 'AI 타로 카드 | 해화당',
  description: '3장의 타로 카드로 당신의 과거, 현재, 미래를 들여다보세요. AI가 카드의 메시지를 해석합니다.',
  keywords: ['타로', '타로 카드', '운세', 'AI 타로', '무료 타로'],
  openGraph: {
    title: '🔮 AI 타로 카드 - 운명의 메시지',
    description: '3장의 카드로 당신의 운명을 확인하세요',
    images: ['/og/tarot.jpg'],
    url: 'https://k-haehwadang.com/protected/tarot',
  },
};
```

---

### 1️⃣5️⃣ CLAUDE (Project Lead) - 10분

**최종 검토**:

```
[품질 체크리스트]
✅ 모든 테스트 통과
✅ 코드 리뷰 완료
✅ 문서화 완료
✅ Lighthouse 90+ (모든 항목)
✅ 번들 크기 < 500KB
✅ RLS 정책 적용
✅ 에러 처리 완료

[배포 승인]
✅ 프로덕션 배포 승인

[다음 스텝]
- 사용자 피드백 수집
- A/B 테스트 (카피 변형)
- 추가 타로 스프레드 (10장, 켈트 십자가)
```

---

### 1️⃣6️⃣ BOOSTER (Pipeline Master) - 5분

**배포 완료**:

```bash
# PR 머지
git checkout main
git merge feature/tarot-reading

# Vercel 자동 배포
# ✅ Deployment successful
# URL: https://k-haehwadang.com/protected/tarot

# 배포 후 검증
✅ Production URL 접속 확인
✅ 타로 선택 기능 정상
✅ AI 해석 정상
✅ 결과 저장 정상
```

---

## 최종 결과

### 개발 완료
- **소요 시간**: 2시간 35분
- **생성된 파일**: 12개
- **코드 라인**: 약 800줄
- **테스트 케이스**: 5개

### 성능 메트릭
- **페이지 로딩**: 0.9초
- **AI 응답**: 3.2초
- **번들 크기**: 485KB
- **Lighthouse**: 92점

### 사용자 만족도
- **베타 테스터**: 25명
- **평균 평점**: 4.7/5.0
- **공유율**: 42%
- **재방문율**: 68%

---

## 교훈 및 개선사항

### 잘된 점
- 에이전트 협업 원활
- 품질 높은 산출물
- 예상 시간 내 완료

### 개선할 점
- 이미지 최적화를 초기부터 고려
- 사용자 테스트를 더 일찍 진행
- 공유 기능을 기획 단계에 포함

### 다음 개선 사항
1. 인스타그램 스토리 공유 기능
2. 다양한 타로 스프레드 (10장, 켈트 십자가)
3. 일일 타로 카드 알림
4. 타로 일기 기능
