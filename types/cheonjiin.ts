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
    /**
     * 🔴 아래 넷은 **문자열일 수도 객체일 수도 있다.** 프롬프트가 career·health 를 객체로
     * 진화시켰고(추천 직업·사업 적성·취약 장기…), 이 타입이 `string` 이라고 거짓말하는 바람에
     * 뷰가 `{data.career}` 로 그대로 그려 화면이 죽었다(React #31, 2026-08-17).
     * 라이브 확인: 저장된 SAJU 기록 11건 전부 career 가 객체다.
     *
     * 값을 화면에 넣기 전 반드시 `lib/domain/analysis/rich-field.ts` 를 거친다.
     * 여기를 다시 `string` 으로 좁히지 말 것 — 그 순간 같은 장애가 되돌아온다.
     */
    career?: unknown
    wealth?: unknown
    love?: unknown
    health?: unknown
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
