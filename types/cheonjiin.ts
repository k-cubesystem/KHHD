/**
 * 청담해화당 통합분석 공유 타입
 */

export interface FengshuiData {
  home_energy?: string
  work_energy?: string
  advice?: string
  lucky_color_for_home?: string
}

export interface FaceReadingData {
  overall?: string
  forehead?: string
  eyes?: string
  nose?: string
  mouth?: string
  face_score?: number
}

export interface PalmReadingData {
  overall?: string
  life_line?: string
  head_line?: string
  heart_line?: string
  fate_line?: string
  palm_score?: number
}

export interface LifeTimelineData {
  pastDecade?: string
  currentDecade?: string
  nextDecade?: string
}

export interface PastRetrogradeEvent {
  period?: string
  description?: string
  basis?: string
}

export interface PastRetrograde {
  events?: PastRetrogradeEvent[]
  accuracyHook?: string
}

export interface CurrentSituation {
  description?: string
  basis?: string
  advice?: string
}

export interface CrossAnalysis {
  sajuAndFace?: string | null
  sajuAndPalm?: string | null
  sajuAndFengshui?: string | null
  convergenceInsight?: string | null
}

export interface CheonjiinAnalysisResult {
  score?: number
  summary?: string
  cheonScore?: number
  jiScore?: number
  inScore?: number

  pastRetrograde?: PastRetrograde | null
  currentSituation?: CurrentSituation | null
  crossAnalysis?: CrossAnalysis | null

  lucky?: {
    color?: string
    direction?: string
    number?: number
    keyword?: string
    advice?: string
  }
  cheon?: {
    title?: string
    content?: string
    element_metaphor?: string
    geokguk?: string
    yongsin?: string
    strengths?: string[]
    weaknesses?: string[]
    lifeTimeline?: LifeTimelineData
    career?: string
    wealth?: string
    love?: string
    health?: string
  }
  ji?: {
    title?: string
    content?: string
    daewoon_phase?: string
    lucky_direction?: string
    strengths?: string[]
    weaknesses?: string[]
    fengshui?: FengshuiData | null
  }
  in?: {
    title?: string
    content?: string
    relationship_advice?: string
    noble_person?: string
    strengths?: string[]
    weaknesses?: string[]
    face_reading?: FaceReadingData | null
    palm_reading?: PalmReadingData | null
  }
}
