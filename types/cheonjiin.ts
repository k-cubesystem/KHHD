/**
 * 천지인(天地人) 분석 공유 타입
 * CheonSection, JiSection, InSection, CheonjiinSummary, cheonjiin-result-client 에서 공통 사용
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

export interface CheonjiinAnalysisResult {
  score?: number
  summary?: string
  cheonScore?: number
  jiScore?: number
  inScore?: number
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
    strengths?: string[]
    weaknesses?: string[]
  }
  ji?: {
    title?: string
    content?: string
    daewoon_phase?: string
    lucky_direction?: string
    fengshui?: FengshuiData | null
  }
  in?: {
    title?: string
    content?: string
    relationship_advice?: string
    noble_person?: string
    face_reading?: FaceReadingData | null
    palm_reading?: PalmReadingData | null
  }
}
