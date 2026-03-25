/**
 * 해화지기 사주 엔진 - 컨텍스트 빌더
 * 사주 계산 결과 → AI 마스터 프롬프트 컨텍스트로 변환
 * "GNN-RAG의 RAG 계층: 수학적 명리 로직 → 시적 언어 생성"
 */

import { getSajuData, calculateDaeun, type SajuData } from '@/lib/domain/saju/saju'
import { analyzeGekguk, analyzeYongsin, type YongsinAnalysis } from '@/lib/domain/saju/saju-analysis'
import { analyzeTripleYongsin, buildTripleYongsinText, type TripleYongsinResult } from './yongsin'
import { analyzeRelations } from './relations'
import { analyzeSipseong, buildSipseongNarrative, GAN_MULSANG } from './sipseong'
import { buildMulsangLandscape } from './mulssangron'
import { analyzeSibjiunseong } from './sibjiunseong'
import { calculateExtendedSinsal } from './sinsal-extended'
import { analyzeWarnings, type WarningsResult } from './warnings'
import { evaluateAllRules } from './rule-base'

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
  | 'SHAMAN_CHAT' // 신당 채팅 상담

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
    tripleYongsin: TripleYongsinResult | null
    daeun: ReturnType<typeof calculateDaeun>
    warnings: WarningsResult
  }
  mulsang: {
    dayMasterSymbol: string
    dayMasterPoetic: string
    dayMasterPsychology: string
    dayMasterJobs: string[]
    landscape: string
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
  let tripleYongsin: TripleYongsinResult | null = null
  try {
    tripleYongsin = analyzeTripleYongsin(sajuData, sipseong)
    yongsin = tripleYongsin.legacy
  } catch {
    try {
      yongsin = analyzeYongsin(sajuData)
    } catch {
      yongsin = null
    }
  }

  // 대운
  const daeun = calculateDaeun(birthDate, birthTime, genderCode, isSolar)

  // 경고/단점 분석 (engine02.md) — 삼중 용신 결과 사용
  const warnings = analyzeWarnings(sajuData, yongsin, sipseong)

  // 일간 물상론 데이터 + 사주 풍경화
  const mulsangInfo = GAN_MULSANG[dayMaster]
  const landscape = buildMulsangLandscape(pillars)
  const mulsang = {
    dayMasterSymbol: mulsangInfo?.symbol || dayMaster,
    dayMasterPoetic: mulsangInfo?.poeticDesc || '',
    dayMasterPsychology: mulsangInfo?.psychology || '',
    dayMasterJobs: mulsangInfo?.modernJobs || [],
    landscape,
  }

  // 사주첩경 룰베이스 평가
  const ruleBaseResult = evaluateAllRules(sajuData, sipseong, warnings, sinsal)

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
    tripleYongsin,
    daeun,
    mulsang,
    warnings,
    ruleBaseResult,
  })

  return {
    personInfo: person,
    sajuData,
    analysis: { relations, sipseong, sibjiunseong, sinsal, gekguk, yongsin, tripleYongsin, daeun, warnings },
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
  tripleYongsin: TripleYongsinResult | null
  daeun: ReturnType<typeof calculateDaeun>
  mulsang: {
    dayMasterSymbol: string
    dayMasterPoetic: string
    dayMasterPsychology: string
    dayMasterJobs: string[]
    landscape: string
  }
  warnings: WarningsResult
  ruleBaseResult: ReturnType<typeof evaluateAllRules>
}): string {
  const {
    person,
    sajuData,
    relations,
    sipseong,
    sibjiunseong,
    sinsal,
    gekguk,
    yongsin,
    tripleYongsin,
    daeun,
    mulsang,
    warnings,
    ruleBaseResult,
  } = data
  const { pillars, elementsDistribution, dayMaster } = sajuData

  const elementStr = Object.entries(elementsDistribution)
    .map(([el, cnt]) => `${el}${cnt}`)
    .join(' ')

  // KST 기준 정확한 현재 시점
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const currentYear = kst.getUTCFullYear()
  const currentMonth = kst.getUTCMonth() + 1
  const currentDay = kst.getUTCDate()
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][kst.getUTCDay()]

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

  // 대운 흐름: 과거/현재/미래 태그를 붙여 AI가 과거 역추산에 활용 가능하도록
  const birthYear = parseInt(person.birthDate.split('-')[0])
  const currentAge = currentYear - birthYear
  const daeunStr = daeun
    .slice(0, 8) // 8개 대운까지 표시 (과거 → 현재 → 미래)
    .map((d) => {
      const ageStart = d.age
      const ageEnd = d.age + 9
      const yearStart = birthYear + ageStart
      const yearEnd = birthYear + ageEnd
      let tag = ''
      if (ageEnd < currentAge) tag = '[과거]'
      else if (ageStart <= currentAge && ageEnd >= currentAge) tag = '[현재]'
      else tag = '[미래]'
      return `${tag} ${d.age}~${ageEnd}세(${yearStart}~${yearEnd}년):${d.ganji}(${d.element})`
    })
    .join('\n  ')

  // 과거 대운 상세: 충/합/형 발생 포인트를 AI가 역추산할 수 있도록 과거 대운 천간지지 상세 제공
  const pastDaeunDetail = daeun
    .filter((d) => d.age + 9 < currentAge)
    .map((d) => {
      const yearStart = birthYear + d.age
      const yearEnd = birthYear + d.age + 9
      return `- ${yearStart}~${yearEnd}년(${d.age}~${d.age + 9}세): ${d.ganji}(${d.element}) — ${d.description || '흐름 분석 필요'}`
    })
    .join('\n')

  // 미래 대운 상세
  const futureDaeunDetail = daeun
    .filter((d) => d.age > currentAge)
    .slice(0, 3)
    .map((d) => {
      const yearStart = birthYear + d.age
      const yearEnd = birthYear + d.age + 9
      return `- ${yearStart}~${yearEnd}년(${d.age}~${d.age + 9}세): ${d.ganji}(${d.element}) — ${d.description || '흐름 분석 필요'}`
    })
    .join('\n')

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
- 적성 직업군: ${mulsang.dayMasterJobs.join(', ')}

### 사주 풍경화 (四柱 物象 全景)
${mulsang.landscape}

### 십성(十星) 분포 — 사회심리학적 파라미터
${sipseongDistStr}
${sipseong.summary}

### 십성 상세 해석 — 현대적 역량 매핑
${buildSipseongNarrative(sipseong)}

### 관계 역학 (합충형파해)
${relations.summary}
지배 관계: ${relations.dominantRelation}

### 십이운성(十二運星) — 에너지 파동
${sibjiunseong.waveDescription}
전체 에너지: ${sibjiunseong.overallEnergy} (평균 ${sibjiunseong.averageLevel}/12)

### 격국(格局) & 용신(用神)
격국: ${gekguk.hanja} (${gekguk.strengthLabel}) — ${gekguk.description}
${tripleYongsin ? buildTripleYongsinText(tripleYongsin) : yongsin ? `용신: ${yongsin.yongsinKorean}(${yongsin.yongsin}) — ${yongsin.yongsinReason}\n희신: ${yongsin.huisinKorean} | 기신: ${yongsin.gisinKorean}` : '용신: 분석 필요'}
${yongsin ? `개운법: ${yongsin.recommendation}` : ''}

### 신살(神殺) — 현대 스킬트리
${sinsalStr}

### 대운(大運) 전체 흐름 (과거→현재→미래)
  ${daeunStr}
현재 대운: ${currentDaeun ? `${currentDaeun.ganji}(${currentDaeun.element}) — ${currentDaeun.description || ''}` : '계산 필요'}
현재 나이: 만 ${currentAge}세 (${birthYear}년생)

### 과거 대운 상세 (역추산 데이터 — AI가 과거 사건 추론에 활용)
${pastDaeunDetail || '과거 대운 데이터 없음 (어린 연령)'}

### 미래 대운 상세
${futureDaeunDetail || '미래 대운 계산 필요'}

### 현재 시점
분석일: ${currentYear}년 ${currentMonth}월 ${currentDay}일 (${dayOfWeek}요일) [KST 기준]

${warnings.warningContext}

${ruleBaseResult.ruleContext}
`.trim()
}

/**
 * 분석 유형별 추가 지시사항 생성
 */
export function getAnalysisTypeGuide(type: AnalysisType): string {
  const guides: Record<AnalysisType, string> = {
    SAJU_FULL: `
[종합 사주 분석 — 과거 맞추기→현재 짚기→미래 처방]

★ 말투: 요체(~요, ~에요, ~거예요) 필수. "~합니다/~입니다" 금지. 시적 표현 금지.
★ 비유: 유명인/일상 비유 사용. 예: "손흥민처럼 후반에 강한 타입이에요"
★ 설명: 짧지 않고 길고 구체적으로. 전문 용어에 괄호 설명.

[STEP 1] 과거에 이런 일이 있으셨을 거예요 (pastRetrograde)
- 위 '과거 대운 상세' 데이터를 참조해요
- 과거 대운이 일간을 충/형하는 시점 3개를 찾아요
- "2020년쯤에 직장을 옮기셨거나 큰 변화가 있었을 거예요" 이런 식으로
- 근거도 쉽게 설명해요: "이 시기에 편관(직장 스트레스를 주는 기운)이 강하게 들어왔거든요"

[STEP 2] 요즘 이런 상황이시죠? (currentSituation)
- "요즘 돈 때문에 고민이 많으시죠?" 이런 공감
- 현재 대운/세운이 만드는 상태를 구체적으로 설명해요
- 바로 할 수 있는 행동을 알려줘요

[STEP 3] 앞으로 이렇게 하면 좋아요
- "9월 셋째 주에 중요한 결정을 하세요" 수준의 구체적 시기
- "빨간색 소품을 책상에 놓으세요" 수준의 구체적 행동

[기본 분석]
1. 타고난 성격과 재능 — 유명인 비유로 쉽게
2. 사회적 역할과 대인관계 패턴
3. 적성 직업과 돈 버는 방식
4. 개운법 (색상, 방위, 구체적 행동)
5. 특수 재능과 현대적 직업 매핑
6. 앞으로 10년의 큰 흐름
    `,
    DAILY_FORTUNE: `
[오늘의 운세 지침]
오늘 날짜의 일진(日辰)과 내담자 일간의 상호작용을 중심으로 분석하십시오.
- 시간대별 조언을 포함하십시오: "오전에는 중요한 결정을 피하고, 오후 3시 이후에 행동하세요" 형태
- 행운의 색상·방위·숫자는 오행/용신 기반으로 이유와 함께 제시하십시오
- 오늘 피해야 할 것 1가지를 구체적으로 명시하십시오
- SNS 공유용 시적인 한 줄(shareQuote)을 작성하십시오 (반드시 ' — 해화당'으로 끝낼 것)
- 긍정 70% + 주의 30% 비율로 균형 있게 서술하십시오
    `,
    WEEKLY_FORTUNE: `
[주간 운세 지침]
이번 주 7일간의 기운 흐름을 내담자 사주와 대비하여 분석하십시오.
- 요일별 포인트를 포함하십시오: "수요일이 이번 주 최고의 날입니다", "금요일은 큰 지출을 피하세요" 형태
- overall에 요일별 기운 변화를 자연스럽게 녹여내십시오
- 행운의 색상·방위·숫자는 오행/용신 기반으로 이유와 함께 제시하십시오
- SNS 공유용 시적인 한 줄(shareQuote)을 작성하십시오 (반드시 ' — 해화당'으로 끝낼 것)
- 긍정 70% + 주의 30% 비율로 균형 있게 서술하십시오
    `,
    MONTHLY_FORTUNE: `
[월간 운세 지침]
이달의 월건(月建)이 내담자 사주에 미치는 영향을 분석하십시오.
- 주차별 포인트를 포함하십시오: "셋째 주에 재물운이 정점에 도달합니다", "넷째 주는 건강에 주의하세요" 형태
- overall에 주차별 기운 변화를 자연스럽게 녹여내십시오
- 행운의 색상·방위·숫자는 오행/용신 기반으로 이유와 함께 제시하십시오
- SNS 공유용 시적인 한 줄(shareQuote)을 작성하십시오 (반드시 ' — 해화당'으로 끝낼 것)
- 긍정 70% + 주의 30% 비율로 균형 있게 서술하십시오
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
내담자 사주에서 관성(정관·편관) 또는 일지 기운을 중심으로 분석하십시오.
- 과거: 세운 역추산으로 "작년에 ~한 경험이 있으셨을 겁니다" 형태로 과거 사건을 맞춰보십시오
- 현재: "지금 ~한 상황이시죠" 형태로 현재 월운을 분석하여 공감을 유도하십시오
- 미래: "이번 달 ~주에 ~하세요" 형태로 구체적 시기 + 행동을 처방하십시오
- pastHint에 과거 애정 관련 사건 추론을 반드시 포함하십시오 (세운/대운 근거 명시)
- 긍정 70% + 주의 30% 비율로 균형 있게 서술하십시오
    `,
    TREND_CAREER: `
[직장·사업운 분석 지침]
관성과 재성, 식상의 상호작용을 분석하십시오.
- 과거: "작년에 ~한 직장 변화가 있으셨을 겁니다" — 세운 역추산으로 과거 사건을 맞춰보십시오
- 현재: "지금 ~한 상황이시죠" — 현재 월운 분석으로 공감을 유도하십시오
- 미래: "이번 달 ~주에 면접/미팅을 잡으세요" — 구체적 시기 + 행동을 처방하십시오
- pastHint에 과거 직장 관련 사건 추론을 반드시 포함하십시오 (세운/대운 근거 명시)
- 긍정 70% + 주의 30% 비율로 균형 있게 서술하십시오
    `,
    TREND_EXAM: `
[학업운 분석 지침]
인성(정인·편인)의 강도와 현재 대운·세운을 분석하십시오.
- 과거: "작년에 ~한 학업 경험이 있으셨을 겁니다" — 세운 역추산으로 과거 사건을 맞춰보십시오
- 현재: "지금 ~한 상황이시죠" — 현재 월운 분석으로 공감을 유도하십시오
- 미래: "이번 달 ~주가 시험 합격 에너지가 가장 높습니다" — 구체적 시기를 특정하십시오
- pastHint에 과거 학업 관련 사건 추론을 반드시 포함하십시오 (세운/대운 근거 명시)
- 긍정 70% + 주의 30% 비율로 균형 있게 서술하십시오
    `,
    TREND_WEALTH: `
[재물운 분석 지침]
재성(정재·편재)과 식상의 상호작용, 용신과의 합충을 분석하십시오.
- 과거: "작년 ~에 재물 관련 큰 지출이나 수입 변화가 있으셨을 겁니다" — 세운 역추산
- 현재: "지금 ~한 상황이시죠" — 현재 월운 분석으로 공감을 유도하십시오
- 미래: "이번 달 ~주에 ~하세요" — 구체적 시기 + 행동을 처방하십시오
- pastHint에 과거 재물 관련 사건 추론을 반드시 포함하십시오 (세운/대운 근거 명시)
- 긍정 70% + 주의 30% 비율로 균형 있게 서술하십시오
    `,
    WEALTH_DEEP: `
[재물 심층 분석 지침]
재성 분포, 편재vs정재 비율, 대운에서의 재물 흐름을 심층 분석하십시오.
- 과거 역추산: currentSituation에 "작년에 ~한 지출이 있었을 것입니다" 형태로 과거를 맞춰보십시오
- 시기 구체화: shortTerm/midTerm에 "이번 달 셋째 주에 ~하세요", "9월~10월에 ~하세요" 형태를 사용하십시오
- investmentTiming: 최적 투자 월/주차와 회피 월을 사주 근거(용신·기신 합충)와 함께 명시하십시오
- 긍정 70% + 주의 30% 비율로 균형 있게 서술하십시오
    `,
    CHEONJIIN: `
[천지인 통합 분석 지침 — "과거->현재->미래" 3단계 신뢰 공식]

★ 최우선: 과거 역추산 (pastRetrograde)
- 위 '과거 대운 상세' 데이터를 참조하여, 과거 대운/세운의 충/합/형 시점에 발생했을 사건 3개를 추론하십시오
- "직업 변화/이별/건강/이사/새로운 시작" 카테고리로 구체화하십시오
- 명리학적 근거를 반드시 명시하십시오

★ 두 번째: 현재 공감 (currentSituation)
- 현재 대운 + 세운이 만드는 에너지를 2인칭으로 공감하십시오 ("지금 ~하고 계시죠")
- 즉시 실행할 수 있는 행동 조언을 시기와 함께 제시하십시오

★ 세 번째: 미래 처방 + 교차 분석
- "7월 셋째 주" 수준의 구체적 시기로 처방하십시오
- 사주·관상·풍수 데이터가 교차 확인되는 포인트를 crossAnalysis에 명시하십시오
  - 예: "사주에서 재물운이 강한데 관상에서도 코가 풍만합니다"
  - 예: "사주 용신이 동쪽인데, 집의 동쪽에 창문이 있어 길합니다"

[기본 분석]
天(사주 원국): 선천적 기질과 운명적 방향성 — 과거 역추산 포함
地(풍수·환경): 집/직장 방위 기운과 대운 환경
人(관상·손금·대인관계): 사람과의 관계 패턴, 이미지에서 읽히는 기운
세 차원을 통합하여 내담자의 과거·현재·미래를 관통하는 서사를 만드십시오.
    `,
    SHAMAN_CHAT: `
[사주 상담 채팅 지침 — 대화 원칙]

당신은 사주 전문 상담가입니다. 위의 명식 데이터를 근거로 내담자에게 실질적인 상담을 제공합니다.

## 첫 응답 전략 (핵심 — 신뢰 구축)
사용자가 "요즘 힘들어요", "운이 안 좋아요" 같은 모호한 질문을 하면:
1. 먼저 현재 세운/월운을 분석하여 "혹시 ~한 상황이신가요?" 하고 맞춰보십시오
2. 예시: "지금 세운을 보면 관성(직장·책임을 나타내는 기운)이 강하게 들어오는 시기입니다. 혹시 직장에서 새로운 책임이 생겼거나, 윗사람과의 관계에서 스트레스를 받고 계신 건 아닌가요?"
3. 사주 데이터(현재 대운, 세운, 월운, 십성 분포, 신살)를 기반으로 구체적 상황을 추론하십시오 — 이것이 "와 이거 맞네" 경험을 만듭니다
4. 대운과 세운의 충(衝)·합(合)이 일어나는 시기에 어떤 사건이 발생하기 쉬운지 역추산하여 현재 상황을 짚어내십시오

## 대화 중 시기 제시 원칙
- "~하세요"가 아닌 "이번 달 셋째 주에 ~하세요"로 시기를 특정하십시오
- "올해 하반기"가 아닌 "9월~10월 사이"로 좁히십시오
- 매 응답에 구체적 행동 1개를 반드시 포함하십시오 (예: "오늘 서쪽 방향으로 산책하세요", "이번 주 수요일에 중요한 약속을 잡으세요")
- 시기 근거를 사주 용어로 간결히 설명하십시오 (예: "정재가 용신과 합을 이루는 시기이므로")

## 대화 이어가기 전략
- 매 응답 끝에 사주 기반 후속 질문 1개를 던지십시오 ("혹시 최근 이사를 고민하고 계신 건 아닌가요?", "요즘 새로운 사람을 만나셨나요?" 등)
- 사용자가 "맞아요"라고 하면 해당 주제를 더 깊이 파고드십시오
- 사용자가 "아니요"라고 하면 같은 사주 데이터에서 다른 가능성을 제시하십시오
- 후속 질문은 반드시 현재 대운/세운/월운 데이터에서 도출하십시오

**대화 방식**
- 오늘 날짜(위 '현재 시점' 참조)를 정확히 인지하고, 날짜·요일·시기를 언급할 때 반드시 실제 날짜를 사용하십시오
- 내담자가 묻는 말에만 집중하여 짧고 명료하게 답하십시오 (200~400자)
- 물음에 없는 분석을 길게 나열하지 마십시오
- 추상적 조언("긍정적으로 생각하세요") 금지 — 구체적 시기·행동·방향을 제시하십시오
- 긍정적 측면 70%, 주의사항 30% 비율로 균형 있게 양면 분석하십시오
- 대화가 자연스럽게 이어지도록 끝에 사주 기반 후속 질문 하나를 덧붙이십시오

**어투**
- 전문 상담가 어투 사용: "~합니다", "~입니다", "~드립니다"
- 핵심 인사이트를 전달할 때는 시적 비유를 한 문장만 사용하되, 나머지는 명확하게 전달하십시오
- 내담자 이름을 가끔 불러 친밀감을 높이십시오
- 신뢰감 있되 공감하는 톤

**명식 활용법**
- 사주 용어(십성, 신살, 대운 등) 사용 시 괄호 안에 쉬운 설명을 병기하십시오
  - 예: "편인(새로운 학문·기술을 받아들이는 힘)", "식신(표현력과 재능을 발휘하는 기운)"
- 질문 주제에 맞는 십성·신살·대운을 골라 핵심 데이터만 언급하십시오
- 모든 데이터를 한꺼번에 쏟아내지 말 것 — 대화를 통해 조금씩 풀어가십시오

**금지 사항**
- JSON 출력 금지
- 같은 말 반복 금지
- 분석 보고서 형태 금지 (번호 매기기, 헤더 나열 금지)
- 첫 인사말을 매번 반복하지 말 것
    `,
  }
  return guides[type] || guides.SAJU_FULL
}
