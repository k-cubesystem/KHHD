/**
 * 해화지기 사주 엔진 - 신강/신약 정밀 점수제
 * 3단계 평가: 득령(40점) + 득지(30점) + 득세(30점)
 *
 * 자평진전 기반 신강/신약 판정을 정량화하여,
 * 기존 sipseong.ts의 단순 카운팅 방식을 대체한다.
 */

import type { SajuData } from '@/lib/domain/saju/saju'
import type { SipseongMap } from './sipseong'
import { JIJANGGAN, checkTonggeun, getJijangganGans } from './jijanggan'
import { JIJI_CHUNG, JIJI_SAMHAP, JIJI_YUKHAP } from './relations'

// ===================== 타입 정의 =====================

export type StrengthGrade = '극강' | '신강' | '중화' | '신약' | '극약'

export interface DeukryeongScore {
  /** 득령 점수 (0~40) */
  score: number
  /** 십이운성 이름 */
  sibjiunseong: string
  /** 판정 근거 */
  basis: string
}

export interface DeukjiScore {
  /** 득지 점수 (0~30) */
  score: number
  /** 통근 상세 */
  roots: Array<{
    position: string
    zhi: string
    hiddenGan: string
    strength: number
  }>
  /** 판정 근거 */
  basis: string
}

export interface DeukseScore {
  /** 득세 점수 (0~30) */
  score: number
  /** 비겁 개수 */
  bigyeobCount: number
  /** 인성 개수 */
  inseongCount: number
  /** 판정 근거 */
  basis: string
}

export interface HapchungCorrection {
  /** 보정 점수 (양수=강화, 음수=약화) */
  adjustment: number
  /** 보정 내역 */
  details: string[]
}

export interface AdvancedStrengthResult {
  /** 총점 (0~100, 보정 후) */
  totalScore: number
  /** 5단계 판정 */
  grade: StrengthGrade
  /** 득령 상세 */
  deukryeong: DeukryeongScore
  /** 득지 상세 */
  deukji: DeukjiScore
  /** 득세 상세 */
  deukse: DeukseScore
  /** 합충 보정 */
  correction: HapchungCorrection
  /** AI 프롬프트용 요약 텍스트 */
  summary: string
}

// ===================== 오행/천간 데이터 =====================

const GAN_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
}

const GAN_YINYANG: Record<string, number> = {
  甲: 0, 乙: 1, 丙: 0, 丁: 1, 戊: 0,
  己: 1, 庚: 0, 辛: 1, 壬: 0, 癸: 1,
}

/** 오행 상생: X를 생하는 오행 */
const SAENG_BY: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }

// ===================== 십이운성 테이블 (sibjiunseong.ts와 동일) =====================

const SIBJIUNSEONG_TABLE: Record<string, Record<string, string>> = {
  甲: { 亥: '장생', 子: '목욕', 丑: '관대', 寅: '건록', 卯: '제왕', 辰: '쇠', 巳: '병', 午: '사', 未: '묘', 申: '절', 酉: '태', 戌: '양' },
  乙: { 午: '장생', 巳: '목욕', 辰: '관대', 卯: '건록', 寅: '제왕', 丑: '쇠', 子: '병', 亥: '사', 戌: '묘', 酉: '절', 申: '태', 未: '양' },
  丙: { 寅: '장생', 卯: '목욕', 辰: '관대', 巳: '건록', 午: '제왕', 未: '쇠', 申: '병', 酉: '사', 戌: '묘', 亥: '절', 子: '태', 丑: '양' },
  丁: { 酉: '장생', 申: '목욕', 未: '관대', 午: '건록', 巳: '제왕', 辰: '쇠', 卯: '병', 寅: '사', 丑: '묘', 子: '절', 亥: '태', 戌: '양' },
  戊: { 寅: '장생', 卯: '목욕', 辰: '관대', 巳: '건록', 午: '제왕', 未: '쇠', 申: '병', 酉: '사', 戌: '묘', 亥: '절', 子: '태', 丑: '양' },
  己: { 酉: '장생', 申: '목욕', 未: '관대', 午: '건록', 巳: '제왕', 辰: '쇠', 卯: '병', 寅: '사', 丑: '묘', 子: '절', 亥: '태', 戌: '양' },
  庚: { 巳: '장생', 午: '목욕', 未: '관대', 申: '건록', 酉: '제왕', 戌: '쇠', 亥: '병', 子: '사', 丑: '묘', 寅: '절', 卯: '태', 辰: '양' },
  辛: { 子: '장생', 亥: '목욕', 戌: '관대', 酉: '건록', 申: '제왕', 未: '쇠', 午: '병', 巳: '사', 辰: '묘', 卯: '절', 寅: '태', 丑: '양' },
  壬: { 申: '장생', 酉: '목욕', 戌: '관대', 亥: '건록', 子: '제왕', 丑: '쇠', 寅: '병', 卯: '사', 辰: '묘', 巳: '절', 午: '태', 未: '양' },
  癸: { 卯: '장생', 寅: '목욕', 丑: '관대', 子: '건록', 亥: '제왕', 戌: '쇠', 酉: '병', 申: '사', 未: '묘', 午: '절', 巳: '태', 辰: '양' },
}

// ===================== 1단계: 득령(得令) — 40점 만점 =====================

/**
 * 일간이 월지에서 얻는 에너지를 십이운성 기준으로 점수화한다.
 * 제왕/건록=40, 관대=35, 장생/양=30, 쇠/목욕=20, 묘=15, 병=10, 태/사/절=5
 */
function calculateDeukryeong(dayMaster: string, monthZhi: string): DeukryeongScore {
  const table = SIBJIUNSEONG_TABLE[dayMaster]
  if (!table) {
    return { score: 20, sibjiunseong: '미상', basis: '십이운성 테이블에서 일간을 찾을 수 없음' }
  }

  const ss = table[monthZhi] || '미상'

  const scoreMap: Record<string, number> = {
    제왕: 40,
    건록: 40,
    관대: 35,
    장생: 30,
    양: 28,
    쇠: 20,
    목욕: 18,
    묘: 15,
    병: 10,
    태: 8,
    사: 5,
    절: 3,
  }

  const score = scoreMap[ss] ?? 15

  let basisText: string
  if (score >= 35) {
    basisText = `월지 ${monthZhi}에서 일간 ${dayMaster}이(가) '${ss}'에 해당 — 왕한 기운을 받아 득령(得令)`
  } else if (score >= 20) {
    basisText = `월지 ${monthZhi}에서 일간 ${dayMaster}이(가) '${ss}'에 해당 — 보통 수준의 기운`
  } else {
    basisText = `월지 ${monthZhi}에서 일간 ${dayMaster}이(가) '${ss}'에 해당 — 실령(失令)하여 기운이 약함`
  }

  return { score, sibjiunseong: ss, basis: basisText }
}

// ===================== 2단계: 득지(得地) — 30점 만점 =====================

/**
 * 4개 지지의 지장간에서 일간과 동일/같은 오행(비겁) 또는
 * 일간을 생하는 오행(인성)이 있는지 확인한다.
 * 이것이 "통근(通根)" — 뿌리를 내린 것.
 */
function calculateDeukji(dayMaster: string, pillars: Array<{ position: string; zhi: string }>): DeukjiScore {
  const dayElement = GAN_ELEMENT[dayMaster]
  if (!dayElement) {
    return { score: 0, roots: [], basis: '일간 오행 정보를 확인할 수 없음' }
  }

  const motherElement = SAENG_BY[dayElement] // 인성 오행 (나를 생하는)

  // 일간 자체의 통근
  const dayMasterRoots = checkTonggeun(dayMaster, pillars)

  // 같은 오행의 다른 천간도 통근으로 간주 (비겁 통근)
  // 예: 甲 일간이면 乙이 지장간에 있어도 통근
  const allGans = Object.keys(GAN_ELEMENT)
  const sameElementGans = allGans.filter(g => GAN_ELEMENT[g] === dayElement && g !== dayMaster)
  const motherElementGans = allGans.filter(g => GAN_ELEMENT[g] === motherElement)

  let additionalRoots: typeof dayMasterRoots = []
  for (const gan of sameElementGans) {
    const roots = checkTonggeun(gan, pillars)
    additionalRoots = additionalRoots.concat(
      roots.map(r => ({ ...r, strength: Math.round(r.strength * 0.7) })) // 편근은 70% 가중치
    )
  }

  // 인성 통근 (모친 오행)
  let motherRoots: typeof dayMasterRoots = []
  for (const gan of motherElementGans) {
    const roots = checkTonggeun(gan, pillars)
    motherRoots = motherRoots.concat(
      roots.map(r => ({ ...r, strength: Math.round(r.strength * 0.5) })) // 인성 통근은 50% 가중치
    )
  }

  const allRoots = [...dayMasterRoots, ...additionalRoots, ...motherRoots]
  const totalStrength = allRoots.reduce((sum, r) => sum + r.strength, 0)

  // 통근 강도를 30점 만점으로 정규화
  const score = Math.min(30, Math.round(totalStrength * 1.5))

  const rootDetails = allRoots
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5)
    .map(r => `${r.position}(${r.zhi}) 지장간 ${r.hiddenGan}에 통근(강도 ${r.strength})`)

  const basis = rootDetails.length > 0
    ? `일간 ${dayMaster}(${dayElement})의 통근: ${rootDetails.join(', ')}`
    : `일간 ${dayMaster}(${dayElement})이(가) 어디에도 통근하지 못함 — 무근(無根)`

  return {
    score,
    roots: allRoots.map(r => ({
      position: r.position,
      zhi: r.zhi,
      hiddenGan: r.hiddenGan,
      strength: r.strength,
    })),
    basis,
  }
}

// ===================== 3단계: 득세(得勢) — 30점 만점 =====================

/**
 * 천간 + 지지 표면 오행에서 비겁(같은 오행)과 인성(나를 생하는 오행)의 개수를 세어
 * 일간을 돕는 세력의 크기를 평가한다.
 */
function calculateDeukse(dayMaster: string, sajuData: SajuData, sipseong: SipseongMap): DeukseScore {
  const dayElement = GAN_ELEMENT[dayMaster]
  if (!dayElement) {
    return { score: 0, bigyeobCount: 0, inseongCount: 0, basis: '일간 오행 정보를 확인할 수 없음' }
  }

  // 십성 분포에서 비겁/인성 카운트
  const bigyeobCount = (sipseong.distribution['비견'] || 0) + (sipseong.distribution['겁재'] || 0)
  const inseongCount = (sipseong.distribution['편인'] || 0) + (sipseong.distribution['정인'] || 0)

  // 비겁 1개=8점, 인성 1개=6점, 최대 30점
  const rawScore = bigyeobCount * 8 + inseongCount * 6
  const score = Math.min(30, rawScore)

  const basis = `비겁(비견+겁재) ${bigyeobCount}개(${bigyeobCount * 8}점) + 인성(편인+정인) ${inseongCount}개(${inseongCount * 6}점) = ${rawScore}점 → 득세 ${score}점`

  return { score, bigyeobCount, inseongCount, basis }
}

// ===================== 합충 보정 =====================

/**
 * 통근처가 충(沖)을 당하면 뿌리가 흔들려 -50% 감점.
 * 생조하는 합국(三合/六合)이 일간 오행을 생하면 +15점 가산.
 */
function calculateCorrection(
  dayMaster: string,
  sajuData: SajuData,
  deukjiRoots: DeukjiScore['roots']
): HapchungCorrection {
  const dayElement = GAN_ELEMENT[dayMaster]
  if (!dayElement) return { adjustment: 0, details: [] }

  const { pillars } = sajuData
  const allZhis = [pillars.year.zhi, pillars.month.zhi, pillars.day.zhi, pillars.time.zhi]
  const details: string[] = []
  let adjustment = 0

  // 1. 통근처 충(沖) 감점
  for (const root of deukjiRoots) {
    const chungTarget = JIJI_CHUNG[root.zhi]
    if (chungTarget && allZhis.includes(chungTarget)) {
      const penalty = -Math.round(root.strength * 0.5)
      adjustment += penalty
      details.push(`${root.position}(${root.zhi}) 통근처에 ${chungTarget}충 발생 → ${penalty}점`)
    }
  }

  // 2. 생조 합국(三合) 가산
  for (const samhap of JIJI_SAMHAP) {
    const matches = samhap.zhis.filter(z => allZhis.includes(z))
    if (matches.length >= 3) {
      // 삼합이 일간 오행 또는 인성 오행과 같으면 가산
      const motherElement = SAENG_BY[dayElement]
      if (samhap.element === dayElement) {
        adjustment += 15
        details.push(`${samhap.label} 삼합 성립 → 일간 오행(${dayElement})과 동일하여 +15점`)
      } else if (samhap.element === motherElement) {
        adjustment += 10
        details.push(`${samhap.label} 삼합 성립 → 인성 오행(${motherElement})이므로 +10점`)
      }
    }
  }

  // 3. 생조 육합 가산 (일지 기준)
  const dayZhi = pillars.day.zhi
  for (const yukhap of JIJI_YUKHAP) {
    const [z1, z2] = yukhap.zhis
    if ((dayZhi === z1 && allZhis.includes(z2)) || (dayZhi === z2 && allZhis.includes(z1))) {
      const motherElement = SAENG_BY[dayElement]
      if (yukhap.element === dayElement || yukhap.element === motherElement) {
        adjustment += 5
        details.push(`일지 ${dayZhi} ${yukhap.label} → 생조 합으로 +5점`)
      }
    }
  }

  return { adjustment, details }
}

// ===================== 5단계 판정 =====================

function gradeFromScore(score: number): StrengthGrade {
  if (score >= 70) return '극강'
  if (score >= 55) return '신강'
  if (score >= 40) return '중화'
  if (score >= 25) return '신약'
  return '극약'
}

// ===================== 메인 함수 =====================

/**
 * 신강/신약 정밀 점수 계산 (3단계 + 합충 보정)
 *
 * @param sajuData - 사주 기본 데이터
 * @param sipseong - 십성 분석 결과 (기존 모듈)
 * @returns 정밀 신강/신약 판정 결과
 */
export function calculateAdvancedStrength(sajuData: SajuData, sipseong: SipseongMap): AdvancedStrengthResult {
  const { dayMaster, pillars } = sajuData

  const pillarArray: Array<{ position: string; zhi: string }> = [
    { position: '년지', zhi: pillars.year.zhi },
    { position: '월지', zhi: pillars.month.zhi },
    { position: '일지', zhi: pillars.day.zhi },
    { position: '시지', zhi: pillars.time.zhi },
  ]

  // 3단계 점수 계산
  const deukryeong = calculateDeukryeong(dayMaster, pillars.month.zhi)
  const deukji = calculateDeukji(dayMaster, pillarArray)
  const deukse = calculateDeukse(dayMaster, sajuData, sipseong)

  // 합충 보정
  const correction = calculateCorrection(dayMaster, sajuData, deukji.roots)

  // 총점
  const rawTotal = deukryeong.score + deukji.score + deukse.score
  const totalScore = Math.max(0, Math.min(100, rawTotal + correction.adjustment))
  const grade = gradeFromScore(totalScore)

  // 요약 텍스트
  const correctionText = correction.details.length > 0
    ? `\n합충 보정: ${correction.details.join(', ')} (보정 ${correction.adjustment >= 0 ? '+' : ''}${correction.adjustment}점)`
    : ''

  const summary = [
    `### 신강/신약 정밀 판정 — ${grade} (총점 ${totalScore}/100)`,
    `[1단계 득령] ${deukryeong.score}/40점 — ${deukryeong.basis}`,
    `[2단계 득지] ${deukji.score}/30점 — ${deukji.basis}`,
    `[3단계 득세] ${deukse.score}/30점 — ${deukse.basis}`,
    correctionText,
    `→ 종합: 득령${deukryeong.score} + 득지${deukji.score} + 득세${deukse.score} + 보정${correction.adjustment} = ${totalScore}점 (${grade})`,
  ].filter(Boolean).join('\n')

  return {
    totalScore,
    grade,
    deukryeong,
    deukji,
    deukse,
    correction,
    summary,
  }
}
