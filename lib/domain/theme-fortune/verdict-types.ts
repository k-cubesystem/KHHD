/**
 * 인기테마운세 — L2 판정의 공통 원시형 (마스터 §5-3).
 *
 * ## 왜 타입이 하나인가
 * 테마는 계속 늘어난다. 결과 화면(§4-2)이 테마마다 다른 모양을 알아야 하면 테마 하나를 더할
 * 때마다 화면을 고쳐야 한다. **테마가 다른 것은 «채우는 내용»뿐이고 그릇은 하나**여야
 * 「테마 추가 = 상수 1건 + 판정 함수 1개」가 성립한다(마스터 §6-2).
 *
 * ## 🔴 점수는 내부값이다
 * `score` 는 밴드를 가르기 위해서만 존재한다. 화면에 숫자로 나가지 않는다 — 「85점」은 측정
 * 방법을 제시할 수 없는 수치이고, 그 목업이 정확히 이 기능이 접수한 라이브 버그였다
 * (마스터 §1-1·§9-1). 밖으로 나가는 것은 `band` 와 막대 길이뿐이다.
 */
import type { AnalysisType, SajuContext } from '@/lib/saju-engine/context-builder'
import type { RemedyItem, RemedySet } from '@/lib/domain/remedy/remedy'
import type { RuleBaseResult } from '@/lib/saju-engine/rule-base'
import type { YearlyFortuneResult } from '@/lib/saju-engine/woon-calculator'

export type ThemeBand = 'low' | 'mid' | 'high'

/**
 * 밴드 경계 — **한 곳에만 있다**(마스터 §5-3 마지막 줄).
 *
 * 경계가 테마마다 흩어지면 「같은 사주인데 화면마다 다른 밴드」가 난다. 판정 함수도, 화면의
 * 막대도, 2×2 매핑도 전부 여기서 갈린다.
 */
export const BAND_THRESHOLD = { mid: 34, high: 67 } as const

export function bandOf(score: number): ThemeBand {
  if (score >= BAND_THRESHOLD.high) return 'high'
  if (score >= BAND_THRESHOLD.mid) return 'mid'
  return 'low'
}

/** 화면에 나가는 밴드 이름. 서열·등급으로 읽히지 않게 «낮음/보통/높음» 셋뿐이다(마스터 §9-2). */
export const BAND_LABEL: Record<ThemeBand, string> = {
  low: '낮음',
  mid: '보통',
  high: '높음',
}

/** 0~100 으로 자른다. 판정식이 음수·초과를 내도 밴드가 깨지지 않는다. */
export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

/** 지표 — 결과 화면 3번 칸. 테마당 정확히 3개. */
export interface ThemeIndicator {
  readonly key: string
  readonly label: string
  /** 0~100 내부값. 🔴 화면에 숫자로 쓰지 않는다. */
  readonly score: number
  readonly band: ThemeBand
  /** 「편관 2 · 정관 1 — 일곱 자리 중 셋」 — L1 출력에서 그대로 파생한 사실. */
  readonly basis: string
}

/** 시기 — 결과 화면 5번 칸. */
export interface ThemeTiming {
  readonly kind: 'opportunity' | 'caution'
  readonly year: number
  /** 1~12. `calculateYearlyFortune` 의 keyOpportunity/CautionMonths 에서만 온다. */
  readonly months: readonly number[]
  readonly basis: string
}

/**
 * 판정 라벨 — 「이 질문의 답이 어느 칸인가」.
 *
 * 마스터 §5-3 원시형에는 없던 칸이다. 직장·재물 세트 §3-4 가 양자택일 4종(C-1·C-4·C-5·W-3)에
 * **고정 매핑표 판정**을 요구하면서 필요해졌다 — AI 가 매번 다른 결론을 내면 「같은 사주에 다른
 * 답」이 되고 그 순간 서비스가 신뢰를 잃는다(마스터 §5-1). 라벨은 **코드가 정하고 AI 는 옮겨
 * 적기만 한다.**
 */
export interface ThemeVerdictLabel {
  readonly key: string
  readonly label: string
  /** 라벨이 무슨 뜻인지 한 줄. 🔴 지시·권유가 아니라 «결»의 서술이어야 한다. */
  readonly note: string
  /**
   * 「이 판정은 결론으로 닫지 않는다」 — 화면이 답 대신 고민상담으로 닫는다.
   *
   * 🔴 테마마다 이런 칸이 하나씩 필요하다(직장·재물 §5 C-1: 「그 문제가 아닐 수 있다」).
   *    없으면 상품이 늘 같은 자리에서 원인을 찾게 되고, 그건 표시광고법 이전에 거짓이다.
   */
  readonly openEnded?: boolean
}

/**
 * 판정표 — 「내가 어느 칸인가」를 보이게 하는 2×2.
 *
 * 결과의 감탄 지점이자 **결론을 주지 않는다는 증거**다(직장·재물 §3-4). 네 칸을 다 보여 주면
 * 사용자가 「골라준 게 아니라 갈라준 것」임을 눈으로 안다. 화면은 표의 기하를 모르고 이 데이터만
 * 그린다 — 다음 테마가 다른 축을 써도 화면은 그대로다.
 */
export interface ThemeVerdictMatrix {
  /** 세로축·가로축이 각각 어느 지표인가 — `ThemeIndicator.key`. */
  readonly rowIndicatorKey: string
  readonly colIndicatorKey: string
  /** [낮음 쪽, 높음 쪽] 축 눈금 이름. */
  readonly rowLabels: readonly [string, string]
  readonly colLabels: readonly [string, string]
  /** cells[row][col] — row/col 0 = 각 축의 «낮음» 쪽. */
  readonly cells: readonly [
    readonly [ThemeVerdictLabel, ThemeVerdictLabel],
    readonly [ThemeVerdictLabel, ThemeVerdictLabel],
  ]
}

/** 테마 판정 = L3 에 넘기는 확정 사실 뭉치. */
export interface ThemeVerdict {
  readonly themeId: string
  /** 양자택일 테마만 든다. 없는 테마는 null. */
  readonly verdictLabel: ThemeVerdictLabel | null
  /** 판정 라벨이 어느 표의 어느 칸인지. 표가 없는 테마는 생략. */
  readonly matrix?: ThemeVerdictMatrix
  readonly indicators: readonly [ThemeIndicator, ThemeIndicator, ThemeIndicator]
  /** 기회 1~2 + 주의 1~2. */
  readonly timings: readonly ThemeTiming[]
  /** rule-base 강매치 룰 이름. */
  readonly ruleHits: readonly string[]
  /** 과거 역추산 근거 — 문장은 L3 가 쓴다. */
  readonly pastHint: { readonly period: string; readonly basis: string } | null
}

/**
 * L3 서술 — AI 가 쓰는 것 전량(마스터 §5-4 출력 스키마).
 *
 * 🔴 이 스키마에 **없는 자리는 AI 가 쓸 수 없다.** 종목·매수 시점·수익률 칸을 만들지 않는 것이
 * 문구 규율보다 강한 방어다(직장·재물 §3-2).
 */
export interface ThemeNarration {
  readonly headline: string
  readonly situation: string
  readonly indicatorNotes: readonly string[]
  readonly timingNotes: readonly string[]
  readonly actions: readonly string[]
  /**
   * 처방 해설 — 엔진이 정한 개운 처방을 «왜 나에게 그것인가»로 풀어 쓴 것.
   *
   * 🔴 AI 가 처방을 **만드는** 자리가 아니다. 처방 자체는 `ThemeReading.remedy` 에 결정론으로
   *    이미 들어 있고, 여기는 그 항목을 사람의 말로 옮긴 문장만 온다. 무료는 빈 배열이다.
   */
  readonly remedyNotes: readonly string[]
  readonly pastEcho: string
  readonly caution: string
}

/**
 * 저장·화면·공유가 함께 보는 결과 한 덩어리.
 *
 * `analysis_history.result_json` 에 이대로 들어간다 — 캐시(§7-2)는 이 저장본을 그대로 되읽는
 * 것이고, 공유(`/share/[token]`)·OG 는 기존 배선이 같은 행을 본다(마스터 §8, 새로 만들 것 없음).
 */
export interface ThemeReading {
  readonly themeId: string
  readonly targetId: string
  readonly targetName: string
  readonly verdict: ThemeVerdict
  readonly narration: ThemeNarration
  /**
   * 개운 처방 전량 — **복채를 받은 풀이에만 실린다.**
   *
   * 🔴 무료 풀이에는 이 칸을 **채우지 않는다.** 화면에서 가리는 것으로는 부족하다 — 저장본이
   *    그대로 네트워크 응답에 실리므로, 값을 넣는 순간 무료로 전량이 나간다.
   */
  readonly remedy?: RemedySet
  /**
   * 무료 풀이가 보는 맛보기 — 한 가지 처방 + 잠긴 개수.
   * 숫자는 실제 배열 길이에서 온다(부풀리면 그 순간 거짓 표시가 된다).
   */
  readonly remedyTeaser?: { readonly preview: RemedyItem; readonly hiddenCount: number }
  /** ISO. 「N일 전 풀이」 배지가 이 값에서 나온다. */
  readonly analyzedAt: string
}

/** 판정 함수가 받는 것 — 전부 결정론 출력이다. */
export interface ThemeJudgeInput {
  readonly ctx: SajuContext
  /**
   * 세운. `ThemeResolver.yearOffsets` 가 요구한 해들이 들어온다(순서 무관 — 판정은 `.year` 로
   * 찾는다). 액션이 계산해 넣어 주므로 판정 함수 안에서 세운을 다시 돌리지 않는다.
   */
  readonly yearly: readonly YearlyFortuneResult[]
  /**
   * 🔴 기준 연도는 **인자로 받는다.** 판정 함수가 `new Date()` 를 읽으면 결정론이 깨지고
   * 「같은 사주 = 같은 판정」 테스트를 시각으로 흔들 수 있다.
   */
  readonly baseYear: number
  /** 26룰 평가 결과. `SajuContext` 는 룰 텍스트만 들고 객체를 안 돌려준다 — 액션이 채운다. */
  readonly rules: RuleBaseResult
}

/** L3 계약 — 테마의 «자기 목소리». 공용 프롬프트에 이 두 자리로만 주입된다(마스터 §5-4). */
export interface ThemePromptContract {
  /** 🔴 테마마다 새 AnalysisType 을 만들지 않는다(마스터 §5-4) — 기존 유니온만 쓴다. */
  readonly analysisType: AnalysisType
  /** 이 테마가 답하는 질문 한 문장. */
  readonly question: string
  /** 서술 규율 — 「무엇을 하라」. */
  readonly rules: readonly string[]
  /** 금지 소재 — 「무엇을 쓰지 마라」. */
  readonly forbidden: readonly string[]
}

/**
 * 테마 판정기 — 테마 하나가 코드에 등록되는 단위.
 *
 * 다음 기(機)가 테마를 더할 때 만드는 것이 정확히 이 객체 하나다(파일 1개 + 등록 1줄).
 */
export interface ThemeResolver {
  /** `THEME_FORTUNES` 의 id 와 같아야 한다 — 레지스트리 계약 테스트가 대조한다. */
  readonly themeId: string
  /**
   * 필요한 세운의 «기준 연도로부터의 오프셋». 0=올해, -1=작년, 1=내년.
   * 액션은 이 선언만 보고 계산 범위를 정한다 — 판정 함수가 엔진을 직접 부르지 않는다.
   */
  readonly yearOffsets: readonly number[]
  /** L2 — 순수 함수. 같은 입력 → 항상 같은 출력(테스트가 고정한다). */
  readonly judge: (input: ThemeJudgeInput) => ThemeVerdict
  readonly prompt: ThemePromptContract
}

/** 판정이 허용한 달 전량 — L3 가 지어낸 달을 서버에서 걸러내는 기준(마스터 §5-4). */
export function allowedMonths(verdict: ThemeVerdict): readonly number[] {
  const months = new Set<number>()
  for (const timing of verdict.timings) for (const month of timing.months) months.add(month)
  return [...months].sort((a, b) => a - b)
}

export function timingsOf(verdict: ThemeVerdict, kind: ThemeTiming['kind']): readonly ThemeTiming[] {
  return verdict.timings.filter((timing) => timing.kind === kind)
}
