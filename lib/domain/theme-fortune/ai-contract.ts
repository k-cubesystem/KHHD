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
import { remedyPromptBlock, type RemedySet } from '@/lib/domain/remedy/remedy'
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

/**
 * 유료 결과 화면이 그대로 쓰는 JSON 스키마(마스터 §5-4). 자리에 없는 것은 AI 가 쓸 수 없다.
 *
 * 🔴 분량을 늘린 이유(CEO 지시 2026-08-15 「비용이 더 들더라도 상세하게」): 값을 치른 사람이
 *    읽는 글이다. 출력 토큰이 늘면 원가도 늘지만(1,400 → 약 2,800 토큰 ≈ 건당 25 → 40원)
 *    2만냥 상품에서 매출의 0.2% 다.
 */
export const THEME_OUTPUT_FORMAT_GUIDE = `[출력 형식 (JSON Mandatory) — 아래 키만, 이 순서로]
{
  "headline": "질문에 대한 한 문장 답 (40자 내외, 판정 라벨과 어긋나지 않게)",
  "situation": "왜 그런가 — 원국 근거를 쉬운 말로 6~8문장. 성격을 단정하지 말고 겪는 장면으로 그릴 것",
  "indicatorNotes": ["지표1 해설 2~3문장", "지표2 해설 2~3문장", "지표3 해설 2~3문장"],
  "timingNotes": ["열리는 시기 해설 2~3문장 — 그 달에 무엇을 하면 되는지까지", "주의할 시기 해설 2~3문장 — 무엇을 미루면 되는지까지"],
  "actions": ["지금 할 수 있는 구체적 행동 1 (한 문장 + 왜 그것인지 한 문장)", "행동 2", "행동 3"],
  "remedyNotes": ["[개운 처방] 항목을 하나씩 풀어 쓴 문장. 처방 이름 → 왜 이 사람에게 그것인지 → 언제 하면 되는지. 주어진 항목 수만큼", "..."],
  "pastEcho": "과거 역추산 2~3문장 (근거가 없으면 빈 문자열)",
  "caution": "이 풀이를 어떻게 쓰면 안 되는지 1문장"
}

🔴 remedyNotes 는 **새 처방을 만드는 자리가 아니다.** 위 [개운 처방] 블록에 이미 정해져 있는
   항목만 설명한다. 없는 색·방위·시간을 지어내면 화면의 처방표와 문장이 다른 말을 하게 된다.`

/**
 * 무료 미끼 테마(마스터 §7-1)의 절단 스키마 — 행동·시기 해설·되짚기는 **자리 자체가 없다**.
 *
 * 🔴 «자리가 없으면 AI 가 쓸 수 없다»가 문구 규율보다 강한 방어이고(직장·재물 §3-2), 칸 수
 *    차이가 곧 무료와 유료 두 상품의 구분이다(직장·재물 게이트 8번). 그래서 공용 가이드에
 *    조건문을 넣지 않고 상수를 따로 둔다 — 테스트가 두 문자열을 각각 고정한다.
 */
export const THEME_OUTPUT_FORMAT_GUIDE_FREE = `[출력 형식 (JSON Mandatory) — 아래 키만, 이 순서로]
{
  "headline": "질문에 대한 한 문장 답 (40자 내외, 판정 라벨과 어긋나지 않게)",
  "situation": "왜 그런가 — 원국 근거를 쉬운 말로 4~5문장. 무료라고 대충 쓰지 말 것",
  "indicatorNotes": ["지표1 해설 1~2문장", "지표2 해설", "지표3 해설"],
  "caution": "이 풀이를 어떻게 쓰면 안 되는지 1문장"
}

🔴 무료 풀이의 규율: **여기까지도 제값을 하는 글이어야 한다.** 「더 알고 싶으면 결제하세요」
   같은 말을 문장 안에 쓰지 마라 — 그 안내는 화면이 따로 한다. 글은 끝까지 성의 있게 쓰고,
   다만 시기·행동·개운 처방은 이 스키마에 자리가 없으므로 **언급하지 않는다.**`

/** 액션이 쓰는 선택기 — 무료 미끼는 절단 스키마로 간다. */
export function themeOutputFormatGuide(freeCut: boolean): string {
  return freeCut ? THEME_OUTPUT_FORMAT_GUIDE_FREE : THEME_OUTPUT_FORMAT_GUIDE
}

/**
 * 테마 고유 지시 — `buildMasterPromptForAction` 의 `additionalContext` 자리에 통째로 들어간다.
 * 새 프롬프트 빌더를 만들지 않는다(마스터 §5-4).
 */
export function buildThemeAdditionalContext(
  contract: ThemePromptContract,
  verdict: ThemeVerdict,
  /** 유료만. 처방은 엔진이 정하고 AI 는 설명만 한다 — 없으면 그 블록 자체가 프롬프트에 안 실린다. */
  remedy?: RemedySet
): string {
  const months = allowedMonths(verdict)

  return [
    '[확정 판정 — 계산이 끝난 값]',
    THEME_L3_FIXED_INSTRUCTION,
    '',
    JSON.stringify(verdict, null, 2),
    '',
    ...(remedy ? [remedyPromptBlock(remedy), ''] : []),
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
export function parseThemeNarration(
  raw: string,
  verdict: ThemeVerdict,
  freeCut = false,
  /** 엔진이 정한 처방 개수. 해설은 딱 이만큼만 받는다. */
  remedyCount = 0
): ThemeNarration {
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
    // 🔴 무료 절단 — AI 가 절단 스키마를 무시하고 써 보내도 서버가 버린다(게이트 8번은
    //    프롬프트가 아니라 여기서 진다). 빈 배열·빈 문자열은 화면이 그 칸을 그리지 않는 신호다.
    timingNotes: freeCut ? [] : asTextList(parsed.timingNotes, 2).map(guard),
    actions: freeCut ? [] : asTextList(parsed.actions, 3).map(guard),
    // 처방 해설은 항목 수만큼만 받는다 — AI 가 더 써 보내면 화면의 처방표와 개수가 어긋난다.
    remedyNotes: freeCut ? [] : asTextList(parsed.remedyNotes, remedyCount).map(guard),
    // 근거가 없으면 화면이 「되짚기」 칸을 아예 그리지 않는다 — 지어낸 과거를 싣지 않는다.
    pastEcho: freeCut || !verdict.pastHint ? '' : guard(asText(parsed.pastEcho)),
    caution: guard(asText(parsed.caution)),
  }

  if (!narration.headline) throw new Error('테마 풀이 결과가 비어 있습니다.')
  return narration
}
