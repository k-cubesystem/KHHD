/**
 * 해화지기 사주 엔진 - 컨텍스트 빌더
 * 사주 계산 결과 → AI 마스터 프롬프트 컨텍스트로 변환
 * "GNN-RAG의 RAG 계층: 수학적 명리 로직 → 시적 언어 생성"
 */

import { getSajuData, calculateDaeun, type SajuData } from '@/lib/domain/saju/saju'
import { analyzeGekguk, analyzeYongsin, type YongsinAnalysis } from '@/lib/domain/saju/saju-analysis'
import { analyzeRelations } from './relations'
import { analyzeSipseong, GAN_MULSANG } from './sipseong'
import { analyzeSibjiunseong } from './sibjiunseong'
import { calculateExtendedSinsal } from './sinsal-extended'

export type AnalysisType =
  | 'SAJU_FULL' // 종합 사주 분석
  | 'DAILY_FORTUNE' // 오늘의 운세
  | 'WEEKLY_FORTUNE' // 주간 운세
  | 'MONTHLY_FORTUNE' // 월간 운세
  | 'YEARLY_FORTUNE' // 연간 운세 (신년운세)
  | 'COMPATIBILITY' // 궁합
  | 'TREND_LOVE' // 애정운
  | 'TREND_CAREER' // 직장/사업운
  | 'TREND_EXAM' // 학업운
  | 'TREND_WEALTH' // 재물운
  | 'WEALTH_DEEP' // 재물 심층 분석
  | 'CHEONJIIN' // 천지인 통합

export interface PersonInfo {
  name: string
  birthDate: string // 'YYYY-MM-DD'
  birthTime: string // 'HH:mm' or '00:00' for unknown
  gender: 'male' | 'female'
  isSolar?: boolean
  relationship?: string
  job?: string
  focusAreas?: string
  maritalStatus?: string
  lifePhilosophy?: string
  activityStatus?: string
}

export interface SajuContext {
  personInfo: PersonInfo
  sajuData: SajuData
  analysis: {
    relations: ReturnType<typeof analyzeRelations>
    sipseong: ReturnType<typeof analyzeSipseong>
    sibjiunseong: ReturnType<typeof analyzeSibjiunseong>
    sinsal: ReturnType<typeof calculateExtendedSinsal>
    gekguk: ReturnType<typeof analyzeGekguk>
    yongsin: YongsinAnalysis | null
    daeun: ReturnType<typeof calculateDaeun>
  }
  mulsang: {
    dayMasterSymbol: string
    dayMasterPoetic: string
    dayMasterPsychology: string
  }
  promptContext: string // AI에 주입할 최종 텍스트
}

/**
 * 메인 함수: 생년월일시 → 완전한 사주 컨텍스트 생성
 */
export function buildSajuContext(person: PersonInfo): SajuContext {
  const { birthDate, birthTime, gender, isSolar = true } = person
  const genderCode = gender === 'male' ? 'M' : 'F'

  const sajuData = getSajuData(birthDate, birthTime, isSolar)
  const { pillars, dayMaster } = sajuData

  // 관계 역학 분석
  const pillarArray = [
    { gan: pillars.year.gan, zhi: pillars.year.zhi },
    { gan: pillars.month.gan, zhi: pillars.month.zhi },
    { gan: pillars.day.gan, zhi: pillars.day.zhi },
    { gan: pillars.time.gan, zhi: pillars.time.zhi },
  ]
  const relations = analyzeRelations(pillarArray, pillars.day.ganji)

  // 십성 분석
  const sipseongPillars = [
    { position: '년', gan: pillars.year.gan, zhi: pillars.year.zhi },
    { position: '월', gan: pillars.month.gan, zhi: pillars.month.zhi },
    { position: '일', gan: '', zhi: pillars.day.zhi }, // 일간은 본인이므로 제외
    { position: '시', gan: pillars.time.gan, zhi: pillars.time.zhi },
  ]
  const sipseong = analyzeSipseong(dayMaster, sipseongPillars)

  // 십이운성 분석
  const sibjiunseongPillars = [
    { name: '년지', zhi: pillars.year.zhi },
    { name: '월지', zhi: pillars.month.zhi },
    { name: '일지', zhi: pillars.day.zhi },
    { name: '시지', zhi: pillars.time.zhi },
  ]
  const sibjiunseong = analyzeSibjiunseong(dayMaster, sibjiunseongPillars)

  // 신살 분석
  const sinsal = calculateExtendedSinsal(sajuData)

  // 격국/용신
  const gekguk = analyzeGekguk(sajuData)
  let yongsin: YongsinAnalysis | null = null
  try {
    yongsin = analyzeYongsin(sajuData)
  } catch {
    yongsin = null
  }

  // 대운
  const daeun = calculateDaeun(birthDate, birthTime, genderCode, isSolar)

  // 일간 물상론 데이터
  const mulsangInfo = GAN_MULSANG[dayMaster]
  const mulsang = {
    dayMasterSymbol: mulsangInfo?.symbol || dayMaster,
    dayMasterPoetic: mulsangInfo?.poeticDesc || '',
    dayMasterPsychology: mulsangInfo?.psychology || '',
  }

  // 프롬프트 컨텍스트 텍스트 생성
  const promptContext = buildPromptContextText({
    person,
    sajuData,
    relations,
    sipseong,
    sibjiunseong,
    sinsal,
    gekguk,
    yongsin,
    daeun,
    mulsang,
  })

  return {
    personInfo: person,
    sajuData,
    analysis: { relations, sipseong, sibjiunseong, sinsal, gekguk, yongsin, daeun },
    mulsang,
    promptContext,
  }
}

// ===================== 프롬프트 텍스트 생성 =====================

function buildPromptContextText(data: {
  person: PersonInfo
  sajuData: SajuData
  relations: ReturnType<typeof analyzeRelations>
  sipseong: ReturnType<typeof analyzeSipseong>
  sibjiunseong: ReturnType<typeof analyzeSibjiunseong>
  sinsal: ReturnType<typeof calculateExtendedSinsal>
  gekguk: ReturnType<typeof analyzeGekguk>
  yongsin: YongsinAnalysis | null
  daeun: ReturnType<typeof calculateDaeun>
  mulsang: { dayMasterSymbol: string; dayMasterPoetic: string; dayMasterPsychology: string }
}): string {
  const { person, sajuData, relations, sipseong, sibjiunseong, sinsal, gekguk, yongsin, daeun, mulsang } = data
  const { pillars, elementsDistribution, dayMaster } = sajuData

  const elementStr = Object.entries(elementsDistribution)
    .map(([el, cnt]) => `${el}${cnt}`)
    .join(' ')

  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1

  const currentDaeun = daeun.find((d) => {
    const birthYear = parseInt(person.birthDate.split('-')[0])
    const age = currentYear - birthYear
    return d.age <= age && d.age + 10 > age
  })

  const sinsalStr =
    sinsal.length > 0
      ? sinsal.map((s) => `${s.name}(${s.category}): ${s.modernSkillTree}`).join('\n  ')
      : '특별 신살 없음'

  const sipseongDistStr = Object.entries(sipseong.distribution)
    .sort((a, b) => b[1] - a[1])
    .map(([ss, cnt]) => `${ss}×${cnt}`)
    .join(', ')

  const daeunStr = daeun
    .slice(0, 6)
    .map((d) => `${d.age}세:${d.ganji}(${d.element})`)
    .join(' → ')

  return `
## [내담자 명식 데이터 - 해화지기 분석 기반]

### 기본 정보
- 이름: ${person.name} | 성별: ${person.gender === 'male' ? '남' : '여'}
- 생년월일시: ${person.birthDate} ${person.birthTime} (${person.isSolar !== false ? '양력' : '음력'})
- 직업: ${person.job || '미입력'} | 관심사: ${person.focusAreas || '미입력'}
- 결혼상태: ${person.maritalStatus || '미입력'} | 인생철학: ${person.lifePhilosophy || '미입력'}

### 사주 원국 (四柱八字)
년주: ${pillars.year.ganji} | 월주: ${pillars.month.ganji} | 일주: ${pillars.day.ganji} | 시주: ${pillars.time.ganji}
일간(自我): ${dayMaster} — ${mulsang.dayMasterSymbol}

### 오행 분포
${elementStr}
${sipseong.strengthAssessment} 사주 (신강/신약 스코어: ${sipseong.bodyStrengthScore}%)

### 일간 물상(物象) — NLG 핵심 데이터
- 상징: ${mulsang.dayMasterSymbol}
- 시적 묘사: ${mulsang.dayMasterPoetic}
- 심리 발현: ${mulsang.dayMasterPsychology}

### 십성(十星) 분포 — 사회심리학적 파라미터
${sipseongDistStr}
${sipseong.summary}

### 관계 역학 (합충형파해)
${relations.summary}
지배 관계: ${relations.dominantRelation}

### 십이운성(十二運星) — 에너지 파동
${sibjiunseong.waveDescription}
전체 에너지: ${sibjiunseong.overallEnergy} (평균 ${sibjiunseong.averageLevel}/12)

### 격국(格局) & 용신(用神)
격국: ${gekguk.hanja} (${gekguk.strengthLabel}) — ${gekguk.description}
용신: ${yongsin ? `${yongsin.yongsinKorean}(${yongsin.yongsin}) — ${yongsin.yongsinReason}` : '분석 필요'}
${yongsin ? `희신: ${yongsin.huisinKorean} | 기신: ${yongsin.gisinKorean}` : ''}
${yongsin ? `개운법: ${yongsin.recommendation}` : ''}

### 신살(神殺) — 현대 스킬트리
${sinsalStr}

### 대운(大運) 흐름
${daeunStr}
현재 대운: ${currentDaeun ? `${currentDaeun.ganji}(${currentDaeun.element}) — ${currentDaeun.description || ''}` : '계산 필요'}

### 현재 시점
분석일: ${currentYear}년 ${currentMonth}월
`.trim()
}

/**
 * 분석 유형별 추가 지시사항 생성
 */
export function getAnalysisTypeGuide(type: AnalysisType): string {
  const guides: Record<AnalysisType, string> = {
    SAJU_FULL: `
[종합 사주 분석 지침]
위 명식 데이터를 기반으로 다음을 산문으로 풀어내십시오:
1. 일간의 물상으로 내담자의 본질적 기질 서술
2. 십성 분포가 드러내는 사회적 역할과 대인관계 패턴
3. 격국이 보여주는 사회적 그릇과 성취 방향
4. 용신 오행을 활용한 구체적 개운법 (색상, 방향, 직업)
5. 신살이 부여한 특수 재능과 현대적 직업 매핑
6. 현재 대운 흐름과 앞으로 10년의 에너지 방향
    `,
    DAILY_FORTUNE: `
[오늘의 운세 지침]
오늘 날짜의 일진(日辰)과 내담자 일간의 상호작용을 중심으로,
오늘 하루 집중해야 할 분야, 주의사항, 행운의 방향을 간결하게 서술하십시오.
    `,
    WEEKLY_FORTUNE: `
[주간 운세 지침]
이번 주 7일간의 기운 흐름을 내담자 사주와 대비하여,
요일별 주요 에너지 변화와 핵심 행동 지침을 서술하십시오.
    `,
    MONTHLY_FORTUNE: `
[월간 운세 지침]
이달의 월건(月建)이 내담자 사주에 미치는 영향을 분석하여,
이달의 주요 테마, 기회의 창, 주의 시기를 서술하십시오.
    `,
    YEARLY_FORTUNE: `
[신년 운세 지침]
올해 세운(歲運)이 내담자 원국과 대운에 어떻게 작용하는지 분석하여,
올해의 총운, 월별 에너지 곡선, 핵심 기회와 도전을 서술하십시오.
    `,
    COMPATIBILITY: `
[궁합 분석 지침]
두 사람의 일간 오행 관계, 합충형파해, 십성 관계를 분석하여,
자연의 물상으로 두 사람의 관계 화학을 풀어내십시오.
궁합 점수(100점 만점)와 함께 발전 방향을 제시하십시오.
    `,
    TREND_LOVE: `
[애정운 분석 지침]
내담자 사주에서 관성(정관·편관) 또는 일지 기운을 중심으로,
현재 시점의 애정운 흐름과 인연의 특징을 서술하십시오.
    `,
    TREND_CAREER: `
[직장·사업운 분석 지침]
관성과 재성, 식상의 상호작용을 분석하여,
현재 직업 에너지와 사업·취업·승진 타이밍을 서술하십시오.
    `,
    TREND_EXAM: `
[학업운 분석 지침]
인성(정인·편인)의 강도와 현재 대운·세운을 분석하여,
학습 집중력과 시험 합격 에너지를 서술하십시오.
    `,
    TREND_WEALTH: `
[재물운 분석 지침]
재성(정재·편재)과 식상의 상호작용, 용신과의 합충을 분석하여,
현재 재물운의 흐름과 재물 축적 전략을 서술하십시오.
    `,
    WEALTH_DEEP: `
[재물 심층 분석 지침]
재성 분포, 편재vs정재 비율, 대운에서의 재물 흐름을 심층 분석하여,
단기/중기/장기 재물운과 최적 투자·사업 방향을 제시하십시오.
    `,
    CHEONJIIN: `
[천지인 통합 분석 지침]
天(사주 원국): 선천적 기질과 운명적 방향성
地(일지·월지): 현재 생활 환경과 물질적 토대
人(십성·대인관계): 사람과의 관계 패턴과 사회적 역할
세 차원을 통합하여 내담자의 현재 위치와 나아갈 방향을 서술하십시오.
    `,
  }
  return guides[type] || guides.SAJU_FULL
}
