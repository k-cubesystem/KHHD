import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAuth } from '../_shared/auth.ts'
import { generateContent } from '../_shared/gemini-client.ts'
import { corsResponse, errorResponse, successResponse } from '../_shared/response.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const { action, ...body } = await req.json()
  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth
  const { supabase, userId } = auth

  // ─── 운세 기록 ──────────────────────────────────────────────
  if (action === 'recordFortuneEntry') {
    const { error } = await supabase.from('fortune_entries').insert({
      user_id: userId,
      ...body.entry,
    })
    if (error) return errorResponse(error.message)
    return successResponse()
  }

  // ─── 월간 가족 운세 ─────────────────────────────────────────
  if (action === 'getMonthlyFamilyFortune') {
    const { data, error } = await supabase
      .from('fortune_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', body.startDate)
      .lte('created_at', body.endDate)
      .order('created_at', { ascending: false })
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  // ─── 연간 트렌드 ────────────────────────────────────────────
  if (action === 'getYearlyFortuneTrend') {
    const year = body.year ?? new Date().getFullYear()
    const { data, error } = await supabase
      .from('fortune_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', `${year}-01-01`)
      .lte('created_at', `${year}-12-31`)
      .order('created_at', { ascending: true })
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  // ─── 대시보드 컨텍스트 ──────────────────────────────────────
  if (action === 'getDashboardContext') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, birth_date, gender, birth_time')
      .eq('id', userId)
      .maybeSingle()
    const { data: members } = await supabase
      .from('family_members')
      .select('name, relation, birth_date')
      .eq('user_id', userId)
    return successResponse({ profile, familyMembers: members })
  }

  // ─── 일일 운세 생성 ─────────────────────────────────────────
  if (action === 'generateDailyFortune') {
    const result = await generateContent(
      `오늘의 운세를 생성해주세요. 대상: ${JSON.stringify(body.birthInfo)}. 날짜: ${new Date().toISOString().slice(0, 10)}`,
      { systemInstruction: '당신은 운세 전문가입니다. JSON 형식으로 응답해주세요.' }
    )
    return successResponse({ fortune: result })
  }

  return errorResponse('Unknown action: ' + action)
})
