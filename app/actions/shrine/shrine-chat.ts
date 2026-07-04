'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { recallMemories } from '@/lib/ai/memory'
import { logger } from '@/lib/utils/logger'
import { getMyShrine } from '@/app/actions/shrine/shrine'

const SHRINE_HISTORY_WINDOW = 8 // Gemini에 전달할 최근 메시지 수 (슬라이딩 윈도우)

function buildShrineSystemPrompt(shrineName: string, itemNames: string[], memoryBlock: string): string {
  const itemList = itemNames.length > 0 ? itemNames.join(', ') : '아직 아무것도 없음'
  const memorySection = memoryBlock ? `\n\n${memoryBlock}` : ''
  return `당신은 ${shrineName}을 지키는 AI 신당 무당입니다.
오늘 날짜: ${new Date().toLocaleDateString('ko-KR')}
신당 봉헌물: ${itemList}

이 신당을 찾아온 사람과 대화하며 소원 성취와 복운에 대해 안내하십시오.
봉헌물의 의미를 신당 기운과 연결해 설명하고, 300자 이내로 간결하게 답하십시오.
어투는 무당 특유의 따뜻하고 신비로운 말투("~합니다", "~이옵니다")를 사용하십시오.
소원 카테고리(건강/합격/인연/재물/가족/사업)와 연결된 조언을 자연스럽게 건네십시오.${memorySection}`
}

export interface ShrineChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export async function sendShrineChatMessage(
  message: string,
  history: ShrineChatMessage[]
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'UNAUTHORIZED' }

    const shrine = await getMyShrine()
    if (!shrine) return { success: false, error: 'SHRINE_NOT_FOUND' }

    const itemNames = shrine.shrine_items.map((i) => i.shrine_item_catalog.name)
    // 신당 소유자의 장기 기억 top-3 주입 (본인 대상 기억)
    const memoryBlock = await recallMemories(user.id, null, 3)
    const systemPrompt = buildShrineSystemPrompt(shrine.name, itemNames, memoryBlock)

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) return { success: false, error: 'AI_NOT_CONFIGURED' }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL_FLASH,
      systemInstruction: systemPrompt,
    })

    // 슬라이딩 윈도우: 최근 N개 메시지만 전달
    const geminiHistory = history.slice(-SHRINE_HISTORY_WINDOW).map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({ history: geminiHistory })
    const result = await chat.sendMessage(message)
    const response = result.response.text()

    logger.log('[ShrineChat] message sent', { shrineId: shrine.id })
    return { success: true, response }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error('[ShrineChat] error', msg)
    return { success: false, error: msg }
  }
}
