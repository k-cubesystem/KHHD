import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAuth } from '../_shared/auth.ts'
import { generateContent } from '../_shared/gemini-client.ts'
import { createSupabaseAdmin } from '../_shared/supabase-client.ts'
import { corsResponse, errorResponse, successResponse } from '../_shared/response.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const { action, ...body } = await req.json()
  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth
  const { supabase, userId } = auth

  // ─── 사주 분석 ──────────────────────────────────────────────
  if (action === 'analyzeSajuDetail') {
    const prompt = buildSajuPrompt(body)
    const cacheKey = `saju:${userId}:${JSON.stringify(body.birthInfo)}`
    const result = await generateContent(prompt, {
      cacheKey,
      systemInstruction: '당신은 전문 사주 분석가입니다. 한국어로 상세하게 분석해주세요.',
    })
    return successResponse({ analysis: result })
  }

  // ─── 천지인 분석 ────────────────────────────────────────────
  if (action === 'analyzeCheonjiin') {
    const prompt = buildCheonjiinPrompt(body)
    const cacheKey = `cheonjiin:${userId}:${body.name}`
    const result = await generateContent(prompt, {
      cacheKey,
      systemInstruction: '당신은 한국 전통 성명학 전문가입니다.',
    })
    return successResponse({ analysis: result })
  }

  // ─── 궁합 분석 ──────────────────────────────────────────────
  if (action === 'analyzeCompatibility') {
    const prompt = buildCompatibilityPrompt(body)
    const result = await generateContent(prompt, {
      systemInstruction: '당신은 사주 궁합 전문가입니다. 솔직하고 상세하게 분석해주세요.',
    })
    return successResponse({ analysis: result })
  }

  // ─── 운세 분석 ──────────────────────────────────────────────
  if (action === 'analyzeFortune') {
    const prompt = buildFortunePrompt(body)
    const result = await generateContent(prompt, {
      systemInstruction: '당신은 운세 분석 전문가입니다.',
    })
    return successResponse({ analysis: result })
  }

  // ─── 트렌드 분석 ────────────────────────────────────────────
  if (action === 'analyzeTrend') {
    const result = await generateContent(
      `${body.type} 관점에서 ${body.birthInfo?.name || '사용자'}의 트렌드를 분석해주세요. 생년월일: ${body.birthInfo?.birthDate}`,
      { systemInstruction: '당신은 사주 트렌드 분석 전문가입니다.' }
    )
    return successResponse({ analysis: result })
  }

  // ─── 2026 운세 ──────────────────────────────────────────────
  if (action === 'analyzeYear2026') {
    const result = await generateContent(
      `2026년 병오년 운세를 분석해주세요. 대상: ${JSON.stringify(body.birthInfo)}`,
      { systemInstruction: '당신은 2026년 병오년 전문 운세 분석가입니다.' }
    )
    return successResponse({ analysis: result })
  }

  // ─── 재물운 ─────────────────────────────────────────────────
  if (action === 'analyzeWealth') {
    const result = await generateContent(
      `재물운을 분석해주세요. 대상: ${JSON.stringify(body.birthInfo)}`,
      { systemInstruction: '당신은 재물운 전문 분석가입니다.' }
    )
    return successResponse({ analysis: result })
  }

  // ─── 사업 궁합 ────────────────────────────────────────────
  if (action === 'businessCompatibility') {
    const result = await generateContent(
      `두 사람의 사업 궁합을 분석해주세요. 의뢰인: ${JSON.stringify(body.birthInfo)}, 파트너: ${JSON.stringify(body.partnerInfo)}`,
      { systemInstruction: '당신은 사업 궁합 분석 전문가입니다. 오행, 십성, 용신을 기반으로 사업 파트너십을 분석합니다.' }
    )
    return successResponse({ analysis: result })
  }

  // ─── 크레딧 체크 ────────────────────────────────────────────
  if (action === 'checkAndDeductCredits') {
    const admin = createSupabaseAdmin()
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle()
    const balance = wallet?.balance ?? 0
    const cost = body.cost ?? 1
    if (balance < cost) return errorResponse('복채가 부족합니다.')

    await supabase.from('wallets').update({ balance: balance - cost }).eq('user_id', userId)
    await admin.from('wallet_transactions').insert({
      user_id: userId, amount: -cost, type: 'deduct', description: body.description ?? 'AI 분석',
    })
    return successResponse({ remainingBalance: balance - cost })
  }

  return errorResponse('Unknown action: ' + action)
})

// ─── Prompt Builders ────────────────────────────────────────────

function buildSajuPrompt(body: Record<string, unknown>): string {
  const info = body.birthInfo as Record<string, string> | undefined
  return `다음 정보로 사주팔자를 상세 분석해주세요:
이름: ${info?.name ?? '미상'}
생년월일: ${info?.birthDate ?? '미상'}
성별: ${info?.gender ?? '미상'}
태어난 시간: ${info?.birthTime ?? '미상'}

JSON 형식으로 응답해주세요.`
}

function buildCheonjiinPrompt(body: Record<string, unknown>): string {
  return `다음 이름의 성명학(천지인) 분석을 해주세요:
이름: ${body.name}
생년월일: ${(body.birthInfo as Record<string, string>)?.birthDate ?? '미상'}

JSON 형식으로 응답해주세요.`
}

function buildCompatibilityPrompt(body: Record<string, unknown>): string {
  return `다음 두 사람의 궁합을 분석해주세요:
첫번째: ${JSON.stringify(body.person1)}
두번째: ${JSON.stringify(body.person2)}

JSON 형식으로 응답해주세요.`
}

function buildFortunePrompt(body: Record<string, unknown>): string {
  return `다음 정보로 운세를 분석해주세요:
대상: ${JSON.stringify(body.birthInfo)}
기간: ${body.period ?? '오늘'}

JSON 형식으로 응답해주세요.`
}
