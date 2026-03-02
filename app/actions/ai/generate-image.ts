'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

export type FortuneImageType = 'talisman' | 'card' | 'illustration'

export interface FortuneImageContext {
  name?: string
  element?: string // 오행 (木/火/土/金/水)
  dayGan?: string // 일간
  fortuneScore?: number
  mainFortune?: string // 재물운/사랑운/건강운/직업운
  year?: number
  month?: number
  keywords?: string[] // 추가 키워드
}

export interface GenerateFortuneImageResult {
  success: boolean
  imageUrl?: string // Supabase Storage public URL
  base64?: string // fallback
  prompt?: string
  error?: string
}

const TYPE_CONFIGS: Record<FortuneImageType, { label: string; style: string; aspect: string }> = {
  talisman: {
    label: '부적',
    style:
      'Traditional Korean talisman (부적), red ink calligraphy on yellow paper, ancient mystical symbols, geometric patterns, divine protection sigils, Korean folk art style, vertical orientation, aged paper texture',
    aspect: '2:3',
  },
  card: {
    label: '운세카드',
    style:
      'Elegant Korean fortune card, gold foil border, soft pastel watercolor background, mystical celestial motifs, lotus flowers, cranes, clouds, East Asian aesthetic, tarot card proportion, luxurious finish',
    aspect: '2:3',
  },
  illustration: {
    label: '사주 일러스트',
    style:
      'Korean saju four pillars illustration, yin-yang symbol, eight trigrams (팔괘), five elements (오행) symbols, celestial calendar art, flowing ink brush strokes, gold and deep blue color palette, traditional Korean art fusion with modern minimalism',
    aspect: '1:1',
  },
}

const ELEMENT_THEMES: Record<string, string> = {
  木: 'spring green forest energy, bamboo, growing vines',
  火: 'warm crimson red flame energy, phoenix, sunrise',
  土: 'earthy gold yellow stability, mountain, soil',
  金: 'metallic silver white precision, autumn harvest',
  水: 'deep navy blue flow energy, water waves, moonlight',
}

const FORTUNE_SYMBOLS: Record<string, string> = {
  재물운: 'gold coins, money frogs, abundance symbols',
  사랑운: 'double happiness symbol (囍), mandarin ducks, peach blossoms',
  건강운: 'pine tree, crane, longevity symbols (壽)',
  직업운: "scholar's brush, official seal, rising sun",
}

function buildImagePrompt(type: FortuneImageType, context: FortuneImageContext): string {
  const config = TYPE_CONFIGS[type]
  const elementTheme = context.element ? (ELEMENT_THEMES[context.element] ?? '') : ''
  const fortuneSymbols = context.mainFortune ? (FORTUNE_SYMBOLS[context.mainFortune] ?? '') : ''

  const basePrompt = `${config.style}. ${elementTheme}. ${fortuneSymbols}.`

  if (type === 'talisman') {
    return `${basePrompt} Korean 부적 protective talisman with powerful calligraphic characters meaning good fortune and protection. Include symbols for ${context.mainFortune ?? '행운'}. Mystical red and black ink on traditional yellow hanji paper. No text watermarks. High quality digital art.`
  }

  if (type === 'card') {
    const score = context.fortuneScore ?? 75
    const intensity = score > 80 ? 'radiant golden glow' : score > 60 ? 'soft warm light' : 'gentle silver shimmer'
    return `${basePrompt} Fortune card with ${intensity}. Celestial imagery: stars, moon phases, traditional Korean symbols. ${context.year ?? new Date().getFullYear()} year energy. Beautiful gradient background in pastel gold tones. Premium card design. No watermarks. High quality illustration.`
  }

  // illustration
  return `${basePrompt} Saju four pillars cosmic chart illustration. Eight characters (팔자) represented as celestial symbols floating in cosmic space. ${context.dayGan ?? '甲'} day master energy visualized. Yin-yang harmony, five elements balance. Dark cosmic background with gold and jade accents. Artistic and mystical. No watermarks. High quality digital artwork.`
}

export async function generateFortuneImage(
  type: FortuneImageType,
  context: FortuneImageContext = {}
): Promise<GenerateFortuneImageResult> {
  if (isEdgeEnabled('ai-image')) {
    return invokeEdgeSafe('ai-image', { action: 'generateImage', type, context })
  }
  try {
    const supabase = await createClient()

    // Check authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const prompt = buildImagePrompt(type, context)
    logger.log(`[FortuneImage] Generating ${type} image with prompt:`, prompt.substring(0, 100))

    // Use Gemini 2.0 Flash image generation model
    // responseModalities is supported by the API but not yet typed in SDK v0.24
    const modelConfig = {
      model: 'gemini-2.0-flash-preview-image-generation',
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      } as object,
    }
    const model = genAI.getGenerativeModel(modelConfig as Parameters<typeof genAI.getGenerativeModel>[0])

    const result = await model.generateContent(prompt)
    const response = result.response

    // Extract image from response parts
    const candidates = response.candidates
    if (!candidates || candidates.length === 0) {
      return { success: false, error: '이미지 생성에 실패했습니다.' }
    }

    const parts = candidates[0]?.content?.parts ?? []
    let imageBase64: string | null = null
    let mimeType = 'image/png'

    for (const part of parts) {
      // The SDK types Part as text-only but image responses include inlineData
      const anyPart = part as { inlineData?: { data?: string; mimeType?: string } }
      if (anyPart.inlineData?.data) {
        imageBase64 = anyPart.inlineData.data
        mimeType = anyPart.inlineData.mimeType ?? 'image/png'
        break
      }
    }

    if (!imageBase64) {
      logger.error('[FortuneImage] No image data in response')
      return { success: false, error: '이미지 데이터를 받지 못했습니다.' }
    }

    // Upload to Supabase Storage
    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
    const fileName = `fortune-images/${user.id}/${type}-${Date.now()}.${ext}`
    const imageBuffer = Buffer.from(imageBase64, 'base64')

    const { error: uploadError } = await supabase.storage.from('user-content').upload(fileName, imageBuffer, {
      contentType: mimeType,
      upsert: false,
    })

    if (uploadError) {
      logger.error('[FortuneImage] Supabase upload error:', uploadError)
      // Return base64 as fallback even if upload fails
      return {
        success: true,
        base64: `data:${mimeType};base64,${imageBase64}`,
        prompt,
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('user-content').getPublicUrl(fileName)

    return {
      success: true,
      imageUrl: urlData.publicUrl,
      prompt,
    }
  } catch (error: unknown) {
    logger.error('[FortuneImage] Generation error:', error)
    const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: msg }
  }
}
