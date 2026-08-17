/**
 * 「문자열인 줄 알았는데 객체였던 칸」을 안전하게 읽는다 — **라이브 장애의 회귀선** (2026-08-17).
 *
 * ## 🔴 이 파일이 고친 사고
 * 기록에서 천지인 풀이를 열면 화면이 통째로 죽었다. 브라우저 오류는 이것 하나였다 —
 *
 *   Minified React error #31 — object with keys
 *   {summary, best_jobs, worst_jobs, career_timing, business_aptitude, personality_match, celebrity_comparison}
 *
 * 즉 **객체를 React 자식으로 렌더**했다. `CheonSection` 은 `career` 를 `string` 으로 알고
 * `{data.career}` 라고 썼는데, AI 출력 스키마는 그 사이 **객체로 진화해 있었다**(직업 요약·추천
 * 직업 5·비추천 2·사업 적성·이직 시기·유명인 비교). `health` 도 같은 상태였다.
 *
 * ## 왜 타입이 못 막았나
 * `result_json` 은 `Record<string, any>` 로 저장되고, 뷰는 그것을 자기 좋은 타입으로 **단언**해서
 * 읽는다. 컴파일러가 볼 수 있는 진실이 없다. 그래서 «런타임에 실제로 무엇이 오는가»를 이 파일이
 * 단독으로 흡수한다 — 스키마가 또 바뀌어도 화면은 죽지 않는다.
 *
 * 🔴 새 뷰를 만들 때 `result_json` 의 값을 **곧바로 JSX 에 넣지 말 것.** 반드시 여기를 거친다.
 */

/** 화면이 그릴 수 있는 모양으로 정규화한 «풍부한 칸». */
export interface RichField {
  /** 본문 한 덩어리 — 문자열 값이었거나, 객체의 요약·서술을 이어 붙인 것. */
  readonly text: string
  /** 목록으로 그릴 것들. 「추천 직업」처럼 배열로 온 칸. */
  readonly lists: ReadonlyArray<{ readonly label: string; readonly items: readonly string[] }>
}

/** 객체 키를 화면에 쓸 우리말로. 모르는 키는 그대로 두지 않고 감춘다(영문 노출 금지). */
const KEY_LABEL: Record<string, string> = {
  summary: '',
  personality_match: '',
  business_aptitude: '사업 적성',
  career_timing: '이직·승진 시기',
  celebrity_comparison: '비슷한 결의 사람',
  best_jobs: '잘 맞는 일',
  worst_jobs: '덜 맞는 일',
  description: '',
  advice: '조언',
  weak_points: '약한 자리',
  care: '돌볼 것',
  timing: '시기',
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
}

/**
 * 문자열이든 객체든 화면이 그릴 수 있는 모양으로 바꾼다.
 *
 * - 문자열 → 그대로 본문
 * - 객체 → 문자열 값들은 본문으로(라벨 있는 것은 「라벨 — 내용」), 배열 값들은 목록으로
 * - 그 밖(숫자·null·배열 자체) → 빈 값. **절대 객체를 그대로 돌려주지 않는다.**
 */
export function toRichField(value: unknown): RichField | null {
  const direct = asText(value)
  if (direct) return { text: direct, lists: [] }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const paragraphs: string[] = []
  const lists: Array<{ label: string; items: string[] }> = []

  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const items = asList(raw)
    if (items.length > 0) {
      lists.push({ label: KEY_LABEL[key] ?? '', items })
      continue
    }

    const text = asText(raw)
    if (!text) continue

    const label = KEY_LABEL[key]
    // 라벨을 모르는 키는 «본문»으로만 싣는다 — 영문 키를 화면에 노출하지 않기 위해서다.
    paragraphs.push(label ? `${label} — ${text}` : text)
  }

  if (paragraphs.length === 0 && lists.length === 0) return null
  return { text: paragraphs.join('\n\n'), lists }
}

/**
 * 어떤 값이든 **React 자식으로 안전한 문자열**로. 목록이 있으면 함께 이어 붙인다.
 * 한 줄 표시(요약·미리보기)에 쓴다.
 */
export function toPlainText(value: unknown): string {
  const rich = toRichField(value)
  if (!rich) return ''
  const listText = rich.lists.flatMap((list) => list.items).join(' · ')
  return [rich.text, listText].filter(Boolean).join('\n')
}
