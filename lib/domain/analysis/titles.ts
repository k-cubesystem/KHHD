/**
 * 상(相) 칭호 시스템 — 관상·손금 결과 히어로에 걸리는 전통 한자식 칭호.
 *
 * (category, goal, score) → { hanja, ko, desc }
 * 톤: 전통 한자 4자 + 쉬운 한글 부연. 저점수 구간도 부정 표현 금지 —
 *     "다듬으면 빛나는 상" 방향의 성장형 칭호로 설계.
 *
 * 점수 구간: high ≥ 80 / mid ≥ 60 / growth < 60.
 * 순수 모듈(side-effect 없음) — 단위테스트로 전 조합을 고정한다.
 */

export type AnalysisCategory = 'face' | 'palm'
export type AnalysisGoal = 'wealth' | 'love' | 'authority' | 'general'
export type ScoreBand = 'high' | 'mid' | 'growth'

export interface AnalysisTitle {
  /** 전통 한자 칭호 (4자) */
  hanja: string
  /** 쉬운 한글 별칭 */
  ko: string
  /** 한 줄 부연 설명 */
  desc: string
}

export const GOALS: readonly AnalysisGoal[] = ['wealth', 'love', 'authority', 'general']
export const CATEGORIES: readonly AnalysisCategory[] = ['face', 'palm']
export const BANDS: readonly ScoreBand[] = ['high', 'mid', 'growth']

/** 점수 → 구간. 비정상 입력(NaN 등)은 growth(성장형)로 안전 처리. */
export function scoreToBand(score: number): ScoreBand {
  if (!Number.isFinite(score)) return 'growth'
  if (score >= 80) return 'high'
  if (score >= 60) return 'mid'
  return 'growth'
}

type TitleMatrix = Record<AnalysisCategory, Record<AnalysisGoal, Record<ScoreBand, AnalysisTitle>>>

const TITLES: TitleMatrix = {
  face: {
    wealth: {
      high: { hanja: '金錢貴相', ko: '재물을 부르는 귀한 상', desc: '재물이 절로 따르는 귀격의 상입니다' },
      mid: { hanja: '積財之相', ko: '차곡차곡 모으는 상', desc: '꾸준히 재물을 쌓아가는 알찬 상입니다' },
      growth: {
        hanja: '蓄財可期相',
        ko: '다듬으면 재물이 열리는 상',
        desc: '기운을 가다듬으면 재복이 트이는 상입니다',
      },
    },
    love: {
      high: { hanja: '桃花明相', ko: '복사꽃처럼 환한 인연의 상', desc: '사람을 끌어당기는 화사한 매력의 상입니다' },
      mid: { hanja: '和顔緣相', ko: '온화한 인연의 상', desc: '부드러운 인상으로 인연이 순조로운 상입니다' },
      growth: { hanja: '惜花待春相', ko: '봄을 기다리는 꽃의 상', desc: '매력을 가꿀수록 인연이 활짝 피는 상입니다' },
    },
    authority: {
      high: { hanja: '將帥之相', ko: '장수의 기개를 지닌 상', desc: '타고난 위엄으로 무리를 이끄는 상입니다' },
      mid: { hanja: '領導之相', ko: '이끄는 그릇의 상', desc: '믿음직하게 사람을 이끄는 상입니다' },
      growth: { hanja: '器局漸大相', ko: '그릇이 커가는 상', desc: '경륜을 쌓을수록 위엄이 서는 상입니다' },
    },
    general: {
      high: { hanja: '福德圓相', ko: '복과 덕이 원만한 상', desc: '복과 덕이 두루 갖춰진 원만한 상입니다' },
      mid: { hanja: '平安順相', ko: '평안하고 순한 상', desc: '큰 굴곡 없이 평안하게 흐르는 상입니다' },
      growth: { hanja: '漸入佳境相', ko: '갈수록 좋아지는 상', desc: '다듬을수록 빛이 더해지는 상입니다' },
    },
  },
  palm: {
    wealth: {
      high: { hanja: '財運亨通掌', ko: '재물이 형통한 손금', desc: '재물운이 시원하게 트인 손금입니다' },
      mid: { hanja: '勤實積財掌', ko: '성실히 모으는 손금', desc: '부지런히 재물을 쌓는 알찬 손금입니다' },
      growth: { hanja: '財脈漸開掌', ko: '재물길이 열려가는 손금', desc: '노력할수록 재물길이 넓어지는 손금입니다' },
    },
    love: {
      high: { hanja: '情緣豐盛掌', ko: '인연이 풍성한 손금', desc: '따뜻한 인연이 넘치는 손금입니다' },
      mid: { hanja: '溫情和合掌', ko: '온정이 어우러진 손금', desc: '정이 도타워 관계가 순조로운 손금입니다' },
      growth: { hanja: '緣分待成掌', ko: '인연이 무르익는 손금', desc: '마음을 나눌수록 인연이 깊어지는 손금입니다' },
    },
    authority: {
      high: { hanja: '立身揚名掌', ko: '이름을 떨치는 손금', desc: '뜻을 세워 이름을 떨치는 손금입니다' },
      mid: { hanja: '職道穩實掌', ko: '직업운이 단단한 손금', desc: '맡은 자리에서 신망을 얻는 손금입니다' },
      growth: { hanja: '志向漸高掌', ko: '뜻이 높아가는 손금', desc: '경력을 쌓을수록 입지가 서는 손금입니다' },
    },
    general: {
      high: { hanja: '五福具全掌', ko: '오복을 두루 갖춘 손금', desc: '복이 고루 갖춰진 든든한 손금입니다' },
      mid: { hanja: '平順安樂掌', ko: '평순하고 안락한 손금', desc: '잔잔하게 복이 흐르는 손금입니다' },
      growth: { hanja: '漸入佳境掌', ko: '갈수록 좋아지는 손금', desc: '다듬을수록 운이 열리는 손금입니다' },
    },
  },
}

/**
 * 상 칭호 조회. 알 수 없는 category/goal 은 안전한 기본값(face/general)으로 대체.
 */
export function getAnalysisTitle(category: AnalysisCategory, goal: AnalysisGoal, score: number): AnalysisTitle {
  const cat: AnalysisCategory = category === 'palm' ? 'palm' : 'face'
  const g: AnalysisGoal = GOALS.includes(goal) ? goal : 'general'
  const band = scoreToBand(score)
  return TITLES[cat][g][band]
}
