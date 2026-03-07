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

  // ─── 채팅 세션 관리 ─────────────────────────────────────────
  if (action === 'getOrCreateSession') {
    const { data: existing } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) return successResponse({ session: existing })

    const { data: newSession, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, is_active: true })
      .select()
      .single()
    if (error) return errorResponse(error.message)
    return successResponse({ session: newSession })
  }

  if (action === 'loadMessages') {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', body.sessionId)
      .order('created_at', { ascending: true })
    if (error) return errorResponse(error.message)
    return successResponse({ messages: data })
  }

  if (action === 'endSession') {
    await supabase
      .from('chat_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', body.sessionId)
      .eq('user_id', userId)
    return successResponse()
  }

  // ─── 메시지 전송 ────────────────────────────────────────────
  if (action === 'sendMessage') {
    const { sessionId, message } = body

    // Save user message
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
    })

    // Load conversation history
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20)

    const contextPrompt = (history ?? [])
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? '사용자' : 'AI 무당'}: ${m.content}`)
      .join('\n')

    const aiResponse = await generateContent(
      `${contextPrompt}\n사용자: ${message}\nAI 무당:`,
      { systemInstruction: '당신은 한국 전통 무당(AI 샤먼)입니다. 사주, 운세, 영적 상담을 해주세요. 따뜻하고 신비로운 톤으로 대화하세요.' }
    )

    // Save AI response
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: aiResponse,
    })

    return successResponse({ response: aiResponse })
  }

  // ─── 채팅 스타터 ────────────────────────────────────────────
  if (action === 'getChatStarters') {
    return successResponse({
      starters: [
        '오늘의 운세가 궁금해요',
        '직장운이 어떤가요?',
        '연애운을 봐주세요',
        '이사할 때 좋은 방향은?',
      ],
    })
  }

  // ─── 사용량 체크 ────────────────────────────────────────────
  if (action === 'getUsageStatus') {
    const admin = createSupabaseAdmin()
    const today = new Date().toISOString().slice(0, 10)
    const { count } = await admin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', body.sessionId)
      .gte('created_at', today)
    return successResponse({ todayCount: count ?? 0 })
  }

  return errorResponse('Unknown action: ' + action)
})
