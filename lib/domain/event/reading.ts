import 'server-only'

import { calculateManse, type SajuPillar } from '@/lib/domain/saju/manse'
import { generateAIContent } from '@/lib/services/ai-client'
import { guardAiInput } from '@/lib/ai/input-guard'

/**
 * 이벤트 간이 풀이 — 비로그인 응모자용. 명식(순수 계산)은 정식과 동일하고, 해석만 «간이»다.
 *
 * analyzeCheonjiinAction 을 재사용하지 않는 이유: targetId(family_members)·로그인·복채 차감에
 * 묶여 있다. 여기는 생년월일시만 받아 명식을 세우고 flash 로 3~4문단을 만든다.
 *
 * 🔴 결과는 «초안»이다. 사람이 승인해야 발송된다(PLAN §2.5). 그래서 가드레일을 프롬프트에
 * 넣되, 최종 방어는 어드민 승인 큐다 — 프롬프트만 믿지 않는다.
 */

export type EventTopic = 'saju' | 'compatibility' | 'wealth' | 'career' | 'love' | 'family'

export const EVENT_TOPICS: Record<EventTopic, { label: string; focus: string }> = {
  saju: { label: '사주 총운', focus: '타고난 기질과 올해의 큰 흐름' },
  compatibility: { label: '궁합', focus: '두 사람의 기운이 만나는 방식과 서로 보완할 지점' },
  wealth: { label: '재물운', focus: '재물이 들고 나는 흐름과 이 시기의 태도' },
  career: { label: '직장·이직', focus: '일에서의 강점과 지금 시기의 선택 기준' },
  love: { label: '연애', focus: '관계에서 드러나는 성향과 이 시기 마음의 흐름' },
  family: { label: '가족', focus: '가족 안에서의 역할과 서로를 이해할 실마리' },
}

export interface EventReadingInput {
  topic: EventTopic
  birthDate: string // YYYY-MM-DD
  birthTime?: string | null // HH:mm
  gender: 'male' | 'female' | 'other'
  question: string
  displayName?: string // 마스킹된 이름/아이디(«김*진», «@ha***»)
}

export interface EventReadingDraft {
  pillars: { year: string; month: string; day: string; time: string }
  dayMaster: string
  reading: string
  /** 카드용 한 줄 요약(≤40자) */
  headline: string
  model: string
}

function pillarKo(p: SajuPillar): string {
  return `${p.korean}(${p.ganHan}${p.jiHan})`
}

/**
 * 가드레일 — MARKETING.md §2 + Meta 정책. 프롬프트에 «해도 되는 말»과 «안 되는 말»을 관찰 사실로 적는다.
 * 메타 지시(CRITICAL 등)는 안 쓴다(이미지 프롬프트 규율과 같은 결).
 */
const SYSTEM_PROMPT = `당신은 청담해화당의 사주 해설자입니다. 명식(사주팔자)을 바탕으로 짧은 간이 풀이를 씁니다.

문체: 차분하고 따뜻한 경어. 무게 있되 어렵지 않게. 300~450자, 3~4문단.
구조: ① 일간(日干)이 드러내는 기질 한 문단 ② 요청 주제에 대한 흐름 한두 문단 ③ 이 시기의 태도·실마리 한 문단.

쓰는 방식:
- 명식에서 «읽히는 것»을 말합니다. 미래를 «단정»하지 않습니다. "~한 흐름이 보입니다", "~에 마음이 기울기 쉬운 때입니다"처럼 씁니다.
- 결과를 약속하지 않습니다. "이루어집니다", "반드시", "해결됩니다", "합격합니다" 같은 말은 쓰지 않습니다.
- 두려움을 주지 않습니다. "액운", "위험", "큰일" 같은 말로 겁주지 않습니다.
- 상대의 개인 사정을 단정하지 않습니다. "지금 힘드시죠", "불행하신 것 같습니다" 같은 말은 쓰지 않습니다.
- 건강·법률·투자 판단을 대신하지 않습니다.
- 정식 풀이 홍보를 넣지 않습니다(그건 화면이 합니다).
- 이모지·해시태그·제목 없이 본문만 씁니다.`

export async function generateEventReading(input: EventReadingInput): Promise<EventReadingDraft> {
  const manse = calculateManse(input.birthDate, input.birthTime || '00:00')
  const pillars = {
    year: pillarKo(manse.year),
    month: pillarKo(manse.month),
    day: pillarKo(manse.day),
    time: input.birthTime ? pillarKo(manse.time) : '시 미상',
  }
  const dayMaster = `${manse.day.ganHan}${manse.day.gan}`
  const topic = EVENT_TOPICS[input.topic]
  const q = guardAiInput(input.question, 500).text

  const userPrompt = [
    `명식: 년주 ${pillars.year} · 월주 ${pillars.month} · 일주 ${pillars.day} · 시주 ${pillars.time}`,
    `일간(日干): ${dayMaster}`,
    `성별: ${input.gender === 'male' ? '남' : input.gender === 'female' ? '여' : '미표기'}`,
    `요청 주제: ${topic.label} — ${topic.focus}`,
    `본인이 적은 궁금한 점: "${q}"`,
    input.displayName ? `호칭: ${input.displayName}님` : '',
    '',
    '위 명식으로 간이 풀이를 써 주세요. 마지막 줄에 «한 줄 요약: …» 형식으로 40자 이내 요약을 덧붙이세요.',
  ]
    .filter(Boolean)
    .join('\n')

  const res = await generateAIContent({
    featureKey: 'event-reading',
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 1200,
    temperature: 0.7,
    actionType: 'event_reading',
  })

  const { body, headline } = splitHeadline(res.text)
  return { pillars, dayMaster, reading: body, headline, model: res.model }
}

/** 마지막 «한 줄 요약: …» 줄을 떼어 카드 헤드라인으로. 없으면 첫 문장에서 만든다. */
export function splitHeadline(text: string): { body: string; headline: string } {
  const lines = text.trim().split('\n')
  const idx = lines.findIndex((l) => /^\s*한\s*줄\s*요약\s*[:：]/.test(l))
  if (idx >= 0) {
    const headline = lines[idx]
      .replace(/^\s*한\s*줄\s*요약\s*[:：]\s*/, '')
      .trim()
      .slice(0, 40)
    const body = [...lines.slice(0, idx), ...lines.slice(idx + 1)].join('\n').trim()
    return { body, headline }
  }
  const first = text.trim().split(/(?<=[.。!?])\s/)[0] ?? ''
  return { body: text.trim(), headline: first.slice(0, 40) }
}

/** 공개 카드용 마스킹 — «hae_hwa» → «ha***». 아이디 전부 노출 금지(동의했어도 마스킹). */
export function maskUsername(username: string): string {
  const u = username.replace(/^@/, '')
  if (u.length <= 2) return `${u[0] ?? '*'}***`
  return `${u.slice(0, 2)}***`
}
