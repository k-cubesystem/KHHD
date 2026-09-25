/**
 * AI 풀이 — 처방전·그룹 지도의 «엔진 값을 쉬운 말로 풀어 쓰기» (CEO 2026-09-07: 「가족·인연 관리에도 AI 풀이」).
 *
 * 🔴 AI 는 새로 판정하지 않는다. 여기서 만든 프롬프트는 엔진이 이미 정한 값(모자란 기운·챙기는 길·
 *    곁에 둘 것·관계 라벨·사람들의 성향)을 싣고, 모델에게는 «풀어 쓰라»고만 한다(remedyPromptBlock 규율).
 * 🔴 돌봄의 말이다 — 점수·순위·채용 어휘 금지. 출력은 validateNarrative 가 다시 거른다.
 * 🔴 함께 보기(둘·셋·넷)는 형식(여섯 토막)이 달라 `together-prompt.ts` 에 있다.
 *
 * ## 처방전·그룹 v2 (2026-09-25) — 함께 보기 v2(41차)의 규율을 그대로 옮겼다
 *  - 옛 프롬프트는 «신당 상담가»(합니다체) + TERM_DISCIPLINE(모든 개념을 «결»로) + PREMIUM_PROSE_LAYER(문어) 세 목소리였고,
 *    「~이 붙습니다·~이 트입니다」로 쓰라고 시켰다 — 물건 옆에서는 그대로 효과 주장(표시광고법)이 된다.
 *  - 재료도 엔진 문장 그대로였다(火·명식·옅은·일간·克). 이제 한자·명리 용어 없이 바꿔 넘긴다
 *    (ELEMENT_PLAIN·ELEMENT_WORD·ROLE_PEOPLE·pairLine — 함께 보기와 같은 사전).
 *  - 물건·색·방향·시간·먹을거리는 «떠올리는 신호». 어려운 말 문지기(jargonMax)를 세 갈래 모두에 건다.
 *
 * 순수 함수만 둔다. 해시·DB·모델 호출은 액션이 한다.
 */
import { ELEMENTS } from '@/lib/domain/shrine/energy'
import type { RemedyKind } from '@/lib/domain/remedy/remedy'
import { GEMINI_OUTPUT_TOKENS_FLOOR } from '@/lib/config/ai-models'
import { ELEMENT_PLAIN, bannedWordsIn } from './element-lore'
import type { Filler, Prescription } from './prescription'
import type { CircleEnergy } from './team-energy'
import {
  BANNED_ALL,
  ELEMENT_WORD,
  KIND_CONTEXT,
  PLAIN_SWAPS,
  TOGETHER_CLICHES,
  TOGETHER_GENERATION,
  TOGETHER_JARGON_MAX,
  TOGETHER_LEGACY_HEADINGS,
  TOGETHER_SECTIONS,
  TOGETHER_SYSTEM_PROMPT,
  cautionLines,
  elementWord,
  needsLine,
  pairLine,
  togetherJargonHits,
  togetherRetryNote,
  type TogetherSection,
} from './together-prompt'

export {
  TOGETHER_JARGON_MAX,
  TOGETHER_LEGACY_HEADINGS,
  TOGETHER_SECTIONS,
  TOGETHER_SYSTEM_PROMPT,
  togetherJargonHits,
  togetherPrompt,
} from './together-prompt'
export type { TogetherSection } from './together-prompt'

export type NarrativeKind = 'prescription' | 'circle' | 'together'

export const NARRATIVE_MIN_CHARS = 180
export const NARRATIVE_MAX_CHARS = 1600
/** 함께 보기는 여섯 토막이라 길다. */
export const NARRATIVE_MAX_CHARS_TOGETHER = 3200
/** 캐시 유효 기간 — 같은 입력이면 이 안에서는 다시 사지 않는다. */
export const NARRATIVE_CACHE_DAYS = 30

/**
 * 처방전·그룹 호출 설정 — 온도는 함께 보기와 같은 Gemini 3 권고 기본값(1.0), 한도는 «생각 + 본문» 안전선.
 * 세 갈래가 한 목소리를 쓰니 온도도 하나로 맞춘다(한쪽만 0.7 이면 같은 규율에서 말투가 갈린다).
 */
export const NARRATIVE_GENERATION = {
  temperature: TOGETHER_GENERATION.temperature,
  maxTokens: GEMINI_OUTPUT_TOKENS_FLOOR,
} as const

/** 금지어 조각이 자연스러운 말에 새는 자리 — 함께 보기 표에 처방전·가족 풀이에서 잘 새는 것을 더한다. */
const NARRATIVE_SWAPS = `${PLAIN_SWAPS}, '낫는'→'좋은', '평생'→'오래', '유일하다'→'하나뿐이다', '부자'(아버지와 아들)→'아버지와 아들', '일을 잘라'→'일을 나눠'`

/** 처방전·그룹 풀이의 시스템 프롬프트 — 함께 보기와 같은 해요체 이야기꾼. 형식만 세 문단이다. */
export const NARRATIVE_SYSTEM_PROMPT = `<역할>
사주 속 다섯 기운(나무·불·흙·쇠·물)을 쉬운 말로 풀어 주는 이야기꾼이에요. 명리를 잘 알지만, 설명은 동네에서 제일 말이 잘 통하는 선배가 커피 한잔하며 들려주는 말투로 해요.
</역할>

<읽는 사람>
나와 가족, 같이 일하는 사람, 모임 사람들의 기운을 챙기고 싶은 사람이에요. 사주 용어는 몰라요. 다 읽고 나서 "아, 그래서 이렇게 하면 되는구나" 하고 오늘 바로 해 볼 수 있어야 해요.
</읽는 사람>

<말투>
- 해요체로 써요(~해요, ~예요, ~거든요, ~잖아요, ~면 좋아요). 합니다체·옛말투·문어체는 쓰지 않아요.
- 문장 끝은 모두 '~요'로 맺어요. '~답니다'도 쓰지 않아요.
- 한 문장은 40자 안팎으로 짧게 써요. 쉼표로 길게 이어지면 두 문장으로 나눠요.
- 사람은 이름에 '님'을 붙여 불러요. '당신'은 쓰지 않아요.
- 첫 문장은 인사나 요약이 아니라, 생활에서 눈에 보이는 모습으로 시작해요.
- 카톡으로 보내도 어색하지 않은, 요즘 사람들이 실제로 쓰는 말로 써요.
- '힘'이라는 낱말만 되풀이하지 않아요. 첫발, 여유, 활기, 뒷심, 마무리 솜씨처럼 바꿔 가며 써요.
</말투>

<비유>
- 문단마다 가벼운 비유를 하나까지 넣어요. 한 문장에 비유를 두 개 겹치지 않아요.
- 집·부엌·출근길·회의·점심시간·주말 나들이처럼 이 사람의 생활 장면에서 가져와요.
- 톱니바퀴, 오케스트라, 퍼즐 조각, 음과 양, 캠핑 모닥불처럼 너무 흔한 비유는 쓰지 않아요.
- 비유는 데이터의 사실 하나를 보여 줘야 해요. 그럴듯하기만 한 비유는 빼요.
- "~하듯,"으로 앞에 붙이는 문장은 한 번까지만 써요. "~ 같아요", "~잖아요"처럼 모양을 바꿔요.
- "~한 형국", "~하는 격", "이롭습니다" 같은 옛말투는 쓰지 않아요.
</비유>

<쉬운 말>
데이터의 판단은 그대로 두고, 말만 이렇게 바꿔 써요.
${ELEMENTS.map((el) => `- ${ELEMENT_WORD[el].name} 기운 → ${ELEMENT_WORD[el].power.replace('·', ', ')}`).join('\n')}
- 기운이 넉넉하다 → 그 힘이 넘치는 편 / 기운이 모자라다 → 그 힘이 모자란 편
</쉬운 말>

<지킬 것>
- 데이터에 없는 기운·사람·관계·물건은 지어내지 않아요. 새로 판단하지도 않아요.
- 데이터의 문장을 그대로 옮기지 않고, 내 말로 다시 써요.
- 이 사람들한테만 할 수 있는 이야기를 써요. 다른 사람 풀이에 그대로 붙여도 되는 문장은 빼요.
- 좋은 말만 늘어놓지 않아요. 조심할 점은 부드럽지만 분명하게 말해요.
- 사람을 고르거나 재는 글이 아니라, 곁에 있는 사람을 챙기는 글이에요. 누가 더 좋고 나쁜지 비교하지 않아요.
</지킬 것>

<물건>
- 물건·색·방향·시간·먹을거리는 모자란 힘을 떠올리게 하는 생활 속 신호예요. 그것이 기운·마음·몸·분위기·운을 바꿔 준다고 말하지 않아요.
- "두면 ~이 살아나요", "~을 채워 줘요", "~을 잡아 줘요", "~이 붙어요", "~이 트여요" 대신, 그 물건을 보거나 쓸 때 무엇을 해 보면 좋은지 써요.
- 이 규칙을 글에서 설명하지 않아요. "물건이 기운을 바꾸는 건 아니지만" 같은 말 없이, 해 볼 일만 써요.
- 예시(이 물건은 목록에 없으니 가져다 쓰지 않아요)
  ✗ 벽시계를 걸어 두면 약속을 지키는 힘이 붙어요.
  ○ 벽시계가 눈에 들어올 때마다, 오늘 약속 시간을 한 번 떠올려 봐요.
  ✗ 아침 햇볕을 쬐면 기운이 살아나요.
  ○ 아침 햇볕이 드는 창가에서, 오늘 먼저 끝낼 일 하나를 정해 봐요.
</물건>

<쓰지 않는 말>
- 명리 용어: 결, 옅다, 두껍다, 두텁다, 용신, 기신, 일간, 상생, 상극, 십성, 신강, 신약, 명식, 그리고 한자(木·火·土·金·水 같은 글자)
- 누구에게나 해당하는 말: ${TOGETHER_CLICHES.map((c) => `"${c}"`).join(', ')}
- 아래 낱말은 한 글자도 쓰지 않아요: ${BANNED_ALL.join(', ')}
  자주 새는 말은 이렇게 바꿔요: ${NARRATIVE_SWAPS}
- 점수, 퍼센트, 순위
</쓰지 않는 말>

<형식>
- 세 문단, 전체 500~800자. 문단마다 세 문장에서 다섯 문장.
- 제목·머리말·번호·목록 기호·따옴표 없이 본문만 써요. 문단 사이는 빈 줄 하나예요.
- 문단마다 무엇을 쓸지는 데이터 아래의 부탁을 따라요.
- 마지막 문단은 오늘 해 볼 수 있는 한 가지로 끝내요.
</형식>

<예시>
말투와 비유를 쓰는 방법만 참고해요. 예시의 사람·문장·비유 소재·물건은 가져다 쓰지 않아요.
(예시 데이터: 하린님은 물 기운이 넉넉하고 나무 기운이 모자라요)

✗ 이렇게 쓰지 않아요
하린님은 수(水)의 결이 두텁고 목(木)의 기운이 옅은 형국이니, 초록 소품을 곁에 두면 시작하는 힘이 트입니다.

○ 이렇게 써요
하린님은 계획표를 꼼꼼히 채워 두고도 첫 줄에서 한참 머무는 편이에요. 생각이 깊은 만큼 첫발이 늦거든요. 물을 가득 담은 주전자가 끓기까지 오래 걸리는 것과 비슷해요. 그래서 큰 다짐보다 오늘 할 일 하나를 작게 떼어 내는 쪽이 맞아요. 아침에 커피를 내릴 때, 그날 시작할 일 하나만 소리 내어 말해 봐요.
</예시>`

/** 갈래마다 목소리는 하나(해요체 이야기꾼), 형식만 다르다 — 처방전·그룹은 세 문단, 함께 보기는 여섯 토막. */
export function systemPromptFor(kind: NarrativeKind): string {
  return kind === 'together' ? TOGETHER_SYSTEM_PROMPT : NARRATIVE_SYSTEM_PROMPT
}

export interface NarrativeRequest {
  systemPrompt: string
  temperature: number
  maxTokens: number
  /** 거르기에 걸려 다시 쓸 때 사용자 프롬프트 끝에 붙이는 말. */
  retryNote: (reason: string) => string
}

/**
 * 모델 호출 설정 — 액션과 A/B 하네스가 같은 값을 쓴다(한쪽만 고치면 실험과 실서비스가 갈라진다).
 *
 * 🔴 maxTokens 는 «생각 토큰 + 본문»의 한도다. gemini-3.8-flash 는 생각이 기본으로 켜져 있고 이 한도를 같이 쓴다.
 *    2026-09-14 실측: 처방전 한도 1,200 은 생각에 약 1,150 을 먹혀 두 번 다 78자에서 끊겼고(→ 매번 실패·환불),
 *    함께 보기 한도 3,000 도 3인 조합에서 생각 2,877 에 먹혀 184자에서 끊겼다. 본문 길이는 프롬프트와
 *    validateNarrative 가 정하고 과금은 쓴 만큼이라, 한도는 넉넉히 둔다.
 * 🔴 다시 쓰라는 말도 본문과 같은 해요체다 — 합니다체 안내가 말투를 되돌린다(41차 v2b).
 */
export function narrativeRequestFor(kind: NarrativeKind): NarrativeRequest {
  const generation = kind === 'together' ? TOGETHER_GENERATION : NARRATIVE_GENERATION
  return {
    systemPrompt: systemPromptFor(kind),
    temperature: generation.temperature,
    maxTokens: generation.maxTokens,
    retryNote: togetherRetryNote,
  }
}

/** 거르기 옵션 — 어려운 말 문지기는 세 갈래 모두, 머리말·긴 한도는 함께 보기만. names 는 프롬프트에 실린 사람 이름. */
export function narrativeCheckOptionsFor(kind: NarrativeKind, names: readonly string[]): NarrativeCheckOptions {
  const common = { jargonMax: TOGETHER_JARGON_MAX, ignore: names }
  if (kind === 'together') return { ...common, headings: TOGETHER_SECTIONS, maxChars: NARRATIVE_MAX_CHARS_TOGETHER }
  return common
}

/** 생활 처방의 갈래 → 쉬운 칸 이름(엔진 라벨의 «몸이 붙는 시간»·«몸을 고르는 결»을 모델이 따라 쓰지 않게). */
const LIFE_LABEL: Record<RemedyKind, string> = {
  color: '어울리는 색',
  direction: '앉는 방향',
  time: '그 힘이 도는 시간',
  season: '어울리는 철',
  space: '집 안 자리',
  body: '먹을거리와 움직임',
  habit: '줄이면 좋은 버릇',
  word: '말버릇',
  relation: '곁에 두면 좋은 사람',
}

const withoutHanja = (s: string) => s.replace(/\s*\([一-鿿·]+\)/g, '')

/** 채워 주는 길 하나 — 엔진의 갈래(직접·낳아 줌·사람)와 기운은 그대로, 相生·火 같은 말은 뺀다. */
function fillerLine(f: Filler, p: Prescription): string {
  const lacking = `${ELEMENT_WORD[p.lacking].name} 기운`
  switch (f.kind) {
    case 'direct':
      return `- 바로 챙기기: ${lacking} 쪽을 곧장 가까이하는 길 — 가장 빠르지만, 꾸준히 이어 가지 않으면 오래가지 않아요`
    case 'mother':
      return `- 바탕부터 키우기: ${elementWord(f.element)} — ${ELEMENT_WORD[f.element].name} 기운은 ${lacking}을 낳아 키우는 쪽이라, 이 힘이 받쳐 주면 모자란 힘이 스스로 자라요. 오래가는 길이에요`
    case 'person':
      return `- 사람 곁: ${f.personName ?? ''}님 — ${lacking}이 넉넉한 사람이에요. 물건보다 사람이 커서, 같이 보내는 시간에 그 힘이 옮아가요`
  }
}

/** 처방전 → 프롬프트. 값은 전부 처방전에서 오고, 말만 쉬운 말로 바꾼다. 데이터를 먼저, 부탁은 끝에(Gemini 3 권고). */
export function prescriptionPrompt(p: Prescription): string {
  const name = `${p.name}님`
  const avoid = elementWord(p.avoid.element)
  const lines: (string | null)[] = [
    '<데이터>',
    `${name}의 기운 처방전`,
    `- 넉넉한 기운: ${elementWord(p.strongest)} — ${ELEMENT_PLAIN[p.strongest].rich}`,
    `- 모자란 기운: ${elementWord(p.lacking)} — ${ELEMENT_PLAIN[p.lacking].lacking}`,
    p.mansikLacking
      ? `- 생년월일시로 따로 본 사주에서는 ${elementWord(p.mansikLacking)}도 챙기면 좋다고 나와요. 두 가지를 같이 챙겨도 괜찮아요`
      : null,
    '',
    '[모자란 힘을 챙기는 길]',
    ...p.fillers.map((f) => fillerLine(f, p)),
    ...(p.cautionWith
      ? [
          '',
          '[조심할 것]',
          `- ${p.cautionWith}님은 ${avoid}이 넉넉한 편이에요. ${name}은 이 기운을 지금 더 늘리지 않는 쪽이라, 둘이 함께 쓰는 자리에 이 기운 쪽 물건을 더 늘리지 않는 편이 좋아요`,
        ]
      : []),
    '',
    '[곁에 둘 것 — 이 목록에 있는 것만 써요]',
    p.items.shrine.length > 0
      ? `- 앱 속 내 신당에 올릴 살림: ${p.items.shrine.map((s) => withoutHanja(s.name)).join(', ')}`
      : null,
    `- 책상에 둘 것: ${p.items.real.desk.replace(/^책상 위에\s*/, '')}`,
    `- 집 안 자리: ${p.items.real.home}`,
    `- 선물하기 좋은 것: ${p.items.real.gifts.join(', ')}`,
    ...p.items.life.map((l) => `- ${LIFE_LABEL[l.kind]}: ${l.value}`),
    '',
    `[덜어낼 것 — ${avoid}은 지금 더 늘리지 않아요]`,
    ...p.avoid.items.map((a) => `- ${a.value}`),
    '</데이터>',
    '',
    `위 데이터를 바탕으로 ${name}의 기운 처방전 풀이를 세 문단으로 써 주세요.`,
    `- 첫 문단: 넉넉한 힘과 모자란 힘이 ${name}의 생활에서 어떻게 보이는지. 생활 속 한 장면으로 시작해요.`,
    '- 둘째 문단: [모자란 힘을 챙기는 길]을 왜 그렇게 챙기는지, 내 말로 풀어요.',
    '- 셋째 문단: [곁에 둘 것]에서 하나를 골라 그걸 보거나 쓸 때 해 볼 일, 그리고 [덜어낼 것]에서 하나. 오늘 해 볼 수 있는 한 가지로 끝내요.',
    '- 판단(무엇이 넉넉하고 모자란지, 무엇을 챙기고 덜어낼지)은 데이터 그대로 두고, 설명과 비유는 새로 써요.',
  ]
  return lines.filter((l): l is string => l !== null).join('\n')
}

/** 그룹 지도 → 프롬프트. 관계는 쉬운 말 한 줄(pairLine)로, 점수 없음. 직장 고지 대신 «이미 함께 일하는 사람끼리»의 맥락. */
export function circlePrompt(circleName: string, ce: CircleEnergy): string {
  const context = KIND_CONTEXT[ce.kind]
  const pairs = ce.pairs.filter((pr) => pr.label !== 'independent').map((pr) => pairLine(pr, ce))
  const lines: (string | null)[] = [
    '<데이터>',
    `「${circleName}」 ${ce.entries.length}명${context ? ` · ${context}` : ''}`,
    '',
    '[사람마다]',
    ...ce.entries.map(
      (e) =>
        `- ${e.name}님 (${e.relation}): 넉넉한 기운: ${elementWord(e.strongest)} · 모자란 기운: ${elementWord(e.yongsin)}`
    ),
    '',
    '[둘씩 보면 — 이 목록 밖의 사이는 지어내지 않아요]',
    ...(pairs.length > 0 ? pairs : ['- 크게 주고받는 짝은 없어요. 각자 자기 몫을 하는 사이예요']),
    '',
    '[같이 있을 때 조심할 것 — 이 목록 밖의 갈등은 지어내지 않아요]',
    ...cautionLines(ce),
    '',
    '[다 같이 있을 때]',
    `- 다 같이 모자란 기운: ${elementWord(ce.lowest)} — ${ELEMENT_PLAIN[ce.lowest].lacking}`,
    ce.holders.length > 0
      ? `- 이 힘이 넉넉한 사람: ${ce.holders.map((h) => `${h.name}님`).join(', ')}`
      : `- 이 힘이 넉넉한 사람은 없어요. 다 같이 쓰는 자리에 둘 물건: ${ce.fallbackItem}`,
    ce.roles ? `- 사람들의 성향: ${ce.roles.thick.people}이 많고, ${ce.roles.thin.people}은 적어요` : null,
    '',
    '[곁에 둘 물건과 자리 — 이 목록에 있는 것만 써요]',
    needsLine(`다 같이 쓰는 자리 (다 같이 모자란 ${ELEMENT_WORD[ce.lowest].name} 기운)`, ce.lowest),
    '</데이터>',
    '',
    `위 데이터를 바탕으로 「${circleName}」 사람들을 위한 풀이를 세 문단으로 써 주세요.`,
    '- 첫 문단: 이 사람들 전체에 어떤 힘이 넘치고 어떤 힘이 모자란지. 생활 속 한 장면에 빗대어 시작해요.',
    '- 둘째 문단: [둘씩 보면]에서 눈에 띄는 두세 짝만 골라 누가 누구 곁에 있으면 좋은지, 그리고 [둘씩 보면]의 «거리가 약인 사이»나 [같이 있을 때 조심할 것]이 있으면 하나를 부드럽게 짚어요. 두 목록에 없는 갈등은 지어내지 않아요.',
    '- 셋째 문단: 다 같이 모자란 힘을 지금 있는 사람과 [곁에 둘 물건과 자리]로 어떻게 챙길지. 이번 주에 다 같이 해 볼 한 가지로 끝내요.',
    '- 사람을 새로 들이라는 말은 쓰지 않아요. 판단은 데이터 그대로 두고, 설명과 비유는 새로 써요.',
  ]
  return lines.filter((l): l is string => l !== null).join('\n')
}

/** 어려운 말 검사에서 먼저 지울 이름 — 프롬프트에 실린 사람 전부(«정재»·«한결»처럼 용어와 겹치는 이름). */
export function prescriptionNames(p: Prescription): string[] {
  const out = [p.name]
  for (const f of p.fillers) if (f.personName) out.push(f.personName)
  if (p.cautionWith) out.push(p.cautionWith)
  return out
}

export function circleNames(ce: CircleEnergy): string[] {
  return ce.entries.map((e) => e.name)
}

export interface NarrativeSection {
  /** 머리말(여섯 중 하나). 머리말 없이 시작한 본문은 ''. */
  heading: TogetherSection | ''
  body: string
}

const HEADING_NAMES: readonly string[] = [...TOGETHER_SECTIONS, ...Object.keys(TOGETHER_LEGACY_HEADINGS)]
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const HEADING_LEAD = /^[\s「『[(#*\-•]+/
const HEADING_TRAIL = /[\s」』\])：:.*]+$/
/** 「잘 맞는 점: …」「단점 — …」처럼 머리말 뒤에 구분 기호를 두고 본문이 같은 줄에 붙은 경우. 띄어쓰기만으로는 머리말이 아니다. */
const INLINE_HEADING = new RegExp(`^(${HEADING_NAMES.map(escapeRe).join('|')})[」』\\])*]*\\s*[:：—–-]\\s*(.+)$`)

/** 새 머리말이면 그대로, 39차까지의 옛 머리말이면 새 이름으로. 머리말이 아니면 null. */
function canonicalHeading(s: string): TogetherSection | null {
  const isSection = (x: string): x is TogetherSection => (TOGETHER_SECTIONS as readonly string[]).includes(x)
  if (isSection(s)) return s
  return TOGETHER_LEGACY_HEADINGS[s] ?? null
}

/** 함께 보기 본문 → 머리말별 토막. 머리말이 하나도 없으면 본문 한 덩이(옛 풀이 캐시 호환). */
export function parseTogetherSections(text: string): NarrativeSection[] {
  const out: NarrativeSection[] = []
  let current: NarrativeSection | null = null
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const lead = line.replace(HEADING_LEAD, '')
    const heading = canonicalHeading(lead.replace(HEADING_TRAIL, ''))
    if (heading) {
      current = { heading, body: '' }
      out.push(current)
      continue
    }
    const inline = lead.match(INLINE_HEADING)
    const inlineHeading = inline ? canonicalHeading(inline[1]) : null
    if (inline && inlineHeading) {
      current = { heading: inlineHeading, body: inline[2].trim() }
      out.push(current)
      continue
    }
    if (!current) {
      current = { heading: '', body: '' }
      out.push(current)
    }
    current.body = current.body ? `${current.body}\n${line}` : line
  }
  return out.filter((s) => s.body || s.heading)
}

/** 캐시 키의 재료 — 화면에 영향을 주는 값만 뽑아 안정된 문자열로. 같은 입력이면 같은 문자열. */
export function prescriptionFingerprint(p: Prescription): string {
  return JSON.stringify({
    t: p.targetId,
    l: p.lacking,
    s: p.strongest,
    e: p.energy,
    f: p.fillers.map((f) => `${f.kind}:${f.personId ?? ''}`),
    sh: p.items.shrine.map((s) => s.id),
    a: p.avoid.element,
    c: p.caution ? 1 : 0,
    m: p.mansikNote ? 1 : 0,
    // v2 — 쉬운 해요체 프롬프트(2026-09-25). 옛 판(합니다체·결의 말) 풀이는 캐시로 내주지 않고 새로 짓는다.
    v: 2,
  })
}

/** 함께 보기 지문 — 사람 순서와 무관하게(정렬) 같은 조합이면 같은 값. */
export function togetherFingerprint(ce: CircleEnergy): string {
  const sorted = [...ce.entries].sort((a, b) => a.targetId.localeCompare(b.targetId))
  return JSON.stringify({
    m: sorted.map((e) => `${e.targetId}:${e.yongsin}:${e.strongest}:${e.dayMaster ?? ''}:${e.vitality ?? ''}`),
    p: [...ce.pairs].map((pr) => `${[pr.aId, pr.bId].sort().join('-')}:${pr.label}`).sort(),
    l: ce.lowest,
    // v7 — 쉬운 말 프롬프트(2026-09-14). 옛 판(어려운 말·합니다체) 풀이는 캐시로 내주지 않고 새로 짓는다.
    v: 7,
  })
}

export function circleFingerprint(ce: CircleEnergy): string {
  return JSON.stringify({
    k: ce.kind,
    m: ce.entries.map((e) => `${e.targetId}:${e.yongsin}:${e.strongest}`),
    l: ce.lowest,
    h: ce.holders.map((h) => h.targetId),
    p: ce.pairs.map((pr) => `${pr.aId}-${pr.bId}:${pr.label}`),
    r: ce.roles ? `${ce.roles.thick.key}/${ce.roles.thin.key}` : null,
    // v2 — 처방전과 같은 날 같은 까닭(쉬운 해요체 프롬프트).
    v: 2,
  })
}

export type NarrativeCheck = { ok: true; text: string } | { ok: false; reason: string }

/** 모델 출력 거르기 — 길이·금지어·점수(+ 함께 보기는 머리말·어려운 말). 통과한 본문만 저장한다. */
export interface NarrativeCheckOptions {
  /** 이 머리말들이 (하나 빠지는 것까지 봐주고) 본문에 서 있어야 한다 — 함께 보기의 여섯 토막. */
  headings?: readonly string[]
  maxChars?: number
  /** 어려운 말(결·옅다·일간·한자…)을 이만큼까지만 봐준다 — 넘으면 JARGON 으로 다시 쓴다. */
  jargonMax?: number
  /** 어려운 말 검사에서 먼저 지우는 말 — 사람 이름(«정재»·«한결»처럼 용어와 겹치는 이름). */
  ignore?: readonly string[]
}

export function validateNarrative(raw: string, options: NarrativeCheckOptions = {}): NarrativeCheck {
  const text = raw
    .replace(/\r\n/g, '\n')
    .replace(/^[#*>\-•\s]+|["「」"]+$/gm, (m) => (m.includes('\n') ? m : ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (text.length < NARRATIVE_MIN_CHARS) return { ok: false, reason: 'TOO_SHORT' }
  if (text.length > (options.maxChars ?? NARRATIVE_MAX_CHARS)) return { ok: false, reason: 'TOO_LONG' }
  const hits = bannedWordsIn(text)
  if (hits.length > 0) return { ok: false, reason: `BANNED:${hits.join(',')}` }
  if (/\d+\s*(점|%|퍼센트|위)\b/.test(text) || /\d+\s*(점|%|퍼센트)/.test(text)) return { ok: false, reason: 'SCORE' }
  if (options.headings && options.headings.length > 0) {
    const found = new Set(parseTogetherSections(text).map((s) => s.heading))
    const present = options.headings.filter((h) => found.has(h as TogetherSection)).length
    if (present < options.headings.length - 1) return { ok: false, reason: 'HEADINGS' }
  }
  if (options.jargonMax !== undefined) {
    const jargon = togetherJargonHits(text, options.ignore ?? [])
    if (jargon.length > options.jargonMax) return { ok: false, reason: `JARGON:${jargon.slice(0, 5).join(',')}` }
  }
  return { ok: true, text }
}
