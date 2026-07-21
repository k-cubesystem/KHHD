/**
 * 오늘의 운세 구조 요소(총운·행운의 색/숫자/시간)를 결정적으로 파생하는 순수 함수(F-7).
 *
 * daily.ts 의 AI 산출물은 {content} 텍스트 한 덩어리라 매일 바뀌는 "구조"가 없다.
 * AI 재호출·프롬프트/태그 변경 없이(계약 불변), 날짜·사주로부터 순수 파생으로
 * 별점·행운 카드를 만든다. 같은 (날짜·일간 오행·일진 오행) → 항상 같은 결과.
 *
 * 오행 색(WU_XING_COLORS)은 lunar-javascript 의존을 피하려 인라인한다(순수 유지).
 */

export interface DailyLucky {
  /** 총운 별점 1~5 (일진 오행과 본인 일간의 상생·상극 관계 기반) */
  stars: number
  /** 행운의 색 (오늘 나를 돕는 오행) */
  color: { name: string; hex: string }
  /** 행운의 숫자 1~9 */
  number: number
  /** 행운의 시간 (12시진 중 하나) */
  timeRange: string
}

const EL_HEX: Record<string, string> = { 木: '#4A7C59', 火: '#C07055', 土: '#C5B358', 金: '#989390', 水: '#4A5D7C' }
const EL_COLOR_KO: Record<string, string> = { 木: '초록', 火: '빨강', 土: '황금', 金: '흰색', 水: '검정' }

/** 상생(相生): key 오행을 낳아주는(돕는) 부모 오행. 水生木 → 木의 조력 = 水. */
const SHENG_PARENT: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }
/** 상극(相剋): key 오행이 극(이기는)하는 오행. 木剋土. */
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

const SIJIN = [
  '자시 (23~01시)',
  '축시 (01~03시)',
  '인시 (03~05시)',
  '묘시 (05~07시)',
  '진시 (07~09시)',
  '사시 (09~11시)',
  '오시 (11~13시)',
  '미시 (13~15시)',
  '신시 (15~17시)',
  '유시 (17~19시)',
  '술시 (19~21시)',
  '해시 (21~23시)',
] as const

/** 결정적 문자열 해시(FNV-1a 32bit). 같은 입력 → 같은 값. */
function hash32(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * @param dateStr 오늘 날짜 'YYYY-MM-DD'
 * @param dayMasterElement 본인 일간(日干) 오행 (木火土金水)
 * @param todayElement 오늘 일진(日辰) 천간 오행 (木火土金水)
 */
export function deriveDailyLucky(dateStr: string, dayMasterElement: string, todayElement: string): DailyLucky {
  // 총운: 일진 오행과 본인 일간의 십성 관계
  let stars: number
  if (SHENG_PARENT[dayMasterElement] === todayElement)
    stars = 5 // 인성(나를 생) — 최상
  else if (dayMasterElement === todayElement)
    stars = 4 // 비겁(같은 기운)
  else if (SHENG_PARENT[todayElement] === dayMasterElement)
    stars = 4 // 식상(내가 생)
  else if (KE[dayMasterElement] === todayElement)
    stars = 3 // 재성(내가 극)
  else if (KE[todayElement] === dayMasterElement)
    stars = 2 // 관성(나를 극)
  else stars = 3

  // 행운의 색: 오늘 나를 돕는 오행(인성)
  const helpful = SHENG_PARENT[dayMasterElement] ?? dayMasterElement
  const color = { name: EL_COLOR_KO[helpful] ?? '황금', hex: EL_HEX[helpful] ?? '#C9A84C' }

  // 행운의 숫자·시간: 날짜+일간 결정적 해시
  const h = hash32(`${dateStr}|${dayMasterElement}`)
  const number = (h % 9) + 1
  const timeRange = SIJIN[h % 12]

  return { stars, color, number, timeRange }
}
