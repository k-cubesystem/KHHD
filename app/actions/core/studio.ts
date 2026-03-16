'use server'

import { createClient } from '@/lib/supabase/server'
import {
  analyzeSajuDetail,
  analyzeFaceForDestiny,
  analyzePalm,
  analyzeInteriorForFengshui,
} from '@/app/actions/ai/saju'
import { saveAnalysisHistory } from '@/app/actions/user/history'
import { logger } from '@/lib/utils/logger'
import type { FaceDestinyGoal, InteriorTheme } from '@/lib/constants'

// Types
export type StudioAnalysisType = 'saju' | 'face' | 'palm' | 'fengshui'

interface StudioSajuData {
  name: string
  gender: string
  birthDate: string
  birthTime: string
  calendarType: string
}

interface StudioFaceData {
  imageBase64: string
  goal?: FaceDestinyGoal
}

interface StudioPalmData {
  imageBase64: string
}

interface StudioFengshuiData {
  imageBase64: string
  theme?: InteriorTheme
  roomType?: string
}

type StudioData = StudioSajuData | StudioFaceData | StudioPalmData | StudioFengshuiData

interface AnalyzeParams {
  type: StudioAnalysisType
  isGuest: boolean
  data: StudioData
}

export async function analyzeDestinyStudio({ type, isGuest, data }: AnalyzeParams) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Guest check
  if (!user && !isGuest) {
    return { success: false, error: 'Unauthorized' }
  }

  // Determine if we should save to DB
  // Guest mode = NO SAVE (unless we implement a temporary guest/session storage later)
  // Family mode = SAVE
  const saveToHistory = !isGuest

  logger.log(`[Studio] Analyzing ${type} (Guest: ${isGuest})`)

  try {
    let result

    switch (type) {
      case 'saju': {
        const sajuData = data as StudioSajuData
        result = await analyzeSajuDetail(
          sajuData.name,
          sajuData.gender,
          sajuData.birthDate,
          sajuData.birthTime,
          sajuData.calendarType,
          saveToHistory
        )
        break
      }

      case 'face': {
        const faceData = data as StudioFaceData
        result = await analyzeFaceForDestiny(
          faceData.imageBase64,
          faceData.goal || 'wealth',
          saveToHistory
        )
        break
      }

      case 'palm': {
        const palmData = data as StudioPalmData
        result = await analyzePalm(palmData.imageBase64, saveToHistory)
        break
      }

      case 'fengshui': {
        const fengshuiData = data as StudioFengshuiData
        result = await analyzeInteriorForFengshui(
          fengshuiData.imageBase64,
          fengshuiData.theme || 'wealth',
          fengshuiData.roomType || 'living_room',
          saveToHistory
        )
        break
      }

      default:
        throw new Error('Invalid analysis type')
    }

    if (!result.success) {
      throw new Error(result.error)
    }

    return { success: true, data: result }
  } catch (error: unknown) {
    logger.error('[Studio] Analysis Failed:', error)
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}
