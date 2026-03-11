'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { nanoid } from 'nanoid'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { logger } from '@/lib/utils/logger'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

interface InviteData {
  inviterId: string
  inviterName: string
  inviterBirthDate: string
  inviterGender: string
}

interface CompatibilityResult {
  success: boolean
  overallScore?: number
  loveScore?: number
  workScore?: number
  friendScore?: number
  summary?: string
  strengths?: string[]
  challenges?: string[]
  advice?: string
  error?: string
}

// 초대 코드 생성
export async function createInviteCode(userId: string): Promise<{ success: boolean; code?: string; error?: string }> {
  const supabase = await createClient()

  // Get user's profile (본인 정보 from family_members)
  const { data: members, error: membersError } = await supabase
    .from('family_members')
    .select('*')
    .eq('user_id', userId)
    .eq('relationship', '본인')
    .single()

  if (membersError || !members) {
    return {
      success: false,
      error: '본인 정보가 등록되지 않았습니다. 먼저 가족 관리에서 본인 정보를 등록해주세요.',
    }
  }

  // Generate unique code
  const code = nanoid(10)

  // Store invite data (using profiles table's metadata or a separate invites table)
  // For simplicity, we'll encode the data in the URL itself with encryption later
  // For now, store in a simple format

  const { error: insertError } = await supabase.from('invites').insert({
    code,
    inviter_id: userId,
    inviter_name: members.name,
    inviter_birth_date: members.birth_date,
    inviter_gender: members.gender,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  })

  // If invites table doesn't exist, just return the code with encoded data
  if (insertError) {
    logger.log('Invites table may not exist, using encoded method:', insertError.message)
    // Fallback: encode data in URL-safe base64
    const inviteData = {
      id: userId,
      name: members.name,
      birth: members.birth_date,
      gender: members.gender,
    }
    const encodedData = Buffer.from(JSON.stringify(inviteData)).toString('base64url')
    return { success: true, code: encodedData }
  }

  return { success: true, code }
}

// 초대 코드로 초대자 정보 가져오기
export async function getInviterByCode(
  code: string
): Promise<{ success: boolean; inviter?: InviteData; error?: string }> {
  const supabase = await createClient()

  // First try to get from invites table
  const { data: invite, error } = await supabase.from('invites').select('*').eq('code', code).single()

  if (!error && invite) {
    return {
      success: true,
      inviter: {
        inviterId: invite.inviter_id,
        inviterName: invite.inviter_name,
        inviterBirthDate: invite.inviter_birth_date,
        inviterGender: invite.inviter_gender,
      },
    }
  }

  // Fallback: try to decode from base64url
  try {
    const decoded = JSON.parse(Buffer.from(code, 'base64url').toString())
    return {
      success: true,
      inviter: {
        inviterId: decoded.id,
        inviterName: decoded.name,
        inviterBirthDate: decoded.birth,
        inviterGender: decoded.gender,
      },
    }
  } catch {
    return { success: false, error: '유효하지 않은 초대 코드입니다.' }
  }
}

// 궁합 분석
export async function analyzeCompatibility(
  person1: { name: string; birthDate: string; gender: string },
  person2: { name: string; birthDate: string; gender: string }
): Promise<CompatibilityResult> {
  const model = genAI.getGenerativeModel({ model: MODEL_FLASH })

  const prompt = `당신은 전통 명리학 기반의 궁합 전문가입니다.

두 사람의 생년월일을 바탕으로 궁합을 분석해주세요.

[첫 번째 사람]
- 이름: ${person1.name}
- 생년월일: ${person1.birthDate}
- 성별: ${person1.gender === 'male' ? '남성' : '여성'}

[두 번째 사람]
- 이름: ${person2.name}
- 생년월일: ${person2.birthDate}
- 성별: ${person2.gender === 'male' ? '남성' : '여성'}

다음 JSON 형식으로 응답해주세요:
{
  "overallScore": 0-100 사이 숫자,
  "loveScore": 0-100 (연애/결혼 궁합),
  "workScore": 0-100 (직장/사업 궁합),
  "friendScore": 0-100 (친구/동료 궁합),
  "summary": "한두 문장 요약",
  "strengths": ["강점1", "강점2", "강점3"],
  "challenges": ["도전과제1", "도전과제2"],
  "advice": "두 사람을 위한 조언 (2-3문장)"
}

점수는 객관적으로, 요약과 조언은 긍정적이면서도 현실적으로 작성해주세요.`

  try {
    const result = await withGeminiRateLimit(() => model.generateContent(prompt), {
      model: MODEL_FLASH,
      actionType: 'invite_compatibility',
    })
    const text = result.response.text()

    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0])
      return {
        success: true,
        ...data,
      }
    }

    return { success: false, error: '궁합 데이터 파싱 실패' }
  } catch (error: unknown) {
    logger.error('Compatibility Analysis Error:', error)
    const errorMessage = error instanceof Error ? error.message : '궁합 분석 중 오류가 발생했습니다.'
    return {
      success: false,
      error: errorMessage,
    }
  }
}

// 초대 링크 생성 (Full URL)
export async function generateInviteLink(userId: string): Promise<{ success: boolean; link?: string; error?: string }> {
  const result = await createInviteCode(userId)

  if (!result.success || !result.code) {
    return { success: false, error: result.error }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://haehwadang.com'
  const link = `${baseUrl}/invite/${result.code}`

  return { success: true, link }
}
