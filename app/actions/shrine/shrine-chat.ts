'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { recallMemories } from '@/lib/ai/memory'
import { guardAiInput } from '@/lib/ai/input-guard'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { getSceneData } from '@/app/actions/shrine/scene'
import { computeEnergy, indexCatalog, ELEMENTS, EL_KO } from '@/lib/domain/shrine/energy'

const SHRINE_HISTORY_WINDOW = 8 // Gemini에 전달할 최근 메시지 수 (슬라이딩 윈도우)

function buildShrineSystemPrompt(
  shrineName: string,
  itemNames: string[],
  energyLine: string,
  yongsinKo: string,
  memoryBlock: string
): string {
  const itemList = itemNames.length > 0 ? itemNames.join(', ') : '아직 아무것도 없음'
  const memorySection = memoryBlock ? `\n\n${memoryBlock}` : ''
  return `당신은 ${shrineName}을 지키는 AI 신당 무당(신당지기)입니다.
오늘 날짜: ${new Date().toLocaleDateString('ko-KR')}
방에 놓인 신물: ${itemList}
신당의 기운 균형: ${energyLine}
가장 부족한 기운(용신): ${yongsinKo} — 이 기운을 채우는 신물/행동을 자연스럽게 권하십시오.

이 신당을 찾아온 사람과 대화하며 소원 성취와 복운에 대해 안내하십시오.
방의 신물과 기운 상태를 근거로 구체적으로 조언하십시오 (예: "${yongsinKo} 기운이 얕으니 풍경을 하나 더 걸어보시게").
300자 이내로 간결하게, 무당 특유의 따뜻하고 신비로운 말투("~합니다", "~하시게", "~이옵니다")로 답하십시오.
소원 카테고리(건강/합격/인연/재물/가족/사업)와 연결된 조언을 건네십시오.${memorySection}`
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

    // Rate limit(S3): 무료 대화라 버스트 방어 필요 — 분당 20회/유저.
    const rl = await rateLimit(`ai-shrine:${user.id}`, { interval: 60_000, uniqueTokenPerInterval: 20 })
    if (!rl.success) return { success: false, error: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' }

    // 입력 가드(S2): 길이 상한 + 인젝션 의심 플래그
    const guarded = guardAiInput(message)
    if (!guarded.text) return { success: false, error: '메시지를 입력해주세요.' }
    const safeMessage = guarded.text
    if (guarded.suspicious) logger.warn('[ShrineChat] 프롬프트 인젝션 의심 입력', { length: safeMessage.length })

    const scene = await getSceneData()
    if (!scene) return { success: false, error: 'SHRINE_NOT_FOUND' }

    const catalogById = indexCatalog(scene.catalog)
    const { energy, yongsin } = computeEnergy(scene.profile.base, scene.placements, catalogById)
    const itemNames = scene.placements
      .map((p) => catalogById.get(p.catalogItemId)?.name)
      .filter((n): n is string => !!n)
    const energyLine = ELEMENTS.map((el) => `${EL_KO[el]}${energy[el]}`).join(' ')
    const yongsinKo = EL_KO[scene.profile.yongsin ?? yongsin]

    // 신당 소유자의 장기 기억 top-3 주입 (본인 대상 기억)
    const memoryBlock = await recallMemories(user.id, null, 3)
    const systemPrompt = buildShrineSystemPrompt(scene.shrineName, itemNames, energyLine, yongsinKo, memoryBlock)

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
      parts: [{ text: guardAiInput(m.content).text }],
    }))

    const chat = model.startChat({ history: geminiHistory })
    const result = await chat.sendMessage(safeMessage)
    const response = result.response.text()

    logger.log('[ShrineChat] message sent', { shrineId: scene.shrineId })
    return { success: true, response }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error('[ShrineChat] error', msg)
    return { success: false, error: msg }
  }
}
