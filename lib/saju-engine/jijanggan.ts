/**
 * 해화지기 사주 엔진 - 지장간(藏干) 모듈
 * 12지지 안에 숨어있는 천간(여기/중기/본기)을 정의하고,
 * 투출(透出) 판정을 수행한다.
 *
 * 참고: 자평진전(子平眞詮), 삼명통회(三命通會) 기준
 */

// ===================== 타입 정의 =====================

export interface JijangganEntry {
  /** 여기(초기) 천간 — 잔기, 직전 계절의 남은 기운 */
  yeogi: string | null
  /** 여기 지속 일수 */
  yeogiDays: number
  /** 중기 천간 — 과도기 */
  junggi: string | null
  /** 중기 지속 일수 */
  junggiDays: number
  /** 본기(정기) 천간 — 해당 지지의 주인 */
  bongi: string
  /** 본기 지속 일수 */
  bongiDays: number
}

export interface TouchuResult {
  /** 투출된 천간 */
  gan: string
  /** 어디서 투출되었는지 (여기/중기/본기) */
  source: 'yeogi' | 'junggi' | 'bongi'
  /** 투출 근거 텍스트 */
  basis: string
}

export interface JijangganAnalysis {
  /** 4개 지지의 지장간 내역 */
  entries: Array<{
    position: string
    zhi: string
    jijanggan: JijangganEntry
    allGans: string[]
  }>
  /** 전체 지장간 천간 목록 (통근 분석용) */
  allHiddenGans: string[]
}

// ===================== 지장간 상수 테이블 =====================

export const JIJANGGAN: Record<string, JijangganEntry> = {
  子: { yeogi: null, yeogiDays: 0, junggi: null, junggiDays: 0, bongi: '癸', bongiDays: 30 },
  丑: { yeogi: '癸', yeogiDays: 9, junggi: '辛', junggiDays: 3, bongi: '己', bongiDays: 18 },
  寅: { yeogi: '戊', yeogiDays: 7, junggi: '丙', junggiDays: 7, bongi: '甲', bongiDays: 16 },
  卯: { yeogi: null, yeogiDays: 0, junggi: null, junggiDays: 0, bongi: '乙', bongiDays: 30 },
  辰: { yeogi: '乙', yeogiDays: 9, junggi: '癸', junggiDays: 3, bongi: '戊', bongiDays: 18 },
  巳: { yeogi: '戊', yeogiDays: 7, junggi: '庚', junggiDays: 7, bongi: '丙', bongiDays: 16 },
  午: { yeogi: null, yeogiDays: 0, junggi: '己', junggiDays: 9, bongi: '丁', bongiDays: 21 },
  未: { yeogi: '丁', yeogiDays: 9, junggi: '乙', junggiDays: 3, bongi: '己', bongiDays: 18 },
  申: { yeogi: '己', yeogiDays: 7, junggi: '壬', junggiDays: 7, bongi: '庚', bongiDays: 16 },
  酉: { yeogi: null, yeogiDays: 0, junggi: null, junggiDays: 0, bongi: '辛', bongiDays: 30 },
  戌: { yeogi: '辛', yeogiDays: 9, junggi: '丁', junggiDays: 3, bongi: '戊', bongiDays: 18 },
  亥: { yeogi: '戊', yeogiDays: 7, junggi: '甲', junggiDays: 7, bongi: '壬', bongiDays: 16 },
}

// ===================== 지지→지장간 천간 목록 =====================

/**
 * 지지의 지장간 천간 목록을 순서대로 반환한다.
 * 순서: [여기, 중기, 본기] (null은 제외)
 */
export function getJijangganGans(zhi: string): string[] {
  const entry = JIJANGGAN[zhi]
  if (!entry) return []
  const result: string[] = []
  if (entry.yeogi) result.push(entry.yeogi)
  if (entry.junggi) result.push(entry.junggi)
  result.push(entry.bongi)
  return result
}

/**
 * 지지의 지장간 엔트리를 반환한다.
 */
export function getJijanggan(zhi: string): JijangganEntry | null {
  return JIJANGGAN[zhi] ?? null
}

// ===================== 투출(透出) 판정 =====================

/**
 * 월지 지장간에서 천간에 투출된 글자를 찾는다.
 *
 * 투출(透出) = 지장간에 숨어있는 천간이 사주 4주의 천간에 동일하게 나타나는 것.
 * 본기 > 중기 > 여기 순서로 우선순위를 두어 판정한다.
 *
 * @param monthZhi - 월지
 * @param allGans - 사주 4주의 천간 배열 [년간, 월간, 일간, 시간]
 * @returns 투출된 결과 배열 (본기→중기→여기 우선순위)
 */
export function getTouchuGans(monthZhi: string, allGans: string[]): TouchuResult[] {
  const entry = JIJANGGAN[monthZhi]
  if (!entry) return []

  const results: TouchuResult[] = []

  // 본기 투출 확인 (최우선)
  if (allGans.includes(entry.bongi)) {
    results.push({
      gan: entry.bongi,
      source: 'bongi',
      basis: `월지 ${monthZhi}의 본기 ${entry.bongi}이(가) 천간에 투출`,
    })
  }

  // 중기 투출 확인
  if (entry.junggi && allGans.includes(entry.junggi)) {
    results.push({
      gan: entry.junggi,
      source: 'junggi',
      basis: `월지 ${monthZhi}의 중기 ${entry.junggi}이(가) 천간에 투출`,
    })
  }

  // 여기 투출 확인
  if (entry.yeogi && allGans.includes(entry.yeogi)) {
    results.push({
      gan: entry.yeogi,
      source: 'yeogi',
      basis: `월지 ${monthZhi}의 여기 ${entry.yeogi}이(가) 천간에 투출`,
    })
  }

  return results
}

// ===================== 통근(通根) 판정 =====================

const GAN_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
}

/**
 * 특정 천간이 4개 지지의 지장간에 통근(뿌리를 내림)하고 있는지 확인한다.
 *
 * 통근 = 천간과 동일한 글자가 지장간 중에 존재하는 것.
 * "정근(正根)" = 같은 글자, "편근(偏根)" = 같은 오행이지만 다른 글자.
 *
 * @param targetGan - 통근 여부를 확인할 천간
 * @param allZhis - 사주 4개 지지 배열
 * @returns 통근 정보 배열
 */
export function checkTonggeun(
  targetGan: string,
  allZhis: Array<{ position: string; zhi: string }>
): Array<{
  position: string
  zhi: string
  hiddenGan: string
  source: 'yeogi' | 'junggi' | 'bongi'
  rootType: 'exact' | 'sameElement'
  strength: number // 정근=본기 10, 정근=중기 7, 정근=여기 5, 편근은 각각 -2
}> {
  const targetElement = GAN_ELEMENT[targetGan]
  if (!targetElement) return []

  const roots: Array<{
    position: string
    zhi: string
    hiddenGan: string
    source: 'yeogi' | 'junggi' | 'bongi'
    rootType: 'exact' | 'sameElement'
    strength: number
  }> = []

  for (const { position, zhi } of allZhis) {
    const entry = JIJANGGAN[zhi]
    if (!entry) continue

    // 본기 확인
    const bongiEl = GAN_ELEMENT[entry.bongi]
    if (entry.bongi === targetGan) {
      roots.push({ position, zhi, hiddenGan: entry.bongi, source: 'bongi', rootType: 'exact', strength: 10 })
    } else if (bongiEl === targetElement) {
      roots.push({ position, zhi, hiddenGan: entry.bongi, source: 'bongi', rootType: 'sameElement', strength: 8 })
    }

    // 중기 확인
    if (entry.junggi) {
      const junggiEl = GAN_ELEMENT[entry.junggi]
      if (entry.junggi === targetGan) {
        roots.push({ position, zhi, hiddenGan: entry.junggi, source: 'junggi', rootType: 'exact', strength: 7 })
      } else if (junggiEl === targetElement) {
        roots.push({ position, zhi, hiddenGan: entry.junggi, source: 'junggi', rootType: 'sameElement', strength: 5 })
      }
    }

    // 여기 확인
    if (entry.yeogi) {
      const yeogiEl = GAN_ELEMENT[entry.yeogi]
      if (entry.yeogi === targetGan) {
        roots.push({ position, zhi, hiddenGan: entry.yeogi, source: 'yeogi', rootType: 'exact', strength: 5 })
      } else if (yeogiEl === targetElement) {
        roots.push({ position, zhi, hiddenGan: entry.yeogi, source: 'yeogi', rootType: 'sameElement', strength: 3 })
      }
    }
  }

  return roots
}

/**
 * 4개 지지 전체의 지장간 분석을 수행한다.
 */
export function analyzeAllJijanggan(
  pillars: Array<{ position: string; zhi: string }>
): JijangganAnalysis {
  const entries: JijangganAnalysis['entries'] = []
  const allHiddenGans: string[] = []

  for (const { position, zhi } of pillars) {
    const jijanggan = JIJANGGAN[zhi]
    if (!jijanggan) continue

    const gans = getJijangganGans(zhi)
    entries.push({ position, zhi, jijanggan, allGans: gans })
    allHiddenGans.push(...gans)
  }

  return { entries, allHiddenGans }
}

/**
 * 지장간 분석 결과를 AI 프롬프트용 텍스트로 변환한다.
 */
export function buildJijangganText(analysis: JijangganAnalysis): string {
  const lines: string[] = ['### 지장간(藏干) — 숨은 뿌리 분석']

  for (const entry of analysis.entries) {
    const { position, zhi, jijanggan } = entry
    const parts: string[] = []
    if (jijanggan.yeogi) parts.push(`여기:${jijanggan.yeogi}(${jijanggan.yeogiDays}일)`)
    if (jijanggan.junggi) parts.push(`중기:${jijanggan.junggi}(${jijanggan.junggiDays}일)`)
    parts.push(`본기:${jijanggan.bongi}(${jijanggan.bongiDays}일)`)
    lines.push(`- ${position}(${zhi}): ${parts.join(' / ')}`)
  }

  return lines.join('\n')
}
