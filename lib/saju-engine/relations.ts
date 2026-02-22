/**
 * 해화지기 사주 엔진 - 관계 역학 모듈
 * 합(合) · 충(沖) · 형(刑) · 파(破) · 해(害) · 공망(空亡) 계산
 * haehwajigi.md 3장: "갈등과 화합을 연산하는 네트워크 상호작용 알고리즘"
 */

// ===================== 천간 관계 =====================

/** 천간합 (天干合) - 오행 변화 포함 */
export const CHEONGAN_HAP: Record<string, { partner: string; resultElement: string; label: string }> = {
  甲: { partner: '己', resultElement: '土', label: '甲己합 (土화)' },
  己: { partner: '甲', resultElement: '土', label: '甲己합 (土화)' },
  乙: { partner: '庚', resultElement: '金', label: '乙庚합 (金화)' },
  庚: { partner: '乙', resultElement: '金', label: '乙庚합 (金화)' },
  丙: { partner: '辛', resultElement: '水', label: '丙辛합 (水화)' },
  辛: { partner: '丙', resultElement: '水', label: '丙辛합 (水화)' },
  丁: { partner: '壬', resultElement: '木', label: '丁壬합 (木화)' },
  壬: { partner: '丁', resultElement: '木', label: '丁壬합 (木화)' },
  戊: { partner: '癸', resultElement: '火', label: '戊癸합 (火화)' },
  癸: { partner: '戊', resultElement: 'Fire', label: '戊癸합 (火화)' },
}

/** 천간충 (天干沖) */
export const CHEONGAN_CHUNG: Record<string, string> = {
  甲: '庚',
  庚: '甲',
  乙: '辛',
  辛: '乙',
  丙: '壬',
  壬: '丙',
  丁: '癸',
  癸: '丁',
}

// ===================== 지지 관계 =====================

/** 지지삼합 (地支三合) - 국(局) 형성 */
export const JIJI_SAMHAP: Array<{ zhis: string[]; element: string; label: string }> = [
  { zhis: ['亥', '卯', '未'], element: '木', label: '해묘미 木局' },
  { zhis: ['寅', '午', '戌'], element: '火', label: '인오술 火局' },
  { zhis: ['巳', '酉', '丑'], element: '金', label: '사유축 金局' },
  { zhis: ['申', '子', '辰'], element: '水', label: '신자진 水局' },
]

/** 지지육합 (地支六合) - 은밀하고 끈끈한 결합 */
export const JIJI_YUKHAP: Array<{ zhis: [string, string]; element: string; label: string }> = [
  { zhis: ['子', '丑'], element: '土', label: '자축합 (土화)' },
  { zhis: ['寅', '亥'], element: '木', label: '인해합 (木화)' },
  { zhis: ['卯', '戌'], element: '火', label: '묘술합 (火화)' },
  { zhis: ['辰', '酉'], element: '金', label: '진유합 (金화)' },
  { zhis: ['巳', '申'], element: '水', label: '사신합 (水화)' },
  { zhis: ['午', '未'], element: '火', label: '오미합 (火土)' },
]

/** 지지방합 (地支方合) - 계절 연대 */
export const JIJI_BANGHAP: Array<{ zhis: string[]; season: string; element: string }> = [
  { zhis: ['寅', '卯', '辰'], season: '봄', element: '木' },
  { zhis: ['巳', '午', '未'], season: '여름', element: '火' },
  { zhis: ['申', '酉', '戌'], season: '가을', element: '金' },
  { zhis: ['亥', '子', '丑'], season: '겨울', element: '水' },
]

/** 지지충 (地支沖) - 스트레스·변동·충돌 */
export const JIJI_CHUNG: Record<string, string> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
}

/** 지지형 (地支刑) - 자형(自刑) / 삼형(三刑) / 상형(相刑) */
export const JIJI_HYEONG: Array<{ zhis: string[]; type: string; label: string }> = [
  { zhis: ['寅', '巳', '申'], type: '삼형', label: '인사신 삼형 (無恩之刑)' },
  { zhis: ['丑', '戌', '未'], type: '삼형', label: '축술미 삼형 (持勢之刑)' },
  { zhis: ['子', '卯'], type: '상형', label: '자묘 상형 (無禮之刑)' },
  { zhis: ['辰', '辰'], type: '자형', label: '진진 자형' },
  { zhis: ['午', '午'], type: '자형', label: '오오 자형' },
  { zhis: ['酉', '酉'], type: '자형', label: '유유 자형' },
  { zhis: ['亥', '亥'], type: '자형', label: '해해 자형' },
]

/** 지지파 (地支破) */
export const JIJI_PA: Array<[string, string]> = [
  ['子', '酉'],
  ['午', '卯'],
  ['寅', '亥'],
  ['丑', '辰'],
  ['申', '巳'],
  ['戌', '未'],
]

/** 지지해 (地支害) - 육해(六害) */
export const JIJI_HAE: Array<[string, string]> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
]

// ===================== 공망 (空亡) =====================

/** 일주 천간 기준 공망 지지 */
export const GONGMANG_MAP: Record<string, string[]> = {
  甲子: ['戌', '亥'],
  乙丑: ['戌', '亥'],
  丙寅: ['戌', '亥'],
  丁卯: ['戌', '亥'],
  戊辰: ['戌', '亥'],
  己巳: ['戌', '亥'],
  庚午: ['戌', '亥'],
  辛未: ['戌', '亥'],
  壬申: ['戌', '亥'],
  癸酉: ['戌', '亥'],
  甲戌: ['申', '酉'],
  乙亥: ['申', '酉'],
  丙子: ['申', '酉'],
  丁丑: ['申', '酉'],
  戊寅: ['申', '酉'],
  己卯: ['申', '酉'],
  庚辰: ['申', '酉'],
  辛巳: ['申', '酉'],
  壬午: ['申', '酉'],
  癸未: ['申', '酉'],
  甲申: ['午', '未'],
  乙酉: ['午', '未'],
  丙戌: ['午', '未'],
  丁亥: ['午', '未'],
  戊子: ['午', '未'],
  己丑: ['午', '未'],
  庚寅: ['午', '未'],
  辛卯: ['午', '未'],
  壬辰: ['午', '未'],
  癸巳: ['午', '未'],
  甲午: ['辰', '巳'],
  乙未: ['辰', '巳'],
  丙申: ['辰', '巳'],
  丁酉: ['辰', '巳'],
  戊戌: ['辰', '巳'],
  己亥: ['辰', '巳'],
  庚子: ['辰', '巳'],
  辛丑: ['辰', '巳'],
  壬寅: ['辰', '巳'],
  癸卯: ['辰', '巳'],
  甲辰: ['寅', '卯'],
  乙巳: ['寅', '卯'],
  丙午: ['寅', '卯'],
  丁未: ['寅', '卯'],
  戊申: ['寅', '卯'],
  己酉: ['寅', '卯'],
  庚戌: ['寅', '卯'],
  辛亥: ['寅', '卯'],
  壬子: ['寅', '卯'],
  癸丑: ['寅', '卯'],
  甲寅: ['子', '丑'],
  乙卯: ['子', '丑'],
  丙辰: ['子', '丑'],
  丁巳: ['子', '丑'],
  戊午: ['子', '丑'],
  己未: ['子', '丑'],
  庚申: ['子', '丑'],
  辛酉: ['子', '丑'],
  壬戌: ['子', '丑'],
  癸亥: ['子', '丑'],
}

// ===================== 분석 함수 =====================

export interface RelationResult {
  hap: string[] // 합 목록
  chung: string[] // 충 목록
  hyeong: string[] // 형 목록
  pa: string[] // 파 목록
  hae: string[] // 해 목록
  gongmang: string[] // 공망 지지
  dominantRelation: '화합' | '갈등' | '변동' | '중립'
  summary: string
}

/**
 * 사주 8글자에서 관계 역학 전체 계산
 * @param pillars - [년간, 년지, 월간, 월지, 일간, 일지, 시간, 시지]
 * @param dayGanji - 일주 (예: '甲子')
 */
export function analyzeRelations(pillars: { gan: string; zhi: string }[], dayGanji: string): RelationResult {
  const allGans = pillars.map((p) => p.gan)
  const allZhis = pillars.map((p) => p.zhi)

  const hap: string[] = []
  const chung: string[] = []
  const hyeong: string[] = []
  const pa: string[] = []
  const hae: string[] = []

  // 천간합 검사
  for (let i = 0; i < allGans.length; i++) {
    for (let j = i + 1; j < allGans.length; j++) {
      const hapInfo = CHEONGAN_HAP[allGans[i]]
      if (hapInfo && hapInfo.partner === allGans[j]) {
        hap.push(hapInfo.label)
      }
    }
  }

  // 지지삼합 검사
  for (const samhap of JIJI_SAMHAP) {
    const matches = samhap.zhis.filter((z) => allZhis.includes(z))
    if (matches.length >= 3) hap.push(samhap.label)
    else if (matches.length === 2) hap.push(`${samhap.label} (반합)`)
  }

  // 지지육합 검사
  for (const yukhap of JIJI_YUKHAP) {
    const [z1, z2] = yukhap.zhis
    if (allZhis.includes(z1) && allZhis.includes(z2)) {
      hap.push(yukhap.label)
    }
  }

  // 지지충 검사
  for (let i = 0; i < allZhis.length; i++) {
    for (let j = i + 1; j < allZhis.length; j++) {
      if (JIJI_CHUNG[allZhis[i]] === allZhis[j]) {
        chung.push(`${allZhis[i]}${allZhis[j]}충`)
      }
    }
  }

  // 천간충 검사
  for (let i = 0; i < allGans.length; i++) {
    for (let j = i + 1; j < allGans.length; j++) {
      if (CHEONGAN_CHUNG[allGans[i]] === allGans[j]) {
        chung.push(`${allGans[i]}${allGans[j]}충`)
      }
    }
  }

  // 지지형 검사
  for (const hyeongItem of JIJI_HYEONG) {
    const matches = hyeongItem.zhis.filter((z) => allZhis.includes(z))
    if (matches.length === hyeongItem.zhis.length) {
      hyeong.push(hyeongItem.label)
    }
  }

  // 지지파 검사
  for (const [z1, z2] of JIJI_PA) {
    if (allZhis.includes(z1) && allZhis.includes(z2)) {
      pa.push(`${z1}${z2}파`)
    }
  }

  // 지지해 검사
  for (const [z1, z2] of JIJI_HAE) {
    if (allZhis.includes(z1) && allZhis.includes(z2)) {
      hae.push(`${z1}${z2}해`)
    }
  }

  // 공망
  const gongmang = GONGMANG_MAP[dayGanji] || []

  // 지배적 관계 판단
  const totalHap = hap.length
  const totalConflict = chung.length + hyeong.length * 1.5
  let dominantRelation: RelationResult['dominantRelation'] = '중립'
  if (totalHap > totalConflict) dominantRelation = '화합'
  else if (totalConflict > totalHap + 1) dominantRelation = '갈등'
  else if (chung.length > 0) dominantRelation = '변동'

  const summary = buildRelationSummary({ hap, chung, hyeong, pa, hae, gongmang, dominantRelation })

  return { hap, chung, hyeong, pa, hae, gongmang, dominantRelation, summary }
}

function buildRelationSummary(r: Omit<RelationResult, 'summary'>): string {
  const parts: string[] = []
  if (r.hap.length > 0) parts.push(`합(和): ${r.hap.join(', ')}`)
  if (r.chung.length > 0) parts.push(`충(沖): ${r.chung.join(', ')}`)
  if (r.hyeong.length > 0) parts.push(`형(刑): ${r.hyeong.join(', ')}`)
  if (r.pa.length > 0) parts.push(`파(破): ${r.pa.join(', ')}`)
  if (r.hae.length > 0) parts.push(`해(害): ${r.hae.join(', ')}`)
  if (r.gongmang.length > 0) parts.push(`공망(空亡): ${r.gongmang.join('·')}`)
  return parts.join(' | ') || '특별한 관계 없음'
}
