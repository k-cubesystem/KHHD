/**
 * 웹툰 «간이 진맥» — 회차 중간에 독자의 사주를 실제로 읽어 주는 인라인 위젯의 도메인.
 *
 * 왜 있나: 극중 해수가 손님에게 하는 진맥을, 그 장면을 읽던 독자가 그대로 받는다.
 * 조사(2026-09-08) 기준 얼굴 삽입형(마주쳤다)·선택지형은 있어도 **독자의 실데이터로
 * 본문 중간에 개인 풀이를 주는 웹툰은 없다** — 이 공백이 해화당만 가진 전환 장치다.
 *
 * 🔴 문장 규율(표시광고법·MARKETING.md §2): 사람을 단정하지 않는다 — «~로 봅니다/읽습니다».
 *    효험·미래 약속 없음. 이 파일 밖에서 진맥 문구를 새로 짓지 않는다(단일 출처).
 * 🔴 계산은 결정론(만세력)이다 — AI 호출 없음, 비용 0, 같은 입력 = 같은 답.
 */

export type WuXing = '木' | '火' | '土' | '金' | '水'

export const WU_XING_ORDER: readonly WuXing[] = ['木', '火', '土', '金', '水']

/** 회차별 삽입 지점·테마. after = 이 «분할 페이지 번호(1-기준)» 뒤에 끼운다. */
export interface JinmaekSlot {
  /** 몇 번째 분할 뒤인가 (업로드 규격 = 회차당 5분할) */
  after: number
  /** 회차 테마 오행 — 없으면 전체 균형으로 말한다 */
  element: WuXing | null
  /** 위젯 도입부 — 극중 화자의 말로 건넨다 */
  hook: string
  /** 도입부 화자 (이름표 색은 화면이 화자명으로 정한다) */
  speaker: '해수' | '해화지기'
}

/**
 * 회차 → 슬롯. 등재된 회차에만 위젯이 뜬다.
 * ⚠️ 감정 클라이맥스 직후는 피하고, 극중 «진맥·등불» 비트 옆에 붙인다 — 몰입을 끊는 게 아니라
 *    장면의 연장이 되게. 새 회차를 낼 때 여기 한 줄을 같이 늘린다.
 */
export const JINMAEK_SLOTS: Readonly<Record<number, JinmaekSlot>> = {
  0: {
    after: 3,
    element: null,
    hook: '…지나가는 손님. 팔자등이나 한번 켜 보고 가시오 — 복채는 안 받겠소.',
    speaker: '해화지기',
  },
  1: { after: 4, element: null, hook: '…당신 팔자등도, 한번 볼까요.', speaker: '해수' },
  2: { after: 2, element: '土', hook: '마 여사님만 볼 게 아니라 — 손님 토(土)도 좀 봅시다.', speaker: '해수' },
  3: { after: 2, element: '木', hook: '가족 얘기가 나온 김에 — 손님의 나무(木)는 어떤가 봅시다.', speaker: '해수' },
  4: { after: 2, element: '火', hook: '남 일 같지 않다면 — 손님의 불(火)부터 짚어 봅시다.', speaker: '해수' },
  5: { after: 3, element: '火', hook: '…밥은 먹고 다니시오? 손님의 불도 마저 봅시다.', speaker: '해화지기' },
  6: {
    after: 3,
    element: '土',
    hook: '이 집이 왜 안 무너지는지 아시오? — 손님 토(土)도 좀 봅시다.',
    speaker: '해화지기',
  },
  // 7화 테마는 도화살 — 오행이 아니라서 element 없이 전체 균형으로 읽는다
  7: { after: 2, element: null, hook: '시선이 모이는 팔자인지 — 손님 등불부터 봅시다.', speaker: '해수' },
}

/** 진맥 결과 — 서버 액션이 만들어 화면이 그린다. 간지 원문은 싣지 않는다(읽기 부담 최소). */
export interface JinmaekReading {
  /** 오행별 글자 수 (시 모름이면 여섯 글자 기준) */
  counts: Record<WuXing, number>
  /** 세었을 글자 수 — 8(시 포함) 또는 6(시 모름) */
  total: 6 | 8
  /** 일간 한 줄 — «하늘로 곧게 뻗는 큰 나무»처럼 상(象)으로 */
  dayMasterLine: string
  /** 회차 테마(또는 전체 균형) 해설 2문장 */
  comment: string
}

const ELEMENT_KO: Record<WuXing, string> = { 木: '목(木)', 火: '화(火)', 土: '토(土)', 金: '금(金)', 水: '수(水)' }

/** 마지막 한글 음절의 받침 유무 — 조사(은/는, 으로/로) 선택용. 괄호·한자 꼬리는 건너뛴다. */
export function hasBatchim(s: string): boolean {
  const m = s.match(/[가-힣](?=[^가-힣]*$)/)
  if (!m) return false
  return (m[0].charCodeAt(0) - 0xac00) % 28 > 0
}

const eunNeun = (s: string) => (hasBatchim(s) ? '은' : '는')

const ELEMENT_SENSE: Record<WuXing, string> = {
  木: '뻗고 시작하는 힘',
  火: '드러내고 데우는 힘',
  土: '머무르고 믿는 힘',
  金: '거두고 맺는 힘',
  水: '흐르고 궁리하는 힘',
}

/** 테마 오행 해설 — 개수 3단(0 / 1~2 / 3+). 어미 규율을 지킨 문장만 둔다. */
export function themeComment(element: WuXing, count: number, total: 6 | 8): string {
  const name = ELEMENT_KO[element]
  const sense = ELEMENT_SENSE[element]
  const base = `여덟 글자 중 ${name}${eunNeun(name)} ${sense}입니다.`
  const scope = total === 6 ? ' (태어난 시를 몰라 여섯 글자로 읽었습니다.)' : ''
  if (count === 0)
    return `${base} 손님의 자리에는 지금 이 글자가 보이지 않네요 — 전통은 이를 «비었다»가 아니라, 살면서 채워 가는 자리로 읽습니다.${scope}`
  if (count <= 2)
    return `${base} 손님에게는 ${count}개 — 알맞게 자리 잡은 편으로 봅니다. 이 회차의 손님과는 다른 그림이네요.${scope}`
  return `${base} 손님에게는 ${count}개 — 넉넉한 쪽입니다. 전통은 넘치는 기운을 흉이 아니라, 쓸 곳을 찾는 기운으로 읽습니다.${scope}`
}

/** 전체 균형 해설 — 가장 많은/없는 오행 한 쌍으로 말한다. */
export function balanceComment(counts: Record<WuXing, number>, total: 6 | 8): string {
  let maxEl: WuXing = '木'
  for (const el of WU_XING_ORDER) if (counts[el] > counts[maxEl]) maxEl = el
  const missing = WU_XING_ORDER.filter((el) => counts[el] === 0)
  const scope = total === 6 ? ' (태어난 시를 몰라 여섯 글자로 읽었습니다.)' : ''
  const head = `손님의 등불은 ${ELEMENT_KO[maxEl]} 쪽이 가장 밝게 켜져 있네요 — ${ELEMENT_SENSE[maxEl]}이 앞서는 그림으로 봅니다.`
  if (missing.length === 0) return `${head} 다섯 기운이 모두 자리해, 고르게 눌러 쓰는 명으로 읽습니다.${scope}`
  const miss = missing.map((el) => ELEMENT_KO[el]).join('·')
  return `${head} ${miss} 자리는 비어 있는데, 전통은 빈 자리를 흠이 아니라 채우며 사는 자리로 읽습니다.${scope}`
}

/** 생년월일 입력 검증 — 액션·화면이 같은 기준을 쓴다. */
export function validBirthDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const [y, m, d] = date.split('-').map(Number)
  if (y < 1900 || y > new Date().getFullYear()) return false
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  return true
}
