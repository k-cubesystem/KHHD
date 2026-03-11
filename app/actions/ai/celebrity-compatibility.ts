'use server'

import { buildSajuContext } from '@/lib/saju-engine/context-builder'
import { calculateCompatibility } from '@/lib/saju-engine/compatibility-engine'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { MODEL_PRO } from '@/lib/config/ai-models'
import { logger } from '@/lib/utils/logger'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '')

interface FamilyMember {
  id: string
  name: string
  birth_date: string
  birth_time: string | null
  gender: string
  relationship: string
  calendar_type: string
}

/**
 * 사업 궁합 대상 목록 (본인 제외 가족/지인)
 */
export async function getBusinessPartnerCandidates(): Promise<{
  success: boolean
  me?: FamilyMember
  partners?: FamilyMember[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { success: false, error: '로그인이 필요합니다.' }

    const { data: members } = await supabase
      .from('family_members')
      .select('id, name, birth_date, birth_time, gender, relationship, calendar_type')
      .eq('user_id', user.id)
      .order('created_at')

    if (!members || members.length === 0) {
      return { success: false, error: '인연 관리에서 먼저 본인과 파트너 정보를 등록해주세요.' }
    }

    const me = members.find((m) => m.relationship === '본인') ?? null
    if (!me) {
      return { success: false, error: '인연 관리에서 본인 정보를 먼저 등록해주세요.' }
    }

    const partners = members.filter((m) => m.relationship !== '본인')

    return { success: true, me, partners }
  } catch (e) {
    logger.error('[BusinessPartnerCandidates]', e)
    return { success: false, error: '데이터 조회 중 오류가 발생했습니다.' }
  }
}

/**
 * 사업 궁합 분석 (만세력 + 오행 + AI 심층 해석)
 */
export async function calculateBusinessCompatibilityAction(partnerId: string): Promise<{
  success: boolean
  score?: number
  categories?: ReturnType<typeof calculateCompatibility>
  aiAnalysis?: string
  partnerName?: string
  myName?: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { success: false, error: '로그인이 필요합니다.' }

    // 본인 정보
    const { data: me } = await supabase
      .from('family_members')
      .select('name, birth_date, birth_time, gender, calendar_type')
      .eq('user_id', user.id)
      .eq('relationship', '본인')
      .single()

    if (!me?.birth_date) {
      return { success: false, error: '인연 관리에서 본인 정보를 먼저 등록해주세요.' }
    }

    // 파트너 정보
    const { data: partner } = await supabase
      .from('family_members')
      .select('name, birth_date, birth_time, gender, calendar_type')
      .eq('id', partnerId)
      .eq('user_id', user.id)
      .single()

    if (!partner?.birth_date) {
      return { success: false, error: '파트너 정보를 찾을 수 없습니다.' }
    }

    const myCtx = buildSajuContext({
      name: me.name ?? '나',
      birthDate: me.birth_date,
      birthTime: me.birth_time ?? '00:00',
      gender: (me.gender as 'male' | 'female') ?? 'male',
      isSolar: me.calendar_type !== 'lunar',
    })

    const partnerCtx = buildSajuContext({
      name: partner.name ?? '파트너',
      birthDate: partner.birth_date,
      birthTime: partner.birth_time ?? '00:00',
      gender: (partner.gender as 'male' | 'female') ?? 'male',
      isSolar: partner.calendar_type !== 'lunar',
    })

    // 사업 궁합 엔진 계산
    const result = calculateCompatibility(myCtx, partnerCtx, 'business')

    // AI 심층 분석
    let aiAnalysis = ''
    try {
      const model = genAI.getGenerativeModel({ model: MODEL_PRO })

      const prompt = `당신은 30년 경력의 사주명리학 전문가이자 비즈니스 컨설턴트입니다.
두 사람의 사주를 분석하여 사업 파트너로서의 궁합을 심층 분석해주세요.

## 분석 대상
- **${me.name ?? '의뢰인'}**: 일간 ${myCtx.sajuData.dayMaster}(${myCtx.sajuData.dayMasterElement}), 사주 ${myCtx.sajuData.ganjiList.join(' ')}
- **${partner.name ?? '파트너'}**: 일간 ${partnerCtx.sajuData.dayMaster}(${partnerCtx.sajuData.dayMasterElement}), 사주 ${partnerCtx.sajuData.ganjiList.join(' ')}

## 엔진 분석 결과
- 종합 점수: ${result.totalScore}점
- 카테고리별: ${result.categories.map((c) => `${c.label} ${c.score}점`).join(', ')}

## 반드시 포함할 내용 (각 항목 3-5줄)

### 1. 사업 궁합 총평
두 사람의 오행 균형과 상호 보완 관계를 중심으로 사업 파트너로서의 전체적 평가.

### 2. 강점 — 이 조합이 빛나는 순간
두 사람의 오행/십성이 시너지를 내는 구체적 상황. 어떤 업종/분야에서 특히 좋은지.

### 3. 위험 요소 — 반드시 주의할 점
충(冲), 형(刑), 원진, 오행 과다/결핍으로 인한 갈등 요인. 돈 관련 이슈, 결정권 다툼 등 구체적으로.

### 4. 역할 분배 추천
각자의 일간과 십성 특성에 따른 최적 역할. (예: 대외영업 vs 내부관리, 기획 vs 실행, 재무 vs 마케팅)

### 5. 사업 시작 적기
두 사람의 대운/세운 흐름을 고려한 사업 시작 추천 시기. 피해야 할 시기.

### 6. 추천 업종
오행 조합에 맞는 유리한 업종 3가지와 이유. 피해야 할 업종 1가지.

## 형식
- 마크다운 형식으로 작성
- 추상적 조언 금지. 오행/간지를 근거로 구체적으로 설명
- 한국어로 작성`

      const aiResult = await model.generateContent(prompt)
      aiAnalysis = aiResult.response.text()
    } catch (aiError) {
      logger.error('[BusinessCompatibility AI]', aiError)
      aiAnalysis = ''
    }

    return {
      success: true,
      score: result.totalScore,
      categories: result,
      aiAnalysis,
      partnerName: partner.name ?? '파트너',
      myName: me.name ?? '나',
    }
  } catch (e) {
    logger.error('[BusinessCompatibility]', e)
    return { success: false, error: '사업 궁합 계산 중 오류가 발생했습니다.' }
  }
}
