/**
 * 인기테마운세 — L3 AI 계약 (마스터 §5-1·§5-4).
 *
 * ## 이 파일이 가르는 것
 * 「AI 가 알아서 써준다」와 「엔진이 판정하고 AI 가 옮겨 적는다」. 뒤쪽이어야 **같은 사주에 같은
 * 답**이 나온다. 그래서 여기서 하는 일은 셋뿐이다 —
 *   ① 확정 판정을 프롬프트에 실어 보내고
 *   ② 출력 자리를 스키마로 못 박고
 *   ③ 돌아온 문장에서 **판정과 어긋나는 달(月)을 서버가 덮는다**.
 *
 * 🔴 ③이 없으면 조용히 틀린 달이 나간다. AI 가 「7월에 이야기를 꺼내보세요」라고 쓰는데 판정의
 *    열리는 달에 7월이 없으면, 화면의 12개월 띠와 문장이 서로 다른 말을 한다.
 */
import { logger } from '@/lib/utils/logger'
import { allowedMonths, type ThemeNarration, type ThemePromptContract, type ThemeVerdict } from './verdict-types'

/**
 * 전 테마 공통 고정 지시문 — 마스터 §5-1 의 문자열 그대로다.
 * 🔴 문장을 다듬지 말 것. 테스트가 이 문자열을 고정한다.
 */
export const THEME_L3_FIXED_INSTRUCTION = [
  '아래 [확정 판정]은 이미 계산이 끝난 값이다. 다시 계산하지 말고, 숫자를 새로 만들지 말고,',
  '판정과 어긋나는 서술을 하지 마라. 당신의 일은 이 판정을 사람의 말로 풀어 쓰는 것뿐이다.',
].join('\n')

/**
 * 말투 규율 — 기존 `trend.ts` 프롬프트에서 승계.
 * 앱 전체가 같은 목소리로 말해야 하므로 테마마다 다시 쓰지 않는다.
 */
const THEME_TONE_RULES = [
  '- "~합니다/~입니다" 체를 쓰고, "~이 보이는군요"·"운명의 에너지" 같은 무속 표현은 쓰지 마세요.',
  '- 사주 용어는 괄호 안에 쉬운 설명을 붙이세요. 예: 편관(압박과 책임을 주는 기운)',
  '- 긍정 70% + 주의 30% 비율로 균형 있게 서술하세요.',
  '- 점수·등급·순위·확률을 쓰지 마세요. 정도를 말할 때는 낮음/보통/높음으로만 말하세요.',
  '- 효과를 단정하지 마세요. "~하면 오릅니다"가 아니라 "~의 결이 강합니다"로 씁니다.',
]

/** 전 테마 공통 금지 소재 — 테마별 `forbidden` 은 여기에 «더한다». */
const THEME_COMMON_FORBIDDEN = [
  '매일·무제한·평생·모두 이용·정액 같은 표현',
  '성공·보장·반드시·확실히·최고·유일·1위 같은 단정 어휘',
  '채용·뽑다·지원자·적합도·선발·합격 같은 사람을 골라내는 어휘',
  '특정 종목·상품·매매 시점 같은 투자 권유',
  '의료 진단·법률 판단',
]

/** 결과 화면이 그대로 쓰는 JSON 스키마(마스터 §5-4). 자리에 없는 것은 AI 가 쓸 수 없다. */
export const THEME_OUTPUT_FORMAT_GUIDE = `[출력 형식 (JSON Mandatory) — 아래 키만, 이 순서로]
{
  "headline": "질문에 대한 한 문장 답 (40자 내외, 판정 라벨과 어긋나지 않게)",
  "situation": "왜 그런가 — 원국 근거를 쉬운 말로 3~4문장",
  "indicatorNotes": ["지표1 해설 1~2문장", "지표2 해설", "지표3 해설"],
  "timingNotes": ["열리는 시기 해설 1~2문장", "주의할 시기 해설 1~2문장"],
  "actions": ["지금 할 수 있는 구체적 행동 1", "행동 2", "행동 3"],
  "pastEcho": "과거 역추산 1~2문장 (근거가 없으면 빈 문자열)",
  "caution": "이 풀이를 어떻게 쓰면 안 되는지 1문장"
}`

/**
 * 테마 고유 지시 — `buildMasterPromptForAction` 의 `additionalContext` 자리에 통째로 들어간다.
 * 새 프롬프트 빌더를 만들지 않는다(마스터 §5-4).
 */
export function buildThemeAdditionalContext(contract: ThemePromptContract, verdict: ThemeVerdict): string {
  const months = allowedMonths(verdict)

  return [
    '[확정 판정 — 계산이 끝난 값]',
    THEME_L3_FIXED_INSTRUCTION,
    '',
    JSON.stringify(verdict, null, 2),
    '',
    `[이 풀이가 답하는 질문]`,
    contract.question,
    '',
    '[서술 규율]',
    ...contract.rules.map((rule) => `- ${rule}`),
    ...THEME_TONE_RULES,
    months.length > 0
      ? `- 달(月)을 언급할 때는 위 판정의 timings 에 있는 달만 쓰세요: ${months.join('·')}월`
      : '- 특정 달을 언급하지 마세요. 판정이 달을 확정하지 않았습니다.',
    '',
    '[쓰지 않는 것]',
    ...[...contract.forbidden, ...THEME_COMMON_FORBIDDEN].map((item) => `- ${item}`),
  ].join('\n')
}

// ===================== 파싱·검증 =====================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** 문자열 배열로 강제. 길이를 맞춰 잘라내거나 빈 칸으로 채운다 — 화면이 undefined 를 만나지 않는다. */
function asTextList(value: unknown, length: number): string[] {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length }, (_, index) => asText(source[index]))
}

/**
 * 🔴 판정에 없는 달을 판정의 달로 덮는다(마스터 §5-4 마지막 줄).
 *
 * 「조용히 틀린 달을 내보내지 않는다」가 목적이므로 **문장을 지우지 않고 숫자만 바꾼다** —
 * 문장을 통째로 버리면 그 자리가 비어 화면이 더 이상해진다.
 */
export function enforceMonths(text: string, allowed: readonly number[]): string {
  if (!text) return text
  const fallback = allowed[0]

  return text.replace(/(\d{1,2})월/g, (whole, digits: string) => {
    const month = Number(digits)
    if (allowed.includes(month)) return whole
    return fallback === undefined ? '해당 시기' : `${fallback}월`
  })
}

/**
 * AI 원문 → 검증된 서술.
 *
 * 파싱 실패는 던진다 — 액션이 그 신호로 **복채를 환불**한다(실패를 조용히 빈 화면으로 만들지
 * 않는다). 필드 누락은 던지지 않고 빈 문자열로 떨어뜨린다(한 칸이 비었다고 유료 결과 전체를
 * 버리는 쪽이 사용자에게 더 나쁘다).
 */
export function parseThemeNarration(raw: string, verdict: ThemeVerdict): ThemeNarration {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('테마 풀이 결과를 해석하지 못했습니다.')

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (error) {
    logger.error('[ThemeFortune] 서술 JSON 파싱 실패:', error)
    throw new Error('테마 풀이 결과를 해석하지 못했습니다.')
  }
  if (!isRecord(parsed)) throw new Error('테마 풀이 결과를 해석하지 못했습니다.')

  const months = allowedMonths(verdict)
  const guard = (text: string) => enforceMonths(text, months)

  const narration: ThemeNarration = {
    headline: guard(asText(parsed.headline)),
    situation: guard(asText(parsed.situation)),
    indicatorNotes: asTextList(parsed.indicatorNotes, verdict.indicators.length).map(guard),
    timingNotes: asTextList(parsed.timingNotes, 2).map(guard),
    actions: asTextList(parsed.actions, 3).map(guard),
    // 근거가 없으면 화면이 「되짚기」 칸을 아예 그리지 않는다 — 지어낸 과거를 싣지 않는다.
    pastEcho: verdict.pastHint ? guard(asText(parsed.pastEcho)) : '',
    caution: guard(asText(parsed.caution)),
  }

  if (!narration.headline) throw new Error('테마 풀이 결과가 비어 있습니다.')
  return narration
}
